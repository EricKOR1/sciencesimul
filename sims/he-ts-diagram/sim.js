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
     지구과학 Ⅰ. 대기와 해양의 상호작용 - 해수의 밀도와 T-S도
     [12지구01-01] 해수의 온도, 염분, 밀도 등의 분포를 실측 자료로 분석·해석
     ① 실험: 시료의 질량으로 밀도 구하기    ② 탐구: 수온·염분을 바꿔 밀도류 관찰
     ③ 분석: T-S도에 수괴 찍고 등밀도선 읽기  ④ 적용: 표층수 냉각·증발·결빙과 침강
     밀도 ρ(T, S)는 표층 압력의 해수 상태 방정식으로 계산하고, 수압 효과와 방정식 유도는 다루지 않아요.
     ========================================================= */
  initStage('#e8f2f8', 800, 560, 600, 840, 1.25);
  const sq = Math.sqrt;
  const SRC_LINE = '실제 자료는 기상청·국립해양조사원·ARGO 누리집에서 확인해 볼 수 있어요.';
  const r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
  const tx = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const RHO = (T, S) => rho(T, S);

  /* ---------- 자료 (모두 예시) ---------- */
  const SAMPLES = {
    A: { T: 20, S: 35, m: 102.5, col: '#38bdf8' },
    B: { T: 5, S: 35, m: 102.8, col: '#0ea5e9' },
    C: { T: 20, S: 30, m: 102.1, col: '#7dd3fc' },
  };
  const SKEYS = ['A', 'B', 'C'];
  SKEYS.forEach((k) => { SAMPLES[k].rho = SAMPLES[k].m / 100; });       // g/mL (질량 ÷ 100 mL)
  const MASSES = [
    { id: 'surf', name: '표층수', T: 25, S: 35.5, col: '#f97316' },
    { id: 'ther', name: '수온 약층수', T: 10, S: 35.0, col: '#eab308' },
    { id: 'aaiw', name: '남극 중층수', T: 4, S: 34.4, col: '#16a34a' },
    { id: 'nadw', name: '북대서양 심층수', T: 3, S: 34.9, col: '#2563eb' },
    { id: 'aabw', name: '남극 저층수', T: -0.5, S: 34.7, col: '#7c3aed' },
  ];
  MASSES.forEach((m) => { m.rho = RHO(m.T, m.S); });
  const MBY = {}; MASSES.forEach((m) => { MBY[m.id] = m; });
  const DEEP = MBY.nadw, RHO_DEEP = r2(DEEP.rho);
  const TL = 20, SL = 35;                              // 수조 왼쪽(붉은 잉크) 고정값
  const FREEZE = (S) => -0.054 * S;                    // 해수의 어는점 (예시 근사)

  /* ---------- 화면 배치 ---------- */
  const LY = PHONE ? {
    lab: { x: 12, y: 12, w: 576, h: 316 }, labTab: { x: 12, y: 338, w: 576, h: 232 },
    tank: { x: 12, y: 12, w: 576, h: 340 }, bars: { x: 12, y: 362, w: 576, h: 250 },
    ts: { x: 12, y: 12, w: 576, h: 450 }, tray: { x: 12, y: 472, w: 576, h: 356 },
    cool: { x: 12, y: 12, w: 576, h: 392 }, scene: { x: 12, y: 414, w: 576, h: 414 },
    col: { x: 12, y: 12, w: 576, h: 540 },
  } : {
    lab: { x: 12, y: 10, w: 776, h: 330 }, labTab: { x: 12, y: 350, w: 776, h: 200 },
    tank: { x: 12, y: 10, w: 776, h: 310 }, bars: { x: 12, y: 330, w: 776, h: 220 },
    ts: { x: 12, y: 10, w: 548, h: 540 }, tray: { x: 572, y: 10, w: 216, h: 540 },
    cool: { x: 12, y: 10, w: 470, h: 540 }, scene: { x: 494, y: 10, w: 294, h: 540 },
    col: { x: 12, y: 10, w: 776, h: 540 },
  };

  /* ---------- 등밀도선 (T-S도 배경) ---------- */
  function solveS(T, target) {            // ρ(T, S) = target 인 S (이분법)
    let lo = 20, hi = 50;
    for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (RHO(T, mid) < target) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  function isoLine(target, tmin, tmax, smin, smax) {
    const pts = [];
    for (let T = tmin; T <= tmax + 1e-9; T += 0.25) { const S = solveS(T, target); pts.push([S, T]); }
    return pts;
  }

  /* ---------- 상태 ---------- */
  const S = {
    view: 'lab', clock: 0, fade: 0, stage: 1,
    // 1단계 실험
    sel: null, bal: 0, recL: {}, weighed: {}, heavy: null,
    cyl: null,
    // 2단계 수조
    tk: { T: 20, S: 35, open: false, lift: 0, p: 0, frozenT: null, frozenS: null, sd: 0, drho: 0, rL: 0, rR: 0 },
    // 3단계 T-S도
    cards: null, drag: null, selCard: null, picks: [], judged: {}, jfb: 0, tsDone: 0,
    // 4단계
    cool: { X: 0, S: 35.2, T: 8, Td: 8, Sd: 35.2, sink: 0, ice: 0, path: [] },
    colPick: {}, colSort: false, colReveal: false, cols: null,
  };
  let game = null;


  /* =========================================================
     1단계: 질량으로 밀도 구하기 (눈금 실린더 + 전자저울)
     ========================================================= */
  function labG() {
    const R = LY.lab, bench = R.y + R.h - (PHONE ? 86 : 62);
    const cw = PHONE ? 50 : 62, ch = PHONE ? 130 : 156;
    const slots = SKEYS.map((k, i) => ({ x: R.x + (PHONE ? 60 : 64) + i * (PHONE ? 92 : 112), y: bench }));
    const bal = { cx: R.x + R.w - (PHONE ? 118 : 160), w: PHONE ? 176 : 224, baseH: PHONE ? 46 : 50 };
    bal.pan = bench - bal.baseH - 6;
    return { R, bench, cw, ch, slots, bal };
  }
  function initLab() {
    const g = labG(); S.cyl = {};
    SKEYS.forEach((k, i) => { S.cyl[k] = { x: g.slots[i].x, y: g.slots[i].y, tx: g.slots[i].x, ty: g.slots[i].y }; });
    S.sel = null; S.bal = 0; S.recL = {}; S.weighed = {}; S.heavy = null; S.balOk = 0;
  }
  initLab();
  function selectSample(k) {
    const g = labG();
    S.sel = S.sel === k ? null : k;
    SKEYS.forEach((q, i) => {
      const c = S.cyl[q];
      if (q === S.sel) { c.tx = g.bal.cx; c.ty = g.bal.pan; } else { c.tx = g.slots[i].x; c.ty = g.slots[i].y; }
    });
    S.balOk = 0; Sound.click();
  }
  function drawCyl(k, t) {
    const g = labG(), smp = SAMPLES[k], c = S.cyl[k], w = g.cw, h = g.ch, x = c.x, yb = c.y, moving = Math.hypot(c.tx - c.x, c.ty - c.y) > 1.5;
    const lift = moving ? 6 : 0;
    ctx.save();
    ctx.fillStyle = 'rgba(40,60,90,.16)'; ctx.beginPath(); ctx.ellipse(x, yb + 3, w * 0.62, 5, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -lift);
    const x0 = x - w / 2, y0 = yb - h, lvl = yb - h * 0.8;
    ctx.save(); rr(x0, y0, w, h, 7).clip();
    const lg = ctx.createLinearGradient(0, lvl, 0, yb); lg.addColorStop(0, rgba(smp.col, 0.55)); lg.addColorStop(1, rgba(smp.col, 0.85)); ctx.fillStyle = lg;
    ctx.beginPath(); ctx.moveTo(x0, yb); for (let i = 0; i <= 14; i++) ctx.lineTo(x0 + (w * i) / 14, lvl + Math.sin(t * 2.6 + i * 0.8 + x * 0.05) * (moving ? 2.2 : 0.9)); ctx.lineTo(x0 + w, yb); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x0 + 4, lvl - 1, w - 8, 3);
    ctx.restore();
    ctx.strokeStyle = 'rgba(71,96,130,.75)'; ctx.lineWidth = 2.5; rr(x0, y0, w, h, 7).stroke();
    ctx.strokeStyle = 'rgba(71,96,130,.55)'; ctx.lineWidth = 1.2;
    for (let v = 25; v < 125; v += 25) { const ty = yb - h * (v / 125); ctx.beginPath(); ctx.moveTo(x0 + w - 12, ty); ctx.lineTo(x0 + w, ty); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x0 + 7, y0 + 12); ctx.lineTo(x0 + 7, yb - 14); ctx.stroke();
    // 100 mL 눈금 표시
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 8, lvl); ctx.lineTo(x0 + 14, lvl); ctx.stroke();
    if (S.sel === k) D.text(x0 + w + 8, lvl + 4, '100 mL', { size: 12, weight: 800, color: '#b91c1c', align: 'left' });
    D.text(x, yb - h * 0.4, k, { size: 22, weight: 800, color: 'rgba(15,40,70,.65)' });
    ctx.restore();
  }
  function drawLab(t) {
    const g = labG(), R = g.R, b = g.bal;
    panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '해수 시료 100 mL의 질량을 재요', 14.5, '#334155', 'left', 800); dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    // 작업대
    const wood = ctx.createLinearGradient(0, g.bench, 0, g.bench + 16); wood.addColorStop(0, '#c9a27a'); wood.addColorStop(1, '#a9825c');
    ctx.fillStyle = wood; rr(R.x + 10, g.bench, R.w - 20, 16, 6).fill();
    // 이름표
    SKEYS.forEach((k, i) => {
      const sl = g.slots[i], on = S.sel === k, w = PHONE ? 84 : 96, h = PHONE ? 64 : 44;
      D.shadow(() => { ctx.fillStyle = on ? '#e0f2fe' : '#fff'; rr(sl.x - w / 2, g.bench + 22, w, h, 9).fill(); }, { blur: 3, y: 1 });
      ctx.strokeStyle = on ? '#0ea5e9' : '#cbd5e1'; ctx.lineWidth = on ? 2.5 : 1.5; rr(sl.x - w / 2, g.bench + 22, w, h, 9).stroke();
      D.text(sl.x, g.bench + 22 + h * (PHONE ? 0.3 : 0.4), '시료 ' + k, { size: 13.5, weight: 800, color: on ? '#0369a1' : '#1e293b' });
      if (PHONE) { D.text(sl.x, g.bench + 22 + h * 0.58, SAMPLES[k].T + ' °C', { size: 11.5, weight: 700, color: '#64748b' }); D.text(sl.x, g.bench + 22 + h * 0.84, SAMPLES[k].S + ' psu', { size: 11.5, weight: 700, color: '#64748b' }); }
      else D.text(sl.x, g.bench + 22 + h * 0.78, SAMPLES[k].T + ' °C · ' + SAMPLES[k].S + ' psu', { size: 11.5, weight: 700, color: '#64748b' });
    });
    // 전자저울
    D.shadow(() => { const gr = ctx.createLinearGradient(0, g.bench - b.baseH, 0, g.bench); gr.addColorStop(0, '#e5eaf1'); gr.addColorStop(1, '#b6c2d1'); ctx.fillStyle = gr; rr(b.cx - b.w / 2, g.bench - b.baseH, b.w, b.baseH, 10).fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#d3dbe6'; rr(b.cx - 60, b.pan, 120, 8, 4).fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(b.cx - 60, b.pan, 120, 8, 4).stroke();
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(b.cx - 6, b.pan + 8, 12, 6);
    const lx = b.cx - 72, ly = g.bench - b.baseH + 8, lw = 144, lh = b.baseH - 16;
    ctx.fillStyle = '#0b1f17'; rr(lx, ly, lw, lh, 7).fill();
    const stable = Math.abs(S.bal - (S.sel ? SAMPLES[S.sel].m : 0)) < 0.06;
    D.text(lx + lw - 12, ly + lh * 0.72, f1(S.bal) + ' g', { size: PHONE ? 17 : 23, weight: 800, color: '#4ade80', align: 'right' });
    ctx.fillStyle = stable ? '#4ade80' : '#475569'; ctx.beginPath(); ctx.arc(lx + 12, ly + 11, 3.5, 0, TAU); ctx.fill();
    D.text(b.cx, g.bench + 22 + 14, '전자저울', { size: 13, weight: 800, color: '#334155' });
    D.text(b.cx, g.bench + 22 + (PHONE ? 38 : 33), PHONE ? '영점 0.0 g 조정함' : '빈 실린더로 영점(0.0 g)을 맞췄어요', { size: 11.5, weight: 700, color: '#64748b' });
    // 실린더 (움직이는 것을 위에 그림)
    SKEYS.filter((k) => k !== S.sel).forEach((k) => drawCyl(k, t));
    if (S.sel) drawCyl(S.sel, t);
    if (!S.sel) { D.text(R.x + R.w / 2, R.y + 54, '시료를 눌러 저울 위에 올려 보세요', { size: 14, weight: 800, color: '#0369a1' }); const bob = RM ? 0 : Math.sin(t * 3) * 3; D.arrow(R.x + R.w / 2, R.y + 64 + bob, R.x + (PHONE ? 130 : 190), R.y + 104 + bob, { color: '#0ea5e9', width: 3.5 }); }
    // 표
    const T = LY.labTab; panel(T.x, T.y, T.w, T.h);
    tx(T.x + 12, T.y + 22, '나의 측정 기록', 14.5, '#334155', 'left', 800);
    D.text(T.x + T.w - 12, T.y + 22, 'ρ = m / V   (1 g/mL = 1000 kg/m³)', { size: 13, weight: 800, color: '#0369a1', align: 'right' });
    const W = T.w - 24, fr = [0.13, 0.27, 0.17, 0.13, 0.30], cw = fr.map((f) => W * f), rh = PHONE ? 52 : 44, hh = 32, ty = T.y + 34;
    ctx.fillStyle = '#e8f1fa'; ctx.fillRect(T.x + 12, ty, W, hh);
    let xx = T.x + 12;
    ['시료', '수온·염분', '질량 m', '부피 V', '밀도 ρ'].forEach((s2, j) => { D.text(xx + cw[j] / 2, ty + hh * 0.66, s2, { size: 13, weight: 800, color: '#0f4c75' }); xx += cw[j]; });
    ctx.strokeStyle = '#d6e2ee'; ctx.lineWidth = 1; ctx.strokeRect(T.x + 12, ty, W, hh);
    SKEYS.forEach((k, i) => {
      const y = ty + hh + i * rh, smp = SAMPLES[k], rec = S.recL[k] != null, wei = S.weighed[k];
      let x2 = T.x + 12;
      const cells = [
        ['시료 ' + k, '#1e293b', 15], [smp.T + ' °C · ' + smp.S + ' psu', '#475569', 13],
        [wei ? f1(smp.m) + ' g' : '?', wei ? '#0f172a' : '#94a3b8', 16], ['100 mL', '#475569', 14], [rec ? S.recL[k].toFixed(3) + ' g/mL' : '?', rec ? '#15803d' : '#94a3b8', 16],
      ];
      cells.forEach((cc, j) => {
        if (j === 4 && rec) { ctx.fillStyle = 'rgba(22,163,74,.13)'; ctx.fillRect(x2 + 1, y + 1, cw[j] - 2, rh - 2); }
        D.text(x2 + cw[j] / 2, y + rh * (j === 4 && rec ? 0.46 : 0.62), cc[0], { size: cc[2], weight: 800, color: cc[1] });
        if (j === 4 && rec) D.text(x2 + cw[j] / 2, y + rh * 0.8, '= ' + Math.round(S.recL[k] * 1000) + ' kg/m³', { size: 12, weight: 700, color: '#15803d' });
        x2 += cw[j];
      });
      ctx.strokeStyle = '#d6e2ee'; ctx.lineWidth = 1; ctx.strokeRect(T.x + 12, y, W, rh);
    });
    if (S.heavy) D.label(T.x + T.w - 14, T.y + T.h - 14, '가장 무거운 시료: ' + S.heavy, { bg: '#15803d', size: 12.5, pad: 8, align: 'right' });
  }


  /* =========================================================
     2단계: 수조 두 칸 - 수온·염분에 따른 밀도류
     ========================================================= */
  const COL_L = '#ef4444', COL_R = '#3b82f6';
  function tankG() {
    const R = LY.tank, x = R.x + (PHONE ? 30 : 60), y = R.y + (PHONE ? 84 : 76), w = R.w - (PHONE ? 60 : 120), h = PHONE ? 200 : 190;
    return { R, x, y, w, h, cx: x + w / 2, cy: y + h / 2 + 8, ix: x + 5, iy: y + 16, iw: w - 10, ih: h - 21 };
  }
  const TRN = PHONE ? 56 : 80;
  const TR = [];
  function initTracers() {
    TR.length = 0; const g = tankG();
    ['L', 'R'].forEach((side) => {
      for (let i = 0; i < TRN; i++) {
        const cand = []; for (let k = 0; k < 30; k++) cand.push([Math.random(), Math.random()]);
        const tr = { side, cand, ci: 0, x: 0, y: 0, tx: 0, ty: 0 };
        TR.push(tr);
      }
    });
    tkRegions(); TR.forEach((tr) => { pickTarget(tr, true); tr.x = tr.tx; tr.y = tr.ty; });
  }
  const tkN = () => { const tk = S.tk, phi = (Math.PI / 2) * smooth(tk.p), sd = tk.sd || 1; return [sd * Math.cos(phi), Math.sin(phi)]; };
  const isDenseSide = (side) => (side === 'R') === ((S.tk.sd || 1) > 0);
  function inReg(tr, x, y, m) {
    const g = tankG(), n = tkN(), d = (x - g.cx) * n[0] + (y - g.cy) * n[1];
    return isDenseSide(tr.side) ? d >= m : d <= -m;
  }
  function tkRegions() {}
  function pickTarget(tr, force) {
    const g = tankG();
    if (!force && inReg(tr, tr.tx, tr.ty, 5)) return;
    for (let k = 0; k < tr.cand.length; k++) {
      const c = tr.cand[(tr.ci + k) % tr.cand.length], x = g.ix + 5 + c[0] * (g.iw - 10), y = g.iy + 5 + c[1] * (g.ih - 10);
      if (inReg(tr, x, y, 8)) { tr.tx = x; tr.ty = y; tr.ci = (tr.ci + k + 1) % tr.cand.length; return; }
    }
  }
  function clipHP(poly, c, n) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = (a[0] - c[0]) * n[0] + (a[1] - c[1]) * n[1], db = (b[0] - c[0]) * n[0] + (b[1] - c[1]) * n[1];
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) { const u = da / (da - db); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
    }
    return out;
  }
  function tkReset() {
    const tk = S.tk; SciSim.tween(tk, { lift: 0 }, { duration: 0.0001 }); SciSim.tween(tk, { p: 0 }, { duration: 0.0001 });
    tk.open = false; tk.lift = 0; tk.p = 0; tk.frozenT = null; tk.frozenS = null; tk.sd = 0; tk.drho = 0;
    initTracers();
  }
  function tkOpen() {
    const tk = S.tk; if (tk.open) return;
    tk.open = true; tk.frozenT = tk.T; tk.frozenS = tk.S;
    tk.rL = r1(RHO(TL, SL)); tk.rR = r1(RHO(tk.T, tk.S)); tk.drho = r1(tk.rR - tk.rL);
    tk.sd = tk.drho > 0 ? 1 : tk.drho < 0 ? -1 : 0;
    SciSim.tween(tk, { lift: 1 }, { duration: 0.9, ease: 'inOutQuad' });
    Sound.click();
  }
  function updateTank(dt) {
    const tk = S.tk;
    if (tk.open && tk.lift >= 0.9 && tk.sd !== 0 && tk.p < 1) tk.p = Math.min(1, tk.p + 0.16 * sq(Math.abs(tk.drho)) * dt);
    TR.forEach((tr) => {
      pickTarget(tr, false);
      const rate = tk.open ? 2.4 : 6;
      tr.x = approach(tr.x, tr.tx, dt, rate) + rnd(-0.25, 0.25); tr.y = approach(tr.y, tr.ty, dt, rate) + rnd(-0.25, 0.25);
      const g = tankG(), n = tkN(), d = (tr.x - g.cx) * n[0] + (tr.y - g.cy) * n[1], dense = isDenseSide(tr.side);
      const need = dense ? 2 - d : d + 2;
      if (need > 0) { const sgn = dense ? 1 : -1; tr.x += sgn * n[0] * need; tr.y += sgn * n[1] * need; }
      tr.x = clamp(tr.x, g.ix + 3, g.ix + g.iw - 3); tr.y = clamp(tr.y, g.iy + 3, g.iy + g.ih - 3);
    });
  }
  /* 칸막이를 연 뒤: 지금 조건에서 계산한 값 */
  const tkRhos = () => { const tk = S.tk; return { rL: r1(RHO(TL, SL)), rR: r1(RHO(tk.T, tk.S)) }; };
  const tkSank = () => { const tk = S.tk; return tk.open && tk.sd > 0 && tk.p >= 0.75; };
  S.barL = RHO(TL, SL); S.barR = RHO(20, 35);
  function drawTank(t, dt) {
    const g = tankG(), R = g.R, tk = S.tk;
    panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '수조 두 칸: 칸막이를 열면 어떻게 될까?', 14.5, '#334155', 'left', 800);
    // 이름표
    const rd = tkRhos(), shown = tk.open ? { T: tk.frozenT, S: tk.frozenS } : { T: tk.T, S: tk.S };
    D.label(g.x + g.w * 0.25, R.y + 48, '왼쪽 (붉은 잉크) ' + TL + ' °C · ' + SL + ' psu', { bg: COL_L, size: 12.5, pad: 8 });
    D.label(g.x + g.w * 0.75, R.y + 48, '오른쪽 (푸른 잉크) ' + shown.T + ' °C · ' + f1(shown.S) + ' psu', { bg: COL_R, size: 12.5, pad: 8 });
    // 물
    const rect = [[g.ix, g.iy], [g.ix + g.iw, g.iy], [g.ix + g.iw, g.iy + g.ih], [g.ix, g.iy + g.ih]];
    const n = tkN(), c = [g.cx, g.cy], dense = rect, nn = [n[0], n[1]];
    const denseCol = (tk.sd >= 0) ? COL_R : COL_L, lightCol = (tk.sd >= 0) ? COL_L : COL_R;
    const polyD = clipHP(rect, c, nn), polyL = clipHP(rect, c, [-nn[0], -nn[1]]);
    ctx.save(); rr(g.x + 2, g.y + 2, g.w - 4, g.h - 4, 8).clip();
    ctx.fillStyle = '#eaf4fb'; ctx.fillRect(g.x, g.y, g.w, g.h);
    const fillP = (poly, col) => { if (poly.length < 3) return; ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = rgba(col, 0.32); ctx.fill(); };
    fillP(polyD, denseCol); fillP(polyL, lightCol);
    // 경계 면의 은은한 선
    if (tk.open && tk.lift > 0.9) { const px = -nn[1], py = nn[0]; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.cx - px * 400, g.cy - py * 400); ctx.lineTo(g.cx + px * 400, g.cy + py * 400); ctx.stroke(); }
    // 물 입자
    TR.forEach((tr) => { ctx.fillStyle = tr.side === 'L' ? '#dc2626' : '#1d4ed8'; ctx.beginPath(); ctx.arc(tr.x, tr.y, 2.8, 0, TAU); ctx.fill(); });
    // 흐름 화살표
    if (tk.open && tk.sd !== 0 && tk.p > 0.03 && tk.p < 0.92) {
      const a = Math.min(1, (0.92 - tk.p) * 4) * Math.min(1, tk.p * 10), sgn = tk.sd, len = 40 + 14 * sq(Math.abs(tk.drho));
      ctx.globalAlpha = a;
      D.arrow(g.cx + sgn * -10 + (sgn > 0 ? 0 : 0), g.iy + g.ih - 16, g.cx - sgn * len - 10 * sgn, g.iy + g.ih - 16, { color: denseCol, width: 4 });
      D.arrow(g.cx + sgn * 10, g.iy + 20, g.cx + sgn * len + 10 * sgn, g.iy + 20, { color: lightCol, width: 4 });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // 칸막이 (위로 올려요)
    const L = g.h + 10, off = tk.lift * L;
    ctx.save(); ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
    D.shadow(() => { const gr = ctx.createLinearGradient(g.cx - 4, 0, g.cx + 4, 0); gr.addColorStop(0, '#9aa7b8'); gr.addColorStop(1, '#6b7a8e'); ctx.fillStyle = gr; rr(g.cx - 4, g.y - 12 - off, 8, L + 6, 2).fill(); }, { blur: 3, y: 1 });
    ctx.fillStyle = '#475569'; rr(g.cx - 14, g.y - 22 - off, 28, 12, 5).fill();
    ctx.restore();
    // 유리 수조
    ctx.save(); ctx.strokeStyle = 'rgba(71,96,130,.85)'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h - 8); ctx.quadraticCurveTo(g.x, g.y + g.h, g.x + 8, g.y + g.h); ctx.lineTo(g.x + g.w - 8, g.y + g.h); ctx.quadraticCurveTo(g.x + g.w, g.y + g.h, g.x + g.w, g.y + g.h - 8); ctx.lineTo(g.x + g.w, g.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.x + 9, g.y + 14); ctx.lineTo(g.x + 9, g.y + g.h - 18); ctx.stroke(); ctx.restore();
    // 안내 문구
    let msg;
    if (!tk.open) msg = '칸막이가 막고 있어요. 열기 전에 어느 쪽이 무거울지 예상해 봐요.';
    else if (tk.sd === 0) msg = '두 물의 밀도가 같아서 칸막이를 열어도 움직이지 않아요.';
    else if (tk.sd > 0) msg = '푸른 물이 더 무거워서 바닥을 따라 파고들고, 붉은 물은 위로 올라타요.';
    else msg = '붉은 물이 더 무거워서 바닥을 따라 파고들고, 푸른 물은 위로 올라타요.';
    D.text(R.x + R.w / 2, R.y + R.h - 12, msg, { size: 13.5, weight: 800, color: '#0369a1' });
    // 밀도 막대
    const B = LY.bars; panel(B.x, B.y, B.w, B.h);
    tx(B.x + 12, B.y + 22, '밀도 비교 (수온·염분으로 계산한 값)', 14.5, '#334155', 'left', 800);
    const lab0 = B.x + (PHONE ? 14 : 16), bx0 = B.x + (PHONE ? 130 : 210), bx1 = B.x + B.w - (PHONE ? 96 : 120), lo = 1018, hi = 1031;
    const xv = (v) => bx0 + (bx1 - bx0) * clamp((v - lo) / (hi - lo), 0, 1);
    S.barL = approach(S.barL, RHO(TL, SL), dt, 8); S.barR = approach(S.barR, RHO(tk.T, tk.S), dt, 8);
    const rows = [[S.barL, COL_L, '왼쪽 ' + TL + ' °C · ' + SL + ' psu', rd.rL], [S.barR, COL_R, '오른쪽 ' + tk.T + ' °C · ' + f1(tk.S) + ' psu', rd.rR]];
    const by = B.y + 52, bh = PHONE ? 38 : 34, gap = PHONE ? 54 : 52;
    [1018, 1022, 1026, 1030].forEach((v) => { ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xv(v), by - 8); ctx.lineTo(xv(v), by + gap + bh + 6); ctx.stroke(); D.text(xv(v), by + gap + bh + 22, String(v), { size: 12, weight: 700, color: '#64748b' }); });
    D.text((bx0 + bx1) / 2, by + gap + bh + 40, '밀도 (kg/m³) — 축은 1018에서 시작해요', { size: 12, weight: 700, color: '#64748b' });
    rows.forEach((r, i) => {
      const y = by + i * gap;
      ctx.fillStyle = r[1]; ctx.globalAlpha = 0.85; ctx.fillRect(bx0, y, Math.max(0, xv(r[0]) - bx0), bh); ctx.globalAlpha = 1;
      ctx.strokeStyle = r[1]; ctx.lineWidth = 2; ctx.strokeRect(bx0, y, Math.max(0, xv(r[0]) - bx0), bh);
      if (PHONE) { D.text(lab0, y + bh * 0.4, r[2].split(' ')[0], { size: 12.5, weight: 800, color: '#334155', align: 'left' }); D.text(lab0, y + bh * 0.9, r[2].slice(r[2].indexOf(' ') + 1), { size: 12, weight: 700, color: '#475569', align: 'left' }); } else D.text(lab0, y + bh * 0.62, r[2], { size: 12.5, weight: 800, color: '#334155', align: 'left' });
      D.text(xv(r[0]) + 8, y + bh * 0.66, f1(r[3]), { size: 16, weight: 800, color: '#0f172a', align: 'left' });
    });
    const diff = r1(rd.rR - rd.rL);
    const vs = diff > 0 ? '오른쪽이 ' + f1(diff) + ' 더 무거워요' : diff < 0 ? '오른쪽이 ' + f1(-diff) + ' 더 가벼워요' : '두 물의 밀도가 같아요';
    D.label(B.x + B.w - 14, B.y + 20, vs, { bg: diff === 0 ? '#64748b' : diff > 0 ? COL_R : COL_L, size: 13, pad: 9, align: 'right' });
  }


  /* =========================================================
     3단계: T-S도 (수괴 점 찍기 · 등밀도선 · 두 물의 비교와 혼합)
     ========================================================= */
  const TSO = { l: PHONE ? 66 : 54, r: 14, t: 36, b: 44, xmin: 33, xmax: 36, ymin: -2, ymax: 30, xticks: [33, 34, 35, 36], yticks: [0, 10, 20, 30], xlabel: '염분 (psu)', ylabel: '수온 (°C)', size: 12 };
  const TSP = plotFrame(LY.ts, Object.assign({ noDraw: true }, TSO));
  const ISO_ALL = []; for (let v = 1020; v <= 1029; v++) ISO_ALL.push({ v, pts: isoLine(v, -2, 30) });
  const ISO_BOLD = [1024, 1026, 1027, 1028];
  function drawIso(P, levels, bold, labelAt, o) {
    o = o || {};
    ctx.save(); ctx.beginPath(); ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.clip();
    levels.forEach((L) => {
      const b = bold.indexOf(L.v) >= 0;
      polyline(L.pts.map((q) => [P.gx(q[0]), P.gy(q[1])]), b ? '#0e7490' : '#7fb6c9', b ? 2.4 : 1.4, { dash: b ? null : [4, 4], alpha: b ? 0.95 : 0.8 });
    });
    ctx.restore();
    levels.forEach((L) => {
      if (!labelAt(L)) return;
      // 그림 상자 안의 마지막 점 근처에 이름표
      let best = null;
      L.pts.forEach((q) => { if (q[0] <= P.xmaxv - 0.04 && q[0] >= P.xminv + 0.02 && q[1] <= P.ymaxv - 0.5 && q[1] >= P.yminv + 0.3) best = q; });
      if (best) D.label(P.gx(best[0]) - 4, P.gy(best[1]) - 1, String(L.v), { bg: 'rgba(255,255,255,.9)', color: '#0e7490', size: 11.5, pad: 4, align: 'right', border: '#9fd0df' });
    });
  }
  TSP.xminv = TSO.xmin; TSP.xmaxv = TSO.xmax; TSP.yminv = TSO.ymin; TSP.ymaxv = TSO.ymax;

  function trayPos(i) {
    const R = LY.tray;
    if (PHONE) { const col = i % 3, row = Math.floor(i / 3); return { x: R.x + 12 + 88 + col * 184, y: R.y + 40 + 30 + row * 68, w: 176, h: 58 }; }
    return { x: R.x + R.w / 2, y: R.y + 40 + 31 + i * 68, w: 200, h: 60 };
  }
  function initCards() {
    S.cards = MASSES.map((m, i) => { const p = trayPos(i); return { id: m.id, x: p.x, y: p.y, hx: p.x, hy: p.y, w: p.w, h: p.h, placed: false, shake: 0, lift: 0, pop: 0 }; });
    S.drag = null; S.selCard = null; S.picks = []; S.judged = {}; S.jres = null;
  }
  initCards();
  const cardAt = (p) => { for (let i = S.cards.length - 1; i >= 0; i--) { const c = S.cards[i]; if (!c.placed && Math.abs(p.x - c.x) <= c.w / 2 && Math.abs(p.y - c.y) <= c.h / 2) return c; } return null; };
  const markerPos = (id) => { const m = MBY[id]; return { x: TSP.gx(m.S), y: TSP.gy(m.T) }; };
  const markerAt = (p) => { for (const m of MASSES) { const c = S.cards.find((q) => q.id === m.id); if (c.placed) { const q = markerPos(m.id); if (Math.hypot(q.x - p.x, q.y - p.y) <= (PHONE ? 22 : 18)) return m; } } return null; };
  const inPlot = (p) => p.x >= TSP.x0 - 14 && p.x <= TSP.x1 + 14 && p.y >= TSP.y0 - 14 && p.y <= TSP.y1 + 14;
  function tryDrop(c, p) {
    const m = MBY[c.id], q = markerPos(c.id);
    if (inPlot(p) && Math.hypot(q.x - p.x, q.y - p.y) <= (PHONE ? 28 : 22)) {
      c.placed = true; c.pop = 1; SciSim.tween(c, { pop: 0 }, { duration: 0.6, ease: 'outCubic' });
      Sound.success(); parts.burst(q.x, q.y, { count: 14, speed: 120, size: 3.2, life: 0.7, colors: [m.col, '#fff'] });
      say(m.name + ' (' + mk(m.T) + ' °C, ' + f1(m.S) + ' psu)의 점을 찍었어요.', false, 1.6);
    } else {
      c.shake = 0.4; Sound.fail(); SciSim.tween(c, { x: c.hx, y: c.hy }, { duration: 0.35, ease: 'outCubic' });
      say(inPlot(p) ? m.name + '은(는) 염분 ' + f1(m.S) + ' psu(가로), 수온 ' + mk(m.T) + ' °C(세로) 위치에 놓아요.' : '카드를 T-S도 안쪽 점 위치에 놓아요.', true, 2.6);
    }
  }
  function togglePick(id) {
    const i = S.picks.indexOf(id);
    if (i >= 0) S.picks.splice(i, 1); else { S.picks.push(id); if (S.picks.length > 2) S.picks.shift(); }
    S.jres = null; Sound.click();
  }
  function judge(which) {
    if (S.picks.length < 2) return;
    const a = MBY[S.picks[0]], b = MBY[S.picks[1]], ra = r1(a.rho), rb = r1(b.rho);
    const heavy = ra > rb ? 0 : rb > ra ? 1 : -1, key = [a.id, b.id].sort().join('+');
    if (which === heavy) {
      S.judged[key] = true; Sound.success();
      S.jres = { ok: true, text: '맞아요! ' + [a, b][heavy].name + ' ' + f1([ra, rb][heavy]) + ' > ' + [a, b][1 - heavy].name + ' ' + f1([ra, rb][1 - heavy]) + ' (kg/m³)' };
    } else { Sound.fail(); S.jres = { ok: false, text: '등밀도선을 보세요. 숫자가 큰 등밀도선에 가까운(오른쪽 아래) 점이 더 무거워요.' }; S.jfb = 0.4; }
  }
  const judgedCount = () => Object.keys(S.judged).length;
  const placedMasses = () => S.cards.filter((c) => c.placed).length;

  function drawTS(t) {
    const R = LY.ts; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, 'T-S도 (가로 염분, 세로 수온)', 14.5, '#334155', 'left', 800); dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    const P = plotFrame(R, TSO);
    drawIso(Object.assign(P, { xminv: TSO.xmin, xmaxv: TSO.xmax, yminv: TSO.ymin, ymaxv: TSO.ymax }), ISO_ALL, ISO_BOLD, () => true);
    D.text(P.x1 - 6, P.y1 - 8, '선: 등밀도선 (kg/m³)', { size: 12, weight: 800, color: '#0e7490', align: 'right' });
    // 선택한 두 점과 혼합선
    if (S.picks.length === 2) {
      const a = markerPos(S.picks[0]), b = markerPos(S.picks[1]), A = MBY[S.picks[0]], B = MBY[S.picks[1]];
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = '#be185d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, fl = 6 + Math.sin(t * 5) * 1.2;
      ctx.save(); ctx.fillStyle = '#ec4899'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr0 = i % 2 ? fl * 0.45 : fl * 1.3, ang = -Math.PI / 2 + (i * Math.PI) / 5; ctx.lineTo(mx + Math.cos(ang) * rr0, my + Math.sin(ang) * rr0); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // 점
    MASSES.forEach((m) => {
      const c = S.cards.find((q) => q.id === m.id); if (!c.placed) return;
      const q = markerPos(m.id), sel = S.picks.indexOf(m.id);
      if (sel >= 0) D.ring(q.x, q.y, 14, t, { color: '#be185d', speed: 1, width: 2.5 });
      D.sphere(q.x, q.y, 9 + c.pop * 5, m.col, { outline: '#fff', outlineWidth: 2.5, shadow: true });
      const left = m.id === 'aaiw' || m.id === 'aabw';
      D.text(q.x + (left ? -14 : 14), q.y + 4.5, m.name, { size: 12.5, weight: 800, color: '#1e293b', align: left ? 'right' : 'left', stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
      if (sel >= 0) D.text(q.x, q.y - 16, String(sel + 1), { size: 14, weight: 800, color: '#be185d', stroke: '#fff', strokeWidth: 4 });
    });
    if (placedMasses() === 0 && !S.drag) D.text((P.x0 + P.x1) / 2, (P.y0 + P.y1) / 2, '카드를 끌어와 점을 찍어요', { size: 14, weight: 800, color: '#64748b', alpha: 0.9 });
    // 카드 보관함
    const T = LY.tray; panel(T.x, T.y, T.w, T.h);
    tx(T.x + 12, T.y + 22, '수괴 카드', 14.5, '#334155', 'left', 800);
    S.cards.forEach((c, i) => { if (S.drag !== c) drawCardTS(c, t, i); });
    if (S.drag) drawCardTS(S.drag, t, 0);
    // 안내 · 판정 결과
    const iy = PHONE ? T.y + 40 + 2 * 68 + 14 : T.y + 40 + 5 * 68 + 14, iw = T.w - 24;
    let yy = iy;
    if (S.picks.length === 2) {
      const A = MBY[S.picks[0]], B = MBY[S.picks[1]], mt = (A.T + B.T) / 2, ms = (A.S + B.S) / 2;
      tx(T.x + 12, yy + 4, '① ' + A.name + '  ② ' + B.name, 13, '#be185d', 'left', 800);
      yy = drawWrap(T.x + T.w / 2, yy + 26, '혼합수(1:1)는 두 점을 잇는 직선 위: ' + mk(mt) + ' °C · ' + f1(ms) + ' psu', iw, 12.5, { color: '#475569', lh: 1.25 }) + 22 * FS * 0.9;
    } else {
      yy = drawWrap(T.x + T.w / 2, yy + 8, S.picks.length === 1 ? '점을 하나 더 눌러 두 점을 비교해요.' : '찍힌 점을 눌러 두 점을 고르면 어느 쪽이 무거운지 비교하고, 섞인 물의 위치도 볼 수 있어요.', iw, 12.5, { color: '#475569', lh: 1.25 }) + 20 * FS * 0.9;
    }
    if (S.jres) drawWrap(T.x + T.w / 2, yy + 6, S.jres.text, iw, 12.5, { color: S.jres.ok ? '#15803d' : '#b91c1c', lh: 1.25, weight: 800 });
  }
  function drawCardTS(c, t, i) {
    const m = MBY[c.id], dragging = S.drag === c, sel = S.selCard === c;
    const sh = c.shake > 0 ? Math.sin(c.shake * 50) * 5 : 0;
    ctx.save(); ctx.translate(c.x + sh, c.y - (dragging ? 4 : 0));
    if (c.placed) ctx.globalAlpha = 0.45;
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).fill(); }, { blur: dragging ? 11 : 3, y: dragging ? 5 : 2 });
    ctx.fillStyle = m.col; rr(-c.w / 2, -c.h / 2, 8, c.h, 4).fill();
    ctx.strokeStyle = sel ? '#f59e0b' : '#cfd8e6'; ctx.lineWidth = sel ? 3.5 : 2; rr(-c.w / 2, -c.h / 2, c.w, c.h, 11).stroke();
    D.text(4, -c.h * 0.08, m.name, { size: 14.5, weight: 800, color: '#1e293b' });
    D.text(4, c.h * 0.3, mk(m.T) + ' °C · ' + f1(m.S) + ' psu', { size: 12.5, weight: 700, color: '#475569' });
    ctx.restore();
  }

  /* =========================================================
     4단계 (a): 표층수 냉각·증발·결빙 → T-S 점 이동과 침강
     ========================================================= */
  const COOLO = { l: PHONE ? 66 : 54, r: 14, t: 36, b: 44, xmin: 34, xmax: 36, ymin: -2, ymax: 10, xticks: [34, 34.5, 35, 35.5, 36], yticks: [-2, 0, 2, 4, 6, 8, 10], xfmt: (v) => String(v), size: 12, xlabel: '염분 (psu)', ylabel: '수온 (°C)' };
  const COOLP = plotFrame(LY.cool, Object.assign({ noDraw: true }, COOLO));
  const ISO_COOL = []; for (let v = 1026; v <= 1029.5; v += 0.5) ISO_COOL.push({ v, pts: isoLine(v, -2, 10) });
  const ISO_DEEP = { v: DEEP.rho, pts: isoLine(DEEP.rho, -2, 10) };
  const tCol = (T) => colorStops(['#38bdf8', '#2dd4bf', '#a3e635', '#f97316'], (T + 2) / 16);
  const coolRho = () => RHO(S.cool.T, S.cool.S);
  const coolSinks = () => r2(coolRho()) >= RHO_DEEP;
  const tMin = (s) => Math.ceil(FREEZE(s) * 10 - 1e-9) / 10;
  function coolSet(T, Sx) {
    const c = S.cool; c.S = r1(Sx); c.T = r1(Math.max(T, tMin(c.S))); c.X = r1(8 - c.T);
    const last = c.path[c.path.length - 1]; if (!last || last[0] !== c.S || last[1] !== c.T) c.path.push([c.S, c.T]);
    if (c.path.length > 400) c.path.shift();
  }
  function coolReset() { const c = S.cool; c.X = 0; c.S = 35.2; c.T = 8; c.Td = 8; c.Sd = 35.2; c.sink = 0; c.ice = 0; c.path = [[35.2, 8]]; }
  coolReset();

  function drawCool(t, dt) {
    const R = LY.cool, c = S.cool; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '표층수의 T-S 점 이동 (확대한 T-S도)', 14.5, '#334155', 'left', 800); dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    c.Td = approach(c.Td, c.T, dt, 7); c.Sd = approach(c.Sd, c.S, dt, 7); c.sink = approach(c.sink, coolSinks() ? 1 : 0, dt, 2.4);
    const P = plotFrame(R, COOLO), PP = Object.assign(P, { xminv: COOLO.xmin, xmaxv: COOLO.xmax, yminv: COOLO.ymin, ymaxv: COOLO.ymax });
    drawIso(PP, ISO_COOL, [1026, 1027, 1028, 1029], (L) => Math.abs(L.v - Math.round(L.v)) < 1e-6);
    ctx.save(); ctx.beginPath(); ctx.rect(P.x0, P.y0, P.x1 - P.x0, P.y1 - P.y0); ctx.clip();
    polyline(ISO_DEEP.pts.map((q) => [P.gx(q[0]), P.gy(q[1])]), '#dc2626', 3, { dash: [8, 5] }); ctx.restore();
    D.label(P.x0 + 8, P.y1 - 16, '심층수와 같은 밀도 ' + f2(RHO_DEEP), { bg: '#dc2626', size: 12, pad: 7, align: 'left' });
    // 경로
    polyline(c.path.map((q) => [P.gx(q[0]), P.gy(q[1])]), '#f97316', 2.5, { dash: [2, 4], alpha: 0.9 });
    // 시작점·심층수
    D.sphere(P.gx(35.2), P.gy(8), 5, '#fdba74', { gloss: false, outline: '#fff', outlineWidth: 1.5 }); D.text(P.gx(35.2) + 9, P.gy(8) + 4.5, '시작', { size: 12, weight: 700, color: '#9a3412', align: 'left' });
    D.sphere(P.gx(DEEP.S), P.gy(DEEP.T), 9, DEEP.col, { outline: '#fff', outlineWidth: 2.5, shadow: true });
    D.text(P.gx(DEEP.S) - 14, P.gy(DEEP.T) + 4.5, '북대서양 심층수', { size: 12.5, weight: 800, color: '#1e3a8a', align: 'right', stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    // 표층수 점
    const px = P.gx(c.Sd), py = P.gy(c.Td);
    if (coolSinks()) D.ring(px, py, 17, t, { color: '#16a34a', speed: 1, width: 2.5 });
    D.sphere(px, py, 10, '#f97316', { outline: '#fff', outlineWidth: 2.5, shadow: true });
    D.label(clamp(px + 6, P.x0 + 40, P.x1 - 60), clamp(py - 22, P.y0 + 34, P.y1 - 14), '표층수 ' + mk(c.T) + ' °C · ' + f1(c.S) + ' psu', { bg: '#0f172a', size: 12.5, pad: 7, align: 'left' });
    // 단면 장면
    const Q = LY.scene; panel(Q.x, Q.y, Q.w, Q.h);
    tx(Q.x + 12, Q.y + 22, '북대서양 바닷속 (예시)', 14.5, '#334155', 'left', 800);
    const sx = Q.x + 14, sw = Q.w - 28, seaTop = Q.y + 48, seaBot = Q.y + Q.h - (PHONE ? 132 : 150), deepTop = seaTop + (seaBot - seaTop) * 0.56;
    ctx.save(); rr(sx, seaTop, sw, seaBot - seaTop, 12).clip();
    const g1 = ctx.createLinearGradient(0, seaTop, 0, deepTop); g1.addColorStop(0, rgba(tCol(c.Td), 0.75)); g1.addColorStop(1, rgba(tCol(c.Td), 0.45)); ctx.fillStyle = g1; ctx.fillRect(sx, seaTop, sw, deepTop - seaTop);
    const g2 = ctx.createLinearGradient(0, deepTop, 0, seaBot); g2.addColorStop(0, '#2563eb'); g2.addColorStop(1, '#1e3a8a'); ctx.fillStyle = g2; ctx.fillRect(sx, deepTop, sw, seaBot - deepTop);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, seaTop + 2 + Math.sin(t * 2) * 1.2); ctx.lineTo(sx + sw, seaTop + 2 + Math.sin(t * 2 + 2) * 1.2); ctx.stroke();
    D.text(sx + 10, seaTop + 20, '표층', { size: 12.5, weight: 800, color: '#075985', align: 'left' });
    D.text(sx + 10, deepTop + 20, '심층수 (3 °C · 34.9 psu)', { size: 12.5, weight: 800, color: '#dbeafe', align: 'left' });
    // 표층수 덩어리 (가라앉으면 심층으로 내려가요)
    const r0 = PHONE ? 30 : 34, y0 = seaTop + 34 + r0, y1 = deepTop + (seaBot - deepTop) * 0.55, py2 = y0 + (y1 - y0) * smooth(c.sink), cx2 = sx + sw / 2;
    if (!RM && c.sink > 0.05 && c.sink < 0.98) for (let k = 0; k < 2; k++) parts.emit({ x: cx2 + rnd(-r0, r0) * 0.8, y: py2 - r0 * 0.6, vx: rnd(-6, 6), vy: -rnd(16, 30), life: 0.9, size: 3, color: 'rgba(255,255,255,.8)', shape: 'bubble' });
    D.shadow(() => { ctx.fillStyle = rgba(tCol(c.Td), 0.95); ctx.beginPath(); ctx.ellipse(cx2, py2, r0 * 1.25, r0, 0, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
    D.text(cx2, py2 + 4.5, mk(c.Td) + ' °C · ' + f1(c.Sd), { size: 12.5, weight: 800, color: '#0f172a' });
    // 얼음 조각 (결빙)
    for (let i = 0; i < Math.min(14, c.ice * 2); i++) { const ix = sx + 30 + ((i * 53) % (sw - 60)), iy = seaTop + 8 + Math.sin(t * 1.4 + i) * 2 + (i % 3) * 5; ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.strokeStyle = '#93c5fd'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ix, iy - 7); ctx.lineTo(ix + 8, iy); ctx.lineTo(ix, iy + 7); ctx.lineTo(ix - 8, iy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore();
    if (c.sink > 0.5) D.label(sx + sw / 2, deepTop - 14, '침강!', { bg: '#16a34a', size: 14, pad: 10 });
    // 밀도 막대
    const lo = 1026, hi = 1029, bx0 = Q.x + 16, bx1 = Q.x + Q.w - 70, by = seaBot + 24, bh = PHONE ? 26 : 24;
    const xv = (v) => bx0 + (bx1 - bx0) * clamp((v - lo) / (hi - lo), 0, 1);
    const rows = [[coolRho(), '#f97316', '표층수'], [DEEP.rho, '#2563eb', '심층수']];
    [1026, 1027, 1028, 1029].forEach((v) => { ctx.strokeStyle = '#e1e8f0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(xv(v), by - 6); ctx.lineTo(xv(v), by + 2 * (bh + 8)); ctx.stroke(); D.text(xv(v), by + 2 * (bh + 8) + 15, String(v), { size: 11.5, weight: 700, color: '#64748b' }); });
    rows.forEach((r, i) => { const y = by + i * (bh + 8); ctx.fillStyle = r[1]; ctx.globalAlpha = 0.85; ctx.fillRect(bx0, y, Math.max(0, xv(r[0]) - bx0), bh); ctx.globalAlpha = 1; D.text(bx0 + 6, y + bh * 0.68, r[2], { size: 12.5, weight: 800, color: '#fff', align: 'left' }); D.text(xv(r[0]) + 6, y + bh * 0.68, f2(r2(r[0])), { size: 13.5, weight: 800, color: '#0f172a', align: 'left' }); });
    D.text(Q.x + Q.w / 2, Q.y + Q.h - 8, '밀도 (kg/m³) — 축은 1026에서 시작해요', { size: 11.5, weight: 700, color: '#64748b' });
  }

  /* =========================================================
     4단계 (b): 안정한 층 · 불안정한 층
     ========================================================= */
  const COLS = [['surf', 'ther', 'aabw'], ['nadw', 'surf', 'aabw'], ['aaiw', 'nadw', 'ther']];
  const colStable = (i) => { const a = COLS[i].map((id) => r1(MBY[id].rho)); return a[0] <= a[1] && a[1] <= a[2]; };
  function initCols() {
    S.cols = COLS.map((ids) => ids.map((id, k) => { const sp = new SciSim.Spring(k, { stiffness: 110, damping: 13 }); return { id, sp }; }));
    S.colSort = false; S.colReveal = false;
  }
  initCols();
  function colSortNow() {
    S.colSort = true;
    S.cols.forEach((col) => { const order = col.map((it) => it).sort((a, b) => MBY[a.id].rho - MBY[b.id].rho); order.forEach((it, k) => { it.sp.target = k; }); });
    Sound.click();
  }
  function drawCol(t, dt) {
    const R = LY.col; panel(R.x, R.y, R.w, R.h);
    tx(R.x + 12, R.y + 22, '바닷물 층 쌓기: 안정한 층일까, 불안정한 층일까?', 14.5, '#334155', 'left', 800); dataTag(R.x + R.w - 10, R.y + 20, '예시 자료', 'right');
    const cw = PHONE ? 170 : 200, lh = PHONE ? 88 : 104, top = R.y + 92, step = (R.w - 24) / 3;
    S.cols.forEach((col, i) => {
      const cx = R.x + 12 + step * (i + 0.5), x0 = cx - cw / 2;
      D.label(cx, R.y + 50, '구성 ' + (i + 1), { bg: '#475569', size: 13, pad: 10 });
      D.text(cx, R.y + 74, '위 (바다 표면)', { size: 12, weight: 700, color: '#64748b' });
      col.forEach((it) => it.sp.update(dt));
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - 6, top - 4, cw + 12, lh * 3 + 8); ctx.clip();
      col.slice().sort((a, b) => a.sp.value - b.sp.value).forEach((it) => {
        const m = MBY[it.id], y = top + it.sp.value * lh;
        D.shadow(() => { ctx.fillStyle = rgba(m.col, 0.9); rr(x0, y + 3, cw, lh - 6, 14).fill(); }, { blur: 4, y: 2 });
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; rr(x0, y + 3, cw, lh - 6, 14).stroke();
        D.text(cx, y + lh * 0.42, m.name, { size: 14.5, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 });
        D.text(cx, y + lh * 0.72, 'ρ ' + f1(m.rho) + ' kg/m³', { size: 13, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 });
      });
      ctx.restore();
      // 불안정한 경계 표시 (정렬하기 전에, 판정이 끝난 뒤에만)
      const settled = col.every((it) => Math.abs(it.sp.value - Math.round(it.sp.value)) < 0.02) && !S.colSort;
      if (S.colReveal && settled) {
        COLS[i].forEach((id, k) => { if (k < 2 && r1(MBY[id].rho) > r1(MBY[COLS[i][k + 1]].rho)) { const yy = top + (k + 1) * lh; D.label(cx, yy, '무거운 물이 위에!', { bg: '#dc2626', size: 12, pad: 8 }); } });
      }
      const pk = S.colPick[i], ok = S.colReveal ? colStable(i) : null;
      const chip = S.colSort ? '정렬한 모습 (안정)' : S.colReveal ? (ok ? '안정한 층' : '불안정한 층') : (pk ? '내 판단: ' + pk : '판단 전');
      D.label(cx, top + lh * 3 + 24, chip, { bg: S.colSort ? '#15803d' : S.colReveal ? (ok ? '#15803d' : '#dc2626') : (pk ? '#0369a1' : '#94a3b8'), size: 13, pad: 10 });
    });
    D.text(R.x + R.w / 2, R.y + R.h - 14, S.colSort ? '무거운 물은 아래로, 가벼운 물은 위로 가서 안정한 층이 돼요.' : '아래층이 더 무거우면 안정, 위층이 더 무거우면 불안정해요.', { size: 13.5, weight: 800, color: '#0369a1' });
  }


  /* =========================================================
     조작 · 읽기 칸 · 단계와 미션
     ========================================================= */
  const VIEW_LABEL = { lab: '⚖️ 해수 시료의 밀도 측정', tank: '🌊 수조 두 칸 실험', ts: '📈 T-S도', cool: '🧊 표층수 냉각·증발·결빙', col: '🧱 안정한 층·불안정한 층' };
  const setTw = (obj, prop, val, dur, ease) => SciSim.tween(obj, { [prop]: val }, { duration: dur, ease: ease || 'outCubic' });
  const modeSeg = $('#modeSeg');
  const labBtns = $$('#labSeg .opt'), heavyBtns = $$('#heavySeg .opt');
  const inRho = $('#inRho');
  const sTkT = $('#sTkT'), oTkT = $('#oTkT'), sTkS = $('#sTkS'), oTkS = $('#oTkS');
  const sCool = $('#sCool'), oCool = $('#oCool');
  S.labStage = 1;

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes.split(' ').includes(S.view); });
    $('#heavyBox').hidden = !(S.view === 'lab' && S.labStage >= 2);
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    if (modeSeg) modeSeg.hidden = !(game && game.free);
    labBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === S.sel));
    heavyBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === S.heavy));
    const tk = S.tk;
    sTkT.disabled = sTkS.disabled = tk.open;
    $('#bTkOpen').disabled = tk.open;
    $('#bTkOpen').textContent = tk.open ? '칸막이를 열었어요' : '▶ 칸막이 열기';
    const two = S.picks.length === 2;
    ['bJ1', 'bJ2'].forEach((id, i) => {
      const b = $('#' + id); b.disabled = !two;
      if (two) { const nm = MBY[S.picks[i]].name; b.textContent = (i === 0 ? '① ' : '② ') + nm + josa(nm, '이/가') + ' 더 무거워요'; }
      else b.textContent = i === 0 ? '① 점을 2개 골라요' : '② 점을 2개 골라요';
    });
    const sinkable = S.cool.T <= tMin(S.cool.S) + 0.1;
    $('#bFreeze').disabled = !sinkable; $('#bEvap').disabled = S.cool.S >= 36 - 1e-9;
    $$('#colRows select').forEach((s) => { s.value = S.colPick[s.dataset.i] || ''; });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));
  labBtns.forEach((b) => b.addEventListener('click', () => { selectSample(b.dataset.k); updateCtl(); }));
  heavyBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.heavy = b.dataset.k; updateCtl(); }));
  function recordRho() {
    if (!S.sel) { Sound.fail(); say('먼저 시료를 눌러 저울 위에 올려요.', true, 2.2); return; }
    if (!S.weighed[S.sel]) { Sound.fail(); say('저울 숫자가 멈출 때까지 기다려요.', true, 2); return; }
    let v = parseFloat(String(inRho.value).replace(/[−–]/g, '-').replace(/,(?=\d{3}(?!\d))/g, '').replace(',', '.'));
    if (isNaN(v)) { Sound.fail(); say('밀도 값을 숫자로 써요. 예: 1.234', true, 2); return; }
    if (v > 100) v = v / 1000;                   // kg/m³ 로 써도 인정
    const exp = SAMPLES[S.sel].rho;
    if (Math.abs(v - exp) <= 0.0015) { S.recL[S.sel] = exp; Sound.success(); say('시료 ' + S.sel + '의 밀도 ' + exp.toFixed(3) + ' g/mL(= ' + Math.round(exp * 1000) + ' kg/m³)를 기록했어요.', false, 2.2); inRho.value = ''; }
    else { Sound.fail(); say('ρ = m / V 에 질량 ' + f1(SAMPLES[S.sel].m) + ' g과 부피 100 mL를 넣어 다시 계산해 봐요.', true, 3); }
    updateCtl();
  }
  $('#bRho').addEventListener('click', recordRho);
  inRho.addEventListener('keydown', (e) => { if (e.key === 'Enter') recordRho(); });
  bindSlider(sTkT, oTkT, (v) => v + ' °C', (v) => { S.tk.T = v; });
  bindSlider(sTkS, oTkS, (v) => f1(v) + ' psu', (v) => { S.tk.S = v; });
  $('#bTkOpen').addEventListener('click', () => { tkOpen(); updateCtl(); });
  function resetTank(T, Sx) { tkReset(); S.tk.T = T; S.tk.S = Sx; setSlider(sTkT, oTkT, T, (v) => v + ' °C'); setSlider(sTkS, oTkS, Sx, (v) => f1(v) + ' psu'); updateCtl(); }
  $('#bTkReset').addEventListener('click', () => { Sound.click(); resetTank(20, 35); });
  $('#bJ1').addEventListener('click', () => { judge(0); updateCtl(); });
  $('#bJ2').addEventListener('click', () => { judge(1); updateCtl(); });
  $('#bTsReset').addEventListener('click', () => { Sound.click(); initCards(); updateCtl(); });
  function syncCoolSlider() { setSlider(sCool, oCool, S.cool.X, (v) => '−' + f1(v) + ' °C'); }
  bindSlider(sCool, oCool, (v) => '−' + f1(v) + ' °C', (v) => { coolSet(8 - v, S.cool.S); syncCoolSlider(); updateCtl(); });
  $('#bEvap').addEventListener('click', () => { Sound.click(); coolSet(S.cool.T, S.cool.S + 0.1); syncCoolSlider(); updateCtl(); say('증발: 물만 날아가 염분이 ' + f1(S.cool.S) + ' psu로 높아졌어요.', false, 2); });
  $('#bFreeze').addEventListener('click', () => { Sound.click(); S.cool.ice++; coolSet(S.cool.T, S.cool.S + 0.2); syncCoolSlider(); updateCtl(); say('결빙: 얼음에는 염류가 거의 없어 남은 바닷물의 염분이 ' + f1(S.cool.S) + ' psu로 높아졌어요.', false, 3); });
  $('#bCoolReset').addEventListener('click', () => { Sound.click(); coolReset(); syncCoolSlider(); updateCtl(); });
  $$('#colRows select').forEach((s) => s.addEventListener('change', () => { Sound.click(); S.colPick[s.dataset.i] = s.value || undefined; }));
  $('#bSort').addEventListener('click', () => { colSortNow(); });

  /* ---------- 포인터 ---------- */
  function labHit(p) {
    const g = labG();
    for (const k of SKEYS) { const c = S.cyl[k]; if (Math.abs(p.x - c.x) <= g.cw / 2 + 12 && p.y <= c.y + 4 && p.y >= c.y - g.ch - 4) return k; }
    for (let i = 0; i < 3; i++) { const sl = g.slots[i]; if (Math.abs(p.x - sl.x) <= 50 && p.y >= g.bench + 20 && p.y <= g.bench + 70) return SKEYS[i]; }
    return null;
  }
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'lab') { const k = labHit(p); if (k) { selectSample(k); updateCtl(); } return false; }
      if (S.view === 'ts') {
        const c = cardAt(p);
        if (c) { S.drag = c; c.ox = p.x - c.x; c.oy = p.y - c.y; c.sx = p.x; c.sy = p.y; c.moved = false; SciSim.tween(c, { x: c.x }, { duration: 0.0001 }); Sound.click(); return true; }
        const m = markerAt(p);
        if (m) { togglePick(m.id); updateCtl(); return false; }
        if (S.selCard && inPlot(p)) { const sc = S.selCard; S.selCard = null; sc.x = p.x; sc.y = p.y; tryDrop(sc, p); }
        return false;
      }
      return false;
    },
    move(p) { const c = S.drag; if (c) { c.x = p.x - c.ox; c.y = p.y - c.oy; if (Math.hypot(p.x - c.sx, p.y - c.sy) > 9) c.moved = true; } },
    up(p) {
      const c = S.drag; if (!c) return; S.drag = null;
      if (!c.moved) { S.selCard = S.selCard === c ? null : c; c.x = c.hx; c.y = c.hy; return; }
      S.selCard = null; tryDrop(c, p);
    },
    hover(p) { if (S.view === 'lab') return labHit(p) ? 'pointer' : 'default'; if (S.view === 'ts') return cardAt(p) ? 'grab' : markerAt(p) ? 'pointer' : 'default'; return 'default'; },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view, tk = S.tk;
    if (v === 'lab') setReadouts(['선택한 시료', S.sel ? '시료 ' + S.sel : '—', '저울 눈금', f1(S.bal) + ' g', '기록한 밀도', Object.keys(S.recL).length + ' / 3']);
    else if (v === 'tank') { const rd = tkRhos(), d = r1(rd.rR - rd.rL); setReadouts(['오른쪽 물', (tk.open ? tk.frozenT : tk.T) + ' °C · ' + f1(tk.open ? tk.frozenS : tk.S) + ' psu', '밀도 차 (오른쪽 − 왼쪽)', (d > 0 ? '+' : d < 0 ? '−' : '') + f1(Math.abs(d)) + ' kg/m³', '칸막이', tk.open ? (tk.sd === 0 ? '열림 (움직임 없음)' : '열림 (' + Math.round(tk.p * 100) + '%)') : '닫힘']); }
    else if (v === 'ts') setReadouts(['찍은 점', placedMasses() + ' / 5', '고른 점', S.picks.length ? S.picks.map((id) => MBY[id].name).join(' · ') : '—', '비교 성공', judgedCount() + ' / 3']);
    else if (v === 'cool') { const c = S.cool; setReadouts(['표층수', mk(c.T) + ' °C · ' + f1(c.S) + ' psu', '표층수 밀도', f2(r2(coolRho())) + ' kg/m³', '심층수 밀도', f2(RHO_DEEP) + (coolSinks() ? ' → 침강' : ' → 아직')]); }
    else setReadouts(['판단한 구성', Object.keys(S.colPick).filter((k) => S.colPick[k]).length + ' / 3', '밀도 큰 순', '저층수 > 심층수 > 중층수', '정렬', S.colSort ? '정렬 완료' : '아직']);
  }

  /* ---------- 단계 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    if (li === 0) { initLab(); S.labStage = 1; inRho.value = ''; setView('lab'); showHint('시료를 눌러 저울에 올려 보세요', 5000); }
    else if (li === 1) { resetTank(20, 35); setView('tank'); showHint('슬라이더를 정하고 칸막이를 열어 봐요', 5000); }
    else if (li === 2) { initCards(); setView('ts'); showHint('카드를 끌어 T-S도에 점을 찍어요', 5000); }
    else { coolReset(); syncCoolSlider(); S.colPick = {}; initCols(); setView('cool'); showHint('수온 슬라이더로 표층수를 식혀 봐요', 5000); }
    updateCtl();
  }
  const OCEANLINE = '<p style="font-size:13.5px;color:var(--muted);margin-top:6px">※ 이 차시의 측정값·자료표는 모두 교육용 <b>예시 자료</b>예요. ' + SRC_LINE + '</p>';
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const mrow = (m) => [m.name, mk(m.T) + ' / ' + f1(m.S), f1(m.rho)];
  const colAllCorrect = () => [0, 1, 2].every((i) => S.colPick[i] === (colStable(i) ? '안정' : '불안정'));
  const tkChipSank = () => tkSank();

  const levels = [
    {
      title: '밀도 측정: 질량으로 밀도 구하기', short: '밀도 측정', icon: '⚖️', phase: '실험', features: ['lab'],
      intro: '<p class="si-q">❓ 탐구 질문: 차갑고 짠 물과 따뜻하고 싱거운 물이 만나면 어느 쪽이 가라앉을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 밀도 = 질량 ÷ 부피 를 배웠고, 바닷물의 수온과 염분(psu)이 위치에 따라 다르다는 것도 배웠어요. 앞 차시에서는 수온·염분의 분포를 자료로 살펴봤어요.</div>' +
        '<p>이번 차시에서는 바닷물의 <b>밀도</b>를 알아봐요. 먼저 눈금 실린더에 담은 해수 시료 <b>100 mL</b>를 전자저울로 재어 <b>ρ = m / V</b>로 밀도를 구해요. (밀도 1 g/mL = 1000 kg/m³)</p>' + OCEANLINE,
      setup() { enterLevel(0); },
      recap: '같은 부피(100 mL)에서 질량이 클수록 밀도가 커요. 밀도 ρ = m / V (1 g/mL = 1000 kg/m³).',
      summary: tb([['시료', '수온·염분', '질량(100 mL)', '밀도'], ['A', '20 °C · 35 psu', '102.5 g', '1.025 g/mL (1025 kg/m³)'], ['B', '5 °C · 35 psu', '102.8 g', '1.028 g/mL (1028 kg/m³)'], ['C', '20 °C · 30 psu', '102.1 g', '1.021 g/mL (1021 kg/m³)']]) + '<ul><li>밀도 ρ = 질량 m ÷ 부피 V. 같은 부피면 질량이 큰 쪽이 밀도가 커요.</li><li>시료 B(찬 물)가 가장 무겁고, 시료 C(싱거운 물)가 가장 가벼워요. (예시 자료)</li></ul>',
      missions: [
        {
          title: '시료 A·B·C의 밀도 구하기',
          goal: '시료를 저울에 올려 질량을 읽고, <b>ρ = m / V</b>를 계산해 <b>밀도(g/mL)</b>를 쓴 뒤 <b>📝 기록</b>을 눌러요. 세 시료 모두 해 봐요.',
          hint: '시료(실린더)를 누르면 저울에 올라가요. 저울 숫자가 멈추면 질량 ÷ 100 mL 를 계산해서 적어요. (예: 질량 102.5 g → 1.025)',
          hold: 0.3, setup() { S.labStage = 1; setView('lab'); },
          status: () => SKEYS.map((k) => '시료 ' + k + ' ' + mark(S.recL[k] != null)).join(' · '),
          check: () => SKEYS.every((k) => S.recL[k] != null),
          explain: '100 mL 시료의 질량이 A 102.5 g, B 102.8 g, C 102.1 g이므로 밀도는 <b>1.025, 1.028, 1.021 g/mL</b>(= 1025, 1028, 1021 kg/m³)예요. 수온이 낮은 B가 가장 크고, 염분이 낮은 C가 가장 작아요.',
        },
        {
          title: '가장 무거운 시료 찾기',
          goal: '같은 100 mL에서 <b>밀도가 가장 큰(가장 무거운) 시료</b>를 고르고 <b>✔ 확인하기</b>를 눌러요.', manual: true, setup() { S.labStage = 2; S.heavy = null; setView('lab'); },
          hint: '표에서 세 시료의 밀도(또는 질량)를 비교해 봐요.',
          status: () => '고른 시료: ' + (S.heavy ? S.heavy : '아직'),
          check: () => (!S.heavy ? '가장 무거운 시료 버튼을 눌러요.' : S.heavy === 'B' ? true : '시료 ' + S.heavy + '보다 더 큰 밀도가 표에 있어요. 다시 비교해 봐요.'),
          explain: '가장 무거운 시료는 <b>B(5 °C, 35 psu)</b>예요. A와 B는 염분이 같고 수온만 달라요. 수온이 낮은 B가 더 무겁고, A와 C는 수온이 같고 염분만 달라서 염분이 높은 A가 더 무거워요.',
        },
        {
          type: 'quiz', title: '질량과 밀도의 관계', goal: '부피가 같은 두 해수의 질량이 다르면, 밀도는 어떨까요?', setup() { S.labStage = 2; setView('lab'); },
          choices: ['질량이 큰 쪽의 밀도가 더 커요', '부피가 같으면 밀도도 항상 같아요', '질량이 큰 쪽의 밀도가 더 작아요', '밀도는 부피만으로 정해져요'],
          answer: 0,
          feedback: ['', '부피가 같아도 질량이 다르면 밀도(= 질량 ÷ 부피)가 달라요. 시료 A, B, C가 그 예예요.', '밀도 = 질량 ÷ 부피 이므로 부피가 같을 때 질량이 클수록 밀도가 커요.', '밀도는 질량과 부피로 정해져요. 같은 부피에서는 질량이 결정해요.'],
          explain: '밀도 = 질량 ÷ 부피 이므로, <b>같은 부피에서 질량이 클수록 밀도가 커요</b>. 바닷물은 수온과 염분에 따라 같은 부피의 질량이 달라져요.',
        },
      ],
    },
    {
      title: '수온·염분과 밀도류', short: '수온·염분', icon: '🌊', phase: '탐구', features: ['tank'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 100 mL라도 수온과 염분이 다른 시료는 질량이 달라 밀도가 다르다는 것을 확인했어요.</div>' +
        '<p>수조를 칸막이로 나눠 왼쪽에는 <b>20 °C·35 psu</b> 물(붉은 잉크), 오른쪽에는 수온·염분을 바꾼 물(푸른 잉크)을 넣어요. 칸막이를 열면 <b>무거운 물이 아래로 파고드는 밀도류</b>가 생겨요. 아래 막대로 두 물의 밀도를 비교해 보세요.</p>' + OCEANLINE,
      setup() { enterLevel(1); },
      recap: '수온이 낮을수록, 염분이 높을수록 밀도가 커요. 밀도가 큰 물은 아래로 가라앉고 작은 물은 위로 올라가요.',
      summary: '<ul><li>밀도를 결정하는 두 요인: <b>수온(낮을수록 밀도↑)</b>, <b>염분(높을수록 밀도↑)</b>.</li><li>염분 35 psu: 0 °C 1028.1, 5 °C 1027.7, 10 °C 1027.0, 15 °C 1026.0, 20 °C 1024.8, 25 °C 1023.3 kg/m³ (예시)</li><li>10 °C에서 염분이 1 psu 늘면 밀도가 약 0.8 kg/m³ 커져요: 34 psu 1026.2, 35 psu 1027.0, 36 psu 1027.7.</li><li>칸막이를 열면 무거운 물이 바닥을 따라 파고들고 가벼운 물이 위로 올라타는 <b>밀도류</b>가 생겨요.</li></ul>',
      missions: [
        {
          title: '염분만 높여서 가라앉히기',
          goal: '오른쪽 물의 수온을 왼쪽과 같은 <b>20 °C</b>로 두고 <b>염분만 높인</b> 뒤 칸막이를 열어요. 푸른 물이 가라앉으면 성공이에요.',
          hint: '수온 슬라이더는 20 °C 그대로, 염분 슬라이더를 35 psu보다 높게(예: 36 psu) 하고 ▶ 칸막이 열기를 눌러요.',
          hold: 0.5, setup() { resetTank(20, 35); setView('tank'); },
          status: () => { const tk = S.tk, T = tk.open ? tk.frozenT : tk.T, Sx = tk.open ? tk.frozenS : tk.S; return '같은 수온 ' + mark(T === TL) + ' · 염분이 더 높음 ' + mark(Sx > SL) + ' · 푸른 물이 가라앉음 ' + mark(tkSank()); },
          check: () => { const tk = S.tk; return tk.open && tk.frozenT === TL && tk.frozenS >= SL + 0.5 && tkSank(); },
          explain: '수온이 같을 때 염분이 높은 물이 더 무거워요. 예를 들어 20 °C에서 35 psu는 약 1024.8, 36 psu는 약 1025.5 kg/m³예요. 무거운 푸른 물이 바닥을 따라 파고들고 붉은 물은 위로 올라가요.',
        },
        {
          title: '수온만 낮춰서 가라앉히기',
          goal: '오른쪽 물의 염분을 왼쪽과 같은 <b>35 psu</b>로 두고 <b>수온만 낮춘</b> 뒤 칸막이를 열어요. 푸른 물이 가라앉으면 성공이에요.',
          hint: '염분 슬라이더는 35 psu 그대로, 수온 슬라이더를 20 °C보다 훨씬 낮게(예: 10 °C) 하고 칸막이를 열어요. (15 °C 이하)',
          hold: 0.5, setup() { resetTank(20, 35); setView('tank'); },
          status: () => { const tk = S.tk, T = tk.open ? tk.frozenT : tk.T, Sx = tk.open ? tk.frozenS : tk.S; return '같은 염분 ' + mark(Sx === SL) + ' · 수온이 더 낮음(15 °C 이하) ' + mark(T <= 15) + ' · 푸른 물이 가라앉음 ' + mark(tkSank()); },
          check: () => { const tk = S.tk; return tk.open && tk.frozenS === SL && tk.frozenT <= 15 && tkSank(); },
          explain: '염분이 같을 때 수온이 낮은 물이 더 무거워요. 35 psu에서 20 °C는 약 1024.8, 10 °C는 약 1027.0 kg/m³이므로 찬 물이 아래로 파고들어요.',
        },
        {
          type: 'quiz', title: '밀도를 결정하는 두 요인', goal: '해수의 밀도가 <b>커지는</b> 조건을 골라요.', setup() { setView('tank'); },
          choices: ['수온이 높고 염분이 낮을 때', '수온이 낮고 염분이 높을 때', '수온이 낮고 염분도 낮을 때', '수온·염분과 관계없이 항상 같아요'],
          answer: 1,
          feedback: ['따뜻하고 싱거운 물은 밀도가 가장 작은 쪽이에요. 반대로 생각해 봐요.', '', '수온이 낮으면 밀도가 커지지만 염분이 낮으면 밀도가 작아져요. 두 요인의 방향이 달라요.', '수조 실험에서 수온이나 염분을 바꾸면 밀도 막대가 달라졌어요.'],
          explain: '해수의 밀도는 <b>수온이 낮을수록, 염분이 높을수록</b> 커요. 찬 물이나 짠 물이 아래로 가라앉아요.',
        },
      ],
    },
    {
      title: 'T-S도: 수온과 염분으로 밀도 읽기', short: 'T-S도', icon: '📈', phase: '분석', features: ['ts'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수온이 낮을수록, 염분이 높을수록 밀도가 커진다는 것을 확인했어요.</div>' +
        '<p><b>T-S도</b>는 가로축에 염분(S), 세로축에 수온(T)을 놓은 그림이에요. 배경의 <b>등밀도선</b>은 밀도가 같은 점을 이은 선이에요. 수괴(수온·염분이 비슷한 해수 덩어리) 5개를 찍고, 점의 위치로 밀도를 비교해요.</p>' + OCEANLINE,
      setup() { enterLevel(2); },
      recap: 'T-S도에서 같은 등밀도선 위의 점은 밀도가 같고, 오른쪽 아래(수온↓·염분↑)로 갈수록 밀도가 커요. 섞인 물은 두 점을 잇는 직선 위에 놓여요.',
      summary: tb([['수괴', '수온(°C) / 염분(psu)', '밀도(kg/m³)'], mrow(MBY.surf), mrow(MBY.ther), mrow(MBY.aaiw), mrow(MBY.nadw), mrow(MBY.aabw)]) + '<ul><li>등밀도선 위의 점은 밀도가 같아요(1024·1026·1027·1028 kg/m³ 등).</li><li>서로 다른 수온·염분이어도 같은 등밀도선 위에 있으면 밀도가 같아요.</li><li>두 수괴가 섞이면 T-S도에서 두 점을 잇는 직선 위의 점이 돼요.</li></ul>',
      missions: [
        {
          title: '수괴 5개의 T-S 점 찍기',
          goal: '카드에 적힌 수온·염분을 보고 <b>수괴 5개</b>를 T-S도의 알맞은 위치에 끌어다 놓아요.',
          hint: '가로가 염분, 세로가 수온이에요. 카드를 끌어서 그 값의 위치 가까이에 놓으면 점이 찍혀요. (카드를 누른 뒤 T-S도를 눌러도 돼요.)',
          hold: 0.4, setup() { setView('ts'); },
          status: () => '찍은 점 ' + placedMasses() + ' / 5',
          check: () => placedMasses() === 5,
          explain: '표층수는 따뜻해서 위쪽, 저층수는 차가워서 아래쪽에 놓여요. 수온이 낮은 심층수들(심층·중층·저층)은 T-S도 아래쪽에 모여 있어요.',
        },
        {
          title: '두 점 중 어느 쪽이 더 무거울까?',
          goal: '찍힌 점 <b>2개를 눌러 고른 뒤</b>, 더 무거운 쪽을 판정해요. <b>서로 다른 짝 3번</b> 맞혀요.',
          hint: '점을 두 개 누르면 버튼이 나타나요. 등밀도선 숫자가 큰 쪽(오른쪽 아래)에 가까운 점이 더 무거워요. 같은 짝은 한 번만 세요.',
          hold: 0.3, setup() { setView('ts'); S.picks = []; S.jres = null; updateCtl(); },
          status: () => '맞힌 짝 ' + judgedCount() + ' / 3',
          check: () => judgedCount() >= 3,
          explain: '등밀도선에서 <b>번호가 큰 선</b>에 가까운 점일수록 밀도가 커요. 예를 들어 남극 저층수(1027.9)는 북대서양 심층수(1027.8)보다 약간 무겁고, 둘 다 표층수(1023.7)보다 훨씬 무거워요.',
        },
        {
          type: 'quiz', title: '같은 등밀도선 위의 두 물', goal: '서로 <b>수온과 염분이 다른</b> 두 물의 밀도가 같을 수 있는 까닭은 무엇일까요?', setup() { setView('ts'); },
          choices: ['그럴 수 없어요. 수온·염분이 다르면 밀도도 반드시 달라요', '한쪽은 수온이 높아 밀도가 작아지고 다른 쪽은 염분이 높아 밀도가 커져 서로 상쇄될 수 있어요 (같은 등밀도선 위의 점)', '측정할 때 생긴 오차 때문이에요', '부피가 다르기 때문이에요'],
          answer: 1,
          feedback: ['수온을 높이면 밀도가 작아지고 염분을 높이면 커져서 효과가 상쇄될 수 있어요. 같은 등밀도선 위의 점들을 보세요.', '', '오차가 아니라 수온과 염분의 효과가 서로 상쇄되기 때문이에요.', '밀도는 부피가 아니라 (질량 ÷ 부피)로 정해져요. 같은 부피의 질량이 같으면 밀도도 같아요.'],
          explain: '수온이 높으면 밀도가 작아지지만 염분이 높으면 밀도가 커지므로, <b>다른 수온·염분이어도 같은 밀도</b>가 될 수 있어요. 이런 점들을 이은 선이 <b>등밀도선</b>이에요.',
        },
      ],
    },
    {
      title: '수괴와 침강: 표층수는 언제 가라앉을까', short: '수괴', icon: '🧊', phase: '적용', features: ['cool', 'col'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> T-S도에서 점의 위치로 밀도를 읽고, 오른쪽 아래로 갈수록 밀도가 커진다는 것을 알았어요.</div>' +
        '<p>이제 <b>북대서양 표층수</b>(8 °C·35.2 psu)를 <b>냉각·증발·결빙</b>시키며 T-S 점이 어떻게 움직이는지 살펴봐요. 점이 아래 수괴(북대서양 심층수 3 °C·34.9 psu)와 <b>밀도가 같아지는 지점</b>에서 침강이 시작돼요. 또 수괴를 쌓았을 때 <b>안정한 층</b>(아래가 더 무거움)과 <b>불안정한 층</b>(위가 더 무거움)을 구분해요.</p>' + OCEANLINE,
      setup() { enterLevel(3); },
      recap: '표층수가 냉각·결빙(염분 증가)되어 밀도가 아래 수괴와 같아지면 가라앉아요. 아래가 더 무거운 층은 안정하고, 위가 더 무거우면 불안정해서 뒤바뀌어요.',
      summary: '<ul><li>표층수의 T-S 점은 <b>냉각</b>하면 아래로, <b>증발·결빙</b>하면 오른쪽으로 움직여 등밀도선의 큰 값 쪽으로 가요.</li><li>북대서양 표층수(8 °C·35.2 psu)는 약 5.2 °C까지 식으면 북대서양 심층수와 밀도가 같아져(약 1027.8 kg/m³) 침강이 시작돼요.</li><li><b>결빙</b>: 얼음에는 염류가 거의 들어가지 않아 남은 바닷물이 더 짜고 무거워져요.</li><li>안정한 층: 위쪽이 더 가볍고 아래쪽이 더 무거운 층. 불안정한 층은 무거운 물이 가라앉아 층이 뒤바뀌어요.</li></ul>',
      missions: [
        {
          title: '북대서양 표층수의 침강 시작 온도 찾기',
          goal: '표층수(8 °C·35.2 psu)를 <b>냉각</b>해서 <b>막 가라앉기 시작하는</b> 온도에 멈춰요.',
          hint: '수온 슬라이더를 오른쪽으로 옮겨 식혀요. 표층수 밀도가 심층수 밀도와 같아지는 순간(초록 고리와 침강!)을 찾아요.',
          hold: 0.9, setup() { coolReset(); syncCoolSlider(); setView('cool'); },
          status: () => '염분 그대로(35.2) ' + mark(S.cool.S === 35.2) + ' · 침강 시작 ' + mark(coolSinks()) + ' · 지금 ' + mk(S.cool.T) + ' °C',
          check: () => S.cool.S === 35.2 && coolSinks() && S.cool.T >= 4.9,
          explain: '표층수는 약 <b>5.2 °C</b>까지 식으면 밀도가 약 1027.81 kg/m³로 북대서양 심층수(1027.81)와 같아져요. 이 아래로 더 식으면 심층수보다 무거워져 가라앉아요.',
        },
        {
          title: '안정한 층과 불안정한 층 구분하기', manual: true,
          goal: '수괴 3개를 쌓은 구성 1~3이 <b>안정</b>한지 <b>불안정</b>한지 골라요.',
          hint: '위층의 밀도가 아래층보다 작으면 안정해요. 위가 더 무거운 경계가 있으면 불안정해요.',
          setup() { S.colPick = {}; initCols(); S.colRevealed = false; setView('col'); },
          status: () => '판단 ' + Object.keys(S.colPick).filter((k) => S.colPick[k]).length + ' / 3',
          check: () => {
            const miss = [0, 1, 2].filter((i) => !S.colPick[i]); if (miss.length) return '구성 ' + miss.map((i) => i + 1).join('·') + '의 판단을 아직 고르지 않았어요.';
            const bad = [0, 1, 2].filter((i) => S.colPick[i] !== (colStable(i) ? '안정' : '불안정'));
            return bad.length ? '구성 ' + bad.map((i) => i + 1).join('·') + '을(를) 다시 봐요. 위층과 아래층의 밀도를 차례로 비교해 보세요.' : true;
          },
          explain: '구성 1(표층수 1023.7 → 수온 약층수 1027.0 → 저층수 1027.9)은 아래로 갈수록 무거워 <b>안정</b>해요. 구성 2(심층수 1027.8 위에 표층수 1023.7)와 구성 3(심층수 1027.8 위에 수온 약층수 1027.0)은 위가 더 무거운 곳이 있어 <b>불안정</b>해서 무거운 물이 가라앉으며 층이 뒤바뀌어요.',
        },
        {
          type: 'quiz', title: '결빙과 바닷물의 밀도', goal: '바닷물이 얼 때, 얼지 않고 남은 바닷물이 <b>더 무거워지는</b> 까닭은 무엇일까요?', setup() { setView('cool'); },
          choices: ['얼음이 되면서 열을 방출해 남은 물이 데워지기 때문이에요', '얼음에는 염류가 거의 들어가지 않아 남은 바닷물의 염분이 높아지기 때문이에요', '얼음이 물보다 무거워서 바닥에 가라앉기 때문이에요', '얼 때 부피가 늘어나 밀도가 커지기 때문이에요'],
          answer: 1,
          feedback: ['얼 때 열이 나오긴 하지만 남은 물이 무거워지는 까닭은 염분 때문이에요.', '', '얼음은 물보다 가벼워서 떠요. 남은 물이 무거워지는 까닭은 염분이에요.', '밀도가 커지려면 같은 부피의 질량이 늘어야 해요. 남은 물은 염분이 높아져 질량이 커져요.'],
          explain: '바닷물이 얼 때 얼음에는 염류가 거의 들어가지 않아요. 그래서 <b>남은 바닷물은 염분이 높아져 더 무거워지고</b> 아래로 가라앉기 쉬워요. 극지방의 결빙이 심층수를 만드는 까닭이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-ts-diagram', mount: '#game', badge: 'T-S도 해석가', homeHref: '../../index.html#he',
    featureLabels: { lab: '⚖️ 눈금 실린더 · 전자저울 · 측정 기록표', tank: '🌊 칸막이 수조 · 수온·염분 슬라이더 · 밀도 막대', ts: '📈 T-S도 · 등밀도선 · 수괴 카드', cool: '🧊 냉각·증발·결빙 · 침강 판정', col: '🧱 안정/불안정 층' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false, lastReveal = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 저울
    const tgt = S.sel ? SAMPLES[S.sel].m : 0; S.bal = approach(S.bal, tgt, dt, 6);
    SKEYS.forEach((k) => { const c = S.cyl[k]; c.x = approach(c.x, c.tx, dt, 9); c.y = approach(c.y, c.ty, dt, 9); });
    if (S.sel && Math.abs(S.bal - tgt) < 0.06) { S.balOk += dt; if (S.balOk > 0.35 && !S.weighed[S.sel]) { S.weighed[S.sel] = true; Sound.tick(); } } else S.balOk = 0;
    if (S.view === 'tank') updateTank(dt);
    S.cards.forEach((c) => { if (c.shake > 0) c.shake = Math.max(0, c.shake - dt); });
    // 구성 판단이 모두 맞으면 층이 뒤바뀌는 모습을 보여 줘요
    if (S.view === 'col' && !S.colReveal && colAllCorrect()) { lastReveal += dt; if (lastReveal > 0.4) { S.colReveal = true; lastReveal = 0; setTimeout(() => { if (S.view === 'col' && S.colReveal && !S.colSort) colSortNow(); }, 1400); } } else if (!colAllCorrect()) lastReveal = 0;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#e8f2f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'lab') drawLab(t);
    else if (S.view === 'tank') drawTank(t, dt);
    else if (S.view === 'ts') drawTS(t);
    else if (S.view === 'cool') drawCool(t, dt);
    else drawCol(t, dt);
    parts.draw(ctx);
    drawFlash(dt, 10);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, LY, TSP, COOLP, MBY, MASSES, SAMPLES, RHO, RHO_DEEP, TR, COLS, colStable,
    get game() { return game; },
    enterLevel, setView, selectSample, tkOpen, resetTank, coolSet, coolSinks, coolRho, judge, togglePick, labG, tankG, markerPos, tMin,
    placeAllCards() { S.cards.forEach((c) => { c.placed = true; }); },
    colSolve() { [0, 1, 2].forEach((i) => { S.colPick[i] = colStable(i) ? '안정' : '불안정'; }); updateCtl(); },
  };

})();
