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
  function initStage(bg, tw, th, pw, ph, fs) {
    VW = PHONE ? pw : tw; VH = PHONE ? ph : th; FS = PHONE ? (fs || 1.25) : 1;
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


  /* ======================================================
     공통 도구: 해수 밀도, 보간, 패널, 그래프 틀
     ====================================================== */
  /* 해수의 밀도 ρ(T, S) kg/m3 : 표층 압력에서의 상태 방정식(UNESCO EOS-80). 수온↓·염분↑ → 밀도↑ (단조) */
  function rho(T, S) {
    const rw = 999.842594 + 6.793952e-2 * T - 9.095290e-3 * T * T + 1.001685e-4 * T * T * T - 1.120083e-6 * T * T * T * T + 6.536332e-9 * T * T * T * T * T;
    const A = 8.24493e-1 - 4.0899e-3 * T + 7.6438e-5 * T * T - 8.2467e-7 * T * T * T + 5.3875e-9 * T * T * T * T;
    const B = -5.72466e-3 + 1.0227e-4 * T - 1.6546e-6 * T * T;
    return rw + A * S + B * Math.pow(S, 1.5) + 4.8314e-4 * S * S;
  }
  const f0 = (x) => String(Math.round(x));
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
  const sg = (x) => (x < 0 ? '−' : '') + Math.abs(x);
  const mk = (x) => (x < 0 ? '−' : '') + f1(Math.abs(x)); // 부호가 음수일 때 −(진짜 빼기 기호)
  /* 단조 3차 보간 (Fritsch–Carlson): 값이 한 방향으로만 변하는 자료를 부드럽게 이어 줘요 */
  function monoFn(xs, ys) {
    const n = xs.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  const colorStops = (stops, t) => {
    t = clamp(t, 0, 1); const n = stops.length - 1, k = Math.min(n - 1, Math.floor(t * n)), u = t * n - k;
    return mixc(stops[k], stops[k + 1], u);
  };
  /* 흰 판 (그래프·장면 바탕) */
  function panel(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { ctx.fillStyle = o.fill || 'rgba(255,255,255,.94)'; rr(x, y, w, h, o.r || 14).fill(); }, { blur: o.blur == null ? 6 : o.blur, y: 2 });
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 2; rr(x, y, w, h, o.r || 14).stroke(); }
    if (o.title) D.text(x + 12, y + 21, o.title, { size: o.tsize || 14.5, weight: 800, color: o.tcolor || '#334155', align: 'left' });
  }
  /* '예시 자료' 꼬리표 */
  function dataTag(x, y, txt, align) {
    D.label(x, y, txt || '예시 자료', { bg: '#fff7e0', color: '#a16207', size: 12.5, pad: 7, border: '#f2d38a', align: align || 'right' });
  }
  /* 그래프 틀: R={x,y,w,h} 안쪽 여백으로 그림 상자를 만들고 눈금을 그려요. 반환 {gx, gy, x0, x1, y0, y1} */
  function plotFrame(R, o) {
    const x0 = R.x + (o.l == null ? 46 : o.l), x1 = R.x + R.w - (o.r == null ? 16 : o.r), y0 = R.y + (o.t == null ? 34 : o.t), y1 = R.y + R.h - (o.b == null ? 34 : o.b);
    const fx = o.fx || ((v) => v), fy = o.fy || ((v) => v);
    const ax0 = fx(o.xmin), ax1 = fx(o.xmax), ay0 = fy(o.ymin), ay1 = fy(o.ymax);
    const gx = (v) => x0 + (x1 - x0) * clamp((fx(v) - ax0) / (ax1 - ax0), 0, 1);
    const gy = (v) => (o.yDown ? y0 + (y1 - y0) * clamp((fy(v) - ay0) / (ay1 - ay0), 0, 1) : y1 - (y1 - y0) * clamp((fy(v) - ay0) / (ay1 - ay0), 0, 1));
    if (o.noDraw) return { gx, gy, x0, x1, y0, y1 };
    ctx.save();
    ctx.fillStyle = o.bg || '#f8fbff'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#e1e8f0';
    (o.xticks || []).forEach((v) => { const xx = gx(v); ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx, y1); ctx.stroke(); });
    (o.yticks || []).forEach((v) => { const yy = gy(v); ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x1, yy); ctx.stroke(); });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.8; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
    const ts = o.size || 12.5;
    (o.xticks || []).forEach((v, i) => D.text(gx(v), (o.xTop ? y0 - 7 : y1 + 15 * FS * 0.92), (o.xfmt ? o.xfmt(v, i) : String(v)), { size: ts, weight: 700, color: '#64748b' }));
    (o.yticks || []).forEach((v, i) => D.text(x0 - 6, gy(v) + 4.5, (o.yfmt ? o.yfmt(v, i) : String(v)), { size: ts, weight: 700, color: '#64748b', align: 'right' }));
    if (o.xlabel) D.text((x0 + x1) / 2, R.y + R.h - 4, o.xlabel, { size: 13, weight: 800, color: '#475569' });
    if (o.ylabel) { ctx.save(); ctx.translate(R.x + 12, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); D.text(0, 0, o.ylabel, { size: 13, weight: 800, color: '#475569' }); ctx.restore(); }
    return { gx, gy, x0, x1, y0, y1 };
  }
  /* 선 그리기 */
  function polyline(pts, color, w, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  const clickable = (el, fn) => el.addEventListener('click', () => { Sound.click(); fn(el); });
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt ? fmt(v) : v; }
  /* 슬라이더 연결 */
  function bindSlider(input, out, fmt, cb) {
    const upd = () => { input.style.setProperty('--pct', ((input.value - input.min) / (input.max - input.min)) * 100 + '%'); if (out) out.textContent = fmt(+input.value); };
    input.addEventListener('input', () => { upd(); cb && cb(+input.value); });
    upd();
  }

  /* 체크 칸 (✅ 대신 그림으로) */
  function chkBox(x, y, ok, s) {
    s = s || 15; const top = y - s + 3;
    ctx.save(); ctx.fillStyle = ok ? '#16a34a' : '#fff'; ctx.strokeStyle = ok ? '#16a34a' : '#94a3b8'; ctx.lineWidth = 2;
    rr(x, top, s, s, 4).fill(); rr(x, top, s, s, 4).stroke();
    if (ok) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x + s * 0.24, top + s * 0.54); ctx.lineTo(x + s * 0.43, top + s * 0.74); ctx.lineTo(x + s * 0.78, top + s * 0.28); ctx.stroke(); }
    ctx.restore();
  }


  /* =========================================================
     지구과학 Ⅰ. 대기와 해양의 상호작용 - 심층 순환과 기후
     [12지구01-02] 심층 순환의 발생 원리와 분포를 알고, 표층 순환 및 기후변화의 관련성을 추론
     ① 실험: 침강 실험(수온·염분 → 밀도 차)   ② 모형: 단순화한 남북 단면에서 수괴 배치
     ③ 탐구: 표층 순환과 심층 순환을 잇는 순환 고리   ④ 추론: 담수 유입 → 침강 약화 → 기후
     단순화한 남북 단면만 쓰고 실제 해저 지형·대륙 분포의 영향과 역학적 원리는 다루지 않아요.
     ========================================================= */
  initStage('#e6f1fa', 800, 560, 600, 840, 1.25);
  const sq = Math.sqrt;
  const SRC_LINE = '실제 자료는 기상청·국립해양조사원·ARGO 누리집에서 확인해 볼 수 있어요.';
  const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
  const tx = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const RHO = (T, S) => rho(T, S);

  /* ---------- 자료 (모두 예시) ---------- */
  const TA = 20, SA = 34.5;                           // 수조 속 물(바다 표층의 예)
  const MASSES = {
    aabw: { id: 'aabw', name: '남극 저층수', T: -0.5, S: 34.7, col: '#7c3aed', siteLat: -70, siteTxt: '남극 대륙 주변', band: 'bot' },
    nadw: { id: 'nadw', name: '북대서양 심층수', T: 3, S: 34.9, col: '#2563eb', siteLat: 60, siteTxt: '북위 60° 부근(그린란드 부근)', band: 'deep' },
    aaiw: { id: 'aaiw', name: '남극 중층수', T: 4, S: 34.4, col: '#16a34a', siteLat: -50, siteTxt: '남위 50° 부근', band: 'mid' },
  };
  const MKEYS = ['nadw', 'aabw', 'aaiw'];
  MKEYS.forEach((k) => { MASSES[k].rho = RHO(MASSES[k].T, MASSES[k].S); });
  const BANDS = { mid: { c: 1000, d0: 600, d1: 1500, label: '중층 (약 1000 m)' }, deep: { c: 3000, d0: 2000, d1: 4000, label: '심층 (2000~4000 m)' }, bot: { c: 4600, d0: 4200, d1: 5000, label: '저층 (4000 m 아래)' } };
  const RHO_DEEP = r2(MASSES.nadw.rho);
  const S_BASE = 35.2, T_SURF = 3;                    // 북대서양 표층수(겨울에 3 °C까지 냉각): 담수 유입이 없을 때 염분
  const SAL_PER_F = 0.1;                              // 담수 유입량 1단위당 표층 염분 감소(psu)
  const F_MAX = 10, T_EU_MAX = 6;                     // 담수 유입량 범위, 침강이 멈출 때 북유럽 기온 하강(예시 경향, °C)
  const salF = (F) => r2(S_BASE - SAL_PER_F * F);
  const rhoF = (F) => RHO(T_SURF, salF(F));
  const RHO_BASE = r2(RHO(T_SURF, S_BASE));
  const strengthF = (F) => clamp((r2(rhoF(F)) - RHO_DEEP) / (RHO_BASE - RHO_DEEP), 0, 1);
  const dTeuF = (F) => -T_EU_MAX * (1 - strengthF(F));
  const LOOP_LEG = [['표층 난류(북상)', 0.05], ['침강', 0.02], ['심층 이동(남하)', 0.60], ['느린 상승', 0.33]];   // 한 바퀴 1000년 중 각 구간의 몫(예시)
  const LOOP_YEARS = 1000;
  const CHAIN = ['그린란드 빙하 담수 유입 증가', '북대서양 표층 염분 감소', '표층수 밀도 감소', '침강 약화', '표층 난류의 북상 약화', '북유럽이 냉각될 수 있음'];

  /* ---------- 화면 배치 ---------- */
  const LY = PHONE ? {
    tank: { x: 12, y: 12, w: 576, h: 386 }, bars: { x: 12, y: 408, w: 576, h: 224 },
    sect: { x: 12, y: 12, w: 576, h: 410 }, tray: { x: 12, y: 432, w: 576, h: 396 },
    loop: { x: 12, y: 12, w: 576, h: 400 }, loopTab: { x: 12, y: 422, w: 576, h: 406 },
    scene: { x: 12, y: 12, w: 576, h: 300 }, cbars: { x: 12, y: 322, w: 576, h: 290 }, chart: { x: 12, y: 622, w: 576, h: 206 },
    chain: { x: 12, y: 12, w: 576, h: 816 },
  } : {
    tank: { x: 12, y: 10, w: 776, h: 330 }, bars: { x: 12, y: 350, w: 776, h: 200 },
    sect: { x: 12, y: 10, w: 552, h: 540 }, tray: { x: 576, y: 10, w: 212, h: 540 },
    loop: { x: 12, y: 10, w: 776, h: 336 }, loopTab: { x: 12, y: 356, w: 776, h: 194 },
    scene: { x: 12, y: 10, w: 500, h: 340 }, cbars: { x: 524, y: 10, w: 264, h: 340 }, chart: { x: 12, y: 360, w: 776, h: 190 },
    chain: { x: 12, y: 10, w: 776, h: 540 },
  };

  /* ---------- 상태 ---------- */
  const S = {
    view: 'tank', clock: 0, fade: 0,
    // 1단계 침강 실험
    tp: { T: 20, S: 34.5, pour: false, condA: 0, condB: 0, front: 0, frontTop: 0 },
    // 2단계 단면 모형
    cards: null, drag: null, selCard: null, spread: 0, spreadOn: false,
    // 3단계 순환 고리
    loopT: 0, loopSpd: 0, playing: true, loopPick: {}, marks: 0,
    // 4단계 기후
    F: 0, Fd: 0, sDisp: 1, rec: 0, chainOK: false,
  };
  let game = null;


  /* =========================================================
     1단계: 침강 실험 (한쪽 끝을 냉각하고 짠물을 부어요)
     ========================================================= */
  function tkG() {
    const R = LY.tank, x = R.x + (PHONE ? 62 : 84), y = R.y + (PHONE ? 112 : 96), w = R.w - (PHONE ? 78 : 112), h = PHONE ? 200 : 170;
    return { R, x, y, w, h, ix: x + 5, iy: y + 14, iw: w - 10, ih: h - 19, layerH: (h - 19) * 0.3 };
  }
  const tpRho = () => ({ a: r1(RHO(TA, SA)), p: r1(RHO(S.tp.T, S.tp.S)) });
  const tpDelta = () => { const r = tpRho(); return r1(r.p - r.a); };
  const DY = [];                                  // 푸른 잉크 입자
  const DYMAX = PHONE ? 170 : 240;
  function tpReset() {
    DY.length = 0; const t = S.tp; t.pour = false; t.condA = 0; t.condB = 0; t.front = 0; t.frontTop = 0;
  }
  function tpUpdate(dt) {
    const g = tkG(), t = S.tp, d = tpDelta(), ad = sq(Math.abs(d));
    const px = g.ix + 26, py = g.iy + 6;
    if (t.pour) {
      t.acc = (t.acc || 0) + dt * 16;
      while (t.acc >= 1) {
        t.acc -= 1;
        DY.push({ x: px + rnd(-8, 8), y: py + rnd(-2, 6), o: Math.random(), dir: d > 0 ? 1 : d < 0 ? -1 : 0, ph: 0, jx: rnd(-1, 1), age: 0 });
        if (DY.length > DYMAX) DY.shift();
      }
    }
    let front = 0, frontTop = 0;
    DY.forEach((q) => {
      q.age += dt;
      if (q.dir > 0) {                                       // 무거운 물: 가라앉아 바닥을 따라 흘러요
        const by = g.iy + g.ih - 5 - q.o * g.layerH;
        if (q.ph === 0) { q.y += (70 + 30 * ad) * dt; q.x += rnd(-8, 8) * dt; if (q.y >= by) { q.y = by; q.ph = 1; } }
        else { q.x += (34 + 30 * ad + q.o * 10) * dt; q.y += (by - q.y) * Math.min(1, dt * 6) + rnd(-3, 3) * dt; front = Math.max(front, q.x); }
      } else if (q.dir < 0) {                                // 가벼운 물: 위로 떠올라 표면을 따라 퍼져요
        const ty = g.iy + 6 + q.o * g.layerH * 0.45;
        if (q.ph === 0) { q.y -= (46 + 24 * ad) * dt; q.x += rnd(-8, 8) * dt; if (q.y <= ty) { q.y = ty; q.ph = 1; } }
        else { q.x += (9 + 8 * ad) * dt; q.y += (ty - q.y) * Math.min(1, dt * 6) + rnd(-3, 3) * dt; frontTop = Math.max(frontTop, q.x); }
      } else {                                               // 밀도가 같으면 가라앉지도 뜨지도 않고 제자리에서 퍼져요
        q.x += rnd(-14, 14) * dt; q.y += rnd(-14, 14) * dt;
        q.x = clamp(q.x, px - 50, px + 50); q.y = clamp(q.y, py - 4, py + 60);
      }
      q.x = clamp(q.x, g.ix + 3, g.ix + g.iw - 4 - q.o * 28); q.y = clamp(q.y, g.iy + 3, g.iy + g.ih - 3);
    });
    t.front = approach(t.front, front, dt, 5); t.frontTop = approach(t.frontTop, frontTop, dt, 5);
    // 조건을 얼마나 오래 유지했는지 (실행형 미션 판정용)
    const dense = t.pour && t.T < TA && t.S > SA && d >= 2, light = t.pour && d <= -0.5;
    t.condA = dense ? t.condA + dt : Math.max(0, t.condA - dt * 2); t.condB = light ? t.condB + dt : Math.max(0, t.condB - dt * 2);
  }
  const tpDenseOK = () => S.tp.condA >= 2.2;
  const tpLightOK = () => S.tp.condB >= 2.2;

  function drawTank(t, dt) {
    const g = tkG(), R = g.R, tp = S.tp, d = tpDelta(), rd = tpRho();
    panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '수조 실험: 한쪽 끝을 냉각하고 짠물을 부어요', 14.5, '#334155', 'left', 800);
    D.label(R.x + R.w - 12, R.y + (PHONE ? 90 : 20), '수조 속 물 ' + TA + ' °C · ' + f1(SA) + ' psu', { bg: '#64748b', size: 12.5, pad: 8, align: 'right' });
    // 냉각판 (왼쪽 끝)
    const cold = clamp((TA - tp.T) / 20, 0, 1);
    ctx.save(); D.shadow(() => { ctx.fillStyle = mixc('#e2e8f0', '#38bdf8', cold); rr(R.x + 10, g.y + 6, g.x - R.x - 14, g.h - 8, 10).fill(); }, { blur: 5, y: 2 });
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(R.x + 10, g.y + 6, g.x - R.x - 14, g.h - 8, 10).stroke();
    for (let i = 0; i < 3; i++) { const ix = R.x + 22 + (i % 2) * 14, iy = g.y + 30 + i * 40; ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.55 * cold) + ')'; ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.5; rr(ix, iy, 20, 20, 5).fill(); rr(ix, iy, 20, 20, 5).stroke(); }
    ctx.restore();
    D.text(R.x + 10 + (g.x - R.x - 14) / 2, g.y + g.h + 22, '냉각', { size: 12.5, weight: 800, color: '#0369a1' });
    // 수조
    ctx.save(); rr(g.x + 2, g.y + 2, g.w - 4, g.h - 4, 8).clip();
    ctx.fillStyle = '#d8ecf8'; ctx.fillRect(g.x, g.iy, g.w, g.h);
    // 잉크가 퍼진 층
    if (tp.front > g.ix + 30) { const gr = ctx.createLinearGradient(0, g.iy + g.ih - g.layerH, 0, g.iy + g.ih); gr.addColorStop(0, 'rgba(59,130,246,.12)'); gr.addColorStop(1, 'rgba(37,99,235,.38)'); ctx.fillStyle = gr; rr(g.ix, g.iy + g.ih - g.layerH - 6, tp.front - g.ix + 10, g.layerH + 6, 10).fill(); }
    if (tp.frontTop > g.ix + 30) { const gr = ctx.createLinearGradient(0, g.iy, 0, g.iy + g.layerH * 0.6); gr.addColorStop(0, 'rgba(59,130,246,.35)'); gr.addColorStop(1, 'rgba(59,130,246,.05)'); ctx.fillStyle = gr; rr(g.ix, g.iy, tp.frontTop - g.ix + 10, g.layerH * 0.6, 10).fill(); }
    // 되돌아오는 흐름 (가벼운 물)
    const flow = tp.front > g.ix + 60 && d > 0 ? 1 : 0;
    if (flow) { ctx.globalAlpha = 0.8; D.arrow(g.ix + g.iw * 0.8, g.iy + 18, g.ix + g.iw * 0.45, g.iy + 18, { color: '#64748b', width: 3, dash: [6, 5] }); D.arrow(g.ix + g.iw * 0.3, g.iy + g.ih - g.layerH - 16, g.ix + g.iw * 0.7, g.iy + g.ih - g.layerH - 16, { color: '#64748b', width: 3, dash: [6, 5] }); ctx.globalAlpha = 1; }
    DY.forEach((q) => { ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, TAU); ctx.fill(); });
    ctx.restore();
    // 깔때기와 물줄기
    const fx = g.ix + 26, fy = R.y + 58;
    ctx.save(); ctx.fillStyle = '#cbd5e1'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx - 22, fy - 20); ctx.lineTo(fx + 22, fy - 20); ctx.lineTo(fx + 5, fy + 6); ctx.lineTo(fx - 5, fy + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    ctx.fillStyle = 'rgba(59,130,246,.85)'; ctx.beginPath(); ctx.moveTo(fx - 17, fy - 16); ctx.lineTo(fx + 17, fy - 16); ctx.lineTo(fx + 3, fy + 4); ctx.lineTo(fx - 3, fy + 4); ctx.closePath(); ctx.fill();
    const nsalt = Math.round((tp.S - 33) * 3);
    for (let i = 0; i < nsalt; i++) { ctx.fillStyle = '#fff'; const sx = fx - 14 + ((i * 17) % 28), sy = fy - 14 + ((i * 7) % 11); ctx.fillRect(sx, sy, 3, 3); }
    if (tp.pour) { ctx.strokeStyle = 'rgba(37,99,235,.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(fx, fy + 6); ctx.lineTo(fx, g.iy + 6); ctx.stroke(); }
    D.label(fx + (PHONE ? 34 : 78), R.y + (PHONE ? 52 : 44), '부은 물 ' + tp.T + ' °C · ' + f1(tp.S) + ' psu', { bg: '#2563eb', size: 12.5, pad: 8, align: 'left' });
    // 유리 수조
    ctx.save(); ctx.strokeStyle = 'rgba(71,96,130,.85)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h - 8); ctx.quadraticCurveTo(g.x, g.y + g.h, g.x + 8, g.y + g.h); ctx.lineTo(g.x + g.w - 8, g.y + g.h); ctx.quadraticCurveTo(g.x + g.w, g.y + g.h, g.x + g.w, g.y + g.h - 8); ctx.lineTo(g.x + g.w, g.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x + 9, g.y + 24); ctx.lineTo(g.x + 9, g.y + g.h - 18); ctx.stroke(); ctx.restore();
    D.text(g.x + 18, g.y + g.h + 22, '극 (찬 바다)', { size: 12.5, weight: 800, color: '#0369a1', align: 'left' });
    D.text(g.x + g.w - 8, g.y + g.h + 22, '적도 쪽', { size: 12.5, weight: 800, color: '#b45309', align: 'right' });
    const msg = !tp.pour ? '슬라이더를 정하고 💧 붓기 버튼을 눌러 보세요.' : d > 0 ? '부은 물이 더 무거워요 → 가라앉아 바닥을 따라 반대쪽으로 흘러요.' : d < 0 ? '부은 물이 더 가벼워요 → 가라앉지 못하고 위에 떠서 퍼져요.' : '밀도가 같아요 → 가라앉지도 뜨지도 않아요.';
    D.text(R.x + R.w / 2, R.y + R.h - 10, msg.replace('💧 ', ''), { size: 13.5, weight: 800, color: '#0369a1' });
    // 밀도 막대
    const B = LY.bars; panel(B.x, B.y, B.w, B.h);
    tx(B.x + 12, B.y + 22, '밀도 비교 (수온·염분으로 계산한 값)', 14.5, '#334155', 'left', 800);
    const lab0 = B.x + 16, bx0 = B.x + (PHONE ? 160 : 210), bx1 = B.x + B.w - (PHONE ? 100 : 120), lo = 1018, hi = 1031;
    const xv = (v) => bx0 + (bx1 - bx0) * clamp((v - lo) / (hi - lo), 0, 1);
    tp.bA = approach(tp.bA == null ? RHO(TA, SA) : tp.bA, RHO(TA, SA), dt, 8); tp.bP = approach(tp.bP == null ? RHO(TA, SA) : tp.bP, RHO(tp.T, tp.S), dt, 8);
    const rows = [[tp.bA, '#64748b', ['수조 속 물', TA + ' °C · ' + f1(SA) + ' psu'], rd.a], [tp.bP, '#2563eb', ['부은 물', tp.T + ' °C · ' + f1(tp.S) + ' psu'], rd.p]];
    const by = B.y + 52, bh = PHONE ? 38 : 34, gap = PHONE ? 54 : 52;
    [1018, 1022, 1026, 1030].forEach((v) => { ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xv(v), by - 8); ctx.lineTo(xv(v), by + gap + bh + 6); ctx.stroke(); D.text(xv(v), by + gap + bh + 22, String(v), { size: 12, weight: 700, color: '#64748b' }); });
    D.text((bx0 + bx1) / 2, by + gap + bh + 40, '밀도 (kg/m³) — 축은 1018에서 시작해요', { size: 12, weight: 700, color: '#64748b' });
    rows.forEach((r, i) => {
      const y = by + i * gap;
      ctx.fillStyle = r[1]; ctx.globalAlpha = 0.85; ctx.fillRect(bx0, y, Math.max(0, xv(r[0]) - bx0), bh); ctx.globalAlpha = 1;
      ctx.strokeStyle = r[1]; ctx.lineWidth = 2; ctx.strokeRect(bx0, y, Math.max(0, xv(r[0]) - bx0), bh);
      D.text(lab0, y + bh * 0.4, r[2][0], { size: 12.5, weight: 800, color: '#334155', align: 'left' }); D.text(lab0, y + bh * 0.88, r[2][1], { size: 12, weight: 700, color: '#475569', align: 'left' });
      D.text(xv(r[0]) + 8, y + bh * 0.66, f1(r[3]), { size: 16, weight: 800, color: '#0f172a', align: 'left' });
    });
    D.label(B.x + B.w - 14, B.y + 20, d > 0 ? '부은 물이 ' + f1(d) + ' 더 무거워요' : d < 0 ? '부은 물이 ' + f1(-d) + ' 더 가벼워요' : '밀도가 같아요', { bg: d > 0 ? '#2563eb' : d < 0 ? '#b45309' : '#64748b', size: 13, pad: 9, align: 'right' });
  }


  /* =========================================================
     2단계: 단순화한 남북 단면 (위도 −90°~+90°, 깊이 0~5000 m, 대륙 없음)
     ========================================================= */
  const SEO = { l: PHONE ? 62 : 52, r: 14, t: 78, b: 40, xmin: -90, xmax: 90, ymin: 0, ymax: 5000, yDown: true, xticks: [-90, -60, -30, 0, 30, 60, 90], yticks: [0, 1000, 2000, 3000, 4000, 5000], xfmt: (v) => (v === 0 ? '0°' : (v < 0 ? '남 ' : '북 ') + Math.abs(v) + '°'), size: 12, xlabel: '위도 (남극 → 북극)', ylabel: '깊이 (m)' };
  const SEP = plotFrame(LY.sect, Object.assign({ noDraw: true }, SEO));
  const latOfX = (x) => -90 + ((x - SEP.x0) / (SEP.x1 - SEP.x0)) * 180;
  const bandKeys = ['mid', 'deep', 'bot'];
  const nearestBand = (y) => { let best = 'mid', bd = 1e9; bandKeys.forEach((k) => { const d = Math.abs(SEP.gy(BANDS[k].c) - y); if (d < bd) { bd = d; best = k; } }); return best; };
  function secTray(i) {
    const R = LY.tray;
    if (PHONE) return { x: R.x + 12 + 88 + i * 184, y: R.y + 66, w: 176, h: 62 };
    return { x: R.x + R.w / 2, y: R.y + 60 + 31 + i * 70, w: 196, h: 62 };
  }
  function initSect() {
    S.cards = MKEYS.map((k, i) => { const p = secTray(i); return { id: k, x: p.x, y: p.y, hx: p.x, hy: p.y, w: p.w, h: p.h, placed: false, band: null, shake: 0, my: 0, ox: 0, oy: 0 }; });
    S.drag = null; S.selCard = null; S.spread = 0; S.spreadOn = false;
    SciSim.tween(S, { spread: 0 }, { duration: 0.0001 });
  }
  initSect();
  const secCardAt = (p) => { for (let i = S.cards.length - 1; i >= 0; i--) { const c = S.cards[i]; if (!c.placed && Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; } return null; };
  const secPlaced = () => S.cards.filter((c) => c.placed).length;
  const secCorrect = () => S.cards.every((c) => c.placed && c.band === MASSES[c.id].band);
  function secDrop(c, p) {
    const m = MASSES[c.id], lat = latOfX(p.x), inside = p.x >= SEP.x0 - 10 && p.x <= SEP.x1 + 10 && p.y >= SEP.y0 - 10 && p.y <= SEP.y1 + 10;
    if (!inside) { c.shake = 0.4; Sound.fail(); SciSim.tween(c, { x: c.hx, y: c.hy }, { duration: 0.35 }); say('카드를 단면 안쪽(침강 위치와 깊이)에 놓아요.', true, 2.2); return; }
    if (Math.abs(lat - m.siteLat) > 10) {
      c.shake = 0.4; Sound.fail(); SciSim.tween(c, { x: c.hx, y: c.hy }, { duration: 0.35 });
      say(m.name + '은(는) 이 위도에서 만들어지지 않아요. 이름과 침강 위치 표시(고리)를 단서로 찾아봐요.', true, 3); return;
    }
    const band = nearestBand(p.y);
    S.cards.forEach((o) => { if (o !== c && o.placed && o.band === band) { o.placed = false; o.band = null; SciSim.tween(o, { x: o.hx, y: o.hy }, { duration: 0.35 }); } });
    c.placed = true; c.band = band; c.my = SEP.y0; c.x = SEP.gx(m.siteLat); c.y = SEP.gy(BANDS[band].c);
    SciSim.tween(c, { my: SEP.gy(BANDS[band].c) }, { duration: 1.3, ease: 'outBounce' });
    Sound.success(); parts.burst(SEP.gx(m.siteLat), SEP.y0 + 4, { count: 12, speed: 90, size: 3, life: 0.7, colors: [m.col, '#fff'] });
  }
  function drawSect(t, dt) {
    const R = LY.sect; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '단순화한 남북 바다 단면 (대륙 없음)', 14.5, '#334155', 'left', 800);
    // 바다 배경
    const P0 = SEP;
    const sea = ctx.createLinearGradient(0, P0.y0, 0, P0.y1); sea.addColorStop(0, '#8fd8f5'); sea.addColorStop(0.35, '#3b9fd6'); sea.addColorStop(1, '#17386e');
    ctx.fillStyle = sea; ctx.fillRect(P0.x0, P0.y0, P0.x1 - P0.x0, P0.y1 - P0.y0);
    const P = plotFrame(R, Object.assign({ bg: 'rgba(255,255,255,0)' }, SEO));
    // 깊이 띠 (놓을 위치)
    bandKeys.forEach((k) => { const b = BANDS[k]; ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fillRect(P.x0, P.gy(b.d0), P.x1 - P.x0, P.gy(b.d1) - P.gy(b.d0)); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.strokeRect(P.x0 + 1, P.gy(b.d0), P.x1 - P.x0 - 2, P.gy(b.d1) - P.gy(b.d0)); ctx.restore(); D.text(P.x0 + 8, P.gy(b.d0) + 16, b.label, { size: 12.5, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(10,40,80,.55)', strokeWidth: 3 }); });
    // 극 (얼음)
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(P.x0, P.y0 - 5, (P.x1 - P.x0) * 0.04, 7); ctx.fillRect(P.x1 - (P.x1 - P.x0) * 0.04, P.y0 - 5, (P.x1 - P.x0) * 0.04, 7);
    // 침강 위치 고리
    MKEYS.forEach((k) => {
      const m = MASSES[k], x = P.gx(m.siteLat), c = S.cards.find((q) => q.id === k);
      if (!c.placed) D.ring(x, P.y0 + 2, 10, t + m.siteLat * 0.01, { color: '#fde047', speed: 0.9, width: 2.5 });
      D.label(x, P.y0 - (k === 'aaiw' ? 44 : 20), (m.siteLat < 0 ? '남위 ' : '북위 ') + Math.abs(m.siteLat) + '°', { bg: 'rgba(15,40,80,.8)', size: 12, pad: 6 }); if (k === 'aaiw') { ctx.strokeStyle = 'rgba(15,40,80,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, P.y0 - 34); ctx.lineTo(x, P.y0 - 4); ctx.stroke(); }
    });
    D.text(P.x1 - 6, P.y0 + 16, '노란 고리 = 침강 위치', { size: 12, weight: 800, color: '#fef08a', align: 'right', stroke: 'rgba(10,40,80,.6)', strokeWidth: 3 });
    // 퍼지는 층
    if (S.spread > 0.001) {
      const sp = smooth(S.spread);
      [['aabw', -70, 40], ['aaiw', -50, 30], ['nadw', 60, -55]].forEach(([k, a, b]) => {
        const m = MASSES[k], c = S.cards.find((q) => q.id === k), yc = P.gy(BANDS[m.band].c), x0 = P.gx(a), x1 = P.gx(a + (b - a) * sp), hh = PHONE ? 26 : 22;
        ctx.save(); ctx.beginPath(); ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.clip();
        const gr = ctx.createLinearGradient(0, yc - hh, 0, yc + hh); gr.addColorStop(0, rgba(m.col, 0.15)); gr.addColorStop(0.5, rgba(m.col, 0.65)); gr.addColorStop(1, rgba(m.col, 0.15)); ctx.fillStyle = gr;
        ctx.beginPath(); ctx.rect(Math.min(x0, x1), yc - hh, Math.abs(x1 - x0), hh * 2); ctx.fill();
        const n = Math.max(1, Math.floor(Math.abs(x1 - x0) / 34)), dir = b > a ? 1 : -1;
        for (let i = 0; i < n; i++) { const cx = x0 + dir * (((i * 34 + t * 24) % Math.max(34, Math.abs(x1 - x0)))); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - dir * 5, yc - 6); ctx.lineTo(cx + dir * 3, yc); ctx.lineTo(cx - dir * 5, yc + 6); ctx.stroke(); }
        ctx.restore();
      });
    }
    // 놓인 수괴 (구슬)
    S.cards.forEach((c) => {
      if (!c.placed) return; const m = MASSES[c.id], x = P.gx(m.siteLat);
      if (c.my < P.gy(BANDS[c.band].c) - 2 && !RM) { ctx.strokeStyle = rgba(m.col, 0.5); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, P.y0); ctx.lineTo(x, c.my); ctx.stroke(); }
      D.sphere(x, c.my, 13, m.col, { outline: '#fff', outlineWidth: 2.5, shadow: true });
      D.label(x + (m.siteLat > 0 ? -18 : 18), c.my, m.name, { bg: 'rgba(255,255,255,.92)', color: '#1e293b', size: 12, pad: 7, align: m.siteLat > 0 ? 'right' : 'left' });
    });
    // 보관함
    const T = LY.tray; panel(T.x, T.y, T.w, T.h);
    tx(T.x + 12, T.y + 22, '수괴 카드', 14.5, '#334155', 'left', 800);
    tx(T.x + 12, T.y + 42, '단면에 끌어서 놓아요', 12.5, '#64748b');
    S.cards.forEach((c) => { if (S.drag !== c) drawSecCard(c); });
    if (S.drag) drawSecCard(S.drag);
    // 밀도 막대
    const by0 = PHONE ? T.y + 150 : T.y + 290, bw = T.w - 24, lo = 1027, hi = 1028.1, bx0 = T.x + 12, bx1 = T.x + T.w - 56;
    const xv = (v) => bx0 + (bx1 - bx0) * clamp((v - lo) / (hi - lo), 0, 1);
    tx(T.x + 12, by0, '밀도 비교 (kg/m³, T-S도의 값)', 13.5, '#334155', 'left', 800);
    const order = MKEYS.slice().sort((a, b) => MASSES[b].rho - MASSES[a].rho), bh = PHONE ? 30 : 26;
    order.forEach((k, i) => { const m = MASSES[k], y = by0 + 24 + i * (bh + 22); D.text(bx0, y - 5, m.name, { size: 12, weight: 800, color: '#334155', align: 'left' }); ctx.fillStyle = m.col; ctx.globalAlpha = 0.85; ctx.fillRect(bx0, y, Math.max(2, xv(m.rho) - bx0), bh); ctx.globalAlpha = 1; D.text(xv(m.rho) + 6, y + bh * 0.68, f1(m.rho), { size: 13, weight: 800, color: '#0f172a', align: 'left' }); });
    const ay = by0 + 24 + 3 * (bh + 22) - 10;
    [1027, 1027.5, 1028].forEach((v) => { ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xv(v), by0 + 6); ctx.lineTo(xv(v), ay - 8); ctx.stroke(); D.text(xv(v), ay + 6, String(v), { size: 11.5, weight: 700, color: '#64748b' }); });
    D.text((bx0 + bx1) / 2, ay + 22, '축은 1027에서 시작해요', { size: 11.5, weight: 700, color: '#64748b' });
    dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
  }
  function drawSecCard(c) {
    const m = MASSES[c.id], dragging = S.drag === c, sel = S.selCard === c, sh = c.shake > 0 ? Math.sin(c.shake * 50) * 5 : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y - (dragging ? 4 : 0));
    if (c.placed) { ctx.restore(); return; }
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).fill(); }, { blur: dragging ? 11 : 3, y: dragging ? 5 : 2 });
    ctx.fillStyle = m.col; rr(-c.w / 2, -c.h / 2, 8, c.h, 4).fill();
    ctx.strokeStyle = sel ? '#f59e0b' : '#cfd8e6'; ctx.lineWidth = sel ? 3.5 : 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).stroke();
    D.text(4, -c.h * 0.08, m.name, { size: 14.5, weight: 800, color: '#1e293b' });
    D.text(4, c.h * 0.3, (m.T < 0 ? '−' : '') + Math.abs(m.T) + ' °C · ' + f1(m.S) + ' psu', { size: 12.5, weight: 700, color: '#475569' });
    ctx.restore();
  }


  /* =========================================================
     3단계: 표층 순환 + 심층 순환 = 하나의 순환 고리(해양 컨베이어 벨트)
     ========================================================= */
  const LPO = { l: PHONE ? 62 : 52, r: 14, t: 44, b: 40, xmin: -90, xmax: 90, ymin: 0, ymax: 4000, yDown: true, xticks: [-90, -60, -30, 0, 30, 60, 90], yticks: [0, 1000, 2000, 3000, 4000], xfmt: SEO.xfmt, size: 12, xlabel: '위도 (남극 → 북극)', ylabel: '깊이 (m)' };
  const LPP = plotFrame(LY.loop, Object.assign({ noDraw: true }, LPO));
  const LC = [[-55, 150], [60, 150], [60, 3000], [-55, 3000]];          // 고리의 네 모서리 (위도, 깊이)
  const LEGCOL = ['#ef4444', '#7c3aed', '#2563eb', '#0ea5e9'];
  const legStart = []; (function () { let a = 0; LOOP_LEG.forEach((l) => { legStart.push(a); a += l[1]; }); })();
  function loopPos(u) {                          // u: 0~1 (한 바퀴), 반환 [x, y, leg]
    u = ((u % 1) + 1) % 1;
    let i = 3; for (let k = 0; k < 4; k++) if (u < legStart[k] + LOOP_LEG[k][1]) { i = k; break; }
    const f = (u - legStart[i]) / LOOP_LEG[i][1], a = LC[i], b = LC[(i + 1) % 4];
    return [LPP.gx(a[0] + (b[0] - a[0]) * f), LPP.gy(a[1] + (b[1] - a[1]) * f), i];
  }
  const legMid = (i) => { const a = LC[i], b = LC[(i + 1) % 4]; return [LPP.gx((a[0] + b[0]) / 2), LPP.gy((a[1] + b[1]) / 2)]; };
  const LOOPRATE = () => Math.pow(10, S.loopSpd);                   // 년/초
  const lapsDone = () => Math.floor(S.loopT / LOOP_YEARS);
  function drawLoop(t, dt) {
    const R = LY.loop; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '표층 순환과 심층 순환이 이어진 고리 (단순화한 단면)', 14.5, '#334155', 'left', 800); dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    const P0 = LPP, sea = ctx.createLinearGradient(0, P0.y0, 0, P0.y1); sea.addColorStop(0, '#9bdcf6'); sea.addColorStop(0.4, '#4aa6da'); sea.addColorStop(1, '#1e3f78');
    ctx.fillStyle = sea; ctx.fillRect(P0.x0, P0.y0, P0.x1 - P0.x0, P0.y1 - P0.y0);
    const P = plotFrame(R, Object.assign({ bg: 'rgba(255,255,255,0)' }, LPO));
    // 고리 길
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) { const a = LC[k], b = LC[(k + 1) % 4]; ctx.strokeStyle = rgba(LEGCOL[k], 0.35); ctx.lineWidth = PHONE ? 20 : 18; ctx.beginPath(); ctx.moveTo(P.gx(a[0]), P.gy(a[1])); ctx.lineTo(P.gx(b[0]), P.gy(b[1])); ctx.stroke(); }
    ctx.restore();
    // 방향 화살표 (구간 가운데)
    for (let k = 0; k < 4; k++) { const a = LC[k], b = LC[(k + 1) % 4], mx = (P.gx(a[0]) + P.gx(b[0])) / 2, my = (P.gy(a[1]) + P.gy(b[1])) / 2, dx = P.gx(b[0]) - P.gx(a[0]), dy = P.gy(b[1]) - P.gy(a[1]), L = Math.hypot(dx, dy); D.arrow(mx - dx / L * 14, my - dy / L * 14, mx + dx / L * 14, my + dy / L * 14, { color: '#fff', width: 3.5, head: 11 }); }
    // 입자들 (표층은 붉은색, 심층은 푸른색)
    const N = PHONE ? 40 : 56, base = S.loopT / LOOP_YEARS;
    for (let i = 0; i < N; i++) { const q = loopPos(base + i / N); D.sphere(q[0], q[1], 3.4, LEGCOL[q[2]], { gloss: false, outline: 'rgba(255,255,255,.8)', outlineWidth: 1 }); }
    // 대표 입자와 꼬리
    const trail = []; for (let k = 22; k >= 0; k--) { const q = loopPos(base - k * 0.0025); trail.push(q); }
    for (let k = 1; k < trail.length; k++) { if (Math.hypot(trail[k][0] - trail[k - 1][0], trail[k][1] - trail[k - 1][1]) > 80) continue; ctx.strokeStyle = rgba(LEGCOL[trail[k][2]], 0.25 + 0.7 * k / trail.length); ctx.lineWidth = 2 + 5 * k / trail.length; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(trail[k - 1][0], trail[k - 1][1]); ctx.lineTo(trail[k][0], trail[k][1]); ctx.stroke(); }
    const q0 = loopPos(base); D.sphere(q0[0], q0[1], 9, '#fde047', { outline: '#fff', outlineWidth: 2.5, shadow: true });
    // 번호 표시와 고른 이름
    for (let k = 0; k < 4; k++) {
      const m = legMid(k), off = k === 0 ? [0, 24] : k === 1 ? [26, 0] : k === 2 ? [0, 24] : [-26, 0];
      D.sphere(m[0] + off[0], m[1] + off[1], 12, '#0f172a', { gloss: false, outline: '#fff', outlineWidth: 2, text: String(k + 1), textScale: 1.0 });
      const pk = S.loopPick[k];
      if (pk) D.label(m[0] + off[0] + (k === 1 ? 18 : k === 3 ? -18 : 0), m[1] + off[1] + (k === 0 ? 22 : k === 2 ? 22 : 0), pk, { bg: pk === LOOP_LEG[k][0] ? '#15803d' : '#475569', size: 12, pad: 7, align: k === 1 ? 'left' : k === 3 ? 'right' : 'center' });
    }
    // 위쪽 상태 표시
    D.label(P.gx(-48), P.gy(1250), '경과 시간 ' + comma(S.loopT) + '년', { bg: '#0f172a', size: 14, pad: 10, align: 'left' });
    D.label(P.gx(-48), P.gy(1250) + (PHONE ? 34 : 32), '한 바퀴 ' + lapsDone() + '번 (한 바퀴 약 ' + comma(LOOP_YEARS) + '년)', { bg: 'rgba(15,23,42,.7)', size: 12.5, pad: 8, align: 'left' });
    D.label(P.gx(54), P.gy(2150), '지금 ' + (LOOPRATE() < 10 ? f1(LOOPRATE()) : f0(LOOPRATE())) + '년/초', { bg: '#b45309', size: 13, pad: 9, align: 'right' });
    // 아래 칸: 구간별 시간 막대 + 원인 비교표
    const T = LY.loopTab; panel(T.x, T.y, T.w, T.h);
    tx(T.x + 12, T.y + 22, '구간별로 걸리는 시간 (예시, 한 바퀴 1000년을 100%로)', 13.5, '#334155', 'left', 800);
    const bx = T.x + 12, bw = T.w - 24, by = T.y + 34, bh = PHONE ? 30 : 26; let acc = 0;
    LOOP_LEG.forEach((l, i) => {
      const w = bw * l[1]; ctx.fillStyle = LEGCOL[i]; ctx.globalAlpha = 0.9; ctx.fillRect(bx + acc, by, w, bh); ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(bx + acc, by, w, bh);
      if (w > 62) D.text(bx + acc + w / 2, by + bh * 0.68, ['①', '②', '③', '④'][i] + ' ' + Math.round(l[1] * LOOP_YEARS) + '년', { size: 12.5, weight: 800, color: '#fff' });
      acc += w;
    });
    D.text(bx + bw * 0.025, by + bh + 16, '①②는 아주 짧아요', { size: 11.5, weight: 700, color: '#64748b', align: 'left' });
    D.text(bx + bw * 0.67, by + bh + 16, '③ 심층 이동 600년 · ④ 느린 상승 330년', { size: 11.5, weight: 700, color: '#64748b', align: 'center' });
    const ty = by + bh + 28, rh = PHONE ? 38 : 25, cw = [bw * 0.16, bw * 0.28, bw * 0.28, bw * 0.28];
    const rows = [['', '원인', '속도', '깊이'], ['표층 순환', '바람', '0.1~1 m/s', '수백 m 이내'], ['심층 순환', '밀도 차 (수온·염분)', '약 1 cm/s 이하', '수천 m']];
    rows.forEach((r, i) => {
      let xx = bx; if (i === 0) { ctx.fillStyle = '#e8f1fa'; ctx.fillRect(bx, ty, bw, rh); }
      r.forEach((s2, j) => { D.text(xx + cw[j] / 2, ty + i * rh + rh * 0.68, s2, { size: 12.5, weight: i === 0 || j === 0 ? 800 : 700, color: i === 0 ? '#0f4c75' : j === 0 ? (i === 1 ? '#b91c1c' : '#1d4ed8') : '#334155' }); xx += cw[j]; });
      ctx.strokeStyle = '#d6e2ee'; ctx.lineWidth = 1; ctx.strokeRect(bx, ty + i * rh, bw, rh);
    });
  }

  /* =========================================================
     4단계: 담수 유입 → 표층 염분 ↓ → 밀도 ↓ → 침강 ↓ → 열 운반 ↓ → 북유럽 기온
     ========================================================= */
  const MELT = [];
  const PLUME = [];
  function drawClim(t, dt) {
    const R = LY.scene, F = S.Fd, sF = strengthF(F);
    S.sDisp = approach(S.sDisp, sF, dt, 3.5); const s = S.sDisp;
    panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '북대서양 (단순화한 단면, 예시)', 14.5, '#334155', 'left', 800);
    const sx = R.x + 12, sw = R.w - 24, surf = R.y + (PHONE ? 112 : 104), bot = R.y + R.h - 16, deepTop = surf + (bot - surf) * 0.52, xs = sx + sw * 0.56;
    // 하늘·육지(북유럽)·빙하
    ctx.save(); rr(sx, R.y + 36, sw, bot - R.y - 36, 12).clip();
    const sky = ctx.createLinearGradient(0, R.y + 36, 0, surf); sky.addColorStop(0, '#dbeafe'); sky.addColorStop(1, '#f1f8ff'); ctx.fillStyle = sky; ctx.fillRect(sx, R.y + 36, sw, surf - R.y - 36);
    ctx.fillStyle = '#86b98a'; ctx.beginPath(); ctx.moveTo(sx, surf - 6); ctx.lineTo(sx, surf - 34); ctx.quadraticCurveTo(sx + 50, surf - 52, sx + sw * 0.28, surf - 20); ctx.lineTo(sx + sw * 0.28, surf - 4); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = '#f59e0b'; ctx.fillRect(sx + 24 + i * 24, surf - 36 - (i % 2) * 6, 14, 12); ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(sx + 22 + i * 24, surf - 36 - (i % 2) * 6); ctx.lineTo(sx + 31 + i * 24, surf - 46 - (i % 2) * 6); ctx.lineTo(sx + 40 + i * 24, surf - 36 - (i % 2) * 6); ctx.fill(); }
    const iceW = sw * 0.2; ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.moveTo(sx + sw - iceW, surf - 2); ctx.lineTo(sx + sw - iceW + 14, surf - 48); ctx.lineTo(sx + sw - 30, surf - 62); ctx.lineTo(sx + sw, surf - 56); ctx.lineTo(sx + sw, surf - 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 2; ctx.stroke();
    // 바다
    const g1 = ctx.createLinearGradient(0, surf, 0, deepTop); g1.addColorStop(0, '#5bc0eb'); g1.addColorStop(1, '#2f8fd0'); ctx.fillStyle = g1; ctx.fillRect(sx, surf, sw, deepTop - surf);
    const g2 = ctx.createLinearGradient(0, deepTop, 0, bot); g2.addColorStop(0, '#2563eb'); g2.addColorStop(1, '#1e3a8a'); ctx.fillStyle = g2; ctx.fillRect(sx, deepTop, sw, bot - deepTop);
    // 담수층 (표층에 얹히는 가벼운 물)
    const lens = (F / F_MAX) * (PHONE ? 34 : 30);
    if (lens > 0.5) { const gl = ctx.createLinearGradient(0, surf, 0, surf + lens + 6); gl.addColorStop(0, 'rgba(224,242,254,.95)'); gl.addColorStop(1, 'rgba(224,242,254,0)'); ctx.fillStyle = gl; ctx.fillRect(xs - sw * 0.18, surf, sw * 0.18 + (sx + sw - xs), lens + 6); }
    // 침강 기둥
    const pw = 6 + (PHONE ? 62 : 54) * s;
    if (s > 0.01) { const gp = ctx.createLinearGradient(0, surf, 0, deepTop + 30); gp.addColorStop(0, 'rgba(147,197,253,.65)'); gp.addColorStop(1, 'rgba(96,165,250,.3)'); ctx.fillStyle = gp; rr(xs - pw / 2, surf, pw, deepTop - surf + 30, pw / 2).fill(); }
    D.text(sx + sw - 10, surf + 20, '표층', { size: 12.5, weight: 800, color: '#fff', align: 'right' }); D.text(sx + 10, deepTop + 20, '심층', { size: 12.5, weight: 800, color: '#dbeafe', align: 'left' });
    // 입자: 담수 방울, 침강 입자
    if (!RM) {
      if (F > 0) { MELT.acc = (MELT.acc || 0) + dt * F * 1.2; while (MELT.acc >= 1) { MELT.acc -= 1; MELT.push({ x: sx + sw - iceW + rnd(2, 14), y: surf - 30, vy: rnd(20, 40), life: 1.6 }); } }
      if (s > 0.02) { PLUME.acc = (PLUME.acc || 0) + dt * s * 26; while (PLUME.acc >= 1) { PLUME.acc -= 1; PLUME.push({ x: xs + rnd(-pw / 2, pw / 2) * 0.8, y: surf + 4, vy: rnd(50, 80), life: 2 }); } }
    }
    [MELT, PLUME].forEach((arr, ai) => { for (let i = arr.length - 1; i >= 0; i--) { const q = arr[i]; q.y += q.vy * dt; q.life -= dt; if (ai === 0 && q.y >= surf) { q.y = surf + 2; q.vy = 0; q.x -= 14 * dt; } if (q.life <= 0 || q.y > bot - 4) { arr.splice(i, 1); continue; } ctx.fillStyle = ai === 0 ? 'rgba(224,242,254,.95)' : 'rgba(30,64,175,.85)'; ctx.beginPath(); ctx.arc(q.x, q.y, ai === 0 ? 2.8 : 2.6, 0, TAU); ctx.fill(); } });
    // 표층 난류(따뜻함) 화살표: 굵기는 침강 세기에 비례
    const wy = surf + 36, wth = 2 + 11 * s;
    D.arrow(sx + 20, wy, xs - pw / 2 - 6, wy, { color: '#ef4444', width: wth, head: Math.max(11, wth * 2.2) });
    D.text(sx + 24, wy - 10 - wth * 0.5, '표층 난류 (따뜻해요)', { size: 12.5, weight: 800, color: '#7f1d1d', align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3.5 });
    // 심층류 화살표 (남쪽으로)
    const dy2 = deepTop + 50, dth = 2 + 9 * s;
    D.arrow(xs + 6, dy2, sx + 40, dy2, { color: '#93c5fd', width: dth, head: Math.max(10, dth * 2.2) });
    D.text(sx + 44, dy2 + 22, '심층류 (남쪽으로)', { size: 12.5, weight: 800, color: '#dbeafe', align: 'left' });
    ctx.restore();
    // 열 운반 (북유럽으로)
    const hth = 2 + 9 * s; ctx.save(); ctx.strokeStyle = rgba('#ef4444', 0.35 + 0.55 * s); ctx.lineWidth = hth; ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) { const x0 = sx + 70 + k * 46; ctx.beginPath(); ctx.moveTo(x0, surf - 8); ctx.bezierCurveTo(x0 + 10, surf - 22 - 6 * Math.sin(t * 3 + k), x0 - 10, surf - 34, x0 + 4, surf - 46 + (1 - s) * 6); ctx.stroke(); }
    ctx.restore();
    D.label(sx + 66, R.y + 50, '북유럽', { bg: '#15803d', size: 13, pad: 9 });
    D.label(sx + sw - 54, R.y + 50, '그린란드 빙하', { bg: '#64748b', size: 12.5, pad: 8 });
    D.label(xs, deepTop - 12, s > 0.02 ? '침강 ' + Math.round(s * 100) + '%' : '침강 멈춤', { bg: s > 0.02 ? '#2563eb' : '#dc2626', size: 13, pad: 9 });

    // 밀도 막대 · 침강 세기
    const C = LY.cbars; panel(C.x, C.y, C.w, C.h);
    tx(C.x + 12, C.y + 22, '표층수와 심층수의 밀도', 14.5, '#334155', 'left', 800);
    const lo = 1027, hi = 1028.1, bx0 = C.x + 14, bx1 = C.x + C.w - 66, bh = PHONE ? 30 : 28, by = C.y + 44;
    const xv = (v) => bx0 + (bx1 - bx0) * clamp((v - lo) / (hi - lo), 0, 1);
    const rs = r2(rhoF(F));
    [[rs, '#f59e0b', '북대서양 표층수 (3 °C · ' + f2(salF(F)) + ' psu)'], [RHO_DEEP, '#2563eb', '심층수 (3 °C · 34.9 psu)']].forEach((r, i) => {
      const y = by + 18 + i * (bh + 30);
      D.text(bx0, y - 5, r[2], { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = r[1]; ctx.globalAlpha = 0.88; ctx.fillRect(bx0, y, Math.max(2, xv(r[0]) - bx0), bh); ctx.globalAlpha = 1;
      D.text(xv(r[0]) + 6, y + bh * 0.68, f2(r[0]), { size: 14, weight: 800, color: '#0f172a', align: 'left' });
    });
    const ay = by + 18 + 2 * (bh + 30) - 12;
    [1027, 1027.5, 1028].forEach((v) => { ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xv(v), by + 14); ctx.lineTo(xv(v), ay); ctx.stroke(); D.text(xv(v), ay + 14, String(v), { size: 11.5, weight: 700, color: '#64748b' }); });
    D.text((bx0 + bx1) / 2, ay + 30, '밀도 (kg/m³) — 축은 1027에서 시작해요', { size: 11.5, weight: 700, color: '#64748b' });
    // 침강 세기 계기
    const gy = ay + 52 * (PHONE ? 1 : 1), gx = C.x + 14, gw = C.w - 28;
    D.text(gx, gy, '침강 세기', { size: 13.5, weight: 800, color: '#334155', align: 'left' }); D.text(gx + gw, gy, Math.round(s * 100) + '%', { size: 16, weight: 800, color: s > 0.02 ? '#1d4ed8' : '#dc2626', align: 'right' });
    ctx.fillStyle = '#e2e8f0'; rr(gx, gy + 8, gw, 16, 8).fill(); ctx.fillStyle = s > 0.5 ? '#2563eb' : s > 0.02 ? '#f59e0b' : '#dc2626'; if (s > 0.01) rr(gx, gy + 8, gw * s, 16, 8).fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(gx, gy + 8, gw, 16, 8).stroke();
    drawWrap(C.x + C.w / 2, gy + 46, s > 0.02 ? '표층수가 심층수보다 무거워서 가라앉아요.' : '표층수가 심층수보다 가벼워서(또는 같아서) 가라앉지 못해요.', C.w - 24, 12.5, { color: '#475569', lh: 1.25 });
    // 북유럽 기온 변화 그래프
    const G = LY.chart; panel(G.x, G.y, G.w, G.h);
    tx(G.x + 12, G.y + 22, '북유럽 기온 변화 (예시 경향)', 14.5, '#334155', 'left', 800);
    D.label(G.x + G.w - 10, G.y + 20, '실제 값이 아닌 경향', { bg: '#fff7e0', color: '#a16207', size: 12, pad: 7, border: '#f2d38a', align: 'right' });
    const GP = plotFrame(G, { l: PHONE ? 62 : 54, r: 16, t: 36, b: 40, xmin: 0, xmax: F_MAX, ymin: -7, ymax: 1, xticks: [0, 2, 4, 6, 8, 10], yticks: [-6, -4, -2, 0], size: 12, xlabel: '그린란드 빙하 융해 담수 유입량 (예시 단위)', ylabel: '기온 변화 (°C)' });
    const pts = []; for (let f = 0; f <= F_MAX + 1e-9; f += 0.1) pts.push([GP.gx(f), GP.gy(dTeuF(f))]);
    polyline(pts, '#2563eb', 3.5);
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(GP.x0, GP.gy(0)); ctx.lineTo(GP.x1, GP.gy(0)); ctx.stroke(); ctx.restore();
    if (S.found) { ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(GP.gx(3), GP.y0); ctx.lineTo(GP.gx(3), GP.y1); ctx.stroke(); ctx.restore(); D.text(GP.gx(3) + 6, GP.y0 + 16, '임계: 표층 염분 34.9 psu', { size: 12, weight: 800, color: '#b91c1c', align: 'left' }); }
    const mx = GP.gx(F), my = GP.gy(-T_EU_MAX * (1 - s));
    D.sphere(mx, my, 8, '#f97316', { outline: '#fff', outlineWidth: 2.5, shadow: true });
    D.label(clamp(mx + 6, GP.x0 + 60, GP.x1 - 60), clamp(my - 20, GP.y0 + 12, GP.y1 - 12), '북유럽 ' + (-T_EU_MAX * (1 - s) < -0.05 ? '−' + f1(T_EU_MAX * (1 - s)) : '±0.0') + ' °C', { bg: '#0f172a', size: 12.5, pad: 8 });
  }

  /* ---------- 인과 사슬 카드 ---------- */
  const CHW = PHONE ? 262 : 228, CHH = 54;
  const chainBoard = (function () {
    const R = LY.chain, cols = PHONE ? 2 : 3, zw = CHW + 16, zh = CHH + 36, gx = PHONE ? 12 : 16, zones = [];
    for (let i = 0; i < 6; i++) {
      const col = i % cols, row = Math.floor(i / cols), x0 = R.x + (R.w - (cols * zw + (cols - 1) * gx)) / 2;
      zones.push({ id: 'c' + i, label: '① ② ③ ④ ⑤ ⑥'.split(' ')[i], x: x0 + col * (zw + gx), y: R.y + 54 + row * (zh + 22), w: zw, h: zh, head: 24, lsize: 14, cap: 1, color: '#2563eb', fill: 'rgba(255,255,255,.9)', line: '#93c5fd' });
    }
    const rowsN = Math.ceil(6 / cols), ty = R.y + 54 + rowsN * (zh + 22) + 34;
    const b = new Board({ zones, tray: { x: R.x + 12, y: ty, w: R.w - 24 }, cw: CHW, ch: CHH, gap: 8, onDrop: () => true, onReject: (c, z, msg) => say(msg || '여기에는 놓을 수 없어요.', true, 2) });
    b.trayTitleY = ty - 10; return b;
  })();
  const CH_ORDER = [3, 0, 5, 1, 4, 2];            // 카드를 섞어서 보관함에 놓는 순서
  function initChain() { chainBoard.cards.length = 0; CH_ORDER.forEach((k) => chainBoard.add({ id: 'k' + k, label: CHAIN[k], ans: 'c' + k, fill: '#fff', border: '#cfd8e6' })); chainBoard.reset(); }
  initChain();
  const chainPlaced = () => chainBoard.cards.filter((c) => c.zone).length;
  const chainRight = () => chainBoard.cards.every((c) => c.zone === c.ans);
  function drawChain(t) {
    const R = LY.chain; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '인과 사슬을 순서대로 놓아요 (① → ⑥)', 14.5, '#334155', 'left', 800);
    // 칸 사이 화살표
    chainBoard.zones.forEach((z, i) => { if (i < 5) { const nz = chainBoard.zones[i + 1]; if (nz.y === z.y) D.arrow(z.x + z.w + 1, z.y + z.h / 2, nz.x - 1, nz.y + nz.h / 2, { color: '#94a3b8', width: 3, head: 9 }); else { const my = (z.y + z.h + nz.y) / 2; polyline([[z.x + z.w / 2, z.y + z.h + 1], [z.x + z.w / 2, my], [nz.x + nz.w / 2, my]], '#94a3b8', 3); D.arrow(nz.x + nz.w / 2, my, nz.x + nz.w / 2, nz.y - 1, { color: '#94a3b8', width: 3, head: 9 }); } } });
    tx(R.x + 12, chainBoard.trayTitleY + 2, '원인과 결과 카드 (끌어서 칸에 놓아요)', 13.5, '#475569', 'left', 800);
    chainBoard.draw(t);
  }


  /* =========================================================
     조작 · 읽기 칸 · 단계와 미션
     ========================================================= */
  const VIEW_LABEL = { tank: '🧊 침강 실험 수조', sect: '🧩 단순화한 남북 바다 단면', loop: '🔄 순환 고리 (해양 컨베이어 벨트)', clim: '🌍 담수 유입과 침강·기후', chain: '🔗 인과 사슬 카드' };
  const setTw = (obj, prop, val, dur, ease) => SciSim.tween(obj, { [prop]: val }, { duration: dur, ease: ease || 'outCubic' });
  const modeSeg = $('#modeSeg');
  const sTp = $('#sTp'), oTp = $('#oTp'), sSp = $('#sSp'), oSp = $('#oSp'), sTime = $('#sTime'), oTime = $('#oTime'), sMelt = $('#sMelt'), oMelt = $('#oMelt');

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !(game && game.free);
    $('#bPour').textContent = S.tp.pour ? '⏹ 붓기 멈춤' : '💧 붓기 시작';
    $('#bPour').classList.toggle('on', S.tp.pour);
    $('#bPlay').textContent = S.playing ? '⏸ 멈춤' : '▶ 재생';
    $$('#loopRows select').forEach((s) => { s.value = S.loopPick[s.dataset.i] || ''; });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));
  bindSlider(sTp, oTp, (v) => v + ' °C', (v) => { S.tp.T = v; });
  bindSlider(sSp, oSp, (v) => f1(v) + ' psu', (v) => { S.tp.S = v; });
  $('#bPour').addEventListener('click', () => { Sound.click(); S.tp.pour = !S.tp.pour; updateCtl(); });
  function resetTank(T, Sx) { tpReset(); S.tp.T = T; S.tp.S = Sx; setSlider(sTp, oTp, T, (v) => v + ' °C'); setSlider(sSp, oSp, Sx, (v) => f1(v) + ' psu'); updateCtl(); }
  $('#bTpReset').addEventListener('click', () => { Sound.click(); resetTank(20, 34.5); });
  $('#bSecReset').addEventListener('click', () => { Sound.click(); initSect(); updateCtl(); });
  const timeTxt = (v) => { const r = Math.pow(10, v); return (r < 10 ? f1(r) : f0(r)) + '년/초'; };
  bindSlider(sTime, oTime, timeTxt, (v) => { S.loopSpd = v; });
  $('#bPlay').addEventListener('click', () => { Sound.click(); S.playing = !S.playing; updateCtl(); });
  $('#bLoopReset').addEventListener('click', () => { Sound.click(); S.loopT = 0; });
  $$('#loopRows select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.loopPick[s.dataset.i] = s.value || undefined; }));
  const meltTxt = (v) => v + ' · 표층 염분 ' + f2(salF(v)) + ' psu';
  bindSlider(sMelt, oMelt, meltTxt, (v) => { S.F = v; });
  $('#bChainReset').addEventListener('click', () => { Sound.click(); chainBoard.reset(); });

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'sect') {
        const c = secCardAt(p);
        if (c) { S.drag = c; c.ox = p.x - c.x; c.oy = p.y - c.y; c.sx = p.x; c.sy = p.y; c.moved = false; SciSim.tween(c, { x: c.x }, { duration: 0.0001 }); Sound.click(); return true; }
        if (S.selCard) { const sc = S.selCard; S.selCard = null; sc.x = p.x; sc.y = p.y; secDrop(sc, p); }
        return false;
      }
      if (S.view === 'chain') return chainBoard.down(p);
      return false;
    },
    move(p) { if (S.view === 'sect') { const c = S.drag; if (c) { c.x = p.x - c.ox; c.y = p.y - c.oy; if (Math.hypot(p.x - c.sx, p.y - c.sy) > 9) c.moved = true; } } else if (S.view === 'chain') chainBoard.move(p); },
    up(p) {
      if (S.view === 'sect') { const c = S.drag; if (!c) return; S.drag = null; if (!c.moved) { S.selCard = S.selCard === c ? null : c; c.x = c.hx; c.y = c.hy; return; } S.selCard = null; secDrop(c, p); }
      else if (S.view === 'chain') chainBoard.up(p);
    },
    hover(p) { if (S.view === 'sect') return secCardAt(p) ? 'grab' : 'default'; if (S.view === 'chain') return chainBoard.hit(p) ? 'grab' : 'default'; return 'default'; },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view, tp = S.tp;
    if (v === 'tank') { const d = tpDelta(); setReadouts(['부은 물', tp.T + ' °C · ' + f1(tp.S) + ' psu', '밀도 차 (부은 물 − 수조 물)', (d > 0 ? '+' : d < 0 ? '−' : '') + f1(Math.abs(d)) + ' kg/m³', '상태', !tp.pour ? '붓기 전' : d > 0 ? '침강' : d < 0 ? '위에 뜸' : '제자리']); }
    else if (v === 'sect') setReadouts(['놓은 수괴', secPlaced() + ' / 3', '밀도가 가장 큰 수괴', '남극 저층수 (' + f1(MASSES.aabw.rho) + ')', '가장 깊은 곳', '저층 (4000 m 아래)']);
    else if (v === 'loop') setReadouts(['경과 시간', comma(S.loopT) + '년', '한 바퀴', lapsDone() + '번', '시간 속도', timeTxt(S.loopSpd)]);
    else if (v === 'clim') { const s = strengthF(S.F); setReadouts(['담수 유입량 · 표층 염분', S.F + ' · ' + f2(salF(S.F)) + ' psu', '표층수 밀도 / 심층수 밀도', f2(r2(rhoF(S.F))) + ' / ' + f2(RHO_DEEP), '침강 세기 · 북유럽', Math.round(s * 100) + '% · ' + (dTeuF(S.F) < -0.05 ? '−' + f1(-dTeuF(S.F)) : '±0.0') + ' °C']); }
    else setReadouts(['놓은 카드', chainPlaced() + ' / 6', '순서', '원인 → 결과', '맞는 칸', chainBoard.cards.filter((c) => c.zone === c.ans).length + ' / 6']);
  }

  /* ---------- 단계 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    if (li === 0) { resetTank(20, 34.5); setView('tank'); showHint('수온·염분을 정하고 붓기를 눌러 보세요', 5000); }
    else if (li === 1) { initSect(); setView('sect'); showHint('카드를 단면의 침강 위치(고리)에 놓아요', 5000); }
    else if (li === 2) { S.loopT = 0; S.loopSpd = 0; S.playing = true; S.loopPick = {}; setSlider(sTime, oTime, 0, timeTxt); setView('loop'); showHint('시간 눈금을 올리면 입자가 빠르게 돌아요', 5000); }
    else { S.F = 0; S.Fd = 0; S.found = false; MELT.length = 0; PLUME.length = 0; setSlider(sMelt, oMelt, 0, meltTxt); chainBoard.reset(); setView('clim'); showHint('담수 유입량을 올려 침강이 어떻게 변하는지 봐요', 5000); }
    updateCtl();
  }
  const OCEANLINE = '<p style="font-size:13.5px;color:var(--muted);margin-top:6px">※ 이 차시의 수치(밀도, 시간, 기온 변화)는 모두 교육용 <b>예시 자료</b>예요. ' + SRC_LINE + '</p>';
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';

  const levels = [
    {
      title: '침강 실험: 찬 짠물은 어디로 갈까', short: '침강 실험', icon: '🧊', phase: '실험', features: ['tank'],
      intro: '<p class="si-q">❓ 탐구 질문: 바닷속 깊은 곳의 물은 어떻게 그곳까지 내려갔고, 그 흐름은 우리 기후와 어떤 관계가 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(해수의 밀도와 T-S도)에서</b> 수온이 낮을수록, 염분이 높을수록 밀도가 커져서 무거운 물이 아래로 가라앉는다는 것을 배웠어요. 중학교에서 배운 표층 해류(북태평양 순환)는 <b>바람</b>이 일으킨 흐름이었어요.</div>' +
        '<p>이번에는 수조 한쪽 끝을 <b>냉각</b>하고 <b>소금물</b>(바닷물이 얼 때 얼음에서 빠져나온 짠물)을 부어 보며, 심층수가 어떻게 만들어지는지 알아봐요. 심층 순환의 원인은 바람이 아니라 <b>밀도 차</b>예요.</p>' + OCEANLINE,
      setup() { enterLevel(0); },
      recap: '수온이 낮고 염분이 높아 밀도가 커진 물은 가라앉아 바닥을 따라 흘러요. 반대로 따뜻하고 싱거운 물은 위에 떠요.',
      summary: '<ul><li>심층수는 <b>극지방</b>에서 해수가 냉각되거나 결빙되어(얼음에서 염류가 빠져나가 남은 물이 더 짠 물) <b>밀도가 커져</b> 가라앉아서 만들어져요.</li><li>수조 실험: 수조 속 물(20 °C·34.5 psu)보다 밀도가 큰 물을 부으면 가라앉아 바닥을 따라 반대쪽으로 흐르고, 위쪽에서는 가벼운 물이 되돌아와요.</li><li>침강의 원인은 바람이 아니라 <b>밀도 차</b>예요.</li></ul>',
      missions: [
        {
          title: '수온을 낮추고 염분을 높여 침강시키기',
          goal: '수조 속 물(20 °C·34.5 psu)보다 <b>수온은 낮고 염분은 높은</b> 물을 부어서, 푸른 물이 <b>가라앉아 바닥을 따라</b> 흐르게 해요.',
          hint: '수온 슬라이더를 낮추고 염분 슬라이더를 높인 뒤 💧 붓기 시작을 눌러요. (예: 2 °C, 36 psu) 밀도 차가 2 이상이면 잘 가라앉아요.',
          hold: 0.3, setup() { resetTank(20, 34.5); setView('tank'); },
          status: () => '수온 낮춤 ' + mark(S.tp.T < TA) + ' · 염분 높임 ' + mark(S.tp.S > SA) + ' · 붓는 중 ' + mark(S.tp.pour) + ' · 침강 흐름 ' + mark(tpDenseOK()),
          check: () => tpDenseOK(),
          explain: '수온이 낮고 염분이 높은 물은 밀도가 커서 가라앉고, 바닥을 따라 흘러요. 극지방에서 바닷물이 냉각·결빙될 때 이런 무거운 물이 만들어져 심층수가 돼요.',
        },
        {
          title: '침강이 일어나지 않는 조건 찾기',
          goal: '이번에는 푸른 물이 <b>가라앉지 않고 위에 뜨는</b> 조건을 찾아요. 💧 붓기를 하며 수온이나 염분을 바꿔 보세요.',
          hint: '수온을 20 °C보다 높이거나 염분을 34.5 psu보다 낮추면 밀도가 작아져요. 밀도 차가 −0.5 이하면 돼요.',
          hold: 0.3, setup() { resetTank(20, 34.5); setView('tank'); },
          status: () => '수조 물보다 가벼움 ' + mark(tpDelta() <= -0.5) + ' · 붓는 중 ' + mark(S.tp.pour) + ' · 위에 뜸 ' + mark(tpLightOK()),
          check: () => tpLightOK(),
          explain: '따뜻하고 싱거운 물은 밀도가 작아서 가라앉지 못하고 표면을 따라 퍼져요. 그래서 따뜻한 저위도 바다에서는 심층수가 만들어지지 않아요.',
        },
        {
          type: 'quiz', title: '심층수가 극지방에서 만들어지는 까닭', goal: '심층수가 <b>극지방</b>에서 만들어지는 까닭으로 가장 알맞은 것은 무엇일까요?', setup() { setView('tank'); },
          choices: ['극지방에서는 센 바람이 바닷물을 아래로 밀어내기 때문이에요', '극지방에서는 해수가 냉각·결빙되어 수온이 낮고 염분이 높아져 밀도가 커지기 때문이에요', '극지방의 바닷물이 적도보다 따뜻하기 때문이에요', '극지방에는 강물이 많이 흘러들어 염분이 높기 때문이에요'],
          answer: 1,
          feedback: ['심층 순환의 원인은 바람이 아니라 밀도 차예요. 표층 해류는 바람이 일으켜요.', '', '따뜻한 물은 밀도가 작아서 가라앉지 못해요.', '강물이 흘러들면 염분은 오히려 낮아져요.'],
          explain: '극지방에서는 바닷물이 <b>차가워지고 얼면서</b>(남은 물은 염분이 높아져) 밀도가 커져 가라앉아요. 심층 순환은 <b>바람이 아닌 밀도 차</b> 때문에 생겨요.',
        },
      ],
    },
    {
      title: '단면 모형: 수괴를 침강 위치에 놓기', short: '단면 모형', icon: '🧩', phase: '모형', features: ['sect'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 극지방에서 냉각·결빙된 무거운 물이 가라앉는다는 것을 실험으로 확인했어요.</div>' +
        '<p>이제 <b>단순화한 남북 바다 단면</b>(남극 −90° ~ 북극 +90°, 깊이 0~5000 m, 대륙 없음)에서 주요 심층수를 살펴봐요. <b>북대서양 심층수</b>는 북위 60° 부근(그린란드 부근), <b>남극 저층수</b>는 남극 대륙 주변, <b>남극 중층수</b>는 남위 50° 부근에서 가라앉아요. 밀도가 클수록 더 깊이 가라앉아 층을 이뤄요.</p>' + OCEANLINE,
      setup() { enterLevel(1); },
      recap: '밀도가 가장 큰 남극 저층수가 가장 깊은 곳(저층)에, 북대서양 심층수가 그 위(심층)에, 밀도가 가장 작은 남극 중층수가 중층(약 1000 m)에 자리 잡아요.',
      summary: tb([['수괴', '수온·염분', '침강 위치', '깊이', '밀도'], ['남극 저층수', '−0.5 °C · 34.7 psu', '남극 대륙 주변', '4000 m 아래 (북쪽으로)', '1027.9'], ['북대서양 심층수', '3 °C · 34.9 psu', '북위 60° 부근', '2000~4000 m (남쪽으로)', '1027.8'], ['남극 중층수', '4 °C · 34.4 psu', '남위 50° 부근', '약 1000 m (북쪽으로)', '1027.3']]) + '<ul><li>밀도 순서: 남극 저층수 &gt; 북대서양 심층수 &gt; 남극 중층수 (단위 kg/m³).</li><li>이 단면은 단순화한 모형이에요. 실제 해저 지형과 대륙 분포의 영향은 다루지 않아요.</li></ul>',
      missions: [
        {
          title: '수괴 3개를 침강 위치와 깊이에 배치하기', manual: true,
          goal: '수괴 카드 3장을 <b>침강 위치(노란 고리 근처의 위도)</b>와 알맞은 <b>깊이</b>에 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '카드 이름이 단서예요. 밀도가 큰 물일수록 더 깊이 가라앉아요. 아래 밀도 막대의 순서를 보세요.',
          setup() { initSect(); setView('sect'); },
          status: () => '놓은 카드 ' + secPlaced() + ' / 3',
          check: () => {
            const un = S.cards.filter((c) => !c.placed); if (un.length) return '아직 놓지 않은 카드가 ' + un.length + '장 있어요.';
            const bad = S.cards.filter((c) => c.band !== MASSES[c.id].band);
            return bad.length ? '깊이를 다시 봐요. 밀도가 큰 물이 더 깊이 가라앉아 아래쪽에 층을 이뤄요. 아래의 밀도 막대 순서와 같게 놓아요.' : true;
          },
          explain: '밀도가 가장 큰 <b>남극 저층수(1027.9)</b>는 가장 깊은 저층에, <b>북대서양 심층수(1027.8)</b>는 그 위의 심층에, 밀도가 가장 작은 <b>남극 중층수(1027.3)</b>는 중층에 자리 잡아요. 그래서 위에서 아래로 갈수록 점점 무거운 물이 쌓여 안정한 층을 이뤄요.',
        },
        {
          type: 'quiz', title: '남극 저층수가 가장 깊은 곳에 있는 까닭', goal: '<b>남극 저층수</b>가 가장 깊은 곳에 있는 까닭으로 알맞은 것은 무엇일까요?', setup() { setView('sect'); },
          choices: ['남극 저층수가 가장 따뜻하기 때문이에요', '남극 저층수의 밀도가 세 수괴 중 가장 커서 가장 아래로 가라앉기 때문이에요', '남극에서는 바닷물이 얼지 않아 바닥에 쌓이기 때문이에요', '바람이 바닥 쪽으로 밀어 넣기 때문이에요'],
          answer: 1,
          feedback: ['남극 저층수는 −0.5 °C로 가장 차가워요. 차가울수록 밀도가 커져요.', '', '오히려 남극 주변에서는 바닷물이 얼면서 남은 물이 더 짜고 무거워져요.', '심층에서의 층 구조는 바람이 아니라 밀도 차이로 만들어져요.'],
          explain: '밀도가 클수록 더 아래에 자리 잡아요. 남극 저층수(−0.5 °C·34.7 psu)는 밀도가 <b>1027.9 kg/m³</b>로 가장 커서 가장 깊은 곳에 있어요.',
        },
      ],
    },
    {
      title: '순환 연결: 느리게 도는 컨베이어 벨트', short: '순환 연결', icon: '🔄', phase: '탐구', features: ['loop'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 극지방에서 침강한 물이 깊은 곳에 층을 이뤄 퍼진다는 것을 확인했어요.</div>' +
        '<p>표층 난류(예: 대서양의 멕시코 만류)가 고위도로 열을 운반하고, 북쪽에서 냉각·침강한 물이 심층을 따라 남쪽으로 흘러 천천히 상승해 표층으로 돌아와요. 표층과 심층이 하나의 <b>순환 고리(해양 컨베이어 벨트, 열염 순환)</b>로 이어져 있어요. 시간을 빠르게 흘려 입자를 한 바퀴 돌려 봐요.</p>' + OCEANLINE,
      setup() { enterLevel(2); },
      recap: '표층 순환(바람)과 심층 순환(밀도 차)은 하나의 고리로 이어져 있고, 심층 순환은 훨씬 느려 한 바퀴에 약 1000~2000년이 걸려요.',
      summary: tb([['', '표층 순환', '심층 순환'], ['원인', '바람', '밀도 차(수온·염분)'], ['속도', '0.1~1 m/s', '약 1 cm/s 이하'], ['깊이', '수백 m 이내', '수천 m']]) + '<ul><li>순환 고리: 표층 난류(북상) → 북쪽에서 냉각·침강 → 심층 이동(남하) → 느린 상승 → 표층.</li><li>한 바퀴 약 1000~2000년(이 모형은 예시로 1000년).</li></ul>',
      missions: [
        {
          title: '입자를 한 바퀴 돌려 보기',
          goal: '시간 눈금 슬라이더를 올려 노란 입자를 <b>한 바퀴</b>(1000년) 돌려 보세요.',
          hint: '슬라이더를 오른쪽으로 옮기면 시간이 빨리 흘러요. (1년/초 → 100년/초 → 1000년/초)',
          hold: 0.3, setup() { S.loopT = 0; S.loopSpd = 0; S.playing = true; setSlider(sTime, oTime, 0, timeTxt); setView('loop'); },
          status: () => '경과 시간 ' + comma(Math.min(S.loopT, LOOP_YEARS)) + '년 / ' + comma(LOOP_YEARS) + '년 ' + mark(S.loopT >= LOOP_YEARS),
          check: () => S.loopT >= LOOP_YEARS,
          explain: '입자는 표층에서는 빠르게(수 년~수십 년) 움직이지만 심층 이동과 느린 상승에 대부분의 시간(약 930년)이 걸려요. 그래서 한 바퀴에 약 <b>1000~2000년</b>이 걸려요.',
        },
        {
          title: '순환 경로 이름 붙이기', manual: true,
          goal: '고리의 ①~④ 번호에 알맞은 이름을 골라요.',
          hint: '붉은 입자는 표층, 푸른 입자는 심층을 흘러요. 입자가 가는 방향을 따라가 보세요.',
          setup() { S.loopPick = {}; setView('loop'); },
          status: () => '고른 이름 ' + Object.keys(S.loopPick).filter((k) => S.loopPick[k]).length + ' / 4',
          check: () => {
            const miss = [0, 1, 2, 3].filter((i) => !S.loopPick[i]); if (miss.length) return '번호 ' + miss.map((i) => i + 1).join('·') + '의 이름을 아직 고르지 않았어요.';
            const bad = [0, 1, 2, 3].filter((i) => S.loopPick[i] !== LOOP_LEG[i][0]);
            return bad.length ? '번호 ' + bad.map((i) => i + 1).join('·') + '을(를) 다시 봐요. 입자가 지나가는 순서와 깊이, 방향을 확인해 보세요.' : true;
          },
          explain: '① <b>표층 난류(북상)</b> → ② 북쪽에서 냉각·결빙되어 <b>침강</b> → ③ 심층을 따라 <b>남쪽으로 이동(심층 이동)</b> → ④ 다른 바다에서 <b>느리게 상승</b>해 표층으로 돌아와요.',
        },
        {
          type: 'quiz', title: '심층 순환의 원인과 속도', goal: '심층 순환에 대한 설명으로 <b>옳은 것</b>을 골라요.', setup() { setView('loop'); },
          choices: ['바람이 심층 순환을 일으켜서 표층 순환과 속도가 같아요', '밀도 차로 생기고, 아주 깊은 곳을 약 1 cm/s 이하로 천천히 흘러 한 바퀴에 약 1000~2000년이 걸려요', '침강하는 곳이 없어서 거의 흐르지 않아요', '표층 해류와 완전히 따로 움직여서 서로 영향을 주지 않아요'],
          answer: 1,
          feedback: ['표층 해류는 바람이 일으키지만 심층 순환은 밀도 차가 원인이에요. 속도도 훨씬 느려요.', '', '북대서양과 남극 주변에서 침강이 일어나요. 침강이 심층 순환의 시작이에요.', '표층 난류가 고위도로 가서 침강하고 심층으로 이어지므로 서로 연결되어 있어요.'],
          explain: '심층 순환은 <b>바람이 아니라 밀도 차</b>로 생겨요. 깊은 곳을 약 <b>1 cm/s 이하</b>로 천천히 흐르고(표층 해류는 0.1~1 m/s), 한 바퀴에 약 1000~2000년이 걸려요.',
        },
      ],
    },
    {
      title: '순환과 기후: 담수가 늘어나면?', short: '순환과 기후', icon: '🌍', phase: '예측', features: ['clim', 'chain'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 북대서양에서 침강한 물이 심층 순환을 이루고, 표층 난류가 북쪽으로 열을 운반한다는 것을 확인했어요.</div>' +
        '<p>북대서양의 침강은 표층수의 밀도가 심층수와 같거나 더 커야 일어나요. 그린란드 빙하가 녹아 <b>담수</b>가 흘러들면 표층 염분이 낮아져 침강이 약해지고, 표층 난류가 북쪽으로 운반하는 <b>열</b>도 줄어 북유럽이 추워질 수 있어요. 담수 유입량 슬라이더로 이 인과 사슬을 따라가 봐요. (그래프는 경향을 보여 주는 예시예요.)</p>' + OCEANLINE,
      setup() { enterLevel(3); },
      recap: '담수 유입 → 표층 염분↓ → 밀도↓ → 침강↓ → 난류 북상↓ → 북유럽 냉각 가능. 다만 지구 평균 기온은 계속 상승하고, 이 영향은 지역적이에요.',
      summary: '<ul><li>침강 임계: 표층수(3 °C·34.9 psu, 밀도 약 1027.8)가 심층수와 같은 밀도여야 침강해요. 염분이 34.3 psu로 낮아지면 밀도 약 1027.3 &lt; 1027.8이라 가라앉지 못해요.</li><li>인과 사슬: 담수 유입 → 표층 염분↓ → 밀도↓ → 침강↓ → 난류 북상(열 운반)↓ → 북유럽 냉각 가능</li><li>과거 사례(예시): 약 1만 2900년 전 영거 드라이아스(약 1000년의 급랭).</li><li>지구가 온난화되는데 북유럽이 추워질 수 있다는 주장은 <b>지역적 영향</b>이며, 지구 평균 기온은 계속 상승해요.</li></ul>',
      missions: [
        {
          title: '침강이 멈추는 염분 임계값 찾기',
          goal: '담수 유입량을 올리면서 <b>침강 세기가 처음으로 0%가 되는 곳</b>(표층수 밀도 = 심층수 밀도)에 슬라이더를 멈춰요.',
          hint: '표층수 밀도 막대가 심층수 밀도와 같아지는 곳이에요. 슬라이더를 한 칸씩 천천히 올려 보세요.',
          hold: 0.8, setup() { S.F = 0; setSlider(sMelt, oMelt, 0, meltTxt); S.found = false; setView('clim'); },
          status: () => '담수 ' + S.F + ' · 표층 염분 ' + f2(salF(S.F)) + ' psu · 침강 세기 ' + Math.round(strengthF(S.F) * 100) + '% ' + mark(S.F === 3 && strengthF(S.F) === 0),
          check: () => S.F === 3 && strengthF(S.F) === 0,
          explain: '표층 염분이 <b>34.9 psu</b>가 되면 표층수 밀도(1027.81)가 심층수와 같아져서 침강 세기가 0이 돼요. 그보다 염분이 낮아지면 표층수가 더 가벼워서 가라앉지 못해요. (예: 34.3 psu → 약 1027.3)',
        },
        {
          title: '인과 사슬 순서 맞추기', manual: true,
          goal: '카드 6장을 <b>① → ⑥</b> 순서로 놓아서 인과 사슬을 완성하고 <b>✔ 확인하기</b>를 눌러요.', setup() { chainBoard.reset(); setView('chain'); },
          hint: '무엇이 먼저 일어나는지 생각해요. 빙하가 녹아 담수가 들어오면 가장 먼저 바닷물의 염분이 달라져요.',
          status: () => '놓은 카드 ' + chainPlaced() + ' / 6 · 맞는 칸 ' + chainBoard.cards.filter((c) => c.zone === c.ans).length + ' / 6',
          check: () => {
            if (chainPlaced() < 6) return '아직 칸에 놓지 않은 카드가 ' + (6 - chainPlaced()) + '장 있어요.';
            return chainRight() ? true : '순서를 다시 생각해 봐요. 앞의 일이 뒤의 일의 원인이 되어야 해요.';
          },
          explain: '그린란드 빙하 <b>담수 유입</b> ↑ → 북대서양 표층 <b>염분</b> ↓ → 표층수 <b>밀도</b> ↓ → <b>침강</b> 약화 → 표층 난류의 <b>북상</b> 약화 → 북유럽 <b>냉각</b> 가능.',
        },
        {
          type: 'quiz', title: '온난화인데 북유럽이 추워질 수 있다?', goal: '"지구가 온난화되는데 북유럽은 오히려 추워질 수도 있다"는 주장에 대한 설명으로 가장 알맞은 것은 무엇일까요?', setup() { S.F = 5; setSlider(sMelt, oMelt, 5, meltTxt); setView('clim'); },
          choices: ['지구 평균 기온이 내려가므로 지구 전체가 냉각돼요', '침강이 약해져 열 운반이 줄면 북유럽이 지역적으로 추워질 수 있지만, 지구 평균 기온은 계속 상승해요', '침강이 약해지면 심층 순환이 빨라져서 북유럽이 더 따뜻해져요', '빙하가 녹아도 바닷물의 염분에는 아무 영향이 없어요'],
          answer: 1,
          feedback: ['북유럽의 지역적 냉각이 있어도 지구 평균 기온은 계속 상승해요. 이 영향은 지역적이에요.', '', '침강이 약해지면 열을 북쪽으로 운반하는 힘도 약해져 북유럽이 추워질 수 있어요.', '담수가 흘러들면 표층 염분이 낮아져요. 슬라이더를 올려 염분 변화를 확인해 보세요.'],
          explain: '침강이 약해지면 표층 난류가 북쪽으로 운반하는 열이 줄어 <b>북유럽이 지역적으로 냉각</b>될 수 있어요. 하지만 이것은 일부 지역의 영향이고 <b>지구 평균 기온은 계속 상승</b>해요. 과거 영거 드라이아스(약 1만 2900년 전, 약 1000년의 급랭)가 한 예시예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-deep-circulation', mount: '#game', badge: '심층 순환 탐험가', homeHref: '../../index.html#he',
    featureLabels: { tank: '🧊 침강 실험 수조 · 수온·염분 슬라이더', sect: '🧩 남북 단면 · 수괴 카드', loop: '🔄 순환 고리 · 시간 눈금 슬라이더', clim: '🌍 담수 유입 슬라이더 · 침강 세기 계기', chain: '🔗 인과 사슬 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.view === 'tank') tpUpdate(dt);
    S.cards.forEach((c) => { if (c.shake > 0) c.shake = Math.max(0, c.shake - dt); });
    if (S.view === 'sect' && secCorrect() && !S.spreadOn) { S.spreadOn = true; setTw(S, 'spread', 1, 4, 'inOutQuad'); }
    if (S.view === 'loop' && S.playing) S.loopT += LOOPRATE() * dt;
    S.Fd = approach(S.Fd, S.F, dt, 6);
    if (S.F === 3 && strengthF(3) === 0 && S.view === 'clim') S.found = true;
    if (S.view === 'chain') chainBoard.update(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e6f1fa'; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'tank') drawTank(t, dt);
    else if (S.view === 'sect') drawSect(t, dt);
    else if (S.view === 'loop') drawLoop(t, dt);
    else if (S.view === 'clim') drawClim(t, dt);
    else drawChain(t);
    parts.draw(ctx);
    drawFlash(dt, 10);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, LY, SEP, LPP, MASSES, DY, chainBoard, LOOP_LEG, strengthF, salF, rhoF, tkG, secTray,
    get game() { return game; },
    enterLevel, setView, resetTank, tpDelta, secDrop, latOfX, nearestBand,
    setF(v) { S.F = v; setSlider(sMelt, oMelt, v, meltTxt); },
    solveChain() { chainBoard.cards.forEach((c) => { c.zone = c.ans; }); chainBoard.layout(true); },
    solveSect() { S.cards.forEach((c) => { const m = MASSES[c.id]; c.placed = true; c.band = m.band; c.my = SEP.gy(BANDS[m.band].c); }); },
  };

})();
