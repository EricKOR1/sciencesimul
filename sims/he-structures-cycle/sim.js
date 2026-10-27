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
     지구과학 Ⅱ. 지구의 역사와 한반도의 암석 - 지질 구조와 암석 순환
     [12지구02-04] 지각 변동에 따른 구조를 변동대와 관련지어 설명하고, 지구시스템에서 암석이 순환함을 추론
     ① 화성암 구조(관입·절리)  ② 습곡·단층  ③ 변동대 구조  ④ 암석 순환
     ========================================================= */
  initStage('#eef2f7', 800, 560, 600, 840, 1.25);
  Object.keys(LITH_BASE).forEach((k) => lithFill(k)); // 암석 무늬를 미리 만들어 두어요
  const rad = (d) => (d * Math.PI) / 180;
  const f0 = (x) => String(Math.round(x));
  const SQ3 = Math.sqrt(3);
  const gauss = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

  const S = {
    view: 'ign', clock: 0, fade: 0,
    ign: { pA: 0, cA: 0, pB: 0, cB: 0, runA: false, runB: false, doneA: false, doneB: false },
    col: { speed: 2, c: 0, run: false, done: [false, false, false], wasRun: false },
    sheet: { e: 0, eS: 0, maxE: 0 },
    obs: { A: '', B: '', col: '', sheet: '' },
    fold: { mode: 'comp', beh: 'duct', f: 0, fS: 0, fl: { fold: false, rev: false, norm: false, strike: false }, sel: ['', '', '', ''] },
    speed: { t: 100, rec: null, tS: 100 },
    cyc: { node: 'magma', walk: ['magma'], found: { loop: false, ig2me: false, me2se: false, sr2se: false, melt: false }, trail: null, tok: { x: 0, y: 0 }, mv: null, last: null, shake: 0 },
    subd: { p: 0, run: false, seen: false },
    age: { d: 3000, dS: 3000, seen: false },
    cond: [false, false, false, false],
  };
  let game = null;
  const VIEW_LABEL = { ign: '🌋 마그마 관입 단면', col: '🔷 주상절리 만들기', sheet: '📄 판상절리 만들기', fold: '🧱 지층 블록 실험', bound: '🌍 변동대와 구조 짝짓기', speed: '⏱ 단층 이동 거리', cycle: '🔄 암석 순환도', subd: '🌊 섭입대의 순환 경로', age: '📊 해양 지각의 나이' };
  /* 줄바꿈 글 (왼쪽 정렬) : 마지막 줄의 y를 돌려줘요 */
  function para(x, y, w, text, size, color, weight) { const ls = wrapLines(text, w, size, weight || 700), lh = size * FS * 1.3; ls.forEach((l, i) => tx(x, y + i * lh, l, size, color || '#475569', 'left', weight || 700)); return y + ls.length * lh; }
  const clsLayer = ['sand', 'shale', 'lime', 'shale', 'sand'];

  /* ---------- 장면 ① : 관입 ---------- */
  const IG = PHONE ? { x: 10, y: 46, w: 580, h: 440 } : { x: 20, y: 46, w: 760, h: 408 };
  IG.ys = IG.y + 56; IG.yb = IG.y + IG.h - 8; IG.hL = (IG.yb - IG.ys) / 5; IG.dw = PHONE ? 36 : 38;
  /* 암맥 중심선: t=0 바닥, t=1 꼭대기 */
  function dikeXY(t) {
    const px = [0.74, 0.76, 0.735, 0.765, 0.745];
    const n = px.length - 1, k = Math.min(n - 1, Math.floor(t * n)), q = t * n - k;
    return [IG.x + (px[k] + (px[k + 1] - px[k]) * q) * IG.w, IG.yb + (IG.ys + 5 - IG.yb) * t];
  }
  const XEN = (() => { const R = mulberry(31); const mk = (n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU + R() * 0.5, r = 0.65 + R() * 0.5; return [Math.cos(a) * r, Math.sin(a) * r * 0.8]; }); return { d: [mk(6), mk(7), mk(6)], s: mk(7) }; })();
  function xenolith(x, y, r, kind, shape, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.beginPath(); shape.forEach((p, i) => (i ? ctx.lineTo(p[0] * r, p[1] * r) : ctx.moveTo(p[0] * r, p[1] * r))); ctx.closePath();
    ctx.fillStyle = lithFill(kind); ctx.fill(); ctx.strokeStyle = 'rgba(30,20,20,.85)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  function igRun(w) {
    const I = S.ign, p = 'p' + w, c = 'c' + w, run = 'run' + w, done = 'done' + w;
    if (I[run]) return; Sound.click(); I[run] = true; I[done] = false; I[p] = 0; I[c] = 0;
    SciSim.tween(I, { [p]: 1 }, { duration: RM ? 0.01 : 2.4, ease: 'outCubic' });
    SciSim.tween(I, { [c]: 1 }, { duration: RM ? 0.01 : 3.2, delay: RM ? 0 : 1.1, ease: 'inOutQuad', onDone: () => { I[done] = true; I[run] = false; Sound.success(); updateCtl(); } });
    updateCtl();
  }
  function igReset() {
    const I = S.ign; SciSim.tween(I, { pA: 0, cA: 0, pB: 0, cB: 0 }, { duration: 0.001 });
    Object.assign(I, { pA: 0, cA: 0, pB: 0, cB: 0, runA: false, runB: false, doneA: false, doneB: false });
  }
  function drawIgn(t, dt) {
    const P = IG, I = S.ign;
    panel(P.x, P.y, P.w, P.h, { fill: '#dfe9f2' });
    D.sky(P.x, P.y, P.w, P.ys - P.y, '#cfe9ff', '#eaf6ff');
    tx(P.x + 12, P.y + 22, '단면도 (모식도)', 14, '#334155', 'left', 800);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    clsLayer.forEach((k, r) => { ctx.fillStyle = lithFill(k); ctx.fillRect(P.x, P.ys + r * P.hL, P.w, P.hL + 0.5); });
    ctx.strokeStyle = 'rgba(40,40,60,.35)'; ctx.lineWidth = 1.2; for (let r = 1; r < 5; r++) { ctx.beginPath(); ctx.moveTo(P.x, P.ys + r * P.hL); ctx.lineTo(P.x + P.w, P.ys + r * P.hL); ctx.stroke(); }
    ctx.fillStyle = '#5b8f4a'; ctx.fillRect(P.x, P.ys - 6, P.w, 6);
    const magma = (y0, y1) => { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#fde047'); g.addColorStop(0.5, '#f97316'); g.addColorStop(1, '#b91c1c'); return g; };
    // A : 층 사이를 따라 퍼지는 관입 (암상)
    const ya = P.ys + 2 * P.hL, ts = P.hL * 0.56, xa = P.x + 0.56 * P.w * I.pA;
    if (I.pA > 0.01) {
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(70,35,25,' + (0.38 * I.cA) + ')'; ctx.lineWidth = ts + 12; ctx.beginPath(); ctx.moveTo(P.x - ts, ya); ctx.lineTo(xa - ts / 2, ya); ctx.stroke();
      ctx.strokeStyle = magma(ya - ts / 2, ya + ts / 2); ctx.lineWidth = ts; ctx.beginPath(); ctx.moveTo(P.x - ts, ya); ctx.lineTo(xa - ts / 2, ya); ctx.stroke();
      if (I.cA > 0.01) { ctx.globalAlpha = I.cA; ctx.strokeStyle = lithFill('igneous'); ctx.beginPath(); ctx.moveTo(P.x - ts, ya); ctx.lineTo(xa - ts / 2, ya); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.lineCap = 'butt';
      if (xa < P.x + 0.56 * P.w - 4 && I.runA) D.glow(xa, ya, 44, '#ffd36b', 0.6);
      if (I.pA > 0.55) xenolith(P.x + 0.34 * P.w, ya, 12, 'lime', XEN.s, clamp((I.pA - 0.55) / 0.2, 0, 1));
    }
    // B : 층을 가로질러 올라오는 관입 (암맥)
    if (I.pB > 0.01) {
      const pts = []; for (let i = 0; i <= 24; i++) { const tt = (i / 24) * I.pB; pts.push(dikeXY(tt)); }
      const path = () => { ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); };
      ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(70,35,25,' + (0.38 * I.cB) + ')'; ctx.lineWidth = P.dw + 12; path(); ctx.stroke();
      ctx.strokeStyle = magma(P.ys, P.yb); ctx.lineWidth = P.dw; path(); ctx.stroke();
      if (I.cB > 0.01) { ctx.globalAlpha = I.cB; ctx.strokeStyle = lithFill('igneous'); path(); ctx.stroke(); ctx.globalAlpha = 1; }
      const top = pts[pts.length - 1]; if (I.runB && I.pB < 0.99) D.glow(top[0], top[1], 46, '#ffd36b', 0.6);
      [[3, 'shale', 0], [2, 'lime', 1], [1, 'shale', 2]].forEach(([r, k, si]) => {
        const yy = P.ys + (r + 0.5) * P.hL, tt = (P.yb - yy) / (P.yb - P.ys - 5);
        const cx = dikeXY(clamp(tt, 0, 1)); xenolith(cx[0] + (si - 1) * 5, yy, 12, k, XEN.d[si], clamp((I.pB - tt) / 0.12, 0, 1));
      });
    }
    ctx.restore();
    // 이름표 : 모양만 보고 어떤 관입암체인지 정해요
    if (I.pA > 0.4) { D.label(P.x + 0.14 * P.w, ya, 'A', { bg: '#7c3aed', size: 17, pad: 11 }); }
    if (I.pB > 0.5) { const m = dikeXY(0.5); D.label(m[0] + P.dw / 2 + 22, m[1], 'B', { bg: '#0369a1', size: 17, pad: 11 }); }
    // 암석 이름
    ['사암', '셰일', '석회암', '셰일', '사암'].forEach((n, r) => tx(P.x + P.w - 10, P.ys + r * P.hL + P.hL / 2 + 5, n, 13, 'rgba(30,30,40,.7)', 'right', 800));
    const ready = I.pA < 0.02 && I.pB < 0.02;
    if (ready) note(P.x + P.w / 2 - 160, P.y + P.h / 2 - 22, 320, 'A와 B 두 곳에 마그마를 관입시켜 보세요', 15);
    if (I.pA > 0.7 || I.pB > 0.9) { // 포획암 설명
      if (I.pB > 0.9) { const m = dikeXY(0.38); D.label(m[0] - P.dw / 2 - 20, m[1] - 24, '포획암 (모암 조각)', { bg: '#475569', size: 13, pad: 8, align: 'right' }); }
      else if (I.pA > 0.7) D.label(P.x + 0.34 * P.w, ya - ts / 2 - 14, '포획암', { bg: '#475569', size: 13, pad: 8 });
    }
    const msgA = I.doneA ? 'A: 굳었어요' : I.runA ? 'A: 관입하는 중…' : 'A: 아직', msgB = I.doneB ? 'B: 굳었어요' : I.runB ? 'B: 관입하는 중…' : 'B: 아직';
    const by = P.y + P.h + 14;
    const ey = para(P.x + 8, by + 8, P.w - 16, '관입한 마그마는 식으면서 화성암이 돼요. 주변 암석은 열을 받아 구운 듯 변해요(접촉부).', PHONE ? 13 : 14, '#475569');
    tx(P.x + 8, ey + 8, msgA + '   ·   ' + msgB, 15, '#334155', 'left', 800);
  }

  /* ---------- 장면 ① : 주상절리 ---------- */
  const CG = PHONE
    ? { L: { x: 10, y: 46, w: 580, h: 300 }, R: { x: 10, y: 358, w: 580, h: 300 } }
    : { L: { x: 20, y: 46, w: 440, h: 408 }, R: { x: 476, y: 46, w: 304, h: 408 } };
  const COL_THICK = ['굵음', '보통', '가늘음'], COL_R = [42, 28, 17], COL_NAME = ['느리게(두꺼운 용암)', '보통', '빠르게(물에 닿는 얇은 용암)'], COL_DUR = [8, 5.5, 3.5];
  const HEX = COL_R.map((R, si) => {
    const Rt = CG.R, rect = { x: Rt.x + 12, y: Rt.y + 40, w: Rt.w - 24, h: Rt.h - 52 }, rnd2 = mulberry(100 + si), arr = [];
    for (let r = 0; r * 1.5 * R < rect.h + R; r++) for (let q = -1; q * SQ3 * R < rect.w + SQ3 * R; q++) {
      const cx = rect.x + (q + (r % 2) * 0.5) * SQ3 * R + SQ3 * R / 2, cy = rect.y + r * 1.5 * R + R;
      if (cx < rect.x - 1 || cx > rect.x + rect.w + 1 || cy < rect.y - 1 || cy > rect.y + rect.h + 1) { if (Math.abs(cx - (rect.x + rect.w / 2)) > rect.w / 2 + SQ3 * R / 2 || Math.abs(cy - (rect.y + rect.h / 2)) > rect.h / 2 + R) continue; }
      const verts = Array.from({ length: 6 }, (_, k) => { const a = rad(30 + 60 * k); return [cx + Math.cos(a) * R * 0.97, cy + Math.sin(a) * R * 0.97]; });
      arr.push({ cx, cy, verts, del: Array.from({ length: 6 }, () => rnd2() * 0.45), shade: rnd2() });
    }
    return { R, rect, arr };
  });
  function colRun() {
    const C = S.col; if (C.run) return; Sound.click(); C.run = true; C.c = 0; C.wasRun = true;
    SciSim.tween(C, { c: 1 }, { duration: RM ? 0.01 : COL_DUR[C.speed - 1], ease: 'linear', onDone: () => { C.run = false; C.done[C.speed - 1] = true; Sound.success(); updateCtl(); } });
    updateCtl();
  }
  function colReset() { const C = S.col; SciSim.tween(C, { c: 0 }, { duration: 0.001 }); Object.assign(C, { c: 0, run: false }); }
  function drawCol(t, dt) {
    const C = S.col, L = CG.L, R = CG.R, Rd = COL_R[C.speed - 1], w = SQ3 * Rd, c = C.c;
    // 옆에서 본 모습
    panel(L.x, L.y, L.w, L.h, { fill: '#dfe9f2' });
    tx(L.x + 12, L.y + 22, '옆에서 본 단면 (모식도)', 14, '#334155', 'left', 800);
    ctx.save(); rr(L.x, L.y, L.w, L.h, 14).clip();
    D.sky(L.x, L.y, L.w, L.h * 0.3, '#cfe9ff', '#eaf6ff');
    const T = L.h * 0.5, y0 = L.y + L.h * 0.28, y1 = y0 + T, gy = y1;
    ctx.fillStyle = lithFill('sand'); ctx.fillRect(L.x, gy, L.w, L.y + L.h - gy);
    ctx.fillStyle = lithFill('shale'); ctx.fillRect(L.x, gy + (L.y + L.h - gy) * 0.55, L.w, (L.y + L.h - gy) * 0.5);
    const hot = ctx.createLinearGradient(0, y0, 0, y1); hot.addColorStop(0, '#fde047'); hot.addColorStop(0.5, '#f97316'); hot.addColorStop(1, '#b91c1c');
    ctx.fillStyle = hot; ctx.fillRect(L.x, y0, L.w, T);
    const f = c * T / 2;
    ctx.fillStyle = lithFill('basalt'); ctx.fillRect(L.x, y0, L.w, f + 1); ctx.fillRect(L.x, y1 - f - 1, L.w, f + 1);
    if (c < 0.98) { const gs = ctx.createLinearGradient(0, y0 + f - 8, 0, y0 + f + 14); gs.addColorStop(0, 'rgba(255,120,30,0)'); gs.addColorStop(1, 'rgba(255,120,30,.0)'); }
    // 갈라진 틈 (위·아래에서 안쪽으로 자라요)
    ctx.strokeStyle = 'rgba(15,15,20,.85)'; ctx.lineWidth = 1.6 + 1.4 * c; ctx.lineCap = 'round';
    const nx = Math.ceil(L.w / w) + 1;
    for (let i = 0; i < nx; i++) {
      const xx = L.x + i * w + w * 0.2 + ((i * 37) % 7) * 0.3 - 2;
      ctx.beginPath(); ctx.moveTo(xx, y0); ctx.lineTo(xx + ((i % 3) - 1) * 1.5, y0 + f); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xx + w / 2, y1); ctx.lineTo(xx + w / 2 + ((i % 3) - 1) * 1.5, y1 - f); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,40,50,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.x + 6, y0); ctx.lineTo(L.x + L.w - 6, y0); ctx.stroke();
    D.label(L.x + L.w - 12, y0 + T / 2, c < 0.05 ? '뜨거운 용암' : c < 0.98 ? '겉부터 식으며 굳어요' : '다 식었어요', { bg: 'rgba(15,23,42,.72)', size: 13.5, pad: 9, align: 'right' });
    D.arrow(L.x + L.w / 2, y0 - 34, L.x + L.w / 2, y0 - 6, { color: '#38bdf8', width: 3, head: 10, alpha: 0.9 }); tx(L.x + L.w / 2 + 12, y0 - 26, '열이 빠져나가요', 13, '#0369a1', 'left', 800);
    D.label(L.x + 12, gy - 14, '기둥 굵기: ' + COL_THICK[C.speed - 1], { bg: 'rgba(15,23,42,.7)', size: 12.5, pad: 8, align: 'left' });
    // 위에서 본 모습
    panel(R.x, R.y, R.w, R.h, { fill: '#e7edf3' });
    tx(R.x + 12, R.y + 22, '위에서 본 모습 (모식도)', 14, '#334155', 'left', 800);
    const H = HEX[C.speed - 1]; ctx.save(); rr(R.x + 6, R.y + 32, R.w - 12, R.h - 40, 10).clip();
    const gray = (s) => mixc('#3f3f47', '#6e6e77', s);
    H.arr.forEach((h) => { ctx.beginPath(); h.verts.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fillStyle = mixc('#f97316', gray(h.shade), smooth(c * 1.4 - 0.1)); ctx.fill(); });
    ctx.strokeStyle = 'rgba(10,10,15,.9)'; ctx.lineWidth = 1.5 + 0.8 * c; ctx.lineCap = 'round';
    if (c > 0.02) H.arr.forEach((h) => { for (let k = 0; k < 6; k++) { const a = h.verts[k], b = h.verts[(k + 1) % 6], fr = clamp((c - h.del[k] * 0.9) / 0.55, 0, 1); if (fr <= 0) continue; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr); ctx.stroke(); } });
    if (c > 0.05 && c < 0.7) H.arr.forEach((h, i) => { if (i % (Rd > 30 ? 2 : 11) === 0) { const m = Rd * 0.45 * (1 - c), s = 4 + Rd * 0.12; [0, 120, 240].forEach((d) => { const a = rad(d + 90); D.arrow(h.cx + Math.cos(a) * m, h.cy + Math.sin(a) * m, h.cx + Math.cos(a) * m * 0.4, h.cy + Math.sin(a) * m * 0.4, { color: '#fde047', width: 2, head: s, alpha: 0.9 * (1 - c) }); }); } });
    ctx.restore();
    D.label(R.x + R.w - 10, R.y + R.h - 16, '육각 기둥 ' + H.arr.length + '개 (이 칸 안)', { bg: 'rgba(15,23,42,.7)', size: 12.5, pad: 8, align: 'right' });
    const by = (PHONE ? R.y + R.h : L.y + L.h) + 12;
    tx(20, by + 8, '굵기: ' + COL_NAME[C.speed - 1] + (c >= 0.98 ? ' → 육각 기둥(주상절리) 완성' : ''), 14.5, '#334155', 'left', 800);
    para(20, by + 30, PHONE ? 560 : 760, '용암이 식으며 부피가 줄어(수축) 수축 중심에서 갈라져요. 빨리 식을수록 기둥이 가늘어요.', PHONE ? 12.5 : 13.5, '#475569');
  }

  /* ---------- 장면 ① : 판상절리 ---------- */
  const SG = PHONE ? { x: 10, y: 46, w: 580, h: 440 } : { x: 20, y: 46, w: 760, h: 408 };
  SG.domeH = SG.h * 0.4; SG.yb = SG.y + SG.h - 8; SG.yDome = SG.yb - SG.domeH; SG.k = (SG.yDome - (SG.y + 56)) / 5; SG.cx = SG.x + SG.w / 2; SG.rx = SG.w * 0.36;
  function drawSheet(t, dt) {
    const P = SG, Sh = S.sheet; Sh.eS = approach(Sh.eS, Sh.e, dt, 5);
    const e = Sh.eS, Y0 = P.yDome - 5 * P.k, ysurf = Y0 + e * P.k, hcov = Math.max(0, 5 - e);
    panel(P.x, P.y, P.w, P.h, { fill: '#dfe9f2' });
    D.sky(P.x, P.y, P.w, P.h, '#cfe9ff', '#eaf6ff');
    tx(P.x + 12, P.y + 22, '단면도 (모식도)', 14, '#334155', 'left', 800);
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    // 땅속 : 덮고 있는 지층
    const rows = ['sand', 'shale', 'lime', 'shale', 'sand', 'shale', 'lime'];
    ctx.save(); ctx.beginPath(); ctx.rect(P.x, ysurf, P.w, P.yb + 10 - ysurf); ctx.clip();
    rows.forEach((k, i) => { ctx.fillStyle = lithFill(k); ctx.fillRect(P.x, Y0 + i * P.k * 1, P.w, P.k + 0.5); });
    ctx.fillStyle = lithFill('shale'); ctx.fillRect(P.x, Y0 + 7 * P.k, P.w, P.h);
    ctx.strokeStyle = 'rgba(40,40,60,.3)'; ctx.lineWidth = 1.2; for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(P.x, Y0 + i * P.k); ctx.lineTo(P.x + P.w, Y0 + i * P.k); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#5b8f4a'; if (e < 5) ctx.fillRect(P.x, ysurf - 5, P.w, 5);
    // 화강암체 (돔)
    const exp = clamp((e - 4.4) / 1.6, 0, 1), open = smooth((e - 3.6) / 2.4);
    const dome = (inset) => { ctx.beginPath(); ctx.moveTo(P.cx - P.rx + inset, P.yb + 10); ctx.bezierCurveTo(P.cx - P.rx + inset, P.yDome + P.domeH * 0.35, P.cx - P.rx * 0.55, P.yDome + inset, P.cx, P.yDome + inset); ctx.bezierCurveTo(P.cx + P.rx * 0.55, P.yDome + inset, P.cx + P.rx - inset, P.yDome + P.domeH * 0.35, P.cx + P.rx - inset, P.yb + 10); ctx.closePath(); };
    ctx.save(); dome(0); ctx.fillStyle = lithFill('granite'); ctx.fill(); ctx.strokeStyle = 'rgba(80,35,35,.8)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.clip();
    for (let i = 1; i <= 5; i++) { // 판상절리 : 땅 표면과 나란한 틈
      const ins = i * 15, a = clamp(open * 1.3 - (i - 1) * 0.13, 0, 1); if (a <= 0.02) continue;
      ctx.strokeStyle = 'rgba(30,10,10,' + (0.35 + 0.55 * a) + ')'; ctx.lineWidth = 1.5 + 2.2 * a;
      dome(ins); ctx.stroke();
      if (a > 0.3) { ctx.fillStyle = 'rgba(255,255,255,' + 0.25 * a + ')'; ctx.save(); ctx.translate(0, -3 * a * i); dome(ins); ctx.restore(); }
    }
    ctx.restore();
    tx(P.cx, P.yb - 18, '화강암체 (땅속 깊은 곳에서 식은 심성암)', 14, '#4a1f1f', 'center', 800);
    // 팽창 화살표
    if (open > 0.12) { for (let k = -2; k <= 2; k++) { const ax = P.cx + k * P.rx * 0.36, ay = P.yDome + 12 + Math.abs(k) * 20; D.arrow(ax, ay, ax + k * 8, ay - 22 - 14 * open, { color: '#16a34a', width: 3, head: 10, alpha: 0.9 * open }); } tx(P.cx, P.yDome - 28 - 14 * open, '위로 팽창해요', 14, '#15803d', 'center', 800); }
    ctx.restore();
    // 눈금 : 원래 지표, 지금 지표
    const sx = P.x + 22;
    ctx.setLineDash([6, 5]); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(P.x + 4, Y0); ctx.lineTo(P.x + P.w - 4, Y0); ctx.stroke(); ctx.setLineDash([]);
    tx(P.x + P.w - 10, Y0 - 6, '원래 지표', 13, '#475569', 'right', 800);
    if (e > 0.05) D.arrow(sx, Y0 + 2, sx, ysurf - 3, { color: '#b45309', width: 3, head: 10, alpha: 0.95 });
    if (e > 0.25) D.label(sx + 12, (Y0 + ysurf) / 2, '깎여 나간 두께 ' + e.toFixed(1) + ' km', { bg: '#b45309', size: 13, pad: 8, align: 'left' });
    // 압력 표시
    D.label(P.x + P.w - 12, P.y + 24, '돔 꼭대기를 누르는 압력  ' + f0(27 * hcov) + ' MPa', { bg: hcov > 0.5 ? '#0369a1' : '#16a34a', size: 14, pad: 10, align: 'right' });
    if (e < 0.1) note(P.x + P.w / 2 - 170, P.y + 78, 340, '슬라이더로 위 지층을 깎아 봐요 (침식)', 15);
    const by = P.y + P.h + 14;
    const ey = para(P.x + 8, by + 8, P.w - 16, '덮고 있던 암석 두께 ' + hcov.toFixed(1) + ' km → 압력 P = ρgh = 2700 × 10 × ' + f0(hcov * 1000) + ' m', PHONE ? 12.5 : 14, '#334155', 800);
    para(P.x + 8, ey + 4, P.w - 16, hcov <= 0 ? '압력이 거의 없어져 암석이 팽창하며 표면과 나란한 판 모양으로 갈라졌어요.' : '압력이 줄면 암석이 위로 팽창하려고 해요.', PHONE ? 12.5 : 13.5, '#475569');
  }

  /* ---------- 장면 ② : 지층 블록 (습곡·단층) ---------- */
  const FG = PHONE ? { x: 10, y: 46, w: 580, h: 470, xc: 300, W0: 400, ytop: 196, hb: 176 } : { x: 20, y: 46, w: 760, h: 440, xc: 400, W0: 540, ytop: 176, hb: 216 };
  FG.hs = FG.hb * 0.07; FG.yb = FG.ytop + FG.hb; FG.s = PHONE ? 60 : 82; FG.alpha = rad(40);
  const FCOL = ['#8e9aa8', '#ecd08a', '#e9e5d3', '#c58a6c', '#b59f94', '#b9b1a5'];
  const FKIND = ['shale', 'sand', 'lime', 'clay', 'mud', 'gravel'];
  const FNAME = ['가', '나', '다', '라', '마', '바']; // 가(가장 오래됨) ... 바(가장 젊음)
  const MODE_NAME = { comp: '압축력(양쪽에서 밀기)', tens: '인장력(양쪽에서 당기기)', shear: '전단력(엇갈리게 밀기)' };
  function foldName() {
    const F = S.fold;
    if (F.fS < 0.1) return '아직 없음';
    if (F.mode === 'shear') return '주향 이동 단층';
    if (F.mode === 'comp') return F.beh === 'duct' ? '습곡' : '역단층';
    return F.beh === 'duct' ? '늘어나 얇아짐' : '정단층';
  }
  function foldFlags() {
    const F = S.fold, n = foldName();
    if (F.fS >= 0.69) { if (n === '습곡') F.fl.fold = true; else if (n === '역단층') F.fl.rev = true; else if (n === '정단층') F.fl.norm = true; else if (n === '주향 이동 단층') F.fl.strike = true; }
  }
  function foldReset() { const F = S.fold; SciSim.tween(F, { fS: 0 }, { duration: 0.001 }); Object.assign(F, { mode: 'comp', beh: 'duct', f: 0, fS: 0, fl: { fold: false, rev: false, norm: false, strike: false }, sel: ['', '', '', ''] }); }
  /* 지층 칸 그리기 : (x 범위) 안에서 위 지층이 아래 지층을 덮어요 */
  function foldLayers(xl, xr, topFn, ytop, yb, hs, ghost) {
    ctx.fillStyle = lithFill(FKIND[0]); ctx.fillRect(xl, ytop - 80, xr - xl, yb - ytop + 90);
    for (let j = 1; j <= 5; j++) {
      ctx.beginPath(); ctx.moveTo(xl, ytop - 90); ctx.lineTo(xr, ytop - 90);
      for (let x = xr; x >= xl - 0.01; x -= 5) ctx.lineTo(x, topFn(x, j) + hs);
      ctx.lineTo(xl, topFn(xl, j) + hs); ctx.closePath(); ctx.fillStyle = lithFill(FKIND[j]); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(30,30,45,.4)'; ctx.lineWidth = 1.2;
    for (let j = 1; j <= 5; j++) { ctx.beginPath(); for (let x = xl; x <= xr + 0.1; x += 5) { const y = topFn(x, j) + hs; x === xl ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  }
  function wallBlock(x, side, y0, y1) { // 벽(밀거나 당기는 판)
    const w = 44, xx = side < 0 ? x - w : x;
    D.shadow(() => { ctx.fillStyle = '#475569'; rr(xx, y0, w, y1 - y0, 8).fill(); }, { blur: 6, y: 2 });
    ctx.save(); rr(xx, y0, w, y1 - y0, 8).clip(); ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3; for (let y = y0 - 40; y < y1; y += 14) { ctx.beginPath(); ctx.moveTo(xx, y + 40); ctx.lineTo(xx + w, y); ctx.stroke(); } ctx.restore();
  }
  const pushArrow = (xEdge, side, dirIn, y, minX, maxX) => { // 벽 위에 힘 화살표
    const x0 = xEdge + side * 4, x1 = xEdge + side * 52; let a = dirIn ? x1 : x0, bb = dirIn ? x0 : x1;
    a = clamp(a, minX, maxX); bb = clamp(bb, minX, maxX); D.arrow(a, y, bb, y, { color: '#ef4444', width: 7, head: 18 });
  };
  function drawFold(t, dt) {
    const B = FG, F = S.fold, f = F.fS = approach(F.fS, F.f, dt, 4), xc = B.xc, W0 = B.W0, ytop = B.ytop, yb = B.yb, hs = B.hs;
    foldFlags();
    panel(B.x, B.y, B.w, B.h, { fill: '#e8eef5' });
    tx(B.x + 12, B.y + 22, F.mode === 'shear' ? '위에서 본 지도 (모식도)' : '옆에서 본 지층 블록 (모식도)', 14, '#334155', 'left', 800);
    ctx.save(); rr(B.x, B.y, B.w, B.h, 14).clip();
    const xl0 = xc - W0 / 2, xr0 = xc + W0 / 2;
    const sTop = ytop - 38; // 지표 띠
    const fold = F.mode === 'comp' && F.beh === 'duct';
    let wl = xl0, wr = xr0, info = null;
    if (F.mode === 'shear') {
      const off = (PHONE ? 66 : 76) * f;
      [[xl0, xc, -off / 2], [xc, xr0, off / 2]].forEach(([a, b, dy]) => {
        ctx.save(); ctx.beginPath(); ctx.rect(a, ytop, b - a, B.hb); ctx.clip(); ctx.translate(0, dy);
        for (let i = -6; i < 16; i++) { ctx.fillStyle = lithFill(FKIND[1 + (((i % 5) + 5) % 5)]); ctx.fillRect(a, ytop - 100 + i * 24, b - a, 25); }
        ctx.strokeStyle = '#38a3e8'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); for (let x = a; x <= b; x += 4) { const y = ytop + B.hb * 0.5 + 30 * Math.sin((x - xl0) / 55); x === a ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
        ctx.restore();
      });
      ctx.strokeStyle = '#1e1b1b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xc, ytop - 6); ctx.lineTo(xc, yb + 6); ctx.stroke();
      tx(xc, ytop - 12, '단층면 (거의 수직)', 13.5, '#334155', 'center', 800);
      info = { off };
      // 힘 화살표
      D.arrow(xl0 - 24, yb - 20, xl0 - 24, ytop + 20, { color: '#ef4444', width: 7, head: 18 }); D.arrow(xr0 + 24, ytop + 20, xr0 + 24, yb - 20, { color: '#ef4444', width: 7, head: 18 });
      if (f > 0.05) D.label(xc, yb + 22, '단층면을 따라 양쪽이 수평으로 어긋났어요', { bg: '#475569', size: 13, pad: 9 });
    } else if (F.mode === 'comp' && F.beh === 'duct') {
      const Wf = W0 * (1 - 0.25 * f), lam = Wf / 1.5, kk = TAU / lam, kA = 2 * Math.sqrt(Math.max(0, W0 / Wf - 1)), A = kA / kk;
      wl = xc - Wf / 2; wr = xc + Wf / 2;
      const topFn = (x, j) => ytop + (5 - j) * hs - A * Math.cos(kk * (x - xc));
      ctx.save(); ctx.beginPath(); ctx.rect(wl, ytop, Wf, B.hb); ctx.clip(); foldLayers(wl, wr, topFn, ytop, yb, hs); ctx.restore();
      // 깎여 나간 윗부분(점선)
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(71,85,105,.65)'; ctx.lineWidth = 2; ctx.beginPath(); let st = false; for (let x = wl; x <= wr; x += 4) { const y = topFn(x, 5); if (y < ytop) { st ? ctx.lineTo(x, y) : ctx.moveTo(x, y); st = true; } else st = false; } ctx.stroke(); ctx.restore();
      const layerAt = (x) => { let idx = 0; for (let j = 1; j <= 5; j++) if (ytop <= topFn(x, j) + hs) idx = j; return idx; };
      // 지표 띠
      for (let x = wl; x < wr; x += 3) { ctx.fillStyle = FCOL[layerAt(x + 1.5)]; ctx.fillRect(x, sTop, 3.2, 20); }
      ctx.strokeStyle = 'rgba(30,30,45,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(wl, sTop, Wf, 20);
      info = { wl, wr, lam, A, layerAt };
      wallBlock(wl, -1, ytop - 30, yb + 12); wallBlock(wr, 1, ytop - 30, yb + 12);
      D.arrow(wl - 44 + 4, ytop + B.hb / 2, wl - 3, ytop + B.hb / 2, { color: '#ef4444', width: 7, head: 16 }); D.arrow(wr + 44 - 4, ytop + B.hb / 2, wr + 3, ytop + B.hb / 2, { color: '#ef4444', width: 7, head: 16 });
      if (f > 0.35) [[xc, 1], [xc - lam / 2, 2], [xc + lam / 2, 3]].forEach(([mx, n]) => { if (mx < wl + 10 || mx > wr - 10) return; D.sphere(mx, sTop - 14, 12, '#0ea5e9', { shadow: true, text: String(n), textScale: 1.0 }); });
    } else if (F.mode === 'tens' && F.beh === 'duct') {
      const kx = 1 + 0.32 * f, ky = 1 - 0.28 * f;
      ctx.save(); ctx.translate(xc, yb); ctx.scale(kx, ky); ctx.translate(-xc, -yb); ctx.beginPath(); ctx.rect(xl0, ytop, W0, B.hb); ctx.clip();
      foldLayers(xl0, xr0, (x, j) => ytop + (5 - j) * hs, ytop, yb, hs); ctx.restore();
      wl = xc - (W0 / 2) * kx; wr = xc + (W0 / 2) * kx;
      wallBlock(wl, -1, ytop - 30, yb + 12); wallBlock(wr, 1, ytop - 30, yb + 12);
      D.arrow(wl - 3, ytop + B.hb / 2, wl - 44 + 4, ytop + B.hb / 2, { color: '#ef4444', width: 7, head: 16 }); D.arrow(wr + 3, ytop + B.hb / 2, wr + 44 - 4, ytop + B.hb / 2, { color: '#ef4444', width: 7, head: 16 });
      if (f > 0.1) tx(xc, ytop - 12, '늘어나며 얇아져요 (연성 변형)', 14, '#334155', 'center', 800);
    } else { // 취성: 끊어져 어긋나요
      const dx = (B.hb / Math.tan(B.alpha)) / 2, xt = xc - dx, xb = xc + dx, s = B.s * f, ux = Math.cos(B.alpha), uy = Math.sin(B.alpha);
      const rev = F.mode === 'comp', sg = rev ? -1 : 1, Tx = sg * s * ux, Ty = sg * s * uy;
      const flat = (a, b) => foldLayers(a, b, (x, j) => ytop + (5 - j) * hs, ytop, yb, hs);
      // 하반(왼쪽 아래) : 고정
      ctx.save(); ctx.beginPath(); ctx.moveTo(xl0, ytop); ctx.lineTo(xt, ytop); ctx.lineTo(xb, yb); ctx.lineTo(xl0, yb); ctx.closePath(); ctx.clip(); flat(xl0, xr0 + 40); ctx.restore();
      // 상반(오른쪽 위) : 단층면을 따라 움직여요
      ctx.save(); ctx.beginPath(); ctx.rect(xl0 - 80, ytop - 160, W0 + 200, yb - ytop + 160); ctx.clip();
      if (Ty < 0) { const yg = yb + Ty, xg = xt + (yg - ytop) / Math.tan(B.alpha); ctx.save(); ctx.beginPath(); ctx.moveTo(xg, yg); ctx.lineTo(xr0 + Tx, yg); ctx.lineTo(xr0 + Tx, yb); ctx.lineTo(xb, yb); ctx.closePath(); ctx.fillStyle = lithFill(FKIND[0]); ctx.fill(); ctx.restore(); }
      ctx.translate(Tx, Ty); ctx.beginPath(); ctx.moveTo(xt, ytop); ctx.lineTo(xr0, ytop); ctx.lineTo(xr0, yb); ctx.lineTo(xb, yb); ctx.closePath(); ctx.clip(); flat(xl0 - 40, xr0 + 40); ctx.restore();
      ctx.strokeStyle = f > 0.02 ? '#7f1d1d' : 'rgba(127,29,29,.5)'; ctx.lineWidth = f > 0.02 ? 4 : 2.5; ctx.setLineDash(f > 0.02 ? [] : [7, 6]);
      ctx.beginPath(); ctx.moveTo(xt - (rev ? s * ux : 0), ytop - (rev ? s * uy : 0)); ctx.lineTo(xb, yb); ctx.stroke(); ctx.setLineDash([]);
      wl = xl0; wr = xr0 + Tx;
      wallBlock(wl, -1, ytop - 30, yb + 12); wallBlock(wr, 1, ytop - 30 + Ty, yb + 12);
      D.arrow(rev ? wl - 44 + 4 : wl - 3, ytop + B.hb / 2, rev ? wl - 3 : wl - 44 + 4, ytop + B.hb / 2, { color: '#ef4444', width: 7, head: 16 });
      D.arrow(rev ? wr + 44 - 4 : wr + 3, ytop + B.hb / 2 + (Ty > 0 ? Ty : 0), rev ? wr + 3 : wr + 44 - 4, ytop + B.hb / 2 + (Ty > 0 ? Ty : 0), { color: '#ef4444', width: 7, head: 16 });
      // 상반·하반 이름표와 상대 이동
      const hx = (xt + xr0) / 2 + Tx + 40, hy = ytop + B.hb * 0.28 + Ty, fx = (xl0 + xt) / 2 - 10, fy = ytop + B.hb * 0.62;
      D.label(hx, hy, '상반', { bg: '#0369a1', size: 14, pad: 10 }); D.label(fx, fy, '하반', { bg: '#7c3aed', size: 14, pad: 10 });
      if (f > 0.1) {
        const dx0 = sg * ux, dy0 = sg * uy;
        D.arrow(hx - dx0 * 18, hy + 22 - dy0 * 18, hx + dx0 * 34, hy + 22 + dy0 * 34, { color: '#0369a1', width: 4, head: 12 });
        tx(hx, hy + 62 + Math.abs(dy0) * 34, sg > 0 ? '상반이 내려가요' : '상반이 올라가요', 13.5, '#0369a1', 'center', 800);
        tx((xl0 + xt) / 2 - 10, fy + 28, '하반은 그대로', 13, '#6d28d9', 'center', 800);
      }
      info = { Tx, Ty };
    }
    ctx.restore();
    // 범례 : 지층 나이
    const lx = B.x + 14, ly = B.y + B.h - 34;
    tx(lx, ly - 8, '지층 (가: 가장 오래됨 → 바: 가장 젊음)', 13, '#475569', 'left', 800);
    FCOL.forEach((c, i) => { const x = lx + i * (PHONE ? 52 : 58); ctx.fillStyle = c; rr(x, ly, PHONE ? 46 : 52, 22, 6).fill(); ctx.strokeStyle = 'rgba(30,30,45,.45)'; ctx.lineWidth = 1.4; rr(x, ly, PHONE ? 46 : 52, 22, 6).stroke(); tx(x + (PHONE ? 23 : 26), ly + 16, FNAME[i], 14, '#1e293b', 'center', 800); });
    D.label(B.x + B.w - 12, B.y + 22, MODE_NAME[F.mode] + ' · ' + (F.mode === 'shear' ? '단층' : F.beh === 'duct' ? '연성(잘 휘는 암석)' : '취성(잘 부서지는 암석)'), { bg: 'rgba(15,23,42,.72)', size: 12.5, pad: 9, align: 'right' });
    if (f < 0.02) note(B.x + B.w / 2 - 170, B.y + 36 + (PHONE ? 0 : 6), 340, '힘의 방향과 정도를 바꿔 지층 변화를 살펴봐요', 14.5, { bg: 'rgba(255,255,255,.88)' });
    S.fold.info = info;
  }

  /* ---------- 장면 ③ : 변동대와 구조 짝짓기 ---------- */
  const BD = [
    { id: 'div', name: '발산 경계 (해령·열곡)', color: '#0369a1' },
    { id: 'conv', name: '수렴 경계 (충돌·섭입)', color: '#b91c1c' },
    { id: 'trans', name: '보존 경계 (변환 단층)', color: '#6d28d9' },
  ];
  const BD_CARDS = [
    { id: 'normal', label: '정단층 · 열곡 (인장력)', z: 'div' },
    { id: 'basalt', label: '현무암질 화산 활동', z: 'div' },
    { id: 'reverse', label: '습곡 산맥 · 역단층 (횡압력)', z: 'conv' },
    { id: 'metam', label: '화강암 · 변성암 (광역 변성)', z: 'conv' },
    { id: 'strike', label: '주향 이동 단층 (전단력)', z: 'trans' },
    { id: 'noig', label: '화산 활동이 거의 없어요', z: 'trans' },
  ];
  const bdIcon = (kind, x, y, w, h, t) => {
    ctx.save(); ctx.beginPath(); rr(x, y, w, h, 10).clip();
    ctx.fillStyle = '#e8f1f8'; ctx.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2;
    if (kind === 'div') {
      ctx.fillStyle = '#4a98c9'; ctx.fillRect(x, y + h * 0.25, w, h * 0.3);
      ctx.fillStyle = '#7a8088'; ctx.fillRect(x, y + h * 0.5, cx - x - 6, h * 0.22); ctx.fillRect(cx + 6, y + h * 0.5, x + w - cx - 6, h * 0.22);
      ctx.fillStyle = '#e25b17'; ctx.beginPath(); ctx.moveTo(cx - 8, y + h * 0.5); ctx.lineTo(cx, y + h * 0.3); ctx.lineTo(cx + 8, y + h * 0.5); ctx.closePath(); ctx.fill(); ctx.fillRect(cx - 8, y + h * 0.5, 16, h * 0.5);
      D.arrow(cx - 12, y + h * 0.4, x + 12, y + h * 0.4, { color: '#fff', width: 3, head: 9 }); D.arrow(cx + 12, y + h * 0.4, x + w - 12, y + h * 0.4, { color: '#fff', width: 3, head: 9 });
    } else if (kind === 'conv') {
      ctx.fillStyle = '#7b8089'; ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
      ctx.fillStyle = '#9aa0a8'; ctx.beginPath(); ctx.moveTo(cx - w * 0.3, y + h * 0.55); ctx.lineTo(cx, y + h * 0.15); ctx.lineTo(cx + w * 0.3, y + h * 0.55); ctx.closePath(); ctx.fill();
      D.arrow(x + 8, y + h * 0.72, cx - 14, y + h * 0.72, { color: '#dc2626', width: 3, head: 9 }); D.arrow(x + w - 8, y + h * 0.72, cx + 14, y + h * 0.72, { color: '#dc2626', width: 3, head: 9 });
    } else {
      ctx.fillStyle = '#d9cfb0'; ctx.fillRect(x + 6, y + 6, cx - x - 10, h - 12); ctx.fillRect(cx + 4, y + 6, x + w - cx - 10, h - 12);
      ctx.strokeStyle = '#38a3e8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 6, cy - 10); ctx.lineTo(cx - 4, cy - 10); ctx.moveTo(cx + 4, cy + 6); ctx.lineTo(x + w - 6, cy + 6); ctx.stroke();
      D.arrow(x + w * 0.22, y + h - 10, x + w * 0.22, y + 10, { color: '#dc2626', width: 3, head: 9 }); D.arrow(x + w * 0.78, y + 10, x + w * 0.78, y + h - 10, { color: '#dc2626', width: 3, head: 9 });
    }
    ctx.restore(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; rr(x, y, w, h, 10).stroke();
  };
  const bdOnReject = (c, z, m) => { if (m) say(m, true, 2.2); };
  const bdBoard = new Board(PHONE
    ? { zones: BD.map((b, i) => ({ id: b.id, x: 10, y: 48 + i * 168, w: 580, h: 160, head: 92, cap: 2, label: b.name, color: b.color, fill: 'rgba(255,255,255,.8)', lsize: 15, draw: (z, t) => bdIcon(b.id, z.x + z.w - 150, z.y + 8, 138, 70, t) })), tray: { x: 10, y: 560, w: 580, cols: 3 }, cw: 184, ch: 66, gap: 8, onReject: bdOnReject }
    : { zones: BD.map((b, i) => ({ id: b.id, x: 20 + i * 254, y: 46, w: 244, h: 236, head: 100, cap: 2, label: b.name, color: b.color, fill: 'rgba(255,255,255,.8)', lsize: 14, draw: (z, t) => bdIcon(b.id, z.x + 10, z.y + 30, z.w - 20, 62, t) })), tray: { x: 20, y: 304, w: 760, cols: 3 }, cw: 232, ch: 54, gap: 8, onReject: bdOnReject });
  BD_CARDS.forEach((c) => bdBoard.add({ id: c.id, label: c.label, def: c, color: '#1e293b' }));
  const bdPlaced = () => bdBoard.cards.filter((c) => c.zone).length;
  const bdOk = () => bdBoard.cards.every((c) => c.zone === c.def.z);
  function drawBound(t, dt) {
    bdBoard.update(dt); bdBoard.layout(); bdBoard.draw(t);
    const ty = PHONE ? 722 : 446;
    if (bdPlaced() === 6 && bdOk()) {
      panel(PHONE ? 10 : 20, ty, PHONE ? 580 : 760, PHONE ? 116 : 82, { fill: '#effaf2', border: '#86efac' });
      ['힘의 방향이 구조를 정해요: 인장력 → 정단층, 횡압력 → 습곡·역단층, 전단력 → 주향 이동 단층', '발산 경계는 현무암, 수렴 경계는 화강암·변성암이 만들어져요.'].forEach((s, i) => { const ls = wrapLines(s, (PHONE ? 560 : 740) - 8, PHONE ? 13.5 : 14.5, 700); ls.forEach((l, j) => tx((PHONE ? 24 : 34), ty + 28 + i * (PHONE ? 52 : 26) + j * 18, l, PHONE ? 13.5 : 14.5, '#14532d', 'left', 700)); });
    } else tx(PHONE ? 300 : 400, PHONE ? 740 : 470, '카드를 알맞은 판 경계 칸에 놓아요 (끌어다 놓거나, 카드를 누른 뒤 칸을 눌러요)', PHONE ? 13 : 14.5, '#64748b', 'center', 800);
  }
  function bdReset() { bdBoard.reset(); }

  /* ---------- 장면 ③ : 단층 이동 거리 ---------- */
  const SPD = PHONE ? { M: { x: 10, y: 46, w: 580, h: 270 }, C: { x: 10, y: 328, w: 580, h: 340 } } : { M: { x: 20, y: 46, w: 380, h: 330 }, C: { x: 416, y: 46, w: 364, h: 330 } };
  const SPD_T = [100, 1000, 10000, 10000000], SPD_NAME = ['100년', '1000년', '1만 년', '1000만 년'];
  const spdDist = (t) => 0.03 * t; // m
  const fmtDist = (m) => (m < 1000 ? comma(m) + ' m' : comma(m / 1000) + ' km');
  const spdOk = () => S.speed.rec != null && Math.abs(S.speed.rec - 3) < 0.005;
  function drawSpeed(t, dt) {
    const M = SPD.M, C = SPD.C, sp = S.speed, d = spdDist(sp.t);
    sp.tS = approach(sp.tS, Math.log10(d), dt, 6);
    // 지도
    panel(M.x, M.y, M.w, M.h, { fill: '#e7edf3' });
    tx(M.x + 12, M.y + 22, '단층 위에서 본 지도 (모식도)', 14, '#334155', 'left', 800);
    const off = 14 + 60 * (sp.tS - Math.log10(3)) / (Math.log10(300000) - Math.log10(3)), cx = M.x + M.w / 2;
    ctx.save(); rr(M.x + 8, M.y + 32, M.w - 16, M.h - 40, 10).clip();
    [[M.x + 8, cx, -off / 2], [cx, M.x + M.w - 8, off / 2]].forEach(([a, b, dy]) => {
      ctx.save(); ctx.beginPath(); ctx.rect(a, M.y + 32, b - a, M.h - 40); ctx.clip(); ctx.translate(0, dy);
      ctx.fillStyle = '#d9cfb0'; ctx.fillRect(a, M.y, b - a, M.h + 100);
      ctx.strokeStyle = '#38a3e8'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(a, M.y + M.h * 0.5 + 8); ctx.lineTo(b, M.y + M.h * 0.5 + 8); ctx.stroke();
      ctx.strokeStyle = '#6b6b6b'; ctx.lineWidth = 5; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(a, M.y + M.h * 0.75); ctx.lineTo(b, M.y + M.h * 0.75); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    });
    ctx.strokeStyle = '#1e1b1b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, M.y + 30); ctx.lineTo(cx, M.y + M.h - 6); ctx.stroke();
    ctx.restore();
    tx(M.x + 16, M.y + M.h * 0.5 + 40 - off / 2, '하천', 13, '#0369a1', 'left', 800); tx(M.x + M.w - 16, M.y + M.h * 0.75 + 30 + off / 2, '도로', 13, '#475569', 'right', 800);
    D.arrow(cx - 70, M.y + M.h - 40, cx - 70, M.y + 60, { color: '#dc2626', width: 5, head: 14 }); D.arrow(cx + 70, M.y + 60, cx + 70, M.y + M.h - 40, { color: '#dc2626', width: 5, head: 14 });
    D.label(M.x + M.w / 2, M.y + M.h - 18, '어긋난 거리  ' + fmtDist(d) + ' (어긋남 크기는 모식도)', { bg: '#475569', size: 13, pad: 10 });
    // 로그 눈금 막대 그래프 (눈금에 맞게)
    panel(C.x, C.y, C.w, C.h, { title: '이동 거리 = 속도 × 시간 (3 cm/년)' });
    const pf = plotFrame(C, { xmin: 0, xmax: 6, ymin: 0, ymax: 4, xticks: [0, 1, 2, 3, 4, 5, 6], yticks: [], l: 20, r: 20, t: 40, b: 56, xfmt: (v) => ['1 m', '10 m', '100 m', '1 km', '10 km', '100 km', '1000 km'][v], size: PHONE ? 11 : 11.5, xlabel: '거리 (로그 눈금)' });
    SPD_T.forEach((tt, i) => {
      const dd = spdDist(tt), rh = (pf.y1 - pf.y0 - 8) / 4, y = pf.y0 + 8 + i * rh + 18, bh = rh - 30, w = pf.gx(Math.log10(dd)) - pf.x0, on = sp.t === tt;
      tx(pf.x0 + 4, y - 5, SPD_NAME[i], 13.5, on ? '#0369a1' : '#334155', 'left', 800);
      ctx.fillStyle = on ? '#0ea5e9' : '#bcd3e4'; rr(pf.x0, y, w, bh, 7).fill();
      const inside = pf.x0 + w > pf.x1 - 96;
      tx(inside ? pf.x0 + w - 8 : pf.x0 + w + 8, y + bh / 2 + 5, fmtDist(dd), 13.5, inside ? '#fff' : (on ? '#0369a1' : '#64748b'), inside ? 'right' : 'left', 800);
    });
    tx(C.x + C.w / 2, C.y + C.h + 14, '', 1);
    const by = (PHONE ? C.y + C.h : M.y + M.h) + 14;
    para(20, by + 10, PHONE ? 560 : 760, '3 cm/년 = 0.03 m/년  →  100년 동안: 0.03 m/년 × 100년 = ? m', PHONE ? 13 : 14.5, '#334155', 800);
    para(20, by + 36, PHONE ? 560 : 760, '1000만 년 = 10 000 000년이면 얼마나 움직일까요? (단위 환산에 주의해요)', PHONE ? 12.5 : 13.5, '#475569');
  }
  function spdRecord() {
    const v = parseFloat(($('#inSpd').value || '').replace(/,/g, '').trim());
    if (!isFinite(v)) { toast('거리를 숫자로 써 주세요.', 'bad'); Sound.fail(); return; }
    S.speed.rec = v;
    if (Math.abs(v - 3) < 0.005) { Sound.success(); toast('✅ 0.03 m/년 × 100년 = 3 m', 'good'); parts.burst(140, 200, { count: 14, colors: ['#0ea5e9', '#16a34a', '#fbbf24'] }); }
    else { Sound.fail(); toast('3 cm/년 = 0.03 m/년이에요. 0.03 × 100을 다시 계산해 봐요.', 'bad'); }
    updateCtl();
  }

  /* ---------- 장면 ④ : 암석 순환도 ---------- */
  const CY = PHONE ? { x: 10, y: 46, w: 580, h: 560, cx: 300, cy: 318, rx: 196, ry: 188, nw: 132, nh: 52 } : { x: 20, y: 46, w: 560, h: 440, cx: 300, cy: 286, rx: 200, ry: 142, nw: 124, nh: 44 };
  const NODES = {
    magma: { label: '마그마', color: '#ea580c', ang: -90 }, ig: { label: '화성암', color: '#7a6a7e', ang: -18 },
    sed: { label: '퇴적물', color: '#c9a86a', ang: 54 }, sr: { label: '퇴적암', color: '#b59f94', ang: 126 }, me: { label: '변성암', color: '#8b6fa6', ang: 198 },
  };
  Object.keys(NODES).forEach((k) => { const n = NODES[k]; n.x = CY.cx + Math.cos(rad(n.ang)) * CY.rx; n.y = CY.cy + Math.sin(rad(n.ang)) * CY.ry; });
  const EN_COL = { sun: '#f59e0b', in: '#dc2626', both: '#7c3aed' };
  const EDGES = [
    { id: 'e1', a: 'magma', b: 'ig', label: '냉각·고결', en: 'in', out: true, bend: 18 },
    { id: 'e9', a: 'ig', b: 'magma', label: '융해', en: 'in', out: false, bend: 22, lo: [-6, 4] },
    { id: 'e2', a: 'ig', b: 'sed', label: '풍화·침식·운반', en: 'sun', out: true, bend: 20 },
    { id: 'e3', a: 'sed', b: 'sr', label: '퇴적·속성', en: 'sun', out: true, bend: 20 },
    { id: 'e8', a: 'sr', b: 'sed', label: '풍화·침식·운반', en: 'sun', out: false, bend: 26, lo: [0, 8] },
    { id: 'e4', a: 'sr', b: 'me', label: '변성', en: 'in', out: true, bend: 20 },
    { id: 'e5', a: 'me', b: 'magma', label: '융해', en: 'in', out: true, bend: 20 },
    { id: 'e6', a: 'ig', b: 'me', label: '변성', en: 'in', out: false, bend: 0, lo: [0, -10] },
    { id: 'e7', a: 'me', b: 'sed', label: '융기 + 풍화·침식·운반', en: 'both', out: false, bend: 0, lo: [-30, 16] },
    { id: 'e10', a: 'sr', b: 'magma', label: '융해', en: 'in', out: false, bend: 0, lo: [-14, 0] },
  ];
  /* 경로 곡선 : 노드 둘레에서 시작해 노드 둘레에서 끝나요 */
  function edgeGeom(e) {
    const A = NODES[e.a], B = NODES[e.b], hw = CY.nw / 2 + 4, hh = CY.nh / 2 + 4;
    let dx = B.x - A.x, dy = B.y - A.y; const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const cut = (ux, uy) => Math.min(hw / Math.max(1e-6, Math.abs(ux)), hh / Math.max(1e-6, Math.abs(uy)));
    let nx = -dy, ny = dx; const mx = (A.x + B.x) / 2 - CY.cx, my = (A.y + B.y) / 2 - CY.cy;
    if ((mx * nx + my * ny > 0) !== !!e.out) { nx = -nx; ny = -ny; }
    const bend = e.bend || 0, cxp = (A.x + B.x) / 2 + nx * bend * 2, cyp = (A.y + B.y) / 2 + ny * bend * 2;
    // 곡선의 시작·끝 방향으로 노드 경계까지 자르기
    const sd = [cxp - A.x, cyp - A.y], sl = Math.hypot(sd[0], sd[1]) || 1, ed = [B.x - cxp, B.y - cyp], el = Math.hypot(ed[0], ed[1]) || 1;
    const s0 = cut(sd[0] / sl, sd[1] / sl), e0 = cut(ed[0] / el, ed[1] / el);
    const p0 = [A.x + (sd[0] / sl) * s0, A.y + (sd[1] / sl) * s0], p2 = [B.x - (ed[0] / el) * e0, B.y - (ed[1] / el) * e0];
    return { p0, c: [cxp, cyp], p2 };
  }
  EDGES.forEach((e) => { e.g = edgeGeom(e); });
  const qpt = (g, t) => { const u = 1 - t; return [u * u * g.p0[0] + 2 * u * t * g.c[0] + t * t * g.p2[0], u * u * g.p0[1] + 2 * u * t * g.c[1] + t * t * g.p2[1]]; };
  const EN_TEXT = { sun: '☀ 태양 에너지', in: '🔥 지구 내부 에너지', both: '두 에너지 모두' };
  const CYC_FOUND = [['loop', '① 한 바퀴 돌기'], ['ig2me', '② 화성암 → 변성암'], ['me2se', '③ 변성암 → 퇴적물'], ['sr2se', '④ 퇴적암 → 퇴적물'], ['melt', '⑤ 화성암·퇴적암이 녹기']];
  const cycReset = (all) => {
    const C = S.cyc; SciSim.tween(C.tok, { x: 0 }, { duration: 0.001 });
    C.node = 'magma'; C.walk = ['magma']; C.mv = null; C.last = null;
    if (all) C.found = { loop: false, ig2me: false, me2se: false, sr2se: false, melt: false };
  };
  const cycFound = () => Object.values(S.cyc.found).filter(Boolean).length;
  function cycGo(to) {
    const C = S.cyc; if (C.mv) return;
    const e = EDGES.find((q) => q.a === C.node && q.b === to);
    if (!e) { C.shake = 0.45; Sound.fail(); say('그 길에는 화살표가 없어요. 빛나는 칸으로 이동해 봐요.', true, 2.2); return; }
    Sound.click(); const mv = { e, t: 0 }; C.mv = mv;
    SciSim.tween(mv, { t: 1 }, { duration: RM ? 0.01 : 1.0, ease: 'inOutQuad', onDone: () => {
      if (C.mv !== mv) return;
      C.node = to; C.walk.push(to); C.mv = null; C.last = e;
      say(NODES[e.a].label + ' → ' + NODES[e.b].label + ' : ' + e.label + ' (' + EN_TEXT[e.en] + ')', false, 3.2);
      const F = C.found;
      if (e.id === 'e6') F.ig2me = true; if (e.id === 'e7') F.me2se = true; if (e.id === 'e8') F.sr2se = true; if (e.id === 'e9' || e.id === 'e10') F.melt = true;
      if (C.walk.length >= 6 && C.walk[C.walk.length - 1] === C.walk[0] && new Set(C.walk).size === 5) F.loop = true;
      parts.burst(NODES[to].x, NODES[to].y, { count: 10, speed: 90, size: 3, life: 0.6, colors: [EN_COL[e.en], '#fff'] });
      Sound.tick(); updateCtl();
    } });
  }
  function cycTap(p) {
    for (const k of Object.keys(NODES)) { const n = NODES[k]; if (Math.abs(p.x - n.x) <= CY.nw / 2 + 6 && Math.abs(p.y - n.y) <= CY.nh / 2 + 6) { if (k !== S.cyc.node) cycGo(k); return true; } }
    return false;
  }
  function drawCycle(t, dt) {
    const C = S.cyc, P = CY;
    panel(P.x, P.y, P.w, P.h, { fill: '#f4f7fb' });
    if (C.shake > 0) C.shake = Math.max(0, C.shake - dt);
    // 화살표(경로)
    const cur = C.mv ? null : C.node;
    EDGES.forEach((e) => {
      const g = e.g, col = EN_COL[e.en], act = cur === e.a, used = C.last === e.id;
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = act ? 4.2 : 2.4; ctx.globalAlpha = act ? 1 : 0.6; ctx.lineCap = 'round';
      if (e.en === 'both') ctx.setLineDash([9, 5]);
      ctx.beginPath(); ctx.moveTo(g.p0[0], g.p0[1]); ctx.quadraticCurveTo(g.c[0], g.c[1], g.p2[0], g.p2[1]); ctx.stroke(); ctx.setLineDash([]);
      const a = Math.atan2(g.p2[1] - g.c[1], g.p2[0] - g.c[0]), hs = act ? 13 : 10;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(g.p2[0], g.p2[1]); ctx.lineTo(g.p2[0] - Math.cos(a - 0.4) * hs, g.p2[1] - Math.sin(a - 0.4) * hs); ctx.lineTo(g.p2[0] - Math.cos(a + 0.4) * hs, g.p2[1] - Math.sin(a + 0.4) * hs); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    EDGES.forEach((e) => { const m = qpt(e.g, 0.5), lo = e.lo || [0, 0]; D.label(m[0] + lo[0], m[1] + lo[1], e.label, { bg: '#fff', color: EN_COL[e.en], size: PHONE ? 11.5 : 12.5, pad: 6, border: EN_COL[e.en] }); });
    // 노드
    Object.keys(NODES).forEach((k) => {
      const n = NODES[k], here = k === C.node && !C.mv, dest = !C.mv && EDGES.some((e) => e.a === C.node && e.b === k);
      const sx = (C.shake > 0 && dest === false && k !== C.node) ? Math.sin(C.shake * 60) * 2 : 0;
      D.shadow(() => { ctx.fillStyle = '#fff'; rr(n.x - P.nw / 2 + sx, n.y - P.nh / 2, P.nw, P.nh, 14).fill(); }, { blur: 7, y: 3 });
      ctx.save(); rr(n.x - P.nw / 2 + sx, n.y - P.nh / 2, P.nw, P.nh, 14).clip();
      ctx.fillStyle = lithFill(k === 'magma' ? 'magma' : k === 'ig' ? 'igneous' : k === 'sed' ? 'sand' : k === 'sr' ? 'shale' : 'gneiss'); ctx.globalAlpha = 0.55; ctx.fillRect(n.x - P.nw / 2, n.y - P.nh / 2, P.nw, P.nh); ctx.restore();
      ctx.strokeStyle = here ? '#16a34a' : dest ? '#0ea5e9' : n.color; ctx.lineWidth = here ? 4 : 2.6; rr(n.x - P.nw / 2 + sx, n.y - P.nh / 2, P.nw, P.nh, 14).stroke();
      D.text(n.x + sx, n.y + 6, n.label, { size: 18, weight: 800, color: '#111827', stroke: 'rgba(255,255,255,.85)', strokeWidth: 4 });
      if (dest) D.ring(n.x, n.y, P.nh / 2 + 10, t + k.length * 0.2, { color: '#0ea5e9', speed: 0.7, width: 2 });
    });
    // 암석 알갱이(여행자)
    let tx0, ty0;
    if (C.mv) { const q = qpt(C.mv.e.g, C.mv.t); tx0 = q[0]; ty0 = q[1]; if (!RM) parts.emit({ x: tx0, y: ty0, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, size: 3, life: 0.6, color: EN_COL[C.mv.e.en], gravity: 0 }); }
    else { const n = NODES[C.node]; tx0 = n.x; ty0 = n.y - P.nh / 2 - 12 + Math.sin(t * 3) * 2; }
    D.sphere(tx0, ty0, 11, '#e2464b', { shadow: true });
    if (!C.mv) tx(tx0 + 18, ty0 + 5, '지금 여기', 12.5, '#b91c1c', 'left', 800);
    // 에너지 범례와 진행
    const lx = PHONE ? P.x : P.x + P.w + 16, ly = PHONE ? P.y + P.h + 12 : P.y, lw = PHONE ? P.w : 184;
    const leg = [['sun', '풍화·침식·운반·퇴적·속성'], ['in', '냉각·고결, 융해, 변성'], ['both', '융기 + 풍화·침식']];
    if (PHONE) {
      panel(lx, ly, lw, 150, { title: '에너지원' });
      leg.forEach((q, i) => { ctx.fillStyle = EN_COL[q[0]]; ctx.fillRect(lx + 14, ly + 42 + i * 30, 26, 5); tx(lx + 48, ly + 49 + i * 30, EN_TEXT[q[0]] + '  ' + q[1], 13, '#334155', 'left', 800); });
      const pr = cycFound(); tx(lx + 14, ly + 138, '찾은 경로 ' + pr + ' / 5', 14, '#334155', 'left', 800);
    } else {
      panel(lx, ly, lw, 150, { title: '에너지원' });
      leg.forEach((q, i) => { ctx.fillStyle = EN_COL[q[0]]; ctx.fillRect(lx + 12, ly + 36 + i * 36, 22, 5); tx(lx + 42, ly + 42 + i * 36, EN_TEXT[q[0]], 13, '#334155', 'left', 800); tx(lx + 42, ly + 58 + i * 36, q[1], 12, '#64748b', 'left', 700); });
      panel(lx, ly + 162, lw, 252, { title: '찾은 경로 ' + cycFound() + ' / 5' });
      CYC_FOUND.forEach((q, i) => { const ok = C.found[q[0]]; chkBox(lx + 12, ly + 208 + i * 38, ok, 17); tx(lx + 38, ly + 208 + i * 38, q[1], 13, ok ? '#15803d' : '#475569', 'left', 800); });
    }
    tx(P.x + 12, P.y + 22, '암석 순환도 (빛나는 칸을 눌러 암석이 되어 여행해요)', PHONE ? 13 : 14, '#334155', 'left', 800);
  }

  /* ---------- 장면 ④ : 섭입대의 순환 경로 ---------- */
  const SB = PHONE ? { x: 10, y: 46, w: 580, h: 440 } : { x: 20, y: 46, w: 760, h: 372 };
  const sbx = (u) => SB.x + u * SB.w, sby = (v) => SB.y + v * SB.h;
  const SB_PATH = [[0.33, 0.50], [0.47, 0.60], [0.58, 0.69], [0.64, 0.58], [0.65, 0.46], [0.66, 0.13], [0.75, 0.23], [0.5, 0.245], [0.4, 0.30], [0.34, 0.49]];
  const SB_SEG = [
    { cap: 'B  섭입하며 열·압력으로 변성되기 시작해요', col: '#8b6fa6' }, { cap: 'B  깊이 내려가 변성암이 돼요 (고압)', col: '#8b6fa6' },
    { cap: 'C  더 깊은 곳(물이 더해져)에서 녹아 마그마가 돼요', col: '#f97316' }, { cap: 'C  마그마가 위로 올라와요', col: '#f97316' },
    { cap: 'D  화산으로 분출하거나 땅속에서 식어 화성암이 돼요', col: '#7a6a7e' }, { cap: 'E  융기해서 지표에 드러나요', col: '#7a6a7e' },
    { cap: 'E  풍화·침식·운반으로 퇴적물이 돼요', col: '#b59f94' }, { cap: 'E  풍화·침식·운반으로 퇴적물이 돼요', col: '#c9a86a' }, { cap: 'A  해구에 다시 퇴적물이 쌓여요', col: '#c9a86a' },
  ];
  const SB_LEN = SB_PATH.slice(1).map((p, i) => Math.hypot((p[0] - SB_PATH[i][0]) * SB.w, (p[1] - SB_PATH[i][1]) * SB.h));
  const SB_TOT = SB_LEN.reduce((a, b) => a + b, 0);
  function sbPos(p) { let d = p * SB_TOT, i = 0; while (i < SB_LEN.length - 1 && d > SB_LEN[i]) { d -= SB_LEN[i]; i++; } const q = clamp(d / SB_LEN[i], 0, 1), a = SB_PATH[i], b = SB_PATH[i + 1]; return { x: a[0] + (b[0] - a[0]) * q, y: a[1] + (b[1] - a[1]) * q, seg: i }; }
  function subdRun() {
    const Sb = S.subd; if (Sb.run) return; Sound.click(); Sb.run = true; Sb.p = 0;
    SciSim.tween(Sb, { p: 1 }, { duration: RM ? 0.05 : 15, ease: 'linear', onDone: () => { Sb.run = false; Sb.seen = true; Sound.success(); updateCtl(); } });
    updateCtl();
  }
  function subdReset() { const Sb = S.subd; SciSim.tween(Sb, { p: 0 }, { duration: 0.001 }); Object.assign(Sb, { p: 0, run: false }); }
  function drawSubd(t, dt) {
    const P = SB, Sb = S.subd;
    panel(P.x, P.y, P.w, P.h, { fill: '#e8f1f8' });
    ctx.save(); rr(P.x, P.y, P.w, P.h, 14).clip();
    D.sky(P.x, P.y, P.w, P.h * 0.3, '#cfe9ff', '#eaf6ff');
    const slabC = (u) => (u < 0.34 ? 0.5 + u * 0.12 : 0.54 + (u - 0.34) * 0.73);
    const land = (u) => (u < 0.34 ? 0.5 : u < 0.42 ? 0.5 - ((u - 0.34) / 0.08) * 0.26 : 0.24 - 0.14 * gauss(u, 0.66, 0.05));
    const poly = (pts, fill, stroke) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(sbx(p[0]), sby(p[1])) : ctx.moveTo(sbx(p[0]), sby(p[1])))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } };
    ctx.fillStyle = '#4a98c9'; ctx.fillRect(P.x, sby(0.3), sbx(0.42) - P.x, sby(0.56) - sby(0.3));
    const mant = []; mant.push([0, 1], [1, 1], [1, 0.24], [0.42, 0.24], [0.34, 0.5], [0, 0.5]); ctx.beginPath(); mant.forEach((p, i) => (i ? ctx.lineTo(sbx(p[0]), sby(p[1])) : ctx.moveTo(sbx(p[0]), sby(p[1])))); ctx.closePath(); fillLith('mantle', 1);
    const cr = [[0.34, 0.53], [0.34, 0.5], [0.42, 0.24]]; for (let i = 0; i <= 40; i++) { const u = 0.42 + (i / 40) * 0.58; cr.push([u, land(u)]); } cr.push([1, 0.54], [0.6, 0.54], [0.4, 0.56]);
    ctx.beginPath(); cr.forEach((p, i) => (i ? ctx.lineTo(sbx(p[0]), sby(p[1])) : ctx.moveTo(sbx(p[0]), sby(p[1])))); ctx.closePath(); fillLith('crust', 1);
    ctx.fillStyle = '#7a5a46'; ctx.beginPath(); ctx.moveTo(sbx(0.6), sby(0.24)); ctx.lineTo(sbx(0.66), sby(0.1)); ctx.lineTo(sbx(0.72), sby(0.24)); ctx.closePath(); ctx.fill();
    const slab = []; for (let i = 0; i <= 50; i++) { const u = (i / 50) * 0.92; slab.push([u, slabC(u) - 0.03]); } for (let i = 50; i >= 0; i--) { const u = (i / 50) * 0.92; slab.push([u, slabC(u) + 0.03]); }
    ctx.beginPath(); slab.forEach((p, i) => (i ? ctx.lineTo(sbx(p[0]), sby(p[1])) : ctx.moveTo(sbx(p[0]), sby(p[1])))); ctx.closePath(); fillLith('basalt', 1); ctx.strokeStyle = 'rgba(20,20,30,.5)'; ctx.lineWidth = 2; ctx.stroke();
    const mg = ctx.createRadialGradient(sbx(0.66), sby(0.45), 3, sbx(0.66), sby(0.45), 40); mg.addColorStop(0, '#fde047'); mg.addColorStop(0.6, '#f97316'); mg.addColorStop(1, 'rgba(185,28,28,.5)'); ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(sbx(0.66), sby(0.45), P.w * 0.045, P.h * 0.04, 0, 0, TAU); ctx.fill();
    // 해구에 쌓인 퇴적물
    ctx.fillStyle = lithFill('sand'); ctx.beginPath(); ctx.moveTo(sbx(0.27), sby(0.5)); ctx.quadraticCurveTo(sbx(0.32), sby(0.45), sbx(0.37), sby(0.52)); ctx.lineTo(sbx(0.3), sby(0.54)); ctx.closePath(); ctx.fill();
    tx(sbx(0.2), sby(0.4), '바다 판', 14, '#0b3a63', 'center', 800); tx(sbx(0.6), sby(0.5) + 6, '맨틀 쐐기', 13, '#e5f0e0', 'center', 800); tx(sbx(0.9), sby(0.35), '대륙', 14, '#f1f5f9', 'center', 800); tx(sbx(0.31), sby(0.63), '해구', 13.5, '#0b3a63', 'center', 800);
    ctx.restore();
    // 여행하는 암석 알갱이
    const q = sbPos(Sb.p), seg = SB_SEG[q.seg];
    if (Sb.p > 0) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.setLineDash([2, 6]); ctx.lineCap = 'round'; ctx.beginPath(); let acc = 0; const N = 80; for (let i = 0; i <= N; i++) { const pp = (i / N) * Sb.p, s = sbPos(pp); i ? ctx.lineTo(sbx(s.x), sby(s.y)) : ctx.moveTo(sbx(s.x), sby(s.y)); } ctx.stroke(); ctx.restore(); }
    const st = Sb.p === 0 ? { x: SB_PATH[0][0], y: SB_PATH[0][1] } : q;
    const col = Sb.p === 0 ? '#c9a86a' : seg.col;
    D.sphere(sbx(st.x), sby(st.y), 12, col, { shadow: true, outline: 'rgba(30,30,40,.7)' });
    if (!RM && Sb.run && Math.random() < dt * 20) parts.emit({ x: sbx(st.x), y: sby(st.y), vx: (Math.random() - 0.5) * 18, vy: (Math.random() - 0.5) * 18, size: 3, life: 0.7, color: col });
    // 설명
    const cap = Sb.p === 0 ? 'A  대륙에서 온 퇴적물이 해구 부근에 쌓여 있어요 (▶ 따라가기를 눌러요)' : seg.cap;
    pill(P.x + 8, P.y + P.h + 10, P.w - 16, 44, '#fff', Sb.p === 0 ? '#cbd5e1' : seg.col);
    tx(P.x + P.w / 2, P.y + P.h + 38, cap, PHONE ? 13 : 15.5, '#1e293b', 'center', 800);
  }

  /* ---------- 장면 ④ : 해양 지각의 나이 ---------- */
  const AG = PHONE ? { S: { x: 10, y: 46, w: 580, h: 170 }, G: { x: 10, y: 228, w: 580, h: 290 }, B: { x: 10, y: 530, w: 580, h: 200 } } : { S: { x: 20, y: 46, w: 760, h: 150 }, G: { x: 20, y: 208, w: 470, h: 336 }, B: { x: 506, y: 208, w: 274, h: 336 } };
  const ageOf = (d) => d / 50; // 5 cm/년 = 50 km/백만 년
  function ageCol(a) { const k = clamp(a / 200, 0, 1); return mixc('#ef4444', '#2563eb', k); }
  function drawAge(t, dt) {
    const A = S.age, s = AG.S, g = AG.G, b = AG.B; A.dS = approach(A.dS, A.d, dt, 6);
    // 해저 띠
    panel(s.x, s.y, s.w, s.h, { fill: '#e8f1f8', title: '해령에서 해구까지 해양 지각의 나이' });
    const x0 = s.x + 36, x1 = s.x + s.w - 70, y0 = s.y + 76, yh = 36;
    for (let x = x0; x < x1; x += 3) { ctx.fillStyle = ageCol(ageOf(((x - x0) / (x1 - x0)) * 10000)); ctx.fillRect(x, y0, 3.5, yh); }
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, yh);
    ctx.fillStyle = '#e25b17'; ctx.beginPath(); ctx.moveTo(x0 - 12, y0 + yh); ctx.lineTo(x0, y0 - 12); ctx.lineTo(x0 + 12, y0 + yh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7b8089'; ctx.fillRect(x1, y0 - 10, 56, yh + 10); tx(x1 + 28, y0 + 14, '대륙', 13, '#fff', 'center', 800);
    tx(x0, y0 + yh + 18, '해령(0 km)', 13, '#475569', 'center', 800); tx(x1, y0 + yh + 18, '해구(10 000 km)', 13, '#475569', 'right', 800);
    const px = x0 + (A.dS / 10000) * (x1 - x0);
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(px, y0 - 18); ctx.lineTo(px, y0 + yh + 6); ctx.stroke(); D.sphere(px, y0 - 20, 8, '#0ea5e9', { shadow: true });
    D.label(Math.min(Math.max(px, s.x + 90), s.x + s.w - 120), y0 - 34, f0(A.d) + ' km → ' + f0(ageOf(A.d)) + ' Ma', { bg: '#0369a1', size: 13, pad: 8 });
    tx(s.x + s.w - 14, s.y + 22, '젊음(붉은색) → 오래됨(파란색)', 12.5, '#475569', 'right', 800);
    // 그래프
    panel(g.x, g.y, g.w, g.h, { title: '해령에서 멀어질수록 나이는? (예시)' });
    const pf = plotFrame(g, { xmin: 0, xmax: 10000, ymin: 0, ymax: 200, xticks: [0, 2500, 5000, 7500, 10000], yticks: [0, 50, 100, 150, 200], l: 56, r: 22, t: 40, b: 46, xlabel: '해령에서 거리 (km)', ylabel: '나이 (Ma = 100만 년)', xfmt: (v) => comma(v) });
    polyline([[pf.gx(0), pf.gy(0)], [pf.gx(10000), pf.gy(200)]], '#2563eb', 3.6);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(pf.gx(A.dS), pf.y1); ctx.lineTo(pf.gx(A.dS), pf.gy(ageOf(A.dS))); ctx.lineTo(pf.x0, pf.gy(ageOf(A.dS))); ctx.stroke(); ctx.setLineDash([]);
    D.sphere(pf.gx(A.dS), pf.gy(ageOf(A.dS)), 8, '#0ea5e9', { shadow: true });
    tx(pf.x0 + 10, pf.gy(190), '해구에서 섭입해 사라져요 →', 12.5, '#475569', 'left', 800);
    // 해양 지각 vs 대륙 암석
    panel(b.x, b.y, b.w, b.h, { title: '가장 오래된 암석 (같은 눈금)' });
    const bw = b.w - 40, bx = b.x + 20; let by = b.y + (PHONE ? 60 : 70);
    tx(bx, by - 8, '해양 지각: 최대 약 2억 년', 13.5, '#334155', 'left', 800); ctx.fillStyle = '#e2e8f0'; rr(bx, by, bw, 24, 8).fill(); ctx.fillStyle = '#2563eb'; rr(bx, by, Math.max(bw * 200 / 4000, 8), 24, 6).fill();
    by += (PHONE ? 60 : 78);
    tx(bx, by - 8, '대륙 암석: 최대 약 40억 년', 13.5, '#334155', 'left', 800); ctx.fillStyle = '#e2e8f0'; rr(bx, by, bw, 24, 8).fill(); ctx.fillStyle = '#7b8089'; rr(bx, by, bw, 24, 8).fill();
    tx(bx, by + 52, '해양 지각은 섭입으로 맨틀에 되돌아가', 13, '#475569', 'left', 700); tx(bx, by + 72, '대륙 지각보다 훨씬 젊어요.', 13, '#475569', 'left', 700);
    tx(b.x + b.w - 14, b.y + 22, '1 : 20', 12.5, '#64748b', 'right', 800);
  }

  function pill(x, y, w, h, bg, border) { D.shadow(() => { ctx.fillStyle = bg; rr(x, y, w, h, h / 2.4).fill(); }, { blur: 5, y: 2 }); if (border) { ctx.strokeStyle = border; ctx.lineWidth = 2; rr(x, y, w, h, h / 2.4).stroke(); } }

  /* ---------- 컨트롤 연결 ---------- */
  const sE = $('#sE'), oE = $('#oE'), sF = $('#sF'), oF = $('#oF'), sAge = $('#sAge'), oAge = $('#oAge');
  const colBtns = $$('#colSeg .opt'), modeBtns = $$('#modeSeg2 .opt'), behBtns = $$('#behSeg .opt'), spdBtns = $$('#spdSeg .opt'), condBtns = $$('#condSeg .opt'), fsels = $$('.fsel');
  const seqSub = makeSeq($('#seqSub'), [{ id: 'a', label: 'A 해구에 퇴적물이 쌓여요' }, { id: 'b', label: 'B 섭입하며 열·압력으로 변성돼요' }, { id: 'c', label: 'C 깊은 곳에서 녹아 마그마가 돼요' }, { id: 'd', label: 'D 분출·관입 후 식어 화성암이 돼요' }, { id: 'e', label: 'E 융기·풍화·침식으로 다시 퇴적물이 돼요' }], { order: ['c', 'e', 'a', 'd', 'b'] });
  const SUB_ANS = 'a,b,c,d,e';
  const setView = (v) => { if (S.view !== v) { S.view = v; S.fade = 1; parts.clear(); } updateCtl(); };
  function updateCtl() {
    $('#tbLabel').textContent = VIEW_LABEL[S.view];
    $$('#ctrlCard .control').forEach((c) => { c.hidden = !c.dataset.modes || !c.dataset.modes.split(' ').includes(S.view); });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.view === S.view); });
    const I = S.ign;
    $('#bRunA').disabled = I.runA; $('#bRunA').textContent = I.doneA ? '▶ A 다시 관입' : I.runA ? 'A 관입 중…' : '▶ A 관입';
    $('#bRunB').disabled = I.runB; $('#bRunB').textContent = I.doneB ? '▶ B 다시 관입' : I.runB ? 'B 관입 중…' : '▶ B 관입';
    $('#selA').value = S.obs.A; $('#selB').value = S.obs.B; $('#selCol').value = S.obs.col; $('#selSheet').value = S.obs.sheet;
    colBtns.forEach((b) => b.classList.toggle('on', +b.dataset.k === S.col.speed));
    $('#bColRun').disabled = S.col.run; $('#bColRun').textContent = S.col.run ? '식는 중…' : S.col.c >= 0.98 ? '▶ 다시 식히기' : '▶ 용암 식히기';
    colBtns.forEach((b) => { b.disabled = S.col.run; });
    setSlider(sE, oE, S.sheet.e, (v) => (+v).toFixed(1) + ' km');
    const F = S.fold;
    modeBtns.forEach((b) => b.classList.toggle('on', b.dataset.k === F.mode));
    behBtns.forEach((b) => { b.classList.toggle('on', b.dataset.k === F.beh && F.mode !== 'shear'); b.disabled = F.mode === 'shear'; });
    setSlider(sF, oF, Math.round(F.f * 100), (v) => v + ' %');
    fsels.forEach((s) => { s.value = F.sel[+s.dataset.i]; });
    spdBtns.forEach((b) => b.classList.toggle('on', SPD_T[+b.dataset.k] === S.speed.t));
    $('#bSubRun').disabled = S.subd.run; $('#bSubRun').textContent = S.subd.run ? '따라가는 중…' : S.subd.seen ? '▶ 다시 따라가기' : '▶ 따라가기';
    condBtns.forEach((b, i) => b.classList.toggle('on', S.cond[i]));
    setSlider(sAge, oAge, S.age.d, (v) => comma(v) + ' km');
  }
  const SEG = (btns, fn) => btns.forEach((b) => b.addEventListener('click', () => { Sound.click(); fn(b); }));
  $('#bRunA').addEventListener('click', () => igRun('A')); $('#bRunB').addEventListener('click', () => igRun('B'));
  $('#bIgReset').addEventListener('click', () => { Sound.click(); igReset(); updateCtl(); });
  [['#selA', 'A'], ['#selB', 'B'], ['#selCol', 'col'], ['#selSheet', 'sheet']].forEach(([id, k]) => $(id).addEventListener('change', (e) => { Sound.click(); S.obs[k] = e.target.value; updateCtl(); }));
  SEG(colBtns, (b) => { if (!S.col.run) { S.col.speed = +b.dataset.k; colReset(); updateCtl(); } });
  $('#bColRun').addEventListener('click', colRun);
  $('#bColReset').addEventListener('click', () => { Sound.click(); colReset(); updateCtl(); });
  bindSlider(sE, oE, (v) => (+v).toFixed(1) + ' km', (v) => { S.sheet.e = v; S.sheet.maxE = Math.max(S.sheet.maxE, v); });
  SEG(modeBtns, (b) => { S.fold.mode = b.dataset.k; updateCtl(); });
  SEG(behBtns, (b) => { if (S.fold.mode !== 'shear') { S.fold.beh = b.dataset.k; updateCtl(); } });
  bindSlider(sF, oF, (v) => v + ' %', (v) => { S.fold.f = v / 100; });
  $('#bFoldReset').addEventListener('click', () => { Sound.click(); const fl = S.fold.fl, sel = S.fold.sel; foldReset(); S.fold.fl = fl; S.fold.sel = sel; updateCtl(); });
  fsels.forEach((s) => s.addEventListener('change', () => { Sound.click(); S.fold.sel[+s.dataset.i] = s.value; updateCtl(); }));
  $('#bBdReset').addEventListener('click', () => { Sound.click(); bdReset(); });
  SEG(spdBtns, (b) => { S.speed.t = SPD_T[+b.dataset.k]; updateCtl(); });
  $('#bSpd').addEventListener('click', spdRecord); $('#inSpd').addEventListener('keydown', (e) => { if (e.key === 'Enter') spdRecord(); });
  $('#bCycWalk').addEventListener('click', () => { Sound.click(); cycReset(false); updateCtl(); });
  $('#bCycAll').addEventListener('click', () => { Sound.click(); cycReset(true); updateCtl(); });
  $('#bSubRun').addEventListener('click', subdRun);
  $('#bSubReset').addEventListener('click', () => { Sound.click(); subdReset(); updateCtl(); });
  SEG(condBtns, (b) => { const i = +b.dataset.k; S.cond = [false, false, false, false]; S.cond[i] = true; updateCtl(); });
  bindSlider(sAge, oAge, (v) => comma(v) + ' km', (v) => { S.age.d = v; });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); clearTimeout(hintTimer); const h = $('#stageHint'); if (h) h.classList.add('hide'); setView(b.dataset.view); }));

  /* ---------- 포인터 ---------- */
  SciSim.pointer(view, {
    down(p) {
      if (S.view === 'bound') return bdBoard.down(p);
      if (S.view === 'cycle') { cycTap(p); return false; }
      return false;
    },
    move(p) { if (S.view === 'bound') bdBoard.move(p); },
    up(p) { if (S.view === 'bound') bdBoard.up(p); },
    hover(p) {
      if (S.view === 'bound') return bdBoard.hit(p) ? 'grab' : 'default';
      if (S.view === 'cycle') return Object.keys(NODES).some((k) => Math.abs(p.x - NODES[k].x) <= CY.nw / 2 + 6 && Math.abs(p.y - NODES[k].y) <= CY.nh / 2 + 6) ? 'pointer' : 'default';
      return 'default';
    },
  });

  /* ---------- 읽기 칸 ---------- */
  function readouts() {
    const v = S.view;
    if (v === 'ign') { const I = S.ign; setReadouts(['A 관입', I.doneA ? '굳었어요' : I.runA ? '진행 중' : '아직', 'B 관입', I.doneB ? '굳었어요' : I.runB ? '진행 중' : '아직', '살펴볼 것', '층리와의 관계']); }
    else if (v === 'col') { const C = S.col; setReadouts(['식는 속도', ['느림', '보통', '빠름'][C.speed - 1], '기둥 굵기', COL_THICK[C.speed - 1], '진행', f0(C.c * 100) + ' %']); }
    else if (v === 'sheet') { const e = S.sheet.eS, h = Math.max(0, 5 - e); setReadouts(['깎여 나간 두께', e.toFixed(1) + ' km', '덮은 암석 두께', h.toFixed(1) + ' km', '압력 (27 MPa × 두께)', f0(27 * h) + ' MPa']); }
    else if (v === 'fold') { const F = S.fold; setReadouts(['힘의 종류', { comp: '압축', tens: '인장', shear: '전단' }[F.mode], '힘의 정도', f0(F.fS * 100) + ' %', '만들어진 구조', foldName()]); }
    else if (v === 'bound') setReadouts(['놓은 카드', bdPlaced() + ' / 6', '맞게 놓음', bdPlaced() === 6 ? (bdOk() ? '모두' : '다시 살펴봐요') : '—', '힘 → 구조', '인장·횡압·전단']);
    else if (v === 'speed') { const sp = S.speed; setReadouts(['시간', SPD_NAME[SPD_T.indexOf(sp.t)], '이동 거리 (0.03 m/년 × 시간)', fmtDist(spdDist(sp.t)), '기록한 값', sp.rec == null ? '—' : sp.rec + ' m']); }
    else if (v === 'cycle') { const C = S.cyc; setReadouts(['지금 암석', NODES[C.node].label, '찾은 경로', cycFound() + ' / 5', '이동 횟수', (C.walk.length - 1) + '번']); }
    else if (v === 'subd') { const Sb = S.subd, q = sbPos(Sb.p); setReadouts(['진행', f0(Sb.p * 100) + ' %', '지금 암석', Sb.p === 0 ? '퇴적물' : ['변성암', '변성암', '마그마', '마그마', '화성암', '화성암', '퇴적물', '퇴적물', '퇴적물'][q.seg], '순서 담음', seqSub.ids().length + ' / 5']); }
    else { const A = S.age; setReadouts(['해령에서 거리', comma(A.d) + ' km', '해양 지각 나이', f0(ageOf(A.d)) + ' Ma', '해양 지각 최대', '약 2억 년']); }
  }

  /* ---------- 단계 ---------- */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    if (li === 0) { igReset(); colReset(); S.col.speed = 2; S.col.done = [false, false, false]; S.col.wasRun = false; S.sheet.e = 0; S.sheet.eS = 0; S.sheet.maxE = 0; S.obs = { A: '', B: '', col: '', sheet: '' }; setView('ign'); showHint('A, B 위치에 마그마를 관입시켜 봐요', 5000); }
    else if (li === 1) { foldReset(); setView('fold'); showHint('힘의 종류와 정도를 바꿔 지층이 어떻게 변하는지 봐요', 5000); }
    else if (li === 2) { bdReset(); S.speed.t = 100; S.speed.rec = null; $('#inSpd').value = ''; setView('bound'); showHint('구조와 암석 카드를 판 경계에 놓아요', 5000); }
    else { cycReset(true); subdReset(); S.subd.seen = false; seqSub.reset(); S.cond = [false, false, false, false]; setView('cycle'); showHint('빛나는 칸을 눌러 암석 알갱이가 되어 여행해요', 5000); }
    updateCtl();
  }
  const tb = (rows) => '<table class="mini">' + rows.map((r, i) => '<tr>' + r.map((c) => (i === 0 ? '<th>' : '<td>') + c + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>').join('') + '</table>';
  const SRC = '<p style="font-size:13.5px;color:var(--muted);margin-top:6px">※ 힘·거리·속도·단면은 모두 교육용 <b>예시 자료·모식도</b>예요.</p>';

  const levels = [
    {
      title: '화성암의 구조: 관입과 절리', short: '화성암 구조', icon: '🌋', phase: '관찰', features: ['ign', 'col', 'sheet'],
      intro: '<p class="si-q">❓ 탐구 질문: 산을 쪼개는 틈과 구부러진 지층, 끊어진 땅은 어떤 힘이 만들었고, 그 힘은 암석을 어디로 데려갈까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 마그마가 식어 화성암이 되고, 관입한 마그마의 열이 주변 암석을 변하게 한다는 것(접촉 변성)을 배웠어요.</div>' +
        '<p>마그마가 지층 사이로 들어오는 모양에 따라 <b>암맥</b>과 <b>암상</b>이 있어요. 관입암 속에는 주변 암석 조각인 <b>포획암</b>이 들어 있기도 해요. 또 암석에는 갈라진 틈인 <b>절리</b>가 생겨요. 용암이 식으며 생기는 <b>주상절리</b>와, 땅속 화강암이 위 암석이 깎여 팽창하며 생기는 <b>판상절리</b>를 만들어 봐요.</p>' + SRC,
      setup() { enterLevel(0); },
      recap: '층리를 가로지르면 암맥, 층리와 나란하면 암상이에요. 주상절리는 수축, 판상절리는 압력 감소로 인한 팽창으로 생기고, 절리는 어긋남이 없는 틈이에요.',
      summary: '<ul><li><b>암맥</b>: 마그마가 층리를 가로질러 관입. <b>암상</b>: 층리와 나란하게 관입. 큰 심성암체는 <b>저반</b>.</li><li>관입암 속의 <b>포획암</b>은 모암 조각이라 모암이 먼저 있었어요. 관입암 주변에는 열을 받은 접촉부(접촉 변성대)가 생겨요.</li><li><b>절리</b>: 암석에 생긴 갈라진 틈(양쪽이 어긋나 움직이지 않음).</li><li><b>주상절리</b>: 두꺼운 용암이 식으며 <b>수축</b>해 육각 기둥(빨리 식을수록 가는 기둥). 제주·한탄강.</li><li><b>판상절리</b>: 땅속 깊은 곳의 암석이 위 암석이 깎여 <b>압력이 줄면 팽창</b>해 표면과 나란한 판 모양(화강암 산·돔).</li></ul>',
      missions: [
        {
          title: '관입과 절리 관찰 기록', manual: true,
          goal: 'A, B에 마그마를 관입시키고, 🔷 주상절리를 만들고(▶ 용암 식히기), 📄 판상절리가 보이게 위 지층을 5.5 km 이상 깎은 뒤 <b>관찰 기록</b>을 채워요. 다 하면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '위의 장면 단추로 🌋 관입, 🔷 주상절리, 📄 판상절리를 오가요. 층리를 가로지르는지, 층리와 나란한지 살펴봐요.',
          setup() { setView('ign'); },
          status: () => '관입 A ' + mark(S.ign.doneA) + ' B ' + mark(S.ign.doneB) + ' · 주상절리 ' + mark(S.col.done.some(Boolean)) + ' · 판상절리 ' + mark(S.sheet.maxE >= 5.5),
          check: () => {
            const I = S.ign, O = S.obs;
            if (!I.doneA || !I.doneB) return 'A와 B 관입을 끝까지 지켜봐요. (🌋 관입 장면)';
            if (!S.col.done.some(Boolean)) return '🔷 주상절리에서 ▶ 용암 식히기를 끝까지 지켜봐요.';
            if (S.sheet.maxE < 5.5) return '📄 판상절리에서 위 지층을 5.5 km 이상 깎아 봐요.';
            if (!O.A || !O.B || !O.col || !O.sheet) return '관찰 기록 네 칸을 모두 채워요.';
            if (O.A !== 'sill') return 'A: 마그마가 층 사이를 따라 층리와 나란히 들어갔어요. 어떤 관입암체일까요?';
            if (O.B !== 'dike') return 'B: 마그마가 층리를 가로질러 올라왔어요. 어떤 관입암체일까요?';
            if (O.col !== 'shrink') return '주상절리는 뜨거운 용암이 식으면서 생겨요. 식으면 부피가 어떻게 될까요?';
            if (O.sheet !== 'unload') return '판상절리는 위 암석이 깎여 나간 뒤 땅속 암석에 생겨요. 누르는 압력이 줄어들면 암석은 어떻게 될까요?';
            return true;
          },
          explain: 'A는 층리와 나란히 들어간 <b>암상</b>, B는 층리를 가로지른 <b>암맥</b>이에요. B 속의 <b>포획암</b>은 마그마가 뚫고 오는 동안 떨어져 나온 모암 조각이에요. <b>주상절리</b>는 식으며 <b>수축</b>해서, <b>판상절리</b>는 위 암석이 깎여 <b>압력이 줄며 팽창</b>해서 생겨요.',
        },
        {
          type: 'quiz', title: '절리와 단층의 차이', goal: '<b>절리</b>와 <b>단층</b>의 가장 큰 차이는?', setup() { setView('col'); },
          choices: ['절리는 퇴적암에서만, 단층은 화성암에서만 생겨요', '절리는 압축력, 단층은 인장력으로만 생겨요', '절리는 갈라진 틈 양쪽이 어긋나 움직이지 않았고, 단층은 어긋나 움직였어요', '절리와 단층은 이름만 다르고 같은 구조예요'],
          answer: 2,
          feedback: ['절리는 화성암·퇴적암·변성암 모두에서 생겨요. 단층도 마찬가지예요.', '힘의 종류로 나누는 것이 아니에요. 단층도 압축·인장·전단력에 따라 종류가 달라요.', '', '둘은 달라요. 갈라진 틈에서 양쪽 암석이 어긋나 움직였는지로 구별해요.'],
          explain: '<b>절리</b>는 암석에 생긴 갈라진 틈이고 양쪽이 <b>어긋나지 않았어요</b>. <b>단층</b>은 지층이 끊어져 양쪽이 <b>어긋난</b> 것이에요.',
        },
      ],
    },
    {
      title: '습곡과 단층: 힘의 방향', short: '습곡·단층', icon: '🧱', phase: '실험', features: ['fold'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 절리는 어긋남 없는 틈이라고 했어요. 이번에는 지층이 <b>휘어지거나(습곡) 끊어져 어긋나는(단층)</b> 구조를 만들어 봐요.</div>' +
        '<p>지층에 <b>횡압력(압축)</b>이 작용하면 휘어져 <b>습곡</b>이 되거나(연성), 끊어져 <b>역단층</b>이 돼요(취성). <b>인장력</b>이 작용하면 <b>정단층</b>이 생겨요. 수평으로 엇갈리게 미는 <b>전단력</b>은 <b>주향 이동 단층</b>을 만들어요. 힘의 방향과 암석의 성질을 바꿔 가며 확인해 봐요.</p>' + SRC,
      setup() { enterLevel(1); },
      recap: '압축력은 습곡·역단층, 인장력은 정단층, 전단력은 주향 이동 단층을 만들어요. 배사의 중심부는 오래된 지층, 향사의 중심부는 젊은 지층이에요.',
      summary: '<ul>' + tb([['힘', '구조', '상반의 움직임'], ['압축(횡압력)', '습곡(휘어짐) · 역단층(끊어짐)', '역단층: 상반이 올라감'], ['인장력', '정단층', '정단층: 상반이 내려감'], ['전단력', '주향 이동 단층', '수평으로 어긋남']]) + '<li><b>습곡</b>: 배사(위로 볼록, 중심부 지층이 가장 오래됨), 향사(아래로 오목, 중심부 지층이 가장 젊음).</li><li><b>단층</b>: 지층이 끊어져 어긋난 것. 단층면 위쪽 암석이 <b>상반</b>, 아래쪽이 <b>하반</b>.</li></ul>',
      missions: [
        {
          title: '힘으로 구조 만들기',
          goal: '힘의 종류와 암석의 성질을 바꿔 <b>습곡 · 역단층 · 정단층 · 주향 이동 단층</b>을 <b>힘 70 % 이상</b>으로 하나씩 만들어요.',
          hint: '습곡: 압축 + 잘 휘어요 / 역단층: 압축 + 잘 부서져요 / 정단층: 인장 + 잘 부서져요 / 주향 이동 단층: 전단. 슬라이더로 힘을 70 % 이상 줘요.',
          hold: 0.4, setup() { foldReset(); setView('fold'); },
          status: () => { const f = S.fold.fl; return '습곡 ' + mark(f.fold) + ' · 역단층 ' + mark(f.rev) + ' · 정단층 ' + mark(f.norm) + ' · 주향 이동 ' + mark(f.strike); },
          check: () => { const f = S.fold.fl; return f.fold && f.rev && f.norm && f.strike; },
          explain: '<b>압축력</b>이 작용하면 잘 휘는 암석은 <b>습곡</b>, 잘 부서지는 암석은 <b>역단층</b>이 돼요. <b>인장력</b>이 작용하면 <b>정단층</b>, 엇갈리게 미는 <b>전단력</b>은 수평으로 어긋나는 <b>주향 이동 단층</b>을 만들어요.',
        },
        {
          title: '배사와 향사 판별', manual: true,
          goal: '압축 + 잘 휘어요로 습곡을 만든 뒤, 지표에 번호를 단 ①·②·③이 <b>배사인지 향사인지</b> 고르고 지층의 나이도 비교해요. 다 고르면 <b>✔ 확인하기</b>를 눌러요.',
          hint: '위로 볼록하게 솟은 곳이 배사, 아래로 오목한 곳이 향사예요. 지표 띠의 색(가~바)을 비교해요. 가가 가장 오래된 지층이에요.',
          setup() { foldReset(); S.fold.mode = 'comp'; S.fold.beh = 'duct'; setView('fold'); },
          status: () => '습곡 만듦 ' + mark(S.fold.mode === 'comp' && S.fold.beh === 'duct' && S.fold.fS >= 0.5) + ' · 고른 칸 ' + S.fold.sel.filter((x) => x).length + ' / 4',
          check: () => {
            const F = S.fold; if (!(F.mode === 'comp' && F.beh === 'duct' && F.fS >= 0.5)) return '먼저 압축 + 잘 휘어요로 힘을 50 % 이상 주어 습곡을 만들어요.';
            const s = F.sel; if (s.some((x) => !x)) return '네 칸을 모두 골라요.';
            if (s[0] !== 'anti') return '①은 지층이 위로 볼록하게 솟은 곳이에요.';
            if (s[1] !== 'syn' || s[2] !== 'syn') return '②·③은 지층이 아래로 오목하게 내려앉은 곳이에요.';
            if (s[3] !== 'old') return '배사의 가운데에서는 아래에 있던 오래된 지층이 지표에 드러나요. 지표 띠의 색(가~바)을 비교해 봐요.';
            return true;
          },
          explain: '①은 위로 볼록한 <b>배사</b>이고, 침식되어 가운데에 <b>가장 오래된 지층</b>이 드러나요. ②·③은 아래로 오목한 <b>향사</b>이고, 가운데에 <b>가장 젊은 지층</b>이 남아요.',
        },
        {
          type: 'quiz', title: '정단층과 역단층', goal: '정단층과 역단층에서 <b>상반의 움직임</b>과 <b>작용한 힘</b>으로 알맞은 것은?', setup() { setView('fold'); },
          choices: ['정단층은 횡압력이 작용해 상반이 올라가고, 역단층은 인장력이 작용해 상반이 내려가요', '정단층은 인장력이 작용해 상반이 내려가고, 역단층은 횡압력이 작용해 상반이 올라가요', '정단층과 역단층 모두 상반이 올라가고, 힘의 종류만 달라요', '정단층은 전단력이 작용해 수평으로 어긋나요'],
          answer: 1,
          feedback: ['반대로 생각했어요. 정단층은 지층이 늘어나는(인장) 곳, 역단층은 밀리는(압축) 곳에서 생겨요.', '', '상반의 움직임이 달라요. 인장이면 상반이 내려가 지각이 늘어나고, 압축이면 상반이 올라가 지각이 짧아져요.', '수평으로 어긋나는 것은 주향 이동 단층이고 전단력이 만들어요.'],
          explain: '<b>정단층</b>은 <b>인장력</b>으로 상반이 <b>내려가고</b>, <b>역단층</b>은 <b>횡압력</b>으로 상반이 <b>올라가요</b>. 정단층은 지각이 늘어나고 역단층은 줄어들어요.',
        },
      ],
    },
    {
      title: '변동대와 지질 구조', short: '변동대 구조', icon: '🌍', phase: '적용', features: ['bound', 'speed'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 힘의 방향(압축·인장·전단)에 따라 구조가 달라지는 것을 확인했어요.</div>' +
        '<p>그 힘은 <b>판의 경계(변동대)</b>마다 달라요. 판이 벌어지는 <b>발산 경계</b>는 인장력, 판이 모이는 <b>수렴 경계</b>는 횡압력, 판이 스치는 <b>보존 경계</b>는 전단력이 작용해요. 경계별 구조와 암석을 짝지어 보고, 단층이 움직이는 속도로 이동 거리를 계산해 봐요.</p>' + SRC,
      setup() { enterLevel(2); },
      recap: '발산 경계는 정단층·열곡과 현무암, 수렴 경계는 습곡 산맥·역단층과 화강암·변성암, 보존 경계는 주향 이동 단층이 나타나요.',
      summary: '<ul>' + tb([['변동대', '힘', '구조 · 암석'], ['발산 경계(해령·열곡)', '인장력', '정단층, 열곡, 현무암질 화산'], ['수렴 경계(섭입대·충돌대)', '횡압력', '습곡 산맥, 역단층, 화산, 화강암·변성암'], ['보존 경계(변환 단층)', '전단력', '주향 이동 단층(산안드레아스 단층)']]) + '<li>이동 거리 = 속도 × 시간. 3 cm/년 × 100년 = 3 m, 3 cm/년 × 1000만 년 = 300 km.</li></ul>',
      missions: [
        {
          title: '판 경계와 구조·암석 짝짓기', manual: true,
          goal: '구조와 암석 카드 6장을 알맞은 <b>판 경계 칸</b>에 놓고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '인장력 → 판이 벌어지는 곳, 횡압력 → 판이 모이는 곳, 전단력 → 판이 스치는 곳을 떠올려요.',
          setup() { bdReset(); setView('bound'); },
          status: () => '놓은 카드 ' + bdPlaced() + ' / 6',
          check: () => {
            if (bdPlaced() < 6) return '카드 6장을 모두 칸에 놓아요.';
            const bad = bdBoard.cards.filter((c) => c.zone !== c.def.z); if (!bad.length) return true;
            const c = bad[0]; return '“' + c.label + '”은(는) ' + BD.find((b) => b.id === c.def.z).name + '에서 나타나요. 다시 살펴봐요.';
          },
          explain: '발산 경계는 <b>인장력</b>이 작용해 <b>정단층·열곡</b>이 생기고 <b>현무암질</b> 화산 활동이 일어나요. 수렴 경계는 <b>횡압력</b>으로 <b>습곡 산맥·역단층</b>이 생기고 <b>화강암·변성암</b>이 만들어져요. 보존 경계는 <b>전단력</b>으로 <b>주향 이동 단층</b>이 생기고 화산 활동은 거의 없어요.',
        },
        {
          title: '단층이 움직인 거리 계산하기',
          goal: '단층이 <b>3 cm/년</b>의 속도로 움직일 때, <b>100년 동안 이동한 거리</b>를 <b>m</b> 단위로 구해 📝 기록해요.',
          hint: '3 cm = 0.03 m예요. 거리 = 0.03 m/년 × 100년.',
          hold: 0.4, setup() { S.speed.rec = null; $('#inSpd').value = ''; setView('speed'); },
          status: () => '100년 이동 거리 기록 ' + mark(spdOk()),
          check: () => spdOk(),
          explain: '거리 = 속도 × 시간 = 0.03 m/년 × 100년 = <b>3 m</b>예요. 같은 속도로 1000만 년이 지나면 0.03 m × 10 000 000 = 300 000 m = <b>300 km</b>나 돼요.',
        },
        {
          type: 'quiz', title: '히말라야 산맥의 구조', goal: '히말라야 산맥에 <b>역단층과 습곡</b>이 많은 까닭은?', setup() { setView('bound'); },
          choices: ['인도 판과 유라시아 판이 충돌하는 수렴 경계라서 강한 횡압력이 작용했기 때문이에요', '두 판이 서로 멀어지는 발산 경계라서 인장력이 작용했기 때문이에요', '두 판이 옆으로 스쳐 지나가는 보존 경계라서 전단력이 작용했기 때문이에요', '화산이 많이 분출해서 지층이 휘어졌기 때문이에요'],
          answer: 0,
          feedback: ['', '발산 경계에서는 인장력으로 정단층과 열곡이 생겨요.', '보존 경계에서는 주향 이동 단층이 생겨요.', '화산 활동이 아니라 판의 충돌이 큰 횡압력을 만들어요.'],
          explain: '히말라야는 인도 판과 유라시아 판이 충돌하는 <b>수렴 경계(충돌대)</b>예요. 강한 <b>횡압력</b>으로 지층이 휘어져 <b>습곡</b>이 생기고 끊어져 <b>역단층</b>이 많이 생겼어요.',
        },
      ],
    },
    {
      title: '암석 순환: 지구시스템의 순환', short: '암석 순환', icon: '🔄', phase: '탐구', features: ['cycle', 'subd', 'age'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 변동대마다 화성암·변성암이 만들어지고 지층이 변형된다는 것을 알았어요.</div>' +
        '<p>마그마가 식어 화성암, 풍화·침식·운반·퇴적·속성을 거쳐 퇴적암, 열과 압력으로 변성암, 녹아서 다시 마그마가 돼요. 암석은 이렇게 돌고 돌아요. 이 순환은 <b>태양 에너지</b>(표면 과정)와 <b>지구 내부 에너지</b>(맨틀 대류, 마그마 생성, 변성, 융기)가 함께 일으켜요. 암석 알갱이가 되어 순환 경로를 직접 만들어 봐요.</p>' + SRC,
      setup() { enterLevel(3); },
      recap: '암석은 태양 에너지와 지구 내부 에너지로 순환해요. 섭입대에서는 퇴적물이 땅속으로 들어가 변성·용융되고, 화산과 융기로 되돌아와요.',
      summary: '<ul><li><b>암석 순환</b>: 마그마 → 화성암 → (풍화·침식·운반·퇴적·속성) 퇴적암 → (열·압력) 변성암 → (융해) 마그마.</li><li><b>지름길</b>: 화성암 → 변성암, 변성암 → 풍화·침식(퇴적물), 퇴적암 → 퇴적물(재퇴적), 화성암·퇴적암 → 마그마(융해).</li><li><b>에너지원</b>: 태양 에너지(풍화·침식·운반·퇴적), 지구 내부 에너지(마그마 생성·변성·융기).</li><li>섭입대는 퇴적물을 땅속으로 끌고 내려가 변성·용융시키고, 마그마는 화산·화성암으로 돌아와요.</li><li>해양 지각은 섭입으로 순환해 최대 약 2억 년, 가장 오래된 대륙 암석은 약 40억 년이에요.</li></ul>',
      missions: [
        {
          title: '순환 경로 다섯 가지 만들기',
          goal: '암석 알갱이가 되어 <b>① 한 바퀴 돌기 ② 화성암 → 변성암 ③ 변성암 → 퇴적물 ④ 퇴적암 → 퇴적물 ⑤ 화성암·퇴적암이 녹기</b>를 모두 찾아요.',
          hint: '마그마에서 시작해 빛나는 칸을 눌러 이동해요. 한 바퀴는 마그마 → 화성암 → 퇴적물 → 퇴적암 → 변성암 → 마그마. 나머지는 지름길 화살표를 찾아봐요.',
          hold: 0.4, setup() { cycReset(true); setView('cycle'); },
          status: () => CYC_FOUND.map((q, i) => '①②③④⑤'[i] + ' ' + mark(S.cyc.found[q[0]])).join(' · '),
          check: () => cycFound() === 5,
          explain: '암석 순환은 한 방향의 길만 있는 것이 아니에요. <b>화성암</b>은 곧바로 <b>변성암</b>이 되거나(열·압력) 녹을 수 있고, <b>변성암</b>은 융기해 풍화·침식을 받아 <b>퇴적물</b>이 되며, <b>퇴적암</b>도 풍화되어 다시 퇴적물이 되거나 녹아 마그마가 돼요.',
        },
        {
          title: '섭입대의 경로와 변성 조건', manual: true,
          goal: '🌊 섭입대에서 <b>▶ 따라가기</b>를 끝까지 본 뒤, 퇴적물이 지나는 다섯 단계를 순서대로 담고 <b>화강암이 변성암이 되는 조건</b>을 골라 <b>✔ 확인하기</b>를 눌러요.',
          hint: '퇴적물은 해구에서 판과 함께 내려가며 변성되고, 더 깊이 가서 녹은 뒤 화산이나 땅속에서 식고, 융기해 다시 풍화돼요. 변성 작용은 녹지 않아요.',
          setup() { subdReset(); S.subd.seen = false; seqSub.reset(); S.cond = [false, false, false, false]; setView('subd'); },
          status: () => '끝까지 따라감 ' + mark(S.subd.seen) + ' · 순서 담음 ' + seqSub.ids().length + ' / 5 · 조건 고름 ' + mark(S.cond.some(Boolean)),
          check: () => {
            if (!S.subd.seen) return '먼저 ▶ 따라가기로 퇴적물의 여행을 끝까지 지켜봐요.';
            const a = seqSub.ids(); if (a.length < 5) return '다섯 단계를 모두 담아요.';
            if (a.join() !== SUB_ANS) { const want = SUB_ANS.split(','), i = a.findIndex((x, k) => x !== want[k]); return (i + 1) + '번째 자리가 아직 맞지 않아요. 쌓인 퇴적물이 내려가 변성되고, 녹아 마그마가 된 뒤 식어 화성암이 돼요.'; }
            if (!S.cond.some(Boolean)) return '화강암이 변성암이 되는 조건을 골라요.';
            if (!S.cond[2]) return S.cond[1] ? '완전히 녹으면 마그마가 돼요. 변성 작용은 녹지 않은 고체 상태에서 일어나요.' : S.cond[0] ? '풍화·침식·운반은 암석이 퇴적물이 되는 과정이에요.' : '지표에서 식는 것은 화성암이 만들어지는 과정이에요.';
            return true;
          },
          explain: '순서는 <b>A 퇴적 → B 섭입·변성 → C 융해(마그마) → D 분출·관입 후 냉각(화성암) → E 융기·풍화·침식(다시 퇴적물)</b>이에요. 화강암 같은 화성암도 <b>녹지 않은 고체 상태에서 높은 열과 압력</b>을 받으면 변성암(예: 화강 편마암)이 돼요.',
        },
        {
          type: 'quiz', title: '암석 순환과 해양 지각의 나이', goal: '암석 순환이 계속되는 까닭과 해양 지각이 대륙 암석보다 훨씬 젊은 까닭으로 알맞은 것은?', setup() { S.age.d = 3000; setView('age'); },
          choices: ['태양 에너지와 지구 내부 에너지가 순환을 계속 일으키고, 해양 지각은 섭입으로 맨틀에 되돌아가 최대 약 2억 년밖에 안 돼요', '암석 순환은 한 번 돌면 멈추고, 해양 지각은 대륙보다 늦게 생긴 암석이라서 젊어요', '지구 내부 에너지만 순환을 일으키고, 해양 지각은 풍화로 사라져서 젊어요', '태양 에너지만 순환을 일으키고, 해양 지각은 대륙 지각과 같은 시기에 만들어졌어요'],
          answer: 0,
          feedback: ['', '암석 순환은 계속 일어나요. 해양 지각이 젊은 까닭은 만들어진 시기가 늦어서가 아니라 섭입으로 계속 되돌아가기 때문이에요.', '지구 내부 에너지(맨틀 대류·마그마·융기)와 함께 태양 에너지(풍화·침식·운반·퇴적)도 필요해요.', '해양 지각은 해령에서 계속 새로 만들어지고 섭입대에서 사라져서 대륙 암석보다 훨씬 젊어요.'],
          explain: '암석 순환은 <b>태양 에너지</b>(풍화·침식·운반·퇴적)와 <b>지구 내부 에너지</b>(맨틀 대류·마그마 생성·변성·융기)가 함께 일으켜요. 해양 지각은 해령에서 생겨 섭입대에서 <b>맨틀로 되돌아가</b> 최대 약 2억 년이고, 대륙에는 약 40억 년 된 암석도 남아 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'he-structures-cycle', mount: '#game', badge: '암석 순환 탐험가', homeHref: '../../index.html#he',
    featureLabels: { ign: '🌋 마그마 관입 단면', col: '🔷 주상절리 만들기', sheet: '📄 판상절리 만들기', fold: '🧱 지층 블록 · 힘의 종류', bound: '🌍 변동대 구조 카드', speed: '⏱ 단층 이동 거리 계산', cycle: '🔄 암석 순환도', subd: '🌊 섭입대 경로', age: '📊 해양 지각 나이 그래프' },
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
      case 'ign': drawIgn(t, dt); break; case 'col': drawCol(t, dt); break; case 'sheet': drawSheet(t, dt); break;
      case 'fold': drawFold(t, dt); break; case 'bound': drawBound(t, dt); break; case 'speed': drawSpeed(t, dt); break;
      case 'cycle': drawCycle(t, dt); break; case 'subd': drawSubd(t, dt); break; default: drawAge(t, dt);
    }
    if (S.view !== 'fold') S.fold.fS = approach(S.fold.fS, S.fold.f, dt, 4);
    parts.draw(ctx);
    drawFlash(dt, PHONE ? 10 : VH - 96);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,247,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, IG, FG, CY, NODES, EDGES, SB, AG, SG, CG, SPD, bdBoard, seqSub, igRun, igReset, colRun, cycGo, cycTap, cycReset, subdRun, setView, updateCtl, enterLevel, foldReset, foldName, tpxy: null, BD_CARDS,
    get game() { return game; },
  };

})();
