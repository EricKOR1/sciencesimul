/* =========================================================
   통합과학1 Ⅲ. 시스템과 상호작용 - 세포막과 물질 출입 (단원 9차시)
   성취기준 [10통과1-03-05] 생명 시스템을 유지하기 위해서 다양한 화학 반응과 물질 출입이 필요함을 이해하고, 일상생활에서 활용되는
   화학 반응 사례를 조사하여 발표할 수 있다. (물질 출입과 세포막의 선택적 투과 부분)
   ① 관찰: 살아 있는 시스템 (세포로 들어오고 나가는 물질, 세포막이 없으면?)
   ② 모형: 막 모형 (인지질 이중층, 단백질 통로, 확산)
   ③ 실험: 막 통과 실험 (셀로판 튜브 녹말·아이오딘, 감자 삼투)
   ④ 적용: 삼투 적용 (적혈구, 김치 절이기, 바닷물, 링거)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef7f0' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
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
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  function bgFill(top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }

  /* ---------- 상태 ---------- */
  const S = { mode: 'cell', clock: 0, fade: 0, cell: null, md: null, lab: null, rb: null, showMatch: false, showPred: false, match: {}, matchOK: {} };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { cell: '🫧 살아 있는 세포', model: '🔍 막 모형', lab: '🧪 막 통과 실험', rbc: '🩸 삼투 적용' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      const sub = n.getAttribute('data-sub'); if (on && sub) on = !!S.lab && S.lab.exp === sub;
      if (on && n.hasAttribute('data-match')) on = S.showMatch;
      if (on && n.hasAttribute('data-pred')) on = S.showPred;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    if (S.cell) { $('#bMem').textContent = S.cell.memTarget ? '🚫 세포막 없애기' : '🫧 세포막 되돌리기'; }
    if (S.md) {
      $$('#typeChips button').forEach((b) => b.classList.toggle('on', b.dataset.t === S.md.sel));
      const ts = S.md.ts[S.md.sel];
      $('#sOut').value = ts.out; $('#sIn').value = ts.in; $('#oOut').textContent = ts.out; $('#oIn').textContent = ts.in;
      $('#sOut').style.setProperty('--pct', (ts.out / 40 * 100) + '%'); $('#sIn').style.setProperty('--pct', (ts.in / 40 * 100) + '%');
      $$('#predSeg button').forEach((b) => b.classList.toggle('on', b.dataset.pred === S.md.pred));
    }
    if (S.lab) {
      $$('#expSeg button').forEach((b) => b.classList.toggle('on', b.dataset.exp === S.lab.exp));
      $$('#solSeg button').forEach((b) => b.classList.toggle('on', b.dataset.sol === S.lab.sol));
      const pot = S.lab.exp === 'potato', run = pot ? S.lab.pot[S.lab.sol] : S.lab.iod;
      $('#bLabRun').disabled = run.st === 'run';
      $('#bLabRun').textContent = run.st === 'done' ? '▶ 다시 30분' : '▶ 30분 ' + (pot ? '담그기' : '지나기');
      $('#labNote').textContent = pot ? '용액을 고르고 ▶ 30분 담그기를 눌러요. 세 용액을 모두 해 보세요.' : '비커에는 아이오딘 용액, 셀로판 튜브에는 녹말 용액이 들어 있어요.';
    }
    if (S.rb) { const c = S.rb.c; $('#oConc').textContent = c.toFixed(1) + ' %'; $('#sConc').value = c; $('#sConc').style.setProperty('--pct', (c / 3 * 100) + '%'); $$('#concChips button').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.c - c) < 0.05)); }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ================= 막 모형 상자 (입자 모형 공통) =================
     위쪽 = 세포 밖, 아래쪽 = 세포 안. 막 띠(memY ± memH/2) 가운데로 입자가 오가요.
     pass: 'free' 막을 그냥 통과 / 'channel' 단백질 통로(열렸을 때)로만 통과 / 'none' 통과 못함 */
  class MBox {
    constructor(o) {
      Object.assign(this, { x: 0, y: 0, w: 400, h: 300, memH: 56, channels: [], chW: 26, types: {}, kind: 'lipid', outLabel: '세포 밖', inLabel: '세포 안' }, o);
      this.memY = this.y + this.h * (o.memFrac != null ? o.memFrac : 0.5);
      this.reservoir = o.reservoir || []; this.parts = []; this.cross = {}; this.open = this.channels.map(() => 0); this.vis = null; this.clk = 0;
      Object.keys(this.types).forEach((k) => { this.cross[k] = { down: 0, up: 0 }; });
    }
    get top() { return this.memY - this.memH / 2; }
    get bot() { return this.memY + this.memH / 2; }
    spawnPos(side, r) {
      const x = rnd(this.x + r + 4, this.x + this.w - r - 4);
      const y = side === 'out' ? rnd(this.y + r + 4, this.top - r - 4) : rnd(this.bot + r + 4, this.y + this.h - r - 4);
      return { x, y };
    }
    add(type, side, n, instant) {
      const def = this.types[type];
      for (let i = 0; i < n; i++) {
        const p = this.spawnPos(side, def.r);
        const a = rnd(0, TAU);
        this.parts.push({ t: type, x: p.x, y: p.y, vx: Math.cos(a) * def.speed, vy: Math.sin(a) * def.speed, tm: rnd(0.1, 0.4), side, alpha: instant ? 1 : 0, dying: false, rot: rnd(0, TAU), vr: rnd(-1, 1) });
      }
    }
    alive(type, side) { let n = 0; for (const p of this.parts) if (p.t === type && !p.dying && (!side || p.side === side)) n++; return n; }
    remove(type, side, n) {
      const cand = this.parts.filter((p) => p.t === type && p.side === side && !p.dying);
      for (let i = 0; i < n && cand.length; i++) { const k = Math.floor(Math.random() * cand.length); cand[k].dying = true; cand.splice(k, 1); }
    }
    syncTo(type, outN, inN) {
      const co = this.alive(type, 'out'), ci = this.alive(type, 'in');
      if (outN > co) this.add(type, 'out', outN - co); else if (outN < co) this.remove(type, 'out', co - outN);
      if (inN > ci) this.add(type, 'in', inN - ci); else if (inN < ci) this.remove(type, 'in', ci - inN);
    }
    clear() { this.parts.length = 0; Object.keys(this.cross).forEach((k) => { this.cross[k].down = 0; this.cross[k].up = 0; }); }
    step(dt) {
      this.clk += dt;
      // 통로 열림: 근처에 통로로 지나는 입자가 있으면 열려요
      this.channels.forEach((cx, i) => {
        let near = false;
        for (const p of this.parts) { const d = this.types[p.t]; if (d.pass === 'channel' && !p.dying && Math.abs(p.x - cx) <= this.chW / 2 + 6 && Math.abs(p.y - this.memY) <= this.memH / 2 + 30) { near = true; break; } }
        this.open[i] = SciSim.approach(this.open[i], near ? 1 : 0, dt, 14);
      });
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i]; const d = this.types[p.t];
        if (this.vis && this.vis.indexOf(p.t) < 0) continue;
        if (p.dying) { p.alpha -= dt * 3; if (p.alpha <= 0.02) { this.parts.splice(i, 1); continue; } } else if (p.alpha < 1) p.alpha = Math.min(1, p.alpha + dt * 3);
        p.tm -= dt;
        if (p.tm <= 0) { const a = rnd(0, TAU); p.vx = Math.cos(a) * d.speed; p.vy = Math.sin(a) * d.speed; p.tm = rnd(0.15, 0.4); }
        p.rot += p.vr * dt;
        const r = d.r; let nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        if (nx < this.x + r) { nx = this.x + r; p.vx = Math.abs(p.vx); } else if (nx > this.x + this.w - r) { nx = this.x + this.w - r; p.vx = -Math.abs(p.vx); }
        if (ny < this.y + r) { ny = this.y + r; p.vy = Math.abs(p.vy); } else if (ny > this.y + this.h - r) { ny = this.y + this.h - r; p.vy = -Math.abs(p.vy); }
        const top = this.top, bot = this.bot;
        const ovNow = p.y + r > top && p.y - r < bot, ovNew = ny + r > top && ny - r < bot;
        if (ovNew && d.pass !== 'free') {
          if (d.pass === 'none') { if (ny < this.memY) { ny = top - r; p.vy = -Math.abs(p.vy); } else { ny = bot + r; p.vy = Math.abs(p.vy); } if (ovNow && p.y > top - r && p.y < bot + r) { /* 이미 겹쳐 있으면 가까운 쪽으로 밀어냄 */ } }
          else {
            let bi = -1, bd = 1e9; this.channels.forEach((cx, i) => { const dd = Math.abs(nx - cx); if (dd < bd) { bd = dd; bi = i; } });
            const half = this.chW / 2 - r;
            const ok = bi >= 0 && this.open[bi] > 0.5 && bd <= half;
            if (ok) { /* 통로 안으로 */ }
            else if (ovNow && bi >= 0 && this.open[bi] > 0.5) { nx = this.channels[bi] + clamp(nx - this.channels[bi], -half, half); p.vx = -p.vx; }
            else { if (ny < this.memY) { ny = top - r; p.vy = -Math.abs(p.vy); } else { ny = bot + r; p.vy = Math.abs(p.vy); } if (ovNow) { nx = p.x; } }
          }
        }
        p.x = nx; p.y = ny;
        const side = p.y < this.memY ? 'out' : 'in';
        if (side !== p.side) { const from = p.side; if (side === 'in') this.cross[p.t].down++; else this.cross[p.t].up++; p.side = side; if (this.reservoir.indexOf(p.t) >= 0 && !p.dying) { p.dying = true; this.add(p.t, from, 1, true); } }
      }
    }
    drawParticle(p, d) {
      ctx.save(); ctx.globalAlpha = clamp(p.alpha, 0, 1) * (p.y + d.r > this.top && p.y - d.r < this.bot ? 0.85 : 1);
      if (d.shape === 'chain') {
        ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.4);
        [-d.r * 0.55, 0, d.r * 0.55].forEach((o, i) => D.sphere(o, (i === 1 ? -0.28 : 0.22) * d.r, d.r * 0.46, d.color, { gloss: false }));
      } else if (d.shape === 'blob') {
        ctx.translate(p.x, p.y); ctx.rotate(p.rot * 0.3);
        D.sphere(0, 0, d.r, d.color, { gloss: true });
        ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, d.r * 0.55, 0.3, 4.2); ctx.stroke();
      } else D.sphere(p.x, p.y, d.r, d.color, { gloss: d.r > 4, text: d.text, textScale: 1.05 });
      ctx.restore();
    }
    drawParticles() {
      this.parts.forEach((p) => { if (this.vis && this.vis.indexOf(p.t) < 0) return; this.drawParticle(p, this.types[p.t]); });
    }
    drawMembrane(o) {
      o = o || {};
      const top = this.top, bot = this.bot, x0 = this.x, x1 = this.x + this.w;
      if (this.kind === 'lipid') {
        const hs = 15, rr = 6;
        ctx.fillStyle = 'rgba(253,224,171,.5)'; ctx.fillRect(x0, top, this.w, this.memH);
        for (let x = x0 + hs / 2; x < x1 - 2; x += hs) {
          if (this.channels.some((cx) => Math.abs(x - cx) < this.chW / 2 + rr)) continue;
          // 꼬리
          ctx.strokeStyle = '#e8a93b'; ctx.lineWidth = 2; ctx.beginPath();
          ctx.moveTo(x - 2.5, top + rr * 1.6); ctx.lineTo(x - 2.5, this.memY - 1); ctx.moveTo(x + 2.5, top + rr * 1.6); ctx.lineTo(x + 2.5, this.memY - 1);
          ctx.moveTo(x - 2.5, bot - rr * 1.6); ctx.lineTo(x - 2.5, this.memY + 1); ctx.moveTo(x + 2.5, bot - rr * 1.6); ctx.lineTo(x + 2.5, this.memY + 1); ctx.stroke();
          D.sphere(x, top + rr, rr, '#f59e0b', { gloss: false }); D.sphere(x, bot - rr, rr, '#f59e0b', { gloss: false });
        }
        this.channels.forEach((cx, i) => {
          const op = this.open[i], half = this.chW / 2;
          // 단백질(통로) 양쪽
          [[x0, cx - half], [cx + half, x1]].forEach((seg, k) => {
            const a = k === 0 ? cx - half - 16 : cx + half, b = k === 0 ? cx - half : cx + half + 16;
            D.roundRect(a, top - 4, b - a, this.memH + 8, 8); const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, '#c084fc'); g.addColorStop(1, '#7c3aed'); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#5b21b6'; ctx.lineWidth = 1.5; ctx.stroke();
          });
          // 문(열리면 옆으로 걷혀요)
          const door = half * (1 - clamp(op, 0, 1));
          if (door > 0.8) { ctx.fillStyle = '#6d28d9'; ctx.fillRect(cx - half, top - 2, door, this.memH + 4); ctx.fillRect(cx + half - door, top - 2, door, this.memH + 4); }
          if (op > 0.6) { ctx.strokeStyle = 'rgba(167,139,250,' + (0.5 * op) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, this.memY, half + 6 + Math.sin(this.clk * 6) * 2, 0, TAU); ctx.stroke(); }
        });
      } else {
        // 셀로판막: 그물 모양 막에 작은 구멍
        const g = ctx.createLinearGradient(0, top, 0, bot); g.addColorStop(0, 'rgba(200,230,255,.9)'); g.addColorStop(1, 'rgba(160,200,235,.9)');
        D.roundRect(x0, top, this.w, this.memH, 6); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#6aa5d4'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#7fb3dd'; for (let x = x0 + 14; x < x1 - 8; x += 22) { for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.ellipse(x + k * 10, this.memY + (k ? 8 : -8), 3.4, 3.4, 0, 0, TAU); ctx.fill(); } }
      }
    }
  }

  /* ================= ① 살아 있는 세포 ================= */
  const CX = PHONE ? 240 : 270, CY = PHONE ? 150 : 205, CRX = PHONE ? 205 : 190, CRY = PHONE ? 96 : 128;
  const CW = PHONE ? 100 : 116, CH = PHONE ? 38 : 44;
  const OZ = PHONE ? { x: 10, y: 270, w: 460, h: 100 } : { x: 526, y: 50, w: 266, h: 330 };
  const SHORT = { o2: '산소', glu: '포도당', aa: '아미노산', co2: '이산화 탄소', urea: '요소', nh3: '암모니아' };
  const ITEMS = [
    ['o2', '산소 O₂', 'in', '#ef4444', 'O₂'], ['glu', '포도당', 'in', '#f59e0b', 'C'], ['aa', '아미노산', 'in', '#22c55e', 'A'],
    ['co2', '이산화 탄소', 'out', '#6b7280', 'CO₂'], ['urea', '요소', 'out', '#fb923c', 'U'], ['nh3', '암모니아', 'out', '#a855f7', 'N'],
  ];
  const trayPos = (i) => PHONE ? { x: 22 + (i % 3) * 152, y: 400 + Math.floor(i / 3) * 56 } : { x: 24 + i * 124, y: 440 };
  const slotIn = (k) => ({ x: CX - CW * 1.5 - 6 + (k % 3) * (CW + 6), y: CY + (k < 3 ? -30 : 26) });
  const slotOut = (k) => PHONE ? { x: OZ.x + 14 + (k % 3) * (CW + 14), y: OZ.y + 22 + Math.floor(k / 3) * (CH + 12) } : { x: OZ.x + 10 + (k % 2) * (CW + 14), y: OZ.y + 70 + Math.floor(k / 2) * (CH + 18) };
  function makeContents() {
    const c = []; for (let i = 0; i < 26; i++) { const a = rnd(0, TAU), r = Math.sqrt(Math.random()); c.push({ hx: CX + Math.cos(a) * r * (CRX - 22), hy: CY + Math.sin(a) * r * (CRY - 18), a, s: rnd(2, 4), col: ['#9bd3a9', '#7cc48e', '#b9e0c3'][i % 3] }); }
    return c;
  }
  function resetCell(keepMem) {
    const prev = S.cell;
    S.cell = {
      memTarget: keepMem && prev ? prev.memTarget : 1, mem: keepMem && prev ? prev.mem : 1, flow: false, drag: null, checked: false, flowT: 0,
      items: ITEMS.map((it, i) => { const p = trayPos(i); return { id: it[0], name: it[1], dir: it[2], col: it[3], sym: it[4], x: p.x, y: p.y, zone: null, slot: -1, lift: 0, bad: false, shake: 0, home: p }; }),
      contents: prev ? prev.contents : makeContents(),
    };
    updateCtl();
  }
  function toggleMem() { const c = S.cell; c.memTarget = c.memTarget ? 0 : 1; Sound.click(); if (!c.memTarget) { Sound.fail(); } updateCtl(); }
  function freeSlot(zone, except) {
    const used = new Set(S.cell.items.filter((it) => it.zone === zone && it !== except).map((it) => it.slot));
    for (let k = 0; k < 6; k++) if (!used.has(k)) return k; return 0;
  }
  function placeItem(it, zone) {
    const c = S.cell;
    it.zone = zone; it.bad = false;
    let tp;
    if (zone === 'in') { it.slot = freeSlot('in', it); tp = slotIn(it.slot); } else if (zone === 'out') { it.slot = freeSlot('out', it); tp = slotOut(it.slot); } else { it.slot = -1; tp = it.home; }
    SciSim.tween(it, { x: tp.x, y: tp.y }, { duration: 0.35, ease: 'outBack' });
    it.lift = 0;
    c.checked = false;
  }
  const inEllipse = (x, y) => ((x - CX) / CRX) ** 2 + ((y - CY) / CRY) ** 2 <= 1;
  const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'cell') return false;
      const its = S.cell.items;
      for (let i = its.length - 1; i >= 0; i--) {
        const it = its[i];
        if (p.x >= it.x && p.x <= it.x + CW && p.y >= it.y && p.y <= it.y + CH) {
          S.cell.drag = { it, dx: p.x - it.x, dy: p.y - it.y }; its.splice(i, 1); its.push(it); it.zone = it.zone; Sound.tick();
          return true;
        }
      }
      return false;
    },
    move(p) { const d = S.cell.drag; if (!d) return; d.it.x = clamp(p.x - d.dx, 0, VW - CW); d.it.y = clamp(p.y - d.dy, 0, VH - CH); },
    up(p) {
      const d = S.cell.drag; if (!d) return; S.cell.drag = null;
      const it = d.it; const px = p.x, py = p.y;
      const zone = inEllipse(px, py) ? 'in' : inRect(px, py, OZ) ? 'out' : null;
      placeItem(it, zone); if (zone) Sound.click();
    },
    hover(p) { if (S.mode !== 'cell') return 'default'; return S.cell.items.some((it) => p.x >= it.x && p.x <= it.x + CW && p.y >= it.y && p.y <= it.y + CH) ? 'grab' : 'default'; },
  });
  function stepCell(dt) {
    const c = S.cell;
    c.mem = SciSim.approach(c.mem, c.memTarget, dt, RM ? 60 : 2.4);
    c.items.forEach((it) => { it.lift = SciSim.approach(it.lift, c.drag && c.drag.it === it ? 1 : 0, dt, 14); it.shake = Math.max(0, it.shake - dt * 3); });
    c.flowT += dt;
  }
  function drawCellCard(it) {
    const lift = it.lift;
    ctx.save();
    ctx.translate(it.x + CW / 2, it.y + CH / 2); ctx.scale(1 + lift * 0.08, 1 + lift * 0.08);
    const sh = it.shake > 0 && !RM ? Math.sin(S.clock * 60) * 3 * it.shake : 0; ctx.translate(sh, 0);
    D.shadow(() => { D.roundRect(-CW / 2, -CH / 2, CW, CH, 12); ctx.fillStyle = it.bad ? '#fdeceb' : '#fff'; ctx.fill(); }, { blur: 6 + lift * 10, y: 2 + lift * 4 });
    ctx.strokeStyle = it.bad ? '#e2464b' : C.shade(it.col, 0.2); ctx.lineWidth = it.bad ? 3 : 2; D.roundRect(-CW / 2, -CH / 2, CW, CH, 12); ctx.stroke();
    D.sphere(-CW / 2 + 19, 0, 12, it.col, { text: it.sym, textScale: it.sym.length > 1 ? 0.78 : 1.0 });
    T(-CW / 2 + 34, 5, it.name, it.name.length > 6 ? (PHONE ? 11 : 12.5) : (PHONE ? 12.5 : 14), '#26324a', 'left', 800);
    ctx.restore();
  }
  function drawCell(dt) {
    const c = S.cell, m = c.mem;
    bgFill('#eef7f0', '#f7fbf8');
    // 바깥 칸
    D.roundRect(OZ.x, OZ.y, OZ.w, OZ.h, 16); ctx.fillStyle = 'rgba(219,234,254,.75)'; ctx.fill(); ctx.setLineDash([7, 6]); ctx.strokeStyle = '#7aa6d8'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    T(OZ.x + OZ.w / 2, OZ.y + 26, '⬆ 세포 밖으로 나가는 물질', PHONE ? 13.5 : 15, '#1e4f8a', 'center', 800);
    // 세포
    const wob = RM ? 0 : Math.sin(S.clock * 1.5) * 1.2;
    ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * m;
    const cg = ctx.createRadialGradient(CX - 40, CY - 40, 10, CX, CY, CRX); cg.addColorStop(0, '#e8f8ec'); cg.addColorStop(1, '#bfe6c9');
    ctx.beginPath(); ctx.ellipse(CX, CY, CRX + wob, CRY - wob * 0.6, 0, 0, TAU); ctx.fillStyle = cg; ctx.fill(); ctx.restore();
    // 내용물 (막이 없어지면 흩어져요)
    const spread = (1 - m);
    c.contents.forEach((d) => { const ex = Math.cos(d.a) * 130 * spread + (d.hx - CX) * 0.9 * spread, ey = Math.sin(d.a) * 90 * spread + (d.hy - CY) * 0.9 * spread; ctx.globalAlpha = 1 - 0.55 * spread; ctx.fillStyle = d.col; ctx.beginPath(); ctx.arc(d.hx + ex, d.hy + ey, d.s, 0, TAU); ctx.fill(); }); ctx.globalAlpha = 1;
    const org = [[CX - 55, CY - 8, 'nuc'], [CX + 85, CY - 40, 'mit'], [CX + 70, CY + 52, 'mit'], [CX - 110, CY + 50, 'mit']];
    org.forEach((o, i) => {
      const ex = (o[0] - CX) * 1.0 * spread + Math.cos(i * 1.7) * 110 * spread, ey = (o[1] - CY) * 0.9 * spread + Math.sin(i * 1.7) * 70 * spread;
      ctx.globalAlpha = 1 - 0.45 * spread;
      if (o[2] === 'nuc') D.sphere(o[0] + ex, o[1] + ey, PHONE ? 26 : 32, '#9b8de8', { gloss: true });
      else { ctx.save(); ctx.translate(o[0] + ex, o[1] + ey); ctx.rotate(i * 0.7); ctx.beginPath(); ctx.ellipse(0, 0, 22, 12, 0, 0, TAU); ctx.fillStyle = '#f4a56a'; ctx.fill(); ctx.strokeStyle = '#c9732f'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-7, -7, 0, 0); ctx.quadraticCurveTo(7, 7, 14, 0); ctx.stroke(); ctx.restore(); }
      ctx.globalAlpha = 1;
    });
    T(CX - 55, CY - (PHONE ? 38 : 46), '핵', 12.5, '#4c3fa6', 'center', 800);
    // 세포막 (이중선)
    if (m > 0.02) {
      ctx.save(); ctx.globalAlpha = m;
      ctx.lineWidth = 7; ctx.strokeStyle = '#f59e0b'; ctx.beginPath(); ctx.ellipse(CX, CY, CRX + wob, CRY - wob * 0.6, 0, 0, TAU); ctx.stroke();
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#fde68a'; ctx.beginPath(); ctx.ellipse(CX, CY, CRX + wob, CRY - wob * 0.6, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // 이름표
    if (m > 0.6) D.label(CX, CY - CRY - 14, '세포막', { bg: '#f59e0b', size: PHONE ? 12 : 13.5 });
    else if (m < 0.35) D.label(CX, CY - CRY - 14, '세포막이 없어졌어요!', { bg: '#e2464b', size: PHONE ? 12 : 13.5 });
    T(CX, CY + CRY + (PHONE ? 14 : 26), '⬇ 세포 안으로 들어오는 물질을 이 세포에 놓아요', PHONE ? 12.5 : 14.5, '#166534', 'center', 800);
    if (m < 0.35) { const ls = wrap('세포 내용물이 흩어져 세포가 생명을 유지할 수 없어요.', PHONE ? 300 : 340, PHONE ? 13 : 14.5, 800); ls.forEach((l, i) => T(CX, CY - 6 + i * 20, l, PHONE ? 13 : 14.5, '#7f1d1d', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 })); }
    // 흐름 (정답을 맞춘 뒤)
    if (c.flow || (game && game.free)) drawFlows(c);
    // 트레이 안내
    if (!PHONE) { T(34, 424, '카드를 끌어서 놓아요 👇', 13.5, '#5a6679', 'left', 800); } else T(22, 392, '카드를 끌어서 놓아요 👇', 12.5, '#5a6679', 'left', 800);
    // 카드
    c.items.forEach((it) => drawCellCard(it));
    parts.update(dt); parts.draw(ctx);
  }
  function drawFlows(c) {
    c.items.forEach((it, i) => {
      const a = (i / 6) * TAU + 0.3 + (it.dir === 'in' ? 0 : 0);
      // 세포막 위의 통과 지점 (타원 위의 점), 바깥/안쪽 방향
      const gx = CX + Math.cos(a) * CRX, gy = CY + Math.sin(a) * CRY;
      const nx = Math.cos(a) / CRX, ny = Math.sin(a) / CRY, nl = Math.hypot(nx, ny), ux = nx / nl, uy = ny / nl;
      const L = PHONE ? 50 : 60;
      for (let k = 0; k < 2; k++) {
        const ph = ((c.flowT * 0.5 + k * 0.5 + i * 0.13) % 1);
        const s = it.dir === 'in' ? (1 - ph) : ph;
        const pos = (s - 0.5) * 2 * L;       // -L(안쪽) ~ +L(바깥쪽)
        if (pos > 0 && c.mem < 0.5) continue;
        ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.95;
        D.sphere(gx + ux * pos, gy + uy * pos, 6, it.col, { gloss: false });
      }
      ctx.globalAlpha = 1;
      T(clamp(gx + ux * (L + 12), 44, VW - 44), gy + uy * (L + 12) + 4, SHORT[it.id], PHONE ? 10.5 : 11.5, it.dir === 'in' ? '#166534' : '#1e4f8a', 'center', 800, { stroke: 'rgba(255,255,255,.9)', strokeWidth: 3.5 });
    });
  }
  $('#bMem').addEventListener('click', toggleMem);
  $('#bCellReset').addEventListener('click', () => { Sound.click(); parts.clear(); S.cell.items.forEach((it) => { it.zone = null; it.slot = -1; it.bad = false; SciSim.tween(it, { x: it.home.x, y: it.home.y }, { duration: 0.35, ease: 'outCubic' }); }); S.cell.checked = false; });

  /* ================= ② 막 모형 ================= */
  const TYPES = {
    water: { name: '물 H₂O', r: 4.5, speed: 130, pass: 'free', color: '#3b9eff' },
    oxygen: { name: '산소 O₂', r: 5.5, speed: 120, pass: 'free', color: '#ef4444' },
    ion: { name: '이온 Na⁺', r: 6, speed: 150, pass: 'channel', color: '#a855f7', text: '+' },
    starch: { name: '녹말', r: 12, speed: 70, pass: 'none', color: '#eab308', shape: 'chain' },
    protein: { name: '단백질', r: 14, speed: 55, pass: 'none', color: '#b45309', shape: 'blob' },
  };
  const TKEYS = ['water', 'oxygen', 'ion', 'starch', 'protein'];
  const MB = PHONE ? { x: 10, y: 66, w: 460, h: 316, memH: 56, ch: [80, 190, 300, 410] } : { x: 24, y: 62, w: 540, h: 440, memH: 60, ch: [100, 230, 360, 490] };
  function resetModel() {
    const prev = S.md;
    const box = new MBox({ x: MB.x, y: MB.y, w: MB.w, h: MB.h, memH: MB.memH, channels: MB.ch.map((c) => MB.x + c), chW: 36, types: TYPES, kind: 'lipid' });
    const ts = {}; TKEYS.forEach((k) => { ts[k] = { out: k === 'ion' ? 30 : 20, in: 0, obs: 0, res: null }; });
    S.md = { box, sel: prev ? prev.sel : 'water', ts, pred: null };
    box.vis = [S.md.sel];
    TKEYS.forEach((k) => box.add(k, 'out', k === 'ion' ? 30 : 20, true));
    updateCtl();
  }
  function selectType(k) {
    const m = S.md; if (m.sel === k) return;
    m.sel = k; m.box.vis = [k]; Sound.click();
    m.box.syncTo(k, m.ts[k].out, m.ts[k].in); updateCtl();
  }
  function setCounts(which, v) {
    const m = S.md, t = m.ts[m.sel]; t[which] = v; m.box.syncTo(m.sel, t.out, t.in);
    if (which && (t.res === null)) { /* 새 조건에서도 계속 관찰 */ }
    updateCtl();
  }
  function stepModel(dt) {
    const m = S.md, b = m.box;
    b.step(dt);
    const k = m.sel, t = m.ts[k], d = TYPES[k];
    if (b.alive(k) >= 8) {
      t.obs += dt;
      const cr = b.cross[k];
      if (t.res === null) {
        if (d.pass !== 'none' && cr.down + cr.up >= (d.pass === 'channel' ? 2 : 3)) { t.res = 'pass'; Sound.success(); parts.burst(b.x + b.w / 2, b.memY, { count: 12, speed: 120, size: 3, colors: [d.color, '#fff', '#fbbf24'], gravity: 0, life: 0.6 }); }
        else if (d.pass === 'none' && t.obs >= 5 && b.alive(k, 'out') >= 8) { t.res = 'block'; Sound.tick(); }
      }
    }
  }
  function drawModel(dt) {
    const m = S.md, b = m.box, k = m.sel, d = TYPES[k];
    bgFill('#eef7f0', '#f7fbf8');
    // 칸
    ctx.save();
    D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.clip();
    ctx.fillStyle = '#e3f0ff'; ctx.fillRect(b.x, b.y, b.w, b.top - b.y);
    ctx.fillStyle = '#e4f6e8'; ctx.fillRect(b.x, b.bot, b.w, b.y + b.h - b.bot);
    ctx.fillStyle = '#f3ead8'; ctx.fillRect(b.x, b.top, b.w, b.bot - b.top);
    ctx.restore();
    b.drawMembrane();
    b.drawParticles();
    ctx.strokeStyle = '#9bb7d8'; ctx.lineWidth = 2; D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.stroke();
    const co = b.alive(k, 'out'), ci = b.alive(k, 'in');
    D.label(b.x + 12, b.y + 20, '세포 밖 · ' + d.name + ' ' + co + '개', { bg: '#3b6fb0', size: PHONE ? 12 : 13.5, align: 'left' });
    D.label(b.x + 12, b.y + b.h - 20, '세포 안 · ' + d.name + ' ' + ci + '개', { bg: '#2f8a4a', size: PHONE ? 12 : 13.5, align: 'left' });
    D.label(b.x + b.w - 10, b.memY - b.memH / 2 - 16, '🔍 세포막 단면 (확대)', { bg: '#7a5a1a', size: PHONE ? 11.5 : 12.5, align: 'right' });
    // 확산 방향 화살표 (입자 수의 차이로 정해요)
    const diff = co - ci;
    if (d.pass !== 'none' && Math.abs(diff) >= 3) {
      const len = clamp(Math.abs(diff) * (PHONE ? 3.2 : 4.2), 24, PHONE ? 80 : 120), ax = b.x + b.w - (PHONE ? 30 : 40), up = diff < 0;
      const y0 = up ? b.top - 8 : b.bot + 8, y1 = up ? y0 - len : y0 + len;
      D.arrow(ax, y0, ax, y1, { color: '#0d9488', width: clamp(Math.abs(diff) / 4, 4, 10), alpha: 0.9 });
      D.label(ax - 16, y1 + (up ? -4 : 4), '많은 쪽 → 적은 쪽', { bg: '#0d9488', size: PHONE ? 11 : 12.5, align: 'right' });
    } else if (d.pass === 'none') {
      D.label(b.x + b.w - 10, b.memY + b.memH / 2 + 22, '✋ 막을 지나지 못해요', { bg: '#b45309', size: PHONE ? 11.5 : 12.5, align: 'right' });
    }
    // 오른쪽 결과 표
    drawModelTable(m);
    parts.update(dt); parts.draw(ctx);
  }
  const RES_TXT = { water: '막을 직접 통과', oxygen: '막을 직접 통과', ion: '통로로만 통과', starch: '통과 못함', protein: '통과 못함' };
  function drawModelTable(m) {
    const x = PHONE ? 10 : 584, y = PHONE ? 398 : 62, w = PHONE ? 460 : 196, rh = PHONE ? 38 : 56, hh = 34;
    panel(x, y, w, hh + rh * 5 + 10, 14);
    T(x + 14, y + 23, '입자 통과 시험 결과', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    TKEYS.forEach((k, i) => {
      const yy = y + hh + i * rh, t = m.ts[k], cur = m.sel === k;
      if (cur) { D.roundRect(x + 5, yy, w - 10, rh - 4, 10); ctx.fillStyle = 'rgba(22,163,74,.13)'; ctx.fill(); }
      D.sphere(x + 22, yy + (rh - 4) / 2, Math.min(TYPES[k].r, 12), TYPES[k].color, { gloss: false, text: TYPES[k].text });
      T(x + 42, yy + (PHONE ? 22 : 22), TYPES[k].name, PHONE ? 13.5 : 14, '#26324a', 'left', 800);
      const txt = t.res === 'pass' ? '✅ ' + RES_TXT[k] : t.res === 'block' ? '⛔ ' + RES_TXT[k] : (cur && m.box.alive(k) >= 8 ? '재는 중…' : '? 시험해 보세요');
      const col = t.res === 'pass' ? '#0b6b39' : t.res === 'block' ? '#b45309' : '#98a2b3';
      if (PHONE) T(x + w * 0.46, yy + 22, txt, 13, col, 'left', 800); else T(x + 42, yy + 42, txt, 12.5, col, 'left', 800);
    });
  }
  $$('#typeChips button').forEach((b) => b.addEventListener('click', () => selectType(b.dataset.t)));
  $('#sOut').addEventListener('input', (e) => { setCounts('out', +e.target.value); });
  $('#sIn').addEventListener('input', (e) => { setCounts('in', +e.target.value); });
  $$('#predSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.md.pred = b.dataset.pred; updateCtl(); }));

  /* ================= ③ 막 통과 실험 ================= */
  const LAB_MIN = 30, LAB_SECS = 12;           // 실험 30분을 12초로 보여 줘요
  const SOLS = { dw: { name: '증류수', pct: '0 %', dm: +1.0, solute: 0, color: '#cfe8ff' }, ns: { name: '0.9 % 생리식염수', pct: '0.9 %', dm: 0, solute: 6, color: '#dbeafe' }, hs: { name: '10 % 소금물', pct: '10 %', dm: -1.2, solute: 28, color: '#bfd8f5' } };
  const SKEYS = ['dw', 'ns', 'hs'];
  const potMass = (k, t) => 10 + SOLS[k].dm * smooth(t / LAB_MIN);
  const IOD_TYPES = { iodine: { name: '아이오딘', r: 5, speed: 100, pass: 'free', color: '#b8741a' }, starch: { name: '녹말', r: 12, speed: 55, pass: 'none', color: '#d1d5db', shape: 'chain' } };
  const POT_TYPES = { water: { name: '물', r: 4.5, speed: 115, pass: 'free', color: '#3b9eff' }, salt: { name: '소금', r: 6, speed: 75, pass: 'none', color: '#7c3aed' } };
  const IB = PHONE ? { x: 168, y: 64, w: 302, h: 270 } : { x: 346, y: 66, w: 436, h: 330 };
  const PB = PHONE ? { x: 10, y: 238, w: 460, h: 158 } : { x: 584, y: 62, w: 200, h: 300 };
  function newIodBox() {
    const b = new MBox({ x: IB.x, y: IB.y, w: IB.w, h: IB.h, memH: 40, types: IOD_TYPES, kind: 'cello', channels: [] });
    b.add('iodine', 'out', 30, true); b.add('starch', 'in', 7, true); return b;
  }
  const potWater = (k) => ({ out: 44 - SOLS[k].solute, in: 38 });
  function newPotBox(k) {
    const b = new MBox({ x: PB.x, y: PB.y, w: PB.w, h: PB.h, memH: 34, types: POT_TYPES, kind: 'lipid', channels: [], reservoir: ['water'] });
    const w = potWater(k); b.add('water', 'out', w.out, true); b.add('water', 'in', w.in, true);
    b.add('salt', 'out', SOLS[k].solute, true); b.add('salt', 'in', 6, true); return b;
  }
  function resetLab(exp) {
    const prev = S.lab;
    S.lab = { exp: exp || (prev ? prev.exp : 'iodine'), sol: prev ? prev.sol : 'dw', iod: { st: 'idle', t: 0, f: 0, box: newIodBox() }, pot: { dw: { st: 'idle', t: 0 }, ns: { st: 'idle', t: 0 }, hs: { st: 'idle', t: 0 } }, potBox: null, clk: 0 };
    S.lab.potBox = newPotBox(S.lab.sol);
    updateCtl();
  }
  function setExp(e) { if (S.lab.exp === e) return; S.lab.exp = e; Sound.click(); parts.clear(); updateCtl(); }
  function setSol(k) { if (S.lab.sol === k) return; S.lab.sol = k; S.lab.potBox = newPotBox(k); Sound.click(); updateCtl(); }
  function labRun() {
    const L = S.lab; const r = L.exp === 'iodine' ? L.iod : L.pot[L.sol];
    if (r.st === 'run') return;
    if (L.exp === 'iodine') { L.iod = { st: 'run', t: 0, f: 0, box: newIodBox() }; } else { L.pot[L.sol] = { st: 'run', t: 0 }; L.potBox = newPotBox(L.sol); }
    Sound.click(); updateCtl();
  }
  function stepLab(dt) {
    const L = S.lab;
    if (L.exp === 'iodine') {
      const r = L.iod; r.box.step(dt);
      if (r.st === 'run') { r.t = Math.min(LAB_MIN, r.t + dt * LAB_MIN / LAB_SECS); if (r.t >= LAB_MIN) { r.st = 'done'; Sound.success(); parts.burst(190, 270, { count: 16, speed: 140, size: 3.4, colors: ['#312e81', '#6366f1', '#fff'], gravity: 100 }); updateCtl(); } }
      r.f = smooth(r.t / LAB_MIN);
      IOD_TYPES.starch.color = C.mix('#d1d5db', '#3b3a8a', r.f);
    } else {
      L.potBox.step(dt);
      const r = L.pot[L.sol];
      if (r.st === 'run') { r.t = Math.min(LAB_MIN, r.t + dt * LAB_MIN / LAB_SECS); if (r.t >= LAB_MIN) { r.st = 'done'; Sound.success(); updateCtl(); } }
    }
  }
  function drawBeakerShape(x, y, w, h, liquidTop, liquidCol, label) {
    // 유리 비커 + 액체
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y + h - 10); ctx.quadraticCurveTo(x + 6, y + h, x + 16, y + h); ctx.lineTo(x + w - 16, y + h); ctx.quadraticCurveTo(x + w - 6, y + h, x + w - 4, y + h - 10); ctx.lineTo(x + w, y); ctx.closePath();
    ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(0, liquidTop, 0, y + h); g.addColorStop(0, C.rgba(liquidCol, 0.85)); g.addColorStop(1, C.rgba(C.shade(liquidCol, -0.18), 0.9)); ctx.fillStyle = g; ctx.fillRect(x, liquidTop, w, y + h - liquidTop);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, liquidTop, w, 3);
    ctx.restore();
    ctx.strokeStyle = 'rgba(80,110,150,.8)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + 8, y + 10, 5, h - 40);
    ctx.restore();
  }
  function drawIodine(dt) {
    const L = S.lab, r = L.iod, b = r.box, f = r.f;
    bgFill('#eef7f0', '#f7fbf8');
    // 비커 + 셀로판 튜브
    const bx = PHONE ? 14 : 40, by = PHONE ? 88 : 94, bw = PHONE ? 136 : 250, bh = PHONE ? 200 : 280;
    const liq = by + bh * 0.28;
    drawBeakerShape(bx, by, bw, bh, liq, '#c8872a', '');
    const tw = bw * 0.36, tx = bx + (bw - tw) / 2, ty = by - 18, th = bh * 0.82;
    // 튜브 속 녹말 용액
    const tubeCol = C.mix('#f2efe3', '#27235c', f);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + th - tw / 2); ctx.arc(tx + tw / 2, ty + th - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(tx + tw, ty); ctx.closePath();
    ctx.save(); ctx.clip();
    ctx.fillStyle = tubeCol; ctx.fillRect(tx, liq - 10, tw, th);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * (1 - f)) + ')'; for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.arc(tx + 6 + (i * 13) % (tw - 12), liq + 6 + (i * 29) % (th - 40), 2 + (i % 3), 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,150,190,.95)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    T(bx + bw / 2, by + bh + 22, PHONE ? '비커: 아이오딘 용액' : '비커: 아이오딘 용액 (황갈색)', PHONE ? 11.5 : 13.5, '#7a4b00', 'center', 800);
    T(tx + tw / 2, ty - 8, '셀로판 튜브(녹말)', PHONE ? 11 : 12.5, '#3a465c', 'center', 800);
    // 확대 연결선
    const wallX = tx + tw, wallY = liq + th * 0.35;
    ctx.strokeStyle = 'rgba(22,101,52,.55)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wallX, wallY - 12); ctx.lineTo(IB.x, IB.y + 8); ctx.moveTo(wallX, wallY + 12); ctx.lineTo(IB.x, IB.y + IB.h - 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(wallX, wallY, 14, 0, TAU); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3; ctx.stroke();
    T(wallX + 18, wallY + 28, '🔍', 20, '#000', 'left', 700);
    // 확대 상자
    ctx.save(); D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.clip();
    ctx.fillStyle = C.rgba('#c8872a', 0.26); ctx.fillRect(b.x, b.y, b.w, b.top - b.y);
    ctx.fillStyle = C.mix('#f6f3ea', '#c9c6ee', f * 0.9); ctx.fillRect(b.x, b.bot, b.w, b.y + b.h - b.bot);
    ctx.restore();
    b.drawMembrane(); b.drawParticles();
    ctx.strokeStyle = '#9bb7d8'; ctx.lineWidth = 2; D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.stroke();
    D.label(b.x + 12, b.y + 20, '비커 쪽 · 아이오딘 ' + b.alive('iodine', 'out') + '개', { bg: '#a86a12', size: PHONE ? 11.5 : 13, align: 'left' });
    D.label(b.x + 12, b.y + b.h - 20, '튜브 쪽 · 아이오딘 ' + b.alive('iodine', 'in') + '개 · 녹말 ' + b.alive('starch', 'in') + '개', { bg: '#4b4aa0', size: PHONE ? 11.5 : 13, align: 'left' });
    D.label(b.x + b.w - 10, b.memY - b.memH / 2 - 16, '🔍 셀로판막 확대', { bg: '#3b6fb0', size: PHONE ? 11 : 12.5, align: 'right' });
    // 시간·관찰
    const ty2 = PHONE ? 350 : 408, x = PHONE ? 10 : 24, w = VW - x * 2;
    panel(x, ty2, w, PHONE ? 196 : 150, 16);
    T(x + 16, ty2 + 26, '⏱️ 경과 시간 ' + Math.round(r.t) + '분 / 30분', PHONE ? 14 : 16, '#26324a', 'left', 800);
    D.roundRect(x + 16, ty2 + 36, w - 32, 12, 6); ctx.fillStyle = '#e8ecf4'; ctx.fill();
    if (r.t > 0) { D.roundRect(x + 16, ty2 + 36, Math.max(12, (w - 32) * r.t / LAB_MIN), 12, 6); ctx.fillStyle = '#16a34a'; ctx.fill(); }
    const colName = f < 0.15 ? '우윳빛(녹말 용액)' : f < 0.85 ? '점점 푸른빛' : '청람색(검푸른색)';
    const bw2 = (w - 48) / 2;
    [['셀로판 튜브 속', colName, tubeCol], ['비커 속 아이오딘 용액', '황갈색 그대로', '#c8872a']].forEach((o, i) => {
      const cx0 = x + 16 + i * (bw2 + 16), cy0 = ty2 + 62;
      D.roundRect(cx0, cy0, bw2, PHONE ? 70 : 46, 12); ctx.fillStyle = '#f3f6fa'; ctx.fill();
      D.sphere(cx0 + 24, cy0 + (PHONE ? 22 : 23), 13, o[2], { gloss: true });
      T(cx0 + 46, cy0 + 19, o[0], PHONE ? 12 : 12.5, '#5a6679', 'left', 800); T(cx0 + 46, cy0 + 38, o[1], PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    });
    if (r.st === 'done') { textBlock(x + 16, ty2 + (PHONE ? 152 : 122), w - 32, '아이오딘은 셀로판막을 지나 튜브 안으로 들어가 녹말과 만나 청람색이 되었어요. 녹말은 막을 지나지 못해서 비커 용액은 색이 변하지 않았어요.', PHONE ? 13 : 13, '#166534', 18, 800); }
    else if (r.st === 'idle') T(x + 16, ty2 + (PHONE ? 160 : 126), '▶ 30분 지나기를 눌러 시작해요', PHONE ? 13 : 14, '#5a6679', 'left', 700);
    parts.update(dt); parts.draw(ctx);
  }
  function drawPotato(dt) {
    const L = S.lab, b = L.potBox, k = L.sol;
    bgFill('#eef7f0', '#f7fbf8');
    const bw = PHONE ? 130 : 150, bh = PHONE ? 104 : 160, by = PHONE ? 62 : 78;
    const xs = PHONE ? [12, 175, 338] : [34, 214, 394];
    SKEYS.forEach((s, i) => {
      const r = L.pot[s], x = xs[i], sel = s === k;
      const cur = potMass(s, r.t);
      if (sel) { D.roundRect(x - 8, by - 12, bw + 16, bh + (PHONE ? 66 : 82), 14); ctx.fillStyle = 'rgba(22,163,74,.12)'; ctx.fill(); }
      drawBeakerShape(x, by, bw, bh, by + bh * 0.3, SOLS[s].color, '');
      // 감자 조각 (질량에 따라 크기가 변해요, 변화를 알아보기 쉽게 과장해서 그려요)
      const sz = 1 + (cur - 10) / 10 * 1.2;
      const pw = bw * 0.46 * sz, ph = bh * 0.3 * sz;
      D.shadow(() => { D.roundRect(x + bw / 2 - pw / 2, by + bh - ph - 8, pw, ph, 12); ctx.fillStyle = '#e6c27a'; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.fillStyle = 'rgba(160,110,40,.35)'; for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.arc(x + bw / 2 - pw / 2 + 10 + (j * 17) % (pw - 16), by + bh - ph + 2 + (j * 11) % (ph - 12), 2.2, 0, TAU); ctx.fill(); }
      T(x + bw / 2, by + bh + 20, SOLS[s].name, PHONE ? 11.5 : 13.5, '#26324a', 'center', 800);
      T(x + bw / 2, by + bh + 40, r.st === 'idle' ? '10.0 g' : cur.toFixed(1) + ' g', PHONE ? 14 : 16, r.st === 'done' ? (SOLS[s].dm > 0 ? '#0b6b39' : SOLS[s].dm < 0 ? '#c0392b' : '#26324a') : '#26324a', 'center', 800);
      if (r.st === 'run') T(x + bw / 2, by - 6, Math.round(r.t) + '분', PHONE ? 11.5 : 12.5, '#5a6679', 'center', 800);
    });
    // 확대 상자 (선택한 용액)
    ctx.save(); D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.clip();
    ctx.fillStyle = C.rgba(SOLS[k].color, 0.7); ctx.fillRect(b.x, b.y, b.w, b.top - b.y);
    ctx.fillStyle = '#f5e9c8'; ctx.fillRect(b.x, b.bot, b.w, b.y + b.h - b.bot);
    ctx.restore();
    b.drawMembrane(); b.drawParticles();
    ctx.strokeStyle = '#9bb7d8'; ctx.lineWidth = 2; D.roundRect(b.x, b.y, b.w, b.h, 14); ctx.stroke();
    const wo = b.alive('water', 'out'), wi = b.alive('water', 'in'), diff = wo - wi;
    D.label(b.x + 10, b.y + 18, SOLS[k].name, { bg: '#3b6fb0', size: PHONE ? 11 : 12.5, align: 'left' });
    D.label(b.x + 10, b.y + b.h - 18, '감자 세포 안', { bg: '#a9791f', size: PHONE ? 11 : 12.5, align: 'left' });
    if (PHONE) D.label(b.x + b.w - 8, b.y + b.h - 18, '🔍 감자 세포막 확대', { bg: '#7a5a1a', size: 11, align: 'right' }); else D.label(b.x + b.w / 2, b.y - 12, '🔍 감자 세포막 확대', { bg: '#7a5a1a', size: 12 });
    // 입자 범례 (물 / 소금)
    { const lgx = b.x + b.w - (PHONE ? 8 : 4), lgy = PHONE ? b.y + 18 : b.y + b.h + 22; D.sphere(lgx - (PHONE ? 118 : 108), lgy, 5, '#3b9eff', { gloss: false }); T(lgx - (PHONE ? 110 : 100), lgy + 4, '물', PHONE ? 11 : 12, '#26324a', 'left', 800); D.sphere(lgx - (PHONE ? 70 : 62), lgy, 5, '#7c3aed', { gloss: false }); T(lgx - (PHONE ? 62 : 54), lgy + 4, '소금', PHONE ? 11 : 12, '#26324a', 'left', 800); }
    const ax = b.x + b.w - (PHONE ? 40 : 34);
    if (Math.abs(diff) >= 3) {
      const down = diff > 0;
      const y0 = down ? b.top - 26 : b.bot + 26, y1 = down ? b.bot + 26 : b.top - 26;
      D.arrow(ax, y0, ax, y1, { color: '#2563eb', width: clamp(Math.abs(diff) / 3, 4, 9) });
      D.label(ax - 14, down ? b.bot + 40 : b.top - 40, down ? '물이 감자 안으로' : '물이 감자 밖으로', { bg: '#2563eb', size: PHONE ? 10.5 : 12, align: 'right' });
    } else D.label(b.x + b.w - 8, b.memY + b.memH / 2 + 22, '물의 이동이 거의 없어요', { bg: '#64748b', size: PHONE ? 10.5 : 12, align: 'right' });
    // 변화율 그래프
    drawPotChart();
    parts.update(dt); parts.draw(ctx);
  }
  function drawPotChart() {
    const L = S.lab, x0 = PHONE ? 60 : 70, x1 = PHONE ? 456 : 540, y0 = PHONE ? 428 : 330, y1 = PHONE ? 600 : 530, zero = (y0 + y1) / 2 + 4;
    const px = (PHONE ? 10 : 20), pw = (PHONE ? 460 : 546);
    panel(px, y0 - 36, pw, y1 - y0 + 66, 16);
    T(px + 16, y0 - 14, '30분 뒤 감자의 질량 변화 (%)', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const sc = (zero - y0) / 15;
    for (let v = -15; v <= 15; v += 5) { const y = zero - v * sc; ctx.strokeStyle = v === 0 ? '#516079' : 'rgba(120,135,160,.22)'; ctx.lineWidth = v === 0 ? 2 : 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); T(x0 - 8, y + 5, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v), 12, '#3a465c', 'right', 800); }
    const bwid = PHONE ? 70 : 90, gap = (x1 - x0) / 3;
    SKEYS.forEach((s, i) => {
      const r = L.pot[s], cx = x0 + gap * (i + 0.5);
      const cur = potMass(s, r.t), pct = (cur - 10) / 10 * 100;
      T(cx, y1 + 22, SOLS[s].name, PHONE ? 11.5 : 13, '#26324a', 'center', 800);
      if (r.st === 'idle') { T(cx, zero - 8, '?', 16, '#98a2b3', 'center', 800); return; }
      const h = clamp(pct, -15, 15) * sc;
      if (Math.abs(pct) > 0.04) { D.roundRect(cx - bwid / 2, Math.min(zero, zero - h), bwid, Math.abs(h), 4); ctx.fillStyle = pct > 0 ? '#16a34a' : '#e2464b'; ctx.fill(); }
      T(cx, (pct >= 0 ? zero - h - 8 : zero - h + 18), (pct > 0.04 ? '+' : pct < -0.04 ? '−' : '') + Math.abs(pct).toFixed(0) + ' %', PHONE ? 13 : 15, '#26324a', 'center', 800);
    });
  }
  $$('#expSeg button').forEach((b) => b.addEventListener('click', () => setExp(b.dataset.exp)));
  $$('#solSeg button').forEach((b) => b.addEventListener('click', () => setSol(b.dataset.sol)));
  $('#bLabRun').addEventListener('click', labRun);
  $('#bLabReset').addEventListener('click', () => { Sound.click(); parts.clear(); resetLab(); });

  /* ================= ④ 삼투 적용: 적혈구 ================= */
  const RBX = PHONE ? 240 : 300, RBY = PHONE ? 190 : 250, RR = PHONE ? 54 : 74;
  const RB_BOX = PHONE ? { x: 10, y: 62, w: 460, h: 262 } : { x: 20, y: 62, w: 560, h: 440 };
  const rbTarget = (c) => (c < 0.9 ? 1 + 0.55 * (0.9 - c) / 0.9 : Math.max(0.6, 1 - 0.4 * (c - 0.9) / 1.0));
  function resetRbc(c) {
    const prev = S.rb;
    S.rb = { c: c != null ? c : (prev ? prev.c : 0.9), s: 1, burst: false, bt: 0, seen: prev ? prev.seen : {}, settle: 0, salts: [], frags: [], alpha: 1, flowT: 0 };
    updateCtl();
  }
  function setConc(c) { c = clamp(Math.round(c * 10) / 10, 0, 3); const r = S.rb; if (Math.abs(c - 0.9) < 0.05) r.pick = true; if (r.c === c) return; r.c = c; if (r.burst && c >= 0.4) { r.burst = false; r.s = 1; r.frags = []; r.alpha = 0; } updateCtl(); }
  function rbState(r) { return r.burst ? '터졌어요' : r.s > 1.08 ? '부풀어 올라요' : r.s < 0.92 ? '쭈그러들어요' : '정상이에요'; }
  function rbWater(c) { return c < 0.85 ? 'in' : c > 0.95 ? 'out' : 'none'; }
  function stepRbc(dt) {
    const r = S.rb, tg = rbTarget(r.c);
    r.alpha = Math.min(1, r.alpha + dt * 2.5);
    if (!r.burst) {
      r.s = SciSim.approach(r.s, tg, dt, RM ? 60 : 2.2);
      if (r.s >= 1.45) {
        r.burst = true; r.bt = 0; Sound.fail();
        for (let i = 0; i < 34; i++) { const a = rnd(0, TAU), sp = rnd(40, 150); r.frags.push({ x: RBX, y: RBY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rnd(3, 8), a: 1 }); }
      }
    } else { r.bt += dt; r.frags.forEach((f) => { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= Math.exp(-1.2 * dt); f.vy *= Math.exp(-1.2 * dt); f.a = Math.max(0.35, f.a - dt * 0.15); }); }
    // 감시: 각 상태를 충분히 보았는지
    const settled = r.burst || Math.abs(r.s - tg) < 0.03;
    r.settle = settled ? r.settle + dt : 0;
    if (r.settle > 0.8) { if (r.c <= 0.3) r.seen.hypo = true; if (Math.abs(r.c - 0.9) < 0.05 && r.pick) r.seen.iso = true; if (r.c >= 2.0) r.seen.hyper = true; }
    // 소금 입자 (세포 안으로 들어가지 못해요)
    const want = Math.round(r.c * 14);
    while (r.salts.length < want) r.salts.push({ x: rnd(RB_BOX.x + 10, RB_BOX.x + RB_BOX.w - 10), y: rnd(RB_BOX.y + 10, RB_BOX.y + RB_BOX.h - 10), vx: rnd(-40, 40), vy: rnd(-40, 40), a: 0, die: false });
    r.salts.forEach((p, i) => { if (i >= want) p.die = true; else p.die = false; });
    const cr = RR * r.s * 1.05 + 4;
    for (let i = r.salts.length - 1; i >= 0; i--) {
      const p = r.salts[i];
      p.a = p.die ? p.a - dt * 3 : Math.min(1, p.a + dt * 2); if (p.die && p.a <= 0) { r.salts.splice(i, 1); continue; }
      p.vx += rnd(-90, 90) * dt; p.vy += rnd(-90, 90) * dt; const sp = Math.hypot(p.vx, p.vy); if (sp > 55) { p.vx *= 55 / sp; p.vy *= 55 / sp; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < RB_BOX.x + 8) { p.x = RB_BOX.x + 8; p.vx = Math.abs(p.vx); } if (p.x > RB_BOX.x + RB_BOX.w - 8) { p.x = RB_BOX.x + RB_BOX.w - 8; p.vx = -Math.abs(p.vx); }
      if (p.y < RB_BOX.y + 8) { p.y = RB_BOX.y + 8; p.vy = Math.abs(p.vy); } if (p.y > RB_BOX.y + RB_BOX.h - 8) { p.y = RB_BOX.y + RB_BOX.h - 8; p.vy = -Math.abs(p.vy); }
      if (!r.burst) { const dx = p.x - RBX, dy = p.y - RBY, d = Math.hypot(dx, dy); if (d < cr + 5) { const nx = dx / (d || 1), ny = dy / (d || 1); p.x = RBX + nx * (cr + 5); p.y = RBY + ny * (cr + 5); const dot = p.vx * nx + p.vy * ny; if (dot < 0) { p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny; } } }
    }
    r.flowT += dt;
  }
  function drawRbcCell(x, y, R, s, burstAlpha) {
    ctx.save(); ctx.globalAlpha = burstAlpha;
    const crenate = s < 0.95 ? clamp((0.95 - s) / 0.35, 0, 1) : 0, n = 18;
    ctx.beginPath();
    for (let i = 0; i <= 90; i++) {
      const a = i / 90 * TAU; let rr = R * s;
      if (crenate > 0) rr += Math.pow(Math.max(0, Math.cos(a * n / 2)), 6) * R * 0.2 * crenate;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(x - R * 0.3 * s, y - R * 0.35 * s, R * 0.1, x, y, R * s * 1.1); g.addColorStop(0, '#f87171'); g.addColorStop(0.6, '#dc2626'); g.addColorStop(1, '#991b1b');
    D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 12, y: 4, color: 'rgba(120,20,20,.35)' });
    // 가운데 오목한 부분 (부풀수록, 쭈그러들수록 사라져요)
    const dimple = clamp(1 - Math.abs(s - 1) / 0.28, 0, 1);
    if (dimple > 0.02) { ctx.strokeStyle = 'rgba(120,20,20,' + (0.35 * dimple) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, R * 0.5 * s, 0, TAU); ctx.stroke(); const dg = ctx.createRadialGradient(x, y, 0, x, y, R * 0.5 * s); dg.addColorStop(0, 'rgba(254,205,205,' + (0.9 * dimple) + ')'); dg.addColorStop(1, 'rgba(254,205,205,' + (0.25 * dimple) + ')'); ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(x, y, R * 0.5 * s, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(x - R * 0.35 * s, y - R * 0.42 * s, R * 0.22 * s, R * 0.11 * s, -0.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawRbc(dt) {
    const r = S.rb, c = r.c, bx = RB_BOX;
    bgFill('#eef7f0', '#f7fbf8');
    // 용액
    ctx.save(); D.roundRect(bx.x, bx.y, bx.w, bx.h, 18); ctx.clip();
    ctx.fillStyle = C.mix('#e0f0ff', '#93bfe8', c / 3); ctx.fillRect(bx.x, bx.y, bx.w, bx.h);
    ctx.restore();
    ctx.strokeStyle = '#8fb0d4'; ctx.lineWidth = 3; D.roundRect(bx.x, bx.y, bx.w, bx.h, 18); ctx.stroke();
    // 소금 입자
    r.salts.forEach((p) => { ctx.globalAlpha = clamp(p.a, 0, 1); D.sphere(p.x, p.y, 4.5, '#fbbf24', { gloss: false }); }); ctx.globalAlpha = 1;
    // 물 흐름 화살표
    const dirW = rbWater(c), mag = Math.abs(c - 0.9);
    if (!r.burst && dirW !== 'none') {
      const n = 10, len = clamp(mag * 22, 10, 40);
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + 0.2, ph = (r.flowT * 0.7 + i * 0.37) % 1, rr = RR * r.s + 14 + (dirW === 'in' ? (1 - ph) : ph) * len;
        const px = RBX + Math.cos(a) * rr, py = RBY + Math.sin(a) * rr;
        ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.95; D.sphere(px, py, 4, '#3b9eff', { gloss: false });
      }
      ctx.globalAlpha = 1;
      const aa = -0.6, r0 = RR * r.s + 18, r1 = r0 + 46;
      const x1 = RBX + Math.cos(aa) * (dirW === 'in' ? r1 : r0), y1 = RBY + Math.sin(aa) * (dirW === 'in' ? r1 : r0), x2 = RBX + Math.cos(aa) * (dirW === 'in' ? r0 : r1), y2 = RBY + Math.sin(aa) * (dirW === 'in' ? r0 : r1);
      D.arrow(x1, y1, x2, y2, { color: '#2563eb', width: 5, label: dirW === 'in' ? '물이 안으로' : '물이 밖으로', labelOffset: -16 });
    }
    // 세포
    if (r.burst) {
      const cloud = Math.min(1, r.bt * 1.5);
      D.glow(RBX, RBY, 130 * (0.4 + cloud * 0.6), '#ef4444', 0.45 * (1 - Math.min(1, r.bt / 4) * 0.5));
      r.frags.forEach((f) => { ctx.globalAlpha = f.a; D.sphere(f.x, f.y, f.r, '#dc2626', { gloss: false }); }); ctx.globalAlpha = 1;
      D.label(RBX, RBY - 6, '💥 터졌어요 (용혈)', { bg: '#b91c1c', size: PHONE ? 13 : 15 });
    } else drawRbcCell(RBX, RBY, RR, r.s, r.alpha);
    // 라벨
    D.label(RBX, RBY + RR * Math.max(r.s, 1) + (PHONE ? 30 : 38), '적혈구 (안쪽 농도 약 0.9 %)', { bg: '#7f1d1d', size: PHONE ? 12 : 14 });
    const title = c === 0 ? '증류수' : Math.abs(c - 0.9) < 0.05 ? '생리식염수 (0.9 %)' : c >= 2.5 ? '농축 소금물' : c > 0.9 ? '진한 소금물' : '묽은 소금물';
    D.label(bx.x + 12, bx.y + 20, '🧂 ' + title + ' ' + c.toFixed(1) + ' %', { bg: '#3b6fb0', size: PHONE ? 12 : 14, align: 'left' });
    // 상태 설명 패널
    const px = PHONE ? 10 : 600, py = PHONE ? 336 : 62, pw = PHONE ? 460 : 184, ph = PHONE ? 130 : 260;
    panel(px, py, pw, ph, 16);
    T(px + 14, py + 28, '🩸 지금 상태', PHONE ? 14 : 15, '#26324a', 'left', 800);
    const st = rbState(r), w = rbWater(c);
    const why = r.burst ? '바깥 농도가 너무 낮아 물이 너무 많이 들어와 세포막이 견디지 못했어요.' : w === 'in' ? '바깥 용액이 더 묽어서(농도가 낮아서) 물이 세포 안으로 이동해요.' : w === 'out' ? '바깥 용액이 더 진해서(농도가 높아서) 물이 세포 밖으로 빠져나가요.' : '안과 밖의 농도가 같아서 물의 이동이 거의 없어요.';
    D.roundRect(px + 12, py + 40, pw - 24, 36, 10); ctx.fillStyle = r.burst ? '#fdeceb' : st === '정상이에요' ? '#e7f7ee' : '#fff4d6'; ctx.fill();
    T(px + pw / 2, py + 63, '적혈구 ' + st, PHONE ? 14 : 15, '#26324a', 'center', 800);
    textBlock(px + 14, py + 98, pw - 28, why, PHONE ? 13 : 13.5, '#3a465c', 19, 700);
    parts.update(dt); parts.draw(ctx);
  }
  $('#sConc').addEventListener('input', (e) => { setConc(+e.target.value); Sound.tick(); });
  $$('#concChips button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setConc(+b.dataset.c); }));

  /* ---------- 물의 이동 연결 (4단계) ---------- */
  const WOPTS = [['in', '물이 세포 안으로 이동'], ['out', '물이 세포 밖으로 이동'], ['none', '물의 이동이 거의 없음']];
  const MATCH = [
    ['🥬 배추를 소금에 절이면 배추 세포에서', 'out'], ['🌊 바닷물(약 3.5 %)을 마시면 우리 몸 세포에서', 'out'],
    ['💉 생리식염수(0.9 %) 링거를 맞을 때 적혈구에서', 'none'], ['🧅 양파 표피 세포를 진한 소금물에 담그면 세포에서', 'out'], ['🥬 시든 시금치를 맹물에 담그면 세포에서', 'in'],
  ];
  const matchSel = [];
  MATCH.forEach((m, i) => {
    const row = document.createElement('div'); row.className = 'sel-row';
    row.innerHTML = '<div class="q">' + (i + 1) + '. ' + m[0] + '</div>';
    const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', (i + 1) + '번 사례에서 물의 이동');
    sel.innerHTML = '<option value="">— 고르기 —</option>' + WOPTS.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
    sel.addEventListener('change', () => { S.match[i] = sel.value; sel.classList.remove('ok', 'bad'); delete S.matchOK[i]; Sound.click(); });
    row.appendChild(sel); $('#matchRows').appendChild(row); matchSel.push(sel);
  });
  function resetMatch() { S.match = {}; S.matchOK = {}; matchSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ---------- 읽음 칸 ---------- */
  const iodColor = (f) => (f < 0.15 ? '우윳빛' : f < 0.85 ? '점점 푸른빛' : '청람색');
  let rlast = '';
  function readouts() {
    let a, b, c, L1, L2, L3;
    if (S.mode === 'cell') {
      const it = S.cell.items, n = it.filter((x) => x.zone).length;
      L1 = '분류한 카드'; a = n + ' / 6'; L2 = '세포막'; b = S.cell.memTarget ? '있음' : '없음'; L3 = '안 ⬇ · 밖 ⬆'; c = it.filter((x) => x.zone === 'in').length + ' · ' + it.filter((x) => x.zone === 'out').length;
    } else if (S.mode === 'model') {
      const m = S.md, k = m.sel, cr = m.box.cross[k];
      L1 = '시험 중인 입자'; a = TYPES[k].name; L2 = '세포 밖 · 안'; b = m.box.alive(k, 'out') + ' · ' + m.box.alive(k, 'in') + '개'; L3 = '막을 지난 횟수 ⬇ · ⬆'; c = cr.down + ' · ' + cr.up;
    } else if (S.mode === 'lab') {
      const L = S.lab;
      if (L.exp === 'iodine') { L1 = '경과 시간'; a = Math.round(L.iod.t) + '분'; L2 = '튜브 속 색'; b = iodColor(L.iod.f); L3 = '비커 속 색'; c = '황갈색'; }
      else { const r = L.pot[L.sol]; const cur = potMass(L.sol, r.t), pct = (cur - 10) / 10 * 100; L1 = '담근 용액'; a = SOLS[L.sol].name; L2 = '감자 질량'; b = (r.st === 'idle' ? 10 : cur).toFixed(1) + ' g'; L3 = '질량 변화'; c = (r.st === 'idle' ? '—' : (pct > 0.04 ? '+' : pct < -0.04 ? '−' : '') + Math.abs(pct).toFixed(0) + ' %'); }
    } else {
      const r = S.rb, w = rbWater(r.c);
      L1 = '소금물 농도'; a = r.c.toFixed(1) + ' %'; L2 = '적혈구'; b = rbState(r); L3 = '물의 이동'; c = w === 'in' ? '세포 안으로' : w === 'out' ? '세포 밖으로' : '거의 없음';
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const levels = [
    {
      title: '살아 있는 시스템: 물질은 어떻게 드나들까?', short: '생명 시스템', icon: '🫧', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 살아 있는 세포는 어떻게 필요한 것만 받아들이고 필요 없는 것은 내보낼까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 세포가 생물의 기본 단위이고, 세포막이 물질의 출입을 조절한다는 것과 입자가 퍼져 나가는 <b>확산</b>을 배웠어요.</div>' +
        '<p>세포 하나는 하나의 <b>생명 시스템</b>이에요. 시스템이 유지되려면 여러 <b>화학 반응</b>(다음 차시)과 <b>물질 출입</b>이 필요해요. 어떤 물질이 들어오고 나가는지 분류해 봐요.</p>',
      features: ['cell'],
      setup() { S.cell = null; resetCell(false); setScene('cell'); },
      recap: '세포는 산소·포도당·아미노산 같은 물질을 받아들이고, 이산화 탄소·요소·암모니아 같은 노폐물을 내보내요. 세포막이 있어야 세포 내용물이 유지돼요.',
      summary: '<ul><li>세포는 <b>생명 시스템의 기본 단위</b>예요. 유지되려면 <b>화학 반응</b>과 <b>물질 출입</b>이 필요해요.</li><li><b>들어오는 물질</b>: 산소, 포도당, 아미노산 등 (에너지와 몸의 재료)</li><li><b>나가는 물질</b>: 이산화 탄소, 요소, 암모니아 등 (노폐물)</li><li><b>세포막</b>이 없으면 세포 내용물이 흩어져 세포를 유지할 수 없어요.</li></ul>',
      missions: [
        {
          title: '들어오는 물질과 나가는 물질 분류', manual: true,
          goal: '카드 6장을 끌어서 <b>세포 안으로 들어오는 물질</b>은 세포에, <b>세포 밖으로 나가는 물질</b>은 오른쪽(또는 아래) 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '세포는 세포 호흡에 쓸 산소·포도당과 몸의 재료(아미노산)를 받아들이고, 반응으로 생긴 이산화 탄소와 질소 노폐물(요소·암모니아)을 내보내요.',
          setup() { S.cell.flow = false; setScene('cell'); },
          check() {
            const c = S.cell, miss = c.items.filter((it) => !it.zone);
            if (miss.length) return '아직 놓지 않은 카드가 ' + miss.length + '장 있어요. 세포 안이나 세포 밖 칸에 놓아 보세요.';
            const wrong = c.items.filter((it) => it.zone !== it.dir);
            c.items.forEach((it) => { const bad = it.zone !== it.dir; if (bad && !it.bad) { it.bad = true; it.shake = 1; } if (!bad) it.bad = false; });
            if (wrong.length) return '빨간 카드는 반대쪽이에요: ' + wrong.map((it) => SHORT[it.id]).join(', ') + '. 세포가 필요로 하는 물질은 받아들이고, 노폐물은 내보내요.';
            c.flow = true; return true;
          },
          status: () => '놓은 카드 ' + S.cell.items.filter((it) => it.zone).length + ' / 6',
          explain: '<b>들어오는 물질</b>: 산소(세포 호흡), 포도당(에너지원), 아미노산(단백질 재료). <b>나가는 물질</b>: 이산화 탄소(세포 호흡 결과), 요소와 암모니아(단백질 분해로 생긴 노폐물). 이 물질들은 모두 <b>세포막을 통해</b> 드나들어요.',
        },
        {
          type: 'quiz', title: '생명 시스템에 물질 출입이 필요한 까닭',
          goal: '세포막을 없애 보고 알아봐요. <b>세포(생명 시스템)가 유지되려면 물질 출입이 필요한 까닭</b>은?',
          setup() { S.cell.flow = true; setScene('cell'); },
          choices: ['세포가 살아가는 데 필요한 물질을 받아들이고 노폐물을 내보내야 해서', '세포막이 모든 물질을 막아야 세포가 안전해서', '세포 안의 물질은 하나도 바뀌지 않아야 해서', '핵이 필요한 물질을 모두 스스로 만들어서'],
          answer: 0,
          feedback: ['', '세포막이 모든 물질을 막으면 영양소를 받지도 노폐물을 내보내지도 못해 세포가 살 수 없어요.', '세포 안에서는 화학 반응이 계속 일어나서 물질이 끊임없이 바뀌어요. 그래서 새 물질이 들어오고 노폐물이 나가야 해요.', '핵은 유전 정보를 가지고 있지만 포도당·산소 같은 물질을 스스로 만들지는 못해요.'],
          explain: '세포 안에서는 에너지를 얻고 몸을 만드는 <b>화학 반응</b>이 계속 일어나요. 그러려면 <b>재료(산소·포도당·아미노산)를 받아들이고 노폐물(이산화 탄소·요소 등)을 내보내는 물질 출입</b>이 필요하고, 이 출입을 <b>세포막</b>이 맡아요.',
        },
      ],
    },
    {
      title: '막 모형: 선택적 투과와 확산', short: '막 모형', icon: '🔍', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 세포막을 통해 필요한 물질은 들어오고 노폐물은 나간다는 것을 확인했어요. <b>🔍 입자 모형</b>으로 세포막을 확대해서 어떤 입자가 어떻게 통과하는지 봐요.</div>' +
        '<p>세포막은 <b>인지질 이중층</b>에 <b>단백질 통로</b>가 박혀 있어요. 입자를 바꿔 가며 통과 여부를 시험하고, 입자가 많은 쪽에서 적은 쪽으로 퍼지는 <b>확산</b>도 관찰해요.</p>',
      features: ['model'],
      setup() { S.md = null; S.showPred = false; resetModel(); setScene('model'); },
      recap: '세포막은 물질에 따라 통과시키는 것이 달라요(선택적 투과). 작은 입자는 막을 통과하고, 이온은 단백질 통로로만, 큰 입자는 통과하지 못해요. 입자는 많은 쪽에서 적은 쪽으로 퍼져요.',
      summary: '<ul><li>세포막 = <b>인지질 이중층</b> + <b>단백질 통로</b> (그림 모형)</li><li><b>물·산소</b>(작은 입자)는 막을 직접 통과, <b>이온</b>은 단백질 통로로만, <b>녹말·단백질</b>(큰 입자)은 통과하지 못해요 → <b>선택적 투과</b></li><li><b>확산</b>: 입자가 농도가 높은 쪽에서 낮은 쪽으로 퍼지는 현상 (통과할 수 있는 입자에서 일어나요)</li><li>양쪽 농도가 같아지면 이동이 거의 없어요(겉보기 이동이 없을 뿐 입자는 계속 움직여요).</li></ul>',
      missions: [
        {
          title: '입자 5종의 통과 시험',
          goal: '<b>물 · 산소 · 이온 · 녹말 · 단백질</b>을 차례로 골라 세포막을 통과하는지 시험하고, 오른쪽 결과표를 모두 채우세요.',
          hint: '입자를 고르면 세포 밖에 입자가 놓여요. 몇 초 기다리며 막을 지나가는지 관찰하세요. 이온은 단백질 통로 쪽을 잘 보세요.',
          setup() { S.showPred = false; setScene('model'); updateCtl(); },
          check: () => TKEYS.every((k) => S.md.ts[k].res),
          hold: 0.6,
          status: () => TKEYS.map((k) => mark(!!S.md.ts[k].res) + TYPES[k].name.split(' ')[0]).join(' &nbsp; '),
          explain: '<b>물과 산소</b>는 작아서 인지질 사이로 지나가고, <b>이온</b>은 전하를 띠어서 <b>단백질 통로</b>(문이 열릴 때)로만 지나가요. <b>녹말과 단백질</b>은 너무 커서 통과하지 못해요. 이렇게 물질에 따라 다르게 통과시키는 성질이 <b>선택적 투과</b>예요.',
        },
        {
          title: '확산 방향 맞추기', manual: true,
          goal: '세포 안의 산소가 <b>30개</b>, 세포 밖은 <b>6개</b>예요. 산소는 어느 쪽으로 이동할지 예측을 고르고, 입자가 5개 이상 순수하게 이동하는 것을 확인한 뒤 <b>✔ 확인하기</b>를 누르세요.',
          hint: '입자는 많은 쪽에서 적은 쪽으로 퍼져요. 왼쪽 ‘막을 지난 횟수’의 ⬇(안으로)와 ⬆(밖으로) 숫자를 비교해 보세요.',
          setup() {
            S.showPred = true; setScene('model');
            S.md.pred = null; selectType('oxygen'); const t = S.md.ts.oxygen; t.out = 6; t.in = 30; S.md.box.syncTo('oxygen', 6, 30);
            S.md.box.cross.oxygen.down = 0; S.md.box.cross.oxygen.up = 0; updateCtl();
          },
          check() {
            const m = S.md, cr = m.box.cross.oxygen;
            if (!m.pred) return '먼저 위에서 산소가 이동할 방향을 예측해 골라요.';
            if (m.pred === 'down') return '입자는 많은 쪽에서 적은 쪽으로 퍼져요. 지금 세포 안과 밖 중 산소가 더 많은 쪽은 어디인가요?';
            const net = cr.up - cr.down;
            if (net < 5) return '예측이 맞아요! 이제 산소가 밖으로 순수하게 5개 이상 이동할 때까지 기다려 보세요. (지금 순 이동 ' + Math.max(0, net) + '개)';
            return true;
          },
          status: () => '예측 ' + (S.md.pred ? (S.md.pred === 'up' ? '⬆ 밖으로' : '⬇ 안으로') : '—') + ' &nbsp; 밖으로 순 이동 ' + Math.max(0, S.md.box.cross.oxygen.up - S.md.box.cross.oxygen.down) + ' / 5개',
          explain: '산소는 <b>많은 쪽(세포 안)에서 적은 쪽(세포 밖)</b>으로 이동해요. 입자는 계속 무작위로 움직이는데, 많은 쪽에서 적은 쪽으로 가는 입자가 더 많아서 전체적으로 <b>농도가 높은 곳에서 낮은 곳으로 확산</b>이 일어나요.',
        },
        {
          type: 'quiz', title: '선택적 투과란?',
          goal: '세포막의 <b>선택적 투과</b>를 가장 잘 설명한 것은?',
          setup() { S.showPred = false; setScene('model'); updateCtl(); },
          choices: ['세포막은 모든 물질을 막아서 아무것도 통과시키지 않는다', '세포막은 모든 물질을 똑같이 통과시킨다', '물질의 종류에 따라 통과시키는 것과 통과시키지 못하는 것이 다르다', '세포 안에서 만든 물질만 세포 밖으로 나갈 수 있다'],
          answer: 2,
          feedback: ['모든 물질을 막으면 세포가 살 수 없어요. 방금 물과 산소는 막을 통과했죠.', '녹말과 단백질은 통과하지 못했어요. 통과시키는 물질이 정해져 있어요.', '', '세포 밖의 산소처럼 안으로 들어오는 물질도 있어요. 방향이 아니라 물질의 종류에 따라 달라요.'],
          explain: '세포막은 <b>작은 입자(물·산소)는 통과</b>시키고, <b>이온은 단백질 통로로만</b>, <b>큰 입자(녹말·단백질)는 통과시키지 않아요</b>. 이처럼 물질에 따라 선택해서 통과시키는 것을 <b>선택적 투과</b>라고 해요. 세포막이 모든 물질을 막는 것은 아니에요.',
        },
      ],
    },
    {
      title: '막 통과 실험: 아이오딘과 감자', short: '막 통과 실험', icon: '🧪', phase: '실험',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 막 모형으로 작은 입자는 통과하고 큰 입자는 통과하지 못하는 것을 봤어요. 이제 <b>실제 실험</b>으로 확인해 봐요. (가상 실험, 30분을 12초로 보여 줘요.)</div>' +
        '<p>① <b>셀로판 튜브</b>(반투과성 막: 물과 작은 분자만 통과)에 녹말 용액을 넣고 아이오딘 용액에 담가요. ② <b>감자 조각</b>을 증류수·생리식염수·10 % 소금물에 30분 담가 질량 변화를 재요. 🔍 <b>물 분자의 이동</b>도 함께 볼 수 있어요.</p>',
      features: ['lab'],
      setup() { S.lab = null; resetLab('iodine'); setScene('lab'); },
      recap: '아이오딘은 셀로판막을 통과해 튜브 안 녹말과 반응(청람색)했지만 녹말은 통과하지 못했어요. 감자는 물이 농도가 낮은 쪽에서 높은 쪽으로 이동해 질량이 변했어요.',
      summary: '<ul><li><b>셀로판 튜브</b>(반투과성 막): 아이오딘(작은 입자)은 통과 → 튜브 안이 <b>청람색</b>, 녹말(큰 입자)은 통과 못함 → 비커 용액은 <b>황갈색 그대로</b></li><li><b>삼투</b>: 물이 반투과성 막을 통해 <b>농도가 낮은 용액 → 높은 용액</b>으로 이동하는 현상</li><li>감자 10.0 g, 30분 후: <b>증류수 11.0 g (+10 %)</b>, <b>0.9 % 생리식염수 10.0 g (변화 없음)</b>, <b>10 % 소금물 8.8 g (−12 %)</b></li><li>감자 세포액 농도는 약 0.9 %예요. 바깥이 더 묽으면 물이 들어오고, 더 진하면 빠져나가요.</li></ul>',
      missions: [
        {
          title: '아이오딘–녹말 실험',
          goal: '<b>▶ 30분 지나기</b>를 눌러 아이오딘 용액 속 셀로판 튜브(녹말)가 어떻게 변하는지 끝까지 관찰하세요.',
          hint: '화면 오른쪽 🔍 확대 상자에서 작은 아이오딘 입자가 막을 지나 튜브 쪽으로 가는 모습을 보세요.',
          setup() { setScene('lab'); S.lab.exp = 'iodine'; updateCtl(); },
          check: () => S.lab.iod.st === 'done',
          hold: 0.5,
          status: () => '경과 시간 ' + Math.round(S.lab.iod.t) + ' / 30분 ' + mark(S.lab.iod.st === 'done'),
          explain: '<b>아이오딘</b>은 작아서 셀로판막을 지나 튜브 안으로 들어가 녹말과 만나 <b>청람색</b>이 되었어요. <b>녹말</b>은 커서 막을 지나지 못해 튜브 밖으로 나오지 않았고, 그래서 비커 용액은 <b>황갈색 그대로</b>예요.',
        },
        {
          title: '감자 삼투 실험 3조건',
          goal: '감자를 <b>증류수 · 0.9 % 생리식염수 · 10 % 소금물</b>에 각각 30분 담가 질량 변화 그래프를 모두 채우세요.',
          hint: '용액을 고르고 ▶ 30분 담그기를 눌러요. 오른쪽 🔍 상자의 파란 물 분자 화살표가 이동 방향을 알려 줘요.',
          setup() { setScene('lab'); S.lab.exp = 'potato'; updateCtl(); },
          check: () => SKEYS.every((k) => S.lab.pot[k].st === 'done'),
          hold: 0.5,
          status: () => SKEYS.map((k) => mark(S.lab.pot[k].st === 'done') + SOLS[k].pct).join(' &nbsp; '),
          explain: '감자 10.0 g이 <b>증류수에서는 11.0 g(+10 %)</b>으로 늘고, <b>0.9 % 용액에서는 10.0 g 그대로</b>, <b>10 % 소금물에서는 8.8 g(−12 %)</b>으로 줄었어요. 물이 <b>농도가 낮은 쪽에서 높은 쪽으로</b> 이동하기 때문이에요(삼투).',
        },
        {
          type: 'quiz', title: '감자가 소금물에서 쭈그러드는 까닭',
          goal: '감자 조각을 <b>10 % 소금물</b>에 담그면 질량이 줄어들고 쭈그러들었어요. 그 까닭은?',
          setup() { setScene('lab'); S.lab.exp = 'potato'; updateCtl(); },
          choices: ['소금이 감자 세포 속으로 들어가 감자가 녹아서', '물이 농도가 낮은 감자 세포에서 농도가 높은 소금물 쪽으로 이동해서', '물이 농도가 낮은 소금물에서 농도가 높은 감자 세포 쪽으로 이동해서', '감자 세포막이 소금물을 모두 막아서'],
          answer: 1,
          feedback: ['소금 입자는 세포막을 통과하지 못해요. 감자가 녹는 것이 아니에요.', '', '반대예요. 10 % 소금물은 감자 세포액(약 0.9 %)보다 훨씬 진해서 물이 소금물 쪽으로 빠져나가요.', '세포막이 막는 것은 소금이에요. 물은 막을 통과하고 있어요.'],
          explain: '10 % 소금물은 감자 세포액(약 0.9 %)보다 농도가 높아서 <b>물이 세포 밖(소금물)으로 이동</b>해요. 소금은 막을 통과하지 못하고 물만 이동하는 것이 <b>삼투</b>예요. 그래서 감자의 질량이 줄고 쭈그러들어요.',
        },
      ],
    },
    {
      title: '삼투 적용: 적혈구와 일상 속 삼투', short: '삼투 적용', icon: '🩸', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 감자 실험으로 물이 농도가 낮은 쪽에서 높은 쪽으로 이동한다는 것(삼투)을 확인했어요. 이제 <b>동물 세포</b>와 일상생활에 적용해 봐요.</div>' +
        '<p><b>적혈구</b>를 여러 농도의 소금물에 넣어 모양 변화를 관찰하고, 김치 절이기·바닷물·링거 주사 같은 사례에서 물이 어디로 이동하는지 생각해요. 적혈구 안의 용액 농도는 약 0.9 %예요.</p>',
      features: ['rbc'],
      setup() { S.rb = null; S.showMatch = false; resetMatch(); resetRbc(0.9); setScene('rbc'); },
      recap: '바깥 용액이 묽으면 물이 세포 안으로 들어와 부풀고(터질 수 있어요), 진하면 물이 빠져나가 쭈그러들어요. 세포막은 이렇게 물질의 출입을 조절하며 세포를 유지해요.',
      summary: '<ul><li><b>적혈구</b>: 0.9 % 생리식염수에서는 변화 없음, <b>증류수</b>에서는 물이 들어와 부풀다 <b>터질 수 있고</b>, <b>농축 소금물</b>에서는 물이 빠져나가 <b>쭈그러들어요</b>.</li><li><b>김치 절이기</b>: 배추 세포에서 물이 빠져나가 배추의 숨이 죽어요.</li><li><b>바닷물을 마시면</b> 체액보다 진해서 세포에서 물이 빠져나가 오히려 갈증이 나요.</li><li><b>링거</b>는 체액과 농도가 같은 0.9 % 생리식염수를 써서 세포가 부풀거나 쭈그러들지 않게 해요.</li><li>식물 세포를 진한 소금물에 넣으면 <b>원형질 분리</b>가 일어나요.</li><li>세포막의 역할: 물질의 출입을 <b>선택적으로 조절</b>해 세포(생명 시스템)를 유지해요.</li></ul>',
      missions: [
        {
          title: '적혈구를 세 가지 용액에 넣어 보기',
          goal: '적혈구를 <b>증류수(0 %)</b>, <b>생리식염수(0.9 %)</b>, <b>농축 소금물(2 % 이상)</b>에 차례로 넣고 모양 변화가 멈출 때까지 관찰하세요.',
          hint: '아래 버튼으로 용액을 바꿔요. 적혈구 모양이 바뀌고 멈출 때까지 1초쯤 기다려야 기록돼요.',
          setup() { setScene('rbc'); },
          check: () => !!(S.rb.seen.hypo && S.rb.seen.iso && S.rb.seen.hyper),
          hold: 0.4,
          status: () => mark(!!S.rb.seen.hypo) + ' 증류수 &nbsp; ' + mark(!!S.rb.seen.iso) + ' 0.9 % &nbsp; ' + mark(!!S.rb.seen.hyper) + ' 농축 소금물',
          explain: '<b>증류수</b>: 바깥이 더 묽어 물이 세포 안으로 들어와 부풀다 터져요. <b>0.9 % 생리식염수</b>: 안과 밖의 농도가 같아 변화가 없어요. <b>농축 소금물</b>: 바깥이 더 진해 물이 빠져나가 쭈그러들어요.',
        },
        {
          title: '생활 속 삼투: 물은 어디로?', manual: true,
          goal: '다섯 가지 사례에서 <b>물이 어느 쪽으로 이동하는지</b> 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '물은 농도가 낮은(묽은) 쪽에서 높은(진한) 쪽으로 이동해요. 세포 안의 농도는 약 0.9 %로 생각해요.',
          setup() { resetMatch(); S.showMatch = true; setScene('rbc'); updateCtl(); },
          check() {
            const miss = MATCH.filter((m, i) => !S.match[i]);
            if (miss.length) return '아직 고르지 않은 사례가 ' + miss.length + '개 있어요.';
            let bad = 0;
            MATCH.forEach((m, i) => {
              const ok = S.match[i] === m[1]; if (!ok) bad++;
              if (!ok && S.matchOK[i] !== false) { matchSel[i].classList.remove('ok', 'bad'); void matchSel[i].offsetWidth; matchSel[i].classList.add('bad'); }
              if (ok) { matchSel[i].classList.remove('bad'); matchSel[i].classList.add('ok'); }
              S.matchOK[i] = ok;
            });
            if (bad) return '빨간 칸을 다시 생각해 보세요. 세포 안과 바깥 용액 중 어느 쪽이 더 진한가요? 물은 진한 쪽으로 가요.';
            return true;
          },
          status: () => '고른 사례 ' + MATCH.filter((m, i) => S.match[i]).length + ' / 5',
          explain: '물은 <b>농도가 낮은 쪽 → 높은 쪽</b>으로 이동해요. 배추를 소금에 절이면, 바닷물을 마시면, 양파 세포를 진한 소금물에 담그면 바깥이 더 진해 물이 <b>세포 밖으로</b> 나가요. 링거(0.9 %)는 농도가 같아 이동이 거의 없고, 시든 시금치를 맹물에 담그면 물이 <b>세포 안으로</b> 들어와 싱싱해져요.',
        },
        {
          type: 'quiz', title: '원형질 분리와 세포막의 역할',
          goal: '양파 표피 세포를 <b>진한 소금물</b>에 넣었더니 세포 내용물이 오그라들어 세포벽에서 떨어졌어요(원형질 분리). 그 까닭은?',
          setup() { S.showMatch = false; setScene('rbc'); updateCtl(); },
          choices: ['소금이 세포막을 자유롭게 통과해 세포 안으로 들어가서', '물이 세포 밖으로 빠져나가 세포 내용물이 줄어들기 때문에', '세포벽이 물을 모두 흡수해서', '세포막이 사라졌기 때문에'],
          answer: 1,
          feedback: ['소금(이온)은 세포막을 쉽게 통과하지 못해요. 선택적 투과를 떠올려 보세요.', '', '물을 이동시키는 것은 농도 차이예요. 물은 세포 안에서 진한 소금물 쪽으로 빠져나가요.', '세포막은 그대로 있어요. 막이 있어서 소금은 못 들어오고 물만 나가는 거예요.'],
          explain: '바깥 소금물이 세포 안보다 진해서 <b>물이 세포 밖으로 이동</b>해요. 소금은 세포막을 통과하지 못하므로 세포 내용물만 줄어들어 세포벽에서 떨어져요(<b>원형질 분리</b>). 이렇게 세포막은 <b>선택적 투과</b>로 물질의 출입을 조절해 세포를 유지해요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-cell-membrane', mount: '#game', badge: '세포막 박사', homeHref: '../../index.html#h1a',
    featureLabels: { cell: '🫧 물질 카드 분류 · 세포막 없애기', model: '🔍 막 모형 · 입자 시험 · 농도 슬라이더', lab: '🧪 셀로판 튜브 · 감자 삼투 실험', rbc: '🩸 적혈구 · 소금물 농도' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetCell(false); resetModel(); resetLab('iodine'); resetRbc(0.9); resetMatch();
  setScene('cell');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    if (S.mode === 'cell') { stepCell(dt); drawCell(dt); }
    else if (S.mode === 'model') { stepModel(dt); drawModel(dt); }
    else if (S.mode === 'lab') { stepLab(dt); if (S.lab.exp === 'iodine') drawIodine(dt); else drawPotato(dt); }
    else { stepRbc(dt); drawRbc(dt); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,247,240,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, TYPES, TKEYS, SOLS, SKEYS, MATCH, setConc, selectType, setCounts, setExp, setSol, labRun, resetLab, resetModel, resetCell, toggleMem, placeItem, ITEMS, CW, CH, CX, CY, OZ, slotIn, slotOut, inEllipse,
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) { if (S.mode === 'cell') stepCell(0.02); else if (S.mode === 'model') stepModel(0.02); else if (S.mode === 'lab') stepLab(0.02); else stepRbc(0.02); } },
  };
})();
