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
      this.onTap = o.onTap || null; this.maxLines = o.maxLines || 0; this.vertical = !!o.vertical; this.cards = []; this.drag = null; this.selected = null; this.hoverZone = null;
      this.enabled = true; this.trayLabel = o.trayLabel || '';
    }
    add(c) {
      c.w = c.w || this.cw; c.h = c.h || this.ch; c.zone = c.zone || null; c.lift = 0; c.shake = 0; c.pop = 1;
      c.ord = this.cards.length; c.size = 15; const tw = this.vertical ? c.w - 10 : c.w - (c.draw ? c.h + 6 : 16);
      const maxLines = this.maxLines || (this.vertical ? 2 : 3);
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
     통합과학2 Ⅰ. 변화와 다양성 - 변이와 자연선택
     성취기준 [10통과2-01-02] (앞부분) 변이의 발생과 자연선택 과정에 대한 모의실험, 다윈의 자연선택설 중심의 진화 학습
     ① 관찰: 변이 (같은 종 안의 형질 차이, 날개 길이 히스토그램, 변이의 원인 = 돌연변이 · 유전자 조합)
     ② 실험: 모의실험 (포식자 새 역할로 애벌레 사냥 → 생존자 번식 → 다음 세대)
     ③ 분석: 세대 변화 (색 비율 그래프, 서식지 바꾸기, 후추나방 자료)
     ④ 설명: 자연선택설 (다윈의 5단계, 용불용설과의 비교, 항생제 내성 세균)
     ※ 하디–바인베르크·대립유전자 빈도 수식, 종 분화의 세부 과정은 다루지 않음 (모의실험 수치는 단순화한 모형)
     ========================================================= */
  initStage('#eef6ea', 800, 560, 520, 780);

  /* ---------- 모형 자료 ---------- */
  const COL = { g: '#4fae45', b: '#8c5a2b', y: '#f3d02a', o: '#f28a24' };
  const CNAME = { g: '초록', b: '갈색', y: '노랑', o: '주황' };
  const KEYS = ['g', 'b', 'y', 'o'];
  // 배경에서 눈에 띄는 정도 (0~1): 클수록 새에게 잘 보여요
  const CONSP = { grass: { g: 0.25, b: 0.7, y: 0.85, o: 0.9 }, leaf: { g: 0.7, b: 0.25, y: 0.6, o: 0.45 } };
  const HABN = { grass: '초록 풀밭', leaf: '갈색 낙엽층' };
  const POP = 40, EAT = 20;
  const total = (c) => KEYS.reduce((n, k) => n + c[k], 0);
  const cnt = (list) => { const c = { g: 0, b: 0, y: 0, o: 0 }; list.forEach((k) => c[k]++); return c; };
  /* 가장 큰 나머지 방식으로 40마리를 생존자 비율대로 나눔 */
  function apportion(surv) {
    const S = total(surv), raw = KEYS.map((k) => (surv[k] * POP) / S), fl = raw.map(Math.floor);
    let rem = POP - fl.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach((e) => { if (rem > 0) { fl[e[1]]++; rem--; } });
    const out = {}; KEYS.forEach((k, i) => (out[k] = fl[i])); return out;
  }
  /* 한 세대(자동): 포식자가 눈에 띄는 순서(확률)대로 20마리를 잡아먹고, 생존자가 번식해 40마리, 1~2마리 무작위 돌연변이 */
  function autoStep(pop, hab) {
    let inds = []; KEYS.forEach((k) => { for (let i = 0; i < pop[k]; i++) inds.push(k); });
    const caughtIdx = [], c = CONSP[hab];
    const pool = inds.map((k, i) => i);
    for (let n = 0; n < EAT && pool.length; n++) {
      const w = pool.map((i) => c[inds[i]]); const tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot, j = 0;
      while (j < w.length - 1 && r > w[j]) { r -= w[j]; j++; }
      caughtIdx.push(pool[j]); pool.splice(j, 1);
    }
    const caught = cnt(caughtIdx.map((i) => inds[i])), surv = { g: pop.g - caught.g, b: pop.b - caught.b, y: pop.y - caught.y, o: pop.o - caught.o };
    return { caught, surv, next: breed(surv) };
  }
  function breed(surv) {
    const next = apportion(surv), muts = [], m = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < m; i++) {
      const src = KEYS.filter((k) => next[k] > 0 && next[k] > surv[k]); // 새로 태어난 개체 중에서 돌연변이
      if (!src.length) break;
      const s = src[Math.floor(Math.random() * src.length)], tg = KEYS.filter((k) => k !== s), t2 = tg[Math.floor(Math.random() * tg.length)];
      next[s]--; next[t2]++; muts.push(t2);
    }
    next.muts = muts; return next;
  }
  const SM = {
    gen: 1, hab: 'grass', pop: { g: 20, b: 20, y: 0, o: 0 }, hist: [], phase: 'ready', t: 0, caught: 0, targeted: 0, lastCaught: null, lastSurv: null,
    inds: [], birds: [], puffs: [], bred: 0, habFade: 0, cf: null, sw: 0,
  };
  function resetSim() {
    SM.gen = 1; SM.hab = 'grass'; SM.pop = { g: 20, b: 20, y: 0, o: 0 }; SM.hist = [{ gen: 1, hab: 'grass', c: { g: 20, b: 20, y: 0, o: 0 } }]; SM.phase = 'ready'; SM.t = 0; SM.caught = 0; SM.targeted = 0;
    SM.lastCaught = null; SM.lastSurv = null; SM.birds = []; SM.bred = 0; SM.habFade = 0; SM.cf = null; SM.sw = 0; GN.pred = ''; GN.switchGen = -1; GN.switchGreen = 0; GN.busy = 0; GN.anim = null;
    SM.inds = placeInds(listFromCounts(SM.pop));
  }
  function listFromCounts(c) { const a = []; KEYS.forEach((k) => { for (let i = 0; i < c[k]; i++) a.push(k); }); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const simF = () => (PHONE ? { x: 8, y: 62, w: 504, h: 452 } : { x: 14, y: 54, w: 772, h: 366 });
  function placeInds(colors) {
    const F = simF(), arr = [], md = PHONE ? 52 : 50;
    colors.forEach((k) => {
      let x, y, tries = 0;
      do { x = F.x + 34 + Math.random() * (F.w - 68); y = F.y + 28 + Math.random() * (F.h - 56); tries++; } while (tries < 60 && arr.some((a) => Math.hypot(a.x - x, a.y - y) < md));
      arr.push({ k, x, y, ang: Math.random() * TAU, ph: Math.random() * 6, pop: 1, alive: true, target: false, alpha: 1, spark: 0 });
    });
    return arr;
  }
  const pct = (c, k) => (c[k] / POP) * 100;
  const pctTxt = (c, k) => Math.round(pct(c, k)) + ' %';
  const newColors = (c) => c.y + c.o;

  /* ---------- 서식지 배경 (한 번 그려 두고 재사용) ---------- */
  const bgCache = {};
  function habBg(hab, w, h) {
    const key = hab + w + 'x' + h; if (bgCache[key]) return bgCache[key];
    const S = 1.4, cv = document.createElement('canvas'); cv.width = Math.round(w * S); cv.height = Math.round(h * S);
    const c = cv.getContext('2d'); c.scale(S, S);
    let s = hab === 'grass' ? 4242 : 9191; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    if (hab === 'grass') {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#79bd62'); g.addColorStop(1, '#5da24d'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const cols = ['#4f9440', '#6cb85a', '#8bd073', '#58a247', '#74c260'];
      c.lineCap = 'round';
      for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, hh = 12 + r() * 20, lean = (r() - 0.5) * 12; c.strokeStyle = cols[i % 5]; c.lineWidth = 1.6 + r() * 1.4; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * 0.4, y - hh * 0.5, x + lean, y - hh); c.stroke(); }
    } else {
      c.fillStyle = '#7a5a30'; c.fillRect(0, 0, w, h);
      const cols = ['#9a6c33', '#7b5224', '#b0803f', '#6a4620', '#a8743a', '#8b5e2a'];
      for (let i = 0; i < 420; i++) {
        const x = r() * w, y = r() * h, a = r() * Math.PI, rx = 14 + r() * 16, ry = 6 + r() * 6; c.save(); c.translate(x, y); c.rotate(a);
        c.fillStyle = cols[i % 6]; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(40,24,8,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-rx, 0); c.lineTo(rx, 0); c.stroke(); c.restore();
      }
    }
    return (bgCache[key] = cv);
  }
  function drawHab(F, hab, t, fadeFrom) {
    ctx.save(); rr(F.x, F.y, F.w, F.h, 14).clip();
    const cur = habBg(hab, F.w, F.h);
    if (SM.cf != null && SM.cf < 1 && SM.cfFrom) { ctx.drawImage(habBg(SM.cfFrom, F.w, F.h), F.x, F.y, F.w, F.h); ctx.globalAlpha = SM.cf; ctx.drawImage(cur, F.x, F.y, F.w, F.h); ctx.globalAlpha = 1; }
    else ctx.drawImage(cur, F.x, F.y, F.w, F.h);
    ctx.restore();
    ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(F.x, F.y, F.w, F.h, 14).stroke();
  }
  function setHab(h) {
    if (SM.hab === h) return;
    SM.cfFrom = SM.hab; SM.hab = h; SM.cf = 0; SciSim.tween(SM, { cf: 1 }, { duration: RM ? 0.01 : 0.9, ease: 'inOutSine' });
  }

  /* ---------- 그림: 애벌레 · 새 · 나비 ---------- */
  function caterpillar(x, y, len, color, ang, t, ph, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); if (o.scale) ctx.scale(o.scale, o.scale); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const n = 5, seg = len / n, r = len * 0.115;
    for (let i = n - 1; i >= 0; i--) {
      const px = -len / 2 + i * seg + seg / 2, py = Math.sin(t * 3 + i * 0.9 + ph) * len * 0.05, rr0 = i === n - 1 ? r * 1.2 : r;
      const g = ctx.createRadialGradient(px - rr0 * 0.3, py - rr0 * 0.4, rr0 * 0.1, px, py, rr0);
      g.addColorStop(0, shade(color, 0.3)); g.addColorStop(0.6, color); g.addColorStop(1, shade(color, -0.3));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, rr0, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba(shade(color, -0.45), 0.5); ctx.lineWidth = 1; ctx.stroke();
    }
    const hx = -len / 2 + (n - 1) * seg + seg / 2 + r * 0.6, hy = Math.sin(t * 3 + (n - 1) * 0.9 + ph) * len * 0.05;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy - r * 0.3, r * 0.28, 0, TAU); ctx.arc(hx, hy + r * 0.5, r * 0.28, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(hx + r * 0.08, hy - r * 0.3, r * 0.14, 0, TAU); ctx.arc(hx + r * 0.08, hy + r * 0.5, r * 0.14, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function birdShape(x, y, s, flap, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (flip ? -1 : 1), s);
    ctx.fillStyle = '#3b5bdb'; ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 0.05; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.ellipse(0, 0, 0.42, 0.26, -0.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0.4, -0.16, 0.18, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.moveTo(0.54, -0.2); ctx.lineTo(0.82, -0.12); ctx.lineTo(0.54, -0.07); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0.45, -0.2, 0.04, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2f49b8'; ctx.beginPath(); ctx.moveTo(-0.1, -0.05); ctx.quadraticCurveTo(-0.3, -0.5 * (0.4 + 0.6 * flap), -0.62, -0.38 * flap - 0.05); ctx.quadraticCurveTo(-0.3, -0.12, 0.05, 0.02); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1e3a8a'; ctx.beginPath(); ctx.moveTo(-0.38, 0.05); ctx.lineTo(-0.82, 0.18); ctx.lineTo(-0.8, -0.04); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function butterfly(x, y, s, color, flap, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha = o.alpha; if (o.rot) ctx.rotate(o.rot);
    const w = s * 0.5 * (0.45 + 0.55 * Math.abs(flap)), h = s * 0.42, c2 = o.color2 || color;
    [[-1, color], [1, c2]].forEach(([d, c]) => {
      ctx.fillStyle = c; ctx.strokeStyle = shade(c, -0.4); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(d * w * 0.55, -h * 0.35, w * 0.55, h * 0.6, d * -0.4, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(d * w * 0.4, h * 0.32, w * 0.38, h * 0.42, d * 0.4, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = rgba('#fff', 0.55); ctx.beginPath(); ctx.arc(d * w * 0.6, -h * 0.4, h * 0.16, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = '#374151'; rr(-s * 0.035, -h * 0.55, s * 0.07, h * 1.15, s * 0.035).fill();
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(0, -h * 0.55); ctx.lineTo(-s * 0.1, -h * 0.9); ctx.moveTo(0, -h * 0.55); ctx.lineTo(s * 0.1, -h * 0.9); ctx.stroke();
    ctx.restore();
  }
  const BUT_LEN = [4.6, 5.2, 3.9, 5.5, 4.4, 5.0, 6.1, 4.8, 5.3, 4.3, 5.7, 5.0, 4.5, 5.2, 5.9, 4.7, 5.4, 4.9, 5.6, 5.1];
  const binOf = (len) => Math.max(0, Math.min(5, Math.floor((len - 3.5) / 0.5 + 1e-9)));
  const BIN_N = [0, 0, 0, 0, 0, 0]; BUT_LEN.forEach((l) => BIN_N[binOf(l)]++);
  const BINLAB = ['3.5~4.0', '4.0~4.5', '4.5~5.0', '5.0~5.5', '5.5~6.0', '6.0~6.5'];

  /* ======================================================
     화면 ①: 변이 — 형질 관찰 · 날개 길이 히스토그램 · 변이의 원인
     ====================================================== */
  const VR = { tab: 2, tabsSeen: [false, false, true], bf: [], stacked: 0, auto: 0, muts: 0, mixes: 0, dna: 'ATGCCGTAACGT'.split(''), dnaFlash: [], mutColor: '#f59e0b', parents: null, child: null, shuf: 0, cspark: 0 };
  const TABS = ['🐞 무당벌레 무늬', '🐌 달팽이 껍데기', '🦋 나비 날개 길이'];
  const vrG = () => (PHONE
    ? { tab: (i) => ({ x: 8 + i * 168, y: 8, w: 162, h: 34 }), pos: (i) => ({ x: 56 + (i % 5) * 102, y: 100 + Math.floor(i / 5) * 52 }), plot: { x0: 52, x1: 504, y0: 330, y1: 658 }, grid: { x: 8, y: 52, w: 504, h: 600, cols: 4 } }
    : { tab: (i) => ({ x: 14 + i * 190, y: 10, w: 182, h: 34 }), pos: (i) => ({ x: 56 + (i % 10) * 76, y: 104 + Math.floor(i / 10) * 54 }), plot: { x0: 62, x1: 774, y0: 234, y1: 510 }, grid: { x: 14, y: 54, w: 772, h: 490, cols: 5 } });
  const plotCell = () => { const p = vrG().plot; return (p.y1 - p.y0) / 8; };
  const binX = (b) => { const p = vrG().plot, w = (p.x1 - p.x0) / 6; return p.x0 + w * (b + 0.5); };
  function resetVar() {
    VR.tab = 2; VR.tabsSeen = [false, false, true]; VR.stacked = 0; VR.auto = 0; VR.muts = 0; VR.mixes = 0; VR.dna = 'ATGCCGTAACGT'.split(''); VR.dnaFlash = []; VR.mutColor = '#f59e0b'; VR.child = null; VR.cspark = 0;
    VR.bf = BUT_LEN.map((len, i) => ({ len, i, placed: false, x: 0, y: 0, t: 0, pop: 1, ph: Math.random() * 6 }));
    VR.bf.forEach((b) => { const p = vrG().pos(b.i); b.x = p.x; b.y = p.y; });
    VR.parents = [[{ c: '#f97316' }, { c: '#8b5cf6' }], [{ c: '#22c55e' }, { c: '#ec4899' }]];
  }
  function stackSlot(b) { // 이 나비가 쌓일 칸의 좌표 (먼저 놓은 순서대로 아래부터)
    const bin = binOf(b.len), order = VR.bf.filter((x) => x.placed && binOf(x.len) === bin).sort((a, c) => a.order - c.order).indexOf(b), p = vrG().plot, cell = plotCell();
    return { x: binX(bin), y: p.y1 - cell * (order + 0.5) };
  }
  function placeBf(b) {
    if (b.placed) return; b.placed = true; b.order = VR.stacked++; b.t = 0; b.fx = b.x; b.fy = b.y; Sound.tick();
  }
  function stepVar(dt) {
    VR.bf.forEach((b) => { if (b.placed) { b.t = Math.min(1, b.t + dt / (RM ? 0.05 : 0.55)); } });
    if (VR.auto > 0) { VR.auto -= dt; if (VR.auto <= 0) { const nx = VR.bf.find((b) => !b.placed); if (nx) { placeBf(nx); VR.auto = 0.16; } } }
    VR.shuf = Math.max(0, VR.shuf - dt); VR.cspark = Math.max(0, VR.cspark - dt);
  }
  function varTap(p) {
    const g = vrG();
    for (let i = 0; i < 3; i++) { const t = g.tab(i); if (p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h) { VR.tab = i; VR.tabsSeen[i] = true; Sound.click(); return true; } }
    if (SUBV() === 'hist' && VR.tab === 2) { let best = null, bd = 30; VR.bf.forEach((b) => { if (b.placed) return; const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; best = b; } }); if (best) { placeBf(best); return true; } }
    return false;
  }
  const SUBV = () => (typeof SUB !== 'undefined' ? SUB : 'hist');
  function drawTraitGrid(t) {
    const g = vrG().grid, tab = VR.tab, cols = g.cols, rows = 4, cw = g.w / cols, ch = (g.h - (PHONE ? 70 : 60)) / rows;
    D.text(VW / 2, g.y + 20, tab === 0 ? '같은 종 무당벌레 20마리 — 무늬(점 수)와 색이 서로 달라요' : '같은 종 달팽이 20마리 — 껍데기 색과 줄무늬가 서로 달라요', { size: PHONE ? 13.5 : 16, weight: 800, color: '#14532d' });
    let s = 31337 + tab * 17; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 20; i++) {
      const cx = g.x + (i % cols) * cw + cw / 2, cy = g.y + 46 + Math.floor(i / cols) * ch + ch / 2, sz = Math.min(cw, ch) * 0.62, ra = r(), rb = r(), rc = r();
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(cx - cw / 2 + 5, cy - ch / 2 + 4, cw - 10, ch - 8, 12).fill(); }, { blur: 3, y: 1 });
      if (tab === 0) {
        const body = ['#dc2626', '#ea580c', '#eab308', '#be123c'][Math.floor(ra * 4)], spots = Math.floor(rb * 8);
        ctx.save(); ctx.translate(cx, cy + 2); ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(0, -sz * 0.42, sz * 0.18, 0, TAU); ctx.fill();
        D.sphere(0, 0, sz * 0.46, body, { gloss: true }); ctx.strokeStyle = '#111827'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -sz * 0.44); ctx.lineTo(0, sz * 0.44); ctx.stroke();
        ctx.fillStyle = '#111827'; for (let k = 0; k < spots; k++) { const a = (k / Math.max(1, spots)) * TAU + ra * 3, rd = sz * (0.16 + 0.12 * ((k * 7) % 3) / 2); ctx.beginPath(); ctx.arc(Math.cos(a) * rd * (k % 2 ? 1 : -1) * 1.2, Math.sin(a) * rd * 1.4, sz * 0.055, 0, TAU); ctx.fill(); }
        ctx.restore(); D.text(cx, cy + ch / 2 - 10, '점 ' + spots + '개', { size: 12.5, weight: 700, color: '#64748b' });
      } else {
        const sh = ['#d9a441', '#b45f2c', '#e8a0b4', '#8f9a3a', '#c9b88a'][Math.floor(ra * 5)], stripes = Math.floor(rb * 4);
        ctx.save(); ctx.translate(cx, cy);
        ctx.fillStyle = '#c9b49a'; rr(-sz * 0.6, sz * 0.18, sz * 1.2, sz * 0.22, sz * 0.11).fill(); ctx.beginPath(); ctx.ellipse(sz * 0.6, sz * 0.28, sz * 0.14, sz * 0.12, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c9b49a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sz * 0.64, sz * 0.2); ctx.lineTo(sz * 0.7, -sz * 0.04); ctx.moveTo(sz * 0.7, sz * 0.22); ctx.lineTo(sz * 0.8, 0); ctx.stroke();
        D.sphere(-sz * 0.06, -sz * 0.08, sz * 0.42, sh, { gloss: true }); ctx.strokeStyle = rgba(shade(sh, -0.5), 0.8); ctx.lineWidth = 2;
        for (let k = 0; k < stripes + 1; k++) { ctx.beginPath(); ctx.arc(-sz * 0.06, -sz * 0.08, sz * (0.12 + k * 0.1), 0, TAU); ctx.stroke(); }
        ctx.restore(); D.text(cx, cy + ch / 2 - 10, '줄무늬 ' + stripes + '줄' + '', { size: 12.5, weight: 700, color: '#64748b' });
      }
    }
  }
  function drawHist(t) {
    const g = vrG(), p = g.plot, cell = plotCell(), bw = (p.x1 - p.x0) / 6;
    D.text(VW / 2, PHONE ? 64 : 68, '나비 20마리의 날개 길이 (cm) — 눌러서 알맞은 막대에 쌓아요', { size: PHONE ? 13 : 15.5, weight: 800, color: '#14532d' });
    // 대기 중인 나비
    VR.bf.forEach((b) => {
      if (b.placed) return;
      butterfly(b.x, b.y + Math.sin(t * 2 + b.ph) * 2, b.len * (PHONE ? 6.4 : 6), '#f59e0b', Math.sin(t * 6 + b.ph), { color2: '#f59e0b' });
      D.text(b.x, b.y + (PHONE ? 29 : 31), b.len.toFixed(1), { size: 12.5, weight: 800, color: '#475569' });
    });
    // 히스토그램 틀
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(g.plot.x0 - 44, p.y0 - 30, p.x1 - p.x0 + 56, p.y1 - p.y0 + 76, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(g.plot.x0 - 44, p.y0 - 30, p.x1 - p.x0 + 56, p.y1 - p.y0 + 76, 14).stroke();
    for (let v = 0; v <= 8; v += 2) { const y = p.y1 - v * cell; ctx.strokeStyle = '#e8efe6'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x0, y); ctx.lineTo(p.x1, y); ctx.stroke(); D.text(p.x0 - 8, y + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); }
    D.text(p.x0 - 36, p.y0 - 12, '개체 수', { size: 12.5, weight: 800, color: '#475569', align: 'left' });
    const bc = [0, 0, 0, 0, 0, 0]; VR.bf.forEach((b) => { if (b.placed) bc[binOf(b.len)] += b.t >= 1 ? 1 : 0; });
    for (let i = 0; i < 6; i++) {
      const x = p.x0 + i * bw, h = bc[i] * cell;
      if (h > 0) { ctx.fillStyle = rgba('#f59e0b', 0.28); rr(x + 6, p.y1 - h, bw - 12, h, 6).fill(); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; rr(x + 6, p.y1 - h, bw - 12, h, 6).stroke(); D.text(binX(i), p.y1 - h - 8, String(bc[i]), { size: 14, weight: 800, color: '#b45309' }); }
      D.text(binX(i), p.y1 + 19, BINLAB[i], { size: PHONE ? 11.5 : 12.5, weight: 700, color: '#475569' });
    }
    D.text((p.x0 + p.x1) / 2, p.y1 + 38, '날개 길이 (cm)', { size: 13, weight: 800, color: '#475569' });
    // 쌓이는 나비
    VR.bf.filter((b) => b.placed).forEach((b) => {
      const sl = stackSlot(b), e = SciSim.ease.outBack(clamp(b.t, 0, 1)), x = lerp(b.fx, sl.x, e), y = lerp(b.fy, sl.y, e) - Math.sin(clamp(b.t, 0, 1) * Math.PI) * 24;
      butterfly(x, y, Math.min(bw - 20, cell * 1.05) * (b.t < 1 ? 1 : 1), '#f59e0b', b.t < 1 ? Math.sin(t * 14) : 0.9);
    });
    if (VR.stacked === 20) D.label(VW / 2, p.y0 - 14, '완성! 같은 종 안에서도 날개 길이가 달라요 → 변이', { bg: '#15803d', size: PHONE ? 12.5 : 14 });
  }
  /* ---------- 변이의 원인 ---------- */
  const BC = { A: '#22c55e', T: '#ef4444', G: '#eab308', C: '#3b82f6' };
  const crG = () => (PHONE ? { a: { x: 8, y: 52, w: 504, h: 330 }, b: { x: 8, y: 392, w: 504, h: 360 } } : { a: { x: 14, y: 54, w: 380, h: 480 }, b: { x: 406, y: 54, w: 380, h: 480 } });
  function mutateBase(i) {
    const old = VR.dna[i], opts = ['A', 'T', 'G', 'C'].filter((c) => c !== old), nw = opts[Math.floor(Math.random() * 3)];
    VR.dna[i] = nw; VR.dnaFlash[i] = 1; VR.muts++; Sound.success();
    const cols = ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']; let c; do { c = cols[Math.floor(Math.random() * cols.length)]; } while (c === VR.mutColor);
    VR.mutColor = c; VR.cspark = 1; const g = crG().a; parts.burst(g.x + g.w / 2, g.y + g.h - 110, { count: 14, speed: 120, size: 3.5, life: 0.8, colors: [c, '#fff'] });
  }
  function shuffleGametes() {
    const pick = (a) => a[Math.floor(Math.random() * 2)]; VR.child = [pick(VR.parents[0]).c, pick(VR.parents[1]).c]; VR.mixes++; VR.shuf = 1; Sound.success(); VR.cspark = 1;
    const g = crG().b; parts.burst(g.x + g.w / 2, g.y + g.h - 90, { count: 14, speed: 120, size: 3.5, life: 0.8, colors: [VR.child[0], VR.child[1], '#fff'] });
  }
  function chromo(x, y, w, h, c, o) { ctx.save(); ctx.globalAlpha = (o && o.alpha) != null ? o.alpha : 1; ctx.fillStyle = c; D.shadow(() => rr(x - w / 2, y - h / 2, w, h, w / 2).fill(), { blur: 3, y: 1 }); ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(x - w / 2 + 3, y - h / 2 + 4, 3, h - 8, 2).fill(); ctx.restore(); }
  function drawCause(t) {
    const g = crG();
    [g.a, g.b].forEach((r) => { D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 14).stroke(); });
    // ㉠ 돌연변이
    const A = g.a; D.text(A.x + 16, A.y + 26, '㉠ 돌연변이', { size: PHONE ? 15 : 17, weight: 800, color: '#14532d', align: 'left' }); drawWrap(A.x + 16, A.y + 50, 'DNA 염기 서열이 바뀌는 것이에요. 염기를 눌러 바꿔 봐요. (환경이 필요해서가 아니라 무작위로 생겨요)', A.w - 32, PHONE ? 13 : 13.5, { weight: 700, color: '#475569', align: 'left', lh: 1.3 });
    const nb = 12, bw = Math.min(30, (A.w - 40) / nb), bx0 = A.x + (A.w - nb * bw) / 2, by = A.y + (PHONE ? 118 : 140);
    D.text(A.x + A.w / 2, by - 16, '🔍 DNA 한 가닥의 염기 서열', { size: 13, weight: 800, color: '#64748b' });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(bx0 - 6, by - 4); ctx.lineTo(bx0 + nb * bw + 6, by - 4); ctx.stroke();
    VR.dna.forEach((c, i) => { const fl = VR.dnaFlash[i] || 0, x = bx0 + i * bw + bw / 2, y = by + 10 - fl * 8; ctx.fillStyle = BC[c]; D.shadow(() => rr(x - bw / 2 + 1.5, y, bw - 3, bw * 1.2, 5).fill(), { blur: 2, y: 1 }); if (fl > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; rr(x - bw / 2 + 1.5, y, bw - 3, bw * 1.2, 5).stroke(); D.glow(x, y + 12, 28, '#fde047', 0.6 * fl); } D.text(x, y + bw * 0.82, c, { size: 15, weight: 800, color: c === 'G' ? '#3b2f00' : '#fff' }); VR.dnaFlash[i] = Math.max(0, fl - 0.016); });
    D.text(A.x + A.w / 2, by + bw * 1.2 + 34, '염기 하나가 바뀌면 새로운 형질이 생길 수 있어요', { size: 13, weight: 700, color: '#475569' });
    const bfY = A.y + A.h - (PHONE ? 70 : 100);
    D.text(A.x + A.w / 2 - 70, bfY + 4, '원래', { size: 13, weight: 800, color: '#64748b' }); butterfly(A.x + A.w / 2 - 70, bfY + 44, 78, '#f59e0b', Math.sin(t * 5));
    D.arrow(A.x + A.w / 2 - 22, bfY + 44, A.x + A.w / 2 + 22, bfY + 44, { color: '#94a3b8', width: 3, head: 9 });
    D.text(A.x + A.w / 2 + 70, bfY + 4, VR.muts ? '돌연변이 ' + VR.muts + '번' : '염기를 눌러요', { size: 13, weight: 800, color: VR.muts ? '#b45309' : '#94a3b8' }); butterfly(A.x + A.w / 2 + 70, bfY + 44, 78 * (1 + VR.cspark * 0.15), VR.mutColor, Math.sin(t * 5));
    // ㉡ 유전자 조합
    const B = g.b; D.text(B.x + 16, B.y + 26, '㉡ 유전자 조합', { size: PHONE ? 15 : 17, weight: 800, color: '#14532d', align: 'left' }); drawWrap(B.x + 16, B.y + 50, '생식세포(감수 분열)와 수정 때 염색체가 섞여 부모와 다른 조합이 생겨요.', B.w - 32, PHONE ? 13 : 13.5, { weight: 700, color: '#475569', align: 'left', lh: 1.3 });
    const px = [B.x + B.w * 0.27, B.x + B.w * 0.73], py = B.y + (PHONE ? 130 : 150);
    VR.parents.forEach((par, k) => { D.text(px[k], py - 40, k ? '아버지' : '어머니', { size: 13, weight: 800, color: '#64748b' }); par.forEach((ch, j) => chromo(px[k] - 16 + j * 32, py, 20, 62, ch.c)); });
    D.text(B.x + B.w / 2, py + 4, '×', { size: 24, weight: 800, color: '#94a3b8' });
    const gy = py + 74; D.arrow(px[0], py + 40, px[0], gy - 6, { color: '#94a3b8', width: 2.5, head: 8 }); D.arrow(px[1], py + 40, px[1], gy - 6, { color: '#94a3b8', width: 2.5, head: 8 });
    D.text(B.x + B.w / 2, gy + 14, '각각 한 개씩 무작위로 전달 (생식세포)', { size: 13, weight: 700, color: '#64748b' });
    const cy = gy + 78;
    if (VR.child) { chromo(B.x + B.w / 2 - 14, cy, 20, 62, VR.child[0], { alpha: clamp(1 - VR.shuf * 0.6, 0.4, 1) }); chromo(B.x + B.w / 2 + 14, cy, 20, 62, VR.child[1]); D.text(B.x + B.w / 2, cy - 42, '자손', { size: 13, weight: 800, color: '#64748b' }); butterfly(B.x + B.w / 2, B.y + B.h - (PHONE ? 46 : 70), 84, VR.child[0], Math.sin(t * 5), { color2: VR.child[1] }); }
    else D.text(B.x + B.w / 2, cy + 6, '아래 버튼으로 섞어 봐요 (자손의 조합은 매번 달라요)', { size: 13, weight: 700, color: '#94a3b8' });
    if (VR.mixes) D.text(B.x + B.w / 2, B.y + B.h - 8, '섞은 횟수 ' + VR.mixes + '번', { size: 12.5, weight: 700, color: '#64748b' });
  }

  /* ======================================================
     화면 ②: 모의실험 — 포식자 새가 되어 애벌레를 잡아요
     ====================================================== */
  const aliveCounts = () => cnt(SM.inds.filter((d) => d.alive).map((d) => d.k));
  function startHunt() {
    if (SM.phase !== 'ready') return;
    SM.inds.forEach((d) => { d.alive = true; d.target = false; d.alpha = 1; d.pop = 1; d.spark = 0; });
    SM.start = aliveCounts(); SM.phase = 'hunt'; SM.t = 10; SM.caught = 0; SM.targeted = 0; SM.birds = []; SM.lastCaught = null; SM.lastSurv = null; SM.msg = '';
    Sound.click(); updateCtl();
  }
  function huntTap(p) {
    if (SM.phase !== 'hunt') return;
    let best = null, bd = PHONE ? 34 : 30;
    SM.inds.forEach((d) => { if (!d.alive || d.target) return; const dd = Math.hypot(p.x - d.x, p.y - d.y); if (dd < bd) { bd = dd; best = d; } });
    const F = simF(), dir = p.x < F.x + F.w / 2 ? 1 : -1;
    if (best) {
      if (SM.targeted >= EAT) { say('새는 배가 불러요! 한 번에 최대 ' + EAT + '마리까지 잡을 수 있어요.', true, 2.2); return; }
      best.target = true; SM.targeted++;
      SM.birds.push({ x0: best.x - dir * 170, y0: F.y - 50, x1: best.x, y1: best.y, t: 0, ind: best, dir, hit: false });
    } else {
      SM.birds.push({ x0: p.x - dir * 170, y0: F.y - 50, x1: p.x, y1: p.y, t: 0, ind: null, dir, hit: false });
    }
  }
  function endHunt() {
    SM.phase = 'done'; SM.t = 0;
    SM.lastSurv = aliveCounts(); SM.lastCaught = { g: SM.start.g - SM.lastSurv.g, b: SM.start.b - SM.lastSurv.b, y: SM.start.y - SM.lastSurv.y, o: SM.start.o - SM.lastSurv.o };
    Sound.success();
    say(SM.caught >= 5 ? '사냥 끝! 눈에 띄는 색이 더 많이 잡혔는지 비교해 보세요. 이제 🐣 번식시키기를 눌러요.' : '너무 적게 잡았어요(' + SM.caught + '마리). 5마리 이상 잡아야 해요. 🔄 다시 사냥해 봐요.', SM.caught < 5, 4);
    updateCtl();
  }
  function retryHunt() { if (SM.phase !== 'done') return; SM.phase = 'ready'; SM.inds.forEach((d) => { d.alive = true; d.target = false; d.alpha = 1; }); SM.caught = 0; SM.targeted = 0; SM.lastCaught = null; SM.lastSurv = null; SM.birds = []; updateCtl(); }
  function breedNow() {
    if (SM.phase !== 'done') return;
    if (SM.caught < 5) { say('먼저 새가 5마리 이상 잡아야 해요. 🔄 다시 사냥해 봐요.', true, 2.6); return; }
    const F = simF(), surv = SM.inds.filter((d) => d.alive), sc = cnt(surv.map((d) => d.k)), next = breed(sc), muts = next.muts.slice(); delete next.muts;
    const pending = muts.slice(), born = [];
    KEYS.forEach((k) => { for (let i = 0; i < next[k] - sc[k]; i++) born.push({ k, mut: false }); });
    pending.forEach((m) => { const b = born.find((x) => x.k === m && !x.mut); if (b) b.mut = true; });
    SM.inds = surv; surv.forEach((d) => { d.target = false; d.pop = 1; });
    born.forEach((b, i) => {
      const same = surv.filter((d) => d.k === b.k), par = (b.mut || !same.length ? surv : same)[Math.floor(Math.random() * (b.mut || !same.length ? surv.length : same.length))];
      const a = Math.random() * TAU, r = 24 + Math.random() * 20;
      const d = { k: b.k, x: clamp(par.x + Math.cos(a) * r, F.x + 30, F.x + F.w - 30), y: clamp(par.y + Math.sin(a) * r, F.y + 26, F.y + F.h - 26), ang: Math.random() * TAU, ph: Math.random() * 6, pop: 0, alive: true, target: false, alpha: 1, spark: b.mut ? 1 : 0, mut: b.mut };
      SM.inds.push(d); SciSim.tween(d, { pop: 1 }, { duration: RM ? 0.01 : 0.55, delay: RM ? 0 : 0.25 + i * 0.03, ease: 'outBack' });
      parts.burst(par.x, par.y, { count: 2, speed: 40, size: 2.5, life: 0.4, colors: ['#fff'] });
    });
    // 겹침 풀기
    for (let it = 0; it < 24; it++) SM.inds.forEach((a, i) => SM.inds.forEach((b, j) => { if (j <= i) return; const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 0.01, m = PHONE ? 38 : 40; if (dd < m) { const f = (m - dd) / 2; a.x -= dx / dd * f; a.y -= dy / dd * f; b.x += dx / dd * f; b.y += dy / dd * f; } a.x = clamp(a.x, F.x + 30, F.x + F.w - 30); a.y = clamp(a.y, F.y + 26, F.y + F.h - 26); b.x = clamp(b.x, F.x + 30, F.x + F.w - 30); b.y = clamp(b.y, F.y + 26, F.y + F.h - 26); }));
    SM.gen++; SM.pop = cnt(SM.inds.map((d) => d.k)); SM.hist.push({ gen: SM.gen, hab: SM.hab, c: Object.assign({}, SM.pop) }); SM.phase = 'ready'; SM.bred++; SM.lastMuts = muts; SM.prevStart = SM.start;
    Sound.level(); say(SM.gen + '세대가 태어났어요! 초록 ' + SM.pop.g + ' · 갈색 ' + SM.pop.b + (newColors(SM.pop) ? ' · 새 색 ' + newColors(SM.pop) : '') + (muts.length ? ' (돌연변이 ' + muts.length + '마리 ✨)' : ''), false, 4);
    SM.caught = 0; SM.targeted = 0; SM.lastCaught = null; SM.lastSurv = null; updateCtl();
  }
  function stepSim(dt) {
    if (SM.phase === 'hunt') { SM.t -= dt; if (SM.targeted >= EAT && !SM.birds.some((b) => b.ind && !b.hit)) endHunt(); else if (SM.t <= 0) { if (!SM.birds.some((b) => b.ind && !b.hit)) endHunt(); else SM.t = 0; } }
    SM.birds.forEach((b) => {
      b.t += dt / (RM ? 0.15 : 0.7);
      if (!b.hit && b.t >= 0.4) { b.hit = true; if (b.ind) { b.ind.alive = false; SM.caught++; parts.burst(b.ind.x, b.ind.y, { count: 9, speed: 120, size: 3, life: 0.55, colors: [COL[b.ind.k], '#fff'], gravity: 160 }); Sound.tick(); updateCtl(); } else { SM.marks = SM.marks || []; SM.marks.push({ x: b.x1, y: b.y1, t: 0.8 }); } }
    });
    SM.birds = SM.birds.filter((b) => b.t < 1);
    if (SM.marks) { SM.marks.forEach((m) => (m.t -= dt)); SM.marks = SM.marks.filter((m) => m.t > 0); }
  }
  function birdPos(b) {
    const e = b.t < 0.4 ? SciSim.ease.outCubic(b.t / 0.4) : 1;
    if (b.t < 0.4) return { x: lerp(b.x0, b.x1, e), y: lerp(b.y0, b.y1, e) - Math.sin(e * Math.PI) * 14 };
    const f = SciSim.ease.inQuad((b.t - 0.4) / 0.6); return { x: b.x1 + b.dir * 180 * f, y: b.y1 - 190 * f };
  }
  function tallyBlock(x, y, w, title, c, o) {
    o = o || {};
    D.text(x + 8, y + 18, title, { size: PHONE ? 13 : 14, weight: 800, color: o.color || '#14532d', align: 'left' });
    if (!c) { D.text(x + 8, y + 44, '—', { size: 14, weight: 700, color: '#94a3b8', align: 'left' }); return; }
    const ks = KEYS.filter((k) => k === 'g' || k === 'b' || c[k] > 0); let cx = x + 8;
    ks.forEach((k) => { D.sphere(cx + 9, y + 42, 8, COL[k], { gloss: true }); D.text(cx + 22, y + 47, String(c[k]), { size: 15, weight: 800, color: '#1e293b', align: 'left' }); cx += PHONE ? 64 : 72; });
    D.text(x + w - 8, y + 18, total(c) + '마리', { size: 13, weight: 700, color: '#64748b', align: 'right' });
  }
  function drawSim(t) {
    const F = simF(), top = PHONE ? 8 : 8;
    // 위 막대: 시간 · 잡은 수
    const barW = PHONE ? 300 : 460;
    D.text(14, top + 26, SM.phase === 'hunt' ? '⏱ ' + Math.max(0, SM.t).toFixed(1) + '초' : SM.phase === 'done' ? '⏱ 끝!' : '⏱ 10.0초', { size: PHONE ? 15 : 17, weight: 800, color: SM.phase === 'hunt' && SM.t < 3 ? '#dc2626' : '#14532d', align: 'left' });
    const bx = PHONE ? 86 : 98;
    ctx.fillStyle = '#e2e8f0'; rr(bx, top + 12, barW, 18, 9).fill(); ctx.fillStyle = SM.t < 3 && SM.phase === 'hunt' ? '#ef4444' : '#22c55e'; rr(bx, top + 12, Math.max(0, barW * clamp(SM.phase === 'ready' ? 1 : SM.t / 10, 0, 1)), 18, 9).fill();
    D.text(F.x + F.w - 4, top + 26, '🐦 잡은 수 ' + SM.caught + ' / ' + EAT, { size: PHONE ? 14 : 16, weight: 800, color: '#1e3a8a', align: 'right' });
    D.text(F.x + 4, F.y - 6 + (PHONE ? 0 : 0), '', {});
    // 서식지 + 애벌레
    drawHab(F, SM.hab, t);
    ctx.save(); rr(F.x, F.y, F.w, F.h, 14).clip();
    SM.inds.forEach((d) => {
      const sz = (PHONE ? 38 : 40) * Math.max(0.01, d.pop);
      if (!d.alive) return;
      caterpillar(d.x, d.y, sz, COL[d.k], d.ang + Math.sin(t * 0.8 + d.ph) * 0.12, t, d.ph, { alpha: d.target ? 0.85 : 1 });
      if (d.spark > 0.02) { d.spark = Math.max(0, d.spark - 0.006); D.spark(d.x + 14, d.y - 14, 10 * d.spark + 4, t, '#fff6c2'); D.ring(d.x, d.y, 22 + (1 - d.spark) * 14, t, { color: '#f59e0b', speed: 1.5, width: 2.5 }); }
    });
    if (SM.marks) SM.marks.forEach((m) => D.text(m.x, m.y + 5, '?', { size: 22, weight: 800, color: 'rgba(255,255,255,.9)', stroke: 'rgba(0,0,0,.4)', strokeWidth: 3 }));
    SM.birds.forEach((b) => { const q = birdPos(b); birdShape(q.x, q.y, PHONE ? 30 : 34, 0.5 + 0.5 * Math.sin(t * 22), b.dir < 0); });
    ctx.restore();
    if (SM.phase === 'ready') D.label(F.x + F.w / 2, F.y + F.h - 22, SM.gen === 1 ? '🐦 당신은 포식자 새예요! 🐦 사냥 시작을 누르고 10초 동안 눈에 띄는 애벌레를 눌러 잡아요' : SM.gen + '세대 애벌레예요. 🐦 사냥 시작을 눌러 또 잡아 봐요', { bg: rgba('#0f172a', 0.85), size: PHONE ? 11.5 : 13.5 });
    // 아래 집계
    const R = PHONE ? { x: 8, y: 524, w: 504, h: 240 } : { x: 14, y: 430, w: 772, h: 122 };
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(R.x, R.y, R.w, R.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 14).stroke();
    const start = SM.phase === 'ready' ? SM.pop : SM.start, caught = SM.phase === 'ready' ? null : { g: start.g - aliveCounts().g, b: start.b - aliveCounts().b, y: start.y - aliveCounts().y, o: start.o - aliveCounts().o }, alive = SM.phase === 'ready' ? null : aliveCounts();
    const bw = PHONE ? R.w : R.w / 3;
    if (!PHONE) { tallyBlock(R.x, R.y + 6, bw, SM.gen + '세대 집단', start); tallyBlock(R.x + bw, R.y + 6, bw, '🐦 잡힌 애벌레', caught, { color: '#b91c1c' }); tallyBlock(R.x + 2 * bw, R.y + 6, bw, '살아남은 애벌레', alive, { color: '#15803d' }); }
    else { tallyBlock(R.x, R.y + 6, bw, SM.gen + '세대 집단', start); tallyBlock(R.x, R.y + 74, bw, '🐦 잡힌 애벌레', caught, { color: '#b91c1c' }); tallyBlock(R.x, R.y + 142, bw, '살아남은 애벌레', alive, { color: '#15803d' }); }
    if (!PHONE) { ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(R.x + bw, R.y + 10); ctx.lineTo(R.x + bw, R.y + R.h - 38); ctx.moveTo(R.x + 2 * bw, R.y + 10); ctx.lineTo(R.x + 2 * bw, R.y + R.h - 38); ctx.stroke(); }
    const sc = SM.phase === 'done' ? (SM.caught >= 5 ? '눈에 띄는 색이 더 많이 잡혔나요? 그 색이 줄고, 안 띄는 색이 늘어요.' : '5마리 이상 잡아야 번식시킬 수 있어요.') : SM.phase === 'hunt' ? '눈에 띄는 애벌레를 눌러 잡아요!' : '배경과 색이 비슷한 애벌레는 잘 안 보여요.';
    D.text(R.x + R.w / 2, R.y + R.h - 12, sc, { size: PHONE ? 12.5 : 13.5, weight: 700, color: '#475569' });
  }

  /* ======================================================
     화면 ③: 세대 변화 — 색 비율 그래프 · 자동 진행 · 후추나방
     ====================================================== */
  const GN = { pred: '', switchGen: -1, switchGreen: 0, busy: 0, anim: null, dots: [], cp: 1, yr: 1850, ydisp: 1850 };
  const gnG = () => (PHONE
    ? { ch: { x: 8, y: 8, w: 504, h: 306 }, dp: { x: 8, y: 324, w: 504, h: 300 }, dot: (i) => ({ x: 34 + (i % 8) * 58, y: 372 + Math.floor(i / 8) * 54 }), dr: 17 }
    : { ch: { x: 14, y: 10, w: 772, h: 290 }, dp: { x: 14, y: 310, w: 772, h: 238 }, dot: (i) => ({ x: 36 + (i % 10) * 40, y: 372 + Math.floor(i / 10) * 40 }), dr: 14 });
  function sortedDots(c) { const a = []; KEYS.forEach((k) => { for (let i = 0; i < c[k]; i++) a.push({ k, alpha: 1, sc: 1, spark: 0, dead: false }); }); return a; }
  function syncDots() { if (!GN.anim) GN.dots = sortedDots(SM.pop); }
  function genStep() {
    if (GN.anim || SM.phase === 'hunt') return false;
    if (SM.phase === 'done') { SM.phase = 'ready'; }
    const res = autoStep(SM.pop, SM.hab), dots = sortedDots(SM.pop);
    KEYS.forEach((k) => { const idx = dots.map((d, i) => (d.k === k ? i : -1)).filter((i) => i >= 0); for (let n = idx.length - 1; n > 0; n--) { const j = Math.floor(Math.random() * (n + 1)); [idx[n], idx[j]] = [idx[j], idx[n]]; } idx.slice(0, res.caught[k]).forEach((i) => (dots[i].dead = true)); });
    GN.dots = dots; GN.anim = { t: 0, res, stage: 0 }; GN.busy = 1; Sound.click(); updateCtl(); return true;
  }
  function stepGen(dt) {
    const A = GN.anim;
    GN.cp = approach(GN.cp, 1, dt, 3);
    if (!A) return;
    A.t += dt / (RM ? 0.15 : 1);
    GN.dots.forEach((d) => { if (d.dead) d.alpha = Math.max(0, 1 - Math.min(1, A.t / 0.9) * 1.1); });
    if (A.stage === 0 && A.t >= 1) {
      A.stage = 1;
      const nx = A.res.next, muts = nx.muts.slice(), c = {}; KEYS.forEach((k) => (c[k] = nx[k]));
      const surv = GN.dots.filter((d) => !d.dead), nd = sortedDots(c);
      // 생존자는 그대로 두고 새로 태어난 개체가 튀어나오게
      const have = cnt(surv.map((d) => d.k)); const used = { g: 0, b: 0, y: 0, o: 0 };
      nd.forEach((d) => { used[d.k]++; if (used[d.k] > have[d.k]) { d.sc = 0; d.born = true; } });
      muts.forEach((m) => { const b = nd.find((d) => d.k === m && d.born && !d.spark); if (b) b.spark = 1; });
      nd.forEach((d, i) => { if (d.born) SciSim.tween(d, { sc: 1 }, { duration: RM ? 0.01 : 0.5, delay: RM ? 0 : 0.05 * (i % 20), ease: 'outBack' }); });
      GN.dots = nd; A.muts = muts; Sound.tick();
    }
    if (A.stage === 1 && A.t >= 2.1) {
      const nx = A.res.next, nc = {}; KEYS.forEach((k) => (nc[k] = nx[k]));
      SM.pop = nc; SM.gen++; SM.hist.push({ gen: SM.gen, hab: SM.hab, c: Object.assign({}, nc) }); GN.cp = 0; GN.anim = null; GN.busy = 0; Sound.success();
      say(SM.gen + '세대: 초록 ' + pctTxt(nc, 'g') + ' · 갈색 ' + pctTxt(nc, 'b') + (newColors(nc) ? ' · 새 색 ' + pctTxt({ n: newColors(nc) }, 'n') : '') + (A.muts.length ? '  (돌연변이 ' + A.muts.length + '마리 ✨)' : ''), false, 3);
      updateCtl();
    }
  }
  let autoRun = 0;
  function runTo(n) { autoRun = n; }
  function stepAutoRun() { if (autoRun && !GN.anim) { if (SM.gen >= autoRun) autoRun = 0; else genStep(); } }
  function drawGen(t) {
    const g = gnG(), r = g.ch, px0 = r.x + 52, px1 = r.x + r.w - (PHONE ? 20 : 120), py0 = r.y + 40, py1 = r.y + r.h - 62, G = Math.max(8, SM.gen + (SM.gen > 8 ? 1 : 0));
    const X = (gen) => px0 + ((gen - 1) / (G - 1)) * (px1 - px0), Y = (v) => py1 - (v / 100) * (py1 - py0);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(r.x, r.y, r.w, r.h, 14).stroke();
    D.text(r.x + 14, r.y + 24, '세대에 따른 애벌레 색 비율 (%)', { size: PHONE ? 13.5 : 15.5, weight: 800, color: '#14532d', align: 'left' });
    [0, 25, 50, 75, 100].forEach((v) => { ctx.strokeStyle = '#e8efe6'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px0, Y(v)); ctx.lineTo(px1, Y(v)); ctx.stroke(); D.text(px0 - 8, Y(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    for (let i = 1; i <= G; i++) { D.text(X(i), py1 + 17, String(i), { size: 12.5, weight: 700, color: '#64748b' }); const h = SM.hist[i - 1]; if (h) { ctx.fillStyle = h.hab === 'grass' ? '#6cb85a' : '#8a6a3a'; rr(X(i) - 9, py1 + 24, 18, 9, 3).fill(); } }
    D.text(px0 - 8, py1 + 31, '서식지', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    D.text((px0 + px1) / 2, py1 + 54, '세대 (아래 색 칸 = 그 세대의 서식지: 초록 풀밭 / 갈색 낙엽층)', { size: 12.5, weight: 700, color: '#64748b' });
    const series = [['g', '초록', COL.g, (c) => pct(c, 'g')], ['b', '갈색', COL.b, (c) => pct(c, 'b')], ['n', '새 색(노랑·주황)', '#f59e0b', (c) => ((c.y + c.o) / POP) * 100]];
    const lastC = SM.hist[SM.hist.length - 1].c, labY = {}; { const arr = series.map(([k, , , f]) => ({ k, y: Y(f(lastC)) })).sort((a, b) => a.y - b.y); for (let i = 1; i < arr.length; i++) if (arr[i].y - arr[i - 1].y < 20) arr[i].y = arr[i - 1].y + 20; arr.forEach((a) => (labY[a.k] = a.y)); }
    series.forEach(([k, name, col, f]) => {
      const hs = SM.hist; ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.beginPath();
      hs.forEach((h, i) => { const last = i === hs.length - 1, e = last ? GN.cp : 1, px = i ? lerp(X(hs[i - 1].gen), X(h.gen), e) : X(h.gen), py = i ? lerp(Y(f(hs[i - 1].c)), Y(f(h.c)), e) : Y(f(h.c)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke(); ctx.restore();
      hs.forEach((h, i) => { const last = i === hs.length - 1, e = last ? GN.cp : 1, px = i ? lerp(X(hs[i - 1].gen), X(h.gen), e) : X(h.gen), py = i ? lerp(Y(f(hs[i - 1].c)), Y(f(h.c)), e) : Y(f(h.c)); D.sphere(px, py, 5.5, col, { gloss: false }); });
      const lh = SM.hist[SM.hist.length - 1]; if (lh && !PHONE) { D.text(px1 + 12, labY[k] + 4, name + ' ' + Math.round(f(lh.c)) + ' %', { size: 13, weight: 800, color: shade(col, -0.25), align: 'left' }); }
    });
    if (PHONE) { let lx = r.x + 16; series.forEach(([k, name, col]) => { D.sphere(lx + 6, r.y + r.h - 12, 6, col, { gloss: false }); D.text(lx + 16, r.y + r.h - 7, name, { size: 12, weight: 700, color: '#475569', align: 'left' }); lx += k === 'n' ? 150 : 70; }); }
    // 집단 점
    const dp = g.dp, anim = GN.anim;
    D.shadow(() => { ctx.fillStyle = SM.hab === 'grass' ? '#eaf6e4' : '#f1e6d2'; rr(dp.x, dp.y, dp.w, dp.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(dp.x, dp.y, dp.w, dp.h, 14).stroke();
    D.text(dp.x + 14, dp.y + 26, SM.gen + '세대 집단 40마리 · 서식지: ' + HABN[SM.hab], { size: PHONE ? 13.5 : 15.5, weight: 800, color: '#14532d', align: 'left' });
    const dots = GN.dots.length ? GN.dots : sortedDots(SM.pop);
    dots.forEach((d, i) => { const q = g.dot(i); ctx.save(); ctx.globalAlpha = d.alpha; ctx.translate(q.x, q.y); ctx.scale(Math.max(0.01, d.sc), Math.max(0.01, d.sc)); D.sphere(0, 0, g.dr, COL[d.k], { shadow: true }); if (d.dead && d.alpha < 0.9) { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-g.dr * 0.6, -g.dr * 0.6); ctx.lineTo(g.dr * 0.6, g.dr * 0.6); ctx.moveTo(g.dr * 0.6, -g.dr * 0.6); ctx.lineTo(-g.dr * 0.6, g.dr * 0.6); ctx.stroke(); } ctx.restore(); if (d.spark > 0 && d.sc > 0.8) D.spark(q.x + g.dr, q.y - g.dr, 9, t, '#fff6c2'); });
    if (anim && anim.stage === 0) { const f = clamp(anim.t, 0, 1), bx = lerp(dp.x + dp.w * 0.15, dp.x + dp.w * 0.7, f), by = dp.y + 52 + Math.sin(f * Math.PI * 4) * 6; birdShape(bx, by - 26, PHONE ? 26 : 28, 0.5 + 0.5 * Math.sin(t * 20), false); }
    const cc = SM.hist[SM.hist.length - 1].c; const sy = PHONE ? dp.y + dp.h - 54 : dp.y + 30;
    if (!PHONE) { let yy = dp.y + 62; KEYS.forEach((k) => { if (k !== 'g' && k !== 'b' && cc[k] === 0) return; D.sphere(dp.x + dp.w - 150, yy, 8, COL[k], { gloss: true }); D.text(dp.x + dp.w - 134, yy + 5, CNAME[k] + ' ' + cc[k] + '마리 (' + pctTxt(cc, k) + ')', { size: 14, weight: 800, color: '#1e293b', align: 'left' }); yy += 30; }); drawWrap(dp.x + dp.w - 76, yy + 8, anim ? '새가 잡아먹고, 살아남은 개체가 번식해요…' : '다음 세대로 넘어가면 새가 20마리를 잡아먹어요.', 140, 12.5, { weight: 700, color: '#64748b' }); }
    else { let xx = dp.x + 16; KEYS.forEach((k) => { if (k !== 'g' && k !== 'b' && cc[k] === 0) return; D.sphere(xx + 8, sy, 7, COL[k], { gloss: true }); D.text(xx + 20, sy + 5, CNAME[k] + ' ' + pctTxt(cc, k), { size: 13, weight: 800, color: '#1e293b', align: 'left' }); xx += 118; }); }
  }
  /* ---------- 후추나방 ---------- */
  const MOTH = [[1800, 0.8], [1848, 1], [1870, 25], [1895, 96], [1950, 90], [1970, 80], [1990, 30], [2000, 10]];
  const SOOT = [[1800, 0], [1840, 0.05], [1870, 0.6], [1895, 1], [1950, 0.95], [1970, 0.8], [1990, 0.4], [2000, 0.2]];
  const interp = (tab, y) => { if (y <= tab[0][0]) return tab[0][1]; for (let i = 0; i < tab.length - 1; i++) { const a = tab[i], b = tab[i + 1]; if (y >= a[0] && y <= b[0]) return lerp(a[1], b[1], (y - a[0]) / (b[0] - a[0])); } return tab[tab.length - 1][1]; };
  const mothPct = (y) => interp(MOTH, y), mothDark = (y) => Math.round(mothPct(y) / 5);
  const MOTHPOS = (() => { let s = 777; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); const a = []; for (let i = 0; i < 20; i++) a.push({ x: 0.2 + r() * 0.6, y: 0.1 + (i / 20) * 0.82 + (r() - 0.5) * 0.03, rot: (r() - 0.5) * 0.8 }); return a.sort(() => r() - 0.5); })();
  const mtG = () => (PHONE ? { tr: { x: 8, y: 8, w: 504, h: 300 }, ch: { x: 8, y: 316, w: 504, h: 270 }, nt: { x: 8, y: 596, w: 504, h: 150 } } : { tr: { x: 14, y: 10, w: 380, h: 538 }, ch: { x: 406, y: 10, w: 380, h: 330 }, nt: { x: 406, y: 350, w: 380, h: 198 } });
  function mothShape(x, y, s, col, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = col; ctx.strokeStyle = shade(col, -0.45); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.2); ctx.quadraticCurveTo(-s * 0.7, -s * 0.5, -s * 0.62, s * 0.34); ctx.quadraticCurveTo(-s * 0.1, s * 0.15, 0, s * 0.3); ctx.quadraticCurveTo(s * 0.1, s * 0.15, s * 0.62, s * 0.34); ctx.quadraticCurveTo(s * 0.7, -s * 0.5, 0, -s * 0.2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(shade(col, -0.5), 0.6); [[-0.3, 0], [0.3, 0], [-0.18, 0.18], [0.18, 0.18]].forEach((p) => { ctx.beginPath(); ctx.arc(p[0] * s, p[1] * s, s * 0.05, 0, TAU); ctx.fill(); }); ctx.restore();
  }
  function drawMoth(t) {
    const g = mtG(), y = GN.ydisp, soot = interp(SOOT, y), nd = mothDark(GN.yr), R = g.tr;
    // 나무 줄기
    D.shadow(() => { ctx.fillStyle = '#e8efe6'; rr(R.x, R.y, R.w, R.h, 14).fill(); }, { blur: 5, y: 2 });
    ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip();
    const tx = R.x + R.w * 0.18, tw = R.w * 0.64, base = mixc('#cfc7b2', '#3a3631', soot);
    const gr = ctx.createLinearGradient(tx, 0, tx + tw, 0); gr.addColorStop(0, shade(base, -0.18)); gr.addColorStop(0.35, base); gr.addColorStop(0.65, shade(base, 0.05)); gr.addColorStop(1, shade(base, -0.25)); ctx.fillStyle = gr; ctx.fillRect(tx, R.y, tw, R.h);
    let s = 55; const rn = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) { const x = tx + rn() * tw, y0 = R.y + rn() * R.h, hh = 18 + rn() * 40; ctx.strokeStyle = rgba(shade(base, rn() > 0.5 ? -0.3 : 0.25), 0.55); ctx.lineWidth = 1.5 + rn() * 2; ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + (rn() - 0.5) * 8, y0 + hh / 2, x + (rn() - 0.5) * 6, y0 + hh); ctx.stroke(); }
    for (let i = 0; i < 26; i++) { const x = tx + rn() * tw, y0 = R.y + rn() * R.h; ctx.fillStyle = rgba(mixc('#aeb6a0', '#4a463f', soot), 0.4); ctx.beginPath(); ctx.ellipse(x, y0, 9 + rn() * 9, 5 + rn() * 5, rn() * 3, 0, TAU); ctx.fill(); }
    // 나방
    MOTHPOS.forEach((m, i) => {
      const dark = i < nd, col = dark ? '#262626' : '#ebe6d6', contrast = dark ? soot < 0.5 : soot >= 0.5, x = tx + m.x * tw, yy = R.y + m.y * R.h;
      mothShape(x, yy, PHONE ? 26 : 30, col, m.rot);
      if (contrast) D.ring(x, yy, 22, t + i * 0.13, { color: '#ef4444', speed: 1.1, width: 2.5 });
    });
    ctx.restore(); ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 14).stroke();
    D.label(R.x + R.w / 2, R.y + 22, Math.round(y) + '년 · 나무 줄기 ' + (soot > 0.6 ? '검댕으로 어두움' : soot < 0.25 ? '밝은 색 (지의류)' : '점점 어두워짐'), { bg: '#0f172a', size: PHONE ? 12.5 : 14 });
    D.label(R.x + R.w / 2, R.y + R.h - 20, '빨간 고리 = 줄기와 색이 달라 눈에 잘 띄는 나방', { bg: rgba('#b91c1c', 0.9), size: PHONE ? 11.5 : 12.5 });
    // 그래프
    const c = g.ch, px0 = c.x + 52, px1 = c.x + c.w - 20, py0 = c.y + 46, py1 = c.y + c.h - 44, X = (yr) => px0 + ((yr - 1800) / 200) * (px1 - px0), Y = (v) => py1 - (v / 100) * (py1 - py0);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(c.x, c.y, c.w, c.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(c.x, c.y, c.w, c.h, 14).stroke();
    D.text(c.x + 14, c.y + 24, '어두운 색 나방의 비율 (%) · 예시 자료(단순화)', { size: PHONE ? 12.5 : 14, weight: 800, color: '#14532d', align: 'left' });
    [0, 50, 100].forEach((v) => { ctx.strokeStyle = '#e8efe6'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px0, Y(v)); ctx.lineTo(px1, Y(v)); ctx.stroke(); D.text(px0 - 8, Y(v) + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    [1800, 1850, 1900, 1950, 2000].forEach((yr) => D.text(X(yr), py1 + 18, String(yr), { size: 12.5, weight: 700, color: '#64748b' }));
    ctx.save(); ctx.beginPath(); for (let yr = 1800; yr <= 2000; yr += 2) { const px = X(yr), py = Y(mothPct(yr)); yr === 1800 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.stroke(); ctx.beginPath(); for (let yr = 1800; yr <= GN.yr; yr += 2) { const px = X(yr), py = Y(mothPct(yr)); yr === 1800 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.strokeStyle = '#374151'; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(GN.yr), py0 - 6); ctx.lineTo(X(GN.yr), py1); ctx.stroke(); D.sphere(X(GN.yr), Y(mothPct(GN.yr)), 7, '#ef4444', { shadow: true });
    D.label(clamp(X(GN.yr), px0 + 56, px1 - 56), Math.max(py0 - 8, Y(mothPct(GN.yr)) - 20), (mothPct(GN.yr) < 1 ? '1 % 미만' : '약 ' + Math.round(mothPct(GN.yr)) + ' %'), { bg: '#0f172a', size: 12.5 });
    D.text((px0 + px1) / 2, py1 + 38, '연도 (영국 맨체스터 지역의 예)', { size: 12.5, weight: 700, color: '#64748b' });
    // 설명
    const n = g.nt; D.shadow(() => { ctx.fillStyle = '#fff'; rr(n.x, n.y, n.w, n.h, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(n.x, n.y, n.w, n.h, 14).stroke();
    D.text(n.x + 14, n.y + 26, '나방 20마리 중 어두운 색 ' + nd + '마리 (한 마리 = 5 %)', { size: PHONE ? 13.5 : 14.5, weight: 800, color: '#1e293b', align: 'left' });
    const txt = soot > 0.6 ? '줄기가 검댕으로 어두워지면 밝은 나방이 눈에 띄어 많이 잡아먹히고, 어두운 나방이 더 많이 살아남아 번식해요.' : soot < 0.25 ? '줄기가 밝을 때는 밝은 나방이 눈에 띄지 않아 더 많이 살아남아요.' : '줄기가 어두워지면서 어두운 나방의 비율이 빠르게 늘어요.';
    drawWrap(n.x + 14, n.y + 54, txt + ' 변하는 것은 개체가 아니라 집단 안의 형질 비율이에요.', n.w - 28, PHONE ? 13 : 13.5, { weight: 700, color: '#475569', align: 'left', lh: 1.32 });
  }
  function stepMoth(dt) { GN.ydisp = approach(GN.ydisp, GN.yr, dt, 9); }

  /* ======================================================
     화면 ④: 자연선택설 — 5단계 순서 · 항생제 내성 세균
     ====================================================== */
  const STAGES = [
    { id: 'st1', label: '과잉 생산 (살아남는 수보다 많이 태어남)', map: '모의실험: 번식으로 다음 세대가 40마리로 늘어요' },
    { id: 'st2', label: '변이 (같은 종 안에 형질 차이가 있음)', map: '모의실험: 초록·갈색(·새 색) 애벌레가 섞여 있어요' },
    { id: 'st3', label: '생존 경쟁 (모두 살아남지는 못함)', map: '모의실험: 새가 눈에 띄는 애벌레를 잡아먹어요' },
    { id: 'st4', label: '자연선택·적자생존 (환경에 적응한 개체가 더 많이 번식)', map: '모의실험: 풀밭에서는 초록이 더 많이 살아남아 번식해요' },
    { id: 'st5', label: '유전과 누적 (유리한 형질이 집단에 쌓여 진화)', map: '모의실험: 세대가 지날수록 초록 비율이 늘어요' },
  ];
  let tBoard = null;
  function buildTheory() {
    const zones = STAGES.map((s, i) => PHONE
      ? { id: 'o' + i, x: 8, y: 52 + i * 98, w: 504, h: 92, label: '', cap: 1, head: 0, color: '#16a34a', fill: 'rgba(220,252,231,.5)', cols: 1,
          draw: (z) => { const c = tBoard.inZone(z.id)[0]; D.text(z.x + 12, z.y + 16, (i + 1) + '단계', { size: 13, weight: 800, color: '#15803d', align: 'left' }); if (c && c.n === i) D.text(z.x + z.w / 2, z.y + z.h - 8, '🔬 ' + STAGES[i].map, { size: 12, weight: 700, color: '#15803d' }); } }
      : { id: 'o' + i, x: 14 + i * 156, y: 56, w: 148, h: 190, label: '', cap: 1, head: 0, color: '#16a34a', fill: 'rgba(220,252,231,.5)', cols: 1,
          draw: (z) => { const c = tBoard.inZone(z.id)[0]; D.text(z.x + 10, z.y + 17, (i + 1) + '단계', { size: 13, weight: 800, color: '#15803d', align: 'left' }); if (c && c.n === i) drawWrap(z.x + z.w / 2, z.y + 138, STAGES[i].map.replace('모의실험: ', '🔬 '), z.w - 14, 12.5, { weight: 700, color: '#15803d', lh: 1.2 }); } });
    zones.forEach((z, i) => { z.center = false; });
    tBoard = new Board({ zones, tray: PHONE ? { x: 12, y: 552, w: 496, cols: 2 } : { x: 14, y: 300, w: 772, cols: 5 }, cw: PHONE ? 244 : 148, ch: PHONE ? 66 : 112, gap: 8, vertical: false, maxLines: PHONE ? 3 : 5, onReject: (c, z, m) => say(m, true) });
    // 칸 안 카드는 위쪽에 놓이도록
    [3, 0, 4, 2, 1].forEach((i) => tBoard.add({ id: STAGES[i].id, label: STAGES[i].label, n: i, border: '#cfd8e6' }));
    tBoard.layout(true);
  }
  function drawTheory(t) {
    D.text(VW / 2, PHONE ? 30 : 36, '📜 다윈의 자연선택설 — 순서대로 카드를 놓아요', { size: PHONE ? 14.5 : 18, weight: 800, color: '#14532d' });
    tBoard.draw(t);
    D.text(VW / 2, PHONE ? 543 : 286, '👇 아직 놓지 않은 카드', { size: 13, weight: 800, color: '#64748b' });
  }
  /* ---------- 항생제 내성 세균 ---------- */
  const BA = { list: [], phase: 'ready', cycles: 0, treats: 0, t: 0, drops: [], dishT: 0 };
  const dish = () => (PHONE ? { x: 260, y: 262, r: 236 } : { x: 330, y: 286, r: 238 });
  function resetBact() {
    BA.list = []; BA.phase = 'ready'; BA.cycles = 0; BA.treats = 0; BA.t = 0; const d = dish();
    for (let i = 0; i < 60; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * (d.r - 22); BA.list.push({ x: d.x + Math.cos(a) * r, y: d.y + Math.sin(a) * r, ang: Math.random() * TAU, vx: rnd(-8, 8), vy: rnd(-8, 8), res: i < 3, alive: true, alpha: 1, pop: 1, ph: Math.random() * 6 }); }
    BA.list.sort(() => Math.random() - 0.5);
  }
  const baRes = () => BA.list.filter((b) => b.alive && b.res).length, baAll = () => BA.list.filter((b) => b.alive).length, baPct = () => (baAll() ? Math.round((baRes() / baAll()) * 100) : 0);
  function treat() {
    if (BA.phase !== 'ready') return; BA.phase = 'treat'; BA.t = 0; BA.treats++; Sound.click(); const d = dish();
    for (let i = 0; i < 26; i++) parts.emit({ x: d.x + rnd(-d.r * 0.8, d.r * 0.8), y: d.y - d.r - rnd(10, 90), vx: 0, vy: rnd(150, 230), life: 1.2, size: rnd(4, 7), color: '#a855f7', shape: 'bubble', gravity: 120, fade: true });
    BA.list.forEach((b) => { b.doom = !b.res && Math.random() < 0.95; });
    BA.list.filter((b) => b.alive && !b.res && !b.doom).forEach((b) => (b.lucky = true));
  }
  function regrow() {
    if (BA.phase !== 'treated') return; BA.phase = 'grow'; BA.t = 0; Sound.click(); const d = dish(); const surv = BA.list.filter((b) => b.alive);
    const need = 60 - surv.length; for (let i = 0; i < need; i++) {
      const par = surv[i % surv.length], a = Math.random() * TAU, r = 18 + Math.random() * 20, nb = { x: clamp(par.x + Math.cos(a) * r, d.x - d.r + 24, d.x + d.r - 24), y: par.y + Math.sin(a) * r, ang: Math.random() * TAU, vx: rnd(-8, 8), vy: rnd(-8, 8), res: par.res, alive: true, alpha: 1, pop: 0, ph: Math.random() * 6 };
      const dd = Math.hypot(nb.x - d.x, nb.y - d.y); if (dd > d.r - 22) { nb.x = d.x + (nb.x - d.x) / dd * (d.r - 22); nb.y = d.y + (nb.y - d.y) / dd * (d.r - 22); }
      BA.list.push(nb); SciSim.tween(nb, { pop: 1 }, { duration: RM ? 0.01 : 0.6, delay: RM ? 0 : 0.2 + i * 0.012, ease: 'outBack' });
    }
  }
  function stepBact(dt) {
    const d = dish();
    BA.list.forEach((b) => {
      if (b.alive) { b.x += b.vx * dt; b.y += b.vy * dt; b.ang += Math.sin(b.ph + BA.dishT) * dt * 0.8; b.vx += rnd(-12, 12) * dt; b.vy += rnd(-12, 12) * dt; b.vx = clamp(b.vx, -14, 14); b.vy = clamp(b.vy, -14, 14); const dd = Math.hypot(b.x - d.x, b.y - d.y); if (dd > d.r - 20) { b.x = d.x + (b.x - d.x) / dd * (d.r - 20); b.y = d.y + (b.y - d.y) / dd * (d.r - 20); b.vx *= -0.5; b.vy *= -0.5; } }
    });
    BA.dishT += dt;
    if (BA.phase === 'treat') {
      BA.t += dt;
      BA.list.forEach((b) => { if (b.alive && b.doom && BA.t > 0.5) { b.alpha = Math.max(0, b.alpha - dt * 1.8); if (b.alpha <= 0) { b.alive = false; parts.burst(b.x, b.y, { count: 5, speed: 60, size: 2.5, life: 0.4, colors: ['#93c5fd', '#fff'] }); } } });
      if (BA.t > 1.6) { BA.list = BA.list.filter((b) => b.alive); BA.phase = 'treated'; Sound.success(); updateCtl(); say('항생제 처리 끝! 내성 세균과 운 좋게 살아남은 세균만 남았어요. 🔄 세균 증식을 눌러요.', false, 3.4); }
    } else if (BA.phase === 'grow') { BA.t += dt; if (BA.t > 1.4) { BA.phase = 'ready'; BA.cycles++; Sound.success(); updateCtl(); say('증식 완료! 내성 세균이 ' + baPct() + ' %가 됐어요.', false, 3); } }
  }
  function drawBact(t) {
    const d = dish();
    D.shadow(() => { ctx.fillStyle = '#fff7e0'; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); }, { blur: 10, y: 4 });
    const g = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.1, d.x, d.y, d.r); g.addColorStop(0, '#fff3c4'); g.addColorStop(1, '#f6dc8c'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, d.r - 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#d1b35e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(d.x, d.y, d.r - 2, 0, TAU); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(d.x, d.y, d.r - 10, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    BA.list.forEach((b) => {
      if (b.alpha <= 0.01) return;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang); ctx.globalAlpha = b.alpha; const s = Math.max(0.01, b.pop), L = PHONE ? 34 : 36, W = PHONE ? 15 : 16; ctx.scale(s, s);
      if (b.res) { ctx.fillStyle = '#f97316'; ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 3; rr(-L / 2 - 2, -W / 2 - 2, L + 4, W + 4, (W + 4) / 2).fill(); rr(-L / 2 - 2, -W / 2 - 2, L + 4, W + 4, (W + 4) / 2).stroke(); ctx.fillStyle = '#fed7aa'; rr(-L / 2 + 3, -W / 2 + 2, L - 6, W - 4, (W - 4) / 2).fill(); }
      else { ctx.fillStyle = '#7cc4f2'; ctx.strokeStyle = '#2b78b5'; ctx.lineWidth = 1.6; rr(-L / 2, -W / 2, L, W, W / 2).fill(); rr(-L / 2, -W / 2, L, W, W / 2).stroke(); ctx.fillStyle = 'rgba(255,255,255,.55)'; rr(-L / 2 + 4, -W / 2 + 2, L * 0.4, 3, 1.5).fill(); }
      if (b.doom && BA.phase === 'treat' && BA.t > 0.5) { ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6); ctx.lineTo(-6, 6); ctx.stroke(); }
      ctx.restore();
    });
    // 오른쪽(또는 아래) 설명
    const sx = PHONE ? 8 : 590, sy = PHONE ? 510 : 40, sw = PHONE ? 504 : 196;
    const n = baAll(), rs = baRes();
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(sx, sy, sw, PHONE ? 250 : 360, 14).fill(); }, { blur: 5, y: 2 }); ctx.strokeStyle = '#cfd8c7'; ctx.lineWidth = 2; rr(sx, sy, sw, PHONE ? 250 : 360, 14).stroke();
    D.text(sx + 14, sy + 26, '세균 집단', { size: 15, weight: 800, color: '#14532d', align: 'left' });
    ctx.fillStyle = '#7cc4f2'; rr(sx + 14, sy + 44, 28, 12, 6).fill(); ctx.strokeStyle = '#2b78b5'; ctx.lineWidth = 1.5; rr(sx + 14, sy + 44, 28, 12, 6).stroke(); D.text(sx + 50, sy + 55, '보통 세균', { size: 13, weight: 700, color: '#334155', align: 'left' });
    ctx.fillStyle = '#fed7aa'; rr(sx + 14, sy + 66, 28, 12, 6).fill(); ctx.strokeStyle = '#9a3412'; ctx.lineWidth = 3; rr(sx + 14, sy + 66, 28, 12, 6).stroke(); D.text(sx + 50, sy + 77, '항생제 내성 세균', { size: 13, weight: 700, color: '#334155', align: 'left' });
    const bw = sw - 28; ctx.fillStyle = '#e2e8f0'; rr(sx + 14, sy + 94, bw, 20, 10).fill(); if (n) { ctx.fillStyle = '#f97316'; rr(sx + 14, sy + 94, Math.max(0, bw * rs / n), 20, 10).fill(); }
    D.text(sx + sw / 2, sy + 132, '내성 세균 ' + rs + ' / ' + n + ' (' + baPct() + ' %)', { size: 14, weight: 800, color: '#9a3412' });
    D.text(sx + sw / 2, sy + 156, '완료한 처리 → 증식 ' + BA.cycles + '번', { size: 13, weight: 700, color: '#475569' });
    drawWrap(sx + sw / 2, sy + 188, BA.phase === 'ready' ? (BA.cycles === 0 ? '처음에는 내성 세균이 아주 적어요. 💊 항생제 처리를 눌러 봐요.' : '한 번 더! 💊 항생제를 처리하면 내성 세균은 살아남아요.') : BA.phase === 'treated' ? '살아남은 세균이 🔄 번식해 집단이 다시 채워져요.' : '진행 중…', sw - 24, 13, { weight: 700, color: '#64748b' });
  }

  /* ======================================================
     화면 전환 · 컨트롤
     ====================================================== */
  let MODE = 'var', SUB = 'hist', fade = 0, game = null;
  const DEFSUB = { var: 'hist', sim: '', gen: 'auto', theory: 'order' };
  const MODE_LABEL = { var: '🔍 변이', sim: '🐦 모의실험', gen: '📈 세대 변화', theory: '📜 자연선택설' };
  function setMode(m, sub) {
    const s = sub != null ? sub : DEFSUB[m];
    if (MODE !== m || SUB !== s) fade = 1;
    MODE = m; SUB = s; if (tBoard) { tBoard.drag = null; tBoard.hoverZone = null; }
    if (m === 'gen') syncDots();
    updateCtl();
  }
  const ensure = (m, sub) => { if (MODE !== m || (sub != null && SUB !== sub)) setMode(m, sub); };
  const needHabPred = () => !(game && game.free) && !GN.pred;
  function updateCtl() {
    const key = MODE + (SUB ? ':' + SUB : '');
    $('#tbLabel').textContent = MODE_LABEL[MODE];
    $$('#ctrlCard .control').forEach((c) => { const toks = c.dataset.show.split(' '); c.hidden = !(toks.includes(key) || toks.includes(MODE)); });
    const fr = !!(game && game.free);
    $('#modeSeg').hidden = !fr; $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === MODE));
    [['#subVar', 'var'], ['#subGen', 'gen'], ['#subTheory', 'theory']].forEach(([id, m]) => { $(id).hidden = !fr; $(id + 'Wrap').hidden = !(fr && MODE === m); $$(id + ' button').forEach((b) => b.classList.toggle('on', b.dataset.sub === SUB)); });
    $('#oStack').textContent = VR.stacked + ' / 20'; $('#bAuto').disabled = VR.stacked >= 20;
    $('#oCause').textContent = '돌연변이 ' + VR.muts + '번 · 섞기 ' + VR.mixes + '번';
    $('#oSimGen').textContent = SM.gen + '세대';
    $('#bHunt').disabled = SM.phase !== 'ready'; $('#bBreed').disabled = !(SM.phase === 'done' && SM.caught >= 5); $('#bRetry').disabled = SM.phase !== 'done';
    $('#simInfo').textContent = SM.phase === 'ready' ? '🐦 사냥 시작을 누르면 10초 동안 사냥할 수 있어요.' : SM.phase === 'hunt' ? '눈에 띄는 애벌레를 눌러 잡아요! (최대 ' + EAT + '마리)' : (SM.caught >= 5 ? '🐣 번식시키기를 눌러 다음 세대를 만들어요.' : '5마리 이상 잡아야 해요. 🔄 다시 사냥해요.');
    $('#oGen').textContent = SM.gen + '세대'; $('#bStep').disabled = !!GN.anim || SM.phase === 'hunt'; $('#bTo5').disabled = !!GN.anim || SM.gen >= 5;
    $$('#habSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.hab === SM.hab); b.disabled = !!GN.anim || (b.dataset.hab === 'leaf' && needHabPred()); });
    $$('#predSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.pred === GN.pred); b.disabled = SM.hab === 'leaf'; });
    $('#predNote').textContent = SM.hab === 'leaf' ? (SM.gen - GN.switchGen >= 3 ? (GN.pred === (pct(SM.pop, 'g') < GN.switchGreen ? 'down' : 'up') ? '✔ 예측이 맞았어요: 초록 비율 ' + Math.round(GN.switchGreen) + ' % → ' + pctTxt(SM.pop, 'g') : '✘ 예측과 달랐어요: 초록 비율 ' + Math.round(GN.switchGreen) + ' % → ' + pctTxt(SM.pop, 'g')) : '낙엽층에서 ' + Math.max(0, SM.gen - GN.switchGen) + ' / 3세대 진행했어요.') : (GN.pred ? '예측했어요! 이제 서식지를 낙엽층으로 바꿔 봐요.' : '서식지를 바꾸기 전에 먼저 예측해요.');
    $('#oYear').textContent = GN.yr + '년'; $('#rYear').value = GN.yr;
    $('#oOrder').textContent = (tBoard ? tBoard.cards.filter((c) => c.zone).length : 0) + ' / 5';
    $('#bTreat').disabled = BA.phase !== 'ready'; $('#bRegrow').disabled = BA.phase !== 'treated';
    $('#oBact').textContent = '내성 ' + baRes() + ' / ' + baAll() + ' (' + baPct() + ' %) · ' + BA.cycles + '번 반복';
  }
  $('#bAuto').addEventListener('click', () => { Sound.click(); VR.auto = 0.01; });
  $('#bVarReset').addEventListener('click', () => { Sound.click(); resetVar(); updateCtl(); });
  $('#bMix').addEventListener('click', () => shuffleGametes());
  $('#bMutate').addEventListener('click', () => mutateBase(Math.floor(Math.random() * 12)));
  $('#bHunt').addEventListener('click', startHunt); $('#bBreed').addEventListener('click', () => { Sound.click(); breedNow(); });
  $('#bRetry').addEventListener('click', () => { Sound.click(); retryHunt(); });
  $('#bSimReset').addEventListener('click', () => { Sound.click(); resetSim(); updateCtl(); });
  $('#bStep').addEventListener('click', () => genStep());
  $('#bTo5').addEventListener('click', () => { Sound.click(); runTo(5); });
  $$('#habSeg button').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); const h = b.dataset.hab; if (h === SM.hab) return; if (h === 'leaf') { GN.switchGen = SM.gen; GN.switchGreen = pct(SM.pop, 'g'); } else GN.switchGen = -1; setHab(h); updateCtl(); }));
  $$('#predSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); GN.pred = b.dataset.pred; updateCtl(); }));
  $('#rYear').addEventListener('input', () => { GN.yr = +$('#rYear').value; updateCtl(); });
  SciSim.bindRange($('#rYear'), null, null, null);
  $$('#yrSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); GN.yr = +b.dataset.y; $('#rYear').value = GN.yr; $('#rYear').dispatchEvent(new Event('input')); }));
  $('#bTheoryReset').addEventListener('click', () => { Sound.click(); tBoard.reset(); updateCtl(); });
  $('#bTreat').addEventListener('click', treat); $('#bRegrow').addEventListener('click', regrow);
  $('#bBactReset').addEventListener('click', () => { Sound.click(); resetBact(); updateCtl(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  [['#subVar', 'var'], ['#subGen', 'gen'], ['#subTheory', 'theory']].forEach(([id, m]) => $$(id + ' button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(m, b.dataset.sub); })));

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (MODE === 'var') {
        if (SUB === 'cause') { const g = crG(), A = g.a; const nb = 12, bw = Math.min(30, (A.w - 40) / nb), bx0 = A.x + (A.w - nb * bw) / 2, by = A.y + (PHONE ? 118 : 140); if (p.y >= by && p.y <= by + bw * 1.3 + 10 && p.x >= bx0 && p.x <= bx0 + nb * bw) { mutateBase(clamp(Math.floor((p.x - bx0) / bw), 0, nb - 1)); updateCtl(); } return false; }
        if (varTap(p)) { updateCtl(); } return false;
      }
      if (MODE === 'sim') { huntTap(p); return false; }
      if (MODE === 'theory' && SUB === 'order') return tBoard.down(p);
      return false;
    },
    move(p) { if (MODE === 'theory' && SUB === 'order') tBoard.move(p); },
    up(p) { if (MODE === 'theory' && SUB === 'order') { tBoard.up(p); updateCtl(); } },
    hover(p) { if (MODE === 'sim') return SM.phase === 'hunt' ? 'crosshair' : 'default'; if (MODE === 'theory' && SUB === 'order') return tBoard.hit(p) ? 'grab' : 'default'; return 'default'; },
  });

  function readouts() {
    if (MODE === 'var' && SUB === 'hist') { const w = VR.bf.filter((b) => b.placed && b.t >= 1).length; setReadouts(['쌓은 나비', w + ' / 20', '가장 긴 날개', VR.tab === 2 ? Math.max(...BUT_LEN).toFixed(1) + ' cm' : '—', '가장 짧은 날개', VR.tab === 2 ? Math.min(...BUT_LEN).toFixed(1) + ' cm' : '—']); }
    else if (MODE === 'var') setReadouts(['돌연변이 체험', VR.muts + '번', '유전자 조합 체험', VR.mixes + '번', '유전되는 변이', '돌연변이 · 조합']);
    else if (MODE === 'sim') { const a = aliveCounts(); setReadouts(['세대', SM.gen + '세대', '잡은 애벌레', SM.caught + ' / ' + EAT + '마리', '남은 초록 · 갈색', a.g + ' · ' + a.b]); }
    else if (MODE === 'gen' && SUB === 'auto') { const c = SM.pop; setReadouts(['세대 · 서식지', SM.gen + '세대 · ' + HABN[SM.hab], '초록 비율', pctTxt(c, 'g'), '갈색 비율', pctTxt(c, 'b')]); }
    else if (MODE === 'gen') setReadouts(['연도', GN.yr + '년', '어두운 색 나방', '약 ' + Math.round(mothPct(GN.yr)) + ' %', '나방 20마리 중', mothDark(GN.yr) + '마리']);
    else if (SUB === 'order') setReadouts(['놓은 카드', tBoard.cards.filter((c) => c.zone).length + ' / 5', '핵심', '변이 + 선택 + 유전', '결과', '진화']);
    else setReadouts(['내성 세균', baRes() + ' / ' + baAll() + '마리', '내성 비율', baPct() + ' %', '반복 횟수', BA.cycles + '번']);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) { resetVar(); setMode('var', 'hist'); }
    else if (li === 1) { resetSim(); setMode('sim'); }
    else if (li === 2) { GN.anim = null; autoRun = 0; GN.yr = 1850; GN.ydisp = 1850; syncDots(); setMode('gen', 'auto'); }
    else { buildTheory(); resetBact(); setMode('theory', 'order'); }
    updateCtl();
  }
  const levels = [
    {
      title: '변이: 같은 종인데 서로 달라요', short: '변이', icon: '🔍', phase: '관찰',
      features: ['var'],
      intro: '<p class="si-q">❓ 탐구 질문: 어떤 환경에서는 왜 특정한 색깔의 생물이 점점 많아질까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 같은 종 안에서도 형질이 조금씩 다른 <b>변이</b>가 있다고 배웠어요(중1 \'변이와 생물다양성\'). 통합과학에서는 변이가 <b>어떻게 생기는지</b>, 그리고 그것이 <b>진화</b>로 어떻게 이어지는지 알아봐요.</div>' +
        '<p>무당벌레, 달팽이, 나비 집단에서 형질이 어떻게 다른지 비교하고, 나비 날개 길이 <b>히스토그램</b>을 만들어 봐요.</p>',
      setup() { enterLevel(0); },
      recap: '같은 종 안에도 형질의 차이(변이)가 있어요. 유전되는 변이는 돌연변이와 유전자 조합으로 생겨요.',
      summary: '<ul><li><b>변이</b> = 같은 종 안에서 나타나는 형질의 차이. 날개 길이처럼 값이 퍼져 있는 형질은 히스토그램으로 나타낼 수 있어요.</li><li><b>유전되는 변이</b>의 원인: ㉠ <b>돌연변이</b>(DNA 염기 서열의 변화, 무작위로 생김) ㉡ 생식세포 형성(감수 분열)과 수정 때의 <b>염색체·유전자 조합</b>.</li><li>운동으로 근육이 커지는 것처럼 <b>환경의 영향</b>으로 생긴 차이는 자손에게 유전되지 않아서 자연선택의 대상이 아니에요.</li></ul>',
      missions: [
        {
          title: '날개 길이 히스토그램 만들기', goal: '나비 20마리를 눌러 알맞은 <b>날개 길이 구간</b> 막대에 쌓으세요. (<b>⚡ 자동으로 쌓기</b>를 써도 돼요.)',
          hint: '🦋 나비 날개 길이 탭이 열려 있어요. 나비를 하나씩 누르면 날개 길이(cm)에 맞는 막대로 날아가요. 20마리를 모두 쌓아요.',
          setup() { ensure('var', 'hist'); VR.tab = 2; },
          check: () => VR.stacked === 20 && VR.bf.every((b) => b.t >= 1), hold: 0.6,
          status: () => mark(VR.stacked === 20) + ' 쌓은 나비 ' + VR.bf.filter((b) => b.placed && b.t >= 1).length + ' / 20',
          explain: '날개 길이는 가운데(약 5.0~5.5 cm) 구간에 가장 많고 양쪽으로 갈수록 적어요. 같은 종이어도 개체마다 형질이 다르다는 것, 즉 <b>변이</b>가 있다는 것을 보여 줘요.',
        },
        {
          title: '변이는 어떻게 생길까?', goal: '<b>돌연변이</b>(염기를 눌러 바꾸기)와 <b>유전자 조합</b>(🔀 염색체 섞기)을 각각 한 번 이상 해 보세요.',
          hint: 'DNA 염기 서열의 색 블록을 눌러 한 개를 바꿔 보고, 아래 🔀 염색체 섞기 버튼을 눌러요.',
          setup() { ensure('var', 'cause'); },
          check: () => VR.muts >= 1 && VR.mixes >= 1, hold: 0.5,
          status: () => mark(VR.muts >= 1) + ' 돌연변이 ' + VR.muts + '번 · ' + mark(VR.mixes >= 1) + ' 유전자 조합 ' + VR.mixes + '번',
          explain: '<b>돌연변이</b>는 DNA 염기 서열이 바뀌는 것으로, 환경이 필요해서가 아니라 <b>무작위로</b> 생겨요. 또 감수 분열과 수정 때 염색체가 <b>다르게 조합</b>되어 부모와 다른 형질의 자손이 태어나요.',
        },
        {
          type: 'quiz', title: '유전되는 변이?', goal: '운동으로 근육이 크게 발달한 사람의 자녀는 태어날 때부터 근육이 더 클까요?',
          setup() { ensure('var', 'hist'); },
          choices: ['아니요. 환경의 영향으로 생긴 차이는 유전되지 않아서 자연선택의 대상이 아니에요', '네. 노력해서 얻은 형질은 모두 자손에게 전해져요', '네. 근육은 부모가 단련한 만큼 자손에게 전해져요', '아니요. 근육과 관련된 형질은 어떤 경우에도 유전되지 않아요'],
          answer: 0,
          feedback: ['', '노력해서 얻은 형질(획득 형질)은 유전되지 않아요. 유전자는 바뀌지 않았기 때문이에요.', '단련으로 생긴 근육의 크기는 DNA에 기록되지 않아요.', '근육의 발달 정도에 영향을 주는 유전적 차이는 유전돼요. 단련으로 생긴 차이만 유전되지 않아요.'],
          explain: '자연선택은 <b>유전되는 변이</b>에만 작용해요. 환경의 영향으로 생긴 차이는 자손에게 전해지지 않아요.',
        },
      ],
    },
    {
      title: '모의실험: 포식자 새가 되어 보기', short: '모의실험', icon: '🐦', phase: '실험',
      features: ['sim'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 종 안에 변이가 있다는 것을 알았어요. 이제 <b>변이가 있는 집단에 포식자가 있으면</b> 무슨 일이 일어나는지 직접 실험해 봐요.</div>' +
        '<p>풀밭에 <b>초록 애벌레 20마리와 갈색 애벌레 20마리</b>가 살아요. 당신은 <b>포식자 새</b>예요! 10초 동안 눈에 띄는 애벌레를 눌러 잡고, 살아남은 애벌레를 <b>번식</b>시켜 다음 세대를 만들어요. 번식 때는 1~2마리가 무작위로 <b>돌연변이</b> 색이 돼요.</p>',
      setup() { enterLevel(1); },
      recap: '눈에 덜 띄는 형질을 가진 개체가 더 많이 살아남아 번식하므로, 다음 세대에는 그 형질의 비율이 늘어요.',
      summary: '<ul><li>모의실험: 풀밭에서 갈색 애벌레는 눈에 잘 띄어 더 많이 잡히고, 초록 애벌레는 더 많이 살아남아요.</li><li>살아남은 개체가 번식하면 다음 세대 40마리에서 <b>초록 비율이 늘어요</b>(예: 초록 20 : 갈색 20 → 초록 약 26~28 : 갈색 약 12~14).</li><li>번식 때 무작위로 생기는 <b>돌연변이</b> 색은 눈에 띄면 잡혀 사라지고, 배경과 비슷하면 퍼질 수 있어요.</li></ul>',
      missions: [
        {
          title: '1세대 사냥하고 번식시키기', goal: '<b>🐦 사냥 시작</b>을 누르고 10초 동안 애벌레를 5마리 이상 잡은 뒤, 살아남은 애벌레를 <b>🐣 번식시키기</b>로 다음 세대로 만드세요.',
          hint: '배경과 색이 다른 애벌레는 눈에 잘 띄어요. 풀밭에서는 어떤 색이 눈에 띄나요? 잡은 수가 5마리가 안 되면 🔄 다시 사냥할 수 있어요.',
          setup() { ensure('sim'); },
          check: () => SM.bred >= 1 && SM.gen >= 2, hold: 0.6,
          status: () => mark(SM.phase !== 'ready' || SM.bred >= 1) + ' 사냥(잡은 수 ' + SM.caught + ') · ' + mark(SM.bred >= 1) + ' 번식(현재 ' + SM.gen + '세대)',
          explain: '풀밭에서는 <b>갈색 애벌레가 눈에 잘 띄어</b> 더 많이 잡히고, 초록 애벌레가 더 많이 살아남아요. 살아남은 개체가 번식하니 다음 세대에서는 <b>초록 애벌레의 비율</b>이 늘어나요.',
        },
        {
          type: 'quiz', title: '초록 비율이 늘어난 까닭', goal: '다음 세대에서 초록 애벌레의 <b>비율</b>이 늘어난 까닭은?',
          setup() { ensure('sim'); },
          choices: ['초록 애벌레가 풀밭에서 눈에 덜 띄어 더 많이 살아남아 번식했기 때문이다', '새가 초록 애벌레를 일부러 잡지 않았기 때문이다', '갈색 애벌레가 풀밭에서 살다 보니 몸 색이 초록으로 변했기 때문이다', '초록 애벌레만 번식할 수 있기 때문이다'],
          answer: 0,
          feedback: ['', '새는 눈에 띄는 애벌레를 잡았을 뿐이에요. 색에 따라 잡히기 쉬운 정도가 달랐어요.', '개체의 색이 환경에 맞춰 바뀐 것이 아니에요. 색은 처음부터 유전으로 정해져 있었어요.', '갈색 애벌레도 살아남으면 번식해요. 다만 살아남은 수가 적었어요.'],
          explain: '변한 것은 <b>개체</b>가 아니라 <b>집단 안의 형질 비율</b>이에요. 환경에 유리한 형질(눈에 덜 띄는 초록색)을 가진 개체가 더 많이 살아남아 번식했기 때문이에요.',
        },
      ],
    },
    {
      title: '세대 변화: 비율은 어떻게 달라질까', short: '세대 변화', icon: '📈', phase: '분석',
      features: ['gen'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 한 세대 만에 초록 애벌레 비율이 늘어나는 것을 확인했어요. 세대가 계속 지나면 어떻게 될까요?</div>' +
        '<p>이전 실험 결과에서 이어서 <b>자동으로 세대를 진행</b>하며 색 비율 그래프를 그려요(포식자는 눈에 띄는 개체를 더 잘 잡도록 설정했어요). 서식지를 <b>낙엽층으로 바꾸면</b> 어떻게 될지 <b>먼저 예측</b>하고, 실제 자료인 <b>후추나방</b>과도 비교해 봐요.</p>',
      setup() { enterLevel(2); },
      recap: '환경에 유리한 형질의 비율은 세대를 거듭하며 늘어나고, 환경이 바뀌면 유리한 형질도 달라져요. 변하는 것은 개체가 아니라 집단이에요.',
      summary: '<ul><li>풀밭에서는 세대가 지날수록 <b>초록 비율</b>이 꾸준히 늘어 90 % 이상이 돼요.</li><li>서식지를 <b>낙엽층</b>으로 바꾸면 유리한 형질이 반대가 되어 갈색(과 낙엽과 비슷한 색)의 비율이 다시 늘어요. <b>환경이 바뀌면 유리한 형질도 달라져요.</b></li><li>후추나방(예시, 단순화): 산업 혁명 전 어두운 색 1 % 미만 → 19세기 말 95 % 이상 → 대기 오염 규제 후 다시 감소.</li><li>변하는 것은 <b>개체</b>가 아니라 <b>집단 안의 형질 비율</b>이에요.</li></ul>',
      missions: [
        {
          title: '5세대까지 진행하기', goal: '<b>▶ 다음 세대</b>(또는 ⏩ 5세대까지)로 세대를 진행해 <b>5세대</b>까지 그래프를 완성하세요.',
          hint: '버튼을 누르면 새가 20마리를 잡아먹고 살아남은 개체가 번식해요. 초록 비율이 어떻게 변하는지 그래프를 보세요.',
          setup() { ensure('gen', 'auto'); },
          check: () => SM.gen >= 5 && !GN.anim, hold: 0.5,
          status: () => mark(SM.gen >= 5) + ' ' + SM.gen + '세대 (5세대까지) · 초록 ' + pctTxt(SM.pop, 'g'),
          explain: '세대가 지날수록 <b>초록 비율</b>이 늘어 대부분이 초록이 돼요. 갈색은 눈에 띄어 계속 잡히니 점점 줄어요. 이렇게 환경에 유리한 형질이 집단에 <b>누적</b>되는 것이 자연선택의 결과예요.',
        },
        {
          title: '환경을 바꾸고 3세대 더', goal: '먼저 <b>초록 애벌레 비율이 어떻게 될지 예측</b>한 뒤 서식지를 <b>🍂 낙엽층</b>으로 바꾸고 <b>3세대</b> 더 진행하세요.',
          hint: '낙엽층에서는 갈색이 눈에 덜 띄어요. 그러면 초록은 어떻게 될까요? 예측을 고르면 낙엽층 버튼이 열려요.',
          setup() { ensure('gen', 'auto'); },
          check: () => !!GN.pred && SM.hab === 'leaf' && SM.gen - GN.switchGen >= 3 && !GN.anim, hold: 0.5,
          status: () => mark(!!GN.pred) + ' 예측 · ' + mark(SM.hab === 'leaf') + ' 낙엽층으로 바꾸기 · ' + mark(SM.hab === 'leaf' && SM.gen - GN.switchGen >= 3) + ' 3세대 진행(' + (SM.hab === 'leaf' ? Math.max(0, SM.gen - GN.switchGen) : 0) + '/3)',
          explain: '낙엽층에서는 <b>초록 애벌레가 눈에 띄어</b> 더 많이 잡히고 갈색이 더 많이 살아남아요. 같은 형질도 <b>환경이 바뀌면 유리했다가 불리</b>해져요. 선택의 방향은 환경이 정해요.',
        },
        {
          type: 'quiz', title: '후추나방 자료', goal: '후추나방에서 어두운 색 나방의 비율이 늘었다가 다시 줄어든 까닭은?',
          setup() { ensure('gen', 'moth'); },
          choices: ['나무 줄기 색이 바뀌어 유리한 형질이 달라졌고, 눈에 덜 띄는 색의 나방이 더 많이 살아남아 번식했기 때문이다', '어두운 나방 개체가 살면서 점점 더 어두워졌기 때문이다', '나방이 줄기 색에 맞추려고 노력해서 색을 바꿨기 때문이다', '새가 어두운 나방만 골라서 잡아먹었기 때문이다'],
          answer: 0,
          feedback: ['', '개체의 색은 평생 그대로예요. 집단 안의 비율이 달라졌어요.', '색을 바꾸려는 노력으로 유전되는 형질이 변하지는 않아요.', '새는 줄기에서 눈에 띄는 나방을 잡았어요. 줄기가 어두울 때는 밝은 나방이 눈에 띄었어요.'],
          explain: '변하는 것은 <b>개체</b>가 아니라 <b>집단의 형질 비율</b>이에요. 환경(나무 줄기 색)이 바뀌자 유리한 형질이 달라졌고, 유리한 형질을 가진 개체의 비율이 달라졌어요.',
        },
      ],
    },
    {
      title: '자연선택설: 진화가 일어나는 과정', short: '자연선택설', icon: '📜', phase: '설명',
      features: ['theory'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 변이가 있는 집단에서 환경에 유리한 형질의 비율이 늘어나는 것을 직접 확인했어요. 이 과정을 <b>다윈의 자연선택설</b>로 정리해요.</div>' +
        '<p>다윈의 <b>5단계</b>를 순서대로 놓으면 모의실험의 어느 장면과 같은지 연결돼요. 그리고 <b>라마르크의 용불용설</b>과 비교하고, 같은 원리가 <b>항생제 내성 세균</b>에서도 일어나는지 확인해 봐요.</p>',
      setup() { enterLevel(3); },
      recap: '변이가 있는 집단에서 환경에 적응한 개체가 더 많이 살아남아 번식하고, 유리한 형질이 여러 세대에 걸쳐 집단에 쌓이면 진화가 일어나요.',
      summary: '<ul><li><b>다윈의 자연선택설</b>: 과잉 생산 → 변이 → 생존 경쟁 → 자연선택(적자생존) → 유리한 형질이 유전되어 집단에 누적 → <b>진화</b>.</li><li>선택되는 것은 한 개체의 일생이 아니라 <b>집단 안 형질의 비율 변화</b>예요.</li><li><b>라마르크의 용불용설</b>(자주 쓰는 기관이 발달하고 그 형질이 유전)과 달리, 노력해서 얻은 형질은 유전되지 않아요.</li><li>항생제를 쓰면 내성 세균만 살아남아 번식해 <b>내성 세균의 비율이 늘어요</b> — 자연선택의 사례예요.</li></ul>',
      missions: [
        {
          title: '다윈의 5단계 순서 맞추기', goal: '카드 5장을 <b>자연선택이 일어나는 순서</b>대로 1~5단계 칸에 놓고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '먼저 많이 태어나고(과잉 생산), 개체마다 형질이 달라요(변이). 그다음 경쟁하고, 유리한 개체가 더 번식하며, 그 형질이 집단에 쌓여요.',
          manual: true, setup() { ensure('theory', 'order'); },
          check() {
            const un = tBoard.cards.filter((c) => !c.zone); if (un.length) return '아직 ' + un.length + '장이 남았어요. 5칸을 모두 채워요.';
            const bad = tBoard.cards.filter((c) => c.zone !== 'o' + c.n).sort((a, b) => a.n - b.n); if (bad.length) return (bad[0].n + 1) + '단계에 놓을 카드가 다른 칸에 있어요. 모의실험에서 일어난 순서를 떠올려 봐요.';
            return true;
          },
          explain: '<b>과잉 생산 → 변이 → 생존 경쟁 → 자연선택(적자생존) → 유전과 누적</b>. 모의실험의 번식·색 차이·포식·초록의 생존·비율 증가가 차례로 대응해요. 이 과정이 여러 세대 이어지면 집단의 형질이 달라지는 <b>진화</b>가 일어나요.',
        },
        {
          type: 'quiz', title: '기린의 목은 왜 길어졌을까?', goal: '기린의 목이 길어진 까닭을 <b>다윈의 자연선택설</b>로 설명한 것은?',
          setup() { ensure('theory', 'order'); },
          choices: ['목이 긴 변이를 가진 개체가 높은 곳의 먹이를 더 잘 먹어 더 많이 살아남아 번식했고, 이 형질이 여러 세대에 걸쳐 집단에 퍼졌다', '높은 곳의 먹이를 먹으려고 목을 계속 늘인 기린의 긴 목이 자손에게 전해졌다', '기린이 목이 길어지기를 바라자 환경이 기린에게 맞게 바뀌었다', '모든 기린은 처음에 목 길이가 같았는데 어느 날 한꺼번에 길어졌다'],
          answer: 0,
          feedback: ['', '이것은 라마르크의 용불용설(획득 형질이 유전된다는 생각)이에요. 노력으로 늘어난 목은 유전되지 않아요.', '환경은 생물의 바람에 맞춰 바뀌지 않아요. 환경에 유리한 개체가 선택돼요.', '진화는 한꺼번에가 아니라 변이를 가진 개체의 비율이 여러 세대에 걸쳐 변하며 일어나요.'],
          explain: '자연선택설에서는 <b>변이가 먼저 있고</b>, 환경에 유리한 변이를 가진 개체가 더 많이 번식해 그 형질이 집단에 퍼져요. 용불용설처럼 필요에 따라 몸이 변하는 것이 아니에요.',
        },
        {
          title: '항생제 내성 세균', goal: '<b>💊 항생제 처리</b>와 <b>🔄 세균 증식</b>을 <b>2번 반복</b>하고, 내성 세균이 <b>절반(50 %) 이상</b>이 되게 하세요.',
          hint: '항생제를 처리하면 보통 세균은 대부분 죽고 내성 세균은 살아남아요. 살아남은 세균이 증식하면 내성 세균의 비율은 어떻게 될까요?',
          setup() { ensure('theory', 'bact'); },
          check: () => BA.cycles >= 2 && BA.phase === 'ready' && baPct() >= 50, hold: 0.5,
          status: () => mark(BA.cycles >= 2) + ' 처리 → 증식 ' + BA.cycles + ' / 2번 · ' + mark(baPct() >= 50) + ' 내성 세균 ' + baPct() + ' %',
          explain: '처음에는 내성 세균이 아주 적었지만(<b>변이</b>), 항생제가 보통 세균을 없애면서 내성 세균이 더 많이 살아남아 번식했어요(<b>자연선택</b>). 항생제를 쓸수록 내성 세균의 비율이 늘어나요. 그래서 항생제는 꼭 필요할 때, 처방대로 써야 해요.',
        },
      ],
    },
  ];

  resetVar(); resetSim(); buildTheory(); resetBact();
  game = SciSim.game({
    simId: 'h1-natural-selection', mount: '#game', badge: '자연선택 탐험가', homeHref: '../../index.html#h1b',
    featureLabels: { var: '🔍 형질 비교 · 히스토그램 · 변이의 원인', sim: '🐦 포식자 모의실험 · 번식', gen: '📈 세대 그래프 · 서식지 · 후추나방', theory: '📜 다윈 5단계 · 항생제 내성 세균' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false, ctlT = 0;
  SciSim.loop((dt, t) => {
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    ctlT += dt; if (ctlT > 0.25) { ctlT = 0; updateCtl(); }
    if (MODE === 'var') stepVar(dt);
    else if (MODE === 'sim') stepSim(dt);
    else if (MODE === 'gen') { stepGen(dt); stepAutoRun(); stepMoth(dt); }
    else if (SUB === 'order') tBoard.update(dt); else stepBact(dt);
    if (SM.cf != null && SM.cf >= 1) SM.cfFrom = null;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eef6ea'; ctx.fillRect(0, 0, VW, VH);
    if (MODE === 'var') {
      const g = vrG();
      if (SUB === 'hist') for (let i = 0; i < 3; i++) { const tb = g.tab(i), on = VR.tab === i; ctx.fillStyle = on ? '#16a34a' : '#fff'; rr(tb.x, tb.y, tb.w, tb.h, 17).fill(); ctx.strokeStyle = on ? '#16a34a' : '#cfd8c7'; ctx.lineWidth = 2; rr(tb.x, tb.y, tb.w, tb.h, 17).stroke(); D.text(tb.x + tb.w / 2, tb.y + 22, TABS[i], { size: PHONE ? 12.5 : 14, weight: 800, color: on ? '#fff' : '#475569' }); }
      if (SUB === 'cause') { D.text(VW / 2, PHONE ? 30 : 34, '🧬 유전되는 변이는 어떻게 생길까?', { size: PHONE ? 15 : 18, weight: 800, color: '#14532d' }); drawCause(t); } else if (VR.tab === 2) drawHist(t); else drawTraitGrid(t);
    } else if (MODE === 'sim') drawSim(t);
    else if (MODE === 'gen') { if (SUB === 'auto') drawGen(t); else drawMoth(t); }
    else { if (SUB === 'order') drawTheory(t); else drawBact(t); }
    parts.draw(ctx);
    drawFlash(dt, PHONE ? VH - 74 : VH - 66);
    if (fade > 0.005) { ctx.fillStyle = 'rgba(238,246,234,' + fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); fade = RM ? 0 : SciSim.approach(fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    get game() { return game; }, get MODE() { return MODE; }, get SUB() { return SUB; }, VW, VH, SM, VR, GN, BA, COL, KEYS, POP, STAGES,
    setMode, enterLevel, updateCtl, startHunt, huntTap, endHunt, breedNow, retryHunt, genStep, runTo, setHab, treat, regrow, varTap, placeBf, mutateBase, shuffleGametes, aliveCounts, simF, autoStep, breed, pct, mothPct, mothDark,
    get tBoard() { return tBoard; },
    huntSome(n) { n = n || 12; const t = SM.inds.filter((d) => d.alive).sort((a, b) => CONSP[SM.hab][b.k] - CONSP[SM.hab][a.k]).slice(0, n); t.forEach((d) => huntTap({ x: d.x, y: d.y })); },
    solveTheory() { tBoard.cards.forEach((c) => tBoard.place(c, tBoard.zone('o' + c.n))); updateCtl(); },
  };
})();
