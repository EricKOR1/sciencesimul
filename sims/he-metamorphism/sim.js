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
     지구과학 Ⅱ. 지구의 역사와 한반도의 암석 - 변성 작용과 변동대
     [12지구02-04] 변성작용의 종류와 지각 변동에 따른 구조를 변동대와 관련지어 설명
     ① 변성 작용(열·압력)  ② 변성암  ③ 변성 환경  ④ 변동대
     ========================================================= */
  initStage('#eef2f7', 800, 560, 600, 840, 1.25);
  Object.keys(LITH_BASE).forEach((k) => lithFill(k)); // 암석 무늬를 미리 만들어 두어요
  const rad = (d) => (d * Math.PI) / 180;
  const f0 = (x) => String(Math.round(x));
  const setTw = (obj, prop, val, dur, ease) => SciSim.tween(obj, { [prop]: val }, { duration: dur, ease: ease || 'outCubic' });
  const wrapPi = (a) => { a = ((a % Math.PI) + Math.PI) % Math.PI; return a > Math.PI / 2 ? a - Math.PI : a; }; // (-π/2, π/2]
  const angApproach = (cur, tgt, dt, rate) => (RM ? tgt : cur + wrapPi(tgt - cur) * (1 - Math.exp(-rate * dt)));

  /* ---------- 암석 이름 · 변성도 ---------- */
  const ROCK_NAME = { slate: '점판암', phyllite: '천매암', schist: '편암', gneiss: '편마암', hornfels: '혼펠스', marble: '대리암', quartzite: '규암' };
  const FOLI_KINDS = [['slate', 240], ['phyllite', 350], ['schist', 500], ['gneiss', 650]];
  function foliKind(T) { return T < 300 ? 'slate' : T < 400 ? 'phyllite' : T < 600 ? 'schist' : 'gneiss'; }

  /* ---------- 알갱이 모자이크(현미경 모식도) : 가중 보로노이 ---------- */
  const MW = 160, MH = 110, NSEED = 150;
  const SEEDS = (() => {
    const R = mulberry(4141), seeds = [];
    for (let i = 0; i < NSEED; i++) {
      let best = null, bd = -1; const k = i === 0 ? 1 : 10;
      for (let c = 0; c < k; c++) {
        const x = R() * MW, y = R() * MH; let d = 1e9;
        for (let j = 0; j < seeds.length; j++) { const dx = seeds[j].x - x, dy = seeds[j].y - y; d = Math.min(d, dx * dx + dy * dy); }
        if (d > bd) { bd = d; best = { x, y }; }
      }
      seeds.push(best);
    }
    const pal = [[201, 183, 156], [168, 176, 184], [143, 138, 133], [216, 205, 189], [181, 159, 148], [154, 166, 160], [190, 172, 150]];
    seeds.forEach((s) => { const p = pal[Math.floor(R() * pal.length)], v = 0.86 + R() * 0.24; s.c = [p[0] * v, p[1] * v, p[2] * v]; });
    return seeds;
  })();
  function makeMosaic() { const cv = document.createElement('canvas'); cv.width = MW; cv.height = MH; cv._img = cv.getContext('2d').createImageData(MW, MH); cv._ids = new Int16Array(MW * MH); cv._g = -9; cv._tone = 0; return cv; }
  /* g: 0(작은 알갱이 150개) ~ 3(큰 알갱이 약 11개). 살아남은 씨앗이 이웃을 잡아먹으며 자라요. */
  function renderMosaic(cv, g, tone) {
    g = clamp(g, 0, 3); tone = tone || 1;
    if (Math.abs(cv._g - g) < 0.004 && cv._tone === tone) return cv;
    cv._g = g; cv._tone = tone;
    const nA = NSEED * Math.pow(11 / NSEED, g / 3), alive = Math.min(NSEED, Math.ceil(nA));
    const full = Math.floor(nA), part = alive > full ? full : -1, pp = part >= 0 ? (1 - (nA - full)) * 70 : 0;
    const ids = cv._ids, d = cv._img.data;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      let best = 1e9, bi = 0;
      for (let i = 0; i < full; i++) { const s = SEEDS[i], dx = s.x - x, dy = s.y - y, q = dx * dx + dy * dy; if (q < best) { best = q; bi = i; } }
      if (part >= 0) { const s = SEEDS[part], dx = s.x - x, dy = s.y - y; if (Math.sqrt(dx * dx + dy * dy) + pp < Math.sqrt(best)) bi = part; }
      ids[y * MW + x] = bi;
    }
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const k = y * MW + x, id = ids[k], c = SEEDS[id].c;
      let m = tone; if ((x < MW - 1 && ids[k + 1] !== id) || (y < MH - 1 && ids[k + MW] !== id)) m *= 0.58;
      d[k * 4] = c[0] * m; d[k * 4 + 1] = c[1] * m; d[k * 4 + 2] = c[2] * m; d[k * 4 + 3] = 255;
    }
    cv.getContext('2d').putImageData(cv._img, 0, 0);
    return cv;
  }
  /* 판 모양 광물(운모 등) : 길쭉한 막대 */
  const RODS = (() => { const R = mulberry(909); return Array.from({ length: 34 }, () => ({ x: 0.06 + R() * 0.88, y: 0.08 + R() * 0.84, len: 0.7 + R() * 0.6, th0: R() * Math.PI, cur: 0 })); })();
  RODS.forEach((r) => { r.cur = r.th0; });
  function drawRod(x, y, L, th, w, sheen) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(th);
    ctx.fillStyle = 'rgba(45,40,50,.55)'; rr(-L / 2 - 1, -w / 2 - 1, L + 2, w + 2, w / 2 + 1).fill();
    ctx.fillStyle = sheen || '#f4efe6'; rr(-L / 2, -w / 2, L, w, w / 2).fill();
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.fillRect(-L / 2 + 2, -w / 2 + 0.5, L - 4, Math.max(1, w * 0.3));
    ctx.restore();
  }
  /* 모자이크 + 막대를 한 판에 그리기 (클립은 호출하는 쪽에서) */
  function drawGrainPanel(M, mos, rods, g, a, o) {
    o = o || {};
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mos, M.x, M.y, M.w, M.h);
    const k = (o.scale || 1) * (1 + 0.45 * (g / 3));
    rods.forEach((r, i) => {
      if (o.every && i % o.every) return;
      const L = (10 + 11 * r.len) * k * (1 + 0.5 * a), w = Math.max(2, 2.7 * k * (o.thin || 1));
      drawRod(M.x + r.x * M.w, M.y + r.y * M.h, L, o.ang != null ? o.ang(r, i) : r.cur, w);
    });
  }

  /* ---------- 상태 ---------- */
  const mosMain = makeMosaic();
  const S = {
    view: 'grain', clock: 0, fade: 0,
    grain: { T: 20, P: 0, dir: 'h', g: 0, a: 0, pS: 0, dv: 0, fAng: Math.PI / 2, heatOnly: false, foli: false, dirAtFoli: null, dirTurn: false, err: 1 },
    lad: { ok: false, rank: [0, 1, 2, 3].map(() => ({ x: 0, y: 0 })), slotInit: false },
    cls: { done: false },
    aur: { rise: 0, cool: 0, spread: 0, run: false, done: false, d: 4, row: 1 },
    pt: { dep: 10, rec: null, sel: ['', '', ''], fl: 0 },
    tect: { tab: 'div', sel: { div: [], sub: [], col: [] }, rev: { div: 0, sub: 0, col: 0 }, hover: null },
    map: { t: 0, play: false, marked: false, mark: 0 },
  };
  let game = null;
  const VIEW_LABEL = { grain: '🔍 암석 알갱이 모형', ladder: '🪜 변성도 사다리', class: '🗂 엽리 유무 분류', aur: '🌋 접촉 변성대 단면', pt: '📈 압력-온도 그래프', tect: '🌍 판 경계 단면', map: '🗺 옛 변동대 찾기' };

  /* ---------- 장면 배치 ---------- */
  const GL = PHONE
    ? { M: { x: 30, y: 262, w: 540, h: 371 }, lump: { cx: 300, cy: 128, rx: 96, ry: 62 }, flame: { x: 96, y: 200 }, bars: { x: 170, w: 330, y1: 674, y2: 706 }, banner: { x: 20, y: 734, w: 560, h: 82 } }
    : { M: { x: 290, y: 56, w: 435, h: 299 }, lump: { cx: 140, cy: 178, rx: 84, ry: 66 }, flame: { x: 140, y: 336 }, bars: { x: 380, w: 345, y1: 440, y2: 472 }, banner: { x: 20, y: 498, w: 760, h: 48 } };
  const BLOB = (() => { const R = mulberry(77); return Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * TAU, r: 0.88 + R() * 0.2 })); })();
  function blobPath(cx, cy, rx, ry) {
    const pts = BLOB.map((b) => [cx + Math.cos(b.a) * rx * b.r, cy + Math.sin(b.a) * ry * b.r]);
    ctx.beginPath();
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], n = pts.length;
    let m0 = mid(pts[n - 1], pts[0]); ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
    ctx.closePath();
  }
  /* 압력 화살표 */
  function pressArrows(M, pn, dv, col) {
    if (pn <= 0.02) return;
    const L = 14 + 46 * pn, w = 3 + 4 * pn;
    ctx.save();
    if (dv < 0.99) { ctx.globalAlpha = 1 - dv; [0.22, 0.5, 0.78].forEach((f) => { const y = M.y + M.h * f; D.arrow(M.x - 12 - L, y, M.x - 6, y, { color: col, width: w, head: 12 + 6 * pn }); D.arrow(M.x + M.w + 12 + L, y, M.x + M.w + 6, y, { color: col, width: w, head: 12 + 6 * pn }); }); }
    if (dv > 0.01) { ctx.globalAlpha = dv; [0.22, 0.5, 0.78].forEach((f) => { const x = M.x + M.w * f; D.arrow(x, M.y - 12 - L, x, M.y - 6, { color: col, width: w, head: 12 + 6 * pn }); D.arrow(x, M.y + M.h + 12 + L, x, M.y + M.h + 6, { color: col, width: w, head: 12 + 6 * pn }); }); }
    ctx.restore();
  }
  /* 가는 막대 그래프 */
  function barRow(x, y, w, label, v, col, txt) {
    tx(x - 10, y + 5, label, 14, '#475569', 'right', 800);
    ctx.fillStyle = '#e2e8f0'; rr(x, y - 8, w, 18, 9).fill();
    const fw = Math.max(0, Math.min(1, v)) * w;
    if (fw > 1) { ctx.fillStyle = col; rr(x, y - 8, Math.max(fw, 18), 18, 9).fill(); }
    if (txt) tx(x + w + 8, y + 5, txt, 13, '#334155', 'left', 800);
  }
  function pill(x, y, w, h, bg, border) { D.shadow(() => { ctx.fillStyle = bg; rr(x, y, w, h, h / 2.4).fill(); }, { blur: 5, y: 2 }); if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; rr(x, y, w, h, h / 2.4).stroke(); } }

  /* 지금 암석 이름 (그림과 같은 값으로) */
  function rockNow() {
    const G = S.grain;
    if (G.a >= 0.5) return { name: ROCK_NAME[foliKind(G.T)], type: '광역 변성 (열 + 압력)', foli: true };
    if (G.g >= 0.5) return { name: '혼펠스', type: '접촉 변성 (열)', foli: false };
    return { name: '셰일 (원암)', type: '아직 변하지 않았어요', foli: false };
  }
  const sizeLabel = (g) => (g < 0.5 ? '매우 작음' : g < 1.5 ? '작음' : g < 2.5 ? '중간' : '큼');
  const foliLabel = (a) => (a < 0.2 ? '없음' : a < 0.6 ? '약함' : '뚜렷함');

  function grainStep(dt) {
    const G = S.grain;
    const gT = G.T <= 200 ? 0 : 3 * smooth((G.T - 200) / 400);
    const aT = smooth((G.T - 180) / 120) * smooth(G.P / 300);
    G.g = approach(G.g, gT, dt, 3.2); G.a = approach(G.a, aT, dt, 3.2);
    G.pS = approach(G.pS, G.P / 600, dt, 6);
    G.dv = approach(G.dv, G.dir === 'v' ? 1 : 0, dt, 7);
    const perp = G.dir === 'h' ? Math.PI / 2 : 0;
    G.fAng = approach(G.fAng, perp, dt, 6);
    let err = 0;
    RODS.forEach((r) => {
      const diff = wrapPi(perp - r.th0), tgt = r.th0 + diff * G.a;
      r.cur = angApproach(r.cur, tgt, dt, 7);
      err += Math.abs(wrapPi(r.cur - perp));
    });
    G.err = err / RODS.length;
    // 단계 기록 (깃발)
    if (G.T >= 500 && G.P <= 50 && G.g >= 2.4 && G.a < 0.2) G.heatOnly = true;
    if (G.heatOnly && !G.foli && G.T >= 500 && G.P >= 300 && G.a >= 0.85 && G.err < 0.2) { G.foli = true; G.dirAtFoli = G.dir; }
    if (G.foli && G.dir !== G.dirAtFoli && G.a >= 0.85 && G.err < 0.2) G.dirTurn = true;
  }
  function grainReset() {
    const G = S.grain; Object.assign(G, { T: 20, P: 0, dir: 'h', g: 0, a: 0, pS: 0, dv: 0, fAng: Math.PI / 2, heatOnly: false, foli: false, dirAtFoli: null, dirTurn: false, err: 1 });
    RODS.forEach((r) => { r.cur = r.th0; });
  }

  /* ---------- 장면 ① : 입자 모형 ---------- */
  function drawGrain(t, dt) {
    const G = S.grain, M = GL.M, L = GL.lump;
    grainStep(dt);
    const heat = smooth((G.T - 20) / 680);
    D.text(PHONE ? 300 : 140, PHONE ? 40 : 52, '손에 든 암석 시료', { size: 14, weight: 800, color: '#64748b' });
    // 시료
    const sx = 1 + 0.05 * G.pS * G.dv, sy = 1 + 0.05 * G.pS * (1 - G.dv);
    ctx.save();
    D.glow(L.cx, L.cy, L.rx * 1.5, '#ff7a2b', 0.5 * heat);
    ctx.translate(L.cx, L.cy); ctx.scale(sx, sy); ctx.translate(-L.cx, -L.cy);
    D.shadow(() => { blobPath(L.cx, L.cy, L.rx, L.ry); ctx.fillStyle = '#94a3b8'; ctx.fill(); }, { blur: 14, y: 8 });
    blobPath(L.cx, L.cy, L.rx, L.ry); ctx.clip();
    const bx = L.cx - L.rx * 1.3, by = L.cy - L.ry * 1.3, bw = L.rx * 2.6, bh = L.ry * 2.6;
    ctx.fillStyle = lithFill('shale'); ctx.fillRect(bx, by, bw, bh);
    ctx.globalAlpha = smooth(G.g / 2) * (1 - G.a); ctx.fillStyle = lithFill('hornfels'); ctx.fillRect(bx, by, bw, bh);
    if (G.a > 0.01) {
      let i = 0; while (i < FOLI_KINDS.length - 2 && G.T >= FOLI_KINDS[i + 1][1]) i++;
      const u = clamp((G.T - FOLI_KINDS[i][1]) / (FOLI_KINDS[i + 1][1] - FOLI_KINDS[i][1]), 0, 1);
      ctx.save(); ctx.translate(L.cx, L.cy); ctx.rotate(G.fAng);
      ctx.globalAlpha = G.a * (1 - u); ctx.fillStyle = lithFill(FOLI_KINDS[i][0]); ctx.fillRect(-bw, -bw, bw * 2, bw * 2);
      ctx.globalAlpha = G.a * u; ctx.fillStyle = lithFill(FOLI_KINDS[i + 1][0]); ctx.fillRect(-bw, -bw, bw * 2, bw * 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    const gl = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    gl.addColorStop(0, 'rgba(255,255,255,.34)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.28)');
    ctx.fillStyle = gl; ctx.fillRect(bx, by, bw, bh);
    if (heat > 0.05) { ctx.fillStyle = 'rgba(255,110,30,' + 0.22 * heat + ')'; ctx.fillRect(bx, by, bw, bh); }
    ctx.restore();
    ctx.save(); ctx.translate(L.cx, L.cy); ctx.scale(sx, sy); ctx.translate(-L.cx, -L.cy);
    blobPath(L.cx, L.cy, L.rx, L.ry); ctx.strokeStyle = 'rgba(40,40,60,.55)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    // 돋보기 표시와 연결선
    const lx = L.cx + L.rx * 0.38, ly = L.cy - L.ry * 0.25;
    ctx.save(); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lx, ly, 17, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx + 12, ly + 12); ctx.lineTo(lx + 24, ly + 24); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
    ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(14,165,233,.7)';
    if (PHONE) { ctx.beginPath(); ctx.moveTo(lx - 10, ly + 16); ctx.lineTo(M.x + 16, M.y - 6); ctx.moveTo(lx + 16, ly + 8); ctx.lineTo(M.x + M.w - 16, M.y - 6); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(lx + 14, ly - 12); ctx.lineTo(M.x - 6, M.y + 6); ctx.moveTo(lx + 14, ly + 12); ctx.lineTo(M.x - 6, M.y + M.h - 6); ctx.stroke(); }
    ctx.restore();
    // 불꽃
    const fs = 14 + 56 * heat;
    if (heat > 0.02) D.flame(GL.flame.x, GL.flame.y, fs, t); else D.text(GL.flame.x, GL.flame.y, '🔥 열을 가해 봐요', { size: 13, weight: 800, color: '#94a3b8' });
    D.text(GL.flame.x, GL.flame.y + (PHONE ? 22 : 24), f0(G.T) + ' °C', { size: 17, weight: 800, color: heat > 0.4 ? '#c2410c' : '#475569' });
    // 모형 판
    const hc = mixc('#cbd5e1', '#f97316', heat);
    D.shadow(() => { ctx.fillStyle = '#fff'; rr(M.x - 4, M.y - 4, M.w + 8, M.h + 8, 18).fill(); }, { blur: 8, y: 3 });
    ctx.save(); rr(M.x, M.y, M.w, M.h, 14).clip();
    const cx = M.x + M.w / 2, cy = M.y + M.h / 2, kx = 1 + 0.14 * G.pS * G.dv, ky = 1 + 0.14 * G.pS * (1 - G.dv);
    ctx.translate(cx, cy); ctx.scale(kx, ky); ctx.translate(-cx, -cy);
    renderMosaic(mosMain, G.g, 1 - 0.15 * G.a);
    drawGrainPanel(M, mosMain, RODS, G.g, G.a, { scale: 1.0 });
    ctx.restore();
    ctx.strokeStyle = hc; ctx.lineWidth = 3 + 3 * heat; rr(M.x, M.y, M.w, M.h, 14).stroke();
    if (heat > 0.2) { ctx.save(); ctx.globalAlpha = 0.5 * heat; ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 8; rr(M.x - 3, M.y - 3, M.w + 6, M.h + 6, 17).stroke(); ctx.restore(); }
    D.label(M.x + 12, M.y + 20, '🔍 입자 모형으로 보기 (모식도)', { bg: 'rgba(15,23,42,.72)', color: '#fff', size: 13, align: 'left', pad: 9 });
    pressArrows(M, G.pS, G.dv, '#dc2626');
    if (G.P > 0) D.label(M.x + M.w - 12, M.y + M.h - 18, '압력 ' + G.P + ' MPa · ' + (G.dir === 'h' ? '좌우' : '위아래'), { bg: '#dc2626', size: 13, pad: 8, align: 'right' });
    // 막대와 이름표
    const B = GL.bars;
    barRow(B.x, B.y1, B.w, '알갱이 크기', G.g / 3, '#0ea5e9', sizeLabel(G.g));
    barRow(B.x, B.y2, B.w, '엽리 정도', G.a, '#8b5cf6', foliLabel(G.a));
    const R0 = rockNow(), bn = GL.banner;
    pill(bn.x, bn.y, bn.w, bn.h, '#fff', R0.foli ? '#8b5cf6' : G.g >= 0.5 ? '#f97316' : '#cbd5e1');
    D.text(bn.x + bn.w / 2, bn.y + bn.h / 2 - (PHONE ? 6 : -2), '지금 암석:  ' + R0.name, { size: 19, weight: 800, color: '#1e293b' });
    if (PHONE) D.text(bn.x + bn.w / 2, bn.y + bn.h / 2 + 24, R0.type, { size: 14, weight: 800, color: '#64748b' });
    else D.text(bn.x + bn.w - 14, bn.y + bn.h / 2 + 5, R0.type, { size: 14, weight: 800, color: '#64748b', align: 'right' });
  }

  /* ---------- 장면 ② : 변성도 사다리 ---------- */
  const LAD = [
    { id: 'slate', name: '점판암', g: 0.7, tone: 0.72, a: 0.55, T: '약 200~300 °C' },
    { id: 'phyllite', name: '천매암', g: 1.4, tone: 0.86, a: 0.8, T: '약 300~400 °C' },
    { id: 'schist', name: '편암', g: 2.2, tone: 0.98, a: 1, T: '약 400~600 °C' },
    { id: 'gneiss', name: '편마암', g: 3, tone: 1.05, a: 1, T: '약 600 °C 이상' },
  ];
  const LAD_SLOT = [2, 0, 3, 1]; // 섞인 처음 자리 : 칸 0..3 에 놓인 변성도 순위
  const tileMos = LAD.map((l) => renderMosaic(makeMosaic(), l.g, l.tone));
  const TRODS = RODS.map((r) => ({ x: r.x, y: r.y, len: r.len, th0: r.th0, cur: 0 }));
  const LADG = PHONE
    ? { tw: 130, th: 218, x0: 18, gap: 14, y0: 92, tex: 104, lr: 25, stair: 12 }
    : { tw: 150, th: 200, x0: 40, gap: 30, y0: 96, tex: 112, lr: 30, stair: 12 };
  function ladPos(rank, slot, ok) {
    const G = LADG, col = ok ? rank : LAD_SLOT.indexOf(rank);
    return { x: G.x0 + col * (G.tw + G.gap), y: G.y0 + (ok ? (3 - rank) * G.stair : 0) };
  }
  function drawLadder(t, dt) {
    const G = LADG, Lm = S.lad, ok = Lm.ok;
    if (!Lm.slotInit) { LAD.forEach((l, i) => { const p = ladPos(i, 0, false); Lm.rank[i].x = p.x; Lm.rank[i].y = p.y; }); Lm.slotInit = true; }
    D.label(PHONE ? 130 : 128, 48, '원암: 셰일(이암)', { bg: '#475569', size: 14, pad: 10 });
    D.arrow(PHONE ? 210 : 218, 48, PHONE ? 372 : 520, 48, { color: ok ? '#16a34a' : '#94a3b8', width: 4 });
    D.text(PHONE ? 296 : 372, 40, ok ? '변성도 높아짐 → 높은 온도' : '순서를 담아 보세요', { size: 14, weight: 800, color: ok ? '#15803d' : '#64748b' });
    const W = PHONE ? 20 : 20;
    LAD.forEach((l, i) => {
      const tg = ladPos(i, 0, ok), q = Lm.rank[i];
      q.x = approach(q.x, tg.x, dt, 6); q.y = approach(q.y, tg.y, dt, 6);
      const x = q.x, y = q.y, tw = G.tw;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(x, y, tw, G.th, 14).fill(); }, { blur: 8, y: 3 });
      ctx.strokeStyle = ok ? '#86efac' : '#cbd5e1'; ctx.lineWidth = 2.2; rr(x, y, tw, G.th, 14).stroke();
      ctx.save(); rr(x + 6, y + 6, tw - 12, G.tex, 9).clip(); ctx.fillStyle = lithFill(l.id); ctx.fillRect(x + 6, y + 6, tw - 12, G.tex);
      const gl = ctx.createLinearGradient(x, y, x + tw, y + G.tex); gl.addColorStop(0, 'rgba(255,255,255,.3)'); gl.addColorStop(1, 'rgba(0,0,0,.18)'); ctx.fillStyle = gl; ctx.fillRect(x + 6, y + 6, tw - 12, G.tex);
      ctx.restore();
      // 돋보기 안의 알갱이
      const lx = x + tw - G.lr - 12, ly = y + 6 + G.tex - G.lr + 4;
      ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, G.lr, 0, TAU); ctx.clip();
      const mw = G.lr * 3.6, mh = mw * 0.6875;
      TRODS.forEach((r) => { r.cur = r.th0 + wrapPi(Math.PI / 2 - r.th0) * l.a; });
      drawGrainPanel({ x: lx - mw / 2, y: ly - mh / 2, w: mw, h: mh }, tileMos[i], TRODS, l.g, l.a, { every: 2, scale: 0.42, thin: 0.55, ang: (r) => r.cur });
      ctx.restore();
      ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lx, ly, G.lr, 0, TAU); ctx.stroke();
      tx(x + tw / 2, y + G.tex + 34, l.name, 19, '#1e293b', 'center', 800);
      tx(x + tw / 2, y + G.tex + 56, ok ? l.T : '온도 ?', PHONE ? 12 : 13, ok ? '#c2410c' : '#94a3b8', 'center', 800);
      if (ok) tx(x + tw / 2, y + G.tex + 76, i === 0 ? '변성도 낮음' : i === 3 ? '변성도 높음' : '', 13, '#64748b', 'center', 800);
    });
    // 지시 광물
    const my = PHONE ? 400 : 404;
    panel(PHONE ? 10 : 30, my - 24, PHONE ? 580 : 740, PHONE ? 118 : 104, { fill: 'rgba(255,255,255,.92)' });
    tx(PHONE ? 24 : 46, my - 2, '지시 광물 (변성도가 높아질수록 나타나요)', 14, '#334155', 'left', 800);
    const mins = [['녹니석', '#6aa56d'], ['백운모', '#e8e1c8'], ['흑운모', '#5b4a43'], ['석류석', '#b0293b'], ['규선석', '#cfd6e6']];
    const mw0 = PHONE ? 100 : 128, mg = PHONE ? 8 : 12, mx0 = PHONE ? 24 : 54;
    mins.forEach((m, i) => {
      const x = mx0 + i * (mw0 + mg), y = my + 14;
      ctx.fillStyle = m[1]; rr(x, y, mw0, 34, 10).fill(); ctx.strokeStyle = 'rgba(60,50,60,.45)'; ctx.lineWidth = 1.5; rr(x, y, mw0, 34, 10).stroke();
      tx(x + mw0 / 2, y + 22, m[0], 15, i === 2 || i === 3 ? '#fff' : '#1e293b', 'center', 800);
      if (i < 4) D.arrow(x + mw0 + 1, y + 17, x + mw0 + mg + 1, y + 17, { color: '#94a3b8', width: 2, head: 7 });
    });
    tx(mx0, my + 68, '낮음', 13, '#64748b', 'left', 800); tx(mx0 + 5 * mw0 + 4 * mg, my + 68, '높음', 13, '#64748b', 'right', 800);
    if (!ok) tx(PHONE ? 300 : 400, PHONE ? 540 : 520, '알갱이 크기(돋보기)와 줄무늬가 거칠어지는 정도를 비교해요', PHONE ? 13.5 : 14.5, '#64748b', 'center', 800);
  }

  /* ---------- 장면 ② : 엽리 분류 카드 ---------- */
  const CLS_DEF = [
    { id: 'schist', name: '편암', foli: true, src: '셰일', kind: '광역 변성' },
    { id: 'marble', name: '대리암', foli: false, src: '석회암', kind: '접촉 변성' },
    { id: 'slate', name: '점판암', foli: true, src: '셰일', kind: '광역 변성' },
    { id: 'hornfels', name: '혼펠스', foli: false, src: '셰일', kind: '접촉 변성' },
    { id: 'gneiss', name: '편마암', foli: true, src: '셰일(또는 화강암)', kind: '광역 변성' },
    { id: 'quartzite', name: '규암', foli: false, src: '사암', kind: '접촉 변성' },
  ];
  const clsBoard = new Board(PHONE
    ? { zones: [{ id: 'foli', x: 10, y: 50, w: 580, h: 196, label: '엽리가 있어요', color: '#7c3aed', fill: 'rgba(237,233,254,.7)' }, { id: 'non', x: 10, y: 256, w: 580, h: 196, label: '엽리가 없어요', color: '#ea580c', fill: 'rgba(255,237,213,.7)' }], tray: { x: 10, y: 468, w: 580, cols: 4 }, cw: 128, ch: 72, gap: 8, vertical: true }
    : { zones: [{ id: 'foli', x: 20, y: 46, w: 372, h: 218, label: '엽리가 있어요', color: '#7c3aed', fill: 'rgba(237,233,254,.7)' }, { id: 'non', x: 408, y: 46, w: 372, h: 218, label: '엽리가 없어요', color: '#ea580c', fill: 'rgba(255,237,213,.7)' }], tray: { x: 20, y: 284, w: 760, cols: 3 }, cw: 170, ch: 52, gap: 8 });
  CLS_DEF.forEach((c) => {
    clsBoard.add({ id: c.id, label: c.name, def: c, draw: (cx, cy, s) => { ctx.fillStyle = lithFill(c.id); ctx.fillRect(cx - s / 2 - 4, cy - s / 2 - 4, s + 8, s + 8); } });
  });
  function clsReset() { clsBoard.reset(); }
  const clsPlaced = () => clsBoard.cards.filter((c) => c.zone).length;
  function clsOk() { return clsBoard.cards.every((c) => c.zone && (c.zone === 'foli') === c.def.foli); }
  function drawClass(t, dt) {
    clsBoard.update(dt); clsBoard.layout();
    clsBoard.draw(t);
    const all = clsPlaced() === 6, y0 = PHONE ? 626 : 424;
    if (all) {
      panel(PHONE ? 10 : 20, y0, PHONE ? 580 : 760, PHONE ? 196 : 124, { fill: 'rgba(255,255,255,.95)', title: '원암과 변성암 짝' });
      const rows = [['셰일(이암)', '점판암 → 천매암 → 편암 → 편마암 (광역 변성, 엽리 있음)'], ['셰일(이암)', '혼펠스 (접촉 변성, 엽리 없음)'], ['석회암', '대리암 (접촉 변성, 엽리 없음)'], ['사암', '규암 (접촉 변성, 엽리 없음)']];
      rows.forEach((r, i) => {
        const yy = y0 + (PHONE ? 44 : 42) + i * (PHONE ? 36 : 22);
        if (PHONE) { tx(24, yy, r[0] + ' →', 14, '#334155', 'left', 800); tx(24, yy + 17, r[1], 13, '#475569', 'left', 700); }
        else { tx(40, yy, r[0] + ' →', 14.5, '#334155', 'left', 800); tx(150, yy, r[1], 14.5, '#475569', 'left', 700); }
      });
    } else {
      tx(PHONE ? 300 : 400, PHONE ? 640 : 456, '카드를 두 칸에 나눠 놓으면 원암과 변성암의 짝이 나타나요', PHONE ? 13.5 : 14.5, '#64748b', 'center', 800);
    }
  }

  /* ---------- 장면 ③ : 접촉 변성대 ---------- */
  const AUR = PHONE
    ? { S: { x: 10, y: 46, w: 580, h: 340 }, G: { x: 10, y: 400, w: 580, h: 330 }, xc: 140 }
    : { S: { x: 20, y: 46, w: 760, h: 246 }, G: { x: 20, y: 306, w: 760, h: 238 }, xc: 200 };
  AUR.kmPx = (AUR.S.x + AUR.S.w - 20 - AUR.xc) / 2.2;
  AUR.ys = AUR.S.y + 38; AUR.yb = AUR.S.y + AUR.S.h - 8; AUR.hL = (AUR.yb - AUR.ys) / 5;
  const AUR_ROWS = ['sand', 'shale', 'lime', 'shale', 'sand'];
  const AUR_META = { sand: ['quartzite', '규암', '사암'], shale: ['hornfels', '혼펠스', '셰일'], lime: ['marble', '대리암', '석회암'] };
  const AUR_ROWIDX = { sand: 0, shale: 1, lime: 2 };
  const aurGrade = (d) => (d >= 1 ? 0 : Math.pow(1 - d, 1.5));
  const aurDist = () => S.aur.d / 10;
  const aurPct = (d) => Math.round(aurGrade(d) * 100);
  function aurRockText(d, row) {
    const kind = AUR_ROWS[row], m = AUR_META[kind], g = aurGrade(d);
    if (g >= 0.35) return m[1] + ' (강한 변성)';
    if (g > 0) return '약하게 변성 (' + m[2] + ' → ' + m[1] + '으로 가는 중)';
    return '변성 안 됨 (' + m[2] + ' 그대로)';
  }
  function aurRun() {
    const A = S.aur; if (A.run) return; Sound.click(); A.run = true; A.done = false; A.rise = A.cool = A.spread = 0;
    SciSim.tween(A, { rise: 1 }, { duration: RM ? 0.01 : 1.6, ease: 'outCubic' });
    SciSim.tween(A, { cool: 1 }, { duration: RM ? 0.01 : 3.4, delay: RM ? 0 : 0.8, ease: 'inOutQuad' });
    SciSim.tween(A, { spread: 1 }, { duration: RM ? 0.01 : 3.0, delay: RM ? 0 : 1.0, ease: 'outCubic', onDone: () => { A.done = true; A.run = false; Sound.success(); updateCtl(); } });
    updateCtl();
  }
  function drawAureole(t, dt) {
    const P = AUR.S, A = S.aur, d = aurDist(), xc = AUR.xc, ys = AUR.ys, yb = AUR.yb, hL = AUR.hL, kmPx = AUR.kmPx;
    panel(P.x, P.y, P.w, P.h, { fill: '#dfe9f2' });
    D.sky(P.x, P.y, P.w, 40, '#cfe9ff', '#eaf6ff');
    tx(P.x + 12, P.y + 22, '단면도 (모식도)', 14, '#334155', 'left', 800);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    // 지층
    AUR_ROWS.forEach((k, r) => { ctx.fillStyle = lithFill(k); ctx.fillRect(P.x, ys + r * hL, P.w, hL + 0.5); });
    // 접촉 변성 덧칠 : 열이 퍼진 만큼, 거리에 따라 옅어져요
    const reach = 1.02 * kmPx * A.spread;
    for (let r = 0; r < 5; r++) {
      const mk = AUR_META[AUR_ROWS[r]][0];
      for (let x = 0; x < reach; x += 4) {
        const dd = x / kmPx, gr = aurGrade(dd) * clamp((reach - x) / 30 + 0.3, 0, 1);
        if (gr < 0.01) continue;
        ctx.globalAlpha = Math.min(1, gr * 1.15); ctx.fillStyle = lithFill(mk); ctx.fillRect(xc + x, ys + r * hL, 4.5, hL + 0.5);
      }
    }
    ctx.globalAlpha = 1;
    // 층 경계선
    ctx.strokeStyle = 'rgba(40,40,60,.35)'; ctx.lineWidth = 1.2;
    for (let r = 1; r < 5; r++) { ctx.beginPath(); ctx.moveTo(P.x, ys + r * hL); ctx.lineTo(P.x + P.w, ys + r * hL); ctx.stroke(); }
    // 열 후광
    if (A.rise > 0.02) {
      const hr = (0.2 + A.spread * 1.0) * kmPx, ha = 0.5 * (1 - 0.7 * A.cool) * A.rise;
      const g = ctx.createLinearGradient(xc, 0, xc + hr, 0); g.addColorStop(0, 'rgba(255,120,30,' + ha + ')'); g.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = g; ctx.fillRect(xc, ys, hr, yb - ys);
    }
    // 마그마체 (올라오며 식어 화강암이 돼요)
    if (A.rise > 0.005) {
      const top = ys + hL * 0.55, ph = (yb - top) * A.rise, py = yb - ph;
      ctx.save(); ctx.beginPath(); ctx.moveTo(P.x - 4, yb + 6); ctx.lineTo(P.x - 4, py + 24); ctx.quadraticCurveTo(P.x - 4, py, P.x + 30, py); ctx.lineTo(xc - 30, py); ctx.quadraticCurveTo(xc, py, xc, py + 30); ctx.lineTo(xc, yb + 6); ctx.closePath();
      ctx.fillStyle = '#f97316'; ctx.fill(); ctx.clip();
      ctx.globalAlpha = A.cool; ctx.fillStyle = lithFill('granite'); ctx.fillRect(P.x, py - 4, xc - P.x, yb - py + 8);
      ctx.globalAlpha = (1 - A.cool) * 0.6; const mg = ctx.createLinearGradient(0, py, 0, yb); mg.addColorStop(0, '#fde047'); mg.addColorStop(1, '#dc2626'); ctx.fillStyle = mg; ctx.fillRect(P.x, py, xc - P.x, yb - py);
      ctx.restore();
      ctx.strokeStyle = 'rgba(60,20,20,.6)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(xc, py + 30); ctx.lineTo(xc, yb); ctx.stroke();
      if (A.cool < 0.98) for (let i = 0; i < 2; i++) { if (Math.random() < dt * 14 && !RM) parts.emit({ x: P.x + 20 + Math.random() * (xc - P.x - 40), y: py + 10 + Math.random() * 20, vx: (Math.random() - 0.5) * 8, vy: -20 - Math.random() * 20, size: 4 + Math.random() * 4, life: 1.2, color: 'rgba(255,200,120,.6)', shape: 'smoke' }); }
      tx(P.x + 14, yb - 18, A.cool > 0.8 ? '식어서 굳은 화강암체' : '마그마', 15, A.cool > 0.8 ? '#4a1f1f' : '#fff', 'left', 800);
    }
    // 탐침
    const px = xc + d * kmPx, py0 = ys + (S.aur.row + 0.5) * hL;
    ctx.setLineDash([5, 5]); ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, ys - 10); ctx.lineTo(px, yb); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // 접촉 가장자리 표시와 눈금
    D.arrow(xc, P.y + 36, px, P.y + 36, { color: '#0369a1', width: 3, head: 9 });
    D.sphere(px, py0, 9, '#0ea5e9', { shadow: true });
    D.ring(px, py0, 14, t, { color: '#0369a1', speed: 0.8, width: 2 });
    const txt = d.toFixed(1) + ' km · 변성도 ' + aurPct(d) + ' %';
    const bx = Math.min(P.x + P.w - 190, Math.max(xc + 20, px + 16));
    D.label(bx + 90, py0 > ys + hL * 2 ? py0 - hL * 0.9 : py0 + hL * 0.9, txt, { bg: '#0369a1', size: 14, pad: 10 });
    // 층 이름
    AUR_ROWS.forEach((k, r) => { if (r < 3) tx(P.x + P.w - 10, ys + r * hL + hL / 2 + 5, AUR_META[k][2], 13, 'rgba(30,30,40,.75)', 'right', 800); });
    if (S.aur.rise < 0.02) { note(P.x + P.w / 2 - 150, P.y + P.h / 2 - 20, 300, '▶ 마그마 관입을 눌러 보세요', 15); }
    // 눈금자 (1 km)
    const sx0 = P.x + P.w - 20 - kmPx, sy0 = P.y + P.h - 14;
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.lineTo(sx0 + kmPx, sy0); ctx.stroke();
    D.label(sx0 + kmPx / 2, sy0 - 14, '1 km', { bg: 'rgba(255,255,255,.9)', color: '#1e293b', size: 13, pad: 7 });
    // 그래프
    const G = AUR.G;
    panel(G.x, G.y, G.w, G.h, { title: '접촉부에서 멀어질수록 변성도는?' });
    const pf = plotFrame(G, { xmin: 0, xmax: 2, ymin: 0, ymax: 100, xticks: [0, 0.5, 1, 1.5, 2], yticks: [0, 25, 50, 75, 100], l: 58, r: 24, t: 36, b: 44, xlabel: '접촉부에서의 거리 (km)', ylabel: '변성도 (%)', xfmt: (v) => v.toFixed(1), yfmt: (v) => String(v) });
    const pts = []; for (let i = 0; i <= 80; i++) { const dd = (i / 80) * 2; pts.push([pf.gx(dd), pf.gy(aurGrade(dd) * 100)]); }
    ctx.save(); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.lineTo(pf.gx(2), pf.gy(0)); ctx.lineTo(pf.gx(0), pf.gy(0)); ctx.closePath(); ctx.fillStyle = 'rgba(249,115,22,.16)'; ctx.fill(); ctx.restore();
    polyline(pts, '#ea580c', 3.4);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(pf.gx(d), pf.y1); ctx.lineTo(pf.gx(d), pf.gy(aurGrade(d) * 100)); ctx.lineTo(pf.x0, pf.gy(aurGrade(d) * 100)); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(pf.gx(d), pf.gy(aurGrade(d) * 100), 8, '#0ea5e9', { shadow: true });
    if (aurPct(d) === 0 && Math.round(d * 10) >= 10 && A.done) D.label(pf.gx(d) + 8, pf.gy(0) - 22, '변성이 끝나는 곳', { bg: '#16a34a', size: 13, pad: 8, align: 'left' });
  }

  /* ---------- 장면 ③ : 압력-온도 그래프 ---------- */
  const PT = PHONE
    ? { P: { x: 10, y: 46, w: 580, h: 400 }, F: { x: 10, y: 456, w: 580, h: 64 }, cy: 530, ch: 86, cg: 6 }
    : { P: { x: 20, y: 46, w: 470, h: 490 }, F: { x: 506, y: 46, w: 274, h: 92 }, cy: 148, ch: 118, cg: 8 };
  const ENV = [
    { n: '①', title: '마그마가 관입한 얕은 곳', dep: 3.7, T: 600, dot: 'B', P: 100 },
    { n: '②', title: '섭입대의 해구 쪽 (차가운 판)', dep: 30, T: 300, dot: 'A', P: 810 },
    { n: '③', title: '대륙이 충돌해 두꺼워진 지각', dep: 40, T: 700, dot: 'C', P: 1080 },
  ];
  const PTDOT = { A: { T: 300, P: 810, col: '#2563eb' }, B: { T: 600, P: 100, col: '#ea580c' }, C: { T: 700, P: 1080, col: '#7c3aed' } };
  const ptOk = () => S.pt.rec != null && Math.abs(S.pt.rec - 540) < 0.5;
  function drawPT(t, dt) {
    const P = PT.P, F = PT.F, pt = S.pt;
    panel(P.x, P.y, P.w, P.h, { title: '변성 환경의 압력-온도 (예시)' });
    const pf = plotFrame(P, { xmin: 0, xmax: 800, ymin: 0, ymax: 1200, xticks: [0, 200, 400, 600, 800], yticks: [0, 300, 600, 900, 1200], l: 58, r: 54, t: 40, b: 46, xlabel: '온도 (°C)', ylabel: '압력 (MPa)' });
    // 환경 영역
    const zone = (x0, x1, y0, y1, col, txt, ty) => { ctx.save(); ctx.fillStyle = col[0]; rr(pf.gx(x0), pf.gy(y1), pf.gx(x1) - pf.gx(x0), pf.gy(y0) - pf.gy(y1), 12).fill(); ctx.setLineDash([6, 5]); ctx.strokeStyle = col[1]; ctx.lineWidth = 1.8; rr(pf.gx(x0), pf.gy(y1), pf.gx(x1) - pf.gx(x0), pf.gy(y0) - pf.gy(y1), 12).stroke(); ctx.restore(); tx(pf.gx((x0 + x1) / 2), pf.gy(ty), txt, 13.5, col[1], 'center', 800); };
    zone(430, 790, 8, 330, ['rgba(249,115,22,.10)', '#c2410c'], '저압 · 고온', 280);
    zone(15, 450, 520, 1180, ['rgba(37,99,235,.09)', '#1d4ed8'], '고압 · 저온', 1150);
    zone(500, 790, 700, 1180, ['rgba(124,58,237,.10)', '#6d28d9'], '고압 · 고온', 1150);
    // 오른쪽 깊이 축
    for (let d = 0; d <= 40; d += 10) { const y = pf.gy(27 * d); tx(pf.x1 + 6, y + 4.5, d + ' km', 12.5, '#0369a1', 'left', 800); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pf.x1, y); ctx.lineTo(pf.x1 + 4, y); ctx.stroke(); }
    tx(pf.x1 + 30, pf.y0 - 8, '깊이', 12.5, '#0369a1', 'center', 800);
    // 현재 깊이 선
    const dy = pf.gy(27 * pt.dep);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = '#0ea5e9'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(pf.x0, dy); ctx.lineTo(pf.x1, dy); ctx.stroke(); ctx.setLineDash([]);
    D.label(pf.x0 + 8, Math.min(Math.max(dy - 14, pf.y0 + 12), pf.y1 - 12), '깊이 ' + pt.dep + ' km → ' + f0(27 * pt.dep) + ' MPa', { bg: '#0369a1', size: 13, pad: 8, align: 'left' });
    // 점 A, B, C
    pt.fl = approach(pt.fl, 1, dt, 3);
    Object.keys(PTDOT).forEach((k) => {
      const d0 = PTDOT[k], x = pf.gx(d0.T), y = pf.gy(d0.P);
      const idx = ENV.findIndex((e) => e.dot === k), got = ENV.some((e, i) => e.dot === k && pt.sel[i] === k);
      D.sphere(x, y, 16, d0.col, { shadow: true, text: k, textScale: 1.05 });
      if (got) { D.ring(x, y, 22, t, { color: '#16a34a', speed: 0.7, width: 2.5 }); D.label(x + 22, y - 24, d0.T + ' °C · ' + d0.P + ' MPa', { bg: '#16a34a', size: 12.5, pad: 7, align: 'left' }); }
    });
    // 오른쪽 : 공식, 환경 카드
    panel(F.x, F.y, F.w, F.h, { fill: '#fff7e0', border: '#f2d38a' });
    tx(F.x + F.w / 2, F.y + (PHONE ? 22 : 28), '압력 P = ρ × g × h', PHONE ? 16 : 18, '#92400e', 'center', 800);
    tx(F.x + F.w / 2, F.y + (PHONE ? 44 : 52), '2700 × 10 × 1000 m = 27 000 000 Pa', PHONE ? 13 : 13, '#78350f', 'center', 800);
    tx(F.x + F.w / 2, F.y + (PHONE ? 60 : 74), '깊이 1 km마다 27 MPa', PHONE ? 13.5 : 14.5, '#78350f', 'center', 800);
    ENV.forEach((e, i) => {
      const x = PHONE ? 10 : F.x, w = PHONE ? 580 : F.w, y = PT.cy + i * (PT.ch + PT.cg), got = pt.sel[i] === e.dot;
      panel(x, y, w, PT.ch, { fill: got ? '#effaf2' : '#fff', border: got ? '#16a34a' : '#cbd5e1' });
      tx(x + 14, y + 28, e.n + ' ' + e.title, PHONE ? 14.5 : 14.5, '#1e293b', 'left', 800);
      tx(x + 14, y + 54, '깊이 약 ' + e.dep + ' km', 14.5, '#475569', 'left', 800);
      tx(x + 14, y + 78, '온도 ' + e.T + ' °C', 14.5, '#c2410c', 'left', 800);
      if (!PHONE) tx(x + 14, y + 102, got ? '→ 점 ' + e.dot + ' ✔' : '→ 점 ?', 14.5, got ? '#15803d' : '#94a3b8', 'left', 800);
      else tx(x + w - 14, y + 54, got ? '→ 점 ' + e.dot + ' ✔' : '→ 점 ?', 15, got ? '#15803d' : '#94a3b8', 'right', 800);
    });
  }
  function ptRecord() {
    const raw = ($('#inP').value || '').replace(/,/g, '').trim(), v = parseFloat(raw);
    if (!isFinite(v)) { toast('압력 값을 숫자로 써 주세요.', 'bad'); Sound.fail(); return; }
    S.pt.rec = v;
    if (Math.abs(v - 540) < 0.5) { Sound.success(); toast('✅ 540 MPa = 27 MPa × 20 km', 'good'); parts.burst(120, 300, { count: 14, colors: ['#0ea5e9', '#16a34a', '#fbbf24'] }); }
    else { Sound.fail(); toast('P = 2700 × 10 × 20 000 = ? Pa, MPa로 바꿔 다시 계산해 봐요.', 'bad'); }
    updateCtl();
  }

  /* ---------- 장면 ④ : 판 경계 단면 ---------- */
  const TP = PHONE ? { x: 10, y: 46, w: 580, h: 470 } : { x: 20, y: 46, w: 760, h: 400 };
  const tpx = (u) => TP.x + u * TP.w, tpy = (v) => TP.y + v * TP.h;
  const TECT_DEF = {
    div: { name: '발산 경계 (해령)', spots: [
      { id: 'd1', u: 0.5, v: 0.575, ok: true, label: '해령 축 부근 (마그마·뜨거운 열수의 영향)', why: '해령 축은 뜨거운 마그마와 바닷물(열수)이 닿아 약한 변성이 일어나요.' },
      { id: 'd2', u: 0.14, v: 0.52, ok: false, label: '해령에서 먼 해저 퇴적층', why: '해령에서 먼 해저는 식어서 열도 압력도 크지 않아 변성 작용이 거의 없어요.' },
      { id: 'd3', u: 0.5, v: 0.86, ok: false, label: '해령 아래 깊은 맨틀', why: '맨틀 물질은 올라오며 일부가 녹을 뿐이에요. 지각 암석이 변성되는 곳이 아니에요.' } ] },
    sub: { name: '수렴 경계 (섭입대)', spots: [
      { id: 's1', u: 0.46, v: 0.63, ok: true, label: '해구 쪽 섭입하는 판 (고압·저온)', why: '섭입하는 판은 빠르게 깊이 내려가 온도는 낮은데 압력이 커져 고압·저온 변성이 일어나요.' },
      { id: 's2', u: 0.64, v: 0.42, ok: true, label: '화산호 아래 지각 (마그마의 열, 고온)', why: '화산호 아래는 마그마의 열로 뜨거워서 고온의 변성(광역·접촉)이 일어나요.' },
      { id: 's3', u: 0.13, v: 0.49, ok: false, label: '바다 쪽 먼 해저의 얕은 지각', why: '해구에서 먼 얕은 해저 지각은 열과 압력이 크지 않아 변성이 거의 없어요.' },
      { id: 's4', u: 0.66, v: 0.13, ok: false, label: '화산 꼭대기 (용암이 흐르는 곳)', why: '지표에서 용암이 식는 곳은 화성암이 만들어지는 곳이에요.' } ] },
    col: { name: '수렴 경계 (대륙 충돌대)', spots: [
      { id: 'c1', u: 0.46, v: 0.58, ok: true, label: '두꺼워진 지각의 깊은 곳 (고압·고온)', why: '충돌로 두꺼워진 지각 깊은 곳은 압력과 온도가 모두 커서 광역 변성(편암·편마암)이 일어나요.' },
      { id: 'c2', u: 0.5, v: 0.19, ok: false, label: '산맥 꼭대기 지표', why: '지표 가까이는 열과 압력이 작아요. 변성암은 깊은 곳에서 만들어져 나중에 드러나요.' },
      { id: 'c3', u: 0.64, v: 0.42, ok: true, label: '관입한 화강암체의 가장자리 (접촉 변성)', why: '관입한 마그마(화강암체) 주변은 열을 받아 접촉 변성이 일어나요.' },
      { id: 'c4', u: 0.1, v: 0.35, ok: false, label: '충돌대에서 먼 대륙 안쪽의 얕은 퇴적층', why: '충돌대에서 먼 얕은 곳은 압력도 열도 작아 변성이 일어나지 않아요.' } ] },
  };
  const TABS = ['div', 'sub', 'col'];
  const tectCorrect = (tab) => { const sp = TECT_DEF[tab].spots, sel = S.tect.sel[tab]; return sp.every((s) => sel.includes(s.id) === s.ok); };
  const gauss = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
  function drawTect(t, dt) {
    const tab = S.tect.tab, D0 = TECT_DEF[tab], T = S.tect;
    panel(TP.x, TP.y, TP.w, TP.h, { fill: '#e8f1f8' });
    ctx.save(); rr(TP.x, TP.y, TP.w, TP.h, 14).clip();
    const poly = (pts, fill, stroke) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(tpx(p[0]), tpy(p[1])) : ctx.moveTo(tpx(p[0]), tpy(p[1])))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } };
    const fillPoly = (pts, kind, alpha) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(tpx(p[0]), tpy(p[1])) : ctx.moveTo(tpx(p[0]), tpy(p[1])))); ctx.closePath(); fillLith(kind, alpha); };
    const prof = (fn, n) => { const a = []; for (let i = 0; i <= n; i++) { const u = i / n; a.push([u, fn(u)]); } return a; };
    D.sky(TP.x, TP.y, TP.w, TP.h * (tab === 'sub' ? 0.3 : 0.24), '#cfe9ff', '#eaf6ff');
    if (tab === 'div') {
      const sf = (u) => 0.52 - 0.08 * gauss(u, 0.5, 0.2) + 0.03 * gauss(u, 0.5, 0.025);
      const lith = (u) => 0.58 + 0.16 * clamp(Math.abs(u - 0.5) / 0.5, 0, 1);
      // 바닷물
      ctx.fillStyle = '#4a98c9'; ctx.fillRect(TP.x, tpy(0.22), TP.w, tpy(0.62) - tpy(0.22));
      const wg = ctx.createLinearGradient(0, tpy(0.22), 0, tpy(0.5)); wg.addColorStop(0, 'rgba(255,255,255,.25)'); wg.addColorStop(1, 'rgba(10,50,110,.45)'); ctx.fillStyle = wg; ctx.fillRect(TP.x, tpy(0.22), TP.w, tpy(0.62) - tpy(0.22));
      // 맨틀(아래), 암석권 맨틀, 지각
      fillPoly([[0, 1], [1, 1], [1, lith(1)], ...prof(lith, 40).reverse()], 'mantle', 1);
      const hot = ctx.createRadialGradient(tpx(0.5), tpy(0.95), 10, tpx(0.5), tpy(0.8), TP.w * 0.35); hot.addColorStop(0, 'rgba(255,120,20,.55)'); hot.addColorStop(1, 'rgba(255,120,20,0)'); ctx.fillStyle = hot; ctx.fillRect(TP.x, tpy(0.5), TP.w, TP.h);
      fillPoly([[0, lith(0)], ...prof(lith, 40), [1, lith(1)], [1, sf(1) + 0.07], ...prof((u) => sf(u) + 0.07, 40).reverse()], 'mantle', 1);
      ctx.fillStyle = 'rgba(60,90,60,.0)';
      fillPoly([[0, sf(0)], ...prof(sf, 40), [1, sf(1)], [1, sf(1) + 0.07], ...prof((u) => sf(u) + 0.07, 40).reverse()], 'basalt', 1);
      // 마그마 방
      const mg = ctx.createRadialGradient(tpx(0.5), tpy(0.62), 4, tpx(0.5), tpy(0.62), tpx(0.06) - tpx(0));
      mg.addColorStop(0, '#fde047'); mg.addColorStop(0.6, '#f97316'); mg.addColorStop(1, '#b91c1c');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(tpx(0.5), tpy(0.62), tpx(0.06) - tpx(0), tpy(0.05) - tpy(0), 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tpx(0.5), tpy(0.585)); ctx.lineTo(tpx(0.5), tpy(sf(0.5) + 0.04)); ctx.stroke();
      // 굴뚝 연기(열수)
      if (!RM && Math.random() < dt * 8) parts.emit({ x: tpx(0.5) + (Math.random() - 0.5) * 8, y: tpy(sf(0.5)), vx: (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 20, size: 5 + Math.random() * 4, life: 1.4, color: 'rgba(30,30,40,.55)', shape: 'smoke' });
      // 퇴적물 (해령에서 멀수록 두꺼워요)
      { const th = (u) => 0.006 + Math.abs(u - 0.5) * 0.05; const top = prof((u) => sf(u) - th(u), 40).filter((p) => Math.abs(p[0] - 0.5) > 0.1); const left = top.filter((p) => p[0] < 0.5), right = top.filter((p) => p[0] > 0.5);
        [left, right].forEach((arr) => { if (arr.length > 1) fillPoly([...arr, ...arr.slice().reverse().map((p) => [p[0], sf(p[0])])], 'sand', 1); }); }
      D.arrow(tpx(0.43), tpy(0.4), tpx(0.2), tpy(0.4), { color: '#fff', width: 5, head: 16 }); D.arrow(tpx(0.57), tpy(0.4), tpx(0.8), tpy(0.4), { color: '#fff', width: 5, head: 16 });
      D.text(tpx(0.5), tpy(0.33), '판이 벌어져요 (인장)', { size: 14, weight: 800, color: '#0b3a63' });
      D.arrow(tpx(0.5), tpy(0.96), tpx(0.5), tpy(0.72), { color: '#fb923c', width: 5, head: 15 });
      tx(tpx(0.5) + 62, tpy(0.62) + 4, '마그마 방', 13.5, '#fff', 'left', 800);
      tx(tpx(0.08), tpy(0.9), '맨틀', 14, '#e5f0e0', 'left', 800); tx(tpx(0.08), tpy(0.66), '암석권', 14, '#e5f0e0', 'left', 800);
      // 변성 구역 표시
      if (T.rev.div > 0.01) { ctx.save(); ctx.globalAlpha = T.rev.div * 0.55; const g2 = ctx.createRadialGradient(tpx(0.5), tpy(0.55), 4, tpx(0.5), tpy(0.55), tpx(0.17) - tpx(0)); g2.addColorStop(0, '#f97316'); g2.addColorStop(1, 'rgba(249,115,22,0)'); ctx.fillStyle = g2; ctx.fillRect(tpx(0.3), tpy(0.4), tpx(0.4) - tpx(0), tpy(0.3) - tpy(0)); ctx.restore(); }
    } else if (tab === 'sub') {
      const slabC = (u) => (u < 0.34 ? 0.5 + u * 0.12 : 0.54 + (u - 0.34) * 0.73);
      const land = (u) => (u < 0.34 ? 0.5 : u < 0.42 ? 0.5 - (u - 0.34) / 0.08 * 0.26 : 0.24 - 0.14 * gauss(u, 0.66, 0.05));
      ctx.fillStyle = '#4a98c9'; ctx.fillRect(TP.x, tpy(0.3), tpx(0.42) - TP.x, tpy(0.56) - tpy(0.3));
      const wg = ctx.createLinearGradient(0, tpy(0.3), 0, tpy(0.5)); wg.addColorStop(0, 'rgba(255,255,255,.25)'); wg.addColorStop(1, 'rgba(10,50,110,.45)'); ctx.fillStyle = wg; ctx.fillRect(TP.x, tpy(0.3), tpx(0.42) - TP.x, tpy(0.56) - tpy(0.3));
      ctx.fillStyle = 'rgba(0,0,0,0)';
      fillPoly([[0, 1], [1, 1], [1, 0.24], [0.42, 0.24], [0.34, 0.5], [0, 0.5]], 'mantle', 1); // 맨틀 바탕
      ctx.fillStyle = 'rgba(20,60,30,.0)';
      // 대륙 지각
      const cr = [[0.34, 0.54], ...prof((u) => land(u), 40).filter((p) => p[0] >= 0.34), [1, 0.5], [0.62, 0.52], [0.45, 0.56]];
      fillPoly([[0.34, 0.53], [0.34, 0.5], [0.42, 0.24], ...prof(land, 40).filter((p) => p[0] >= 0.42), [1, 0.54], [0.6, 0.54], [0.4, 0.56]], 'crust', 1);
      // 산: 화산
      ctx.fillStyle = '#7a5a46'; ctx.beginPath(); ctx.moveTo(tpx(0.6), tpy(0.24)); ctx.lineTo(tpx(0.66), tpy(0.1)); ctx.lineTo(tpx(0.72), tpy(0.24)); ctx.closePath(); ctx.fill();
      // 바다 지각(섭입하는 판)
      const slab = []; for (let i = 0; i <= 50; i++) { const u = (i / 50) * 0.92; slab.push([u, slabC(u) - 0.03]); } for (let i = 50; i >= 0; i--) { const u = (i / 50) * 0.92; slab.push([u, slabC(u) + 0.03]); }
      fillPoly(slab, 'basalt', 1); poly(slab, null, 'rgba(20,20,30,.55)');
      // 섭입 방향
      D.arrow(tpx(0.08), tpy(0.44), tpx(0.27), tpy(0.455), { color: '#fff', width: 5, head: 15 });
      tx(tpx(0.17), tpy(0.4), '바다 판', 14, '#0b3a63', 'center', 800);
      // 마그마 통로 + 방
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3.5; ctx.setLineDash([2, 6]); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tpx(0.62), tpy(0.72)); ctx.lineTo(tpx(0.65), tpy(0.46)); ctx.lineTo(tpx(0.66), tpy(0.13)); ctx.stroke(); ctx.setLineDash([]);
      const mg = ctx.createRadialGradient(tpx(0.66), tpy(0.45), 3, tpx(0.66), tpy(0.45), 40); mg.addColorStop(0, '#fde047'); mg.addColorStop(0.6, '#f97316'); mg.addColorStop(1, 'rgba(185,28,28,.6)'); ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(tpx(0.66), tpy(0.45), TP.w * 0.045, TP.h * 0.04, 0, 0, TAU); ctx.fill();
      if (!RM && Math.random() < dt * 6) parts.emit({ x: tpx(0.66), y: tpy(0.1), vx: (Math.random() - 0.3) * 14, vy: -34 - Math.random() * 24, size: 6 + Math.random() * 4, life: 1.6, color: 'rgba(90,80,80,.5)', shape: 'smoke' });
      // 물 방출 화살표
      for (let k = 0; k < 3; k++) { const u = 0.45 + k * 0.07, v = slabC(u) - 0.035; D.arrow(tpx(u), tpy(v), tpx(u + 0.015), tpy(v - 0.07), { color: '#7dd3fc', width: 3, head: 9, alpha: 0.9 }); }
      tx(tpx(0.52), tpy(0.5), '맨틀 쐐기', 13.5, '#e5f0e0', 'center', 800);
      tx(tpx(0.34) - 4, tpy(0.62), '해구', 14, '#0b3a63', 'right', 800);
      tx(tpx(0.93), tpy(0.34), '대륙', 14, '#f1f5f9', 'right', 800);
      tx(tpx(0.8), tpy(0.88), '맨틀', 14, '#e5f0e0', 'center', 800);
      D.arrow(tpx(0.74), tpy(0.8), tpx(0.84), tpy(0.88), { color: '#fff', width: 4, head: 12, alpha: 0.0 });
      if (T.rev.sub > 0.01) {
        ctx.save(); ctx.globalAlpha = T.rev.sub * 0.6;
        const sl2 = []; for (let i = 5; i <= 30; i++) { const u = i / 50 + 0.34 * 0.5; sl2.push([0.36 + (i - 5) / 25 * 0.2, slabC(0.36 + (i - 5) / 25 * 0.2) - 0.03]); } for (let i = 25; i >= 0; i--) sl2.push([0.36 + i / 25 * 0.2, slabC(0.36 + i / 25 * 0.2) + 0.03]);
        poly(sl2, '#2563eb', null);
        const g2 = ctx.createRadialGradient(tpx(0.66), tpy(0.44), 4, tpx(0.66), tpy(0.44), 80); g2.addColorStop(0, '#f97316'); g2.addColorStop(1, 'rgba(249,115,22,0)'); ctx.fillStyle = g2; ctx.fillRect(tpx(0.5), tpy(0.28), tpx(0.34) - tpx(0), tpy(0.3) - tpy(0)); ctx.restore();
        tx(tpx(0.46), tpy(0.74), '고압·저온 변성대', 13.5, '#1d4ed8', 'center', 800); tx(tpx(0.78), tpy(0.4), '고온 변성대', 13.5, '#c2410c', 'center', 800);
      }
    } else {
      const surf = (u) => 0.3 - 0.16 * gauss(u, 0.5, 0.17);
      const moho = (u) => 0.5 + 0.26 * gauss(u, 0.5, 0.2);
      fillPoly([[0, 1], [1, 1], [1, 0.3], [0, 0.3]], 'mantle', 1);
      fillPoly([[0, 0.5], [0, surf(0)], ...prof(surf, 60), [1, 0.5], ...prof(moho, 60).reverse()], 'crust', 1);
      // 지층 줄무늬(습곡)
      ctx.save(); ctx.beginPath(); [[0, 0.5], [0, surf(0)]].forEach((p, i) => (i ? ctx.lineTo(tpx(p[0]), tpy(p[1])) : ctx.moveTo(tpx(p[0]), tpy(p[1])))); prof(surf, 60).forEach((p) => ctx.lineTo(tpx(p[0]), tpy(p[1]))); ctx.lineTo(tpx(1), tpy(0.5)); prof(moho, 60).reverse().forEach((p) => ctx.lineTo(tpx(p[0]), tpy(p[1]))); ctx.closePath(); ctx.clip();
      ctx.lineWidth = 6; for (let k = 0; k < 6; k++) { ctx.strokeStyle = k % 2 ? 'rgba(230,210,170,.55)' : 'rgba(140,110,90,.45)'; ctx.beginPath(); for (let i = 0; i <= 60; i++) { const u = i / 60, v = 0.38 + k * 0.04 + 0.1 * gauss(u, 0.5, 0.2) * (1 + Math.sin(u * 26 + k) * 0.12) - 0.16 * gauss(u, 0.5, 0.17) * 0.6; i ? ctx.lineTo(tpx(u), tpy(v)) : ctx.moveTo(tpx(u), tpy(v)); } ctx.stroke(); }
      ctx.restore();
      // 역단층
      ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 3.5; ctx.setLineDash([9, 5]);
      [[0.34, 0.5, 0.42, 0.3], [0.66, 0.5, 0.58, 0.3]].forEach((f) => { ctx.beginPath(); ctx.moveTo(tpx(f[0]), tpy(f[1])); ctx.lineTo(tpx(f[2]), tpy(f[3])); ctx.stroke(); });
      ctx.setLineDash([]);
      // 화강암체
      ctx.beginPath(); ctx.ellipse(tpx(0.57), tpy(0.42), TP.w * 0.065, TP.h * 0.06, 0.3, 0, TAU); ctx.fillStyle = lithFill('granite'); ctx.fill(); ctx.strokeStyle = 'rgba(100,40,40,.7)'; ctx.lineWidth = 2; ctx.stroke();
      tx(tpx(0.57), tpy(0.43) + 4, '화강암체', 12.5, '#4a1f1f', 'center', 800);
      D.arrow(tpx(0.03), tpy(0.4), tpx(0.2), tpy(0.4), { color: '#dc2626', width: 6, head: 17 }); D.arrow(tpx(0.97), tpy(0.4), tpx(0.8), tpy(0.4), { color: '#dc2626', width: 6, head: 17 });
      tx(tpx(0.11), tpy(0.47), '횡압력', 14, '#b91c1c', 'center', 800); tx(tpx(0.89), tpy(0.47), '횡압력', 14, '#b91c1c', 'center', 800);
      tx(tpx(0.17), tpy(0.8), '맨틀', 14, '#e5f0e0', 'center', 800);
      tx(tpx(0.5), tpy(0.08), '습곡 산맥', 14, '#334155', 'center', 800);
      if (T.rev.col > 0.01) {
        ctx.save(); ctx.globalAlpha = T.rev.col * 0.6; ctx.fillStyle = '#7c3aed'; ctx.beginPath(); ctx.ellipse(tpx(0.47), tpy(0.62), TP.w * 0.13, TP.h * 0.1, 0, 0, TAU); ctx.fill();
        ctx.lineWidth = 7; ctx.strokeStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(tpx(0.57), tpy(0.42), TP.w * 0.1, TP.h * 0.09, 0.3, 0, TAU); ctx.stroke(); ctx.restore();
        tx(tpx(0.47), tpy(0.665), '광역 변성대', 13.5, '#fff', 'center', 800); tx(tpx(0.47), tpy(0.705), '(고압·고온)', 12.5, '#fff', 'center', 800); tx(tpx(0.69), tpy(0.54), '접촉 변성대', 13.5, '#c2410c', 'left', 800);
      }
    }
    ctx.restore();
    // 변성 구역 드러내기 값
    TABS.forEach((k) => { T.rev[k] = approach(T.rev[k], tectCorrect(k) && T.sel[k].length ? 1 : 0, dt, 4); });
    // 후보 점
    const r0 = PHONE ? 19 : 17;
    D0.spots.forEach((s, i) => {
      const x = tpx(s.u), y = tpy(s.v), on = T.sel[tab].includes(s.id), hv = T.hover === s.id;
      ctx.save(); D.shadow(() => { ctx.fillStyle = on ? '#16a34a' : '#fff'; ctx.beginPath(); ctx.arc(x, y, r0 + (hv ? 3 : 0), 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = on ? '#14532d' : '#0369a1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r0 + (hv ? 3 : 0), 0, TAU); ctx.stroke(); ctx.restore();
      tx(x, y + 6, String(i + 1), 17, on ? '#fff' : '#0369a1', 'center', 800);
      if (!on) D.ring(x, y, r0 + 6, t + i * 0.3, { color: '#0ea5e9', speed: 0.5, width: 1.5 });
    });
    // 범례
    const ly = TP.y + TP.h + 10;
    tx(TP.x + 6, ly + 14, '변성 작용이 일어나는 곳을 모두 눌러요 (' + D0.name + ')', 14.5, '#334155', 'left', 800);
    D0.spots.forEach((s, i) => {
      const on = T.sel[tab].includes(s.id);
      const lines = wrapLines((i + 1) + '  ' + s.label, PHONE ? 560 : 740, 14, 700);
      lines.forEach((l, j) => tx(TP.x + 8, ly + 38 + i * (PHONE ? 22 : 20) + j * 16, l, PHONE ? 13 : 14, on ? '#15803d' : '#475569', 'left', on ? 800 : 700));
    });
  }

  /* ---------- 장면 ④ : 옛 변동대 ---------- */
  const MP = PHONE
    ? { M: { x: 10, y: 46, w: 580, h: 340 }, C: { x: 10, y: 398, w: 580, h: 300 }, L: { x: 10, y: 712, w: 580, h: 112 } }
    : { M: { x: 20, y: 46, w: 380, h: 392 }, C: { x: 412, y: 46, w: 368, h: 392 }, L: { x: 20, y: 450, w: 760, h: 96 } };
  const LAND_A = [[0.04, 0.12], [0.2, 0.07], [0.4, 0.08], [0.44, 0.3], [0.4, 0.55], [0.45, 0.8], [0.38, 0.94], [0.06, 0.9], [0.03, 0.5]];
  const LAND_B = [[0.6, 0.14], [0.75, 0.08], [0.9, 0.1], [0.92, 0.5], [0.88, 0.9], [0.64, 0.88], [0.58, 0.62], [0.62, 0.36]];
  const BELT = (() => { const L = [], R = []; for (let i = 0; i <= 14; i++) { const v = 0.12 + i * 0.054; L.push([0.395 + 0.012 * Math.sin(v * 11), v]); R.push([0.505 + 0.012 * Math.sin(v * 11 + 1.3), v]); } return [...L, ...R.reverse()]; })();
  const BELT_CX = 0.45;
  const mapDx = (t) => -0.17 * smooth(clamp(t / 0.5, 0, 1)) - 0.03 * smooth(clamp((t - 0.5) / 0.25, 0, 1));
  const beltW = (t) => smooth((t - 0.5) / 0.3);
  const timeLabel = (t) => (t < 0.3 ? '수억 년 전: 두 대륙이 멀어요' : t < 0.5 ? '두 대륙이 다가와요' : t < 0.75 ? '충돌! 압력·열이 커져요' : t < 0.92 ? '융기와 침식이 계속돼요' : '현재');
  const beltPts = (t) => { const w = beltW(t), M = MP.M; return BELT.map((p) => [M.x + (BELT_CX + (p[0] - BELT_CX) * w) * M.w, M.y + p[1] * M.h]); };
  function drawMap(t, dt) {
    const M = MP.M, C = MP.C, Mt = S.map, tt = Mt.t, dx = mapDx(tt), w = beltW(tt);
    // 지도
    panel(M.x, M.y, M.w, M.h, { fill: '#cfe6f5' });
    tx(M.x + 12, M.y + 22, '지도 (위에서 본 모식도)', 14, '#334155', 'left', 800);
    ctx.save(); rr(M.x, M.y, M.w, M.h, 14).clip();
    const mp = (p, ox) => [M.x + (p[0] + (ox || 0)) * M.w, M.y + p[1] * M.h];
    const drawLand = (pts, ox) => { ctx.beginPath(); pts.forEach((p, i) => { const q = mp(p, ox); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); };
    [[LAND_A, 0], [LAND_B, dx]].forEach(([pts, ox]) => { drawLand(pts, ox); ctx.fillStyle = '#d9cfb0'; ctx.fill(); });
    [[LAND_A, 0], [LAND_B, dx]].forEach(([pts, ox]) => { drawLand(pts, ox); ctx.fillStyle = lithFill('granite'); ctx.globalAlpha = 0.32; ctx.fill(); ctx.globalAlpha = 1; });
    [[LAND_A, 0], [LAND_B, dx]].forEach(([pts, ox]) => { drawLand(pts, ox); ctx.strokeStyle = tt > 0.62 ? 'rgba(0,0,0,0)' : '#7a6a4a'; ctx.lineWidth = 2.4; ctx.stroke(); });
    if (tt > 0.5) { // 합쳐진 대륙의 외곽선
      ctx.lineWidth = 2.4; ctx.strokeStyle = '#7a6a4a'; ctx.globalAlpha = smooth((tt - 0.55) / 0.2);
      [[LAND_A, 0], [LAND_B, dx]].forEach(([pts, ox]) => { drawLand(pts, ox); ctx.stroke(); }); ctx.globalAlpha = 1;
    }
    // 변성암 띠
    if (w > 0.02) {
      const bp = beltPts(tt);
      ctx.save(); ctx.beginPath(); bp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.fillStyle = '#8b6fa6'; ctx.fill(); ctx.clip(); ctx.fillStyle = lithFill('gneiss'); ctx.globalAlpha = 0.9; ctx.save(); ctx.translate(M.x + BELT_CX * M.w, M.y + 0.5 * M.h); ctx.rotate(Math.PI / 2); ctx.fillRect(-M.h, -M.w, M.h * 2, M.w * 2); ctx.restore();
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(M.x + (BELT_CX + k * 0.012) * M.w, M.y + 0.05 * M.h); ctx.lineTo(M.x + (BELT_CX + k * 0.012) * M.w, M.y + 0.95 * M.h); ctx.stroke(); }
      ctx.restore();
      ctx.beginPath(); bp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.strokeStyle = Mt.marked ? '#16a34a' : 'rgba(76,29,149,.8)'; ctx.lineWidth = Mt.marked ? 4 : 2.2; ctx.stroke();
    }
    // 압력 화살표
    if (tt > 0.3 && tt < 0.78) { const a = smooth((tt - 0.3) / 0.1) * (1 - smooth((tt - 0.68) / 0.1)); ctx.globalAlpha = a; [0.3, 0.55, 0.78].forEach((v) => { D.arrow(M.x + 0.12 * M.w, M.y + v * M.h, M.x + 0.3 * M.w, M.y + v * M.h, { color: '#dc2626', width: 5, head: 14 }); D.arrow(M.x + 0.92 * M.w, M.y + v * M.h, M.x + 0.74 * M.w, M.y + v * M.h, { color: '#dc2626', width: 5, head: 14 }); }); ctx.globalAlpha = 1; }
    // 현재의 판 경계
    if (tt >= 0.85) {
      const ax = M.x + 0.955 * M.w, a = smooth((tt - 0.85) / 0.1);
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(ax, M.y + 0.05 * M.h); ctx.lineTo(ax, M.y + 0.95 * M.h); ctx.stroke(); ctx.fillStyle = '#0f172a';
      for (let y = M.y + 0.08 * M.h; y < M.y + 0.92 * M.h; y += 26) { ctx.beginPath(); ctx.moveTo(ax - 9, y); ctx.lineTo(ax, y + 7); ctx.lineTo(ax - 9, y + 14); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
    if (tt < 0.5) tx(M.x + M.w * (0.5 + dx / 2 + 0.02), M.y + 0.5 * M.h, '바다', 15, '#3a7ca5', 'center', 800);
    if (tt >= 0.85) D.label(M.x + 0.93 * M.w, M.y + M.h - 22, '현재의 판 경계', { bg: '#0f172a', size: 12.5, pad: 7, align: 'right' });
    if (tt >= 0.9 && !Mt.marked) { D.ring(M.x + BELT_CX * M.w, M.y + 0.5 * M.h, 30, t, { color: '#7c3aed', speed: 0.7, width: 2 }); }
    if (Mt.marked) { Mt.mark = approach(Mt.mark, 1, dt, 5); D.label(M.x + BELT_CX * M.w, M.y + 0.5 * M.h, '옛 변동대', { bg: '#16a34a', size: 14, pad: 9 }); }
    if (tt >= 0.9) D.label(M.x + 0.2 * M.w, M.y + M.h - 22, '대륙 A', { bg: 'rgba(255,255,255,.85)', color: '#334155', size: 12.5, pad: 7 });
    D.text(M.x + M.w / 2, M.y + M.h - 8, timeLabel(tt), { size: 13.5, weight: 800, color: '#334155' });
    // 단면
    panel(C.x, C.y, C.w, C.h, { fill: '#e8f1f8' });
    tx(C.x + 12, C.y + 22, '단면 (동서 방향, 모식도)', 14, '#334155', 'left', 800);
    ctx.save(); rr(C.x, C.y, C.w, C.h, 14).clip();
    const zv = (z) => 0.2 + (z / 48) * 0.76, cxp = (u) => C.x + u * C.w, cyp = (v) => C.y + v * C.h;
    const ca = smooth((tt - 0.35) / 0.35), up = smooth((tt - 0.7) / 0.3);
    const H = 9 * ca * (1 - 0.9 * smooth((tt - 0.75) / 0.25)), Rt = 17 * ca * (1 - 0.5 * smooth((tt - 0.75) / 0.25));
    const surfZ = (u) => -H * gauss(u, BELT_CX, 0.12), mohoZ = (u) => 35 + Rt * gauss(u, BELT_CX, 0.16);
    const uB = 0.58 + dx; // 대륙 B 왼쪽 가장자리
    // 하늘, 바다
    D.sky(C.x, C.y, C.w, C.h * 0.22, '#cfe9ff', '#eaf6ff');
    // 맨틀
    ctx.fillStyle = lithFill('mantle'); ctx.fillRect(C.x, cyp(zv(30)), C.w, C.h);
    // 바다(두 대륙 사이)
    if (tt < 0.55) { const a = 1 - smooth((tt - 0.4) / 0.15); ctx.fillStyle = 'rgba(74,152,201,' + 0.9 * a + ')'; ctx.fillRect(cxp(0.4), cyp(zv(0)), cxp(Math.max(0.4, uB)) - cxp(0.4), cyp(zv(3)) - cyp(zv(0))); }
    // 지각
    ctx.beginPath(); ctx.moveTo(cxp(0), cyp(zv(0))); for (let i = 0; i <= 60; i++) { const u = i / 60; ctx.lineTo(cxp(u), cyp(zv(surfZ(u)))); } ctx.lineTo(cxp(1), cyp(zv(0))); for (let i = 60; i >= 0; i--) { const u = i / 60; ctx.lineTo(cxp(u), cyp(zv(mohoZ(u)))); } ctx.closePath();
    ctx.fillStyle = lithFill('crust'); ctx.fill(); ctx.save(); ctx.clip();
    // 변성암체 (깊은 곳에서 올라오고, 위가 깎여요)
    const bz = 26 * (1 - up), bamp = smooth((tt - 0.5) / 0.2);
    if (bamp > 0.01) { ctx.globalAlpha = bamp; ctx.beginPath(); ctx.ellipse(cxp(BELT_CX), cyp(zv(bz)), C.w * 0.11, (cyp(zv(10)) - cyp(zv(0))), 0, 0, TAU); ctx.fillStyle = lithFill('gneiss'); ctx.fill(); ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
    // 지표선과 침식
    ctx.beginPath(); for (let i = 0; i <= 60; i++) { const u = i / 60; i ? ctx.lineTo(cxp(u), cyp(zv(surfZ(u)))) : ctx.moveTo(cxp(u), cyp(zv(surfZ(u)))); } ctx.strokeStyle = '#3f2d1d'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    // 깊이 눈금
    [0, 10, 20, 30, 40].forEach((z) => { D.text(C.x + 8, cyp(zv(z)) + 4, z + ' km', { size: 12.5, weight: 800, color: '#1e293b', align: 'left', stroke: 'rgba(255,255,255,.85)', strokeWidth: 3.5 }); ctx.strokeStyle = 'rgba(71,85,105,.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(C.x + 56, cyp(zv(z))); ctx.lineTo(C.x + C.w, cyp(zv(z))); ctx.stroke(); });
    if (tt > 0.2 && tt < 0.78) { const a = smooth((tt - 0.2) / 0.1) * (1 - smooth((tt - 0.68) / 0.1)); ctx.globalAlpha = a; D.arrow(C.x + 0.14 * C.w, cyp(zv(16)), C.x + 0.3 * C.w, cyp(zv(16)), { color: '#dc2626', width: 5, head: 14 }); D.arrow(C.x + 0.92 * C.w, cyp(zv(16)), C.x + 0.76 * C.w, cyp(zv(16)), { color: '#dc2626', width: 5, head: 14 }); ctx.globalAlpha = 1; }
    if (up > 0.05 && up < 0.98) D.arrow(cxp(BELT_CX), cyp(zv(30)), cxp(BELT_CX), cyp(zv(16)), { color: '#7c3aed', width: 5, head: 14, alpha: 0.8 });
    if (up > 0.2) tx(cxp(BELT_CX) + C.w * 0.14, cyp(zv(-1)) - 8, '융기 + 침식', 13.5, '#7c3aed', 'left', 800);
    if (up > 0.95) D.label(cxp(BELT_CX), cyp(zv(2)) - 6, '편마암·편암이 지표에 드러나요', { bg: '#7c3aed', size: 13, pad: 8 });
    else if (bamp > 0.6) tx(cxp(BELT_CX), cyp(zv(bz)) + 5, '변성암', 13.5, '#f5f3ff', 'center', 800);
    // 범례
    const L = MP.L;
    panel(L.x, L.y, L.w, L.h, { fill: 'rgba(255,255,255,.94)' });
    const lines = wrapLines(tt < 0.5 ? '두 대륙이 가까워지는 동안은 아직 변성암 띠가 없어요. 시간을 오른쪽으로 옮겨 봐요.' : tt < 0.9 ? '충돌로 지각이 두꺼워지고 깊은 곳에서 열과 압력으로 변성암이 만들어져요. 줄무늬(엽리)는 압력 방향에 수직이에요.' : '지금은 대륙 안쪽이지만, 변성암 띠(줄무늬 엽리)가 옛 충돌대의 흔적이에요.' + (Mt.marked ? '' : ' 띠를 눌러 표시해요.'), L.w - 28, PHONE ? 14 : 14.5, 700);
    lines.forEach((l, i) => tx(L.x + 14, L.y + 28 + i * (PHONE ? 22 : 22), l, PHONE ? 14 : 14.5, '#334155', 'left', 700));
  }
  function mapTap(p) {
    const Mt = S.map, M = MP.M;
    if (p.x < M.x || p.x > M.x + M.w || p.y < M.y || p.y > M.y + M.h) return false;
    if (Mt.t < 0.9) { say('시간을 현재(오른쪽 끝)까지 흘려보낸 뒤 눌러 봐요.', true); return false; }
    const bp = beltPts(Mt.t);
    let hit = pointInPoly(p.x, p.y, bp);
    if (!hit) { for (let dx = -14; dx <= 14 && !hit; dx += 14) if (pointInPoly(p.x + dx, p.y, bp)) hit = true; }
    if (hit) {
      if (!Mt.marked) { Mt.marked = true; Mt.mark = 0; Sound.success(); parts.burst(p.x, p.y, { count: 16, colors: ['#7c3aed', '#16a34a', '#fbbf24'] }); say('옛 변동대를 찾았어요! 줄무늬가 나란한 변성암 띠예요.', false); updateCtl(); }
    } else { Sound.fail(); say('여기는 아니에요. 줄무늬가 나란한 변성암 띠를 찾아봐요.', true); }
    return false;
  }
  function tectTap(p) {
    const tab = S.tect.tab, sp = TECT_DEF[tab].spots, rr0 = PHONE ? 34 : 30;
    for (const s of sp) {
      if (Math.hypot(p.x - tpx(s.u), p.y - tpy(s.v)) <= rr0) {
        const a = S.tect.sel[tab], i = a.indexOf(s.id); Sound.click();
        if (i >= 0) a.splice(i, 1); else { a.push(s.id); parts.burst(tpx(s.u), tpy(s.v), { count: 8, speed: 80, size: 3, life: 0.5, colors: ['#0ea5e9', '#fff'] }); }
        updateCtl(); return true;
      }
    }
    return false;
  }
  function aurTap(p) {
    const P = AUR.S;
    if (p.x < P.x || p.x > P.x + P.w || p.y < AUR.ys || p.y > AUR.yb) return false;
    const r = clamp(Math.floor((p.y - AUR.ys) / AUR.hL), 0, 4), row = r > 2 ? (r === 3 ? 1 : 0) : r;
    S.aur.row = r; Sound.click(); updateCtl(); return true;
  }

  /* ---------- 컨트롤 연결 ---------- */
  const sT = $('#sT'), oT = $('#oT'), sP = $('#sP'), oP = $('#oP'), sD = $('#sD'), oD = $('#oD'), sDep = $('#sDep'), oDep = $('#oDep'), sTime = $('#sTime'), oTime = $('#oTime');
  const dirBtns = $$('#dirSeg .opt'), layerBtns = $$('#layerSeg .opt'), tectBtns = $$('#tectSeg .opt'), envSels = $$('select[data-env]');
  const seqLad = makeSeq($('#seqLad'), LAD.map((l) => ({ id: l.id, label: l.name })), { order: LAD_SLOT.map((r) => LAD[r].id) });
  const LAD_ANS = 'slate,phyllite,schist,gneiss';
  const rows3 = ['sand', 'shale', 'lime'];
  const setView = (v) => { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); };
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes || !c.dataset.modes.split(' ').includes(S.view); });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.view === S.view); });
    const G = S.grain;
    setSlider(sT, oT, G.T, (v) => v + ' °C'); setSlider(sP, oP, G.P, (v) => v + ' MPa');
    dirBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === G.dir));
    const A = S.aur;
    $('#bIntrude').disabled = A.run; $('#bIntrude').textContent = A.done ? '▶ 다시 관입' : A.run ? '관입하는 중…' : '▶ 마그마 관입';
    sD.disabled = false; setSlider(sD, oD, A.d, (v) => (v / 10).toFixed(1) + ' km');
    layerBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === AUR_ROWS[A.row]));
    $('#aurNote').textContent = !A.done ? (A.run ? '마그마가 올라오며 주변 암석이 열을 받아요…' : '마그마를 관입시킨 뒤, 탐침을 움직여 변성도를 읽어요.') : '이 층: ' + AUR_META[AUR_ROWS[A.row]][2] + ' → ' + aurRockText(aurDist(), A.row) + '. 층을 눌러 바꿔 봐요.';
    setSlider(sDep, oDep, S.pt.dep, (v) => v + ' km');
    envSels.forEach((s) => { s.value = S.pt.sel[+s.dataset.env]; });
    tectBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === S.tect.tab));
    const M = S.map;
    setSlider(sTime, oTime, Math.round(M.t * 100), () => (M.t >= 0.92 ? '현재' : M.t < 0.05 ? '과거' : '…'));
    $('#bTimePlay').textContent = M.play ? '⏸ 멈춤' : '⏵ 재생';
    $('#mapNote').textContent = M.t >= 0.9 ? (M.marked ? '옛 변동대를 표시했어요. 줄무늬 방향이 충돌 때 압력 방향에 수직이었는지 생각해 봐요.' : '대륙 안쪽에서 줄무늬가 나란한 변성암 띠를 눌러 표시해요.') : '시간을 흘려보내며 두 대륙이 어떻게 되는지 지켜봐요.';
    $('#tectNote').textContent = '변성 작용이 일어나는 곳을 단면 위 번호 점에서 모두 눌러요. (현재 ' + S.tect.sel[S.tect.tab].length + '곳 선택) 다시 누르면 취소돼요.';
  }
  bindSlider(sT, oT, (v) => v + ' °C', (v) => { S.grain.T = v; });
  bindSlider(sP, oP, (v) => v + ' MPa', (v) => { S.grain.P = v; });
  dirBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.grain.dir = b.dataset.k; updateCtl(); }));
  $('#bGrainReset').addEventListener('click', () => { Sound.click(); grainReset(); updateCtl(); });
  $('#bClsReset').addEventListener('click', () => { Sound.click(); clsReset(); });
  $('#bIntrude').addEventListener('click', aurRun);
  function aurFull() { const A = S.aur; SciSim.tween(A, { rise: 0, cool: 0, spread: 0 }, { duration: 0.001 }); Object.assign(A, { rise: 0, cool: 0, spread: 0, run: false, done: false }); }
  $('#bAurReset').addEventListener('click', () => { Sound.click(); aurFull(); updateCtl(); });
  bindSlider(sD, oD, (v) => (v / 10).toFixed(1) + ' km', (v) => { S.aur.d = v; updateCtl(); });
  layerBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.aur.row = rows3.indexOf(b.dataset.k); updateCtl(); }));
  bindSlider(sDep, oDep, (v) => v + ' km', (v) => { S.pt.dep = v; });
  $('#bP').addEventListener('click', ptRecord);
  $('#inP').addEventListener('keydown', (e) => { if (e.key === 'Enter') ptRecord(); });
  envSels.forEach((s) => s.addEventListener('change', () => { Sound.click(); S.pt.sel[+s.dataset.env] = s.value; updateCtl(); }));
  tectBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.tect.tab = b.dataset.k; updateCtl(); }));
  $('#bTectReset').addEventListener('click', () => { Sound.click(); S.tect.sel[S.tect.tab] = []; updateCtl(); });
  function mapPlay() {
    const M = S.map; Sound.click();
    if (M.play) { M.play = false; SciSim.tween(M, { t: M.t }, { duration: 0.001 }); updateCtl(); return; }
    if (M.t >= 0.999) M.t = 0;
    M.play = true;
    SciSim.tween(M, { t: 1 }, { duration: RM ? 0.05 : (1 - M.t) * 14, ease: 'linear', onUpdate: () => { setSlider(sTime, oTime, Math.round(M.t * 100), () => (M.t >= 0.92 ? '현재' : M.t < 0.05 ? '과거' : '…')); }, onDone: () => { M.play = false; M.t = 1; updateCtl(); } });
    updateCtl();
  }
  $('#bTimePlay').addEventListener('click', mapPlay);
  function mapReset() { const M = S.map; SciSim.tween(M, { t: 0 }, { duration: 0.001 }); Object.assign(M, { t: 0, play: false, marked: false, mark: 0 }); updateCtl(); }
  $('#bTimeReset').addEventListener('click', () => { Sound.click(); mapReset(); });
  bindSlider(sTime, oTime, () => '…', (v) => { const M = S.map; if (M.play) { M.play = false; SciSim.tween(M, { t: M.t }, { duration: 0.001 }); } M.t = v / 100; updateCtl(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setView(b.dataset.view); }));

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'class') return clsBoard.down(p);
      if (S.view === 'tect') { tectTap(p); return false; }
      if (S.view === 'aur') { aurTap(p); return false; }
      if (S.view === 'map') { mapTap(p); return false; }
      return false;
    },
    move(p) { if (S.view === 'class') clsBoard.move(p); },
    up(p) { if (S.view === 'class') { clsBoard.up(p); } },
    hover(p) {
      if (S.view === 'class') return clsBoard.hit(p) ? 'grab' : 'default';
      if (S.view === 'tect') { const sp = TECT_DEF[S.tect.tab].spots.find((s) => Math.hypot(p.x - tpx(s.u), p.y - tpy(s.v)) <= 30); S.tect.hover = sp ? sp.id : null; return sp ? 'pointer' : 'default'; }
      if (S.view === 'aur') return p.y > AUR.ys && p.y < AUR.yb && p.x > AUR.S.x && p.x < AUR.S.x + AUR.S.w ? 'pointer' : 'default';
      if (S.view === 'map') return 'pointer';
      return 'default';
    },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view, G = S.grain;
    if (v === 'grain') { const r = rockNow(); setReadouts(['지금 암석', r.name, '알갱이 크기', sizeLabel(G.g), '엽리', foliLabel(G.a)]); }
    else if (v === 'ladder') setReadouts(['담은 암석', seqLad.ids().length + ' / 4', '순서', S.lad.ok ? '맞아요' : '?', '원암', '셰일(이암)']);
    else if (v === 'class') { const nf = clsBoard.inZone('foli').length, nn = clsBoard.inZone('non').length; setReadouts(['나눈 카드', clsPlaced() + ' / 6', '엽리 있음 칸', nf + '장', '엽리 없음 칸', nn + '장']); }
    else if (v === 'aur') { const A = S.aur, d = aurDist(); setReadouts(['관입', A.done ? '끝남' : A.run ? '진행 중' : '아직', '탐침 거리', d.toFixed(1) + ' km', '변성도', A.done ? aurPct(d) + ' %' : '—']); }
    else if (v === 'pt') setReadouts(['깊이', S.pt.dep + ' km', '압력 (27 MPa × 깊이)', f0(27 * S.pt.dep) + ' MPa', '20 km 압력 기록', S.pt.rec == null ? '—' : S.pt.rec + ' MPa']);
    else if (v === 'tect') { const T = S.tect; setReadouts(['단면', TECT_DEF[T.tab].name.split(' (')[0], '고른 곳', T.sel[T.tab].length + '곳', '핵심', '열·압력이 큰 곳']); }
    else { const M = S.map; setReadouts(['시간', M.t >= 0.92 ? '현재' : M.t < 0.05 ? '과거' : f0(M.t * 100) + ' %', '옛 변동대 표시', M.marked ? '했어요' : '아직', '엽리 방향', M.t >= 0.6 ? '압력에 수직' : '—']); }
  }

  /* ---------- 단계 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    if (li === 0) { grainReset(); setView('grain'); showHint('온도와 압력 슬라이더로 암석 알갱이의 변화를 지켜봐요', 5000); }
    else if (li === 1) { S.lad.ok = false; seqLad.reset(); clsReset(); setView('ladder'); showHint('알갱이와 줄무늬를 비교해 변성도 순서를 정해 봐요', 5000); }
    else if (li === 2) { aurFull(); S.aur.d = 4; S.aur.row = 1; S.pt.rec = null; S.pt.sel = ['', '', '']; $('#inP').value = ''; setView('aur'); showHint('▶ 마그마 관입을 눌러 열이 퍼지는 모습을 봐요', 5000); }
    else { S.tect.tab = 'div'; S.tect.sel = { div: [], sub: [], col: [] }; mapReset(); setView('tect'); showHint('번호 점을 눌러 변성 작용이 일어나는 곳을 골라요', 5000); }
    updateCtl();
  }
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const SRC = '<p style="font-size:13.5px;color:var(--muted);margin-top:6px">※ 온도·압력·거리·단면은 모두 교육용 <b>예시 자료·모식도</b>예요.</p>';
  const tectMsg = () => {
    for (const tab of TABS) if (!S.tect.sel[tab].length) return TECT_DEF[tab].name + ' 단면에서 변성 작용이 일어나는 곳을 아직 고르지 않았어요.';
    for (const tab of TABS) { const sp = TECT_DEF[tab].spots; for (const s of sp) if (S.tect.sel[tab].includes(s.id) && !s.ok) return TECT_DEF[tab].name + ' ' + (sp.indexOf(s) + 1) + '번: ' + s.why; }
    for (const tab of TABS) { const sp = TECT_DEF[tab].spots; for (const s of sp) if (!S.tect.sel[tab].includes(s.id) && s.ok) return TECT_DEF[tab].name + ' 단면에서 변성 작용이 일어나는 곳을 더 찾아봐요. (' + (sp.indexOf(s) + 1) + '번을 살펴봐요)'; }
    return true;
  };

  const levels = [
    {
      title: '열과 압력이 만드는 변화', short: '변성 작용', icon: '🔥', phase: '실험', features: ['grain'],
      intro: '<p class="si-q">❓ 탐구 질문: 같은 암석이 땅속 어디에서 어떤 힘을 받느냐에 따라 왜 다른 암석이 될까?</p>' +
        '<div class="si-link">🔗 <b>중학교 「지권의 변화」와 통합과학에서</b> 변성암은 열과 압력으로 만들어지고, 판의 경계(변동대)에서 지각 변동이 일어난다고 배웠어요.</div>' +
        '<p><b>변성 작용</b>은 암석이 <b>녹지 않은 고체 상태</b>로 열·압력(그리고 활발한 유체)의 영향을 받아 광물 조성이나 조직이 변하는 일이에요. 암석 알갱이를 확대해서 <b>열만</b> 줄 때와 <b>압력까지</b> 줄 때 어떻게 다른지 실험해 봐요.</p>' + SRC,
      setup() { enterLevel(0); },
      recap: '열만 받으면 알갱이가 커지고 치밀해지며(재결정), 한 방향 압력이 더해지면 판 모양 광물이 압력에 수직으로 줄지어 엽리가 생겨요.',
      summary: '<ul><li><b>변성 작용</b>: 암석이 녹지 않은 고체 상태에서 열·압력 등의 영향으로 광물 조성이나 조직이 변하는 것.</li><li>열만 받으면 알갱이가 <b>재결정</b>되어 커지고 치밀해져요. 줄무늬(엽리)는 없어요 → 혼펠스.</li><li>한 방향 압력이 더해지면 판 모양 광물이 <b>압력 방향에 수직</b>으로 줄지어 <b>엽리</b>가 생겨요.</li></ul>',
      missions: [
        {
          title: '열 먼저, 압력은 그다음',
          goal: '압력을 0으로 두고 <b>500 °C 이상</b>으로 가열해 알갱이를 키운 뒤, <b>300 MPa 이상</b>의 압력을 더해 엽리를 만들어요. 그다음 압력 방향도 바꿔 봐요.',
          hint: '① 압력 0 MPa, 온도 500 °C 이상 ② 압력을 300 MPa 이상으로 ③ “위아래에서 눌러요”로 방향 바꾸기. 줄무늬가 따라 돌 때까지 잠깐 기다려요.',
          hold: 0.5, setup() { grainReset(); setView('grain'); },
          status: () => { const G = S.grain; return '열만 가해 재결정 ' + mark(G.heatOnly) + ' · 압력을 더해 엽리 ' + mark(G.foli) + ' · 압력 방향을 바꿔 봄 ' + mark(G.dirTurn); },
          check: () => { const G = S.grain; return G.heatOnly && G.foli && G.dirTurn && G.a >= 0.85; },
          explain: '열만 받으면 알갱이가 <b>재결정</b>되어 커지고 치밀해지지만 줄무늬는 생기지 않아요(혼펠스). 한 방향 압력이 더해지면 판 모양 광물이 압력 방향에 <b>수직</b>으로 줄지어 <b>엽리</b>가 생겨요. 압력 방향이 바뀌니 엽리 방향도 따라 바뀌었지요? 이때 암석은 녹지 않고 고체 상태로 변해요.',
        },
        {
          type: 'quiz', title: '엽리의 방향', goal: '엽리의 방향과 압력의 방향은 어떤 관계이고, 이때 암석은 어떤 상태일까요?', setup() { setView('grain'); },
          choices: ['엽리는 압력 방향과 나란하게 생기고, 암석은 녹았다가 굳어요', '엽리는 압력 방향에 수직으로 생기고, 암석은 고체 상태로 변해요', '엽리는 압력 방향에 수직으로 생기지만, 암석이 완전히 녹아야 해요', '열만 받아도 판 모양 광물이 줄지어 엽리가 생겨요'],
          answer: 1,
          feedback: ['엽리는 압력에 “수직”이고, 변성 작용은 녹지 않은 고체 상태에서 일어나요. 녹았다가 식으면 마그마에서 만들어진 화성암이에요.', '', '방향은 맞아요. 하지만 암석이 완전히 녹으면 변성 작용이 아니라 마그마가 돼요.', '열만 받으면 알갱이만 커져서 엽리 없는 혼펠스가 돼요. 엽리는 한 방향 압력이 있어야 생겨요.'],
          explain: '판 모양 광물(운모 등)이 압력을 받으면 압력 방향에 <b>수직</b>으로 배열해 엽리가 생겨요. 변성 작용은 암석이 <b>녹지 않은 고체 상태</b>에서 일어나요. 열만 있으면 엽리가 없고, 한 방향 압력이 필요해요.',
        },
      ],
    },
    {
      title: '변성암의 종류와 변성도', short: '변성암', icon: '🪜', phase: '분석', features: ['ladder', 'class'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열만 받으면 엽리가 없고, 열과 압력을 함께 받으면 엽리가 생긴다는 것을 확인했어요.</div>' +
        '<p>원암이 같아도 받은 열과 압력의 크기에 따라 변성암이 달라져요. 셰일은 변성도가 높아질수록 <b>점판암 → 천매암 → 편암 → 편마암</b>이 돼요. 석회암·사암은 열을 받으면 <b>대리암·규암</b>이 되고요. 변성도 순서와 엽리의 유무로 변성암을 분류해 봐요.</p>' + SRC,
      setup() { enterLevel(1); },
      recap: '셰일은 변성도가 높아질수록 점판암 → 천매암 → 편암 → 편마암이 되고, 엽리가 있는 암석과 없는 암석(혼펠스·대리암·규암)으로 나눌 수 있어요.',
      summary: '<ul><li>변성도가 높아질수록 알갱이가 커지고 줄무늬가 거칠어져요: <b>점판암 → 천매암 → 편암 → 편마암</b>(편마암은 밝은색·어두운색 띠).</li><li>지시 광물(변성도 낮음 → 높음): 녹니석 → 백운모 → 흑운모 → 석류석 → 규선석.</li>' + tb([['원암', '변성암', '엽리'], ['셰일(이암)', '점판암·천매암·편암·편마암', '있음'], ['셰일(이암)', '혼펠스', '없음'], ['석회암', '대리암', '없음(거의)'], ['사암', '규암', '없음(거의)']]) + '</ul>',
      missions: [
        {
          title: '변성도 순서 정하기', manual: true,
          goal: '점판암·천매암·편암·편마암을 <b>변성도가 낮은 것부터</b> 순서대로 담고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '돋보기 안의 알갱이가 클수록, 줄무늬가 거칠고 띠 모양일수록 변성도가 높아요.',
          setup() { S.lad.ok = false; seqLad.reset(); setView('ladder'); },
          status: () => '담은 암석 ' + seqLad.ids().length + ' / 4',
          check: () => {
            const a = seqLad.ids(); if (a.length < 4) return '네 가지를 모두 담아요.';
            if (a.join() === LAD_ANS) return true;
            const want = LAD_ANS.split(','), i = a.findIndex((x, k) => x !== want[k]);
            return (i + 1) + '번째 자리가 아직 맞지 않아요. ' + (i === 0 ? '알갱이가 가장 작고 얇게 쪼개지는 암석이 변성도가 가장 낮아요.' : '변성도가 높아질수록 알갱이가 커지고 줄무늬가 거칠어져요.');
          },
          explain: '순서는 <b>점판암 → 천매암 → 편암 → 편마암</b>이에요. 변성도가 높을수록 높은 온도에서 변해 알갱이가 커지고 줄무늬가 거칠어지며, 편마암에서는 밝은색·어두운색 띠가 나타나요.',
        },
        {
          title: '엽리 있음 · 없음 나누기', manual: true,
          goal: '변성암 카드 6장을 <b>엽리가 있어요 / 없어요</b> 칸에 나누고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '열과 압력을 함께 받은 광역 변성암은 엽리가 있고, 마그마 열로 굳은(재결정된) 접촉 변성암은 엽리가 없어요.',
          setup() { clsReset(); setView('class'); },
          status: () => '나눈 카드 ' + clsPlaced() + ' / 6',
          check: () => {
            if (clsPlaced() < 6) return '카드 6장을 모두 칸에 놓아요.';
            const bad = clsBoard.cards.filter((c) => (c.zone === 'foli') !== c.def.foli);
            if (!bad.length) return true;
            const c = bad[0].def; return c.name + josa(c.name, '은/는') + ' ' + (c.foli ? '판 모양 광물이 줄지어 있어 엽리가 있는 암석이에요.' : '알갱이가 서로 맞물린 치밀한 암석이라 엽리가 없어요.');
          },
          explain: '<b>엽리가 있는 암석</b>: 점판암·편암·편마암(광역 변성). <b>엽리가 없는 암석</b>: 혼펠스·대리암·규암(주로 마그마의 열로 변성되는 접촉 변성). 대리암·규암은 광역 변성에서도 생길 수 있지만 엽리는 뚜렷하지 않아요.',
        },
        {
          type: 'quiz', title: '대리암에 엽리가 없는 까닭', goal: '석회암이 변성되어 대리암이 될 때 엽리가 거의 생기지 않는 까닭은?', setup() { setView('class'); },
          choices: ['석회암은 열을 받지 않기 때문이에요', '석회암은 방해석 같은 알갱이 모양 광물이 대부분이라, 재결정돼도 줄지어 설 판 모양 광물이 거의 없기 때문이에요', '석회암은 마그마가 식어서 만들어져서 엽리가 생길 수 없어요', '변성암에서는 원암의 종류와 관계없이 엽리가 똑같이 생겨요'],
          answer: 1,
          feedback: ['대리암도 열을 받아 변해요. 열이 방해석 알갱이를 재결정시켜 커지게 만들어요.', '', '석회암은 대개 바다에서 탄산 칼슘이 쌓여 만들어진 퇴적암이에요.', '원암의 광물에 따라 달라요. 판 모양 광물이 많은 셰일은 엽리가 잘 생기고, 방해석(석회암)이나 석영(사암)은 잘 안 생겨요.'],
          explain: '엽리는 <b>판 모양 광물</b>이 줄지어 서야 생겨요. 석회암은 방해석, 사암은 석영처럼 <b>알갱이 모양 광물</b>이 대부분이라 재결정되어도 엽리가 거의 없는 대리암·규암이 돼요.',
        },
      ],
    },
    {
      title: '변성 환경: 온도와 압력', short: '변성 환경', icon: '📈', phase: '모형', features: ['aur', 'pt'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엽리 없는 혼펠스·대리암·규암과, 엽리 있는 점판암~편마암으로 변성암을 나눴어요.</div>' +
        '<p>이 두 무리는 <b>어디에서</b> 만들어질까요? 마그마가 관입한 곳 주변에서는 열이 퍼져 <b>접촉 변성 작용</b>이 일어나고(저압·고온), 넓은 지역이 높은 열과 압력을 받으면 <b>광역 변성 작용</b>이 일어나요. 접촉 변성대의 폭을 재 보고, 압력–온도 그래프에서 변성 환경을 구분해 봐요. 압력은 <b>P = ρgh</b>로 구해요.</p>' + SRC,
      setup() { enterLevel(2); },
      recap: '접촉 변성은 관입체 주변에서만(저압·고온), 광역 변성은 넓은 지역의 높은 압력과 열 아래에서 일어나요(섭입대는 고압·저온, 충돌대는 고압·고온).',
      summary: '<ul><li><b>접촉 변성 작용</b>: 관입한 마그마의 열로 주변 암석이 변해요(저압·고온). 관입체 가까이에만, 멀어질수록 변성도가 줄어요. 엽리 없음 → 혼펠스·대리암·규암.</li><li><b>광역 변성 작용</b>: 넓은 지역이 높은 열과 압력을 받아요. 엽리가 발달해요 → 점판암·편암·편마암.</li><li>압력 <b>P = ρgh</b> (ρ = 2700 kg/m³, g = 10 m/s²) → 깊이 1 km마다 27 MPa, 20 km 깊이는 540 MPa.</li>' + tb([['변성 환경', '깊이', '온도', '압력'], ['접촉 변성(관입체 옆)', '약 3.7 km', '600 °C', '100 MPa'], ['섭입대(해구 쪽)', '30 km', '300 °C', '810 MPa'], ['대륙 충돌대', '40 km', '700 °C', '1080 MPa']]) + '</ul>',
      missions: [
        {
          title: '변성대 끝 찾고 압력 계산하기',
          goal: '마그마를 관입시킨 뒤 탐침을 <b>변성도가 0 %가 되는 가장 가까운 곳</b>에 놓아요. 📈 압력-온도에서 <b>깊이 20 km의 압력(MPa)</b>도 구해 기록해요.',
          hint: '탐침 거리 슬라이더를 움직여 변성도가 0 %가 되는 곳(그래프가 0에 닿는 곳)을 찾아요. 압력은 27 MPa × 20 km, 위쪽 단추에서 📈 압력-온도를 눌러요.',
          hold: 0.5, setup() { aurFull(); S.aur.d = 4; S.pt.rec = null; $('#inP').value = ''; setView('aur'); },
          status: () => '관입을 끝냄 ' + mark(S.aur.done) + ' · 변성대 끝(변성도 0 %)에 탐침 ' + mark(S.aur.done && Math.round(S.aur.d) === 10) + ' · 20 km 압력 기록 ' + mark(ptOk()),
          check: () => S.aur.done && Math.round(S.aur.d) === 10 && ptOk(),
          explain: '변성도는 접촉부에서 멀어질수록 줄어 <b>1.0 km</b>에서 0이 돼요. 이 거리가 접촉 변성대의 폭이에요(마그마 방의 크기에 따라 수백 m~수 km). 깊이 20 km의 압력은 P = ρgh = 2700 × 10 × 20000 = 5.4×10⁸ Pa = <b>540 MPa</b>이에요.',
        },
        {
          title: '환경과 압력-온도 점 짝짓기', manual: true,
          goal: '세 환경(깊이와 온도)에서 압력을 계산해 그래프의 <b>점 A·B·C</b>와 짝지어요. 모두 고르면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '압력 = 27 MPa × 깊이(km). 예를 들어 30 km는 810 MPa이에요. 압력과 온도가 만나는 곳의 점을 찾아봐요.',
          setup() { S.pt.sel = ['', '', '']; setView('pt'); },
          status: () => '고른 환경 ' + S.pt.sel.filter((x) => x).length + ' / 3',
          check: () => {
            const s = S.pt.sel, n = s.findIndex((x) => !x); if (n >= 0) return ENV[n].n + ' 환경의 점을 아직 고르지 않았어요.';
            const w = s.findIndex((x, i) => x !== ENV[i].dot);
            if (w < 0) return true;
            const e = ENV[w]; return e.n + ' ' + e.title + ': 깊이 ' + e.dep + ' km의 압력은 약 ' + e.P + ' MPa이고 온도는 ' + e.T + ' °C예요. 그 값이 만나는 점을 찾아봐요.';
          },
          explain: '① 접촉 변성: 얕은 곳(약 100 MPa)이지만 마그마 열로 600 °C → <b>저압·고온</b>(점 B). ② 섭입대: 차가운 판이 깊이 내려가 810 MPa, 300 °C → <b>고압·저온</b>(점 A). ③ 대륙 충돌대: 40 km, 1080 MPa, 700 °C → <b>고압·고온</b>(점 C).',
        },
        {
          type: 'quiz', title: '접촉 변성은 왜 관입체 주변에만?', goal: '접촉 변성 작용이 마그마 관입체 <b>주변에만</b> 나타나는 까닭은?', setup() { setView('aur'); },
          choices: ['열이 마그마에서 멀어질수록 빨리 식어, 변성될 만큼 뜨거운 곳이 관입체 가까이에만 생기기 때문이에요', '마그마가 주변 암석을 모두 녹여 버리기 때문이에요', '관입체가 클수록 한 방향 압력이 커져서 멀리까지 엽리가 생기기 때문이에요', '접촉 변성은 판이 충돌하는 곳에서만 일어나기 때문이에요'],
          answer: 0,
          feedback: ['', '변성 작용은 암석이 녹지 않은 상태에서 일어나요. 주변 암석이 녹으면 마그마가 돼요.', '접촉 변성은 한 방향 압력이 작은 환경이라 엽리가 없어요. 영향 범위는 열이 퍼지는 거리가 정해요.', '판의 충돌은 넓은 지역에 광역 변성 작용을 일으켜요. 접촉 변성은 마그마 가까이에서 일어나요.'],
          explain: '접촉 변성은 마그마의 <b>열</b>이 주변 암석에 전달되어 일어나요. 열은 멀어질수록 줄어서 변성이 일어나는 구역(접촉 변성대)이 관입체 주변에만 생기고, 마그마 방이 클수록 더 넓어요.',
        },
      ],
    },
    {
      title: '변동대와 변성암', short: '변동대', icon: '🌍', phase: '적용', features: ['tect', 'map'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 접촉 변성은 저압·고온, 광역 변성은 섭입대(고압·저온)와 충돌대(고압·고온)에서 일어난다는 것을 알았어요.</div>' +
        '<p>이제 <b>판의 경계(변동대)</b> 단면에서 변성 작용이 활발한 곳을 찾아봐요. 그리고 지금은 판의 경계가 아닌 대륙 안쪽에서 발견되는 변성암이 <b>옛 변동대</b>의 흔적인 까닭을 시간 순서로 따라가 봐요.</p>' + SRC,
      setup() { enterLevel(3); },
      recap: '변성 작용은 주로 수렴 경계(섭입대·충돌대)에서 활발하고, 깊은 곳의 변성암은 융기와 침식으로 지표에 드러나 옛 변동대의 흔적이 돼요.',
      summary: '<ul>' + tb([['변동대', '변성 작용'], ['발산 경계(해령)', '마그마·열수의 영향으로 약한 변성'], ['섭입대', '해구 쪽 고압·저온, 화산호 쪽 저압·고온의 두 변성대가 나란히 생겨요'], ['대륙 충돌대', '두꺼워진 지각 깊은 곳에서 고압·고온 광역 변성, 관입한 마그마 주변에서 접촉 변성']]) + '<li>변성암은 깊은 곳에서 만들어지고, <b>융기와 침식</b>으로 지표에 드러나요.</li><li>지금 판의 경계에서 먼 곳의 편마암·편암은 <b>과거 변동대의 흔적</b>이에요.</li></ul>',
      missions: [
        {
          title: '변성 작용이 일어나는 곳 찾기', manual: true,
          goal: '발산·섭입·충돌 단면에서 <b>변성 작용이 일어나는 곳</b>의 번호 점을 모두 눌러요. 세 단면을 모두 고른 뒤 <b>✔ 확인하기</b>를 눌러요.',
          hint: '열과 압력이 큰 곳을 찾아요. 오른쪽 단추로 발산·섭입·충돌 단면을 바꿔요. 화산 꼭대기(지표)나 열과 압력이 작은 곳은 아니에요.',
          setup() { S.tect.sel = { div: [], sub: [], col: [] }; S.tect.tab = 'div'; setView('tect'); },
          status: () => '고른 곳: 해령 ' + S.tect.sel.div.length + ' · 섭입대 ' + S.tect.sel.sub.length + ' · 충돌대 ' + S.tect.sel.col.length,
          check: () => tectMsg(),
          explain: '<b>해령</b>: 마그마와 열수 주변의 약한 변성. <b>섭입대</b>: 해구 쪽 섭입하는 판은 고압·저온, 화산호 아래는 고온 변성. <b>충돌대</b>: 두꺼워진 지각 깊은 곳은 고압·고온의 광역 변성, 관입한 화강암체 둘레는 접촉 변성. 변성암은 깊은 곳에서 만들어지고 지표에서 용암이 식는 곳이나 얕고 먼 곳은 변성이 거의 없어요.',
        },
        {
          title: '옛 변동대의 변성암 띠',
          goal: '🗺 옛 변동대에서 시간을 <b>현재</b>까지 흘려보내고, 대륙 안쪽의 <b>변성암 띠</b>를 눌러 옛 변동대로 표시해요.',
          hint: '⏵ 재생을 누르거나 시간 슬라이더를 오른쪽 끝으로 옮겨요. 줄무늬(엽리)가 나란한 보라색 띠를 눌러요.',
          hold: 0.4, setup() { mapReset(); setView('map'); },
          status: () => '현재까지 흘려보냄 ' + mark(S.map.t >= 0.9) + ' · 변성암 띠 표시 ' + mark(S.map.marked),
          check: () => S.map.marked && S.map.t >= 0.9,
          explain: '두 대륙이 충돌하면서 가운데 지각이 두꺼워지고 깊은 곳에서 고압·고온의 광역 변성 작용이 일어나 줄무늬가 있는 변성암 띠가 생겼어요. 엽리는 충돌 때의 압력에 <b>수직</b>이에요. 오랜 시간 융기와 침식이 계속되어 그 변성암이 지표에 드러났고, 지금은 판의 경계에서 멀어졌어도 <b>옛 변동대의 흔적</b>으로 남았어요.',
        },
        {
          type: 'quiz', title: '판 경계에서 먼 곳의 편마암', goal: '지금 판의 경계에서 멀리 떨어진 대륙 안쪽에도 편마암이 있는 까닭은?', setup() { setView('map'); },
          choices: ['편마암은 원래 지표에서 햇빛의 열로 만들어지기 때문이에요', '과거에 그곳이 변동대(예: 대륙 충돌대)였고, 깊은 곳에서 변성된 암석이 융기와 침식으로 지표에 드러났기 때문이에요', '판의 경계는 언제나 같은 자리에 있기 때문이에요', '편마암은 화산이 분출할 때 지표에서 만들어지기 때문이에요'],
          answer: 1,
          feedback: ['편마암은 깊은 땅속에서 높은 열과 압력으로 만들어져요. 햇빛 정도의 열로는 변성되지 않아요.', '', '판의 경계는 판이 움직이면서 달라져요. 과거의 경계가 지금은 대륙 안쪽에 있을 수 있어요.', '화산 분출로 만들어지는 것은 화성암이에요. 편마암은 변성암이고 땅속 깊은 곳에서 만들어져요.'],
          explain: '편마암 같은 변성암은 <b>깊은 땅속</b>에서 만들어져요. 과거에 변동대였던 곳의 변성암이 <b>융기와 침식</b>으로 지표에 드러나, 지금은 판의 경계에서 멀어도 옛 변동대의 흔적으로 남아요. 우리나라에도 이런 편마암 지대가 있어요(다음 차시 「한반도 암석과 지질공원」).',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-metamorphism', mount: '#game', badge: '변성암 탐정', homeHref: '../../index.html#he',
    featureLabels: { grain: '🔍 입자 모형 · 온도/압력 슬라이더', ladder: '🪜 변성도 사다리', class: '🗂 엽리 유무 분류 카드', aur: '🌋 접촉 변성대 단면 · 탐침', pt: '📈 압력-온도 그래프 · P = ρgh', tect: '🌍 판 경계 단면 · 번호 점', map: '🗺 옛 변동대 지도 · 시간 슬라이더' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    S.lad.ok = seqLad.ids().join() === LAD_ANS;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eef2f7'; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'grain') drawGrain(t, dt);
    else { grainStep(dt); if (S.view === 'ladder') drawLadder(t, dt); else if (S.view === 'class') drawClass(t, dt); else if (S.view === 'aur') drawAureole(t, dt); else if (S.view === 'pt') drawPT(t, dt); else if (S.view === 'tect') drawTect(t, dt); else drawMap(t, dt); }
    parts.draw(ctx);
    drawFlash(dt, PHONE ? 10 : VH - 96);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,247,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, AUR, MP, TP, PT, TECT_DEF, ENV, LAD, CLS_DEF, clsBoard, seqLad, grainReset, aurRun, aurFull, mapReset, mapPlay, setView, updateCtl, enterLevel, ptRecord, tectMsg, mapTap, tectTap, tpx, tpy, beltPts,
    get game() { return game; },
  };

})();
