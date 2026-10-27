/* =========================================================
   화학 Ⅱ. 물질의 구조와 성질 - 루이스 전자점식 [12화학02-03 앞부분]
   ① 모형: 원자의 점 (원자 번호 1~18, 원자가 전자 수만큼 점 찍기)
   ② 탐구: 분자 그리기 (H₂, HF, H₂O, NH₃, CH₄ — 공유 전자쌍 · 비공유 전자쌍)
   ③ 설명: 5단계 요령 (CO₂, N₂, O₂, HCN, C₂H₄)
   ④ 적용: 예외와 확장 (BeCl₂, BF₃, PCl₃, CCl₄, 이온 결합 NaCl · MgO · Na₂O)
   ※ 중심 원자는 2·3주기 전형 원소 중 Be, B와 옥텟 규칙을 따르는 경우로 한정
     (옥텟 확장, 홀수 전자 분자, 공명, 형식 전하, 분자의 모양은 다루지 않음)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const { tween, approach, Spring, Particles } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 560 : 800, VH = PHONE ? 760 : 600;
  const FS = PHONE ? 1.3 : 1;
  const RM = SciSim.reduceMotion;
  const BG = '#f3f0fb';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const CO = SciSim.color;
  const fx = new Particles();
  const TAU = Math.PI * 2;
  const INK = '#1b2333', MUTED = '#5d6879';
  const AMBER = '#ffb400', ORANGE = '#ff7a3d', LONE = '#3867f4', SHARE = '#14a058', PURP = '#7c3aed';
  const mark = (b) => (b ? '✅' : '⬜');
  const fs = (n) => Math.round(n * FS);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  let game = null;
  let F = new Set();
  let DT = 0.016, NOW = 0;

  const TY = PHONE ? 80 : 66;   // 장면 제목 높이 (안내 말풍선 아래)
  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(() => hintEl.classList.add('hide'), ms || 4500);
  }
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k;
    $('#roL' + i).textContent = label;
    $('#roV' + i).innerHTML = value;
  }

  /* ---------- 부드러운 위치 · 팝 효과 도우미 ---------- */
  const spos = {};
  let sposSeen = new Set();
  function sp(key, tx, ty, rate) {
    sposSeen.add(key);
    let o = spos[key];
    if (!o) o = spos[key] = { x: tx, y: ty };
    if (RM) { o.x = tx; o.y = ty; } else { o.x = approach(o.x, tx, DT, rate || 12); o.y = approach(o.y, ty, DT, rate || 12); }
    return o;
  }
  const popT = {};
  let popSeen = new Set();
  function pop(key, dur, delay) {
    popSeen.add(key);
    if (popT[key] == null) popT[key] = NOW;
    return RM ? 1 : SciSim.ease.outBack(clamp((NOW - popT[key] - (delay || 0)) / (dur || 0.4), 0, 1));
  }
  function frameEnd() {
    for (const k in popT) if (!popSeen.has(k)) delete popT[k];
    popSeen = new Set();
    for (const k in spos) if (!sposSeen.has(k)) delete spos[k];
    sposSeen = new Set();
  }

  /* ---------- 원소 자료 (1~18번) ---------- */
  const ELS = [null,
    { s: 'H', n: '수소' }, { s: 'He', n: '헬륨' }, { s: 'Li', n: '리튬' }, { s: 'Be', n: '베릴륨' }, { s: 'B', n: '붕소' }, { s: 'C', n: '탄소' },
    { s: 'N', n: '질소' }, { s: 'O', n: '산소' }, { s: 'F', n: '플루오린' }, { s: 'Ne', n: '네온' }, { s: 'Na', n: '나트륨' }, { s: 'Mg', n: '마그네슘' },
    { s: 'Al', n: '알루미늄' }, { s: 'Si', n: '규소' }, { s: 'P', n: '인' }, { s: 'S', n: '황' }, { s: 'Cl', n: '염소' }, { s: 'Ar', n: '아르곤' },
  ];
  const Z_OF = {}; ELS.forEach((e, z) => { if (e) Z_OF[e.s] = z; });
  function shellsOf(z) {
    const out = []; let left = z;
    [2, 8, 8].forEach((cap) => { if (left > 0) { const n = Math.min(cap, left); out.push(n); left -= n; } });
    return out;
  }
  const valOf = (sym) => { const sh = shellsOf(Z_OF[sym]); return sh[sh.length - 1]; };
  const ELC = { H: '#94a3b8', He: '#a78bfa', Li: '#f59e0b', Be: '#84cc16', B: '#f59e0b', C: '#475569', N: '#3867f4', O: '#e2464b', F: '#22b8a0', Ne: '#a78bfa', Na: '#f59e0b', Mg: '#84cc16', Al: '#94a3b8', Si: '#94a3b8', P: '#fb923c', S: '#eab308', Cl: '#14a058', Ar: '#a78bfa' };
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const subN = (n) => String(n).split('').map((c) => SUBD[+c]).join('');
  const SIDE = [[0, -1], [1, 0], [0, 1], [-1, 0]];       // 위 · 오른쪽 · 아래 · 왼쪽
  const PREF = [0, 2, 1, 3];                               // 비공유 전자쌍을 놓는 방향 우선순위

  /* ---------- 공통 그리기: 원자 배지 · 점 · 전자쌍 ---------- */
  function badge(x, y, sym, r, o) {
    o = o || {};
    const col = ELC[sym] || '#64748b';
    ctx.save();
    ctx.globalAlpha *= (o.alpha != null ? o.alpha : 1);
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 8, y: 3, color: 'rgba(60,40,120,.22)' });
    ctx.strokeStyle = col; ctx.lineWidth = o.ring || 3.5; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    if (o.halo) { D.glow(x, y, r * 2, o.halo, 0.35); }
    D.text(x, y + r * 0.02, sym, { size: Math.round(r * (sym.length > 1 ? 0.92 : 1.1)), weight: 800, color: INK, baseline: 'middle' });
    ctx.restore();
  }
  function dot(x, y, r, col, o) {
    o = o || {};
    D.sphere(x, y, r, col, { shadow: false, outline: o.outline || 'rgba(90,60,0,.5)', outlineWidth: 1.1, text: o.text, textScale: 1.15, gloss: r > 6 });
  }
  // 한 변(side)에 n개(1~2)의 점이 있을 때의 위치
  function sidePos(x, y, side, k, n, rd, g) {
    const sx = SIDE[side][0], sy = SIDE[side][1], px = -sy, py = sx;
    const off = n === 1 ? 0 : (k === 0 ? -g : g);
    return { x: x + sx * rd + px * off, y: y + sy * rd + py * off };
  }
  // 점 찍는 규칙: d개의 점 → 변별 점 수 (위 → 오른쪽 → 아래 → 왼쪽 한 개씩, 5번째부터 짝)
  const ruleCounts = (d) => [0, 1, 2, 3].map((s) => (d > s ? 1 : 0) + (d > 4 + s ? 1 : 0));

  /* =========================================================
     화면(장면) 관리
     ========================================================= */
  const S = { scene: 'atom', view: 'dot', sceneA: 1 };
  const TB = { atom: '⚫ 원자의 점', mol: '🤝 분자 그리기', wizard: '📝 5단계로 그리기', ionic: '⚡ 이온 결합 화합물' };
  function setScene(sc) {
    if (S.scene === sc) { updateUI(); return; }
    S.scene = sc; hintEl.classList.add('hide');
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4, ease: 'outCubic' });
    updateUI();
  }
  function updateUI() {
    const sc = S.scene;
    ['atom', 'mol', 'wizard', 'ionic'].forEach((k) => { $('#cs-' + k).hidden = k !== sc; });
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
    const n = $$('#sceneSeg button').filter((b) => !b.hidden).length;
    $('#sceneSeg').hidden = n < 2;
    $('#tbLabel').textContent = TB[sc]; $('#tbLabel').hidden = n >= 2;
    $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $('#viewSeg').style.display = (sc === 'mol' || sc === 'wizard') && F.has('mol') || (sc === 'mol' || sc === 'wizard') && game && game.free ? '' : 'none';
    $('#molTable').hidden = !(sc === 'mol' && TBL.show);
  }

  /* =========================================================
     ① 원자의 점
     ========================================================= */
  const A = { z: 6, dots: 0, done: {}, over: 0 };
  const PT_ROWS = [
    [[1, 0], [2, 7]],
    [[3, 0], [4, 1], [5, 2], [6, 3], [7, 4], [8, 5], [9, 6], [10, 7]],
    [[11, 0], [12, 1], [13, 2], [14, 3], [15, 4], [16, 5], [17, 6], [18, 7]],
  ];
  const PT = { cw: PHONE ? 58 : 62, ch: PHONE ? 48 : 44, gap: 14, y0: PHONE ? 372 : 392 };
  PT.x0 = (VW - (PT.cw * 8 + PT.gap)) / 2;
  const ptCell = (col) => ({ x: PT.x0 + col * PT.cw + (col >= 2 ? PT.gap : 0) });
  function ptHit(p) {
    for (let r = 0; r < 3; r++) for (const [z, col] of PT_ROWS[r]) {
      const x = ptCell(col).x, y = PT.y0 + r * PT.ch;
      if (p.x >= x && p.x <= x + PT.cw - 4 && p.y >= y && p.y <= y + PT.ch - 4) return z;
    }
    return 0;
  }
  function selectEl(z) {
    if (z < 1 || z > 18) return;
    A.z = z; A.dots = 0; A.over = 0;
    Sound.click();
    atomNote();
  }
  function atomNote() {
    const e = ELS[A.z], v = valOf(e.s);
    $('#atomNote').textContent = e.n + '(' + e.s + ')의 전자 배치는 ' + shellsOf(A.z).join(' · ') + '이고, 가장 바깥 전자껍질의 전자는 ' + v + '개예요.';
  }
  function addDot() {
    const e = ELS[A.z], v = valOf(e.s);
    if (A.dots >= 8) { toast('점은 최대 8개까지 찍을 수 있어요', 'bad', 1500); return; }
    A.dots++;
    Sound.tick();
    const c = atomCenter();
    const cnt = ruleCounts(A.dots);
    let s = (A.dots - 1) % 4, k = A.dots > 4 ? 1 : 0, n = cnt[s];
    const q = sidePos(c.x, c.y, s, k, n, atomRd(), atomG());
    fx.burst(q.x, q.y, { count: 6, colors: [AMBER, '#fff6c2'], speed: 70, size: 2.5, gravity: 0, life: 0.5 });
    if (A.dots === v) {
      if (!A.done[A.z]) A.done[A.z] = true;
      fx.burst(c.x, c.y, { count: 22, colors: [AMBER, ORANGE, '#fff6c2'], speed: 150, size: 3.5, gravity: 40 });
      Sound.success();
      showHint(e.n + '(' + e.s + ') 완성! 원자가 전자 ' + v + '개', 3500);
    } else if (A.dots > v) {
      A.over = A.dots - v;
      showHint('원자가 전자는 ' + v + '개뿐이에요. 점이 ' + A.over + '개 많아요 — 지우고 다시 찍어 봐요', 4500);
    }
  }
  function clearDots() { A.dots = 0; A.over = 0; Sound.click(); }
  const atomCenter = () => (PHONE ? { x: 410, y: 175 } : { x: 420, y: 185 });
  const atomRd = () => (PHONE ? 62 : 66);
  const atomG = () => 11;
  function drawBohr(cx, cy, t) {
    const sh = shellsOf(A.z), e = ELS[A.z];
    const R = PHONE ? [20, 38, 56] : [24, 46, 68];
    D.text(cx, cy - R[2] - 22, '전자 배치 ' + sh.join(' · '), { size: fs(14), weight: 800, color: MUTED });
    for (let i = 0; i < sh.length; i++) {
      ctx.strokeStyle = i === sh.length - 1 ? 'rgba(255,160,0,.55)' : 'rgba(100,116,139,.35)'; ctx.lineWidth = i === sh.length - 1 ? 2.5 : 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R[i], 0, TAU); ctx.stroke();
    }
    D.sphere(cx, cy, PHONE ? 11 : 13, '#8b5cf6', { shadow: false });
    D.text(cx, cy + 0.5, '+' + A.z, { size: fs(PHONE ? 8 : 10), weight: 800, color: '#fff', baseline: 'middle' });
    for (let i = 0; i < sh.length; i++) {
      const last = i === sh.length - 1;
      for (let k = 0; k < sh[i]; k++) {
        const a = k / sh[i] * TAU + t * (RM ? 0 : (0.25 - i * 0.07)) + i * 0.6;
        const x = cx + Math.cos(a) * R[i], y = cy + Math.sin(a) * R[i];
        D.sphere(x, y, last ? 5.2 : 4.4, last ? AMBER : '#60a5fa', { shadow: false, gloss: false, outline: last ? 'rgba(120,70,0,.55)' : 'rgba(30,60,140,.5)', outlineWidth: 1 });
      }
    }
    D.text(cx, cy + R[2] + 22, '가장 바깥 전자 ' + sh[sh.length - 1] + '개', { size: fs(13), weight: 800, color: '#b45309' });
    void e;
  }
  function drawRuleCard(x, y, w, h) {
    ctx.save();
    D.shadow(() => { D.roundRect(x, y, w, h, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    D.text(x + w / 2, y + 24, '점 찍는 규칙', { size: fs(15), weight: 800, color: '#4c1d95' });
    const cx = x + w / 2, cy = y + h * 0.5 + 6, rr = Math.min(w, h) * 0.2;
    badge(cx, cy, 'X', rr * 0.82, { ring: 2.5 });
    for (let d = 1; d <= 8; d++) {
      const s = (d - 1) % 4, k = d > 4 ? 1 : 0;
      const q = sidePos(cx, cy, s, k, 2, rr * 1.42, 9);
      dot(q.x, q.y, 8, d <= 4 ? AMBER : ORANGE, { text: String(d) });
    }
    D.text(x + w / 2, y + h - 34, '1~4: 위 → 오른쪽 → 아래 → 왼쪽', { size: fs(12), weight: 700, color: MUTED });
    D.text(x + w / 2, y + h - 16, '5~8: 같은 순서로 짝을 지어요', { size: fs(12), weight: 700, color: MUTED });
    ctx.restore();
  }
  function drawAtomScene(t) {
    const c = atomCenter(), e = ELS[A.z], v = valOf(e.s);
    // 보어 모형 → 루이스 점식
    const bx = PHONE ? 130 : 150, by = c.y;
    drawBohr(bx, by, t);
    const ax = (bx + c.x) / 2 + (PHONE ? 6 : 10);
    D.arrow(ax - 26, by, ax + 26, by, { color: '#a78bfa', width: 4 });
    D.text(ax, by - 14, '점으로', { size: fs(12), weight: 800, color: '#7c3aed' });
    // 루이스 전자점식
    badge(c.x, c.y, e.s, PHONE ? 38 : 40, { halo: A.dots === v ? '#fcd34d' : null });
    const cnt = ruleCounts(A.dots);
    for (let s = 0; s < 4; s++) for (let k = 0; k < cnt[s]; k++) {
      const q = sidePos(c.x, c.y, s, k, cnt[s], atomRd(), atomG());
      const o = sp('ad' + s + '_' + k, q.x, q.y, 14);
      const ord = k === 0 ? s + 1 : s + 5;
      const sc = pop('ad' + ord + '_' + A.z, 0.35);
      dot(o.x, o.y, 9.5 * Math.max(0.2, sc), ord > v ? '#ef4444' : AMBER, { text: String(ord) });
    }
    // 변마다 빈 자리 (점선)
    for (let s = 0; s < 4; s++) {
      const q = sidePos(c.x, c.y, s, 0, 1, atomRd(), atomG());
      if (cnt[s] === 0 && A.dots < 8) { ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.28)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x, q.y, 8, 0, TAU); ctx.stroke(); ctx.restore(); }
    }
    D.text(c.x, c.y + atomRd() + 44, e.n + ' ' + e.s + ' · 원자가 전자 ' + v + '개', { size: fs(15), weight: 800, color: INK });
    if (!PHONE) drawRuleCard(560, 62, 218, 252);
    else drawRuleCard(24, 504, VW - 48, 230);
    // 주기율표
    D.text(VW / 2, PT.y0 - 12, '원소를 눌러 골라요 (1~18번)', { size: fs(13), weight: 800, color: MUTED });
    for (let r = 0; r < 3; r++) for (const [z, col] of PT_ROWS[r]) {
      const x = ptCell(col).x, y = PT.y0 + r * PT.ch, w = PT.cw - 4, h = PT.ch - 4;
      const sel = z === A.z;
      ctx.save();
      D.roundRect(x, y, w, h, 9);
      ctx.fillStyle = sel ? '#7c3aed' : '#fff'; ctx.fill();
      ctx.strokeStyle = sel ? '#5b21b6' : ELC[ELS[z].s]; ctx.lineWidth = sel ? 2.5 : 2; ctx.stroke();
      D.text(x + 5, y + 12, String(z), { size: fs(9), weight: 700, color: sel ? '#e9e0ff' : MUTED, align: 'left' });
      D.text(x + w / 2, y + h / 2 + 6, ELS[z].s, { size: fs(17), weight: 800, color: sel ? '#fff' : INK });
      if (A.done[z]) { ctx.fillStyle = SHARE; ctx.beginPath(); ctx.arc(x + w - 8, y + 8, 7, 0, TAU); ctx.fill(); D.text(x + w - 8, y + 11.5, '✓', { size: 10, weight: 800, color: '#fff' }); }
      ctx.restore();
    }
    // 족 사이 생략 표시
    D.text(PT.x0 + 2 * PT.cw + PT.gap / 2 - 2, PT.y0 + 1.5 * PT.ch + 4, '⋯', { size: fs(16), weight: 800, color: MUTED });
  }


  /* =========================================================
     분자 자료 · 공통 구조 계산
     ========================================================= */
  const at = (e, x, y) => ({ e, x, y });
  const MOLDB = {
    // ② 분자 그리기
    H2:  { f: 'H₂',  html: 'H<sub>2</sub>',  name: '수소',     atoms: [at('H', -0.5, 0), at('H', 0.5, 0)], bonds: [[0, 1]], lone: [0, 0], central: [0] },
    HF:  { f: 'HF',  html: 'HF',             name: '플루오린화 수소', atoms: [at('H', -0.6, 0), at('F', 0.6, 0)], bonds: [[0, 1]], lone: [0, 3], central: [1] },
    H2O: { f: 'H₂O', html: 'H<sub>2</sub>O', name: '물',       atoms: [at('O', 0, 0), at('H', -1, 0), at('H', 1, 0)], bonds: [[0, 1], [0, 2]], lone: [2, 0, 0], central: [0] },
    NH3: { f: 'NH₃', html: 'NH<sub>3</sub>', name: '암모니아',  atoms: [at('N', 0, 0), at('H', -1, 0), at('H', 1, 0), at('H', 0, 1)], bonds: [[0, 1], [0, 2], [0, 3]], lone: [1, 0, 0, 0], central: [0] },
    CH4: { f: 'CH₄', html: 'CH<sub>4</sub>', name: '메테인',    atoms: [at('C', 0, 0), at('H', -1, 0), at('H', 1, 0), at('H', 0, -1), at('H', 0, 1)], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], lone: [0, 0, 0, 0, 0], central: [0] },
    // ③ 5단계 · ④ 예외 (lone = ④단계까지 놓은 비공유 전자쌍 수)
    CO2:  { f: 'CO₂',  html: 'CO<sub>2</sub>',  name: '이산화 탄소', atoms: [at('O', -1, 0), at('C', 0, 0), at('O', 1, 0)], bonds: [[0, 1], [1, 2]], lone: [3, 0, 3], central: [1], fin: [2, 2] },
    N2:   { f: 'N₂',   html: 'N<sub>2</sub>',   name: '질소',       atoms: [at('N', -0.6, 0), at('N', 0.6, 0)], bonds: [[0, 1]], lone: [3, 1], central: [0, 1], fin: [3] },
    O2:   { f: 'O₂',   html: 'O<sub>2</sub>',   name: '산소',       atoms: [at('O', -0.6, 0), at('O', 0.6, 0)], bonds: [[0, 1]], lone: [3, 2], central: [0, 1], fin: [2] },
    HCN:  { f: 'HCN',  html: 'HCN',             name: '사이안화 수소', atoms: [at('H', -1, 0), at('C', 0, 0), at('N', 1, 0)], bonds: [[0, 1], [1, 2]], lone: [0, 0, 3], central: [1], fin: [1, 3] },
    C2H4: { f: 'C₂H₄', html: 'C<sub>2</sub>H<sub>4</sub>', name: '에텐', atoms: [at('C', -0.6, 0), at('C', 0.6, 0), at('H', -0.6, -1), at('H', -0.6, 1), at('H', 0.6, -1), at('H', 0.6, 1)], bonds: [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5]], lone: [1, 0, 0, 0, 0, 0], central: [0, 1], fin: [2, 1, 1, 1, 1] },
    BeCl2: { f: 'BeCl₂', html: 'BeCl<sub>2</sub>', name: '염화 베릴륨', atoms: [at('Cl', -1, 0), at('Be', 0, 0), at('Cl', 1, 0)], bonds: [[0, 1], [1, 2]], lone: [3, 0, 3], central: [1], exc: true },
    BF3:   { f: 'BF₃',   html: 'BF<sub>3</sub>',   name: '삼플루오린화 붕소', atoms: [at('F', -1, 0), at('B', 0, 0), at('F', 1, 0), at('F', 0, 1)], bonds: [[0, 1], [1, 2], [1, 3]], lone: [3, 0, 3, 3], central: [1], exc: true },
    PCl3:  { f: 'PCl₃',  html: 'PCl<sub>3</sub>',  name: '삼염화 인', atoms: [at('P', 0, 0), at('Cl', -1, 0), at('Cl', 1, 0), at('Cl', 0, 1)], bonds: [[0, 1], [0, 2], [0, 3]], lone: [1, 3, 3, 3], central: [0] },
    CCl4:  { f: 'CCl₄',  html: 'CCl<sub>4</sub>',  name: '사염화 탄소', atoms: [at('C', 0, 0), at('Cl', -1, 0), at('Cl', 1, 0), at('Cl', 0, -1), at('Cl', 0, 1)], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]], lone: [0, 3, 3, 3, 3], central: [0] },
  };
  const U = PHONE ? 104 : 128;
  const sideTo = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y; return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0); };
  // 각 원자의 결합 방향(bs)과 비공유 전자쌍 방향(ls)
  function sidesOf(M, lone) {
    const bs = M.atoms.map(() => []);
    M.bonds.forEach(([a, b], bi) => {
      bs[a].push({ side: sideTo(M.atoms[a], M.atoms[b]), bond: bi, other: b });
      bs[b].push({ side: sideTo(M.atoms[b], M.atoms[a]), bond: bi, other: a });
    });
    const ls = M.atoms.map((_, i) => PREF.filter((s) => !bs[i].some((q) => q.side === s)).slice(0, lone[i]));
    return { bs, ls };
  }
  for (const k in MOLDB) {   // 전자 수 검산 (원자가 전자 합 = 2×결합 + 2×비공유 전자쌍)
    const M = MOLDB[k];
    const tot = M.atoms.reduce((s, a) => s + valOf(a.e), 0);
    const mine = 2 * M.bonds.length + 2 * M.lone.reduce((s, n) => s + n, 0);
    M.total = tot;
    const extra = k === 'N2' || k === 'O2' || k === 'CO2' || k === 'HCN' || k === 'C2H4' ? null : 0;
    if (extra === 0 && tot !== mine) console.error('전자 수 불일치', k, tot, mine);
    if (extra === null && tot !== mine) console.error('전자 수 불일치(4단계)', k, tot, mine);
  }
  const targetOf = (e) => (e === 'H' ? 2 : 8);

  /* ---------- 결합(공유 전자쌍) · 비공유 전자쌍 그리기 ---------- */
  function drawBond(ax, ay, bx, by, order, o) {
    o = o || {};
    const a = o.alpha == null ? 1 : o.alpha, sc = o.scale == null ? 1 : o.scale;
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
    const mx = (ax + bx) / 2, my = (ay + by) / 2, ang = Math.atan2(uy, ux);
    ctx.save(); ctx.globalAlpha *= a;
    for (let k = 0; k < order; k++) {
      if (S.view === 'line') {
        const off = (k - (order - 1) / 2) * 11;
        ctx.strokeStyle = SHARE; ctx.lineWidth = 5 * sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ax + ux * 29 + px * off, ay + uy * 29 + py * off); ctx.lineTo(bx - ux * 29 + px * off, by - uy * 29 + py * off); ctx.stroke();
      } else {
        const off = (k - (order - 1) / 2) * 21;
        ctx.save(); ctx.translate(mx + px * off, my + py * off); ctx.rotate(ang); ctx.scale(sc, sc);
        D.roundRect(-19, -9.5, 38, 19, 9.5); ctx.fillStyle = 'rgba(20,160,88,.16)'; ctx.fill(); ctx.strokeStyle = SHARE; ctx.lineWidth = 1.8; ctx.stroke();
        dot(-7, 0, 5.2, o.c1 || '#34d399'); dot(7, 0, 5.2, o.c2 || '#34d399');
        ctx.restore();
      }
    }
    ctx.restore();
  }
  function drawPair(x, y, side, key, o) {
    o = o || {};
    const sc = pop(key, 0.4) * (o.scale == null ? 1 : o.scale);
    if (sc <= 0.01) return;
    const wob = RM ? 0 : Math.sin(NOW * 3 + (key.length * 1.7)) * 1.6;
    const sx = SIDE[side][0], sy = SIDE[side][1], px = -sy, py = sx;
    const cx = x + sx * 31 + px * wob * 0.5, cy = y + sy * 31 + py * wob * 0.5;
    ctx.save(); ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    for (const sgn of [-1, 1]) dot(cx + px * 7.5 * sgn * sc, cy + py * 7.5 * sgn * sc, 5.2 * Math.max(0.2, sc), o.col || LONE, { outline: 'rgba(20,40,120,.55)' });
    ctx.restore();
  }
  function octPill(x, y, n, tgt, o) {
    o = o || {};
    const ok = n === tgt;
    const txt = o.text || (ok ? n + ' ✓' : n + '/' + tgt);
    D.label(x, y, txt, { size: fs(12), bg: o.bg || (ok ? '#dcfce7' : '#fff7e0'), color: o.color || (ok ? '#0b6b39' : '#92400e'), border: o.border || (ok ? '#14a058' : '#f59e0b'), pad: 6 });
  }
  function legend(y) {
    const items = [['홀전자', 'e'], ['비공유 전자쌍', 'l'], ['공유 전자쌍', 's']];
    const w = PHONE ? 150 : 190, x0 = VW / 2 - w * 1.5 + w / 2 + (PHONE ? -4 : 0);
    items.forEach(([lab, k], i) => {
      const x = x0 + i * w - (PHONE ? 6 : 0);
      if (k === 'e') dot(x - 38, y, 5.2, AMBER);
      else if (k === 'l') { dot(x - 48, y, 5.2, LONE, { outline: 'rgba(20,40,120,.55)' }); dot(x - 36, y, 5.2, LONE, { outline: 'rgba(20,40,120,.55)' }); }
      else { D.roundRect(x - 58, y - 8, 36, 16, 8); ctx.fillStyle = 'rgba(20,160,88,.16)'; ctx.fill(); ctx.strokeStyle = SHARE; ctx.lineWidth = 1.5; ctx.stroke(); dot(x - 49, y, 4.6, '#34d399'); dot(x - 31, y, 4.6, '#34d399'); }
      D.text(x - (k === 'e' ? 28 : k === 'l' ? 24 : 16), y + 5, lab, { size: fs(12), weight: 800, color: MUTED, align: 'left' });
    });
  }

  /* =========================================================
     ② 분자 그리기: 바깥 원자를 끌어 가운데 원자와 전자쌍을 공유시키기
     ========================================================= */
  const MO = { key: 'H2', bonded: [], pr: [], off: [], drag: null, made: {}, lay: null, stampT: -9 };
  const MC = () => ({ x: VW / 2, y: PHONE ? 292 : 280 });
  const DISP = () => U * 0.72;
  const mdef = () => MOLDB[MO.key];
  const cIdx = () => mdef().central[0];
  const molHome = (i) => { const m = mdef().atoms[i], c = MC(); return { x: c.x + m.x * U, y: c.y + m.y * U }; };
  function molOut(i) {
    const h = molHome(i), c = molHome(cIdx()), dx = h.x - c.x, dy = h.y - c.y, L = Math.hypot(dx, dy) || 1;
    return { x: dx / L, y: dy / L };
  }
  function molBase(i) {
    const h = molHome(i);
    if (i === cIdx()) return h;
    const o = molOut(i), k = (1 - clamp(MO.pr[i].value, 0, 1)) * DISP();
    return { x: h.x + o.x * k, y: h.y + o.y * k };
  }
  function molPos(i) {
    const b = molBase(i), f = MO.off[i];
    return f ? { x: b.x + f.x, y: b.y + f.y } : b;
  }
  function resetMol(key) {
    if (key) MO.key = key;
    hintEl.classList.add('hide');
    const M = mdef();
    MO.lay = sidesOf(M, M.lone);
    MO.bonded = M.atoms.map(() => false);
    MO.pr = M.atoms.map(() => new Spring(0, { stiffness: 130, damping: 15 }));
    MO.off = M.atoms.map(() => ({ x: 0, y: 0 }));
    MO.drag = null; MO.stampT = -9;
    $$('#molSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === MO.key));
    $('#molNote').textContent = '바깥 원자를 끌어 ' + (M.atoms[cIdx()].e) + ' 원자 가까이 가져가거나, 원자를 눌러 보세요. 짝 없는 전자(홀전자)끼리 전자쌍을 공유해요.';
  }
  const nBonded = () => MO.bonded.filter(Boolean).length;
  const molComplete = () => { const M = mdef(); return M.atoms.every((_, i) => i === cIdx() || MO.bonded[i]); };
  function bondMol(i) {
    if (i === cIdx() || MO.bonded[i]) return;
    MO.bonded[i] = true; MO.pr[i].target = 1; MO.drag = null;
    tween(MO.off[i], { x: 0, y: 0 }, { duration: 0.35, ease: 'outCubic' });
    Sound.tick();
    const h = molHome(i), c = molHome(cIdx());
    fx.burst((h.x + c.x) / 2, (h.y + c.y) / 2, { count: 8, colors: [AMBER, ORANGE, '#34d399'], speed: 80, size: 3, gravity: 0, life: 0.5 });
    if (molComplete() && !MO.made[MO.key]) {
      MO.made[MO.key] = true; MO.stampT = NOW;
      Sound.success();
      fx.burst(c.x, c.y, { count: 26, colors: [AMBER, ORANGE, '#34d399', '#a78bfa'], speed: 170, size: 3.5 });
      const M = mdef();
      showHint(M.name + ' ' + M.f + ' 완성! 공유 전자쌍 ' + M.bonds.length + '쌍, 비공유 전자쌍 ' + M.lone.reduce((s, n) => s + n, 0) + '쌍', 5000);
    }
  }
  const molAround = (i) => {
    const M = mdef(), ci = cIdx();
    if (i === ci) return valOf(M.atoms[i].e) + nBonded();
    return valOf(M.atoms[i].e) + (MO.bonded[i] ? 1 : 0);
  };
  function molAtomAt(p) {
    const M = mdef();
    for (let i = 0; i < M.atoms.length; i++) {
      if (i === cIdx() || MO.bonded[i]) continue;
      const q = molPos(i);
      if (Math.hypot(p.x - q.x, p.y - q.y) < 36) return i;
    }
    return -1;
  }
  function stepMol(dt) { MO.pr.forEach((s) => s.update(dt)); }
  function drawMol(t) {
    const M = mdef(), ci = cIdx(), L = MO.lay;
    // 제목
    D.text(VW / 2, TY, M.name + ' ' + M.f + (MO.made[MO.key] ? ' · 완성!' : ''), { size: fs(20), weight: 800, color: MO.made[MO.key] ? '#0b6b39' : '#4c1d95' });
    // 목표 위치 (점선 고리)
    M.atoms.forEach((a, i) => {
      if (i === ci || MO.bonded[i]) return;
      const h = molHome(i);
      const dp = molPos(i);
      const near = MO.drag && MO.drag.i === i && Math.hypot(dp.x - h.x, dp.y - h.y) < 70;
      ctx.save(); ctx.strokeStyle = near ? SHARE : 'rgba(124,58,237,.35)'; ctx.setLineDash([5, 5]); ctx.lineWidth = near ? 3 : 2;
      ctx.lineDashOffset = -t * 12; ctx.beginPath(); ctx.arc(h.x, h.y, 30, 0, TAU); ctx.stroke(); ctx.restore();
    });
    // 결합 (공유 전자쌍)과 이동 중인 홀전자
    M.bonds.forEach(([a, b], bi) => {
      const o = a === ci ? b : a, c = ci;
      const Pc = molPos(c), Po = molPos(o), p = clamp(MO.pr[o].value, 0, 1);
      const dx = Po.x - Pc.x, dy = Po.y - Pc.y, Ln = Math.hypot(dx, dy) || 1, ux = dx / Ln, uy = dy / Ln;
      const mx = (Pc.x + Po.x) / 2, my = (Pc.y + Po.y) / 2;
      if (p > 0.5) drawBond(Pc.x, Pc.y, Po.x, Po.y, 1, { alpha: smooth((p - 0.5) / 0.5), c1: AMBER, c2: ORANGE });
      if (p < 0.99) {
        const sC = L.bs[c].find((q) => q.bond === bi).side, sO = L.bs[o].find((q) => q.bond === bi).side;
        const cs = { x: Pc.x + SIDE[sC][0] * 31, y: Pc.y + SIDE[sC][1] * 31 }, os = { x: Po.x + SIDE[sO][0] * 31, y: Po.y + SIDE[sO][1] * 31 };
        const cc = { x: mx - ux * 7, y: my - uy * 7 }, oc = { x: mx + ux * 7, y: my + uy * 7 };
        dot(lerp(cs.x, cc.x, p), lerp(cs.y, cc.y, p), 5.4, AMBER);
        dot(lerp(os.x, oc.x, p), lerp(os.y, oc.y, p), 5.4, ORANGE);
      }
    });
    // 원자 배지 · 비공유 전자쌍 · 옥텟 표시
    M.atoms.forEach((a, i) => {
      const P = molPos(i);
      const isDrag = MO.drag && MO.drag.i === i;
      if (isDrag) D.glow(P.x, P.y, 60, '#a78bfa', 0.35);
      badge(P.x, P.y, a.e, 25, { ring: 3.5 });
      L.ls[i].forEach((s, k) => drawPair(P.x, P.y, s, 'mp' + MO.key + i + '_' + k));
      const n = molAround(i);
      octPill(P.x + 46, P.y + 42, n, targetOf(a.e));
    });
    // 완성 도장
    if (MO.made[MO.key]) {
      const k = pop('moStamp' + MO.key, 0.6);
      D.check(VW - fs(46), TY - 6, 22 * Math.max(0.1, k), 1);
    }
    legend(VH - fs(30));
    D.text(VW / 2, VH - fs(62), '주위 전자 8개 = 옥텟, H는 2개 = 듀엣', { size: fs(13), weight: 700, color: MUTED });
  }

  /* ---------- 전자쌍 수 세기 표 ---------- */
  const TBL = { show: false, rows: [['H2O', 2, 2], ['NH3', 3, 1], ['CH4', 4, 0], ['HF', 1, 3]] };
  function buildTable() {
    const body = $('#tblBody');
    TBL.rows.forEach(([k]) => {
      const tr = document.createElement('tr');
      const opts = '<option value="">?</option>' + [0, 1, 2, 3, 4].map((n) => '<option value="' + n + '">' + n + '쌍</option>').join('');
      tr.innerHTML = '<td>' + MOLDB[k].html + '</td><td><select data-k="' + k + '" data-t="sh" aria-label="' + MOLDB[k].f + ' 공유 전자쌍 수">' + opts + '</select></td><td><select data-k="' + k + '" data-t="lp" aria-label="' + MOLDB[k].f + ' 비공유 전자쌍 수">' + opts + '</select></td>';
      body.appendChild(tr);
    });
    $$('#tblBody select').forEach((sel) => sel.addEventListener('change', () => {
      Sound.click();
      const row = TBL.rows.find((r) => r[0] === sel.dataset.k), want = sel.dataset.t === 'sh' ? row[1] : row[2];
      sel.classList.remove('ok', 'bad');
      if (sel.value !== '') { sel.classList.add(+sel.value === want ? 'ok' : 'bad'); }
    }));
  }
  function tblCheck() {
    let miss = 0, wrong = 0;
    $$('#tblBody select').forEach((sel) => {
      const row = TBL.rows.find((r) => r[0] === sel.dataset.k), want = sel.dataset.t === 'sh' ? row[1] : row[2];
      if (sel.value === '') miss++; else if (+sel.value !== want) wrong++;
    });
    if (miss) return '표의 빈칸이 ' + miss + '개 남았어요. 분자를 하나씩 완성해 보면서 전자쌍을 세어 봐요.';
    if (wrong) return '빨간색 칸이 ' + wrong + '곳 틀렸어요. 초록 타원(공유 전자쌍)과 파란 점 2개(비공유 전자쌍)를 다시 세어 봐요.';
    return true;
  }
  const tblFilled = () => $$('#tblBody select').filter((s) => s.value !== '').length;

  /* =========================================================
     ③ ④ 5단계 요령 마법사 (CO₂ · N₂ · O₂ · HCN · C₂H₄ / BeCl₂ · BF₃ · PCl₃ · CCl₄)
     ========================================================= */
  const W = { key: 'CO2', k: 0, central: -1, ord: [], lone: [], done: {}, cnt: 0, shakeT: -9, stampT: -9, sumT: -9 };
  const wdef = () => MOLDB[W.key];
  const WSTEPS = ['① 합', '② 중심', '③ 결합', '④ 채우기', '⑤ 검사'];
  function wCenter() {
    const M = wdef();
    const xs = M.atoms.map((a) => a.x), ys = M.atoms.map((a) => a.y);
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { x: VW / 2 - mx * U, y: (PHONE ? 300 : 272) - my * U };
  }
  function wPos(i) {
    const M = wdef(), c = wCenter(), a = M.atoms[i];
    let sx = 0, sy = 0;
    if (NOW - W.shakeT < 0.4 && !RM) { const k = (1 - (NOW - W.shakeT) / 0.4) * 5; sx = Math.sin(NOW * 60) * k; }
    return { x: c.x + a.x * U + sx, y: c.y + a.y * U + sy };
  }
  function resetWiz(key) {
    if (key) W.key = key;
    hintEl.classList.add('hide');
    const M = wdef();
    W.k = 0; W.central = -1; W.ord = M.bonds.map(() => 1); W.lone = M.lone.slice(); W.cnt = M.total; W.stampT = -9;
    $$('#wizSel .opt').forEach((b) => { b.classList.toggle('on', b.dataset.w === W.key); b.classList.toggle('done', !!W.done[b.dataset.w]); });
    wizUI();
  }
  const wAround = (i) => {
    const M = wdef();
    let n = 2 * W.lone[i];
    M.bonds.forEach(([a, b], bi) => { if (a === i || b === i) n += 2 * W.ord[bi]; });
    return n;
  };
  const wDeficit = (i) => wAround(i) < targetOf(wdef().atoms[i].e);
  const wNeedConv = () => { const M = wdef(); return !M.exc && M.atoms.some((_, i) => wDeficit(i)); };
  const wDrawn = () => {
    const M = wdef();
    let n = 0;
    if (W.k >= 3) n += 2 * W.ord.reduce((s, o) => s + o, 0);
    if (W.k >= 4) n += 2 * W.lone.reduce((s, o) => s + o, 0);
    return n;
  };
  const wPool = () => wdef().total - wDrawn();
  const wSumText = () => wdef().atoms.map((a) => valOf(a.e)).join(' + ') + ' = ' + wdef().total;
  function wizUI() {
    const M = wdef(), k = W.k;
    const note = $('#wizNote'), nb = $('#wizNext'), bb = $('#wizBack');
    let msg, label, dis = false;
    const nc = wNeedConv();
    if (k === 0) { msg = '<b>① 원자가 전자 수의 합</b>을 구해요. ' + M.f + '의 모든 원자의 원자가 전자를 더해 총 전자 수를 알아내요.'; label = '▶ ① 합 구하기'; }
    else if (k === 1) { msg = '<b>② 중심 원자</b>를 정해요. 캔버스에서 중심이 될 원자를 눌러요. (H는 항상 말단 · 보통 전기 음성도가 작거나 결합을 많이 하는 원자가 중심)'; label = '② 중심 원자를 눌러요'; dis = true; }
    else if (k === 2) { msg = '<b>③</b> 중심 원자와 말단 원자를 <b>단일 결합</b>(전자쌍 1개)으로 연결해요.'; label = '▶ ③ 단일 결합 연결'; }
    else if (k === 3) { msg = '<b>④</b> 말단 원자부터 옥텟(H는 2개)이 되도록 비공유 전자쌍을 채워요. 남는 전자는 중심 원자에 놓아요.'; label = '▶ ④ 옥텟 채우기'; }
    else if (k === 4) {
      if (nc) { msg = '<b>⑤</b> 옥텟이 모자란 원자가 있어요! 말단 원자의 <b>비공유 전자쌍을 공유 전자쌍으로</b> 바꿔야 해요. 캔버스에서 결합을 눌러요.'; label = '⑤ 결합을 눌러요'; dis = true; }
      else if (M.exc) { msg = '<b>⑤</b> 중심 원자 ' + M.atoms[M.central[0]].e + '의 둘레 전자를 세어 옥텟이 되는지 검사해요.'; label = '🔍 ⑤ 옥텟 검사'; }
      else { msg = '<b>⑤</b> 모든 원자가 옥텟이에요. 옥텟 검사로 마무리해요.'; label = '🔍 ⑤ 옥텟 검사'; }
    } else {
      const tot = M.total;
      msg = M.exc ? '<b>완성!</b> 점 ' + tot + '개 = 총 ' + tot + '개. ' + M.atoms[M.central[0]].e + '는 옥텟 규칙의 <b>예외</b>예요 (둘레 전자 ' + wAround(M.central[0]) + '개).' : '<b>완성!</b> 그림 속 점 ' + tot + '개 = 총 원자가 전자 ' + tot + '개로 검산도 맞아요.';
      label = '✔ 완성'; dis = true;
    }
    note.innerHTML = msg;
    nb.textContent = label; nb.disabled = dis;
    bb.disabled = k === 0;
  }
  function wizAdvance() {
    const M = wdef();
    if (W.k === 0) { W.k = 1; W.sumT = NOW; Sound.tick(); }
    else if (W.k === 2) { W.k = 3; Sound.tick(); const c = wCenter(); fx.burst(c.x, c.y, { count: 10, colors: ['#34d399', '#a7f3d0'], speed: 90, size: 3, gravity: 0, life: 0.5 }); }
    else if (W.k === 3) { W.k = 4; Sound.tick(); }
    else if (W.k === 4 && !wNeedConv()) { finishWiz(); }
    wizUI();
    void M;
  }
  function wizBack() {
    if (W.k <= 0) return;
    const M = wdef();
    Sound.click();
    W.k--;
    if (W.k < 5) W.ord = M.bonds.map(() => 1), W.lone = M.lone.slice();
    if (W.k < 2) W.central = -1;
    W.cnt = wPool();
    wizUI();
  }
  function finishWiz() {
    const M = wdef();
    W.k = 5; W.stampT = NOW; W.done[W.key] = true;
    $$('#wizSel .opt').forEach((b) => b.classList.toggle('done', !!W.done[b.dataset.w]));
    Sound.success();
    const c = wCenter();
    fx.burst(c.x, c.y, { count: 28, colors: [AMBER, '#34d399', '#a78bfa', '#60a5fa'], speed: 180, size: 3.5 });
    showHint(M.name + ' ' + M.f + ' 완성! 점 ' + M.total + '개 = 총 전자 ' + M.total + '개', 5000);
    wizUI();
  }
  function wizFb(msg) { W.shakeT = NOW; Sound.fail(); showHint(msg, 5500); }
  function wAtomAt(p) {
    const M = wdef();
    for (let i = 0; i < M.atoms.length; i++) { const q = wPos(i); if (Math.hypot(p.x - q.x, p.y - q.y) < 36) return i; }
    return -1;
  }
  function wBondAt(p) {
    const M = wdef();
    for (let bi = 0; bi < M.bonds.length; bi++) {
      const A_ = wPos(M.bonds[bi][0]), B_ = wPos(M.bonds[bi][1]);
      const dx = B_.x - A_.x, dy = B_.y - A_.y, L2 = dx * dx + dy * dy;
      const t = clamp(((p.x - A_.x) * dx + (p.y - A_.y) * dy) / L2, 0, 1);
      if (Math.hypot(p.x - (A_.x + dx * t), p.y - (A_.y + dy * t)) < 28 && t > 0.1 && t < 0.9) return bi;
    }
    return -1;
  }
  function wizTap(p) {
    const M = wdef();
    if (W.k === 1) {
      const i = wAtomAt(p);
      if (i < 0) return;
      if (M.central.includes(i)) {
        W.central = i; W.k = 2; Sound.success();
        const q = wPos(i); fx.burst(q.x, q.y, { count: 14, colors: ['#a78bfa', '#c4b5fd', '#fff'], speed: 110, size: 3, gravity: 0 });
        wizUI();
      } else if (M.atoms[i].e === 'H') wizFb('H는 결합을 1개만 만들 수 있어서 중심 원자가 될 수 없어요. 다른 원자를 골라요.');
      else wizFb('중심 원자는 보통 전기 음성도가 작거나 결합을 많이 하는 원자예요. 다른 원자를 골라 봐요.');
    } else if (W.k === 4 && wNeedConv()) {
      const bi = wBondAt(p);
      if (bi < 0) { const i = wAtomAt(p); if (i >= 0) showHint('원자가 아니라 두 원자 사이의 결합(초록 전자쌍)을 눌러 보세요', 3500); return; }
      const [a, b] = M.bonds[bi];
      const da = wDeficit(a), db = wDeficit(b);
      if (!da && !db) { wizFb('이 결합의 두 원자는 이미 옥텟(H는 2개)이에요. 전자가 모자란 원자와 이어진 결합을 눌러 봐요.'); return; }
      if (W.lone[a] <= 0 && W.lone[b] <= 0) { wizFb('이 결합에는 옮길 비공유 전자쌍이 없어요. 비공유 전자쌍을 가진 말단 원자와 이어진 결합을 눌러 봐요.'); return; }
      if (M.fin && W.ord[bi] >= M.fin[bi]) { wizFb('이 결합은 ' + M.f + '에서 이미 충분히 바뀌었어요. 전자가 모자란 중심 원자와 이어진 다른 결합을 눌러 봐요.'); return; }
      const donor = W.lone[a] >= W.lone[b] ? a : b;
      W.lone[donor]--; W.ord[bi]++;
      Sound.tick();
      const A_ = wPos(a), B_ = wPos(b);
      fx.burst((A_.x + B_.x) / 2, (A_.y + B_.y) / 2, { count: 10, colors: ['#34d399', '#a7f3d0'], speed: 90, size: 3, gravity: 0, life: 0.5 });
      if (!wNeedConv()) finishWiz(); else wizUI();
    }
  }
  function drawWiz(t) {
    const M = wdef(), k = W.k;
    const dtxt = M.name + ' ' + M.f;
    D.text(VW / 2, TY, dtxt, { size: fs(20), weight: 800, color: W.done[W.key] && k === 5 ? '#0b6b39' : '#4c1d95' });
    if (k >= 1) D.text(VW / 2, TY + fs(26), '총 원자가 전자 = ' + wSumText(), { size: fs(15), weight: 800, color: '#b45309' });
    // 결합 (k >= 3)
    if (k >= 3) M.bonds.forEach(([a, b], bi) => {
      const A_ = wPos(a), B_ = wPos(b);
      const sc = pop('wb' + W.key + bi + '_' + W.ord[bi], 0.45);
      drawBond(A_.x, A_.y, B_.x, B_.y, W.ord[bi], { scale: Math.max(0.05, sc), c1: '#34d399', c2: '#34d399' });
    });
    const sd = sidesOf(M, k >= 4 ? W.lone : M.atoms.map(() => 0));
    M.atoms.forEach((a, i) => {
      const P = wPos(i);
      const isC = (k >= 2 && W.central === i);
      const need = k === 4 && wNeedConv() && wDeficit(i);
      badge(P.x, P.y, a.e, 25, { halo: isC ? '#a78bfa' : null, ring: isC ? 4.5 : 3.5 });
      if (need) { ctx.save(); ctx.strokeStyle = 'rgba(239,68,68,' + (0.35 + 0.35 * Math.sin(t * 5)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, 32 + 2 * Math.sin(t * 5), 0, TAU); ctx.stroke(); ctx.restore(); }
      if (k >= 4) sd.ls[i].forEach((s, q) => drawPair(P.x, P.y, s, 'wl' + W.key + i + '_' + q));
      if (isC) D.label(P.x, P.y - 44, '중심', { size: fs(12), bg: '#7c3aed', color: '#fff', pad: 7 });
      if (k < 3) {
        const v = valOf(a.e), py = P.y + 44;
        D.label(P.x, py, (PHONE ? '전자 ' : '원자가 전자 ') + v + '개', { size: fs(12), bg: '#fff7e0', color: '#92400e', border: '#f59e0b', pad: 6 });
      } else if (k >= 4) {
        const n = wAround(i), tg = targetOf(a.e);
        const exc = M.exc && k === 5 && M.central.includes(i);
        if (exc) octPill(P.x + 48, P.y + 40, n, tg, { text: n + ' · 예외', bg: '#ffedd5', color: '#9a3412', border: '#f97316' });
        else octPill(P.x + 48, P.y + 40, n, tg);
      }
    });
    // 남은 전자 카운터
    const pool = wPool();
    W.cnt = RM ? pool : approach(W.cnt, pool, DT, 7);
    if (k >= 1) {
      const bx = VW / 2, by = VH - fs(96);
      ctx.save();
      D.shadow(() => { D.roundRect(bx - 100, by - 22, 200, 44, 22); ctx.fillStyle = pool === 0 && k >= 4 ? '#dcfce7' : '#fff'; ctx.fill(); }, { blur: 8, y: 2 });
      D.text(bx, by + 6, '남은 전자 ' + Math.round(W.cnt) + '개', { size: fs(19), weight: 800, color: pool === 0 && k >= 4 ? '#0b6b39' : '#b45309' });
      ctx.restore();
    }
    // 단계 칩
    const cw = PHONE ? 100 : 118, x0 = VW / 2 - cw * 2;
    WSTEPS.forEach((lab, i) => {
      const x = x0 + i * cw, y = VH - fs(46);
      const doneS = k > i, cur = k === i;
      ctx.save();
      D.roundRect(x - cw / 2 + 6, y - 16, cw - 12, 32, 16);
      ctx.fillStyle = doneS ? '#dcfce7' : cur ? '#7c3aed' : '#fff'; ctx.fill();
      ctx.strokeStyle = doneS ? SHARE : cur ? '#5b21b6' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke();
      D.text(x, y + 5, (doneS ? '✓ ' : '') + lab, { size: fs(13), weight: 800, color: doneS ? '#0b6b39' : cur ? '#fff' : MUTED });
      ctx.restore();
    });
    if (k === 5) {
      const sc = pop('wzStamp' + W.key, 0.6);
      D.check(VW - fs(46), TY - 6, 22 * Math.max(0.1, sc), 1);
    }
    // 1단계 안내 / 2단계 안내 화살표
    if (k === 1) { const q = wPos(M.central[0]); D.ring(q.x, q.y, 36, t, { color: '#a78bfa' }); }
  }

  /* =========================================================
     ④ 이온 결합 화합물의 전자점식 (NaCl · MgO · Na₂O)
     ========================================================= */
  const IONDB = {
    NaCl: { f: 'NaCl', name: '염화 나트륨', metals: ['Na'], nm: 'Cl', xs: [0.27, 0.73], nmX: 1, ions: '[Na]⁺ [:Cl:]⁻', ionH: '[Na]<sup>+</sup>[:Cl:]<sup>−</sup>', q: 1 },
    MgO: { f: 'MgO', name: '산화 마그네슘', metals: ['Mg'], nm: 'O', xs: [0.27, 0.73], nmX: 1, ions: '[Mg]²⁺ [:O:]²⁻', ionH: '[Mg]<sup>2+</sup>[:O:]<sup>2−</sup>', q: 2 },
    Na2O: { f: 'Na₂O', name: '산화 나트륨', metals: ['Na', 'Na'], nm: 'O', xs: [0.17, 0.5, 0.83], nmX: 1, ions: '2[Na]⁺ [:O:]²⁻', ionH: '2[Na]<sup>+</sup>[:O:]<sup>2−</sup>', q: 1 },
  };
  const IO = { key: 'NaCl', mleft: [], recv: 0, resv: 0, fly: [], done: {}, brA: 0, tok: 0 };
  const iondef = () => IONDB[IO.key];
  const ionY = () => (PHONE ? 300 : 270);
  const ionNmPos = () => { const d = iondef(); return { x: VW * d.xs[1], y: ionY() }; };
  function ionMetalPos(mi) {
    const d = iondef();
    if (d.metals.length === 1) return { x: VW * d.xs[0], y: ionY() };
    return { x: VW * (mi === 0 ? d.xs[0] : d.xs[2]), y: ionY() };
  }
  const ionFace = (mi) => { const m = ionMetalPos(mi), n = ionNmPos(); return m.x < n.x ? 1 : 3; };
  const ionMetalDotPos = (mi, k) => {
    const m = ionMetalPos(mi), left = IO.mleft[mi], s = ionFace(mi);
    const p = sidePos(m.x, m.y, s, k, left, atomRd(), atomG());
    return p;
  };
  function resetIon(key) {
    if (key) IO.key = key;
    hintEl.classList.add('hide');
    const d = iondef();
    IO.tok++; IO.mleft = d.metals.map((m) => valOf(m)); IO.recv = 0; IO.resv = 0; IO.fly = []; IO.brA = 0;
    $$('#ionSeg button').forEach((b) => b.classList.toggle('on', b.dataset.i === IO.key));
    $('#ionNote').textContent = '금속 원자의 전자 점을 눌러 ' + d.nm + ' 원자로 옮겨 보세요. 금속은 전자를 잃고 비금속은 전자를 얻어요.';
  }
  const ionTotal = () => iondef().metals.reduce((s, m) => s + valOf(m), 0);
  const ionDone = () => IO.recv >= ionTotal() && IO.fly.length === 0;
  function ionTap(p) {
    const d = iondef();
    for (let mi = 0; mi < d.metals.length; mi++) {
      const left = IO.mleft[mi];
      for (let k = 0; k < left; k++) {
        const q = ionMetalDotPos(mi, k);
        if (Math.hypot(p.x - q.x, p.y - q.y) < 26) {
          // 이 점을 비금속 원자의 빈 자리로 보냄
          const idx = valOf(d.nm) + IO.resv;
          const s = idx % 4, kk = idx < 4 ? 0 : 1;
          const cnt = ruleCounts(idx + 1);
          const n = cnt[s], c = ionNmPos();
          const to = sidePos(c.x, c.y, s, kk, n, atomRd(), atomG());
          const f = { x: q.x, y: q.y, tx: to.x, ty: to.y, sx: q.x, sy: q.y, t: 0, idx };
          IO.mleft[mi]--; IO.resv++;
          IO.fly.push(f);
          Sound.tick();
          const tk = IO.tok;
          tween(f, { t: 1 }, { duration: 0.7, ease: 'inOutQuad', onDone: () => {
            if (tk !== IO.tok) return;
            IO.fly = IO.fly.filter((z) => z !== f); IO.recv++;
            fx.burst(f.tx, f.ty, { count: 8, colors: [ORANGE, AMBER, '#fff6c2'], speed: 80, size: 3, gravity: 0, life: 0.5 });
            if (ionDone()) {
              IO.done[IO.key] = true; Sound.success();
              tween(IO, { brA: 1 }, { duration: 0.7, ease: 'outBack' });
              const cc = ionNmPos();
              fx.burst(cc.x, cc.y, { count: 26, colors: [AMBER, ORANGE, '#34d399', '#a78bfa'], speed: 170, size: 3.5 });
              showHint(d.name + ' ' + d.f + ' 전자점식 완성: ' + d.ions, 5500);
            }
          } });
          return true;
        }
      }
    }
    return false;
  }
  function drawBracket(x, y, w, h, side, charge, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const l = x - w / 2, r = x + w / 2, tp = y - h / 2, bt = y + h / 2, e = 14;
    ctx.beginPath(); ctx.moveTo(l + e, tp); ctx.lineTo(l, tp); ctx.lineTo(l, bt); ctx.lineTo(l + e, bt); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r - e, tp); ctx.lineTo(r, tp); ctx.lineTo(r, bt); ctx.lineTo(r - e, bt); ctx.stroke();
    D.text(r + 8, tp + 10, charge, { size: fs(24), weight: 800, color: charge.indexOf('+') >= 0 ? '#e2464b' : '#3867f4', align: 'left' });
    ctx.restore();
    void side;
  }
  function drawIon(t) {
    const d = iondef(), nm = ionNmPos();
    D.text(VW / 2, TY, d.name + ' ' + d.f + (IO.done[IO.key] ? ' · 완성!' : ''), { size: fs(20), weight: 800, color: IO.done[IO.key] ? '#0b6b39' : '#4c1d95' });
    const nmV = valOf(d.nm);
    // 금속 원자
    d.metals.forEach((m, mi) => {
      const P = ionMetalPos(mi), left = IO.mleft[mi];
      badge(P.x, P.y, m, 40, { halo: left === 0 ? '#fecaca' : null });
      for (let k = 0; k < left; k++) {
        const q = ionMetalDotPos(mi, k);
        const o = sp('im' + mi + '_' + k, q.x, q.y, 14);
        const pulse = 1 + 0.12 * Math.sin(t * 5 + k);
        dot(o.x, o.y, 9 * pulse, AMBER);
      }
      if (left > 0) D.text(P.x, P.y + atomRd() + 38, '전자 점을 눌러요', { size: fs(12), weight: 800, color: MUTED });
    });
    // 비금속 원자 (받은 전자는 주황색)
    badge(nm.x, nm.y, d.nm, 40, { halo: IO.recv >= ionTotal() ? '#bfdbfe' : null });
    const total = nmV + IO.recv;
    const cnt = ruleCounts(total);
    for (let s = 0; s < 4; s++) for (let k = 0; k < cnt[s]; k++) {
      const q = sidePos(nm.x, nm.y, s, k, cnt[s], atomRd(), atomG());
      const o = sp('in' + s + '_' + k, q.x, q.y, 14);
      const ord = k === 0 ? s : s + 4;
      dot(o.x, o.y, 9, ord >= nmV ? ORANGE : AMBER);
    }
    if (IO.recv < ionTotal()) {
      const idx = nmV + IO.resv;
      if (idx < 8) { const s = idx % 4, kk = idx < 4 ? 0 : 1; const q = sidePos(nm.x, nm.y, s, kk, 2, atomRd(), atomG()); ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.55)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(q.x, q.y, 10, 0, TAU); ctx.stroke(); ctx.restore(); }
    }
    // 날아가는 전자
    IO.fly.forEach((f) => {
      const e = f.t, x = lerp(f.sx, f.tx, e), y = lerp(f.sy, f.ty, e) - Math.sin(e * Math.PI) * 28;
      D.glow(x, y, 22, ORANGE, 0.5); dot(x, y, 9, ORANGE);
    });
    // 이온 괄호와 전하
    if (IO.brA > 0.01) {
      const a = clamp(IO.brA, 0, 1);
      d.metals.forEach((m, mi) => { const P = ionMetalPos(mi); drawBracket(P.x, P.y, 108 * a + 20, 108, 0, d.q === 2 ? '2+' : '+', a); });
      drawBracket(nm.x, nm.y, 156 * a + 20, 156, 0, d.q === 2 || d.metals.length === 2 ? '2−' : '−', a);
      d.metals.forEach((m, mi) => { const P = ionMetalPos(mi); D.label(P.x, P.y + 78, '양이온 ' + m + (d.q === 2 ? '²⁺' : '⁺'), { size: fs(13), bg: '#fee2e2', color: '#991b1b', border: '#e2464b', pad: 7 }); });
      D.label(nm.x, nm.y + 96, '음이온 ' + d.nm + (d.q === 2 || d.metals.length === 2 ? '²⁻' : '⁻'), { size: fs(13), bg: '#dbeafe', color: '#1e3a8a', border: '#3867f4', pad: 7 });
      D.text(VW / 2, nm.y + 150, d.ions, { size: fs(24), weight: 800, color: '#4c1d95' });
      D.text(VW / 2, nm.y + 150 + fs(26), '금속 양이온은 전자가 없고, 비금속 음이온은 점 8개 (옥텟)', { size: fs(13), weight: 700, color: MUTED });
    } else {
      D.text(VW / 2, nm.y + 130, '금속 → 비금속으로 전자 이동 (옮긴 전자 ' + IO.recv + '/' + ionTotal() + ')', { size: fs(14), weight: 700, color: MUTED });
    }
    void nmV;
  }

  /* =========================================================
     포인터 · 화면 갱신
     ========================================================= */
  function updateReadouts() {
    const sc = S.scene;
    if (sc === 'atom') {
      const e = ELS[A.z], v = valOf(e.s);
      setRO(1, '원소', e.n + ' ' + e.s + ' (' + A.z + '번)');
      setRO(2, '전자 배치', shellsOf(A.z).join(' · ') + ' → 최외각 ' + v + '개');
      setRO(3, '찍은 점 / 원자가 전자', A.dots + ' / ' + v + (A.dots === v ? ' ✅' : ''));
    } else if (sc === 'mol') {
      const M = mdef();
      setRO(1, '분자', M.html + ' ' + M.name);
      setRO(2, '공유 전자쌍', nBonded() + '쌍 / ' + M.bonds.length + '쌍');
      setRO(3, '비공유 전자쌍', M.lone.reduce((s, n) => s + n, 0) + '쌍');
    } else if (sc === 'wizard') {
      const M = wdef();
      setRO(1, '분자', M.html + ' ' + M.name);
      setRO(2, '총 원자가 전자', W.k >= 1 ? wSumText() : '? (① 단계에서 구해요)');
      setRO(3, '그림 속 점 (검산)', W.k >= 3 ? wDrawn() + '개' + (W.k >= 4 && wDrawn() === M.total ? ' = ' + M.total + ' ✅' : '') : '-');
    } else {
      const d = iondef();
      setRO(1, '화합물', d.f + ' ' + d.name);
      setRO(2, '옮긴 전자', IO.recv + ' / ' + ionTotal() + '개');
      setRO(3, '이온 결합 전자점식', ionDone() ? d.ionH : '전자를 옮기면 나타나요');
    }
  }
  SciSim.pointer(view, {
    down(p) {
      const sc = S.scene;
      if (sc === 'atom') { const z = ptHit(p); if (z) selectEl(z); return false; }
      if (sc === 'mol') {
        const i = molAtomAt(p);
        if (i < 0) return false;
        const P = molPos(i);
        MO.drag = { i, gx: P.x - p.x, gy: P.y - p.y, moved: false };
        return true;
      }
      if (sc === 'wizard') { wizTap(p); return false; }
      if (sc === 'ionic') { ionTap(p); return false; }
      return false;
    },
    move(p) {
      const d = MO.drag;
      if (S.scene !== 'mol' || !d) return;
      const b = molBase(d.i), tx = p.x + d.gx, ty = p.y + d.gy;
      const nx = clamp(tx, 30, VW - 30), ny = clamp(ty, 60, VH - 70);
      MO.off[d.i].x = nx - b.x; MO.off[d.i].y = ny - b.y;
      if (Math.hypot(p.x + d.gx - (b.x), p.y + d.gy - (b.y)) > 8) d.moved = true;
    },
    up() {
      const d = MO.drag;
      if (S.scene !== 'mol' || !d) return;
      const P = molPos(d.i), h = molHome(d.i);
      if (!d.moved || Math.hypot(P.x - h.x, P.y - h.y) < 70) bondMol(d.i);
      else tween(MO.off[d.i], { x: 0, y: 0 }, { duration: 0.45, ease: 'outBack' });
      MO.drag = null;
    },
    hover(p) {
      const sc = S.scene;
      if (sc === 'atom') return ptHit(p) ? 'pointer' : null;
      if (sc === 'mol') return molAtomAt(p) >= 0 ? 'grab' : null;
      if (sc === 'wizard') return (W.k === 1 && wAtomAt(p) >= 0) || (W.k === 4 && wNeedConv() && wBondAt(p) >= 0) ? 'pointer' : null;
      if (sc === 'ionic') {
        const d = iondef();
        for (let mi = 0; mi < d.metals.length; mi++) for (let k = 0; k < IO.mleft[mi]; k++) { const q = ionMetalDotPos(mi, k); if (Math.hypot(p.x - q.x, p.y - q.y) < 26) return 'pointer'; }
      }
      return null;
    },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t0 = e.touches[0]; if (!t0) return;
      const p = view.toLocal(t0);
      if (S.scene === 'mol' && molAtomAt(p) >= 0) e.preventDefault();
    }, { passive: false });
  }

  $('#addDot').addEventListener('click', addDot);
  $('#clrDot').addEventListener('click', clearDots);
  $$('#molSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); resetMol(b.dataset.m); }));
  $$('#wizSel .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); resetWiz(b.dataset.w); }));
  $('#wizNext').addEventListener('click', () => { Sound.click(); wizAdvance(); });
  $('#wizBack').addEventListener('click', wizBack);
  $$('#ionSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); resetIon(b.dataset.i); }));
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $$('#viewSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.view = b.dataset.view; updateUI(); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    const sc = S.scene;
    if (sc === 'atom') { A.dots = 0; A.over = 0; }
    else if (sc === 'mol') resetMol();
    else if (sc === 'wizard') resetWiz();
    else resetIon();
  });

  function bgFill() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#f7f4fe'); g.addColorStop(1, '#ece7f9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function draw(t) {
    view.clear(BG);
    bgFill();
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    const sc = S.scene;
    if (sc === 'atom') drawAtomScene(t);
    else if (sc === 'mol') drawMol(t);
    else if (sc === 'wizard') drawWiz(t);
    else drawIon(t);
    fx.draw(ctx);
    ctx.restore();
    frameEnd();
  }

  /* ---------- 문제 그림 ---------- */
  function figO() {
    const d = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#ffb400" stroke="#92600a" stroke-width="1.2"/>';
    return '<svg class="fig-box" viewBox="0 0 300 150" width="300" height="150" role="img" aria-label="산소 원자의 전자점식: 위와 오른쪽에 전자쌍 2쌍, 아래와 왼쪽에 홀전자 1개씩">' +
      '<circle cx="150" cy="72" r="26" fill="#fff" stroke="#e2464b" stroke-width="3"/><text x="150" y="82" text-anchor="middle" font-size="28" font-weight="800" fill="#1b2333">O</text>' +
      d(143, 28) + d(157, 28) + d(194, 65) + d(194, 79) + d(150, 118) + d(106, 72) + '</svg>';
  }
  function figCO2() {
    const d = (x, y, c) => '<circle cx="' + x + '" cy="' + y + '" r="4.6" fill="' + (c || '#3867f4') + '"/>';
    const cap = (x) => '<rect x="' + (x - 17) + '" y="55" width="34" height="18" rx="9" fill="#dcfce7" stroke="#14a058" stroke-width="1.6"/>' + d(x - 6, 64, '#34d399') + d(x + 6, 64, '#34d399');
    const pair = (x, y) => d(x - 6, y) + d(x + 6, y);
    return '<svg class="fig-box" viewBox="0 0 340 130" width="340" height="130" role="img" aria-label="단일 결합만으로 그린 O–C–O: 산소 둘레 전자는 8개, 탄소 둘레 전자는 4개">' +
      '<circle cx="60" cy="64" r="22" fill="#fff" stroke="#e2464b" stroke-width="3"/><text x="60" y="73" text-anchor="middle" font-size="24" font-weight="800" fill="#1b2333">O</text>' +
      '<circle cx="170" cy="64" r="22" fill="#fff" stroke="#475569" stroke-width="3"/><text x="170" y="73" text-anchor="middle" font-size="24" font-weight="800" fill="#1b2333">C</text>' +
      '<circle cx="280" cy="64" r="22" fill="#fff" stroke="#e2464b" stroke-width="3"/><text x="280" y="73" text-anchor="middle" font-size="24" font-weight="800" fill="#1b2333">O</text>' +
      cap(115) + cap(225) + pair(60, 28) + pair(60, 100) + d(24, 58) + d(24, 70) + pair(280, 28) + pair(280, 100) + d(316, 58) + d(316, 70) +
      '<text x="170" y="124" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6879">단일 결합만 쓰면 C 둘레 전자는 몇 개일까요?</text></svg>';
  }

  /* ---------- 미션 ---------- */
  const molMade = () => ['H2', 'HF', 'H2O', 'NH3', 'CH4'].filter((k) => MO.made[k]).length;
  const dotsDone = () => [3, 4, 5, 6, 7, 9].map((z) => !!A.done[z]);
  const levels = [
    /* ---------- 1단계 · 모형 ---------- */
    {
      title: '원자가 전자를 점으로 나타내요', short: '원자의 점', icon: '⚫', phase: '모형',
      features: ['atom'],
      intro: '<p class="si-q">❓ 탐구 질문: 원자와 원자가 전자를 나누어 가질 때, 전자의 짝을 한눈에 보는 그림은 어떻게 그릴까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 원자의 최외각 전자 수와 안정한 전자 배치(옥텟), 그리고 공유 결합에서 전자쌍을 공유하는 모습을 배웠어요. 이번에는 결합에 쓰이는 <b>가장 바깥 전자만 점</b>으로 간단히 나타내 봐요.</div>' +
        '<p>원소를 고르고 <b>➕ 점 찍기</b>를 눌러 <b>원자가 전자</b>(최외각 전자) 수만큼 점을 찍어요. 점은 <b>위 → 오른쪽 → 아래 → 왼쪽</b> 순서로 한 개씩 찍고, 5번째부터는 같은 순서로 짝을 지어요.</p>',
      setup() { setScene('atom'); showHint('주기율표에서 원소를 고르고 ➕ 점 찍기를 눌러 보세요', 4500); },
      recap: '루이스 전자점식은 원소 기호 둘레에 <b>원자가 전자</b>를 점으로 나타낸 거예요. 점은 4방향에 1개씩 먼저 찍고, 5번째부터 짝을 지어요. 짝이 없는 점을 <b>홀전자</b>라고 해요.',
      summary: '<ul><li><b>루이스 전자점식</b>: 원소 기호 둘레에 <b>원자가 전자</b>(최외각 전자)를 점으로 나타낸 식.</li>' +
        '<li>점 찍는 순서: 위 → 오른쪽 → 아래 → 왼쪽으로 <b>1개씩</b>, 5번째부터 같은 순서로 <b>짝</b>을 지어요.</li>' +
        '<li>짝이 없는 전자 = <b>홀전자</b> (결합에 쓰이는 전자).</li></ul>' +
        '<table class="mini"><tr><th>원소</th><th>Li</th><th>Be</th><th>B</th><th>C</th><th>N</th><th>O</th><th>F</th></tr><tr><td>원자가 전자</td><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td></tr><tr><td>홀전자</td><td>1</td><td>2</td><td>3</td><td>4</td><td>3</td><td>2</td><td>1</td></tr></table>',
      missions: [
        {
          title: '6개 원소의 점 찍기',
          goal: '<b>Li · Be · B · C · N · F</b>를 하나씩 골라 원자가 전자 수만큼 점을 찍어요.',
          hint: '원소를 고르면 전자 배치(예: C는 2 · 4)가 보여요. 가장 바깥 껍질의 전자 수만큼 ➕ 점 찍기를 눌러요.',
          setup() { A.done = {}; A.dots = 0; A.over = 0; setScene('atom'); },
          check: () => dotsDone().every(Boolean),
          hold: 0.5,
          status: () => [[3, 'Li'], [4, 'Be'], [5, 'B'], [6, 'C'], [7, 'N'], [9, 'F']].map(([z, s]) => mark(!!A.done[z]) + ' ' + s).join(' · '),
          explain: '원자가 전자 수는 가장 바깥 전자껍질의 전자 수예요. Li 1, Be 2, B 3, C 4, N 5, F 7개. 점은 4방향에 1개씩 먼저 찍고 5번째부터 짝을 지으므로 N(5개)은 홀전자 3개 + 전자쌍 1쌍, F(7개)는 전자쌍 3쌍 + 홀전자 1개가 돼요.',
        },
        {
          type: 'quiz', title: '산소의 홀전자',
          get figure() { return figO(); },
          goal: '산소(O)의 전자점식에서 짝을 짓지 못한 <b>홀전자</b>는 몇 개일까요?',
          choices: ['0개', '1개', '2개', '4개'],
          answer: 2,
          feedback: ['O는 원자가 전자가 6개예요. 그림에서 짝 없는 점이 있는지 다시 세어 봐요.', '아래와 왼쪽에 점이 한 개씩 있어요. 짝 없는 점이 한 곳만은 아니에요.', '', '점 6개 중 4개는 짝(전자쌍 2쌍)이에요. 짝 없는 전자는 나머지예요.'],
          explain: '산소의 점 6개는 위와 오른쪽에서 전자쌍 2쌍(4개)을 이루고, 아래와 왼쪽에 <b>홀전자 2개</b>가 남아요. 그래서 산소는 공유 결합을 2개 만들 수 있어요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '전자쌍을 공유해 분자를 그려요', short: '분자 그리기', icon: '🤝', phase: '탐구',
      features: ['mol'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원자가 전자를 점으로 나타내고, 짝 없는 <b>홀전자</b>를 찾았어요. 홀전자를 가진 원자끼리 만나면 어떻게 될까요?</div>' +
        '<p>바깥 원자를 끌어 가운데 원자에 가까이 가져가면 <b>홀전자끼리 짝</b>을 지어 <b>공유 전자쌍</b>이 돼요. 처음부터 짝이던 전자는 그대로 <b>비공유 전자쌍</b>으로 남아요.</p>' +
        '<p class="note">원자 옆의 숫자는 원자 둘레의 전자 수예요. 모두 <b>8개</b>(H는 <b>2개</b>)가 되면 안정해요.</p>',
      setup() { setScene('mol'); resetMol('H2'); TBL.show = false; updateUI(); showHint('바깥 원자를 끌어 가운데 원자에 붙여 보세요', 4500); },
      recap: '홀전자끼리 전자쌍을 <b>공유</b>하면 각 원자 둘레의 전자가 8개(H는 2개)가 돼요. 결합에 쓰인 전자쌍은 <b>공유 전자쌍</b>, 쓰이지 않은 전자쌍은 <b>비공유 전자쌍</b>이에요.',
      summary: '<table class="mini"><tr><th>분자</th><th>공유 전자쌍</th><th>비공유 전자쌍</th></tr><tr><td>H₂</td><td>1</td><td>0</td></tr><tr><td>HF</td><td>1</td><td>3</td></tr><tr><td>H₂O</td><td>2</td><td>2</td></tr><tr><td>NH₃</td><td>3</td><td>1</td></tr><tr><td>CH₄</td><td>4</td><td>0</td></tr></table>' +
        '<ul><li><b>공유 전자쌍</b>: 두 원자가 함께 쓰는 전자쌍 (결합선 1개).</li><li><b>비공유 전자쌍</b>: 한 원자에만 속한 전자쌍.</li><li>각 원자 둘레 전자가 8개(H는 2개)가 되면 안정 → <b>옥텟 규칙</b>.</li></ul>',
      missions: [
        {
          title: '분자 4개 완성하기',
          goal: '<b>H₂ · HF · H₂O · NH₃ · CH₄</b> 중 <b>4개</b>를 완성해 보세요.',
          hint: '바깥 원자를 가운데 원자 쪽 점선 고리로 끌거나 눌러요. 모든 원자의 둘레 전자가 8개(H는 2개)가 되면 완성이에요.',
          setup() { MO.made = {}; resetMol('H2'); setScene('mol'); },
          check: () => molMade() >= 4,
          hold: 0.6,
          status: () => ['H2', 'HF', 'H2O', 'NH3', 'CH4'].map((k) => mark(MO.made[k]) + ' ' + MOLDB[k].f).join(' · ') + ' (' + molMade() + '/4)',
          explain: '분자가 완성되면 모든 원자의 둘레 전자가 8개(H는 2개)가 돼요. 홀전자 수가 O는 2개, N은 3개, C는 4개, F와 H는 1개라서, 그만큼의 H 원자와 전자쌍을 공유해요.',
        },
        {
          title: '전자쌍 수 세어 표 채우기', manual: true,
          goal: '<b>H₂O · NH₃ · CH₄ · HF</b>의 공유 전자쌍과 비공유 전자쌍 수를 표에 채워요.',
          hint: '분자를 완성한 뒤 초록 타원(공유 전자쌍)과 파란 점 2개(비공유 전자쌍)를 세어 봐요. 4개 분자를 각각 만들어 보세요.',
          setup() { $$('#tblBody select').forEach((q) => { q.value = ''; q.classList.remove('ok', 'bad'); }); setScene('mol'); TBL.show = true; updateUI(); },
          check: () => tblCheck(),
          status: () => '📋 채운 칸 ' + tblFilled() + ' / 8',
          explain: 'H₂O는 공유 2쌍 · 비공유 2쌍, NH₃는 공유 3쌍 · 비공유 1쌍, CH₄는 공유 4쌍 · 비공유 0쌍, HF는 공유 1쌍 · 비공유 3쌍이에요. H₂O, NH₃, CH₄, HF 모두 중심 원자 둘레의 전자쌍(공유 + 비공유)은 합쳐서 4쌍(전자 8개)이에요.',
        },
        {
          type: 'quiz', title: 'NH₃의 비공유 전자쌍',
          goal: '암모니아(NH₃)의 질소(N) 원자에는 <b>비공유 전자쌍</b>이 몇 쌍 있을까요?',
          choices: ['0쌍', '1쌍', '2쌍', '3쌍'],
          answer: 1,
          feedback: ['N은 원자가 전자가 5개예요. 3개는 H와 공유 전자쌍을 만드는 데 쓰이고, 나머지가 남아요.', '', 'N의 원자가 전자 5개 중 홀전자는 3개뿐이에요. 비공유 전자쌍 2쌍이면 전자만 4개가 짝이에요.', '3쌍은 N–H 공유 전자쌍의 수예요. 비공유 전자쌍은 아니에요.'],
          explain: 'N의 원자가 전자 5개 중 홀전자 3개가 H 3개와 공유 전자쌍 3쌍을 이루고, 남은 전자 2개는 짝을 이룬 <b>비공유 전자쌍 1쌍</b>이에요. 그래서 N 둘레 전자는 6 + 2 = 8개예요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '5단계 요령으로 그려요', short: '5단계 요령', icon: '📝', phase: '설명',
      features: ['wizard'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 단일 결합으로 이루어진 분자를 그렸어요. 그런데 O₂나 N₂처럼 전자쌍을 2쌍, 3쌍 공유하는 분자는 어떻게 그릴까요?</div>' +
        '<p>누가 그려도 같은 결과가 나오는 <b>5단계 요령</b>을 익혀요.<br>① 원자가 전자 수의 합 → ② 중심 원자 정하기 → ③ 단일 결합으로 연결 → ④ 말단 원자부터 옥텟 채우기 → ⑤ 모자라면 <b>다중 결합</b>으로 바꾸기</p>' +
        '<p class="note">마지막에 그림 속 점의 수가 ①에서 구한 합과 같은지 <b>검산</b>해요.</p>',
      setup() { setScene('wizard'); resetWiz('CO2'); showHint('단계마다 안내를 따라 CO₂부터 그려 보세요', 4500); },
      recap: '5단계: ① 원자가 전자 수의 합 ② 중심 원자 ③ 단일 결합 ④ 말단 원자 옥텟 ⑤ 모자라면 <b>다중 결합</b>. 그림 속 점의 수는 항상 ①의 합과 같아야 해요.',
      summary: '<ol><li>모든 원자의 <b>원자가 전자 수의 합</b> 구하기</li><li><b>중심 원자</b> 정하기 (H는 말단, 보통 전기 음성도가 작거나 결합을 많이 하는 원자)</li><li>중심–말단을 <b>단일 결합</b>(전자쌍 1개)으로 연결</li><li><b>말단 원자부터</b> 옥텟(H는 2개) 채우기, 남는 전자는 중심 원자에</li><li>중심 원자가 모자라면 비공유 전자쌍을 <b>다중 결합</b>으로 바꾸기</li></ol>' +
        '<table class="mini"><tr><th>분자</th><th>총 전자</th><th>공유 / 비공유 전자쌍</th><th>결합</th></tr><tr><td>CO₂</td><td>16</td><td>4 / 4</td><td>C=O 2개</td></tr><tr><td>N₂</td><td>10</td><td>3 / 2</td><td>N≡N</td></tr><tr><td>O₂</td><td>12</td><td>2 / 4</td><td>O=O</td></tr><tr><td>HCN</td><td>10</td><td>4 / 1</td><td>H–C≡N</td></tr><tr><td>C₂H₄</td><td>12</td><td>6 / 0</td><td>C=C</td></tr></table>',
      missions: [
        {
          title: 'CO₂ 단계별로 그리기',
          goal: '<b>CO₂</b>를 ①~⑤ 단계에 따라 끝까지 그려요. 총 전자는 16개예요.',
          hint: '② 에서는 C를 눌러요. ⑤ 에서는 O 쪽 결합을 눌러 비공유 전자쌍을 공유 전자쌍으로 바꿔요. 두 결합 모두 바꿔야 C가 옥텟이 돼요.',
          setup() { setScene('wizard'); resetWiz('CO2'); },
          check: () => W.key === 'CO2' && W.k === 5,
          hold: 0.6,
          status: () => WSTEPS.map((s, i) => mark(W.key === 'CO2' && W.k > i) + ' ' + s).join(' ') ,
          explain: 'CO₂의 원자가 전자 합은 4 + 6 + 6 = 16개예요. 단일 결합으로만 연결하고 O를 옥텟으로 채우면 C 둘레 전자가 4개뿐이에요. 그래서 두 O의 비공유 전자쌍을 하나씩 공유 전자쌍으로 바꿔 <b>C=O 이중 결합 2개</b>가 되면 C도 8개가 돼요.',
        },
        {
          title: 'N₂와 HCN 그리기',
          goal: '<b>N₂</b>(삼중 결합)와 <b>HCN</b>(H–C≡N)을 5단계로 그려요.',
          hint: 'N₂는 총 10개예요. 마지막 단계에서 결합을 두 번 눌러요. HCN에서 중심 원자는 C예요 (H는 말단).',
          setup() { delete W.done.N2; delete W.done.HCN; delete W.done.O2; setScene('wizard'); resetWiz('N2'); },
          check: () => !!W.done.N2 && !!W.done.HCN,
          hold: 0.6,
          status: () => mark(!!W.done.N2) + ' N₂ · ' + mark(!!W.done.HCN) + ' HCN' + (W.done.O2 ? ' · ✨ O₂도 해 봤어요' : ''),
          explain: 'N₂는 5 + 5 = 10개로, 결합을 두 번 바꾸면 <b>삼중 결합</b>(공유 3쌍)과 각 N에 비공유 1쌍이 남아요. HCN은 1 + 4 + 5 = 10개로 H–C는 단일 결합, C≡N은 삼중 결합이에요. O₂는 12개라 이중 결합 1개가 돼요.',
        },
        {
          type: 'quiz', title: '단일 결합만으로는 부족한 까닭',
          get figure() { return figCO2(); },
          goal: 'CO₂를 단일 결합 두 개로만 그리면 안 되는 까닭은?',
          choices: ['중심 원자 C 둘레 전자가 4개뿐이라 옥텟을 이루지 못하기 때문이에요', '산소 원자가 전자를 하나도 갖지 못하기 때문이에요', '단일 결합만 쓰면 총 전자 수가 16개에서 12개로 줄기 때문이에요', 'C는 이중 결합만 만들 수 있는 원소이기 때문이에요'],
          answer: 0,
          feedback: ['', 'O는 공유 전자쌍 1쌍과 비공유 전자쌍 3쌍으로 이미 옥텟이에요. 모자란 쪽은 C예요.', '총 전자 수는 그대로 16개예요. 비공유 전자쌍을 공유 전자쌍으로 옮길 뿐이에요.', 'C는 CH₄에서 단일 결합 4개를 만들었어요. 결합 수는 옥텟을 채우는 데 필요한 만큼 달라져요.'],
          explain: '단일 결합만 쓰면 C 둘레는 공유 전자쌍 2쌍 = 전자 4개예요. 옥텟(8개)이 되려면 O의 비공유 전자쌍을 C와 공유해 <b>이중 결합 2개</b>로 바꿔야 해요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '예외와 이온 결합까지', short: '예외와 확장', icon: '🧪', phase: '적용',
      features: ['exc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 5단계 요령으로 모든 원자가 옥텟을 이루는 분자를 그렸어요. 그런데 모든 분자가 옥텟을 이루는 것은 아니에요.</div>' +
        '<p><b>Be</b>와 <b>B</b>는 원자가 전자가 2개, 3개뿐이어서 옥텟 규칙의 <b>예외</b>가 돼요. PCl₃(중심 원자가 3주기 원소 P)와 CCl₄도 그려 봐요.</p>' +
        '<p>또 <b>이온 결합 화합물</b>은 전자를 공유하지 않고 <b>옮기는</b> 결합이라서, 금속의 점을 비금속으로 옮겨 이온의 전자점식 [ ]으로 나타내요.</p>',
      setup() { setScene('wizard'); resetWiz('BeCl2'); showHint('BeCl₂를 5단계로 그려 보세요. 마지막에 Be 둘레 전자를 세어 봐요', 4500); },
      recap: 'Be(전자 4개)와 B(전자 6개)는 <b>옥텟 규칙의 예외</b>예요. 이온 결합 화합물은 금속의 전자가 비금속으로 <b>이동</b>해 양이온은 [ ]⁺, 음이온은 점 8개의 [ ]⁻로 나타내요.',
      summary: '<ul><li><b>BeCl₂</b>: 총 16개 · 공유 2쌍 · 비공유 6쌍 → Be 둘레 전자 <b>4개</b> (예외)</li><li><b>BF₃</b>: 총 24개 · 공유 3쌍 · 비공유 9쌍 → B 둘레 전자 <b>6개</b> (예외)</li><li><b>PCl₃</b>: 총 26개 · 공유 3쌍 · 비공유 10쌍 (P에 1쌍)</li><li><b>CCl₄</b>: 총 32개 · 공유 4쌍 · 비공유 12쌍</li></ul>' +
        '<p>이온 결합 화합물의 전자점식 (금속 양이온은 전자가 없는 [ ], 비금속 음이온은 점 8개):</p><span class="formula">[Na]⁺ [:Cl:]⁻ &nbsp; [Mg]²⁺ [:O:]²⁻ &nbsp; 2[Na]⁺ [:O:]²⁻</span>',
      missions: [
        {
          title: 'BeCl₂와 BF₃ 그리기',
          goal: '<b>BeCl₂</b>와 <b>BF₃</b>를 5단계로 그리고, 중심 원자 둘레 전자 수를 확인해요.',
          hint: '③~④ 단계 뒤에 중심 원자의 둘레 전자를 세어 보세요. Be는 4개, B는 6개라서 옥텟이 아니에요. ⑤에서 옥텟 검사를 눌러요.',
          setup() { ['BeCl2', 'BF3', 'PCl3', 'CCl4'].forEach((k) => { delete W.done[k]; }); setScene('wizard'); resetWiz('BeCl2'); },
          check: () => !!W.done.BeCl2 && !!W.done.BF3,
          hold: 0.6,
          status: () => mark(!!W.done.BeCl2) + ' BeCl₂ · ' + mark(!!W.done.BF3) + ' BF₃' + (W.done.PCl3 || W.done.CCl4 ? ' · ✨ ' + [W.done.PCl3 ? 'PCl₃' : '', W.done.CCl4 ? 'CCl₄' : ''].filter(Boolean).join('·') + '도 완성' : ''),
          explain: 'BeCl₂는 Be의 원자가 전자가 2개뿐이라 공유 전자쌍이 2쌍(전자 4개)에 그쳐요. BF₃는 B의 원자가 전자가 3개라 공유 전자쌍이 3쌍(전자 6개)이에요. 이처럼 중심 원자가 옥텟을 이루지 않는 경우가 <b>옥텟 규칙의 예외</b>예요.',
        },
        {
          title: '이온 결합 전자점식 2개',
          goal: '<b>NaCl · MgO · Na₂O</b> 중 <b>2개</b>에서 금속의 전자를 비금속으로 옮겨 전자점식을 완성해요.',
          hint: '⚡ 이온 결합 화면에서 금속 원자의 노란 점을 눌러요. 비금속 원자의 빈자리(점선)로 전자가 날아가요. 점이 8개가 될 때까지 옮겨요.',
          setup() { IO.done = {}; setScene('ionic'); resetIon('NaCl'); },
          check: () => Object.keys(IO.done).filter((k) => IO.done[k]).length >= 2,
          hold: 0.8,
          status: () => ['NaCl', 'MgO', 'Na2O'].map((k) => mark(!!IO.done[k]) + ' ' + IONDB[k].f).join(' · '),
          explain: 'Na는 전자 1개를 잃어 Na⁺, Cl은 전자 1개를 얻어 Cl⁻(점 8개)가 돼요. Mg는 전자 2개를 잃어 Mg²⁺, O는 2개를 얻어 O²⁻예요. Na₂O는 Na 2개가 전자를 1개씩 O에게 줘요. 이온 결합에서는 전자를 <b>공유하지 않고 이동</b>하므로 괄호와 전하로 나타내요.',
        },
        {
          type: 'quiz', title: 'BF₃의 붕소',
          goal: 'BF₃에서 붕소(B)가 옥텟을 이루지 않는 까닭으로 알맞은 것은?',
          choices: ['B의 원자가 전자가 3개뿐이라 공유 전자쌍이 3쌍(전자 6개)밖에 만들어지지 않기 때문이에요', 'F가 전자를 모두 B에게 주어 버리기 때문이에요', 'B는 단일 결합을 만들 수 없기 때문이에요', 'BF₃의 총 원자가 전자가 24개가 아니기 때문이에요'],
          answer: 0,
          feedback: ['', 'F는 B와 전자를 공유할 뿐 전자를 모두 주지 않아요. 이온 결합과 달리 전자가 이동하지 않아요.', 'BF₃에서도 B–F 단일 결합 3개를 만들었어요.', 'BF₃의 총 원자가 전자는 3 + 7 × 3 = 24개가 맞아요.'],
          explain: 'B는 원자가 전자가 3개라 F 3개와 공유 전자쌍을 3쌍만 만들 수 있어요. 그러면 B 둘레 전자는 6개로 옥텟에 2개 모자라지만, 이 구조가 BF₃의 루이스 구조예요. 이것이 <b>옥텟 규칙의 예외</b>예요.',
        },
      ],
    },
  ];

  buildTable();
  resetMol('H2'); resetWiz('CO2'); resetIon('NaCl'); atomNote();
  game = SciSim.game({
    simId: 'hc-lewis',
    mount: '#game',
    badge: '루이스 구조 박사',
    homeHref: '../../index.html#hc',
    featureLabels: { atom: '⚫ 원자의 점 · 주기율표', mol: '🤝 분자 그리기', wizard: '📝 5단계 마법사', exc: '⚡ 예외 분자 · 이온 결합' },
    onFeatures(set) { F = new Set(set); updateUI(); },
    levels,
  });
  updateUI();
  NOW = performance.now() / 1000;
  SciSim.loop((dt, t) => {
    DT = dt; NOW = t;
    if (S.scene === 'mol') stepMol(dt);
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = {
    S, A, MO, W, IO, TBL, game, levels, VW, VH, MOLDB, IONDB,
    setScene, selectEl, addDot, clearDots, resetMol, bondMol, resetWiz, wizAdvance, wizBack, wizTap, wPos, wBondAt, wNeedConv, wAround, resetIon, ionTap, ionMetalDotPos, molPos, molHome, molComplete,
    wDrawn, wPool, tblCheck, ptHit, PT, ptCell, ionDone, ionTotal,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
  };
})();
