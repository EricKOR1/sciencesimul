(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 · 도우미 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const comma = (n) => String(Math.round(n)).replace(/(\d)(?=(\d{3})+$)/g, '$1,');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const approach = (cur, tgt, dt, rate) => (RM ? tgt : SciSim.approach(cur, tgt, dt, rate));
  // 받침 유무에 따라 조사 고르기: josa('사과', '이/가') -> '가'
  const josa = (word, pair) => {
    const ch = String(word).charCodeAt(String(word).length - 1);
    const has = ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0;
    const [a, b] = pair.split('/');
    return has ? a : b;
  };

  let view, ctx, D, VW, VH, FS;
  const parts = new SciSim.Particles();
  function initStage(bg, tw, th, pw, ph) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? 1.14 : 1;
    view = SciSim.stage($('#cv'), { width: VW, height: VH, background: bg });
    ctx = view.ctx; D = SciSim.draw(ctx);
    const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w);
  }
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  const shade = (c, a) => SciSim.color.shade(c, a);
  const rgba = (c, a) => SciSim.color.rgba(c, a);
  const mixc = (a, b, t) => SciSim.color.mix(a, b, clamp(t, 0, 1));

  /* 글자 줄바꿈 (한국어: 공백 단위, 너무 긴 단어는 글자 단위) */
  function wrapLines(text, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    String(text).split('\n').forEach((para, pi) => {
      if (pi > 0) { out.push(line); line = ''; }
      para.split(' ').forEach((w) => {
        let cand = line ? line + ' ' + w : w;
        if (ctx.measureText(cand).width <= maxW) { line = cand; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(w).width <= maxW) { line = w; return; }
        let cur = '';
        for (const ch of w) { if (ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; } else cur += ch; }
        line = cur;
      });
    });
    out.push(line); ctx.restore();
    return out.filter((l, i) => l !== '' || i < out.length - 1);
  }
  /* 줄바꿈해서 그리기: align center/left, 반환 = 마지막 y */
  function drawWrap(x, y, text, maxW, size, o) {
    o = o || {};
    const lines = wrapLines(text, maxW, size, o.weight), lh = size * FS * (o.lh || 1.3);
    lines.forEach((l, i) => D.text(x, y + i * lh, l, { size, weight: o.weight || 700, color: o.color || '#334155', align: o.align || 'center', alpha: o.alpha }));
    return y + (lines.length - 1) * lh;
  }
  /* 말풍선(안내 글) : 반투명 흰 판 + 글 */
  function note(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w - 24, size, 700), lh = size * FS * 1.32, h = lines.length * lh + 14;
    D.shadow(() => { ctx.fillStyle = o.bg || 'rgba(255,255,255,.92)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, 12).stroke(); }
    lines.forEach((l, i) => D.text(x + w / 2, y + 12 + size * FS * 0.8 + i * lh, l, { size, weight: 700, color: o.color || '#334155' }));
    return h;
  }

  /* ======================================================
     카드 보드: 카드를 칸(zone)에 끌어다 놓기 / 눌러서 고르고 칸 누르기
     ====================================================== */
  class Board {
    constructor(o) {
      this.zones = o.zones || []; this.tray = o.tray; this.cw = o.cw; this.ch = o.ch; this.gap = o.gap == null ? 8 : o.gap;
      this.onDrop = o.onDrop || (() => true); this.onPlace = o.onPlace || (() => {}); this.onReject = o.onReject || (() => {});
      this.onTap = o.onTap || null; this.vertical = !!o.vertical; this.cards = []; this.drag = null; this.selected = null; this.hoverZone = null;
      this.enabled = true; this.trayLabel = o.trayLabel || '';
    }
    add(c) {
      c.w = c.w || this.cw; c.h = c.h || this.ch; c.zone = c.zone || null; c.lift = 0; c.shake = 0; c.pop = 1;
      c.ord = this.cards.length; c.size = 15; const tw = this.vertical ? c.w - 10 : c.w - (c.draw ? c.h + 6 : 16);
      const maxLines = this.vertical ? 2 : 3;
      for (let s = 15; s >= 13; s--) { c.size = s; c.lines = wrapLines(c.label, tw, s, 800); if (c.lines.length <= maxLines && c.lines.length * s * FS * 1.25 <= (this.vertical ? c.h - (c.draw ? 36 : 8) : c.h - 6)) break; }
      c.x = c.tx = c.x || 0; c.y = c.ty = c.y || 0; this.cards.push(c); return c;
    }
    zone(id) { return this.zones.find((z) => z.id === id); }
    inZone(id) { return this.cards.filter((c) => c.zone === id); }
    layout(snap) {
      const trayCards = this.cards.filter((c) => !c.zone).sort((a, b) => a.ord - b.ord);
      const T = this.tray;
      if (T) {
        const cols = T.cols || Math.max(1, Math.floor((T.w + this.gap) / (this.cw + this.gap)));
        trayCards.forEach((c, i) => {
          const col = i % cols, row = Math.floor(i / cols), n = Math.min(cols, trayCards.length - row * cols);
          const rowW = n * this.cw + (n - 1) * this.gap;
          c.tx = T.x + (T.w - (cols * this.cw + (cols - 1) * this.gap)) / 2 + this.cw / 2 + col * (this.cw + this.gap);
          c.ty = T.y + this.ch / 2 + row * (this.ch + this.gap);
        });
      }
      this.zones.forEach((z) => {
        const zc = this.inZone(z.id), head = z.head == null ? 28 : z.head;
        const cols = z.cols || Math.max(1, Math.floor((z.w - 8 + this.gap) / (this.cw + this.gap)));
        zc.forEach((c, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          c.tx = z.x + (z.w - (cols * this.cw + (cols - 1) * this.gap)) / 2 + this.cw / 2 + col * (this.cw + this.gap);
          c.ty = z.center ? z.y + z.h / 2 : z.y + head + 4 + this.ch / 2 + row * (this.ch + this.gap);
        });
      });
      if (snap || RM) this.cards.forEach((c) => { if (!(this.drag && this.drag.c === c)) { c.x = c.tx; c.y = c.ty; } });
    }
    reset() { this.cards.forEach((c) => { c.zone = null; c.sel = false; }); this.selected = null; this.drag = null; this.layout(true); }
    update(dt) {
      this.cards.forEach((c) => {
        const dragging = this.drag && this.drag.c === c;
        if (!dragging) { c.x = approach(c.x, c.tx, dt, 14); c.y = approach(c.y, c.ty, dt, 14); }
        c.lift = approach(c.lift, dragging ? 1 : 0, dt, 16);
        if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      });
    }
    hit(p) {
      for (let i = this.cards.length - 1; i >= 0; i--) {
        const c = this.cards[i];
        if (c.fixed) continue;
        if (Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c;
      }
      return null;
    }
    zoneAt(p) {
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i];
        if (p.x >= z.x - 4 && p.x <= z.x + z.w + 4 && p.y >= z.y - 4 && p.y <= z.y + z.h + 4) return z;
      }
      return null;
    }
    down(p) {
      if (!this.enabled) return false;
      const c = this.hit(p);
      if (c) {
        const i = this.cards.indexOf(c); this.cards.splice(i, 1); this.cards.push(c);
        this.drag = { c, ox: p.x - c.x, oy: p.y - c.y, sx: p.x, sy: p.y, moved: false };
        Sound.click(); return true;
      }
      if (this.selected) { const z = this.zoneAt(p); if (z) { this.place(this.selected, z, p); this.selected.sel = false; this.selected = null; } }
      return false;
    }
    move(p) {
      const d = this.drag; if (!d) return;
      d.c.x = p.x - d.ox; d.c.y = p.y - d.oy;
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 9) d.moved = true;
      this.hoverZone = d.moved ? this.zoneAt(p) : null;
    }
    up(p) {
      const d = this.drag; if (!d) return; this.drag = null; this.hoverZone = null;
      const c = d.c;
      if (!d.moved) {
        if (this.selected === c) { c.sel = false; this.selected = null; }
        else { if (this.selected) this.selected.sel = false; this.selected = c; c.sel = true; }
        this.onTap && this.onTap(c);
        return;
      }
      if (this.selected) { this.selected.sel = false; this.selected = null; }
      const z = this.zoneAt(p);
      if (z) this.place(c, z, p); else { c.zone = null; this.layout(); }
    }
    place(c, z, p) {
      const res = this.onDrop(c, z);
      if (res === 'keep') { c.zone = null; this.layout(); return; }
      if (res !== true) { c.shake = 0.45; Sound.fail(); this.onReject(c, z, typeof res === 'string' ? res : ''); this.layout(); return; }
      if (z.cap) {
        const occ = this.inZone(z.id).filter((x) => x !== c);
        if (occ.length >= z.cap) {
          if (z.cap === 1) occ[0].zone = null;
          else { c.shake = 0.45; Sound.fail(); this.onReject(c, z, '이 칸은 가득 찼어요'); this.layout(); return; }
        }
      }
      c.zone = z.id; this.layout();
      Sound.tick();
      parts.burst(c.tx, c.ty, { count: 8, speed: 90, size: 3, life: 0.5, colors: [z.color || '#16a34a', '#fff'] });
      this.onPlace(c, z);
    }
    drawCard(c, t) {
      const sc = 1 + c.lift * 0.07, sh = c.shake > 0 ? Math.sin(c.shake * 50) * 5 : 0;
      ctx.save(); ctx.translate(c.x + sh, c.y - c.lift * 3); ctx.scale(sc, sc);
      const w = c.w, h = c.h;
      D.shadow(() => { ctx.fillStyle = c.fill || '#fff'; rr(-w / 2, -h / 2, w, h, 11).fill(); }, { blur: 3 + c.lift * 9, y: 2 + c.lift * 4 });
      ctx.strokeStyle = c.sel ? '#f59e0b' : c.border || '#cfd8e6'; ctx.lineWidth = c.sel ? 3.5 : 2; rr(-w / 2, -h / 2, w, h, 11).stroke();
      let tx = 0, ty0 = 0, tw = w - 14;
      if (c.draw) {
        if (this.vertical) { c.draw(0, -h / 2 + 22, 30, t); ty0 = 16; }
        else { const iw = h - 6; ctx.save(); rr(-w / 2 + 4, -h / 2 + 4, iw - 2, h - 8, 8).clip(); ctx.fillStyle = c.iconBg || 'rgba(0,0,0,.04)'; ctx.fillRect(-w / 2 + 4, -h / 2 + 4, iw, h - 8); c.draw(-w / 2 + 4 + (iw - 2) / 2, 0, h - 14, t); ctx.restore(); tx = (iw + 2) / 2; tw = w - iw - 12; }
      }
      const lh = c.size * FS * 1.22, n = c.lines.length, y0 = ty0 - ((n - 1) * lh) / 2 + c.size * FS * 0.36;
      c.lines.forEach((l, i) => D.text(tx, y0 + i * lh, l, { size: c.size, weight: 800, color: c.color || '#1e293b' }));
      if (c.badge) D.text(w / 2 - 12, -h / 2 + 15, c.badge, { size: 14, weight: 800, color: c.badgeColor || '#16a34a' });
      ctx.restore();
    }
    draw(t) {
      this.zones.forEach((z) => {
        const hv = this.hoverZone === z;
        const sel = this.selected;
        ctx.save();
        D.shadow(() => { ctx.fillStyle = z.fill || 'rgba(255,255,255,.75)'; rr(z.x, z.y, z.w, z.h, 14).fill(); }, { blur: 4, y: 1 });
        ctx.setLineDash(hv ? [] : [7, 5]); ctx.strokeStyle = hv ? (z.color || '#16a34a') : (z.line || '#b6c3d4'); ctx.lineWidth = hv ? 3.5 : 2.2; rr(z.x, z.y, z.w, z.h, 14).stroke(); ctx.setLineDash([]);
        ctx.restore();
        if (z.label) D.text(z.x + 12, z.y + 20, z.label, { size: z.lsize || 14.5, weight: 800, color: z.color || '#334155', align: 'left' });
        if (z.sub) D.text(z.x + z.w - 10, z.y + 20, z.sub, { size: 13, weight: 700, color: '#64748b', align: 'right' });
        if (sel && !this.drag) D.ring(z.x + z.w / 2, z.y + z.h / 2, Math.min(z.w, z.h) * 0.18, t, { color: z.color || '#16a34a', speed: 0.9, width: 2 });
        if (z.draw) z.draw(z, t);
      });
      const dragC = this.drag && this.drag.c;
      this.cards.forEach((c) => { if (c !== dragC) this.drawCard(c, t); });
      if (dragC) this.drawCard(dragC, t);
    }
  }

  /* 읽음 칸 3개 */
  const rdEls = [1, 2, 3].map((i) => [$('#l' + i), $('#v' + i)]);
  let rdLast = '';
  function setReadouts(a) {
    const key = a.join('|'); if (key === rdLast) return; rdLast = key;
    for (let i = 0; i < 3; i++) { rdEls[i][0].textContent = a[i * 2]; rdEls[i][1].textContent = a[i * 2 + 1]; }
  }
  let hintTimer = null;
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200); }
  /* 캔버스 위 일시 메시지 */
  const flash = { text: '', t: 0, bg: '#15803d' };
  function say(text, bad, sec) { flash.text = text; flash.t = sec || 2.8; flash.bg = bad ? '#b91c1c' : '#15803d'; }
  function drawFlash(dt, y) {
    if (flash.t <= 0) return;
    flash.t -= dt;
    const a = clamp(flash.t / 0.4, 0, 1);
    const lines = wrapLines(flash.text, VW - 60, PHONE ? 13 : 14.5, 800), lh = (PHONE ? 13 : 14.5) * FS * 1.3, h = lines.length * lh + 14;
    ctx.save(); ctx.globalAlpha = a;
    D.shadow(() => { ctx.fillStyle = flash.bg; rr(VW / 2 - (VW - 40) / 2, y, VW - 40, h, 12).fill(); }, { blur: 6, y: 2 });
    lines.forEach((l, i) => D.text(VW / 2, y + 7 + (PHONE ? 13 : 14.5) * FS * 0.95 + i * lh, l, { size: PHONE ? 13 : 14.5, weight: 800, color: '#fff' }));
    ctx.restore();
  }


  /* =========================================================
     통합과학2 Ⅰ. 변화와 다양성 - 산소의 이동과 산화·환원 (단원 5차시)
     성취기준 [10통과2-01-03] 광합성, 화석 연료 사용, 철의 제련 등에서 공통점을 찾아 산화와 환원을 이해하고,
     생활 주변의 다양한 변화를 산화와 환원의 특징과 규칙성으로 분석할 수 있다. (이번 차시: 산소의 이동 관점)
     ① 실험: 산화 (구리 가열, 마그네슘 연소)   ② 실험: 환원 (산화 구리(Ⅱ) + 수소 / 탄소)
     ③ 적용: 철의 제련 (용광로)                ④ 적용: 연소 · 광합성 · 제련 비교
     ※ 산화수는 다루지 않음. 전자의 이동은 다음 차시.
     ========================================================= */
  initStage('#f5f3ff', 800, 560, 520, 820);

  /* ---------- 상수 (글에 나오는 숫자는 이 상수에서 가져와요) ---------- */
  const RX_SPEED = 0.2;            // 반응 진행 속도 (1초에 20 %)
  const MASS = { cu: { m0: 4.0, m1: 5.0, name: '구리', prod: '산화 구리(Ⅱ)', pf: 'CuO' }, mg: { m0: 3.0, m1: 5.0, name: '마그네슘', prod: '산화 마그네슘', pf: 'MgO' } };
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const sm = (x) => smooth(x);
  const sleft = (t, a, b) => smooth((t - a) / (b - a));

  const LAY = () => (PHONE ? { B: { x: 10, y: 8, w: 500, h: 346 }, P: { x: 10, y: 364, w: 500, h: 446 } } : { B: { x: 10, y: 10, w: 404, h: 540 }, P: { x: 424, y: 10, w: 366, h: 540 } });

  /* ---------- 원소 ---------- */
  const EL = {
    Cu: { c: '#c8743a', r: 0.078, name: '구리 Cu' }, Mg: { c: '#b6c0cd', r: 0.078, name: '마그네슘 Mg' }, Fe: { c: '#8b8f98', r: 0.07, name: '철 Fe' },
    O: { c: '#ef4444', r: 0.058, name: '산소 O' }, H: { c: '#f1f5f9', r: 0.043, name: '수소 H' }, C: { c: '#475569', r: 0.058, name: '탄소 C' },
  };
  const A = (e, f, t, w, o) => Object.assign({ e, f, t: t || f, w: w || [0, 1], arc: 0, track: false }, o || {});
  const metalRx = (M, name, pname, cname) => ({
    title: name + '의 산화', eq: '2' + M + ' + O₂ → 2' + M + 'O',
    atoms: [A(M, [0.2, 0.7]), A(M, [0.52, 0.7]), A('O', [0.62, 0.18], [0.33, 0.7], [0.25, 0.8], { arc: 0.16, track: true }), A('O', [0.78, 0.18], [0.65, 0.7], [0.3, 0.85], { arc: 0.16, track: true })],
    bonds: [[2, 3, 0, 0.3], [0, 2, 0.78, 1], [1, 3, 0.83, 1]],
    tagsA: [[cname, 0.36, 0.9], ['O₂ 산소 기체', 0.7, 0.07]], tagsB: [[pname, 0.5, 0.9]],
  });
  const RXN = {
    cu: metalRx('Cu', '구리', 'CuO 산화 구리(Ⅱ)', 'Cu 구리'),
    mg: metalRx('Mg', '마그네슘', 'MgO 산화 마그네슘', 'Mg 마그네슘'),
    h2: {
      title: '산화 구리(Ⅱ)의 환원 (수소)', eq: 'CuO + H₂ → Cu + H₂O',
      atoms: [A('Cu', [0.2, 0.72]), A('O', [0.34, 0.72], [0.68, 0.54], [0.25, 0.8], { arc: 0.2, track: true }), A('H', [0.6, 0.16], [0.6, 0.68], [0.3, 0.85], { arc: 0.04 }), A('H', [0.74, 0.16], [0.76, 0.68], [0.3, 0.85], { arc: 0.04 })],
      bonds: [[0, 1, 0, 0.28], [2, 3, 0, 0.3], [1, 2, 0.8, 1], [1, 3, 0.8, 1]],
      tagsA: [['CuO 산화 구리(Ⅱ)', 0.27, 0.9], ['H₂ 수소', 0.67, 0.06]], tagsB: [['Cu 구리', 0.2, 0.9], ['H₂O 물', 0.68, 0.86]],
    },
    c: {
      title: '산화 구리(Ⅱ)의 환원 (탄소)', eq: '2CuO + C → 2Cu + CO₂',
      atoms: [A('Cu', [0.13, 0.76]), A('O', [0.27, 0.76], [0.49, 0.46], [0.25, 0.8], { arc: 0.22, track: true }), A('Cu', [0.45, 0.76]), A('O', [0.59, 0.76], [0.75, 0.46], [0.3, 0.85], { arc: 0.22, track: true }), A('C', [0.62, 0.46])],
      bonds: [[0, 1, 0, 0.28], [2, 3, 0, 0.33], [4, 1, 0.8, 1], [4, 3, 0.85, 1]],
      tagsA: [['CuO 산화 구리(Ⅱ) 2개', 0.3, 0.92], ['C 탄소', 0.62, 0.3]], tagsB: [['Cu 구리 2개', 0.28, 0.92], ['CO₂ 이산화 탄소', 0.62, 0.3]],
    },
    fe: {
      title: '철의 제련', eq: 'Fe₂O₃ + 3CO → 2Fe + 3CO₂',
      atoms: [A('Fe', [0.13, 0.46]), A('Fe', [0.13, 0.7]),
        A('O', [0.29, 0.34], [0.54, 0.3], [0.2, 0.55], { arc: 0.12, track: true, r: 0.046 }), A('O', [0.29, 0.58], [0.54, 0.54], [0.4, 0.7], { arc: 0.12, track: true, r: 0.046 }), A('O', [0.29, 0.8], [0.54, 0.78], [0.55, 0.85], { arc: 0.12, track: true, r: 0.046 }),
        A('C', [0.69, 0.3], null, null, { r: 0.046 }), A('O', [0.83, 0.3], null, null, { r: 0.046 }), A('C', [0.69, 0.54], null, null, { r: 0.046 }), A('O', [0.83, 0.54], null, null, { r: 0.046 }), A('C', [0.69, 0.78], null, null, { r: 0.046 }), A('O', [0.83, 0.78], null, null, { r: 0.046 })],
      bonds: [[0, 2, 0, 0.3], [0, 3, 0, 0.45], [1, 3, 0, 0.45], [1, 4, 0, 0.6], [5, 6, 0, 1], [7, 8, 0, 1], [9, 10, 0, 1], [2, 5, 0.5, 1], [3, 7, 0.65, 1], [4, 9, 0.8, 1], [0, 1, 0.85, 1]],
      tagsA: [['Fe₂O₃ 산화 철(Ⅲ)', 0.2, 0.93], ['CO ×3', 0.76, 0.12]], tagsB: [['Fe 철', 0.13, 0.93], ['CO₂ ×3', 0.69, 0.12]],
    },
    ch4: {
      title: '메테인의 연소', eq: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
      atoms: [A('C', [0.28, 0.42]), A('H', [0.17, 0.27], [0.58, 0.4], [0.35, 0.9], { arc: 0.1 }), A('H', [0.39, 0.27], [0.74, 0.4], [0.35, 0.9], { arc: 0.1 }), A('H', [0.17, 0.57], [0.58, 0.8], [0.35, 0.9], { arc: 0.1 }), A('H', [0.39, 0.57], [0.74, 0.8], [0.35, 0.9], { arc: 0.1 }),
        A('O', [0.72, 0.16], [0.28, 0.2], [0.2, 0.7], { arc: 0.06, track: true }), A('O', [0.86, 0.16], [0.66, 0.3], [0.2, 0.7], { arc: 0.06 }), A('O', [0.72, 0.62], [0.28, 0.64], [0.3, 0.8], { arc: 0.06, track: true }), A('O', [0.86, 0.62], [0.66, 0.7], [0.3, 0.8], { arc: 0.06 })],
      bonds: [[0, 1, 0, 0.4], [0, 2, 0, 0.4], [0, 3, 0, 0.4], [0, 4, 0, 0.4], [5, 6, 0, 0.25], [7, 8, 0, 0.3], [0, 5, 0.75, 1], [0, 7, 0.8, 1], [6, 1, 0.9, 1], [6, 2, 0.9, 1], [8, 3, 0.92, 1], [8, 4, 0.92, 1]],
      tagsA: [['CH₄ 메테인', 0.28, 0.9], ['O₂ ×2 산소', 0.78, 0.4]], tagsB: [['CO₂', 0.28, 0.86], ['H₂O ×2', 0.66, 0.5]],
    },
    ph: {
      title: '광합성 (한 번에 CO₂ 1개 기준)', eq: 'CO₂ + 2H₂O → CH₂O + O₂ + H₂O',
      atoms: [A('C', [0.24, 0.42]), A('O', [0.1, 0.42], [0.28, 0.82], [0.25, 0.75], { arc: 0.1, track: true }), A('O', [0.38, 0.42]),
        A('O', [0.66, 0.2], [0.74, 0.16], [0.4, 0.9], { arc: 0.0 }), A('H', [0.58, 0.31], [0.12, 0.28], [0.3, 0.8], { arc: 0.08 }), A('H', [0.74, 0.31], [0.12, 0.56], [0.3, 0.8], { arc: 0.08 }),
        A('O', [0.66, 0.66], [0.9, 0.16], [0.4, 0.9], { arc: 0.0 }), A('H', [0.58, 0.77], [0.18, 0.92], [0.3, 0.8], { arc: 0.06 }), A('H', [0.74, 0.77], [0.38, 0.92], [0.3, 0.8], { arc: 0.06 })],
      bonds: [[1, 0, 0, 0.3], [0, 2, 0, 1], [3, 4, 0, 0.4], [3, 5, 0, 0.4], [6, 7, 0, 0.4], [6, 8, 0, 0.4], [3, 6, 0.85, 1], [0, 4, 0.8, 1], [0, 5, 0.8, 1], [1, 7, 0.85, 1], [1, 8, 0.85, 1]],
      tagsA: [['CO₂', 0.24, 0.3], ['H₂O ×2', 0.66, 0.5]], tagsB: [['CH₂O (포도당의 ⅙)', 0.22, 0.66], ['O₂ 산소 기체', 0.82, 0.3], ['H₂O', 0.28, 0.99]],
    },
  };
  RXN.fe2 = RXN.fe;
  const RS = {}; Object.keys(RXN).forEach((k) => { RS[k] = { prog: 0, run: false, done: false }; });
  function rsReset(k) { RS[k].prog = 0; RS[k].run = false; RS[k].done = false; }
  function rsStep(dt) {
    Object.keys(RS).forEach((k) => {
      const r = RS[k]; if (k === 'fe') return; // 용광로는 제련 화면이 직접 진행
      if (r.run && r.prog < 1) { r.prog = Math.min(1, r.prog + dt * RX_SPEED); if (r.prog >= 1) { r.run = false; r.done = true; Sound.success(); } }
    });
  }
  const atomPos = (a, prog) => {
    const k = SciSim.ease.inOutCubic(clamp((prog - a.w[0]) / (a.w[1] - a.w[0]), 0, 1));
    return { x: lerp(a.f[0], a.t[0], k), y: lerp(a.f[1], a.t[1], k) - a.arc * Math.sin(Math.PI * k), k };
  };

  /* 입자 모형 (확대) 패널 */
  function drawParticlePanel(key, t, o) {
    o = o || {};
    const P = LAY().P, R = RXN[key], rs = RS[key], prog = rs.prog;
    D.shadow(() => { ctx.fillStyle = '#ffffff'; rr(P.x, P.y, P.w, P.h, 16).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 2; rr(P.x, P.y, P.w, P.h, 16).stroke();
    D.text(P.x + 16, P.y + 28, '🔍 입자 모형 (확대)', { size: 15.5, weight: 800, color: '#4c1d95', align: 'left' });
    D.label(P.x + P.w / 2, P.y + 58, R.eq, { bg: '#4c1d95', size: PHONE ? 14 : 15.5 });
    const s = Math.min(P.w - 20, P.h - 140), ox = P.x + (P.w - s) / 2, oy = P.y + 78 + (P.h - 140 - s) / 2;
    ctx.fillStyle = '#f5f3ff'; rr(ox, oy, s, s, 14).fill();
    const X = (u) => ox + u * s, Y = (v) => oy + v * s;
    const pos = R.atoms.map((a) => atomPos(a, prog));
    // 산소가 가는 길 (점선 곡선 + 화살촉)
    R.atoms.forEach((a, i) => {
      if (!a.track) return;
      const al = 0.55 * (1 - sleft(prog, 0.85, 1)) * (RM ? 0.8 : 1);
      if (al <= 0.02) return;
      const x1 = X(a.f[0]), y1 = Y(a.f[1]), x2 = X(a.t[0]), y2 = Y(a.t[1]), cxm = (x1 + x2) / 2, cym = (y1 + y2) / 2 - a.arc * s * 2;
      ctx.save(); ctx.globalAlpha = al; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.4; ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 18;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cxm, cym, x2, y2); ctx.stroke(); ctx.setLineDash([]);
      const ang = Math.atan2(y2 - cym, x2 - cxm);
      ctx.fillStyle = '#ef4444'; ctx.translate(x2, y2); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, -6); ctx.lineTo(-11, 6); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    // 결합선
    R.bonds.forEach((b) => {
      const a0 = b[2], a1 = b[3], al = Math.min(sleft(prog, a0 - 0.001, a0 + 0.06), 1 - sleft(prog, a1 - 0.06, a1 + 0.0001));
      const al2 = a0 <= 0 ? 1 - sleft(prog, a1 - 0.06, a1) : a1 >= 1 ? sleft(prog, a0, a0 + 0.06) : al;
      if (al2 < 0.03) return;
      const p = pos[b[0]], q = pos[b[1]];
      ctx.save(); ctx.globalAlpha = al2; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X(p.x), Y(p.y)); ctx.lineTo(X(q.x), Y(q.y)); ctx.stroke(); ctx.restore();
    });
    // 원자
    R.atoms.forEach((a, i) => {
      const e = EL[a.e], p = pos[i], r = (a.r || e.r) * s, moving = p.k > 0.02 && p.k < 0.98;
      const idle = RM ? 0 : (prog <= 0 && !rs.run ? 1 : 0.5) * 0.004 * s;
      const wx = Math.sin(t * 2.1 + i * 1.7) * idle * (a.e === 'O' || a.e === 'H' ? 1 : 0.25), wy = Math.cos(t * 1.8 + i * 2.3) * idle * (a.e === 'O' || a.e === 'H' ? 1 : 0.25);
      if (moving && a.e === 'O') D.glow(X(p.x), Y(p.y), r * 2.4, '#ef4444', 0.45);
      D.sphere(X(p.x) + wx, Y(p.y) + wy, r, e.c, { shadow: true, text: a.e, textColor: a.e === 'H' || a.e === 'Mg' ? '#334155' : '#fff', textScale: a.e === 'H' ? 1.15 : 1.05, outline: a.e === 'H' ? '#94a3b8' : null });
    });
    // 이름표
    const fa = 1 - sleft(prog, 0.3, 0.5), fb = sleft(prog, 0.78, 0.98);
    R.tagsA.forEach((g) => { if (fa > 0.03) D.text(X(g[1]), Y(g[2]), g[0], { size: 13, weight: 800, color: '#334155', alpha: fa, stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 }); });
    R.tagsB.forEach((g) => { if (fb > 0.03) D.text(X(g[1]), Y(g[2]), g[0], { size: 13, weight: 800, color: '#4c1d95', alpha: fb, stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 }); });
    // 범례
    const els = []; R.atoms.forEach((a) => { if (!els.includes(a.e)) els.push(a.e); });
    const lw = (P.w - 20) / els.length;
    els.forEach((e, i) => { const x = P.x + 10 + i * lw + lw / 2; D.sphere(x - lw * 0.28, P.y + P.h - 26, 8, EL[e].c, { gloss: false, outline: '#94a3b8', outlineWidth: 1 }); D.text(x - lw * 0.28 + 13, P.y + P.h - 21, EL[e].name, { size: 12.5, weight: 700, color: '#475569', align: 'left' }); });
    if (o.badge && prog >= 0.98) o.badge.forEach((b) => D.label(X(b[0]), Y(b[1]), b[2], { bg: b[3], size: 13.5 }));
    // 열 방출
    if (o.heat && prog > 0.45) {
      const k = sleft(prog, 0.45, 0.8);
      for (let i = 0; i < 5; i++) { const hx = X(0.2 + i * 0.15), ph = (t * 0.6 + i * 0.23) % 1; ctx.save(); ctx.globalAlpha = 0.7 * k * (1 - ph); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3; ctx.beginPath(); for (let j = 0; j <= 8; j++) { const yy = Y(0.97) - j * 6 - ph * 30; const xx = hx + Math.sin(j * 1.1 + t * 4) * 5; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore(); }
      D.text(X(0.5), Y(0.02) + 6, '🔥 열 방출', { size: 13.5, weight: 800, color: '#c2410c', alpha: k });
    }
  }

  /* ======================================================
     실험대 그림
     ====================================================== */
  const HEAT = { cu: 0, mg: 0, h2: 0, c: 0 };
  const massNow = (k) => MASS[k].m0 + (MASS[k].m1 - MASS[k].m0) * sm(RS[k].prog);
  function benchCard(B, c1, c2) {
    const g = ctx.createLinearGradient(0, B.y, 0, B.y + B.h); g.addColorStop(0, c1 || '#faf5ff'); g.addColorStop(1, c2 || '#ede9fe');
    D.shadow(() => { ctx.fillStyle = g; rr(B.x, B.y, B.w, B.h, 16).fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#ddd6fe'; ctx.lineWidth = 2; rr(B.x, B.y, B.w, B.h, 16).stroke();
  }
  function lamp(cx, topY, flameH, heat, t) {
    // 알코올램프
    D.shadow(() => { const g = ctx.createLinearGradient(cx - 28, 0, cx + 28, 0); g.addColorStop(0, '#e0f2fe'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#bae6fd'); ctx.fillStyle = g; rr(cx - 28, topY + 8, 56, 44, 12).fill(); }, { blur: 4, y: 2 });
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.5; rr(cx - 28, topY + 8, 56, 44, 12).stroke();
    ctx.fillStyle = 'rgba(147,197,253,.55)'; rr(cx - 24, topY + 26, 48, 22, 8).fill();
    ctx.fillStyle = '#64748b'; rr(cx - 9, topY + 2, 18, 10, 3).fill();
    if (heat > 0.03) D.flame(cx, topY + 3, flameH * heat, t);
  }
  /* ---- ① 산화 실험대 ---- */
  function drawOxidBench(key, t, dt) {
    const B = LAY().B, rs = RS[key], prog = rs.prog, M = MASS[key];
    benchCard(B);
    HEAT[key] = approach(HEAT[key], rs.run ? 1 : 0, dt, 4);
    const ph = PHONE;
    const cx = B.x + B.w * (ph ? 0.3 : 0.4), tableY = B.y + B.h * 0.92, gauzeY = B.y + B.h * (ph ? 0.6 : 0.5), lampTop = B.y + B.h * (ph ? 0.74 : 0.74);
    // 탁자
    ctx.fillStyle = '#d6c7b0'; rr(B.x + 14, tableY, B.w - 28, 12, 6).fill();
    // 삼발이 + 석면망
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 70, gauzeY + 4); ctx.lineTo(cx - 84, tableY); ctx.moveTo(cx + 70, gauzeY + 4); ctx.lineTo(cx + 84, tableY); ctx.stroke();
    ctx.fillStyle = '#9ca3af'; rr(cx - 76, gauzeY, 152, 8, 4).fill();
    // 증발 접시
    const dishY = gauzeY - 38;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(cx - 74, dishY); ctx.quadraticCurveTo(cx - 70, gauzeY - 2, cx, gauzeY - 2); ctx.quadraticCurveTo(cx + 70, gauzeY - 2, cx + 74, dishY); ctx.closePath();
    const gl = ctx.createLinearGradient(cx - 74, 0, cx + 74, 0); gl.addColorStop(0, '#f1f5f9'); gl.addColorStop(0.5, '#ffffff'); gl.addColorStop(1, '#cbd5e1'); ctx.fillStyle = gl; ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    // 시료
    const pr = sm((prog - 0.12) / 0.7);
    if (key === 'cu') {
      const col = mixc('#bd5a2c', '#1c1917', pr);
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, dishY + 24, 52, 17, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(cx - 14, dishY + 14, 16, 5, -0.2, 0, TAU); ctx.fill();
    } else {
      const ribbon = 1 - sm(prog * 2.4);
      if (ribbon > 0.02) { ctx.save(); ctx.globalAlpha = ribbon; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const x = cx - 42 + i * 3.5, y = dishY + 22 - Math.abs(Math.sin(i * 0.55)) * 16; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore(); }
      const mound = sm((prog - 0.2) / 0.7);
      if (mound > 0.02) { ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.ellipse(cx, dishY + 24, 14 + 40 * mound, 3 + 15 * mound, 0, Math.PI, TAU); ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; ctx.stroke(); }
      const pulse = Math.sin(Math.PI * clamp((prog - 0.08) / 0.75, 0, 1));
      if (pulse > 0.02) { D.glow(cx, dishY + 10, 70 + 70 * pulse, '#ffffff', 0.95 * pulse); D.glow(cx, dishY + 10, 30 + 20 * pulse, '#e0f2fe', pulse); if (!RM && rs.run && Math.random() < dt * 40) parts.emit({ x: cx + (Math.random() - 0.5) * 40, y: dishY + 4, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, life: 0.6, size: 3, color: '#fff', gravity: 260, shape: 'star' }); }
    }
    // 램프
    lamp(cx, lampTop, Math.max(30, lampTop - gauzeY - 8), HEAT[key], t);
    // 저울 (질량)
    const mx = B.x + B.w * (ph ? 0.6 : 0.08), my = B.y + 16, mw = B.w * (ph ? 0.36 : 0.84), mh = ph ? 120 : 92;
    D.shadow(() => { ctx.fillStyle = '#1f2937'; rr(mx, my, mw, mh, 12).fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#a7f3d0'; rr(mx + 8, my + 28, mw - 16, mh - 38, 8).fill();
    D.text(mx + mw / 2, my + 19, '⚖️ 질량 (시료 + 접시 속 물질)', { size: ph ? 12 : 13, weight: 800, color: '#e5e7eb' });
    D.text(mx + mw / 2, my + mh - 24, f1(massNow(key)) + ' g', { size: ph ? 26 : 30, weight: 800, color: '#064e3b' });
    // 이름표
    const done = prog >= 0.98;
    const nameA = key === 'cu' ? '구리 가루 (붉은색)' : '마그네슘 리본 (은백색)', nameB = key === 'cu' ? '산화 구리(Ⅱ) (검은색)' : '산화 마그네슘 (흰색 가루)';
    D.text(cx, ph ? B.y + 34 : tableY - 18, prog < 0.5 ? nameA : nameB, { size: 14.5, weight: 800, color: '#4c1d95' });
    if (done) D.label(cx, gauzeY - 82 > B.y + 130 ? gauzeY - 82 : gauzeY - 66, '질량 ' + f1(M.m0) + ' g → ' + f1(M.m1) + ' g (+' + f1(M.m1 - M.m0) + ' g = 결합한 산소)', { bg: '#7c3aed', size: ph ? 12.5 : 13.5 });
    else if (rs.run) D.text(cx, gauzeY - 70 > B.y + 130 ? gauzeY - 70 : gauzeY - 56, key === 'mg' ? '눈부신 흰빛을 내며 타요' : '붉은색이 점점 검게 변해요', { size: 13.5, weight: 700, color: '#6b21a8' });
  }
  /* ---- ② 환원 실험대 ---- */
  function drawReducBench(key, t, dt) {
    const B = LAY().B, rs = RS[key], prog = rs.prog, ph = PHONE;
    benchCard(B);
    HEAT[key] = approach(HEAT[key], rs.run ? 1 : 0, dt, 4);
    const th = ph ? 30 : 36, tableY = B.y + B.h * 0.92, lampTop = tableY - 62, y0 = lampTop - (ph ? 66 : 86) - th, x0 = B.x + 26, x1 = B.x + B.w * 0.78;
    const pcx = B.x + B.w * 0.4, pw = B.w * 0.2;
    ctx.fillStyle = '#d6c7b0'; rr(B.x + 14, tableY, B.w - 28, 12, 6).fill();
    // 관찰 카드 (색 변화)
    const kc = rs.prog, cy2 = B.y + 66, cw2 = (B.w - 80) / 2;
    const chip = (x, col, txt, on) => { ctx.fillStyle = col; rr(x, cy2 - 18, cw2, 36, 10).fill(); ctx.strokeStyle = on ? '#7c3aed' : '#cbd5e1'; ctx.lineWidth = on ? 3 : 1.5; rr(x, cy2 - 18, cw2, 36, 10).stroke(); D.text(x + cw2 / 2, cy2 + 5, txt, { size: ph ? 12.5 : 13.5, weight: 800, color: '#fff' }); };
    chip(B.x + 20, '#1f2937', '산화 구리(Ⅱ) 검은색', kc < 0.5); chip(B.x + 60 + cw2, '#c2562c', '구리 붉은색', kc >= 0.5);
    D.arrow(B.x + 24 + cw2, cy2, B.x + 56 + cw2, cy2, { color: '#7c3aed', width: 3.5, head: 10, alpha: 0.4 + 0.6 * sleft(kc, 0.2, 0.6) });
    D.text(B.x + B.w / 2, cy2 + 40, key === 'h2' ? '생성물: 물(H₂O) · 이름표는 오른쪽 조작판에서 붙여요' : '생성물: 이산화 탄소(CO₂) → 석회수가 뿌옇게', { size: 13, weight: 700, color: '#6b21a8' });
    // 유리관
    ctx.fillStyle = 'rgba(224,242,254,.55)'; rr(x0, y0, x1 - x0, th, th / 2).fill();
    // 가루
    const col = mixc('#171717', '#c2562c', sm((prog - 0.15) / 0.65));
    ctx.fillStyle = col; rr(pcx - pw / 2, y0 + th * 0.35, pw, th * 0.62, 6).fill();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; rr(x0, y0, x1 - x0, th, th / 2).stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 14, y0 + 7); ctx.lineTo(x1 - 14, y0 + 7); ctx.stroke();
    // 받침
    ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(pcx - pw * 0.9, y0 + th); ctx.lineTo(pcx - pw * 0.9, tableY); ctx.moveTo(pcx + pw * 0.9, y0 + th); ctx.lineTo(pcx + pw * 0.9, tableY); ctx.stroke();
    lamp(pcx, lampTop, Math.max(34, lampTop - y0 - th - 4), HEAT[key], t);
    // 기체 흐름 (수소) 또는 가루 혼합 표시
    if (key === 'h2') {
      D.arrow(x0 - 8, y0 - 16, x0 + 54, y0 - 16, { color: '#64748b', width: 3.5, head: 12 });
      D.text(x0 + 4, y0 - 26, '수소 기체 H₂', { size: 13.5, weight: 800, color: '#475569', align: 'left' });
      if (rs.run || prog > 0) { for (let i = 0; i < 5; i++) { const ph2 = ((t * 0.5 + i * 0.2) % 1); const px = x0 + 16 + ph2 * (pcx - pw / 2 - x0 - 24); ctx.save(); ctx.globalAlpha = rs.run ? 0.9 : 0.2; D.sphere(px, y0 + th * 0.4 + Math.sin(i * 2 + t * 3) * 4, 5, '#f8fafc', { gloss: false, outline: '#94a3b8', outlineWidth: 1 }); ctx.restore(); } }
    } else D.text(pcx, y0 - 12, 'CuO + C 가루를 섞어 가열', { size: 13.5, weight: 800, color: '#475569' });
    D.text(pcx, y0 + th + 18 + (ph ? 0 : 0), prog < 0.5 ? '검은 산화 구리(Ⅱ)' : '붉은 구리', { size: 13.5, weight: 800, color: '#4c1d95' });
    // 꺾인 관 + 시험관
    const ex = x1 - 6, ty = y0 + th / 2, ttw = ph ? 46 : 52, tty = y0 + th + 26, tth = tableY - 14 - tty;
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1 - 4, ty); ctx.lineTo(ex + 14, ty); ctx.lineTo(ex + 14, tty + tth * 0.35); ctx.stroke();
    const tcx = ex + 14;
    if (key === 'h2') {
      const lev = 0.04 + 0.34 * sm((prog - 0.3) / 0.6);
      D.testTube(tcx, tty, ttw, tth, { level: lev, liquid: '#38bdf8' });
      if (rs.run && prog > 0.3 && !RM && Math.random() < dt * 8) parts.emit({ x: tcx + (Math.random() - 0.5) * 10, y: tty + 20, vx: 0, vy: 80, life: 0.5, size: 3, color: '#7dd3fc', gravity: 200 });
      if (prog > 0.5) D.text(tcx - 4, tty + tth + 22, '💧 물이 생겨요', { size: 13.5, weight: 800, color: '#0369a1' });
    } else {
      const milky = sm((prog - 0.25) / 0.55);
      D.testTube(tcx, tty, ttw, tth, { level: 0.55, liquid: mixc('#bfdbfe', '#f8fafc', milky) });
      if (milky > 0.1) { ctx.save(); ctx.globalAlpha = 0.45 * milky; ctx.fillStyle = '#ffffff'; rr(tcx - ttw / 2 + 3, tty + tth * 0.4, ttw - 6, tth * 0.55, 8).fill(); ctx.restore(); }
      if (rs.run && prog > 0.15 && !RM && Math.random() < dt * 9) parts.emit({ x: tcx + (Math.random() - 0.5) * 12, y: tty + tth * 0.8, vx: 0, vy: -50, life: 0.9, size: 3 + Math.random() * 2, color: '#93c5fd', shape: 'bubble', gravity: -20 });
      D.text(tcx - 4, tty + tth + 22, milky > 0.6 ? '석회수가 뿌옇게 → CO₂' : '석회수', { size: 13.5, weight: 800, color: '#475569' });
    }
    D.text(B.x + B.w / 2, B.y + 26, prog >= 0.98 ? '검은색 → 붉은색: 구리가 되었어요' : '🔬 산화 구리(Ⅱ)를 환원시키는 실험', { size: ph ? 14 : 15.5, weight: 800, color: '#4c1d95' });
  }

  /* ---- ③ 용광로 ---- */
  const FB = { ore: false, coke: false, air: false, f: 0, oreA: 0, cokeA: 0, airA: 0, made: false };
  const fbReady = () => FB.ore && FB.coke && FB.air;
  function fbReset() { FB.ore = FB.coke = FB.air = false; FB.f = 0; FB.oreA = FB.cokeA = FB.airA = 0; FB.made = false; rsReset('fe'); }
  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  function drawFurnace(B, A, f, t, dt, o) {
    o = o || {};
    const ph = PHONE, H = B.h - (ph ? 170 : 214), topY = B.y + (ph ? 96 : 118), botY = topY + H, cx = B.x + B.w * 0.5;
    const ws = ph ? 1.55 : 1, wT = H * 0.4 * ws, wM = H * 0.62 * ws, wB = H * 0.36 * ws, wall = 16;
    const poly = (off) => { ctx.beginPath(); ctx.moveTo(cx - wT / 2 - wall + off, topY); ctx.lineTo(cx + wT / 2 + wall - off, topY); ctx.lineTo(cx + wM / 2 + wall - off, topY + H * 0.42); ctx.lineTo(cx + wB / 2 + wall - off, botY); ctx.lineTo(cx - wB / 2 - wall + off, botY); ctx.lineTo(cx - wM / 2 - wall + off, topY + H * 0.42); ctx.closePath(); };
    const cavL = (y) => { const k = y <= topY + H * 0.42 ? (y - topY) / (H * 0.42) : 1 + (y - topY - H * 0.42) / (H * 0.58); const w = k <= 1 ? lerp(wT, wM, k) : lerp(wM, wB, k - 1); return [cx - w / 2, cx + w / 2]; };
    // 벽돌
    D.shadow(() => { poly(0); const g = ctx.createLinearGradient(cx - wM / 2, 0, cx + wM / 2, 0); g.addColorStop(0, '#c2673f'); g.addColorStop(0.5, '#e08a5c'); g.addColorStop(1, '#a8532f'); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 4 });
    ctx.save(); poly(0); ctx.clip(); ctx.strokeStyle = 'rgba(120,50,20,.35)'; ctx.lineWidth = 1.5;
    for (let y = topY; y < botY; y += 16) { ctx.beginPath(); ctx.moveTo(cx - wM, y); ctx.lineTo(cx + wM, y); ctx.stroke(); for (let x = cx - wM; x < cx + wM; x += 34) { ctx.beginPath(); ctx.moveTo(x + ((y - topY) / 16 % 2) * 17, y); ctx.lineTo(x + ((y - topY) / 16 % 2) * 17, y + 16); ctx.stroke(); } }
    ctx.restore();
    ctx.strokeStyle = '#7c3a1a'; ctx.lineWidth = 3; poly(0); ctx.stroke();
    // 속
    poly(wall); ctx.fillStyle = '#2b1d17'; ctx.fill();
    ctx.save(); poly(wall); ctx.clip();
    const bandH = H * 0.1, nb = 7;
    for (let b = 0; b < nb; b++) {
      const isOre = b % 2 === 1, amt = isOre ? A.ore : A.coke; if (amt < 0.02) continue;
      const y0 = topY + 10 + b * bandH, [l, r] = cavL(y0 + bandH / 2), n = Math.floor((r - l) / 15);
      for (let i = 0; i < n; i++) {
        const px = l + 10 + i * 15 + hash(b, i) * 6, py = y0 + bandH / 2 + (hash(i, b) - 0.5) * 8 + f * 8;
        const rad = (isOre ? 6.4 - 1.4 * sleft(f, 0.4, 0.95) : 6) * (0.8 + hash(b + 3, i) * 0.4) * amt;
        const col = isOre ? mixc('#a14a22', '#d1d5db', sleft(f, 0.4, 0.95)) : '#111827';
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px, py, rad, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(px - rad * 0.3, py - rad * 0.3, rad * 0.35, 0, TAU); ctx.fill();
      }
    }
    // 아래 불꽃 빛
    const hot = Math.min(A.coke, A.air) * sm(f / 0.25);
    if (hot > 0.02) D.glow(cx, botY - 46, 90, '#fb923c', 0.6 * hot);
    // 쇳물
    const pool = sm((f - 0.62) / 0.3);
    if (pool > 0.01) { const py = botY - 18 - 22 * pool; const g = ctx.createLinearGradient(0, py, 0, botY); g.addColorStop(0, '#fde68a'); g.addColorStop(0.3, '#fb923c'); g.addColorStop(1, '#ea580c'); ctx.fillStyle = g; ctx.fillRect(cx - wB, py + Math.sin(t * 3) * 1.2, wB * 2, botY - py); D.glow(cx, py, 60, '#fde68a', 0.5 * pool); }
    // CO 기체 (일산화 탄소)
    if (hot > 0.1 && !RM || (RM && hot > 0.1)) {
      for (let i = 0; i < 9; i++) {
        const u = (t * 0.22 + i / 9) % 1, y = botY - 60 - u * (H - 100), [l, r] = cavL(y), x = lerp(l + 14, r - 14, hash(i, 5)) + Math.sin(t * 2 + i) * 4;
        const co2 = f > 0.7 && u > 0.5;
        ctx.save(); ctx.globalAlpha = 0.85 * hot * (u < 0.1 ? u * 10 : 1); D.sphere(x, y, 11, co2 ? '#94a3b8' : '#60a5fa', { gloss: true });
        D.text(x, y + 4.5, co2 ? 'CO₂' : 'CO', { size: 11.5, weight: 800, color: '#fff' }); ctx.restore();
      }
    }
    ctx.restore();
    // 공기관
    const py = botY - 34, [bl] = cavL(botY - 30);
    ctx.fillStyle = '#6b7280'; rr(B.x + 14, py - 11, bl - B.x - 12, 22, 5).fill(); ctx.fillStyle = '#9ca3af'; ctx.fillRect(B.x + 14, py - 8, bl - B.x - 12, 5);
    if (A.air > 0.05) { for (let i = 0; i < 4; i++) { const u = (t * 0.7 + i * 0.25) % 1, x = B.x + 24 + u * (bl - B.x - 40); ctx.save(); ctx.globalAlpha = A.air * (1 - u * 0.5); ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 6, py - 6); ctx.lineTo(x + 2, py); ctx.lineTo(x - 6, py + 6); ctx.stroke(); ctx.restore(); } }
    D.text(B.x + 14, py + 26, '💨 뜨거운 공기', { size: 13, weight: 800, color: '#7c2d12', align: 'left' }); D.text(B.x + 14, py + 43, '(산소 O₂ 공급)', { size: 12.5, weight: 700, color: '#9a3412', align: 'left' });
    // 위 더미
    const pile = (x, amt, col, label) => {
      ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * amt; ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(x, topY - 8, wT * 0.26, 20 + 8 * amt, 0, Math.PI, TAU); ctx.fill(); ctx.restore();
      if (amt < 0.05) { ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, topY - 8, wT * 0.26, 24, 0, Math.PI, TAU); ctx.stroke(); ctx.restore(); }
      D.text(x, topY - 40, label, { size: 13, weight: 800, color: '#4c1d95' });
    };
    pile(cx - wT * 0.3, A.ore, '#a14a22', '철광석 Fe₂O₃'); pile(cx + wT * 0.3, A.coke, '#1f2937', '코크스 C');
    // 쇳물 배출 + 국자
    const lx = cx + wB / 2 + wall + 20;
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(cx + wB / 2 + wall - 2, botY - 24, 36, 10);
    const flow = sm((f - 0.9) / 0.1);
    if (flow > 0.02) { ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(lx + 8, botY - 19); ctx.lineTo(lx + 8, botY + 10 * flow); ctx.stroke(); }
    ctx.fillStyle = '#4b5563'; rr(lx - 14, botY + 6, 46, 28, 6).fill(); if (flow > 0.02) { ctx.fillStyle = '#fb923c'; rr(lx - 10, botY + 14 - 6 * flow, 38, 8 + 6 * flow, 4).fill(); }
    if (flow > 0.5 && !ph) D.text(lx + 9, botY + 48, '쇳물 (Fe)', { size: 13, weight: 800, color: '#c2410c' });
  }
  function drawBlastBench(t, dt) {
    const B = LAY().B; benchCard(B, '#fff7ed', '#ffedd5');
    FB.oreA = approach(FB.oreA, FB.ore ? 1 : 0, dt, 5); FB.cokeA = approach(FB.cokeA, FB.coke ? 1 : 0, dt, 5); FB.airA = approach(FB.airA, FB.air ? 1 : 0, dt, 5);
    drawFurnace(B, { ore: FB.oreA, coke: FB.cokeA, air: FB.airA }, FB.f, t, dt);
    D.text(B.x + B.w / 2, B.y + 26, '🏭 용광로 단면', { size: 15.5, weight: 800, color: '#7c2d12' });
    // 역사 막대
    const by = B.y + B.h - (PHONE ? 34 : 44), bw = (B.w - 60) / 2;
    ctx.fillStyle = '#f59e0b'; rr(B.x + 20, by, bw, 30, 15).fill(); ctx.fillStyle = FB.made ? '#475569' : '#cbd5e1'; rr(B.x + 40 + bw, by, bw, 30, 15).fill();
    D.text(B.x + 20 + bw / 2, by + 20, '청동기 시대', { size: 13.5, weight: 800, color: '#fff' });
    D.text(B.x + 40 + bw * 1.5, by + 20, FB.made ? '철기 시대 ⚔️🌾' : '철기 시대 (?)', { size: 13.5, weight: 800, color: FB.made ? '#fff' : '#64748b' });
    D.arrow(B.x + 22 + bw, by + 15, B.x + 38 + bw, by + 15, { color: '#7c3aed', width: 3, head: 9 });
    // 단계 설명
    const cap = !fbReady() ? '철광석 · 코크스 · 뜨거운 공기를 모두 넣어요' : FB.f < 0.25 ? '코크스(C)가 산소와 만나 일산화 탄소(CO)가 생겨요' : FB.f < 0.95 ? 'CO가 철광석의 산소를 가져가요' : '철이 녹아 흘러나와요 → 철기 시대의 농기구·무기';
    D.label(B.x + B.w / 2, B.y + 54, cap, { bg: '#7c2d12', size: PHONE ? 12 : 13.5 });
  }
  /* ---- ④ 비교 ---- */
  function drawBurner(B, rs, t, dt) {
    benchCard(B, '#fff7ed', '#fee2e2');
    const cx = B.x + B.w * 0.5, tableY = B.y + B.h * 0.9, topY = B.y + B.h * 0.66;
    ctx.fillStyle = '#d6c7b0'; rr(B.x + 14, tableY, B.w - 28, 12, 6).fill();
    // 가스관 + 버너
    ctx.fillStyle = '#6b7280'; rr(B.x + 20, topY + 30, cx - B.x - 40, 14, 5).fill();
    ctx.fillStyle = '#374151'; rr(cx - 30, topY + 10, 60, 40, 10).fill(); ctx.fillStyle = '#9ca3af'; rr(cx - 22, topY + 4, 44, 10, 4).fill();
    D.text(B.x + 22, topY + 20, 'CH₄ 메테인 (도시가스)', { size: 13, weight: 800, color: '#7c2d12', align: 'left' });
    const fl = rs.run ? 1 : rs.done ? 0.3 : 0; rs.fl = approach(rs.fl || 0, fl, dt, 4);
    if (rs.fl > 0.03) D.flame(cx, topY + 6, Math.max(40, (topY - B.y) * 0.5) * rs.fl, t);
    const prog = rs.prog;
    if (prog > 0.1) for (let i = 0; i < 6; i++) { const ph = (t * 0.5 + i * 0.17) % 1, hx = cx - 60 + i * 24, y = topY - 80 - ph * 80; ctx.save(); ctx.globalAlpha = 0.6 * (1 - ph) * sleft(prog, 0.1, 0.4); ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3.5; ctx.beginPath(); for (let j = 0; j <= 6; j++) { const yy = y - j * 5, xx = hx + Math.sin(j * 1.2 + t * 4 + i) * 5; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore(); }
    D.text(cx, B.y + 34, '🔥 연소: 메테인이 산소와 결합해요', { size: 15, weight: 800, color: '#7f1d1d' });
    D.text(cx + 100, topY - 20, '공기 속 O₂ →', { size: 13, weight: 800, color: '#475569' });
    if (prog > 0.5) D.label(cx, B.y + 62, '열 방출 + CO₂ + H₂O', { bg: '#ea580c', size: 13.5 });
  }
  function drawLeaf(B, rs, t, dt) {
    benchCard(B, '#ecfdf5', '#d1fae5');
    const cx = B.x + B.w * 0.5, cy = B.y + B.h * 0.5, prog = rs.prog;
    D.text(cx, B.y + 34, '🌿 광합성: 이산화 탄소가 산소를 잃어요', { size: 15, weight: 800, color: '#14532d' });
    D.glow(B.x + B.w - 56, B.y + 70, 54, '#fde68a', 0.9); D.sphere(B.x + B.w - 56, B.y + 70, 22, '#fbbf24', { gloss: false });
    for (let i = 0; i < 6; i++) { const a = 1.9 + i * 0.28; ctx.strokeStyle = 'rgba(251,191,36,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(B.x + B.w - 56 + Math.cos(a) * 30, B.y + 70 + Math.sin(a) * 30); ctx.lineTo(B.x + B.w - 56 + Math.cos(a) * 62, B.y + 70 + Math.sin(a) * 62); ctx.stroke(); }
    D.text(B.x + B.w - 56, B.y + 118, '빛에너지', { size: 12.5, weight: 800, color: '#b45309' });
    // 잎
    ctx.save(); ctx.translate(cx, cy + 14); ctx.rotate(-0.25);
    const g = ctx.createLinearGradient(-90, 0, 90, 0); g.addColorStop(0, '#4ade80'); g.addColorStop(1, '#16a34a');
    D.shadow(() => { ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-110, 0); ctx.quadraticCurveTo(0, -120, 110, 0); ctx.quadraticCurveTo(0, 120, -110, 0); ctx.fill(); }, { blur: 8, y: 4 });
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-110, 0); ctx.lineTo(110, 0); for (let i = -2; i <= 2; i++) { if (!i) continue; ctx.moveTo(i * 30, 0); ctx.lineTo(i * 30 + 22, -46); ctx.moveTo(i * 30, 0); ctx.lineTo(i * 30 + 22, 46); } ctx.stroke();
    ctx.restore();
    // 줄기·뿌리
    ctx.strokeStyle = '#65a30d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 100, cy + 52); ctx.lineTo(cx - 130, cy + 110); ctx.stroke();
    D.arrow(B.x + 26, cy - 66, cx - 70, cy - 22, { color: '#475569', width: 3.5, head: 11, alpha: 0.9 }); D.text(B.x + 24, cy - 76, 'CO₂ 들어감', { size: 13, weight: 800, color: '#475569', align: 'left' });
    D.arrow(B.x + 40, cy + 150, cx - 108, cy + 104, { color: '#0284c7', width: 3.5, head: 11, alpha: 0.9 }); D.text(B.x + 24, cy + 170, 'H₂O (뿌리에서)', { size: 13, weight: 800, color: '#0369a1', align: 'left' });
    D.arrow(cx + 70, cy - 40, B.x + B.w - 40, cy - 90 + 30, { color: '#ef4444', width: 3.5, head: 11, alpha: 0.9 }); D.text(B.x + B.w - 24, cy - 30, 'O₂ 나옴', { size: 13, weight: 800, color: '#b91c1c', align: 'right' });
    if (rs.run && !RM && Math.random() < dt * 5) parts.emit({ x: cx + 30 + Math.random() * 40, y: cy - 20, vx: 40 + Math.random() * 30, vy: -40 - Math.random() * 30, life: 1.6, size: 5, color: '#ef4444', shape: 'bubble', gravity: -10 });
    if (prog > 0.8) D.label(cx - 6, cy + 20, '포도당(양분)', { bg: '#15803d', size: 13 });
  }
  function drawCompareBench(k, t, dt) {
    const B = LAY().B, key = k === 'fe' ? 'fe2' : k, rs = RS[key];
    if (k === 'ch4') drawBurner(B, rs, t, dt);
    else if (k === 'ph') drawLeaf(B, rs, t, dt);
    else {
      benchCard(B, '#fff7ed', '#ffedd5');
      const f = 0.25 + 0.7 * rs.prog; FB2.f = f; FB2.a = approach(FB2.a, 1, dt, 5);
      drawFurnace(B, { ore: FB2.a, coke: FB2.a, air: FB2.a }, f, t, dt);
      D.text(B.x + B.w / 2, B.y + 26, '🏭 철의 제련: 철광석이 산소를 잃어요', { size: 14.5, weight: 800, color: '#7c2d12' });
    }
    const msgs = { ch4: '산소가 메테인 쪽으로 가요', ph: '산소가 이산화 탄소에서 떠나요', fe: '산소가 철광석에서 CO 쪽으로 가요' };
    if (rs.prog >= 0.98) D.label(B.x + B.w / 2, B.y + B.h - 24, '➜ ' + msgs[k], { bg: '#4c1d95', size: PHONE ? 12.5 : 14 });
  }
  const FB2 = { f: 0, a: 0 };

  /* ======================================================
     조작판 · 화면 전환
     ====================================================== */
  let MODE = 'oxid', game = null, S_fade = 0, hintTimer2 = null;
  const ST = { metal: 'cu', red: 'h2', cmp: 'ch4' };
  const MODE_LABEL = { oxid: '🔥 산화', reduc: '🔬 환원', blast: '🏭 철의 제련', compare: '⚖️ 비교' };
  const curKey = () => (MODE === 'oxid' ? ST.metal : MODE === 'reduc' ? ST.red : MODE === 'blast' ? 'fe' : ST.cmp === 'fe' ? 'fe2' : ST.cmp);
  const pct = (k) => Math.round(RS[k].prog * 100);
  const TAG = { h2: { a: '', b: '' }, c: { a: '', b: '' } };
  const TAG_ROWS = { h2: [['a', 'CuO', 're'], ['b', 'H₂', 'ox']], c: [['a', 'CuO', 're'], ['b', 'C', 'ox']] };
  const TAG_OPT = [['', '고르기'], ['ox', '산화됨'], ['re', '환원됨']];
  const CMP = { ch4: { ox: '', re: '' }, fe: { ox: '', re: '' }, ph: { ox: '', re: '' } };
  const CMP_DEF = {
    ch4: { opts: [['O2', 'O₂ (산소)'], ['CH4', 'CH₄ (메테인)']], ox: 'CH4', re: 'O2', name: '연소' },
    fe: { opts: [['CO', 'CO (일산화 탄소)'], ['FE', 'Fe₂O₃ (산화 철(Ⅲ))']], ox: 'CO', re: 'FE', name: '제련' },
    ph: { opts: [['H2O', 'H₂O (물)'], ['CO2', 'CO₂ (이산화 탄소)']], ox: 'H2O', re: 'CO2', name: '광합성' },
  };
  function setMode(m) {
    MODE = m; S_fade = 1; parts.clear();
    $('#tbLabel').textContent = MODE_LABEL[m];
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    const h = $('#stageHint'); if (h) h.classList.add('hide');
    renderTagRows(); renderCmpRows(); ctlUpdate();
  }
  function mkSelect(opts, val, onChange, aria) {
    const s = document.createElement('select'); s.setAttribute('aria-label', aria);
    opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); });
    s.value = val; s.addEventListener('change', () => { s.classList.remove('ok', 'bad'); onChange(s.value); Sound.click(); ctlUpdate(); }); return s;
  }
  function renderTagRows() {
    const box = $('#tagRows'); box.innerHTML = '';
    TAG_ROWS[ST.red].forEach(([k, name]) => {
      const row = document.createElement('div'); row.className = 'tag-row';
      const lab = document.createElement('span'); lab.textContent = name + (k === 'a' ? ' (산화 구리(Ⅱ))' : name === 'H₂' ? ' (수소)' : ' (탄소)'); row.appendChild(lab);
      const sel = mkSelect(TAG_OPT, TAG[ST.red][k], (v) => { TAG[ST.red][k] = v; }, name + ' 이름표'); sel.dataset.k = k; row.appendChild(sel); box.appendChild(row);
    });
  }
  function renderCmpRows() {
    const box = $('#cmpRows'); box.innerHTML = '';
    const D0 = CMP_DEF[ST.cmp], row = document.createElement('div'); row.className = 'tag-row';
    ['ox', 're'].forEach((k) => { const sel = mkSelect([['', '고르기']].concat(D0.opts), CMP[ST.cmp][k], (v) => { CMP[ST.cmp][k] = v; }, (k === 'ox' ? '산화된' : '환원된') + ' 물질'); sel.dataset.k = k; row.appendChild(sel); });
    box.appendChild(row);
  }
  function ctlUpdate() {
    $('#modeSeg').hidden = !(game && game.free);
    $$('#ctrlCard [data-show]').forEach((n) => { n.hidden = n.dataset.show !== MODE; });
    $$('#metalSeg button').forEach((b) => b.classList.toggle('on', b.dataset.k === ST.metal));
    $$('#redSeg button').forEach((b) => b.classList.toggle('on', b.dataset.k === ST.red));
    $$('#cmpSeg button').forEach((b) => b.classList.toggle('on', b.dataset.k === ST.cmp));
    const heatLbl = (k) => (RS[k].done ? '✓ 반응 완료' : RS[k].run ? '반응 중…' : '🔥 가열하기');
    $('#bHeat1').textContent = heatLbl(ST.metal); $('#bHeat1').disabled = RS[ST.metal].run || RS[ST.metal].done;
    $('#bHeat2').textContent = heatLbl(ST.red); $('#bHeat2').disabled = RS[ST.red].run || RS[ST.red].done;
    $('#oMass').textContent = f1(massNow(ST.metal)) + ' g';
    $('#oRed').textContent = RS[ST.red].done ? '완료' : RS[ST.red].run ? pct(ST.red) + ' %' : '대기';
    $('#note1').innerHTML = ST.metal === 'cu' ? '구리 가루 <b>' + f1(MASS.cu.m0) + ' g</b>을 가열해요. 오른쪽 입자 모형에서 <b>산소 원자(빨강)</b>가 어디로 가는지 따라가 봐요.' : '마그네슘 리본 <b>' + f1(MASS.mg.m0) + ' g</b>을 가열해요. 눈부신 빛이 나요. 쳐다보지 말고 모형을 봐요.';
    $('#note2').innerHTML = ST.red === 'h2' ? '검은 산화 구리(Ⅱ)에 <b>수소 기체</b>를 흘리며 가열해요. 반응이 끝난 뒤 물질마다 이름표를 붙여요.' : '검은 산화 구리(Ⅱ)와 <b>탄소 가루</b>를 섞어 가열해요. 발생한 기체를 석회수에 통과시켜요.';
    $('#oBlast').textContent = [FB.ore, FB.coke, FB.air].filter(Boolean).length + ' / 3';
    [['bOre', FB.ore, '⛏ 철광석 넣기'], ['bCoke', FB.coke, '⚫ 코크스 넣기'], ['bAir', FB.air, '💨 뜨거운 공기 불어 넣기']].forEach(([id, on, lab]) => { const b = $('#' + id); b.classList.toggle('done', on); b.disabled = on; b.textContent = on ? '✓ ' + lab.slice(2) : lab; });
    $('#note3').innerHTML = !fbReady() ? '세 가지를 모두 넣으면 용광로가 작동해요. 순서는 상관없어요.' : FB.made ? '철이 만들어졌어요! 오른쪽 모형에서 <b>산소가 가는 방향</b>을 확인해요.' : '반응이 진행 중이에요. 오른쪽 모형에서 CO가 철광석의 산소를 가져가는 모습을 봐요.';
    const cdone = ['ch4', 'ph', 'fe'].filter((k) => CMP[k].ox === CMP_DEF[k].ox && CMP[k].re === CMP_DEF[k].re).length;
    $('#oCmp').textContent = cdone + ' / 3';
    const ck = ST.cmp === 'fe' ? 'fe2' : ST.cmp;
    $('#bPlay4').textContent = RS[ck].done ? '✓ 반응 완료' : RS[ck].run ? '반응 중…' : '▶ 반응 보기'; $('#bPlay4').disabled = RS[ck].run || RS[ck].done;
    $('#note4').innerHTML = ST.cmp === 'ph' ? '광합성에서 <b>산소 기체가 나오는 쪽</b>이 산화된 물질이에요. 산소를 잃고 양분이 되는 물질은 환원된 물질이에요.' : '반응을 본 뒤, 산소를 <b>얻은</b> 물질(산화)과 산소를 <b>잃은</b> 물질(환원)을 골라요.';
  }
  function startRx(k) { const r = RS[k]; if (r.run || r.done) return; r.run = true; Sound.click(); ctlUpdate(); }
  function resetRx(k) { rsReset(k); if (HEAT[k] != null) HEAT[k] = 0; parts.clear(); ctlUpdate(); }
  $('#metalSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); ST.metal = b.dataset.k; ctlUpdate(); } });
  $('#redSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); ST.red = b.dataset.k; renderTagRows(); ctlUpdate(); } });
  $('#cmpSeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { Sound.click(); ST.cmp = b.dataset.k; renderCmpRows(); ctlUpdate(); } });
  $('#bHeat1').addEventListener('click', () => startRx(ST.metal)); $('#bReset1').addEventListener('click', () => { Sound.click(); resetRx(ST.metal); });
  $('#bHeat2').addEventListener('click', () => startRx(ST.red)); $('#bReset2').addEventListener('click', () => { Sound.click(); resetRx(ST.red); });
  $('#bPlay4').addEventListener('click', () => startRx(ST.cmp === 'fe' ? 'fe2' : ST.cmp)); $('#bReset4').addEventListener('click', () => { Sound.click(); resetRx(ST.cmp === 'fe' ? 'fe2' : ST.cmp); });
  $('#bOre').addEventListener('click', () => { FB.ore = true; Sound.tick(); ctlUpdate(); });
  $('#bCoke').addEventListener('click', () => { FB.coke = true; Sound.tick(); ctlUpdate(); });
  $('#bAir').addEventListener('click', () => { FB.air = true; Sound.tick(); ctlUpdate(); });
  $('#bReset3').addEventListener('click', () => { Sound.click(); fbReset(); parts.clear(); ctlUpdate(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  function showHint(msg, ms) { const h = $('#stageHint'); if (!h) return; h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer2); hintTimer2 = setTimeout(() => h.classList.add('hide'), ms || 4500); }

  function enterLevel(li) {
    ['cu', 'mg', 'h2', 'c', 'ch4', 'ph', 'fe2'].forEach((k) => { resetRx(k); }); fbReset(); FB2.a = 0;
    Object.keys(TAG).forEach((k) => { TAG[k].a = TAG[k].b = ''; }); Object.keys(CMP).forEach((k) => { CMP[k].ox = CMP[k].re = ''; });
    if (li === 0) { ST.metal = 'cu'; setMode('oxid'); showHint('🔥 가열하기를 눌러 입자 모형에서 산소 원자가 어디로 가는지 봐요', 5500); }
    else if (li === 1) { ST.red = 'h2'; setMode('reduc'); }
    else if (li === 2) setMode('blast');
    else { ST.cmp = 'ch4'; setMode('compare'); }
  }

  /* ---------- 읽음 칸 ---------- */
  function readouts() {
    if (MODE === 'oxid') { const k = ST.metal, M = MASS[k]; setReadouts(['시료', M.name + ' → ' + M.prod, '질량', f1(massNow(k)) + ' g (처음 ' + f1(M.m0) + ' g)', '결합한 산소', f1(massNow(k) - M.m0) + ' g']); }
    else if (MODE === 'reduc') setReadouts(['반응', ST.red === 'h2' ? 'CuO + H₂' : '2CuO + C', '진행', pct(ST.red) + ' %', '확인할 것', ST.red === 'h2' ? '물(H₂O)' : '석회수 변화']);
    else if (MODE === 'blast') setReadouts(['넣은 재료', [FB.ore, FB.coke, FB.air].filter(Boolean).length + ' / 3', '반응 진행', fbReady() ? pct('fe') + ' %' : '—', '얻은 것', FB.made ? '철(Fe)' : '—']);
    else { const ck = ST.cmp === 'fe' ? 'fe2' : ST.cmp; setReadouts(['사례', CMP_DEF[ST.cmp].name, '반응 진행', pct(ck) + ' %', '표 완성', ['ch4', 'ph', 'fe'].filter((k) => CMP[k].ox === CMP_DEF[k].ox && CMP[k].re === CMP_DEF[k].re).length + ' / 3']); }
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  const ensure = (m) => { if (MODE !== m) setMode(m); };
  const selMark = (sel, ok) => { sel.classList.remove('ok', 'bad'); sel.classList.add(ok ? 'ok' : 'bad'); };
  function tagCheck() {
    if (!RS.h2.done || !RS.c.done) return '수소와 탄소를 쓴 <b>두 반응을 모두 실행</b>한 뒤 이름표를 붙여요.';
    let miss = 0, wrong = 0;
    ['h2', 'c'].forEach((v) => TAG_ROWS[v].forEach(([k, , ans]) => { const val = TAG[v][k]; if (!val) miss++; else if (val !== ans) wrong++; }));
    $$('#tagRows select').forEach((s) => { const ans = TAG_ROWS[ST.red].find((r) => r[0] === s.dataset.k)[2], v = TAG[ST.red][s.dataset.k]; if (v) selMark(s, v === ans); });
    if (miss) return '이름표를 모두 붙여요. 수소 반응과 탄소 반응 <b>두 곳 모두</b> 붙여야 해요. (남은 칸 ' + miss + '개)';
    if (wrong) return '이름표가 <b>' + wrong + '개</b> 알맞지 않아요. 산소를 얻으면 산화, 산소를 잃으면 환원이에요.';
    return true;
  }
  function cmpCheck() {
    const bad = []; ['ch4', 'fe', 'ph'].forEach((k) => { const c = CMP[k], d = CMP_DEF[k]; if (!c.ox || !c.re) bad.push(d.name + ' (비어 있음)'); else if (c.ox !== d.ox || c.re !== d.re) bad.push(d.name); });
    $$('#cmpRows select').forEach((s) => { const d = CMP_DEF[ST.cmp], v = CMP[ST.cmp][s.dataset.k]; if (v) selMark(s, v === d[s.dataset.k]); });
    if (bad.length) return '아직 맞지 않은 사례가 있어요: <b>' + bad.join(', ') + '</b>. 세 사례의 표를 모두 채워요.';
    return true;
  }
  const levels = [
    {
      title: '산화: 산소를 얻는 반응', short: '산화', icon: '🔥', phase: '실험',
      features: ['oxid'],
      intro: '<p class="si-q">❓ 탐구 질문: 철광석이 철이 되고, 석탄이 불타고, 식물이 양분을 만드는 일에는 어떤 공통점이 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 화학 반응식과 물질이 일정한 질량비로 반응하는 것을 배웠어요(중3 \'화학 반응의 규칙성\'). 구리와 산소는 <b>4 : 1</b>의 질량비로 결합해요.</div>' +
        '<p>먼저 <b>구리 가루</b>와 <b>마그네슘 리본</b>을 가열하며 무슨 일이 일어나는지 관찰해요. 물질의 색, <b>질량</b>, 그리고 입자 모형에서 <b>산소 원자의 움직임</b>을 함께 봐요.</p>',
      setup() { enterLevel(0); },
      recap: '어떤 물질이 산소를 얻는 반응이 산화예요. 가열한 금속은 공기 중의 산소와 결합해서 질량이 늘어나요.',
      summary: '<ul><li><b>산화</b> = 물질이 <b>산소를 얻는</b> 반응.</li><li>구리 4.0 g → 산화 구리(Ⅱ) 5.0 g : 늘어난 1.0 g은 <b>결합한 산소</b>의 질량. (2Cu + O₂ → 2CuO)</li><li>마그네슘 3.0 g → 산화 마그네슘 5.0 g. 연소할 때 눈부신 빛이 나요. (2Mg + O₂ → 2MgO)</li></ul>',
      missions: [
        {
          title: '구리와 마그네슘 가열',
          goal: '<b>구리 가루</b>와 <b>마그네슘 리본</b>을 각각 <b>🔥 가열</b>해 반응을 끝까지 관찰하세요.',
          hint: '시료를 고른 뒤 🔥 가열하기를 눌러요. 반응이 끝나면 다른 시료도 골라 가열해요.',
          setup() { ensure('oxid'); },
          check: () => RS.cu.done && RS.mg.done, hold: 0.4,
          status: () => mark(RS.cu.done) + ' 구리 가열 · ' + mark(RS.mg.done) + ' 마그네슘 가열' + (RS.cu.run ? ' (' + pct('cu') + ' %)' : RS.mg.run ? ' (' + pct('mg') + ' %)' : ''),
          explain: '두 금속 모두 <b>산소 원자(빨강)</b>가 금속 쪽으로 옮겨 가 결합했어요. 구리는 붉은색에서 <b>검은색 산화 구리(Ⅱ)</b>로, 마그네슘은 <b>흰색 산화 마그네슘</b>으로 변했어요.',
        },
        {
          type: 'quiz', title: '늘어난 질량의 정체',
          goal: '구리 ' + f1(MASS.cu.m0) + ' g을 충분히 가열했더니 산화 구리(Ⅱ) ' + f1(MASS.cu.m1) + ' g이 되었어요. 늘어난 <b>' + f1(MASS.cu.m1 - MASS.cu.m0) + ' g</b>은 무엇의 질량일까요?',
          setup() { ensure('oxid'); },
          choices: ['구리 안에서 새로 만들어진 구리', '구리와 결합한 산소', '열에너지의 질량', '구리가 내놓은 기체'],
          answer: 1,
          feedback: ['구리 원자는 새로 생기지 않아요. 원자의 종류와 수는 그대로예요.', '', '열은 물질이 아니라 에너지라서 질량으로 더해지지 않아요.', '구리가 기체를 내놓은 것이 아니라 공기 중의 산소를 얻었어요.'],
          explain: '구리가 공기 중의 <b>산소와 결합</b>했어요. 그래서 산화 구리(Ⅱ)의 질량 = 구리의 질량 + 결합한 산소의 질량이에요. 마그네슘도 ' + f1(MASS.mg.m0) + ' g이 ' + f1(MASS.mg.m1) + ' g이 되어 질량이 늘어났어요.',
        },
        {
          type: 'quiz', title: '산화란?',
          goal: '마그네슘이 연소해 산화 마그네슘이 될 때, 마그네슘에게 일어난 변화를 가리키는 말은?',
          setup() { ensure('oxid'); },
          choices: ['산소를 잃는 반응이므로 환원', '산소를 얻는 반응이므로 산화', '질량이 줄어드는 반응이므로 환원', '불꽃이 나므로 산화'],
          answer: 1,
          feedback: ['마그네슘은 산소를 잃은 것이 아니라 얻었어요.', '', '질량은 오히려 늘어났어요. 그리고 환원은 산소를 잃는 것이에요.', '불꽃이 나지 않아도 산소를 얻으면 산화예요. 산화의 기준은 산소를 얻는 것이에요.'],
          explain: '물질이 <b>산소를 얻는 반응이 산화</b>예요. 빛이나 불꽃은 산화의 기준이 아니에요. 철이 천천히 녹스는 것도 산소를 얻는 산화예요.',
        },
      ],
    },
    {
      title: '환원: 산소를 잃는 반응', short: '환원', icon: '🔬', phase: '실험',
      features: ['reduc'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 구리가 산소를 얻어 검은색 산화 구리(Ⅱ)가 되는 <b>산화</b>를 관찰했어요.</div>' +
        '<p>이번에는 거꾸로 <b>산화 구리(Ⅱ)</b>를 <b>수소</b> 또는 <b>탄소</b>와 함께 가열해요. 검은색 가루가 다시 붉은 구리가 돼요. 이때 산소가 어디로 가는지 따라가 봐요.</p>',
      setup() { enterLevel(1); },
      recap: '어떤 물질이 산소를 잃는 반응이 환원이에요. 산화 구리(Ⅱ)가 환원될 때 산소를 받아 간 수소와 탄소는 산화돼요. 산화와 환원은 동시에 일어나요.',
      summary: '<ul><li><b>환원</b> = 물질이 <b>산소를 잃는</b> 반응.</li><li>CuO + H₂ → Cu + H₂O : CuO는 환원, H₂는 산화 (물이 생겨요).</li><li>2CuO + C → 2Cu + CO₂ : CuO는 환원, C는 산화 (석회수가 뿌옇게 흐려져요).</li><li>산화와 환원은 <b>항상 동시에</b> 일어나요. 산소를 잃는 물질이 있으면 그 산소를 얻는 물질이 있어요.</li></ul>',
      missions: [
        {
          title: '두 가지 환원 반응',
          goal: '<b>수소(H₂)</b>와 <b>탄소(C)</b>를 쓴 두 반응을 각각 🔥 가열해 끝까지 관찰하세요.',
          hint: '위쪽 단추로 수소와 탄소를 바꿔 가며 가열해요. 검은색이 붉은색으로 변하는지 봐요.',
          setup() { ensure('reduc'); },
          check: () => RS.h2.done && RS.c.done, hold: 0.4,
          status: () => mark(RS.h2.done) + ' 수소와 반응 · ' + mark(RS.c.done) + ' 탄소와 반응' + (RS.h2.run ? ' (' + pct('h2') + ' %)' : RS.c.run ? ' (' + pct('c') + ' %)' : ''),
          explain: '두 경우 모두 산화 구리(Ⅱ)의 <b>산소 원자가 떠나</b> 수소 또는 탄소 쪽으로 옮겨 갔어요. 수소는 물(H₂O)이 되고, 탄소는 이산화 탄소(CO₂)가 되어 석회수를 뿌옇게 만들어요.',
        },
        {
          title: '이름표 붙이기',
          goal: '두 반응에서 <b>물질마다</b> 산화됨 / 환원됨 이름표를 붙이고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '산소를 잃은 쪽이 환원, 산소를 얻은 쪽이 산화예요. 수소 반응과 탄소 반응을 바꿔 가며 모두 붙여요.',
          manual: true,
          setup() { ensure('reduc'); },
          check: () => tagCheck(),
          explain: '산화 구리(Ⅱ)는 산소를 잃어 <b>환원</b>, 산소를 받은 수소와 탄소는 <b>산화</b>예요. 한 반응 안에 환원되는 물질과 산화되는 물질이 <b>짝으로</b> 있어요.',
        },
        {
          type: 'quiz', title: '산화와 환원의 관계',
          goal: '산화 구리(Ⅱ)가 환원될 때 함께 일어나는 일은?',
          setup() { ensure('reduc'); },
          choices: ['수소(또는 탄소)가 그 산소를 얻어 산화된다', '수소(또는 탄소)는 아무 변화가 없다', '산화 구리(Ⅱ)의 질량이 늘어난다', '환원은 산화와 상관없이 혼자 일어난다'],
          answer: 0,
          feedback: ['', '수소는 산소를 얻어 물이 되었어요. 변화가 있어요.', '산소를 잃었으니 질량은 줄어들어요.', '산소를 잃는 물질이 있으면 그 산소를 얻는 물질이 반드시 있어야 해요.'],
          explain: '산소는 사라지지 않고 <b>한 물질에서 다른 물질로 옮겨 가요</b>. 그래서 한 물질이 환원(산소를 잃음)되면 다른 물질은 산화(산소를 얻음)돼요. 산화와 환원은 동시에 일어나요.',
        },
      ],
    },
    {
      title: '철의 제련: 철광석에서 철로', short: '철의 제련', icon: '🏭', phase: '적용',
      features: ['blast'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 산화 구리(Ⅱ)에서 산소를 떼어 내는 환원을 봤어요. 인류는 같은 원리로 철광석에서 <b>철</b>을 얻어 철기 시대를 열었어요.</div>' +
        '<p>용광로에 <b>철광석(산화 철(Ⅲ))</b>, <b>코크스(탄소)</b>, <b>뜨거운 공기</b>를 넣어요. 코크스가 불완전 연소해 만든 <b>일산화 탄소(CO)</b>가 철광석의 산소를 가져가요. 앞의 구리 환원과 <b>같은 산소 이동</b>인지 확인해요.</p>',
      setup() { enterLevel(2); },
      recap: '철의 제련에서 철광석(산화 철(Ⅲ))은 산소를 잃어 환원되어 철이 되고, 산소를 얻은 일산화 탄소는 산화되어 이산화 탄소가 돼요.',
      summary: '<ul><li>철의 제련: Fe₂O₃ + 3CO → 2Fe + 3CO₂</li><li>철광석 Fe₂O₃는 산소를 잃어 <b>환원</b>(철이 됨), CO는 산소를 얻어 <b>산화</b>(CO₂가 됨).</li><li>구리의 환원과 같은 <b>산소의 이동</b>이에요. 철의 제련 기술은 청동기 시대에서 <b>철기 시대</b>로 넘어가는 큰 변화를 가져왔어요.</li></ul>',
      missions: [
        {
          title: '원료를 넣어 철 얻기',
          goal: '용광로에 <b>철광석 · 코크스 · 뜨거운 공기</b>를 모두 넣어 <b>철</b>을 얻으세요.',
          hint: '⛏ 철광석, ⚫ 코크스, 💨 뜨거운 공기 단추를 모두 눌러요. 세 가지가 모두 들어가면 자동으로 반응이 시작돼요.',
          setup() { ensure('blast'); },
          check: () => FB.made, hold: 0.5,
          status: () => mark(FB.ore) + ' 철광석 · ' + mark(FB.coke) + ' 코크스 · ' + mark(FB.air) + ' 뜨거운 공기 · ' + mark(FB.made) + ' 철 얻음' + (fbReady() && !FB.made ? ' (' + pct('fe') + ' %)' : ''),
          explain: '코크스(C)가 뜨거운 공기의 산소와 만나 <b>CO</b>를 만들고, CO가 철광석의 <b>산소를 가져가</b> 철이 남아요. 입자 모형에서 산소 원자가 Fe에서 CO의 탄소 쪽으로 옮겨 가는 모습이 구리 환원과 같아요.',
        },
        {
          type: 'quiz', title: '누가 산화되었을까?',
          goal: '철광석(Fe₂O₃)이 철(Fe)이 되는 것은 환원이에요. 이때 <b>일산화 탄소(CO)</b>는?',
          setup() { ensure('blast'); },
          choices: ['산소를 잃어 환원된다', '산소를 얻어 이산화 탄소가 되므로 산화된다', '변화 없이 열만 전달한다', '철광석과 함께 환원된다'],
          answer: 1,
          feedback: ['CO는 산소를 잃은 것이 아니라 받아서 CO₂가 되었어요.', '', 'CO는 철광석의 산소를 직접 가져가는 물질이에요.', '산화와 환원은 동시에 일어나지만 서로 다른 물질에서 일어나요.'],
          explain: 'CO는 철광석의 산소를 얻어 CO₂가 돼요. 즉 <b>산소를 얻으니 산화</b>예요. 철광석은 환원, CO는 산화가 짝으로 일어났어요.',
        },
      ],
    },
    {
      title: '연소와 광합성: 산소의 방향', short: '연소·광합성', icon: '⚖️', phase: '적용',
      features: ['compare'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 철의 제련에서도 산화와 환원이 짝으로 일어나는 것을 봤어요.</div>' +
        '<p>이번에는 <b>연료의 연소</b>(산업 혁명을 이끈 화석 연료), <b>광합성</b>, 그리고 <b>철의 제련</b>을 나란히 비교해요. 각 반응에서 <b>산소를 얻은 물질</b>과 <b>산소를 잃은 물질</b>을 표로 정리하고, 세 변화의 공통점을 찾아요.</p>',
      setup() { enterLevel(3); },
      recap: '광합성, 연소, 철의 제련은 모두 산소가 한 물질에서 다른 물질로 옮겨 가는 산화·환원 반응이고, 산화와 환원은 짝으로 일어나요.',
      summary: '<table class="mini"><tr><th>변화</th><th>산화(산소를 얻음)</th><th>환원(산소를 잃음)</th></tr><tr><td>연소 CH₄ + 2O₂ → CO₂ + 2H₂O</td><td>CH₄</td><td>O₂</td></tr><tr><td>철의 제련</td><td>CO</td><td>Fe₂O₃</td></tr><tr><td>광합성</td><td>H₂O (O₂ 방출)</td><td>CO₂</td></tr></table><ul><li><b>공통점</b>: 산소가 한 물질에서 다른 물질로 옮겨 가며, 산화와 환원이 <b>동시에</b> 일어나요.</li><li>인류사: 철의 제련 → 철기 시대, 화석 연료의 연소 → 산업 혁명, 광합성 → 산소와 양분의 근원.</li></ul>',
      missions: [
        {
          title: '세 사례 표 채우기',
          goal: '연소 · 제련 · 광합성을 각각 <b>▶ 반응 보기</b> 한 뒤 <b>산화된 물질</b>과 <b>환원된 물질</b>을 표에 채우고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '산소를 얻은 물질이 산화된 물질, 산소를 잃은 물질이 환원된 물질이에요. 광합성에서는 산소 기체가 나오는 쪽(물)이 산화된 물질이에요.',
          manual: true,
          setup() { ensure('compare'); },
          check: () => cmpCheck(),
          explain: '연소에서는 CH₄가 산소를 얻어 <b>산화</b>되고 O₂는 <b>환원</b>돼요. 제련에서는 CO가 <b>산화</b>, Fe₂O₃가 <b>환원</b>이에요. 광합성에서는 CO₂가 산소를 잃어 <b>환원</b>되고, 물이 산화되어 산소 기체가 나와요(자세한 까닭은 다음 차시의 전자 이동에서 알아봐요).',
        },
        {
          type: 'quiz', title: '세 변화의 공통점',
          goal: '광합성, 화석 연료의 연소, 철의 제련의 <b>공통점</b>으로 알맞은 것은?',
          setup() { ensure('compare'); },
          choices: ['모두 열을 방출하는 반응이다', '산소가 한 물질에서 다른 물질로 옮겨 가며 산화와 환원이 동시에 일어난다', '모두 물질의 질량이 줄어드는 반응이다', '모두 산소가 새로 만들어지는 반응이다'],
          answer: 1,
          feedback: ['광합성은 빛에너지를 흡수해요. 열 방출은 공통점이 아니에요.', '', '연소·산화 반응에서는 질량이 늘어나는 물질도 있어요. 질량 변화는 공통점이 아니에요.', '산소는 새로 만들어지지 않고 옮겨 가요. 원자는 사라지거나 생기지 않아요.'],
          explain: '세 변화 모두 <b>산소의 이동</b>이 중심이에요. 산소를 잃는 물질(환원)과 산소를 얻는 물질(산화)이 항상 짝으로 있어요. 서로 달라 보이는 자연과 인류사의 큰 변화가 같은 규칙으로 설명돼요.',
        },
        {
          type: 'quiz', title: '녹슨 철못',
          goal: '철못이 녹슬어 붉은 녹(산화 철)이 되었어요. 녹슨 철못의 질량은 처음 철못보다?',
          setup() { ensure('compare'); },
          choices: ['줄어든다. 철이 사라지기 때문이다', '늘어난다. 철이 공기 중의 산소와 결합했기 때문이다', '같다. 녹은 철의 일부일 뿐이다', '늘어난다. 철이 환원되었기 때문이다'],
          answer: 1,
          feedback: ['철은 사라지지 않고 산소와 결합해요.', '', '산소가 결합했으니 질량이 늘어나요.', '산소를 얻었으니 환원이 아니라 산화예요.'],
          explain: '철이 산소를 얻는 <b>산화</b>예요. 구리나 마그네슘처럼 결합한 산소만큼 질량이 늘어나요. 천천히 일어나는 녹슮도 산화 반응이에요.',
        },
      ],
    },
  ];

  buildInit();
  function buildInit() { renderTagRows(); renderCmpRows(); }
  game = SciSim.game({
    simId: 'h1-redox-oxygen', mount: '#game', badge: '산화·환원 탐정', homeHref: '../../index.html#h1b',
    featureLabels: { oxid: '🔥 구리 · 마그네슘 가열 · 질량 저울', reduc: '🔬 수소 · 탄소 환원 · 이름표', blast: '🏭 용광로 · 역사 막대', compare: '⚖️ 연소 · 광합성 · 제련 비교표' },
    onFeatures() { ctlUpdate(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false, lastKey = '';
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; ctlUpdate(); }
    rsStep(dt);
    if (fbReady() && FB.f < 1) { FB.f = Math.min(1, FB.f + dt * 0.13); if (FB.f >= 1 && !FB.made) { FB.made = true; Sound.success(); const B = LAY().B; parts.burst(B.x + B.w * 0.75, B.y + B.h * 0.8, { count: 22, speed: 160, size: 4 }); ctlUpdate(); } }
    RS.fe.prog = clamp((FB.f - 0.25) / 0.65, 0, 1); RS.fe.done = FB.made;
    const key = [MODE, ST.metal, ST.red, ST.cmp, RS.cu.done, RS.mg.done, RS.h2.done, RS.c.done, RS.ch4.done, RS.ph.done, RS.fe2.done, RS.cu.run, RS.mg.run, RS.h2.run, RS.c.run, RS.ch4.run, RS.ph.run, RS.fe2.run, FB.made].join('|');
    if (key !== lastKey) { lastKey = key; ctlUpdate(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#f5f3ff'; ctx.fillRect(0, 0, VW, VH);
    const pk = curKey();
    if (MODE === 'oxid') { drawOxidBench(ST.metal, t, dt); drawParticlePanel(pk, t, { badge: [[0.5, 0.06, MASS[ST.metal].pf + '는 산소를 얻었어요 → 산화', '#7c3aed']] }); }
    else if (MODE === 'reduc') { drawReducBench(ST.red, t, dt); drawParticlePanel(pk, t, {}); }
    else if (MODE === 'blast') { drawBlastBench(t, dt); drawParticlePanel('fe', t, {}); }
    else { drawCompareBench(ST.cmp, t, dt); drawParticlePanel(pk, t, { heat: ST.cmp === 'ch4' }); }
    parts.draw(ctx);
    if (S_fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S_fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S_fade = RM ? 0 : approach(S_fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    RS, FB, TAG, CMP, ST, CMP_DEF, TAG_ROWS, VW, VH, MASS, get game() { return game; }, setMode, ctlUpdate, renderTagRows, renderCmpRows, startRx, resetRx, massNow, curKey, fbReset,
    get MODE() { return MODE; },
    finish(k) { RS[k].prog = 1; RS[k].run = false; RS[k].done = true; if (k === 'fe') { FB.ore = FB.coke = FB.air = true; FB.f = 1; FB.made = true; } ctlUpdate(); },
  };
})();
