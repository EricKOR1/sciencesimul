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
     지구과학 Ⅱ. 지구의 역사와 한반도의 암석 - 지층의 선후 관계
     [12지구02-01] 지층 형성의 선후 관계를 결정짓는 법칙들로 상대 연령을 비교
     ① 동일 과정: 수평퇴적·지층누중, 퇴적 속도   ② 관입·포획   ③ 부정합   ④ 층서 대비
     ========================================================= */
  initStage('#eaf3f8', 800, 560, 600, 840, 1.25);
  const rad = (d) => (d * Math.PI) / 180;
  const f0 = (x) => String(Math.round(x));
  const setTw = (obj, prop, val, dur, ease) => SciSim.tween(obj, { [prop]: val }, { duration: dur, ease: ease || 'outCubic' });
  const gcl = { ink: '#334155', mute: '#64748b', good: '#15803d', bad: '#b91c1c', blue: '#0369a1' };

  const S = {
    view: 'box', clock: 0, fade: 0,
    box: { tilt: 0, tiltT: 0, th0: 0, depTilt: null, layers: [], fall: [], pour: null, acc: 0, def: 0, defTw: null, solid: false, kinds: {}, sndT: 0 },
    rate: { thick: 30, thickD: 30, env: 'deep', rec: { deep: null, delta: null }, stamp: { deep: 0, delta: 0 } },
    intr: { p: 0, tw: null, done: false, ran: false, pick: null, bad: false },
    cases: { sel: 0, ans: [null, null, null], shake: 0 },
    unc: { u: 0, uT: 0, play: false, seen: 0, seqOn: false },
    types: { ans: [null, null, null] },
    corr: { target: 'tuff', picked: { tuff: [null, null, null], amm: [null, null, null] }, done: { tuff: false, amm: false }, line: { tuff: 0, amm: 0 }, gapFound: false, gapOn: false, shake: null, shakeT: 0 },
    secA: { ids: [] },
  };
  let game = null;

  /* ---------- 장면 배치 ---------- */
  const BOX = PHONE ? { cx: 300, cy: 262, s: 300 } : { cx: 218, cy: 284, s: 268 };
  const LH = BOX.s * 0.19;
  const MAXL = 5;
  const INFO = PHONE ? { x: 12, y: 500, w: 576, h: 328 } : { x: 504, y: 12, w: 284, h: 536 };
  const SED = {
    gravel: { name: '자갈', kind: 'gravel', col: '#8f8a82', vy: 330, n: 64, dur: 0.9, r: [2.6, 4.2] },
    sand: { name: '모래', kind: 'sand', col: '#dcb55a', vy: 230, n: 90, dur: 1.2, r: [1.3, 2] },
    clay: { name: '점토', kind: 'clay', col: '#b4694a', vy: 125, n: 100, dur: 1.5, r: [0.9, 1.5] },
  };

  /* =========================================================
     장면 1: 퇴적 상자 (수평퇴적의 법칙 · 지층누중의 법칙)
     ========================================================= */
  function boxGeom() {
    const B = S.box, locked = B.layers.length > 0;
    const th = locked ? B.th0 : rad(B.tilt), s = BOX.s, c = Math.cos(th), sn = Math.sin(th);
    const P = (u, v) => [BOX.cx + u * c - v * sn, BOX.cy + u * sn + v * c];
    const poly = [P(-s / 2, -s / 2), P(s / 2, -s / 2), P(s / 2, s / 2), P(-s / 2, s / 2)];
    const yLow = Math.max(...poly.map((p) => p[1]));
    return { th, poly, yLow, P, s };
  }
  const boxH = () => S.box.layers.reduce((a, l) => a + l.h, 0);
  function boxPour(k) {
    const B = S.box;
    if (B.pour || B.layers.length >= MAXL || B.def > 0.5) return false;
    if (!B.layers.length) { B.th0 = rad(B.tilt); B.depTilt = B.tilt; B.tiltT = B.tilt; }
    const sd = SED[k], layer = { k, h: 0, landed: 0, N: sd.n, seed: 11 + B.layers.length * 7 };
    B.layers.push(layer); B.kinds[k] = true;
    B.pour = { layer, emitted: 0, T: 0, sd };
    Sound.click(); return true;
  }
  function boxReset() {
    const B = S.box;
    if (B.defTw) B.defTw.cancel(); B.defTw = null;
    B.layers = []; B.fall = []; B.pour = null; B.acc = 0; B.def = 0; B.solid = false; B.kinds = {}; B.depTilt = null; B.th0 = 0;
    parts.clear();
  }
  function boxDeform() {
    const B = S.box;
    if (!B.layers.length || B.pour || B.def > 0.5 || B.solid) return;
    B.solid = true; Sound.click();
    B.defTw = SciSim.tween(B, { def: 22 }, { duration: 1.5, ease: 'inOutQuad', onDone() { B.defTw = null; Sound.success(); const g = boxGeom(); parts.burst(BOX.cx, BOX.cy, { count: 14, speed: 120, colors: ['#94a3b8', '#e2e8f0'], gravity: 160, life: 0.7 }); } });
  }
  function chordAt(poly, y) {
    const xs = [];
    for (let i = 0; i < 4; i++) {
      const a = poly[i], b = poly[(i + 1) % 4];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    return xs.length >= 2 ? [Math.min(...xs), Math.max(...xs)] : null;
  }
  function updateBox(dt) {
    const B = S.box, g = boxGeom();
    if (!B.layers.length) B.tilt = approach(B.tilt, B.tiltT, dt, 9);
    // 퇴적물 방울 내보내기
    const pr = B.pour;
    if (pr) {
      pr.T += dt;
      const want = Math.min(pr.sd.n, Math.floor((pr.T / pr.sd.dur) * pr.sd.n));
      while (pr.emitted < want) {
        pr.emitted++;
        const u = (Math.random() - 0.5) * 0.56 * g.s, p0 = g.P(u, -g.s / 2 + 3);
        B.fall.push({ x: p0[0], y: p0[1], vy: pr.sd.vy * (0.85 + Math.random() * 0.3), r: pr.sd.r[0] + Math.random() * (pr.sd.r[1] - pr.sd.r[0]), sd: pr.sd, slide: null, ph: Math.random() * 6, layer: pr.layer });
      }
    }
    const level = g.yLow - boxH();
    for (let i = B.fall.length - 1; i >= 0; i--) {
      const p = B.fall[i];
      let landed = false;
      if (!p.slide) {
        const ny = p.y + p.vy * dt, nx = p.x + (p.sd.kind === 'gravel' ? 0 : Math.sin(S.clock * 3 + p.ph) * 6 * dt);
        if (ny >= level) { p.y = Math.min(ny, level); p.x = nx; landed = true; }
        else if (!pointInPoly(nx, ny, g.poly)) {
          // 벽에 닿으면 벽을 따라 미끄러져요
          let best = null;
          for (let e = 0; e < 4; e++) {
            const a = g.poly[e], b = g.poly[(e + 1) % 4];
            let dx = b[0] - a[0], dy = b[1] - a[1]; if (dy < 0) { dx = -dx; dy = -dy; }
            const L = Math.hypot(dx, dy); if (dy / L < 0.08) continue;
            const ex = a[0] + ((p.y - a[1]) / (b[1] - a[1] || 1)) * (b[0] - a[0]);
            const d = Math.abs(ex - p.x); if (!best || d < best.d) best = { d, ux: dx / L, uy: dy / L };
          }
          if (best) p.slide = best; else landed = true;
        } else { p.x = nx; p.y = ny; }
      } else {
        const sp = p.vy * 0.8;
        p.x += p.slide.ux * sp * dt; p.y += p.slide.uy * sp * dt;
        if (p.y >= level) { p.y = level; landed = true; }
      }
      if (landed) { p.layer.landed++; p.layer.h = (LH * p.layer.landed) / p.layer.N; B.fall.splice(i, 1); }
    }
    if (pr && pr.emitted >= pr.sd.n && !B.fall.some((p) => p.layer === pr.layer)) {
      pr.layer.landed = pr.layer.N; pr.layer.h = LH; B.pour = null; Sound.tick();
    }
  }
  /* 상자 안 좌표(띠 좌표계: 퇴적 당시 수평) -> 화면 좌표 */
  function bandToWorld(u, v) {
    const B = S.box, a = rad(0) + (boxGeom().th - B.th0) + rad(B.def), c = Math.cos(a), sn = Math.sin(a);
    return [BOX.cx + u * c - v * sn, BOX.cy + u * sn + v * c];
  }
  function drawBox(t) {
    const B = S.box, g = boxGeom(), s = g.s, def = rad(B.def);
    const th0 = B.layers.length ? B.th0 : g.th;
    // 바닥 받침
    D.shadow(() => { ctx.fillStyle = '#cbd5e1'; rr(BOX.cx - s * 0.5, BOX.cy + s * 0.74, s * 1.0, 14, 7).fill(); }, { blur: 6, y: 2 });
    // 수평선 (세계 기준)
    const hy = g.yLow - boxH();
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(2,132,199,.7)'; ctx.lineWidth = 2;
    if (B.layers.length && B.def < 0.5) { ctx.beginPath(); ctx.moveTo(BOX.cx - s * 0.95, hy); ctx.lineTo(BOX.cx + s * 0.95, hy); ctx.stroke(); }
    ctx.restore();
    if (B.def >= 0.5) {
      const hy2 = BOX.cy; ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(2,132,199,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(BOX.cx - s * 0.95, hy2); ctx.lineTo(BOX.cx + s * 0.95, hy2); ctx.stroke(); ctx.restore();
    }
    // 상자 본체
    ctx.save(); ctx.translate(BOX.cx, BOX.cy); ctx.rotate(g.th + def);
    D.shadow(() => { ctx.fillStyle = '#d7ecf7'; ctx.fillRect(-s / 2, -s / 2, s, s); }, { blur: 12, y: 5 });
    ctx.save(); ctx.beginPath(); ctx.rect(-s / 2, -s / 2, s, s); ctx.clip();
    const wg = ctx.createLinearGradient(0, -s / 2, 0, s / 2); wg.addColorStop(0, '#cdeaf8'); wg.addColorStop(1, '#a9d6ee');
    ctx.fillStyle = wg; ctx.fillRect(-s / 2, -s / 2, s, s);
    // 퇴적층
    ctx.rotate(-th0);
    const yl = (s / 2) * (Math.cos(th0) + Math.abs(Math.sin(th0)));
    let H = 0;
    B.layers.forEach((l) => {
      if (l.h <= 0.01) { return; }
      const y1 = yl - H, y2 = yl - H - l.h; H += l.h;
      ctx.beginPath(); ctx.rect(-s, y2, s * 2, y1 - y2); ctx.fillStyle = LITH_BASE[SED[l.k].kind]; ctx.fill();
      ctx.fillStyle = lithFill(SED[l.k].kind); ctx.fill();
      if (B.solid) { ctx.fillStyle = 'rgba(80,60,40,.10)'; ctx.fill(); }
      ctx.strokeStyle = 'rgba(30,20,10,.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-s, y2); ctx.lineTo(s, y2); ctx.stroke();
    });
    ctx.restore();
    // 유리 테두리와 하이라이트
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(71,85,105,.85)'; ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(-s / 2 + 10, -s / 2 + 12); ctx.lineTo(-s / 2 + 10, s / 2 - 30); ctx.stroke();
    // 투입구
    ctx.fillStyle = '#64748b'; ctx.fillRect(-26, -s / 2 - 7, 52, 9); ctx.fillStyle = '#94a3b8'; ctx.fillRect(-18, -s / 2 - 11, 36, 5);
    ctx.restore();
    // 떨어지는 알갱이
    B.fall.forEach((p) => { ctx.fillStyle = p.sd.col; if (p.sd.kind === 'gravel') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(40,30,20,.6)'; ctx.lineWidth = 1; ctx.stroke(); } else ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); });
    // 기울기 각도 표시 (가장 낮은 모서리에서 수평선과 상자 바닥 사이)
    if (B.def < 0.5 && g.th > 0.03) {
      const low = g.poly.reduce((a, p) => (p[1] > a[1] ? p : a), g.poly[0]);
      ctx.save(); ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(low[0], low[1], 38, Math.PI, Math.PI + g.th); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(2,132,199,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(low[0] - 60, low[1]); ctx.lineTo(low[0] + 12, low[1]); ctx.stroke(); ctx.restore();
      D.label(low[0] - 50, low[1] + 18, f0(B.layers.length ? (B.th0 * 180) / Math.PI : B.tilt) + '°', { bg: '#e0f2fe', color: '#075985', size: 13, pad: 6 });
    }
    // 층 이름표 (층 가운데 높이, 상자 오른쪽 바깥)
    H = 0;
    B.layers.forEach((l, i) => {
      if (l.h <= 0.01) return;
      const y1 = yl - H, y2 = yl - H - l.h, vm = (y1 + y2) / 2; H += l.h;
      // 띠 좌표계에서 상자(th0만큼 기운 정사각형)의 가로 현
      const A = [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [-s / 2, s / 2]].map(([u, v]) => [u * Math.cos(th0) - v * Math.sin(th0), u * Math.sin(th0) + v * Math.cos(th0)]);
      const ch = chordAt(A, vm); if (!ch) return;
      const w = bandToWorld(ch[1] + 8, vm);
      const nm = ['①', '②', '③', '④', '⑤'][i] + ' ' + SED[l.k].name;
      D.label(w[0], w[1], nm, { bg: '#fff', color: '#334155', size: 13, pad: 7, border: '#94a3b8', align: 'left' });
    });
    // 시간 화살표
    if (B.layers.length >= 1) {
      const ax = BOX.cx - s * 0.74 - (PHONE ? 6 : 0);
      D.arrow(ax, BOX.cy + s * 0.34, ax, BOX.cy - s * 0.34, { color: '#7c3aed', width: 3, head: 12 });
      tx(ax, BOX.cy - s * 0.34 - 8, '나중', 13, '#6d28d9', 'center', 800);
      tx(ax, BOX.cy + s * 0.34 + 18, '먼저', 13, '#6d28d9', 'center', 800);
    }
    // 정보 판
    panel(INFO.x, INFO.y, INFO.w, INFO.h, { title: '수평퇴적 · 지층누중', border: '#bae6fd' });
    let yy = INFO.y + 46;
    const surf = B.def >= 0.5 ? Math.round(B.def) : 0;
    const dep = B.depTilt != null ? Math.round(B.depTilt) : Math.round(B.tilt);
    const rows = [['상자 기울기', (B.layers.length ? dep : Math.round(B.tilt)) + '°'], ['지층면 (수평면 기준)', B.layers.length ? (surf ? surf + '° 기울어짐' : '0° 수평') : '—'], ['상자 바닥 기준', B.layers.length ? (surf ? '—' : dep + '° 어긋남') : '—']];
    rows.forEach((r) => { tx(INFO.x + 14, yy, r[0], 14, gcl.mute, 'left', 700); tx(INFO.x + INFO.w - 14, yy, r[1], 15, gcl.ink, 'right', 800); yy += PHONE ? 22 : 26; });
    let msg;
    if (!B.layers.length) msg = '상자를 기울인 뒤 자갈·모래·점토를 흘려 넣어 보세요. 가라앉은 알갱이는 어떤 모양으로 쌓일까요?';
    else if (B.def >= 0.5) msg = '쌓일 때는 수평이던 지층면이 지금은 ' + surf + '° 기울어 있어요. 기울어진 지층은 쌓인 뒤에 땅이 변형된 거예요.';
    else if (B.solid) msg = '층이 굳어 단단한 암석이 됐어요.';
    else if (dep >= 1) msg = '상자는 ' + dep + '° 기울었어도 지층면은 수평이에요. 퇴적물은 중력 때문에 수평하게 쌓여요(수평퇴적의 법칙).';
    else msg = '퇴적물은 중력 때문에 수평하게 쌓이고, 아래층이 위층보다 먼저 쌓였어요(지층누중의 법칙).';
    note(INFO.x + 10, yy + 4, INFO.w - 20, msg, 13.5, { bg: '#f0f9ff', border: '#bae6fd' });
    // 쌓인 순서 목록 (위가 나중)
    const ly = INFO.y + (PHONE ? 168 : 250), rh = PHONE ? 25 : 30;
    tx(INFO.x + 14, ly, '쌓인 순서 (위가 가장 나중)', 13.5, gcl.mute, 'left', 800);
    for (let i = 0; i < MAXL; i++) {
      const idx = B.layers.length - 1 - i, yb = ly + 12 + i * rh;
      ctx.save(); ctx.globalAlpha = idx >= 0 ? 1 : 0.4;
      rr(INFO.x + 14, yb, INFO.w - 28, rh - 4, 7); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.4; ctx.stroke();
      if (idx >= 0) {
        const l = B.layers[idx]; rr(INFO.x + 18, yb + 3, 36, rh - 10, 5); ctx.save(); ctx.clip(); ctx.fillStyle = lithFill(SED[l.k].kind); ctx.fillRect(INFO.x + 18, yb + 3, 36, rh - 10); ctx.restore();
        tx(INFO.x + 62, yb + rh - 8, ['①', '②', '③', '④', '⑤'][idx] + ' ' + SED[l.k].name + (idx === B.layers.length - 1 && B.layers.length > 1 ? '  (가장 젊음)' : idx === 0 && B.layers.length > 1 ? '  (가장 오래됨)' : ''), 13.5, gcl.ink, 'left', 800);
      } else tx(INFO.x + 62, yb + rh - 8, '비어 있음', 13, gcl.mute, 'left', 700);
      ctx.restore();
    }
  }

  /* =========================================================
     장면 2: 퇴적 속도와 걸린 시간 (동일 과정의 원리)
     ========================================================= */
  const RATES = { deep: { name: '심해 점토', kind: 'clay', mmPerYr: 0.001, label: '1 mm / 천 년', col: '#2563eb' }, delta: { name: '삼각주 모래', kind: 'sand', mmPerYr: 1, label: '1 mm / 년', col: '#d97706' } };
  const rateMan = (env, thick) => (thick * 1000) / RATES[env].mmPerYr / 10000;      // 만 년
  const fmtMan = (v) => (v < 1 ? f0(v * 10) + '천 년' : v >= 1000 && v % 1000 === 0 ? v / 1000 + '천만 년' : (Math.round(v * 10) / 10 === Math.round(v) ? comma(v) : f1(v)) + '만 년');
  const RT = PHONE ? { x1: 118, x2: 352, w: 128, base: 640, per: 11.2 } : { x1: 118, x2: 318, w: 116, base: 500, per: 8.4 };
  function recordRate() {
    const R = S.rate, inp = $('#inYr');
    const v = parseFloat(String(inp.value).replace(/,/g, '').replace(',', '.'));
    if (isNaN(v)) { Sound.fail(); say('걸린 시간을 숫자(만 년)로 써요.', true, 2.2); return; }
    const exp = rateMan(R.env, R.thick);
    if (Math.abs(v - exp) <= Math.max(0.01, exp * 0.01)) {
      R.rec[R.env] = { thick: R.thick, val: exp }; R.stamp[R.env] = 1; inp.value = ''; Sound.success();
      parts.burst(R.env === 'deep' ? RT.x1 + RT.w / 2 : RT.x2 + RT.w / 2, RT.base - R.thick * RT.per - 20, { count: 16, speed: 150, colors: [RATES[R.env].col, '#fff', '#fde68a'] });
      say(RATES[R.env].name + ' ' + R.thick + ' m: ' + fmtMan(exp) + ' 이 걸려요.', false, 2.6);
    } else { Sound.fail(); say(R.thick + ' m = ' + R.thick * 1000 + ' mm 이고, 속도는 ' + RATES[R.env].label + ' 예요. (두께 ÷ 속도) 다시 계산해 봐요.', true, 3.4); }
    updateCtl();
  }
  function drawRate(t, dt) {
    const R = S.rate; R.thickD = approach(R.thickD, R.thick, dt, 7);
    // 배경: 수면과 물
    const top = PHONE ? 70 : 70;
    ['deep', 'delta'].forEach((env, i) => {
      const x = i ? RT.x2 : RT.x1, rt = RATES[env];
      const hpx = R.thickD * RT.per, ytop = RT.base - hpx;
      // 물
      const wg = ctx.createLinearGradient(0, top, 0, RT.base); wg.addColorStop(0, i ? '#cdeefb' : '#8fc6e6'); wg.addColorStop(1, i ? '#a8dcf2' : '#2f6fa6');
      ctx.fillStyle = wg; ctx.fillRect(x - 18, top, RT.w + 36, ytop - top);
      for (let k = 0; k < 3; k++) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); for (let xx = 0; xx <= RT.w + 36; xx += 6) { const yy = top + 6 + k * 3 + Math.sin(xx / 14 + t * 2 + k) * 2.5; xx ? ctx.lineTo(x - 18 + xx, yy) : ctx.moveTo(x - 18 + xx, yy); } ctx.stroke(); if (k === 0) break; }
      // 퇴적 기둥
      ctx.save(); rr(x, ytop, RT.w, hpx, 3).clip();
      ctx.fillStyle = LITH_BASE[rt.kind]; ctx.fillRect(x, ytop, RT.w, hpx); ctx.fillStyle = lithFill(rt.kind); ctx.fillRect(x, ytop, RT.w, hpx);
      for (let m = 5; m < R.thickD; m += 5) { const yy = RT.base - m * RT.per; ctx.strokeStyle = 'rgba(40,30,20,.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + RT.w, yy); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.4; rr(x, ytop, RT.w, hpx, 3).stroke();
      // 이름표와 두께 괄호
      D.label(x + RT.w / 2, top + 22, (i ? '🏝️ ' : '🌊 ') + rt.name, { bg: rt.col, color: '#fff', size: 14, pad: 9 });
      D.label(x + RT.w / 2, top + 50, rt.label, { bg: '#fff', color: rt.col, size: 13.5, pad: 8, border: rt.col });
      const bx = x + RT.w + 10; ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx - 4, ytop); ctx.lineTo(bx, ytop); ctx.lineTo(bx, RT.base); ctx.lineTo(bx - 4, RT.base); ctx.stroke();
      // 시간 이름표
      const rec = R.rec[env], known = rec && rec.thick === R.thick;
      const ty = Math.min(RT.base - hpx / 2, RT.base - 16);
      const lab = known ? fmtMan(rec.val) : '? 만 년';
      const sc = 1 + R.stamp[env] * 0.25;
      R.stamp[env] = approach(R.stamp[env], 0, dt, 5);
      ctx.save(); ctx.translate(x + RT.w / 2, ty); ctx.scale(sc, sc);
      D.label(0, 0, '⏱ ' + lab, { bg: known ? '#15803d' : '#475569', color: '#fff', size: 15, pad: 10 });
      ctx.restore();
    });
    // 눈금 (왼쪽)
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(RT.x1 - 24, RT.base); ctx.lineTo(RT.x1 - 24, RT.base - 50 * RT.per); ctx.stroke();
    for (let m = 0; m <= 50; m += 10) { const yy = RT.base - m * RT.per; ctx.beginPath(); ctx.moveTo(RT.x1 - 30, yy); ctx.lineTo(RT.x1 - 24, yy); ctx.stroke(); tx(RT.x1 - 34, yy + 4.5, m + ' m', 12.5, gcl.mute, 'right', 700); }
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(RT.x1 - 20, RT.base + 1.5); ctx.lineTo(RT.x2 + RT.w + 20, RT.base + 1.5); ctx.stroke();
    // 정보 판
    const IR = PHONE ? { x: 12, y: 672, w: 576, h: 156 } : { x: 504, y: 12, w: 284, h: 536 };
    panel(IR.x, IR.y, IR.w, IR.h, { title: '동일 과정의 원리', border: '#bae6fd' });
    note(IR.x + 10, IR.y + 36, IR.w - 20, '현재 쌓이는 속도로 과거를 가늠해요. 걸린 시간 = 두께 / 퇴적 속도', 13.5, { bg: '#f0f9ff', border: '#bae6fd' });
    if (!PHONE) {
      const lines = [['두께', R.thick + ' m = ' + comma(R.thick * 1000) + ' mm'], ['심해 점토 (1 mm / 천 년)', R.rec.deep && R.rec.deep.thick === R.thick ? fmtMan(R.rec.deep.val) : '? 만 년'], ['삼각주 모래 (1 mm / 년)', R.rec.delta && R.rec.delta.thick === R.thick ? fmtMan(R.rec.delta.val) : '? 만 년']];
      lines.forEach((l, i) => { const y = IR.y + 148 + i * 52; tx(IR.x + 14, y, l[0], 13.5, gcl.mute, 'left', 700); tx(IR.x + 14, y + 24, l[1], 18, gcl.ink, 'left', 800); });
      note(IR.x + 10, IR.y + 330, IR.w - 20, '퇴적 속도는 환경마다 달라요. 또 같은 곳에서도 홍수나 가뭄에 따라 일정하지 않아서, 이렇게 구한 시간은 어림값이에요.', 13, { bg: '#fff7e0', border: '#f2d38a' });
    }
    dataTag(RT.x1 + 2, RT.base + 26, '예시 자료', 'left');
  }


  /* =========================================================
     장면 3: 관입 (관입의 법칙 · 포획)
     ========================================================= */
  const IB = PHONE ? { x: 24, y: 128, w: 552, h: 380 } : { x: 24, y: 112, w: 460, h: 400 };
  const IL = { ls: [0, 0.27], ss: [0.27, 0.58], sh: [0.58, 1] };                // 층 경계 (IB.h 비율)
  const dikeX = (y) => IB.x + IB.w * 0.58 + Math.sin(y / 44) * IB.w * 0.014;
  const dikeHW = (y) => IB.w * (0.034 + 0.008 * ((y - IB.y) / IB.h));
  const XEN = [   // 포획암: 중심 y(비율), 가로 어긋남, 크기, 모양, 암석
    { fy: 0.84, dx: -0.2, s: 1.0, k: 'shale', pts: [[-9, -5], [2, -9], [9, -1], [5, 8], [-6, 7]] },
    { fy: 0.70, dx: 0.25, s: 0.8, k: 'shale', pts: [[-8, -4], [3, -8], [8, 2], [-1, 7], [-7, 4]] },
    { fy: 0.43, dx: -0.1, s: 0.8, k: 'sand', pts: [[-7, -6], [6, -5], [8, 4], [-2, 8], [-8, 2]] },
  ];
  function dikePoly(yTop) {
    const L = [], Rr = [];
    for (let y = IB.y + IB.h; y >= Math.max(yTop, IB.y) - 0.01; y -= 8) { L.push([dikeX(y) - dikeHW(y), y]); Rr.push([dikeX(y) + dikeHW(y), y]); }
    const yl = Math.max(yTop, IB.y); L.push([dikeX(yl) - dikeHW(yl), yl]); Rr.push([dikeX(yl) + dikeHW(yl), yl]);
    return L.concat(Rr.reverse());
  }
  function sky(y0, y1, t) {
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#9fd3f2'); g.addColorStop(1, '#e3f3fb'); ctx.fillStyle = g; ctx.fillRect(0, y0, VW, y1 - y0);
    D.glow(IB.x + IB.w - 50, y0 + 44, 50, '#fde68a', 0.8); D.sphere(IB.x + IB.w - 50, y0 + 44, 17, '#fbbf24', { gloss: false });
  }
  function strataBlock() {
    ['ls', 'ss', 'sh'].forEach((k) => {
      const y1 = IB.y + IB.h * IL[k][0], y2 = IB.y + IB.h * IL[k][1], kind = { ls: 'lime', ss: 'sand', sh: 'shale' }[k];
      ctx.beginPath(); ctx.rect(IB.x, y1, IB.w, y2 - y1); ctx.fillStyle = LITH_BASE[kind]; ctx.fill(); fillLith(kind);
      ctx.strokeStyle = 'rgba(30,25,20,.45)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(IB.x, y2); ctx.lineTo(IB.x + IB.w, y2); ctx.stroke();
    });
  }
  function drawIntr(t, dt) {
    const I = S.intr;
    sky(0, IB.y, t);
    ctx.fillStyle = '#7fbf5a'; ctx.fillRect(IB.x - 6, IB.y - 9, IB.w + 12, 11);
    // 지층 블록
    ctx.save(); ctx.beginPath(); ctx.rect(IB.x, IB.y, IB.w, IB.h); ctx.clip();
    strataBlock();
    const frontY = IB.y + IB.h - I.p * (IB.h + 6);
    if (I.p > 0.001) {
      const poly = dikePoly(frontY);
      // 접촉부(구운 듯한 가장자리): 지층마다 색이 달라져요
      ctx.save(); ctx.beginPath(); ctx.rect(IB.x, frontY + 6, IB.w, IB.h); ctx.clip();
      ['ls', 'ss', 'sh'].forEach((k) => {
        const y1 = IB.y + IB.h * IL[k][0], y2 = IB.y + IB.h * IL[k][1];
        ctx.save(); ctx.beginPath(); ctx.rect(IB.x, y1, IB.w, y2 - y1); ctx.clip();
        polyPath(poly); ctx.lineJoin = 'round'; ctx.lineWidth = dikeHW(y1) * 1.5; ctx.strokeStyle = k === 'ls' ? 'rgba(255,255,255,.75)' : k === 'ss' ? 'rgba(120,70,40,.42)' : 'rgba(30,35,50,.5)'; ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
      // 마그마 몸체
      polyPath(poly); ctx.fillStyle = LITH_BASE.igneous; ctx.fill(); fillLith('igneous');
      const heat = I.heat;
      ctx.save(); polyPath(poly); ctx.clip();
      const hg = ctx.createLinearGradient(0, frontY, 0, frontY + 190); hg.addColorStop(0, 'rgba(255,140,30,' + (0.95 * heat) + ')'); hg.addColorStop(0.35, 'rgba(255,80,20,' + (0.75 * heat) + ')'); hg.addColorStop(1, 'rgba(160,30,20,' + (0.35 * heat) + ')');
      ctx.fillStyle = hg; ctx.fillRect(IB.x, frontY, IB.w, IB.h + 8);
      // 포획암
      XEN.forEach((x) => {
        const cy = IB.y + IB.h * x.fy; if (frontY > cy - 12) return;
        const cx = dikeX(cy) + x.dx * dikeHW(cy), sc = x.s * IB.w / 460;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); polyPath(x.pts); ctx.fillStyle = LITH_BASE[x.k === 'sand' ? 'sand' : 'shale']; ctx.fill(); fillLith(x.k === 'sand' ? 'sand' : 'shale'); ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 1.6 / sc; ctx.stroke(); ctx.restore();
      });
      ctx.restore();
      polyPath(poly); ctx.strokeStyle = 'rgba(20,10,30,.7)'; ctx.lineWidth = 1.8; ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.strokeRect(IB.x, IB.y, IB.w, IB.h);
    if (I.p > 0.001 && I.p < 0.999) {
      const gx = dikeX(frontY), gy = frontY;
      D.glow(gx, gy, 46, '#ff7a1a', 0.7 + 0.2 * Math.sin(t * 12));
      if (!RM && Math.random() < 0.6) parts.emit({ x: gx + (Math.random() - 0.5) * 20, y: gy, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 40, life: 0.6, size: 3, color: '#ff9a3c', gravity: 0 });
    }
    // 이름표
    const lab = (k, y, text) => D.label(IB.x + 8, y, text, { bg: 'rgba(255,255,255,.92)', color: '#334155', size: 13.5, pad: 7, align: 'left', border: '#94a3b8' });
    lab('ls', IB.y + IB.h * 0.135, '석회암'); lab('ss', IB.y + IB.h * 0.425, '사암'); lab('sh', IB.y + IB.h * 0.79, '셰일');
    if (I.done) {
      const dx = dikeX(IB.y + IB.h * 0.2) + dikeHW(IB.y + 80) + 18;
      D.label(dx, IB.y + IB.h * 0.2, '화성암 D (암맥)', { bg: '#5b4a6b', color: '#fff', size: 13.5, pad: 8, align: 'left' });
      D.arrow(dx - 2, IB.y + IB.h * 0.2, dikeX(IB.y + IB.h * 0.2) + dikeHW(IB.y + 80) - 2, IB.y + IB.h * 0.2, { color: '#5b4a6b', width: 2.4, head: 9 });
      const yy = IB.y + IB.h * 0.5;
      D.label(dikeX(yy) - dikeHW(yy) - 24, yy, '구운 듯한 접촉부', { bg: '#fff7ed', color: '#9a3412', size: 13, pad: 7, border: '#fdba74', align: 'right' });
      const xy = IB.y + IB.h * XEN[0].fy;
      D.label(dikeX(xy) + dikeHW(xy) + 22, xy + 6, '포획암 (셰일 조각)', { bg: '#fff', color: '#334155', size: 13, pad: 7, border: '#64748b', align: 'left' });
      D.arrow(dikeX(xy) + dikeHW(xy) + 20, xy + 6, dikeX(xy) + dikeHW(xy) * XEN[0].dx + 12, xy + 2, { color: '#334155', width: 2, head: 8 });
    }
    // 정보 판 (관입의 법칙)
    const IR = PHONE ? { x: 12, y: 520, w: 576, h: 308 } : { x: 504, y: 12, w: 284, h: 536 };
    panel(IR.x, IR.y, IR.w, IR.h, { title: '관입의 법칙 · 포획', border: '#bae6fd' });
    let m1;
    if (!I.ran) m1 = '▶ 마그마 관입을 눌러 보세요. 마그마는 어느 쪽을 뚫고 올라올까요?';
    else if (!I.done) m1 = '마그마가 이미 있던 지층의 틈을 뚫고 올라오고 있어요.';
    else m1 = '마그마가 식어 굳어 화성암 D가 됐어요. D는 세 지층을 가로질러 뚫었으니 지층이 먼저 있었던 거예요.';
    note(IR.x + 10, IR.y + 36, IR.w - 20, m1, 13.5, { bg: '#f0f9ff', border: '#bae6fd' });
    if (I.done) {
      const y0 = IR.y + (PHONE ? 130 : 150);
      const items = [['관입의 법칙', '관입한 암석(D)이 관입당한 암석(지층)보다 나중이에요.'], ['접촉부', '뜨거운 마그마에 닿은 지층만 구운 듯 변해요. → 접촉한 부분만 변했으니 지층이 먼저예요.'], ['포획암', '마그마 속에 들어 있는 모암 조각은 마그마보다 먼저 있던 암석이에요.']];
      items.forEach((it, i) => { const h = note(IR.x + 10, y0 + i * (PHONE ? 52 : 84), IR.w - 20, it[0] + ': ' + it[1], 13, { bg: '#fffbeb', border: '#fde68a' }); });
    }
    const ord = !I.done ? '' : '순서: 셰일 → 사암 → 석회암 → (지층이 기울어짐) → D 관입'.replace('(지층이 기울어짐) → ', '');
    if (I.done && !PHONE) tx(IR.x + 14, IR.y + IR.h - 16, '오래됨 → 젊음: 셰일 < 사암 < 석회암 < D', 13, '#6d28d9', 'left', 800);
  }
  function intrRun() {
    const I = S.intr;
    if (I.tw || I.done) return;
    I.ran = true; I.heat = 1; Sound.click();
    I.tw = SciSim.tween(I, { p: 1 }, { duration: 3.6, ease: 'inOutQuad', onDone() { I.tw = null; I.done = true; Sound.success(); updateCtl(); parts.burst(dikeX(IB.y + 60), IB.y + 60, { count: 14, speed: 110, colors: ['#ff9a3c', '#fde68a'], gravity: 120, life: 0.7 }); } });
    updateCtl();
  }
  function intrReset() {
    const I = S.intr; if (I.tw) I.tw.cancel(); I.tw = null;
    I.p = 0; I.done = false; I.ran = false; I.pick = null; I.heat = 1; parts.clear(); updateCtl();
  }
  S.intr.heat = 1;

  /* =========================================================
     장면 4: 선후 관계 사례 카드 3장
     ========================================================= */
  const CASE_DEF = [
    { title: '화성암 속의 조각', q: '화성암 속에 사암 조각이 들어 있어요. 어느 쪽이 먼저 생겼을까요?', opts: ['화성암이 먼저', '사암 조각(포획암)이 먼저'], ok: 1,
      why: '화성암 속에 들어 있는 모암 조각(포획암)은 마그마가 굳기 전부터 있던 암석이에요. 포획된 암석이 더 오래됐어요.' },
    { title: '두 지층을 가로지르는 암맥', q: '두 지층을 암맥이 가로질러 뚫고 있어요. 어느 쪽이 먼저 생겼을까요?', opts: ['두 지층이 먼저', '암맥이 먼저'], ok: 0,
      why: '암맥이 지층을 뚫고 들어갔으니 지층이 먼저 있었어요. 관입한 암석이 관입당한 암석보다 나중이에요.' },
    { title: '역암 속의 화성암 자갈', q: '역암 속에 화성암 자갈이 들어 있어요. 어느 쪽이 먼저 생겼을까요?', opts: ['역암이 먼저', '자갈이 된 화성암이 먼저'], ok: 1,
      why: '화성암이 깎여 자갈이 된 뒤에 역암에 섞여 굳었어요. 역암 속에 들어 있는 화성암이 더 오래됐어요.' },
  ];
  function caseRects() {
    return [0, 1, 2].map((i) => PHONE ? { x: 12, y: 12 + i * 226, w: 576, h: 214 } : { x: 12 + i * 261, y: 14, w: 251, h: 318 });
  }
  function drawCaseArt(i, x, y, w, h, t) {
    ctx.save(); rr(x, y, w, h, 10).clip();
    if (i === 0) {
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.fillStyle = LITH_BASE.sand; ctx.fill(); fillLith('sand');
      for (let k = 1; k < 6; k++) { ctx.strokeStyle = 'rgba(90,60,30,.25)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y + (h * k) / 6); ctx.lineTo(x + w, y + (h * k) / 6); ctx.stroke(); }
      const bd = [[0.28, 0], [0.7, 0.02], [0.78, 0.35], [0.66, 0.62], [0.74, 1], [0.24, 1], [0.34, 0.66], [0.22, 0.34]].map(([a, b]) => [x + w * a, y + h * b]);
      polyPath(bd); ctx.fillStyle = LITH_BASE.granite; ctx.fill(); fillLith('granite'); ctx.strokeStyle = '#6b2f2f'; ctx.lineWidth = 2; ctx.stroke();
      const xs = [[0.5, 0.2, 1], [0.44, 0.52, 0.8], [0.6, 0.76, 0.9], [0.3, 0.36, 0.5]];
      xs.forEach(([a, b, s], k) => { ctx.save(); ctx.translate(x + w * a, y + h * b); ctx.rotate(k * 0.9); ctx.scale(s * w / 250 * 1.5, s * w / 250 * 1.5 * (PHONE ? 0.8 : 1)); polyPath([[-14, -9], [6, -15], [16, -2], [9, 12], [-10, 10]]); ctx.fillStyle = LITH_BASE.sand; ctx.fill(); fillLith('sand'); ctx.strokeStyle = '#3f2d1a'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); });
    } else if (i === 1) {
      [['lime', 0, 0.3], ['sand', 0.3, 0.62], ['shale', 0.62, 1]].forEach(([kd, a, b]) => { ctx.beginPath(); ctx.rect(x, y + h * a, w, h * (b - a)); ctx.fillStyle = LITH_BASE[kd]; ctx.fill(); fillLith(kd); ctx.strokeStyle = 'rgba(30,25,20,.5)'; ctx.lineWidth = 1.5; ctx.stroke(); });
      const dk = [[0.46, 0], [0.55, 0], [0.57, 0.4], [0.53, 1], [0.44, 1], [0.47, 0.5]].map(([a, b]) => [x + w * a, y + h * b]);
      polyPath(dk); ctx.lineJoin = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(40,30,30,.28)'; ctx.stroke();
      polyPath(dk); ctx.fillStyle = LITH_BASE.igneous; ctx.fill(); fillLith('igneous'); ctx.lineWidth = 1.8; ctx.strokeStyle = '#2b1b36'; ctx.stroke();
    } else {
      [['shale', 0.66, 1], ['conglo', 0.3, 0.66], ['sand', 0, 0.3]].forEach(([kd, a, b]) => { ctx.beginPath(); ctx.rect(x, y + h * a, w, h * (b - a)); ctx.fillStyle = LITH_BASE[kd]; ctx.fill(); fillLith(kd); ctx.strokeStyle = 'rgba(30,25,20,.5)'; ctx.lineWidth = 1.5; ctx.stroke(); });
      const R = mulberry(5);
      const pb = [[0.14, 0.42, 13, 1], [0.34, 0.55, 15, 0], [0.5, 0.4, 12, 1], [0.68, 0.53, 16, 1], [0.84, 0.4, 12, 0], [0.24, 0.6, 9, 0], [0.58, 0.6, 9, 0]];
      pb.forEach(([a, b, r, ig], k) => pebbleAt(x + w * a, y + h * b, r * (w / 250) * (PHONE ? 0.8 : 1) + 2, ig ? 'granite' : 'gravel', R() * 3));
    }
    ctx.restore();
  }
  function drawCases(t) {
    const rects = caseRects(), C = S.cases;
    rects.forEach((r, i) => {
      const sel = C.sel === i, ans = C.ans[i], ok = ans === CASE_DEF[i].ok;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: sel ? 12 : 5, y: 3 });
      ctx.strokeStyle = sel ? '#0284c7' : '#cbd5e1'; ctx.lineWidth = sel ? 4 : 2; rr(r.x, r.y, r.w, r.h, 14).stroke();
      const sh = C.shake > 0 && C.sel === i ? Math.sin(C.shake * 50) * 4 : 0;
      tx(r.x + 12, r.y + 24, '사례 ' + (i + 1) + ' · ' + CASE_DEF[i].title, 14.5, gcl.ink, 'left', 800);
      drawCaseArt(i, r.x + 10 + sh, r.y + 36, r.w - 20, r.h - 48, t);
      // 범례
      if (i === 0) { D.label(r.x + r.w * 0.5, r.y + r.h - 62 - (PHONE ? -8 : 0), '화성암', { bg: '#7f1d1d', color: '#fff', size: 12.5, pad: 6 }); D.label(r.x + 66, r.y + r.h - 22, '사암(모암)', { bg: '#fff', color: '#334155', size: 12.5, pad: 6, border: '#94a3b8' }); }
      if (i === 1) { D.label(r.x + r.w * 0.5, r.y + r.h - 22, '암맥', { bg: '#5b4a6b', color: '#fff', size: 12.5, pad: 6 }); }
      if (i === 2) { D.label(r.x + r.w - 62, r.y + r.h - 22, '분홍 무늬 = 화성암 자갈', { bg: '#fff', color: '#7f1d1d', size: 12, pad: 6, border: '#e3a9a0', align: 'right' }); }
      if (ans != null) D.label(r.x + r.w - 12, r.y + 22, ok ? '✓ 맞았어요' : '다시 생각', { bg: ok ? '#15803d' : '#b91c1c', color: '#fff', size: 12.5, pad: 7, align: 'right' });
    });
    if (C.shake > 0) C.shake = Math.max(0, C.shake - 0.016);
    const P = PHONE ? { x: 12, y: 696, w: 576, h: 132 } : { x: 12, y: 342, w: 776, h: 206 };
    panel(P.x, P.y, P.w, P.h, { title: '사례 ' + (C.sel + 1) + ' · ' + CASE_DEF[C.sel].title, border: '#bae6fd' });
    const a = C.ans[C.sel], ok = a === CASE_DEF[C.sel].ok;
    let msg = CASE_DEF[C.sel].q;
    if (a != null && ok) msg = '정답! ' + CASE_DEF[C.sel].why;
    else if (a != null) msg = '아직이에요. 그림에서 "속에 들어 있는 것"과 "그것을 둘러싼 것"을 구별해 봐요.';
    note(P.x + 12, P.y + 36, P.w - 24, msg, 14.5, { bg: ok ? '#f0fdf4' : '#f0f9ff', border: ok ? '#86efac' : '#bae6fd' });
    const laws = [['포획된 암석(조각)', '포획한 화성암보다 먼저'], ['관입한 암석', '관입당한 암석보다 나중'], ['역암 속 화성암 자갈', '역암보다 먼저']];
    laws.forEach((rw, k) => {
      const got = C.ans[k] === CASE_DEF[k].ok, yy = P.y + 60 + k * 32;
      if (PHONE) return;
      D.label(P.x + 14, yy + 40, '사례 ' + (k + 1), { bg: got ? '#15803d' : '#cbd5e1', color: got ? '#fff' : '#64748b', size: 12.5, pad: 8, align: 'left' });
      tx(P.x + 96, yy + 45, got ? rw[0] + ' → ' + rw[1] : '(맞히면 법칙이 나타나요)', 14, got ? '#5b21b6' : '#94a3b8', 'left', 800);
    });
  }

  /* =========================================================
     장면 5: 부정합이 만들어지는 과정
     ========================================================= */
  const UX = PHONE ? { x: 12, y: 96, w: 576, h: 470 } : { x: 12, y: 10, w: 540, h: 540 };
  const LT = PHONE ? 58 : 60;
  const UB = { x0: UX.x + 34, x1: UX.x + UX.w - 34, yb: UX.y + UX.h - 24 };
  UB.y3 = UB.yb - 3 * LT; UB.sea = UB.y3 - 92; const UP = 150;
  const ERO = (x) => {
    const q = (x - UB.x0) / (UB.x1 - UB.x0);
    return UB.y3 + Math.max(4, 30 + 21 * Math.sin(q * 9.2 + 0.4) + 10 * Math.sin(q * 23 + 1.3));
  };
  const UNC_STEPS = ['퇴적', '융기', '침식', '침강', '다시 퇴적'];
  const uncStage = (u) => (u < 0.02 ? 0 : Math.min(5, Math.ceil(u - 0.02)));
  const UNC_MSG = ['▶ 다음 단계를 눌러 지층이 어떻게 쌓이고 깎이는지 지켜봐요.', '① 퇴적: 바다 밑에 지층이 차례로 쌓여요. 아래층이 먼저예요.', '② 융기: 땅이 솟아올라 지층이 바다 위로 드러나요.', '③ 침식: 드러난 지층의 윗부분이 깎여 울퉁불퉁한 면이 생겨요.', '④ 침강: 땅이 다시 가라앉아 바다 밑이 돼요.', '⑤ 다시 퇴적: 깎인 면 위에 새 지층이 쌓여요. 이 면이 부정합면이에요.'];
  const clamp01 = (v) => clamp(v, 0, 1);
  function drawUnc(t, dt) {
    const U = S.unc;
    if (U.play) {
      if (Math.abs(U.u - U.uT) < 0.01) { U.wait = (U.wait || 0) + dt; if (U.wait > 0.7) { U.wait = 0; if (U.uT >= 5) { U.play = false; updateCtl(); } else { U.uT = Math.floor(U.uT + 1e-6) + 1; updateCtl(); } } } else U.wait = 0;
    }
    const sp = 0.62 * dt; U.u = Math.abs(U.uT - U.u) <= sp ? U.uT : U.u + Math.sign(U.uT - U.u) * sp;
    if (RM) U.u = U.uT;
    U.max = Math.max(U.max || 0, U.u);
    const u = U.u, f1 = clamp01(u), f2 = clamp01(u - 1), f3 = clamp01(u - 2), f4 = clamp01(u - 3), f5 = clamp01(u - 4);
    const off = -UP * (f2 - f4);
    // 하늘과 바다
    const sg = ctx.createLinearGradient(0, UX.y, 0, UB.sea); sg.addColorStop(0, '#a8d8f3'); sg.addColorStop(1, '#e6f4fb'); ctx.fillStyle = sg; ctx.fillRect(UX.x, UX.y, UX.w, UB.sea - UX.y);
    const wg = ctx.createLinearGradient(0, UB.sea, 0, UX.y + UX.h); wg.addColorStop(0, '#7cc3e8'); wg.addColorStop(1, '#2f7fb4'); ctx.fillStyle = wg; ctx.fillRect(UX.x, UB.sea, UX.w, UX.y + UX.h - UB.sea);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let x = 0; x <= UX.w; x += 6) { const y = UB.sea + Math.sin(x / 16 + t * 2) * 2.2; x ? ctx.lineTo(UX.x + x, y) : ctx.moveTo(UX.x + x, y); } ctx.stroke();
    D.glow(UX.x + UX.w - 48, UX.y + 40, 46, '#fde68a', 0.8); D.sphere(UX.x + UX.w - 48, UX.y + 40, 16, '#fbbf24', { gloss: false });
    // 지각
    ctx.save(); ctx.beginPath(); ctx.rect(UX.x, UX.y, UX.w, UX.h); ctx.clip(); ctx.translate(0, off);
    const x0 = UB.x0, x1 = UB.x1;
    // 아래 지층 L1~L3 (아래부터 차례로 쌓임)
    const lay = [['sand', 0], ['shale', 1], ['lime', 2]];
    const Eof = (x) => UB.y3 + f3 * (ERO(x) - UB.y3);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x0, Eof(x0)); for (let x = x0; x <= x1; x += 4) ctx.lineTo(x, Eof(x)); ctx.lineTo(x1, UB.yb); ctx.lineTo(x0, UB.yb); ctx.closePath(); ctx.clip();
    lay.forEach(([kd, k]) => {
      const g = clamp01(f1 * 3 - k); if (g <= 0) return;
      const yBot = UB.yb - k * LT, h = LT * g;
      ctx.beginPath(); ctx.rect(x0, yBot - h, x1 - x0, h); ctx.fillStyle = LITH_BASE[kd]; ctx.fill(); fillLith(kd);
      ctx.strokeStyle = 'rgba(30,25,20,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, yBot - h); ctx.lineTo(x1, yBot - h); ctx.stroke();
    });
    ctx.restore();
    // 새 지층
    if (f5 > 0) {
      const yU1 = UB.y3 - 8, yTop = UB.y3 - 44, yMaxE = UB.y3 + 62, yN = yMaxE + (yTop - yMaxE) * f5;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x0, yN); ctx.lineTo(x1, yN); ctx.lineTo(x1, ERO(x1)); for (let x = x1; x >= x0; x -= 4) ctx.lineTo(x, ERO(x)); ctx.closePath(); ctx.clip();
      ctx.beginPath(); ctx.rect(x0, Math.max(yU1, yN), x1 - x0, 400); ctx.fillStyle = LITH_BASE.conglo; ctx.fill(); fillLith('conglo');
      if (yN < yU1) { ctx.beginPath(); ctx.rect(x0, yN, x1 - x0, yU1 - yN); ctx.fillStyle = LITH_BASE.mud; ctx.fill(); fillLith('mud'); ctx.strokeStyle = 'rgba(30,25,20,.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, yU1); ctx.lineTo(x1, yU1); ctx.stroke(); }
      ctx.restore();
    }
    // 부정합면 강조
    if (f3 > 0.4) {
      ctx.save(); ctx.setLineDash([9, 6]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = f5 > 0.2 ? '#be123c' : '#b45309'; ctx.lineWidth = 3.2; ctx.beginPath(); for (let x = x0; x <= x1; x += 4) { const y = Eof(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
    }
    ctx.lineWidth = 3; ctx.strokeStyle = '#475569';
    ctx.restore();
    // 블록 옆선
    // 퇴적물 입자 (1단계·5단계)
    if (!RM && ((u > 0.02 && u < 3 * (1 / 3) + 0.99 && u < 1) || (u > 4 && u < 5))) {
      const topNow = u < 1 ? UB.yb - LT * 3 * f1 : (UB.y3 - 44 + (UB.y3 + 62 - (UB.y3 - 44)) * (1 - f5));
      if (Math.random() < 0.55) parts.emit({ x: x0 + 10 + Math.random() * (x1 - x0 - 20), y: UB.sea + 8, vx: 0, vy: 130, life: Math.max(0.1, (topNow + off - UB.sea) / 130), size: 2.4, color: u < 1 ? '#f1d9a0' : '#d6c3a0', gravity: 0, fade: false });
    }
    D.text(UX.x + 8, UB.sea - 7, '해수면', { size: 12.5, weight: 800, color: '#0369a1', align: 'left', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 });
    // 단계 이름표와 화살표
    const st = clamp(Math.round(u + 0.3), 0, 5);
    const stage = uncStage(u);
    if (stage === 2 && f2 < 0.99) D.arrow(UX.x + UX.w - 80, UB.y3 + 40 + off, UX.x + UX.w - 80, UB.y3 - 20 + off, { color: '#16a34a', width: 5, head: 15 });
    if (stage === 4 && f4 < 0.99) D.arrow(UX.x + UX.w - 80, UB.y3 - 120 - off * 0.2 + 60, UX.x + UX.w - 80, UB.y3 - 60 + off + 140, { color: '#2563eb', width: 5, head: 15 });
    if (stage === 3) { for (let k = 0; k < 4; k++) { const ax = UB.x0 + 60 + k * ((UB.x1 - UB.x0 - 120) / 3), ay = UB.y3 + off - 30; D.arrow(ax, ay - 34, ax, ay, { color: '#0284c7', width: 3, head: 10, alpha: 0.85 }); } tx(UB.x0 + 8, UB.y3 + off - 74, '빗물·바람·흐르는 물', 13, '#0369a1', 'left', 800); }
    // 이름표
    if (f5 > 0.85) { D.label(UB.x0 + 8, UB.y3 - 62, '위 지층 (새 퇴적)', { bg: '#7c2d12', color: '#fff', size: 12.5, pad: 7, align: 'left' }); const ex = (UB.x0 + UB.x1) / 2 + 40; D.label(ex, ERO(ex) + 28, '부정합면', { bg: '#be123c', color: '#fff', size: 13.5, pad: 8 }); D.arrow(ex, ERO(ex) + 18, ex, ERO(ex) + 3, { color: '#be123c', width: 2.4, head: 8 }); }
    // 배너
    const stg = stage;
    banner(UX.x + 10, UX.y + 8, UX.w - 70, UNC_MSG[stg], 'rgba(255,255,255,.95)', 14);
    // 시간 막대 + 설명 (오른쪽 / 아래)
    const TR = PHONE ? { x: 12, y: 580, w: 576, h: 248 } : { x: 566, y: 10, w: 222, h: 540 };
    panel(TR.x, TR.y, TR.w, TR.h, { title: '시간의 흐름', border: '#bae6fd' });
    const bx = TR.x + 14, bw = TR.w - 28, by = TR.y + 58, bh = 28;
    const segs = [{ w: 0.3, f: f1, c: '#0ea5e9', lab: '퇴적 (아래 지층)' }, { w: 0.4, f: clamp01((u - 1) / 3), c: 'hatch', lab: '결층: 기록이 없는 시간' }, { w: 0.3, f: f5, c: '#c2410c', lab: '퇴적 (위 지층)' }];
    ctx.save(); rr(bx, by, bw, bh, 8); ctx.fillStyle = '#e2e8f0'; ctx.fill(); ctx.clip();
    let cx0 = bx;
    segs.forEach((sg2) => {
      const w = bw * sg2.w, fw = w * sg2.f;
      if (fw > 0) {
        if (sg2.c === 'hatch') { ctx.fillStyle = '#cbd5e1'; ctx.fillRect(cx0, by, fw, bh); ctx.save(); ctx.beginPath(); ctx.rect(cx0, by, fw, bh); ctx.clip(); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; for (let k = -bh; k < w; k += 9) { ctx.beginPath(); ctx.moveTo(cx0 + k, by + bh); ctx.lineTo(cx0 + k + bh, by); ctx.stroke(); } ctx.restore(); }
        else { ctx.fillStyle = sg2.c; ctx.fillRect(cx0, by, fw, bh); }
      }
      cx0 += w;
    });
    ctx.restore();
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; rr(bx, by, bw, bh, 8).stroke();
    tx(bx, by - 8, '옛날', 12.5, gcl.mute, 'left', 800); tx(bx + bw, by - 8, '지금', 12.5, gcl.mute, 'right', 800);
    const ly0 = by + bh + 22;
    [['#0ea5e9', '퇴적 (아래 지층)'], ['#94a3b8', '결층: 기록이 없는 시간'], ['#c2410c', '퇴적 (위 지층)']].forEach((l, i) => { ctx.fillStyle = l[0]; ctx.fillRect(bx, ly0 + i * 24 - 11, 16, 14); tx(bx + 24, ly0 + i * 24, l[1], 13, gcl.ink, 'left', 700); });
    if (!PHONE) {
      note(TR.x + 10, TR.y + 196, TR.w - 20, f5 > 0.95 ? '부정합면 아래 지층과 위 지층 사이에는 퇴적이 없었던(또는 깎여 나간) 시간, 결층이 있어요. 시간이 없는 게 아니라 기록이 빠진 거예요.' : '융기·침식·침강이 일어나는 동안은 지층이 쌓이지 않아요. 이 시간은 지층에 기록되지 않아요.', 13, { bg: '#fffbeb', border: '#fde68a' });
      const stNames = ['퇴적', '융기', '침식', '침강', '다시 퇴적'];
      tx(TR.x + 14, TR.y + 400, '일어난 사건', 13.5, gcl.mute, 'left', 800);
      stNames.forEach((n, i) => { const on = stage > i, now = stage === i + 1; D.label(TR.x + 14, TR.y + 424 + i * 25, (i + 1) + ' ' + n, { bg: now ? '#0284c7' : on ? '#bae6fd' : '#e2e8f0', color: now ? '#fff' : on ? '#075985' : '#94a3b8', size: 12.5, pad: 8, align: 'left' }); });
    }
  }
  function uncGo(d) { const U = S.unc; U.play = false; U.uT = clamp(Math.round(U.uT + d), 0, 5); updateCtl(); }
  function uncPlay() { const U = S.unc; U.u = 0; U.uT = 1; U.play = true; U.wait = 0; Sound.click(); updateCtl(); }

  /* =========================================================
     장면 6: 부정합의 세 가지 종류
     ========================================================= */
  const TYPE_DEF = [
    { id: 'nonconf', name: '난정합', lower: 'granite', note: '부정합면 아래가 화성암(또는 변성암)' },
    { id: 'parallel', name: '평행 부정합', lower: 'horizontal', note: '아래 지층이 수평이라 위 지층과 나란함' },
    { id: 'angular', name: '경사 부정합', lower: 'tilted', note: '아래 지층이 기울어져 위 지층과 비스듬함' },
  ];
  const TYPE_NAMES = ['가', '나', '다'];
  function typeRects() {
    return [0, 1, 2].map((i) => PHONE ? { x: 12, y: 12 + i * 214, w: 576, h: 204 } : { x: 12 + i * 261, y: 14, w: 251, h: 300 });
  }
  function drawUncPanel(def, x, y, w, h, t) {
    const E = (px) => y + h * 0.5 + 7 * Math.sin((px - x) / 20) + 5 * Math.sin((px - x) / 8.5 + 1);
    ctx.save(); rr(x, y, w, h, 10).clip();
    ctx.fillStyle = '#dbeefa'; ctx.fillRect(x, y, w, h);
    // 아래
    ctx.save(); ctx.beginPath(); ctx.moveTo(x, E(x)); for (let px = x; px <= x + w; px += 4) ctx.lineTo(px, E(px)); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.clip();
    if (def.lower === 'granite') { ctx.fillStyle = LITH_BASE.granite; ctx.fillRect(x, y, w, h); ctx.fillStyle = lithFill('granite'); ctx.fillRect(x, y, w, h); }
    else {
      ctx.translate(x + w / 2, y + h / 2); ctx.rotate(def.lower === 'tilted' ? -0.5 : 0);
      const ks = ['shale', 'sand', 'lime', 'shale', 'sand', 'lime', 'shale', 'sand', 'lime', 'shale', 'sand', 'lime', 'shale', 'sand', 'lime', 'shale', 'sand', 'lime'];
      const bt = h * 0.12;
      for (let k = -8; k < 9; k++) {
        const kd = ks[k + 9]; ctx.beginPath(); ctx.rect(-w, k * bt, w * 2, bt); ctx.fillStyle = LITH_BASE[kd]; ctx.fill(); fillLith(kd);
        ctx.strokeStyle = 'rgba(30,25,20,.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-w, k * bt); ctx.lineTo(w, k * bt); ctx.stroke();
      }
    }
    ctx.restore();
    // 위 (수평 지층)
    ctx.save(); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, E(x + w)); for (let px = x + w; px >= x; px -= 4) ctx.lineTo(px, E(px)); ctx.closePath(); ctx.clip();
    const ut = h * 0.13;
    const uk = ['mud', 'sand', 'mud', 'sand'];
    for (let k = 0; k < 6; k++) {
      const yy = y + h * 0.5 + 12 - (k + 1) * ut, kd = k === 0 ? 'conglo' : uk[k % 4];
      ctx.beginPath(); ctx.rect(x, yy, w, k === 0 ? ut + 70 : ut); ctx.fillStyle = LITH_BASE[kd]; ctx.fill(); fillLith(kd); ctx.strokeStyle = 'rgba(30,25,20,.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
    }
    ctx.fillStyle = '#dbeefa'; ctx.fillRect(x, y, w, h * 0.5 + 12 - 6 * ut);
    ctx.restore();
    // 부정합면
    ctx.save(); ctx.setLineDash([8, 5]); ctx.lineDashOffset = -t * 12; ctx.strokeStyle = '#be123c'; ctx.lineWidth = 3; ctx.beginPath(); for (let px = x; px <= x + w; px += 4) { px === x ? ctx.moveTo(px, E(px)) : ctx.lineTo(px, E(px)); } ctx.stroke(); ctx.restore();
    ctx.restore();
    D.label(x + w - 8, E(x + w - 70) - 14, '부정합면', { bg: '#be123c', color: '#fff', size: 12.5, pad: 7, align: 'right' });
  }
  const typeOrder = ['nonconf', 'parallel', 'angular'];
  function drawTypes(t) {
    const rects = typeRects();
    rects.forEach((r, i) => {
      const def = TYPE_DEF[i], ans = S.types.ans[i], ok = ans === def.id;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 5, y: 3 });
      ctx.strokeStyle = ans ? (ok ? '#16a34a' : '#e2464b') : '#cbd5e1'; ctx.lineWidth = ans ? 3.5 : 2; rr(r.x, r.y, r.w, r.h, 14).stroke();
      tx(r.x + 12, r.y + 25, '단면 ' + TYPE_NAMES[i], 15, gcl.ink, 'left', 800);
      drawUncPanel(def, r.x + 10, r.y + 36, r.w - 20, r.h - 46, t);
      if (ans) D.label(r.x + r.w - 12, r.y + 23, ok ? '✓ ' + def.name : '다시 살펴봐요', { bg: ok ? '#15803d' : '#b91c1c', color: '#fff', size: 13, pad: 8, align: 'right' });
    });
    const P = PHONE ? { x: 12, y: 660, w: 576, h: 168 } : { x: 12, y: 326, w: 776, h: 222 };
    panel(P.x, P.y, P.w, P.h, { title: '부정합의 종류', border: '#bae6fd' });
    const done = S.types.ans.every((a, i) => a === TYPE_DEF[i].id);
    const lines = [['평행 부정합', '아래 지층이 수평 (위 지층과 나란함)'], ['경사 부정합', '아래 지층이 기울어져 있고 위 지층은 수평'], ['난정합', '아래가 화성암·변성암, 위는 퇴적암']];
    if (!done) {
      note(P.x + 12, P.y + 40, P.w - 24, '세 단면에서 위 지층은 모두 수평이에요. 붉은 점선(부정합면) 아래 지층이 수평인지, 기울었는지, 암석 종류가 다른지 비교해 봐요.', 14, { bg: '#f0f9ff', border: '#bae6fd' });
    } else {
      lines.forEach((l, i) => {
        const yy = P.y + 40 + i * (PHONE ? 38 : 50);
        D.label(P.x + 14, yy + 8, l[0], { bg: '#15803d', color: '#fff', size: 13.5, pad: 9, align: 'left' });
        tx(P.x + (PHONE ? 130 : 148), yy + 13, l[1], PHONE ? 13 : 14.5, gcl.ink, 'left', 700);
      });
      if (!PHONE) note(P.x + 12, P.y + 166, P.w - 24, '세 경우 모두 "퇴적 → 융기·침식 → 다시 퇴적"의 과정을 거쳤고, 부정합면에는 기록이 빠진 시간(결층)이 있어요.', 13.5, { bg: '#fffbeb', border: '#fde68a' });
    }
  }


  /* =========================================================
     장면 7: 층서 대비 (키층 · 동물군 천이)
     ========================================================= */
  const LN = { sand: '사암', shale: '셰일', lime: '석회암', mud: '이암', tuff: '응회암' };
  const CORR_COLS = [
    { name: '지역 1', layers: [['shale', 5, 'tri'], ['sand', 8], ['tuff', 1, 'tuff'], ['shale', 6], ['sand', 3], ['lime', 4, 'amm'], ['mud', 4]] },
    { name: '지역 2', layers: [['sand', 5], ['shale', 4, 'tri'], ['lime', 3], ['tuff', 1, 'tuff'], ['sand', 4], ['mud', 5, 'amm'], ['sand', 4]], unc: 5 },
    { name: '지역 3', layers: [['sand', 6], ['shale', 5, 'tri'], ['lime', 4], ['tuff', 1, 'tuff'], ['shale', 7], ['lime', 5, 'amm'], ['sand', 4]] },
  ];
  const CG = PHONE ? { cx: [112, 300, 488], w: 142, base: 708, per: 14.2, top: 236 } : { cx: [150, 405, 660], w: 150, base: 490, per: 10.8, top: 146 };
  const CORR_COL = { tuff: '#d97706', amm: '#7c3aed' };
  const CORR_NAME = { tuff: '응회암 키층', amm: '암모나이트층' };
  function layerBox(ci, li) {
    const cd = CORR_COLS[ci]; let y = CG.base;
    for (let i = 0; i < cd.layers.length; i++) {
      const h = cd.layers[i][1] * CG.per;
      if (i === li) return { x: CG.cx[ci] - CG.w / 2, y: y - h, w: CG.w, h, ymid: y - h / 2 };
      y -= h;
    }
    return null;
  }
  const uncWave = (x, ci) => 3.2 * Math.sin((x - CG.cx[ci]) / 9) + 2 * Math.sin((x - CG.cx[ci]) / 3.7 + 1);
  function drawAmm(x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = '#4c1d95'; ctx.lineWidth = Math.max(1.6, r * 0.2); ctx.lineCap = 'round';
    ctx.beginPath(); for (let a = 0; a <= TAU * 2.1; a += 0.2) { const rr2 = (a / (TAU * 2.1)) * r; a ? ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2) : ctx.moveTo(0, 0); } ctx.stroke();
    ctx.restore();
  }
  function drawTri(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#334155'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-s * 0.7, 0, s * 0.42, Math.PI / 2, -Math.PI / 2, true); ctx.fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.2; for (let k = -2; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * s * 0.22 - s * 0.1, -s * 0.46 + Math.abs(k) * 0.4); ctx.lineTo(k * s * 0.22 - s * 0.1, s * 0.46 - Math.abs(k) * 0.4); ctx.stroke(); }
    ctx.restore();
  }
  function corrPts(target) {
    return CORR_COLS.map((cd, ci) => { const li = S.corr.picked[target][ci]; const b = li != null ? layerBox(ci, li) : null; return b; });
  }
  function drawCorr(t, dt) {
    const C = S.corr;
    // 범례
    const leg = [['sand', '사암'], ['shale', '셰일'], ['lime', '석회암'], ['mud', '이암'], ['tuff', '응회암 (키층, 1 m)']];
    let lx = 14, ly = 16;
    leg.forEach(([k, n]) => {
      ctx.save(); ctx.font = D.font(12.5, 700); const w = ctx.measureText(n).width + 34; ctx.restore();
      if (lx + w > VW - 8) { lx = 14; ly += 26; }
      ctx.beginPath(); ctx.rect(lx, ly, 22, 16); ctx.fillStyle = LITH_BASE[k]; ctx.fill(); fillLith(k); ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.2; ctx.strokeRect(lx, ly, 22, 16);
      tx(lx + 28, ly + 13, n, 12.5, gcl.ink, 'left', 700); lx += w + 8;
    });
    [['tri', '삼엽충'], ['amm', '암모나이트']].forEach(([k, n]) => {
      ctx.save(); ctx.font = D.font(12.5, 700); const w = ctx.measureText(n).width + 34; ctx.restore();
      if (lx + w > VW - 8) { lx = 14; ly += 26; }
      if (k === 'tri') drawTri(lx + 11, ly + 8, 9); else drawAmm(lx + 11, ly + 8, 8);
      tx(lx + 28, ly + 13, n, 12.5, gcl.ink, 'left', 700); lx += w + 8;
    });
    // 주상도
    CORR_COLS.forEach((cd, ci) => {
      const cx = CG.cx[ci], x0 = cx - CG.w / 2;
      tx(cx, CG.top - 14, cd.name, 16, gcl.ink, 'center', 800);
      let y = CG.base;
      cd.layers.forEach((L, li) => {
        const h = L[1] * CG.per, yT = y - h, kd = L[0];
        ctx.save();
        ctx.beginPath();
        if (cd.unc === li) { ctx.moveTo(x0, y + uncWave(x0, ci)); for (let x = x0; x <= x0 + CG.w; x += 4) ctx.lineTo(x, y + uncWave(x, ci)); ctx.lineTo(x0 + CG.w, yT); ctx.lineTo(x0, yT); ctx.closePath(); }
        else ctx.rect(x0, yT, CG.w, h);
        ctx.fillStyle = LITH_BASE[kd]; ctx.fill(); fillLith(kd);
        ctx.strokeStyle = 'rgba(30,25,20,.7)'; ctx.lineWidth = L[2] === 'tuff' ? 2.2 : 1.4; ctx.stroke();
        ctx.restore();
        if (cd.unc === li) { [0.2, 0.45, 0.7, 0.9].forEach((q, k) => { pebbleAt(x0 + CG.w * q, y + uncWave(x0 + CG.w * q, ci) - 5, 3.2, 'gravel', k); }); }
        if (h >= 20) tx(x0 + 8, yT + h / 2 + 4.5, LN[kd] + (h >= 28 ? ' ' + L[1] + ' m' : ''), 12.5, kd === 'shale' ? '#f8fafc' : '#3b2f20', 'left', 800);
        if (L[2] === 'tri') { drawTri(x0 + CG.w - 28, yT + h / 2, 9); drawTri(x0 + CG.w - 58, yT + h / 2 + 4, 7); }
        if (L[2] === 'amm') { drawAmm(x0 + CG.w - 26, yT + h / 2, Math.min(11, h / 2 - 2)); drawAmm(x0 + CG.w - 54, yT + h / 2 + 2, Math.min(8, h / 2 - 3)); }
        // 고른 층 표시
        ['tuff', 'amm'].forEach((tg) => {
          if (C.picked[tg][ci] === li) {
            ctx.save(); ctx.strokeStyle = CORR_COL[tg]; ctx.lineWidth = 3.5; ctx.strokeRect(x0 + 1.5, yT + 1.5, CG.w - 3, Math.max(4, h - 3)); ctx.restore();
            D.label(x0 + CG.w + 4, yT + h / 2, '✓', { bg: CORR_COL[tg], color: '#fff', size: 12, pad: 5, align: 'left' });
          }
        });
        if (C.shake && C.shake.ci === ci && C.shake.li === li && C.shakeT > 0) { ctx.save(); ctx.fillStyle = 'rgba(220,38,38,' + clamp(C.shakeT * 1.4, 0, 0.45) + ')'; ctx.fillRect(x0, yT, CG.w, h); ctx.restore(); }
        y = yT;
      });
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2.5; ctx.strokeRect(x0, CG.base - cd.layers.reduce((a, l) => a + l[1], 0) * CG.per, CG.w, cd.layers.reduce((a, l) => a + l[1], 0) * CG.per);
      // 부정합 표시
      if (cd.unc != null && C.gapOn) {
        const b = layerBox(ci, cd.unc), yy = b.y + b.h;
        ctx.save(); ctx.setLineDash([8, 5]); ctx.lineDashOffset = -t * 14; ctx.strokeStyle = '#be123c'; ctx.lineWidth = 3.4; ctx.beginPath(); for (let x = x0; x <= x0 + CG.w; x += 4) { x === x0 ? ctx.moveTo(x, yy + uncWave(x, ci)) : ctx.lineTo(x, yy + uncWave(x, ci)); } ctx.stroke(); ctx.restore();
        if (!C.gapFound) D.ring(cx, yy, 22, t, { color: '#be123c', speed: 0.8, width: 2.5 });
      }
      if (cd.unc != null && C.gapFound) {
        const b = layerBox(ci, cd.unc), yy = b.y + b.h;
        D.label(x0 - 6, yy - 2, '부정합 (결층)', { bg: '#be123c', color: '#fff', size: 13, pad: 7, align: 'right' });
      }
    });
    // 연결선
    ['tuff', 'amm'].forEach((tg) => {
      const pts = corrPts(tg), p = C.line[tg];
      if (p <= 0 || pts.some((b) => !b)) return;
      ctx.save(); ctx.strokeStyle = CORR_COL[tg]; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.setLineDash(tg === 'amm' ? [10, 6] : []);
      [[0, 1, Math.min(1, p * 2)], [1, 2, Math.max(0, p * 2 - 1)]].forEach(([a, b, q]) => {
        if (q <= 0) return;
        const x1 = pts[a].x + pts[a].w, y1 = pts[a].ymid, x2 = pts[b].x, y2 = pts[b].ymid;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q); ctx.stroke();
      });
      ctx.restore();
    });
    // 두 선 사이 음영
    if (C.line.tuff > 0.99 && C.line.amm > 0.99) {
      const A = corrPts('tuff'), B = corrPts('amm');
      ctx.save(); ctx.fillStyle = 'rgba(251,191,36,.20)';
      [[0, 1], [1, 2]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(A[a].x + A[a].w, A[a].ymid); ctx.lineTo(A[b].x, A[b].ymid); ctx.lineTo(B[b].x, B[b].ymid); ctx.lineTo(B[a].x + B[a].w, B[a].ymid); ctx.closePath(); ctx.fill(); });
      ctx.restore();
    }
    // 안내
    const msg = !(C.done.tuff && C.done.amm) ? '대비할 층을 고른 뒤, 세 지역에서 같은 층을 하나씩 눌러요. (암석 종류가 같아 보여도 같은 시대는 아니에요.)' : C.gapFound ? '지역 2에는 응회암과 암모나이트층 사이의 지층 일부가 없어요. 부정합 때문에 그 시간의 기록이 빠졌어요.' : '지역 2에서 지층이 빠진 곳(침식면)을 눌러 찾아봐요. 붉은 고리가 힌트예요.';
    if (PHONE) note(12, CG.base + 12, VW - 24, msg, 13.5, { bg: 'rgba(255,255,255,.95)', border: '#bae6fd' });
    else note(14, VH - 52, VW - 28, msg, 14, { bg: 'rgba(255,255,255,.95)', border: '#bae6fd' });
  }
  function corrTap(p) {
    const C = S.corr;
    for (let ci = 0; ci < 3; ci++) {
      const cd = CORR_COLS[ci];
      // 부정합 누르기
      if (C.done.tuff && C.done.amm && cd.unc != null && !C.gapFound) {
        const b = layerBox(ci, cd.unc), yy = b.y + b.h;
        if (p.x >= b.x - 6 && p.x <= b.x + b.w + 6 && Math.abs(p.y - yy) <= 16) { C.gapFound = true; Sound.success(); parts.burst(b.x + b.w / 2, yy, { count: 18, speed: 150, colors: ['#be123c', '#fff', '#fde68a'] }); updateCtl(); return true; }
      }
      for (let li = 0; li < cd.layers.length; li++) {
        const b = layerBox(ci, li);
        if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y - 2 && p.y <= b.y + b.h + 2) {
          const tg = C.target, tag = cd.layers[li][2];
          if (C.picked[tg][ci] != null) { return false; }
          if (tag === tg) {
            C.picked[tg][ci] = li; Sound.tick(); parts.burst(b.x + b.w / 2, b.ymid, { count: 10, speed: 100, colors: [CORR_COL[tg], '#fff'], life: 0.5 });
            if (C.picked[tg].every((v) => v != null)) {
              C.done[tg] = true; Sound.success();
              C.line[tg] = 0; C.tw = C.tw || {}; C.tw[tg] = SciSim.tween(C.line, { [tg]: 1 }, { duration: 1.1, ease: 'inOutCubic' });
              if (C.done.tuff && C.done.amm) { C.gapOn = true; say('두 층을 모두 연결했어요! 이제 지역 2에서 지층이 빠진 곳을 찾아봐요.', false, 3); }
              else say(CORR_NAME[tg] + ' 연결 완료! 이제 다른 층도 연결해 봐요.', false, 2.4);
            }
          } else {
            C.shake = { ci, li }; C.shakeT = 0.6; Sound.fail();
            say(tg === 'tuff' ? '이 층은 응회암 키층이 아니에요. 하얗고 얇은 응회암층(1 m)을 찾아봐요.' : '이 층에는 암모나이트 화석이 없어요. 암모나이트 그림이 있는 층을 찾아봐요.', true, 2.6);
          }
          updateCtl(); return true;
        }
      }
    }
    return false;
  }
  function corrReset() {
    const C = S.corr;
    if (C.tw) Object.keys(C.tw).forEach((k) => C.tw[k] && C.tw[k].cancel()); C.tw = {};
    C.picked = { tuff: [null, null, null], amm: [null, null, null] }; C.done = { tuff: false, amm: false }; C.line = { tuff: 0, amm: 0 }; C.gapFound = false; C.gapOn = false; C.shake = null; C.shakeT = 0;
    updateCtl();
  }

  /* =========================================================
     장면 8: 단면도 A (모든 법칙 한꺼번에)
     ========================================================= */
  const SA = PHONE ? { ox: 12, oy: 40, sc: 1.1 } : { ox: 26, oy: 40, sc: 1.0 };      // 단면도 (520 x 460) 의 놓는 위치
  const A_M = Math.tan(rad(15));
  const AU = (x) => 210 + 5 * Math.sin(x / 37);
  const AB = [140, 240, 340];          // x = 290 에서 석회암 윗면, 석회암 밑면, 사암 밑면 (위쪽 경계의 y)
  const aLine = (k, x) => AB[k] + A_M * (x - 290);
  const A_EVENTS = [
    { id: 'e1', label: '셰일 퇴적', tag: '지층누중' }, { id: 'e2', label: '사암 퇴적', tag: '지층누중' }, { id: 'e3', label: '석회암 퇴적', tag: '지층누중' },
    { id: 'e4', label: '세 지층이 기울어짐', tag: '수평퇴적' }, { id: 'e5', label: '화성암 D 관입', tag: '관입·포획' },
    { id: 'e6', label: '융기·침식으로 깎임', tag: '부정합' }, { id: 'e7', label: '역암 E 퇴적 (D 자갈 포함)', tag: '부정합·자갈' }, { id: 'e8', label: '이암 F 퇴적 (암모나이트)', tag: '동물군 천이' },
  ];
  const A_ORDER = ['e6', 'e2', 'e8', 'e5', 'e1', 'e7', 'e3', 'e4'];
  function drawSecA(t) {
    const ids = S.secA.ids;
    ctx.save(); ctx.translate(SA.ox, SA.oy); ctx.scale(SA.sc, SA.sc);
    const W = 520, T = 20, Bm = 480;
    // 하늘
    // 블록 영역
    ctx.save(); ctx.beginPath(); ctx.rect(0, T, W, Bm - T); ctx.clip();
    // 이암 F 와 역암 E (부정합면 위)
    ctx.beginPath(); ctx.rect(0, T, W, 130); ctx.fillStyle = LITH_BASE.mud; ctx.fill(); fillLith('mud');
    ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(W, 150); for (let x = W; x >= 0; x -= 4) ctx.lineTo(x, AU(x)); ctx.closePath(); ctx.fillStyle = LITH_BASE.conglo; ctx.fill(); fillLith('conglo');
    ctx.strokeStyle = 'rgba(30,25,20,.55)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(W, 150); ctx.stroke();
    // 아래: 기울어진 세 지층 (부정합면 아래)
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, AU(0)); for (let x = 0; x <= W; x += 4) ctx.lineTo(x, AU(x)); ctx.lineTo(W, Bm); ctx.lineTo(0, Bm); ctx.closePath(); ctx.clip();
    const bands = [['lime', 0, 1], ['sand', 1, 2], ['shale', 2, 3]];
    bands.forEach(([kd, a, b]) => {
      // aLine(0) 석회암 윗면, aLine(1) 석회암 밑면(= 사암 윗면), aLine(2) 사암 밑면(= 셰일 윗면)
      const yt0 = aLine(a, 0), yt1 = aLine(a, W), yb0 = b === 3 ? 900 : aLine(b, 0), yb1 = b === 3 ? 900 : aLine(b, W);
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, yt0); ctx.lineTo(W, yt1); ctx.lineTo(W, yb1); ctx.lineTo(0, yb0); ctx.closePath(); ctx.clip();
      ctx.rotate(rad(15)); ctx.fillStyle = LITH_BASE[kd]; ctx.fillRect(-900, -900, 2400, 2400); ctx.fillStyle = lithFill(kd); ctx.fillRect(-900, -900, 2400, 2400);
      ctx.restore();
      ctx.strokeStyle = 'rgba(30,25,20,.55)'; ctx.lineWidth = 1.6; if (b < 3) { ctx.beginPath(); ctx.moveTo(0, yb0); ctx.lineTo(W, yb1); ctx.stroke(); }
    });
    // 접촉부와 암맥 D
    const dpts = [[270, Bm + 4], [310, Bm + 4], [310, 190], [270, 190]];
    ctx.save(); polyPath(dpts); ctx.lineJoin = 'round'; ctx.lineWidth = 34; ctx.strokeStyle = 'rgba(40,30,30,.30)'; ctx.stroke(); ctx.restore();
    polyPath(dpts); ctx.fillStyle = LITH_BASE.igneous; ctx.fill(); fillLith('igneous'); ctx.strokeStyle = '#2b1b36'; ctx.lineWidth = 2; ctx.stroke();
    // 포획암
    [[283, 438, 'shale', 1.2], [298, 392, 'shale', 1.0], [286, 292, 'sand', 1.0]].forEach(([x, y, kd, s], k) => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(k * 0.7); polyPath([[-9, -6], [3, -10], [10, -1], [6, 9], [-7, 7]]); ctx.fillStyle = LITH_BASE[kd]; ctx.fill(); fillLith(kd); ctx.strokeStyle = '#111827'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore(); });
    ctx.restore();
    // 역암 속 D 자갈
    [[262, 200, 8], [286, 203, 9], [308, 199, 7], [330, 204, 8]].forEach(([x, y, r], k) => pebbleAt(x, AU(x) - r * 0.7, r, 'igneous', k));
    [[200, 190, 6], [352, 192, 7], [150, 192, 5]].forEach(([x, y, r], k) => pebbleAt(x, AU(x) - r * 0.7, r, 'gravel', k + 2));
    // 부정합면 표시
    ctx.save(); ctx.setLineDash([9, 6]); ctx.lineDashOffset = -t * 12; ctx.strokeStyle = '#be123c'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = 0; x <= W; x += 4) { x ? ctx.lineTo(x, AU(x)) : ctx.moveTo(0, AU(0)); } ctx.stroke(); ctx.restore();
    // 화석
    drawAmm(120, 70, 13); drawAmm(410, 56, 11); drawAmm(250, 100, 9);
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.strokeRect(0, T, W, Bm - T);
    // 이름표
    const L = (x, y, text, bg, col, al) => D.label(x, y, text, { bg: bg || 'rgba(255,255,255,.93)', color: col || '#334155', size: 13, pad: 7, border: bg ? null : '#94a3b8', align: al || 'left' });
    L(8, 36, 'F 이암 (암모나이트)'); L(8, 138, 'E 역암 (D 자갈 포함)');
    L(380, AU(380) + 30, '석회암'); L(8, 244, '사암'); L(8, 420, '셰일'); L(318, 330, '화성암 D', '#5b4a6b', '#fff');
    L(W - 6, AU(W - 100) - 2 + 0, '부정합면', '#be123c', '#fff', 'right');
    // 번호 배지: 담은 순서대로 해당 부분에 표시
    const spot = { e1: [60, 440], e2: [110, 252], e3: [440, 250], e4: [30, 330], e5: [290, 345], e6: [150, AU(150) + 2], e7: [190, 170], e8: [330, 85] };
    ids.forEach((id, i) => { const p = spot[id]; D.sphere(p[0], p[1], 13, '#0284c7', { text: String(i + 1), textScale: 1.0, shadow: true }); });
    // 기울어짐 표시 (e4)
    if (ids.includes('e4')) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(360, 436); ctx.lineTo(500, 436); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(360, 436); ctx.lineTo(500, 436 + A_M * 140); ctx.stroke(); ctx.restore(); D.label(366, 462, '층이 15° 기울어짐', { bg: '#e0f2fe', color: '#075985', size: 12, pad: 6, align: 'left' }); }
    ctx.restore();
    // 오른쪽 법칙 안내 (태블릿) / 아래 (폰)
    const IR = PHONE ? { x: 12, y: 580, w: 576, h: 248 } : { x: 584, y: 12, w: 204, h: 536 };
    panel(IR.x, IR.y, IR.w, IR.h, { title: '법칙 이름표', border: '#bae6fd' });
    const laws = [['지층누중', '아래 지층이 먼저'], ['수평퇴적', '기울었다면 쌓인 뒤 변형'], ['관입·포획', '뚫은 쪽이 나중, 포획된 쪽이 먼저'], ['부정합', '아래 지층이 먼저, 사이에 결층'], ['동물군 천이', '화석으로 시대 비교']];
    const full = ids.length === 8 && ids.every((id, i) => id === A_EVENTS[i].id);
    laws.forEach((l, i) => {
      const yy = IR.y + 40 + i * (PHONE ? 38 : 72);
      D.label(IR.x + 12, yy + 8, l[0], { bg: full ? '#15803d' : '#64748b', color: '#fff', size: 13, pad: 8, align: 'left' });
      if (PHONE) tx(IR.x + 150, yy + 13, l[1], 13, gcl.ink, 'left', 700); else drawWrap(IR.x + IR.w / 2, yy + 36, l[1], IR.w - 20, 12.5, { color: gcl.ink, lh: 1.25 });
    });
  }

  /* =========================================================
     조작 · 읽기 칸 · 단계와 미션
     ========================================================= */
  const VIEW_LABEL = { box: '🧪 퇴적 상자: 수평퇴적 · 지층누중', rate: '⏱ 퇴적 속도와 걸린 시간', intr: '🌋 마그마의 관입', case: '🗂 누가 먼저일까? 사례 3가지', unc: '⏳ 부정합이 만들어지는 과정', type: '🧱 부정합의 세 가지 종류', corr: '🔗 층서 대비: 키층과 화석', secA: '📐 단면도 A: 사건 순서 정하기' };
  const pourBtns = $$('#pourSeg .opt'), envBtns = $$('#envSeg .opt'), laterBtns = $$('#laterSeg .opt'), caseBtns = $$('#caseSeg .opt'), caseAnsBtns = $$('#caseAns .opt'), corrBtns = $$('#corrSeg .opt');
  const sTilt = $('#sTilt'), oTilt = $('#oTilt'), sThick = $('#sThick'), oThick = $('#oThick');
  const typeRowsEl = $('#typeRows');
  const TYPE_OPTS = [['', '고르세요'], ['parallel', '평행 부정합'], ['angular', '경사 부정합'], ['nonconf', '난정합']];
  typeRowsEl.innerHTML = [0, 1, 2].map((i) => '<div class="row-sel"><span>' + TYPE_NAMES[i] + '</span><select class="mini-sel" data-i="' + i + '" aria-label="단면 ' + TYPE_NAMES[i] + '의 종류">' + TYPE_OPTS.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select></div>').join('');
  const typeSels = $$('#typeRows select');
  const seqUnc = makeSeq($('#seqUnc'), [{ id: 'dep1', label: '바다 밑에 지층이 쌓임' }, { id: 'up', label: '융기: 땅이 솟아오름' }, { id: 'ero', label: '침식: 윗부분이 깎임' }, { id: 'sub', label: '침강: 땅이 가라앉음' }, { id: 'dep2', label: '깎인 면 위에 새 지층이 쌓임' }], { order: ['ero', 'dep2', 'up', 'dep1', 'sub'] });
  const seqA = makeSeq($('#seqA'), A_EVENTS.map((e) => ({ id: e.id, label: e.label + ' <small>· ' + e.tag + '</small>' })), { order: A_ORDER, onChange(ids) { S.secA.ids = ids; } });

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes || !c.dataset.modes.split(' ').includes(S.view); });
    $('#seqUncBox').hidden = !(S.view === 'unc' && S.unc.seqOn);
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.view === S.view); });
    $('#modeSeg').hidden = !(game && game.free);
    const B = S.box, busy = !!B.pour;
    pourBtns.forEach((b) => { b.disabled = busy || B.layers.length >= MAXL || B.def > 0.5; b.classList.toggle('on', busy && B.pour.layer.k === b.dataset.k); });
    $('#oLayers').textContent = B.layers.length + ' / ' + MAXL + '층';
    const lockTilt = B.layers.length > 0 || busy;
    sTilt.disabled = lockTilt; setSlider(sTilt, oTilt, lockTilt && B.depTilt != null ? B.depTilt : B.tiltT, (v) => f0(v) + '°');
    $('#bDeform').disabled = !B.layers.length || busy || B.solid;
    $('#bDeform').textContent = B.solid ? (B.def >= 21.5 ? '🪨 땅이 기울어졌어요' : '🪨 기울어지는 중…') : '🪨 굳히고 땅 기울이기';
    $('#tiltNote').textContent = lockTilt ? '층이 쌓인 뒤에는 상자 기울기를 바꿀 수 없어요. ↺ 비우기를 누르면 다시 할 수 있어요.' : '층을 쌓기 전에 상자를 기울여 두면, 쌓이는 층은 어떻게 될까요?';
    const R = S.rate;
    envBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === R.env));
    setSlider(sThick, oThick, R.thick, (v) => v + ' m');
    const I = S.intr;
    $('#bIntrude').disabled = I.ran; $('#bIntrude').textContent = I.done ? '관입이 끝났어요' : I.ran ? '관입하는 중…' : '▶ 마그마 관입';
    $('#laterBox').style.opacity = I.done ? 1 : 0.5;
    laterBtns.forEach((b) => { b.disabled = !I.done; b.classList.toggle('on', I.pick === b.dataset.k); b.classList.toggle('bad', I.pick === b.dataset.k && I.bad); b.classList.toggle('good', I.pick === b.dataset.k && !I.bad); });
    const C = S.cases;
    caseBtns.forEach((b) => b.classList.toggle('on', +b.dataset.k === C.sel));
    $('#caseQ').textContent = CASE_DEF[C.sel].q;
    caseAnsBtns.forEach((b, i) => { b.innerHTML = CASE_DEF[C.sel].opts[i]; const a = C.ans[C.sel]; b.classList.toggle('on', a === i); b.classList.toggle('good', a === i && a === CASE_DEF[C.sel].ok); b.classList.toggle('bad', a === i && a !== CASE_DEF[C.sel].ok); });
    const U = S.unc; $('#oStage').textContent = uncStage(U.uT) + ' / 5';
    $('#bStPrev').disabled = U.uT <= 0; $('#bStNext').disabled = U.uT >= 5; $('#bStPlay').textContent = U.play ? '⏵ 재생 중…' : '⏵ 처음부터 재생'; $('#bStPlay').disabled = U.play;
    typeSels.forEach((s) => { s.value = S.types.ans[+s.dataset.i] || ''; });
    corrBtns.forEach((b) => { b.classList.toggle('on', b.dataset.k === S.corr.target); b.classList.toggle('good', S.corr.done[b.dataset.k]); });
    const cc = S.corr;
    $('#corrNote').textContent = cc.done.tuff && cc.done.amm ? (cc.gapFound ? '결층을 찾았어요! 지역 2의 침식면이 그곳이에요.' : '이제 지역 2에서 지층이 빠진 곳(침식면)을 눌러 봐요.') : (CORR_NAME[cc.target] + ': 지역 1·2·3에서 ' + cc.picked[cc.target].filter((v) => v != null).length + ' / 3 연결').replace('연결', '골랐어요');
  }
  pourBtns.forEach((b) => b.addEventListener('click', () => { boxPour(b.dataset.k); updateCtl(); }));
  bindSlider(sTilt, oTilt, (v) => f0(v) + '°', (v) => { if (!S.box.layers.length && !S.box.pour) S.box.tiltT = v; });
  $('#bDeform').addEventListener('click', () => { boxDeform(); updateCtl(); });
  $('#bBoxReset').addEventListener('click', () => { Sound.click(); boxReset(); S.box.tilt = S.box.tiltT = 0; updateCtl(); });
  envBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.rate.env = b.dataset.k; updateCtl(); }));
  bindSlider(sThick, oThick, (v) => v + ' m', (v) => { S.rate.thick = v; updateCtl(); });
  $('#bYr').addEventListener('click', recordRate);
  $('#inYr').addEventListener('keydown', (e) => { if (e.key === 'Enter') recordRate(); });
  $('#bIntrude').addEventListener('click', intrRun);
  $('#bIntrReset').addEventListener('click', () => { Sound.click(); intrReset(); });
  laterBtns.forEach((b) => b.addEventListener('click', () => {
    const I = S.intr; if (!I.done) return; I.pick = b.dataset.k; I.bad = I.pick !== 'dike';
    if (I.bad) { Sound.fail(); say('세 지층은 D가 뚫고 지나간 쪽이에요. 뚫린 쪽이 먼저 있었어요. 다시 생각해 봐요.', true, 3); } else { Sound.success(); say('맞아요! 암맥 D가 나중에 생겼어요.', false, 2.4); }
    updateCtl();
  }));
  caseBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.cases.sel = +b.dataset.k; updateCtl(); }));
  caseAnsBtns.forEach((b) => b.addEventListener('click', () => {
    const C = S.cases, i = +b.dataset.k; C.ans[C.sel] = i;
    if (i === CASE_DEF[C.sel].ok) { Sound.success(); } else { Sound.fail(); C.shake = 0.5; }
    updateCtl();
  }));
  $('#bStPrev').addEventListener('click', () => { Sound.click(); uncGo(-1); });
  $('#bStNext').addEventListener('click', () => { Sound.click(); uncGo(1); });
  $('#bStPlay').addEventListener('click', uncPlay);
  typeSels.forEach((s) => s.addEventListener('change', () => { Sound.click(); S.types.ans[+s.dataset.i] = s.value || null; updateCtl(); }));
  corrBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); S.corr.target = b.dataset.k; updateCtl(); }));
  $('#bCorrReset').addEventListener('click', () => { Sound.click(); corrReset(); });

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'case') { const rs = caseRects(); for (let i = 0; i < 3; i++) { const r = rs[i]; if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { S.cases.sel = i; Sound.click(); updateCtl(); } } return false; }
      if (S.view === 'corr') { corrTap(p); return false; }
      return false;
    },
    hover(p) {
      if (S.view === 'case') { const rs = caseRects(); return rs.some((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) ? 'pointer' : 'default'; }
      if (S.view === 'corr') return 'pointer';
      return 'default';
    },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'box') { const B = S.box; setReadouts(['상자 기울기', f0(B.layers.length ? (B.depTilt || 0) : B.tilt) + '°', '쌓인 층', B.layers.length + ' / ' + MAXL + '층', '지층면 (수평면 기준)', !B.layers.length ? '—' : B.def >= 0.5 ? f0(B.def) + '° 기울어짐' : '0° 수평']); }
    else if (v === 'rate') { const R = S.rate, dk = R.rec.deep && R.rec.deep.thick === R.thick, dl = R.rec.delta && R.rec.delta.thick === R.thick; setReadouts(['쌓인 두께', R.thick + ' m', '심해 점토', dk ? fmtMan(R.rec.deep.val) : '?', '삼각주 모래', dl ? fmtMan(R.rec.delta.val) : '?']); }
    else if (v === 'intr') { const I = S.intr; setReadouts(['관입', I.done ? '끝남' : I.ran ? '진행 중 ' + f0(I.p * 100) + '%' : '아직', '나중에 생긴 것', I.pick ? (I.pick === 'dike' ? '암맥 D' : '세 지층') : '—', '순서 (오래됨 → 젊음)', I.done && I.pick === 'dike' ? '지층 < D' : '—']); }
    else if (v === 'case') { const C = S.cases, n = C.ans.filter((a, i) => a === CASE_DEF[i].ok).length; setReadouts(['고른 사례', '사례 ' + (C.sel + 1), '맞힌 사례', n + ' / 3', '핵심', '뚫은 쪽이 나중']); }
    else if (v === 'unc') { const U = S.unc; setReadouts(['단계', uncStage(U.u) + ' / 5', '지금 일어나는 일', ['—', '퇴적', '융기', '침식', '침강', '다시 퇴적'][uncStage(U.u)], '결층', U.u > 1.5 ? (U.u >= 4.95 ? '기록 빠짐' : '생기는 중') : '아직']); }
    else if (v === 'type') { const n = S.types.ans.filter((a, i) => a === TYPE_DEF[i].id).length; setReadouts(['맞힌 단면', n + ' / 3', '살펴볼 것', '부정합면 아래 지층', '위 지층', '모두 수평']); }
    else if (v === 'corr') { const C = S.corr, c = (tg) => (C.done[tg] ? '연결 완료' : C.picked[tg].filter((x) => x != null).length + ' / 3'); setReadouts(['응회암 키층', c('tuff'), '암모나이트층', c('amm'), '결층 찾기', C.gapFound ? '지역 2 ✓' : C.gapOn ? '눌러서 찾기' : '—']); }
    else { const ids = S.secA.ids, ok = ids.filter((id, i) => id === A_EVENTS[i].id).length; setReadouts(['담은 사건', ids.length + ' / 8', '맞는 자리', ids.length === 8 ? ok + ' / 8' : '8개를 모두 담아요', '가장 오래된 일', '셰일 퇴적']); }
  }

  /* ---------- 단계 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    S.unc.seqOn = false;
    if (li === 0) { boxReset(); S.box.tilt = S.box.tiltT = 0; setView('box'); showHint('상자를 기울이고 퇴적물을 흘려 넣어 봐요', 5000); }
    else if (li === 1) { intrReset(); S.cases.ans = [null, null, null]; S.cases.sel = 0; setView('intr'); showHint('▶ 마그마 관입을 눌러 봐요', 5000); }
    else if (li === 2) { S.unc.u = S.unc.uT = 0; S.unc.play = false; seqUnc.reset(); S.types.ans = [null, null, null]; setView('unc'); showHint('다음 단계 ▶ 로 한 단계씩 살펴봐요', 5000); }
    else { corrReset(); S.corr.target = 'tuff'; seqA.reset(); S.secA.ids = []; setView('corr'); showHint('같은 층을 세 지역에서 하나씩 눌러 연결해요', 5000); }
    updateCtl();
  }
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const typeOk = () => S.types.ans.every((a, i) => a === TYPE_DEF[i].id);
  const uncSeqOk = () => seqUnc.ids().join() === 'dep1,up,ero,sub,dep2';
  const SRC = '<p style="font-size:13.5px;color:var(--muted);margin-top:6px">※ 퇴적 속도·두께·단면도는 모두 교육용 <b>예시 자료</b>예요.</p>';

  const levels = [
    {
      title: '동일 과정: 지층은 어떻게 쌓일까', short: '동일 과정', icon: '🧪', phase: '관찰', features: ['box', 'rate'],
      intro: '<p class="si-q">❓ 탐구 질문: 수억 년 전 일어난 일의 순서를 암석만 보고 어떻게 알아낼 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교 「지권의 변화」에서</b> 퇴적물이 쌓여 퇴적암이 되고, 지층이 만들어진다는 것을 배웠어요.</div>' +
        '<p>지사학의 첫째 원리는 <b>동일 과정의 원리</b>예요. “현재 일어나는 지질 작용이 과거에도 같은 방식으로 일어났다”고 보고, 지금 관찰한 것으로 과거를 해석해요. 먼저 퇴적물이 어떤 모양으로 쌓이는지, 얼마나 빨리 쌓이는지 실험해 봐요.</p>' + SRC,
      setup() { enterLevel(0); },
      recap: '현재의 지질 작용으로 과거를 해석해요(동일 과정의 원리). 퇴적물은 수평하게 쌓이고, 아래층이 위층보다 먼저 쌓여요.',
      summary: '<ul><li><b>동일 과정의 원리</b>: 현재 일어나는 지질 작용이 과거에도 같은 방식으로 일어났다. (현재는 과거를 푸는 열쇠)</li><li><b>수평퇴적의 법칙</b>: 퇴적물은 중력 때문에 수평하게 쌓여요. 기울어진 지층은 쌓인 뒤에 변형됐어요.</li><li><b>지층누중의 법칙</b>: 변형을 받지 않았다면 아래 지층이 위 지층보다 먼저 쌓였어요.</li>' + '<li>걸린 시간 = 두께 ÷ 퇴적 속도. 심해 점토 30 m는 3천만 년, 삼각주 모래 30 m는 3만 년이에요. (퇴적 속도는 일정하지 않아서 어림값)</li></ul>',
      missions: [
        {
          title: '기울인 상자에 지층 쌓기',
          goal: '상자를 <b>10° 이상</b> 기울인 뒤 자갈·모래·점토를 <b>한 번씩</b> 넣어 3층 이상 쌓고, <b>🪨 굳히고 땅 기울이기</b>를 눌러요.',
          hint: '① 상자 기울이기 슬라이더를 10° 이상으로 ② 자갈·모래·점토 버튼을 차례로 (한 층이 다 쌓인 뒤에 다음 층) ③ 🪨 굳히고 땅 기울이기',
          hold: 0.6, setup() { boxReset(); S.box.tilt = S.box.tiltT = 0; setView('box'); },
          status: () => { const B = S.box; return '10° 이상 기울인 상자 ' + mark(B.depTilt != null && B.depTilt >= 10) + ' · 세 종류 쌓음 ' + mark(B.layers.length >= 3 && ['gravel', 'sand', 'clay'].every((k) => B.kinds[k])) + ' · 땅이 기울어짐 ' + mark(B.def >= 21.5); },
          check: () => { const B = S.box; return B.depTilt != null && B.depTilt >= 10 && B.layers.length >= 3 && !B.pour && ['gravel', 'sand', 'clay'].every((k) => B.kinds[k]) && B.def >= 21.5; },
          explain: '상자를 기울여도 가라앉은 알갱이는 중력 때문에 <b>수평</b>하게 쌓였어요(수평퇴적의 법칙). 먼저 쌓인 아래층이 가장 오래됐어요(지층누중의 법칙). 수평하게 쌓인 층이 지금 기울어 있다면, 쌓인 <b>뒤에</b> 땅이 변형된 거예요.',
        },
        {
          title: '퇴적 속도로 걸린 시간 구하기',
          goal: '두께가 <b>30 m</b>일 때, 심해 점토와 삼각주 모래가 쌓이는 데 걸린 시간을 각각 <b>만 년</b> 단위로 구해 📝 기록해요.',
          hint: '30 m = 30000 mm 예요. 심해 점토는 1 mm가 쌓이는 데 1000년, 삼각주 모래는 1년이 걸려요. (심해: 30000 × 1000년 = 3천만 년 = 3000만 년)',
          hold: 0.4, setup() { setView('rate'); S.rate.thick = 30; S.rate.thickD = 30; S.rate.env = 'deep'; $('#inYr').value = ''; },
          status: () => { const r = S.rate.rec; return '심해 점토 ' + mark(r.deep && r.deep.thick === 30) + ' · 삼각주 모래 ' + mark(r.delta && r.delta.thick === 30); },
          check: () => { const r = S.rate.rec; return !!(r.deep && r.deep.thick === 30 && r.delta && r.delta.thick === 30); },
          explain: '30 m = 30000 mm 예요. 심해 점토(1 mm/천 년)는 30000 × 1000년 = <b>3천만 년(3000만 년)</b>, 삼각주 모래(1 mm/년)는 30000년 = <b>3만 년</b>이 걸려요. 같은 두께라도 환경에 따라 걸린 시간이 1000배나 달라요.',
        },
        {
          type: 'quiz', title: '동일 과정의 원리', goal: '“현재는 과거를 푸는 열쇠”라는 말이 뜻하는 것은?', setup() { setView('rate'); },
          choices: ['지금 관찰되는 지질 작용이 과거에도 같은 방식으로 일어났다고 보고, 지층에서 옛 환경을 해석해요', '과거의 지질 작용은 지금과 완전히 달라서 현재의 자료는 쓸 수 없어요', '퇴적 속도는 언제나 일정해서 두께만 재면 정확한 나이를 알 수 있어요', '지층은 아주 오래전에 한꺼번에 만들어졌어요'],
          answer: 0,
          feedback: ['', '동일 과정의 원리는 반대로 현재의 작용을 과거에도 적용해요.', '퇴적 속도는 홍수·가뭄·환경에 따라 달라서 일정하지 않아요. 두께로 구한 시간은 어림값이에요.', '지층은 오랜 시간 동안 조금씩 쌓인 거예요. 지금 쌓이는 속도를 보면 알 수 있어요.'],
          explain: '현재 관찰되는 지질 작용(퇴적, 침식, 화산 활동…)이 과거에도 같은 방식으로 일어났다고 보는 것이 <b>동일 과정의 원리</b>예요. 다만 퇴적 속도는 일정하지 않아서 이렇게 구한 시간은 어림값이에요.',
        },
      ],
    },
    {
      title: '관입과 포획: 누가 먼저일까', short: '관입·포획', icon: '🌋', phase: '탐구', features: ['intr', 'case'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지층은 아래층이 먼저 쌓인다는 것(지층누중)을 확인했어요.</div>' +
        '<p>그런데 마그마가 지층을 뚫고 들어와 굳으면 위아래만으로는 순서를 알 수 없어요. <b>관입의 법칙</b>은 “관입한 암석이 관입당한 암석보다 나중”이라는 거예요. 마그마가 지층을 뚫는 장면과 사례 카드로 어느 쪽이 먼저인지 판단해 봐요.</p>' + SRC,
      setup() { enterLevel(1); },
      recap: '관입한 암석은 관입당한 암석보다 나중이고, 포획된 암석은 포획한 암석보다 먼저예요. 단단한 정도는 순서와 관계없어요.',
      summary: '<ul><li><b>관입의 법칙</b>: 관입한 암석이 관입당한 암석보다 나중에 생겼어요. 주변에 접촉부(구운 듯한 가장자리)가 생겨요.</li><li><b>포획암</b>: 화성암 속에 들어 있는 모암 조각. 포획된 암석이 화성암보다 오래됐어요.</li><li>반대로 <b>역암 속 화성암 자갈</b>은 그 화성암이 역암보다 먼저 있었다는 증거예요.</li><li>순서는 단단한 정도가 아니라 “누가 누구를 뚫었나, 품었나”로 정해요.</li></ul>',
      missions: [
        {
          title: '암맥과 지층, 나중 것 고르기',
          goal: '<b>▶ 마그마 관입</b>을 보고, 세 지층과 암맥 D 중 <b>나중에 생긴 것</b>을 골라요.',
          hint: '마그마가 올라오는 장면을 끝까지 본 뒤, “나중에 생긴 것”에서 뚫은 쪽을 골라요.',
          hold: 0.4, setup() { intrReset(); setView('intr'); },
          status: () => '관입을 봄 ' + mark(S.intr.done) + ' · 나중 것을 맞게 고름 ' + mark(S.intr.pick === 'dike'),
          check: () => S.intr.done && S.intr.pick === 'dike',
          explain: '암맥 D가 세 지층을 <b>뚫고</b> 올라왔어요. 뚫린 지층이 먼저 있었고, 뚫은 D가 나중이에요(관입의 법칙). D 가장자리의 구운 자국(접촉부)과 D 속의 셰일 조각(포획암)도 같은 증거예요.',
        },
        {
          title: '세 사례의 선후 판정', manual: true,
          goal: '사례 1~3에서 <b>먼저 생긴 것</b>을 각각 골라요. 세 개를 모두 고르면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '그림에서 “무엇이 무엇을 뚫었는지, 무엇이 무엇을 품고 있는지” 살펴봐요. 단단한 정도는 순서와 관계없어요.',
          setup() { S.cases.ans = [null, null, null]; S.cases.sel = 0; setView('case'); },
          status: () => '고른 사례 ' + S.cases.ans.filter((a) => a != null).length + ' / 3',
          check: () => {
            const a = S.cases.ans, n = a.findIndex((x) => x == null);
            if (n >= 0) return '사례 ' + (n + 1) + '의 답을 아직 고르지 않았어요.';
            const w = a.findIndex((x, i) => x !== CASE_DEF[i].ok);
            if (w < 0) return true;
            return ['사례 1: 화성암 속에 들어 있는 조각은 마그마가 굳기 전부터 있던 암석이에요.', '사례 2: 암맥이 지층을 뚫었어요. 뚫린 쪽이 먼저예요.', '사례 3: 역암 속에 자갈로 들어 있는 화성암은 역암보다 먼저 만들어졌어요.'][w] + ' (단단한 쪽이 먼저가 아니에요.)';
          },
          explain: '관입한 암석은 관입당한 암석보다 <b>나중</b>, 포획된 암석은 포획한 화성암보다 <b>먼저</b>, 역암 속 화성암 자갈은 역암보다 <b>먼저</b>예요. 암석이 단단한지가 아니라 “누가 누구를 뚫거나 품었는가”로 순서를 정해요.',
        },
      ],
    },
    {
      title: '부정합: 기록이 끊긴 면', short: '부정합', icon: '⏳', phase: '모형', features: ['unc', 'type'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 관입과 포획으로 암석의 순서를 정했어요. 이번에는 지층과 지층 <b>사이의 경계</b>에서 시간을 읽어요.</div>' +
        '<p>아래 지층과 위 지층이 연속해서 쌓이지 않고 중간에 <b>쉼</b>이 있었다면, 그 경계가 <b>부정합면</b>이에요. 부정합이 만들어지는 과정(퇴적 → 융기 → 침식 → 침강 → 다시 퇴적)을 보고, 아래 지층의 상태에 따라 부정합을 분류해 봐요.</p>' + SRC,
      setup() { enterLevel(2); },
      recap: '부정합면 아래 지층이 위 지층보다 오래됐고, 그 사이에는 퇴적이 멈추었거나 깎여 나간 시간(결층)이 있어요.',
      summary: '<ul><li>부정합이 만들어지는 과정: <b>퇴적 → 융기 → 침식 → 침강 → 다시 퇴적</b></li><li><b>부정합의 법칙</b>: 부정합면 아래 지층이 위 지층보다 오래됐어요.</li><li>부정합면 사이에는 퇴적이 없었거나 깎여 나간 시간, <b>결층</b>이 있어요.</li>' + tb([['종류', '부정합면 아래'], ['평행 부정합', '수평인 퇴적층'], ['경사 부정합', '기울어진 퇴적층'], ['난정합', '화성암·변성암']]) + '</ul>',
      missions: [
        {
          title: '부정합이 만들어지는 순서', manual: true,
          goal: '다섯 가지 사건을 <b>일어난 순서대로</b> 담고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '“다음 단계 ▶”나 “처음부터 재생”으로 장면을 보면서 순서를 확인해요. 땅이 올라오면 깎이기 시작해요.',
          setup() { S.unc.seqOn = true; setView('unc'); },
          status: () => '담은 사건 ' + seqUnc.ids().length + ' / 5',
          check: () => {
            const a = seqUnc.ids(); if (a.length < 5) return '다섯 사건을 모두 담아요.';
            if (uncSeqOk()) return true;
            const want = ['dep1', 'up', 'ero', 'sub', 'dep2'], i = a.findIndex((x, k) => x !== want[k]);
            return (i + 1) + '번째 자리가 아직 맞지 않아요. 지층이 쌓인 뒤에 땅이 올라와 깎이고, 다시 가라앉은 뒤에 새 지층이 쌓여요.';
          },
          explain: '순서는 <b>① 퇴적 → ② 융기 → ③ 침식 → ④ 침강 → ⑤ 다시 퇴적</b>이에요. 땅이 바다 위로 올라오는 동안에는 지층이 쌓이지 않고 오히려 깎여요. 그 시간이 지층에 기록되지 않는 <b>결층</b>이에요.',
        },
        {
          title: '부정합 세 가지 분류', manual: true,
          goal: '단면 가·나·다의 부정합을 <b>부정합면 아래 지층의 상태</b>로 분류하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '부정합면(붉은 점선) 아래를 보세요. 줄무늬가 수평인지, 기울었는지, 줄무늬 없이 알갱이 모양인지 살펴봐요.',
          setup() { S.unc.seqOn = false; S.types.ans = [null, null, null]; setView('type'); },
          status: () => '고른 단면 ' + S.types.ans.filter((a) => a).length + ' / 3',
          check: () => {
            const a = S.types.ans, n = a.findIndex((x) => !x); if (n >= 0) return '단면 ' + TYPE_NAMES[n] + '의 종류를 아직 고르지 않았어요.';
            const w = a.findIndex((x, i) => x !== TYPE_DEF[i].id);
            return w < 0 ? true : '단면 ' + TYPE_NAMES[w] + ': ' + ({ nonconf: '아래가 줄무늬 없는 알갱이 모양의 화성암이에요.', parallel: '아래 지층이 위 지층과 나란한 수평층이에요.', angular: '아래 지층의 줄무늬가 기울어 있고 위 지층은 수평이에요.' })[TYPE_DEF[w].id] + ' 다시 살펴봐요.';
          },
          explain: '아래 지층이 수평이면 <b>평행 부정합</b>, 기울어 있으면 <b>경사 부정합</b>, 아래가 화성암이나 변성암이면 <b>난정합</b>이에요. 모두 위 지층은 부정합면 위에 수평으로 쌓였어요.',
        },
        {
          type: 'quiz', title: '부정합면 사이의 시간', goal: '부정합면은 아래 지층과 위 지층 사이에 시간이 전혀 흐르지 않았다는 뜻일까요?', setup() { S.unc.seqOn = false; setView('unc'); },
          choices: ['그래요. 두 지층은 곧바로 이어서 쌓였어요', '아니에요. 그 사이에 퇴적이 멈췄거나 깎여 나간 시간(결층)이 있어요', '아니에요. 부정합면은 지층이 기울어진 면일 뿐 시간과는 관계없어요', '그래요. 부정합면은 가장 오래된 지층을 뜻해요'],
          answer: 1,
          feedback: ['연속해서 쌓였다면 부정합이 아니라 정합이에요. 부정합면에는 깎인 흔적이 남아 있어요.', '', '경사 부정합이 아닌 평행·난정합도 있어요. 부정합은 기울기가 아니라 빠진 시간으로 정해요.', '부정합면은 오래된 지층을 뜻하는 게 아니라 기록이 끊긴 면이에요.'],
          explain: '부정합면은 시간이 없는 면이 아니라 <b>기록이 빠진 면</b>이에요. 융기·침식·침강이 일어나는 동안 쌓인 지층이 없거나 깎여 나가서 그 시간만큼 결층이 생겨요.',
        },
      ],
    },
    {
      title: '층서 대비: 떨어진 지층 잇기', short: '층서 대비', icon: '🔗', phase: '적용', features: ['corr', 'secA'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 부정합면 사이에 결층이 생긴다는 것을 알았어요.</div>' +
        '<p>멀리 떨어진 지역의 지층이 같은 시대인지는 <b>암석의 종류만으로는 알 수 없어요</b>. 짧은 시간에 넓게 퍼진 <b>키층</b>(응회암 등)과, 시간에 따라 일정한 순서로 바뀌는 화석(<b>동물군 천이</b>)으로 지층을 대비해요. 마지막에는 배운 법칙을 모두 써서 단면도 A의 사건 순서를 정리해 봐요.</p>' + SRC,
      setup() { enterLevel(3); },
      recap: '키층과 표준 화석으로 떨어진 지층을 대비하고, 여러 법칙을 함께 써서 지질 단면도의 사건 순서를 정해요.',
      summary: '<ul><li><b>층서 대비</b>: 떨어진 지역의 지층을 같은 시대끼리 연결하는 일.</li><li>방법: 암상 대비, <b>키층</b>(화산재층처럼 짧은 시간에 넓게 퍼진 층) 대비, <b>화석</b> 대비(동물군 천이의 법칙).</li><li>표준 화석은 짧은 기간 번성하고 넓게 분포해서 지층의 시대를 알려 줘요.</li><li>단면도 A 순서: 셰일 → 사암 → 석회암 → 기울어짐 → D 관입 → 침식(부정합) → 역암 E → 이암 F</li></ul>',
      missions: [
        {
          title: '키층과 화석으로 지층 잇기',
          goal: '응회암 키층과 암모나이트층을 세 지역에서 각각 연결하고, 지역 2에서 <b>지층이 빠진 곳(부정합)</b>을 찾아 눌러요.',
          hint: '위의 “대비할 층 고르기”에서 층 종류를 고른 뒤, 지역 1·2·3에서 같은 층을 하나씩 눌러요. 둘 다 이으면 지역 2의 침식면이 붉은 고리로 표시돼요.',
          hold: 0.5, setup() { corrReset(); S.corr.target = 'tuff'; setView('corr'); updateCtl(); },
          status: () => '응회암 키층 ' + mark(S.corr.done.tuff) + ' · 암모나이트층 ' + mark(S.corr.done.amm) + ' · 결층 찾음 ' + mark(S.corr.gapFound),
          check: () => S.corr.done.tuff && S.corr.done.amm && S.corr.gapFound,
          explain: '응회암(화산재층)은 짧은 시간에 넓게 퍼져서 <b>키층</b>이 되고, 암모나이트는 일정한 시기에만 살아서 같은 화석이 나온 층은 같은 시대로 볼 수 있어요(동물군 천이). 지역 2에는 응회암과 암모나이트층 사이에 부정합이 있어 그 사이의 지층 일부가 없어요.',
        },
        {
          title: '단면도 A의 사건 순서', manual: true,
          goal: '단면도 A에서 일어난 8가지 사건을 <b>오래된 것부터</b> 순서대로 담고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '아래 지층부터(지층누중), 기울어진 층을 뚫은 D(관입), D의 윗부분을 깎은 면(부정합), 그 위에 쌓인 E(D 자갈 포함)와 F를 차례로 생각해요.',
          setup() { seqA.reset(); S.secA.ids = []; setView('secA'); },
          status: () => '담은 사건 ' + S.secA.ids.length + ' / 8',
          check: () => {
            const a = S.secA.ids; if (a.length < 8) return '8가지 사건을 모두 담아요.';
            const i = a.findIndex((x, k) => x !== A_EVENTS[k].id);
            if (i < 0) return true;
            return (i + 1) + '번째 자리가 아직 맞지 않아요. ' + (i < 3 ? '아래 지층이 먼저 쌓였어요.' : '관입한 D가 지층보다 나중이고, D의 윗부분이 깎인 뒤에 E가 쌓였어요.');
          },
          explain: '순서는 <b>셰일 → 사암 → 석회암(지층누중) → 기울어짐 → D 관입(관입의 법칙) → 융기·침식(부정합) → 역암 E(D의 자갈 포함) → 이암 F(암모나이트)</b>예요. E 속에 D의 자갈이 있으니 D가 E보다 먼저예요. 지층이 기울어진 것은 쌓인 뒤의 변형이에요.',
        },
        {
          type: 'quiz', title: '표준 화석이 대비에 유리한 까닭', goal: '화석으로 지층을 대비할 때 <b>표준 화석</b>이 유리한 까닭은?', setup() { setView('corr'); },
          choices: ['짧은 기간에 번성하고 넓은 지역에 살아서, 같은 화석이 나온 지층은 같은 시대로 볼 수 있어요', '아주 오랫동안 한 곳에서만 살아서 그 지역 지층을 구별하기 쉬워요', '화석이 크고 단단해서 눈에 잘 띄어요', '지층의 암석 종류가 바뀌면 화석도 같이 바뀌어요'],
          answer: 0,
          feedback: ['', '오랫동안 한 곳에만 살면 시대를 좁히기 어렵고 다른 지역과 대비하기도 어려워요.', '눈에 잘 띄는 것보다 “살았던 기간이 짧고 분포가 넓은 것”이 중요해요.', '화석은 암석 종류가 아니라 시간에 따라 일정한 순서로 바뀌어요(동물군 천이).'],
          explain: '표준 화석은 <b>짧은 기간 동안 번성</b>하고 <b>넓은 지역에 분포</b>해서, 같은 표준 화석이 나온 지층은 거의 같은 시대라고 볼 수 있어요. 삼엽충·암모나이트가 대표적이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-relative-age', mount: '#game', badge: '지층 해석가', homeHref: '../../index.html#he',
    featureLabels: { box: '🧪 퇴적 상자 · 기울기 슬라이더', rate: '⏱ 퇴적 속도 · 걸린 시간 계산', intr: '🌋 마그마 관입 장면', case: '🗂 선후 관계 사례 카드', unc: '⏳ 부정합 형성 과정', type: '🧱 부정합 세 가지', corr: '🔗 주상도 연결 · 키층·화석', secA: '📐 단면도 A 사건 순서' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    const I = S.intr;
    if (I.done && I.heat > 0) I.heat = Math.max(0, I.heat - dt * 0.45);
    if (S.view === 'box') { const wasPour = !!S.box.pour, wd = S.box.def; updateBox(dt); if (wasPour !== !!S.box.pour || (wd < 21.5) !== (S.box.def < 21.5)) updateCtl(); }
    else if (S.box.pour) updateBox(dt);
    if (S.corr.shakeT > 0) S.corr.shakeT -= dt;
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#eaf3f8'; ctx.fillRect(0, 0, VW, VH);
    if (S.view === 'box') drawBox(t);
    else if (S.view === 'rate') drawRate(t, dt);
    else if (S.view === 'intr') drawIntr(t, dt);
    else if (S.view === 'case') drawCases(t);
    else if (S.view === 'unc') { const pu = Math.round(S.unc.uT), pp = S.unc.play; drawUnc(t, dt); if (pp !== S.unc.play) updateCtl(); }
    else if (S.view === 'type') drawTypes(t);
    else if (S.view === 'corr') drawCorr(t, dt);
    else drawSecA(t);
    parts.draw(ctx);
    drawFlash(dt, PHONE ? 10 : VH - 96);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, CORR_COLS, CG, layerBox, CASE_DEF, TYPE_DEF, A_EVENTS, RATES, rateMan, boxPour, boxDeform, boxReset, intrRun, intrReset, uncGo, uncPlay, corrTap, corrReset, setView, updateCtl, seqUnc, seqA, enterLevel, caseRects,
    get game() { return game; },
  };

})();

