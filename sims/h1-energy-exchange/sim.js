(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound } = SciSim;
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
  const HPC = '#e2464b', OHC = '#3867f4', NAC = '#f59e0b', CLC = '#14a058';
  let game = null;
  let F = new Set();
  const has = (f) => F.has(f);
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const fs = (n) => Math.round(n * FS);
  const shade = (c, a) => CO.shade(c, a);
  const mixc = (a, b, t) => CO.mix(a, b, clamp(t, 0, 1));
  const rgba = (c, a) => CO.rgba(c, a);

  /* ---------- 안내 말풍선 · 계기판 ---------- */
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

  /* ---------- 그리기 도우미 ---------- */
  const pill = (x, y, text, o) => D.label(x, y, text, Object.assign({ size: fs(13) }, o));
  function lines(x, y, arr, o) {
    o = o || {};
    arr.forEach((s, i) => D.text(x, y + i * (o.lh || fs(20)), s, Object.assign({ size: fs(14), weight: 700, color: INK }, o)));
  }
  function bgFill(c0, c1) {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { D.roundRect(x, y, w, h, o.r || 14); ctx.fillStyle = o.fill || 'rgba(255,255,255,.92)'; ctx.fill(); }, { blur: o.blur != null ? o.blur : 8, y: 2 });
    if (o.stroke) { D.roundRect(x, y, w, h, o.r || 14); ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 2; ctx.stroke(); }
  }
  // 글자 크기를 폭에 맞춰 줄여서 쓰기
  function fitText(x, y, str, maxW, size, o) {
    o = o || {};
    ctx.save(); ctx.font = D.font(size, o.weight || 800);
    const w = ctx.measureText(str).width; ctx.restore();
    const sz = w > maxW ? Math.max(9, size * maxW / w) : size;
    D.text(x, y, str, Object.assign({}, o, { size: sz }));
  }
  function wrapText(x, y, str, maxW, size, lh, o) {
    o = o || {};
    ctx.save(); ctx.font = D.font(size, o.weight || 700);
    const words = str.split(' '); const out = []; let cur = '';
    words.forEach((w) => {
      const t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
    });
    if (cur) out.push(cur);
    ctx.restore();
    out.forEach((s, i) => D.text(x, y + i * lh, s, Object.assign({ size }, o)));
    return out.length;
  }
  // 이온·분자 문자열 (유니코드 위·아래 첨자)
  const SUPS = { '+': '⁺', '-': '⁻' };
  const ionBall = (x, y, r, color, text, o) => {
    o = o || {};
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha *= o.alpha; }
    D.sphere(x, y, r, color, { shadow: o.shadow === true, gloss: r > 7 });
    if (text && r >= 6) D.text(x, y + r * 0.34, text, { size: Math.max(9, r * (o.ts || 1.15)), weight: 800, color: '#fff', stroke: shade(color, -0.45), strokeWidth: 3 });
    if (o.alpha != null) ctx.restore();
  };
  const tap = (el, fn) => el.addEventListener('click', fn);


  /* =========================================================
     카드 분류판: 카드를 끌어서 상자에 넣어요 (놓는 위치는 포인터 위치로 판정, 탭으로도 가능)
     cfg = { items:[{id,...}], bins:[{id,...}], layout(){ bins:{id:rect}, tray:rect, cw, ch, gap, headH },
             drawItem(it,w,h,st), drawBin(bin,rect,st), drawTray(rect), onChange(it), onTap(it) }
     ========================================================= */
  function makeBoard(cfg) {
    const B = { items: [], sel: null, drag: null, ord: 0, hot: null, cfg };
    cfg.items.forEach((it, i) => B.items.push(Object.assign({ idx: i, bin: null, x: 0, y: 0, ord: 0, sc: 1, shake: 0, mark: null, init: false }, it)));
    function grid(rect, n, L, headH) {
      const gap = L.gap, cw = L.cw, ch = L.ch;
      const cols = Math.max(1, Math.floor((rect.w - gap) / (cw + gap)));
      const rows = Math.max(1, Math.ceil(n / cols));
      const availH = rect.h - headH - gap * 2;
      const stepY = rows > 1 ? Math.min(ch + gap, (availH - ch) / (rows - 1)) : 0;
      const used = Math.min(n, cols) * (cw + gap) - gap;
      const x0 = rect.x + (rect.w - Math.max(used, cw)) / 2 + cw / 2;
      const out = [];
      for (let i = 0; i < n; i++) out.push({ x: x0 + (i % cols) * (cw + gap), y: rect.y + headH + gap + ch / 2 + Math.floor(i / cols) * stepY });
      return out;
    }
    B.inBin = (id) => B.items.filter((it) => it.bin === id);
    B.placed = () => B.items.filter((it) => it.bin);
    B.update = function (dt) {
      const L = cfg.layout();
      const drag = B.drag && B.drag.moved ? B.drag.it : null;
      const setT = (list, rect, headH) => {
        const pos = grid(rect, list.length, L, headH);
        list.forEach((it, i) => { it.tx = pos[i].x; it.ty = pos[i].y; });
      };
      cfg.bins.forEach((b) => setT(B.items.filter((it) => it.bin === b.id && it !== drag).sort((a, c) => a.ord - c.ord), L.bins[b.id], L.headH));
      setT(B.items.filter((it) => !it.bin && it !== drag), L.tray, L.trayHead || 0);
      B.items.forEach((it) => {
        if (it === drag) return;
        if (!it.init) { it.x = it.tx; it.y = it.ty; it.init = true; }
        it.x = approach(it.x, it.tx, dt, 14); it.y = approach(it.y, it.ty, dt, 14);
        it.sc = approach(it.sc, it.sel ? 1.06 : 1, dt, 14);
        if (it.shake > 0) it.shake = Math.max(0, it.shake - dt * 2.5);
      });
      B.items.forEach((it) => { it.sel = B.sel === it; });
      if (drag) drag.sc = approach(drag.sc, 1.1, dt, 20);
    };
    B.hit = function (p) {
      const L = cfg.layout();
      const list = B.items.slice().sort((a, c) => (a.bin ? a.ord : -1) - (c.bin ? c.ord : -1)).reverse();
      return list.find((it) => Math.abs(p.x - it.x) <= L.cw / 2 && Math.abs(p.y - it.y) <= L.ch / 2) || null;
    };
    B.binAt = function (p) {
      const L = cfg.layout();
      return cfg.bins.find((b) => { const r = L.bins[b.id]; return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }) || null;
    };
    B.assign = function (it, binId, silent) {
      it.bin = binId; it.mark = null;
      if (binId) it.ord = ++B.ord;
      B.sel = null;
      if (!silent) {
        Sound.tick();
        fx.burst(it.x, it.y, { count: 8, colors: ['#fff', '#c9b6f5'], speed: 90, size: 3, gravity: 0, life: 0.45 });
      }
      cfg.onChange && cfg.onChange(it);
    };
    B.down = function (p) {
      const it = B.hit(p);
      if (it) {
        B.drag = { it, dx: it.x - p.x, dy: it.y - p.y, sx: p.x, sy: p.y, moved: false };
        Sound.click();
        return true;
      }
      const b = B.binAt(p);
      if (b && B.sel) { B.assign(B.sel, b.id); }
      return false;
    };
    B.move = function (p) {
      const d = B.drag; if (!d) return;
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true;
      if (d.moved) { d.it.x = p.x + d.dx; d.it.y = p.y + d.dy; B.hot = B.binAt(p); }
    };
    B.up = function (p) {
      const d = B.drag; if (!d) return;
      B.drag = null; B.hot = null;
      const it = d.it;
      if (!d.moved) {
        if (it.bin) { cfg.onTap && cfg.onTap(it); }
        else { B.sel = B.sel === it ? null : it; Sound.click(); }
        return;
      }
      const b = B.binAt(p);
      if (b) B.assign(it, b.id);
      else if (it.bin) { it.bin = null; it.mark = null; cfg.onChange && cfg.onChange(it); }
    };
    B.reset = function () {
      B.drag = null; B.sel = null; B.hot = null;
      B.items.forEach((it) => { it.bin = null; it.mark = null; it.shake = 0; });
    };
    B.draw = function (t) {
      const L = cfg.layout();
      cfg.drawTray && cfg.drawTray(L.tray);
      cfg.bins.forEach((b) => {
        const r = L.bins[b.id];
        cfg.drawBin(b, r, { count: B.inBin(b.id).length, hot: B.hot === b || (B.sel && !B.drag), t });
      });
      const drag = B.drag && B.drag.moved ? B.drag.it : null;
      const order = B.items.slice().sort((a, c) => (a.bin ? a.ord : -1) - (c.bin ? c.ord : -1));
      order.filter((it) => it !== drag).concat(drag ? [drag] : []).forEach((it) => {
        ctx.save();
        const off = it.shake > 0 ? Math.sin(it.shake * 30) * 5 * it.shake : 0;
        ctx.translate(it.x + off, it.y); ctx.scale(it.sc, it.sc);
        if (it === drag) D.shadow(() => { D.roundRect(-L.cw / 2, -L.ch / 2, L.cw, L.ch, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 16, y: 8, color: 'rgba(40,20,90,.3)' });
        cfg.drawItem(it, L.cw, L.ch, { drag: it === drag, sel: B.sel === it, t });
        ctx.restore();
      });
    };
    return B;
  }


  /* =========================================================
     통합과학2 Ⅰ. 변화와 다양성 - 에너지의 흡수와 방출 [10통과2-01-05]
     ① 관찰: 열의 출입 (NaOH · 질산 암모늄의 용해, 얼음의 융해, 수증기의 응결)
     ② 탐구: 사례 분류 (14장 카드: 방출 / 흡수, 물리·화학 변화 표시)
     ③ 설명: 자연 속 에너지 (광합성 · 세포 호흡 · 물의 순환)
     ④ 적용: 조리 장치 설계 (산화 칼슘 + 물, 단열재)
     ※ 열화학 반응식·엔탈피·반응열 계산·결합 에너지는 다루지 않아요. (조리 장치의 값은 크기 감각용 예시 모델)
     ========================================================= */
  const HOT = '#f26b3a', COLD = '#2f7de1';
  const S = { scene: 'bench', sceneA: 1 };
  const TB = { bench: '🌡️ 열의 출입 실험대', sort: '🗂️ 에너지 방출 · 흡수 분류', nature: '🌿 자연 속 에너지의 출입', cook: '🍲 산화 칼슘 조리 장치 설계', talk: '💬 생활 속 이용 사례 토의' };
  function setScene(sc) {
    S.scene = sc; hintEl.classList.add('hide');
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4, ease: 'outCubic' });
    updateUI();
  }
  function updateUI() {
    ['bench', 'sort', 'nature', 'cook', 'talk'].forEach((k) => { $('#cs-' + k).hidden = k !== S.scene; });
    $('#tbLabel').textContent = TB[S.scene];
    $('#sceneSeg').hidden = F.size < 2;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
  }

  /* =========================================================
     ① 열의 출입 실험대 (온도가 시간에 따라 변하는 실시간 그래프)
     ========================================================= */
  const DUR = 10;                                     // 실험 시간 (줄여서 보여 줘요)
  const W_G = 100, NAOH_G = 5, NH4_G = 10;            // 물 100 g, 수산화 나트륨 5 g, 질산 암모늄 10 g
  const BENCH = {
    naoh: { name: '수산화 나트륨 + 물', btn: '🧂 NaOH 녹이기', T0: 20, T1: 33, dir: 'out', what: '물 ' + W_G + ' g에 수산화 나트륨 ' + NAOH_G + ' g을 녹여요', ylab: '물의 온도', phys: true },
    nh4: { name: '질산 암모늄 + 물', btn: '🧊 질산 암모늄 녹이기', T0: 20, T1: 13, dir: 'in', what: '물 ' + W_G + ' g에 질산 암모늄 ' + NH4_G + ' g을 녹여요', ylab: '물의 온도' },
    ice: { name: '얼음이 든 컵', btn: '🥤 얼음이 든 컵', T0: 20, T1: 6, dir: 'in', what: '얼음이 녹으면서 컵 겉면이 차가워져요', ylab: '컵 겉면의 온도' },
    steam: { name: '수증기와 찬 컵', btn: '♨️ 수증기와 찬 컵', T0: 20, T1: 30, dir: 'out', what: '뜨거운 수증기가 찬 컵에 닿아 물방울이 돼요', ylab: '컵 속 물의 온도' },
  };
  const BKEYS = ['naoh', 'nh4', 'ice', 'steam'];
  const BN = { key: 'naoh', t: 0, running: false, done: {}, pts: { naoh: [], nh4: [], ice: [], steam: [] }, Tshow: 20, droplets: [], pelletsDone: false };
  const benchT = (k, t) => { const b = BENCH[k]; const u = clamp(t / DUR, 0, 1); return Math.round((b.T0 + (b.T1 - b.T0) * (1 - Math.pow(1 - u, 3))) * 10) / 10; };
  const benchDoneCount = () => BKEYS.filter((k) => BN.done[k]).length;
  const dirWord = (d) => (d === 'out' ? '에너지 방출 (주위 온도 ↑)' : '에너지 흡수 (주위 온도 ↓)');
  function selectBench(k) {
    if (BN.running) { BN.running = false; BN.pts[BN.key].length = 0; BN.t = 0; BN.done[BN.key] = !!BN.done[BN.key] && false; }
    BN.key = k; BN.t = BN.done[k] ? DUR : 0; BN.Tshow = BN.done[k] ? BENCH[k].T1 : BENCH[k].T0; BN.pelletsDone = false;
    syncBench();
  }
  function runBench() {
    if (BN.running) return;
    const k = BN.key; BN.running = true; BN.t = 0; BN.done[k] = false; BN.pts[k] = [{ t: 0, T: BENCH[k].T0 }]; BN.pelletsDone = false; BN.acc = 0;
    Sound.click();
    syncBench();
  }
  function syncBench() {
    $$('#benchBtns .opt').forEach((b) => { b.classList.toggle('on', b.dataset.b === BN.key); b.classList.toggle('done', !!BN.done[b.dataset.b]); });
    $('#benchRun').disabled = BN.running;
    $('#benchRun').textContent = BN.running ? '⏳ 측정 중…' : BN.done[BN.key] ? '↻ 다시 측정하기' : '▶ 실험 시작';
    $('#benchNote').textContent = BENCH[BN.key].what + '. ' + (BN.done[BN.key] ? '측정이 끝났어요. 다른 실험대도 해 봐요.' : '실험 시작을 누르고 온도와 열 화살표를 살펴봐요. (실험 시간은 줄여서 보여 줘요.)');
  }
  function stepBench(dt) {
    const k = BN.key, b = BENCH[k];
    if (BN.running) {
      BN.t += dt; BN.acc += dt;
      if (BN.acc >= 0.2) { BN.acc = 0; BN.pts[k].push({ t: Math.min(DUR, BN.t), T: benchT(k, BN.t) }); }
      if (!BN.pelletsDone && BN.t > 0.3) {
        BN.pelletsDone = true;
        const w = benchBox();
        if (k === 'naoh' || k === 'nh4') for (let i = 0; i < 9; i++) fx.emit({ x: w.x + w.w / 2 + rnd(-30, 30), y: w.y - 40 - i * 8, vx: rnd(-10, 10), vy: 60, gravity: 500, life: 0.75 + i * 0.03, size: rnd(2.8, 4.2), color: k === 'naoh' ? '#f4f7fa' : '#ffffff', shape: 'square', fade: false });
      }
      if (BN.t >= DUR) {
        BN.t = DUR; BN.running = false;
        BN.pts[k].push({ t: DUR, T: b.T1 });
        BN.done[k] = true; Sound.success();
        showHint(b.name + ': ' + b.T0 + ' °C → ' + b.T1 + ' °C  (' + dirWord(b.dir) + ')', 4800);
        syncBench();
      }
    }
    BN.Tshow = benchT(k, BN.t);
  }
  const benchBox = () => (PHONE ? { x: OXB + 150, y: OYB + 120, w: 190, h: 200 } : { x: OXB + 120, y: OYB + 150, w: 190, h: 220 });
  const OXB = PHONE ? 20 : 24, OYB = PHONE ? 34 : 56;
  function heatArrows(cx, cy, rx, ry, dir, a, t) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i - (n - 1) / 2) * 0.62 + (dir === 'out' ? 0 : 0);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const k = 0.5 + 0.5 * Math.sin(t * 3 + i);
      const d0 = 1 + (dir === 'out' ? k * 0.12 : (1 - k) * 0.12);
      const x1 = cx + ca * rx * 0.95 * d0, y1 = cy + sa * ry * 0.95 * d0, x2 = cx + ca * (rx + 54), y2 = cy + sa * (ry + 54);
      if (dir === 'out') D.arrow(x1, y1, x2, y2, { color: HOT, width: 4, head: 11, alpha: a });
      else D.arrow(x2, y2, x1, y1, { color: COLD, width: 4, head: 11, alpha: a });
    }
  }
  function drawBench(t) {
    const k = BN.key, b = BENCH[k];
    const prog = clamp(BN.t / DUR, 0, 1), dT = BN.Tshow - b.T0;
    const col = b.dir === 'out' ? HOT : COLD;
    const bx = benchBox();
    D.text(bx.x + bx.w / 2, OYB + (PHONE ? 4 : 0), '🧪 ' + b.name, { size: fs(15), weight: 800, color: '#4c1d95' });
    // 탁자
    D.roundRect(OXB - 10, bx.y + bx.h + 10, (PHONE ? 500 : 440), 26, 8); ctx.fillStyle = '#c9b08d'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(OXB - 6, bx.y + bx.h + 12, (PHONE ? 492 : 432), 3);
    if (k === 'naoh' || k === 'nh4') {
      D.beaker(bx.x, bx.y, bx.w, bx.h, { level: 0.68, liquid: '#a9d4ff', t, wave: 1.4 });
      { const gl = clamp(Math.abs(dT) / 13, 0, 1); if (gl > 0.02) { ctx.save(); D.roundRect(bx.x + 4, bx.y + bx.h * 0.32, bx.w - 8, bx.h * 0.66 - 4, 8); ctx.clip(); D.glow(bx.x + bx.w / 2, bx.y + bx.h * 0.7, bx.w * 0.8, k === 'naoh' ? '#ff9a4d' : '#ffffff', 0.55 * gl); ctx.restore(); } }
      // 알갱이가 녹아 사라져요
      if (BN.running || BN.t > 0) for (let i = 0; i < 7; i++) { const a = 1 - clamp((BN.t - 0.8 - i * 0.15) / 1.4, 0, 1); if (a > 0 && BN.t > 0.9) { ctx.fillStyle = 'rgba(255,255,255,' + 0.9 * a + ')'; ctx.fillRect(bx.x + 40 + i * 18, bx.y + bx.h - 18 - (i % 2) * 5, 6, 5); } }
      if (BN.t === 0 && !BN.running) { // 시료 접시
        D.roundRect(bx.x - 96, bx.y + bx.h - 30, 70, 14, 7); ctx.fillStyle = '#d7dde8'; ctx.fill();
        for (let i = 0; i < 6; i++) { ctx.fillStyle = '#fff'; ctx.fillRect(bx.x - 84 + i * 9, bx.y + bx.h - 38 - (i % 2) * 3, 7, 6); }
        D.text(bx.x - 62, bx.y + bx.h - 50, k === 'naoh' ? 'NaOH ' + NAOH_G + ' g' : '질산 암모늄 ' + NH4_G + ' g', { size: fs(12), weight: 800, color: MUTED });
      }
      D.text(bx.x + bx.w / 2, bx.y + bx.h - 16, '물 ' + W_G + ' g', { size: fs(13), weight: 800, color: '#3a5a8a' });
    } else if (k === 'ice') {
      D.beaker(bx.x, bx.y, bx.w, bx.h, { level: 0.6, liquid: '#bfe0ff', t, wave: 1.2 });
      // 얼음 조각 (녹으면서 작아져요)
      const sz = 1 - 0.7 * prog;
      [[0.3, 0.36, 36], [0.55, 0.3, 32], [0.7, 0.4, 30]].forEach((c, i) => {
        const x = bx.x + bx.w * c[0], y = bx.y + bx.h * (c[1] + 0.12) + Math.sin(t * 1.4 + i) * 2, s = c[2] * sz;
        ctx.save(); ctx.translate(x, y); ctx.rotate(0.2 * (i - 1));
        D.roundRect(-s / 2, -s / 2, s, s, 5); ctx.fillStyle = 'rgba(235,248,255,.85)'; ctx.fill(); ctx.strokeStyle = 'rgba(150,200,240,.9)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      });
      // 겉면에 맺히는 물방울
      const nd = Math.floor(prog * 16);
      for (let i = 0; i < nd; i++) { const dx = bx.x - 3 + ((i * 53) % 7) * 0.9 + (i % 2) * (bx.w + 6), dy = bx.y + 16 + ((i * 37) % (bx.h - 40)); ctx.fillStyle = 'rgba(190,225,255,.95)'; ctx.beginPath(); ctx.ellipse(dx, dy, 2.6, 3.8, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(120,170,220,.8)'; ctx.lineWidth = 1; ctx.stroke(); }
      if (nd > 2) D.text(bx.x + bx.w / 2, bx.y + bx.h + fs(30), '컵 겉면에 물방울이 맺혀요', { size: fs(13), weight: 800, color: '#2f5fb8' });
    } else {
      // 수증기 → 찬 컵
      const fx0 = bx.x - 70;
      D.flask(fx0, bx.y + bx.h, 120, 140, { level: 0.55, liquid: '#bfe0ff', t });
      D.flame(fx0, bx.y + bx.h + 18, 30, t);
      if (BN.running && Math.random() < 0.8) fx.emit({ x: fx0 + rnd(-4, 4), y: bx.y + bx.h - 140, vx: rnd(28, 60), vy: -rnd(8, 24), life: 1.6, size: rnd(6, 11), grow: 8, color: 'rgba(240,244,250,.9)', shape: 'smoke', alpha: 0.8 });
      D.beaker(bx.x + 40, bx.y + 40, bx.w - 40, bx.h - 40, { level: 0.6, liquid: '#a9d4ff', t, wave: 1.0 });
      if (prog > 0.02) { ctx.save(); D.roundRect(bx.x + 44, bx.y + 40 + (bx.h - 40) * 0.4, bx.w - 48, (bx.h - 40) * 0.6 - 4, 8); ctx.clip(); D.glow(bx.x + 40 + (bx.w - 40) / 2, bx.y + bx.h - 30, bx.w * 0.6, '#ff9a4d', 0.5 * prog); ctx.restore(); }
      const nd = Math.floor(prog * 14);
      for (let i = 0; i < nd; i++) { const dx = bx.x + 38 + (i % 3) * 3, dy = bx.y + 56 + ((i * 37) % (bx.h - 90)); ctx.fillStyle = 'rgba(210,235,255,.95)'; ctx.beginPath(); ctx.ellipse(dx, dy, 2.8, 4, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(120,170,220,.9)'; ctx.lineWidth = 1; ctx.stroke(); }
      D.text(fx0, bx.y + bx.h + fs(40), '끓는 물', { size: fs(13), weight: 800, color: MUTED });
      D.text(bx.x + 40 + (bx.w - 40) / 2, bx.y + bx.h - 14, '찬 컵 (물 ' + W_G + ' g)', { size: fs(13), weight: 800, color: '#3a5a8a' });
    }
    // 열 화살표 (방출: 밖으로 / 흡수: 안으로)
    const aa = clamp((BN.running || BN.t >= DUR ? Math.abs(dT) / Math.abs(b.T1 - b.T0) : 0) * 1.2, 0, 1);
    if (aa > 0.12) {
      const cx = bx.x + bx.w / 2 + (k === 'steam' ? 20 : 0), cy = bx.y + bx.h * 0.55;
      heatArrows(cx, cy, bx.w * 0.58, bx.h * 0.52, b.dir, aa, t);
      pill(cx - (PHONE ? 34 : 0), bx.y - fs(30), b.dir === 'out' ? '열이 주위로 나가요 (방출)' : '주위의 열이 들어와요 (흡수)', { bg: b.dir === 'out' ? HOT : COLD, color: '#fff', size: fs(13) });
    }
    // 온도계
    const tx = PHONE ? bx.x + bx.w + 38 : bx.x + bx.w + 52;
    D.thermometer(tx, bx.y - 10, bx.h - 10, BN.Tshow, 0, 40, { color: '#e2464b', step: 10, unit: '°' });
    D.roundRect(tx - 36, bx.y - 52, 78, 30, 8); ctx.fillStyle = '#16212f'; ctx.fill();
    D.text(tx + 3, bx.y - 31, BN.Tshow.toFixed(1) + ' °C', { size: fs(15), weight: 800, color: dT > 0.05 ? '#ffb86b' : dT < -0.05 ? '#8fd0ff' : '#6bffb0' });
    pill(PHONE ? 140 : 200, VH - (PHONE ? 22 : 34), '방출: 주위 온도 ↑', { bg: HOT, color: '#fff', size: fs(12.5) });
    pill(PHONE ? 330 : 400, VH - (PHONE ? 22 : 34), '흡수: 주위 온도 ↓', { bg: COLD, color: '#fff', size: fs(12.5) });
    // 그래프
    const g = PHONE ? { x: 54, y: 446, w: 480, h: 226 } : { x: 530, y: 126, w: 240, h: 300 };
    panel(g.x - (PHONE ? 40 : 52), g.y - (PHONE ? 56 : 66), g.w + (PHONE ? 62 : 74), g.h + (PHONE ? 98 : 120), { r: 14, stroke: '#d9cffa' });
    D.text(g.x + g.w / 2 - 10, g.y - (PHONE ? 30 : 38), '🌡️ ' + b.ylab + ' (°C)', { size: fs(14), weight: 800, color: '#4c1d95' });
    D.text(g.x + g.w / 2 - 10, g.y - (PHONE ? 10 : 18), '실험 시간은 줄여서 보여 줘요', { size: fs(11), weight: 700, color: MUTED });
    const gy = (T) => g.y + g.h - g.h * (T / 40), gx = (s) => g.x + g.w * (s / DUR);
    for (let T = 0; T <= 40; T += 10) { ctx.strokeStyle = T === 0 ? '#8a95a8' : '#e3e8f1'; ctx.lineWidth = T === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(g.x, gy(T)); ctx.lineTo(g.x + g.w, gy(T)); ctx.stroke(); D.text(g.x - 8, gy(T) + 4, String(T), { size: fs(12), weight: 700, color: MUTED, align: 'right' }); }
    for (let s = 0; s <= DUR; s += 2) D.text(gx(s), g.y + g.h + fs(17), String(s), { size: fs(12), weight: 700, color: MUTED });
    D.text(g.x + g.w / 2, g.y + g.h + fs(36), '시간 (초)', { size: fs(12.5), weight: 800, color: MUTED });
    D.dashedLine(g.x, gy(b.T0), g.x + g.w, gy(b.T0), { color: '#9aa5b6', width: 1.5 });
    const pts = BN.pts[k];
    if (pts.length > 1) { ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(gx(p.t), gy(p.T)) : ctx.moveTo(gx(p.t), gy(p.T)))); ctx.stroke(); }
    if (BN.running || BN.done[k]) D.sphere(gx(Math.min(DUR, BN.t)), gy(BN.Tshow), 6, col, { shadow: true });
    if (BN.done[k]) {
      pill(gx(DUR) - 4, gy(b.T1) + (b.dir === 'out' ? -fs(18) : fs(20)), b.T1 + ' °C', { bg: '#fff', color: INK, border: col, size: fs(12.5) });
      pill(g.x + g.w / 2, g.y + fs(14), dirWord(b.dir), { bg: col, color: '#fff', size: fs(12.5) });
    }
  }


  /* =========================================================
     ② 사례 분류: 에너지 방출 / 흡수 (물리 변화 · 화학 변화 표시)
     ========================================================= */
  const CARDS = [
    { n: '연소', e: '🔥', d: 'out', k: 'chem' }, { n: '광합성', e: '🌿', d: 'in', k: 'chem' },
    { n: '얼음의 융해', e: '🧊', d: 'in', k: 'phys' }, { n: '중화 반응', e: '🧪', d: 'out', k: 'chem' },
    { n: '땀의 증발', e: '💦', d: 'in', k: 'phys' }, { n: '철의 산화(손난로)', e: '🔩', d: 'out', k: 'chem' },
    { n: '질산 암모늄의 용해', e: '🥤', d: 'in', k: 'phys' }, { n: '산화 칼슘 + 물', e: '🍲', d: 'out', k: 'chem' },
    { n: '드라이아이스의 승화', e: '🌫️', d: 'in', k: 'phys' }, { n: '세포 호흡', e: '🫁', d: 'out', k: 'chem' },
    { n: '탄산수소 나트륨 열분해', e: '🍞', d: 'in', k: 'chem' }, { n: '수증기의 응결', e: '☁️', d: 'out', k: 'phys' },
    { n: '물의 전기 분해', e: '⚡', d: 'in', k: 'chem' }, { n: '물의 응고', e: '❄️', d: 'out', k: 'phys' },
  ];
  const SBINS = [{ id: 'out', label: '에너지 방출' }, { id: 'in', label: '에너지 흡수' }];
  const SO = { kind: false };
  function sLayout() {
    if (PHONE) return { bins: { out: { x: 8, y: 8, w: 270, h: 420 }, in: { x: 282, y: 8, w: 270, h: 420 } }, tray: { x: 8, y: 436, w: 544, h: 316 }, cw: 126, ch: 52, gap: 6, headH: 46, trayHead: 22 };
    return { bins: { out: { x: 16, y: 40, w: 380, h: 332 }, in: { x: 404, y: 40, w: 380, h: 332 } }, tray: { x: 16, y: 380, w: 768, h: 216 }, cw: 176, ch: 44, gap: 7, headH: 44, trayHead: 18 };
  }
  const SB = makeBoard({
    items: CARDS.map((c) => ({ id: c.n })),
    bins: SBINS,
    layout: sLayout,
    drawItem(it, w, h, st) {
      const c = CARDS[it.idx];
      D.roundRect(-w / 2, -h / 2, w, h, 10); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = it.mark === 'bad' ? '#e2464b' : st.sel ? '#8b5cf6' : '#cdbff1'; ctx.lineWidth = it.mark === 'bad' || st.sel ? 3 : 1.6; ctx.stroke();
      ctx.font = D.font(fs(19), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = INK; ctx.fillText(c.e, -w / 2 + fs(18), 2); ctx.textBaseline = 'alphabetic';
      fitText(-w / 2 + fs(34), 5, c.n, w - fs(34) - (SO.kind ? 34 : 8), fs(13), { weight: 800, color: INK, align: 'left' });
      if (SO.kind) { D.roundRect(w / 2 - 34, -h / 2 + 4, 30, 16, 8); ctx.fillStyle = c.k === 'phys' ? '#2f7de1' : '#f26b3a'; ctx.fill(); D.text(w / 2 - 19, -h / 2 + 16, c.k === 'phys' ? '물리' : '화학', { size: 10.5, weight: 800, color: '#fff' }); }
      if (it.mark === 'bad') D.text(w / 2 - 4, h / 2 - 5, '✕', { size: 13, weight: 800, color: '#e2464b', align: 'right' });
    },
    drawBin(b, r, st) {
      const col = b.id === 'out' ? HOT : COLD;
      D.roundRect(r.x, r.y, r.w, r.h, 16); ctx.fillStyle = rgba(col, st.hot ? 0.2 : 0.1); ctx.fill();
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = rgba(col, st.hot ? 0.95 : 0.55); ctx.lineWidth = st.hot ? 3 : 2; ctx.stroke(); ctx.restore();
      D.text(r.x + r.w / 2, r.y + fs(24), b.label, { size: fs(17), weight: 800, color: shade(col, -0.25) });
      D.text(r.x + r.w / 2, r.y + fs(24) + fs(15), b.id === 'out' ? '에너지가 주위로 나가요 (주위 온도 ↑)' : '에너지가 주위에서 들어와요 (주위 온도 ↓)', { size: fs(11.5), weight: 700, color: MUTED });
      if (st.count === 0) D.text(r.x + r.w / 2, r.y + r.h / 2 + 10, '여기에 놓아요', { size: fs(13), weight: 700, color: rgba(col, 0.55) });
    },
    drawTray(r) { D.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); D.text(r.x + 12, r.y + fs(15), '변화 카드', { size: fs(12), weight: 800, color: MUTED, align: 'left' }); },
  });
  const sWrong = () => SB.items.filter((it) => it.bin && it.bin !== CARDS[it.idx].d);
  function sortCheck() {
    const placed = SB.items.filter((it) => it.bin).length;
    if (placed < CARDS.length) return '아직 상자에 넣지 않은 카드가 ' + (CARDS.length - placed) + '장 있어요.';
    const wrong = sWrong();
    if (!wrong.length) return true;
    wrong.forEach((it) => { if (it.mark !== 'bad') { it.mark = 'bad'; it.shake = 1; } });
    return '✕ 표시된 카드를 다시 봐요. 주위가 따뜻해지면 방출, 주위가 차가워지면 흡수예요. (앞 단계 실험대의 결과를 떠올려 봐요.)';
  }
  function setKind(on) { SO.kind = on; $('#kindBtn').textContent = on ? '🔍 물리·화학 변화 표시 끄기' : '🔍 물리·화학 변화 표시 켜기'; $('#kindBtn').classList.toggle('on', on); }


  /* =========================================================
     ③ 자연 속 에너지: 광합성 · 세포 호흡 · 물의 순환
     ========================================================= */
  const HS = {
    leaf: { view: 'leaf', want: 'in', name: '광합성', pos: () => ({ x: VW * 0.5, y: PHONE ? 340 : 300 }), v: { x: -0.75, y: -0.66 }, why: '빛에너지가 포도당에 저장돼요' },
    body: { view: 'body', want: 'out', name: '세포 호흡', pos: () => ({ x: VW * 0.5, y: PHONE ? 330 : 290 }), v: { x: 1, y: 0 }, why: '포도당의 에너지가 나와 체온을 유지해요' },
    evap: { view: 'water', want: 'in', name: '바닷물의 증발', pos: () => ({ x: PHONE ? 150 : 200, y: PHONE ? 520 : 440 }), v: { x: 0, y: -1 }, why: '물이 수증기가 되며 주위의 열을 흡수해요' },
    cond: { view: 'water', want: 'out', name: '수증기의 응결', pos: () => ({ x: PHONE ? 330 : 520, y: PHONE ? 170 : 150 }), v: { x: 1, y: 0.1 }, why: '수증기가 물방울이 되며 열을 내보내요' },
  };
  const HKEYS = Object.keys(HS);
  const NS = { view: 'leaf', set: { leaf: null, body: null, evap: null, cond: null }, mark: {}, shake: {}, vap: [] };
  const natCorrect = () => HKEYS.filter((k) => NS.set[k] === HS[k].want).length;
  const natSetCount = () => HKEYS.filter((k) => NS.set[k]).length;
  function setNatView(v) { NS.view = v; $$('#natBtns .opt').forEach((b) => b.classList.toggle('on', b.dataset.n === v)); }
  function natCheck() {
    const n = natSetCount();
    if (n < HKEYS.length) return '아직 정하지 않은 곳이 ' + (HKEYS.length - n) + '곳 있어요. 장면을 바꿔 가며 ? 표시를 눌러요.';
    const wrong = HKEYS.filter((k) => NS.set[k] !== HS[k].want);
    if (!wrong.length) return true;
    wrong.forEach((k) => { if (NS.mark[k] !== 'bad') { NS.mark[k] = 'bad'; NS.shake[k] = 1; } });
    return '✕ 표시된 곳을 다시 봐요. 에너지가 저장되거나 주위에서 들어오면 "흡수", 에너지가 나가 주위가 따뜻해지면 "방출"이에요.';
  }
  function resetNature() { HKEYS.forEach((k) => { NS.set[k] = null; NS.mark[k] = null; }); }
  function natClick(p) {
    for (const k of HKEYS) {
      const h = HS[k]; if (h.view !== NS.view) continue;
      const q = h.pos();
      if (Math.hypot(p.x - q.x, p.y - q.y) < 40) {
        NS.set[k] = NS.set[k] === 'in' ? 'out' : 'in'; NS.mark[k] = null;
        Sound.tick(); fx.burst(q.x, q.y, { count: 10, colors: [NS.set[k] === 'in' ? COLD : HOT, '#fff'], speed: 110, size: 3, gravity: 0, life: 0.5 });
        return;
      }
    }
  }
  function drawLeaf(t) {
    D.sky(0, 0, VW, VH, '#bfe3ff', '#eaf7ff');
    D.ground(0, VH - 90, VW, 90);
    // 해
    const sx = PHONE ? 90 : 110, sy = PHONE ? 110 : 110;
    D.glow(sx, sy, 110, '#ffd34d', 0.6); D.sphere(sx, sy, 40, '#ffc933', { gloss: false, shadow: false });
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12 + t * 0.2; ctx.strokeStyle = 'rgba(255,200,40,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 50, sy + Math.sin(a) * 50); ctx.lineTo(sx + Math.cos(a) * 66, sy + Math.sin(a) * 66); ctx.stroke(); }
    D.text(sx, sy + 78, '빛에너지', { size: fs(13), weight: 800, color: '#a15c00' });
    // 줄기와 잎
    const cx = VW * 0.5, cy = PHONE ? 340 : 300, s = PHONE ? 1.05 : 1.25;
    ctx.strokeStyle = '#4f9a3c'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, VH - 80); ctx.quadraticCurveTo(cx - 10, cy + 120, cx, cy + 60 * s); ctx.stroke();
    D.shadow(() => {
      ctx.beginPath(); ctx.moveTo(cx - 140 * s, cy + 40 * s);
      ctx.bezierCurveTo(cx - 100 * s, cy - 120 * s, cx + 80 * s, cy - 130 * s, cx + 150 * s, cy - 30 * s);
      ctx.bezierCurveTo(cx + 90 * s, cy + 90 * s, cx - 60 * s, cy + 110 * s, cx - 140 * s, cy + 40 * s);
      const g = ctx.createLinearGradient(cx - 140 * s, cy - 100 * s, cx + 140 * s, cy + 100 * s); g.addColorStop(0, '#8fd36a'); g.addColorStop(1, '#3f9c3b');
      ctx.fillStyle = g; ctx.fill();
    }, { blur: 10, y: 5 });
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 130 * s, cy + 36 * s); ctx.quadraticCurveTo(cx, cy - 20 * s, cx + 140 * s, cy - 28 * s); ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - 70 * s + i * 38 * s, cy + (14 - i * 7) * s); ctx.lineTo(cx - 50 * s + i * 40 * s, cy - (52 - i * 4) * s); ctx.stroke(); }
    if (NS.set.leaf === 'in') { D.glow(cx, cy, 90, '#ffe27a', 0.35 + 0.2 * Math.sin(t * 4)); pill(cx, cy + 118 * s, '포도당에 에너지가 저장돼요', { bg: '#fff', color: '#0b6b39', border: '#14a058', size: fs(13) }); }
    D.text(VW / 2, VH - 50, '이산화 탄소 + 물 + 빛에너지 → 포도당 + 산소', { size: fs(14), weight: 800, color: '#1d4d14' });
  }
  function drawBody(t) {
    bgFill('#fff1e6', '#fde3cf');
    const cx = VW / 2, cy = PHONE ? 330 : 290;
    // 사람
    D.shadow(() => {
      ctx.fillStyle = '#f5b895'; ctx.beginPath(); ctx.arc(cx, cy - 150, 38, 0, TAU); ctx.fill();
      D.roundRect(cx - 54, cy - 108, 108, 170, 36); ctx.fillStyle = '#6aa7ff'; ctx.fill();
      D.roundRect(cx - 90, cy - 100, 30, 120, 15); ctx.fillStyle = '#f5b895'; ctx.fill(); D.roundRect(cx + 60, cy - 100, 30, 120, 15); ctx.fill();
      D.roundRect(cx - 44, cy + 50, 40, 130, 18); ctx.fillStyle = '#3f5fa8'; ctx.fill(); D.roundRect(cx + 4, cy + 50, 40, 130, 18); ctx.fill();
    }, { blur: 10, y: 5 });
    ctx.fillStyle = '#2b2b3a'; ctx.beginPath(); ctx.arc(cx - 13, cy - 154, 3.5, 0, TAU); ctx.arc(cx + 13, cy - 154, 3.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2b2b3a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy - 144, 12, 0.2, Math.PI - 0.2); ctx.stroke();
    // 세포 속 확대
    D.glow(cx, cy - 20, 62, NS.set.body === 'out' ? '#ff9f43' : '#ffd9a8', 0.5 + (NS.set.body === 'out' ? 0.25 * Math.sin(t * 4) : 0));
    ctx.beginPath(); ctx.arc(cx, cy - 20, 46, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 3; ctx.stroke();
    D.text(cx, cy - 26, '세포', { size: fs(14), weight: 800, color: '#a15c00' });
    D.text(cx, cy - 8, '속 미토콘드리아', { size: fs(10.5), weight: 700, color: MUTED });
    if (NS.set.body === 'out') for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + t; ctx.strokeStyle = 'rgba(242,107,58,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 80, cy - 20 + Math.sin(a) * 80, 10, a + 1, a + 3); ctx.stroke(); }
    if (NS.set.body === 'out') pill(cx, cy + 204, '에너지가 나와 체온이 유지돼요', { bg: '#fff', color: '#b85a00', border: '#f26b3a', size: fs(13) });
    D.text(VW / 2, VH - 50, '포도당 + 산소 → 이산화 탄소 + 물 + 에너지', { size: fs(14), weight: 800, color: '#7a3b00' });
  }
  function drawWaterCycle(t) {
    D.sky(0, 0, VW, VH, '#a9d8ff', '#e6f4ff');
    // 해
    D.glow(VW - 90, 90, 100, '#ffd34d', 0.55); D.sphere(VW - 90, 90, 36, '#ffc933', { gloss: false, shadow: false });
    // 바다
    const sy = PHONE ? 560 : 480;
    const g = ctx.createLinearGradient(0, sy, 0, VH); g.addColorStop(0, '#4aa3e8'); g.addColorStop(1, '#2d6fc0');
    ctx.fillStyle = g; ctx.fillRect(0, sy, VW, VH - sy);
    D.wave(0, VW, sy, { amp: 6, wavelength: 90, phase: t * 2, color: 'rgba(255,255,255,.7)', width: 3 });
    // 구름
    const cx = PHONE ? 330 : 520, cy = PHONE ? 130 : 110;
    D.shadow(() => { ctx.fillStyle = '#fff'; [[-50, 10, 34], [-14, -8, 42], [30, 2, 38], [64, 14, 28], [10, 22, 36]].forEach((c) => { ctx.beginPath(); ctx.arc(cx + c[0], cy + c[1], c[2], 0, TAU); ctx.fill(); }); }, { blur: 8, y: 3, color: 'rgba(60,90,130,.25)' });
    // 수증기 입자 (바다에서 구름으로)
    if (NS.vap.length < 14 && Math.random() < 0.15) NS.vap.push({ x: rnd(40, VW * 0.55), y: sy - 4, a: 0, ph: rnd(0, 6) });
    for (let i = NS.vap.length - 1; i >= 0; i--) {
      const p = NS.vap[i]; p.y -= 0.9 + (sy - p.y) * 0.002; p.x += Math.sin(t * 2 + p.ph) * 0.3 + (cx - p.x) * 0.0015;
      p.a = Math.min(1, p.a + 0.03);
      if (p.y < cy + 40) { NS.vap.splice(i, 1); continue; }
      ctx.fillStyle = 'rgba(255,255,255,' + 0.55 * p.a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, TAU); ctx.fill();
    }
    if (NS.set.evap === 'in') pill(200, sy + 44, '바닷물이 열을 흡수하며 증발해요', { bg: '#fff', color: '#2f5fb8', border: COLD, size: fs(13) });
    if (NS.set.cond === 'out') pill(cx - (PHONE ? 100 : 0), cy + 64, '수증기가 응결하며 열을 내보내요', { bg: '#fff', color: '#b85a00', border: HOT, size: fs(13) });
    D.text(VW / 2, VH - 34, '증발할 때 열을 흡수하고, 응결할 때 열을 방출해요', { size: fs(13.5), weight: 800, color: '#fff', stroke: 'rgba(20,50,100,.5)', strokeWidth: 4 });
  }
  function drawHotspots(t) {
    HKEYS.forEach((k) => {
      const h = HS[k]; if (h.view !== NS.view) return;
      const q = h.pos(), st = NS.set[k], mk = NS.mark[k];
      if (NS.shake[k] > 0) NS.shake[k] = Math.max(0, NS.shake[k] - 0.03);
      const off = NS.shake[k] > 0 ? Math.sin(NS.shake[k] * 30) * 5 * NS.shake[k] : 0;
      ctx.save(); ctx.translate(off, 0);
      const v = h.v, L = 86;
      if (st) {
        const col = st === 'in' ? COLD : HOT, wob = Math.sin(t * 5) * 4;
        const ox = q.x + v.x * 44, oy = q.y + v.y * 44, fx2 = q.x + v.x * (44 + L + wob), fy2 = q.y + v.y * (44 + L + wob);
        if (st === 'in') D.arrow(fx2, fy2, ox, oy, { color: col, width: 6, head: 16 }); else D.arrow(ox, oy, fx2, fy2, { color: col, width: 6, head: 16 });
        pill(q.x + v.x * (44 + L + wob) + v.x * 62, q.y + v.y * (44 + L + wob) + v.y * 22, st === 'in' ? '들어옴 (흡수)' : '나감 (방출)', { bg: col, color: '#fff', size: fs(13) });
      }
      D.sphere(q.x, q.y, 25, mk === 'bad' ? '#e2464b' : st ? (st === 'in' ? COLD : HOT) : '#8b5cf6', { shadow: true });
      D.text(q.x, q.y + (st ? 5 : 8), st ? (st === 'in' ? '흡수' : '방출') : '?', { size: st ? 13 : 22, weight: 800, color: '#fff' });
      if (!st && !RM) D.ring(q.x, q.y, 32, t, { color: '#8b5cf6' });
      pill(q.x, q.y + 48, h.name, { bg: '#fff', color: INK, border: '#c9b6f5', size: fs(13) });
      ctx.restore();
    });
  }
  function drawNature(t) {
    if (NS.view === 'leaf') drawLeaf(t); else if (NS.view === 'body') drawBody(t); else drawWaterCycle(t);
    drawHotspots(t);
  }


  /* =========================================================
     ④ 조리 장치 설계 (산화 칼슘 + 물)  — 크기 감각용 단순 모델
     ========================================================= */
  const KJ56 = 65;                                   // 산화 칼슘 56 g(1 mol)당 방출하는 열 (약, kJ)
  const G_WATER = 200, C_W = 4.18;                   // 음식 컵의 물 200 g, 물의 비열 4.18 J/g·°C
  const T_START = 20, T_BOIL = 100, GOAL = 90;
  const AMTS = [28, 56, 84, 112, 140];
  const ETA = { no: 0.4, yes: 0.7 };                 // 열 이용률: 단열재 없음 약 40 %, 있음 약 70 %
  const qKJ = (g) => KJ56 * g / 56;
  const usedKJ = (g, ins) => qKJ(g) * ETA[ins];
  const dTraw = (g, ins) => usedKJ(g, ins) * 1000 / (G_WATER * C_W);
  const finalRaw = (g, ins) => Math.min(T_BOIL, T_START + dTraw(g, ins));
  const finalShown = (g, ins) => Math.round(finalRaw(g, ins));
  const insName = (i) => (i === 'yes' ? '단열재 있음' : '단열재 없음');
  const CRUN = 8;
  const CK = { amt: 84, ins: 'no', running: false, t: 0, runs: [], T: T_START, base2: 0, fin: 0 };
  const cookOK = () => CK.runs.some((r) => r.T >= GOAL);
  const cookCompare = () => CK.runs.slice(CK.base2).some((a) => CK.runs.slice(CK.base2).some((b) => b.amt === a.amt && a.ins === 'no' && b.ins === 'yes'));
  function syncCook() {
    $('#amtBtns').innerHTML = AMTS.map((g) => '<button type="button" class="opt' + (CK.amt === g ? ' on' : '') + '" data-a="' + g + '"' + (CK.running ? ' disabled' : '') + '>' + g + ' g</button>').join('');
    $$('#amtBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); CK.amt = +b.dataset.a; resetCookRun(); syncCook(); }));
    $$('#insSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.i === CK.ins); b.disabled = CK.running; });
    $('#cookRun').disabled = CK.running;
    $('#cookRun').textContent = CK.running ? '⏳ 가열 중…' : '▶ 물 붓고 가열하기';
    $('#cookNote').textContent = '산화 칼슘 ' + CK.amt + ' g, ' + insName(CK.ins) + '. 목표: 물 ' + G_WATER + ' g를 ' + GOAL + ' °C 이상으로!';
  }
  function resetCookRun() { CK.running = false; CK.t = 0; CK.T = T_START; }
  function runCook() {
    if (CK.running) return;
    resetCookRun(); CK.running = true; Sound.click(); syncCook();
  }
  function stepCook(dt) {
    if (CK.running) {
      CK.t += dt;
      const u = clamp(CK.t / CRUN, 0, 1), fr = finalRaw(CK.amt, CK.ins);
      CK.T = T_START + (fr - T_START) * (1 - Math.pow(1 - u, 3));
      const hot = u > 0.05;
      if (hot && Math.random() < dt * 40) fx.emit({ x: CKL.pile.x + rnd(-50, 50), y: CKL.pile.y - 6, vx: rnd(-8, 8), vy: -rnd(40, 80), life: 1.0, size: rnd(2.5, 4.5), color: '#ffffff', shape: 'bubble', fade: false });
      if (CK.T > 55 && Math.random() < dt * 14) fx.emit({ x: CKL.cup.x + rnd(-CKL.cup.w * 0.3, CKL.cup.w * 0.3), y: CKL.cup.y - 8, vx: rnd(-6, 6), vy: -rnd(26, 50), life: 1.5, size: rnd(7, 12), grow: 10, color: 'rgba(245,248,252,.9)', shape: 'smoke', alpha: 0.7 });
      if (CK.t >= CRUN) {
        CK.running = false; CK.T = fr;
        const r = { amt: CK.amt, ins: CK.ins, T: finalShown(CK.amt, CK.ins) };
        CK.runs.push(r); CK.fin = 1;
        r.T >= GOAL ? Sound.success() : Sound.fail();
        showHint(CK.amt + ' g · ' + insName(CK.ins) + ' → ' + r.T + ' °C ' + (r.T >= GOAL ? '(목표 달성!)' : '(목표에 못 미쳐요)'), 4200);
        syncCook();
      }
    }
  }
  const CKL = PHONE
    ? { box: { x: 70, y: 108, w: 270, h: 200 }, pile: { x: 205, y: 276 }, cup: { x: 205, y: 190, w: 150, h: 100 }, g: { x: 60, y: 412, w: 470, h: 130 }, f: { x: 12, y: 612, w: 536, h: 140 } }
    : { box: { x: 70, y: 150, w: 300, h: 250 }, pile: { x: 220, y: 362 }, cup: { x: 220, y: 252, w: 170, h: 130 }, g: { x: 510, y: 90, w: 250, h: 230 }, f: { x: 14, y: 476, w: 772, h: 118 } };
  function drawCook(t) {
    const L = CKL, b = L.box, ins = CK.ins === 'yes';
    D.text(PHONE ? VW / 2 : 220, PHONE ? 26 : 38, '산화 칼슘 + 물 → 열이 나와 음식을 데워요', { size: fs(14), weight: 800, color: '#4c1d95' });
    // 바깥 상자 (단열재)
    const th = ins ? 22 : 5;
    D.shadow(() => { D.roundRect(b.x - th, b.y - th, b.w + th * 2, b.h + th * 2, 18); ctx.fillStyle = ins ? '#f7e6b0' : '#cfd6e2'; ctx.fill(); }, { blur: 10, y: 5 });
    if (ins) { ctx.save(); D.roundRect(b.x - th, b.y - th, b.w + th * 2, b.h + th * 2, 18); ctx.clip(); ctx.fillStyle = 'rgba(190,150,60,.35)'; for (let i = 0; i < 90; i++) { ctx.beginPath(); ctx.arc(b.x - th + ((i * 47) % (b.w + th * 2)), b.y - th + ((i * 31) % (b.h + th * 2)), 2.2, 0, TAU); ctx.fill(); } ctx.restore(); D.text(b.x + 34, b.y - th - 6, '단열재', { size: fs(13), weight: 800, color: '#8a6a10' }); }
    D.roundRect(b.x, b.y, b.w, b.h, 12); ctx.fillStyle = '#fbf6ee'; ctx.fill();
    // 산화 칼슘 가루 더미 + 물 주머니
    const pileH = 14 + CK.amt / 140 * 36;
    ctx.beginPath(); ctx.moveTo(L.pile.x - 80, L.pile.y + 28); ctx.quadraticCurveTo(L.pile.x, L.pile.y - pileH + 10, L.pile.x + 80, L.pile.y + 28); ctx.closePath();
    const hotK = clamp((CK.T - T_START) / 80, 0, 1);
    ctx.fillStyle = mixc('#f1f1ec', '#ffd9b0', hotK); ctx.fill(); ctx.strokeStyle = '#d9d6c8'; ctx.lineWidth = 2; ctx.stroke();
    D.text(L.pile.x, L.pile.y + 48, '산화 칼슘 ' + CK.amt + ' g', { size: fs(13), weight: 800, color: '#6b5a2a' });
    // 음식 컵
    const c = L.cup;
    D.beaker(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, { level: 0.72, liquid: mixc('#bfe0ff', '#ffd1a0', hotK * 0.8), t, wave: 1 + hotK * 2, glass: '#8fa3bd' });
    ctx.strokeStyle = '#f0c75e'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(c.x - c.w * 0.35 + i * 8, c.y + 6); ctx.bezierCurveTo(c.x - 20 + i * 14, c.y - 6 + (i % 2) * 14, c.x + 10 + i * 6, c.y + 22, c.x + c.w * 0.3 - i * 6, c.y + 10 + (i % 3) * 5); ctx.stroke(); }
    D.text(c.x, c.y - c.h / 2 - 12, '음식 컵 (물 ' + G_WATER + ' g)', { size: fs(12.5), weight: 800, color: MUTED });
    // 물 주머니와 관
    const wx = b.x + b.w + (ins ? 34 : 24) + 6, wy = b.y + 30;
    D.shadow(() => { D.roundRect(wx - 30, wy - 20, 60, 56, 14); ctx.fillStyle = '#bfe0ff'; ctx.fill(); }, { blur: 6, y: 3 });
    D.text(wx, wy + 14, '물', { size: fs(14), weight: 800, color: '#2f5fb8' });
    ctx.strokeStyle = 'rgba(120,170,230,.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(wx, wy + 36); ctx.lineTo(wx, b.y + b.h - 40); ctx.lineTo(L.pile.x + 70, b.y + b.h - 40); ctx.lineTo(L.pile.x + 50, L.pile.y + 10); ctx.stroke();
    // 열 화살표: 컵으로 들어가는 열(주황, 굵기 = 이용한 열), 밖으로 새는 열(빨강 점선)
    if (CK.running || CK.t >= CRUN) {
      const a = clamp(CK.t / (CRUN * 0.4), 0, 1);
      const wUse = 3 + 6 * ETA[CK.ins], nLeak = ins ? 2 : 4;
      [-1, 0, 1].forEach((i) => D.arrow(L.pile.x + i * 34, L.pile.y - 20, L.pile.x + i * 34, c.y + c.h / 2 + 4, { color: HOT, width: wUse, head: 12, alpha: 0.9 * a }));
      for (let i = 0; i < nLeak; i++) { const y = b.y + 30 + i * (b.h - 60) / Math.max(1, nLeak - 1); D.arrow(b.x - 6, y, b.x - th - 40 + (ins ? 16 : 0), y, { color: '#e2464b', width: ins ? 3 : 5, head: 10, alpha: 0.8 * a, dash: [7, 5] }); }
      pill(b.x + b.w / 2, b.y + b.h + th + 16, ins ? '새는 열이 적어요 (빨간 점선 화살표)' : '새는 열이 많아요 (빨간 점선 화살표)', { bg: '#fff', color: '#b3262b', border: '#e2464b', size: fs(12.5) });
    }
    // 온도 표시
    const tshow = Math.round(CK.T);
    D.roundRect(c.x - 44, c.y - c.h / 2 - 54, 88, 30, 8); ctx.fillStyle = '#16212f'; ctx.fill();
    D.text(c.x, c.y - c.h / 2 - 33, tshow + ' °C', { size: fs(16), weight: 800, color: tshow >= GOAL ? '#6bffb0' : '#ffb86b' });
    // 그래프
    const g = L.g;
    panel(g.x - 44, g.y - 54, g.w + 62, g.h + 100, { r: 14, stroke: '#d9cffa' });
    D.text(g.x + g.w / 2 - 10, g.y - 30, '🌡️ 물 ' + G_WATER + ' g의 온도 (°C)', { size: fs(14), weight: 800, color: '#4c1d95' });
    const gy = (T) => g.y + g.h - g.h * (T / 120), gx = (s) => g.x + g.w * (s / CRUN);
    for (let T = 0; T <= 120; T += 20) { ctx.strokeStyle = T === 0 ? '#8a95a8' : '#e3e8f1'; ctx.lineWidth = T === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(g.x, gy(T)); ctx.lineTo(g.x + g.w, gy(T)); ctx.stroke(); D.text(g.x - 8, gy(T) + 4, String(T), { size: fs(11.5), weight: 700, color: MUTED, align: 'right' }); }
    for (let s = 0; s <= CRUN; s += 2) D.text(gx(s), g.y + g.h + fs(16), String(s), { size: fs(11.5), weight: 700, color: MUTED });
    D.text(g.x + g.w / 2, g.y + g.h + fs(34), '시간 (초, 줄여서 보여 줘요)', { size: fs(12), weight: 800, color: MUTED });
    D.dashedLine(g.x, gy(GOAL), g.x + g.w, gy(GOAL), { color: '#14a058', width: 2 });
    D.text(g.x + g.w - 4, gy(GOAL) - 5, '목표 ' + GOAL + ' °C', { size: fs(11.5), weight: 800, color: '#0b6b39', align: 'right' });
    D.dashedLine(g.x, gy(T_BOIL), g.x + g.w, gy(T_BOIL), { color: '#e2464b', width: 1.5 });
    D.text(g.x + 4, gy(T_BOIL) - 5, '끓는점 ' + T_BOIL + ' °C', { size: fs(11.5), weight: 800, color: '#b3262b', align: 'left' });
    if (CK.runs.length) { const lr = CK.runs[CK.runs.length - 1]; ctx.strokeStyle = 'rgba(100,100,120,.35)'; ctx.lineWidth = 2; ctx.beginPath(); const fr = finalRaw(lr.amt, lr.ins); for (let i = 0; i <= 40; i++) { const s = (i / 40) * CRUN, u = s / CRUN, T = T_START + (fr - T_START) * (1 - Math.pow(1 - u, 3)); i ? ctx.lineTo(gx(s), gy(T)) : ctx.moveTo(gx(s), gy(T)); } ctx.stroke(); }
    if (CK.running || CK.t > 0) { ctx.strokeStyle = HOT; ctx.lineWidth = 3.4; ctx.beginPath(); const fr = finalRaw(CK.amt, CK.ins), n = Math.max(2, Math.floor(CK.t / CRUN * 40)); for (let i = 0; i <= n; i++) { const s = Math.min(CK.t, CRUN) * i / n, u = s / CRUN, T = T_START + (fr - T_START) * (1 - Math.pow(1 - u, 3)); i ? ctx.lineTo(gx(s), gy(T)) : ctx.moveTo(gx(s), gy(T)); } ctx.stroke(); D.sphere(gx(Math.min(CK.t, CRUN)), gy(CK.T), 6, HOT, { shadow: true }); }
    // 계산 식 (설명용 모델)
    const f = L.f;
    panel(f.x, f.y, f.w, f.h, { r: 12, stroke: '#d9cffa' });
    const q = qKJ(CK.amt), u = usedKJ(CK.amt, CK.ins), dT = dTraw(CK.amt, CK.ins), raw = T_START + dT;
    const lh = PHONE ? fs(19) : 21;
    D.text(f.x + 14, f.y + fs(20), '① 방출한 열 ≈ ' + KJ56 + ' kJ × (' + CK.amt + ' ÷ 56) = ' + q.toFixed(1) + ' kJ', { size: fs(12.5), weight: 800, color: INK, align: 'left' });
    D.text(f.x + 14, f.y + fs(20) + lh, '② 이용한 열 = ' + q.toFixed(1) + ' × ' + Math.round(ETA[CK.ins] * 100) + ' % = ' + u.toFixed(1) + ' kJ', { size: fs(12.5), weight: 800, color: INK, align: 'left' });
    D.text(f.x + 14, f.y + fs(20) + lh * 2, '③ 온도 변화 = ' + u.toFixed(1) + ' kJ ÷ (' + G_WATER + ' g × ' + C_W + ' J/g·°C) = ' + dT.toFixed(1) + ' °C', { size: fs(12.5), weight: 800, color: INK, align: 'left' });
    const ft = finalShown(CK.amt, CK.ins);
    D.text(f.x + 14, f.y + fs(20) + lh * 3, '④ ' + T_START + ' + ' + dT.toFixed(1) + ' = ' + raw.toFixed(1) + ' → ' + (raw > T_BOIL ? '끓는점 ' + T_BOIL + ' °C에서 멈춰요' : '약 ' + ft + ' °C') + (ft >= GOAL ? '  ✔ 목표 달성' : '  ✘ ' + GOAL + ' °C에 못 미쳐요'), { size: fs(12.5), weight: 800, color: ft >= GOAL ? '#0b6b39' : '#b3262b', align: 'left' });
    if (!PHONE) D.text(f.x + f.w - 12, f.y + f.h - 8, '※ 이용률 단열재 없음 약 ' + Math.round(ETA.no * 100) + ' %, 있음 약 ' + Math.round(ETA.yes * 100) + ' %는 크기 감각용 예시 값이에요', { size: 11, weight: 700, color: MUTED, align: 'right' });
    // 실험 기록
    if (CK.runs.length) {
      const lx = PHONE ? 60 : g.x - 30, ly = PHONE ? 600 : g.y + g.h + 50;
      if (!PHONE) {
        D.text(lx, ly, '📋 실험 기록', { size: 12.5, weight: 800, color: '#4c1d95', align: 'left' });
        CK.runs.slice(-4).forEach((r, i) => D.text(lx, ly + 18 + i * 16, r.amt + ' g · ' + (r.ins === 'yes' ? '단열 ○' : '단열 ×') + ' → ' + r.T + ' °C ' + (r.T >= GOAL ? '✔' : ''), { size: 12, weight: 700, color: r.T >= GOAL ? '#0b6b39' : MUTED, align: 'left' }));
      }
    }
    // 안전 아이콘
    pill(PHONE ? 420 : b.x + 60, PHONE ? 64 : 74, '🥽 보안경 · 교사 지도 아래에서', { bg: '#fff4dc', color: '#7a4a00', border: '#f3d38a', size: fs(12.5) });
  }

  /* =========================================================
     ④ 토의 카드 (생활 속 이용 사례)
     ========================================================= */
  const TALK = [
    { e: '🍱', n: '발열 도시락', d: 'out', k: '화학 변화', back: '포장 속 산화 칼슘에 물이 닿으면 열이 나와 음식이 데워져요.' },
    { e: '🧊', n: '냉각 팩', d: 'in', k: '물리 변화(용해)', back: '질산 암모늄이 물에 녹을 때 열을 흡수해 차가워져요.' },
    { e: '🧤', n: '손난로', d: 'out', k: '화학 변화', back: '철 가루가 산소와 반응(산화)하며 열을 내서 따뜻해져요.' },
  ];
  const TK = { flip: [0, 0, 0], seen: [false, false, false] };
  const tkRect = (i) => (PHONE ? { x: 40, y: 50 + i * 224, w: 480, h: 206 } : { x: 36 + i * 256, y: 110, w: 236, h: 330 });
  function drawTalk(t) {
    D.text(VW / 2, PHONE ? 30 : 56, '카드를 눌러 뒤집어 보고, 친구와 이야기해 봐요', { size: fs(15), weight: 800, color: '#4c1d95' });
    TALK.forEach((c, i) => {
      const r = tkRect(i), f = TK.flip[i], sx = Math.abs(Math.cos(f * Math.PI));
      ctx.save(); ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(Math.max(0.02, sx), 1);
      const back = f > 0.5, col = c.d === 'out' ? HOT : COLD;
      D.shadow(() => { D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 18); ctx.fillStyle = back ? '#fff' : '#f1ebff'; ctx.fill(); }, { blur: 12, y: 6 });
      D.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 18); ctx.strokeStyle = back ? col : '#c9b6f5'; ctx.lineWidth = 3; ctx.stroke();
      if (!back) {
        ctx.font = D.font(fs(60), 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.e, 0, PHONE ? -10 : -30); ctx.textBaseline = 'alphabetic';
        D.text(0, PHONE ? 50 : 40, c.n, { size: fs(20), weight: 800, color: INK });
        D.text(0, PHONE ? 78 : 78, '눌러서 뒤집기 ↻', { size: fs(12.5), weight: 700, color: '#8b5cf6' });
      } else {
        D.text(0, -r.h / 2 + fs(34), c.e + ' ' + c.n, { size: fs(18), weight: 800, color: INK });
        wrapText(-r.w / 2 + 20, -r.h / 2 + fs(70), c.back, r.w - 40, fs(14), fs(20), { weight: 700, color: INK, align: 'left' });
        pill(0, r.h / 2 - fs(60), c.d === 'out' ? '에너지 방출 (주위 온도 ↑)' : '에너지 흡수 (주위 온도 ↓)', { bg: col, color: '#fff', size: fs(13) });
        D.text(0, r.h / 2 - fs(26), c.k, { size: fs(13), weight: 800, color: MUTED });
      }
      ctx.restore();
    });
    if (!PHONE) D.text(VW / 2, 500, '💬 이야기해 봐요: 에너지를 흡수하거나 방출하는 또 다른 생활 속 사례는 무엇이 있을까요?', { size: 14, weight: 800, color: '#7c3aed' });
  }
  function talkClick(p) {
    TALK.forEach((c, i) => {
      const r = tkRect(i);
      if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
        const to = TK.flip[i] < 0.5 ? 1 : 0; TK.seen[i] = true; Sound.click();
        tween(TK.flip, { [i]: to }, { duration: RM ? 0.01 : 0.5, ease: 'inOutQuad' });
      }
    });
  }


  /* =========================================================
     읽기판 · 입력 · 그리기 · 반복
     ========================================================= */
  function updateReadouts() {
    const sc = S.scene;
    if (sc === 'bench') {
      const b = BENCH[BN.key];
      setRO(1, '실험대', b.name);
      setRO(2, b.ylab, BN.Tshow.toFixed(1) + '<small>°C</small>');
      setRO(3, '측정한 실험대', benchDoneCount() + ' / ' + BKEYS.length);
    } else if (sc === 'sort') {
      setRO(1, '분류한 카드', SB.placed().length + ' / ' + CARDS.length);
      setRO(2, '방출 · 흡수', SB.inBin('out').length + ' · ' + SB.inBin('in').length + '장');
      setRO(3, '맞게 놓은 카드', SB.items.filter((it) => it.bin === CARDS[it.idx].d).length + ' / ' + CARDS.length);
    } else if (sc === 'nature') {
      setRO(1, '표시한 곳', natSetCount() + ' / ' + HKEYS.length);
      setRO(2, '맞게 표시한 곳', natCorrect() + ' / ' + HKEYS.length);
      setRO(3, '장면', { leaf: '식물의 잎', body: '우리 몸', water: '바다와 하늘' }[NS.view]);
    } else if (sc === 'cook') {
      setRO(1, '산화 칼슘 · 단열재', CK.amt + ' g · ' + (CK.ins === 'yes' ? '있음' : '없음'));
      setRO(2, '물 ' + G_WATER + ' g의 온도', Math.round(CK.T) + '<small>°C</small>');
      setRO(3, '목표 ' + GOAL + ' °C 달성', cookOK() ? '달성 ✅' : '아직');
    } else {
      setRO(1, '펼쳐 본 카드', TK.seen.filter(Boolean).length + ' / ' + TALK.length);
      setRO(2, '방출 사례', '발열 도시락 · 손난로');
      setRO(3, '흡수 사례', '냉각 팩');
    }
  }
  SciSim.pointer(view, {
    down(p) { if (S.scene === 'sort') return SB.down(p); return false; },
    move(p) { if (S.scene === 'sort') SB.move(p); },
    up(p) { if (S.scene === 'sort') SB.up(p); },
    hover(p) {
      if (S.scene === 'sort') return SB.hit(p) ? 'grab' : null;
      if (S.scene === 'nature') return HKEYS.some((k) => HS[k].view === NS.view && Math.hypot(p.x - HS[k].pos().x, p.y - HS[k].pos().y) < 36) ? 'pointer' : null;
      if (S.scene === 'talk') return TALK.some((c, i) => { const r = tkRect(i); return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }) ? 'pointer' : null;
      return null;
    },
  });
  view.canvas.addEventListener('click', (e) => {
    const p = view.toLocal(e);
    if (S.scene === 'nature') natClick(p); else if (S.scene === 'talk') talkClick(p);
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t0 = e.touches[0]; if (!t0) return;
      if (S.scene === 'sort' && SB.hit(view.toLocal(t0))) e.preventDefault();
    }, { passive: false });
  }
  $$('#benchBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); selectBench(b.dataset.b); }));
  $('#benchRun').addEventListener('click', runBench);
  $('#kindBtn').addEventListener('click', () => { Sound.click(); setKind(!SO.kind); });
  $$('#natBtns .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); setNatView(b.dataset.n); }));
  $$('#insSeg button').forEach((b) => b.addEventListener('click', () => { if (CK.running) return; Sound.click(); CK.ins = b.dataset.i; resetCookRun(); syncCook(); }));
  $('#cookRun').addEventListener('click', runCook);
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 'bench') { if (BN.running) { BN.running = false; BN.pts[BN.key].length = 0; } BN.done[BN.key] = false; BN.t = 0; BN.Tshow = BENCH[BN.key].T0; BN.pts[BN.key].length = 0; syncBench(); }
    else if (S.scene === 'sort') SB.reset();
    else if (S.scene === 'nature') resetNature();
    else if (S.scene === 'cook') { resetCookRun(); CK.runs.length = 0; CK.base2 = 0; syncCook(); }
    else TK.flip.forEach((_, i) => { TK.flip[i] = 0; });
  });

  function draw(t) {
    view.clear(BG);
    bgFill('#f7f4fe', '#ece7f9');
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    if (S.scene === 'bench') drawBench(t);
    else if (S.scene === 'sort') SB.draw(t);
    else if (S.scene === 'nature') drawNature(t);
    else if (S.scene === 'cook') drawCook(t);
    else drawTalk(t);
    fx.draw(ctx);
    ctx.restore();
  }

  /* ---------- 미션 ---------- */
  const MIX = 'class="mini"';
  const levels = [
    /* ---------- 1단계 · 관찰 ---------- */
    {
      title: '열이 나가고 들어와요', short: '열의 출입', icon: '🌡️', phase: '관찰',
      features: ['bench'],
      intro: '<p class="si-q">❓ 탐구 질문: 손난로, 냉각 팩, 얼음과 땀, 광합성에는 어떤 공통점이 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 손난로·발열 도시락 같은 <b>발열 반응</b>과 냉각 팩 같은 <b>흡열 반응</b>을 배웠어요. 이번에는 화학 반응뿐 아니라 <b>물에 녹을 때와 상태가 변할 때</b>도 열이 출입하는지 살펴봐요.</div>' +
        '<p>실험대 4곳에서 온도를 재고, 에너지가 주위로 <b>나가는지(방출)</b> 주위에서 <b>들어오는지(흡수)</b> 화살표로 확인해요.</p>',
      setup() { setScene('bench'); selectBench('naoh'); showHint('실험대를 고르고 ▶ 실험 시작을 눌러요', 4500); },
      recap: '에너지를 방출하는 변화는 주위의 온도를 높이고, 에너지를 흡수하는 변화는 주위의 온도를 낮춰요. 용해나 상태 변화 같은 물리 변화에서도 에너지가 출입해요.',
      summary: '<table ' + MIX + '><tr><th>실험</th><th>온도 변화</th><th>에너지</th></tr>' +
        '<tr><td>NaOH를 물에 녹임</td><td>' + BENCH.naoh.T0 + ' → ' + BENCH.naoh.T1 + ' °C</td><td>방출</td></tr>' +
        '<tr><td>질산 암모늄을 물에 녹임</td><td>' + BENCH.nh4.T0 + ' → ' + BENCH.nh4.T1 + ' °C</td><td>흡수</td></tr>' +
        '<tr><td>얼음이 녹음 (컵 겉면)</td><td>' + BENCH.ice.T0 + ' → ' + BENCH.ice.T1 + ' °C</td><td>흡수</td></tr>' +
        '<tr><td>수증기가 응결 (찬 컵)</td><td>' + BENCH.steam.T0 + ' → ' + BENCH.steam.T1 + ' °C</td><td>방출</td></tr></table>' +
        '<p class="note">값은 설명을 위한 예시예요. 열의 출입은 화학 반응뿐 아니라 용해·상태 변화에도 있어요.</p>',
      missions: [
        {
          title: '4개 실험대에서 온도 재기',
          goal: '실험대 <b>4곳</b>에서 온도 변화를 끝까지 측정해요.',
          hint: '실험대를 고르고 ▶ 실험 시작을 눌러요. 줄여서 보여 주는 ' + DUR + '초 동안 온도와 그래프가 변해요.',
          setup() { setScene('bench'); },
          check: () => benchDoneCount() >= BKEYS.length,
          hold: 0.5,
          status: () => BKEYS.map((k) => mark(BN.done[k]) + ' ' + BENCH[k].btn.slice(2)).join(' · '),
          explain: 'NaOH가 물에 녹을 때와 수증기가 응결할 때는 <b>온도가 올라가요(에너지 방출)</b>. 질산 암모늄이 녹을 때와 얼음이 녹을 때는 <b>온도가 내려가요(에너지 흡수)</b>. 주위의 온도가 올라가면 방출, 내려가면 흡수예요.',
        },
        {
          type: 'quiz', title: '물리 변화에서도 열이 출입할까?',
          goal: '질산 암모늄이 물에 녹을 때와 얼음이 녹을 때도 온도가 변했어요. 이런 용해와 상태 변화는 화학 반응이 아닌 <b>물리 변화</b>예요. 알맞은 설명은?',
          setup() { setScene('bench'); },
          choices: ['물리 변화에서도 에너지를 흡수하거나 방출하는 경우가 있어요', '열이 출입하는 것은 화학 반응뿐이에요', '물리 변화에서는 열의 출입이 전혀 없어요', '물리 변화는 모두 에너지를 방출해요'],
          answer: 0,
          feedback: ['', '실험대에서 본 용해와 얼음의 융해는 화학 반응이 아니지만 온도가 변했어요.', '실험 결과를 떠올려 봐요. 질산 암모늄이 녹을 때 온도가 내려갔지요.', '얼음이 녹을 때는 에너지를 흡수했어요. 물리 변화에도 방출과 흡수가 모두 있어요.'],
          explain: '용해와 상태 변화 같은 <b>물리 변화</b>에서도 에너지가 출입해요. 화학 변화만 열이 출입하는 것은 아니에요.',
        },
        {
          type: 'quiz', title: '얼음 컵의 겉면이 차가운 까닭',
          goal: '얼음이 든 컵의 겉면 온도가 내려가고 물방울이 맺혔어요. 컵 겉면이 차가워진 까닭은?',
          setup() { setScene('bench'); selectBench('ice'); },
          choices: ['얼음이 녹으면서 주위(컵과 공기)의 열을 흡수하기 때문이에요', '얼음이 열을 방출하기 때문이에요', '컵 속의 물이 끓기 때문이에요', '얼음이 녹을 때는 열의 출입이 없기 때문이에요'],
          answer: 0,
          feedback: ['', '열을 방출하면 주위가 따뜻해져요. 컵 겉면이 차가워졌으니 얼음이 열을 흡수한 거예요.', '컵 속 물은 끓지 않아요. 얼음이 주위의 열을 빼앗아 가요.', '얼음이 녹으려면 열이 필요해요. 그래서 컵 겉면의 온도가 내려가요.'],
          explain: '얼음이 녹을 때 <b>주위의 열을 흡수</b>하므로 컵 겉면이 차가워져요. 겉면의 물방울은 공기 중의 수증기가 차가운 컵에 닿아 응결한 거예요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '방출과 흡수로 나눠요', short: '사례 분류', icon: '🗂️', phase: '탐구',
      features: ['sort'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 용해와 상태 변화에서도 열이 출입했어요. 중학교에서 배운 연소·광합성 같은 화학 변화도 함께 모아 볼까요?</div>' +
        '<p>변화 카드 14장을 <b>에너지 방출</b>과 <b>에너지 흡수</b>로 나눠요. 다 나눈 뒤 <b>물리·화학 변화 표시</b>를 켜서 비교해 봐요.</p>',
      setup() { setScene('sort'); showHint('카드를 끌어 방출 · 흡수 상자에 넣어요', 4500); },
      recap: '연소·중화·세포 호흡·응결·응고는 에너지를 방출하고, 광합성·열분해·용해(질산 암모늄)·융해·증발·승화·전기 분해는 에너지를 흡수해요. 방출과 흡수는 물리 변화와 화학 변화 모두에 있어요.',
      summary: '<table ' + MIX + '><tr><th></th><th>에너지 방출</th><th>에너지 흡수</th></tr>' +
        '<tr><td>화학 변화</td><td>연소, 중화, 철의 산화, 산화 칼슘 + 물, 세포 호흡</td><td>광합성, 탄산수소 나트륨 열분해, 물의 전기 분해</td></tr>' +
        '<tr><td>물리 변화</td><td>수증기의 응결, 물의 응고</td><td>질산 암모늄의 용해, 얼음의 융해, 땀의 증발, 드라이아이스의 승화</td></tr></table>',
      missions: [
        {
          title: '14장 분류하기', manual: true,
          goal: '변화 카드 <b>14장</b>을 <b>에너지 방출</b> 상자와 <b>에너지 흡수</b> 상자로 나눠요.',
          hint: '주위가 따뜻해지면 방출, 차가워지면 흡수예요. 손난로·연소·응결은 방출, 얼음의 융해·땀의 증발은 흡수예요.',
          setup() { setScene('sort'); },
          check: () => sortCheck(),
          explain: '<b>방출</b>: 연소, 중화, 철의 산화, 산화 칼슘 + 물, 세포 호흡, 수증기의 응결, 물의 응고. <b>흡수</b>: 광합성, 탄산수소 나트륨 열분해, 질산 암모늄의 용해, 얼음의 융해, 땀의 증발, 드라이아이스의 승화, 물의 전기 분해예요.',
        },
        {
          type: 'quiz', title: '물리 변화인가 화학 변화인가',
          goal: '<b>🔍 물리·화학 변화 표시</b>를 켜서 카드를 살펴봐요. 열의 출입에 대한 설명으로 옳은 것은?',
          setup() { setScene('sort'); setKind(true); },
          choices: ['방출과 흡수 모두 물리 변화와 화학 변화에서 일어나요', '화학 변화에서만 열이 출입해요', '흡수는 물리 변화에서만, 방출은 화학 변화에서만 일어나요', '물리 변화에서는 에너지를 방출하는 경우가 없어요'],
          answer: 0,
          feedback: ['', '질산 암모늄의 용해나 얼음의 융해는 물리 변화인데 열이 출입해요.', '광합성(화학 변화)은 흡수이고, 수증기의 응결(물리 변화)은 방출이에요.', '수증기의 응결과 물의 응고는 물리 변화이면서 에너지를 방출해요.'],
          explain: '에너지의 <b>방출과 흡수는 물리 변화와 화학 변화 모두</b>에서 일어나요. 화학 반응에만 열이 출입하는 것은 아니에요.',
        },
      ],
    },
    /* ---------- 3단계 · 설명 ---------- */
    {
      title: '자연 속 에너지의 출입', short: '자연 속 에너지', icon: '🌿', phase: '설명',
      features: ['nature'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 광합성은 에너지를 흡수하고, 세포 호흡·연소는 방출한다고 나눴어요. 증발과 응결도 한 쌍이었지요.</div>' +
        '<p>식물의 잎, 우리 몸, 바다와 하늘에서 에너지가 <b>들어오는지(흡수)</b>, <b>나가는지(방출)</b>를 직접 표시해 봐요.</p>',
      setup() { setScene('nature'); setNatView('leaf'); showHint('? 표시를 눌러 에너지의 방향을 정해요', 4500); },
      recap: '광합성은 빛에너지를 포도당에 저장하는 에너지 흡수이고, 세포 호흡은 그 에너지를 꺼내 쓰는 방출이에요. 물이 증발할 때 흡수한 열은 수증기가 응결할 때 다시 방출돼요.',
      summary: '<ul><li><b>광합성</b>: 빛에너지가 포도당에 저장 (흡수)</li><li><b>세포 호흡</b>: 포도당의 에너지가 나와 체온 유지·활동에 쓰여요 (방출)</li>' +
        '<li><b>물의 순환</b>: 증발할 때 열 흡수, 응결할 때 열 방출 → 구름·태풍의 에너지원이 돼요.</li></ul>' +
        '<p class="note">땀이 증발하면 몸의 열을 흡수해서 시원해져요.</p>',
      missions: [
        {
          title: '에너지의 방향 표시하기', manual: true,
          goal: '세 장면에서 <b>? 표시 4곳</b>을 눌러 에너지가 <b>들어오는지(흡수)</b> <b>나가는지(방출)</b> 정해요.',
          hint: '장면을 바꿔 가며 눌러요. 광합성은 에너지를 저장하고, 세포 호흡은 에너지를 꺼내요. 증발은 열을 빼앗고, 응결은 열을 내놓아요.',
          setup() { setScene('nature'); },
          check: () => natCheck(),
          status: () => mark(NS.set.leaf === 'in') + ' 광합성 · ' + mark(NS.set.body === 'out') + ' 세포 호흡 · ' + mark(NS.set.evap === 'in') + ' 증발 · ' + mark(NS.set.cond === 'out') + ' 응결',
          explain: '<b>광합성</b>은 빛에너지를 포도당에 저장하는 <b>흡수</b>, <b>세포 호흡</b>은 저장된 에너지를 꺼내 쓰는 <b>방출</b>이에요. 바닷물이 <b>증발</b>할 때는 열을 흡수하고, 수증기가 <b>응결</b>할 때는 그 열을 다시 방출해요.',
        },
        {
          type: 'quiz', title: '땀이 나면 시원해지는 까닭',
          goal: '운동하고 땀이 나면 몸이 시원해져요. 그 까닭은?',
          setup() { setScene('nature'); setNatView('water'); },
          choices: ['땀이 증발하면서 몸의 열을 흡수하기 때문이에요', '땀이 응결하면서 열을 방출하기 때문이에요', '땀 속의 소금이 열을 만들기 때문이에요', '땀은 처음부터 온도가 낮은 물이기 때문이에요'],
          answer: 0,
          feedback: ['', '응결은 열을 방출해서 주위를 따뜻하게 해요. 땀이 마르는 것은 증발이에요.', '소금은 열을 만들지 않아요. 시원해지는 것은 증발 때문이에요.', '땀은 체온과 비슷한 온도로 나와요. 증발하면서 열을 빼앗아 시원해져요.'],
          explain: '땀이 <b>증발</b>할 때 몸의 열을 <b>흡수</b>하므로 몸이 시원해져요. 바닷물이 증발할 때 열을 흡수하는 것과 같은 원리예요.',
        },
        {
          type: 'quiz', title: '태풍이 바다 위에서 힘을 키우는 까닭',
          goal: '태풍은 따뜻한 바다 위에서 세력이 강해져요. 그 까닭으로 알맞은 것은?',
          setup() { setScene('nature'); setNatView('water'); },
          choices: ['증발한 수증기가 구름이 되며 응결할 때 열(에너지)을 방출하기 때문이에요', '바닷물이 증발할 때 열을 방출하기 때문이에요', '구름이 만들어질 때 열을 흡수하기 때문이에요', '태풍은 바다와 에너지를 주고받지 않기 때문이에요'],
          answer: 0,
          feedback: ['', '증발은 열을 흡수하는 변화예요. 힘을 키우는 에너지는 수증기가 응결할 때 나와요.', '응결할 때는 열을 방출해요. 방출된 열이 공기를 데워 상승 기류를 키워요.', '따뜻한 바다에서 증발한 수증기가 에너지를 공급해요.'],
          explain: '바다에서 증발할 때 흡수한 열이 수증기에 담겨 올라가요. 수증기가 구름으로 <b>응결할 때 그 열을 방출</b>하고, 이 에너지가 태풍을 키워요.',
        },
      ],
    },
    /* ---------- 4단계 · 적용 ---------- */
    {
      title: '산화 칼슘 조리 장치', short: '조리 장치', icon: '🍲', phase: '적용',
      features: ['cook', 'talk'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 에너지를 방출하는 변화는 열원으로, 흡수하는 변화는 냉각에 쓸 수 있다는 것을 알았어요.</div>' +
        '<p><b>가열 장치 없이</b> 산화 칼슘과 물만으로 음식 컵의 물 ' + G_WATER + ' g을 <b>' + GOAL + ' °C 이상</b>으로 데우는 조리 장치를 설계해요. 산화 칼슘의 양과 단열재 유무를 골라 실험해요.</p>' +
        '<p class="note">CaO + H₂O → Ca(OH)₂ + 열. 값은 크기 감각용 모델이에요 (산화 칼슘 56 g당 약 ' + KJ56 + ' kJ 방출).</p>',
      setup() { setScene('cook'); resetCookRun(); syncCook(); showHint('산화 칼슘 양과 단열재를 골라 ▶ 가열하기를 눌러요', 4500); },
      recap: '산화 칼슘과 물이 반응하면 열이 나와 음식을 데울 수 있어요. 산화 칼슘을 늘리거나 단열재로 새는 열을 줄이면 온도가 더 높아져요. 물의 온도는 100 °C에서 멈춰요.',
      summary: '<ul><li><b>CaO + H₂O → Ca(OH)₂ + 열</b>: 에너지를 방출하는 반응으로 가열 장치 없이 조리에 이용해요.</li>' +
        '<li>방출한 열이 모두 음식에 쓰이는 것은 아니에요. <b>단열재</b>를 쓰면 새는 열이 줄어 같은 양으로 더 높은 온도를 얻어요.</li>' +
        '<li>발열 도시락, 손난로는 에너지 방출을, 냉각 팩은 에너지 흡수를 이용해요.</li></ul>' +
        '<p class="note">⚠️ 산화 칼슘 + 물은 매우 뜨거워져요. 눈·피부에 닿으면 위험하고 밀폐 용기에서는 터질 수 있어요.</p>',
      missions: [
        {
          title: GOAL + ' °C 이상 만들기',
          goal: '물 ' + G_WATER + ' g을 <b>' + GOAL + ' °C 이상</b>으로 데우는 설계(산화 칼슘 양 + 단열재)를 찾아 실험해요.',
          hint: '산화 칼슘 양을 늘리거나 단열재를 사용해 봐요. 단열재를 쓰면 같은 양으로도 더 높아져요. 오른쪽 계산 ①~④를 따라가 보면 까닭을 알 수 있어요.',
          setup() { setScene('cook'); },
          check: () => cookOK(),
          hold: 0.4,
          status: () => mark(cookOK()) + ' 목표 ' + GOAL + ' °C 이상 · 최고 ' + (CK.runs.length ? Math.max.apply(null, CK.runs.map((r) => r.T)) : '-') + ' °C',
          explain: '산화 칼슘과 물이 반응하며 방출한 열이 물을 데워요. 양이 많을수록 방출하는 열이 늘고, 단열재를 쓰면 주위로 새는 열이 줄어 <b>이용률</b>이 높아져요. 물은 ' + T_BOIL + ' °C에서 끓어 더 오르지 않아요.',
        },
        {
          title: '단열재 비교하기',
          goal: '<b>같은 산화 칼슘 양</b>으로 단열재 <b>없음</b>과 <b>있음</b>을 모두 실험해 온도 차이를 비교해요.',
          hint: '예를 들어 56 g으로 단열재 없음 → 있음 순서로 가열해 봐요. 이 미션이 시작된 뒤의 실험만 세어요.',
          setup() { setScene('cook'); CK.base2 = CK.runs.length; },
          check: () => cookCompare(),
          hold: 0.4,
          status: () => { const rs = CK.runs.slice(CK.base2); const amts = AMTS.filter((g) => rs.some((r) => r.amt === g && r.ins === 'no') && rs.some((r) => r.amt === g && r.ins === 'yes')); return mark(amts.length > 0) + ' 같은 양 비교 · 단열재 없음 ' + mark(rs.some((r) => r.ins === 'no')) + ' / 있음 ' + mark(rs.some((r) => r.ins === 'yes')); },
          explain: '같은 양의 산화 칼슘이라도 <b>단열재가 있으면 온도가 더 높아졌어요</b>. 방출한 열의 양은 같지만 새는 열이 줄어 음식에 쓰이는 열이 늘기 때문이에요.',
        },
        {
          type: 'quiz', title: '설계 선택과 안전',
          goal: '목표(' + GOAL + ' °C 이상)를 이루면서 재료도 아끼고 안전한 설계는?',
          setup() { setScene('cook'); },
          choices: ['84 g에 단열재를 써요. 적은 양으로도 목표를 이루고 재료를 아낄 수 있어요', '140 g에 단열재 없이 써요. 양이 많을수록 항상 좋아요', '밀폐된 용기에 넣어 열이 새지 않게 해요', '맨손으로 산화 칼슘을 만져 보며 양을 조절해요'],
          answer: 0,
          feedback: ['', '140 g도 목표에는 닿지만 재료가 낭비돼요. 단열재를 쓰면 더 적은 양으로도 가능해요.', '밀폐 용기에서는 열과 수증기 때문에 터질 수 있어 위험해요.', '산화 칼슘과 물은 매우 뜨거워지고 피부에 닿으면 위험해요. 보안경을 쓰고 교사 지도 아래에서 해요.'],
          explain: '단열재를 쓰면 <b>적은 산화 칼슘으로도 목표</b>를 이룰 수 있어 재료를 아낄 수 있어요. 또 산화 칼슘과 물이 만나면 매우 뜨거워지므로 <b>보안경</b>을 쓰고 <b>밀폐하지 않고</b> 교사 지도 아래에서 실험해요.',
        },
      ],
    },
  ];

  SB.reset(); resetNature(); setKind(false); syncBench(); syncCook();
  game = SciSim.game({
    simId: 'h1-energy-exchange',
    mount: '#game',
    badge: '에너지 출입 박사',
    homeHref: '../../index.html#h1b',
    featureLabels: { bench: '🌡️ 열의 출입 실험대', sort: '🗂️ 방출·흡수 분류판', nature: '🌿 자연 속 에너지 장면', cook: '🍲 조리 장치 설계', talk: '💬 생활 속 토의 카드' },
    onFeatures(set) { F = new Set(set); updateUI(); },
    levels,
  });

  updateUI();
  SciSim.loop((dt, t) => {
    if (S.scene === 'bench') stepBench(dt);
    else if (S.scene === 'cook') stepCook(dt);
    SB.update(dt);
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = {
    S, BN, BENCH, SB, CARDS, NS, HS, CK, TK, TALK, game, levels, setScene, selectBench, runBench, setKind, setNatView, natClick, runCook, finalShown, finalRaw, qKJ, usedKJ, dTraw, benchDoneCount, natCorrect, cookOK, cookCompare, syncCook, resetCookRun, tkRect, sLayout, AMTS, ETA,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    sortAll() { SB.items.forEach((it) => SB.assign(it, CARDS[it.idx].d, true)); },
    natAll() { HKEYS.forEach((k) => { NS.set[k] = HS[k].want; }); },
  };
})();
