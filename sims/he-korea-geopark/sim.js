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



  /* ======================================================
     지질 그림 도구: 난수, 암석 무늬, 다각형, 순서 정하기 위젯
     ====================================================== */
  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const tx = (x, y, s, size, color, align, weight) => D.text(x, y, s, { size: size || 14, color: color || '#334155', align: align || 'left', weight: weight || 700 });
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  function pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const LITH_BASE = {
    gravel: '#b9b1a5', sand: '#ecd08a', mud: '#b59f94', shale: '#8e9aa8', lime: '#e9e5d3', tuff: '#f2f0ea', igneous: '#6d5d78',
    clay: '#c58a6c', conglo: '#cdbb9b', granite: '#e3a9a0', gneiss: '#b9a8b8', silt: '#c9b79c', coal: '#3c3f46',
    slate: '#59636f', phyllite: '#7b8590', schist: '#8b8f9c', hornfels: '#4a4a52', marble: '#e8e6e0', quartzite: '#d9c9a6', basalt: '#4b4b53', scoria: '#5a4a46', magma: '#c2410c', tuffcone: '#a99072', mantle: '#4d6b4b', ocean: '#2b5d86', crust: '#8a8f98',
  };
  const patCache = {};
  /* 암석 무늬(작은 타일을 반복): 물체가 회전·확대돼도 같이 변해요 */
  function lithFill(kind) {
    if (patCache[kind]) return patCache[kind];
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), R = mulberry(kind.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
    const base = LITH_BASE[kind] || '#ccc';
    g.fillStyle = base; g.fillRect(0, 0, N, N);
    const dots = (n, r0, r1, cols, wrap) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(R() * N, R() * N, r0 + R() * (r1 - r0), 0, TAU); g.fill(); } };
    const lines = (n, col, w, len) => { g.strokeStyle = col; g.lineWidth = w; for (let i = 0; i < n; i++) { const y = (i + 0.5) * (N / n) + (R() - 0.5) * 3, x = R() * N; g.beginPath(); g.moveTo(x - len, y); g.lineTo(x + len, y + (R() - 0.5) * 2); g.stroke(); } };
    const pebble = (x, y, r, col, edge) => { g.fillStyle = col; g.strokeStyle = edge || 'rgba(60,45,30,.55)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y, r, r * (0.7 + R() * 0.25), R() * 3, 0, TAU); g.fill(); g.stroke(); };
    if (kind === 'sand') dots(120, 0.7, 1.5, ['#c9a45c', '#f6e3ad', '#b88e48'], 1);
    else if (kind === 'silt') dots(160, 0.5, 1, ['#a89570', '#e3d3b6'], 1);
    else if (kind === 'mud') { dots(60, 0.5, 1, ['#8e7a70', '#cdb9ad']); lines(7, 'rgba(90,70,60,.25)', 1, 22); }
    else if (kind === 'clay') { dots(40, 0.5, 0.9, ['#a96e52', '#d8a487']); }
    else if (kind === 'shale') lines(16, 'rgba(50,62,78,.40)', 1.2, 30);
    else if (kind === 'lime') { g.strokeStyle = 'rgba(120,110,80,.30)'; g.lineWidth = 1; for (let r = 0; r < 4; r++) { const y = r * 32 + 16; g.beginPath(); g.moveTo(0, y); g.lineTo(N, y); g.stroke(); for (let k = 0; k < 3; k++) { const x = ((k * 2 + (r % 2)) * 21 + 6) % N; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } dots(14, 1, 2, ['rgba(150,140,110,.35)']); }
    else if (kind === 'tuff') { dots(90, 0.6, 1.6, ['#d6d3c8', '#fff', '#bdb8a8']); }
    else if (kind === 'gravel' || kind === 'conglo') { const cols = ['#8d8a84', '#a89a86', '#6e6a64', '#b9a58a', '#9b8f86']; for (let i = 0; i < 9; i++) pebble(R() * N, R() * N, 8 + R() * 8, cols[i % cols.length]); dots(70, 0.7, 1.3, ['#8a7e6c']); }
    else if (kind === 'igneous') { dots(46, 1.3, 3, ['#e9dff0', '#2d2735', '#b9a7c6']); g.strokeStyle = 'rgba(30,20,40,.25)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(R() * N, R() * N); g.lineTo(R() * N, R() * N); g.stroke(); } }
    else if (kind === 'granite') { dots(60, 1.2, 3, ['#fff3ee', '#2f2a2d', '#c97f78', '#f0c8c0']); }
    else if (kind === 'gneiss') { for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#e7dce6' : '#4b4350'; const y = i * 13 + R() * 3; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(40, y + 5, 80, y - 5, N, y + 2); g.lineTo(N, y + 5); g.bezierCurveTo(80, y, 40, y + 10, 0, y + 6); g.closePath(); g.fill(); } }
    else if (kind === 'coal') { dots(30, 0.6, 1.4, ['#555a63', '#24262b']); }
    else if (kind === 'slate') { lines(26, 'rgba(20,26,34,.45)', 1.1, 40); dots(24, 0.5, 1, ['#76808c', '#434b55']); }
    else if (kind === 'phyllite') { lines(18, 'rgba(255,255,255,.28)', 1.6, 30); lines(10, 'rgba(30,36,46,.32)', 1, 34); dots(30, 0.6, 1.2, ['#a9b2bd', '#68717c']); }
    else if (kind === 'schist') { for (let i = 0; i < 46; i++) { const x = R() * N, y = R() * N, L = 5 + R() * 9; g.strokeStyle = i % 3 ? 'rgba(235,238,245,.75)' : 'rgba(40,44,56,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - L, y + (R() - 0.5) * 2); g.lineTo(x + L, y + (R() - 0.5) * 2); g.stroke(); } dots(14, 1.4, 2.4, ['#7a2f3a']); }
    else if (kind === 'hornfels') { dots(130, 0.6, 1.5, ['#2d2d33', '#6d6a73', '#3b3a42']); dots(10, 1.6, 2.4, ['#8f8a7f']); }
    else if (kind === 'marble') { for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.55)' : 'rgba(180,176,166,.35)'; g.beginPath(); const cx = R() * N, cy = R() * N, r = 6 + R() * 9; for (let k = 0; k < 6; k++) { const a = k * TAU / 6 + R() * 0.5; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); } g.strokeStyle = 'rgba(130,124,112,.35)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(R() * N, 0); g.bezierCurveTo(R() * N, 40, R() * N, 80, R() * N, N); g.stroke(); } }
    else if (kind === 'quartzite') { dots(90, 0.8, 1.9, ['#c9b890', '#ece0c2', '#b9a47a', '#f6efd9']); }
    else if (kind === 'basalt') { dots(90, 0.6, 1.4, ['#2f2f36', '#6a6a72']); for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(15,15,20,.75)'; g.beginPath(); g.ellipse(R() * N, R() * N, 1.8 + R() * 3, 1.6 + R() * 2.4, R() * 3, 0, TAU); g.fill(); } }
    else if (kind === 'scoria') { dots(50, 0.7, 1.4, ['#3a2e2c', '#7a5a50']); for (let i = 0; i < 16; i++) { g.fillStyle = 'rgba(20,10,10,.8)'; g.beginPath(); g.ellipse(R() * N, R() * N, 2 + R() * 4, 1.8 + R() * 3, R() * 3, 0, TAU); g.fill(); } }
    else if (kind === 'tuffcone') { lines(14, 'rgba(90,70,45,.35)', 1.2, 30); dots(60, 0.6, 1.4, ['#8c7556', '#c8b08a']); }
    else if (kind === 'crust') { dots(70, 0.8, 1.6, ['#7b8089', '#a4a9b2', '#5f646d']); }
    else if (kind === 'mantle') { dots(70, 0.8, 1.8, ['#3f5c3d', '#6f8f63', '#2d4630']); }
    else if (kind === 'magma') { dots(36, 1.2, 3, ['#f97316', '#fbbf24', '#9a3412']); }
    const pat = ctx.createPattern(c, 'repeat');
    if (pat && pat.setTransform && typeof DOMMatrix !== 'undefined') pat.setTransform(new DOMMatrix().scale(0.5));
    patCache[kind] = pat || base;
    return patCache[kind];
  }
  /* 현재 경로를 암석 무늬로 채우기 (경로는 미리 그려 두어요) */
  function fillLith(kind, alpha) { ctx.save(); if (alpha != null) ctx.globalAlpha = alpha; ctx.fillStyle = lithFill(kind); ctx.fill(); ctx.restore(); }
  function lithRect(kind, x, y, w, h) { ctx.beginPath(); ctx.rect(x, y, w, h); fillLith(kind); }
  /* 둥근 자갈 하나 */
  function pebbleAt(x, y, r, kind, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.78, 0, 0, TAU);
    ctx.fillStyle = LITH_BASE[kind] || '#999'; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = lithFill(kind); ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
    ctx.strokeStyle = 'rgba(40,30,30,.65)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.78, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function polyPath(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }

  /* 상단 안내 막대 (장면 안에서 단계 설명) */
  function banner(x, y, w, text, color, size) {
    const h = note(x, y, w, text, size || 14, { bg: color || 'rgba(255,255,255,.95)', border: '#cbd5e1' });
    return h;
  }

  /* ======================================================
     순서 정하기 위젯: 칩을 눌러 위에서부터 차례로 담아요
     ====================================================== */
  function makeSeq(host, items, opt) {
    opt = opt || {};
    const by = {}; items.forEach((it) => { by[it.id] = it; });
    let pool = (opt.order || items.map((i) => i.id)).slice(), ans = [];
    const poolEl = document.createElement('div'), ansEl = document.createElement('ol');
    poolEl.className = 'seq-pool'; ansEl.className = 'seq-ans';
    const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn btn-sm'; clr.textContent = '↺ 다시 정하기';
    host.append(poolEl, ansEl, clr);
    function render() {
      poolEl.innerHTML = ''; ansEl.innerHTML = '';
      pool.forEach((id) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.id = id; b.innerHTML = by[id].label; b.addEventListener('click', () => { Sound.click(); pool = pool.filter((x) => x !== id); ans.push(id); render(); opt.onChange && opt.onChange(ans.slice()); }); poolEl.appendChild(b); });
      if (!pool.length) { const e = document.createElement('div'); e.className = 'seq-done'; e.textContent = '모두 담았어요'; poolEl.appendChild(e); }
      ans.forEach((id, i) => { const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.className = 'chip on'; b.dataset.id = id; b.innerHTML = '<b>' + (opt.numbers ? opt.numbers[i] : (i + 1) + '.') + '</b> ' + by[id].label; b.addEventListener('click', () => { Sound.click(); ans = ans.filter((x) => x !== id); pool.push(id); render(); opt.onChange && opt.onChange(ans.slice()); }); li.appendChild(b); ansEl.appendChild(li); });
    }
    clr.addEventListener('click', () => { Sound.click(); pool = (opt.order || items.map((i) => i.id)).slice(); ans = []; render(); opt.onChange && opt.onChange([]); });
    render();
    return { ids: () => ans.slice(), reset() { pool = (opt.order || items.map((i) => i.id)).slice(); ans = []; render(); }, set(a) { ans = a.slice(); pool = (opt.order || items.map((i) => i.id)).filter((x) => !a.includes(x)); render(); } };
  }
  /* 화면 안내: 손가락/마우스 올리기 */
  const cursorOf = (b) => (b ? 'pointer' : 'default');



  /* =========================================================
     지구과학 Ⅱ. 지구의 역사와 한반도의 암석 - 한반도 암석과 지질공원
     [12지구02-05] 대표적인 지질공원의 형성 과정을 추론하고, 지속가능한 발전방안을 제안
     ① 한반도 지질  ② 화산 지형(제주·한탄강)  ③ 퇴적·변성 명소  ④ 발전 방안
     (지도·단면은 모두 간략화한 모식도, 수치는 예시 자료)
     ========================================================= */
  initStage('#eef2f7', 800, 560, 600, 840, 1.25);
  Object.keys(LITH_BASE).forEach((k) => lithFill(k)); // 암석 무늬를 미리 만들어 두어요
  const rad = (d) => (d * Math.PI) / 180;
  const f0 = (x) => String(Math.round(x));
  const SQ3 = Math.sqrt(3);
  const gauss = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

  /* 줄바꿈 글 (왼쪽 정렬) : 마지막 줄 아래 y를 돌려줘요 */
  function para(x, y, w, text, size, color, weight) { const ls = wrapLines(text, w, size, weight || 700), lh = size * FS * 1.3; ls.forEach((l, i) => tx(x, y + i * lh, l, size, color || '#475569', 'left', weight || 700)); return y + ls.length * lh; }
  function pill(x, y, w, h, bg, border) { D.shadow(() => { ctx.fillStyle = bg; rr(x, y, w, h, h / 2.4).fill(); }, { blur: 5, y: 2 }); if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; rr(x, y, w, h, h / 2.4).stroke(); } }

  const S = {
    view: 'map', clock: 0, fade: 0,
    map: { sel: 0, ans: Array.from({ length: 6 }, () => ({ rock: '', age: '' })), rev: 0 },
    jeju: {}, hantan: { t: 0, play: false },
    joint: { c: 0, run: false, hex: -1, done: false },
    found: {}, // 현장 체크리스트 : 찾은 관찰 항목
    ero: { rec: null }, seq: [],
    sed: { ans: ['', '', '', ''], found: [false, false, false, false] },
    plan: { sel: [], why: ['', '', '', ''], shake: 0, flash: 0 },
  };
  let game = null;
  const VIEW_LABEL = { map: '🗺 한반도 지질도', jeju: '🏝 제주도 모식 단면', hantan: '🌊 한탄강 형성 과정', joint: '🔷 주상절리 단면', sed: '📓 현장 노트', plan: '📝 지속가능한 발전 제안서' };

  /* ---------- 장면 ① : 한반도 지질도 ---------- */
  const COAST = [[124.35, 39.85], [124.75, 40.15], [125.5, 40.55], [126.3, 41.05], [127.1, 41.45], [127.8, 41.6], [128.05, 41.95], [128.9, 42.2], [129.75, 42.45], [130.2, 42.9], [130.65, 42.35], [130.0, 41.75], [129.55, 40.95], [129.2, 40.55], [128.3, 40.15], [127.55, 39.8], [127.45, 39.2], [128.1, 38.65], [128.6, 38.2], [128.95, 37.75], [129.2, 37.3], [129.4, 36.95], [129.4, 36.5], [129.58, 36.08], [129.45, 35.55], [129.25, 35.2], [129.05, 35.0], [128.75, 35.05], [128.45, 34.85], [128.0, 34.9], [127.75, 34.75], [127.3, 34.55], [126.75, 34.35], [126.5, 34.3], [126.35, 34.8], [126.45, 35.2], [126.55, 35.65], [126.7, 35.95], [126.5, 36.35], [126.2, 36.85], [126.55, 37.05], [126.55, 37.45], [126.4, 37.75], [125.7, 38.0], [124.85, 38.15], [125.1, 38.6], [125.35, 38.7], [125.1, 39.2], [124.7, 39.6]];
  const REG = [
    { id: 'pre', name: '선캄브리아시대 변성암', sub: '편마암·편암', color: '#a78bba', pat: 'gneiss', polys: [[[125.9, 37.0], [125.9, 38.2], [127.3, 38.5], [127.9, 37.6], [127.5, 36.9]], [[127.2, 35.2], [127.3, 36.7], [128.0, 36.8], [128.0, 35.3]]] },
    { id: 'pal', name: '고생대 퇴적암', sub: '석회암·사암', color: '#6fb09a', pat: 'lime', polys: [[[128.25, 37.0], [128.25, 37.65], [129.0, 37.65], [129.15, 37.0]]] },
    { id: 'gyg', name: '중생대 퇴적암·화산암', sub: '경상 분지', color: '#e6c37a', pat: 'sand', polys: [[[128.0, 34.95], [128.0, 36.5], [128.5, 36.9], [129.3, 36.7], [129.3, 35.4], [128.8, 34.95]]] },
    { id: 'gran', name: '중생대 화강암', sub: '대보·불국사 화강암 등', color: '#e8a3a0', pat: 'granite', polys: [[[126.45, 37.35], [126.45, 38.0], [127.2, 38.1], [127.4, 37.45]], [[128.1, 37.9], [128.1, 38.4], [128.85, 38.3], [128.75, 37.85]], [[127.8, 36.5], [127.8, 37.0], [128.5, 37.1], [128.5, 36.5]], [[126.3, 35.9], [126.3, 36.7], [127.2, 36.8], [127.2, 35.9]]] },
    { id: 'cen', name: '신생대 화산', sub: '제주·울릉·백두산·한탄강', color: '#4b4b58', pat: 'basalt', polys: [[[126.95, 37.98], [127.15, 38.2], [127.45, 38.65], [127.6, 38.55], [127.45, 38.1], [127.25, 37.9]], [[127.7, 41.6], [127.7, 42.1], [128.4, 42.1], [128.4, 41.6]]] },
    { id: 'seds', name: '신생대 퇴적 분지', sub: '포항 일대', color: '#b8a58c', pat: 'silt', polys: [[[129.15, 35.9], [129.15, 36.3], [129.5, 36.3], [129.5, 35.9]]] },
  ];
  const PINS = [
    { id: 'bukhan', name: '북한산', lon: 126.98, lat: 37.66, rock: 'granite', age: 'meso', clue: '밝은색의 큰 알갱이가 보이는 하얀 바위 봉우리' },
    { id: 'jiri', name: '지리산', lon: 127.73, lat: 35.34, rock: 'gneiss', age: 'pre', clue: '밝은색·어두운색의 줄무늬 띠가 보이는 암석' },
    { id: 'halla', name: '한라산', lon: 126.53, lat: 33.36, rock: 'basalt', age: 'ceno', clue: '검고 구멍이 송송 난 돌' },
    { id: 'taebaek', name: '강원 태백', lon: 128.98, lat: 37.17, rock: 'lime', age: 'pal', clue: '회백색 돌, 묽은 염산을 떨어뜨리면 거품이 나요' },
    { id: 'hantan', name: '철원·한탄강', lon: 127.2, lat: 38.15, rock: 'basalt', age: 'ceno', clue: '검고 치밀한 돌이 기둥 모양으로 쪼개져요' },
    { id: 'goseong', name: '경남 고성', lon: 128.35, lat: 34.98, rock: 'sed', age: 'meso', clue: '공룡 발자국이 찍힌 알갱이 퇴적층' },
  ];
  const ROCKS = [['granite', '화강암'], ['gneiss', '편마암'], ['basalt', '현무암'], ['lime', '석회암'], ['sed', '퇴적암(사암·셰일)']];
  const AGES = [['pre', '선캄브리아시대'], ['pal', '고생대'], ['meso', '중생대'], ['ceno', '신생대']];
  const rockName = (k) => (ROCKS.find((r) => r[0] === k) || [0, '?'])[1], ageName = (k) => (AGES.find((r) => r[0] === k) || [0, '?'])[1];
  const ML = PHONE ? { M: { x: 10, y: 46, w: 330, h: 700 }, R: { x: 350, y: 46, w: 240, h: 700 } } : { M: { x: 20, y: 46, w: 290, h: 500 }, R: { x: 322, y: 46, w: 458, h: 500 } };
  ML.s = Math.min((ML.M.h - 30) / 10, (ML.M.w - 16) / (7 * 0.79));
  ML.ox = ML.M.x + (ML.M.w - 7 * 0.79 * ML.s) / 2; ML.oy = ML.M.y + 22;
  const lx = (lon) => ML.ox + (lon - 124) * 0.79 * ML.s, ly = (lat) => ML.oy + (43.1 - lat) * ML.s;
  const smoothPoly = (pts) => { // 점들을 부드럽게 이은 닫힌 곡선
    const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], P = pts.map((p) => [lx(p[0]), ly(p[1])]);
    ctx.beginPath(); const m0 = mid(P[n - 1], P[0]); ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(P[i], P[(i + 1) % n]); ctx.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]); }
    ctx.closePath();
  };
  const island = (lon, lat, rl, rt, rot) => { ctx.beginPath(); ctx.ellipse(lx(lon), ly(lat), rl * 0.79 * ML.s, rt * ML.s, rot || 0, 0, TAU); };
  const pinXY = (p) => [lx(p.lon), ly(p.lat)];
  const mapAnsDone = (i) => S.map.ans[i].rock && S.map.ans[i].age;
  function drawMap(t, dt) {
    const M = ML.M, R = ML.R, Mp = S.map;
    Mp.rev = Mp.rev; // 색이 번져요
    panel(M.x, M.y, M.w, M.h, { fill: '#cfe6f5' });
    tx(M.x + 10, M.y + 18, '한반도 (모식도)', 13, '#334155', 'left', 800);
    const landFill = () => { smoothPoly(COAST); };
    // 육지 바탕 + 지질 색
    ctx.save(); landFill(); ctx.fillStyle = '#e2dccb'; ctx.fill(); ctx.clip();
    REG.forEach((rg, i) => {
      const a = clamp(Mp.rev * (REG.length + 1) - i, 0, 1); if (a <= 0.01) return;
      ctx.globalAlpha = a * 0.92; ctx.fillStyle = rg.color; rg.polys.forEach((pl) => { smoothPoly(pl); ctx.fill(); });
      ctx.globalAlpha = a * 0.35; ctx.fillStyle = lithFill(rg.pat); rg.polys.forEach((pl) => { smoothPoly(pl); ctx.fill(); });
    });
    ctx.restore();
    landFill(); ctx.strokeStyle = '#6b5f45'; ctx.lineWidth = 2.2; ctx.stroke();
    // 섬 : 제주도(신생대 화산), 울릉도, 백령도
    [[126.55, 33.38, 0.42, 0.17, 0], [130.9, 37.5, 0.1, 0.08, 0]].forEach(([a, b, c, d, e], i) => { const al = clamp(Mp.rev * 7 - 4 - i, 0, 1); island(a, b, c, d, e); ctx.fillStyle = '#e2dccb'; ctx.fill(); ctx.globalAlpha = al * 0.95; ctx.fillStyle = REG[4].color; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = '#6b5f45'; ctx.lineWidth = 2; ctx.stroke(); });
    island(124.72, 37.9, 0.1, 0.06, 0); ctx.fillStyle = '#e2dccb'; ctx.fill(); ctx.strokeStyle = '#6b5f45'; ctx.lineWidth = 1.6; ctx.stroke();
    tx(lx(131.0), ly(37.1), '울릉도', 12, '#475569', 'left', 800); tx(lx(127.1), ly(33.0), '제주도', 12.5, '#475569', 'center', 800);
    // 핀
    PINS.forEach((p, i) => {
      const [x, y] = pinXY(p), on = Mp.sel === i, done = mapAnsDone(i), r0 = PHONE ? 15 : 13;
      ctx.save(); D.shadow(() => { ctx.fillStyle = done ? '#16a34a' : '#fff'; ctx.beginPath(); ctx.arc(x, y, r0 + (on ? 3 : 0), 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = on ? '#f59e0b' : '#0369a1'; ctx.lineWidth = on ? 4 : 2.6; ctx.beginPath(); ctx.arc(x, y, r0 + (on ? 3 : 0), 0, TAU); ctx.stroke(); ctx.restore();
      tx(x, y + 5, String(i + 1), 14, done ? '#fff' : '#0369a1', 'center', 800);
      if (on) D.ring(x, y, r0 + 9, t, { color: '#f59e0b', speed: 0.7, width: 2 });
    });
    // 오른쪽 : 범례 + 핀 목록
    panel(R.x, R.y, R.w, R.h, { fill: 'rgba(255,255,255,.95)' });
    tx(R.x + 12, R.y + 22, '지질도 범례', 14, '#334155', 'left', 800);
    const lc = PHONE ? 1 : 2, lw = (R.w - 24) / lc;
    REG.forEach((rg, i) => {
      const cx = R.x + 12 + (i % lc) * lw, cy = R.y + 34 + Math.floor(i / lc) * (PHONE ? 22 : 30);
      ctx.fillStyle = rg.color; rr(cx, cy, 20, 16, 4).fill(); ctx.strokeStyle = 'rgba(60,50,40,.5)'; ctx.lineWidth = 1.2; rr(cx, cy, 20, 16, 4).stroke();
      tx(cx + 26, cy + 13, rg.name, PHONE ? 12 : 12.5, '#334155', 'left', 800);
    });
    const ry0 = R.y + (PHONE ? 34 + 6 * 22 + 8 : 34 + 3 * 30 + 6), rh = (R.y + R.h - ry0 - 6) / 6;
    tx(R.x + 12, ry0 + 4, '핀을 눌러 암석과 시대를 정해요', 13, '#64748b', 'left', 800);
    PINS.forEach((p, i) => {
      const y = ry0 + 14 + i * ((R.y + R.h - ry0 - 20) / 6), h = (R.y + R.h - ry0 - 20) / 6 - 6, on = Mp.sel === i, a = Mp.ans[i];
      ctx.fillStyle = on ? '#fff7e0' : '#f8fafc'; rr(R.x + 8, y, R.w - 16, h, 10).fill(); ctx.strokeStyle = on ? '#f59e0b' : '#cbd5e1'; ctx.lineWidth = on ? 2.6 : 1.6; rr(R.x + 8, y, R.w - 16, h, 10).stroke();
      D.sphere(R.x + 26, y + 18, 11, mapAnsDone(i) ? '#16a34a' : '#0ea5e9', { text: String(i + 1), textScale: 1.0 });
      tx(R.x + 44, y + 22, p.name, 14.5, '#1e293b', 'left', 800);
      if (!PHONE) { para(R.x + 44, y + 40, 250, p.clue, 12.5, '#64748b'); }
      else para(R.x + 14, y + 42, R.w - 28, p.clue, 11.5, '#64748b');
      const cx0 = PHONE ? R.x + 14 : R.x + R.w - 150, cy0 = PHONE ? y + h - 22 : y + 8;
      const chip = (x2, y2, txt, ok) => { D.label(x2, y2, txt, { bg: ok ? '#0ea5e9' : '#e2e8f0', color: ok ? '#fff' : '#94a3b8', size: PHONE ? 11.5 : 12.5, pad: 7, align: 'left' }); };
      if (PHONE) { chip(cx0, cy0 + 4, a.rock ? rockName(a.rock) : '암석 ?', !!a.rock); chip(cx0 + 100, cy0 + 4, a.age ? ageName(a.age) : '시대 ?', !!a.age); }
      else { chip(cx0, cy0 + 8, a.rock ? rockName(a.rock) : '암석 ?', !!a.rock); chip(cx0, cy0 + 34, a.age ? ageName(a.age) : '시대 ?', !!a.age); }
    });
    tx(M.x + M.w / 2, M.y + M.h - 8, '※ 경계는 단순화한 모식도예요', 11.5, '#64748b', 'center', 700);
  }
  function mapTap(p) {
    const M = ML.M, R = ML.R;
    for (let i = 0; i < PINS.length; i++) { const [x, y] = pinXY(PINS[i]); if (Math.hypot(p.x - x, p.y - y) <= (PHONE ? 26 : 22)) { S.map.sel = i; Sound.click(); updateCtl(); return true; } }
    if (p.x >= R.x && p.x <= R.x + R.w) {
      const ry0 = R.y + (PHONE ? 34 + 6 * 22 + 8 : 34 + 3 * 30 + 6), step = (R.y + R.h - ry0 - 20) / 6;
      const i = Math.floor((p.y - ry0 - 14) / step); if (i >= 0 && i < 6) { S.map.sel = i; Sound.click(); updateCtl(); return true; }
    }
    return false;
  }

  /* ---------- 장면 ② : 화산 지형 ---------- */
  const JV = PHONE ? { x: 10, y: 46, w: 580, h: 440 } : { x: 20, y: 46, w: 760, h: 408 };
  const SITES = {
    vesicle: { name: '현무암의 기공', txt: '현무암에는 구멍(기공)이 많아요. 용암 속 기체가 빠져나가며 생겼어요. 염기성 용암은 점성이 작아 멀리까지 흘러요.' },
    tube: { name: '용암 동굴', txt: '용암이 흐르다 겉이 먼저 식어 굳고, 속의 용암이 흘러 빠져나가면 빈 터널(용암 동굴)이 생겨요.' },
    tuff: { name: '성산일출봉의 층리(수성 화산)', txt: '마그마가 바닷물·지하수와 만나 폭발해 화산재가 층층이 쌓여 만들어진 수성 화산이에요(약 5천 년 전, 예시).' },
    col: { name: '주상절리', txt: '두꺼운 용암이 식으며 부피가 줄어(수축) 육각 기둥 모양으로 갈라졌어요. 바닷가 절벽과 협곡 벽에서 볼 수 있어요.' },
    plateau: { name: '용암 대지', txt: '여러 차례 흘러내린 용암이 옛 계곡을 메우고 식어 평평한 용암 대지가 되었어요.' },
    canyon: { name: '협곡', txt: '하천이 단단한 현무암을 오랫동안 깎아 절벽 사이에 깊은 협곡이 만들어졌어요.' },
  };
  const CHK = [['vesicle', '현무암의 기공'], ['tube', '용암 동굴'], ['tuff', '수성 화산의 층리'], ['col', '주상절리'], ['plateau', '용암 대지'], ['canyon', '협곡']];
  const chkCount = () => CHK.filter((c) => S.found[c[0]]).length;
  const info = { id: null, t: 0 };
  function findSite(id, x, y) {
    if (!S.found[id]) { S.found[id] = true; Sound.success(); parts.burst(x, y, { count: 14, colors: ['#f59e0b', '#16a34a', '#fff'] }); updateCtl(); }
    else Sound.click();
    info.id = id; info.t = 0;
  }
  const sites = []; // 이번 프레임에 그려진 누를 곳 {id, x, y, r}
  function hotspot(id, x, y, t, label) {
    const found = !!S.found[id], r = PHONE ? 20 : 17;
    ctx.save(); D.shadow(() => { ctx.fillStyle = found ? '#16a34a' : '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = found ? '#14532d' : '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.restore();
    tx(x, y + 6, found ? '✓' : '?', 17, found ? '#fff' : '#b45309', 'center', 800);
    if (!found) D.ring(x, y, r + 6, t + x * 0.01, { color: '#f59e0b', speed: 0.6, width: 1.6 });
    else if (label) D.label(x, y - r - 14, label, { bg: '#16a34a', size: 12.5, pad: 8 });
    sites.push({ id, x, y, r: r + 14 });
  }
  function siteTap(p) { for (let i = sites.length - 1; i >= 0; i--) { const s = sites[i]; if (Math.hypot(p.x - s.x, p.y - s.y) <= s.r) { findSite(s.id, s.x, s.y); return true; } } return false; }
  function infoBubble(y) {
    if (!info.id) { para(JV.x + 8, y + 10, JV.w - 16, '? 표시를 눌러 관찰 포인트를 찾아봐요', PHONE ? 13 : 14, '#64748b', 800); return; }
    const s = SITES[info.id], ls = wrapLines(s.txt, JV.w - 36, PHONE ? 13 : 14, 700), lh = (PHONE ? 13 : 14) * FS * 1.32, h = ls.length * lh + 42;
    panel(JV.x, y, JV.w, h, { fill: '#effaf2', border: '#86efac' });
    tx(JV.x + 14, y + 24, '✅ ' + s.name, 15, '#14532d', 'left', 800);
    ls.forEach((l, i) => tx(JV.x + 14, y + 46 + i * lh, l, PHONE ? 13 : 14, '#14532d', 'left', 700));
  }
  /* 제주도 */
  const JE = (u) => { const d = Math.abs(u - 0.46) / 0.38; if (d >= 1) return 0; let e = JV.h * 0.46 * Math.pow(1 - Math.pow(d, 1.7), 1.1); e -= 5 * gauss(u, 0.46, 0.012); e += 12 * gauss(u, 0.28, 0.025) + 14 * gauss(u, 0.63, 0.025) + 10 * gauss(u, 0.7, 0.02); return e; };
  const JVES = (() => { const R = mulberry(55); return Array.from({ length: 16 }, () => ({ a: R() * TAU, d: R(), r: 2 + R() * 6 })); })();
  function drawJeju(t, dt) {
    sites.length = 0;
    const P = JV, sl = P.y + P.h * 0.66, bot = P.y + P.h, ux = (u) => P.x + u * P.w;
    panel(P.x, P.y, P.w, P.h, { fill: '#dfe9f2' });
    D.sky(P.x, P.y, P.w, sl - P.y, '#bfe3ff', '#eaf6ff');
    tx(P.x + 12, P.y + 22, '제주도 모식 단면 (동서 방향)', 14, '#334155', 'left', 800);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    ctx.fillStyle = '#4a98c9'; ctx.fillRect(P.x, sl, P.w, bot - sl);
    // 섬 몸통 (해수면 아래로도 이어져요)
    const seabed = sl + P.h * 0.24;
    ctx.beginPath(); ctx.moveTo(P.x, bot); ctx.lineTo(P.x, seabed); ctx.lineTo(ux(0.07), sl + 4);
    for (let i = 0; i <= 80; i++) { const u = 0.07 + (i / 80) * 0.79; ctx.lineTo(ux(u), sl - JE(u)); }
    ctx.lineTo(ux(0.86), sl + 4); ctx.lineTo(P.x + P.w, seabed); ctx.lineTo(P.x + P.w, bot); ctx.closePath();
    ctx.fillStyle = '#3d3d46'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = lithFill('basalt'); ctx.fillRect(P.x, P.y, P.w, P.h);
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2; for (let k = 1; k <= 3; k++) { ctx.beginPath(); for (let i = 0; i <= 60; i++) { const u = 0.08 + (i / 60) * 0.77, y = sl - JE(u) + k * 16; i ? ctx.lineTo(ux(u), y) : ctx.moveTo(ux(u), y); } ctx.stroke(); }
    ctx.restore();
    // 바닷물 덮기
    const wg = ctx.createLinearGradient(0, sl, 0, bot); wg.addColorStop(0, 'rgba(74,152,201,.55)'); wg.addColorStop(1, 'rgba(10,50,110,.55)'); ctx.fillStyle = wg; ctx.fillRect(P.x, sl, P.w, bot - sl);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = P.x; x <= P.x + P.w; x += 6) { const y = sl + Math.sin(x * 0.06 + t * 2) * 1.6; x === P.x ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    // 해안 주상절리 절벽 (왼쪽 바닷가)
    const cx0 = ux(0.05), cx1 = ux(0.14), ct = sl - 40;
    ctx.fillStyle = '#34343c'; ctx.fillRect(cx0, ct, cx1 - cx0, 42); ctx.strokeStyle = 'rgba(255,255,255,.32)'; ctx.lineWidth = 1.5;
    for (let x = cx0; x <= cx1; x += 9) { ctx.beginPath(); ctx.moveTo(x, ct); ctx.lineTo(x, sl + 2); ctx.stroke(); }
    // 성산일출봉 (수성 화산: 화산재가 층층이)
    ctx.beginPath(); ctx.moveTo(ux(0.865), sl + 2); ctx.lineTo(ux(0.9), sl - 58); ctx.lineTo(ux(0.925), sl - 66); ctx.lineTo(ux(0.945), sl - 54); ctx.lineTo(ux(0.985), sl + 2); ctx.closePath();
    ctx.fillStyle = lithFill('tuffcone'); ctx.fill(); ctx.strokeStyle = 'rgba(60,40,20,.7)'; ctx.lineWidth = 2; ctx.stroke(); ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(90,60,30,.45)'; ctx.lineWidth = 2; for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(ux(0.86), sl - 6 - k * 10 + 14); ctx.lineTo(ux(0.99), sl - 6 - k * 10 - 6); ctx.stroke(); } ctx.restore();
    // 용암 동굴 (단면)
    const tux = ux(0.6), tuy = sl - JE(0.6) + 40;
    ctx.fillStyle = '#16161c'; ctx.beginPath(); ctx.ellipse(tux, tuy, 36, 15, 0, Math.PI, TAU); ctx.lineTo(tux + 36, tuy + 14); ctx.lineTo(tux - 36, tuy + 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,80,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(tux, tuy, 36, 15, 0, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(249,115,22,.55)'; ctx.fillRect(tux - 30, tuy + 10, 60, 4);
    ctx.restore();
    // 이름표
    D.text(ux(0.46), sl - JE(0.46) - 14, '한라산', { size: 15, weight: 800, color: '#1e293b', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
    D.text(ux(0.28), sl - JE(0.28) - 12, '오름', { size: 12.5, weight: 800, color: '#1e293b', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3.5 }); D.text(ux(0.66), sl - JE(0.66) - 12, '오름', { size: 12.5, weight: 800, color: '#1e293b', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3.5 });
    D.text(ux(0.925), sl + 22, '성산일출봉', { size: 12.5, weight: 800, color: '#fff' });
    // 확대 : 기공이 많은 현무암
    const lx0 = P.x + 96, ly0 = P.y + 108, lr = PHONE ? 44 : 52;
    ctx.save(); ctx.beginPath(); ctx.arc(lx0, ly0, lr, 0, TAU); ctx.clip(); ctx.fillStyle = '#3b3b43'; ctx.fillRect(lx0 - lr, ly0 - lr, lr * 2, lr * 2);
    JVES.forEach((v) => { const x = lx0 + Math.cos(v.a) * v.d * lr * 0.85, y = ly0 + Math.sin(v.a) * v.d * lr * 0.85; ctx.fillStyle = '#0f0f13'; ctx.beginPath(); ctx.ellipse(x, y, v.r * 1.6, v.r * 1.2, v.a, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.ellipse(x - v.r * 0.4, y - v.r * 0.4, v.r * 0.5, v.r * 0.3, 0, 0, TAU); ctx.fill(); });
    ctx.restore(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(lx0, ly0, lr, 0, TAU); ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx0 + lr * 0.7, ly0 + lr * 0.7); ctx.lineTo(ux(0.24), sl - JE(0.24) + 4); ctx.stroke(); ctx.setLineDash([]);
    tx(lx0, ly0 + lr + 16, '🔍 확대 (모식도)', 12.5, '#0369a1', 'center', 800);
    // 누를 곳
    hotspot('vesicle', lx0, ly0, t, SITES.vesicle.name); hotspot('tube', tux, tuy, t, SITES.tube.name);
    hotspot('tuff', ux(0.915), sl - 30, t, '수성 화산'); hotspot('col', (cx0 + cx1) / 2, ct + 20, t, SITES.col.name);
    infoBubble(P.y + P.h + 10);
  }
  /* 한탄강 */
  const HV = { yg: JV.y + JV.h * 0.4, yv: JV.y + JV.h * 0.76, hw: JV.w * 0.27, cx: JV.x + JV.w / 2, pxm: 3.67 }; // 1 m = 3.67 px (협곡 깊이 30 m = 110 px)
  const hantanStage = (tt) => (tt < 0.1 ? 0 : tt < 0.28 ? 1 : tt < 0.5 ? 2 : tt < 0.78 ? 3 : 4);
  const HT_STAGES = ['① 옛 계곡', '② 용암 분출', '③ 식으며 수축 · 주상절리', '④ 하천 침식', '⑤ 협곡 완성'];
  const hantanDepthM = (tt) => 30 * smooth((tt - 0.5) / 0.5);
  function drawHantan(t, dt) {
    sites.length = 0;
    const P = JV, H = S.hantan, tt = H.t, { yg, yv, hw, cx } = HV, bot = P.y + P.h;
    panel(P.x, P.y, P.w, P.h, { fill: '#dfe9f2' });
    D.sky(P.x, P.y, P.w, yg - P.y + 4, '#bfe3ff', '#eaf6ff');
    tx(P.x + 12, P.y + 22, '한탄강 단면 (모식도)', 14, '#334155', 'left', 800);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    // 옛 계곡의 기반암
    ctx.beginPath(); ctx.moveTo(P.x, bot); ctx.lineTo(P.x, yg); ctx.lineTo(cx - hw, yg); ctx.lineTo(cx, yv); ctx.lineTo(cx + hw, yg); ctx.lineTo(P.x + P.w, yg); ctx.lineTo(P.x + P.w, bot); ctx.closePath();
    ctx.fillStyle = '#9a8fa8'; ctx.fill(); ctx.fillStyle = lithFill('gneiss'); ctx.globalAlpha = 0.75; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#5b8f4a'; ctx.fillRect(P.x, yg - 5, cx - hw - P.x, 5); ctx.fillRect(cx + hw, yg - 5, P.x + P.w - cx - hw, 5);
    const f = smooth(tt / 0.25), cool = smooth((tt - 0.25) / 0.25), e = smooth((tt - 0.5) / 0.5), dpx = e * 30 * HV.pxm;
    const yL = yv - f * (yv - yg);
    const half = (y) => hw * (yv - y) / (yv - yg);
    const canyonW = 34 + 50 * e;
    // 용암
    if (f > 0.01) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx - half(yL), yL); ctx.lineTo(cx + half(yL), yL); ctx.lineTo(cx, yv); ctx.closePath();
      if (f >= 0.999) { ctx.rect(cx - hw - 24, yg - 5, hw * 2 + 48, 6); }
      const hot = ctx.createLinearGradient(0, yL, 0, yv); hot.addColorStop(0, '#fde047'); hot.addColorStop(0.5, '#f97316'); hot.addColorStop(1, '#b91c1c');
      ctx.fillStyle = hot; ctx.fill();
      if (cool > 0.01) { ctx.globalAlpha = cool; ctx.fillStyle = lithFill('basalt'); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.clip();
      if (cool > 0.25) { ctx.strokeStyle = 'rgba(0,0,0,' + 0.55 * clamp((cool - 0.25) / 0.5, 0, 1) + ')'; ctx.lineWidth = 1.6; for (let x = cx - hw - 20; x <= cx + hw + 20; x += 24) { ctx.beginPath(); ctx.moveTo(x, yg - 6); ctx.lineTo(x + 2, yL + 150 > yv ? yv : yL + 150); ctx.stroke(); } }
      ctx.restore();
      if (f < 0.999 && tt > 0.02) D.glow(cx, yL, 80, '#ffd36b', 0.4 * (1 - cool));
    }
    // 협곡 (하천이 용암 대지를 파고들어요)
    const cTop = yg - 5, cBot = yg + dpx;
    if (dpx > 1) {
      ctx.beginPath(); ctx.moveTo(cx - canyonW / 2, cTop); ctx.lineTo(cx + canyonW / 2, cTop); ctx.lineTo(cx + canyonW * 0.36, cBot); ctx.lineTo(cx - canyonW * 0.36, cBot); ctx.closePath();
      const cg = ctx.createLinearGradient(0, cTop, 0, cBot); cg.addColorStop(0, '#cfe9ff'); cg.addColorStop(1, '#5b7388'); ctx.fillStyle = cg; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - canyonW / 2, cTop); ctx.lineTo(cx - canyonW * 0.36, cBot); ctx.moveTo(cx + canyonW / 2, cTop); ctx.lineTo(cx + canyonW * 0.36, cBot); ctx.stroke();
      ctx.fillStyle = '#38a3e8'; ctx.fillRect(cx - canyonW * 0.36, cBot - 6, canyonW * 0.72, 7);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4; for (let k = 1; k < 4; k++) { const yy = cTop + (cBot - cTop) * k / 4; ctx.beginPath(); ctx.moveTo(cx - canyonW / 2 - 14, yy); ctx.lineTo(cx - canyonW / 2 - 2 + 0, yy); ctx.moveTo(cx + canyonW / 2 + 2, yy); ctx.lineTo(cx + canyonW / 2 + 14, yy); ctx.stroke(); }
    } else { ctx.fillStyle = '#38a3e8'; ctx.fillRect(cx - 12, yv - 4 + (f > 0.01 ? 4 : 0) * 0, 24, f < 0.02 ? 5 : 0); }
    ctx.restore();
    // 눈금과 깊이 표시
    const sx = P.x + P.w - 36;
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, yv - 10 * HV.pxm); ctx.lineTo(sx, yv); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 5, yv - 10 * HV.pxm); ctx.lineTo(sx + 5, yv - 10 * HV.pxm); ctx.moveTo(sx - 5, yv); ctx.lineTo(sx + 5, yv); ctx.stroke();
    tx(sx - 8, yv - 5 * HV.pxm + 5, '10 m', 12.5, '#1e293b', 'right', 800);
    if (dpx > 6) { D.arrow(cx + canyonW / 2 + 44, yg, cx + canyonW / 2 + 44, cBot, { color: '#b45309', width: 3, head: 10 }); D.label(cx + canyonW / 2 + 54, yg + dpx / 2, '깊이 ' + f0(hantanDepthM(tt)) + ' m', { bg: '#b45309', size: 13, pad: 8, align: 'left' }); }
    const st = hantanStage(tt);
    D.label(P.x + P.w / 2, P.y + 24, HT_STAGES[st], { bg: '#0369a1', size: 14.5, pad: 12 });
    tx(P.x + P.w - 14, P.y + 50, st === 1 ? '약 50만~10만 년 전, 여러 차례 분출 (예시)' : '', 12.5, '#b45309', 'right', 800);
    if (tt >= 0.45) hotspot('plateau', cx - hw * 0.72, yg - 24, t, SITES.plateau.name);
    if (tt >= 0.62 && dpx > 24) hotspot('col', cx - canyonW / 2 - 24, yg + dpx * 0.45, t, SITES.col.name);
    if (tt >= 0.85) hotspot('canyon', cx + canyonW / 2 + 28, cBot - 16, t, SITES.canyon.name);
    infoBubble(P.y + P.h + 10);
  }
  /* 주상절리 단면 (위에서 본 모습) */
  const JT = (() => { const R = 34, rect = { x: JV.x + 14, y: JV.y + 40, w: JV.w - 28, h: JV.h - 54 }, rnd2 = mulberry(321), arr = []; for (let r = 0; r * 1.5 * R < rect.h + R; r++) for (let q = -1; q * SQ3 * R < rect.w + SQ3 * R; q++) { const cx = rect.x + (q + (r % 2) * 0.5) * SQ3 * R + SQ3 * R / 2, cy = rect.y + r * 1.5 * R + R; if (cx < rect.x + 4 || cx > rect.x + rect.w - 4 || cy < rect.y + 2 || cy > rect.y + rect.h - 2) continue; arr.push({ cx, cy, verts: Array.from({ length: 6 }, (_, k) => { const a = rad(30 + 60 * k); return [cx + Math.cos(a) * R * 0.96, cy + Math.sin(a) * R * 0.96]; }), del: Array.from({ length: 6 }, () => rnd2() * 0.45), shade: rnd2() }); } return { R, rect, arr }; })();
  function jointRun() { const J = S.joint; if (J.run) return; Sound.click(); J.run = true; J.c = 0; SciSim.tween(J, { c: 1 }, { duration: RM ? 0.01 : 4.5, ease: 'linear', onDone: () => { J.run = false; J.done = true; updateCtl(); } }); updateCtl(); }
  function jointReset() { const J = S.joint; SciSim.tween(J, { c: 0 }, { duration: 0.001 }); Object.assign(J, { c: 0, run: false, hex: -1 }); }
  function drawJoint(t, dt) {
    sites.length = 0;
    const P = JV, J = S.joint, c = J.c;
    panel(P.x, P.y, P.w, P.h, { fill: '#e7edf3' });
    tx(P.x + 12, P.y + 22, '주상절리를 위에서 본 모습 (모식도)', 14, '#334155', 'left', 800);
    ctx.save(); rr(JT.rect.x, JT.rect.y, JT.rect.w, JT.rect.h, 10).clip();
    JT.arr.forEach((h, i) => { ctx.beginPath(); h.verts.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fillStyle = mixc('#f97316', mixc('#3f3f47', '#6e6e77', h.shade), smooth(c * 1.4 - 0.1)); ctx.fill(); if (i === J.hex) { ctx.fillStyle = 'rgba(253,224,71,.45)'; ctx.fill(); } });
    ctx.strokeStyle = 'rgba(10,10,15,.9)'; ctx.lineWidth = 1.8 + c; ctx.lineCap = 'round';
    if (c > 0.02) JT.arr.forEach((h) => { for (let k = 0; k < 6; k++) { const a = h.verts[k], b = h.verts[(k + 1) % 6], fr = clamp((c - h.del[k] * 0.9) / 0.55, 0, 1); if (fr <= 0) continue; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr); ctx.stroke(); } });
    if (c > 0.05 && c < 0.8) JT.arr.forEach((h, i) => { if (i % 5 === 0) [0, 120, 240].forEach((d) => { const a = rad(d + 90), m = JT.R * 0.5 * (1 - c), s = 8; D.arrow(h.cx + Math.cos(a) * m, h.cy + Math.sin(a) * m, h.cx + Math.cos(a) * m * 0.35, h.cy + Math.sin(a) * m * 0.35, { color: '#fde047', width: 2.2, head: s, alpha: 0.95 * (1 - c) }); }); });
    JT.arr.forEach((h) => { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(h.cx - 4, h.cy); ctx.lineTo(h.cx + 4, h.cy); ctx.moveTo(h.cx, h.cy - 4); ctx.lineTo(h.cx, h.cy + 4); ctx.stroke(); });
    ctx.restore();
    if (c < 0.02) note(P.x + P.w / 2 - 170, P.y + P.h / 2 - 22, 340, '▶ 갈라지기를 눌러 용암이 식는 모습을 봐요', 15);
    if (J.hex >= 0) {
      const h = JT.arr[J.hex]; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.beginPath(); h.verts.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.stroke();
      D.label(h.cx, h.cy - JT.R - 12, '한 기둥의 단면: 육각형 · 꼭짓점의 각 약 120°', { bg: '#b45309', size: 13, pad: 9 });
    }
    if (c >= 0.98) { const h = JT.arr[Math.floor(JT.arr.length * 0.42)]; hotspot('col', h.cx, h.cy, t, ''); sites[sites.length - 1].r = PHONE ? 30 : 26; }
    const by = P.y + P.h + 10;
    infoBubble(by);
    if (c >= 0.98 && !info.id) { /* 안내 */ }
  }
  function jointTap(p) {
    if (S.joint.c < 0.98) return false;
    let best = -1, bd = 1e9; JT.arr.forEach((h, i) => { const d = Math.hypot(p.x - h.cx, p.y - h.cy); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd <= JT.R * 0.95) { S.joint.hex = best; findSite('col', p.x, p.y); return true; }
    return false;
  }

  /* ---------- 장면 ③ : 현장 노트 (퇴적·변성 명소) ---------- */
  const SK = PHONE
    ? [0, 1, 2, 3].map((i) => ({ x: 10, y: 46 + i * 198, w: 580, h: 190 }))
    : [[20, 46], [410, 46], [20, 252], [410, 252]].map(([x, y]) => ({ x, y, w: 370, h: 196 }));
  const SK_DEF = [
    { name: '역암 봉우리', eg: '예: 진안 마이산', hot: '둥근 자갈', hx: 0.34, hy: 0.55 },
    { name: '석회동굴', eg: '예: 강원 영월·삼척의 동굴', hot: '종유석', hx: 0.52, hy: 0.3 },
    { name: '공룡 발자국 층면', eg: '예: 경남 고성 상족암', hot: '발자국 줄', hx: 0.5, hy: 0.55 },
    { name: '편마암 노두', eg: '예: 선캄브리아시대 변성암 지대', hot: '줄무늬 띠', hx: 0.5, hy: 0.52 },
  ];
  const SK_PROC = [
    { id: 'conglo', txt: '호수·하천에서 운반되며 둥글게 마모된 자갈이 쌓여 굳은 뒤, 융기해 풍화·침식됨' },
    { id: 'karst', txt: '석회암이 지하수에 녹아(용식) 빈 공간이 생김' },
    { id: 'print', txt: '호숫가 진흙에 찍힌 발자국이 퇴적물에 덮여 굳은 뒤, 침식으로 드러남' },
    { id: 'meta', txt: '땅속 깊은 곳에서 높은 열과 압력을 받아 변성되고, 융기·침식으로 드러남' },
    { id: 'col', txt: '마그마가 식으며 수축해 육각 기둥으로 갈라짐' },
  ];
  const SK_ANS = ['conglo', 'karst', 'print', 'meta'];
  const SKR = mulberry(808);
  const SKP = Array.from({ length: 40 }, () => ({ a: SKR() * TAU, r: 0.5 + SKR() * 0.6, x: SKR(), y: SKR() }));
  function drawSketch(i, R, t) {
    const d = SK_DEF[i];
    panel(R.x, R.y, R.w, R.h, { fill: '#f1f5f9' });
    ctx.save(); rr(R.x, R.y + 30, R.w, R.h - 30, 0).clip();
    const x0 = R.x, y0 = R.y + 30, w = R.w, h = R.h - 30;
    if (i === 0) { // 역암 봉우리
      D.sky(x0, y0, w, h, '#cfe9ff', '#eaf6ff');
      const peak = (xl, xr, top) => { ctx.beginPath(); ctx.moveTo(xl, y0 + h); ctx.lineTo(xl + 6, y0 + h * 0.55); ctx.quadraticCurveTo(xl + (xr - xl) * 0.1, top, (xl + xr) / 2, top - 4); ctx.quadraticCurveTo(xr - (xr - xl) * 0.1, top, xr - 6, y0 + h * 0.55); ctx.lineTo(xr, y0 + h); ctx.closePath(); ctx.fillStyle = '#b8a98e'; ctx.fill(); ctx.save(); ctx.clip(); ctx.fillStyle = lithFill('conglo'); ctx.fill();
        SKP.forEach((p, k) => { if (k % 2) return; const px = xl + p.x * (xr - xl), py = top + p.y * (y0 + h - top); ctx.fillStyle = k % 4 ? 'rgba(120,110,95,.7)' : 'rgba(90,85,80,.7)'; ctx.beginPath(); ctx.ellipse(px, py, 4 + p.r * 4, 3 + p.r * 3, p.a, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(40,30,20,.5)'; ctx.lineWidth = 1; ctx.stroke(); });
        ctx.fillStyle = 'rgba(30,25,20,.7)'; [[0.3, 0.45], [0.62, 0.38], [0.5, 0.62]].forEach(([a, b]) => { ctx.beginPath(); ctx.ellipse(xl + (xr - xl) * a, top + (y0 + h - top) * b, 6, 4, 0.3, 0, TAU); ctx.fill(); });
        ctx.restore(); ctx.strokeStyle = 'rgba(50,40,30,.7)'; ctx.lineWidth = 2; ctx.stroke(); };
      peak(x0 + w * 0.06, x0 + w * 0.5, y0 + h * 0.1); peak(x0 + w * 0.46, x0 + w * 0.94, y0 + h * 0.2);
      ctx.fillStyle = '#6b8f55'; ctx.fillRect(x0, y0 + h - 14, w, 14);
    } else if (i === 1) { // 석회동굴
      ctx.fillStyle = lithFill('lime'); ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = 'rgba(120,110,80,.4)'; ctx.lineWidth = 1.5; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x0, y0 + k * h / 5); ctx.lineTo(x0 + w, y0 + k * h / 5); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x0 + w * 0.08, y0 + h * 0.8); ctx.bezierCurveTo(x0 + w * 0.08, y0 + h * 0.22, x0 + w * 0.3, y0 + h * 0.12, x0 + w * 0.5, y0 + h * 0.17); ctx.bezierCurveTo(x0 + w * 0.75, y0 + h * 0.1, x0 + w * 0.93, y0 + h * 0.3, x0 + w * 0.9, y0 + h * 0.8); ctx.closePath();
      const cg = ctx.createLinearGradient(0, y0, 0, y0 + h); cg.addColorStop(0, '#2a2622'); cg.addColorStop(1, '#4a423a'); ctx.fillStyle = cg; ctx.fill();
      ctx.fillStyle = '#e9e5d3'; [0.22, 0.34, 0.45, 0.52, 0.64, 0.76].forEach((a, k) => { const L = 20 + (k % 3) * 12, bx = x0 + w * a, by = y0 + h * (0.2 - 0.04 * Math.sin(a * 6)); ctx.beginPath(); ctx.moveTo(bx - 6, by); ctx.lineTo(bx + 6, by); ctx.lineTo(bx, by + L); ctx.closePath(); ctx.fill(); });
      [0.3, 0.58, 0.7].forEach((a, k) => { const L = 16 + k * 6, bx = x0 + w * a; ctx.beginPath(); ctx.moveTo(bx - 8, y0 + h * 0.8); ctx.lineTo(bx + 8, y0 + h * 0.8); ctx.lineTo(bx, y0 + h * 0.8 - L); ctx.closePath(); ctx.fill(); });
      ctx.strokeStyle = '#38a3e8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0 + w * 0.1, y0 + h * 0.78); ctx.quadraticCurveTo(x0 + w * 0.5, y0 + h * 0.84, x0 + w * 0.88, y0 + h * 0.78); ctx.stroke();
      for (let k = 0; k < 3; k++) { const ax = x0 + w * (0.25 + k * 0.25); D.arrow(ax, y0 + 6, ax, y0 + h * 0.14, { color: '#38bdf8', width: 3, head: 9, alpha: 0.9 }); }
    } else if (i === 2) { // 공룡 발자국 층면
      ctx.fillStyle = lithFill('mud'); ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = 'rgba(70,55,45,.35)'; ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { ctx.beginPath(); for (let x = x0; x <= x0 + w; x += 6) { const y = y0 + h * 0.12 + k * 9 + Math.sin(x * 0.09 + k) * 2.5; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
      ctx.strokeStyle = 'rgba(60,45,35,.55)'; ctx.lineWidth = 1.5; [[0.1, 0.78], [0.2, 0.85], [0.3, 0.76]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(x0 + w * a, y0 + h * b); ctx.lineTo(x0 + w * (a + 0.07), y0 + h * (b - 0.1)); ctx.lineTo(x0 + w * (a + 0.12), y0 + h * (b + 0.02)); ctx.lineTo(x0 + w * (a + 0.05), y0 + h * (b + 0.1)); ctx.closePath(); ctx.stroke(); });
      for (let k = 0; k < 5; k++) { const fx = x0 + w * (0.18 + k * 0.16), fy = y0 + h * (0.5 + (k % 2 ? 0.12 : -0.1)); ctx.save(); ctx.translate(fx, fy); ctx.rotate(-0.1); ctx.fillStyle = 'rgba(50,38,30,.85)'; [[-9, 0], [0, -2], [9, 0]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(dx, dy - 10, 4.5, 11, dx * 0.04, 0, TAU); ctx.fill(); }); ctx.beginPath(); ctx.ellipse(0, 8, 11, 8, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    } else { // 편마암 노두
      ctx.fillStyle = '#7d7480'; ctx.fillRect(x0, y0, w, h);
      for (let k = 0; k < 13; k++) { ctx.fillStyle = k % 2 ? '#ece4ee' : '#4a4350'; ctx.beginPath(); ctx.moveTo(x0, y0 + k * 17 - 6); for (let x = 0; x <= w; x += 8) ctx.lineTo(x0 + x, y0 + k * 17 - 6 + Math.sin(x * 0.03 + k * 0.7) * 9 + x * 0.05); for (let x = w; x >= 0; x -= 8) ctx.lineTo(x0 + x, y0 + k * 17 + 4 + Math.sin(x * 0.03 + k * 0.7) * 9 + x * 0.05); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#3f6b3a'; ctx.fillRect(x0, y0, w, 10);
      ctx.save(); ctx.translate(x0 + w * 0.82, y0 + h * 0.78); ctx.rotate(-0.5); ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-3, -2, 6, 40); ctx.fillStyle = '#9ca3af'; ctx.fillRect(-12, -10, 24, 12); ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.lineWidth = 2; rr(R.x, R.y, R.w, R.h, 14).stroke();
    tx(R.x + 12, R.y + 21, ['①', '②', '③', '④'][i] + ' ' + d.name, 14.5, '#1e293b', 'left', 800); tx(R.x + R.w - 12, R.y + 21, d.eg, 12, '#64748b', 'right', 700);
    // 관찰 포인트
    const hx = R.x + R.w * d.hx, hy = R.y + 30 + (R.h - 30) * d.hy * 1.0, found = S.sed.found[i], r = PHONE ? 20 : 17;
    ctx.save(); D.shadow(() => { ctx.fillStyle = found ? '#16a34a' : '#fff'; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = found ? '#14532d' : '#f59e0b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke(); ctx.restore();
    tx(hx, hy + 6, found ? '✓' : '?', 17, found ? '#fff' : '#b45309', 'center', 800);
    if (found) D.label(hx, hy - r - 14, d.hot, { bg: '#16a34a', size: 12.5, pad: 8 }); else D.ring(hx, hy, r + 6, t + i * 0.3, { color: '#f59e0b', speed: 0.6, width: 1.6 });
  }
  function drawSed(t, dt) {
    SK.forEach((R, i) => drawSketch(i, R, t));
    const y = PHONE ? 46 + 4 * 198 + 4 : SK[2].y + SK[2].h + 10, n = S.sed.found.filter(Boolean).length;
    if (!PHONE) { tx(20, y + 18, '관찰 포인트 ' + n + ' / 4 — ? 표시를 눌러 단서를 찾고, 오른쪽 칸에서 형성 과정을 짝지어요.', 14, '#475569', 'left', 800); }
  }
  function sedTap(p) {
    for (let i = 0; i < 4; i++) { const R = SK[i], d = SK_DEF[i], hx = R.x + R.w * d.hx, hy = R.y + 30 + (R.h - 30) * d.hy; if (Math.hypot(p.x - hx, p.y - hy) <= (PHONE ? 32 : 28)) { if (!S.sed.found[i]) { S.sed.found[i] = true; Sound.success(); parts.burst(hx, hy, { count: 14, colors: ['#f59e0b', '#16a34a', '#fff'] }); updateCtl(); } else Sound.click(); return true; } }
    return false;
  }

  /* ---------- 장면 ④ : 지질공원 발전 제안서 ---------- */
  const PLAN = [
    { id: 'g1', icon: '🧑‍🏫', name: '지질 해설사 양성', s: [1, 3, 2] },
    { id: 'g2', icon: '🪧', name: '탐방로·안내판 정비', s: [2, 2, 1] },
    { id: 'g3', icon: '🛍️', name: '지역 특산품·체험 프로그램', s: [0, 1, 3] },
    { id: 'g4', icon: '🚫', name: '암석·화석 채취 금지 단속', s: [3, 1, 0] },
    { id: 'g5', icon: '🎟️', name: '하루 탐방객 수 제한', s: [3, 0, -1] },
    { id: 'g6', icon: '🏨', name: '대형 숙박 시설 건설', s: [-3, 0, 3] },
    { id: 'g7', icon: '🤝', name: '지역 주민 참여 협의체', s: [1, 1, 2] },
  ];
  const AX = [['보전', '#16a34a'], ['교육', '#0ea5e9'], ['지역 경제', '#f59e0b']];
  const planSum = () => [0, 1, 2].map((a) => S.plan.sel.reduce((s, id) => s + PLAN.find((p) => p.id === id).s[a], 0));
  const planOk = () => S.plan.sel.length === 4 && planSum().every((v) => v >= 5);
  const PL = PHONE
    ? { cw: 284, ch: 84, gx: 10, gy: 52, gap: 8, B: { x: 10, y: 440, w: 580, h: 300 } }
    : { cw: 218, ch: 88, gx: 20, gy: 52, gap: 8, B: { x: 490, y: 46, w: 290, h: 400 } };
  const planPos = (i) => ({ x: PL.gx + (i % 2) * (PL.cw + PL.gap), y: PL.gy + Math.floor(i / 2) * (PL.ch + PL.gap) });
  const PB = [0, 0, 0];
  function drawPlan(t, dt) {
    const P = S.plan, sums = planSum();
    if (P.shake > 0) P.shake = Math.max(0, P.shake - dt);
    tx(PL.gx, PL.gy - 14, '제안에 넣을 카드 4장을 골라요 (' + P.sel.length + ' / 4)', 14.5, '#334155', 'left', 800);
    PLAN.forEach((c, i) => {
      const p = planPos(i), on = P.sel.includes(c.id), sh = (P.shake > 0 && !on) ? Math.sin(P.shake * 60) * 3 : 0;
      ctx.save(); ctx.translate(sh, on ? -2 : 0);
      D.shadow(() => { ctx.fillStyle = on ? '#effaf2' : '#fff'; rr(p.x, p.y, PL.cw, PL.ch, 14).fill(); }, { blur: on ? 9 : 4, y: on ? 4 : 2 });
      ctx.strokeStyle = on ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = on ? 3.4 : 2; rr(p.x, p.y, PL.cw, PL.ch, 14).stroke();
      tx(p.x + 12, p.y + 36, c.icon, 26, '#000', 'left', 700);
      const ls = wrapLines(c.name, PL.cw - 76, 14.5, 800); ls.slice(0, 2).forEach((l, k) => tx(p.x + 52, p.y + 26 + k * 18, l, 14.5, '#1e293b', 'left', 800));
      c.s.forEach((v, a) => { D.label(p.x + 14 + a * ((PL.cw - 28) / 3) + 0, p.y + PL.ch - 18, AX[a][0].replace('지역 ', '') + ' ' + (v > 0 ? '+' + v : v), { bg: v < 0 ? '#fee2e2' : v === 0 ? '#f1f5f9' : '#eefbf1', color: v < 0 ? '#b91c1c' : v === 0 ? '#64748b' : '#15803d', size: 12, pad: 6, align: 'left', border: v < 0 ? '#fca5a5' : '#e2e8f0' }); });
      if (on) { tx(p.x + PL.cw - 16, p.y + 24, '✔', 18, '#16a34a', 'right', 800); }
      ctx.restore();
    });
    // 제안서 점수 막대
    const B = PL.B; panel(B.x, B.y, B.w, B.h, { title: '제안서 점수 (세 점수 모두 5 이상)', fill: '#fffdf5', border: '#f2d38a' });
    const lo = -4, hi = 12;
    AX.forEach((a, k) => {
      PB[k] = approach(PB[k], sums[k], dt, 7);
      const bx = B.x + 18, bw = B.w - 36, by = B.y + 62 + k * (PHONE ? 74 : 92), ok = sums[k] >= 5;
      tx(bx, by - 10, a[0], 15, '#334155', 'left', 800); tx(bx + bw, by - 10, sums[k] + '점', 16, ok ? '#15803d' : '#475569', 'right', 800);
      ctx.fillStyle = '#e8edf3'; rr(bx, by, bw, 24, 10).fill();
      const x0 = bx + bw * (0 - lo) / (hi - lo), xv = bx + bw * (clamp(PB[k], lo, hi) - lo) / (hi - lo);
      ctx.save(); rr(bx, by, bw, 24, 10).clip(); ctx.fillStyle = ok ? a[1] : (PB[k] < 0 ? '#ef4444' : mixc(a[1], '#cbd5e1', 0.45)); ctx.fillRect(Math.min(x0, xv), by, Math.abs(xv - x0), 24); ctx.restore();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, by - 3); ctx.lineTo(x0, by + 27); ctx.stroke();
      const xg = bx + bw * (5 - lo) / (hi - lo); ctx.setLineDash([4, 3]); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xg, by - 5); ctx.lineTo(xg, by + 29); ctx.stroke(); ctx.setLineDash([]);
      tx(xg, by + 44, '목표 5', 12, '#dc2626', 'center', 800); tx(x0, by + 44, '0', 12, '#475569', 'center', 800);
    });
    if (planOk()) D.label(B.x + B.w / 2, B.y + B.h - 24, '🎉 세 점수 모두 5점 이상!', { bg: '#16a34a', size: 14, pad: 12 });
    else tx(B.x + B.w / 2, B.y + B.h - 22, P.sel.length < 4 ? '카드를 4장 고르면 제안서가 완성돼요' : '점수가 5점 미만인 목표가 있어요. 카드를 바꿔 봐요', PHONE ? 12.5 : 12.5, '#64748b', 'center', 800);
  }
  function planTap(p) {
    const P = S.plan;
    for (let i = 0; i < PLAN.length; i++) {
      const q = planPos(i);
      if (p.x >= q.x && p.x <= q.x + PL.cw && p.y >= q.y && p.y <= q.y + PL.ch) {
        const id = PLAN[i].id, k = P.sel.indexOf(id);
        if (k >= 0) { P.sel.splice(k, 1); P.why[k] = ''; P.why = P.why.slice(0, k).concat(P.why.slice(k + 1), ['']); Sound.click(); }
        else if (P.sel.length >= 4) { P.shake = 0.45; Sound.fail(); say('카드는 4장까지 고를 수 있어요. 하나를 빼고 골라요.', true, 2.4); }
        else { P.sel.push(id); Sound.tick(); parts.burst(q.x + PL.cw / 2, q.y + PL.ch / 2, { count: 8, speed: 80, size: 3, life: 0.5, colors: ['#16a34a', '#fff'] }); }
        updateCtl(); return true;
      }
    }
    return false;
  }

  /* ---------- 컨트롤 연결 ---------- */
  const sHT = $('#sHT'), oHT = $('#oHT'), pinBtns = $$('#pinSeg .opt'), selRock = $('#selRock'), selAge = $('#selAge'), ssels = $$('.ssel'), whySels = $$('.wsel'), whyLbls = $$('.wlbl');
  const seqHT = makeSeq($('#seqHT'), [{ id: 'a', label: 'A 용암이 옛 계곡을 메우며 분출해요' }, { id: 'b', label: 'B 식으면서 부피가 줄어(수축)요' }, { id: 'c', label: 'C 갈라져 주상절리가 생겨요' }, { id: 'd', label: 'D 하천이 용암 대지를 깎기 시작해요' }, { id: 'e', label: 'E 깊은 협곡과 절벽이 완성돼요' }], { order: ['d', 'a', 'e', 'c', 'b'] });
  const HT_ANS = 'a,b,c,d,e';
  const mapReveal = () => { SciSim.tween(S.map, { rev: 0 }, { duration: 0.001 }); S.map.rev = 0; SciSim.tween(S.map, { rev: 1 }, { duration: RM ? 0.05 : 2.2, ease: 'inOutQuad' }); };
  const setView = (v) => { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); info.id = null; if (v === 'map') mapReveal(); } updateCtl(); };
  function whyAxisOk(idx, ax) { const c = PLAN.find((q) => q.id === S.plan.sel[idx]); return !!c && c.s[ax] >= 2; }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes || !c.dataset.modes.split(' ').includes(S.view); });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.view === S.view); });
    pinBtns.forEach((b, i) => { b.classList.toggle('on', S.map.sel === i); b.innerHTML = (i + 1) + ' ' + PINS[i].name.replace('강원 ', '').replace('경남 ', '') + (mapAnsDone(i) ? ' <span class="ok">✔</span>' : ''); });
    const a = S.map.ans[S.map.sel]; selRock.value = a.rock; selAge.value = a.age;
    $('#pinClue').textContent = (S.map.sel + 1) + '번 ' + PINS[S.map.sel].name + ' — 단서: ' + PINS[S.map.sel].clue;
    const items = CHK.map((c) => '<li class="' + (S.found[c[0]] ? 'ok' : '') + '">' + (S.found[c[0]] ? '✅' : '⬜') + ' ' + c[1] + '</li>').join('');
    $('#chkList').innerHTML = items; $('#chkCnt').textContent = chkCount() + ' / 6';
    setSlider(sHT, oHT, Math.round(S.hantan.t * 100), () => HT_STAGES[hantanStage(S.hantan.t)]);
    $('#bHtPlay').textContent = S.hantan.play ? '⏸ 멈춤' : '⏵ 재생';
    $('#bJointRun').disabled = S.joint.run; $('#bJointRun').textContent = S.joint.run ? '갈라지는 중…' : S.joint.done ? '▶ 다시 갈라지기' : '▶ 갈라지기';
    ssels.forEach((s) => { s.value = S.sed.ans[+s.dataset.i]; });
    whySels.forEach((s, i) => { const c = PLAN.find((q) => q.id === S.plan.sel[i]); s.parentElement.hidden = !c; if (c) { whyLbls[i].textContent = c.icon + ' ' + c.name; s.value = S.plan.why[i]; } });
    $('#whyNote').hidden = S.plan.sel.length > 0;
  }
  pinBtns.forEach((b, i) => b.addEventListener('click', () => { Sound.click(); S.map.sel = i; updateCtl(); }));
  selRock.addEventListener('change', () => { Sound.click(); S.map.ans[S.map.sel].rock = selRock.value; updateCtl(); });
  selAge.addEventListener('change', () => { Sound.click(); S.map.ans[S.map.sel].age = selAge.value; updateCtl(); });
  bindSlider(sHT, oHT, () => '…', (v) => { const H = S.hantan; if (H.play) { H.play = false; SciSim.tween(H, { t: H.t }, { duration: 0.001 }); } H.t = v / 100; H.max = Math.max(H.max || 0, H.t); updateCtl(); });
  function htPlay() {
    const H = S.hantan; Sound.click();
    if (H.play) { H.play = false; SciSim.tween(H, { t: H.t }, { duration: 0.001 }); updateCtl(); return; }
    if (H.t >= 0.999) H.t = 0;
    H.play = true;
    SciSim.tween(H, { t: 1 }, { duration: RM ? 0.05 : (1 - H.t) * 16, ease: 'linear', onUpdate: () => { H.max = Math.max(H.max || 0, H.t); setSlider(sHT, oHT, Math.round(H.t * 100), () => HT_STAGES[hantanStage(H.t)]); }, onDone: () => { H.play = false; H.t = 1; H.max = 1; updateCtl(); } });
    updateCtl();
  }
  function htReset() { const H = S.hantan; SciSim.tween(H, { t: 0 }, { duration: 0.001 }); Object.assign(H, { t: 0, play: false }); updateCtl(); }
  $('#bHtPlay').addEventListener('click', htPlay); $('#bHtReset').addEventListener('click', () => { Sound.click(); htReset(); });
  const eroOk = () => S.ero.rec != null && Math.abs(S.ero.rec - 0.06) < 0.0006;
  function eroRecord() {
    const v = parseFloat(($('#inEro').value || '').replace(/,/g, '').trim());
    if (!isFinite(v)) { toast('침식률을 숫자로 써 주세요.', 'bad'); Sound.fail(); return; }
    S.ero.rec = v;
    if (eroOk()) { Sound.success(); toast('✅ 30 000 mm / 500 000년 = 0.06 mm/년', 'good'); parts.burst(120, 300, { count: 14, colors: ['#0ea5e9', '#16a34a', '#fbbf24'] }); }
    else { Sound.fail(); toast('깊이 30 m = 30 000 mm를 500 000년으로 나눠 mm/년으로 다시 계산해 봐요.', 'bad'); }
    updateCtl();
  }
  $('#bEro').addEventListener('click', eroRecord); $('#inEro').addEventListener('keydown', (e) => { if (e.key === 'Enter') eroRecord(); });
  $('#bJointRun').addEventListener('click', jointRun); $('#bJointReset').addEventListener('click', () => { Sound.click(); jointReset(); updateCtl(); });
  ssels.forEach((s) => s.addEventListener('change', () => { Sound.click(); S.sed.ans[+s.dataset.i] = s.value; updateCtl(); }));
  whySels.forEach((s, i) => s.addEventListener('change', () => { Sound.click(); S.plan.why[i] = s.value; updateCtl(); }));
  $('#bPlanReset').addEventListener('click', () => { Sound.click(); S.plan.sel = []; S.plan.why = ['', '', '', '']; updateCtl(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      switch (S.view) {
        case 'map': mapTap(p); break; case 'jeju': case 'hantan': siteTap(p); break; case 'joint': if (!siteTap(p)) jointTap(p); break;
        case 'sed': sedTap(p); break; case 'plan': planTap(p); break; default: break;
      }
      return false;
    },
    hover(p) {
      if (S.view === 'map') return PINS.some((q) => { const [x, y] = pinXY(q); return Math.hypot(p.x - x, p.y - y) <= 22; }) ? 'pointer' : 'default';
      if (S.view === 'jeju' || S.view === 'hantan' || S.view === 'joint') return sites.some((s) => Math.hypot(p.x - s.x, p.y - s.y) <= s.r) ? 'pointer' : 'default';
      if (S.view === 'plan') return PLAN.some((c, i) => { const q = planPos(i); return p.x >= q.x && p.x <= q.x + PL.cw && p.y >= q.y && p.y <= q.y + PL.ch; }) ? 'pointer' : 'default';
      return 'default';
    },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'map') { const n = PINS.filter((p, i) => mapAnsDone(i)).length; setReadouts(['고른 핀', (S.map.sel + 1) + '번 ' + PINS[S.map.sel].name, '정한 곳', n + ' / 6', '지질도', '색 = 시대·암석']); }
    else if (v === 'jeju') setReadouts(['찾은 관찰 포인트', chkCount() + ' / 6', '제주도', '신생대 화산섬', '주요 암석', '현무암']);
    else if (v === 'hantan') { const H = S.hantan; setReadouts(['단계', HT_STAGES[hantanStage(H.t)].replace(/^.\s/, ''), '침식으로 깎인 깊이', f0(hantanDepthM(H.t)) + ' m', '찾은 관찰 포인트', chkCount() + ' / 6']); }
    else if (v === 'joint') setReadouts(['진행', f0(S.joint.c * 100) + ' %', '기둥 단면', '육각형', '찾은 관찰 포인트', chkCount() + ' / 6']);
    else if (v === 'sed') { const n = S.sed.found.filter(Boolean).length; setReadouts(['찾은 관찰 포인트', n + ' / 4', '짝지은 과정', S.sed.ans.filter((x) => x).length + ' / 4', '핵심', '단서 → 과정']); }
    else { const s = planSum(); setReadouts(['보전', s[0] + '점', '교육', s[1] + '점', '지역 경제', s[2] + '점']); }
  }

  /* ---------- 단계 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    if (li === 0) { S.map.ans = Array.from({ length: 6 }, () => ({ rock: '', age: '' })); S.map.sel = 0; setView('map'); mapReveal(); showHint('핀을 눌러 암석과 시대를 정해요', 5000); }
    else if (li === 1) { S.found = {}; htReset(); S.hantan.max = 0; jointReset(); S.joint.done = false; seqHT.reset(); S.ero.rec = null; $('#inEro').value = ''; info.id = null; setView('hantan'); showHint('시간 슬라이더로 한탄강이 만들어지는 과정을 봐요', 5000); }
    else if (li === 2) { S.sed = { ans: ['', '', '', ''], found: [false, false, false, false] }; setView('sed'); showHint('? 표시를 눌러 관찰 단서를 찾아요', 5000); }
    else { S.plan.sel = []; S.plan.why = ['', '', '', '']; PB[0] = PB[1] = PB[2] = 0; setView('plan'); showHint('카드 4장을 골라 제안서를 완성해요', 5000); }
    updateCtl();
  }
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const SRC = '<p style="font-size:13.5px;color:var(--muted);margin-top:6px">※ 지질도·단면·수치는 모두 교육용 <b>모식도·예시 자료</b>예요. 실제 값은 현장 안내판이나 지질공원·박물관 누리집에서 확인해요.</p>';
  const pinMsg = () => {
    for (let i = 0; i < PINS.length; i++) {
      const p = PINS[i], a = S.map.ans[i];
      if (!a.rock || !a.age) return (i + 1) + '번 ' + p.name + '의 암석과 시대를 모두 정해요.';
    }
    for (let i = 0; i < PINS.length; i++) {
      const p = PINS[i], a = S.map.ans[i];
      if (a.rock !== p.rock) return (i + 1) + '번 ' + p.name + ': 암석이 달라요. 단서(' + p.clue + ')를 다시 살펴봐요.';
      if (a.age !== p.age) return (i + 1) + '번 ' + p.name + ': 시대가 달라요. 지도에서 그 핀이 놓인 곳의 색을 범례와 비교해요.';
    }
    return true;
  };

  const levels = [
    {
      title: '한반도의 암석과 시대', short: '한반도 지질', icon: '🗺️', phase: '분석', features: ['map'],
      intro: '<p class="si-q">❓ 탐구 질문: 내가 사는 곳과 가까운 지질공원에 가면 어떤 돌과 지형을 볼 수 있고, 그것들은 어떻게 만들어졌을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시들에서</b> 화성암·변성암·퇴적암이 만들어지는 환경(변동대)과 지질 구조, 지질시대를 배웠어요.</div>' +
        '<p>한반도에는 여러 시대의 암석이 모여 있어요. 간략하게 그린 <b>한반도 지질도</b>에서 시대별 암석이 어디에 분포하는지 읽고, 대표 지점 여섯 곳의 <b>암석과 시대</b>를 추론해 봐요. 이 단원에서는 모든 지질공원을 하나씩 외우는 대신, 직접 방문했을 때 <b>관찰할 수 있는 암석과 지형</b>을 해석해요.</p>' + SRC,
      setup() { enterLevel(0); },
      recap: '한반도에는 선캄브리아시대 변성암, 고생대 퇴적암, 중생대 화강암과 퇴적암, 신생대 화산암이 분포해요. 암석의 종류와 시대는 지질도와 단서로 추론해요.',
      summary: '<ul>' + tb([['시대', '대표 암석', '예시 지역'], ['선캄브리아시대', '편마암·편암', '경기 육괴·영남 육괴(지리산 일대)'], ['고생대', '석회암·사암 등 퇴적암', '강원 남부(태백·영월)'], ['중생대', '화강암, 경상 분지의 퇴적암·화산암', '북한산·설악산, 공룡 발자국(경남 고성)'], ['신생대', '현무암 등 화산암, 퇴적 분지', '제주도·울릉도·백두산·한탄강, 포항']]) + '<li>한반도는 판의 경계에서 떨어진 대륙판 안쪽이지만, 과거의 변동대와 신생대 화산 활동의 흔적이 남아 있어요.</li></ul>',
      missions: [
        {
          title: '대표 지점의 암석과 시대 추론', manual: true,
          goal: '핀 6개 각각의 <b>암석</b>과 <b>시대</b>를 단서와 지질도의 색(범례)으로 추론해 정하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '핀을 누르면 오른쪽 위에서 암석과 시대를 고를 수 있어요. 시대는 지도에서 그 핀이 놓인 곳의 색을 범례와 비교하고, 암석은 단서를 살펴봐요.',
          setup() { setView('map'); },
          status: () => '정한 지점 ' + PINS.filter((p, i) => mapAnsDone(i)).length + ' / 6',
          check: () => pinMsg(),
          explain: '북한산은 <b>중생대 화강암</b>, 지리산 일대는 <b>선캄브리아시대 편마암</b>, 한라산과 철원·한탄강은 <b>신생대 현무암</b>, 태백은 <b>고생대 석회암</b>, 경남 고성은 <b>중생대(백악기) 퇴적암</b>이에요. 지질도의 색으로 시대를, 단서로 암석을 추론했어요.',
        },
        {
          type: 'quiz', title: '한반도의 화산 지형', goal: '제주도·백두산·한탄강 일대의 <b>신생대 화산 지형</b>에 대한 설명으로 알맞은 것은?', setup() { setView('map'); },
          choices: ['모두 판의 경계 위에 있어서 만들어졌어요', '화산은 판의 경계에서만 만들어지므로 한반도에는 화산암이 없어요', '한반도는 판 경계에서 떨어진 대륙판 안쪽이지만, 신생대에 화산 활동이 있었어요', '북한산 같은 화강암 산도 신생대 용암이 식은 암석이에요'],
          answer: 2,
          feedback: ['제주도·백두산·한탄강은 현재의 판 경계에서 멀리 떨어져 있어요.', '지질도에서 보듯 한반도에도 신생대 화산암(제주·울릉·백두산·한탄강)이 있어요.', '', '북한산 같은 화강암은 중생대에 땅속 깊은 곳에서 마그마가 천천히 식어 만들어진 심성암이에요.'],
          explain: '한반도는 <b>판의 경계가 아닌 대륙판 안쪽</b>에 있어요. 그런데도 신생대에 제주·백두산·한탄강 일대에서 화산 활동이 있었어요. 북한산 같은 <b>화강암은 중생대</b>에 땅속 깊은 곳에서 식은 암석이에요.',
        },
      ],
    },
    {
      title: '화산 지형: 제주도와 한탄강', short: '화산 지형', icon: '🌋', phase: '탐구', features: ['jeju', 'hantan', 'joint'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 신생대 화산암(현무암)이 제주도·한탄강 일대에 분포한다는 것을 확인했어요.</div>' +
        '<p>제주도의 <b>기공이 많은 현무암, 용암 동굴, 주상절리, 수성 화산(성산일출봉)</b>과 한탄강의 <b>용암 대지, 주상절리 절벽, 협곡</b>은 어떻게 만들어졌을까요? 현장 관찰 체크리스트의 관찰 포인트를 찾고, 한탄강이 만들어진 <b>순서</b>와 <b>침식 속도</b>를 추론해 봐요.</p>' + SRC,
      setup() { enterLevel(1); },
      recap: '용암이 옛 계곡을 메워 식으면서 수축해 주상절리가 생기고, 하천이 용암 대지를 파고들어 협곡이 만들어졌어요. 침식률 = 깊이 / 시간이에요.',
      summary: '<ul><li><b>제주도</b>: 현무암(기공), 용암 동굴, 바닷가 주상절리, 수성 화산(성산일출봉: 마그마가 바닷물·지하수와 만나 폭발, 화산재가 층을 이룸).</li><li><b>한탄강</b>: 약 50만~10만 년 전 여러 차례 분출한 용암이 옛 계곡을 메워 <b>용암 대지</b>가 되고, 하천이 파고들어 <b>협곡과 주상절리 절벽(약 30 m)</b>이 만들어졌어요.</li><li>형성 순서: 용암 분출 → 급랭·수축 → 주상절리 → 하천 침식 → 협곡.</li><li>침식률 = 깊이 / 시간 = 30 m / 50만 년 = 30 000 mm / 500 000년 = <b>0.06 mm/년</b>.</li></ul>',
      missions: [
        {
          title: '한탄강이 만들어진 순서', manual: true,
          goal: '🌊 한탄강 형성 과정을 끝까지 본 뒤(슬라이더를 오른쪽 끝으로), 다섯 단계를 <b>일어난 순서대로</b> 담고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '⏵ 재생을 누르면 용암이 분출해 식고, 하천이 깎아 협곡이 만들어지는 과정을 볼 수 있어요. 주상절리는 용암이 식으며 생겨요.',
          setup() { htReset(); S.hantan.max = 0; seqHT.reset(); setView('hantan'); },
          status: () => '끝까지 봄 ' + mark((S.hantan.max || 0) >= 0.95) + ' · 순서 담음 ' + seqHT.ids().length + ' / 5',
          check: () => {
            if ((S.hantan.max || 0) < 0.95) return '먼저 시간 슬라이더를 끝까지 움직이거나 ⏵ 재생으로 과정을 지켜봐요.';
            const a = seqHT.ids(); if (a.length < 5) return '다섯 단계를 모두 담아요.';
            if (a.join() === HT_ANS) return true;
            const want = HT_ANS.split(','), i = a.findIndex((x, k) => x !== want[k]);
            return (i + 1) + '번째 자리가 아직 맞지 않아요. 용암이 분출해 식은 뒤에야 하천이 깎을 수 있어요.';
          },
          explain: '순서는 <b>용암 분출 → 식으며 수축 → 주상절리 → 하천 침식 → 협곡</b>이에요. 용암이 먼저 옛 계곡을 메워 굳어야 하천이 그 단단한 현무암을 깎아 협곡을 만들 수 있어요.',
        },
        {
          title: '침식률 계산과 관찰 포인트 찾기',
          goal: '한탄강 협곡이 깊이 <b>30 m</b>까지 파이는 데 <b>50만 년</b>이 걸렸다면 침식률은 몇 <b>mm/년</b>일까요? 기록하고, 체크리스트 관찰 포인트를 <b>3개 이상</b> 찾아요.',
          hint: '30 m = 30 000 mm. 침식률 = 30 000 mm / 500 000년. 장면의 ? 표시(용암 대지, 주상절리, 협곡)를 눌러 찾아요. 슬라이더를 오른쪽으로 옮겨야 나타나요.',
          hold: 0.4, setup() { S.ero.rec = null; $('#inEro').value = ''; setView('hantan'); },
          status: () => '침식률 기록 ' + mark(eroOk()) + ' · 관찰 포인트 ' + chkCount() + ' / 3개 이상 ' + mark(chkCount() >= 3),
          check: () => eroOk() && chkCount() >= 3,
          explain: '침식률 = 깊이 / 시간 = 30 000 mm / 500 000년 = <b>0.06 mm/년</b>이에요. 1년에 머리카락 굵기보다 훨씬 얇게 깎이지만, 오랜 시간이 쌓이면 깊은 협곡이 돼요. (수치는 예시 자료이므로 실제 값은 안내판·누리집에서 확인해요.)',
        },
        {
          type: 'quiz', title: '주상절리의 단면이 육각형인 까닭', goal: '주상절리의 위쪽 단면이 <b>육각형</b>인 까닭은?', setup() { setView('joint'); },
          choices: ['용암이 처음부터 육각형 광물로 이루어져 있기 때문이에요', '하천이 암석을 육각형으로 깎아 냈기 때문이에요', '수축 중심들 사이에서 균열이 고르게 퍼져 서로 약 120°로 만나, 육각형 모양으로 갈라지기 때문이에요', '바닷물이 육각형 구멍을 뚫었기 때문이에요'],
          answer: 2,
          feedback: ['광물이 아니라 용암 전체가 식으면서 수축해 갈라지는 거예요.', '주상절리는 용암이 식을 때 이미 만들어져요. 하천은 나중에 그 절리를 따라 깎을 뿐이에요.', '', '주상절리는 용암이 식으면서 부피가 줄어(수축) 생겨요.'],
          explain: '용암이 식으면서 여러 <b>수축 중심</b>을 향해 부피가 줄고, 그 사이에서 균열이 고르게 퍼져 서로 약 <b>120°</b>로 만나 <b>육각형</b> 기둥이 돼요. 한탄강 협곡은 이렇게 갈라진 용암 대지를 하천이 오랜 시간 깎아 만들어졌어요.',
        },
      ],
    },
    {
      title: '퇴적·변성 명소 읽기', short: '퇴적·변성', icon: '📓', phase: '탐구', features: ['sed'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화산 지형의 관찰 단서로 형성 과정을 추론했어요. 이번에는 퇴적암과 변성암 지형의 <b>현장 노트</b>를 읽어요.</div>' +
        '<p>둥근 자갈이 박힌 <b>역암 봉우리</b>, 석회암이 녹아 생긴 <b>석회동굴</b>, 백악기 호숫가에 찍힌 <b>공룡 발자국</b>, 선캄브리아시대 변동대의 흔적인 <b>편마암 노두</b>를 모식도로 만나요. 현장에서 확인할 <b>관찰 포인트</b>를 찾고, 단서와 <b>형성 과정</b>을 짝지어 봐요.</p>' + SRC,
      setup() { enterLevel(2); },
      recap: '관찰한 단서(둥근 자갈, 종유석, 발자국 줄, 줄무늬 띠)로 호수 퇴적 → 융기·침식, 석회암의 용식, 호숫가 퇴적과 매몰, 깊은 곳의 변성과 같은 형성 과정을 추론해요.',
      summary: '<ul>' + tb([['관찰 단서', '형성 과정'], ['역암 봉우리: 둥근 자갈', '호수·하천에서 운반되며 마모 → 퇴적·고결 → 융기·풍화·침식'], ['석회동굴: 종유석·석순', '석회암이 지하수에 녹음(용식)'], ['공룡 발자국 층면', '호숫가 진흙에 발자국 → 퇴적물에 덮임 → 굳음 → 침식으로 노출'], ['편마암 노두: 줄무늬 띠', '깊은 곳에서 열·압력으로 변성 → 융기·침식']]) + '</ul>',
      missions: [
        {
          title: '관찰 단서와 형성 과정 짝짓기', manual: true,
          goal: '현장 노트 ①~④에서 단서를 확인하고, 오른쪽 칸에서 각각의 <b>형성 과정</b>을 골라 짝지은 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '① 둥근 자갈 → 오래 굴러 닳았어요. ② 종유석 → 석회암이 물에 녹았어요. ③ 발자국 줄 → 진흙에 찍혔어요. ④ 줄무늬 띠 → 변성암이에요.',
          setup() { setView('sed'); },
          status: () => '짝지은 노트 ' + S.sed.ans.filter((x) => x).length + ' / 4',
          check: () => {
            const a = S.sed.ans, n = a.findIndex((x) => !x); if (n >= 0) return '노트 ' + (n + 1) + '번(' + SK_DEF[n].name + ')의 형성 과정을 아직 고르지 않았어요.';
            const w = a.findIndex((x, i) => x !== SK_ANS[i]); if (w < 0) return true;
            return '노트 ' + (w + 1) + '번(' + SK_DEF[w].name + '): 관찰 단서(' + SK_DEF[w].hot + ')를 떠올려 다시 골라요.';
          },
          explain: '역암의 <b>둥근 자갈</b>은 오래 운반되며 닳은 증거, 석회동굴의 <b>종유석</b>은 석회암이 지하수에 녹은 증거, <b>발자국 줄</b>은 호숫가 진흙에 찍혀 덮인 증거, <b>줄무늬 띠</b>는 깊은 곳에서 열·압력을 받은 변성암의 증거예요.',
        },
        {
          title: '방문할 때 확인할 관찰 포인트', 
          goal: '현장 노트 네 장에서 <b>? 표시(관찰 포인트)</b>를 모두 찾아 눌러 체크해요.',
          hint: '둥근 자갈이 보이는 곳, 천장에 매달린 종유석, 일정하게 이어진 발자국, 밝고 어두운 줄무늬 띠를 찾아 눌러요.',
          hold: 0.4, setup() { setView('sed'); },
          status: () => '관찰 포인트 ' + S.sed.found.filter(Boolean).length + ' / 4',
          check: () => S.sed.found.every(Boolean),
          explain: '현장에서는 암석의 <b>알갱이 모양, 줄무늬, 구멍과 틈, 흔적</b>을 단서로 삼아요. 안전을 위해 정해진 탐방로를 지키고, 암석과 화석은 채취하지 않고 사진과 스케치로 기록해요.',
        },
        {
          type: 'quiz', title: '역암의 자갈이 둥근 까닭', goal: '역암 봉우리에 박힌 자갈이 <b>둥근</b> 까닭은?', setup() { setView('sed'); },
          choices: ['마그마가 식으며 수축해서 둥글게 뭉쳤어요', '강이나 호수에서 오래 운반되는 동안 서로 부딪혀 모서리가 닳았기 때문이에요', '높은 열과 압력으로 변성되어 둥글어졌어요', '처음부터 둥근 모양으로 만들어졌어요'],
          answer: 1,
          feedback: ['화성암이 아니라 퇴적암(역암)이에요. 자갈은 흐르는 물에 운반되며 만들어져요.', '', '변성 작용은 알갱이를 재결정시키거나 줄지어 서게 해요. 자갈을 둥글게 만드는 것은 운반 과정의 마모예요.', '자갈은 큰 암석이 부서진 조각이에요. 운반되며 둥글어져요.'],
          explain: '자갈은 강이나 호수로 <b>오래 운반</b>되는 동안 서로 부딪히며 모서리가 닳아 둥글어져요. 그 자갈이 쌓여 굳은 것이 역암이에요. (공룡 발자국이 남으려면 진흙이 굳기 전에 발자국이 찍히고, 곧 퇴적물에 덮여 보존되어야 해요.)',
        },
      ],
    },
    {
      title: '지질공원의 지속가능한 발전', short: '발전 방안', icon: '📝', phase: '적용', features: ['plan'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지질공원에서 볼 수 있는 암석과 지형의 형성 과정을 추론했어요.</div>' +
        '<p><b>지질공원</b>은 지질 유산을 <b>보전</b>하고, 교육·관광에 <b>활용</b>해서 지역 주민의 <b>지속가능한 발전</b>을 돕는 곳이에요. 하지만 <b>훼손, 채취, 탐방객이 한꺼번에 몰리는 과밀</b> 같은 위험도 있어요. 카드를 골라 <b>보전·교육·지역 경제</b> 세 점수가 모두 5점 이상이 되는 제안서를 만들어 봐요.</p>' + SRC,
      setup() { enterLevel(3); },
      recap: '지질공원은 보전과 활용을 함께 고려해요. 해설사·탐방로·단속·주민 협의체처럼 균형을 맞춘 방안이 지속가능한 발전에 도움이 돼요.',
      summary: '<ul><li><b>지질공원의 목적</b>: 지질 유산의 보전, 교육, 지속가능한 지역 발전.</li><li><b>위험 요소</b>: 훼손, 암석·화석 채취, 탐방객 과밀.</li><li>보전만 강조하면 주민의 삶과 교육 기회가 줄고, 개발만 강조하면 지질 유산이 훼손돼요. <b>보전과 활용을 함께</b> 고려해요.</li><li>예시 제안: 지질 해설사 + 탐방로·안내판 + 채취 금지 단속 + 주민 협의체 = 보전 7, 교육 7, 지역 경제 5.</li></ul>',
      missions: [
        {
          title: '세 점수가 모두 5점 이상인 제안서', 
          goal: '카드 <b>4장</b>을 골라 <b>보전·교육·지역 경제</b> 점수가 각각 <b>5점 이상</b>이 되게 해요.',
          hint: '보전만 높거나 지역 경제만 높은 조합은 안 돼요. 점수가 균형을 이루는 카드(해설사, 탐방로, 주민 협의체 등)를 함께 골라요.',
          hold: 0.5, setup() { S.plan.sel = []; S.plan.why = ['', '', '', '']; setView('plan'); },
          status: () => { const s = planSum(); return '카드 ' + S.plan.sel.length + ' / 4 · 보전 ' + s[0] + ' ' + mark(s[0] >= 5) + ' · 교육 ' + s[1] + ' ' + mark(s[1] >= 5) + ' · 지역 경제 ' + s[2] + ' ' + mark(s[2] >= 5); },
          check: () => planOk(),
          explain: '예를 들어 <b>해설사 + 탐방로·안내판 + 채취 금지 단속 + 주민 협의체</b>는 보전 7, 교육 7, 지역 경제 5예요. 한 가지 목표만 높은 방안보다 <b>세 목표의 균형</b>이 지속가능한 발전에 알맞아요.',
        },
        {
          title: '제안서의 근거 연결', manual: true,
          goal: '고른 카드 4장이 <b>주로 도움이 되는 목표</b>(점수 2점 이상)를 각각 골라 근거를 연결하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '카드에 적힌 점수를 보세요. 예: 해설사는 교육 +3, 채취 금지 단속은 보전 +3이에요. 2점 이상인 목표를 골라요.',
          setup() { setView('plan'); },
          status: () => '제안서 ' + mark(planOk()) + ' · 근거 연결 ' + S.plan.why.slice(0, S.plan.sel.length).filter((x) => x).length + ' / ' + S.plan.sel.length,
          check: () => {
            if (!planOk()) return '먼저 세 점수가 모두 5점 이상인 카드 4장을 골라요.';
            const w = S.plan.why, n = w.findIndex((x, i) => i < 4 && !x); if (n >= 0) return (n + 1) + '번째 카드의 근거를 아직 고르지 않았어요.';
            const AXI = { con: 0, edu: 1, eco: 2 };
            const bad = w.findIndex((x, i) => !whyAxisOk(i, AXI[x])); if (bad < 0) return true;
            const c = PLAN.find((q) => q.id === S.plan.sel[bad]); return '“' + c.name + '”은 ' + AX[AXI[w[bad]]][0] + ' 점수가 2점 미만이에요. 2점 이상인 목표를 골라요.';
          },
          explain: '해설사는 <b>교육</b>(+3)과 지역 경제(+2), 탐방로·안내판은 <b>보전·교육</b>(각 +2), 채취 단속은 <b>보전</b>(+3), 주민 협의체는 <b>지역 경제</b>(+2)에 특히 도움이 돼요. 근거와 함께 제안해야 설득력이 있어요.',
        },
        {
          type: 'quiz', title: '지질공원이란?', goal: '지질공원에 대한 설명으로 알맞은 것은?', setup() { setView('plan'); },
          choices: ['아무 활동도 할 수 없는 개발 금지 구역이에요', '탐방객을 최대한 많이 받아 수익을 내는 것이 가장 중요한 목적이에요', '지질 유산을 보전하면서 교육·관광에 활용해 지역의 지속가능한 발전을 돕는 곳이에요', '암석과 화석을 마음껏 채취해도 되는 곳이에요'],
          answer: 2,
          feedback: ['지질공원은 보전만 하는 곳이 아니에요. 교육과 지역 발전에도 활용해요.', '수익만 앞세우면 훼손과 과밀 문제가 생겨요. 보전과 교육도 함께 고려해야 해요.', '', '채취는 지질 유산을 훼손해요. 현장에서는 사진과 기록으로 남겨요.'],
          explain: '지질공원은 <b>보전과 활용을 함께</b> 고려해요. 보전만 강조하면 주민의 삶과 교육 기회가 줄고, 개발만 강조하면 지질 유산이 훼손돼요. 그래서 <b>지질 유산 보전 + 교육 + 지역 주민의 지속가능한 발전</b>을 함께 이루는 것이 목표예요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-korea-geopark', mount: '#game', badge: '지질공원 탐험가', homeHref: '../../index.html#he',
    featureLabels: { map: '🗺 한반도 지질도 · 핀', jeju: '🏝 제주도 모식 단면', hantan: '🌊 한탄강 형성 과정 슬라이더', joint: '🔷 주상절리 단면', sed: '📓 현장 노트 4장', plan: '📝 발전 제안서 카드' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eef2f7'; ctx.fillRect(0, 0, VW, VH);
    switch (S.view) {
      case 'map': drawMap(t, dt); break; case 'jeju': drawJeju(t, dt); break; case 'hantan': drawHantan(t, dt); break;
      case 'joint': drawJoint(t, dt); break; case 'sed': drawSed(t, dt); break; default: drawPlan(t, dt);
    }
    parts.draw(ctx);
    drawFlash(dt, PHONE ? 10 : VH - 96);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,247,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PINS, REG, ML, JV, HV, SK, SK_DEF, SK_ANS, PL, PLAN, sites, seqHT, planPos, pinXY, JT, setView, updateCtl, enterLevel, htPlay, htReset, jointRun, planSum, planOk, mapTap, jointTap, siteTap, sedTap, planTap, eroOk,
    get game() { return game; },
  };

})();
