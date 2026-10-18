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


  /* =========================================================
     통합과학2 Ⅱ. 환경과 에너지 - 태양 에너지의 생성과 전환
     [10통과2-02-04] 수소 핵융합으로 질량 일부가 에너지로 바뀌고, 그중 일부가 지구에서 에너지 흐름을 일으키며 전환되는 과정을 추론
     ① 모형: 핵융합(온도 → 속도 → 융합)   ② 설명: 질량 → 에너지(질량 막대 100 → 99.3)
     ③ 탐구: 지구의 에너지 흐름(반사 30 · 흡수 70 → 다섯 갈래)   ④ 적용: 에너지의 근원 분류와 전환 사슬
     ========================================================= */
  initStage('#10162b', 800, 560, 600, 840, 1.28);

  /* ---------- 상수 (본문의 숫자는 모두 여기서 가져와요) ---------- */
  const K = {
    T_SUN: 1500, T_MIN: 100, T_MAX: 2000, T_OK: 1000,                    // 온도 (만 K)
    H_MASS: 100, HE_MASS: 99.3,                                            // 수소 핵 4개 / 헬륨 핵 1개의 질량 (상대값)
    E_PER_G: 9e13, HOME_J_YR: 1.3e10,                                      // 1 g이 모두 에너지가 될 때 (J), 한 가정의 연간 전기 사용량 (J)
    SUN_FUSE: 600,                                                         // 태양이 매초 융합하는 수소 (백만 톤)
    M_SUN: 2.0e30, COAL_J: 3.0e7, L_SUN: 3.8e26, SEC_YR: 3.15e7,           // 태양 질량(kg), 석탄 1 kg의 에너지(J), 태양 복사 출력(W), 1년(초)
    R_EARTH: 6.37e6, D_ES: 1.5e11,                                         // 지구 반지름, 지구-태양 거리 (m)
    IN: 100, REFL: 30, ABS: 70, HEAT: 45.9, WATER: 22, WIND: 1.5, CURR: 0.5, PHOTO: 0.1,   // 지구로 온 에너지의 흐름 (입사 100 기준, 단순화)
    // 핵융합 모형 (화면 속 입자의 움직임)
    VS: 150, KR: 450000, RF: 17, RP: 10, RD: 14, N0: 20,
  };
  K.LOSS = Math.round((K.H_MASS - K.HE_MASS) * 10) / 10;                  // 줄어든 질량 (0.7)
  K.LOSS_PCT = Math.round(K.LOSS / K.H_MASS * 1000) / 10;                  // 줄어든 비율 (%)
  K.SUN_LOSS = Math.round(K.SUN_FUSE * K.LOSS_PCT / 100 * 10) / 10;       // 태양이 매초 에너지로 바꾸는 질량 (백만 톤)
  K.COAL_YR = K.M_SUN * K.COAL_J / K.L_SUN / K.SEC_YR;                     // 태양이 석탄처럼 탄다면 빛날 수 있는 햇수
  K.EARTH_SHARE = K.R_EARTH * K.R_EARTH / (4 * K.D_ES * K.D_ES);           // 태양이 내보내는 에너지 중 지구에 닿는 비율
  K.PATHS_SUM = K.HEAT + K.WATER + K.WIND + K.CURR + K.PHOTO;
  const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const supOf = (n) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUP[+c])).join('');
  const sci = (x) => { if (!(x > 0)) return '0'; const e = Math.floor(Math.log10(x)); return (x / Math.pow(10, e)).toFixed(1) + ' × 10' + supOf(e); };
  const sig = (x, n) => Number(x.toPrecision(n));
  const yrTxt = (y) => (y >= 1e4 ? '약 ' + Math.round(y / 1000) * 1000 : '약 ' + Math.round(y / 100) * 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '년';
  const coalTxt = () => '약 ' + String(Math.round(K.COAL_YR / 1000)) + '천 년';
  const shareTxt = () => '약 ' + Math.round(sig(1 / K.EARTH_SHARE, 1) / 1e8) + '억분의 1';
  const annualHomes = (M) => K.LOSS_PCT / 100 * M * K.E_PER_G / K.HOME_J_YR;

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'fusion', clock: 0, fade: 0,
    T: 300, Ts: 300,
    // 질량 장면
    M: 100, fuseT: -1, fuseDone: false, fuseCount: 0, fseen: 0,
    // 흐름 장면
    sel: -1, visited: new Set(), pkt: null,
    // 적용
    subAp: 'sort', apOK: 0, acts: new Set(), chainOK: 0,
  };
  const textW = (s, size, w) => { ctx.save(); ctx.font = D.font(size, w || 700); const r = ctx.measureText(s).width; ctx.restore(); return r; };
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const FORM = { 빛: '#f59e0b', 열: '#ef4444', 화학: '#16a34a', 위치: '#8b5cf6', 운동: '#0ea5e9', 전기: '#ca8a04' };

  /* =========================================================
     장면 1 : 태양 중심부의 핵융합 (수소 핵 → 헬륨 핵)
     ========================================================= */
  const FL = PHONE
    ? { ax: 20, ay: 74, cw: 560, ch: 380, sx: 20, sy: 466, sw: 560, sh: 76, px: 14, py: 552, pw: 572, ph: 280 }
    : { ax: 30, ay: 36, cw: 520, ch: 372, sx: 30, sy: 422, sw: 520, sh: 86, px: 570, py: 30, pw: 220, ph: 478 };
  const NP = Math.round(K.N0 * (FL.cw * FL.ch) / (520 * 330));
  const FU = { ps: [], he: [], rings: [], pp: 0, dd: 0, heHigh: 0, heTotal: 0, sp: 0 };
  const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
  function fuSpawn(kind, x, y) {
    const m = kind === 'p' ? 1 : 2, s = K.VS * Math.sqrt(S.Ts / K.T_SUN) / Math.sqrt(m), r = kind === 'p' ? K.RP : K.RD;
    if (x == null) {
      for (let k = 0; k < 10; k++) { x = rnd(r + 4, FL.cw - r - 4); y = rnd(r + 4, FL.ch - r - 4); if (FU.ps.every((q) => Math.hypot(q.x - x, q.y - y) > 34)) break; }
    }
    const p = { k: kind, m, r, x, y, vx: gauss() * s / Math.SQRT2, vy: gauss() * s / Math.SQRT2, s: 0, rot: rnd(0, TAU), vr: rnd(-1, 1) };
    FU.ps.push(p); return p;
  }
  function fuReset() {
    FU.ps.length = 0; FU.he.length = 0; FU.rings.length = 0; FU.pp = FU.dd = FU.heHigh = FU.heTotal = 0; FU.sp = 0;
    for (let i = 0; i < NP; i++) { const p = fuSpawn('p'); p.s = 1; }
  }
  function fuFlash(x, y, big) { FU.rings.push({ x, y, t: 0, big }); if (!RM) parts.burst(FL.ax + x, FL.ay + y, { count: big ? 16 : 7, speed: big ? 190 : 110, size: big ? 4 : 3, life: big ? 1.0 : 0.6, gravity: 0, colors: ['#fde047', '#fff7ae', '#fb923c', '#fff'], shape: 'star' }); }
  function fuStep(dt) {
    S.Ts = approach(S.Ts, S.T, dt, 3);
    const nsub = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / nsub, ps = FU.ps;
    for (let sIdx = 0; sIdx < nsub; sIdx++) {
      const n = ps.length, ax = new Array(n).fill(0), ay = new Array(n).fill(0);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const dx = ps[j].x - ps[i].x, dy = ps[j].y - ps[i].y, d = Math.sqrt(dx * dx + dy * dy) + 1e-6, dd = Math.max(d, 8), f = K.KR / (dd * dd), fx = f * dx / d, fy = f * dy / d;
        ax[i] -= fx / ps[i].m; ay[i] -= fy / ps[i].m; ax[j] += fx / ps[j].m; ay[j] += fy / ps[j].m;
      }
      let ke = 0;
      for (let i = 0; i < n; i++) {
        const p = ps[i]; p.vx += ax[i] * h; p.vy += ay[i] * h;
        const sp = Math.hypot(p.vx, p.vy); if (sp > 520) { p.vx *= 520 / sp; p.vy *= 520 / sp; }
        p.x += p.vx * h; p.y += p.vy * h; p.rot += p.vr * h;
        if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx); } if (p.x > FL.cw - p.r) { p.x = FL.cw - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy); } if (p.y > FL.ch - p.r) { p.y = FL.ch - p.r; p.vy = -Math.abs(p.vy); }
        ke += p.m * (p.vx * p.vx + p.vy * p.vy);
      }
      if (n) { ke /= n; const tgt = K.VS * K.VS * (S.Ts / K.T_SUN), sc = Math.sqrt(tgt / Math.max(ke, 1)), f = 1 + (sc - 1) * Math.min(1, 2 * h); for (let i = 0; i < n; i++) { ps[i].vx *= f; ps[i].vy *= f; } }
      // 융합: 같은 종류 두 입자가 충분히 가까워지면 하나로
      outer: for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j]; if (a.k !== b.k || a.s < 0.9 || b.s < 0.9) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) < K.RF) {
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          if (a.k === 'p') {
            const m = fuSpawn('d', mx, my); m.vx = (a.vx + b.vx) / 2; m.vy = (a.vy + b.vy) / 2; m.s = 0.6;
            ps.splice(j, 1); ps.splice(i, 1); FU.pp++; fuFlash(mx, my, false); Sound.tick();
          } else {
            ps.splice(j, 1); ps.splice(i, 1); FU.dd++; FU.heTotal++; if (S.Ts >= K.T_OK - 1) FU.heHigh++;
            if (FU.he.length >= 10) FU.he.shift();
            FU.he.push({ x: mx, y: my, tx: 0, s: 0.2, rot: 0 });
            fuFlash(mx, my, true); Sound.success();
            if (!RM) for (let k = 0; k < 6; k++) parts.emit({ x: FL.ax + mx, y: FL.ay + my, vx: rnd(-60, 60), vy: -rnd(110, 220), life: 1.1, size: 4, color: '#fde047', shape: 'star', gravity: 0, drag: 0.4 });
          }
          break outer;
        }
      }
      // 수소 핵 보충
      FU.sp += h;
      const np = ps.filter((q) => q.k === 'p').length;
      if (np < NP && FU.sp > 0.45) { FU.sp = 0; fuSpawn('p'); }
    }
    ps.forEach((p) => { p.s = approach(p.s, 1, dt, 5); });
    for (let i = FU.rings.length - 1; i >= 0; i--) { FU.rings[i].t += dt; if (FU.rings[i].t > 0.9) FU.rings.splice(i, 1); }
    const step = Math.min(46, (FL.sw - 60) / 10), ty = FL.sy + FL.sh * 0.6 - FL.ay;
    FU.he.forEach((q, k) => { q.tx = 34 + k * step; q.s = approach(q.s, 1, dt, 4); q.x = approach(q.x, q.tx, dt, 3.2); q.y = approach(q.y, ty, dt, 3.2); q.rot += dt * 0.6; });
  }
  function drawNuc(kind, x, y, s, rot) {
    if (s < 0.03) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (kind === 'p') { D.sphere(0, 0, K.RP, '#ef4444', { text: '+', textScale: 1.25, shadow: true }); }
    else if (kind === 'd') { ctx.rotate(rot); D.sphere(-6.5, 0, 9, '#3b82f6', { shadow: true }); D.sphere(6.5, 0, 9, '#ef4444', { text: '+', textScale: 1.1 }); }
    else { ctx.rotate(rot); D.glow(0, 0, 34, '#fde047', 0.7); [[-7.5, -7.5, '#ef4444'], [7.5, -7.5, '#3b82f6'], [-7.5, 7.5, '#3b82f6'], [7.5, 7.5, '#ef4444']].forEach(([a, b, c]) => D.sphere(a, b, 9.5, c, { gloss: true })); }
    ctx.restore();
  }
  const tcolor = (T) => SciSim.color.mix('#7f1d1d', '#fde68a', smoothstep(100, 2000, T));
  function infoCard(x, y, w, h, title, rows, col) {
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(x, y, w, h, 12).fill(); }, { blur: 5, y: 2 });
    D.text(x + 12, y + 24, title, { size: 14.5, weight: 800, color: col || '#334155', align: 'left' });
    rows.forEach((r, i) => { const yy = y + 26 + (i + 1) * 24 * FS * 0.92; D.text(x + 12, yy, r[0], { size: 13.5, weight: 700, color: '#475569', align: 'left' }); D.text(x + w - 12, yy, r[1], { size: 15.5, weight: 800, color: r[2] || '#0f172a', align: 'right' }); });
  }
  function drawFusion(t) {
    const { ax, ay, cw, ch } = FL;
    // 중심부 방: 온도가 높을수록 밝아져요
    const warm = tcolor(S.Ts);
    D.shadow(() => { ctx.fillStyle = '#1b1226'; rr(ax - 10, ay - 10, cw + 20, FL.sy + FL.sh - ay + 20, 18).fill(); }, { blur: 14, y: 4, color: 'rgba(0,0,0,.45)' });
    ctx.save(); rr(ax, ay, cw, ch, 14).clip();
    const g = ctx.createRadialGradient(ax + cw / 2, ay + ch / 2, 20, ax + cw / 2, ay + ch / 2, Math.max(cw, ch) * 0.7);
    g.addColorStop(0, SciSim.color.mix(warm, '#ffffff', 0.25)); g.addColorStop(0.6, SciSim.color.shade(warm, -0.35)); g.addColorStop(1, SciSim.color.shade(warm, -0.7));
    ctx.fillStyle = g; ctx.fillRect(ax, ay, cw, ch);
    ctx.translate(ax, ay);
    // 입자들
    FU.ps.forEach((p) => drawNuc(p.k, p.x, p.y, p.s, p.rot));
    FU.rings.forEach((r) => { const k = r.t / 0.9; ctx.strokeStyle = 'rgba(255,247,174,' + (1 - k) + ')'; ctx.lineWidth = r.big ? 5 : 3; ctx.beginPath(); ctx.arc(r.x, r.y, 10 + k * (r.big ? 70 : 38), 0, TAU); ctx.stroke(); if (r.big && k < 0.4) D.glow(r.x, r.y, 70, '#fff7ae', 0.8 * (1 - k / 0.4)); });
    ctx.restore();
    ctx.strokeStyle = SciSim.color.mix('#fb923c', '#fde047', smoothstep(100, 2000, S.Ts)); ctx.lineWidth = 3.5; rr(ax, ay, cw, ch, 14).stroke();
    // 속도 화살표 한 개 (온도 → 속도)
    D.text(ax + 12, ay + 22, '수소 핵(양성자)은 서로 밀어내요', { size: 13.5, weight: 800, color: 'rgba(255,255,255,.9)', align: 'left', stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    // 헬륨 저장 구역
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(FL.sx, FL.sy, FL.sw, FL.sh, 12).fill(); }, { blur: 2, y: 1 });
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); rr(FL.sx, FL.sy, FL.sw, FL.sh, 12).stroke(); ctx.setLineDash([]);
    D.text(FL.sx + 12, FL.sy + 20, '만들어진 헬륨 핵', { size: 13.5, weight: 800, color: '#fde68a', align: 'left' });
    D.text(FL.sx + FL.sw - 12, FL.sy + 20, '× ' + FU.heTotal, { size: 16, weight: 800, color: '#fff', align: 'right' });
    FU.he.forEach((q) => { drawNuc('he', FL.ax + q.x, FL.ay + q.y, q.s * 0.78, q.rot); });
    // 오른쪽(아래) 정보 카드
    const np = FU.ps.filter((q) => q.k === 'p').length, nd = FU.ps.filter((q) => q.k === 'd').length;
    const px = FL.px, py = FL.py, pw = FL.pw;
    if (!PHONE) {
      infoCard(px, py, pw, 118, '온도', [['지금', Math.round(S.Ts) + '만 K'], ['태양 중심부', K.T_SUN + '만 K']], '#c2410c');
      // 온도 막대
      const bx = px + 12, bw = pw - 24, by = py + 96;
      ctx.fillStyle = '#e5e7eb'; rr(bx, by, bw, 12, 6).fill(); ctx.fillStyle = tcolor(S.Ts); rr(bx, by, Math.max(12, bw * (S.Ts - K.T_MIN) / (K.T_MAX - K.T_MIN)), 12, 6).fill();
      const sx = bx + bw * (K.T_SUN - K.T_MIN) / (K.T_MAX - K.T_MIN); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, by - 4); ctx.lineTo(sx, by + 16); ctx.stroke();
      infoCard(px, py + 130, pw, 150, '입자 수', [['수소 핵', String(np)], ['융합 중간 입자', String(nd)], ['수소 + 수소 융합', FU.pp + '번'], ['헬륨 핵 생성', FU.heTotal + '개', '#b45309']]);
      D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(px, py + 292, pw, 154, 12).fill(); }, { blur: 5, y: 2 });
      D.text(px + 12, py + 316, '핵융합 반응', { size: 14.5, weight: 800, color: '#334155', align: 'left' });
      drawNuc('p', px + 26, py + 352, 0.9, 0); drawNuc('p', px + 56, py + 352, 0.9, 0); drawNuc('p', px + 86, py + 352, 0.9, 0); drawNuc('p', px + 116, py + 352, 0.9, 0);
      D.text(px + pw / 2, py + 392, '4개 → 1개', { size: 16, weight: 800, color: '#0f172a' });
      drawNuc('he', px + 40, py + 424, 0.62, t * 0.4); D.text(px + 66, py + 430, '헬륨 핵 + 빛(에너지)', { size: 13.5, weight: 800, color: '#b45309', align: 'left' });
    } else {
      infoCard(px, py, 280, 124, '온도', [['지금', Math.round(S.Ts) + '만 K'], ['태양 중심부', K.T_SUN + '만 K']], '#c2410c');
      const bx = px + 12, bw = 256, by = py + 98;
      ctx.fillStyle = '#e5e7eb'; rr(bx, by, bw, 12, 6).fill(); ctx.fillStyle = tcolor(S.Ts); rr(bx, by, Math.max(12, bw * (S.Ts - K.T_MIN) / (K.T_MAX - K.T_MIN)), 12, 6).fill();
      const sx = bx + bw * (K.T_SUN - K.T_MIN) / (K.T_MAX - K.T_MIN); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, by - 4); ctx.lineTo(sx, by + 16); ctx.stroke();
      infoCard(px + 292, py, 280, 124, '입자 수', [['수소 핵', String(np)], ['융합 중간 입자', String(nd)], ['헬륨 핵 생성', FU.heTotal + '개', '#b45309']]);
      D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(px, py + 138, 572, 128, 12).fill(); }, { blur: 5, y: 2 });
      D.text(px + 14, py + 166, '핵융합 반응', { size: 15, weight: 800, color: '#334155', align: 'left' });
      [0, 1, 2, 3].forEach((i) => drawNuc('p', px + 40 + i * 34, py + 214, 1, 0)); D.text(px + 214, py + 220, '→', { size: 24, weight: 800, color: '#0f172a' });
      drawNuc('he', px + 270, py + 214, 0.85, t * 0.4); D.text(px + 306, py + 220, '헬륨 핵 1개 + 빛(에너지)', { size: 15, weight: 800, color: '#b45309', align: 'left' });
    }
  }

  /* =========================================================
     장면 2 : 질량 → 에너지 (질량 막대 100 → 99.3, 맨 위 확대)
     ========================================================= */
  const MS = PHONE ? { tx: 40, ty: 44, cx: 14, cy: 530, cw: 572, ch: 300 } : { tx: 8, ty: 54, cx: 546, cy: 64, cw: 244, ch: 440 };
  const CH = { by: 412, ppu: 3.3, b1x: 64, b2x: 206, bw: 92, ix: 332, iy: 40, iw: 176, ih: 236, lo: 99.0, hi: 100.2 };
  const insetPPU = () => CH.ih / (CH.hi - CH.lo);
  const zoomX = () => Math.round(insetPPU() / CH.ppu);
  const fz = { v: 0 };            // 융합 진행 (0 → 1), 헬륨 막대의 높이와 에너지 방출
  function startFuse() { fz.v = 0; S.fuseT = 0; S.fuseDone = false; S.fseen = 0; }
  function stepMass(dt) {
    if (S.fuseT >= 0 && !S.fuseDone) {
      S.fuseT += dt; fz.v = clamp(S.fuseT / 2.8, 0, 1);
      if (fz.v >= 0.5 && S.fseen === 0) { S.fseen = 1; const x = MS.tx + CH.b2x + CH.bw / 2, y = MS.ty + CH.by - CH.ppu * K.HE_MASS; if (!RM) for (let i = 0; i < 18; i++) parts.emit({ x, y, vx: rnd(-90, 190), vy: -rnd(30, 190), life: 1.6, size: 4.5, color: i % 2 ? '#fde047' : '#fff7ae', shape: 'star', drag: 0.6 }); Sound.success(); }
      if (fz.v >= 1) { S.fuseDone = true; S.fuseCount++; }
    }
  }
  function barY(v) { return CH.by - CH.ppu * v; }
  function drawMass(t) {
    ctx.save(); ctx.translate(MS.tx, MS.ty);
    const f = fz.v, started = S.fuseT >= 0;
    // 막대 그래프 틀
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(0, -4, 520, 486, 16).fill(); }, { blur: 8, y: 3 });
    D.text(16, 22, '질량 (수소 핵 4개 = 100)', { size: 15, weight: 800, color: '#334155', align: 'left' });
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(40, CH.by); ctx.lineTo(306, CH.by); ctx.stroke();
    [0, 50, 100].forEach((v) => { const y = barY(v); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(306, y); ctx.stroke(); D.text(34, y + 4.5, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    // 막대 1: 수소 핵 4개 (융합 전)
    const h1 = CH.ppu * K.H_MASS, g1 = ctx.createLinearGradient(0, barY(100), 0, CH.by); g1.addColorStop(0, '#f87171'); g1.addColorStop(1, '#b91c1c');
    ctx.fillStyle = g1; rr(CH.b1x, barY(100), CH.bw, h1, 6).fill();
    D.text(CH.b1x + CH.bw / 2, barY(100) - 8, String(K.H_MASS), { size: 17, weight: 800, color: '#7f1d1d' });
    // 막대 2: 헬륨 핵 1개 (융합 후)
    const hv = started ? K.HE_MASS * smoothstep(0, 0.45, f) : 0, extra = started ? (K.H_MASS - K.HE_MASS) * (1 - smoothstep(0.45, 0.62, f)) * smoothstep(0, 0.45, f) : 0;
    if (!started) { ctx.setLineDash([7, 6]); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; rr(CH.b2x, barY(100), CH.bw, h1, 6).stroke(); ctx.setLineDash([]); D.text(CH.b2x + CH.bw / 2, barY(50), '융합 후?', { size: 15, weight: 800, color: '#94a3b8' }); }
    else {
      const top = hv + extra, g2 = ctx.createLinearGradient(0, barY(top), 0, CH.by); g2.addColorStop(0, '#fbbf24'); g2.addColorStop(1, '#b45309');
      ctx.fillStyle = g2; rr(CH.b2x, barY(top), CH.bw, CH.ppu * top, 6).fill();
      if (f > 0.5) D.text(CH.b2x + CH.bw / 2, barY(top) - 8, String(K.HE_MASS), { size: 17, weight: 800, color: '#78350f' });
    }
    D.text(CH.b1x + CH.bw / 2, CH.by + 22, '수소 핵 4개', { size: 14, weight: 800, color: '#334155' });
    D.text(CH.b2x + CH.bw / 2, CH.by + 22, '헬륨 핵 1개', { size: 14, weight: 800, color: '#334155' });
    [0, 1, 2, 3].forEach((i) => drawNuc('p', CH.b1x + 14 + i * 21.5, CH.by + 52, 0.78, 0));
    drawNuc('he', CH.b2x + CH.bw / 2, CH.by + 52, 0.7, t * 0.4);
    // 확대할 부분 표시 (막대 맨 위)
    const zy0 = barY(CH.hi), zy1 = barY(CH.lo);
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.strokeRect(CH.b1x - 8, zy0, CH.b2x + CH.bw - CH.b1x + 16, zy1 - zy0);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(37,99,235,.7)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(CH.b2x + CH.bw + 8, zy0); ctx.lineTo(CH.ix, CH.iy); ctx.moveTo(CH.b2x + CH.bw + 8, zy1); ctx.lineTo(CH.ix, CH.iy + CH.ih); ctx.stroke(); ctx.setLineDash([]);
    // 확대 창
    D.shadow(() => { ctx.fillStyle = '#f8fbff'; rr(CH.ix, CH.iy, CH.iw, CH.ih, 12).fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; rr(CH.ix, CH.iy, CH.iw, CH.ih, 12).stroke();
    D.text(CH.ix + CH.iw / 2, CH.iy - 10, '맨 위 약 ' + zoomX() + '배 확대', { size: 14, weight: 800, color: '#2563eb' });
    const iy = (v) => CH.iy + CH.ih - insetPPU() * (v - CH.lo);
    ctx.save(); rr(CH.ix, CH.iy, CH.iw, CH.ih, 12).clip();
    [99.0, 99.5, 100.0].forEach((v) => { ctx.strokeStyle = '#dbe5f1'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(CH.ix + 40, iy(v)); ctx.lineTo(CH.ix + CH.iw - 6, iy(v)); ctx.stroke(); D.text(CH.ix + 36, iy(v) + 4.5, v.toFixed(1), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    ctx.fillStyle = g1; ctx.fillRect(CH.ix + 48, iy(100), 42, CH.iy + CH.ih - iy(100));
    if (started) {
      const top = hv + extra; ctx.fillStyle = '#d97706'; ctx.fillRect(CH.ix + 106, iy(Math.min(top, CH.hi)), 42, CH.iy + CH.ih - iy(Math.min(top, CH.hi)));
      // 사라진 질량: 헬륨 막대 위의 빈 부분 (점선 상자) → 빛으로
      const lost = K.LOSS, tl = iy(K.H_MASS), bl = iy(K.HE_MASS), a = f < 0.62 ? 0.25 : 0.75 * (1 - smoothstep(0.62, 0.95, f)) + 0.12;
      if (f > 0.45) { ctx.fillStyle = 'rgba(253,224,71,' + a + ')'; ctx.fillRect(CH.ix + 106, tl, 42, bl - tl); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.strokeRect(CH.ix + 106, tl, 42, bl - tl); ctx.setLineDash([]); }
    }
    ctx.restore();
    D.text(CH.ix + 69, CH.iy + CH.ih - 6, '수소 4개', { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(127,29,29,.6)', strokeWidth: 3 });
    // 줄어든 질량 표시 (확대 창 밖에 말풍선)
    if (started && f > 0.55) {
      const yy = (iy(K.H_MASS) + iy(K.HE_MASS)) / 2, aa = smoothstep(0.55, 0.75, f);
      ctx.save(); ctx.globalAlpha = aa;
      D.arrow(CH.ix + 156, yy, CH.ix + 150, yy, { color: '#d97706', width: 2, head: 8 });
      D.label(CH.ix + CH.iw - 4, iy(K.H_MASS) - 12 - 0, '줄어든 질량 ' + K.LOSS, { bg: '#d97706', size: 13.5, pad: 7, align: 'right' });
      ctx.restore();
    }
    // 빛 광선 (질량이 에너지로)
    if (started && f > 0.62 && !RM) {
      const x0 = CH.b2x + CH.bw / 2, y0 = barY(K.HE_MASS), a = smoothstep(0.62, 0.8, f) * (1 - smoothstep(0.92, 1, f) * 0.3);
      ctx.save(); ctx.globalAlpha = a; D.glow(x0, y0 - 10, 70, '#fde047', 0.9);
      for (let i = 0; i < 8; i++) { const ang = -Math.PI / 2 + (i - 3.5) * 0.28, L = 26 + 10 * Math.sin(t * 6 + i); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0 + Math.cos(ang) * 38, y0 - 10 + Math.sin(ang) * 38); ctx.lineTo(x0 + Math.cos(ang) * (38 + L), y0 - 10 + Math.sin(ang) * (38 + L)); ctx.stroke(); }
      ctx.restore();
      D.label(x0, y0 - 92, '빛에너지', { bg: '#f59e0b', size: 14, pad: 8 });
    }
    ctx.restore();
    // 크기 감각 카드
    const c = MS, M = S.M, dm = K.LOSS_PCT / 100 * M, E = dm * K.E_PER_G, shown = S.fuseDone;
    const cardW = PHONE ? 572 : c.cw, pitch = PHONE ? 22 : 26;
    const lines1 = [['융합하는 수소', M + ' g'], ['줄어드는 질량 (' + K.LOSS_PCT + ' %)', shown ? f1(dm) + ' g' : '?'], ['바뀌는 에너지', shown ? sci(E) + ' J' : '?', '#b45309'], ['가정 전기 사용 햇수', shown ? yrTxt(annualHomes(M)) : '?']];
    const hh = 38 + lines1.length * pitch * FS * 0.92;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(c.cx, c.cy, cardW, hh, 14).fill(); }, { blur: 6, y: 2 });
    D.text(c.cx + 14, c.cy + 25, '크기 감각 ①', { size: 14.5, weight: 800, color: '#b45309', align: 'left' });
    lines1.forEach((r, i) => { const yy = c.cy + 26 + (i + 1) * pitch * FS * 0.92; D.text(c.cx + 14, yy, r[0], { size: 13, weight: 700, color: '#475569', align: 'left' }); D.text(c.cx + cardW - 14, yy, r[1], { size: 15, weight: 800, color: r[2] || '#0f172a', align: 'right' }); });
    const y2 = c.cy + hh + (PHONE ? 8 : 12), x2 = c.cx, h2 = PHONE ? 832 - y2 : 232;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(x2, y2, cardW, h2, 14).fill(); }, { blur: 6, y: 2 });
    D.text(x2 + 14, y2 + 25, '크기 감각 ②', { size: 14.5, weight: 800, color: '#b45309', align: 'left' });
    const l2 = ['1 g이 모두 에너지가 되면 약 ' + sci(K.E_PER_G) + ' J이에요.', '태양은 매초 약 ' + (K.SUN_FUSE / 100) + '억 톤의 수소를 융합해요.', '그중 약 ' + Math.round(K.SUN_LOSS * 100) + '만 톤의 질량이 에너지로 바뀌어요.'];
    let yy = y2 + 48; l2.forEach((s) => { const ls = wrapLines(s, cardW - 28, 13, 700); ls.forEach((ln) => { D.text(x2 + 14, yy, ln, { size: 13, weight: 700, color: '#334155', align: 'left' }); yy += 19 * FS * (PHONE ? 0.85 : 0.95); }); yy += 4; });
  }

  /* =========================================================
     장면 3 : 지구의 에너지 흐름 (반사 30 · 흡수 70 → 다섯 갈래)
     ========================================================= */
  const FM = (a) => (Math.abs(a - Math.round(a)) < 1e-9 ? String(Math.round(a)) : f1(a));
  const PATHS = [
    { id: 'heat', name: '열', sub: '대기와 지표를 데워요', v: K.HEAT, chain: ['빛', '열'], note: '흡수된 빛에너지는 대부분 <b>열에너지</b>가 되어 대기와 지표를 데우고, 이 열이 기온을 만들어요.' },
    { id: 'water', name: '증발·구름·비', sub: '물의 순환', v: K.WATER, chain: ['빛', '열', '위치', '운동'], note: '열에너지로 바다의 물이 증발해(수증기) 높이 올라 구름이 되고(<b>위치 에너지</b>), 비로 내려 강물이 흘러요(<b>운동 에너지</b>).' },
    { id: 'wind', name: '바람', sub: '공기의 움직임', v: K.WIND, chain: ['빛', '열', '운동'], note: '지표가 <b>불균등하게 데워지면</b> 공기의 밀도 차이가 생겨 공기가 움직여요. 이것이 바람(<b>운동 에너지</b>)이에요.' },
    { id: 'curr', name: '해류', sub: '바닷물의 흐름', v: K.CURR, chain: ['빛', '열', '운동'], note: '바람과 바닷물의 온도 차이로 바닷물이 흘러요. 해류도 태양 에너지가 만든 <b>운동 에너지</b>예요.' },
    { id: 'photo', name: '광합성', sub: '식물이 저장해요', v: K.PHOTO, chain: ['빛', '화학'], note: '식물은 빛에너지를 <b>화학 에너지</b>로 저장해요. 먹이 사슬과 화석 연료(석탄·석유·천연가스)도 오래전 저장된 태양 에너지예요.' },
  ];
  const FNAME = { 빛: '빛에너지', 열: '열에너지', 화학: '화학 에너지', 위치: '위치 에너지', 운동: '운동 에너지', 전기: '전기 에너지' };
  const FW = PHONE
    ? { sun: { x: 66, y: 92, r: 36 }, earth: { x: 120, y: 300, r: 58 }, nx: 276, nw: 316, nh: 74, ny: [118, 214, 310, 406, 502], info: { x: 10, y: 560, w: 580, h: 270 } }
    : { sun: { x: 62, y: 226, r: 40 }, earth: { x: 290, y: 226, r: 66 }, nx: 470, nw: 316, nh: 68, ny: [76, 160, 244, 328, 412], info: { x: 14, y: 340, w: 436, h: 206 } };
  const pathBez = (i, tt) => {
    const a = { x: FW.earth.x + FW.earth.r - 2, y: FW.earth.y }, b = { x: FW.nx, y: FW.ny[i] }, c1 = { x: a.x + (b.x - a.x) * 0.55, y: a.y }, c2 = { x: a.x + (b.x - a.x) * 0.45, y: b.y };
    const u = 1 - tt; return { x: u * u * u * a.x + 3 * u * u * tt * c1.x + 3 * u * tt * tt * c2.x + tt * tt * tt * b.x, y: u * u * u * a.y + 3 * u * u * tt * c1.y + 3 * u * tt * tt * c2.y + tt * tt * tt * b.y, a, b, c1, c2 };
  };
  function stepFlow(dt) {
    if (S.pkt) { S.pkt.t += dt / 1.15; if (S.pkt.t >= 1) { S.visited.add(S.pkt.i); const b = pathBez(S.pkt.i, 1); if (!RM) parts.burst(b.x, b.y, { count: 8, speed: 90, size: 3, life: 0.6, colors: ['#fde047', '#fff'] }); Sound.tick(); S.pkt = null; } }
  }
  function drawFlow(t) {
    const { sun, earth } = FW;
    // 별빛 배경
    D.space(0, 0, VW, VH, t, { stars: 70, top: '#1e2a52', bottom: '#0a0f24' });
    // 태양
    D.glow(sun.x, sun.y, sun.r * 2.6, '#fde68a', 0.65);
    if (!RM) for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + t * 0.25; ctx.strokeStyle = 'rgba(253,224,71,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sun.x + Math.cos(a) * (sun.r + 5), sun.y + Math.sin(a) * (sun.r + 5)); ctx.lineTo(sun.x + Math.cos(a) * (sun.r + 14), sun.y + Math.sin(a) * (sun.r + 14)); ctx.stroke(); }
    D.sphere(sun.x, sun.y, sun.r, '#fbbf24', { light: '#fff7ae', dark: '#f59e0b' });
    // 지구
    D.glow(earth.x, earth.y, earth.r * 1.5, '#60a5fa', 0.35);
    D.sphere(earth.x, earth.y, earth.r, '#2f7fd6', { light: '#8fd0ff', dark: '#14478a', shadow: true });
    ctx.fillStyle = 'rgba(80,170,90,.85)'; ctx.beginPath(); ctx.ellipse(earth.x - 14, earth.y - 8, 20, 14, 0.4, 0, TAU); ctx.ellipse(earth.x + 22, earth.y + 18, 14, 10, -0.3, 0, TAU); ctx.fill();
    // 도달 · 반사 · 흡수
    const wd = (v) => Math.max(1.5, v * 0.1);
    const sx = PHONE ? sun.x + 12 : sun.x + sun.r + 8, sy = PHONE ? sun.y + sun.r + 4 : sun.y, ex = PHONE ? earth.x - 8 : earth.x - earth.r - 6, ey = PHONE ? earth.y - earth.r - 6 : earth.y;
    D.arrow(sx, sy, ex, ey, { color: '#fcd34d', width: wd(K.IN), head: 20 });
    D.label((sx + ex) / 2 + (PHONE ? 36 : 0), (sy + ey) / 2 + (PHONE ? 0 : -26), '도달 ' + K.IN, { bg: '#d97706', size: 14, pad: 9 });
    const rx = PHONE ? earth.x + 30 : earth.x - 10, ry = PHONE ? earth.y - earth.r - 4 : earth.y - earth.r - 6;
    D.arrow(rx, ry, rx + (PHONE ? 52 : 60), ry - (PHONE ? 66 : 90), { color: '#fef3c7', width: wd(K.REFL), head: 16 });
    D.label(rx + (PHONE ? 66 : 98), ry - (PHONE ? 86 : 96), '반사 ' + K.REFL, { bg: '#78716c', size: 14, pad: 9 });
    D.text(earth.x, earth.y + 4, '흡수 ' + K.ABS, { size: 17, weight: 800, color: '#fff', stroke: 'rgba(8,47,100,.7)', strokeWidth: 5 });
    D.text(PHONE ? 14 : earth.x, earth.y + earth.r + 26, K.ABS + ' = ' + [K.HEAT, K.WATER, K.WIND, K.CURR, K.PHOTO].map(FM).join(' + '), { size: 13.5, weight: 800, color: '#bfdbfe', align: PHONE ? 'left' : 'center' });
    // 리본과 상자
    PATHS.forEach((p, i) => {
      const b = pathBez(i, 1), w = p.v * 0.14, vis = S.visited.has(i), sel = S.sel === i;
      ctx.save(); ctx.strokeStyle = 'rgba(253,230,138,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(b.a.x, b.a.y); ctx.bezierCurveTo(b.c1.x, b.c1.y, b.c2.x, b.c2.y, b.b.x, b.b.y); ctx.stroke(); ctx.setLineDash([]);
      if (w >= 0.8) { ctx.strokeStyle = sel ? '#fde047' : '#fbbf24'; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.a.x, b.a.y); ctx.bezierCurveTo(b.c1.x, b.c1.y, b.c2.x, b.c2.y, b.b.x, b.b.y); ctx.stroke(); }
      ctx.restore();
      const y = FW.ny[i], x = FW.nx, nw = FW.nw, nh = FW.nh;
      D.shadow(() => { ctx.fillStyle = sel ? '#fff7d6' : 'rgba(255,255,255,.95)'; rr(x, y - nh / 2, nw, nh, 14).fill(); }, { blur: 6, y: 2 });
      ctx.strokeStyle = sel ? '#f59e0b' : vis ? '#16a34a' : '#cbd5e1'; ctx.lineWidth = sel ? 3.5 : 2.4; rr(x, y - nh / 2, nw, nh, 14).stroke();
      D.text(x + 14, y - 6, p.name, { size: 17, weight: 800, color: '#0f172a', align: 'left' });
      D.text(x + 14, y + 17, p.sub, { size: 13, weight: 700, color: '#64748b', align: 'left' });
      D.text(x + nw - 16, y + 6, FM(p.v), { size: 22, weight: 800, color: '#b45309', align: 'right' });
      if (vis) { D.check(x + nw - 20, y - nh / 2 + 4, 10, 1); }
      else D.ring(x + 8, y - nh / 2 + 4, 6, t + i * 0.2, { color: '#f59e0b', speed: 0.9, width: 2 });
      if (p.v * 0.14 < 0.8) D.text(x - 6, y - nh / 2 - 6 + 0, '', { size: 1 });
    });
    // 움직이는 에너지 알갱이
    if (S.pkt) { const q = pathBez(S.pkt.i, S.pkt.t); D.glow(q.x, q.y, 22, '#fde047', 0.9); D.sphere(q.x, q.y, 7, '#fde047', { light: '#fff', dark: '#f59e0b' }); }
    // 얇은 선 설명
    D.text(PHONE ? 14 : 16, PHONE ? 20 : 26, '선의 굵기 = 에너지의 양 (너무 작은 양은 선이 보이지 않아요)', { size: 13, weight: 700, color: '#cbd5e1', align: 'left' });
    // 정보 카드
    const I = FW.info;
    D.shadow(() => { ctx.fillStyle = 'rgba(255,255,255,.96)'; rr(I.x, I.y, I.w, I.h, 16).fill(); }, { blur: 8, y: 3 });
    if (S.sel >= 0) {
      const p = PATHS[S.sel];
      D.text(I.x + 16, I.y + 30, p.name + ' · ' + FM(p.v), { size: 18, weight: 800, color: '#0f172a', align: 'left' });
      D.text(I.x + I.w - 16, I.y + 30, '(흡수 ' + K.ABS + ' 중)', { size: 13.5, weight: 700, color: '#64748b', align: 'right' });
      // 에너지 전환 사슬
      let cx = I.x + 16; const cy = I.y + 74;
      p.chain.forEach((f, k) => {
        const name = FNAME[f], ww = textW(name, 14, 800) + 22;
        const hh = 34; D.shadow(() => { ctx.fillStyle = FORM[f]; rr(cx, cy - hh / 2, ww, hh, 17).fill(); }, { blur: 3, y: 1 });
        D.text(cx + ww / 2, cy + 5.5, name, { size: 14, weight: 800, color: '#fff' });
        cx += ww; if (k < p.chain.length - 1) { D.text(cx + 11, cy + 6, '→', { size: 18, weight: 800, color: '#475569' }); cx += 22; }
      });
      const plain = p.note.replace(/<[^>]+>/g, ''), fs = PHONE ? 16 : 14.5, ls = wrapLines(plain, I.w - 32, fs, 700);
      ls.forEach((l, i) => D.text(I.x + 16, I.y + 118 + i * (fs + 7) * FS * 0.95, l, { size: fs, weight: 700, color: '#334155', align: 'left' }));
    } else {
      D.text(I.x + I.w / 2, I.y + I.h / 2 - 8, '경로 상자를 눌러 보세요', { size: 18, weight: 800, color: '#475569' });
      D.text(I.x + I.w / 2, I.y + I.h / 2 + 22, S.visited.size + ' / ' + PATHS.length + '개 확인했어요', { size: 15, weight: 700, color: '#64748b' });
    }
  }
  function pathAt(p) { for (let i = 0; i < PATHS.length; i++) { if (p.x >= FW.nx && p.x <= FW.nx + FW.nw && Math.abs(p.y - FW.ny[i]) <= FW.nh / 2) return i; } return -1; }

  /* =========================================================
     장면 4 : 전환 추적 (태양 에너지에서 시작됨? · 전환 사슬 · 내가 할 수 있는 일)
     ========================================================= */
  const SORT_CARDS = [
    { label: '자동차 휘발유', t: 'sun', why: '휘발유는 석유로 만들고, 석유는 오래전 생물이 광합성으로 저장한 <b>태양 에너지</b>에서 왔어요.' },
    { label: '풍력 발전', t: 'sun', why: '바람은 태양 에너지가 지표를 <b>불균등하게 가열</b>해서 생겨요.' },
    { label: '수력 발전', t: 'sun', why: '물의 순환(증발·비)은 <b>태양 에너지</b>가 일으켜요.' },
    { label: '우리 몸의 활동', t: 'sun', why: '음식은 식물이 광합성으로 저장한 <b>태양 에너지</b>에서 왔어요.' },
    { label: '태양광 발전', t: 'sun', why: '태양의 <b>빛에너지</b>를 바로 전기 에너지로 바꿔요.' },
    { label: '석탄 화력 발전', t: 'sun', why: '석탄은 오래전 식물이 저장한 <b>태양 에너지</b>예요.' },
    { label: '식물 성장', t: 'sun', why: '식물은 <b>빛에너지</b>로 광합성을 해서 자라요.' },
    { label: '지열 발전', t: 'not', why: '지열은 <b>지구 내부</b>의 열이에요.' },
    { label: '조력 발전', t: 'not', why: '조력은 <b>달과 태양의 인력, 지구 자전</b>으로 생기는 밀물과 썰물을 이용해요.' },
    { label: '원자력 발전', t: 'not', why: '핵분열 연료인 우라늄은 오래전 <b>별이 폭발할 때</b> 만들어진 원소예요.' },
  ];
  const SORT_Z = { sun: '태양 에너지에서 시작됨', not: '태양 에너지가 아님' };
  const CHAIN_FIX = { first: '태양 빛에너지', last: '전기 에너지' };
  const CHAINS = [
    { name: '석탄 화력 발전', slots: ['A1', 'A2', 'A3', 'A4'] },
    { name: '수력 발전', slots: ['B1', 'B2', 'B3'] },
  ];
  const TOKENS = [
    { label: '식물의 화학 에너지', t: 'A1' }, { label: '석탄의 화학 에너지', t: 'A2' }, { label: '열에너지 (연소)', t: 'A3' }, { label: '터빈의 운동 에너지', t: 'A4' },
    { label: '열에너지 (증발)', t: 'B1' }, { label: '높은 곳 물의 위치 에너지', t: 'B2' }, { label: '흐르는 물의 운동 에너지', t: 'B3' },
    { label: '지구 내부의 열', t: 'x' }, { label: '핵에너지', t: 'x' }, { label: '달의 인력', t: 'x' },
  ];
  const CHAIN_WHY = { A1: '태양 빛에너지는 식물의 광합성으로 <b>화학 에너지</b>로 저장돼요.', A2: '오래전 식물이 묻혀 <b>석탄</b>이 되어 화학 에너지를 간직해요.', A3: '석탄을 태우면 화학 에너지가 <b>열에너지</b>가 돼요.', A4: '열로 만든 수증기가 <b>터빈</b>을 돌려요(운동 에너지).', B1: '태양의 빛에너지가 바닷물을 데워 <b>열에너지</b>로 증발시켜요.', B2: '수증기가 구름이 되어 높은 곳에서 <b>위치 에너지</b>를 가져요.', B3: '높은 곳의 물이 흘러 내려오며 <b>운동 에너지</b>가 돼요.' };
  /* 칸 배치 */
  function chainGeom() {
    const out = [];
    if (!PHONE) {
      const bw = 108, bh = 58, gap = 18;
      CHAINS.forEach((c, ci) => {
        const n = c.slots.length + 2, x0 = 31, y = 112 + ci * 124, items = [];
        for (let k = 0; k < n; k++) { const x = x0 + k * (bw + gap); items.push(k === 0 ? { fix: CHAIN_FIX.first, x, y, w: bw, h: bh } : k === n - 1 ? { fix: CHAIN_FIX.last, x, y, w: bw, h: bh } : { id: c.slots[k - 1], x, y, w: bw, h: bh }); }
        out.push({ name: c.name, y, items });
      });
    } else {
      const bw = 280, bh = 46, gap = 14;
      CHAINS.forEach((c, ci) => {
        const n = c.slots.length + 2, x = 12 + ci * 296, items = [];
        for (let k = 0; k < n; k++) { const y = 118 + k * (bh + gap); items.push(k === 0 ? { fix: CHAIN_FIX.first, x, y, w: bw, h: bh } : k === n - 1 ? { fix: CHAIN_FIX.last, x, y, w: bw, h: bh } : { id: c.slots[k - 1], x, y, w: bw, h: bh }); }
        out.push({ name: c.name, y: 96, x, items });
      });
    }
    return out;
  }
  const CG = chainGeom();
  const clearBadB = (b) => b.cards.forEach((c) => { c.flagged = false; c.border = '#cfd8e6'; });
  const sortBoard = (() => {
    const cw = PHONE ? 176 : 144, ch = PHONE ? 48 : 48;
    const zs = PHONE
      ? [{ id: 'sun', x: 10, y: 66, w: 580, h: 250 }, { id: 'not', x: 10, y: 326, w: 580, h: 120 }]
      : [{ id: 'sun', x: 20, y: 60, w: 470, h: 300 }, { id: 'not', x: 510, y: 60, w: 270, h: 300 }];
    zs.forEach((z) => Object.assign(z, { color: z.id === 'sun' ? '#b45309' : '#475569', fill: z.id === 'sun' ? 'rgba(254,243,199,.85)' : 'rgba(226,232,240,.85)', line: z.id === 'sun' ? '#d97706' : '#64748b', head: 40, label: SORT_Z[z.id], lsize: 16 }));
    const ty = PHONE ? 462 : 376;
    const b = new Board({ zones: zs, tray: { x: PHONE ? 8 : 20, y: ty, w: PHONE ? 584 : 760, cols: PHONE ? 3 : 5 }, cw, ch, gap: 8, onDrop: () => true, onPlace: () => clearBadB(b) });
    SORT_CARDS.forEach((c, i) => b.add(Object.assign({ id: 's' + i, fill: '#fff', border: '#cfd8e6' }, c)));
    b.layout(true); return b;
  })();
  const chainBoard = (() => {
    const cw = PHONE ? 176 : 108, ch = PHONE ? 42 : 50, zs = [];
    CG.forEach((c) => c.items.forEach((it) => { if (it.id) zs.push({ id: it.id, x: it.x, y: it.y, w: it.w, h: it.h, cap: 1, center: true, color: '#0369a1', fill: 'rgba(255,255,255,.8)', line: '#0369a1' }); }));
    const ty = PHONE ? 470 : 340;
    const b = new Board({ zones: zs, tray: { x: PHONE ? 8 : 20, y: ty, w: PHONE ? 584 : 760, cols: PHONE ? 3 : 6 }, cw, ch, gap: 8, onDrop: () => true, onPlace: () => clearBadB(b) });
    TOKENS.forEach((c, i) => b.add(Object.assign({ id: 't' + i, fill: '#fff', border: '#cfd8e6' }, c)));
    b.layout(true); return b;
  })();
  function checkSort() {
    const b = sortBoard, un = b.cards.filter((c) => !c.zone);
    if (un.length) return '아직 놓지 않은 카드가 <b>' + un.length + '장</b> 있어요.';
    const wrong = b.cards.filter((c) => c.zone !== c.t);
    wrong.forEach((c) => { if (!c.flagged) { c.flagged = true; c.border = '#e2464b'; c.shake = 0.45; } });
    if (wrong.length) return '"' + wrong[0].label + '"' + josa(wrong[0].label, '은/는') + ' 알맞지 않아요. ' + wrong[0].why + ' (빨간 테두리 ' + wrong.length + '장)';
    return true;
  }
  function checkChain() {
    const b = chainBoard, slots = b.zones.map((z) => z.id), un = slots.filter((id) => !b.inZone(id).length);
    if (un.length) return '아직 비어 있는 칸이 <b>' + un.length + '곳</b> 있어요.';
    const wrong = slots.filter((id) => b.inZone(id)[0].t !== id);
    wrong.forEach((id) => { const c = b.inZone(id)[0]; if (!c.flagged) { c.flagged = true; c.border = '#e2464b'; c.shake = 0.45; } });
    if (wrong.length) return '순서가 맞지 않는 칸이 <b>' + wrong.length + '곳</b> 있어요(빨간 테두리). 힌트: ' + CHAIN_WHY[wrong[0]];
    return true;
  }
  function drawChainScene(t) {
    D.text(PHONE ? 300 : 400, 36, '태양 에너지가 전기가 되기까지', { size: 17, weight: 800, color: '#334155' });
    CG.forEach((c) => {
      D.text(PHONE ? c.x + 4 : 24, PHONE ? 94 : c.y - 12, c.name, { size: 16, weight: 800, color: '#0369a1', align: 'left' });
      c.items.forEach((it, k) => {
        if (it.fix) {
          D.shadow(() => { ctx.fillStyle = k === 0 ? '#fde68a' : '#fef08a'; rr(it.x, it.y, it.w, it.h, 12).fill(); }, { blur: 3, y: 1 });
          ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; rr(it.x, it.y, it.w, it.h, 12).stroke();
          const ls = wrapLines(it.fix, it.w - 14, 14, 800); ls.forEach((l, i) => D.text(it.x + it.w / 2, it.y + it.h / 2 + 5 - (ls.length - 1) * 8 + i * 16 * FS * 0.95, l, { size: 14, weight: 800, color: '#78350f' }));
        }
        if (k < c.items.length - 1) { const nx = c.items[k + 1]; if (PHONE) D.text(it.x + it.w / 2, it.y + it.h + 11, '↓', { size: 18, weight: 800, color: '#64748b' }); else D.text(it.x + it.w + 9, it.y + it.h / 2 + 7, '→', { size: 20, weight: 800, color: '#64748b' }); }
      });
    });
    chainBoard.draw(t);
  }
  /* 내가 할 수 있는 일 (DOM 칩) */
  const ACTS = [
    { t: '낮에는 창문으로 들어오는 햇빛을 이용하고 전등 끄기', ok: true },
    { t: '쓰지 않는 전기 기구의 전원 끄기 (에너지 절약)', ok: true },
    { t: '태양광 같은 재생 에너지를 쓰는 시설·요금제 응원하기', ok: true },
    { t: 'LED 같은 에너지 효율이 높은 제품 쓰기', ok: true },
    { t: '태양 에너지는 공짜니까 마음껏 낭비해도 돼요', ok: false },
    { t: '화석 연료는 무한하니 아껴 쓸 필요가 없어요', ok: false },
  ];
  function drawActScene(t) {
    const cx = VW / 2, cy = PHONE ? 220 : 180;
    D.glow(cx, cy, 190, '#fde68a', 0.5); D.sphere(cx, cy, 58, '#fbbf24', { light: '#fff7ae', dark: '#f59e0b' });
    if (!RM) for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + t * 0.25; ctx.strokeStyle = 'rgba(245,158,11,.8)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70); ctx.lineTo(cx + Math.cos(a) * 88, cy + Math.sin(a) * 88); ctx.stroke(); }
    D.text(cx, cy + 126, '태양 에너지는 지구의 거의 모든 에너지 흐름의 근원이에요', { size: PHONE ? 15 : 17, weight: 800, color: '#78350f' });
    const picked = [...S.acts].map((i) => ACTS[i]), y0 = cy + 170;
    D.text(cx, y0, '내가 고른 실천 ' + picked.length + '개', { size: 16, weight: 800, color: '#334155' });
    picked.slice(0, 4).forEach((a, i) => { const ls = wrapLines('✓ ' + a.t, VW - 80, 14.5, 700); D.text(cx, y0 + 28 + i * 24 * FS * 0.95, ls[0] + (ls.length > 1 ? '…' : ''), { size: 14.5, weight: 700, color: a.ok ? '#166534' : '#b91c1c' }); });
  }

  /* =========================================================
     조작 · 화면 전환
     ========================================================= */
  const MODE_LV = { fusion: 0, mass: 1, flow: 2, apply: 3 };
  const MODE_LABEL = { fusion: '☀️ 태양 중심부', mass: '⚖️ 질량과 에너지', flow: '🌍 지구의 에너지 흐름', apply: '🔗 전환 추적' };
  let game = null;
  const modeSeg = $('#modeSeg');
  const sT = $('#sT'), oT = $('#oT'), sM = $('#sM'), oM = $('#oM');
  $('#oSunT').textContent = K.T_SUN;
  SciSim.bindRange(sT, oT, (v) => v + '만 K', (v) => { S.T = v; });
  SciSim.bindRange(sM, oM, (v) => v + ' g', (v) => { S.M = v; });
  function setSlider(input, out, v, fmt) { input.value = v; input.style.setProperty('--pct', ((v - input.min) / (input.max - input.min)) * 100 + '%'); out.textContent = fmt(v); }
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode] + (S.mode === 'apply' ? { sort: ' · 분류', chain: ' · 전환 사슬', act: ' · 내가 할 일' }[S.subAp] : '');
    $$('#ctrlCard > .control').forEach((c) => { c.hidden = c.dataset.modes !== S.mode; });
    $$('#ctrlCard [data-sub]').forEach((e) => { e.hidden = !e.dataset.sub.split(' ').includes(S.subAp); });
    $$('#apSub .opt').forEach((b) => b.classList.toggle('on', b.dataset.go === S.subAp));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#bFuse').disabled = S.fuseT >= 0 && !S.fuseDone;
    if (modeSeg) modeSeg.hidden = !(game && game.free);
  }
  const BG = { fusion: '#10162b', mass: '#e5ecf8', flow: '#0a0f24', apply: '#eef3fb' };
  function setMode(m) { if (S.mode !== m) { S.fade = 1; parts.clear(); } S.mode = m; view.wrap.style.setProperty('--stage-bg', BG[m]); updateCtl(); }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterLevel(MODE_LV[b.dataset.mode]); }));
  $$('#apSub .opt').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.subAp = b.dataset.go; S.fade = 1; updateCtl(); }));
  $('#bFuReset').addEventListener('click', () => { Sound.click(); fuReset(); });
  $('#bFuse').addEventListener('click', () => { Sound.click(); startFuse(); updateCtl(); });
  $('#bApReset').addEventListener('click', () => { Sound.click(); const b = S.subAp === 'chain' ? chainBoard : sortBoard; b.reset(); clearBadB(b); });
  ACTS.forEach((a, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = a.t; b.style.textAlign = 'left';
    b.addEventListener('click', () => { Sound.click(); if (S.acts.has(i)) S.acts.delete(i); else S.acts.add(i); b.classList.toggle('on', S.acts.has(i)); b.classList.remove('bad'); });
    $('#actList').appendChild(b);
  });
  const resetActs = () => { S.acts.clear(); $$('#actList .opt').forEach((b) => b.classList.remove('on', 'bad')); };
  const activeBoard = () => (S.mode === 'apply' && S.subAp === 'sort' ? sortBoard : S.mode === 'apply' && S.subAp === 'chain' ? chainBoard : null);
  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'flow') { const i = pathAt(p); if (i >= 0) { S.sel = i; S.pkt = { i, t: 0 }; Sound.click(); } return false; }
      const b = activeBoard(); return b ? b.down(p) : false;
    },
    move(p) { const b = activeBoard(); if (b) b.move(p); },
    up(p) { const b = activeBoard(); if (b) b.up(p); },
    hover(p) { if (S.mode === 'flow') return pathAt(p) >= 0 ? 'pointer' : 'default'; const b = activeBoard(); return b && b.hit(p) ? 'grab' : 'default'; },
  });

  function readouts() {
    if (S.mode === 'fusion') {
      const np = FU.ps.filter((q) => q.k === 'p').length, nd = FU.ps.filter((q) => q.k === 'd').length;
      setReadouts(['중심부 온도', Math.round(S.Ts) + '만 K', '수소 핵 · 융합 중간 입자', np + ' · ' + nd, '만들어진 헬륨 핵', FU.heTotal + '개']);
    } else if (S.mode === 'mass') {
      const dm = K.LOSS_PCT / 100 * S.M;
      setReadouts(['헬륨 핵 1개의 질량 (수소 4개 = ' + K.H_MASS + ')', S.fuseT >= 0 && fz.v > 0.5 ? String(K.HE_MASS) : '?', '줄어든 질량', S.fuseDone ? K.LOSS + ' (' + K.LOSS_PCT + ' %)' : '?', S.M + ' g이 융합하면', S.fuseDone ? '질량 ' + f1(dm) + ' g → 에너지' : '?']);
    } else if (S.mode === 'flow') {
      setReadouts(['확인한 경로', S.visited.size + ' / ' + PATHS.length, '지금 보는 경로', S.sel >= 0 ? PATHS[S.sel].name : '—', '에너지 (도달 ' + K.IN + ' 기준)', S.sel >= 0 ? FM(PATHS[S.sel].v) : '—']);
    } else if (S.subAp === 'sort') {
      setReadouts(['놓은 카드', sortBoard.cards.filter((c) => c.zone).length + ' / ' + sortBoard.cards.length, '맞게 놓은 카드', sortBoard.cards.filter((c) => c.zone && c.zone === c.t).length + '장', '영역', '태양에서 시작 · 아님']);
    } else if (S.subAp === 'chain') {
      setReadouts(['놓은 카드', chainBoard.cards.filter((c) => c.zone).length + ' / ' + chainBoard.zones.length, '맞는 칸', chainBoard.zones.filter((z) => { const c = chainBoard.inZone(z.id)[0]; return c && c.t === z.id; }).length + '곳', '사슬', '석탄 화력 · 수력']);
    } else setReadouts(['고른 실천', S.acts.size + '개', '도움이 되는 실천', [...S.acts].filter((i) => ACTS[i].ok).length + '개', '도움이 안 되는 실천', [...S.acts].filter((i) => !ACTS[i].ok).length + '개']);
  }

  /* =========================================================
     단계 · 미션
     ========================================================= */
  function enterLevel(li) {
    clearTimeout(hintTimer);
    if (li === 0) { setMode('fusion'); S.T = S.Ts = 300; setSlider(sT, oT, 300, (v) => v + '만 K'); fuReset(); showHint('온도 슬라이더를 올려 수소 핵의 움직임을 봐요', 5000); }
    else if (li === 1) { setMode('mass'); S.M = 100; setSlider(sM, oM, 100, (v) => v + ' g'); S.fuseT = -1; S.fuseDone = false; S.fuseCount = 0; fz.v = 0; showHint('🔥 융합시키기를 눌러 질량의 변화를 봐요', 5000); }
    else if (li === 2) { setMode('flow'); S.sel = -1; S.visited.clear(); S.pkt = null; showHint('경로 상자를 눌러 에너지를 따라가 봐요', 5000); }
    else { setMode('apply'); S.subAp = 'sort'; sortBoard.reset(); chainBoard.reset(); clearBadB(sortBoard); clearBadB(chainBoard); resetActs(); showHint('카드를 알맞은 영역에 놓아요', 5000); }
    updateCtl();
  }
  const levels = [
    {
      title: '핵융합: 수소 핵이 하나로', short: '핵융합', icon: '☀️', phase: '모형', features: ['fusion'],
      intro: '<p class="si-q">❓ 탐구 질문: 태양은 어떻게 수십억 년 동안 빛날 수 있고, 그 빛은 지구에서 어떤 일을 할까?</p>' +
        '<div class="si-link">🔗 <b>통합과학1 「별 속의 핵융합」에서</b> 별 속에서 수소가 헬륨으로 융합하며 원소가 만들어지는 것을 배웠어요. 이번에는 그 과정에서 나오는 <b>에너지</b>에 집중해요.</div>' +
        '<p>태양 중심부는 온도가 약 <b>' + K.T_SUN + '만 K</b>로 매우 높아요. 수소 핵(양성자)은 +전기를 띠어 서로 밀어내지만, 온도가 높아 <b>충분히 빠르면</b> 부딪혀 하나로 융합해요. 수소 핵 4개가 모이면 <b>헬륨 핵 1개</b>가 되고 에너지가 나와요. 온도를 바꾸며 수소 핵의 움직임을 관찰해요. (핵반응의 자세한 단계는 다루지 않아요.)</p>',
      setup() { enterLevel(0); },
      recap: '수소 핵은 서로 밀어내지만 온도가 높아 충분히 빠르면 융합해요. 수소 핵 4개가 헬륨 핵 1개가 되면서 에너지가 나와요.',
      summary: '<ul><li>태양 중심부: 온도 약 <b>' + K.T_SUN + '만 K</b>, 매우 높은 압력.</li><li><b>수소 핵(양성자) 4개 → 헬륨 핵 1개 + 에너지</b>. 이것이 태양 에너지의 근원이에요.</li><li>수소 핵끼리는 전기적으로 <b>밀어내서</b>, 온도가 낮으면 가까이 가지 못해 융합이 거의 일어나지 않아요.</li></ul>',
      missions: [
        {
          title: '헬륨 핵 만들기',
          goal: '온도를 <b>' + K.T_OK + '만 K 이상</b>으로 올려 <b>헬륨 핵 1개</b>를 만들어요.',
          hint: '온도가 낮으면 수소 핵이 느려서 서로 밀어내기만 해요. 슬라이더를 <b>' + K.T_SUN + '만 K</b> 쯤으로 올리고 10~20초 기다려요. 헬륨 핵은 수소 핵 4개가 모여야 만들어져요.',
          setup() { setMode('fusion'); },
          check: () => FU.heHigh >= 1, hold: 0.3,
          status: () => mark(S.T >= K.T_OK) + ' 온도 ' + S.T + '만 K (' + K.T_OK + ' 이상) · ' + mark(FU.heHigh >= 1) + ' 헬륨 핵 ' + FU.heHigh + '개 · 융합 중간 입자 만든 횟수 ' + FU.pp + '번',
          explain: '수소 핵 두 개가 융합해 융합 중간 입자가 되고, 이런 입자 두 개가 다시 융합해 <b>헬륨 핵</b>이 돼요. 이 과정이 일어나려면 서로 밀어내는 힘을 이길 만큼 빠르게 부딪혀야 해서 <b>높은 온도</b>가 필요해요.',
        },
        {
          type: 'quiz', title: '낮은 온도에서 융합이 안 되는 까닭',
          goal: '온도가 낮을 때는 수소 핵이 거의 융합하지 못해요. 그 까닭은?',
          setup() { setMode('fusion'); },
          choices: ['수소 핵(양성자)끼리 서로 밀어내서, 충분히 빠르게 부딪혀야만 가까이 갈 수 있기 때문이에요', '낮은 온도에서는 수소 핵이 사라지기 때문이에요', '낮은 온도에서는 헬륨이 너무 많아서 자리가 없기 때문이에요', '수소 핵은 전기를 띠지 않아 서로 끌어당기기 때문이에요'],
          answer: 0,
          feedback: ['', '온도가 낮아도 수소 핵은 사라지지 않아요. 느리게 움직일 뿐이에요.', '화면에서 낮은 온도일 때는 헬륨이 거의 만들어지지 않았어요.', '수소 핵은 + 전기를 띠어서 서로 밀어내요. 끌어당기면 오히려 쉽게 융합했을 거예요.'],
          explain: '같은 종류의 전기를 띤 수소 핵은 <b>서로 밀어내요</b>. 온도가 높을수록 입자가 빨라져 이 밀어내는 힘을 이기고 가까워질 수 있어요. 그래서 핵융합에는 약 ' + K.T_SUN + '만 K 같은 높은 온도가 필요해요.',
        },
      ],
    },
    {
      title: '질량이 에너지로', short: '질량→에너지', icon: '⚖️', phase: '설명', features: ['mass'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수소 핵 4개가 헬륨 핵 1개가 되며 에너지가 나오는 것을 봤어요. 그 에너지는 어디서 왔을까요?</div>' +
        '<p>핵융합 전후의 <b>질량</b>을 비교해요. 수소 핵 4개의 질량을 <b>' + K.H_MASS + '</b>이라 하면 헬륨 핵 1개는 <b>' + K.HE_MASS + '</b>이에요. <b>줄어든 질량 ' + K.LOSS + '</b>이 에너지로 바뀌어요. (질량과 에너지의 관계식 E = mc²는 "줄어든 질량이 에너지가 된다"는 뜻이고, 이 수업에서는 계산 문제는 풀지 않아요.)</p>',
      setup() { enterLevel(1); },
      recap: '핵융합에서 줄어든 질량(수소 핵 4개 ' + K.H_MASS + ' → 헬륨 핵 1개 ' + K.HE_MASS + ', 약 ' + K.LOSS_PCT + ' %)이 에너지로 바뀌어요. 아주 작은 질량이 엄청난 에너지가 돼요.',
      summary: '<ul><li>수소 핵 4개의 질량 ' + K.H_MASS + ' → 헬륨 핵 1개 <b>' + K.HE_MASS + '</b>. 줄어든 <b>' + K.LOSS + '(약 ' + K.LOSS_PCT + ' %)</b>가 에너지로 바뀌어요.</li><li>질량 1 g이 모두 에너지가 되면 약 <b>' + sci(K.E_PER_G) + ' J</b> (크기 감각).</li><li>태양은 매초 약 ' + (K.SUN_FUSE / 100) + '억 톤의 수소를 융합하고, 그중 약 ' + Math.round(K.SUN_LOSS * 100) + '만 톤의 질량이 에너지로 바뀌어요.</li><li>만약 태양이 석탄처럼 탄다면 ' + coalTxt() + '밖에 빛나지 못해요. 수십억 년 빛나려면 <b>핵융합</b>이어야 해요.</li></ul>',
      missions: [
        {
          title: '융합시키고 에너지 확인하기',
          goal: '수소의 질량을 <b>' + 1000 + ' g</b>으로 맞추고 <b>🔥 융합시키기</b>를 눌러, 질량이 줄며 빛에너지가 나오는 것을 확인해요.',
          hint: '수소 질량 슬라이더를 오른쪽 끝(1000 g)까지 옮긴 뒤 융합시키기 버튼을 누르고 3초쯤 기다려요.',
          setup() { setMode('mass'); },
          check: () => S.fuseDone && S.M >= 1000, hold: 0.4,
          status: () => mark(S.M >= 1000) + ' 수소 ' + S.M + ' g (1000 g) · ' + mark(S.fuseDone) + ' 융합 ' + (S.fuseDone ? '끝' : S.fuseT >= 0 ? '진행 중' : '아직'),
          explain: '수소 1000 g이 융합하면 질량이 약 <b>' + f1(K.LOSS_PCT / 100 * 1000) + ' g</b> 줄고, 그만큼이 <b>' + sci(K.LOSS_PCT / 100 * 1000 * K.E_PER_G) + ' J</b>의 에너지로 바뀌어요. 한 가정이 쓰는 전기로 ' + yrTxt(annualHomes(1000)) + ' 쓸 수 있는 양이에요.',
        },
        {
          type: 'quiz', title: '줄어든 질량 읽기',
          goal: '수소 핵 4개의 질량을 ' + K.H_MASS + '이라 할 때, 핵융합 후 <b>줄어든 질량</b>은 얼마일까요? (확대 창을 읽어요)',
          setup() { setMode('mass'); },
          choices: ['약 ' + K.LOSS + ' (약 ' + K.LOSS_PCT + ' %)', '약 7 (약 7 %)', '약 30 (약 30 %)', '줄어들지 않고 그대로예요'],
          answer: 0,
          feedback: ['', '막대의 맨 위를 확대해서 줄어든 부분이 ' + K.HE_MASS + '와 ' + K.H_MASS + ' 사이임을 다시 읽어 보세요. 1이 안 돼요.', '30은 지구에서 반사되는 햇빛의 비율이에요. 핵융합과 관계없는 값이에요.', '헬륨 핵 1개의 질량은 ' + K.HE_MASS + '로, ' + K.H_MASS + '보다 작아요.'],
          explain: '헬륨 핵 1개는 수소 핵 4개보다 질량이 <b>' + K.LOSS + '</b>(약 ' + K.LOSS_PCT + ' %) 작아요. 이 작은 차이가 에너지로 바뀌지만, 1 g당 ' + sci(K.E_PER_G) + ' J이라 매우 큰 에너지가 돼요.',
        },
        {
          type: 'quiz', title: '태양이 석탄처럼 탄다면?',
          goal: '만약 태양이 석탄처럼 <b>타서</b> 빛난다면 얼마나 오래 빛날 수 있을까요?',
          setup() { setMode('mass'); },
          choices: ['수십억 년 이상', coalTxt() + ' 정도밖에 못 빛나서, 수십억 년 동안 빛난 것을 설명할 수 없어요', '약 5억 년', '1초도 못 빛나요'],
          answer: 1,
          feedback: ['석탄이 타는 것으로는 그렇게 오래 빛날 수 없어요.', '', '계산하면 훨씬 짧은 ' + coalTxt() + '이 나와요.', '1초는 너무 짧아요. 하지만 몇천 년이면 수십억 년에 비해 매우 짧아요.'],
          explain: '태양의 질량을 모두 석탄이라고 해도 태양의 밝기를 유지하며 탈 수 있는 기간은 ' + coalTxt() + '뿐이에요. 태양이 수십억 년 빛나는 것은 <b>핵융합</b>으로 질량 일부가 에너지가 되기 때문이에요.',
        },
      ],
    },
    {
      title: '지구의 에너지 흐름', short: '지구의 흐름', icon: '🌍', phase: '탐구', features: ['flow'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양 에너지가 핵융합으로 줄어든 질량에서 생긴다는 것을 알았어요. 태양이 내보내는 에너지 중 지구에 닿는 것은 약 <b>' + shareTxt() + '</b>이에요.</div>' +
        '<p>지구에 도달한 에너지를 <b>' + K.IN + '</b>이라 하면 약 <b>' + K.REFL + '</b>은 반사되고 약 <b>' + K.ABS + '</b>이 흡수돼요(중학교에서 배운 값). 흡수된 ' + K.ABS + '은 <b>열, 물의 순환, 바람, 해류, 광합성</b> 다섯 갈래로 나뉘어 여러 에너지로 전환돼요. 경로 상자를 눌러 따라가 봐요. (수치는 단순화한 예시예요.)</p>',
      setup() { enterLevel(2); },
      recap: '지구에 흡수된 태양 에너지는 대부분 열이 되고, 일부는 물의 순환, 바람과 해류, 광합성으로 갈라져 여러 형태로 전환돼요.',
      summary: '<table class="mini"><tr><th>경로</th><th>양</th><th>에너지 전환</th></tr>' + PATHS.map((p) => '<tr><td>' + p.name + '</td><td>' + FM(p.v) + '</td><td>' + p.chain.map((f) => FNAME[f]).join(' → ') + '</td></tr>').join('') + '</table>' +
        '<ul><li>도달 ' + K.IN + ' = 반사 ' + K.REFL + ' + 흡수 ' + K.ABS + '. 흡수 ' + K.ABS + ' = ' + [K.HEAT, K.WATER, K.WIND, K.CURR, K.PHOTO].map(FM).join(' + ') + '.</li><li>광합성으로 저장된 에너지는 먹이 사슬과 <b>화석 연료</b>(석탄·석유·천연가스)로 이어져요.</li></ul>',
      missions: [
        {
          title: '다섯 경로 따라가기',
          goal: '경로 상자 <b>' + PATHS.length + '개</b>를 모두 눌러, 태양 에너지가 어떤 에너지로 바뀌는지 확인해요.',
          hint: '오른쪽 상자(열, 증발·구름·비, 바람, 해류, 광합성)를 하나씩 눌러요. 에너지 알갱이가 상자에 도착하면 확인한 거예요.',
          setup() { setMode('flow'); },
          check: () => S.visited.size >= PATHS.length, hold: 0.3,
          status: () => mark(S.visited.size >= PATHS.length) + ' 확인한 경로 ' + S.visited.size + ' / ' + PATHS.length,
          explain: '흡수된 빛에너지는 대부분 <b>열에너지</b>가 돼요. 그 열이 물을 증발시키고(물의 순환), 공기와 바닷물을 움직이고(바람·해류), 아주 작은 양이 광합성으로 <b>화학 에너지</b>가 돼요.',
        },
        {
          type: 'quiz', title: '바람이 부는 에너지의 근원',
          goal: '<b>바람</b>이 부는 에너지의 근원은 무엇일까요?',
          setup() { setMode('flow'); },
          choices: ['지구 내부의 열', '태양 에너지가 지표를 불균등하게 가열한 것', '달의 인력', '지구 자전 자체의 에너지'],
          answer: 1,
          feedback: ['지구 내부의 열은 화산과 판 이동의 에너지예요.', '', '달의 인력은 밀물과 썰물을 일으켜요.', '자전은 바람의 방향에 영향을 주지만, 바람을 일으키는 에너지는 태양에서 와요.'],
          explain: '지표가 위도와 땅·바다에 따라 <b>불균등하게 데워지면</b> 공기의 밀도 차이가 생겨 공기가 움직여요. 그래서 바람의 근원은 태양 에너지예요.',
        },
        {
          type: 'quiz', title: '광합성과 에너지 전환',
          goal: '식물이 <b>광합성</b>을 할 때 빛에너지는 어떤 에너지로 저장될까요?',
          setup() { setMode('flow'); },
          choices: ['열에너지', '화학 에너지', '전기 에너지', '운동 에너지'],
          answer: 1,
          feedback: ['열은 광합성이 아니라 흡수된 빛이 대기와 지표를 데울 때 생기는 에너지예요.', '', '식물은 전기를 만들지 않아요.', '식물이 움직이는 것이 아니라 포도당 같은 물질에 에너지를 저장해요.'],
          explain: '광합성은 빛에너지를 포도당 같은 물질의 <b>화학 에너지</b>로 바꿔 저장해요. 이것이 먹이 사슬로 이어지고, 오래전 생물의 화학 에너지는 화석 연료가 되었어요.',
        },
      ],
    },
    {
      title: '전환 추적: 에너지의 근원', short: '전환 추적', icon: '🔗', phase: '적용', features: ['apply'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 지구에 온 태양 에너지가 열, 물의 순환, 바람, 해류, 광합성으로 전환되는 것을 따라갔어요. 이제 우리가 쓰는 에너지의 근원을 추적해요.</div>' +
        '<p>사례 카드 10장을 <b>태양 에너지에서 시작된 것</b>과 <b>아닌 것</b>으로 나누고, 석탄 화력 발전과 수력 발전의 <b>에너지 전환 사슬</b>을 완성해요. 마지막으로 에너지를 아끼고 잘 쓰기 위해 내가 할 수 있는 일을 골라요.</p>',
      setup() { enterLevel(3); },
      recap: '화석 연료, 바람, 물의 순환, 음식 등 우리가 쓰는 대부분의 에너지는 태양에서 시작했어요. 지열, 조력, 핵에너지는 태양 에너지가 아니에요.',
      summary: '<table class="mini"><tr><th>태양 에너지에서 시작</th><th>태양 에너지가 아님</th></tr><tr><td>휘발유, 풍력, 수력, 우리 몸의 활동, 태양광, 석탄 화력, 식물 성장</td><td>지열(지구 내부), 조력(달·태양 인력과 자전), 핵분열 연료(별 폭발에서 생긴 우라늄)</td></tr></table>' +
        '<ul><li>석탄 화력: 태양 빛에너지 → 식물의 화학 에너지 → 석탄의 화학 에너지 → 열에너지 → 터빈의 운동 에너지 → 전기 에너지</li><li>수력: 태양 빛에너지 → 열에너지(증발) → 높은 곳 물의 위치 에너지 → 흐르는 물의 운동 에너지 → 전기 에너지</li><li>에너지는 다른 형태로 전환될 뿐 새로 생기거나 사라지지 않아요(다음 차시에서 정리해요).</li></ul>',
      missions: [
        {
          title: '태양 에너지에서 시작됐을까?',
          goal: '사례 카드 10장을 <b>태양 에너지에서 시작됨</b>과 <b>태양 에너지가 아님</b>으로 나누고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '화석 연료, 바람, 물의 순환, 음식은 모두 태양 에너지가 바뀐 것이에요. 지구 내부, 달의 인력, 별의 폭발에서 온 에너지는 태양 에너지가 아니에요.',
          manual: true,
          setup() { setMode('apply'); S.subAp = 'sort'; updateCtl(); },
          status: () => mark(sortBoard.cards.every((c) => c.zone)) + ' 놓은 카드 ' + sortBoard.cards.filter((c) => c.zone).length + ' / ' + sortBoard.cards.length,
          check() { const r = checkSort(); if (r === true && !S.apOK) { S.apOK = 1; sortBoard.cards.forEach((c) => parts.burst(c.x, c.y, { count: 5, speed: 80, size: 3, life: 0.6 })); } return r; },
          explain: '모든 에너지가 태양에서 오는 것은 아니에요. <b>지열</b>은 지구 내부, <b>조력</b>은 달과 태양의 인력·지구 자전, <b>원자력</b>의 우라늄은 별이 폭발할 때 만들어진 원소에서 와요.',
        },
        {
          title: '에너지 전환 사슬 완성하기',
          goal: '에너지 카드를 알맞은 순서로 <b>빈칸</b>에 놓아 석탄 화력 발전과 수력 발전의 전환 사슬을 완성하고 <b>✔ 확인하기</b>를 눌러요.',
          hint: '석탄은 오래전 식물이 광합성으로 저장한 화학 에너지예요. 수력은 증발 → 구름(높은 곳) → 흐르는 물의 순서예요. 필요 없는 카드도 있어요.',
          manual: true,
          setup() { setMode('apply'); S.subAp = 'chain'; updateCtl(); },
          status: () => mark(chainBoard.zones.every((z) => chainBoard.inZone(z.id).length)) + ' 채운 칸 ' + chainBoard.zones.filter((z) => chainBoard.inZone(z.id).length).length + ' / ' + chainBoard.zones.length,
          check() { const r = checkChain(); if (r === true && !S.chainOK) { S.chainOK = 1; chainBoard.cards.forEach((c) => { if (c.zone) parts.burst(c.x, c.y, { count: 5, speed: 80, size: 3, life: 0.6 }); }); } return r; },
          explain: '에너지는 <b>다른 형태로 전환</b>되며 이동해요. 석탄 화력 발전은 화학 에너지 → 열에너지 → 운동 에너지 → 전기 에너지로, 수력 발전은 열에너지(증발) → 위치 에너지 → 운동 에너지 → 전기 에너지로 바뀌어요.',
        },
        {
          title: '내가 할 수 있는 일',
          goal: '에너지를 아끼고 잘 쓰는 데 도움이 되는 일을 <b>2개 이상</b> 고르고 <b>✔ 확인하기</b>를 눌러요. 도움이 되지 않는 것은 고르지 않아요.',
          hint: '햇빛을 이용하기, 에너지 절약, 재생 에너지 응원, 효율 높은 제품 쓰기가 도움이 돼요.',
          manual: true,
          setup() { setMode('apply'); S.subAp = 'act'; resetActs(); updateCtl(); },
          status: () => mark(S.acts.size >= 2) + ' 고른 실천 ' + S.acts.size + '개',
          check() {
            const sel = [...S.acts], wrong = sel.filter((i) => !ACTS[i].ok);
            $$('#actList .opt').forEach((b, i) => b.classList.toggle('bad', wrong.includes(i)));
            if (wrong.length) return '"' + ACTS[wrong[0]].t + '"' + josa(ACTS[wrong[0]].t, '은/는') + ' 도움이 되는 생각이 아니에요. 빨간 칸을 빼 보세요.';
            if (sel.length < 2) return '2개 이상 골라 주세요. (지금 ' + sel.length + '개)';
            return true;
          },
          explain: '태양 에너지는 지구 에너지 흐름의 근원이지만, 이를 이용하는 설비를 만들고 쓰는 데에는 자원이 들어요. 에너지를 <b>아끼고 효율적으로 쓰는 것</b>이 환경을 지키는 첫걸음이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'h1-solar-energy', mount: '#game', badge: '태양 에너지 탐험가', homeHref: '../../index.html#h1b',
    featureLabels: { fusion: '☀️ 태양 중심부 모형 · 온도 슬라이더', mass: '⚖️ 질량 막대 · 확대 창 · 에너지 카드', flow: '🌍 지구의 에너지 흐름 경로 상자', apply: '🔗 사례 분류 · 전환 사슬 · 내가 할 일' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  fuReset();
  let lastFree = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode === 'fusion') fuStep(dt); else S.Ts = approach(S.Ts, S.T, dt, 3);
    if (S.mode === 'mass') { const wasBusy = S.fuseT >= 0 && !S.fuseDone; stepMass(dt); if (wasBusy && S.fuseDone) updateCtl(); }
    if (S.mode === 'flow') stepFlow(dt);
    const b = activeBoard(); if (b) b.update(dt);
    parts.update(dt);
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    ctx.fillStyle = BG[S.mode]; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'fusion') drawFusion(t);
    else if (S.mode === 'mass') drawMass(t);
    else if (S.mode === 'flow') drawFlow(t);
    else if (S.subAp === 'sort') { D.text(PHONE ? 300 : 400, 36, '에너지의 근원을 따져 봐요', { size: 17, weight: 800, color: '#334155' }); sortBoard.draw(t); }
    else if (S.subAp === 'chain') drawChainScene(t);
    else drawActScene(t);
    parts.draw(ctx);
    drawFlash(dt, 10);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(255,255,255,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, K, FU, fz, VW, VH, PATHS, sortBoard, chainBoard, ACTS, CG, FW, FL, enterLevel, pathAt, fuStep, startFuse,
    get game() { return game; },
    solveSort() { sortBoard.cards.forEach((c) => { c.zone = c.t; }); sortBoard.layout(true); },
    solveChain() { chainBoard.cards.forEach((c) => { c.zone = c.t === 'x' ? null : c.t; }); chainBoard.layout(true); },
    setT(v) { S.T = v; setSlider(sT, oT, v, (x) => x + '만 K'); },
    setM(v) { S.M = v; setSlider(sM, oM, v, (x) => x + ' g'); },
    forceHe() { FU.heHigh++; FU.heTotal++; },
    simSeconds(sec, T) { S.T = S.Ts = T; for (let i = 0; i < sec * 20; i++) fuStep(0.05); },
    tapPath(i) { return { x: FW.nx + 40, y: FW.ny[i] }; },
  };
})();
