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
     지구과학 Ⅱ. 지구의 역사와 한반도의 암석 - 퇴적 구조와 퇴적 환경
     [12지구02-02] 지층(퇴적 구조)과 화석을 통해 지질시대의 환경 변화를 해석
     ① 층리와 입자(체 가르기, 흐름의 세기)  ② 구조 만들기(점이층리·연흔·건열·사층리)
     ③ 퇴적 환경(단서 짝짓기, 위아래 판단)  ④ 환경 변화(주상도, 해침·해퇴)
     ========================================================= */
  initStage('#f3efe6', 800, 560, 600, 840, 1.25);
  const f0 = (x) => String(Math.round(x));
  const rad = (d) => (d * Math.PI) / 180;
  const gcl = { ink: '#334155', mute: '#64748b', good: '#15803d', bad: '#b91c1c', blue: '#0369a1' };
  const lerpc = (a, b, t) => a + (b - a) * t;
  const GR = {
    gravel: { name: '자갈', kind: 'gravel', size: '2 mm보다 커요', r: 5, col: '#8f8a82', sink: 170, th: 6, n: 26, hAdd: 3.4 },
    sand: { name: '모래', kind: 'sand', size: '1/16 ~ 2 mm', r: 2.6, col: '#dcb55a', sink: 90, th: 3, n: 58, hAdd: 2.0 },
    clay: { name: '점토', kind: 'clay', size: '1/16 mm보다 작아요', r: 1.4, col: '#b4694a', sink: 46, th: 1, n: 92, hAdd: 1.1 },
  };
  const GK = ['gravel', 'sand', 'clay'];
  const GSINK = { gravel: 230, sand: 95, clay: 38 };

  const S = {
    view: 'sieve', clock: 0, fade: 0,
    sv: { grains: [], t: 0, running: false, done: false, ever: false },
    fl: { v0: 5, grains: [], bins: [], running: false, T: 0, emitted: 0, runs: [], stat: null, lastV: null },
    gr: { grains: [], stack: [], running: false, t: 0, done: false, ever: false },
    rp: { mode: 'one', t: 0, running: false, A: 0, done: { one: false, wave: false }, view: false },
    ck: { q: 0, running: false, ever: false, done: false },
    cs: { t: 0, running: false, laminae: [], done: false, xc: 0 },
    mt: { ans: [null, null, null, null, null, null] },
    inv: { ans: [null, null, null], flip: 0, flipOn: false, flipTw: null },
    col: { ans: [null, null, null, null, null] },
    tr: { ans: [null, null] },
  };
  let game = null;
  const DR = (a, b) => a + Math.random() * (b - a);

  /* ---------- 암석 구조 그림 (위쪽이 지층의 위) ---------- */
  function wavy(x0, x1, yf, amp, lam, ph) { const pts = []; for (let x = x0; x <= x1 + 0.1; x += 3) pts.push([x, yf(x) + amp * Math.sin((x - x0) / lam + ph)]); return pts; }
  /* 연흔 단면 높이 (0~1): asym = 한 방향 흐름(가파른 면이 오른쪽), sym = 대칭 */
  function rippleH(u, asym) { u -= Math.floor(u); if (asym) return u < 0.72 ? u / 0.72 : (1 - u) / 0.28; return u < 0.5 ? u / 0.5 : (1 - u) / 0.5; }
  function drawStruct(kind, x, y, w, h, o) {
    o = o || {};
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const fillR = (k, a, b, c, d) => { ctx.beginPath(); ctx.rect(a, b, c, d); ctx.fillStyle = LITH_BASE[k]; ctx.fill(); fillLith(k); };
    if (kind === 'ripA' || kind === 'ripS') {
      const base = y + h * 0.58, amp = h * 0.15, lam = w / 4.4, asym = kind === 'ripA';
      fillR('mud', x, y, w, h);
      ctx.beginPath(); ctx.moveTo(x, y + h); for (let px = x; px <= x + w + 0.1; px += 2) ctx.lineTo(px, base - amp * rippleH((px - x) / lam + 0.1, asym)); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fillStyle = LITH_BASE.sand; ctx.fill(); fillLith('sand');
      ctx.strokeStyle = '#6b4a1c'; ctx.lineWidth = 2.2; ctx.beginPath(); for (let px = x; px <= x + w + 0.1; px += 2) { const py = base - amp * rippleH((px - x) / lam + 0.1, asym); px === x ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke();
    } else if (kind === 'crack') {
      fillR('mud', x, y, w, h);
      const top = y + h * 0.42; fillR('sand', x, y, w, top - y);
      ctx.fillStyle = LITH_BASE.sand;
      [0.14, 0.4, 0.66, 0.9].forEach((q, k) => { const cx = x + w * q, ww = w * 0.045, dd = h * (0.3 + 0.06 * (k % 2)); ctx.beginPath(); ctx.moveTo(cx - ww, top); ctx.lineTo(cx + ww, top); ctx.lineTo(cx + 1, top + dd); ctx.lineTo(cx - 1, top + dd); ctx.closePath(); ctx.fillStyle = LITH_BASE.sand; ctx.fill(); fillLith('sand'); ctx.strokeStyle = '#6b4a1c'; ctx.lineWidth = 1.6; ctx.stroke(); });
      ctx.strokeStyle = '#4b3a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w, top); ctx.stroke();
    } else if (kind === 'graded') {
      fillR('clay', x, y, w, h); fillR('sand', x, y + h * 0.34, w, h * 0.66); fillR('gravel', x, y + h * 0.68, w, h * 0.32);
      [0.34, 0.68].forEach((q) => { const g = ctx.createLinearGradient(0, y + h * q - 12, 0, y + h * q + 12); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x, y + h * q - 12, w, 24); });
      ctx.strokeStyle = 'rgba(30,25,20,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + 1); ctx.lineTo(x + w, y + 1); ctx.moveTo(x, y + h - 1); ctx.lineTo(x + w, y + h - 1); ctx.stroke();
    } else if (kind === 'cross') {
      fillR('sand', x, y, w, h);
      ctx.strokeStyle = 'rgba(110,70,25,.7)'; ctx.lineWidth = 1.7;
      const lay = [y + h * 0.12, y + h * 0.5, y + h * 0.9];
      ctx.strokeStyle = 'rgba(60,40,15,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, lay[1]); ctx.lineTo(x + w, lay[1]); ctx.moveTo(x, lay[0]); ctx.lineTo(x + w, lay[0]); ctx.stroke();
      [[lay[0], lay[1]], [lay[1], lay[2]]].forEach(([ya, yb]) => {
        ctx.strokeStyle = 'rgba(110,70,25,.75)'; ctx.lineWidth = 1.6;
        for (let k = 0; k < 9; k++) { const sx = x - w * 0.1 + k * w * 0.125; ctx.beginPath(); ctx.moveTo(sx, ya); ctx.bezierCurveTo(sx + w * 0.1, ya + (yb - ya) * 0.75, sx + w * 0.16, yb - 2, sx + w * 0.3, yb); ctx.stroke(); }
      });
    } else if (kind === 'coral') {
      fillR('lime', x, y, w, h);
      ctx.strokeStyle = '#f7efe2'; ctx.fillStyle = '#f7efe2'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      [[0.2, 0.9], [0.5, 0.92], [0.8, 0.9]].forEach(([qx, qy], k) => { const bx = x + w * qx, by = y + h * qy; ctx.strokeStyle = '#c8a574'; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - h * 0.45); ctx.moveTo(bx, by - h * 0.18); ctx.lineTo(bx - w * 0.07, by - h * 0.4); ctx.moveTo(bx, by - h * 0.28); ctx.lineTo(bx + w * 0.07, by - h * 0.55); ctx.stroke(); ctx.strokeStyle = '#fff6e8'; ctx.lineWidth = 3; ctx.stroke(); });
    } else if (kind === 'nautilus') {
      fillR('mud', x, y, w, h);
      const cx = x + w * 0.5, cy = y + h * 0.5, r = Math.min(w, h) * 0.3;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = '#efe3cf'; ctx.fill(); ctx.strokeStyle = '#6b4f2a'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.beginPath(); for (let a = 0; a <= TAU * 1.7; a += 0.2) { const rr2 = r * (0.15 + 0.85 * (a / (TAU * 1.7))); a ? ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2) : ctx.moveTo(cx, cy); } ctx.stroke();
      for (let k = 0; k < 6; k++) { const a = k * 0.9 + 0.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.4, cy + Math.sin(a) * r * 0.4); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); }
    } else { fillR(kind, x, y, w, h); }
    ctx.restore();
  }
  /* 구조 카드: 그림 + 흐림 틀 */
  function structFrame(x, y, w, h) { ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w, h); }

  /* =========================================================
     장면 1: 체로 가르기
     ========================================================= */
  const SVR = PHONE ? { x: 12, y: 12, w: 576, h: 500 } : { x: 12, y: 10, w: 540, h: 540 };
  const SVI = PHONE ? { x: 12, y: 524, w: 576, h: 304 } : { x: 566, y: 10, w: 222, h: 540 };
  const SV_GEO = () => ({ x0: SVR.x + (PHONE ? 70 : 80), x1: SVR.x + SVR.w - (PHONE ? 70 : 80), tray: SVR.y + 92, m1: SVR.y + (PHONE ? 190 : 196), m2: SVR.y + (PHONE ? 318 : 326), pan: SVR.y + SVR.h - 46 });
  function svInit() {
    const g = SV_GEO(), R = mulberry(77), list = [];
    const cnt = { gravel: 12, sand: 36, clay: 72 };
    GK.forEach((k) => { for (let i = 0; i < cnt[k]; i++) list.push({ k, r: GR[k].r * (0.85 + R() * 0.3), x: g.x0 + 14 + R() * (g.x1 - g.x0 - 28), y: 0, vy: 0, rel: R() * 2.3, state: 'tray', rest: 0, lay: R() }); });
    list.forEach((p, i) => { p.ty = g.tray - 8 - p.lay * 22; p.y = p.ty; });
    S.sv.grains = list; S.sv.t = 0; S.sv.running = false; S.sv.done = false;
  }
  function svRun() { const V = S.sv; if (V.running || V.done) return; V.running = true; V.ever = true; V.t = 0; Sound.click(); updateCtl(); }
  function svUpdate(dt) {
    const V = S.sv, g = SV_GEO(); if (!V.running) return;
    V.t += dt; let rest = 0;
    V.grains.forEach((p) => {
      if (p.state === 'rest') { rest++; return; }
      if (V.t < p.rel) return;
      if (p.state === 'tray') p.state = 'fall';
      p.vy += 700 * dt; p.y += p.vy * dt;
      const stopY = p.k === 'gravel' ? g.m1 : p.k === 'sand' ? g.m2 : g.pan;
      const lim = stopY - p.r - p.lay * (p.k === 'gravel' ? 9 : p.k === 'sand' ? 13 : 16) - 1;
      if (p.y >= lim) { p.y = lim; p.vy = 0; p.state = 'rest'; }
    });
    if (rest === V.grains.length) { V.running = false; V.done = true; V.everDone = true; Sound.success(); updateCtl(); }
  }
  function drawSieve(t) {
    const V = S.sv, g = SV_GEO(), off = V.running ? Math.sin(t * 46) * 2.6 : 0;
    panel(SVR.x, SVR.y, SVR.w, SVR.h, { title: '체로 알갱이를 크기별로 가르기', border: '#e7d9b5' });
    // 시료 쟁반
    ctx.fillStyle = '#d8c9a8'; rr(g.x0 - 20, g.tray, g.x1 - g.x0 + 40, 12, 6).fill(); tx(g.x0 - 18, g.tray - 14, '섞인 시료 (자갈 + 모래 + 점토)', 13.5, gcl.mute, 'left', 800);
    // 체와 받침
    [[g.m1, 7, 6, '체 1 (구멍 큼)'], [g.m2, 3.2, 4, '체 2 (구멍 작음)']].forEach(([my, hole, wire, nm]) => {
      ctx.save(); ctx.translate(off, 0);
      ctx.fillStyle = '#94a3b8'; rr(g.x0 - 20, my - 4, 14, 14, 3).fill(); rr(g.x1 + 6, my - 4, 14, 14, 3).fill();
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 6; ctx.setLineDash([wire, hole]); ctx.beginPath(); ctx.moveTo(g.x0 - 6, my + 3); ctx.lineTo(g.x1 + 6, my + 3); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      D.label(g.x1 + 14, my - 16, nm, { bg: '#475569', size: 12.5, pad: 7, align: 'right' });
    });
    ctx.fillStyle = '#cbd5e1'; rr(g.x0 - 20, g.pan + 6, g.x1 - g.x0 + 40, 14, 6).fill(); tx(g.x0 - 18, g.pan + 38, '받침 접시', 12.5, gcl.mute, 'left', 700);
    // 알갱이
    V.grains.forEach((p) => {
      const ox = p.state === 'rest' && p.k !== 'clay' ? off : 0;
      ctx.beginPath(); ctx.arc(p.x + ox, p.y, p.r, 0, TAU); ctx.fillStyle = GR[p.k].col; ctx.fill();
      if (p.k === 'gravel') { ctx.strokeStyle = 'rgba(40,30,20,.7)'; ctx.lineWidth = 1; ctx.stroke(); }
    });
    // 정보 판
    panel(SVI.x, SVI.y, SVI.w, SVI.h, { title: '크기별 이름', border: '#e7d9b5' });
    const cnt = { gravel: 0, sand: 0, clay: 0 }; V.grains.forEach((p) => { if (p.state === 'rest') cnt[p.k]++; });
    GK.forEach((k, i) => {
      const yy = SVI.y + 52 + i * (PHONE ? 68 : 92), a = GR[k];
      const dx = PHONE ? 16 : 14;
      D.sphere(SVI.x + dx + 12, yy + 8, a.r * 3.2 + 2, a.col, { gloss: false });
      tx(SVI.x + dx + 38, yy + 6, a.name + ' · ' + a.size, PHONE ? 15 : 14, gcl.ink, 'left', 800);
      tx(SVI.x + dx + 38, yy + 30, '체 ' + (k === 'gravel' ? '1 위' : k === 'sand' ? '2 위' : '아래 접시') + ' · ' + (V.done ? cnt[k] + '개' : '?'), 13.5, gcl.mute, 'left', 700);
    });
    if (!PHONE) note(SVI.x + 10, SVI.y + SVI.h - 150, SVI.w - 20, V.done ? '알갱이 크기에 따라 체에 걸러졌어요. 퇴적물도 알갱이 크기로 구분해요.' : '구멍이 큰 체에는 큰 알갱이만 걸리고, 작은 알갱이는 아래로 빠져요.', 13, { bg: '#fffbeb', border: '#fde68a' });
  }

  /* =========================================================
     장면 2: 흐름의 세기와 퇴적 (흐름은 오른쪽으로 갈수록 약해짐)
     ========================================================= */
  const FG = PHONE ? { x0: 30, L: 540, yT: 112, yB: 440, nb: 40 } : { x0: 40, L: 720, yT: 100, yB: 330, nb: 48 };
  const FIN = PHONE ? { x: 12, y: 548, w: 576, h: 280 } : { x: 12, y: 420, w: 776, h: 130 };
  const flowV = (v0, x) => v0 * (1 - (x - FG.x0) / FG.L);
  function flInit() {
    const F = S.fl; F.bins = []; for (let i = 0; i < FG.nb; i++) F.bins.push([]);
    F.grains = []; F.running = false; F.T = 0; F.emitted = 0; F.runs = []; F.stat = null; F.lastV = null;
  }
  const binH = (b) => b.reduce((a, s) => a + s[1], 0);
  function binAdd(i, k, h) { i = clamp(i, 0, FG.nb - 1); while (binH(S.fl.bins[i]) > 150 && i < FG.nb - 1) i++; const b = S.fl.bins[i]; if (b.length && b[b.length - 1][0] === k) b[b.length - 1][1] += h; else b.push([k, h]); }
  function flRun() {
    const F = S.fl; if (F.running) return;
    F.running = true; F.T = 0; F.emitted = 0; F.v = F.v0; F.sum = { gravel: [0, 0], sand: [0, 0], clay: [0, 0] }; F.stat = null; F.total = GK.reduce((a, k) => a + GR[k].n, 0);
    F.queue = []; GK.forEach((k) => { for (let i = 0; i < GR[k].n; i++) F.queue.push(k); });
    for (let i = F.queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [F.queue[i], F.queue[j]] = [F.queue[j], F.queue[i]]; }
    Sound.click(); updateCtl();
  }
  function flUpdate(dt) {
    const F = S.fl; if (!F.running) return;
    dt *= 1.5; F.T += dt;
    const want = Math.min(F.total, Math.floor(F.T / 2.6 * F.total));
    while (F.emitted < want) { const k = F.queue[F.emitted++]; F.grains.push({ k, x: FG.x0 + 4, y: DR(FG.yT + 20, FG.yB - 60), bed: false, r: GR[k].r, thr: GR[k].th * DR(0.62, 1.38) }); }
    const bw = FG.L / FG.nb;
    for (let i = F.grains.length - 1; i >= 0; i--) {
      const p = F.grains[i], a = GR[p.k], v = Math.max(0, flowV(F.v, p.x));
      const binI = clamp(Math.floor((p.x - FG.x0) / bw), 0, FG.nb - 1), bedY = FG.yB - binH(F.bins[binI]) - p.r;
      if (!p.bed) {
        p.x += (14 * v + 5) * dt; p.y += a.sink * dt;
        if (p.y >= bedY) { p.y = bedY; p.bed = true; }
      } else {
        if (v > p.thr) { p.x += 14 * (v - p.thr * 0.5) * dt * 0.5 + 8 * dt; p.y = FG.yB - binH(F.bins[clamp(Math.floor((p.x - FG.x0) / bw), 0, FG.nb - 1)]) - p.r; }
        else {
          const b0 = clamp(Math.floor((p.x - FG.x0) / bw), 0, FG.nb - 1), h = a.hAdd;
          binAdd(b0 - 2, p.k, h * 0.1); binAdd(b0 - 1, p.k, h * 0.2); binAdd(b0, p.k, h * 0.4); binAdd(b0 + 1, p.k, h * 0.2); binAdd(b0 + 2, p.k, h * 0.1);
          F.sum[p.k][0] += p.x; F.sum[p.k][1]++; F.grains.splice(i, 1); continue;
        }
      }
      if (p.x > FG.x0 + FG.L - 2) { // 끝에 닿으면 마지막 칸에 쌓여요
        const b0 = FG.nb - 1; binAdd(b0, p.k, a.hAdd); F.sum[p.k][0] += p.x; F.sum[p.k][1]++; F.grains.splice(i, 1);
      }
    }
    if (F.emitted >= F.total && !F.grains.length) {
      F.running = false; F.runs.push(F.v);
      F.stat = {}; GK.forEach((k) => { F.stat[k] = F.sum[k][1] ? F.sum[k][0] / F.sum[k][1] : null; });
      Sound.success(); updateCtl();
    }
  }
  function drawFlow(t) {
    const F = S.fl;
    ctx.fillStyle = '#fbf8ef'; rr(12, 10, VW - 24, PHONE ? 520 : 400, 14).fill(); tx(26, 34, '흐름이 약해지는 물길: 왼쪽은 센 흐름, 오른쪽은 약한 흐름', 14.5, gcl.ink, 'left', 800);
    const wg = ctx.createLinearGradient(0, FG.yT, 0, FG.yB); wg.addColorStop(0, '#cfe9f7'); wg.addColorStop(1, '#8cc4e6'); ctx.fillStyle = wg; ctx.fillRect(FG.x0, FG.yT, FG.L, FG.yB - FG.yT);
    // 흐름 화살표 (길이 = 그 자리의 세기)
    const v0 = F.running ? F.v : F.v0;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      const xx = FG.x0 + 20 + c * (FG.L / 6), vv = flowV(v0, xx), len = 6 + vv * (PHONE ? 4 : 5.6), yy = FG.yT + 22 + r * ((FG.yB - FG.yT - 80) / 2.6), sh = ((t * 40 * Math.max(0.3, vv / 5)) % 14);
      if (vv > 0.4) D.arrow(xx + sh * 0.3, yy, xx + sh * 0.3 + len, yy, { color: 'rgba(30,100,160,.75)', width: 2.6, head: 8 });
    }
    // 입구
    ctx.fillStyle = '#94a3b8'; rr(FG.x0 - 22, FG.yT + 10, 22, FG.yB - FG.yT - 40, 4).fill(); D.label(FG.x0 + 4, FG.yT - 14, '들어오는 곳', { bg: '#475569', size: 12.5, pad: 7, align: 'left' });
    // 퇴적물 (칸마다 쌓인 층)
    const bw = FG.L / FG.nb;
    F.bins.forEach((b, i) => { let yy = FG.yB; b.forEach((s) => { const k = s[0], h = s[1]; if (h <= 0.01) return; ctx.fillStyle = lithFill(k === 'gravel' ? 'gravel' : k === 'sand' ? 'sand' : 'clay'); ctx.fillRect(FG.x0 + i * bw, yy - h, bw + 0.8, h); yy -= h; }); });
    // 윤곽
    ctx.strokeStyle = 'rgba(40,30,20,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); F.bins.forEach((b, i) => { const y0 = FG.yB - binH(b); i ? ctx.lineTo(FG.x0 + i * bw, y0) : ctx.moveTo(FG.x0, y0); ctx.lineTo(FG.x0 + (i + 1) * bw, y0); }); ctx.stroke();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.strokeRect(FG.x0, FG.yT, FG.L, FG.yB - FG.yT);
    // 떠다니는 알갱이
    F.grains.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fillStyle = GR[p.k].col; ctx.fill(); if (p.k === 'gravel') { ctx.strokeStyle = 'rgba(40,30,20,.7)'; ctx.lineWidth = 1; ctx.stroke(); } });
    // 이번에 어디에 쌓였는지
    if (F.stat) GK.forEach((k) => { const x = F.stat[k]; if (x == null) return; const yy = FG.yB + 22 + GK.indexOf(k) * 0; D.label(clamp(x, FG.x0 + 30, FG.x0 + FG.L - 30), FG.yB + 20 + GK.indexOf(k) * 25, GR[k].name + ' ▲', { bg: GR[k].col, color: '#fff', size: 12.5, pad: 7 }); });
    // 안내
    panel(FIN.x, FIN.y, FIN.w, FIN.h, { title: '흐름의 세기와 알갱이 크기', border: '#e7d9b5' });
    const v = F.v0;
    const dep = GK.map((k) => (GR[k].th >= v ? '맨 처음 자리' : '입구에서 ' + f0(((1 - GR[k].th / v) * 100)) + '%'));
    if (!PHONE) {
      GK.forEach((k, i) => { const x = FIN.x + 14 + i * 252; D.sphere(x + 10, FIN.y + 56, GR[k].r * 3 + 2, GR[k].col, { gloss: false }); tx(x + 28, FIN.y + 62, GR[k].name + ' · 멈추는 흐름 세기 ' + GR[k].th + ' 이하', 13.5, gcl.ink, 'left', 800); });
      note(FIN.x + 10, FIN.y + 80, FIN.w - 20, F.stat ? '센 흐름일수록 큰 알갱이만 먼저 쌓이고 고운 알갱이는 멀리 실려 가요. 흐름이 약하면 대부분의 알갱이가 입구 가까이에 쌓여요. 알갱이 크기는 흐름의 에너지를 알려 줘요.' : '세기를 정하고 ▶ 흘려보내기를 눌러요. 흐름이 알갱이가 멈추는 세기보다 약해지는 곳에서 그 알갱이가 쌓여요.', 13.5, { bg: '#fffbeb', border: '#fde68a' });
    } else {
      GK.forEach((k, i) => { const yy = FIN.y + 52 + i * 34; D.sphere(FIN.x + 24, yy, GR[k].r * 3 + 2, GR[k].col, { gloss: false }); tx(FIN.x + 46, yy + 5, GR[k].name + ' · 흐름 세기 ' + GR[k].th + ' 이하에서 멈춰요', 14, gcl.ink, 'left', 800); });
      note(FIN.x + 10, FIN.y + 158, FIN.w - 20, F.stat ? '센 흐름일수록 큰 알갱이만 먼저 쌓이고 고운 알갱이는 멀리 실려 가요. 흐름이 약하면 대부분이 입구 가까이에 쌓여요.' : '세기를 정하고 ▶ 흘려보내기를 눌러요.', 13.5, { bg: '#fffbeb', border: '#fde68a' });
    }
  }

  /* =========================================================
     장면 3: 점이층리 만들기 (흙탕물 속 알갱이가 가라앉는 순서)
     ========================================================= */
  const GC = PHONE ? { cx: 300, w: 220, top: 80, bot: 510 } : { cx: 170, w: 170, top: 80, bot: 500 };
  const GCI = PHONE ? { x: 12, y: 548, w: 576, h: 280 } : { x: 340, y: 12, w: 448, h: 536 };
  function grInit() {
    const G = S.gr, R = mulberry(31 + (G.seedAdd || 0)); G.grains = [];
    const cnt = { gravel: 12, sand: 30, clay: 54 };
    GK.forEach((k) => { for (let i = 0; i < cnt[k]; i++) G.grains.push({ k, r: GR[k].r * (0.8 + R() * 0.4), x: GC.cx - GC.w / 2 + 8 + R() * (GC.w - 16), y: GC.top + 10 + R() * (GC.bot - GC.top) * 0.28, ph: R() * 6.28, settled: false, v: GSINK[k] * (0.92 + R() * 0.16) }); });
    G.seq = []; G.running = false; G.t = 0; G.done = false;
  }
  const grH = () => S.gr.seq.reduce((a, s) => a + s[1], 0);
  function grSlabs(slabH) {
    const out = [], maj = (c) => (c.gravel >= c.sand && c.gravel >= c.clay ? 'gravel' : c.sand >= c.clay ? 'sand' : 'clay');
    let cur = { gravel: 0, sand: 0, clay: 0 }, fill = 0;
    S.gr.seq.forEach(([k, h]) => { let rem = h; while (rem > 1e-6) { const take = Math.min(rem, slabH - fill); cur[k] += take; fill += take; rem -= take; if (fill >= slabH - 1e-6) { out.push([maj(cur), fill]); cur = { gravel: 0, sand: 0, clay: 0 }; fill = 0; } } });
    if (fill > 1e-6) out.push([maj(cur), fill]);
    return out;
  }
  const GRH = { gravel: 3.2, sand: 1.9, clay: 0.82 };
  function grUpdate(dt) {
    const G = S.gr; if (!G.running) return;
    dt *= 1.6; G.t += dt; let left = 0;
    G.grains.forEach((p) => {
      if (p.settled) return; left++;
      p.y += p.v * dt * 1.0; p.x += Math.sin(G.t * 3 + p.ph) * 4 * dt;
      p.x = clamp(p.x, GC.cx - GC.w / 2 + p.r + 4, GC.cx + GC.w / 2 - p.r - 4);
      if (p.y >= GC.bot - 6 - grH() - p.r) { p.settled = true; G.seq.push([p.k, GRH[p.k]]); }
    });
    if (!left) { G.running = false; G.done = true; G.ever = true; Sound.success(); updateCtl(); }
  }
  function drawGraded(t) {
    const G = S.gr, x0 = GC.cx - GC.w / 2, y0 = GC.top, h = GC.bot - GC.top;
    panel(12, 10, PHONE ? 576 : 316, PHONE ? 520 : 536, { title: '흙탕물 (섞인 알갱이)', border: '#e7d9b5' });
    // 눈금 실린더
    D.shadow(() => { ctx.fillStyle = 'rgba(207,233,247,.55)'; rr(x0, y0, GC.w, h, 12).fill(); }, { blur: 10, y: 4 });
    ctx.save(); rr(x0, y0, GC.w, h, 12).clip();
    const wg = ctx.createLinearGradient(0, y0, 0, y0 + h); wg.addColorStop(0, 'rgba(200,170,120,' + (G.done ? 0.08 : 0.32) + ')'); wg.addColorStop(1, 'rgba(170,130,80,' + (G.done ? 0.1 : 0.4) + ')'); ctx.fillStyle = wg; ctx.fillRect(x0, y0, GC.w, h);
    let yy = GC.bot - 6; grSlabs(5).forEach((s) => { ctx.fillStyle = lithFill(s[0]); ctx.fillRect(x0 + 3, yy - s[1], GC.w - 6, s[1] + 0.8); yy -= s[1]; });
    G.grains.forEach((p) => { if (p.settled) return; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fillStyle = GR[p.k].col; ctx.fill(); if (p.k === 'gravel') { ctx.strokeStyle = 'rgba(40,30,20,.7)'; ctx.lineWidth = 1; ctx.stroke(); } });
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; rr(x0, y0, GC.w, h, 12).stroke();
    // 오른쪽 해설
    const IP = PHONE ? { x: 12, y: 548, w: 576, h: 280 } : { x: 340, y: 10, w: 448, h: 540 };
    panel(IP.x, IP.y, IP.w, IP.h, { title: '점이층리', border: '#e7d9b5' });
    const sx = PHONE ? IP.x + 40 : IP.x + 60, sw = 110, sy = IP.y + 56, sh = PHONE ? 200 : 290;
    // 만들어진 층 단면 (실제로 쌓인 층을 크게 보기)
    const tot = grH();
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip(); ctx.fillStyle = '#f1f5f9'; ctx.fillRect(sx, sy, sw, sh);
    let by = sy + sh; if (tot > 0) grSlabs(5).forEach((s) => { const hh = (s[1] / tot) * sh; ctx.fillStyle = lithFill(s[0]); ctx.fillRect(sx, by - hh, sw, hh + 0.8); by -= hh; });
    ctx.restore(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.strokeRect(sx, sy, sw, sh);
    tx(sx + sw / 2, sy - 8, '쌓인 층의 단면', 13, gcl.mute, 'center', 800);
    if (G.done) { D.arrow(sx + sw + 24, sy + sh - 20, sx + sw + 24, sy + 20, { color: '#7c3aed', width: 4, head: 12 }); tx(sx + sw + 36, sy + sh * 0.5 - 6, '위로 갈수록', 14, '#6d28d9', 'left', 800); tx(sx + sw + 36, sy + sh * 0.5 + 14, PHONE ? '작아져요' : '알갱이가 작아져요', 14, '#6d28d9', 'left', 800); GK.forEach((k, i) => { tx(sx - 8, [sy + sh - 14, sy + sh * 0.5, sy + 20][i] + 4, GR[k].name, 12.5, gcl.ink, 'right', 800); }); }
    const msg = G.done ? '굵은 알갱이가 먼저 가라앉고 고운 알갱이는 천천히 가라앉아서, 한 층 안에서 아래에서 위로 알갱이가 점점 작아져요. 이것이 점이층리예요. 탁한 물이 한꺼번에 퍼질 때(대륙 사면·심해의 탁류) 만들어져요.' : G.running ? '무거운 알갱이일수록 빨리 가라앉아요…' : '섞인 흙탕물을 가만히 두면 알갱이는 어떤 순서로 가라앉을까요?';
    if (!PHONE) note(IP.x + 12, IP.y + 372, IP.w - 24, msg, 14, { bg: '#fffbeb', border: '#fde68a' });
    else note(IP.x + 320, IP.y + 52, IP.w - 332, msg, 12.5, { bg: '#fffbeb', border: '#fde68a' });
  }


  /* =========================================================
     장면 4: 연흔 (한 방향 흐름 = 비대칭, 왕복 파도 = 대칭)
     ========================================================= */
  const RPA = PHONE ? { x: 12, y: 12, w: 576, h: 500 } : { x: 12, y: 10, w: 776, h: 400 };
  const RPI = PHONE ? { x: 12, y: 524, w: 576, h: 304 } : { x: 12, y: 420, w: 776, h: 130 };
  const RPG = () => ({ x0: RPA.x + 24, w: RPA.w - 48, yT: RPA.y + 70, yB: RPA.y + RPA.h * (PHONE ? 0.72 : 0.78), lam: (RPA.w - 48) / (PHONE ? 6.5 : 8.5), Amax: PHONE ? 18 : 20 });
  function rpReset() { const R = S.rp; R.t = 0; R.A = 0; R.running = false; R.done = { one: false, wave: false }; }
  function rpRun() { const R = S.rp; if (R.running) return; R.running = true; Sound.click(); updateCtl(); }
  function rpUpdate(dt) {
    const R = S.rp, g = RPG(); if (!R.running) return;
    R.t += dt; R.A = approach(R.A, g.Amax, dt, 0.7);
    if (R.A >= g.Amax * 0.93 && !R.done[R.mode]) { R.done[R.mode] = true; Sound.success(); updateCtl(); }
  }
  function drawRipple(t) {
    const R = S.rp, g = RPG(), asym = R.mode === 'one';
    panel(RPA.x, RPA.y, RPA.w, RPA.h, { title: asym ? '한 방향으로 흐르는 물 (강·하천)' : '앞뒤로 왔다 갔다 하는 물 (파도)', border: '#e7d9b5' });
    // 물
    const wg = ctx.createLinearGradient(0, g.yT, 0, g.yB); wg.addColorStop(0, '#cfe9f7'); wg.addColorStop(1, '#8cc4e6'); ctx.fillStyle = wg; ctx.fillRect(g.x0, g.yT, g.w, g.yB - g.yT);
    // 흐름 화살표
    const dirv = asym ? 1 : Math.sin(t * 2.1);
    for (let r = 0; r < 3; r++) for (let c = 0; c < (PHONE ? 4 : 6); c++) {
      const xx = g.x0 + 30 + c * (g.w / (PHONE ? 4 : 6)), yy = g.yT + 24 + r * ((g.yB - g.yT - 70) / 2.4), L = 38 * Math.abs(dirv);
      if (R.running || asym) { const sg = Math.sign(dirv) || 1; if (L > 6) D.arrow(xx - sg * L / 2, yy, xx + sg * L / 2, yy, { color: 'rgba(30,100,160,.75)', width: 3, head: 9 }); }
    }
    // 모래 바닥
    ctx.beginPath(); ctx.moveTo(g.x0, g.yB + 60); for (let x = g.x0; x <= g.x0 + g.w + 0.1; x += 3) {
      const u = asym ? (x - g.x0 - 8 * R.t) / g.lam : (x - g.x0) / g.lam + 0.02 * Math.sin(R.t * 2.1);
      ctx.lineTo(x, g.yB - R.A * rippleH(u, asym));
    }
    ctx.lineTo(g.x0 + g.w, g.yB + 60); ctx.closePath(); ctx.fillStyle = LITH_BASE.sand; ctx.fill(); fillLith('sand');
    ctx.strokeStyle = '#6b4a1c'; ctx.lineWidth = 2.4; ctx.beginPath(); for (let x = g.x0; x <= g.x0 + g.w + 0.1; x += 3) { const u = asym ? (x - g.x0 - 8 * R.t) / g.lam : (x - g.x0) / g.lam + 0.02 * Math.sin(R.t * 2.1); const y = g.yB - R.A * rippleH(u, asym); x === g.x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.strokeRect(g.x0, g.yT, g.w, g.yB + 60 - g.yT);
    // 설명 표시 (만들어진 뒤)
    if (R.done[R.mode]) {
      const cx0 = g.x0 + g.w * 0.42;
      for (let k = 0; k < 8; k++) {
        const u0 = asym ? (cx0 - g.x0 - 8 * R.t) / g.lam : (cx0 - g.x0) / g.lam; const crestX = g.x0 + (Math.floor(u0) + (asym ? 0.72 : 0.5)) * g.lam + (asym ? 8 * R.t : 0);
        if (crestX > cx0 - 10) { const cy = g.yB - R.A; D.label(crestX, cy - 38, asym ? '가파른 면 → 흐름의 아래쪽' : '양쪽 경사가 비슷해요', { bg: '#7c2d12', size: 13, pad: 9 }); D.arrow(crestX, cy - 26, crestX + (asym ? 12 : 0), cy - 4, { color: '#7c2d12', width: 2.4, head: 8 }); break; }
      }
    }
    // 아래 안내와 굳은 단면
    panel(RPI.x, RPI.y, RPI.w, RPI.h, { title: '연흔 (물결 자국)', border: '#e7d9b5' });
    const ix = RPI.x + 14, iy = RPI.y + 38, iw = PHONE ? 220 : 200, ih = PHONE ? 140 : 62;
    structFrame(ix, iy, iw, ih); drawStruct(asym ? 'ripA' : 'ripS', ix, iy, iw, ih); structFrame(ix, iy, iw, ih);
    tx(ix, iy + ih + 18, '굳은 암석 속 연흔 단면', 12.5, gcl.mute, 'left', 700);
    const msg = !R.running && R.A < 1 ? (asym ? '한 방향 흐름을 흘려보내면 모래 바닥에 어떤 무늬가 생길까요?' : '왕복 파도를 흘려보내면 어떤 무늬가 생길까요?') : R.done[R.mode] ? (asym ? '한 방향 흐름은 비대칭 연흔을 만들어요. 가파른 면이 흐름의 아래쪽이에요.' : '파도처럼 왔다 갔다 하는 물은 대칭 연흔을 만들어요. 해안이나 얕은 호수에서 볼 수 있어요.') : '모래가 움직이며 물결 모양이 자라요…';
    note(ix + iw + 16, RPI.y + 36, RPI.w - iw - 46, msg, 14, { bg: '#fffbeb', border: '#fde68a' });
    if (!PHONE) tx(ix + iw + 16, RPI.y + RPI.h - 12, '마루가 뾰족한 쪽이 위쪽이에요.', 13, gcl.mute, 'left', 700);
  }

  /* =========================================================
     장면 5: 건열 (젖은 진흙이 마르며 갈라짐)
     ========================================================= */
  const CKA = PHONE ? { x: 150, y: 56, s: 300 } : { x: 40, y: 64, s: 300 };
  const CKB = PHONE ? { x: 24, y: 384, w: 552, h: 150 } : { x: 380, y: 18, w: 392, h: 362 };
  const CKI = PHONE ? { x: 12, y: 548, w: 576, h: 280 } : { x: 12, y: 384, w: 776, h: 166 };
  let CRACKS = null;
  function buildCracks() {
    const R = 46, s = CKA.s, edges = [], seen = new Set(), vtx = {};
    const key = (x, y) => Math.round(x * 10) + ',' + Math.round(y * 10);
    const jit = (x, y) => { const r = mulberry(Math.round(x * 13 + y * 7919) + 3); return [(r() - 0.5) * R * 0.34, (r() - 0.5) * R * 0.34]; };
    const V = (x, y) => { const k = key(x, y); if (!vtx[k]) { const j = jit(x, y); vtx[k] = [x + j[0], y + j[1]]; } return vtx[k]; };
    const w = Math.sqrt(3) * R;
    for (let r = -1; r < s / (1.5 * R) + 2; r++) for (let c = -1; c < s / w + 2; c++) {
      const cx = c * w + (r & 1 ? w / 2 : 0), cy = r * 1.5 * R, vs = [];
      for (let k = 0; k < 6; k++) { const a = ((30 + 60 * k) * Math.PI) / 180; vs.push(V(cx + R * Math.cos(a), cy + R * Math.sin(a))); }
      for (let k = 0; k < 6; k++) { const a = vs[k], b = vs[(k + 1) % 6], kk = [key(a[0], a[1]), key(b[0], b[1])].sort().join('|'); if (!seen.has(kk)) { seen.add(kk); edges.push([a, b]); } }
    }
    const nuc = [[s * 0.3, s * 0.35], [s * 0.72, s * 0.6], [s * 0.45, s * 0.85]];
    let maxD = 1; edges.forEach((e) => { const mx = (e[0][0] + e[1][0]) / 2, my = (e[0][1] + e[1][1]) / 2; e.d = Math.min(...nuc.map((n) => Math.hypot(mx - n[0], my - n[1]))); e.n = nuc.reduce((b, n) => (Math.hypot(e[0][0] - n[0], e[0][1] - n[1]) < Math.hypot(e[1][0] - n[0], e[1][1] - n[1]) ? 0 : 1), 0); maxD = Math.max(maxD, e.d); });
    edges.forEach((e) => { e.d /= maxD; });
    CRACKS = edges;
  }
  function ckStart() { const C = S.ck; if (C.running || C.q >= 0.999) return; C.running = true; C.ever = true; Sound.click(); updateCtl(); }
  function ckReset() { const C = S.ck; C.q = 0; C.running = false; C.done = false; updateCtl(); }
  function ckUpdate(dt) { const C = S.ck; if (!C.running) return; C.q = Math.min(1, C.q + dt / 7.5); if (C.q >= 0.999) { C.q = 1; C.running = false; C.done = true; C.everDone = true; Sound.success(); updateCtl(); } }
  function drawCrack(t) {
    const C = S.ck; if (!CRACKS) buildCracks();
    const wat = clamp(1 - C.q / 0.45, 0, 1), cg = clamp((C.q - 0.45) / 0.55, 0, 1), dry = clamp((C.q - 0.3) / 0.7, 0, 1);
    // 위에서 본 모습
    panel(CKA.x - 14, CKA.y - 46, CKA.s + 28, CKA.s + 62, { title: '위에서 본 모습', border: '#e7d9b5' });
    ctx.save(); rr(CKA.x, CKA.y, CKA.s, CKA.s, 14).clip();
    ctx.fillStyle = LITH_BASE.mud; ctx.fillRect(CKA.x, CKA.y, CKA.s, CKA.s); fillLith('mud');
    ctx.fillStyle = 'rgba(60,40,30,' + (0.45 * (1 - dry)) + ')'; ctx.fillRect(CKA.x, CKA.y, CKA.s, CKA.s);
    ctx.fillStyle = 'rgba(235,220,190,' + (0.35 * dry) + ')'; ctx.fillRect(CKA.x, CKA.y, CKA.s, CKA.s);
    if (wat > 0.02) { ctx.fillStyle = 'rgba(140,196,230,' + (0.55 * wat) + ')'; ctx.fillRect(CKA.x, CKA.y, CKA.s, CKA.s); }
    ctx.strokeStyle = '#2a1d14'; ctx.lineCap = 'round';
    CRACKS.forEach((e) => {
      const p = clamp((cg - e.d * 0.6) / 0.4, 0, 1); if (p <= 0) return;
      const a = e.n === 0 ? e[0] : e[1], b = e.n === 0 ? e[1] : e[0];
      ctx.lineWidth = 1.5 + 2.6 * cg; ctx.beginPath(); ctx.moveTo(CKA.x + a[0], CKA.y + a[1]); ctx.lineTo(CKA.x + a[0] + (b[0] - a[0]) * p, CKA.y + a[1] + (b[1] - a[1]) * p); ctx.stroke();
    });
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 4; rr(CKA.x, CKA.y, CKA.s, CKA.s, 14).stroke();
    // 옆에서 본 단면
    panel(CKB.x, CKB.y - (PHONE ? 8 : 0), CKB.w, CKB.h + (PHONE ? 8 : 0), { title: '옆에서 본 단면', border: '#e7d9b5' });
    const mh = CKB.h * 0.34, my = CKB.y + CKB.h - 16 - mh, wl = (CKB.h * 0.34) * wat;
    ctx.save(); ctx.beginPath(); ctx.rect(CKB.x + 14, CKB.y + 36, CKB.w - 28, CKB.h - 50); ctx.clip();
    if (wl > 1) { const wg = ctx.createLinearGradient(0, my - wl, 0, my); wg.addColorStop(0, 'rgba(207,233,247,.95)'); wg.addColorStop(1, 'rgba(140,196,230,.95)'); ctx.fillStyle = wg; ctx.fillRect(CKB.x + 14, my - wl, CKB.w - 28, wl); }
    ctx.fillStyle = LITH_BASE.mud; ctx.fillRect(CKB.x + 14, my, CKB.w - 28, mh + 20); ctx.fillStyle = lithFill('mud'); ctx.fillRect(CKB.x + 14, my, CKB.w - 28, mh + 20);
    // V 자 갈라진 틈 (위가 넓고 아래로 좁아져요)
    [0.14, 0.34, 0.54, 0.74, 0.92].forEach((q, k) => { const cx = CKB.x + 14 + (CKB.w - 28) * q, ww = (7 + 5 * (k % 2)) * cg, dd = mh * (0.7 + 0.15 * (k % 3)) * cg; if (cg > 0.01) { ctx.beginPath(); ctx.moveTo(cx - ww, my); ctx.lineTo(cx + ww, my); ctx.lineTo(cx, my + dd); ctx.closePath(); ctx.fillStyle = '#2a1d14'; ctx.fill(); } });
    ctx.restore();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.strokeRect(CKB.x + 14, CKB.y + 36, CKB.w - 28, CKB.h - 50);
    if (cg > 0.9) D.label(CKB.x + CKB.w / 2, my - 16, '틈은 위가 넓고 아래로 갈수록 좁아요 (V자)', { bg: '#7c2d12', size: 12.5, pad: 8 });
    // 안내
    panel(CKI.x, CKI.y, CKI.w, CKI.h, { title: '건열 (진흙이 마른 틈)', border: '#e7d9b5' });
    const msg = C.done ? '젖은 진흙이 마르면서 줄어들어 갈라졌어요. 건열은 한때 물에 잠겼다가 물 밖으로 드러나 건조했던 곳(건조한 호수, 갯벌)을 알려 줘요. 위가 넓은 V자라서 지층의 위아래도 알 수 있어요.' : C.running ? (wat > 0.02 ? '물이 서서히 빠져요…' : '진흙이 마르며 줄어들어요…') : '물에 젖은 진흙을 말리면 어떻게 될까요?';
    note(CKI.x + 12, CKI.y + 40, CKI.w - 24, msg, 14, { bg: '#fffbeb', border: '#fde68a' });
  }

  /* =========================================================
     장면 6: 사층리 (모래 언덕이 흐름 방향으로 이동)
     ========================================================= */
  const CSA = PHONE ? { x: 12, y: 12, w: 576, h: 500 } : { x: 12, y: 10, w: 776, h: 400 };
  const CSI = PHONE ? { x: 12, y: 524, w: 576, h: 304 } : { x: 12, y: 420, w: 776, h: 130 };
  const CSG = () => ({ x0: CSA.x + 24, w: CSA.w - 48, yB: CSA.y + CSA.h * (PHONE ? 0.74 : 0.8), H: PHONE ? 74 : 92, xc0: CSA.x + 24 + (PHONE ? 190 : 250), spd: PHONE ? 20 : 30, dur: 8 });
  function csReset() { const C = S.cs, g = CSG(); C.t = 0; C.running = false; C.done = false; C.xc = g.xc0; C.lam = []; for (let x = g.xc0 - 200; x <= g.xc0; x += 9) C.lam.push(x); C.parts = []; }
  function csRun() { const C = S.cs; if (C.running || C.done) return; C.running = true; Sound.click(); updateCtl(); }
  function csUpdate(dt) {
    const C = S.cs, g = CSG(); if (!C.running) return;
    C.t += dt; C.xc += g.spd * dt;
    while (C.lam[C.lam.length - 1] + 9 <= C.xc) C.lam.push(C.lam[C.lam.length - 1] + 9);
    if (C.t >= g.dur) { C.running = false; C.done = true; C.everDone = true; Sound.success(); updateCtl(); }
  }
  function leeBez(xi, yTop, yB, Lb, s) { // s: 0~1  (베지어 곡선 위의 점)
    const p0 = [xi, yTop], c1 = [xi + Lb * 0.45, yTop + (yB - yTop) * 0.78], c2 = [xi + Lb * 0.8, yB - 2], p3 = [xi + Lb * 1.5, yB], u = 1 - s;
    return [u * u * u * p0[0] + 3 * u * u * s * c1[0] + 3 * u * s * s * c2[0] + s * s * s * p3[0], u * u * u * p0[1] + 3 * u * u * s * c1[1] + 3 * u * s * s * c2[1] + s * s * s * p3[1]];
  }
  function drawCross(t, dt) {
    const C = S.cs, g = CSG(), H = g.H, yTop = g.yB - H, Lb = H / Math.tan(rad(32)), xs = C.xc - 2.6 * H;
    panel(CSA.x, CSA.y, CSA.w, CSA.h, { title: '흐르는 물 아래 모래 언덕 (옆모습)', border: '#e7d9b5' });
    const wg = ctx.createLinearGradient(0, CSA.y + 50, 0, g.yB); wg.addColorStop(0, '#cfe9f7'); wg.addColorStop(1, '#8cc4e6'); ctx.fillStyle = wg; ctx.fillRect(g.x0, CSA.y + 50, g.w, g.yB - CSA.y - 50);
    for (let r = 0; r < 2; r++) for (let c = 0; c < (PHONE ? 4 : 7); c++) { const xx = g.x0 + 26 + c * (g.w / (PHONE ? 4 : 7)) + ((t * 50) % 12), yy = CSA.y + 76 + r * 52; D.arrow(xx, yy, xx + 36, yy, { color: 'rgba(30,100,160,.7)', width: 2.8, head: 8 }); }
    // 모래 언덕 몸체
    const body = []; body.push([g.x0, g.yB]);
    for (let x = g.x0; x <= xs; x += 12) body.push([x, g.yB]);
    for (let x = xs; x <= C.xc; x += 6) body.push([x, g.yB - H * clamp((x - xs) / (C.xc - xs), 0, 1)]);
    for (let s2 = 0; s2 <= 1.001; s2 += 0.05) body.push(leeBez(C.xc, yTop, g.yB, Lb, s2));
    body.push([g.x0 + g.w, g.yB]);
    ctx.save(); polyPath(body); ctx.clip();
    ctx.fillStyle = LITH_BASE.sand; ctx.fillRect(g.x0, yTop - 4, g.w, H + 8); ctx.fillStyle = lithFill('sand'); ctx.fillRect(g.x0, yTop - 4, g.w, H + 8);
    ctx.strokeStyle = 'rgba(110,60,20,.8)'; ctx.lineWidth = 1.6;
    C.lam.forEach((xi) => { ctx.beginPath(); for (let s2 = 0; s2 <= 1.001; s2 += 0.05) { const p = leeBez(xi, yTop, g.yB, Lb, s2); s2 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); });
    ctx.restore();
    ctx.strokeStyle = '#6b4a1c'; ctx.lineWidth = 3; ctx.beginPath(); body.slice(1, -1).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    // 굴러 내리는 모래 알갱이
    if (C.running && !RM) {
      if (Math.random() < 0.7 && C.parts.length < 70) C.parts.push({ s: 0, lee: false, x: xs + Math.random() * (C.xc - xs) * 0.4 });
      C.parts.forEach((p) => { if (!p.lee) { p.x += 40 * dt; if (p.x >= C.xc) { p.lee = true; p.s = 0; } } else p.s += dt * 1.6; });
      C.parts = C.parts.filter((p) => p.s < 1);
      C.parts.forEach((p) => { const pos = p.lee ? leeBez(C.xc, yTop, g.yB, Lb, p.s) : [p.x, g.yB - H * clamp((p.x - xs) / (C.xc - xs), 0, 1) - 3]; ctx.beginPath(); ctx.arc(pos[0], pos[1] - 2, 2.4, 0, TAU); ctx.fillStyle = '#c98f2f'; ctx.fill(); });
    }
    ctx.fillStyle = '#64748b'; ctx.fillRect(g.x0, g.yB + 1, g.w, 22); ctx.fillStyle = lithFill('gravel'); ctx.fillRect(g.x0, g.yB + 1, g.w, 22);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.strokeRect(g.x0, CSA.y + 50, g.w, g.yB + 23 - CSA.y - 50);
    // 이름표
    D.label(C.xc + Lb * 0.5, yTop + 6, '가파른 면', { bg: '#7c2d12', size: 12.5, pad: 7, align: 'left' });
    if (C.done || C.lam.length > 40) { D.label(xs + (C.xc - xs) * 0.35, g.yB - 14, '층리가 비스듬해요 (사층리)', { bg: '#fff', color: '#7c2d12', size: 12.5, pad: 8, border: '#7c2d12' }); }
    // 아래 안내
    panel(CSI.x, CSI.y, CSI.w, CSI.h, { title: '사층리', border: '#e7d9b5' });
    const ix = CSI.x + 14, iy = CSI.y + 38, iw = PHONE ? 220 : 200, ih = PHONE ? 140 : 62;
    drawStruct('cross', ix, iy, iw, ih); structFrame(ix, iy, iw, ih); tx(ix, iy + ih + 18, '굳은 암석 속 사층리 단면', 12.5, gcl.mute, 'left', 700);
    const msg = C.done ? '모래 언덕이 흐름 방향으로 이동하면서 가파른 면에 모래가 비스듬히 쌓였어요. 층리가 아래에서는 완만히 이어지고 위에서는 잘려요. 하천·삼각주·사막에서 볼 수 있어요.' : C.running ? '모래가 언덕 위로 굴러 올라가 가파른 면으로 쏟아져요…' : '흐르는 물은 모래 언덕을 어떻게 움직일까요?';
    note(ix + iw + 16, CSI.y + 36, CSI.w - iw - 46, msg, 14, { bg: '#fffbeb', border: '#fde68a' });
  }

  /* =========================================================
     장면 7: 단서 카드와 퇴적 환경 짝짓기
     ========================================================= */
  const ENV = [['river', '하천', '🏞️'], ['delta', '삼각주', '🔺'], ['coast', '해안', '🏖️'], ['shallow', '얕은 바다', '🪸'], ['deep', '깊은 바다', '🌊'], ['desert', '사막', '🏜️'], ['lake', '건조 호수', '🧂']];
  const ENVN = {}; ENV.forEach((e) => { ENVN[e[0]] = e[1]; });
  const CLUES = [
    { kind: 'ripA', name: '비대칭 연흔', text: '비대칭 연흔이 있는 사암', env: 'river', why: '한 방향으로 흐르는 물이 만든 비대칭 연흔이에요.' },
    { kind: 'ripS', name: '대칭 연흔', text: '대칭 연흔이 있는 사암', env: 'coast', why: '왔다 갔다 하는 파도가 만든 대칭 연흔이에요.' },
    { kind: 'crack', name: '건열', text: '건열이 있는 이암', env: 'lake', why: '진흙이 물 밖에서 말라 갈라졌어요. 건조한 호수가 알맞아요.' },
    { kind: 'graded', name: '점이층리', text: '점이층리가 있는 지층', env: 'deep', why: '탁한 물이 한꺼번에 퍼져 가라앉는 곳, 깊은 바다(탁류)예요.' },
    { kind: 'coral', name: '산호 화석', text: '산호 화석이 있는 석회암', env: 'shallow', why: '산호는 따뜻하고 얕은 바다에서 살아요.' },
    { kind: 'cross', name: '큰 사층리', text: '큰 사층리, 고르고 둥근 모래', env: 'desert', why: '바람이 모래 언덕을 옮기면 큰 사층리가 생기고 모래는 고르고 둥글어요.' },
  ];
  const MTR = () => PHONE
    ? [0, 1, 2, 3, 4, 5].map((i) => ({ x: 12 + (i % 2) * 294, y: 12 + Math.floor(i / 2) * 204, w: 282, h: 194 }))
    : [0, 1, 2, 3, 4, 5].map((i) => ({ x: 12 + (i % 3) * 262, y: 10 + Math.floor(i / 3) * 218, w: 252, h: 208 }));
  function drawMatch(t) {
    const rs = MTR();
    CLUES.forEach((c, i) => {
      const r = rs[i], a = S.mt.ans[i], ok = a === c.env;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(r.x, r.y, r.w, r.h, 14).fill(); }, { blur: 5, y: 3 });
      ctx.strokeStyle = a ? (ok ? '#16a34a' : '#e2464b') : '#d6cdb5'; ctx.lineWidth = a ? 3.5 : 2; rr(r.x, r.y, r.w, r.h, 14).stroke();
      tx(r.x + 12, r.y + 24, '단서 ' + (i + 1), 14, gcl.mute, 'left', 800);
      ctx.save(); rr(r.x + 10, r.y + 34, r.w - 20, r.h * 0.5, 8).clip(); drawStruct(c.kind, r.x + 10, r.y + 34, r.w - 20, r.h * 0.5); ctx.restore();
      drawWrap(r.x + r.w / 2, r.y + r.h * 0.5 + 56, c.text, r.w - 20, 14, { color: gcl.ink, weight: 800 });
      if (a) D.label(r.x + r.w - 10, r.y + 22, (ok ? '✓ ' : '') + ENVN[a], { bg: ok ? '#15803d' : '#b91c1c', size: 12.5, pad: 8, align: 'right' });
    });
    // 환경 안내 띠
    const ly = PHONE ? 632 : 450;
    panel(12, ly, VW - 24, PHONE ? 196 : 100, { title: '퇴적 환경', border: '#e7d9b5' });
    ENV.forEach((e, i) => { const cols = PHONE ? 4 : 7, cw = (VW - 40) / cols, x = 20 + (i % cols) * cw + cw / 2, y = ly + (PHONE ? 70 + Math.floor(i / cols) * 70 : 62); D.text(x, y, e[2], { size: 26 }); tx(x, y + 26, e[1], 13.5, gcl.ink, 'center', 800); });
  }

  /* =========================================================
     장면 8: 지층의 위아래 판단 (뒤집힌 노두)
     ========================================================= */
  const INV = [
    { kind: 'ripA', name: '연흔', up: true, text: '연흔의 마루(뾰족한 쪽)가 위를 향하면 정상이에요.' },
    { kind: 'graded', name: '점이층리', up: false, text: '점이층리는 굵은 알갱이가 아래에 있으면 정상이에요.' },
    { kind: 'crack', name: '건열', up: false, text: '건열은 V자가 벌어진 쪽이 위이면 정상이에요.' },
  ];
  function invFlip() { const I = S.inv; if (I.flipTw) I.flipTw.cancel(); I.flipOn = !I.flipOn; I.flipTw = SciSim.tween(I, { flip: I.flipOn ? Math.PI : 0 }, { duration: 1.1, ease: 'inOutCubic', onDone() { I.flipTw = null; } }); Sound.click(); updateCtl(); }
  function invReset() { const I = S.inv; if (I.flipTw) I.flipTw.cancel(); I.flipTw = null; I.flip = 0; I.flipOn = false; I.ans = [null, null, null]; }
  function drawInvert(t) {
    const I = S.inv, cw = PHONE ? 176 : 214, ch = PHONE ? 170 : 200;
    panel(12, 10, VW - 24, PHONE ? 492 : 380, { title: '발견한 노두 (사진 모식도)', border: '#e7d9b5' });
    INV.forEach((o, i) => {
      const ccx = PHONE ? 300 : 140 + i * 258, ccy = PHONE ? 118 + i * 156 : 200;
      const base = o.up ? 0 : Math.PI, ang = base + I.flip, a = I.ans[i], ok = a === (o.up ? 'up' : 'down');
      const w = PHONE ? 220 : cw, h = PHONE ? 130 : ch;
      ctx.save(); ctx.translate(ccx, ccy); ctx.rotate(ang); drawStruct(o.kind, -w / 2, -h / 2, w, h); structFrame(-w / 2, -h / 2, w, h); ctx.restore();
      tx(ccx - w / 2, PHONE ? ccy - 72 : ccy - ch / 2 - 10, '노두 ' + ['A', 'B', 'C'][i] + ' · ' + o.name, 14, gcl.ink, 'left', 800);
      if (a) D.label(ccx + w / 2, PHONE ? ccy - 78 : ccy - ch / 2 - 16, ok ? '✓ ' + (o.up ? '정상' : '역전') : '다시 살펴봐요', { bg: ok ? '#15803d' : '#b91c1c', size: 12.5, pad: 8, align: 'right' });
    });
    const P = PHONE ? { x: 12, y: 512, w: 576, h: 316 } : { x: 12, y: 400, w: 776, h: 150 };
    panel(P.x, P.y, P.w, P.h, { title: '위아래를 알려 주는 단서', border: '#e7d9b5' });
    INV.forEach((o, i) => { const y = P.y + 40 + i * (PHONE ? 70 : 34); D.label(P.x + 14, y + 9, o.name, { bg: '#475569', size: 13, pad: 9, align: 'left' }); if (PHONE) drawWrap(P.x + 120, y + 6, o.text, P.w - 134, 13, { color: gcl.ink, align: 'left' }); else tx(P.x + 112, y + 14, o.text, 14, gcl.ink, 'left', 700); });
    if (I.flipOn && !PHONE) tx(P.x + P.w - 14, P.y + P.h - 10, '뒤집어 보면 정상이던 노두는 거꾸로, 역전이던 노두는 바로 보여요.', 12.5, gcl.mute, 'right', 700);
  }


  /* =========================================================
     장면 9: 노두 주상도 (아래 → 위: 역암 2 m, 사암 5 m, 사암 3 m, 이암 8 m, 석회암 10 m)
     ========================================================= */
  const SEGS = [
    { name: '역암', t: 2, kind: 'conglo', clue: '둥근 자갈', env: 'land' },
    { name: '사암', t: 5, kind: 'cross', clue: '사층리', env: 'land' },
    { name: '사암', t: 3, kind: 'ripS', clue: '대칭 연흔', env: 'coast' },
    { name: '이암', t: 8, kind: 'nautilus', clue: '앵무조개 화석', env: 'calm' },
    { name: '석회암', t: 10, kind: 'coral', clue: '산호 화석', env: 'warm' },
  ];
  const ENVC = [['land', '하천·삼각주 평원'], ['coast', '해안 (파도의 영향)'], ['calm', '해안에서 멀어진 잔잔한 바다'], ['warm', '따뜻하고 얕은 바다']];
  const ENVS = { land: '하천·삼각주 평원', coast: '해안', calm: '멀어진 잔잔한 바다', warm: '따뜻하고 얕은 바다' };
  const ENVCN = {}; ENVC.forEach((e) => { ENVCN[e[0]] = e[1]; });
  const SEG_WHY = ['둥근 자갈은 물살이 센 곳(하천·삼각주 평원)에서 쌓여요.', '사층리는 하천·삼각주 평원에서 모래 언덕이 이동하며 생겨요.', '대칭 연흔은 파도가 왕복하는 해안에서 생겨요.', '이암은 잔잔한 곳에서 쌓이고, 앵무조개는 바다에 살아요. 해안에서 멀어졌어요.', '산호는 따뜻하고 얕은 맑은 바다에서 살아요. 육지에서 오는 흙탕물이 거의 없어요.'];
  const CL = PHONE ? { x: 36, w: 168, base: 516, per: 13.8 } : { x: 52, w: 190, base: 520, per: 15 };
  const colOk = () => S.col.ans.every((a, i) => a === SEGS[i].env);
  function drawColumn(t) {
    const C = S.col, tot = SEGS.reduce((a, s) => a + s.t, 0);
    panel(12, 10, VW - 24, PHONE ? 530 : 540, { title: '어느 노두의 주상도 (아래가 오래된 층)', border: '#e7d9b5' });
    let y = CL.base;
    SEGS.forEach((sg, i) => {
      const h = sg.t * CL.per, yt = y - h;
      drawStruct(sg.kind, CL.x, yt, CL.w, h); structFrame(CL.x, yt, CL.w, h);
      D.sphere(CL.x - 20, yt + h / 2, 12, '#475569', { text: String(i + 1), gloss: false });
      const a = C.ans[i], ok = a === sg.env;
      tx(CL.x + CL.w + 14, yt + h / 2 + 5, sg.name + ' ' + sg.t + ' m · ' + sg.clue, PHONE ? 12.5 : 14, gcl.ink, 'left', 800);
      if (a) D.label(PHONE ? 586 : 548, yt + h / 2, (ok ? '✓ ' : '') + ENVS[a], { bg: ok ? '#15803d' : '#b91c1c', size: 12.5, pad: 7, align: 'right' });
      y = yt;
    });
    if (colOk()) { D.arrow(CL.x - 40, CL.base - 6, CL.x - 40, CL.base - tot * CL.per + 8, { color: '#7c3aed', width: 5, head: 14 }); }
    const IP = PHONE ? { x: 12, y: 552, w: 576, h: 276 } : { x: 556, y: 10, w: 232, h: 540 };
    if (!PHONE) {
      panel(IP.x, IP.y, IP.w, IP.h, { title: '환경 해석', border: '#e7d9b5' });
      const n = C.ans.filter((a, i) => a === SEGS[i].env).length;
      note(IP.x + 10, IP.y + 36, IP.w - 20, colOk() ? '위로 갈수록 알갱이가 작아지고(역암 → 사암 → 이암) 마지막에는 맑은 바다의 석회암이 쌓였어요. 육지에서 점점 멀어졌으니 바다가 육지 쪽으로 밀려온 해침이에요.' : '구간마다 구조와 알갱이, 화석을 단서로 퇴적 환경을 골라요. (' + n + ' / 5 맞음)', 14, { bg: colOk() ? '#f0fdf4' : '#f0f9ff', border: colOk() ? '#86efac' : '#bae6fd' });
      if (colOk()) { D.label(IP.x + 14, IP.y + 220, '위로 갈수록', { bg: '#7c3aed', size: 14, pad: 10, align: 'left' }); tx(IP.x + 14, IP.y + 262, '육지에서 멀어져요 = 해침', 15, '#6d28d9', 'left', 800); }
      else tx(IP.x + 14, IP.y + 220, '아래층이 먼저 쌓였고 위층이 나중이에요.', 13.5, gcl.mute, 'left', 700);
    } else {
      panel(IP.x, IP.y, IP.w, IP.h, { title: '환경 해석', border: '#e7d9b5' });
      note(IP.x + 10, IP.y + 36, IP.w - 20, colOk() ? '위로 갈수록 알갱이가 작아지고 마지막에는 맑은 바다의 석회암이 쌓였어요. 육지에서 점점 멀어졌으니 해침이에요.' : '구간마다 구조와 알갱이, 화석을 단서로 퇴적 환경을 골라요.', 14, { bg: colOk() ? '#f0fdf4' : '#f0f9ff', border: colOk() ? '#86efac' : '#bae6fd' });
    }
  }

  /* =========================================================
     장면 10: 해침과 해퇴 (위로 갈수록 알갱이 크기의 변화)
     ========================================================= */
  const TRD = [
    { title: '노두 X: 위로 갈수록 알갱이가 작아져요', layers: ['gravel', 'sand', 'clay'], names: ['역암', '사암', '이암'], ans: 'trans' },
    { title: '노두 Y: 위로 갈수록 알갱이가 커져요', layers: ['clay', 'sand', 'gravel'], names: ['이암', '사암', '역암'], ans: 'regr' },
  ];
  const trOk = (i) => S.tr.ans[i] === TRD[i].ans;
  function drawTrend(t) {
    TRD.forEach((d, i) => {
      const P = PHONE ? { x: 12, y: 12 + i * 232, w: 576, h: 222 } : { x: 12 + i * 392, y: 10, w: 384, h: 410 };
      panel(P.x, P.y, P.w, P.h, { title: d.title, border: '#e7d9b5' });
      const cw = 120, lh = PHONE ? 52 : 68, cx = P.x + 26, cy = P.y + (PHONE ? 52 : 56) + lh * 3;
      d.layers.forEach((k, j) => { const yt = cy - (j + 1) * lh; ctx.beginPath(); ctx.rect(cx, yt, cw, lh); ctx.fillStyle = LITH_BASE[k]; ctx.fill(); fillLith(k); ctx.strokeStyle = 'rgba(30,25,20,.6)'; ctx.lineWidth = 1.8; ctx.stroke(); tx(cx + cw + 10, yt + lh / 2 + 5, d.names[j], 14.5, gcl.ink, 'left', 800); });
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.strokeRect(cx, cy - 3 * lh, cw, 3 * lh);
      D.arrow(cx - 12, cy - 6, cx - 12, cy - 3 * lh + 6, { color: '#7c3aed', width: 3.5, head: 10 });
      // 정답을 맞힌 뒤에 해안선 그림
      const ok = trOk(i), a = S.tr.ans[i];
      const mx = P.x + (PHONE ? 300 : 24), my = P.y + (PHONE ? 54 : 56 + 3 * 68 + 26), mw = PHONE ? 262 : 336, mh = PHONE ? 150 : 74;
      if (ok) {
        const trans = d.ans === 'trans';
        ctx.save(); rr(mx, my, mw, mh, 10).clip(); ctx.fillStyle = '#e7dcc0'; ctx.fillRect(mx, my, mw, mh);
        const s1 = mx + mw * (trans ? 0.62 : 0.3), s2 = mx + mw * (trans ? 0.3 : 0.62);
        ctx.fillStyle = 'rgba(140,196,230,.9)'; ctx.fillRect(Math.min(s1, s2), my, Math.abs(s1 - s2), mh); ctx.fillStyle = '#8cc4e6'; ctx.fillRect(Math.max(s1, s2), my, mx + mw - Math.max(s1, s2), mh);
        ctx.restore(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; rr(mx, my, mw, mh, 10).stroke();
        D.arrow(s1, my + mh * 0.5, s2, my + mh * 0.5, { color: '#0369a1', width: 4, head: 11 });
        tx(mx + 10, my + 20, '육지', 13, '#7c5a2a', 'left', 800); tx(mx + mw - 10, my + 20, '바다', 13, '#0369a1', 'right', 800);
        D.label(mx + mw / 2, PHONE ? my + mh - 16 : my + mh + 22, trans ? '해침: 바다가 육지 쪽으로 밀려와요' : '해퇴: 바다가 육지에서 물러나요', { bg: '#15803d', size: 13, pad: 9 });
      } else if (a) D.label(mx + 90, my + 18, '다시 생각해 봐요', { bg: '#b91c1c', size: 13, pad: 9 });
      else tx(mx, my + 20, '해침일까, 해퇴일까?', 15, gcl.mute, 'left', 800);
    });
    if (PHONE) panelNote();
    else note(12, 436, VW - 24, '알갱이가 작아진다는 것은 흐름이 약하고 육지에서 멀다는 뜻이에요. 바다가 육지 쪽으로 오면(해침) 위로 갈수록 알갱이가 작아지고, 바다가 물러나면(해퇴) 위로 갈수록 알갱이가 커져요.', 14, { bg: '#fffbeb', border: '#fde68a' });
    function panelNote() { note(12, 480, VW - 24, '위로 갈수록 알갱이가 작아지면 육지에서 멀어지는 해침, 커지면 육지에 가까워지는 해퇴예요.', 13.5, { bg: '#fffbeb', border: '#fde68a' }); }
  }

  /* =========================================================
     조작 · 읽기 칸 · 단계와 미션
     ========================================================= */
  const VIEW_LABEL = { sieve: '🧂 체로 알갱이 가르기', flow: '🌊 흐름의 세기와 알갱이', graded: '🥤 점이층리 만들기', ripple: '〰️ 연흔 만들기', crack: '🧱 건열 만들기', cross: '📚 사층리 만들기', match: '🧩 단서로 퇴적 환경 짝짓기', invert: '🔄 지층의 위아래 판단', column: '📊 노두 주상도 해석', trend: '🌊 해침과 해퇴' };
  const sFlow = $('#sFlow'), oFlow = $('#oFlow');
  const s1Btns = $$('#s1Seg .opt'), expBtns = $$('#expSeg .opt'), ripBtns = $$('#ripSeg .opt');
  const mkSel = (host, rows, name) => { $(host).innerHTML = rows.map((r, i) => '<div class="cap-lbl">' + r.label + '</div><select class="mini-sel" data-i="' + i + '" aria-label="' + name + ' ' + (i + 1) + '"><option value="">고르세요</option>' + r.opts.map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('') + '</select>').join(''); return $$(host + ' select'); };
  const matchSels = mkSel('#matchRows', CLUES.map((c, i) => ({ label: (i + 1) + '. ' + c.text, opts: ENV.map((e) => [e[0], e[2] + ' ' + e[1]]) })), '단서');
  const invSels = mkSel('#invRows', INV.map((o, i) => ({ label: '노두 ' + ['A', 'B', 'C'][i] + ' (' + o.name + ')', opts: [['up', '정상 (처음 모습 그대로)'], ['down', '역전 (거꾸로 놓임)']] })), '노두');
  const colSels = mkSel('#colRows', SEGS.map((s, i) => ({ label: (i + 1) + '. ' + s.name + ' ' + s.t + ' m · ' + s.clue, opts: ENVC })), '구간');
  const trSels = mkSel('#trendRows', TRD.map((d, i) => ({ label: '노두 ' + ['X', 'Y'][i] + ': ' + (i ? '위로 갈수록 알갱이가 커져요' : '위로 갈수록 알갱이가 작아져요'), opts: [['trans', '해침'], ['regr', '해퇴']] })), '노두');

  function setView(v) { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); }
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes || !c.dataset.modes.split(' ').includes(S.view); });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
    $('#modeSeg').hidden = !(game && game.free);
    s1Btns.forEach((b) => b.classList.toggle('on', b.dataset.k === S.view));
    expBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === S.view));
    const V = S.sv; $('#bSieve').disabled = V.running || V.done; $('#bSieve').textContent = V.done ? '다 걸렀어요' : V.running ? '흔드는 중…' : '▶ 체 흔들기';
    const F = S.fl; $('#bFlow').disabled = F.running; sFlow.disabled = F.running; $('#bFlow').textContent = F.running ? '흘러가는 중…' : '▶ 흘려보내기'; setSlider(sFlow, oFlow, F.v0, (v) => String(v));
    const G = S.gr; $('#bGraded').disabled = G.running || G.done; $('#bGraded').textContent = G.done ? '가라앉았어요' : G.running ? '가라앉는 중…' : '▶ 가라앉히기'; $('#bGradedReset').disabled = G.running;
    const R = S.rp; ripBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === R.mode)); $('#bRip').disabled = R.running; $('#bRip').textContent = R.running ? (R.done[R.mode] ? '다 만들어졌어요' : '만드는 중…') : '▶ 흘려보내기'; ripBtns.forEach((b) => { b.classList.toggle('good', R.done[b.dataset.k]); });
    const C = S.ck; $('#bCrack').disabled = C.running || C.done; $('#bCrack').textContent = C.done ? '다 말랐어요' : C.running ? '마르는 중…' : '☀️ 물 빼고 말리기';
    const X = S.cs; $('#bCross').disabled = X.running || X.done; $('#bCross').textContent = X.done ? '다 쌓였어요' : X.running ? '쌓이는 중…' : '▶ 흘려보내기';
    matchSels.forEach((s) => { s.value = S.mt.ans[+s.dataset.i] || ''; }); invSels.forEach((s) => { s.value = S.inv.ans[+s.dataset.i] || ''; }); colSels.forEach((s) => { s.value = S.col.ans[+s.dataset.i] || ''; }); trSels.forEach((s) => { s.value = S.tr.ans[+s.dataset.i] || ''; });
    $('#bFlip').textContent = S.inv.flipOn ? '↻ 처음 모습으로' : '↻ 뒤집어 보기';
  }
  const goView = (v) => { Sound.click(); setView(v); };
  s1Btns.forEach((b) => b.addEventListener('click', () => goView(b.dataset.k)));
  expBtns.forEach((b) => b.addEventListener('click', () => goView(b.dataset.k)));
  $('#bSieve').addEventListener('click', svRun); $('#bSieveReset').addEventListener('click', () => { Sound.click(); svInit(); updateCtl(); });
  bindSlider(sFlow, oFlow, (v) => String(v), (v) => { if (!S.fl.running) S.fl.v0 = v; });
  $('#bFlow').addEventListener('click', flRun); $('#bFlowReset').addEventListener('click', () => { Sound.click(); const v = S.fl.v0, runs = S.fl.runs; flInit(); S.fl.v0 = v; S.fl.runs = runs; updateCtl(); });
  $('#bGraded').addEventListener('click', () => { const G = S.gr; if (G.running || G.done) return; G.running = true; Sound.click(); updateCtl(); });
  $('#bGradedReset').addEventListener('click', () => { Sound.click(); const ever = S.gr.ever; grInit(); S.gr.ever = ever; updateCtl(); });
  ripBtns.forEach((b) => b.addEventListener('click', () => { Sound.click(); const R = S.rp; R.mode = b.dataset.k; R.t = 0; R.A = 0; R.running = false; updateCtl(); }));
  $('#bRip').addEventListener('click', rpRun); $('#bRipReset').addEventListener('click', () => { Sound.click(); const R = S.rp; R.t = 0; R.A = 0; R.running = false; updateCtl(); });
  $('#bCrack').addEventListener('click', ckStart); $('#bCrackReset').addEventListener('click', () => { Sound.click(); ckReset(); });
  $('#bCross').addEventListener('click', csRun); $('#bCrossReset').addEventListener('click', () => { Sound.click(); csReset(); updateCtl(); });
  matchSels.forEach((s) => s.addEventListener('change', () => { Sound.click(); S.mt.ans[+s.dataset.i] = s.value || null; updateCtl(); }));
  invSels.forEach((s) => s.addEventListener('change', () => { Sound.click(); S.inv.ans[+s.dataset.i] = s.value || null; updateCtl(); }));
  colSels.forEach((s) => s.addEventListener('change', () => { Sound.click(); S.col.ans[+s.dataset.i] = s.value || null; updateCtl(); }));
  trSels.forEach((s) => s.addEventListener('change', () => { Sound.click(); S.tr.ans[+s.dataset.i] = s.value || null; updateCtl(); }));
  $('#bFlip').addEventListener('click', invFlip);

  function readouts() {
    const v = S.view;
    if (v === 'sieve') { const V = S.sv, n = V.grains.filter((p) => p.state === 'rest').length; setReadouts(['걸러진 알갱이', n + ' / ' + V.grains.length, '체 1에 남음', V.done ? '자갈' : '?', '체 2에 남음', V.done ? '모래' : '?']); }
    else if (v === 'flow') { const F = S.fl; setReadouts(['흐름의 세기', String(F.v0), '흘려보낸 횟수', F.runs.length + '번', '지금', F.running ? '흘러가는 중' : F.stat ? '멈춘 자리 표시' : '준비']); }
    else if (v === 'graded') { const G = S.gr, n = G.grains.filter((p) => p.settled).length; setReadouts(['가라앉은 알갱이', n + ' / ' + G.grains.length, '아래층 알갱이', G.done ? '자갈 (가장 굵음)' : '?', '위층 알갱이', G.done ? '점토 (가장 고움)' : '?']); }
    else if (v === 'ripple') { const R = S.rp; setReadouts(['물의 움직임', R.mode === 'one' ? '한 방향 흐름' : '왕복 파도', '연흔 높이', f1(R.A) + ' px', '만든 연흔', (R.done.one ? '비대칭 ' : '') + (R.done.wave ? '대칭' : '') || '아직']); }
    else if (v === 'crack') { const C = S.ck; setReadouts(['진흙', C.q < 0.3 ? '젖어 있음' : C.q < 0.999 ? '마르는 중' : '다 말랐음', '갈라진 정도', f0(clamp((C.q - 0.45) / 0.55, 0, 1) * 100) + '%', '틈의 모양', C.done ? 'V자 (위가 넓음)' : '?']); }
    else if (v === 'cross') { const X = S.cs; setReadouts(['모래 언덕 이동', f0(X.xc - CSG().xc0) + ' px', '쌓인 비스듬한 층', f0(X.lam.length - 23) + '개', '상태', X.done ? '사층리 완성' : X.running ? '쌓이는 중' : '준비']); }
    else if (v === 'match') { const n = S.mt.ans.filter((a, i) => a === CLUES[i].env).length; setReadouts(['고른 단서', S.mt.ans.filter((a) => a).length + ' / 6', '맞힌 단서', n + ' / 6', '기준', '구조·알갱이·화석']); }
    else if (v === 'invert') { const n = S.inv.ans.filter((a, i) => a === (INV[i].up ? 'up' : 'down')).length; setReadouts(['판단한 노두', S.inv.ans.filter((a) => a).length + ' / 3', '맞힌 노두', n + ' / 3', '화면', S.inv.flipOn ? '뒤집어 본 모습' : '처음 모습']); }
    else if (v === 'column') { const n = S.col.ans.filter((a, i) => a === SEGS[i].env).length; setReadouts(['구간', '5개 · 총 28 m', '맞힌 구간', n + ' / 5', '해석', colOk() ? '육지에서 멀어짐 (해침)' : '—']); }
    else { const n = [0, 1].filter(trOk).length; setReadouts(['노두 X', trOk(0) ? '해침' : '?', '노두 Y', trOk(1) ? '해퇴' : '?', '맞힌 노두', n + ' / 2']); }
  }

  /* ---------- 단계 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    if (li === 0) { svInit(); S.sv.everDone = false; flInit(); S.fl.v0 = 5; setView('sieve'); showHint('▶ 체 흔들기를 눌러 알갱이를 크기별로 가려요', 5200); }
    else if (li === 1) { grInit(); S.gr.ever = false; rpReset(); S.rp.mode = 'one'; ckReset(); S.ck.everDone = false; csReset(); S.cs.everDone = false; S.sv.everDone = false; setView('graded'); showHint('▶ 가라앉히기를 눌러 점이층리를 만들어 봐요', 5200); }
    else if (li === 2) { S.mt.ans = [null, null, null, null, null, null]; invReset(); setView('match'); showHint('단서에 알맞은 환경을 골라요', 5200); }
    else { S.col.ans = [null, null, null, null, null]; S.tr.ans = [null, null]; setView('column'); showHint('구간마다 퇴적 환경을 골라요', 5200); }
    updateCtl();
  }
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const SRC = '<p style="font-size:13.5px;color:var(--muted);margin-top:6px">※ 구조·주상도·알갱이 크기는 교육용 <b>예시 자료</b>예요.</p>';
  const matchOk = () => S.mt.ans.every((a, i) => a === CLUES[i].env);
  const invOk = () => S.inv.ans.every((a, i) => a === (INV[i].up ? 'up' : 'down'));
  const feedFirst = (ans, okf, msgf, label) => { const n = ans.findIndex((x) => !x); if (n >= 0) return label + ' ' + (n + 1) + '의 답을 아직 고르지 않았어요.'; const w = ans.findIndex((x, i) => !okf(x, i)); return w < 0 ? true : msgf(w); };

  const levels = [
    {
      title: '층리와 입자: 알갱이는 어떻게 가려질까', short: '층리와 입자', icon: '🧂', phase: '관찰', features: ['sieve', 'flow'],
      intro: '<p class="si-q">❓ 탐구 질문: 굳은 암석 속에 남은 무늬로 그 땅이 옛날 어떤 곳이었는지 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교 「지권의 변화」</b>에서 퇴적물이 쌓여 층을 이루고 퇴적암이 된다고 배웠어요. <b>앞 차시</b>에서는 지층의 순서를 읽었고, 이번에는 지층 <b>안</b>에 남은 무늬(퇴적 구조)를 읽어요.</div>' +
        '<p>퇴적물은 알갱이의 크기에 따라 <b>자갈 &gt; 모래 &gt; 점토</b>로 나눠요. 알갱이의 크기·성분·색이 바뀌면 층의 경계가 생기는데, 이것이 <b>층리</b>예요. 먼저 체로 알갱이를 크기별로 가르고, 흐름의 세기에 따라 어떤 알갱이가 쌓이는지 살펴봐요.</p>' + SRC,
      setup() { enterLevel(0); },
      recap: '알갱이는 크기별로 자갈·모래·점토로 나누고, 센 흐름에서는 큰 알갱이가, 약한 흐름에서는 작은 알갱이까지 쌓여요. 알갱이 크기는 환경의 에너지를 알려 줘요.',
      summary: tb([['이름', '알갱이 크기', '쌓이는 곳(예)'], ['자갈', '2 mm보다 큼', '센 흐름: 급류, 해빈'], ['모래', '1/16 ~ 2 mm', '하천, 해안'], ['점토·실트', '1/16 mm보다 작음', '잔잔하고 깊은 곳']]) + '<ul><li><b>층리</b>: 퇴적물의 알갱이 크기·성분·색 변화로 생긴 층의 경계.</li><li>흐름이 센 곳에는 큰 알갱이가, 흐름이 약한 곳에는 작은 알갱이가 쌓여요.</li></ul>',
      missions: [
        {
          title: '체로 가르고 센·약한 흐름 비교',
          goal: '<b>체 가르기</b>를 끝까지 해 보고, <b>흐름과 퇴적</b>에서 흐름의 세기를 <b>8 이상</b>, 그리고 <b>2 이하</b>로 각각 한 번씩 흘려보내 비교해요.',
          hint: '“살펴볼 장면”에서 장면을 바꿔요. 흐름의 세기 슬라이더를 8~10, 그다음 1~2로 해서 ▶ 흘려보내기를 눌러요.',
          hold: 0.6, setup() { svInit(); S.fl.runs = []; setView('sieve'); },
          status: () => '체 가르기 ' + mark(S.sv.everDone) + ' · 센 흐름(8 이상) ' + mark(S.fl.runs.some((v) => v >= 8)) + ' · 약한 흐름(2 이하) ' + mark(S.fl.runs.some((v) => v <= 2)),
          check: () => S.sv.everDone && S.fl.runs.some((v) => v >= 8) && S.fl.runs.some((v) => v <= 2),
          explain: '구멍 크기가 다른 체로 자갈·모래·점토를 가를 수 있어요. 센 흐름에서는 큰 알갱이(자갈)만 먼저 쌓이고 고운 알갱이는 멀리 실려 가요. 흐름이 약하면 대부분의 알갱이가 입구 가까이에 쌓여요. 그래서 <b>알갱이 크기는 그곳의 흐름 에너지를 알려 줘요</b>.',
        },
        {
          type: 'quiz', title: '알갱이 크기가 알려 주는 것', goal: '둥근 <b>자갈</b>이 많이 들어 있는 <b>역암</b>이 쌓인 곳의 물의 흐름은 어땠을까요?', setup() { setView('flow'); },
          choices: ['매우 센 흐름이 있던 에너지가 큰 곳이었어요', '아주 잔잔해서 물이 거의 움직이지 않았어요', '흐름과 관계없이 자갈이 만들어졌어요', '흐름이 없는 깊은 호수 바닥이었어요'],
          answer: 0,
          feedback: ['', '잔잔한 곳에는 점토 같은 고운 알갱이가 가라앉아요. 자갈은 센 흐름이 필요해요.', '알갱이가 어디에 쌓이는지는 흐름의 세기가 정해요.', '호수 바닥에는 주로 고운 알갱이가 쌓여요.'],
          explain: '자갈은 무거워서 센 흐름에서만 옮겨지고 쌓여요. 그래서 역암은 <b>흐름이 센(에너지가 큰) 곳</b>, 이암은 <b>잔잔한 곳</b>에서 쌓였다고 해석해요.',
        },
      ],
    },
    {
      title: '구조 만들기: 무늬는 어떻게 생길까', short: '구조 만들기', icon: '🧪', phase: '실험', features: ['graded', 'ripple', 'crack', 'cross'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 알갱이 크기가 흐름의 세기를 알려 준다는 것을 확인했어요.</div>' +
        '<p>퇴적물이 쌓일 때 층 안에는 여러 <b>퇴적 구조</b>가 남아요. 네 가지 실험으로 <b>점이층리, 연흔, 건열, 사층리</b>가 어떤 조건에서 생기는지 직접 만들어 봐요. (실험 장면은 “실험 고르기”로 바꿔요.)</p>' + SRC,
      setup() { enterLevel(1); },
      recap: '점이층리는 가라앉는 순서로, 연흔은 물의 움직임으로, 건열은 진흙이 마르며, 사층리는 모래 언덕이 이동하며 만들어져요.',
      summary: tb([['구조', '만드는 조건', '알려 주는 것'], ['점이층리', '탁한 물에서 굵은 알갱이가 먼저 가라앉음', '굵은 쪽이 아래, 탁류(대륙 사면·심해)'], ['연흔', '한 방향 흐름 → 비대칭, 왕복 파도 → 대칭', '마루가 위, 하천·해안·얕은 호수'], ['건열', '젖은 진흙이 마르며 수축', 'V가 벌어진 쪽이 위, 물 밖에 노출된 건조한 곳'], ['사층리', '모래 언덕의 이동', '곡선이 이어지는 쪽이 아래, 하천·삼각주·사막']]),
      missions: [
        {
          title: '점이층리와 연흔 두 종류 만들기',
          goal: '<b>점이층리</b>를 만들고, <b>한 방향 흐름(비대칭 연흔)</b>과 <b>왕복 파도(대칭 연흔)</b>로 연흔을 두 종류 만들어요.',
          hint: '“실험 고르기”로 점이층리 → 연흔 장면으로 가요. 연흔은 물의 움직임을 바꿔서 두 번 만들어요. 연흔이 다 자라면 완성돼요.',
          hold: 0.6, setup() { setView('graded'); },
          status: () => '점이층리 ' + mark(S.gr.ever) + ' · 비대칭 연흔 ' + mark(S.rp.done.one) + ' · 대칭 연흔 ' + mark(S.rp.done.wave),
          check: () => S.gr.ever && S.rp.done.one && S.rp.done.wave,
          explain: '굵은 알갱이가 먼저 가라앉아 <b>점이층리</b>가 생겨요. 한 방향 흐름은 가파른 면이 흐름의 아래쪽인 <b>비대칭 연흔</b>, 왔다 갔다 하는 파도는 <b>대칭 연흔</b>을 만들어요.',
        },
        {
          title: '건열과 사층리 만들기',
          goal: '진흙을 말려 <b>건열</b>을 만들고, 흐르는 물로 모래 언덕을 움직여 <b>사층리</b>를 만들어요.',
          hint: '“실험 고르기”에서 건열과 사층리를 차례로 골라 각각의 실행 버튼을 눌러요.',
          hold: 0.6, setup() { setView('crack'); },
          status: () => '건열 ' + mark(S.ck.everDone) + ' · 사층리 ' + mark(S.cs.everDone),
          check: () => S.ck.everDone && S.cs.everDone,
          explain: '젖은 진흙이 마르면 줄어들어 <b>위가 넓은 V자 틈(건열)</b>이 생겨요. 모래 언덕이 흐름 방향으로 이동하면 가파른 면에 모래가 비스듬히 쌓여 <b>사층리</b>가 돼요.',
        },
        {
          type: 'quiz', title: '연흔을 만드는 조건', goal: '연흔에 대한 설명으로 알맞은 것은?', setup() { S.rp.mode = 'one'; setView('ripple'); },
          choices: ['한 방향 흐름은 비대칭 연흔, 왕복하는 파도는 대칭 연흔을 만들어요', '연흔은 모두 한 방향 흐름이 만들어요', '연흔은 진흙이 말라 갈라지며 생겨요', '대칭 연흔은 바람이 만들고 비대칭 연흔은 파도가 만들어요'],
          answer: 0,
          feedback: ['', '왔다 갔다 하는 파도는 대칭 연흔을 만들어요. 연흔이 모두 같은 방향의 흐름이 만든 것은 아니에요.', '진흙이 말라 갈라진 것은 연흔이 아니라 건열이에요.', '물의 움직임이 연흔의 모양을 정해요. 파도는 대칭, 한 방향 흐름은 비대칭이에요.'],
          explain: '연흔의 모양은 물의 움직임이 정해요. <b>한 방향 흐름 → 비대칭 연흔</b>(가파른 면이 흐름의 아래쪽), <b>왕복 파도 → 대칭 연흔</b>이에요.',
        },
      ],
    },
    {
      title: '퇴적 환경: 단서로 옛 환경 읽기', short: '퇴적 환경', icon: '🧩', phase: '탐구', features: ['match', 'invert'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 퇴적 구조가 어떤 조건에서 만들어지는지 실험했어요.</div>' +
        '<p>이제 거꾸로 구조·알갱이·화석을 <b>단서</b>로 그곳이 옛날에 어떤 <b>퇴적 환경</b>이었는지 추리해요. 또 지층이 뒤집혀 있을 수 있으니, 구조로 지층의 <b>위아래</b>도 알아봐요.</p>' + SRC,
      setup() { enterLevel(2); },
      recap: '구조·알갱이·화석 단서로 퇴적 환경을 해석하고, 연흔·건열·점이층리의 모양으로 지층의 위아래를 판단해요.',
      summary: tb([['단서', '퇴적 환경'], ['비대칭 연흔', '하천 (한 방향 흐름)'], ['대칭 연흔', '해안·얕은 호수 (파도)'], ['건열', '물 밖에 드러난 건조한 곳'], ['점이층리', '깊은 바다 (탁류)'], ['산호 화석', '따뜻하고 얕은 바다'], ['큰 사층리, 고른 모래', '사막']]) + '<ul><li>위아래 판단: 연흔의 마루는 위, 건열은 V가 벌어진 쪽이 위, 점이층리는 굵은 쪽이 아래, 사층리는 곡선이 이어지는 쪽이 아래. 거꾸로 놓였으면 <b>역전된 지층</b>이에요.</li></ul>',
      missions: [
        {
          title: '단서와 퇴적 환경 짝짓기', manual: true,
          goal: '단서 6장에 알맞은 퇴적 환경을 골라요. 모두 고르면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '아래 “퇴적 환경” 목록을 보고, 각 단서가 만들어지는 조건을 떠올려요. 연흔은 물의 움직임, 건열은 말라 노출된 곳, 산호는 따뜻한 바다예요.',
          setup() { setView('match'); },
          status: () => '고른 단서 ' + S.mt.ans.filter((a) => a).length + ' / 6',
          check: () => feedFirst(S.mt.ans, (x, i) => x === CLUES[i].env, (w) => '단서 ' + (w + 1) + ' (' + CLUES[w].name + '): 이 구조가 만들어지는 조건을 떠올려 다시 골라 봐요.', '단서'),
          explain: '비대칭 연흔 → <b>하천</b>, 대칭 연흔 → <b>해안</b>, 건열 → <b>건조한 호수</b>, 점이층리 → <b>깊은 바다(탁류)</b>, 산호 → <b>따뜻하고 얕은 바다</b>, 큰 사층리와 고른 모래 → <b>사막</b>이에요.',
        },
        {
          title: '역전된 지층 판정', manual: true,
          goal: '세 노두가 <b>처음 모습 그대로(정상)</b>인지 <b>거꾸로 놓인(역전)</b> 것인지 판단하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '구조의 위아래 단서를 확인해요: 연흔 마루는 위, 건열은 V가 벌어진 쪽이 위, 점이층리는 굵은 쪽이 아래. “↻ 뒤집어 보기”로 확인할 수도 있어요.',
          setup() { invReset(); setView('invert'); },
          status: () => '판단한 노두 ' + S.inv.ans.filter((a) => a).length + ' / 3',
          check: () => feedFirst(S.inv.ans, (x, i) => x === (INV[i].up ? 'up' : 'down'), (w) => '노두 ' + ['A', 'B', 'C'][w] + ' (' + INV[w].name + '): ' + INV[w].text + ' 그림을 다시 살펴봐요.', '노두'),
          explain: '노두 A는 연흔의 마루가 위를 향해 <b>정상</b>, B는 굵은 알갱이가 위에 있어 <b>역전</b>, C는 V자가 아래로 벌어져 <b>역전</b>된 지층이에요. 뒤집어 보면 B와 C가 정상 모습으로 보여요.',
        },
        {
          type: 'quiz', title: '구조로 읽는 환경', goal: '<b>대칭 연흔</b>이 있는 사암과 <b>건열</b>이 있는 이암이 쌓인 환경을 알맞게 짝지은 것은?', setup() { setView('match'); },
          choices: ['대칭 연흔 사암: 한 방향으로 흐르는 하천 / 건열 이암: 깊은 바다', '대칭 연흔 사암: 파도가 치는 해안이나 얕은 호수 / 건열 이암: 물이 말라 드러나는 건조한 곳', '대칭 연흔 사암: 사막 / 건열 이암: 파도가 치는 해안', '대칭 연흔 사암: 깊은 바다 / 건열 이암: 하천 바닥'],
          answer: 1,
          feedback: ['한 방향 흐름은 비대칭 연흔을 만들고, 건열은 물 밖에서 마른 흔적이라 깊은 바다와 맞지 않아요.', '', '건열이 파도치는 해안에서 생기려면 물에 잠겨 있으면 안 돼요. 건열은 말라서 생겨요.', '깊은 바다는 잔잔해서 연흔이 잘 생기지 않고, 하천 바닥은 항상 젖어 있어서 건열이 생기기 어려워요.'],
          explain: '<b>대칭 연흔</b>은 파도가 왕복하는 해안·얕은 호수, <b>건열</b>은 물 밖에 노출되어 진흙이 마른 건조한 곳을 가리켜요.',
        },
      ],
    },
    {
      title: '환경 변화: 해침과 해퇴', short: '환경 변화', icon: '🌊', phase: '적용', features: ['column', 'trend'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 구조와 화석으로 한 지점의 퇴적 환경을 읽었어요.</div>' +
        '<p>이제 한 노두의 <b>아래에서 위로</b> 환경이 어떻게 바뀌었는지 읽어요. 위로 갈수록 알갱이가 <b>작아지면</b> 바다가 육지 쪽으로 밀려온 <b>해침</b>(수심이 깊어짐), 알갱이가 <b>커지면</b> 바다가 물러난 <b>해퇴</b>(수심이 얕아짐)예요.</p>' + SRC,
      setup() { enterLevel(3); },
      recap: '위로 갈수록 알갱이가 작아지면 해침, 커지면 해퇴예요. 석회암은 따뜻하고 얕은 맑은 바다에서 쌓여요.',
      summary: '<ul><li>예시 노두(아래 → 위): 역암 2 m → 사암(사층리) 5 m → 사암(대칭 연흔) 3 m → 이암(앵무조개) 8 m → 석회암(산호) 10 m = 육지에서 점점 멀어지는 <b>해침</b></li><li>위로 갈수록 알갱이가 작아짐 → <b>해침</b>(수심이 깊어짐), 커짐 → <b>해퇴</b>(수심이 얕아짐)</li><li>석회암은 탄산 칼슘을 만드는 생물이 사는 따뜻하고 얕은 바다에서 쌓여요.</li></ul>',
      missions: [
        {
          title: '구간별 퇴적 환경 해석', manual: true,
          goal: '주상도의 다섯 구간이 쌓인 환경을 각각 고르고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '구간마다 알갱이(역암·사암·이암)와 구조·화석을 보세요. 위로 갈수록 육지에서 점점 멀어져요.',
          setup() { setView('column'); },
          status: () => '고른 구간 ' + S.col.ans.filter((a) => a).length + ' / 5',
          check: () => feedFirst(S.col.ans, (x, i) => x === SEGS[i].env, (w) => '구간 ' + (w + 1) + ' (' + SEGS[w].name + ', ' + SEGS[w].clue + '): ' + SEG_WHY[w] + ' 다시 골라 봐요.', '구간'),
          explain: '역암·사층리 사암은 <b>하천·삼각주 평원</b>, 대칭 연흔 사암은 <b>해안</b>, 앵무조개가 든 이암은 <b>해안에서 멀어진 잔잔한 바다</b>, 산호 석회암은 <b>따뜻하고 얕은 바다</b>예요. 위로 갈수록 육지에서 멀어지는 <b>해침</b>이에요.',
        },
        {
          title: '해침과 해퇴 판정', manual: true,
          goal: '노두 X(위로 갈수록 알갱이가 작아짐)와 노두 Y(위로 갈수록 알갱이가 커짐)가 <b>해침</b>인지 <b>해퇴</b>인지 골라요.',
          hint: '알갱이가 작아지면 흐름이 약하고 육지에서 먼 곳이에요. 바다가 육지 쪽으로 오는 것이 해침이에요.',
          setup() { S.tr.ans = [null, null]; setView('trend'); },
          status: () => '판정한 노두 ' + S.tr.ans.filter((a) => a).length + ' / 2',
          check: () => feedFirst(S.tr.ans, (x, i) => x === TRD[i].ans, (w) => '노두 ' + ['X', 'Y'][w] + ': ' + (w ? '알갱이가 위로 갈수록 커지면 바다가 육지에서 물러나는 쪽이에요.' : '알갱이가 위로 갈수록 작아지면 바다가 육지 쪽으로 밀려오는 쪽이에요.') + ' 다시 생각해 봐요.', '노두'),
          explain: '위로 갈수록 알갱이가 <b>작아지면 해침</b>(바다가 육지 쪽으로 밀려와 수심이 깊어짐), <b>커지면 해퇴</b>(바다가 물러나 수심이 얕아짐)예요. 해수면이 오르내리면 같은 곳에 쌓이는 퇴적물도 바뀌어요.',
        },
        {
          type: 'quiz', title: '석회암이 쌓인 환경', goal: '산호 화석이 든 <b>석회암</b>이 쌓인 환경의 수온과 수심은?', setup() { setView('column'); },
          choices: ['따뜻하고 얕은 바다', '차갑고 깊은 바다', '따뜻하고 아주 깊은 바다', '차갑고 얕은 호수'],
          answer: 0,
          feedback: ['', '산호는 차갑고 깊은 곳에서는 거의 살지 못해요.', '산호는 햇빛이 닿는 얕은 곳에 살아서 아주 깊은 바다에는 없어요.', '산호는 바다에 살아요. 호수에서는 산호 석회암이 생기지 않아요.'],
          explain: '석회암(산호)은 <b>따뜻하고 얕은 맑은 바다</b>에서 쌓여요. 해수면이 오르면(해침) 육지에서 오는 알갱이가 줄어 위로 갈수록 알갱이가 작아지다가 맑은 바다의 석회암이 쌓일 수 있어요.',
        },
      ],
    },
  ];

  svInit(); flInit(); grInit(); rpReset(); ckReset(); csReset();
  game = SciSim.game({
    simId: 'he-sedimentary-env', mount: '#game', badge: '퇴적 환경 탐정', homeHref: '../../index.html#he',
    featureLabels: { sieve: '🧂 체로 알갱이 가르기', flow: '🌊 흐름의 세기와 퇴적', graded: '🥤 점이층리 실험', ripple: '〰️ 연흔 실험', crack: '🧱 건열 실험', cross: '📚 사층리 실험', match: '🧩 단서 짝짓기', invert: '🔄 위아래 판단', column: '📊 노두 주상도', trend: '🌊 해침·해퇴' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    svUpdate(dt); flUpdate(dt); grUpdate(dt); rpUpdate(dt); ckUpdate(dt); csUpdate(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = '#f3efe6'; ctx.fillRect(0, 0, VW, VH);
    const v = S.view;
    if (v === 'sieve') drawSieve(t); else if (v === 'flow') drawFlow(t); else if (v === 'graded') drawGraded(t); else if (v === 'ripple') drawRipple(t);
    else if (v === 'crack') drawCrack(t); else if (v === 'cross') drawCross(t, dt); else if (v === 'match') drawMatch(t); else if (v === 'invert') drawInvert(t);
    else if (v === 'column') drawColumn(t); else drawTrend(t);
    parts.draw(ctx);
    drawFlash(dt, PHONE ? 10 : VH - 52);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, SEGS, CLUES, INV, TRD, ENV, setView, updateCtl, enterLevel, svRun, flRun, rpRun, csRun, ckStart, grInit, csReset, rpReset, ckReset, invFlip, colOk, matchOk, invOk, CSG,
    get game() { return game; },
  };

})();

