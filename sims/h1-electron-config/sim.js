/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 전자 배치와 결합의 이유 (단원 6차시)
   성취기준 [10통과1-02-03] 세상을 구성하는 원소들의 성질이 주기성을 나타내는 현상을 통해 자연의 규칙성을 도출하고,
   지구와 생명체를 구성하는 주요 원소들이 결합을 형성하는 이유를 해석할 수 있다. (전자 배치와 결합의 이유 부분)
   ① 모형: 전자 배치 (원자번호 1~20 전자껍질 모형, 직접 전자 채우기)
   ② 탐구: 안정한 원소 (He·Ne·Ar는 반응하지 않음, 최외각 껍질이 가득 참)
   ③ 설명: 결합의 이유 (전자를 잃기·얻기·공유로 18족 배치를 이룸)
   ④ 적용: 주요 원소 (H, C, N, O가 더 필요한 전자 수, 수소와 만들 수 있는 분자)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 740 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f1eefb' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function fitSize(str, maxW, size, weight) {
    ctx.save(); let s = size; ctx.font = D.font(s, weight || 800);
    while (s > 11 && ctx.measureText(str).width > maxW) { s -= 0.5; ctx.font = D.font(s, weight || 800); }
    ctx.restore(); return s;
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
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }

  /* ---------- 자료 ---------- */
  const ELS = [[1, 'H', '수소', 1, 1, 1], [2, 'He', '헬륨', 2, 18, 1], [3, 'Li', '리튬', 1, 1, 2], [4, 'Be', '베릴륨', 2, 2, 2], [5, 'B', '붕소', 3, 13, 2], [6, 'C', '탄소', 4, 14, 2], [7, 'N', '질소', 5, 15, 2], [8, 'O', '산소', 6, 16, 2], [9, 'F', '플루오린', 7, 17, 2], [10, 'Ne', '네온', 8, 18, 2],
    [11, 'Na', '나트륨', 1, 1, 3], [12, 'Mg', '마그네슘', 2, 2, 3], [13, 'Al', '알루미늄', 3, 13, 3], [14, 'Si', '규소', 4, 14, 3], [15, 'P', '인', 5, 15, 3], [16, 'S', '황', 6, 16, 3], [17, 'Cl', '염소', 7, 17, 3], [18, 'Ar', '아르곤', 8, 18, 3], [19, 'K', '칼륨', 1, 1, 4], [20, 'Ca', '칼슘', 2, 2, 4]]
    .map((a) => ({ z: a[0], sym: a[1], name: a[2], v: a[3], g: a[4], p: a[5] }));
  const BYSYM = {}; ELS.forEach((e) => { BYSYM[e.sym] = e; });
  const CAP = [2, 8, 8, 2];
  const RAD = [38, 72, 106, 140];
  const ACOL = { H: '#4aa3ff', He: '#f5c518', Li: '#c084fc', C: '#4b5563', N: '#7c5cff', O: '#ef4444', F: '#34d399', Ne: '#fb7185', Na: '#f59e0b', Mg: '#34d399', Cl: '#7ac143', Ar: '#a78bfa' };
  function config(Z) { const c = [0, 0, 0, 0]; let rem = Z; for (let i = 0; i < 4; i++) { const f = Math.min(CAP[i], rem); c[i] = f; rem -= f; } return c; }
  const cfgStr = (c) => c.filter((x) => x > 0).join('-');
  const outerOf = (c) => { let o = -1; c.forEach((n, i) => { if (n > 0) o = i; }); return o; };
  const SLOT_ORDER = [0, 2, 4, 6, 1, 3, 5, 7];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'atom', sub: '', clock: 0, fade: 0,
    Z: 17, seen: new Set(), zHold: 0, lastZ: 0,
    build: { target: 15, counts: [0, 0, 0, 0] },
    tiles: [], tsel: -1, tested: [], test: null, common: new Set(),
    items: [], bsel: -1, shareP: 0, shareT: 0, bondMsg: '',
    need: { H: 0, C: 0, N: 0, O: 0 }, needDone: false, needOK: {},
    center: 'O', hCount: 0, molDone: new Set(), hAtoms: [],
  };
  let game = null;

  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4800);
  }

  const MODE_LABEL = { atom: '⚛️ 전자 배치', noble: '🔥 안정한 원소 시험', bond: '🤝 결합의 이유', major: '🌍 주요 원소' };
  function setScene(mode, sub) {
    if (S.mode !== mode) { S.fade = 1; }
    S.mode = mode; S.sub = sub || '';
    $('#tbLabel').textContent = MODE_LABEL[mode];
    if (mode === 'atom') syncAtom(true);
    if (mode === 'bond') selectItem(S.bsel >= 0 ? S.bsel : -1, true);
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      const modes = n.getAttribute('data-modes').split(' ');
      const sub = n.getAttribute('data-sub'), ns = n.getAttribute('data-notsub');
      n.hidden = !(modes.indexOf(S.mode) >= 0 && (!sub || sub === S.sub) && (!ns || ns !== S.sub));
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#centerSeg button').forEach((b) => b.classList.toggle('on', b.dataset.c === S.center));
    const it = S.items[S.bsel];
    $$('.actions3 .btn').forEach((b) => { b.disabled = !it || it.done; });
    $('#bBondReset').disabled = !it || !it.done && !it.act;
    $('#bTest').disabled = S.tsel < 0 || !!(S.test && S.test.t < 5.2);
    $('#oH').textContent = S.hCount;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode, ''); }));

  /* ================= 원자 (전자껍질 모형) ================= */
  const ER = PHONE ? 6.5 : 8;
  const SPEED = [1.25, 0.8, 0.55, 0.4];
  class Atom {
    constructor(cx, cy, k) { this.cx = cx; this.cy = cy; this.k = k; this.el = [[], [], [], []]; this.ph = [0, 1.1, 2.3, 0.7]; this.Z = 1; this.glow = 0; this.label = ''; }
    alive(s) { return this.el[s].filter((e) => !e.leaving && !e.dead); }
    counts() { return [0, 1, 2, 3].map((s) => this.alive(s).length); }
    setCounts(target, o) {
      o = o || {};
      let n = 0;
      for (let s = 0; s < 4; s++) {
        let cur = this.alive(s).length;
        while (cur < target[s]) {
          const e = { s, a: o.fromA != null ? o.fromA : 0, r: RAD[s] * this.k, alpha: 1, leaving: false, dead: false, pr: 0 };
          if (!o.instant && !RM) {
            e.r = (RAD[3] + 150) * this.k; e.alpha = 0; const d = (o.delay || 0) + n * (o.stagger != null ? o.stagger : 0.06);
            SciSim.tween(e, { r: RAD[s] * this.k }, { duration: 0.7, ease: 'outBack', delay: d });
            SciSim.tween(e, { alpha: 1 }, { duration: 0.2, delay: d });
            n++;
          }
          this.el[s].push(e); cur++;
        }
        while (cur > target[s]) {
          const live = this.alive(s); const e = live[live.length - 1]; e.leaving = true;
          if (o.instant || RM) { e.dead = true; } else {
            const d = (o.delay || 0) + n * 0.12; n++;
            SciSim.tween(e, { r: (RAD[3] + 190) * this.k, alpha: 0 }, { duration: 0.75, ease: 'inCubic', delay: d, onDone: () => { e.dead = true; } });
          }
          cur--;
        }
      }
    }
    update(dt) {
      for (let s = 0; s < 4; s++) {
        this.ph[s] += dt * SPEED[s] * (RM ? 0.15 : 1);
        const live = this.alive(s), n = live.length;
        live.forEach((e, i) => {
          const tg = this.ph[s] + i * TAU / n;
          let d = ((tg - e.a + Math.PI) % TAU + TAU) % TAU - Math.PI;
          e.a += d * Math.min(1, dt * 9);
        });
        this.el[s] = this.el[s].filter((e) => !e.dead);
        this.el[s].forEach((e) => {
          if (Math.abs(e.r - e.pr) > 160 * dt && e.alpha > 0.05 && !RM) {
            parts.emit({ x: this.cx + Math.cos(e.a) * e.r, y: this.cy + Math.sin(e.a) * e.r, life: 0.32, size: 3.2, color: e.leaving ? '#ffc58a' : '#8fc2ff', fade: true, shape: 'circle' });
          }
          e.pr = e.r;
        });
      }
      this.glow = SciSim.approach(this.glow, 0, dt, 2.2);
    }
    draw(o) {
      o = o || {};
      const cnt = this.counts(), outer = outerOf(cnt), k = this.k, cx = this.cx, cy = this.cy;
      const showTo = Math.min(3, Math.max(outer + 1, o.minShells != null ? o.minShells - 1 : 0));
      for (let s = 0; s <= showTo; s++) {
        const r = RAD[s] * k, has = cnt[s] > 0, full = s < 3 && cnt[s] === CAP[s];
        ctx.save();
        if (has) {
          ctx.strokeStyle = s === outer && full ? '#14a058' : 'rgba(110,90,170,.55)'; ctx.lineWidth = s === outer && full ? 3.5 : 2;
          if (s === outer && full) { ctx.shadowColor = 'rgba(20,160,88,.55)'; ctx.shadowBlur = 10 + 6 * Math.sin(S.clock * 4); }
        } else { ctx.strokeStyle = 'rgba(150,140,190,.45)'; ctx.setLineDash([5, 7]); ctx.lineWidth = 1.6; }
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      if (this.glow > 0.02) { for (let i = 0; i < 2; i++) { ctx.strokeStyle = 'rgba(20,160,88,' + (this.glow * (0.7 - i * 0.3)) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, RAD[Math.max(0, outer)] * k + (1 - this.glow) * 40 * (i + 1), 0, TAU); ctx.stroke(); } }
      // 핵
      const nr = (PHONE ? 13 : 17) * Math.max(0.85, Math.min(1.5, k * 0.95));
      D.glow(cx, cy, nr * 2.2, '#ff7a6b', 0.35);
      D.sphere(cx, cy, nr, '#ef5a4a', { shadow: true, text: o.nucText || ('+' + this.Z), textScale: this.Z >= 10 || (o.nucText && o.nucText.length > 2) ? 0.78 : 0.9 });
      // 전자
      const all = [];
      for (let s = 0; s < 4; s++) this.el[s].forEach((e) => all.push(e));
      all.forEach((e) => {
        const x = cx + Math.cos(e.a) * e.r, y = cy + Math.sin(e.a) * e.r;
        const val = e.s === outer && !e.leaving;
        ctx.save(); ctx.globalAlpha = clamp(e.alpha, 0, 1);
        if (val) D.glow(x, y, ER * 2.4, '#ffab2e', 0.55 + 0.2 * Math.sin(S.clock * 5 + e.a));
        D.sphere(x, y, ER, e.leaving ? '#ffb36b' : val ? '#ffab2e' : '#4f9dff', { gloss: true, text: '−', textScale: 1.0 });
        ctx.restore();
      });
    }
  }
  const ATOM_POS = PHONE ? { cx: 240, cy: 168, k: 1.0 } : { cx: 280, cy: 292, k: 1.5 };
  const atomA = new Atom(ATOM_POS.cx, ATOM_POS.cy, ATOM_POS.k);
  function syncAtom(instant) {
    if (S.sub === 'build') { atomA.Z = S.build.target; atomA.setCounts(S.build.counts, { instant: !!instant, fromA: 0 }); }
    else { atomA.Z = S.Z; atomA.setCounts(config(S.Z), { instant: !!instant, fromA: -0.5 }); }
  }
  function setZ(z) {
    z = clamp(Math.round(z), 1, 20);
    if (z === S.Z) return;
    S.Z = z; atomA.Z = z; atomA.setCounts(config(z), { fromA: -0.6, stagger: 0.07 });
    Sound.tick();
  }
  $('#sZ').addEventListener('input', () => setZ(+$('#sZ').value));
  $('#bZm').addEventListener('click', () => { Sound.click(); setZ(S.Z - 1); });
  $('#bZp').addEventListener('click', () => { Sound.click(); setZ(S.Z + 1); });

  /* ---- 직접 채우기 (빌더) ---- */
  const buildRows = $('#buildRows');
  const BNAME = ['첫 번째', '두 번째', '세 번째', '네 번째'];
  const bRows = [];
  for (let s = 0; s < 4; s++) {
    const row = document.createElement('div'); row.className = 'stepper-row';
    row.innerHTML = '<span class="lab">' + BNAME[s] + ' 껍질<small>최대 ' + CAP[s] + '개</small></span><button class="btn" type="button" aria-label="전자 빼기">−</button><output>0</output><button class="btn" type="button" aria-label="전자 넣기">+</button>';
    const [mb, , pb] = [row.children[1], row.children[2], row.children[3]];
    mb.addEventListener('click', () => buildAdd(s, -1));
    pb.addEventListener('click', () => buildAdd(s, +1));
    buildRows.appendChild(row); bRows.push(row);
  }
  function buildTotal() { return S.build.counts.reduce((a, b) => a + b, 0); }
  function buildAdd(s, d) {
    const c = S.build.counts;
    if (d > 0) {
      if (c[s] >= CAP[s]) { Sound.fail(); const msg = BNAME[s] + ' 껍질에는 전자가 최대 ' + CAP[s] + '개만 들어가요.'; showHint(msg); bRows[s].classList.remove('bad'); void bRows[s].offsetWidth; bRows[s].classList.add('bad'); return; }
      if (buildTotal() >= S.build.target) { Sound.fail(); showHint('전자 ' + S.build.target + '개를 모두 넣었어요. 위치를 바꾸려면 다른 껍질에서 빼 보세요.'); return; }
      c[s]++; Sound.tick();
    } else { if (c[s] <= 0) return; c[s]--; Sound.click(); }
    atomA.setCounts(c, { stagger: 0.05, fromA: 0 });
    refreshBuild();
  }
  function refreshBuild() {
    bRows.forEach((r, s) => { r.children[2].textContent = S.build.counts[s]; });
    $('#oLeft').textContent = '남은 전자 ' + (S.build.target - buildTotal()) + '개';
  }
  $('#bBuildReset').addEventListener('click', () => { Sound.click(); S.build.counts = [0, 0, 0, 0]; atomA.setCounts(S.build.counts, {}); refreshBuild(); });
  function startBuild(target) { S.build = { target, counts: [0, 0, 0, 0] }; atomA.Z = target; atomA.setCounts([0, 0, 0, 0], { instant: true }); refreshBuild(); }

  /* ================= ② 안정한 원소 시험 ================= */
  const TILE_DEF = [
    { sym: 'He', noble: true }, { sym: 'Ne', noble: true }, { sym: 'Ar', noble: true }, { sym: 'Na', partner: ['Cl'], res: '염화 나트륨(소금)' }, { sym: 'Cl', partner: ['Na'], res: '염화 나트륨(소금)' }, { sym: 'O', partner: ['Na'], need: 2, res: '산화 나트륨' },
  ];
  function initTiles() { S.tiles = TILE_DEF.map((d) => Object.assign({ e: BYSYM[d.sym] }, d)); S.tested = S.tiles.map(() => null); S.tsel = -1; S.test = null; }
  function tileRect(i) {
    return PHONE ? { x: 8 + (i % 3) * 157, y: 8 + Math.floor(i / 3) * 112, w: 150, h: 104 } : { x: 21 + i * 128, y: 18, w: 118, h: 118 };
  }
  const FL = PHONE ? { cx: 240, by: 478, w: 220, h: 206 } : { cx: 262, by: 506, w: 250, h: 270 };
  const flaskBox = () => ({ x0: FL.cx - FL.w * 0.36, x1: FL.cx + FL.w * 0.36, y0: FL.by - FL.h * 0.42, y1: FL.by - 14 });
  function flaskHalf(y) {   // 높이 y에서 플라스크 안쪽 반 너비
    const neckW = FL.w * 0.28, neckH = FL.h * 0.32, top = FL.by - FL.h + neckH;
    const f = clamp((y - top) / (FL.h - neckH), 0, 1);
    return (neckW + (FL.w - neckW) * f) / 2 - 8;
  }
  function mkAtom(sym, kind, x, y) {
    const col = ACOL[sym] || '#8b5cf6';
    const sp = rnd(30, 60), a = rnd(0, TAU);
    return { sym, kind, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: kind === 's' ? 15 : 13, col, pair: null, tx: x, ty: y, falling: 0, bound: false };
  }
  function runTest() {
    if (S.tsel < 0) return;
    const td = S.tiles[S.tsel], bx = flaskBox();
    const nS = td.sym === 'O' ? 3 : 4;
    const samples = []; for (let i = 0; i < nS; i++) { const yy = rnd(bx.y0 + 40, bx.y1 - 20); const hw = flaskHalf(yy) - 18; samples.push(mkAtom(td.sym, 's', FL.cx + rnd(-hw, hw), yy)); }
    let partners = [];
    const addP = (sym, n) => { for (let i = 0; i < n; i++) partners.push(mkAtom(sym, 'p', rnd(bx.x0 + 20, bx.x1 - 20), FL.by - FL.h - 30 - i * 20)); };
    if (td.noble) { addP('Na', 3); addP('Cl', 3); }
    else addP(td.partner[0], nS * (td.need || 1));
    partners.forEach((p) => { p.falling = 1; p.vx = 0; p.vy = 0; p.dropDelay = rnd(0, 0.5); });
    S.test = { i: S.tsel, t: 0, samples, partners, td, react: !td.noble, done: false, paired: false, label: '' };
    Sound.tick(); updateCtl();
  }
  $('#bTest').addEventListener('click', runTest);
  function stepTest(dt) {
    const tt = S.test; if (!tt) return;
    tt.t += dt;
    const bx = flaskBox();
    const heat = tt.t > 0.5 ? 1 : 0;
    const all = tt.samples.concat(tt.partners);
    all.forEach((a) => {
      if (a.bound) return;
      if (a.falling) {
        if (tt.t < 1.3 + a.dropDelay) return;
        a.vy += 280 * dt; a.y += a.vy * dt; a.x += (FL.cx - a.x) * dt * 1.5;
        if (a.y > bx.y0 + 30) { a.falling = 0; const sp = rnd(40, 70); const an = rnd(0, TAU); a.vx = Math.cos(an) * sp; a.vy = Math.sin(an) * sp; }
        return;
      }
      const hs = 1 + heat * 0.9 + (tt.t > 2.3 && !tt.react ? 0.3 : 0);
      a.x += a.vx * dt * hs; a.y += a.vy * dt * hs;
      const hw = flaskHalf(a.y) - a.r;
      if (a.x < FL.cx - hw) { a.x = FL.cx - hw; a.vx = Math.abs(a.vx); }
      if (a.x > FL.cx + hw) { a.x = FL.cx + hw; a.vx = -Math.abs(a.vx); }
      if (a.y < bx.y0 + a.r) { a.y = bx.y0 + a.r; a.vy = Math.abs(a.vy); }
      if (a.y > bx.y1 - a.r) { a.y = bx.y1 - a.r; a.vy = -Math.abs(a.vy); }
    });
    // 반응 판정
    if (tt.t > 2.6 && !tt.paired) {
      tt.paired = true;
      if (tt.react) {
        let pi = 0;
        tt.samples.forEach((sA) => {
          sA.bound = true; sA.vx = 0; sA.vy = 0;
          const n = tt.td.need || 1;
          for (let j = 0; j < n; j++) { const p = tt.partners[pi++]; if (!p) break; p.bound = true; p.falling = 0; p.pair = sA; p.ang = (n === 1 ? 0 : (j ? 1 : -1) * 0.9) + (sA.x > FL.cx ? Math.PI : 0) * 0 - 0.4 + j * 0; }
        });
        Sound.success();
        tt.samples.forEach((sA) => parts.burst(sA.x, sA.y, { count: 8, speed: 120, size: 3, colors: ['#ffd76a', '#fff', '#ff9d5c'], gravity: 80 }));
        tt.label = '반응했어요! ' + tt.td.res + ' 생성';
      } else {
        tt.label = '반응 없음 — 전자 배치가 이미 안정해요';
        // 튕겨 나가기
        tt.partners.forEach((p) => { p.vx = (p.x < FL.cx ? -1 : 1) * rnd(90, 140); p.vy = -rnd(60, 120); });
        S.shield = 1;
      }
    }
    // 짝 지은 원자들 붙이기
    if (tt.paired && tt.react) {
      tt.samples.forEach((sA) => { sA.x += Math.sin(S.clock * 1.4 + sA.y) * 6 * dt; sA.y += Math.cos(S.clock * 1.1 + sA.x) * 6 * dt; sA.y = clamp(sA.y, bx.y0 + 34, bx.y1 - 30); const hw2 = flaskHalf(sA.y) - 30; sA.x = clamp(sA.x, FL.cx - hw2, FL.cx + hw2); });
      tt.partners.forEach((p) => { if (p.pair) { const q = p.pair; const ang = p.ang; const rr = q.r + p.r - 4; const tx = q.x + Math.cos(ang) * rr, ty = q.y + Math.sin(ang) * rr; p.x += (tx - p.x) * Math.min(1, dt * 7); p.y += (ty - p.y) * Math.min(1, dt * 7); } });
    }
    if (tt.t > 5.2 && !tt.done) {
      tt.done = true; S.tested[tt.i] = tt.react ? 'react' : 'none'; updateCtl();
    }
  }
  const COMMON_OPTS = [['최외각 껍질이 전자로 가득 차 있다', true], ['최외각 전자가 모두 8개이다', false], ['전자껍질이 모두 3개이다', false], ['원자번호(전자 수)가 같다', false], ['더 얻거나 잃을 필요가 없는 안정한 배치이다', true]];
  const chipsC = $('#commonChips');
  COMMON_OPTS.forEach((o, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = o[0];
    b.addEventListener('click', () => { Sound.click(); b.classList.remove('bad', 'ok'); if (S.common.has(i)) S.common.delete(i); else S.common.add(i); b.classList.toggle('on', S.common.has(i)); });
    chipsC.appendChild(b);
  });

  /* ================= ③ 결합의 이유 ================= */
  const ITEM_DEF = [
    { sym: 'Na', sub: 'Cl과', expect: 'lose', partner: 'Cl', ion: 'Na⁺', noble: '네온(Ne)', after: [2, 8, 0, 0] },
    { sym: 'Mg', sub: 'O와', expect: 'lose', partner: 'O', ion: 'Mg²⁺', noble: '네온(Ne)', after: [2, 8, 0, 0] },
    { sym: 'Cl', sub: 'Na와', expect: 'gain', partner: 'Na', ion: 'Cl⁻', noble: '아르곤(Ar)', after: [2, 8, 8, 0] },
    { sym: 'O', sub: 'Mg와', expect: 'gain', partner: 'Mg', ion: 'O²⁻', noble: '네온(Ne)', after: [2, 8, 0, 0] },
    { sym: 'H', sub: 'Cl과', expect: 'share', partner: 'Cl', ion: 'H', noble: '헬륨(He)', after: [2, 0, 0, 0] },
    { sym: 'Cl', sub: 'H와', expect: 'share', partner: 'H', ion: 'Cl', noble: '아르곤(Ar)', after: [2, 8, 8, 0] },
  ];
  function initItems() { S.items = ITEM_DEF.map((d) => Object.assign({ e: BYSYM[d.sym], done: false, act: null }, d)); S.bsel = -1; S.shareP = 0; }
  const BA = PHONE ? { cx: 240, cy: 412, k: 0.95 } : { cx: 258, cy: 338, k: 1.22 };
  const atomB = new Atom(BA.cx, BA.cy, BA.k);
  function itemTile(i) { return PHONE ? { x: 8 + (i % 3) * 157, y: 8 + Math.floor(i / 3) * 112, w: 150, h: 104 } : { x: 21 + i * 128, y: 18, w: 118, h: 118 }; }
  function selectItem(i, quiet) {
    S.bsel = i; S.shareP = 0; S.shareT = 0;
    const it = S.items[i];
    if (!it) { atomB.setCounts([0, 0, 0, 0], { instant: true }); S.bondMsg = ''; updateCtl(); return; }
    atomB.Z = it.e.z;
    if (it.expect !== 'share') atomB.setCounts(it.done ? it.after : config(it.e.z), { instant: true });
    else { S.shareP = it.done ? 1 : 0; S.shareT = 0; }
    S.bondMsg = it.done ? '' : '';
    if (!quiet) Sound.tick();
    $('#bondNote').textContent = it.done ? '이미 해결했어요! 다른 원자를 골라 보세요.' : '이 원자는 ' + it.partner + '와(과) 만나요. 안정한 18족 배치가 되려면 어떻게 해야 할까요?';
    updateCtl();
  }
  function bondAct(a) {
    const it = S.items[S.bsel]; if (!it || it.done) return;
    const v = it.e.v;
    const bad = (m) => { Sound.fail(); S.bondMsg = m; showHint(m, 6000); $('#bondNote').textContent = m; const c = $('#ctrlCard'); c.classList.remove('shakeCard'); };
    if (a !== it.expect) {
      let m = '';
      if (a === 'lose') m = it.expect === 'gain' ? it.e.sym + '은(는) 전자를 ' + v + '개나 잃어야 해서 어려워요. 전자를 ' + (8 - v) + '개 얻는 쪽이 훨씬 쉬워요.' : it.e.sym + '이(가) 전자를 잃으면 전자가 하나도 없어서 안정한 배치가 아니에요. 상대와 나눠 가져 보세요.';
      else if (a === 'gain') m = it.expect === 'lose' ? it.e.sym + '은(는) 전자를 ' + (it.e.sym === 'Na' ? 7 : 6) + '개나 얻어야 해서 어려워요. 전자 ' + v + '개를 내놓는 쪽이 쉬워요.' : '수소와 염소는 서로 전자를 쉽게 내놓지 않아요. 한 개씩 내놓아 함께 쓰는 ‘공유’를 골라 보세요.';
      else m = '금속 원소는 전자를 내놓고 양이온이 되기 쉬워요. 이 원자는 ‘전자 공유’가 아니라 ' + (it.expect === 'lose' ? '‘전자 잃기’' : '‘전자 얻기’') + '가 알맞아요.';
      bad(m); return;
    }
    it.act = a;
    if (a === 'lose') { atomB.setCounts(it.after, { stagger: 0.18 }); }
    else if (a === 'gain') { atomB.setCounts(it.after, { stagger: 0.2, fromA: 0 }); }
    else { S.shareT = 0; }
    it.pending = true; it.t0 = S.clock;
    $('#bondNote').textContent = '';
    updateCtl();
  }
  $$('.actions3 .btn').forEach((b) => b.addEventListener('click', () => { Sound.click(); bondAct(b.dataset.act); }));
  $('#bBondReset').addEventListener('click', () => { Sound.click(); const it = S.items[S.bsel]; if (!it) return; it.done = false; it.act = null; it.pending = false; selectItem(S.bsel, true); });
  function finishItem(it) {
    it.done = true; it.pending = false;
    Sound.success(); atomB.glow = 1;
    parts.burst(BA.cx, BA.cy, { count: 16, speed: 170, size: 3.6, colors: ['#14a058', '#ffd76a', '#fff'], gravity: 60 });
    $('#bondNote').textContent = '성공! ' + (it.expect === 'share' ? it.e.sym + '도 ' + it.noble + '과 같은 전자 배치가 됐어요.' : it.ion + '은(는) ' + it.noble + '과 같은 전자 배치예요.');
    updateCtl();
  }

  /* ================= ④ 주요 원소 ================= */
  const NEED = { H: 1, C: 4, N: 3, O: 2 };
  const needRows = $('#needRows'); const nRows = {};
  ['H', 'C', 'N', 'O'].forEach((sym) => {
    const row = document.createElement('div'); row.className = 'stepper-row';
    row.innerHTML = '<span class="lab">' + BYSYM[sym].name + ' ' + sym + '</span><button class="btn" type="button" aria-label="줄이기">−</button><output>0</output><button class="btn" type="button" aria-label="늘리기">+</button>';
    row.children[1].addEventListener('click', () => { S.need[sym] = Math.max(0, S.need[sym] - 1); row.classList.remove('ok', 'bad'); refreshNeed(); Sound.click(); });
    row.children[3].addEventListener('click', () => { S.need[sym] = Math.min(8, S.need[sym] + 1); row.classList.remove('ok', 'bad'); refreshNeed(); Sound.click(); });
    needRows.appendChild(row); nRows[sym] = row;
  });
  function refreshNeed() { Object.keys(nRows).forEach((s) => { nRows[s].children[2].textContent = S.need[s]; }); }
  $$('#centerSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setCenter(b.dataset.c); }));
  function setCenter(c) { S.center = c; S.hCount = 0; S.hAtoms.length = 0; S.molSettled = false; updateCtl(); }
  $('#bHm').addEventListener('click', () => { Sound.click(); if (S.hCount > 0) { S.hCount--; const h = S.hAtoms.pop(); void h; S.molSettled = false; } updateCtl(); });
  $('#bHp').addEventListener('click', () => {
    const need = NEED[S.center];
    if (S.hCount >= need) { Sound.fail(); showHint('빈자리가 없어요! ' + BYSYM[S.center].name + '은(는) 수소 ' + need + '개면 가득 차요.'); S.hShake = 1; return; }
    Sound.tick(); S.hCount++;
    S.hAtoms.push({ slot: S.hCount - 1, p: 0, t: 0 });
    updateCtl();
  });
  const MOL = { O: ['물', 'H₂O', 2], N: ['암모니아', 'NH₃', 3], C: ['메테인', 'CH₄', 4] };
  const NEED_POS = PHONE ? { x0: 8, w: 228, y: 8, h: 250 } : { x0: 21, w: 182, y: 30, h: 300 };

  /* ================= 입력 ================= */
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'noble') {
        for (let i = 0; i < 6; i++) { const r = tileRect(i); if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) { if (!(S.test && !S.test.done)) { S.tsel = i; Sound.tick(); updateCtl(); } return false; } }
        return false;
      }
      if (S.mode === 'bond') {
        for (let i = 0; i < 6; i++) { const r = itemTile(i); if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) { selectItem(i); return false; } }
        return false;
      }
      if (S.mode === 'atom' && S.sub === 'build') {
        const dx = p.x - atomA.cx, dy = p.y - atomA.cy, d = Math.hypot(dx, dy);
        // 전자 누르기: 빼기
        for (let s = 3; s >= 0; s--) {
          for (const e of atomA.alive(s)) { const ex = atomA.cx + Math.cos(e.a) * e.r, ey = atomA.cy + Math.sin(e.a) * e.r; if (Math.hypot(p.x - ex, p.y - ey) < ER + 8) { buildAdd(s, -1); return false; } }
        }
        for (let s = 0; s < 4; s++) { if (Math.abs(d - RAD[s] * atomA.k) < 16) { buildAdd(s, +1); return false; } }
        return false;
      }
      return false;
    },
    hover(p) {
      if (S.mode === 'noble') return S.tiles.some((t, i) => { const r = tileRect(i); return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h; }) ? 'pointer' : 'default';
      if (S.mode === 'bond') return S.items.some((t, i) => { const r = itemTile(i); return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h; }) ? 'pointer' : 'default';
      return 'default';
    },
  });

  /* ================= 그리기 ================= */
  function bg() { ctx.fillStyle = '#f1eefb'; ctx.fillRect(0, 0, VW, VH); }
  function miniAtom(cx, cy, s, counts, o) {
    o = o || {};
    const outer = outerOf(counts);
    for (let i = 0; i <= outer; i++) {
      const r = RAD[i] * s;
      ctx.strokeStyle = i === outer && i < 3 && counts[i] === CAP[i] ? '#14a058' : 'rgba(110,90,170,.5)'; ctx.lineWidth = i === outer && i < 3 && counts[i] === CAP[i] ? 2.4 : 1.4;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    }
    D.sphere(cx, cy, Math.max(5, 11 * s * 1.3), '#ef5a4a', { gloss: false });
    const er = Math.max(2.4, 6.5 * s);
    for (let i = 0; i <= outer; i++) {
      const n = counts[i];
      for (let j = 0; j < n; j++) {
        const a = S.clock * SPEED[i] * 0.7 + j * TAU / n + i;
        D.sphere(cx + Math.cos(a) * RAD[i] * s, cy + Math.sin(a) * RAD[i] * s, er, i === outer ? '#ffab2e' : '#4f9dff', { gloss: false });
      }
    }
  }
  function drawTileBox(r, sel, badge, label, sub, counts, s, dim) {
    ctx.save();
    D.shadow(() => { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = sel ? '#f1ebff' : '#fff'; ctx.fill(); }, { blur: sel ? 12 : 6, y: 2 });
    ctx.restore();
    if (sel) { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 3.5; ctx.stroke(); }
    ctx.save(); if (dim) ctx.globalAlpha = 0.9;
    miniAtom(r.x + r.w / 2, r.y + r.h * (PHONE ? 0.42 : 0.44), s, counts);
    ctx.restore();
    T(r.x + r.w / 2, r.y + r.h - (PHONE ? 22 : 24), label, 16, '#2b2150', 'center', 800);
    T(r.x + r.w / 2, r.y + r.h - 6, sub, 13, '#6b6490', 'center', 700);
    if (badge) { D.sphere(r.x + r.w - 14, r.y + 14, 11, badge === 'react' ? '#f59e0b' : '#14a058', { gloss: false, text: badge === 'react' ? '!' : '✓', textScale: 1.1 }); }
  }

  /* ---- ① ---- */
  function infoPanel(x, y, w, h) {
    panel(x, y, w, h, 16);
    const e = S.sub === 'build' ? null : ELS[S.Z - 1];
    const cnt = atomA.counts();
    const outer = outerOf(cnt);
    let yy = y + 30;
    if (e) {
      T(x + 16, yy, '원자번호 ' + e.z, 14, '#6b6490', 'left', 800);
      T(x + w - 16, yy, e.g + '족 · ' + e.p + '주기', 14, '#6b6490', 'right', 800);
      yy += 30; T(x + 16, yy, e.name + ' (' + e.sym + ')', 22, '#2b2150', 'left', 800);
    } else {
      T(x + 16, yy, '직접 만들기: 원자번호 ' + S.build.target, 15, '#6b6490', 'left', 800);
      yy += 30; T(x + 16, yy, '인 (P)의 전자 배치', 20, '#2b2150', 'left', 800);
    }
    yy += 20;
    D.roundRect(x + 14, yy, w - 28, 52, 12); ctx.fillStyle = '#f3efff'; ctx.fill();
    T(x + w / 2, yy + 22, '전자 배치', 13, '#6b6490', 'center', 700);
    const cs = cfgStr(cnt) || '—';
    T(x + w / 2, yy + 46, cs.split('-').join(' - '), 24, '#4c1d95', 'center', 800);
    yy += 74;
    for (let s = 0; s < 4; s++) {
      const act = cnt[s] > 0 || s === outer + 1;
      if (!act && s > 0) continue;
      T(x + 16, yy + 5, (s + 1) + '번째', 14, cnt[s] > 0 ? '#2b2150' : '#a3a0bd', 'left', 800);
      for (let j = 0; j < CAP[s]; j++) {
        const px = x + 76 + j * (CAP[s] > 4 ? 15.5 : 22), filled = j < cnt[s];
        ctx.beginPath(); ctx.arc(px + 6, yy, 6, 0, TAU);
        if (filled) { ctx.fillStyle = s === outer ? '#ffab2e' : '#4f9dff'; ctx.fill(); } else { ctx.strokeStyle = '#c3bfd8'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]); }
      }
      yy += 24;
    }
    yy += 8;
    const ov = outer >= 0 ? cnt[outer] : 0;
    D.roundRect(x + 14, yy, w - 28, 44, 12); ctx.fillStyle = '#fff4dc'; ctx.fill();
    T(x + 24, yy + 27, '최외각 전자 수', 14, '#7c4a00', 'left', 800);
    T(x + w - 24, yy + 29, ov + '개', 22, '#b86f00', 'right', 800);
    if (outer >= 0 && outer < 3 && cnt[outer] === CAP[outer]) { yy += 54; D.label(x + w / 2, yy + 10, '최외각 껍질이 가득 찼어요!', { bg: '#14a058', size: 13 }); }
  }
  function drawAtomScene(dt) {
    bg();
    atomA.update(dt);
    if (PHONE) { atomA.draw({ minShells: 2 }); infoPanel(8, 316, 464, 330); }
    else { atomA.draw({ minShells: 2 }); infoPanel(552, 20, 238, 520); }
    if (S.sub === 'build') {
      const ct = buildTotal();
      if (!PHONE) T(atomA.cx, 548, '껍질(원)을 누르면 전자가 들어가고, 전자를 누르면 빠져요', 14, '#6b6490', 'center', 700);
      if (ct === S.build.target && !S.buildOK) { /* 완성 표시는 확인 후 */ }
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---- ② ---- */
  function drawNoble(dt) {
    bg();
    S.tiles.forEach((t, i) => {
      const r = tileRect(i);
      drawTileBox(r, S.tsel === i, S.tested[i], t.e.name + ' ' + t.sym, '전자 배치 ' + cfgStr(config(t.e.z)), config(t.e.z), PHONE ? 0.32 : 0.37);
    });
    // 플라스크
    const fy0 = FL.by - FL.h - 28;
    const tt = S.test;
    const heat = tt ? smooth(tt.t, 0.1, 0.8) * (1 - smooth(tt.t, 4.6, 5.2)) : 0;
    if (heat > 0.02) D.flame(FL.cx, FL.by + 26, 46 * heat, S.clock, {});
    D.flask(FL.cx, FL.by, FL.w, FL.h, { level: 0, t: S.clock });
    // 플라스크 받침 (스탠드)
    D.roundRect(FL.cx - FL.w * 0.55, FL.by + 3, FL.w * 1.1, 10, 5); ctx.fillStyle = '#c7cfdd'; ctx.fill();
    if (tt) {
      stepTest(dt);
      const bx = flaskBox();
      // 반응 후 결합 막대
      tt.partners.forEach((p) => { if (p.pair && p.bound) { ctx.strokeStyle = 'rgba(80,60,140,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.pair.x, p.pair.y); ctx.stroke(); } });
      tt.samples.concat(tt.partners).forEach((a) => {
        if (a.falling && tt.t < 1.3 + (a.dropDelay || 0)) { return; }
        D.sphere(a.x, a.y, a.r, a.col, { shadow: true, text: a.sym, textScale: a.sym.length > 1 ? 0.78 : 0.9 });
      });
      if (S.shield > 0.01 && !tt.react) {
        S.shield = SciSim.approach(S.shield, 0, dt, 0.7);
        ctx.strokeStyle = 'rgba(139,92,246,' + (0.55 * S.shield) + ')'; ctx.lineWidth = 4; D.roundRect(bx.x0 - 6, bx.y0 - 6, bx.x1 - bx.x0 + 12, bx.y1 - bx.y0 + 12, 22); ctx.stroke();
      }
      if (tt.label && tt.t > 2.6) {
        const ok = tt.react; D.label(FL.cx, fy0 + 4, tt.label, { bg: ok ? '#f59e0b' : '#6b6490', size: 14 });
      }
      if (tt.t < 1.3) T(FL.cx, fy0 + 9, '불꽃으로 가열하고…', 14, '#6b6490', 'center', 700);
      else if (tt.t < 2.6) T(FL.cx, fy0 + 9, '반응성이 큰 원소(Na, Cl)를 가해요…', 14, '#6b6490', 'center', 700);
    } else {
      T(FL.cx, fy0 + 9, S.tsel < 0 ? '▲ 위 시료를 눌러 고르세요' : '시험하기를 눌러요', 16, '#4c1d95', 'center', 800);
    }
    // 시험 기록표
    const tx = PHONE ? 8 : 468, ty = PHONE ? 488 : 160, tw = PHONE ? 464 : 322, rh = PHONE ? 30 : 46;
    panel(tx, ty, tw, 30 + rh * 6 + 12 + (PHONE ? 0 : 0), 14);
    T(tx + 14, ty + 22, '시험 기록', 14, '#4c1d95', 'left', 800);
    T(tx + tw * 0.4, ty + 22, '전자 배치', 13, '#6b6490', 'center', 800);
    T(tx + tw - 16, ty + 22, '결과', 13, '#6b6490', 'right', 800);
    S.tiles.forEach((t, i) => {
      const yy = ty + 30 + i * rh, st = S.tested[i];
      D.roundRect(tx + 8, yy + 2, tw - 16, rh - 4, 9); ctx.fillStyle = S.tsel === i ? '#f1ebff' : '#f8f7fc'; ctx.fill();
      T(tx + 18, yy + rh / 2 + 5, t.sym, 16, '#2b2150', 'left', 800);
      T(tx + 52, yy + rh / 2 + 5, t.e.name, 14, '#6b6490', 'left', 700);
      T(tx + tw * 0.5, yy + rh / 2 + 5, cfgStr(config(t.e.z)), 15, '#4c1d95', 'center', 800);
      T(tx + tw - 16, yy + rh / 2 + 5, st === 'none' ? '반응 없음' : st === 'react' ? '반응함' : '시험 전', 14, st === 'none' ? '#0b6b39' : st === 'react' ? '#b86f00' : '#a3a0bd', 'right', 800);
    });
    parts.update(dt); parts.draw(ctx);
    $('#testNote').textContent = S.tsel < 0 ? '위쪽 시료를 눌러 고른 뒤 시험해요. (가상 실험)' : (S.test && !S.test.done ? '시험하는 중이에요…' : S.tiles[S.tsel].e.name + '(' + S.tiles[S.tsel].sym + ')를 시험해요.');
  }

  /* ---- ③ ---- */
  function drawShareAtoms(it, p, dt) {
    const k = BA.k * (PHONE ? 0.95 : 1.0), isH = it.sym === 'H';
    const clOnLeft = true;
    const R1 = RAD[2] * k, R2 = RAD[0] * k;
    const d = R1 + R2 - 12 * k;
    const dFar = d + 160 * k;
    const e = SciSim.ease.inOutCubic(p);
    const cx0 = PHONE ? 150 : 205, cy0 = BA.cy;
    const x1 = cx0, x2 = cx0 + d + (1 - e) * (dFar - d);
    const dd = x2 - x1;
    // 겹치는 점(공유 전자쌍 자리)
    const xi = (dd * dd + R1 * R1 - R2 * R2) / (2 * dd), yi = Math.sqrt(Math.max(0, R1 * R1 - xi * xi));
    const P_up = { x: x1 + xi, y: cy0 - yi }, P_dn = { x: x1 + xi, y: cy0 + yi };
    // 고리
    const ring = (x, y, r, col, w2) => { ctx.strokeStyle = col; ctx.lineWidth = w2 || 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); };
    ring(x1, cy0, RAD[0] * k, 'rgba(110,90,170,.55)'); ring(x1, cy0, RAD[1] * k, 'rgba(110,90,170,.55)');
    const full = p > 0.97;
    ring(x1, cy0, R1, full ? '#14a058' : 'rgba(110,90,170,.55)', full ? 3.5 : 2);
    ring(x2, cy0, R2, full ? '#14a058' : 'rgba(110,90,170,.55)', full ? 3.5 : 2);
    // 렌즈(공유 영역) 강조
    if (p > 0.6) { const a = smooth(p, 0.6, 1); ctx.save(); ctx.globalAlpha = a * 0.5; D.glow(P_up.x, P_up.y, 26 * k, '#ffd76a', 1); D.glow(P_dn.x, P_dn.y, 26 * k, '#ffd76a', 1); ctx.restore(); }
    // 핵
    const nr = (PHONE ? 12 : 15) * Math.max(0.9, k * 0.9);
    D.sphere(x1, cy0, nr, '#ef5a4a', { shadow: true, text: '+17', textScale: 0.75 });
    D.sphere(x2, cy0, nr * 0.85, '#ef5a4a', { shadow: true, text: '+1', textScale: 0.9 });
    // 전자: Cl 안쪽 껍질
    const ph = S.clock;
    const eb = (x, y, col, r) => D.sphere(x, y, r || ER, col, { gloss: true, text: '−', textScale: 1.0 });
    for (let s = 0; s < 2; s++) { const n = CAP[s]; for (let j = 0; j < n; j++) { const a = ph * SPEED[s] + j * TAU / n; eb(x1 + Math.cos(a) * RAD[s] * k, cy0 + Math.sin(a) * RAD[s] * k, '#4f9dff'); } }
    // Cl 바깥 전자 6개(공유하지 않는 것): 렌즈 쪽을 피해서 배치
    const theta0 = Math.atan2(yi, xi);   // 공유점 방향
    const nFree = 6;
    for (let j = 0; j < nFree; j++) {
      const ringA = ph * SPEED[2] + j * TAU / 7;
      const fin = theta0 + 0.5 + (TAU - 2 * theta0 - 1.0) * (j + 0.5) / nFree;   // 렌즈 반대편에 퍼짐
      const a = ringA + (fin - ringA) * smooth(p, 0.1, 0.9) * 0 + 0;
      const ang = p < 0.1 ? ringA : (ringA + ((((fin - ringA) % TAU) + TAU + Math.PI) % TAU - Math.PI) * smooth(p, 0.1, 0.9));
      eb(x1 + Math.cos(ang) * R1, cy0 + Math.sin(ang) * R1, '#ffab2e');
      void a;
    }
    // 공유 전자쌍 (Cl 전자 1개 + H 전자 1개)
    const aCl = ph * SPEED[2] + 6 * TAU / 7, aH = ph * SPEED[0] + 1;
    const clPos = { x: x1 + Math.cos(aCl) * R1, y: cy0 + Math.sin(aCl) * R1 }, hPos = { x: x2 + Math.cos(aH) * R2, y: cy0 + Math.sin(aH) * R2 };
    const m = smooth(p, 0.45, 1);
    eb(clPos.x + (P_dn.x - clPos.x) * m, clPos.y + (P_dn.y - clPos.y) * m, '#ffab2e');
    eb(hPos.x + (P_up.x - hPos.x) * m, hPos.y + (P_up.y - hPos.y) * m, '#ffab2e');
    if (p > 0.75) { const a = smooth(p, 0.75, 1); ctx.save(); ctx.globalAlpha = a; D.label(P_up.x + 18, P_up.y - 26, '공유 전자쌍 1개', { bg: '#f59e0b', size: 13 }); ctx.restore(); }
    // 이름 표시
    T(x1, cy0 + R1 + 28, 'Cl 2-8-7' + (p > 0.97 ? ' → 8' : ''), 15, '#2b2150', 'center', 800);
    T(x2, cy0 + R1 + 28, 'H 1' + (p > 0.97 ? ' → 2' : ''), 15, '#2b2150', 'center', 800);
    void isH; void clOnLeft;
  }
  function drawBond(dt) {
    bg();
    S.items.forEach((it, i) => {
      const r = itemTile(i);
      const counts = it.done ? it.after : config(it.e.z);
      drawTileBox(r, S.bsel === i, it.done ? 'done' : null, it.sym + (it.done && it.expect !== 'share' ? ' → ' + it.ion : ''), '(' + it.sub + ')', counts, PHONE ? 0.32 : 0.37);
    });
    const it = S.items[S.bsel];
    if (!it) {
      T(VW / 2, PHONE ? 400 : 330, '▲ 위에서 원자를 하나 골라 보세요', 17, '#4c1d95', 'center', 800);
      parts.update(dt); parts.draw(ctx); return;
    }
    // 진행 (애니메이션 후 성공 처리)
    if (it.pending) {
      if (it.expect === 'share') { S.shareT += dt; S.shareP = Math.min(1, S.shareT / (RM ? 0.01 : 1.8)); if (S.shareP >= 1 && S.shareT > 2.0) finishItem(it); }
      else if (S.clock - it.t0 > (RM ? 0.05 : 1.7) && !atomB.el.some((a) => a.some((e) => e.alpha < 0.98 && !e.dead) ) ) finishItem(it);
    }
    if (it.expect === 'share') {
      if (!it.pending && !it.done) S.shareP = 0;
      drawShareAtoms(it, S.shareP, dt);
    } else {
      atomB.update(dt);
      atomB.draw({ nucText: '+' + it.e.z, minShells: 3 });
      // 상대 원소 표시 + 전자 이동 방향
      const px = BA.cx + RAD[2] * BA.k + (PHONE ? 20 : 46), py = BA.cy;
      if (!PHONE) {
        D.sphere(px + 24, py, 24, ACOL[it.partner] || '#8b5cf6', { shadow: true, text: it.partner, textScale: 0.85 });
        T(px + 24, py + 44, '만나는 원소', 13, '#6b6490', 'center', 700);
        if (it.pending || it.done) D.arrow(px - 4, py, px - 46, py, { color: '#ffab2e', width: 4, label: '', dash: [6, 6] });
      }
      if (it.done) { T(BA.cx, BA.cy + RAD[2] * BA.k + 36, it.ion + '  ' + cfgStr(it.after) + '  =  ' + it.noble + ' 배치', 17, '#0b6b39', 'center', 800); }
    }
    // 설명 패널
    const bx = PHONE ? 8 : 524, by = PHONE ? 612 : 150, bw = PHONE ? 464 : 266, bh = PHONE ? 118 : 390;
    if (!PHONE) {
      panel(bx, by, bw, bh, 16);
      T(bx + 16, by + 30, it.sym + ' (' + it.e.name + ')  원자번호 ' + it.e.z, 16, '#2b2150', 'left', 800);
      T(bx + 16, by + 58, '전자 배치  ' + cfgStr(config(it.e.z)), 15, '#4c1d95', 'left', 800);
      T(bx + 16, by + 82, '최외각 전자 ' + it.e.v + '개', 15, '#b86f00', 'left', 800);
      let yy = by + 112;
      const lines = it.done ? [it.expect === 'lose' ? it.e.sym + '이(가) 전자 ' + it.e.v + '개를 잃으면 ' + it.ion + '! 최외각 껍질이 가득 찬 ' + it.noble + ' 배치가 돼요.' : it.expect === 'gain' ? it.e.sym + '이(가) 전자 ' + (8 - it.e.v) + '개를 얻으면 ' + it.ion + '! 최외각 껍질이 가득 찬 ' + it.noble + ' 배치가 돼요.' : '전자를 1개씩 내놓아 한 쌍을 함께 쓰면, 서로 최외각 껍질이 가득 차요 (' + it.noble + ' 배치).']
        : ['목표: 최외각 껍질을 가득 채운 18족 배치.', '전자를 잃을까, 얻을까, 나눠 가질까요?'];
      lines.forEach((ln) => wrap(ln, bw - 32, 14, 700).forEach((w2) => { T(bx + 16, yy, w2, 14, '#3a4456', 'left', 700); yy += 20; }));
      if (S.bondMsg && !it.done) { yy += 6; D.roundRect(bx + 12, yy - 14, bw - 24, 78, 10); ctx.fillStyle = '#fde9e9'; ctx.fill(); wrap(S.bondMsg, bw - 44, 13.5, 700).slice(0, 4).forEach((w2, j) => T(bx + 22, yy + 6 + j * 18, w2, 13.5, '#a3262b', 'left', 700)); }
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---- ④ ---- */
  function slotAngle(j) { return -Math.PI / 2 + j * Math.PI / 4; }
  function drawMajorAtom(cx, cy, s, sym, showNeed, p) {
    const e = BYSYM[sym], cnt = config(e.z), outer = outerOf(cnt);
    ctx.save();
    for (let i = 0; i <= outer; i++) { ctx.strokeStyle = 'rgba(110,90,170,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, RAD[i] * s, 0, TAU); ctx.stroke(); }
    ctx.restore();
    D.sphere(cx, cy, 14 * Math.max(0.8, s), '#ef5a4a', { shadow: true, text: '+' + e.z, textScale: 0.82 });
    // 안쪽 껍질 전자
    for (let i = 0; i < outer; i++) { const n = cnt[i]; for (let j = 0; j < n; j++) { const a = S.clock * SPEED[i] * 0.6 + j * TAU / n; D.sphere(cx + Math.cos(a) * RAD[i] * s, cy + Math.sin(a) * RAD[i] * s, 6.5, '#4f9dff', { gloss: true }); } }
    // 바깥 껍질: 슬롯
    const cap = CAP[outer], n = cnt[outer];
    const R = RAD[outer] * s;
    const slots = sym === 'H' ? [0, 1] : SLOT_ORDER;
    for (let j = 0; j < cap; j++) {
      const idx = sym === 'H' ? j : SLOT_ORDER[j];
      const ang = sym === 'H' ? (-Math.PI / 2 + j * Math.PI) : slotAngle(idx);
      const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
      if (j < n) D.sphere(x, y, 7.5, '#ffab2e', { gloss: true });
      else {
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, 8, 0, TAU);
        if (p >= 1) { ctx.globalAlpha = 0.55 + 0.25 * Math.sin(S.clock * 4 + j); ctx.fillStyle = '#4f9dff'; ctx.fill(); }
        else { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); ctx.strokeStyle = '#8b5cf6'; ctx.setLineDash([3, 3]); ctx.lineWidth = 2; ctx.stroke(); }
        ctx.restore();
      }
    }
    void slots;
  }
  function drawMajorNeed(dt) {
    const g = NEED_POS;
    ['H', 'C', 'N', 'O'].forEach((sym, i) => {
      const col = PHONE ? i % 2 : i, row = PHONE ? Math.floor(i / 2) : 0;
      const x = g.x0 + col * (g.w + (PHONE ? 8 : 8)), y = g.y + row * (g.h + 8);
      panel(x, y, g.w, g.h, 16);
      const e = BYSYM[sym];
      T(x + g.w / 2, y + 28, e.name + ' ' + sym, 17, '#2b2150', 'center', 800);
      drawMajorAtom(x + g.w / 2, y + (PHONE ? 118 : 138), PHONE ? 1.0 : 1.1, sym, true, S.needDone ? 1 : 0);
      const ok = S.needOK[sym];
      const v = S.need[sym];
      const by = y + g.h - 38;
      D.roundRect(x + 12, by, g.w - 24, 30, 10); ctx.fillStyle = ok === true ? '#e2f6eb' : ok === false ? '#fde9e9' : '#f3efff'; ctx.fill();
      T(x + g.w / 2, by + 21, '더 필요한 전자  ' + v + '개', 15, ok === true ? '#0b6b39' : ok === false ? '#a3262b' : '#4c1d95', 'center', 800);
    });
    const ny = PHONE ? 8 + 2 * (NEED_POS.h + 8) + 4 : NEED_POS.y + NEED_POS.h + 14;
    panel(PHONE ? 8 : 21, ny, VW - (PHONE ? 16 : 42), PHONE ? 130 : 150, 16);
    const lines = S.needDone ? ['수소 1, 탄소 4, 질소 3, 산소 2개가 더 필요해요.', '다른 원자와 전자를 주고받거나 나눠 가지면 이 빈자리를 채울 수 있어요. 이것이 결합이 만들어지는 이유예요!'] : ['점선 동그라미는 전자가 더 들어갈 수 있는 빈자리예요.', '수소는 첫 번째 껍질(최대 2개), 탄소·질소·산소는 두 번째 껍질(최대 8개)이 가득 차야 안정해요.'];
    let yy = ny + 30; lines.forEach((ln) => wrap(ln, VW - (PHONE ? 50 : 82), 14.5, 700).forEach((w2) => { T((PHONE ? 8 : 21) + 18, yy, w2, 14.5, '#3a4456', 'left', 700); yy += 21; }));
    parts.update(dt); parts.draw(ctx);
  }
  function drawMajorBuild(dt) {
    const sym = S.center, e = BYSYM[sym], need = NEED[sym], cnt = config(e.z);
    const cx = PHONE ? 240 : 290, cy = PHONE ? 250 : 290, s = PHONE ? 1.35 : 1.7;
    const outer = 1, R = RAD[1] * s;
    // 빈자리 위치: 고르게 퍼진 슬롯
    const filledN = cnt[1];
    const empties = SLOT_ORDER.slice(filledN).map((idx) => slotAngle(idx));
    // 안쪽 껍질
    ctx.strokeStyle = 'rgba(110,90,170,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, RAD[0] * s, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    const done = S.hCount === need;
    if (done) { ctx.save(); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 4; ctx.shadowColor = 'rgba(20,160,88,.6)'; ctx.shadowBlur = 12 + 6 * Math.sin(S.clock * 4); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.restore(); }
    D.sphere(cx, cy, 20, '#ef5a4a', { shadow: true, text: '+' + e.z, textScale: 0.8 });
    for (let j = 0; j < 2; j++) { const a = S.clock * 1.2 + j * Math.PI; D.sphere(cx + Math.cos(a) * RAD[0] * s, cy + Math.sin(a) * RAD[0] * s, 7.5, '#4f9dff', { gloss: true }); }
    // 바깥 전자 (원래 가진 것)
    for (let j = 0; j < filledN; j++) { const a = slotAngle(SLOT_ORDER[j]); D.sphere(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 8, '#ffab2e', { gloss: true }); }
    // 빈자리 + 수소
    empties.forEach((a, j) => {
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      const h = S.hAtoms.find((q) => q.slot === j);
      if (!h) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill(); ctx.strokeStyle = '#8b5cf6'; ctx.setLineDash([3, 3]); ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    });
    S.hAtoms.forEach((h) => {
      h.t += dt; h.p = SciSim.ease.outBack(clamp(h.t / (RM ? 0.01 : 0.8), 0, 1));
      const a = empties[h.slot], hx = cx + Math.cos(a) * (R + 22), hy = cy + Math.sin(a) * (R + 22);
      const sx = cx + Math.cos(a) * (R + 230), sy = cy + Math.sin(a) * (R + 230) * 0.7 - 60;
      const px = sx + (hx - sx) * h.p, py = sy + (hy - sy) * h.p;
      // H 껍질과 공유 전자쌍
      ctx.strokeStyle = 'rgba(110,90,170,.55)'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(px, py, 22, 0, TAU); ctx.stroke();
      D.sphere(px, py, 11, '#4aa3ff', { shadow: true, text: 'H', textScale: 1.0 });
      const slx = cx + Math.cos(a) * R, sly = cy + Math.sin(a) * R;
      const ex = slx + (px - slx) * 0.02, ey = sly + (py - sly) * 0.02;
      if (h.p > 0.95) { D.glow(slx, sly, 22, '#ffd76a', 0.7); D.sphere(slx + Math.cos(a + Math.PI / 2) * 7, sly + Math.sin(a + Math.PI / 2) * 7, 7, '#ffab2e', { gloss: true }); D.sphere(ex - Math.cos(a + Math.PI / 2) * 7, ey - Math.sin(a + Math.PI / 2) * 7, 7, '#ffab2e', { gloss: true }); }
      else D.sphere(px + Math.cos(a + 1) * 22, py + Math.sin(a + 1) * 22, 6, '#ffab2e', { gloss: true });
    });
    if (done && !S.molSettled) { S.molSettled = true; S.molDone.add(sym); Sound.success(); parts.burst(cx, cy, { count: 18, speed: 180, size: 3.6, colors: ['#14a058', '#ffd76a', '#fff'], gravity: 60 }); }
    if (S.hShake > 0) { S.hShake = Math.max(0, S.hShake - dt * 3); }
    // 안내
    const m = MOL[sym];
    const ix = PHONE ? 8 : 500, iy = PHONE ? 470 : 24, iw = PHONE ? 464 : 290, ih = PHONE ? 260 : 300;
    panel(ix, iy, iw, ih, 16);
    T(ix + 16, iy + 32, e.name + '(' + sym + ') + 수소(H)', 17, '#2b2150', 'left', 800);
    D.roundRect(ix + 14, iy + 46, iw - 28, 52, 12); ctx.fillStyle = done ? '#e2f6eb' : '#f3efff'; ctx.fill();
    T(ix + iw / 2, iy + 70, '빈자리 ' + need + '개  ·  붙인 수소 ' + S.hCount + '개', 15, '#4c1d95', 'center', 800);
    T(ix + iw / 2, iy + 90, done ? m[0] + ' ' + m[1] + ' 완성!' : '수소 ' + (need - S.hCount) + '개가 더 필요해요', 15, done ? '#0b6b39' : '#6b6490', 'center', 800);
    let yy = iy + 126;
    wrap(done ? '수소 1개는 전자 1개를 내놓고 ' + e.name + '과 한 쌍을 함께 써요. 이렇게 공유하면 ' + e.name + '도 최외각 껍질이 가득 차고, 수소도 헬륨(2개)처럼 안정해져요.' : '수소 원자 1개가 전자 1개를 내놓아 점선 자리 하나를 채워요. 빈자리 수와 같은 수의 수소가 필요해요.', iw - 32, 14, 700).forEach((w2) => { T(ix + 16, yy, w2, 14, '#3a4456', 'left', 700); yy += 20; });
    yy += 8;
    ['O', 'N', 'C'].forEach((c, i) => { const ok = S.molDone.has(c); T(ix + 16 + i * (iw - 20) / 3, yy + 16, (ok ? '✅ ' : '⬜ ') + MOL[c][0], 14, ok ? '#0b6b39' : '#6b6490', 'left', 800); });
    parts.update(dt); parts.draw(ctx);
  }
  function drawMajor(dt) {
    bg();
    if (S.sub === 'build') drawMajorBuild(dt); else drawMajorNeed(dt);
  }

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'atom') {
      if (S.sub === 'build') { L1 = '만드는 원자'; a = '원자번호 ' + S.build.target; L2 = '내가 채운 배치'; b = cfgStr(S.build.counts) || '아직 없음'; L3 = '남은 전자'; c = (S.build.target - buildTotal()) + '개'; }
      else { const e = ELS[S.Z - 1]; const cnt = config(S.Z); L1 = '원소'; a = e.z + '번 ' + e.name + ' ' + e.sym; L2 = '전자 배치'; b = cfgStr(cnt); L3 = '최외각 전자 수'; c = cnt[outerOf(cnt)] + '개 (' + e.g + '족)'; }
    } else if (S.mode === 'noble') {
      L1 = '시험한 시료'; a = S.tested.filter(Boolean).length + ' / 6'; L2 = '고른 시료'; b = S.tsel < 0 ? '—' : S.tiles[S.tsel].e.name + ' ' + S.tiles[S.tsel].sym; L3 = '결과'; c = S.tsel < 0 || !S.tested[S.tsel] ? '—' : S.tested[S.tsel] === 'none' ? '반응 없음' : '반응함';
    } else if (S.mode === 'bond') {
      const it = S.items[S.bsel];
      L1 = '해결한 원자'; a = S.items.filter((x) => x.done).length + ' / 6'; L2 = '고른 원자'; b = it ? it.sym + ' (' + it.sub + ')' : '—'; L3 = '결과'; c = it && it.done ? (it.expect === 'share' ? '공유 → ' + it.noble + ' 배치' : it.ion + ' → ' + it.noble + ' 배치') : '—';
    } else {
      if (S.sub === 'build') { L1 = '가운데 원자'; a = BYSYM[S.center].name + ' ' + S.center; L2 = '붙인 수소'; b = S.hCount + ' / ' + NEED[S.center] + '개'; L3 = '완성한 분자'; c = S.molDone.size + ' / 3'; }
      else { L1 = '수소 H'; a = '필요 ' + S.need.H + '개'; L2 = '탄소 C · 질소 N'; b = S.need.C + '개 · ' + S.need.N + '개'; L3 = '산소 O'; c = S.need.O + '개'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const zName = (z) => ELS[z - 1].name + ' ' + ELS[z - 1].sym;
  const levels = [
    {
      title: '전자 배치: 전자껍질에 전자 채우기', short: '전자 배치', icon: '⚛️', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 헬륨이나 네온은 거의 반응하지 않는데, 왜 다른 원소는 서로 결합할까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 원자의 구조(원자핵과 전자)와 이온의 형성을 배웠어요. 이번에는 <b>전자껍질 모형</b>으로 전자가 어떻게 배치되는지 자세히 살펴봐요.</div>' +
        '<p>원자번호를 바꿔 가며 전자가 <b>안쪽 껍질부터</b> 채워지는 규칙을 찾고, 직접 전자 배치를 만들어 봐요. (원자번호 1~20)</p>',
      features: ['atom'],
      setup() { setScene('atom', 'view'); },
      recap: '전자는 안쪽 껍질부터 채워져요. 첫 번째 껍질에는 최대 2개, 두 번째와 세 번째 껍질에는 최대 8개까지 들어가요. 가장 바깥 껍질의 전자가 최외각 전자예요.',
      summary: '<ul><li>전자는 <b>원자핵 가까운 껍질부터</b> 채워져요.</li><li>최대 전자 수: <b>첫 번째 2개 · 두 번째 8개 · 세 번째 8개</b>(1~20번에서는 네 번째 껍질에 1~2개)</li><li>가장 바깥 껍질의 전자가 <b>최외각 전자</b>예요. 예) Cl(17): <b>2-8-7</b> → 최외각 전자 7개</li><li>같은 족은 최외각 전자 수가 같아요.</li></ul>',
      missions: [
        {
          title: '전자 배치 살펴보기',
          goal: '원자번호 슬라이더로 <b>3 · 9 · 11 · 17 · 18</b>번 원소를 차례로 만들어 전자 배치를 확인하세요.',
          hint: '+ − 버튼을 누르거나 슬라이더를 움직여요. 각 원소에서 잠깐 멈춰 전자 배치를 읽어 보세요.',
          setup() { setScene('atom', 'view'); },
          check: () => [3, 9, 11, 17, 18].every((z) => S.seen.has(z)),
          hold: 0.4,
          status: () => [3, 9, 11, 17, 18].map((z) => mark(S.seen.has(z)) + z + '번').join(' &nbsp; '),
          explain: '리튬(3)은 <b>2-1</b>, 플루오린(9)은 <b>2-7</b>, 나트륨(11)은 <b>2-8-1</b>, 염소(17)는 <b>2-8-7</b>, 아르곤(18)은 <b>2-8-8</b>이에요. 안쪽 껍질이 가득 차야 다음 껍질에 전자가 들어가요.',
        },
        {
          title: '내가 만드는 전자 배치',
          goal: '<b>원자번호 15(인, P)</b> 원자의 전자 15개를 껍질에 채워 전자 배치를 완성하세요.',
          hint: '안쪽 껍질부터 가득 채워요. 첫 번째 껍질 2개, 두 번째 껍질 8개, 남은 전자는 세 번째 껍질에 넣어요.',
          setup() { setScene('atom', 'build'); startBuild(15); },
          check: () => { const c = S.build.counts; return c[0] === 2 && c[1] === 8 && c[2] === 5 && c[3] === 0; },
          hold: 0.8,
          status: () => '내 배치 ' + (cfgStr(S.build.counts) || '없음') + ' &nbsp; 남은 전자 ' + (S.build.target - buildTotal()) + '개',
          explain: '인(P)은 <b>2-8-5</b>예요. 전자는 안쪽 껍질부터 채워서 첫 번째(2) → 두 번째(8) → 세 번째(5) 순서로 들어가고, 세 번째 껍질의 5개가 최외각 전자예요.',
        },
        {
          type: 'quiz', title: '최외각 전자 수 읽기',
          goal: '원자번호 <b>17번(염소)</b>의 전자 배치는 2-8-7이에요. <b>최외각 전자는 몇 개</b>일까요?',
          setup() { setScene('atom', 'view'); },
          choices: ['7개', '17개', '8개', '2개'],
          answer: 0,
          feedback: ['', '17개는 전자 수 전체예요. 최외각 전자는 가장 바깥 껍질의 전자만 세요.', '8개는 두 번째 껍질의 전자예요. 가장 바깥인 세 번째 껍질에는 7개가 있어요.', '2개는 첫 번째 껍질의 전자 수예요. 첫 번째는 가장 안쪽 껍질이에요.'],
          explain: '염소의 전자 배치 <b>2-8-7</b>에서 가장 바깥(세 번째) 껍질의 전자 <b>7개</b>가 최외각 전자예요. 17족이라서 최외각 전자 수가 7개예요.',
        },
      ],
    },
    {
      title: '안정한 원소: 반응하지 않는 18족', short: '안정한 원소', icon: '🔥', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자 배치를 만들어 봤어요. 이제 어떤 전자 배치를 가진 원소가 <b>반응하지 않는지</b> 시험해 봐요.</div>' +
        '<p>시료에 <b>불꽃과 반응성이 큰 원소</b>(Na, Cl)를 가해 반응하는지 보고, <b>반응하지 않는 원소의 전자 배치</b>에서 공통점을 찾아요. (가상 실험)</p>',
      features: ['noble'],
      setup() { setScene('noble', ''); },
      recap: '헬륨·네온·아르곤(18족)은 최외각 껍질이 가득 차 있어서 반응하지 않아요. 다른 원소들은 18족과 같은 배치가 되려고 반응해요.',
      summary: '<ul><li><b>18족(He, Ne, Ar)</b>은 다른 원소와 거의 반응하지 않는 <b>안정한 원소</b>예요.</li><li>공통점: <b>최외각 껍질이 전자로 가득 차 있어요</b> — He 2, Ne 2-8, Ar 2-8-8.</li><li>헬륨은 최외각 전자가 2개뿐이지만 첫 번째 껍질의 최대(2개)라서 가득 찬 거예요.</li><li>Na, Cl, O 같은 원소는 가득 차지 않아서 반응하며 더 안정해지려고 해요.</li></ul>',
      missions: [
        {
          title: '여섯 시료 반응 시험하기',
          goal: 'He · Ne · Ar · Na · Cl · O 시료를 <b>하나씩 눌러 고른 뒤 시험</b>해 보세요.',
          hint: '위쪽 시료를 누르고 “불꽃 + 다른 원소 가하기” 버튼을 눌러요. 시험 기록표에 결과가 쌓여요.',
          setup() { setScene('noble', ''); },
          check: () => S.tested.every((x) => x),
          hold: 0.5,
          status: () => S.tiles.map((t, i) => mark(!!S.tested[i]) + t.sym).join(' &nbsp; '),
          explain: '<b>He, Ne, Ar는 반응하지 않고</b>, Na·Cl·O는 반응해요. 반응하지 않는 원소는 이미 안정한 전자 배치를 가진 18족 원소예요.',
        },
        {
          title: '18족 전자 배치의 공통점', manual: true,
          goal: '반응하지 않은 <b>He(2) · Ne(2-8) · Ar(2-8-8)</b>의 전자 배치에서 공통점을 모두 고르고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '세 원소의 가장 바깥 껍질을 보세요. 전자 수는 다르지만(He 2, Ne 8, Ar 8) 공통으로 말할 수 있는 것은?',
          setup() { setScene('noble', 'common'); },
          check() {
            const chips = $$('#commonChips button');
            const want = COMMON_OPTS.map((o) => o[1]);
            let bad = false;
            chips.forEach((b, i) => {
              const on = S.common.has(i);
              if (on && !want[i]) { bad = true; if (!b.classList.contains('bad')) { b.classList.remove('ok'); b.classList.add('bad'); } }
              else if (on && want[i]) { b.classList.remove('bad'); b.classList.add('ok'); }
            });
            const goodN = [...S.common].filter((i) => want[i]).length;
            if (bad) return '빨간 칸은 세 원소에 모두 해당하지 않아요. He는 최외각 전자가 2개, 전자껍질은 1개뿐이에요.';
            if (goodN < 2) return '공통점이 더 있어요. 지금 ' + goodN + '개를 골랐어요. 2개를 모두 골라 보세요.';
            return true;
          },
          status: () => '고른 공통점 ' + S.common.size + ' / 2',
          explain: '세 원소의 공통점은 <b>최외각 껍질이 가득 차 있다</b>는 거예요(He 2개, Ne 8개, Ar 8개). 가득 찬 배치는 전자를 더 얻거나 잃을 필요가 없어서 <b>안정</b>하고 반응하지 않아요.',
        },
        {
          type: 'quiz', title: '헬륨이 안정한 까닭',
          goal: '헬륨(He)은 최외각 전자가 <b>2개뿐</b>인데도 안정해요. 그 까닭은?',
          setup() { setScene('noble', ''); },
          choices: ['헬륨은 가벼운 원소라서', '첫 번째 껍질에는 최대 2개가 들어가서 2개면 이미 가득 찬다', '헬륨은 전자가 8개이기 때문에', '헬륨은 전자껍질이 3개이기 때문에'],
          answer: 1,
          feedback: ['가벼운지 아닌지는 반응성과 관계없어요. 전자가 가득 찼는지가 중요해요.', '', '헬륨의 전자는 2개뿐이에요. 8개는 두 번째 껍질의 최대 수예요.', '헬륨의 전자껍질은 1개뿐이에요.'],
          explain: '첫 번째 껍질에는 전자가 <b>최대 2개</b>까지 들어가요. 헬륨은 2개로 그 껍질이 가득 차 있어서 안정해요. 그래서 18족(He 2, Ne 2-8, Ar 2-8-8)은 모두 <b>최외각 껍질이 가득 찬</b> 원소예요.',
        },
      ],
    },
    {
      title: '결합의 이유: 18족처럼 되려고', short: '결합의 이유', icon: '🤝', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 18족은 최외각 껍질이 가득 차서 안정하다는 것을 알았어요. 그렇다면 다른 원소들은 <b>어떻게 18족과 같은 배치</b>가 될까요?</div>' +
        '<p>중2에서 배운 이온 만들기(Na → Na⁺)를 <b>전자 배치</b>로 다시 설명해요. 전자를 <b>잃거나 · 얻거나 · 나눠 가지면</b> 18족과 같은 배치가 돼요.</p>',
      features: ['bond'],
      setup() { setScene('bond', ''); },
      recap: '원자는 전자를 잃거나 얻거나 공유해서 18족과 같은 안정한 전자 배치를 이루려고 결합해요. Na⁺(2-8)은 Ne, Cl⁻(2-8-8)은 Ar과 같은 배치예요.',
      summary: '<ul><li>원자는 <b>18족과 같은 전자 배치</b>(최외각 껍질이 가득 참)가 되려고 결합해요. 이것을 옥텟 규칙이라고도 해요.</li><li><b>전자를 잃기</b>: Na(2-8-1) → Na⁺(2-8, 네온과 같음), Mg → Mg²⁺</li><li><b>전자를 얻기</b>: Cl(2-8-7) → Cl⁻(2-8-8, 아르곤과 같음), O → O²⁻</li><li><b>전자를 공유</b>: H와 Cl이 전자를 1개씩 내놓아 함께 쓰면 둘 다 가득 차요.</li></ul>',
      missions: [
        {
          title: '잃기 · 얻기 · 공유 고르기', manual: true,
          goal: '위의 <b>원자 6개</b>를 하나씩 골라, 18족 배치가 되려면 <b>잃기 · 얻기 · 공유</b> 중 무엇을 해야 하는지 눌러 보세요. 모두 해결하면 <b>✔ 확인하기</b>를 누르세요.',
          hint: '최외각 전자가 1~2개면 잃기, 6~7개면 얻기가 쉬워요. 수소와 염소처럼 서로 얻기 어려우면 공유해요.',
          setup() { setScene('bond', ''); },
          check() { const n = S.items.filter((x) => x.done).length; return n >= 6 ? true : '아직 ' + (6 - n) + '개가 남았어요. 위쪽 원자를 눌러 하나씩 해결해 보세요.'; },
          status: () => '해결한 원자 ' + S.items.filter((x) => x.done).length + ' / 6',
          explain: '<b>Na, Mg</b>는 전자를 잃어 Na⁺, Mg²⁺(2-8, 네온 배치)가 되고, <b>Cl, O</b>는 전자를 얻어 Cl⁻(2-8-8, 아르곤 배치), O²⁻(2-8, 네온 배치)가 돼요. <b>H와 Cl</b>은 전자를 1개씩 내놓아 <b>공유</b>하면 둘 다 최외각 껍질이 가득 차요. (이온 결합과 공유 결합은 다음 차시에서 자세히 배워요.)',
        },
        {
          type: 'quiz', title: '이온의 전자 배치',
          goal: '나트륨 원자(Na, 2-8-1)가 전자 1개를 잃어 <b>Na⁺</b>이 되면 <b>어느 원소와 같은 전자 배치</b>가 될까요?',
          setup() { setScene('bond', ''); },
          choices: ['네온 (Ne, 2-8)', '아르곤 (Ar, 2-8-8)', '헬륨 (He, 2)', '나트륨 그대로 (2-8-1)'],
          answer: 0,
          feedback: ['', '아르곤(2-8-8)은 Cl⁻이 가지는 배치예요. Na⁺은 껍질이 하나 줄어든 2-8이에요.', '헬륨(2)은 Li⁺ 같은 경우예요. Na⁺은 전자가 10개 남아서 2-8이에요.', '전자를 잃었으니 배치가 바뀌어요. 세 번째 껍질의 1개가 없어져요.'],
          explain: 'Na(2-8-1)가 세 번째 껍질의 전자 1개를 잃으면 <b>Na⁺(2-8)</b>이고, 이것은 <b>네온(Ne)</b>과 같은 배치예요. Cl(2-8-7)이 전자 1개를 얻으면 Cl⁻(2-8-8)로 <b>아르곤(Ar)</b>과 같아져요.',
        },
      ],
    },
    {
      title: '주요 원소: H, C, N, O의 빈자리', short: '적용', icon: '🌍', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원소가 18족과 같은 배치가 되려고 결합한다는 것을 알았어요. 지구와 생명체를 이루는 <b>수소·탄소·질소·산소</b>는 어떨까요?</div>' +
        '<p>이 원소들이 최외각 껍질을 가득 채우려면 <b>전자가 몇 개 더 필요한지</b> 세어 보고, 수소와 어떻게 결합할지 예측해요.</p>',
      features: ['major'],
      setup() { setScene('major', 'need'); },
      recap: '원소마다 최외각 껍질을 채우는 데 필요한 전자 수가 달라요(H 1, C 4, N 3, O 2). 이 수만큼 전자를 공유하며 결합해요.',
      summary: '<table class="mini"><tr><th>원소</th><th>전자 배치</th><th>더 필요한 전자</th></tr><tr><td>H</td><td>1</td><td>1</td></tr><tr><td>C</td><td>2-4</td><td>4</td></tr><tr><td>N</td><td>2-5</td><td>3</td></tr><tr><td>O</td><td>2-6</td><td>2</td></tr></table><ul><li>산소 1개 + 수소 2개 → <b>물</b>, 질소 1개 + 수소 3개 → 암모니아, 탄소 1개 + 수소 4개 → 메테인</li><li>같은 족 원소는 <b>최외각 전자 수가 같아서</b> 비슷하게 결합해요. 17족은 7개라서 1개만 얻으면 18족 배치가 돼요.</li></ul>',
      missions: [
        {
          title: '더 필요한 전자 수 세기', manual: true,
          goal: '<b>H · C · N · O</b>가 가장 바깥 껍질을 가득 채우려면 전자가 몇 개 더 필요한지 표를 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '점선 동그라미 개수를 세어요. 수소는 첫 번째 껍질(최대 2개), 나머지는 두 번째 껍질(최대 8개)이에요.',
          setup() { setScene('major', 'need'); S.needDone = false; S.needOK = {}; },
          check() {
            const bad = [];
            Object.keys(NEED).forEach((s) => { const ok = S.need[s] === NEED[s]; if (!ok && S.needOK[s] !== false) { nRows[s].classList.remove('ok', 'bad'); void nRows[s].offsetWidth; nRows[s].classList.add('bad'); } if (ok) { nRows[s].classList.remove('bad'); nRows[s].classList.add('ok'); } S.needOK[s] = ok; if (!ok) bad.push(s); });
            if (bad.length) return bad.map((s) => BYSYM[s].name + '(' + s + ')').join(', ') + '의 숫자를 다시 세어 보세요. 점선 동그라미가 몇 개인가요?';
            S.needDone = true; return true;
          },
          status: () => '입력한 값  H ' + S.need.H + ' · C ' + S.need.C + ' · N ' + S.need.N + ' · O ' + S.need.O,
          explain: '<b>수소 1개, 탄소 4개, 질소 3개, 산소 2개</b>가 더 필요해요. 예) 산소(2-6)는 두 번째 껍질에 6개가 있어서 8개가 되려면 2개가 더 필요해요.',
        },
        {
          title: '수소와 결합해 빈자리 채우기',
          goal: '<b>산소 · 질소 · 탄소</b> 각각에 수소 원자를 붙여 빈자리를 모두 채우세요. (분자 3개 완성)',
          hint: '빈자리 수만큼 수소가 필요해요. 산소는 2개, 질소는 3개, 탄소는 4개예요. 가운데 원자를 바꿔 가며 해 보세요.',
          setup() { setScene('major', 'build'); S.molDone = new Set(); setCenter(S.center); },
          check: () => S.molDone.size >= 3,
          hold: 0.8,
          status: () => ['O', 'N', 'C'].map((c) => mark(S.molDone.has(c)) + MOL[c][0] + '(' + MOL[c][1] + ')').join(' &nbsp; '),
          explain: '수소 2개 + 산소 1개 → <b>물(H₂O)</b>, 수소 3개 + 질소 1개 → <b>암모니아(NH₃)</b>, 수소 4개 + 탄소 1개 → <b>메테인(CH₄)</b>이에요. 빈자리 수만큼 수소가 전자를 하나씩 내놓아 공유해요.',
        },
        {
          type: 'quiz', title: '17족이 전자를 얻기 쉬운 이유',
          goal: '염소(Cl)나 플루오린(F) 같은 <b>17족 원소가 전자를 얻기 쉬운 까닭</b>은?',
          setup() { setScene('major', 'need'); },
          choices: ['최외각 전자가 7개라서 1개만 얻으면 껍질이 가득 차기 때문이다', '최외각 전자가 1개라서 얻기 쉽기 때문이다', '원자번호가 커서 전자가 많기 때문이다', '전자껍질이 하나도 없기 때문이다'],
          answer: 0,
          feedback: ['', '최외각 전자가 1개인 것은 1족이에요. 1족은 전자를 잃기 쉬워요.', '원자번호가 크다고 전자를 잘 얻는 것은 아니에요. 최외각 전자 수가 중요해요.', '모든 원자에는 전자껍질이 있어요.'],
          explain: '17족은 <b>최외각 전자가 7개</b>라서 전자 <b>1개만 얻으면 18족과 같은 배치</b>(8개 가득)가 돼요. 같은 족 원소는 최외각 전자 수가 같기 때문에 결합하는 방식도 비슷해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-electron-config', mount: '#game', badge: '전자 배치 박사', homeHref: '../../index.html#h1a',
    featureLabels: { atom: '⚛️ 원자번호 슬라이더 · 전자껍질 모형', noble: '🔥 반응 시험 · 시험 기록표', bond: '🤝 잃기 · 얻기 · 공유 버튼', major: '🌍 필요한 전자 수 · 수소 붙이기' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  initTiles(); initItems(); refreshBuild(); refreshNeed();
  atomA.Z = S.Z; atomA.setCounts(config(S.Z), { instant: true });
  setScene('atom', 'view');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; if (game.free) { S.sub = S.mode === 'atom' || S.mode === 'major' ? (S.mode === 'major' ? 'need' : 'view') : ''; } updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    // 슬라이더 표시, 본 원소 기록
    if (S.mode === 'atom' && S.sub !== 'build') {
      const sz = $('#sZ'); if (+sz.value !== S.Z) sz.value = S.Z; sz.style.setProperty('--pct', ((S.Z - 1) / 19 * 100) + '%');
      $('#oZ').textContent = S.Z + ' · ' + zName(S.Z);
      if (S.lastZ === S.Z) { S.zHold += dt; if (S.zHold > 0.5) S.seen.add(S.Z); } else { S.lastZ = S.Z; S.zHold = 0; }
    }
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    if (S.mode === 'atom') drawAtomScene(dt);
    else if (S.mode === 'noble') drawNoble(dt);
    else if (S.mode === 'bond') drawBond(dt);
    else drawMajor(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,238,251,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, ELS, config, setScene, setZ, atomA, atomB, buildAdd, startBuild, runTest, selectItem, bondAct, TILE_DEF, ITEM_DEF, NEED,
    tileXY: (i) => { const r = tileRect(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; },
    itemXY: (i) => { const r = itemTile(i); return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; },
    ringXY: (s) => ({ x: atomA.cx + RAD[s] * atomA.k, y: atomA.cy }),
    fillNeed(right) { S.need = right === false ? { H: 2, C: 4, N: 3, O: 2 } : { H: 1, C: 4, N: 3, O: 2 }; refreshNeed(); },
    setHCount(n) { S.hCount = 0; S.hAtoms.length = 0; for (let i = 0; i < n; i++) { document.getElementById('bHp').click(); } },
    setCenter,
  };
})();
