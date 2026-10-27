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
     지구과학 Ⅰ. 대기와 해양의 상호작용 - 수온·염분·용존 산소
     [12지구01-01] 해수의 온도, 염분, 용존 산소량 등의 분포를 실측 자료로 분석·해석
     ① 관찰: 위성 색 지도와 ARGO 부이   ② 분석: 위도별 수온·염분, 연직 수온
     ③ 탐구: 용존 산소(포화 값, 연직 분포)   ④ 분석: 두 해역의 자료 비교
     모든 수치는 교육용 '예시 자료'예요.
     ========================================================= */
  initStage('#e6f1fa', 800, 560, 600, 840, 1.25);
  const sq = Math.sqrt;
  const RAD = Math.PI / 180;
  const SRC_LINE = '실제 자료는 기상청·국립해양조사원·ARGO 누리집에서 확인해 볼 수 있어요.';

  /* ---------- 자료 (모두 예시) ---------- */
  const LATS = [0, 20, 40, 60, 80];
  const SST = [28, 25, 14, 4, -1.5];          // 위도별 표층 수온 (°C)
  const SSS = [34.6, 35.8, 35.0, 33.8, 33.0]; // 위도별 표층 염분 (psu)
  const EP = [-400, 900, 150, -500, -650];    // 증발량 − 강수량 (mm/년): 양수면 증발이 많아요
  const DEPTHS = [0, 100, 200, 500, 1000, 2000, 4000];
  const PROF = {
    low: { name: '저위도', col: '#ef4444', T: [28, 26, 18, 8, 5, 3.4, 1.8] },
    midS: { name: '중위도 여름', col: '#f59e0b', T: [22, 12, 10, 8, 5, 3.2, 2] },
    midW: { name: '중위도 겨울', col: '#2563eb', T: [12, 12, 12, 11, 5, 3.2, 2] },
    high: { name: '고위도', col: '#7c3aed', T: [4, 3.5, 3.5, 3.2, 3, 2.3, 1.5] },
  };
  Object.keys(PROF).forEach((k) => { const p = PROF[k]; p.fn = monoFn(DEPTHS.map(sq), p.T); p.at = (d) => p.fn(sq(d)); });
  const BUOYS = {
    low: { name: '저위도 부이', lon: -140, lat: 3, prof: 'low', col: '#ef4444' },
    mid: { name: '중위도 부이', lon: -45, lat: 40, prof: 'midS', col: '#f59e0b' },
    high: { name: '고위도 부이', lon: -30, lat: 60, prof: 'high', col: '#7c3aed' },
  };
  const BKEYS = ['low', 'mid', 'high'];
  const SAT_T = [0, 10, 20, 30], SAT_V = [8.0, 6.4, 5.3, 4.4];     // 포화 용존 산소 (mL/L)
  const satFn = monoFn(SAT_T, SAT_V);
  const O2D = [0, 100, 500, 1000, 2000, 4000];
  const O2 = {
    low: { name: '저위도', col: '#ef4444', v: [4.7, 4.8, 1.2, 1.8, 3.5, 4.5] },
    high: { name: '고위도', col: '#2563eb', v: [7.0, 6.9, 6.5, 6.2, 6.1, 6.0] },
  };
  Object.keys(O2).forEach((k) => { const p = O2[k]; p.fn = monoFn(O2D.map(sq), p.v); p.at = (d) => p.fn(sq(d)); });
  const AREA = {
    A: { name: '해역 A', sub: '적도 태평양', col: '#ef4444', T0: 28, T1: 5, S0: 34.4, S1: 34.6, O0: 4.5, O1: 0.8 },
    B: { name: '해역 B', sub: '북대서양 고위도', col: '#2563eb', T0: 4, T1: 3.5, S0: 34.9, S1: 34.9, O0: 7.0, O1: 6.2 },
  };

  /* 위성 지도: 위도 띠 + 완만한 지역 차이 (위도별 평균은 위 표와 같아요) */
  const zT = monoFn([0, 20, 40, 60, 80, 90], [28, 25, 14, 4, -1.5, -1.8]);
  const zS = monoFn([0, 20, 40, 60, 80, 90], [34.6, 35.8, 35.0, 33.8, 33.0, 32.9]);
  const satT = (lon, lat) => zT(Math.abs(lat)) + 1.1 * Math.cos(lat * RAD) * Math.sin((lon + 30) * RAD * 1.5);
  const satS = (lon, lat) => zS(Math.abs(lat)) + 0.3 * Math.cos(lat * RAD) * Math.sin((lon - 40) * RAD * 1.2);
  const TCOLS = ['#3b1f8c', '#2563eb', '#06b6d4', '#22c55e', '#eab308', '#f97316', '#dc2626'];
  const SCOLS = ['#134e4a', '#0f766e', '#14b8a6', '#a7f3d0', '#fde68a', '#f59e0b', '#92400e'];
  const T_MIN = -2, T_MAX = 30, S_MIN = 32.5, S_MAX = 36.2;
  const tColor = (v) => colorStops(TCOLS, (v - T_MIN) / (T_MAX - T_MIN));
  const sColor = (v) => colorStops(SCOLS, (v - S_MIN) / (S_MAX - S_MIN));

  /* 대륙(단순화한 [경도, 위도] 목록) */
  const LAND = [
    [[-168, 66], [-162, 70], [-156, 71.5], [-141, 70], [-128, 70], [-115, 68], [-100, 69], [-95, 72], [-85, 69.5], [-81, 63], [-93, 59], [-92, 57], [-85, 55], [-80, 52], [-79, 56], [-78, 62], [-72, 61], [-65, 59], [-61, 56], [-56, 52], [-60, 48], [-65, 49], [-65, 45], [-70, 43], [-74, 40], [-76, 35], [-81, 31], [-80, 26], [-82, 26], [-84, 30], [-89, 30], [-94, 29], [-97, 26], [-97, 22], [-95, 19], [-91, 19], [-90, 21], [-87, 21], [-88, 16], [-84, 15], [-83, 10], [-80, 8], [-77, 8.5], [-79, 7], [-82, 8], [-86, 11], [-91, 14], [-96, 16], [-105, 20], [-110, 24], [-113, 31], [-117, 33], [-121, 35], [-124, 40], [-124, 46], [-125, 50], [-130, 55], [-136, 58], [-140, 60], [-148, 61], [-152, 59], [-158, 57], [-164, 55], [-166, 59], [-165, 63]],
    [[-77, 8.5], [-72, 12], [-64, 10.5], [-60, 8], [-52, 5], [-50, 0], [-44, -2], [-35, -5], [-35, -8], [-39, -14], [-41, -22], [-48, -26], [-49, -30], [-53, -34], [-57, -35], [-58, -39], [-62, -40], [-65, -45], [-68, -50], [-69, -53], [-72, -54], [-75, -50], [-73, -42], [-73, -37], [-71, -30], [-70, -18], [-76, -14], [-81, -6], [-80, -1], [-80, 1], [-78, 3], [-77, 7]],
    [[-10, 36], [-9, 43], [-2, 43.5], [-1, 46], [-4, 48], [-1, 49], [2, 51], [5, 53], [8, 54], [9, 57], [11, 56], [12, 54], [18, 55], [21, 57], [24, 59], [30, 60], [24, 60], [22, 65], [17, 62], [18, 59], [15, 56], [11, 59], [5, 59], [5, 62], [13, 66], [18, 69], [25, 71], [31, 70], [40, 67], [44, 68], [41, 66], [44, 66], [55, 69], [68, 69], [69, 73], [80, 73], [87, 75], [100, 78], [112, 76], [125, 73], [140, 72], [150, 71], [160, 70], [170, 70], [180, 69], [180, 65], [178, 62], [170, 60], [164, 60], [162, 56], [156, 51], [155, 57], [150, 59], [143, 59], [137, 54], [141, 52], [141, 47], [135, 43], [131, 43], [129, 40], [129, 36], [126, 35], [126, 38], [125, 40], [121, 39], [122, 37], [119, 35], [121, 32], [122, 30], [120, 26], [115, 23], [110, 21], [108, 21], [106, 17], [109, 12], [105, 9], [103, 10], [100, 13], [100, 8], [103, 2], [100, 4], [98, 9], [98, 16], [94, 17], [92, 22], [88, 22], [86, 20], [80, 15], [78, 9], [77, 8], [73, 17], [72, 21], [69, 22], [67, 25], [62, 25], [57, 26], [56, 27], [51, 28], [48, 30], [50, 26], [52, 24], [56, 24], [58, 21], [55, 17], [52, 16], [44, 12.5], [42, 16], [39, 22], [35, 28], [34, 31], [35, 34], [36, 36], [32, 36], [28, 36.5], [27, 38], [26, 40], [29, 41], [28, 42], [26, 41], [24, 40], [23, 38], [21, 38], [19, 41], [19, 43], [15, 45], [13, 45.5], [12, 44], [16, 41], [18, 40], [16, 38], [15.5, 40], [12, 42], [10, 44], [7, 43.5], [3, 43], [3, 42], [0, 39], [-1, 37], [-5, 36], [-9, 37]],
    [[-17, 21], [-16, 24], [-13, 28], [-10, 30], [-9, 33], [-6, 35.8], [-2, 35], [3, 37], [10, 37], [11, 34], [15, 32], [20, 31], [25, 32], [32, 31], [34, 28], [37, 22], [39, 15], [43, 12], [51, 12], [48, 6], [43, -1], [40, -4], [40, -10], [40, -15], [35, -20], [35, -24], [32, -28], [30, -31], [26, -34], [20, -35], [18, -33], [15, -28], [12, -18], [13, -10], [12, -5], [9, -1], [9, 4], [6, 4.5], [3, 6], [-2, 5], [-8, 4.5], [-12, 7], [-15, 11], [-17, 14.5]],
    [[114, -22], [122, -18], [126, -14], [130, -12], [136, -12], [136, -15], [140, -17], [142, -11], [145, -15], [146, -19], [153, -26], [151, -34], [147, -38], [141, -38], [138, -35], [135, -34], [131, -31], [124, -33], [115, -34], [113, -26]],
    [[-73, 78], [-60, 82], [-30, 83.5], [-20, 80], [-18, 72], [-22, 70], [-32, 68], [-40, 65], [-43, 60], [-48, 61], [-52, 65], [-54, 68], [-58, 72], [-68, 76]],
    [[-180, -72], [-170, -77], [-155, -78], [-135, -75], [-115, -74], [-100, -73], [-80, -73], [-70, -70], [-62, -65], [-58, -63], [-62, -68], [-60, -73], [-55, -78], [-40, -78], [-30, -74], [-15, -70], [0, -70], [15, -69], [30, -69], [50, -67], [65, -67], [80, -67], [100, -66], [115, -66], [135, -66], [150, -69], [165, -71], [180, -72], [180, -90], [-180, -90]],
    [[-5, 50], [1, 51], [2, 53], [0, 54], [-2, 57], [-3, 59], [-6, 58], [-5, 55], [-3, 54], [-5, 52]],
    [[130, 31], [132, 33], [135, 34], [139, 35], [141, 38], [142, 40], [142, 43], [145, 44], [141, 45], [139, 41], [137, 37], [135, 36], [131, 34]],
    [[95, 5], [98, 4], [104, -3], [106, -6], [102, -4], [98, 0]],
    [[109, 2], [113, 5], [117, 7], [119, 1], [116, -4], [111, -3]],
    [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
    [[172, -34], [175, -37], [178, -38], [176, -41], [172, -41], [167, -46], [170, -46], [173, -43]],
    [[-24, 64], [-14, 65], [-14, 64], [-20, 63]],
    [[131, -1], [138, -2], [145, -5], [150, -10], [142, -9], [138, -8], [133, -4]],
  ];
  function inPoly(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const isLand = (lon, lat) => LAND.some((p) => inPoly(p, lon, lat));
  /* 그 밖의 ARGO 부이(흐리게 보여 주는 장식): 고정된 난수로 바다 위에 흩뿌려요 */
  const DECOY = [];
  (function () {
    let seed = 20240607; const rn = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    let guard = 0;
    while (DECOY.length < 110 && guard++ < 4000) {
      const lon = -180 + rn() * 360, lat = -70 + rn() * 145;
      if (isLand(lon, lat)) continue;
      if (BKEYS.some((k) => Math.hypot((BUOYS[k].lon - lon) * 0.7, BUOYS[k].lat - lat) < 9)) continue;
      DECOY.push({ lon, lat });
    }
  })();

  /* ---------- 화면 배치 ---------- */
  const LY = PHONE ? {
    map: { x: 12, y: 12, w: 576, h: 256 }, cyc: { x: 12, y: 280, w: 208, h: 300 }, prof: { x: 232, y: 280, w: 356, h: 300 }, info: { x: 12, y: 592, w: 576, h: 236 },
    sst: { x: 12, y: 12, w: 576, h: 250 }, sss: { x: 12, y: 272, w: 576, h: 250 }, latInfo: { x: 12, y: 532, w: 576, h: 296 },
    pf: { x: 12, y: 12, w: 576, h: 530 }, pfInfo: { x: 12, y: 552, w: 576, h: 276 },
    ep: { x: 12, y: 12, w: 576, h: 500 }, epInfo: { x: 12, y: 522, w: 576, h: 306 },
    sScene: { x: 12, y: 12, w: 576, h: 290 }, sGraph: { x: 12, y: 312, w: 576, h: 262 }, sTable: { x: 12, y: 584, w: 576, h: 244 },
    oPlot: { x: 12, y: 12, w: 576, h: 300 }, oZone: { x: 12, y: 322, w: 576 }, oTray: { x: 12, y: 606, w: 576, h: 222 },
    cT: { x: 12, y: 12, w: 576, h: 246 }, cO: { x: 12, y: 268, w: 576, h: 246 }, cTab: { x: 12, y: 524, w: 576, h: 304 },
  } : {
    map: { x: 12, y: 10, w: 500, h: 222 }, cyc: { x: 524, y: 10, w: 264, h: 222 }, prof: { x: 12, y: 244, w: 500, h: 306 }, info: { x: 524, y: 244, w: 264, h: 306 },
    sst: { x: 12, y: 10, w: 500, h: 252 }, sss: { x: 12, y: 272, w: 500, h: 252 }, latInfo: { x: 524, y: 10, w: 264, h: 514 },
    pf: { x: 12, y: 10, w: 520, h: 540 }, pfInfo: { x: 544, y: 10, w: 244, h: 540 },
    ep: { x: 12, y: 10, w: 776, h: 400 }, epInfo: { x: 12, y: 420, w: 776, h: 130 },
    sScene: { x: 12, y: 10, w: 300, h: 540 }, sGraph: { x: 324, y: 10, w: 464, h: 300 }, sTable: { x: 324, y: 322, w: 464, h: 228 },
    oPlot: { x: 12, y: 10, w: 448, h: 390 }, oZone: { x: 472, y: 10, w: 316 }, oTray: { x: 12, y: 412, w: 776, h: 138 },
    cT: { x: 12, y: 10, w: 388, h: 300 }, cO: { x: 412, y: 10, w: 376, h: 300 }, cTab: { x: 12, y: 322, w: 776, h: 228 },
  };

  /* ---------- 위성 색 지도 (미리 그려 두기) ---------- */
  const mapImg = {};
  function buildMap(kind) {
    const R = LY.map, cv = document.createElement('canvas');
    cv.width = Math.round(R.w * 1.5); cv.height = Math.round(R.h * 1.5);
    const c = cv.getContext('2d'), cs = 3, nx = Math.ceil(cv.width / cs), ny = Math.ceil(cv.height / cs);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const lon = -180 + ((i + 0.5) * cs / cv.width) * 360, lat = 80 - ((j + 0.5) * cs / cv.height) * 160;
      c.fillStyle = kind === 'sst' ? tColor(satT(lon, lat)) : sColor(satS(lon, lat));
      c.fillRect(i * cs, j * cs, cs, cs);
    }
    return cv;
  }
  mapImg.sst = buildMap('sst'); mapImg.sss = buildMap('sss');
  const mapXY = (lon, lat) => [LY.map.x + ((lon + 180) / 360) * LY.map.w, LY.map.y + ((80 - lat) / 160) * LY.map.h];
  const mapLL = (x, y) => [-180 + ((x - LY.map.x) / LY.map.w) * 360, 80 - ((y - LY.map.y) / LY.map.h) * 160];

  /* ---------- 상태 ---------- */
  const S = {
    view: 'map', clock: 0,
    mapMode: 'sst', mapPrev: 'sst', scan: 1,
    buoy: null, prog: 0, depth: 200, read: { low: false, mid: false, high: false }, probe: null,
    cycT: 0,
    // 2단계
    pts: { t: {}, s: {} },            // 놓은 점 {lat: {y, a}}
    handles: null, drag: null, flag: null, flagBad: 0,
    pfPick: {}, pfOrder: ['midW', 'low', 'high', 'midS'],
    evap: false, evK: 0,
    // 3단계
    temp: 20, tempS: 20, rec: {}, o2: { show: 0 },
    // 4단계
    cmpA: null, cmpR: null, cmpStage: 0,
    fade: 0, okFlash: 0,
  };
  let game = null;
  const missionIdx = () => (game && game.current() ? game.current()._index : 0);


  const tx = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const pathPoly = (poly) => { ctx.beginPath(); poly.forEach((p, i) => { const q = mapXY(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); };
  const latTxt = (lat) => Math.abs(Math.round(lat)) + '°' + (lat >= 0 ? 'N' : 'S');
  const lonTxt = (lon) => Math.abs(Math.round(lon)) + '°' + (lon >= 0 ? 'E' : 'W');

  /* ---------- 지도 ---------- */
  function drawMap(t) {
    const R = LY.map;
    ctx.save(); rr(R.x, R.y, R.w, R.h, 12).clip();
    ctx.drawImage(mapImg[S.mapPrev], R.x, R.y, R.w, R.h);
    if (S.scan < 1) {
      const sx = R.x + R.w * S.scan;
      ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, sx - R.x, R.h); ctx.clip(); ctx.drawImage(mapImg[S.mapMode], R.x, R.y, R.w, R.h); ctx.restore();
      const g = ctx.createLinearGradient(sx - 40, 0, sx, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.6)');
      ctx.fillStyle = g; ctx.fillRect(sx - 40, R.y, 40, R.h); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(sx - 1.5, R.y, 3, R.h);
    } else ctx.drawImage(mapImg[S.mapMode], R.x, R.y, R.w, R.h);
    // 위도선
    ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1;
    [-60, -40, -20, 0, 20, 40, 60].forEach((la) => { const y = mapXY(0, la)[1]; ctx.beginPath(); ctx.moveTo(R.x, y); ctx.lineTo(R.x + R.w, y); ctx.stroke(); });
    ctx.setLineDash([]);
    LAND.forEach((p) => { pathPoly(p); ctx.fillStyle = '#ece6d6'; ctx.fill(); ctx.strokeStyle = '#b9b095'; ctx.lineWidth = 1; ctx.stroke(); });
    [-40, 0, 40].forEach((la) => D.text(R.x + 5, mapXY(0, la)[1] - 3, latTxt(la).replace('0°N', '0°'), { size: 12, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(15,40,70,.55)', strokeWidth: 3 }));
    // 그 밖의 부이 (장식)
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = 'rgba(15,40,70,.55)'; ctx.lineWidth = 0.8;
    DECOY.forEach((d) => { const q = mapXY(d.lon, d.lat); ctx.beginPath(); ctx.arc(q[0], q[1], 1.9, 0, TAU); ctx.fill(); ctx.stroke(); });
    // 위성
    const sxp = R.x + R.w * 0.66, syp = R.y + 22 + Math.sin(t * 1.3) * 2;
    ctx.save(); ctx.translate(sxp, syp); ctx.rotate(-0.35);
    ctx.fillStyle = '#334155'; ctx.fillRect(-26, -4, 18, 8); ctx.fillRect(8, -4, 18, 8);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.strokeRect(-26, -4, 18, 8); ctx.strokeRect(8, -4, 18, 8);
    ctx.fillStyle = '#e2e8f0'; rr(-8, -8, 16, 16, 3).fill(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; rr(-8, -8, 16, 16, 3).stroke();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(0, 11, 4, 0, Math.PI); ctx.fill(); ctx.restore();
    if (S.scan < 1) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(sxp, syp + 14); ctx.lineTo(R.x + R.w * S.scan, R.y + R.h * 0.55); ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
    // 제목·꼬리표·색 막대
    D.label(R.x + 10, R.y + 17, S.mapMode === 'sst' ? '위성 영상 · 표층 수온 (연평균)' : '위성 영상 · 표층 염분 (연평균)', { bg: 'rgba(15,40,70,.78)', size: 13, pad: 8, align: 'left' });
    dataTag(R.x + R.w - 10, R.y + 17, '예시 자료', 'right');
    const bx = R.x + 12, by = R.y + R.h - 20, bw = PHONE ? 190 : 170;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.82)'; rr(bx - 6, by - 17, bw + 12, 36, 8).fill(); ctx.restore();
    const lg = ctx.createLinearGradient(bx, 0, bx + bw, 0); const stops = S.mapMode === 'sst' ? TCOLS : SCOLS; stops.forEach((c, i) => lg.addColorStop(i / (stops.length - 1), c));
    ctx.fillStyle = lg; rr(bx, by - 11, bw, 9, 4).fill();
    tx(bx, by + 11, S.mapMode === 'sst' ? '−2' : '32.5', 12, '#334155'); tx(bx + bw, by + 11, S.mapMode === 'sst' ? '30 °C' : '36.2 psu', 12, '#334155', 'right');
    // 선택 가능한 부이
    BKEYS.forEach((k) => {
      const b = BUOYS[k], q = mapXY(b.lon, b.lat), sel = S.buoy === k, bob = RM ? 0 : Math.sin(t * 2 + q[0]) * 1.2;
      if (sel) D.ring(q[0], q[1] + bob, 12, t, { color: '#ffffff', speed: 1.1, width: 2.5 });
      else if (!S.read[k]) D.ring(q[0], q[1] + bob, 11, t + q[0] * 0.01, { color: b.col, speed: 0.8, width: 2 });
      D.sphere(q[0], q[1] + bob, sel ? 8 : 7, b.col, { outline: '#fff', outlineWidth: 2, shadow: true });
      if (S.read[k]) D.check(q[0] + 9, q[1] - 9, 6.5, 1);
      D.label(q[0], q[1] + (k === 'high' ? -19 : 20), k === 'low' ? '저위도' : k === 'mid' ? '중위도' : '고위도', { bg: sel ? b.col : 'rgba(255,255,255,.9)', color: sel ? '#fff' : '#1e293b', size: 12.5, pad: 6 });
    });
    if (S.probe) {
      const q = mapXY(S.probe.lon, S.probe.lat);
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.moveTo(q[0] - 9, q[1]); ctx.lineTo(q[0] + 9, q[1]); ctx.moveTo(q[0], q[1] - 9); ctx.lineTo(q[0], q[1] + 9); ctx.stroke(); ctx.restore();
      const v = S.mapMode === 'sst' ? satT(S.probe.lon, S.probe.lat) : satS(S.probe.lon, S.probe.lat);
      const txt = S.mapMode === 'sst' ? f1(v) + ' °C' : f1(v) + ' psu';
      D.label(clamp(q[0], R.x + 40, R.x + R.w - 40), q[1] < R.y + 60 ? q[1] + 22 : q[1] - 16, txt, { bg: '#0f172a', size: 13, pad: 7 });
    }
  }

  /* ---------- ARGO 부이 10일 주기 ---------- */
  const CY = [['하강', 1.6, 0.4], ['표류', 4.4, 8.4], ['더 깊이', 1.4, 0.3], ['상승·측정', 3.2, 0.4], ['전송', 1.6, 0.5]];
  const CY_TOT = CY.reduce((a, c) => a + c[1], 0);
  const CY_CAP = ['① 수면에서 1000 m까지 내려가요', '② 약 9일 동안 1000 m 깊이에서 해류를 따라 떠다녀요', '③ 2000 m까지 더 내려가요', '④ 올라오면서 수온·염분을 재요', '⑤ 수면에서 위성으로 자료를 보내요'];
  function cycAt(tt) {
    let a = 0, days = 0;
    for (let i = 0; i < CY.length; i++) {
      if (tt < a + CY[i][1] || i === CY.length - 1) {
        const u = clamp((tt - a) / CY[i][1], 0, 1), e = smooth(u);
        let depth = 0, dx = -1;
        if (i === 0) { depth = 1000 * e; dx = -1; }
        else if (i === 1) { depth = 1000; dx = -1 + 2 * e; }
        else if (i === 2) { depth = 1000 + 1000 * e; dx = 1; }
        else if (i === 3) { depth = 2000 * (1 - u); dx = 1 - 2 * u; }
        else { depth = 0; dx = -1; }
        return { i, u, depth, dx, day: days + u * CY[i][2] };
      }
      a += CY[i][1]; days += CY[i][2];
    }
  }
  function drawCycle(R, t) {
    const c = cycAt(S.cycT), x0 = R.x + (PHONE ? 70 : 60), x1 = R.x + R.w - 12, surf = R.y + (PHONE ? 78 : 70), bot = R.y + R.h - (PHONE ? 84 : 54);
    const yOf = (d) => surf + (bot - surf) * (d / 2000);
    panel(R.x, R.y, R.w, R.h);
    ctx.save(); rr(R.x, R.y, R.w, R.h, 14).clip();
    const sky = ctx.createLinearGradient(0, R.y, 0, surf); sky.addColorStop(0, '#e8f4ff'); sky.addColorStop(1, '#cfe8fb'); ctx.fillStyle = sky; ctx.fillRect(R.x, R.y, R.w, surf - R.y + 2);
    const sea = ctx.createLinearGradient(0, surf, 0, bot + 30); sea.addColorStop(0, '#7fd0ee'); sea.addColorStop(0.45, '#2a8fc4'); sea.addColorStop(1, '#0b3a6b'); ctx.fillStyle = sea; ctx.fillRect(R.x, surf, R.w, R.y + R.h - surf);
    ctx.restore();
    tx(R.x + 12, R.y + 21, 'ARGO 부이의 10일', 14.5, '#334155', 'left', 800);
    // 깊이 눈금
    [0, 1000, 2000].forEach((d) => { const y = yOf(d); ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x0 - 4, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]); D.text(x0 - 7, y + 4.5, d + (d === 2000 ? ' m' : ''), { size: 12.5, weight: 800, color: d === 0 ? '#334155' : '#e6f4ff', align: 'right' }); });
    // 수면 물결
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = R.x; x <= R.x + R.w; x += 4) { const y = surf + Math.sin(x * 0.12 + t * 2) * 1.6; x === R.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    // 위성
    const cx0 = (x0 + x1) / 2, span = (x1 - x0) * 0.2, bx = cx0 + c.dx * span, by = yOf(c.depth);
    const sx = x1 - 26, sy = R.y + 40;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.4);
    ctx.fillStyle = '#334155'; ctx.fillRect(-20, -3.5, 14, 7); ctx.fillRect(6, -3.5, 14, 7); ctx.fillStyle = '#e2e8f0'; rr(-6, -6, 12, 12, 3).fill(); ctx.restore();
    // 표류 자취
    if (c.i >= 1) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(cx0 - span, yOf(1000)); ctx.lineTo(cx0 + span * (c.i === 1 ? c.dx : 1), yOf(1000)); ctx.stroke(); ctx.setLineDash([]); }
    // 측정 점 (올라오면서 색으로 표시)
    const prof = S.buoy ? PROF[BUOYS[S.buoy].prof] : null;
    let al = c.i === 3 ? 1 : c.i === 4 ? 1 - c.u : 0;
    if (al > 0) for (let d = 2000; d >= 0; d -= 100) {
      if (c.i === 3 && d < c.depth) continue;
      const px = cx0 + (1 - 2 * (1 - d / 2000)) * span;
      ctx.globalAlpha = al; D.sphere(px, yOf(d), 3.4, prof ? tColor(prof.at(d)) : '#ffffff', { gloss: false, outline: 'rgba(255,255,255,.9)', outlineWidth: 1 }); ctx.globalAlpha = 1;
    }
    // 전송 파동
    if (c.i === 4) {
      const dist = Math.hypot(sx - bx, sy - surf), ang = Math.atan2(sy - surf, sx - bx);
      for (let k = 0; k < 3; k++) { const ph = (c.u * 2.2 + k / 3) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * (1 - ph)) + ')'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(bx, surf - 6, 8 + ph * dist * 0.85, ang - 0.38, ang + 0.38); ctx.stroke(); }
      D.glow(sx, sy, 16 + Math.sin(t * 12) * 3, '#fde047', 0.5);
    }
    // 부이
    ctx.save(); ctx.translate(bx, by);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(0, -10); ctx.stroke();
    D.shadow(() => { ctx.fillStyle = '#f97316'; rr(-5, -10, 10, 22, 5).fill(); }, { blur: 3, y: 1 });
    ctx.fillStyle = '#fff'; ctx.fillRect(-5, -2, 10, 3); ctx.restore();
    // 설명
    const cap = CY_CAP[c.i];
    if (PHONE) D.label(R.x + 12, R.y + 46, '약 ' + Math.floor(c.day) + '일째', { bg: '#0f172a', size: 12.5, pad: 7, align: 'left' });
    else D.label(R.x + R.w - 10, R.y + 17, '약 ' + Math.floor(c.day) + '일째', { bg: '#0f172a', size: 12.5, pad: 7, align: 'right' });
    drawWrap(R.x + R.w / 2, R.y + R.h - (PHONE ? 64 : 30), cap, R.w - 20, 13, { color: '#fff', lh: 1.25, weight: 800 });
    ctx.save(); ctx.globalAlpha = 0; ctx.restore();
  }

  /* ---------- 연직 수온 그래프 (ARGO) ---------- */
  const profBox = (R) => plotFrame(R, { l: PHONE ? 70 : 58, r: 14, t: 38, b: 40, xmin: 0, xmax: 30, ymin: 0, ymax: 4000, fy: sq, yDown: true, xticks: [0, 10, 20, 30], yticks: DEPTHS, xlabel: '수온 (°C)', ylabel: '깊이 (m)', size: 12 });
  function curvePts(P, fn, dmax) {
    const pts = []; const n = 70, u1 = sq(dmax);
    for (let i = 0; i <= n; i++) { const u = (u1 * i) / n, d = u * u; pts.push([P.gx(fn(d)), P.gy(d)]); }
    return pts;
  }
  function drawProfile(R, t) {
    panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, S.buoy ? BUOYS[S.buoy].name + '의 연직 수온' : 'ARGO 연직 수온', 14.5, '#334155', 'left', 800);
    dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    const P = profBox(R);
    // ARGO가 내려가지 못하는 깊이
    ctx.save(); ctx.fillStyle = 'rgba(100,116,139,.13)'; ctx.fillRect(P.x0, P.gy(2000), P.x1 - P.x0, P.y1 - P.gy(2000)); ctx.restore();
    D.text(P.x1 - 6, P.gy(2000) + 17, 'ARGO가 재지 못하는 깊이', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(P.x0, P.gy(2000)); ctx.lineTo(P.x1, P.gy(2000)); ctx.stroke(); ctx.restore();
    if (!S.buoy) {
      D.text((P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2 - 20, '지도에서 부이(●)를 눌러 보세요', { size: 14.5, weight: 800, color: '#475569' });
      const bob = RM ? 0 : Math.sin(t * 3) * 3; D.arrow((P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2 - 8 + bob, (P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2 - 38 + bob, { color: '#0ea5e9', width: 4 });
      return;
    }
    const b = BUOYS[S.buoy], prof = PROF[b.prof], dmax = Math.max(1, 2000 * S.prog);
    ctx.save(); ctx.beginPath(); ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.clip();
    // 수온 약층 띠: 가장 가파른 구간을 옅게 표시
    polyline(curvePts(P, prof.at, dmax), b.col, 4);
    ctx.restore();
    DEPTHS.forEach((d, i) => { if (d <= 2000 && d <= dmax) D.sphere(P.gx(prof.T[i]), P.gy(d), 4.5, b.col, { gloss: false, outline: '#fff', outlineWidth: 1.5 }); });
    // 읽기 커서
    const dd = S.depth;
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(P.x0, P.gy(dd)); ctx.lineTo(P.x1, P.gy(dd)); ctx.stroke(); ctx.restore();
    if (dd <= dmax + 1) {
      const v = prof.at(dd), px = P.gx(v), py = P.gy(dd);
      D.sphere(px, py, 7, '#0ea5e9', { outline: '#fff', outlineWidth: 2.5, shadow: true });
      ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(14,165,233,.6)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, P.y1); ctx.stroke(); ctx.restore();
      D.label(clamp(px + 44, P.x0 + 56, P.x1 - 46), clamp(py - 18, P.y0 + 12, P.y1 - 12), dd + ' m · ' + f1(v) + ' °C', { bg: '#0f172a', size: 13, pad: 7 });
    }
  }

  /* ---------- 읽기 칸 ---------- */
  function drawInfo1(R) {
    panel(R.x, R.y, R.w, R.h);
    const px = R.x + 12, W = R.w - 24;
    tx(px, R.y + 22, '지도와 부이에서 읽기', 14.5, '#334155', 'left', 800);
    let y = R.y + 22 + 26 * FS * 0.85;
    if (S.buoy) {
      const b = BUOYS[S.buoy], v = PROF[b.prof].at(S.depth);
      D.sphere(px + 7, y - 5, 7, b.col, { gloss: false });
      tx(px + 20, y, b.name + ' (' + latTxt(b.lat) + ', ' + lonTxt(b.lon) + ')', 14, '#1e293b', 'left', 800);
      y += 28 * FS * 0.85;
      tx(px, y, '수심 ' + S.depth + ' m 수온', 14, '#475569'); tx(R.x + R.w - 12, y + 2, f1(v) + ' °C', 21, '#0f172a', 'right', 800);
    } else {
      tx(px, y, '부이를 고르면 값이 나와요', 14, '#475569', 'left', 700);
    }
    y += 30 * FS * 0.85;
    tx(px, y, '수심 200 m 수온을 읽었나요?', 13.5, '#475569', 'left', 800);
    y += 24 * FS * 0.85;
    BKEYS.forEach((k, i) => { const xx = px + i * (W / 3); chkBox(xx, y, S.read[k]); tx(xx + 20 * (PHONE ? 1.2 : 1), y, k === 'low' ? '저위도' : k === 'mid' ? '중위도' : '고위도', 13, '#475569', 'left', 800); });
    y += 26 * FS * 0.85;
    if (S.probe) tx(px, y, '지도에서 읽은 곳: ' + latTxt(S.probe.lat) + ' ' + lonTxt(S.probe.lon), 13, '#475569');
    else tx(px, y, '지도를 눌러 그 곳의 표층 값을 읽어요', 13, '#64748b');
    y += 12;
    // 비교표 (태블릿에서만)
    if (PHONE) return;
    const ty = R.y + R.h - 104;
    const cw = [W * 0.2, W * 0.38, W * 0.42], rows = [['', '위성', 'ARGO 부이'], ['범위', '넓은 바다', '한 점'], ['깊이', '표층만', '2000 m까지'], ['주기', '매일', '약 10일']];
    const rh = 24;
    rows.forEach((r, i) => {
      let xx = px;
      if (i === 0) { ctx.fillStyle = '#e8f1fa'; ctx.fillRect(px, ty + i * rh, W, rh); }
      r.forEach((s2, j) => { D.text(xx + cw[j] / 2, ty + i * rh + rh * 0.68, s2, { size: 12.5, weight: i === 0 || j === 0 ? 800 : 700, color: i === 0 ? '#0f4c75' : '#334155' }); xx += cw[j]; });
      ctx.strokeStyle = '#d6e2ee'; ctx.lineWidth = 1; ctx.strokeRect(px, ty + i * rh, W, rh);
    });
  }


  /* =========================================================
     2단계: 위도별 표층 수온·염분 (점 찍기), 깊이별 수온 곡선 짝짓기, 증발−강수와 염분
     ========================================================= */
  const LATBOX = (R, kind) => ({ l: PHONE ? 72 : 58, r: 18, t: 34, b: 38, noDraw: false, xmin: -6, xmax: 90, ymin: kind === 't' ? -10 : 32, ymax: kind === 't' ? 32 : 36.5,
    xticks: LATS, xfmt: (v) => v + '°', yticks: kind === 't' ? [0, 10, 20, 30] : [33, 34, 35, 36], yfmt: (v) => v, size: 12, xlabel: '위도 (°)', ylabel: kind === 't' ? '수온 (°C)' : '염분 (psu)' });
  const GEO = {
    t: plotFrame(LY.sst, Object.assign(LATBOX(LY.sst, 't'), { noDraw: true })),
    s: plotFrame(LY.sss, Object.assign(LATBOX(LY.sss, 's'), { noDraw: true })),
  };
  const HCOL = { t: '#f97316', s: '#0d9488' };
  const LATVAL = { t: SST, s: SSS };
  const TOL = { t: 1.5, s: 0.25 };
  const valAtY = (kind, y) => { const P = GEO[kind], lo = kind === 't' ? -10 : 32, hi = kind === 't' ? 32 : 36.5; return lo + ((P.y1 - y) / (P.y1 - P.y0)) * (hi - lo); };
  const yAtVal = (kind, v) => GEO[kind].gy(v);
  function initHandles() {
    S.handles = [];
    ['t', 's'].forEach((kind) => LATS.forEach((lat, i) => {
      const P = GEO[kind], y0 = P.y1 - 16;
      S.handles.push({ kind, i, lat, x: P.gx(lat), y: y0, home: y0, placed: false, pop: 0, shake: 0 });
    }));
    S.drag = null; S.flag = null;
  }
  initHandles();
  const placedCount = (kind) => S.handles.filter((h) => h.kind === kind && h.placed).length;
  const latDone = () => placedCount('t') === 5 && placedCount('s') === 5;

  function drawLat(t) {
    ['t', 's'].forEach((kind) => {
      const R = kind === 't' ? LY.sst : LY.sss;
      panel(R.x, R.y, R.w, R.h);
      tx(R.x + 12, R.y + 22, kind === 't' ? '위도별 표층 수온' : '위도별 표층 염분', 14.5, '#334155', 'left', 800);
      dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
      const P = plotFrame(R, LATBOX(R, kind));
      const hs = S.handles.filter((h) => h.kind === kind);
      // 안내 선
      hs.forEach((h) => { if (!h.placed) { ctx.save(); ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(h.x, P.y0 + 4); ctx.lineTo(h.x, P.y1); ctx.stroke(); ctx.restore(); } });
      // 이어진 선
      const pl = hs.filter((h) => h.placed).sort((a, b) => a.lat - b.lat);
      if (pl.length >= 2) {
        const f = monoFn(pl.map((h) => h.lat), pl.map((h) => LATVAL[kind][h.i])), pts = [];
        for (let la = pl[0].lat; la <= pl[pl.length - 1].lat + 0.01; la += 1) pts.push([P.gx(la), yAtVal(kind, f(la))]);
        polyline(pts, HCOL[kind], 3.6, { alpha: 0.9 });
      }
      // 손잡이
      hs.forEach((h) => {
        const dragging = S.drag === h;
        const sh = h.shake > 0 ? Math.sin(h.shake * 50) * 4 : 0;
        if (!h.placed && !dragging && !RM) D.ring(h.x + sh, h.y, 12, t + h.i * 0.2, { color: HCOL[kind], speed: 0.7, width: 2 });
        D.sphere(h.x + sh, h.y, dragging ? 11 : 9.5 + h.pop * 3, h.placed ? HCOL[kind] : '#ffffff', { outline: HCOL[kind], outlineWidth: 3, shadow: true, gloss: h.placed });
        if (dragging) {
          const v = valAtY(kind, h.y);
          D.label(clamp(h.x, P.x0 + 44, P.x1 - 44), clamp(h.y - 24, P.y0 + 10, P.y1 - 10), kind === 't' ? f1(v) + ' °C' : f2(v) + ' psu', { bg: '#0f172a', size: 13, pad: 7 });
        } else if (h.placed) {
          D.label(h.x, h.y - 18 - h.pop * 4, kind === 't' ? mk(LATVAL.t[h.i]) : f1(LATVAL.s[h.i]), { bg: HCOL[kind], size: 12.5, pad: 6 });
          if (kind === 's' && S.flag === h.lat) D.ring(h.x, h.y, 17, t, { color: '#dc2626', speed: 1, width: 3 });
        }
      });
      if (kind === 's' && placedCount('s') === 5 && S.flag == null) D.text((P.x0 + P.x1) / 2, P.y1 - 12, '염분이 가장 높은 점을 눌러 보세요', { size: 14, weight: 800, color: '#dc2626' });
    });
    // 오른쪽 표
    const R = LY.latInfo; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '위성 관측 자료표', 14.5, '#334155', 'left', 800); dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    tx(R.x + 12, R.y + 22 + 20 * FS * 0.82, '위도별 평균값 (남·북반구 비슷해요)', 12.5, '#64748b', 'left', 700);
    const ty = R.y + (PHONE ? 58 : 62), rh = PHONE ? 33 : 34, W = R.w - 24, cw = [W * 0.28, W * 0.36, W * 0.36];
    [['위도', '수온 (°C)', '염분 (psu)']].concat(LATS.map((la, i) => [la + '°', mk(SST[i]), f1(SSS[i])])).forEach((r, i) => {
      let xx = R.x + 12;
      if (i === 0) { ctx.fillStyle = '#e8f1fa'; ctx.fillRect(R.x + 12, ty, W, rh); }
      r.forEach((s2, j) => {
        const ok = i > 0 && j > 0 && S.handles.find((h) => h.kind === (j === 1 ? 't' : 's') && h.i === i - 1).placed;
        if (ok) { ctx.fillStyle = 'rgba(22,163,74,.14)'; ctx.fillRect(xx + 1, ty + i * rh + 1, cw[j] - 2, rh - 2); }
        D.text(xx + cw[j] / 2, ty + i * rh + rh * 0.66, s2, { size: i === 0 ? 13 : 16, weight: 800, color: i === 0 ? '#0f4c75' : ok ? '#15803d' : '#1e293b' });
        xx += cw[j];
      });
      ctx.strokeStyle = '#d6e2ee'; ctx.lineWidth = 1; ctx.strokeRect(R.x + 12, ty + i * rh, W, rh);
    });
    const yy = ty + 6 * rh + 14;
    if (!PHONE) drawWrap(R.x + R.w / 2, yy + 8, '◎ 손잡이를 위로 끌어 표의 값에 맞춰 놓으면 점이 찍혀요.', R.w - 28, 13, { color: '#475569', lh: 1.3 });
    const st = '찍은 점  수온 ' + placedCount('t') + '/5 · 염분 ' + placedCount('s') + '/5';
    D.label(R.x + R.w / 2, R.y + R.h - 24, st, { bg: latDone() ? '#15803d' : '#475569', size: 13, pad: 10 });
  }

  /* ---------- 깊이별 수온 곡선 짝짓기 ---------- */
  const PFBOX = { l: PHONE ? 70 : 58, r: 16, t: 66, b: 40, xmin: 0, xmax: 30, ymin: 0, ymax: 4000, fy: sq, yDown: true, xticks: [0, 10, 20, 30], yticks: DEPTHS, xlabel: '수온 (°C)', ylabel: '깊이 (m)', size: 12 };
  const TAGS = ['A', 'B', 'C', 'D'];
  function drawProfView(t) {
    const R = LY.pf; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '깊이에 따른 수온 곡선 4개', 14.5, '#334155', 'left', 800); dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    const P = plotFrame(R, PFBOX);
    ctx.save(); ctx.beginPath(); ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.clip();
    S.pfOrder.forEach((k, i) => { const p = PROF[k]; polyline(curvePts(P, p.at, 4000), p.col, 4); });
    ctx.restore();
    S.pfOrder.forEach((k, i) => {
      const p = PROF[k];
      DEPTHS.forEach((d, j) => D.sphere(P.gx(p.T[j]), P.gy(d), 3.4, p.col, { gloss: false, outline: '#fff', outlineWidth: 1 }));
      const x = P.gx(p.T[0]);
      D.sphere(x, P.y0 - 24, 13, p.col, { outline: '#fff', outlineWidth: 2.5, shadow: true, text: TAGS[i], textScale: 1.0 });
    });
    // 수온 약층 설명 띠 (가장 큰 변화가 나타나는 100~500 m)
    const yA = P.gy(100), yB = P.gy(500);
    ctx.save(); ctx.fillStyle = 'rgba(14,165,233,.07)'; ctx.fillRect(P.x0, yA, P.x1 - P.x0, yB - yA); ctx.restore();
    D.text(P.x1 - 6, (yA + yB) / 2 + 4.5, '100~500 m', { size: 12.5, weight: 800, color: '#0369a1', align: 'right' });
    // 안내 패널
    const I = LY.pfInfo; panel(I.x, I.y, I.w, I.h);
    tx(I.x + 12, I.y + 22, '곡선 이름표 (오른쪽에서 고르기)', 14, '#334155', 'left', 800);
    TAGS.forEach((tg, i) => {
      const k = S.pfOrder[i], pick = S.pfPick[tg], yy = I.y + 52 * (PHONE ? 1.1 : 1) + i * (PHONE ? 38 : 34) * 1;
      D.sphere(I.x + 26, yy, 11, PROF[k].col, { gloss: false, text: tg, textScale: 1.0 });
      D.text(I.x + 46, yy + 5, pick ? '= ' + pick : '= (고르지 않았어요)', { size: 14.5, weight: 800, color: pick ? '#0f172a' : '#94a3b8', align: 'left' });
    });
    const yb = I.y + 52 * (PHONE ? 1.1 : 1) + 4 * (PHONE ? 38 : 34) + 6;
    drawWrap(I.x + I.w / 2, yb + 8, '수온 약층: 깊이에 따라 수온이 급하게 변하는 층. 곡선 모양과 맨 위(표층) 수온이 단서예요.', I.w - 24, 13, { color: '#475569', lh: 1.28 });
  }

  /* ---------- 증발 − 강수와 표층 염분 ---------- */
  const EPBOX = { l: PHONE ? 72 : 60, r: PHONE ? 78 : 70, t: 34, b: 38, xmin: -6, xmax: 90, ymin: 32.5, ymax: 36.5, xticks: LATS, xfmt: (v) => v + '°', yticks: [33, 34, 35, 36], size: 12, xlabel: '위도 (°)', ylabel: '표층 염분 (psu)' };
  const epY = (v, P) => P.y0 + (P.y1 - P.y0) * (0.5 - (v / 2000));
  function drawEvap(t) {
    const R = LY.ep; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '위도별 표층 염분' + (S.evap ? ' + 증발량 − 강수량' : ''), 14.5, '#334155', 'left', 800); dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    const P = plotFrame(R, EPBOX);
    if (S.evK > 0.01) {
      ctx.save(); ctx.globalAlpha = Math.min(1, S.evK);
      const z = epY(0, P); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(P.x0, z); ctx.lineTo(P.x1, z); ctx.stroke(); ctx.setLineDash([]);
      LATS.forEach((la, i) => {
        const v = EP[i] * S.evK, y1 = epY(v, P), x = P.gx(la), w = PHONE ? 36 : 44;
        ctx.fillStyle = v >= 0 ? 'rgba(249,115,22,.55)' : 'rgba(59,130,246,.5)';
        ctx.fillRect(x - w / 2, Math.min(z, y1), w, Math.abs(y1 - z));
        ctx.strokeStyle = v >= 0 ? '#ea580c' : '#2563eb'; ctx.lineWidth = 1.5; ctx.strokeRect(x - w / 2, Math.min(z, y1), w, Math.abs(y1 - z));
      });
      [-1000, -500, 0, 500, 1000].forEach((v) => D.text(P.x1 + 8, epY(v, P) + 4.5, (v < 0 ? '−' : '') + Math.abs(v), { size: 12, weight: 700, color: '#c2410c', align: 'left' }));
      D.text(P.x1 + 8, P.y1 + 18, '증발−강수', { size: 12, weight: 800, color: '#c2410c', align: 'left' });
      D.text(P.x1 + 8, P.y1 + 33, '(mm/년)', { size: 12, weight: 700, color: '#c2410c', align: 'left' });
      ctx.restore();
    }
    const f = monoFn([-1, 0, 20, 40, 60, 80, 85], [34.6, 34.6, 35.8, 35.0, 33.8, 33.0, 32.95]), pts = [];
    for (let la = 0; la <= 80.01; la += 1) pts.push([P.gx(la), P.gy(f(la))]);
    polyline(pts, '#0d9488', 4);
    LATS.forEach((la, i) => {
      D.sphere(P.gx(la), P.gy(SSS[i]), 6, '#0d9488', { outline: '#fff', outlineWidth: 2 });
      D.label(P.gx(la), P.gy(SSS[i]) - 16, f1(SSS[i]), { bg: '#0d9488', size: 12.5, pad: 6 });
    });
    if (S.evK > 0.5) {
      D.text(P.gx(20), epY(0, P) + 17, '증발 > 강수', { size: 12.5, weight: 800, color: '#9a3412', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3.5 });
      D.text(P.gx(0), epY(EP[0] * S.evK, P) + 16, '강수 > 증발', { size: 12.5, weight: 800, color: '#1d4ed8', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3.5 });
    }
    // 아래 표
    const I = LY.epInfo; panel(I.x, I.y, I.w, I.h);
    const W = I.w - 24, cw = [W * 0.2].concat([0.16, 0.16, 0.16, 0.16, 0.16].map((r) => W * r)), rh = PHONE ? 38 : 31, ty = I.y + 12;
    const rows = [['위도'].concat(LATS.map((l) => l + '°')), ['염분 (psu)'].concat(SSS.map(f1)), ['증발−강수'].concat(EP.map((v) => (v < 0 ? '−' : '+') + Math.abs(v)))];
    rows.forEach((r, i) => {
      let xx = I.x + 12;
      if (i === 0) { ctx.fillStyle = '#e8f1fa'; ctx.fillRect(I.x + 12, ty, W, rh); }
      r.forEach((s2, j) => {
        const dim = i === 2 && !S.evap;
        D.text(xx + cw[j] / 2, ty + i * rh + rh * 0.66, dim && j > 0 ? '?' : s2, { size: j === 0 ? 12.5 : 14.5, weight: 800, color: i === 0 ? '#0f4c75' : dim ? '#94a3b8' : (i === 2 && j > 0 ? (EP[j - 1] >= 0 ? '#c2410c' : '#1d4ed8') : '#1e293b') });
        xx += cw[j];
      });
      ctx.strokeStyle = '#d6e2ee'; ctx.lineWidth = 1; ctx.strokeRect(I.x + 12, ty + i * rh, W, rh);
    });
    drawWrap(I.x + I.w / 2, ty + 3 * rh + 22, S.evap ? '증발이 강수보다 많은 곳(+)은 염분이 높고, 강수가 많은 곳(−)은 낮은 경향이 있어요.' : '오른쪽 버튼으로 증발량 − 강수량 막대를 겹쳐 보세요.', I.w - 28, 13.5, { color: '#475569', lh: 1.3 });
  }


  /* =========================================================
     3단계: 포화 용존 산소(수온)와 연직 분포(원인 카드)
     ========================================================= */
  const O2MOL = [];                     // 비커 속 산소 분자 (화면용 입자)
  let o2Acc = 0;
  const satV = (T) => satFn(clamp(T, 0, 30));
  function updateO2Mol(dt) {
    const R = LY.sScene, g = satGeom();
    const want = Math.round(satV(S.tempS) * 6.5);
    o2Acc += dt;
    if (o2Acc > 0.04) {
      o2Acc = 0;
      const live = O2MOL.filter((m) => !m.dying).length;
      if (live < want) O2MOL.push({ x: g.x0 + 10 + Math.random() * (g.x1 - g.x0 - 20), y: g.y0 + 14 + Math.random() * (g.y1 - g.y0 - 24), vx: rnd(-1, 1), vy: rnd(-1, 1), a: Math.random() * TAU, s: 0, dying: false });
      else if (live > want) { const m = O2MOL.find((q) => !q.dying); if (m) m.dying = true; }
    }
    const sp = 14 + (S.tempS / 30) * 40;
    for (let i = O2MOL.length - 1; i >= 0; i--) {
      const m = O2MOL[i];
      m.s = approach(m.s, m.dying ? 0 : 1, dt, 8);
      if (m.dying && m.s < 0.05) { O2MOL.splice(i, 1); continue; }
      const jx = rnd(-1, 1), jy = rnd(-1, 1);
      m.vx = clamp(m.vx + jx * 6 * dt * 60 * 0.1, -1, 1); m.vy = clamp(m.vy + jy * 6 * dt * 60 * 0.1, -1, 1);
      m.x += m.vx * sp * dt; m.y += m.vy * sp * dt; m.a += dt * (1 + S.tempS / 15);
      if (m.x < g.x0 + 8) { m.x = g.x0 + 8; m.vx = Math.abs(m.vx); } if (m.x > g.x1 - 8) { m.x = g.x1 - 8; m.vx = -Math.abs(m.vx); }
      if (m.y < g.y0 + 10) { m.y = g.y0 + 10; m.vy = Math.abs(m.vy); } if (m.y > g.y1 - 10) { m.y = g.y1 - 10; m.vy = -Math.abs(m.vy); }
    }
  }
  /* 비커와 액체의 안쪽 상자 */
  function satGeom() {
    const R = LY.sScene;
    const bx = PHONE ? R.x + 34 : R.x + 34, by = PHONE ? R.y + 40 : R.y + 92, bw = PHONE ? 170 : 150, bh = PHONE ? 214 : 290, level = 0.82;
    return { bx, by, bw, bh, level, x0: bx + 6, x1: bx + bw - 6, y0: by + bh * (1 - level) + 6, y1: by + bh - 8 };
  }
  function drawSat(t) {
    const R = LY.sScene, g = satGeom();
    panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '수온을 바꾸면 녹는 산소가 달라져요', 14, '#334155', 'left', 800);
    const wc = mixc('#8fd3ff', '#ffb98a', S.tempS / 30);
    D.beaker(g.bx, g.by, g.bw, g.bh, { level: g.level, liquid: wc, t, ticks: 5 });
    // 산소 분자
    O2MOL.forEach((m) => {
      const r = 3.1 * m.s, dx = Math.cos(m.a) * 3.2 * m.s, dy = Math.sin(m.a) * 3.2 * m.s;
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2 * m.s; ctx.beginPath(); ctx.moveTo(m.x - dx, m.y - dy); ctx.lineTo(m.x + dx, m.y + dy); ctx.stroke();
      D.sphere(m.x - dx, m.y - dy, r, '#2563eb', { gloss: false }); D.sphere(m.x + dx, m.y + dy, r, '#2563eb', { gloss: false });
    });
    // 가열판 / 얼음
    const plateY = g.by + g.bh + 6;
    const hot = clamp((S.tempS - 12) / 18, 0, 1), cold = clamp((10 - S.tempS) / 10, 0, 1);
    D.shadow(() => { ctx.fillStyle = '#64748b'; rr(g.bx - 8, plateY, g.bw + 16, 14, 6).fill(); }, { blur: 4, y: 2 });
    if (hot > 0.02) { D.glow(g.bx + g.bw / 2, plateY + 6, g.bw * 0.7, '#f97316', 0.55 * hot); ctx.fillStyle = 'rgba(249,115,22,' + (0.35 + 0.5 * hot) + ')'; rr(g.bx - 4, plateY + 2, g.bw + 8, 7, 3).fill(); }
    if (cold > 0.02) { ctx.fillStyle = 'rgba(147,197,253,' + (0.35 + 0.5 * cold) + ')'; rr(g.bx - 4, plateY + 2, g.bw + 8, 7, 3).fill(); for (let i = 0; i < 4; i++) { ctx.save(); ctx.globalAlpha = cold; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.5; const ix = g.bx + 20 + i * ((g.bw - 40) / 3) + Math.sin(t * 1.5 + i) * 2, iy = g.by + g.bh * (1 - g.level) + 6 + Math.sin(t * 2 + i * 2) * 2; rr(ix - 9, iy - 9, 18, 18, 4).fill(); rr(ix - 9, iy - 9, 18, 18, 4).stroke(); ctx.restore(); } }
    // 온도계
    const thx = PHONE ? R.x + 258 : R.x + 232, thy = PHONE ? R.y + 52 : R.y + 104, thh = PHONE ? 170 : 240;
    D.thermometer(thx, thy, thh, S.tempS, 0, 30, { color: mixc('#3b82f6', '#ef4444', S.tempS / 30), step: 10, unit: '°' });
    // 읽기 상자
    const v = satV(S.temp);
    if (PHONE) {
      const bxx = R.x + 330, byy = R.y + 56;
      tx(bxx, byy, '수온', 14, '#475569'); tx(bxx + 230, byy, S.temp + ' °C', 22, '#0f172a', 'right', 800);
      tx(bxx, byy + 40, '포화 용존 산소', 14, '#475569'); tx(bxx + 230, byy + 82, f1(v), 36, '#1d4ed8', 'right', 800); tx(bxx + 230, byy + 106, 'mL/L', 14, '#475569', 'right');
      tx(bxx, byy + 140, '산소 분자 ' + O2MOL.filter((m) => !m.dying).length + '개 (그림)', 13, '#64748b');
    } else {
      const by2 = R.y + 438;
      ctx.fillStyle = '#f1f6fb'; rr(R.x + 12, by2, R.w - 24, 90, 12).fill();
      tx(R.x + 24, by2 + 26, '수온 ' + S.temp + ' °C 에서 포화 용존 산소', 14, '#475569', 'left', 800);
      tx(R.x + R.w - 24, by2 + 70, f1(v) + ' mL/L', 30, '#1d4ed8', 'right', 800);
      tx(R.x + 24, by2 + 70, '산소 분자 ' + O2MOL.filter((m) => !m.dying).length + '개', 13, '#64748b');
    }
    // 그래프
    const G = LY.sGraph; panel(G.x, G.y, G.w, G.h);
    tx(G.x + 12, G.y + 22, '수온과 포화 용존 산소', 14.5, '#334155', 'left', 800); dataTag(G.x + G.w - 10, G.y + 20, '예시 자료', 'right');
    const P = plotFrame(G, { l: PHONE ? 70 : 56, r: 16, t: 36, b: 40, xmin: 0, xmax: 30, ymin: 0, ymax: 9, xticks: [0, 10, 20, 30], yticks: [0, 2, 4, 6, 8], xlabel: '수온 (°C)', ylabel: '용존 산소 (mL/L)', size: 12 });
    const pts = []; for (let T = 0; T <= 30.01; T += 0.5) pts.push([P.gx(T), P.gy(satFn(T))]);
    polyline(pts, '#2563eb', 4);
    SAT_T.forEach((T, i) => { const rec = S.rec[T] != null; D.sphere(P.gx(T), P.gy(SAT_V[i]), rec ? 7.5 : 5.5, rec ? '#16a34a' : '#93c5fd', { outline: '#fff', outlineWidth: 2, gloss: false }); });
    const cx = P.gx(S.temp), cy = P.gy(v);
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx, P.y1); ctx.lineTo(cx, cy); ctx.lineTo(P.x0, cy); ctx.stroke(); ctx.restore();
    D.sphere(cx, cy, 7, '#0ea5e9', { outline: '#fff', outlineWidth: 2.5, shadow: true });
    D.label(clamp(cx + 38, P.x0 + 44, P.x1 - 40), cy - 18, f1(v) + ' mL/L', { bg: '#0f172a', size: 13, pad: 7 });
    // 기록표
    const T2 = LY.sTable; panel(T2.x, T2.y, T2.w, T2.h);
    tx(T2.x + 12, T2.y + 22, '나의 기록', 14.5, '#334155', 'left', 800);
    const W = T2.w - 24, cw = [W / 4, W / 4, W / 4, W / 4], rh = PHONE ? 40 : 34, ty = T2.y + 36;
    [0, 1].forEach((r) => {
      let xx = T2.x + 12;
      SAT_T.forEach((T, j) => {
        const rec = S.rec[T] != null;
        if (r === 0) { ctx.fillStyle = '#e8f1fa'; ctx.fillRect(xx, ty, cw[j], rh); D.text(xx + cw[j] / 2, ty + rh * 0.66, T + ' °C', { size: 14.5, weight: 800, color: '#0f4c75' }); }
        else { if (rec) { ctx.fillStyle = 'rgba(22,163,74,.14)'; ctx.fillRect(xx + 1, ty + rh + 1, cw[j] - 2, rh * 1.4 - 2); } D.text(xx + cw[j] / 2, ty + rh + rh * 0.9, rec ? f1(S.rec[T]) : '?', { size: 20, weight: 800, color: rec ? '#15803d' : '#94a3b8' }); D.text(xx + cw[j] / 2, ty + rh + rh * 1.25, 'mL/L', { size: 12, weight: 700, color: '#64748b' }); }
        ctx.strokeStyle = '#d6e2ee'; ctx.lineWidth = 1; ctx.strokeRect(xx, ty + (r ? rh : 0), cw[j], r ? rh * 1.4 : rh);
        xx += cw[j];
      });
    });
    drawWrap(T2.x + T2.w / 2, ty + rh * 2.4 + 24, '수온이 높을수록 포화 용존 산소가 줄어드는 경향이 보이나요?', T2.w - 28, 13.5, { color: '#475569', lh: 1.3 });
  }

  /* ---------- 연직 용존 산소 + 원인 카드 ---------- */
  const O2BOX = { l: PHONE ? 70 : 56, r: 14, t: 34, b: 40, xmin: 0, xmax: 9, ymin: 0, ymax: 4000, fy: sq, yDown: true, xticks: [0, 3, 6, 9], yticks: [0, 100, 500, 1000, 2000, 4000], xlabel: '용존 산소 (mL/L)', ylabel: '깊이 (m)', size: 12 };
  const O2_ZONES = [
    { id: 'surf', label: '표층 (0~100 m)', col: '#16a34a', cap: 2, d0: 0, d1: 150 },
    { id: 'mid', label: '산소 최소층 (500 m 부근)', col: '#dc2626', cap: 1, d0: 300, d1: 1000 },
    { id: 'deep', label: '심층 (2000~4000 m)', col: '#2563eb', cap: 1, d0: 1500, d1: 4000 },
  ];
  const O2_CARDS = [
    { id: 'dissolve', label: '대기 중 산소 용해', ans: 'surf', fill: '#f0fdf4', border: '#86efac' },
    { id: 'photo', label: '식물 플랑크톤 광합성', ans: 'surf', fill: '#f0fdf4', border: '#86efac' },
    { id: 'decomp', label: '유기물 분해로 산소 소비', ans: 'mid', fill: '#fef2f2', border: '#fca5a5' },
    { id: 'polar', label: '극지방 침강수 유입', ans: 'deep', fill: '#eff6ff', border: '#93c5fd' },
  ];
  const ZR = PHONE ? { surf: { x: 12, y: 322, w: 576, h: 86 }, mid: { x: 12, y: 414, w: 576, h: 86 }, deep: { x: 12, y: 506, w: 576, h: 86 } } :
    { surf: { x: 472, y: 10, w: 316, h: 130 }, mid: { x: 472, y: 146, w: 316, h: 124 }, deep: { x: 472, y: 276, w: 316, h: 124 } };
  const oBoard = new Board({
    zones: O2_ZONES.map((z) => Object.assign({ x: ZR[z.id].x, y: ZR[z.id].y, w: ZR[z.id].w, h: ZR[z.id].h, head: 24, lsize: 13.5, fill: 'rgba(255,255,255,.9)', line: z.col }, { id: z.id, label: z.label, color: z.col, cap: z.cap })),
    tray: { x: LY.oTray.x, y: LY.oTray.y + 30, w: LY.oTray.w }, cw: PHONE ? 176 : 150, ch: PHONE ? 54 : 52, gap: 8,
    onDrop: () => true, onPlace: () => { Sound.tick(); }, onReject: (c, z, msg) => say(msg || '여기에는 놓을 수 없어요.', true, 2),
  });
  O2_CARDS.forEach((c) => oBoard.add(Object.assign({}, c)));
  oBoard.layout(true);
  const o2Right = (c) => c.zone === c.ans;
  function drawO2(t) {
    const R = LY.oPlot; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '깊이에 따른 용존 산소 (예시)', 14, '#334155', 'left', 800);
    const P = plotFrame(R, O2BOX);
    // 칸과 같은 색의 깊이 띠
    O2_ZONES.forEach((z) => { ctx.save(); ctx.fillStyle = rgba(z.col, 0.1); ctx.fillRect(P.x0, P.gy(z.d0), P.x1 - P.x0, P.gy(z.d1) - P.gy(z.d0)); ctx.restore(); });
    ctx.save(); ctx.beginPath(); ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.clip();
    ['high', 'low'].forEach((k) => polyline(curvePts(P, O2[k].at, 4000), O2[k].col, 4));
    ctx.restore();
    ['high', 'low'].forEach((k) => O2D.forEach((d, i) => D.sphere(P.gx(O2[k].v[i]), P.gy(d), 3.8, O2[k].col, { gloss: false, outline: '#fff', outlineWidth: 1.2 })));
    D.label(P.gx(O2.low.v[0]) - 8, P.gy(0) + 18, '저위도', { bg: O2.low.col, size: 12.5, pad: 6, align: 'right' });
    D.label(P.gx(O2.high.v[0]) + 8, P.gy(0) + 18, '고위도', { bg: O2.high.col, size: 12.5, pad: 6, align: 'left' });
    if (oBoard.inZone('mid').some(o2Right)) { D.text(P.gx(1.2) + 12, P.gy(500) + 5, '산소 최소층', { size: 13, weight: 800, color: '#b91c1c', align: 'left' }); D.ring(P.gx(1.2), P.gy(500), 12, t, { color: '#dc2626', speed: 0.9, width: 2.5 }); }
    dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    // 칸 안내
    const T = LY.oTray;
    if (!PHONE) { ctx.save(); }
    tx(T.x + 4, T.y + 14, '원인 카드를 끌어서 그 구간에 알맞은 칸에 놓아요', 14, '#334155', 'left', 800);
    oBoard.draw(t);
  }

  /* =========================================================
     4단계: 두 해역의 자료 비교
     ========================================================= */
  const CMPBOX = (xmax, ticks, label) => ({ l: PHONE ? 66 : 50, r: 18, t: 38, b: 36, xmin: 0, xmax, ymin: 0, ymax: 1000, yDown: true, xticks: ticks, yticks: [0, 500, 1000], xlabel: label, ylabel: '깊이 (m)', size: 12 });
  function drawCmpPlot(R, title, xmax, ticks, label, k0, k1, unit) {
    panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, title, 14.5, '#334155', 'left', 800);
    const P = plotFrame(R, CMPBOX(xmax, ticks, label));
    ['A', 'B'].forEach((ak) => {
      const a = AREA[ak], sel = S.cmpSel === ak, x0 = P.gx(a[k0]), x1 = P.gx(a[k1]);
      ctx.save(); ctx.setLineDash([]); polyline([[x0, P.gy(0)], [x1, P.gy(1000)]], a.col, sel ? 6 : 4, { alpha: S.cmpSel && !sel ? 0.45 : 1 }); ctx.restore();
      D.sphere(x0, P.gy(0), 6.5, a.col, { outline: '#fff', outlineWidth: 2 }); D.sphere(x1, P.gy(1000), 6.5, a.col, { outline: '#fff', outlineWidth: 2 });
      D.label(clamp(x0, P.x0 + 30, P.x1 - 30), P.gy(0) + 18, f1(a[k0]) + unit, { bg: a.col, size: 12.5, pad: 6 });
      D.label(clamp(x1 + (ak === 'A' ? 26 : -26), P.x0 + 30, P.x1 - 30), P.gy(1000) - 18, f1(a[k1]) + unit, { bg: a.col, size: 12.5, pad: 6 });
    });
    dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
  }
  function drawCmp(t) {
    drawCmpPlot(LY.cT, '수온 (표층·1000 m 값을 이은 선)', 30, [0, 10, 20, 30], '수온 (°C)', 'T0', 'T1', ' °C');
    drawCmpPlot(LY.cO, '용존 산소 (표층·1000 m 값)', 8, [0, 2, 4, 6, 8], '용존 산소 (mL/L)', 'O0', 'O1', '');
    const R = LY.cTab; panel(R.x, R.y, R.w, R.h);
    const W = R.w - 24, cw = [W * 0.4, W * 0.3, W * 0.3], rh = PHONE ? 33 : 25.5, ty = R.y + 10;
    const A = AREA.A, B = AREA.B;
    const rows = [['위성·ARGO 자료', 'A  ' + A.sub, 'B  ' + B.sub], ['표층 수온 (°C)', f1(A.T0), f1(B.T0)], ['1000 m 수온 (°C)', f1(A.T1), f1(B.T1)], ['수온 차 (표층 − 1000 m)', f1(A.T0 - A.T1), f1(B.T0 - B.T1)], ['표층 염분 (psu)', f1(A.S0), f1(B.S0)], ['1000 m 염분 (psu)', f1(A.S1), f1(B.S1)], ['표층 용존 산소 (mL/L)', f1(A.O0), f1(B.O0)], ['1000 m 용존 산소 (mL/L)', f1(A.O1), f1(B.O1)]];
    rows.forEach((r, i) => {
      let xx = R.x + 12;
      if (i === 0) { ctx.fillStyle = '#e8f1fa'; ctx.fillRect(R.x + 12, ty, W, rh); }
      r.forEach((s2, j) => {
        const sel = j > 0 && S.cmpSel === (j === 1 ? 'A' : 'B');
        if (sel) { ctx.fillStyle = 'rgba(14,165,233,.14)'; ctx.fillRect(xx + 1, ty + i * rh + 1, cw[j] - 2, rh - 2); }
        D.text(xx + (j === 0 ? 8 : cw[j] / 2), ty + i * rh + rh * 0.68, s2, { size: i === 0 ? 12.5 : 13.5, weight: 800, color: i === 0 ? '#0f4c75' : (j === 0 ? '#475569' : (j === 1 ? '#b91c1c' : '#1d4ed8')), align: j === 0 ? 'left' : 'center' });
        xx += cw[j];
      });
      ctx.strokeStyle = '#d6e2ee'; ctx.lineWidth = 1; ctx.strokeRect(R.x + 12, ty + i * rh, W, rh);
    });
    dataTag(R.x + R.w - 10, R.y + R.h - 14, '예시 자료', 'right');
  }


  /* =========================================================
     조작 · 읽기 칸 · 단계와 미션
     ========================================================= */
  const VIEW_LABEL = { map: '🛰️ 위성·ARGO 자료', lat: '📍 위도별 표층 수온·염분', prof: '📈 깊이별 수온 곡선', evap: '💧 증발 − 강수와 염분', sat: '🫧 포화 용존 산소', o2: '🫧 깊이별 용존 산소', cmp: '📋 두 해역 자료 비교' };
  const setTw = (obj, prop, val, dur, ease) => SciSim.tween(obj, { [prop]: val }, { duration: dur, ease: ease || 'outCubic' });
  const mapBtns = $$('#mapSeg .opt'), buoyBtns = $$('#buoySeg .opt');
  const sDepth = $('#sDepth'), oDepth = $('#oDepth'), sTemp = $('#sTemp'), oTemp = $('#oTemp');
  const modeSeg = $('#modeSeg');
  const AREA_BTNS = $$('#cmpArea .opt'), REASON_BTNS = $$('#cmpReason .opt');
  const REASONS = [
    { id: 'polar', t: '극지방에서 침강한 산소가 풍부한 찬 해수가 공급되기 때문이에요', fb: '' },
    { id: 'warm', t: '수온이 높아서 산소가 더 많이 녹기 때문이에요', fb: '수온이 높을수록 포화 용존 산소는 오히려 줄어요. 해역 B의 1000 m 수온(3.5 °C)은 낮아요.' },
    { id: 'photo', t: '1000 m 깊이에서 식물 플랑크톤이 광합성을 많이 하기 때문이에요', fb: '1000 m에는 햇빛이 거의 닿지 않아 광합성이 일어나기 어려워요. 산소는 다른 곳에서 공급돼요.' },
  ];
  REASON_BTNS.forEach((b, i) => { b.textContent = REASONS[i].t; });

  function setView(v) {
    if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); }
    updateCtl();
  }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !(game && game.free);
    mapBtns.forEach((b) => b.classList.toggle('on', b.dataset.m === S.mapMode));
    buoyBtns.forEach((b) => b.classList.toggle('on', b.dataset.b === S.buoy));
    $('#bEvap').textContent = S.evap ? '📊 증발 − 강수 막대 끄기' : '📊 증발 − 강수 막대 겹쳐 보기';
    $('#bEvap').classList.toggle('on', S.evap);
    $$('#pfRows select').forEach((s) => { s.value = S.pfPick[s.dataset.tg] || ''; });
    AREA_BTNS.forEach((b) => b.classList.toggle('on', b.dataset.a === S.cmpSel));
    REASON_BTNS.forEach((b, i) => b.classList.toggle('on', S.cmpR === REASONS[i].id));
    $('#cmpReasonBox').hidden = !S.reasonOn;
    $('#bRec').disabled = false;
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));
  function setMap(m) {
    if (m === S.mapMode) return;
    S.mapPrev = S.scan < 1 ? S.mapMode : S.mapMode; S.mapMode = m; S.scan = 0;
    setTw(S, 'scan', 1, 1.3, 'inOutQuad'); updateCtl();
  }
  mapBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); setMap(b.dataset.m); }));
  function selectBuoy(k) {
    S.buoy = k; S.prog = 0; S.cycT = 0; S.probe = null;
    setTw(S, 'prog', 1, 1.5, 'inOutQuad'); updateCtl(); Sound.click();
  }
  buoyBtns.forEach((b) => b.addEventListener('click', () => selectBuoy(b.dataset.b)));
  bindSlider(sDepth, oDepth, (v) => v + ' m', (v) => { S.depth = v; });
  bindSlider(sTemp, oTemp, (v) => v + ' °C', (v) => { S.temp = v; });
  $('#bLatReset').addEventListener('click', () => { Sound.click(); initHandles(); say('점을 모두 지웠어요. 다시 찍어 봐요.', false, 1.8); });
  $$('#pfRows select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.pfPick[s.dataset.tg] = s.value || undefined; }));
  $('#bEvap').addEventListener('click', () => { Sound.click(); S.evap = !S.evap; updateCtl(); });
  $('#bRec').addEventListener('click', () => {
    if (SAT_T.indexOf(S.temp) < 0) { Sound.fail(); say('수온을 0, 10, 20, 30 °C 중 하나에 맞춘 뒤 기록해요.', true, 2.4); return; }
    if (S.rec[S.temp] != null) { say(S.temp + ' °C는 이미 기록했어요.', false, 1.6); return; }
    S.rec[S.temp] = satFn(S.temp); Sound.success();
    const g = LY.sGraph; parts.burst(g.x + g.w / 2, g.y + g.h / 2, { count: 10, speed: 120, size: 3, life: 0.6, colors: ['#16a34a', '#fff'] });
    say(S.temp + ' °C에서 포화 용존 산소 ' + f1(S.rec[S.temp]) + ' mL/L 를 기록했어요.', false, 1.8);
  });
  $('#bO2Reset').addEventListener('click', () => { Sound.click(); oBoard.reset(); });
  AREA_BTNS.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cmpSel = b.dataset.a; updateCtl(); }));
  REASON_BTNS.forEach((b, i) => b.addEventListener('click', () => { Sound.click(); S.cmpR = REASONS[i].id; updateCtl(); }));

  /* ---------- 포인터 ---------- */
  const near = (a, b, r) => Math.hypot(a[0] - b.x, a[1] - b.y) <= r;
  function mapDown(p) {
    for (const k of BKEYS) {
      const q = mapXY(BUOYS[k].lon, BUOYS[k].lat);
      if (Math.hypot(q[0] - p.x, q[1] - p.y) <= (PHONE ? 22 : 18)) { selectBuoy(k); return false; }
    }
    const R = LY.map;
    if (p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h) {
      const ll = mapLL(p.x, p.y);
      if (isLand(ll[0], ll[1])) { say('육지예요. 바다 위를 눌러 보세요.', true, 1.6); return false; }
      S.probe = { lon: ll[0], lat: ll[1] }; Sound.tick();
    }
    return false;
  }
  function latHit(p) {
    let best = null, bd = 1e9;
    S.handles.forEach((h) => { const d = Math.hypot(h.x - p.x, h.y - p.y); if (d < bd) { bd = d; best = h; } });
    return bd <= (PHONE ? 30 : 26) ? best : null;
  }
  function latDown(p) {
    const h = latHit(p); if (!h) return false;
    if (h.placed) {
      if (h.kind === 's' && placedCount('s') === 5) {
        if (S.flag === h.lat) { S.flag = null; return false; }
        S.flag = h.lat; Sound.click();
        if (h.lat === 20) { parts.burst(h.x, h.y, { count: 14, speed: 140, size: 3.4, life: 0.7, colors: ['#dc2626', '#fde047', '#fff'] }); Sound.success(); } else { Sound.fail(); say('위도 ' + h.lat + '°보다 더 짠 곳이 있어요. 값을 비교해 보세요.', true, 2.4); }
      }
      return false;
    }
    setTw(h, 'y', h.y, 0.0001); S.drag = h; h.y = clamp(p.y, GEO[h.kind].y0, GEO[h.kind].y1 - 4); Sound.click();
    return true;
  }
  function latMove(p) { const h = S.drag; if (h) h.y = clamp(p.y, GEO[h.kind].y0, GEO[h.kind].y1 - 4); }
  function latUp(p) {
    const h = S.drag; if (!h) return; S.drag = null;
    const v = valAtY(h.kind, h.y), tv = LATVAL[h.kind][h.i];
    if (Math.abs(v - tv) <= TOL[h.kind]) {
      h.placed = true; setTw(h, 'y', yAtVal(h.kind, tv), 0.35, 'outBack'); h.pop = 1; setTw(h, 'pop', 0, 0.6, 'outCubic');
      Sound.success(); parts.burst(h.x, yAtVal(h.kind, tv), { count: 10, speed: 110, size: 3, life: 0.6, colors: [HCOL[h.kind], '#fff'] });
    } else {
      h.shake = 0.4; Sound.fail(); setTw(h, 'y', h.home, 0.5, 'outCubic');
      say(h.kind === 't' ? '위도 ' + h.lat + '°의 수온(' + mk(tv) + ' °C)과 달라요. 표를 다시 보세요.' : '위도 ' + h.lat + '°의 염분(' + f1(tv) + ' psu)과 달라요. 표를 다시 보세요.', true, 2.4);
    }
  }
  SciSim.pointer(view, {
    down(p) { if (S.view === 'map') return mapDown(p); if (S.view === 'lat') return latDown(p); if (S.view === 'o2') return oBoard.down(p); return false; },
    move(p) { if (S.view === 'lat') latMove(p); else if (S.view === 'o2') oBoard.move(p); },
    up(p) { if (S.view === 'lat') latUp(p); else if (S.view === 'o2') oBoard.up(p); },
    hover(p) {
      if (S.view === 'map') return BKEYS.some((k) => { const q = mapXY(BUOYS[k].lon, BUOYS[k].lat); return Math.hypot(q[0] - p.x, q[1] - p.y) <= 18; }) ? 'pointer' : 'crosshair';
      if (S.view === 'lat') return latHit(p) ? 'grab' : 'default';
      if (S.view === 'o2') return oBoard.hit(p) ? 'grab' : 'default';
      return 'default';
    },
  });

  /* ---------- 읽기 칸 ---------- */
  const o2Count = () => O2_CARDS.length - oBoard.cards.filter((c) => !c.zone).length;
  function readouts() {
    const v = S.view;
    if (v === 'map') setReadouts(['지도 종류', S.mapMode === 'sst' ? '표층 수온' : '표층 염분', '선택한 부이', S.buoy ? BUOYS[S.buoy].name : '—', '수심 ' + S.depth + ' m 수온', S.buoy ? f1(PROF[BUOYS[S.buoy].prof].at(S.depth)) + ' °C' : '—']);
    else if (v === 'lat') setReadouts(['찍은 수온 점', placedCount('t') + ' / 5', '찍은 염분 점', placedCount('s') + ' / 5', '가장 짠 곳 표시', S.flag != null ? S.flag + '°' : '아직']);
    else if (v === 'prof') setReadouts(['곡선', '4개 (A~D)', '고른 이름표', Object.keys(S.pfPick).filter((k) => S.pfPick[k]).length + ' / 4', '단서', '표층 수온·모양']);
    else if (v === 'evap') setReadouts(['염분이 가장 높은 위도', '20° (35.8 psu)', '증발−강수 막대', S.evap ? '켜짐' : '꺼짐', '위도 20°의 증발−강수', S.evap ? '+900 mm/년' : '?']);
    else if (v === 'sat') setReadouts(['수온', S.temp + ' °C', '포화 용존 산소', f1(satV(S.temp)) + ' mL/L', '기록한 칸', Object.keys(S.rec).length + ' / 4']);
    else if (v === 'o2') setReadouts(['놓은 카드', o2Count() + ' / 4', '저위도 최솟값', '1.2 mL/L (500 m)', '고위도 4000 m', '6.0 mL/L']);
    else setReadouts(['고른 해역', S.cmpSel ? AREA[S.cmpSel].name + ' (' + AREA[S.cmpSel].sub + ')' : '—', '수온 차(표층−1000 m)', S.cmpSel ? f1(AREA[S.cmpSel].T0 - AREA[S.cmpSel].T1) + ' °C' : '—', '1000 m 용존 산소', S.cmpSel ? f1(AREA[S.cmpSel].O1) + ' mL/L' : '—']);
  }

  /* ---------- 단계 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    if (li === 0) {
      S.read = { low: false, mid: false, high: false }; S.buoy = null; setTw(S, 'prog', 0, 0.001); S.probe = null; S.depth = 0; setSlider(sDepth, oDepth, 0, (v) => v + ' m');
      S.mapMode = S.mapPrev = 'sst'; setTw(S, 'scan', 1, 0.001); S.cycT = 0; setView('map'); showHint('지도의 ● 부이를 눌러 보세요', 5000);
    } else if (li === 1) {
      initHandles(); S.pfPick = {}; S.evap = false; S.evK = 0; setView('lat'); showHint('◎ 손잡이를 위로 끌어 표의 값에 맞춰요', 5000);
    } else if (li === 2) {
      S.rec = {}; S.temp = S.tempS = 20; setSlider(sTemp, oTemp, 20, (v) => v + ' °C'); oBoard.reset(); setView('sat'); showHint('수온 슬라이더를 움직여 보세요', 5000);
    } else {
      S.cmpSel = null; S.cmpR = null; S.reasonOn = false; setView('cmp'); showHint('두 해역의 자료를 비교해 보세요', 5000);
    }
    updateCtl();
  }
  const OCEANLINE = '<p style="font-size:13.5px;color:var(--muted);margin-top:6px">※ 이 차시의 지도·그래프·표 값은 모두 교육용 <b>예시 자료</b>예요. ' + SRC_LINE + '</p>';
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';

  const levels = [
    {
      title: '위성과 ARGO 부이로 바다 보기', short: '위성·ARGO', icon: '🛰️', phase: '관찰', features: ['map'],
      intro: '<p class="si-q">❓ 탐구 질문: 바다 위에서 내려다본 지도와 바닷속 단면 자료는 서로 어떻게 보완될까? 바닷물의 수온·염분·산소는 왜 그렇게 분포할까?</p>' +
        '<div class="si-link">🔗 <b>중학교 3학년에서</b> 바닷물의 깊이에 따른 수온 3층 구조(혼합층·수온 약층·심해층)와 염분(psu, 염류 비율이 일정함)을 배웠어요.</div>' +
        '<p>이번 차시에서는 그 내용을 <b>전 지구 자료</b>로 넓혀요. <b>인공위성</b>은 바다 표면(표층)의 수온·염분을 넓은 해역에서 한꺼번에 재고, <b>ARGO 부이</b>는 한 곳에서 약 2000 m 깊이까지 재요. 두 자료를 함께 읽어 봐요.</p>' + OCEANLINE,
      setup() { enterLevel(0); },
      recap: '위성은 넓은 바다의 표층을, ARGO 부이는 한 곳의 깊이별 값을 알려 줘서 서로를 보완해요.',
      summary: '<ul><li><b>인공위성</b>: 표층만, 넓은 해역을 한꺼번에 (수온: 적외선·마이크로파, 염분: 마이크로파)</li><li><b>ARGO 부이</b>: 점(한 곳)이지만 2000 m까지. 전 세계 약 4000개가 약 10일마다 1000 m에서 표류하다 2000 m까지 내려갔다 올라오며 수온·염분을 재고(일부는 용존 산소도) 위성으로 보내요.</li><li>수심 200 m 수온: 저위도 18 °C, 중위도(여름) 10 °C, 고위도 3.5 °C (예시 자료)</li></ul>',
      missions: [
        {
          title: '세 부이의 수심 200 m 수온 읽기',
          goal: '지도에서 <b>저위도·중위도·고위도 부이</b>를 차례로 눌러요. 수심 슬라이더를 <b>200 m</b>에 맞추고 수온을 읽어요.',
          hint: '부이(●)를 누르면 연직 수온 그래프가 그려져요. 수심 슬라이더를 200 m에 두고 세 부이를 모두 확인해요.',
          hold: 0.4, setup() { setView('map'); },
          status: () => BKEYS.map((k) => (k === 'low' ? '저위도 ' : k === 'mid' ? '중위도 ' : '고위도 ') + mark(S.read[k])).join(' · '),
          check: () => BKEYS.every((k) => S.read[k]),
          explain: '수심 200 m의 수온은 저위도 <b>18 °C</b>, 중위도(여름) <b>10 °C</b>, 고위도 <b>3.5 °C</b>예요. 저위도는 표층이 가장 따뜻하지만 200 m에서는 수온이 크게 낮아져요(수온 약층). 고위도는 표층부터 차가워 깊이에 따른 변화가 작아요.',
        },
        {
          type: 'quiz', title: '위성만으로는 알 수 없는 것',
          goal: '다음 중 <b>인공위성 영상만으로는 알기 어려운 것</b>은 무엇일까요?', setup() { setView('map'); },
          choices: ['동태평양과 서태평양의 표층 수온 차이', '수심 1000 m에서의 수온', '남반구와 북반구의 표층 염분 분포', '바다 표면 수온의 계절 변화'],
          answer: 1,
          feedback: ['위성은 표층 수온을 넓은 해역에서 한꺼번에 볼 수 있어서 이런 비교에 알맞아요.', '', '위성은 마이크로파로 표층 염분도 잴 수 있어요. 알기 어려운 것은 깊은 곳이에요.', '위성은 같은 바다를 되풀이해서 보므로 표층 수온의 계절 변화도 알 수 있어요.'],
          explain: '위성은 <b>표층</b>만 보지만 넓은 해역을 한꺼번에 볼 수 있어요. <b>깊이에 따른 변화</b>는 ARGO 부이처럼 바닷속으로 들어가 재는 자료가 필요해요.',
        },
      ],
    },
    {
      title: '위도와 깊이에 따른 수온·염분', short: '수온·염분', icon: '🌡️', phase: '분석', features: ['lat', 'prof', 'evap'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 위성은 표층을, ARGO 부이는 깊이별 값을 알려 준다는 것을 확인했어요.</div>' +
        '<p>이번에는 위도에 따른 <b>표층 수온·염분</b> 그래프를 직접 만들고, 깊이에 따른 수온 곡선 4개를 비교해 <b>수온 약층</b>이 위도와 계절에 따라 어떻게 다른지 해석해요. 염분은 <b>증발량 − 강수량</b>과 함께 읽어요.</p>' + OCEANLINE,
      setup() { enterLevel(1); },
      recap: '표층 수온은 저위도에서 높고 고위도에서 낮아요. 염분은 증발이 강수보다 많은 위도 20° 부근에서 가장 높아요. 수온 약층은 저위도와 중위도 여름에 뚜렷하고 겨울과 고위도에서는 약해요.',
      summary: tb([['위도', '0°', '20°', '40°', '60°', '80°'], ['표층 수온(°C)', '28', '25', '14', '4', '−1.5'], ['표층 염분(psu)', '34.6', '35.8', '35.0', '33.8', '33.0'], ['증발−강수(mm/년)', '−400', '+900', '+150', '−500', '−650']]) +
        '<ul><li>염분 곡선은 (증발량 − 강수량)과 닮았어요: 적도는 강수가 많고, 아열대는 증발이 강수보다 많고, 고위도는 강수와 빙하 융해로 낮아요.</li><li>중위도 겨울에는 바람과 표층 냉각으로 혼합층이 깊어져 수온 약층이 약해져요.</li></ul>',
      missions: [
        {
          title: '위도별 수온·염분 그래프 만들기',
          goal: '표의 값에 맞게 손잡이 10개(수온 5, 염분 5)를 끌어 점을 찍고, <b>염분이 가장 높은 위도</b>의 점을 눌러 표시해요.',
          hint: '손잡이를 위로 끌어 표에 있는 값 근처에 놓으면 점이 찍혀요. 염분 점 5개를 모두 찍으면 점을 눌러 표시할 수 있어요.',
          hold: 0.4, setup() { setView('lat'); },
          status: () => '수온 ' + placedCount('t') + '/5 · 염분 ' + placedCount('s') + '/5 · 가장 짠 곳 표시 ' + mark(S.flag === 20),
          check: () => latDone() && S.flag === 20,
          explain: '표층 수온은 적도에서 가장 높고(28 °C) 고위도로 갈수록 낮아져요. 염분은 위도 <b>20°</b> 부근에서 가장 높아요(35.8 psu). 적도는 강수가 많아 염분이 조금 낮고, 고위도는 강수와 빙하 융해로 더 낮아요.',
        },
        {
          title: '수온 곡선 짝짓기: 저위도·중위도 여름·겨울·고위도',
          goal: '곡선 A~D가 어느 해역·계절의 깊이별 수온인지 <b>이름표</b>를 골라요.', manual: true, setup() { setView('prof'); },
          hint: '표층(맨 위) 수온이 가장 높은 곡선은 저위도, 가장 낮은 곡선은 고위도예요. 중위도 여름은 표층이 따뜻하고 100~500 m에서 수온이 급하게 변해요.',
          check: () => {
            const missing = TAGS.filter((tg) => !S.pfPick[tg]);
            if (missing.length) return '곡선 ' + missing.join('·') + '의 이름표를 아직 고르지 않았어요.';
            const bad = TAGS.filter((tg, i) => S.pfPick[tg] !== PROF[S.pfOrder[i]].name);
            if (!bad.length) return true;
            const badKeys = bad.map((tg) => S.pfOrder[TAGS.indexOf(tg)]);
            if (badKeys.some((k) => k === 'low' || k === 'high')) return '곡선 ' + bad.join('·') + '을(를) 다시 생각해 봐요. 표층 수온이 가장 높은 곡선이 저위도, 가장 낮은 곡선이 고위도예요.';
            return '중위도의 여름과 겨울이 바뀌었어요. 겨울에는 표층 수온이 낮고 바람으로 섞여 윗부분이 곧게 펴져(수온 약층이 약해져) 있어요.';
          },
          explain: '<b>저위도</b>는 표층이 28 °C로 가장 따뜻하고 수온 약층이 뚜렷해요. <b>중위도 여름</b>은 표층이 따뜻하고 100~500 m에서 수온이 급하게 낮아져요. <b>중위도 겨울</b>은 바람과 표층 냉각으로 혼합층이 깊어져 200 m 부근까지 수온이 거의 같고 수온 약층이 약해져요. <b>고위도</b>는 표층부터 차가워 수온 약층이 거의 없어요.',
        },
        {
          type: 'quiz', title: '아열대 염분이 높고 적도가 낮은 까닭',
          goal: '위도 20° 부근의 표층 염분이 가장 높고 적도는 그보다 낮아요. <b>증발량 − 강수량 막대</b>와 함께 보고, 그 까닭을 골라요.',
          setup() { setView('evap'); S.evap = true; updateCtl(); },
          choices: ['아열대는 강수량이 증발량보다 많아서 염분이 진해져요', '아열대는 증발이 강수보다 많아 염분이 높고, 적도는 강수가 많아 상대적으로 낮아요', '아열대 바다에는 강물이 많이 흘러들기 때문이에요', '따뜻한 바다일수록 소금이 더 많이 녹기 때문이에요'],
          answer: 1,
          feedback: ['강수가 많으면 바닷물이 희석되어 염분이 낮아져요. 막대의 부호를 다시 보세요.', '', '강물이 많이 들어오면 염분은 오히려 낮아져요.', '염분은 바닷물이 증발하면 물만 날아가서 높아지는 것이지, 소금이 더 녹아서 높아지는 것이 아니에요.'],
          explain: '증발이 강수보다 많은 곳은 물만 날아가 염분이 높아지고, 강수가 많은 곳은 바닷물이 희석되어 낮아져요. 그래서 염분 곡선이 <b>증발량 − 강수량</b>과 닮은 모양이에요.',
        },
      ],
    },
    {
      title: '용존 산소: 수온과 깊이', short: '용존 산소', icon: '🫧', phase: '탐구', features: ['sat', 'o2'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수온과 염분이 위도와 깊이에 따라 달라지는 것을 확인했어요.</div>' +
        '<p><b>용존 산소</b>는 바닷물에 녹아 있는 산소예요. 물이 녹일 수 있는 산소의 최대량(<b>포화 값</b>)은 수온에 따라 달라지고, 실제 양은 깊이에 따라 달라져요. 먼저 수온과 포화 값의 관계를 찾고, 그다음 깊이에 따른 분포의 원인을 찾아봐요.</p>' + OCEANLINE,
      setup() { enterLevel(2); },
      recap: '포화 용존 산소는 수온이 낮을수록 커요. 깊이에 따른 용존 산소는 표층에서 풍부하고, 수온 약층 아래 중층에서 최소가 된 뒤 심층에서 다시 늘어요.',
      summary: tb([['수온(°C)', '0', '10', '20', '30'], ['포화 용존 산소(mL/L)', '8.0', '6.4', '5.3', '4.4']]) +
        '<ul><li>저위도 용존 산소(0·100·500·1000·2000·4000 m): 4.7 · 4.8 · <b>1.2(최소층)</b> · 1.8 · 3.5 · 4.5 mL/L</li><li>표층: 대기에서 녹아 들어옴 + 식물 플랑크톤의 광합성. 중층: 가라앉은 유기물이 분해되며 산소를 쓰고 위층과 섞임이 약해 최소. 심층: 극지방에서 침강한 산소가 풍부한 찬 해수가 공급돼요.</li></ul>',
      missions: [
        {
          title: '수온에 따른 포화 용존 산소 기록하기',
          goal: '수온 슬라이더를 <b>0 · 10 · 20 · 30 °C</b>에 맞추고, 그때마다 <b>📝 기록</b>을 눌러요.',
          hint: '슬라이더를 정확히 0, 10, 20, 30에 맞춘 뒤 📝 기록 버튼을 눌러요. 4칸을 모두 채우면 돼요.',
          hold: 0.3, setup() { setView('sat'); },
          status: () => SAT_T.map((T) => T + '° ' + mark(S.rec[T] != null)).join(' · '),
          check: () => SAT_T.every((T) => S.rec[T] != null),
          explain: '포화 용존 산소는 0 °C에서 <b>8.0</b>, 10 °C에서 <b>6.4</b>, 20 °C에서 <b>5.3</b>, 30 °C에서 <b>4.4</b> mL/L로, 수온이 높을수록 줄어요. 그래서 찬 극지방 바다가 더운 열대 바다보다 산소를 더 많이 품을 수 있어요.',
        },
        {
          title: '산소 곡선에 원인 카드 놓기',
          goal: '저위도 용존 산소 곡선의 각 구간이 생기는 <b>원인 카드 4장</b>을 알맞은 칸에 놓고 <b>✔ 확인하기</b>를 눌러요.', manual: true, setup() { setView('o2'); },
          hint: '표층에는 산소가 공급되고, 수온 약층 아래 중층에서는 산소가 소비돼요. 심층의 산소는 먼 곳에서 와요.',
          status: () => '놓은 카드 ' + o2Count() + ' / 4',
          check: () => {
            const un = oBoard.cards.filter((c) => !c.zone);
            if (un.length) return '아직 놓지 않은 카드가 ' + un.length + '장 있어요.';
            const wrong = oBoard.cards.filter((c) => !o2Right(c));
            if (!wrong.length) return true;
            const w = wrong[0];
            if (w.id === 'decomp') return '유기물 분해는 어디에서 산소를 가장 많이 쓸까요? 곡선이 가장 낮아지는 구간을 보세요.';
            if (w.id === 'polar') return '극지방에서 가라앉은 물은 아주 깊은 곳으로 흘러가요. 깊은 곳 곡선이 왜 다시 늘어날까요?';
            return '햇빛이 닿는 얕은 바다에서 산소가 공급되는 원인이에요. 표층 칸에 놓아 보세요.';
          },
          explain: '<b>표층</b>: 대기에서 산소가 녹아 들어오고 식물 플랑크톤이 광합성으로 산소를 만들어요. <b>수온 약층 아래 중층(약 500 m)</b>: 가라앉은 유기물이 분해되며 산소를 쓰고, 위층과 섞임이 약해 산소가 가장 적어요(산소 최소층). <b>심층</b>: 극지방에서 침강한 산소가 풍부한 찬 해수가 공급돼 다시 늘어요.',
        },
        {
          type: 'quiz', title: '용존 산소에 대해 옳은 설명',
          goal: '다음 중 <b>옳은 설명</b>을 골라요.', setup() { setView('o2'); },
          choices: ['깊이 내려갈수록 용존 산소는 계속 줄어들어요', '수온이 높을수록 물에 더 많은 산소가 녹아서 열대 바다가 산소가 가장 많아요', '수온이 낮을수록 포화 값이 커요. 저위도 바다는 중층에서 최소가 된 뒤 더 깊은 곳에서 다시 늘어요', '산소는 바다 표면에서만 만들어져서 깊은 곳은 모두 산소가 없어요'],
          answer: 2,
          feedback: ['저위도 곡선을 보세요. 500 m에서 가장 낮고 그 아래에서는 다시 늘어요.', '기체는 찬 물에 더 많이 녹아요. 포화 값은 수온이 높을수록 작아요(0 °C 8.0 → 30 °C 4.4).', '', '심층에는 극지방에서 침강한 산소가 풍부한 찬 해수가 흘러들어요. 심층 산소는 0이 아니에요.'],
          explain: '기체의 용해도는 수온이 낮을수록 커서 <b>포화 용존 산소는 수온이 낮을수록 커요</b>. 깊이에 따른 분포는 단순히 줄어드는 것이 아니라, 중층의 <b>산소 최소층</b> 아래에서 심층 순환이 가져온 산소 덕분에 다시 증가해요.',
        },
      ],
    },
    {
      title: '두 해역의 자료 비교', short: '자료 비교', icon: '📋', phase: '분석', features: ['cmp'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수온 약층과 용존 산소의 깊이별 분포를 이해했어요. 이제 위성·ARGO 자료 표를 직접 읽고 해석해요.</div>' +
        '<p>해역 A(<b>적도 태평양</b>)와 해역 B(<b>북대서양 고위도</b>)의 표층 자료(위성)와 1000 m 자료(ARGO)가 있어요. 표를 읽고 <b>수온 약층이 뚜렷한 해역</b>과 <b>심층 용존 산소가 높은 해역</b>을 판단해요.</p>' + OCEANLINE,
      setup() { enterLevel(3); },
      recap: '표층과 심층의 수온 차가 큰 적도 태평양에는 수온 약층이 뚜렷하고, 고위도 해역은 심층까지 차갑고 용존 산소가 풍부해요.',
      summary: tb([['항목', '해역 A(적도 태평양)', '해역 B(북대서양 고위도)'], ['표층 수온(°C)', '28', '4'], ['1000 m 수온(°C)', '5', '3.5'], ['표층 염분(psu)', '34.4', '34.9'], ['1000 m 염분(psu)', '34.6', '34.9'], ['표층 용존 산소(mL/L)', '4.5', '7.0'], ['1000 m 용존 산소(mL/L)', '0.8', '6.2']]) +
        '<ul><li>수온 약층: 표층과 깊은 곳의 수온 차가 클수록 뚜렷해요(A 23.0 °C, B 0.5 °C).</li><li>심층 용존 산소는 극지방에서 침강한 산소가 풍부한 찬 해수의 영향으로 해역 B가 높아요.</li></ul>',
      missions: [
        {
          title: '수온 약층이 뚜렷한 해역 고르기',
          goal: '표와 그래프를 읽고, <b>수온 약층이 더 뚜렷한 해역</b>을 고른 뒤 <b>✔ 확인하기</b>를 눌러요.', manual: true, setup() { S.cmpSel = null; S.reasonOn = false; setView('cmp'); },
          hint: '표층과 1000 m의 수온 차가 큰 해역을 찾아요. 수온 차 행의 값을 비교해 보세요.',
          status: () => '고른 해역: ' + (S.cmpSel ? AREA[S.cmpSel].name : '아직'),
          check: () => (!S.cmpSel ? '해역 A 또는 B 버튼을 먼저 눌러요.' : S.cmpSel === 'A' ? true : '해역 B는 표층과 1000 m의 수온 차가 0.5 °C밖에 안 돼요. 수온 차가 큰 곳을 다시 찾아봐요.'),
          explain: '해역 A는 표층 28 °C에서 1000 m의 5 °C까지 <b>23.0 °C</b> 낮아져 수온 약층이 뚜렷해요. 해역 B는 표층부터 차가워 차이가 <b>0.5 °C</b>뿐이에요.',
        },
        {
          title: '심층 용존 산소가 높은 해역과 까닭',
          goal: '1000 m의 <b>용존 산소가 높은 해역</b>을 고르고, 그 까닭 카드를 골라 <b>✔ 확인하기</b>를 눌러요.', manual: true, setup() { S.cmpSel = null; S.cmpR = null; S.reasonOn = true; setView('cmp'); },
          hint: '1000 m 용존 산소 행을 비교해요. 그다음 극지방 바다와 산소의 관계를 떠올려요.',
          status: () => '해역 ' + (S.cmpSel ? S.cmpSel : '?') + ' · 까닭 카드 ' + (S.cmpR ? '선택함' : '아직'),
          check: () => {
            if (!S.cmpSel) return '해역 A 또는 B를 먼저 골라요.';
            if (S.cmpSel !== 'B') return '1000 m 용존 산소는 해역 A가 0.8, 해역 B가 6.2 mL/L예요. 다시 비교해 봐요.';
            if (!S.cmpR) return '해역 B가 높은 까닭 카드도 골라요.';
            const r = REASONS.find((q) => q.id === S.cmpR);
            return r.id === 'polar' ? true : r.fb;
          },
          explain: '심층 용존 산소는 해역 B(6.2 mL/L)가 해역 A(0.8 mL/L)보다 훨씬 높아요. 고위도에서 찬 해수는 산소를 많이 녹이고, 그 물이 <b>침강해 심층으로 흘러들기</b> 때문이에요.',
        },
        {
          type: 'quiz', title: '실제 자료는 어디에서 볼까요?',
          goal: '위성·ARGO의 <b>실제 관측 자료</b>를 볼 수 있는 가장 알맞은 방법은 무엇일까요?', setup() { S.reasonOn = false; setView('cmp'); },
          choices: ['기상청·국립해양조사원·ARGO 누리집에서 공개된 자료를 지도와 그래프로 확인해요', '교과서에 실린 값만 사용할 수 있어요', '직접 바다에 부이를 띄워야만 알 수 있어요', '위성 사진은 색깔이 있어서 자료로 쓸 수 없어요'],
          answer: 0,
          feedback: ['', '교과서의 표는 예시예요. 실제 관측 자료는 누구나 공개 누리집에서 볼 수 있어요.', '전 세계 ARGO 부이 자료는 공개되어 있어서 직접 띄우지 않아도 읽을 수 있어요.', '위성 영상의 색은 수온·염분 값을 색으로 나타낸 것이라서 값을 읽어 분석할 수 있어요.'],
          explain: '이 차시의 표와 그래프는 교육용 예시 자료예요. ' + SRC_LINE + ' 직접 내려받은 자료로 오늘 배운 분포를 확인해 보면 좋아요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-ocean-properties', mount: '#game', badge: '해양 자료 분석가', homeHref: '../../index.html#he',
    featureLabels: { map: '🛰️ 위성 색 지도 · 🛟 ARGO 부이 · 연직 수온 그래프', lat: '📍 위도별 수온·염분 점 찍기', prof: '📈 깊이별 수온 곡선 4개', evap: '📊 증발 − 강수 막대', sat: '🫧 포화 용존 산소 실험', o2: '🧩 원인 카드', cmp: '📋 두 해역 자료표' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.cycT = (S.cycT + dt) % CY_TOT;
    S.tempS = approach(S.tempS, S.temp, dt, 7);
    S.evK = approach(S.evK, S.evap ? 1 : 0, dt, 4.5);
    S.handles.forEach((h) => { if (h.shake > 0) h.shake = Math.max(0, h.shake - dt); });
    if (S.view === 'map' && S.buoy && S.prog >= 0.12 && S.depth === 200 && !S.read[S.buoy]) {
      S.read[S.buoy] = true; Sound.success(); const q = mapXY(BUOYS[S.buoy].lon, BUOYS[S.buoy].lat); parts.burst(q[0], q[1], { count: 12, speed: 100, size: 3, life: 0.6, colors: [BUOYS[S.buoy].col, '#fff'] });
    }
    if (S.view === 'sat') updateO2Mol(dt);
    if (S.view === 'o2') oBoard.update(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e6f1fa'; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'map') { drawMap(t); drawCycle(LY.cyc, t); drawProfile(LY.prof, t); drawInfo1(LY.info); }
    else if (S.view === 'lat') drawLat(t);
    else if (S.view === 'prof') drawProfView(t);
    else if (S.view === 'evap') drawEvap(t);
    else if (S.view === 'sat') drawSat(t);
    else if (S.view === 'o2') drawO2(t);
    else drawCmp(t);
    parts.draw(ctx);
    drawFlash(dt, 10);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, LY, GEO, oBoard, BKEYS, BUOYS, PROF, SAT_T, TAGS, O2_CARDS,
    get game() { return game; },
    enterLevel, setView, selectBuoy, setMap, valAtY, yAtVal, latDone,
    placeAll(kind) { S.handles.forEach((h) => { if (!kind || h.kind === kind) { h.placed = true; h.y = yAtVal(h.kind, LATVAL[h.kind][h.i]); } }); },
    solvePf() { TAGS.forEach((tg, i) => { S.pfPick[tg] = PROF[S.pfOrder[i]].name; }); updateCtl(); },
    solveO2() { O2_CARDS.forEach((c) => { const cc = oBoard.cards.find((x) => x.id === c.id); cc.zone = c.ans; }); oBoard.layout(true); },
  };

})();
