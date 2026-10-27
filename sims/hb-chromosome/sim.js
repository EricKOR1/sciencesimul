(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 640 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const ease = SciSim.ease;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* 받침 유무에 따라 조사 고르기: josa('핵형', '은', '는') */
  function josa(w, a, b) { const ch = String(w).charCodeAt(String(w).length - 1); if (ch < 0xAC00 || ch > 0xD7A3) return b; return ((ch - 0xAC00) % 28) ? a : b; }

  const PAT = '#2f6fdd', MAT = '#e0453f';   // 부계(파랑) / 모계(빨강)
  const BG = '#f1f6f3';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '', sp = -1;
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; sp = -1; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) {
        if (sp > 0 && ch !== ' ') { out.push(line.slice(0, sp).trimEnd()); line = line.slice(sp + 1) + ch; } else { out.push(line); line = ch.trim() === '' ? '' : ch; }
        sp = line.lastIndexOf(' ');
      } else { line = t; if (ch === ' ') sp = line.length - 1; }
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* 염색 분체 한 가닥 (세로 막대): 가운데 y를 기준으로 len 길이, 동원체는 위에서 cen 비율 */
  function rod(x, y, len, w, ang, color, cen, o) {
    o = o || {};
    cen = cen == null ? 0.5 : cen;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    const top = -len / 2, cy = top + len * cen, gap = Math.max(1.2, w * 0.14);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, C.shade(color, 0.35)); g.addColorStop(0.45, color); g.addColorStop(1, C.shade(color, -0.3));
    ctx.fillStyle = g; ctx.strokeStyle = C.shade(color, -0.45); ctx.lineWidth = Math.max(1, w * 0.1);
    const arm = (y0, y1) => { if (y1 - y0 < 1) return; D.roundRect(-w / 2, y0, w, y1 - y0, Math.min(w / 2, (y1 - y0) / 2)); ctx.fill(); ctx.stroke(); };
    arm(top, cy - gap * 0.4); arm(cy + gap * 0.4, top + len);
    // 동원체(잘록한 부분)
    ctx.fillStyle = o.cenColor || 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.ellipse(0, cy, w * 0.42, Math.max(1.4, gap), 0, 0, TAU); ctx.fill();
    if (o.bands) {
      ctx.fillStyle = 'rgba(20,20,60,.42)';
      o.bands.forEach((b) => { const by = top + len * b[0], bh = Math.max(1.4, len * b[1]); ctx.fillRect(-w / 2 + w * 0.08, by - bh / 2, w * 0.84, bh); });
    }
    // 광택
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(-w * 0.28, top + len * 0.05, w * 0.16, len * 0.9);
    ctx.restore();
  }

  /* 라벨 지시선: (x1,y1)에서 (x2,y2)로 점선 + 알약 글자 */
  function callout(x1, y1, x2, y2, text, o) {
    o = o || {};
    D.dashedLine(x1, y1, x2, y2, { color: o.line || '#64748b', width: 1.6, dash: [4, 4] });
    ctx.fillStyle = o.line || '#64748b'; ctx.beginPath(); ctx.arc(x1, y1, 3, 0, TAU); ctx.fill();
    return D.label(x2, y2, text, { bg: o.bg || '#fff', color: o.color || '#1f2d44', border: o.border || '#cbd5e1', size: o.size || 13, align: o.align });
  }

  /* 순서 고르기 (DOM): 보기 버튼을 누른 순서대로 번호 칩이 쌓여요 */
  function makePicker(root, items, onChange) {
    let seq = [];
    root.innerHTML = '';
    const pool = document.createElement('div'); pool.className = 'pk-pool';
    const row = document.createElement('div'); row.className = 'pk-seq';
    const rst = document.createElement('button'); rst.type = 'button'; rst.className = 'btn btn-sm pk-reset'; rst.textContent = '↺ 다시 고르기';
    root.append(pool, row, rst);
    const btns = items.map((it) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pk-item'; b.innerHTML = it.html; b.dataset.id = it.id;
      b.addEventListener('click', () => { if (seq.indexOf(it.id) >= 0) return; seq.push(it.id); Sound.click(); render(); onChange && onChange(seq.slice()); });
      pool.appendChild(b); return b;
    });
    function render() {
      row.innerHTML = '';
      seq.forEach((id, i) => {
        const it = items.find((x) => x.id === id);
        const c = document.createElement('button'); c.type = 'button'; c.className = 'pk-chip'; c.innerHTML = '<b>' + (i + 1) + '</b> ' + it.html; c.title = '눌러서 빼기';
        c.addEventListener('click', () => { seq = seq.slice(0, i); Sound.click(); render(); onChange && onChange(seq.slice()); });
        row.appendChild(c);
      });
      btns.forEach((b) => { b.disabled = seq.indexOf(b.dataset.id) >= 0; });
      row.classList.remove('bad'); row.classList.remove('ok');
    }
    rst.addEventListener('click', () => { seq = []; Sound.click(); render(); onChange && onChange([]); });
    render();
    return { get seq() { return seq.slice(); }, set(a) { seq = a.slice(); render(); onChange && onChange(seq.slice()); }, reset() { seq = []; render(); onChange && onChange([]); }, mark(cls) { row.classList.remove('bad', 'ok'); if (cls) row.classList.add(cls); } };
  }

  /* =========================================================
     고등학교 생명과학 Ⅲ. 생명의 연속성과 다양성 - 염색체와 핵형 분석 (단원 39, 1차시)
     성취기준 [12생과03-01] 염색체의 구조를 이해하고, DNA, 유전자의 관계를 설명할 수 있다.
     ① 관찰: 핵 속 DNA (줌 인, 길이 비교)  ② 모형: 염색체 구조 (응축, 복제, 상동 염색체)
     ③ 설명: 유전자와 DNA (유전자 자리, 대립유전자, 포함 관계)  ④ 탐구: 핵형 분석 (염색체 카드 46개)
     ========================================================= */
  const S = { mode: 'zoom', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const approach = SciSim.approach;

  /* ---------- 배치 ---------- */
  const LENS = PHONE ? { cx: 240, cy: 180, r: 132 } : { cx: 236, cy: 296, r: 192 };
  const RULER = PHONE ? { x: 10, y: 352, w: 460, h: 280 } : { x: 450, y: 56, w: 340, h: 486 };
  const STAGE_NAMES = ['세포', '핵', '염색사', 'DNA'];
  const ZOOM_R = 5;
  const STAGE_DESC = [
    '세포 가운데에 핵이 있어요. 핵 지름은 약 6 µm예요.',
    '핵 속에는 실처럼 가는 염색사(염색질)가 엉켜 있어요.',
    '염색사: DNA가 히스톤 구슬을 감고 있어요. (구슬 하나 약 10 nm)',
    'DNA 이중 나선 (지름 약 2 nm). 염기쌍 A–T, G–C로 이어져요.',
  ];
  const BASE_COL = { A: '#16a34a', T: '#e11d48', G: '#2563eb', C: '#f59e0b' };

  /* =========================================================
     ① 핵 속 DNA : 세포 → 핵 → 염색사 → DNA 줌 인
     ========================================================= */
  const RZ = mulberry(7);
  const ORGS = []; for (let i = 0; i < 22; i++) { const a = RZ() * TAU, d = 0.34 + RZ() * 0.4; ORGS.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: 0.03 + RZ() * 0.035, rot: RZ() * TAU, m: i % 3 === 0 }); }
  const CHROMATIN = [];
  (function () {
    const rr = mulberry(31);
    for (let s = 0; s < 18; s++) {
      const pts = []; let a = rr() * TAU, d = 0.15 + rr() * 0.6;
      for (let i = 0; i < 9; i++) { a += (rr() - 0.5) * 1.6; d = clamp(d + (rr() - 0.5) * 0.4, 0.05, 0.76); pts.push([Math.cos(a) * d, Math.sin(a) * d]); }
      CHROMATIN.push(pts);
    }
    // 가운데(확대할 곳)를 지나는 가닥
    for (let s = 0; s < 4; s++) { const a0 = rr() * TAU; CHROMATIN.push([[Math.cos(a0) * 0.6, Math.sin(a0) * 0.6], [Math.cos(a0 + 0.5) * 0.25, Math.sin(a0 + 0.5) * 0.25], [rr() * 0.1 - 0.05, rr() * 0.1 - 0.05], [Math.cos(a0 + 3) * 0.3, Math.sin(a0 + 3) * 0.3], [Math.cos(a0 + 3.4) * 0.65, Math.sin(a0 + 3.4) * 0.65]]); }
  })();
  function smoothPath(pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    const n = pts.length; ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
  function stageBgColor(k) { return ['#eaf3fb', '#e5dcf6', '#f3ecfb', '#fdf6e8'][k]; }

  function helix(len, amp, k, ph, widthStrand, opt) {
    /* 가로 이중 나선 (단위 좌표, x:-len/2..len/2) */
    opt = opt || {};
    const n = Math.ceil(len / 0.02), x0 = -len / 2;
    const pair = ['A', 'T', 'G', 'C', 'T', 'A', 'C', 'G', 'A', 'T', 'T', 'A', 'G', 'C'];
    const strand = (sgn, front) => {
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const xa = x0 + i * 0.02, xb = xa + 0.02;
        const za = Math.cos(k * xa + ph + (sgn < 0 ? Math.PI : 0)), zb = Math.cos(k * xb + ph + (sgn < 0 ? Math.PI : 0));
        if ((za + zb) / 2 > 0 !== front) continue;
        ctx.strokeStyle = front ? '#2563eb' : '#7c9be0'; ctx.lineWidth = widthStrand * (front ? 1.15 : 0.8);
        ctx.beginPath(); ctx.moveTo(xa, amp * Math.sin(k * xa + ph + (sgn < 0 ? Math.PI : 0))); ctx.lineTo(xb, amp * Math.sin(k * xb + ph + (sgn < 0 ? Math.PI : 0))); ctx.stroke();
      }
    };
    strand(1, false); strand(-1, false);
    // 염기쌍
    const step = Math.PI / k / 3.2;
    let idx = 0;
    for (let x = x0 + 0.04; x < len / 2 - 0.02; x += step) {
      const yy = amp * Math.sin(k * x + ph);
      if (Math.abs(yy) < amp * 0.12) { idx++; continue; }
      const b = pair[idx % pair.length], c2 = { A: 'T', T: 'A', G: 'C', C: 'G' }[b];
      ctx.lineWidth = widthStrand * 0.7; ctx.lineCap = 'butt';
      ctx.strokeStyle = BASE_COL[b]; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, 0); ctx.stroke();
      ctx.strokeStyle = BASE_COL[c2]; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -yy); ctx.stroke();
      idx++;
    }
    strand(1, true); strand(-1, true);
  }

  function drawStage(k, t) {
    // 단위 좌표(반지름 1)로 그린 한 장면
    ctx.fillStyle = stageBgColor(k); ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill();
    if (k === 0) {
      const g = ctx.createRadialGradient(-0.25, -0.3, 0.1, 0, 0, 0.9);
      g.addColorStop(0, '#f8fcff'); g.addColorStop(1, '#cfe3f7');
      ctx.fillStyle = g; ctx.strokeStyle = '#6f9cc9'; ctx.lineWidth = 0.035;
      ctx.beginPath(); ctx.arc(0, 0, 0.88, 0, TAU); ctx.fill(); ctx.stroke();
      ORGS.forEach((o) => {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
        if (o.m) { ctx.fillStyle = '#f6a96b'; ctx.strokeStyle = '#d97706'; ctx.lineWidth = 0.008; ctx.beginPath(); ctx.ellipse(0, 0, o.r * 1.9, o.r * 1.0, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
        else { ctx.fillStyle = '#9cb8d6'; ctx.beginPath(); ctx.arc(0, 0, o.r * 0.7, 0, TAU); ctx.fill(); }
        ctx.restore();
      });
      const ng = ctx.createRadialGradient(-0.05, -0.06, 0.02, 0, 0, 0.21);
      ng.addColorStop(0, '#d9c8f7'); ng.addColorStop(1, '#a98ce0');
      ctx.fillStyle = ng; ctx.strokeStyle = '#6d4fc2'; ctx.lineWidth = 0.014;
      ctx.beginPath(); ctx.arc(0, 0, 0.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(80,50,160,.55)'; ctx.lineWidth = 0.008;
      for (let i = 0; i < 4; i++) { smoothPath(CHROMATIN[18 + i].map((p) => [p[0] * 0.28, p[1] * 0.28])); ctx.stroke(); }
    } else if (k === 1) {
      const g = ctx.createRadialGradient(-0.3, -0.3, 0.1, 0, 0, 0.95);
      g.addColorStop(0, '#f1e9fc'); g.addColorStop(1, '#cdb9ee');
      ctx.fillStyle = g; ctx.strokeStyle = '#6d4fc2'; ctx.lineWidth = 0.035;
      ctx.beginPath(); ctx.arc(0, 0, 0.9, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(109,79,194,.35)'; ctx.lineWidth = 0.012; ctx.beginPath(); ctx.arc(0, 0, 0.93, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(88,55,160,.55)'; ctx.beginPath(); ctx.arc(-0.42, -0.4, 0.15, 0, TAU); ctx.fill();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      CHROMATIN.forEach((pts, i) => { ctx.strokeStyle = i % 2 ? '#7a58cf' : '#5b3fb0'; ctx.lineWidth = 0.022; smoothPath(pts); ctx.stroke(); });
    } else if (k === 2) {
      const yf = (x) => 0.26 * Math.sin(2.3 * x + 0.5) + 0.06 * Math.sin(6.1 * x);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#f1a640'; ctx.lineWidth = 0.03; ctx.beginPath();
      for (let x = -1.4; x <= 1.4; x += 0.02) { const y = yf(x); x === -1.4 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const x = -1.2 + i * 0.22 + 0.02, y = yf(x), dy = yf(x + 0.01) - yf(x - 0.01), ang = Math.atan2(dy, 0.02);
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        // DNA가 구슬을 두 바퀴 감는 모양
        ctx.strokeStyle = '#f1a640'; ctx.lineWidth = 0.032;
        for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.ellipse(0, (j - 0.5) * 0.045, 0.125, 0.105, 0, 0, TAU); ctx.stroke(); }
        D.sphere(0, 0, 0.1, '#8b5cf6', { gloss: true });
        ctx.restore();
      }
    } else {
      ctx.save(); ctx.rotate(-0.18);
      helix(3.2, 0.36, 7.0, t * 1.6, 0.075);
      ctx.restore();
    }
  }
  const stageAlpha = (k, z) => clamp(1.6 - 2.2 * Math.abs(z - k), 0, 1);

  /* 줌 단계별 지시선 */
  const CALLS = [
    [{ lx: 0.1, ly: -0.1, tx: 0.42, ty: -0.58, text: '핵' }, { lx: -0.62, ly: -0.62, tx: -0.55, ty: -0.84, text: '세포막' }, { lx: -0.5, ly: 0.35, tx: -0.62, ty: 0.58, text: '세포질' }],
    [{ lx: -0.42, ly: -0.4, tx: -0.6, ty: -0.74, text: '핵소체' }, { lx: 0.55, ly: -0.35, tx: 0.42, ty: -0.74, text: '염색사' }, { lx: 0.9, ly: 0.2, tx: 0.5, ty: 0.7, text: '핵막' }],
    [{ lx: 0.0, ly: 0.2, tx: -0.4, ty: 0.62, text: '히스톤 구슬' }, { lx: 0.35, ly: -0.28, tx: 0.42, ty: -0.62, text: 'DNA' }],
    [{ lx: -0.35, ly: -0.2, tx: -0.55, ty: -0.58, text: '당-인산 뼈대' }, { lx: 0.3, ly: 0.05, tx: 0.45, ty: 0.55, text: '염기쌍' }],
  ];

  S.z = { v: 0, target: 0, seen: [true, false, false, false], calc: '', calcOk: false, pillT: 0 };
  function zoomSeen() { for (let k = 0; k < 4; k++) if (Math.abs(S.z.v - k) < 0.14) S.z.seen[k] = true; }
  const zoomAll = () => S.z.seen.every(Boolean) && S.z.v > 2.85;
  const PILL = (i) => (PHONE ? { x: 22 + i * 110, y: 8, w: 104, h: 30 } : { x: LENS.cx - LENS.r + i * 98, y: 22, w: 92, h: 30 });

  function drawLensFrame(t) {
    ctx.save();
    const rg = ctx.createLinearGradient(LENS.cx - LENS.r, LENS.cy - LENS.r, LENS.cx + LENS.r, LENS.cy + LENS.r);
    rg.addColorStop(0, '#94a3b8'); rg.addColorStop(0.5, '#334155'); rg.addColorStop(1, '#0f172a');
    ctx.strokeStyle = rg; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(LENS.cx, LENS.cy, LENS.r + 4.5, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function drawZoom(dt, t) {
    const z = S.z;
    z.v = RM ? z.target : approach(z.v, z.target, dt, 6);
    if (Math.abs(z.v - z.target) < 0.0015) z.v = z.target;
    zoomSeen();
    bgFill('#eef4f2', '#e3ece8');
    // 단계 이름표
    for (let i = 0; i < 4; i++) {
      const p = PILL(i), on = Math.abs(z.v - i) < 0.5, seen = z.seen[i];
      D.roundRect(p.x, p.y, p.w, p.h, p.h / 2); ctx.fillStyle = on ? '#16a34a' : seen ? '#fff' : '#f1f5f9'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#15803d' : seen ? '#86c99b' : '#cbd5e1'; ctx.stroke();
      T(p.x + p.w / 2, p.y + p.h / 2 + 5.5, (i + 1) + '. ' + STAGE_NAMES[i], 14.5, on ? '#fff' : seen ? '#166534' : '#94a3b8', 'center', 800);
    }
    // 렌즈 안 그림
    D.shadow(() => { ctx.beginPath(); ctx.arc(LENS.cx, LENS.cy, LENS.r + 9, 0, TAU); ctx.fillStyle = '#334155'; ctx.fill(); }, { blur: 14, y: 5 });
    ctx.save();
    ctx.beginPath(); ctx.arc(LENS.cx, LENS.cy, LENS.r, 0, TAU); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(LENS.cx - LENS.r, LENS.cy - LENS.r, LENS.r * 2, LENS.r * 2);
    for (let k = 0; k < 4; k++) {
      const a = stageAlpha(k, z.v); if (a < 0.01) continue;
      const s = Math.pow(ZOOM_R, z.v - k);
      ctx.save(); ctx.translate(LENS.cx, LENS.cy); ctx.scale(LENS.r * s, LENS.r * s); ctx.globalAlpha = a;
      drawStage(k, t);
      if (k < 3) { // 다음 단계로 확대할 곳
        ctx.globalAlpha = a * 0.9;
        ctx.setLineDash([0.05, 0.05]); ctx.lineDashOffset = -t * 0.08; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 0.022;
        ctx.beginPath(); ctx.arc(0, 0, 1 / ZOOM_R + 0.012 * Math.sin(t * 3), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
    }
    // 지시선(화면 좌표)
    for (let k = 0; k < 4; k++) {
      const a = stageAlpha(k, z.v); if (a < 0.5) continue;
      const s = Math.pow(ZOOM_R, z.v - k);
      CALLS[k].forEach((c) => {
        const ix = LENS.cx + c.lx * LENS.r * s, iy = LENS.cy + c.ly * LENS.r * s;
        let tx = LENS.cx + c.tx * LENS.r, ty = LENS.cy + c.ty * LENS.r;
        const fs = PHONE ? 12.5 : 13.5; ctx.font = D.font(fs, 800);
        const hw = ctx.measureText(c.text).width / 2 + 10;
        for (let q = 0; q < 12 && Math.hypot(Math.abs(tx - LENS.cx) + hw, Math.abs(ty - LENS.cy) + 12) > LENS.r - 6; q++) { tx = LENS.cx + (tx - LENS.cx) * 0.93; ty = LENS.cy + (ty - LENS.cy) * 0.93; }
        ctx.globalAlpha = (a - 0.5) * 2; callout(ix, iy, tx, ty, c.text, { size: fs }); ctx.globalAlpha = 1;
      });
    }
    ctx.restore();
    drawLensFrame(t);
    // 렌즈 아래 설명
    const kk = clamp(Math.round(z.v), 0, 3);
    const capY = LENS.cy + LENS.r + (PHONE ? 22 : 30);
    if (PHONE) T(LENS.cx, capY, STAGE_DESC[kk], 12.5, '#334155', 'center', 800);
    else textBlock(LENS.cx, capY - 6, LENS.r * 2 + 40, STAGE_DESC[kk], 14.5, '#334155', 19, 800, 'center');
    drawRuler(t);
  }

  /* 길이 비교 : 로그 눈금 (세로축 1 µm ~ 10 m) */
  function drawRuler(t) {
    const R = RULER;
    panel(R.x, R.y, R.w, R.h, 16, '#ffffff');
    T(R.x + R.w / 2, R.y + 28, '길이 비교 (로그 눈금)', PHONE ? 15 : 17, '#14532d', 'center', 800);
    const ax = R.x + (PHONE ? 96 : 98), yTop = R.y + (PHONE ? 52 : 100), yBot = R.y + R.h - (PHONE ? 22 : 40);
    const yOf = (m) => yBot - (Math.log10(m) + 6) / 7 * (yBot - yTop);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ax, yTop - 6); ctx.lineTo(ax, yBot + 6); ctx.stroke();
    const ticks = [[1e-6, '1 µm'], [1e-5, '10 µm'], [1e-4, '100 µm'], [1e-3, '1 mm'], [1e-2, '1 cm'], [1e-1, '10 cm'], [1, '1 m'], [10, '10 m']];
    ticks.forEach(([m, lab]) => {
      const y = yOf(m); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 8, y); ctx.lineTo(ax + 4, y); ctx.stroke();
      T(ax - 14, y + 5, lab, PHONE ? 12.5 : 13.5, '#475569', 'right', 700);
    });
    // 핵 지름 6 µm / DNA 길이 2 m
    const yN = yOf(6e-6), yD = yOf(2);
    const mk = (y, col, name, val, side) => {
      D.glow(ax, y, 20, col, 0.45); D.sphere(ax, y, 8, col, { shadow: true });
      D.dashedLine(ax + 12, y, ax + 38, y, { color: col, width: 2 });
      D.label(ax + 42, y, name + ' ' + val, { bg: col, color: '#fff', size: PHONE ? 13 : 14, align: 'left' });
    };
    mk(yD, '#2563eb', 'DNA 길이', '약 2 m');
    mk(yN, '#7c3aed', '핵 지름', '약 6 µm');
    // 비율 화살표
    const bx = R.x + R.w - (PHONE ? 38 : 44);
    D.arrow(bx, yN - 10, bx, yD + 10, { color: '#16a34a', width: 3, head: 12 });
    D.arrow(bx, yD + 10, bx, yN - 10, { color: '#16a34a', width: 3, head: 12 });
    const my = (yN + yD) / 2;
    const ok = S.z.calcOk || (game && game.free);
    const lab = ok ? '약 3.3 × 10⁵배' : '몇 배? (계산해 보세요)';
    const lw = PHONE ? 150 : 158;
    D.label(bx - lw / 2 - 18, my, lab, { bg: ok ? '#16a34a' : '#fff', color: ok ? '#fff' : '#16a34a', border: '#16a34a', size: PHONE ? 13 : 14 });
    // 직선 눈금이라면
    if (!PHONE) textBlock(R.x + 16, R.y + 52, R.w - 32, '같은 눈금(직선)에 그리면 6 µm는 2 m의 0.0003 %라서 점으로도 보이지 않아요.', 13, '#64748b', 17, 700);
  }

  /* =========================================================
     ② 염색체 구조 : DNA → 뉴클레오솜 → 염색사 → 염색체, 복제와 상동 염색체
     ========================================================= */
  const CD = PHONE ? { x: 10, y: 44, w: 460, h: 300 } : { x: 16, y: 52, w: 468, h: 490 };
  const PR = PHONE ? { x: 10, y: 352, w: 460, h: 280 } : { x: 496, y: 52, w: 288, h: 490 };
  const COND_NAMES = ['DNA 이중 나선', '뉴클레오솜', '염색사', '염색체'];
  const COND_DESC = [
    '염기쌍으로 이어진 DNA 이중 나선이에요. 아직 길게 펴진 상태예요.',
    'DNA가 히스톤 단백질 구슬을 감아요. 이 구슬 하나를 뉴클레오솜이라고 해요.',
    '뉴클레오솜 줄이 다시 촘촘하게 감겨 굵은 염색사(염색질)가 돼요.',
    '세포 분열기에는 염색사가 가장 응축되어 막대 모양 염색체로 보여요.',
  ];
  const FH = [1, 0.78, 0.6, 0.46];
  const fhOf = (c) => { const i = clamp(Math.floor(c), 0, 2), f = clamp(c - i, 0, 1); return lerp(FH[i], FH[i + 1], smooth(f)); };
  const CEN = 0.42;
  const BANDS2 = [[0.2, 0.05], [0.68, 0.055]];
  S.cond = { v: 0, target: 0 };
  S.rep = { r: 0, target: 0, seen: [true, false], t0: 0, fx: 0 };

  function helixV(cx, y0, len, amp, ph, sw) {
    const k = TAU / (PHONE ? 30 : 38), n = Math.ceil(len / 2);
    const px = (y, s) => cx + amp * Math.sin(k * y + ph + s);
    const pass = (s, front) => {
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const ya = y0 + i * 2, yb = ya + 2, z = Math.cos(k * (ya + 1) + ph + s);
        if ((z > 0) !== front) continue;
        ctx.strokeStyle = front ? '#2563eb' : '#8aa6e6'; ctx.lineWidth = sw * (front ? 1.1 : 0.78);
        ctx.beginPath(); ctx.moveTo(px(ya, s), ya); ctx.lineTo(px(yb, s), yb); ctx.stroke();
      }
    };
    pass(0, false); pass(Math.PI, false);
    const pair = ['A', 'T', 'G', 'C', 'T', 'A', 'C', 'G', 'A', 'T', 'T', 'A', 'G', 'C'];
    let idx = 0;
    for (let y = y0 + 4; y < y0 + len - 3; y += 6.2) {
      const xa = px(y, 0), xb = px(y, Math.PI);
      if (Math.abs(xa - xb) > amp * 0.3) {
        const b = pair[idx % pair.length], b2 = { A: 'T', T: 'A', G: 'C', C: 'G' }[b], mx = (xa + xb) / 2;
        ctx.lineWidth = sw * 0.62; ctx.lineCap = 'butt';
        ctx.strokeStyle = BASE_COL[b]; ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(mx, y); ctx.stroke();
        ctx.strokeStyle = BASE_COL[b2]; ctx.beginPath(); ctx.moveTo(mx, y); ctx.lineTo(xb, y); ctx.stroke();
      }
      idx++;
    }
    pass(0, true); pass(Math.PI, true);
  }
  function drawChromosomePair1(x, y, len, w, r, color, o) {
    // 복제 정도 r(0~1): 염색 분체 1개 -> 2개
    o = o || {};
    const wid = lerp(w, w * 0.84, r), off = r * (w * 0.5 + 1.2);
    rod(x - off, y, len, wid, 0, color, CEN, { bands: o.bands ? BANDS2 : null, alpha: o.alpha });
    if (r > 0.02) rod(x + off, y, len, wid, 0, color, CEN, { bands: o.bands ? BANDS2 : null, alpha: o.alpha == null ? clamp(r * 2, 0, 1) : o.alpha * clamp(r * 2, 0, 1) });
  }
  function drawCond(dt, t) {
    const c = S.cond.v, cx = CD.x + CD.w * (PHONE ? 0.4 : 0.44);
    panel(CD.x, CD.y, CD.w, CD.h, 16, '#ffffff');
    // 단계 이름표
    const pw = (CD.w - 20) / 4;
    for (let i = 0; i < 4; i++) {
      const px = CD.x + 10 + i * pw, py = CD.y + 8, on = Math.abs(c - i) < 0.5;
      D.roundRect(px + 2, py, pw - 4, 30, 15); ctx.fillStyle = on ? '#16a34a' : '#f1f5f9'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#15803d' : '#cbd5e1'; ctx.stroke();
      T(px + pw / 2, py + 20, COND_NAMES[i], PHONE ? 12.5 : 14, on ? '#fff' : '#64748b', 'center', 800);
    }
    const Hmax = CD.h - (PHONE ? 100 : 146), yc = CD.y + 50 + Hmax / 2;
    const h = Hmax * fhOf(c), y0 = yc - h / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(CD.x, CD.y + 44, CD.w, CD.h - 44 - (PHONE ? 46 : 78)); ctx.clip();
    // 길이 표시
    D.arrow(CD.x + 34, y0, CD.x + 34, y0 + h, { color: '#16a34a', width: 2.5, head: 9 });
    D.arrow(CD.x + 34, y0 + h, CD.x + 34, y0, { color: '#16a34a', width: 2.5, head: 9 });
    ctx.save(); ctx.translate(CD.x + 22, yc); ctx.rotate(-Math.PI / 2); T(0, 0, '같은 DNA의 길이', 13, '#16a34a', 'center', 800); ctx.restore();
    // 네 가지 모양을 겹쳐서 부드럽게 바꿔 그리기
    const a = (k) => clamp(1.6 - 2.2 * Math.abs(c - k), 0, 1);
    if (a(0) > 0.01) { ctx.save(); ctx.globalAlpha = a(0); helixV(cx, y0, h, PHONE ? 13 : 21, t * 1.4, PHONE ? 3.4 : 5.2); ctx.restore(); }
    if (a(1) > 0.01) {
      ctx.save(); ctx.globalAlpha = a(1);
      const sp = PHONE ? 29 : 40, n = Math.max(2, Math.floor(h / sp)), real = h / n;
      const px = (y) => cx + (PHONE ? 6 : 9) * Math.sin(y / 22), br = PHONE ? 10 : 15;
      ctx.strokeStyle = '#f1a640'; ctx.lineWidth = PHONE ? 2.6 : 3.4; ctx.lineCap = 'round';
      ctx.beginPath(); for (let y = y0; y <= y0 + h; y += 3) { y === y0 ? ctx.moveTo(px(y), y) : ctx.lineTo(px(y), y); } ctx.stroke();
      for (let i = 0; i < n; i++) {
        const y = y0 + real * (i + 0.5), x = px(y);
        ctx.strokeStyle = '#f1a640'; ctx.lineWidth = PHONE ? 2.6 : 3.4;
        for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.ellipse(x, y + (j - 0.5) * 3.6, br * 1.28, br * 0.92, 0, 0, TAU); ctx.stroke(); }
        D.sphere(x, y, br, '#8b5cf6', { shadow: false });
      }
      ctx.restore();
    }
    if (a(2) > 0.01) {
      ctx.save(); ctx.globalAlpha = a(2);
      const w = PHONE ? 38 : 56, st = PHONE ? 7 : 9;
      for (let y = y0 + w * 0.25; y < y0 + h - w * 0.2; y += st) {
        const k = Math.round((y - y0) / st), tilt = (k % 2 ? 1 : -1) * 0.22;
        const g = ctx.createLinearGradient(cx - w / 2, y, cx + w / 2, y);
        g.addColorStop(0, '#c7b2f5'); g.addColorStop(0.5, '#8b5cf6'); g.addColorStop(1, '#5b3fb0');
        ctx.fillStyle = g; ctx.strokeStyle = '#4c3399'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.ellipse(cx, y, w / 2, st * 0.78, tilt, 0, TAU); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    }
    if (a(3) > 0.01) {
      ctx.save(); ctx.globalAlpha = a(3);
      const w = PHONE ? 30 : 44, r = S.rep.r;
      drawChromosomePair1(cx, yc, h, w, r, '#7a5fb0', { bands: true });
      ctx.restore();
    }
    ctx.restore();
    // 설명
    const kk = clamp(Math.round(c), 0, 3);
    D.label(cx + (PHONE ? 130 : 150), CD.y + 74 + (PHONE ? 6 : 12), COND_NAMES[kk], { bg: '#16a34a', color: '#fff', size: PHONE ? 14 : 16, align: 'center' });
    if (PHONE) textBlock(CD.x + 14, CD.y + CD.h - 34, CD.w - 28, COND_DESC[kk], 13, '#334155', 17, 800);
    else textBlock(CD.x + 16, CD.y + CD.h - 60, CD.w - 32, COND_DESC[kk], 15, '#334155', 21, 800);
    drawPairPanel(dt, t);
  }
  function drawPairPanel(dt, t) {
    const r = S.rep.r;
    panel(PR.x, PR.y, PR.w, PR.h, 16, '#ffffff');
    T(PR.x + PR.w / 2, PR.y + 28, '상동 염색체 한 쌍', PHONE ? 15 : 17, '#14532d', 'center', 800);
    const len = PHONE ? 130 : 230, w = PHONE ? 15 : 24;
    const xB = PR.x + PR.w * (PHONE ? 0.16 : 0.2), xR = PR.x + PR.w * (PHONE ? 0.4 : 0.46);
    const yc = PR.y + (PHONE ? 118 : 178);
    if (S.rep.flash > 0.01) { D.glow(xB, yc, len * 0.8, '#fde047', S.rep.flash * 0.5); D.glow(xR, yc, len * 0.8, '#fde047', S.rep.flash * 0.5); }
    drawChromosomePair1(xB, yc, len, w, r, PAT, { bands: true });
    drawChromosomePair1(xR, yc, len, w, r, MAT, { bands: true });
    // 같은 자리 점선
    const yLoc = yc - len / 2 + len * 0.2;
    D.dashedLine(xB - w - 6, yLoc, xR + w + 6, yLoc, { color: '#94a3b8', width: 1.6, dash: [5, 4] });
    T(xB, yc + len / 2 + 22, '아버지', PHONE ? 13 : 14.5, PAT, 'center', 800);
    T(xR, yc + len / 2 + 22, '어머니', PHONE ? 13 : 14.5, MAT, 'center', 800);
    // 지시선
    const cenY = yc - len / 2 + len * CEN;
    if (PHONE) {
      callout(xR + w + 4, cenY, PR.x + PR.w * 0.62, cenY + 4, '동원체', { size: 13 });
      if (r > 0.6) callout(xR + w * 0.9, yc + len * 0.28, PR.x + PR.w * 0.62, yc + len * 0.28, '염색 분체 2개', { size: 13 });
      callout((xB + xR) / 2, yLoc, PR.x + PR.w * 0.62, yLoc - 4, '같은 자리', { size: 13 });
    } else {
      callout(xR + w + 4, cenY, PR.x + PR.w - 66, cenY + 6, '동원체', { size: 13.5, align: 'center' });
      if (r > 0.6) callout(xR + w * 0.9, yc + len * 0.28, PR.x + PR.w - 80, yc + len * 0.28 + 6, '염색 분체 2개', { size: 13.5, align: 'center' });
      callout((xB + xR) / 2, yLoc, PR.x + PR.w - 66, yLoc - 4, '같은 자리', { size: 13.5, align: 'center' });
    }
    const ty = PR.y + PR.h - (PHONE ? 42 : 98);
    if (!PHONE) {
      textBlock(PR.x + 16, ty, PR.w - 32, r > 0.5 ? '복제 후: 한 염색체가 같은 염색 분체 2개로 이루어져요. 염색 분체 1개마다 DNA 1분자가 들어 있어요.' : '복제 전: 염색 분체 1개 = DNA 1분자예요. 아버지와 어머니에게서 하나씩 받은 같은 크기·모양의 쌍이에요.', 13.5, '#334155', 18.5, 800);
    } else {
      textBlock(PR.x + 14, ty + 4, PR.w - 28, r > 0.5 ? '복제 후: 같은 염색 분체 2개, DNA 2분자예요.' : '복제 전: 염색 분체 1개 = DNA 1분자예요.', 13, '#334155', 17, 800);
    }
  }
  function stepStruct(dt) {
    S.cond.v = RM ? S.cond.target : approach(S.cond.v, S.cond.target, dt, 5);
    if (Math.abs(S.cond.v - S.cond.target) < 0.002) S.cond.v = S.cond.target;
    const prev = S.rep.r;
    S.rep.r = RM ? S.rep.target : approach(S.rep.r, S.rep.target, dt, 3.2);
    if (Math.abs(S.rep.r - S.rep.target) < 0.004) S.rep.r = S.rep.target;
    if (S.rep.r < 0.02) S.rep.seen[0] = true;
    if (S.rep.r > 0.98) { if (!S.rep.seen[1]) { const yc = PR.y + (PHONE ? 118 : 178); parts.burst(PR.x + PR.w * 0.5, yc, { count: 16, colors: ['#fde047', '#16a34a', '#fff'], speed: 140, size: 3.5, life: 0.8 }); } S.rep.seen[1] = true; }
    S.rep.flash = approach(S.rep.flash, 0, dt, 2.5);
    if (S.rep.target > 0.5 && prev < S.rep.r && S.rep.r < 0.97) S.rep.flash = Math.max(S.rep.flash, 0.6);
  }

  /* =========================================================
     ③ 유전자와 DNA : 유전자 자리, 대립유전자, 전사·번역 요약, 포함 관계
     ========================================================= */
  const GENES = [
    { name: 'A', frac: 0.2, blue: { al: 'A', seq: 'TACCGATTCAGT' }, red: { al: 'a', seq: 'TACCGATTGAGT' } },
    { name: 'B', frac: 0.52, blue: { al: 'B', seq: 'TACGGTCTTACC' }, red: { al: 'B', seq: 'TACGGTCTTACC' } },
    { name: 'C', frac: 0.8, blue: { al: 'C', seq: 'TACCTAGCGTTT' }, red: { al: 'c', seq: 'TACCTAGCGTAT' } },
  ];
  const CODON = { AUG: 'Met', GCU: 'Ala', AAG: 'Lys', UCA: 'Ser', AAC: 'Asn', CCA: 'Pro', GAA: 'Glu', UGG: 'Trp', GAU: 'Asp', CGC: 'Arg', AAA: 'Lys', AUA: 'Ile' };
  const COMP_R = { A: 'U', T: 'A', C: 'G', G: 'C' };
  const mrnaOf = (seq) => seq.split('').map((b) => COMP_R[b]).join('');
  const protOf = (seq) => { const m = mrnaOf(seq), out = []; for (let i = 0; i < m.length; i += 3) out.push(CODON[m.substr(i, 3)] || '?'); return out; };
  const GENE_COL = ['#f59e0b', '#14b8a6', '#ec4899'];
  S.gene = { sel: -1, which: 0, seen: [false, false, false], pop: [0, 0, 0], selA: 0, t0: 0 };
  const GR1 = PHONE ? { x: 10, y: 44, w: 460, h: 164 } : { x: 16, y: 52, w: 768, h: 184 };
  const CH_X0 = PHONE ? 66 : 108, CH_X1 = PHONE ? 436 : 692, CH_H = PHONE ? 24 : 32;
  const CH_YB = PHONE ? 118 : 118, CH_YR = PHONE ? 164 : 180;
  const locX = (g) => CH_X0 + (CH_X1 - CH_X0) * g.frac;
  function selectGene(i, which) {
    S.gene.sel = i; if (which != null) S.gene.which = which; S.gene.seen[i] = true; S.gene.t0 = S.clock; Sound.click();
    parts.burst(locX(GENES[i]), (CH_YB + CH_YR) / 2, { count: 10, colors: [GENE_COL[i], '#fff'], speed: 110, size: 3, life: 0.6 });
    updateCtl();
  }
  function geneDown(p) {
    for (let i = 0; i < 3; i++) {
      const x = locX(GENES[i]);
      if (Math.abs(p.x - x) < 24 && p.y > GR1.y + 24 && p.y < GR1.y + GR1.h) {
        const which = p.y > (CH_YB + CH_YR) / 2 + 6 ? 1 : p.y < (CH_YB + CH_YR) / 2 - 6 ? 0 : S.gene.which;
        selectGene(i, which); return false;
      }
    }
    return false;
  }
  function chromH(x0, x1, y, h, color, cenFrac) {
    // 가로 막대 염색체 (동원체 부분이 잘록)
    const cx = x0 + (x1 - x0) * cenFrac, wst = h * 0.28;
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, C.shade(color, 0.4)); g.addColorStop(0.5, color); g.addColorStop(1, C.shade(color, -0.3));
    ctx.fillStyle = g; ctx.strokeStyle = C.shade(color, -0.45); ctx.lineWidth = 1.6;
    D.roundRect(x0, y - h / 2, cx - x0 - wst * 0.3, h, h / 2); ctx.fill(); ctx.stroke();
    D.roundRect(cx + wst * 0.3, y - h / 2, x1 - cx - wst * 0.3, h, h / 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.ellipse(cx, y, wst * 0.9, h * 0.34, 0, 0, TAU); ctx.fill();
  }
  function seqRow(x, y, seq, other, label, col, cw, size) {
    // 염기 서열 12칸 (다른 칸은 빨간 테두리)
    T(x - 8, y + cw * 0.72, label, PHONE ? 12.5 : 13.5, col, 'right', 800);
    for (let i = 0; i < seq.length; i++) {
      const b = seq[i], diff = other && other[i] !== b, gx = x + i * (cw + 2) + Math.floor(i / 3) * 6;
      D.roundRect(gx, y, cw, cw * 1.1, 4); ctx.fillStyle = BASE_COL[b]; ctx.fill();
      if (diff) { ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.6; ctx.stroke(); }
      T(gx + cw / 2, y + cw * 0.76, b, size, '#fff', 'center', 800);
    }
  }
  function drawGene(dt, t) {
    const G = S.gene;
    G.pop = G.pop.map((v, i) => approach(v, G.sel === i ? 1 : 0, dt, 9));
    panel(GR1.x, GR1.y, GR1.w, GR1.h, 16, '#fff');
    T(GR1.x + 14, GR1.y + 24, '상동 염색체 한 쌍', PHONE ? 14 : 16, '#14532d', 'left', 800);
    if (!PHONE) T(GR1.x + GR1.w - 14, GR1.y + 24, '번호를 눌러 비교해요', 13.5, '#64748b', 'right', 700);
    chromH(CH_X0, CH_X1, CH_YB, CH_H, PAT, 0.36);
    chromH(CH_X0, CH_X1, CH_YR, CH_H, MAT, 0.36);
    T(CH_X0 - 12, CH_YB + 5, '아버지', PHONE ? 12 : 13.5, PAT, 'right', 800);
    T(CH_X0 - 12, CH_YR + 5, '어머니', PHONE ? 12 : 13.5, MAT, 'right', 800);
    GENES.forEach((g, i) => {
      const x = locX(g), pp = G.pop[i], col = GENE_COL[i];
      if (pp > 0.02) D.glow(x, (CH_YB + CH_YR) / 2, 70 * pp, col, 0.4);
      [[CH_YB, g.blue, PAT], [CH_YR, g.red, MAT]].forEach(([y, a, cc], k) => {
        const w = (PHONE ? 11 : 15) * (1 + pp * 0.3);
        ctx.fillStyle = col; D.roundRect(x - w / 2, y - CH_H / 2 - 3, w, CH_H + 6, 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        const ly = k === 0 ? y - CH_H / 2 - (PHONE ? 15 : 19) : y + CH_H / 2 + (PHONE ? 17 : 22);
        D.sphere(x, ly, PHONE ? 11 : 14, cc, { text: a.al, shadow: false });
      });
      D.dashedLine(x, CH_YB + CH_H / 2 + 5, x, CH_YR - CH_H / 2 - 5, { color: col, width: 2, dash: [4, 3] });
      const my = (CH_YB + CH_YR) / 2, rr = (PHONE ? 13 : 16) * (1 + pp * 0.18);
      D.sphere(x, my, rr, col, { text: String(i + 1), shadow: true });
      if (!G.seen[i] && !(game && game.free)) D.ring(x, my, rr + 4, t + i * 0.3, { color: col });
    });
    // DNA 모식도
    const dy = GR1.y + GR1.h + (PHONE ? 14 : 18);
    const dnaH = PHONE ? 16 : 20, bx0 = PHONE ? 30 : 40, bx1 = PHONE ? 450 : 760;
    T(bx0, dy + 4, '염색체 하나의 DNA (모식도)', PHONE ? 13 : 14.5, '#14532d', 'left', 800);
    T(bx1, dy + 4, PHONE ? '회색 = 유전자 사이 (비율은 달라요)' : '회색 = 유전자 사이 부위 (비율은 실제와 달라요)', PHONE ? 11.5 : 13, '#64748b', 'right', 700);
    const by = dy + (PHONE ? 16 : 20);
    D.roundRect(bx0, by, bx1 - bx0, dnaH, dnaH / 2); ctx.fillStyle = '#cbd5e1'; ctx.fill();
    const gw = PHONE ? 50 : 82;
    GENES.forEach((g, i) => {
      const gx = bx0 + (bx1 - bx0) * g.frac - gw / 2, on = G.sel === i;
      D.roundRect(gx, by - 3, gw, dnaH + 6, 8); ctx.fillStyle = GENE_COL[i]; ctx.globalAlpha = on || G.sel < 0 ? 1 : 0.45; ctx.fill(); ctx.globalAlpha = 1;
      if (on) { ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.2; ctx.stroke(); }
      T(gx + gw / 2, by + dnaH / 2 + 5, '유전자 ' + g.name, PHONE ? 11.5 : 13, '#fff', 'center', 800);
    });
    // 염기 서열 비교
    const sy = by + dnaH + (PHONE ? 34 : 38);
    const cw = PHONE ? 22 : 26;
    if (G.sel >= 0) {
      const g = GENES[G.sel], gx = bx0 + (bx1 - bx0) * g.frac;
      ctx.strokeStyle = 'rgba(100,116,139,.55)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]);
      const rowW = 12 * (cw + 2) + 18, rx0 = (VW - rowW) / 2 + (PHONE ? 26 : 40);
      ctx.beginPath(); ctx.moveTo(gx - gw / 2, by + dnaH + 3); ctx.lineTo(rx0 - 4, sy - 4); ctx.moveTo(gx + gw / 2, by + dnaH + 3); ctx.lineTo(rx0 + rowW + 2, sy - 4); ctx.stroke(); ctx.setLineDash([]);
      T(VW / 2, sy - (PHONE ? 8 : 10), '유전자 ' + g.name + '의 염기 서열 (일부, 주형 가닥)', PHONE ? 12.5 : 14, '#334155', 'center', 800);
      seqRow(rx0, sy, g.blue.seq, g.red.seq, '아버지 ' + g.blue.al, PAT, cw, PHONE ? 13 : 15);
      seqRow(rx0, sy + cw * 1.1 + 8, g.red.seq, g.blue.seq, '어머니 ' + g.red.al, MAT, cw, PHONE ? 13 : 15);
      const same = g.blue.seq === g.red.seq;
      T(VW / 2, sy + cw * 2.2 + (PHONE ? 30 : 32), same ? '두 염색체의 같은 자리에 같은 유전자(같은 염기 서열)가 있어요.' : '같은 자리의 유전자지만 염기 서열이 달라요 → 대립유전자 ' + g.blue.al + ' 와 ' + g.red.al, PHONE ? 12.5 : 14.5, same ? '#166534' : '#b45309', 'center', 800);
      drawFlow(g, G.which ? g.red : g.blue, G.which ? MAT : PAT, sy + cw * 2.2 + (PHONE ? 46 : 50), t);
    } else {
      textBlock(VW / 2, sy + 20, VW - 100, '염색체 위의 번호(①②③)를 눌러 보세요.\n유전자는 DNA의 한 부분이고, 상동 염색체의 같은 자리에 있어요.', PHONE ? 13.5 : 16, '#475569', PHONE ? 20 : 24, 800, 'center');
    }
  }
  function drawFlow(g, al, col, y0, t) {
    const prot = protOf(al.seq), m = mrnaOf(al.seq);
    const tri = (s) => s.match(/.{3}/g).join(' ');
    const items = [
      { h: 'DNA (유전자 ' + g.name + ')', b: tri(al.seq) },
      { h: 'mRNA', b: tri(m) },
      { h: '단백질', b: prot.join('-') },
      { h: '형질', b: '몸의 특징으로 나타남' },
    ];
    if (PHONE) {
      const bh = 34, gap = 16, x = 56, w = VW - 112;
      items.forEach((it, i) => {
        const y = y0 + i * (bh + gap);
        if (y + bh > VH - 4) return;
        D.roundRect(x, y, w, bh, 10); ctx.fillStyle = i === 0 ? col : '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
        T(x + 10, y + 14, it.h, 11.5, i === 0 ? '#fff' : '#64748b', 'left', 800);
        T(x + w / 2 + 40, y + 23, it.b, 14, i === 0 ? '#fff' : '#1f2d44', 'center', 800);
        if (i < 3) {
          D.arrow(VW / 2, y + bh + 2, VW / 2, y + bh + gap - 1, { color: '#64748b', width: 2.5, head: 8 });
          T(VW / 2 + 14, y + bh + 12, i === 0 ? '전사' : i === 1 ? '번역' : '기능', 12.5, '#64748b', 'left', 800);
        }
      });
    } else {
      const w = 160, gap = 38, tot = 4 * w + 3 * gap, x0 = (VW - tot) / 2, bh = 62;
      items.forEach((it, i) => {
        const x = x0 + i * (w + gap), y = y0 + 6;
        D.roundRect(x, y, w, bh, 12); ctx.fillStyle = i === 0 ? col : '#fff'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = col; ctx.stroke();
        T(x + w / 2, y + 20, it.h, 13, i === 0 ? '#fff' : '#64748b', 'center', 800);
        T(x + w / 2, y + 45, it.b, it.b.length > 16 ? 13 : 15, i === 0 ? '#fff' : '#1f2d44', 'center', 800);
        if (i < 3) {
          const ax = x + w + 4;
          D.arrow(ax, y + bh / 2, ax + gap - 8, y + bh / 2, { color: '#64748b', width: 2.5, head: 9 });
          T(ax + (gap - 8) / 2, y + bh / 2 - 8, i === 0 ? '전사' : i === 1 ? '번역' : '기능', 12.5, '#64748b', 'center', 800);
          // 진행 점
          const k = ((t * 0.7 + i * 0.3) % 1);
          ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ax + (gap - 8) * k, y + bh / 2, 3.4, 0, TAU); ctx.fill();
        }
      });
    }
  }

  /* 포함 관계 : 염색체 ⊃ DNA ⊃ 유전자 ⊃ 염기 서열 */
  const NEST_ITEMS = [
    { id: 'chr', name: '염색체', note: 'DNA + 히스톤 단백질', col: '#7a5fb0' },
    { id: 'dna', name: 'DNA', note: '이중 나선, 유전 정보를 담은 물질', col: '#2563eb' },
    { id: 'gene', name: '유전자', note: 'DNA의 특정 부위, 단백질 정보', col: '#f59e0b' },
    { id: 'base', name: '염기 서열', note: 'A, T, G, C의 배열', col: '#16a34a' },
  ];
  const NEST_ANS = ['chr', 'dna', 'gene', 'base'];
  S.nest = { seq: [], p: [0, 0, 0, 0], bad: false };
  function drawNest(dt, t) {
    const N = S.nest;
    N.p = N.p.map((v, i) => approach(v, i < N.seq.length ? 1 : 0, dt, 7));
    const ox = PHONE ? 14 : 30, oy = PHONE ? 54 : 62, W = VW - ox * 2, H = (PHONE ? 560 : 470);
    D.roundRect(ox, oy, W, H, 20); ctx.fillStyle = '#e9e0fb'; ctx.fill(); ctx.strokeStyle = '#a78bda'; ctx.lineWidth = 2.5; ctx.stroke();
    T(ox + 16, oy + 24, '핵 (지름 약 6 µm)', PHONE ? 14 : 16, '#5b3fb0', 'left', 800);
    const inset = PHONE ? 38 : 56, top = PHONE ? 40 : 44;
    const tinc = PHONE ? 46 : 50, binc = PHONE ? 34 : 36, xinc = PHONE ? 20 : 40;
    N.seq.forEach((id, i) => {
      const it = NEST_ITEMS.find((x) => x.id === id), p = N.p[i];
      const x = ox + 14 + xinc * i * p + (1 - p) * 0, y = oy + top + tinc * i * p, w = W - 2 * (14 + xinc * i * p), bot = oy + H - 12 - binc * i * p, h = bot - y;
      if (w < 20 || h < 24) return;
      ctx.save(); ctx.globalAlpha = clamp(p * 1.4, 0, 1);
      D.shadow(() => { D.roundRect(x, y, w, h, 16); ctx.fillStyle = C.mix ? C.mix('#ffffff', it.col, 0.12) : '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      D.roundRect(x, y, w, h, 16); ctx.lineWidth = 3; ctx.strokeStyle = it.col; ctx.stroke();
      D.label(x + 12, y + 18, (i + 1) + '. ' + it.name, { bg: it.col, color: '#fff', size: PHONE ? 14 : 16, align: 'left' });
      T(x + 16, bot - 10, it.note, PHONE ? 12.5 : 14, '#334155', 'left', 700);
      ctx.restore();
    });
    if (N.seq.length === 0) textBlock(VW / 2, oy + H / 2 - 10, W - 60, '아래 카드를 큰 것부터 차례로 눌러 보세요.\n눌린 순서대로 상자가 안쪽으로 겹쳐져요.', PHONE ? 14 : 16.5, '#5b3fb0', PHONE ? 21 : 26, 800, 'center');
    const ok = N.seq.length === 4 && N.seq.every((v, i) => v === NEST_ANS[i]);
    if (ok) { E('🎉', VW - (PHONE ? 40 : 56), oy + 28, PHONE ? 26 : 34); }
  }

  /* =========================================================
     ④ 핵형 분석 : 섞인 염색체 카드 46개를 짝지어 번호 순서로 배열
     ========================================================= */
  const GRADE_LEN = [1, 0.86, 0.74, 0.64, 0.54, 0.46, 0.38];
  const CENF = { m: 0.5, sm: 0.34, a: 0.18 };
  const CEN_NAME = { m: '중앙', sm: '약간 한쪽', a: '끝 가까이' };
  const PAIR_DEF = [['1', 1, 'm'], ['2', 1, 'sm'], ['3', 1, 'm'], ['4', 2, 'sm'], ['5', 2, 'm'], ['6', 3, 'm'], ['7', 3, 'sm'], ['8', 3, 'a'], ['9', 3, 'sm'],
    ['10', 4, 'sm'], ['11', 4, 'm'], ['12', 4, 'a'], ['13', 5, 'a'], ['14', 5, 'sm'], ['15', 5, 'm'], ['16', 6, 'm'], ['17', 6, 'sm'], ['18', 6, 'a'],
    ['19', 7, 'm'], ['20', 7, 'sm'], ['21', 7, 'a'], ['22', 7, 'm'], ['X', 3, 'm'], ['Y', 7, 'a']];
  const KLMAX = PHONE ? 48 : 62, KW = PHONE ? 4.8 : 6.2;
  const PAIRS = (function () {
    const cnt = {}, out = [];
    PAIR_DEF.forEach((d, i) => {
      const j = cnt[d[1]] || 0; cnt[d[1]] = j + 1;
      const rr = mulberry(500 + i * 13), nb = 2 + Math.floor(rr() * 3), cen = CENF[d[2]], bands = [];
      let guard = 0;
      while (bands.length < nb && guard++ < 50) {
        const pos = 0.1 + rr() * 0.8;
        if (Math.abs(pos - cen) < 0.1 || bands.some((b) => Math.abs(b[0] - pos) < 0.12)) continue;
        bands.push([pos, 0.05 + rr() * 0.05]);
      }
      out.push({ i, name: d[0], grade: d[1], cen: d[2], cenF: cen, len: KLMAX * GRADE_LEN[d[1] - 1] * (1 - 0.035 * j), bands });
    });
    return out;
  })();
  function drawKChrom(x, y, ty, o) {
    o = o || {};
    const P = PAIRS[ty], sc = o.scale == null ? 1 : o.scale;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (o.shadow) { ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4; }
    const col = o.color || '#7d69bd', off = KW * 0.55;
    rod(-off, 0, P.len, KW, 0, col, P.cenF, { bands: P.bands, alpha: o.alpha });
    rod(off, 0, P.len, KW, 0, col, P.cenF, { bands: P.bands, alpha: o.alpha });
    ctx.restore();
  }

  const KCOLS = PHONE ? 6 : 12;
  const KSW = PHONE ? 73 : 62, KSH = PHONE ? 76 : 92, KSG = PHONE ? 4 : 2, KSY = PHONE ? 6 : 8;
  const KX0 = PHONE ? 8 : 16;
  const slotRect = (i) => { const col = i % KCOLS, row = Math.floor(i / KCOLS); return { x: KX0 + col * (KSW + KSG), y: KSY + row * (KSH + (PHONE ? 4 : 4)), w: KSW, h: KSH }; };
  const TRAY = PHONE ? { x: 6, y: 334, w: 468, h: 302 } : { x: 8, y: 204, w: 784, h: 348 };
  const TCOLS = PHONE ? 12 : 16, TCW = PHONE ? 38.5 : 48, TRH = PHONE ? 66 : 98, TROW0 = PHONE ? 392 : 262;
  const slotLabel = (i) => PAIRS[i].name;

  /* 사례 : 각 번호별 염색체 개수 */
  const CASES = [
    { name: '사례 A', counts: (() => { const a = PAIRS.map(() => 2); a[23] = 0; return a; })(), n: 46, sex: 'F', extra: 'none' },
    { name: '사례 B', counts: (() => { const a = PAIRS.map(() => 2); a[22] = 1; a[23] = 1; return a; })(), n: 46, sex: 'M', extra: 'none' },
    { name: '사례 C', counts: (() => { const a = PAIRS.map(() => 2); a[22] = 1; a[23] = 1; a[20] = 3; return a; })(), n: 47, sex: 'M', extra: '21' },
  ];
  S.k = { cards: [], view: 'sort', wrong: 0, drag: null, sel: null, done: false, ans: CASES.map(() => ({ n: '', sex: '', extra: '' })), cleared: [false, false, false], caseT: 0, marks: [{}, {}, {}], doneBurst: false };
  function resetKaryo() {
    const rr = mulberry(1234), types = [];
    for (let t = 0; t < 22; t++) { types.push(t, t); }
    types.push(22, 23);
    for (let i = types.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); const tmp = types[i]; types[i] = types[j]; types[j] = tmp; }
    S.k.cards = types.map((ty, i) => {
      const col = i % TCOLS, row = Math.floor(i / TCOLS), hx = TRAY.x + TCW / 2 + col * TCW + (PHONE ? 0 : 8), hy = TROW0 + row * TRH + (PHONE ? 0 : 6);
      return { id: i, type: ty, x: hx, y: hy, hx, hy, slot: -1, lift: 0, shake: 0, pop: 0, ang: 0 };
    });
    S.k.wrong = 0; S.k.drag = null; S.k.sel = null; S.k.done = false; S.k.doneBurst = false;
  }
  const slotCards = (si) => S.k.cards.filter((c) => c.slot === si);
  const placedCount = () => S.k.cards.filter((c) => c.slot >= 0).length;
  const pairsDone = () => { let n = 0; for (let t = 0; t < 24; t++) { const need = t === 23 ? 1 : t === 22 ? 1 : 2; if (slotCards(t).length >= need) n++; } return n; };
  function cardTarget(c) {
    if (c.slot < 0) return { x: c.hx, y: c.hy };
    const r = slotRect(c.slot), arr = slotCards(c.slot), k = arr.indexOf(c), n = arr.length;
    const gap = PHONE ? 20 : 18;
    return { x: r.x + r.w / 2 + (k - (n - 1) / 2) * gap * 1.0, y: r.y + 10 + PAIRS[c.slot].len / 2 };
  }
  function slotAt(p) { for (let i = 0; i < 24; i++) if (inRect(p, slotRect(i))) return i; return -1; }
  function featureDiff(a, b) {
    const A = PAIRS[a], B = PAIRS[b];
    if (A.grade !== B.grade) return '크기가 달라요.';
    if (A.cen !== B.cen) return '동원체 위치가 달라요.';
    return '길이와 줄무늬를 더 자세히 비교해 보세요.';
  }
  function dropCard(c, p, from) {
    const si = slotAt(p), k = S.k;
    if (si < 0) { c.slot = -1; return; }
    if (si === c.type) {
      const others = slotCards(si).filter((o) => o !== c);
      if (others.length >= 2) { c.slot = from; c.shake = 0.4; showHint('이 칸은 이미 가득 찼어요.'); return; }
      c.slot = si; c.pop = 1; Sound.success();
      const r = slotRect(si);
      parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 7, colors: ['#16a34a', '#fde047', '#fff'], speed: 90, size: 3, life: 0.55 });
      const need = si >= 22 ? 1 : 2;
      if (slotCards(si).length >= need) { parts.burst(r.x + r.w / 2, r.y + r.h * 0.4, { count: 12, colors: ['#16a34a', '#fde047', '#fff'], speed: 120, size: 3.5, life: 0.8 }); }
      if (placedCount() === 46 && !k.doneBurst) { k.doneBurst = true; k.done = true; }
    } else {
      c.slot = from; c.shake = 0.5; k.wrong++; Sound.fail();
      showHint((slotLabel(si) === 'X' || slotLabel(si) === 'Y' ? slotLabel(si) + ' 칸' : slotLabel(si) + '번 칸') + '에는 맞지 않아요: ' + featureDiff(c.type, si), 3600);
    }
  }
  function karyoDown(p) {
    const k = S.k;
    if (k.view !== 'sort') {
      // 사례 보기: 눌러서 세기 표시
      for (let i = 0; i < 24; i++) {
        const r = slotRect(i), n = CASES[k.view].counts[i]; if (!n) continue;
        const gap = PHONE ? 20 : 18;
        for (let j = 0; j < n; j++) {
          const cx = r.x + r.w / 2 + (j - (n - 1) / 2) * gap, cy = r.y + 10 + PAIRS[i].len / 2;
          if (Math.abs(p.x - cx) < gap / 2 + 2 && Math.abs(p.y - cy) < PAIRS[i].len / 2 + 6) { const key = i + '_' + j; if (k.marks[k.view][key]) delete k.marks[k.view][key]; else k.marks[k.view][key] = 1; Sound.tick(); return false; }
        }
      }
      return false;
    }
    // 선택해 둔 카드가 있으면 눌린 칸에 놓기
    if (k.sel) {
      const si = slotAt(p);
      if (si >= 0) { const c = k.sel; k.sel = null; dropCard(c, p, c.slot); return false; }
    }
    let best = null, bd = 1e9;
    k.cards.forEach((c) => {
      const dx = Math.abs(p.x - c.x), dy = Math.abs(p.y - c.y), hh = PAIRS[c.type].len / 2 + 8;
      if (dx <= (PHONE ? 18 : 22) && dy <= hh) { const d = dx * 1.5 + dy; if (d < bd) { bd = d; best = c; } }
    });
    if (!best) { k.sel = null; return false; }
    k.drag = { c: best, sx: p.x, sy: p.y, moved: false, from: best.slot };
    best.slot = -1; best.dragging = true;
    return true;
  }
  function karyoMove(p) {
    const d = S.k.drag; if (!d) return;
    if (Math.hypot(p.x - d.sx, p.y - d.sy) > 6) d.moved = true;
    d.c.x = p.x; d.c.y = p.y;
  }
  function karyoUp(p) {
    const k = S.k, d = k.drag; if (!d) return;
    k.drag = null; const c = d.c; c.dragging = false;
    if (!d.moved) { c.slot = d.from; k.sel = k.sel === c ? null : c; Sound.tick(); return; }
    k.sel = null;
    dropCard(c, p, d.from);
  }
  function stepKaryo(dt) {
    const k = S.k;
    k.cards.forEach((c) => {
      if (c.dragging) return;
      const tg = cardTarget(c);
      c.x = RM ? tg.x : approach(c.x, tg.x, dt, 14); c.y = RM ? tg.y : approach(c.y, tg.y, dt, 14);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt);
      if (c.pop > 0) c.pop = Math.max(0, c.pop - dt * 3);
    });
    k.caseT += dt;
  }
  function drawSlotBox(i, r, filled, need, caseView) {
    D.roundRect(r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = filled ? '#f0fdf4' : '#fff'; ctx.fill();
    ctx.lineWidth = filled ? 2 : 1.6; ctx.strokeStyle = filled ? '#4ade80' : '#cbd5e1';
    if (!filled) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    T(r.x + r.w / 2, r.y + r.h - 6, slotLabel(i), PHONE ? 14 : 14.5, filled ? '#166534' : '#64748b', 'center', 800);
  }
  function drawKaryo(dt, t) {
    const k = S.k;
    stepKaryo(dt);
    bgFill('#eef4f2', '#e6eee9');
    const caseView = k.view !== 'sort';
    for (let i = 0; i < 24; i++) {
      const r = slotRect(i);
      if (caseView) {
        const n = CASES[k.view].counts[i];
        drawSlotBox(i, r, n > 0, 2, true);
        const gap = PHONE ? 20 : 18;
        for (let j = 0; j < n; j++) {
          const pp = smooth((k.caseT - i * 0.03 - j * 0.04) * 3);
          const cx = r.x + r.w / 2 + (j - (n - 1) / 2) * gap, cy = r.y + 10 + PAIRS[i].len / 2;
          const marked = k.marks[k.view][i + '_' + j];
          if (pp > 0.01) drawKChrom(cx, cy - (1 - pp) * 16, i, { alpha: pp, scale: 0.6 + 0.4 * pp, color: marked ? '#ea580c' : undefined });
          if (marked) { D.sphere(cx, r.y + r.h - 20, 3.2, '#ea580c', { gloss: false }); }
        }
      } else {
        const have = slotCards(i).length, need = i >= 22 ? 1 : 2;
        drawSlotBox(i, r, have >= need, need, false);
        if (have === 0 && k.wrong >= 6) { // 도움말: 연한 윤곽
          const P = PAIRS[i]; ctx.save(); ctx.globalAlpha = 0.22; const gap = PHONE ? 20 : 18;
          for (let j = 0; j < (i >= 22 ? 1 : 2); j++) drawKChrom(r.x + r.w / 2 + (j - ((i >= 22 ? 1 : 2) - 1) / 2) * gap, r.y + 10 + P.len / 2, i, { color: '#94a3b8' });
          ctx.restore();
        }
        if (have >= need) { ctx.save(); ctx.globalAlpha = 0.9; D.check(r.x + r.w - 10, r.y + 11, 7, 1); ctx.restore(); }
      }
    }
    // 아래 영역
    panel(TRAY.x, TRAY.y, TRAY.w, TRAY.h, 14, '#ffffff');
    if (!caseView) {
      T(TRAY.x + 14, TRAY.y + 24, '섞인 염색체 카드 46개', PHONE ? 14 : 16, '#14532d', 'left', 800);
      T(TRAY.x + TRAY.w - 14, TRAY.y + 24, PHONE ? '끌어서 번호 칸에' : '끌어서(또는 눌러서) 같은 짝끼리 번호 칸에 놓아요', PHONE ? 12 : 13.5, '#64748b', 'right', 700);
      const order = k.cards.slice().sort((a, b) => (a.dragging ? 1 : 0) - (b.dragging ? 1 : 0) || a.lift - b.lift);
      order.forEach((c) => {
        const sh = c.shake > 0 ? Math.sin(c.shake * 60) * 4 * (c.shake / 0.5) : 0;
        const sc = 1 + (c.dragging ? 0.18 : 0) + c.pop * 0.25 + (k.sel === c ? 0.12 : 0);
        if (k.sel === c) D.glow(c.x, c.y, 34, '#16a34a', 0.5);
        if (c.dragging) { D.glow(c.x, c.y + 6, 30, '#000', 0.12); }
        drawKChrom(c.x + sh, c.y, c.type, { scale: sc, shadow: c.dragging });
      });
    } else {
      const cs = CASES[k.view];
      T(TRAY.x + 14, TRAY.y + 26, cs.name + ' · 핵형 사진', PHONE ? 15 : 17, '#14532d', 'left', 800);
      const mc = Object.keys(k.marks[k.view]).length;
      textBlock(TRAY.x + 16, TRAY.y + 56, TRAY.w - 32, '염색체를 눌러 표시하며 세어 보세요. 표시한 개수: ' + mc + '개', PHONE ? 14 : 16, '#334155', 22, 800);
      textBlock(TRAY.x + 16, TRAY.y + (PHONE ? 100 : 100), TRAY.w - 32, '확인할 것 ① 염색체의 총 수  ② 성염색체(XX 또는 XY)  ③ 개수가 다른 번호가 있는지', PHONE ? 13 : 15, '#475569', 21, 700);
    }
    if (k.sel && !caseView) T(VW / 2, TRAY.y + TRAY.h - 10, '선택한 카드를 놓을 번호 칸을 눌러 보세요', PHONE ? 12.5 : 14, '#16a34a', 'center', 800);
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const MODE_LABEL = { zoom: '🔍 세포에서 DNA까지 줌 인', struct: '🧶 DNA가 염색체가 되기까지', gene: '🧬 염색체 위의 유전자', nest: '📦 염색체·DNA·유전자의 포함 관계', karyo: '🔬 핵형 분석' };
  S.ui = { order: false, nest: false };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  const FREE = () => !!(game && game.free);
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = FREE();
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    $('#orderWrap').hidden = !(S.ui.order && S.mode === 'struct');
    $('#nestWrap').hidden = !((S.ui.nest && (S.mode === 'gene' || S.mode === 'nest')) || (showAll && S.mode === 'nest'));
    const z = S.z;
    $('#sZoom').value = Math.round(z.target * 100); $('#sZoom').style.setProperty('--pct', (z.target / 3 * 100) + '%');
    $('#oZoom').textContent = STAGE_NAMES[clamp(Math.round(z.target), 0, 3)];
    $('#calcIn').classList.toggle('ok', z.calcOk);
    $('#calcIn').classList.toggle('bad', z.calc !== '' && !z.calcOk);
    $('#calcNote').innerHTML = z.calcOk ? '맞아요! 2 / (6 × 10⁻⁶) ≈ 3.3 × 10⁵ → 약 <b>33만 배</b>예요.' : z.calc !== '' ? '다시 계산해 보세요. 6 µm = 6 × 10⁻⁶ m 이에요.' : '6 µm = 6 × 10⁻⁶ m 로 바꿔서 나눠요.';
    const c = S.cond;
    $('#sCond').value = Math.round(c.target * 100); $('#sCond').style.setProperty('--pct', (c.target / 3 * 100) + '%');
    $('#oCond').textContent = COND_NAMES[clamp(Math.round(c.target), 0, 3)];
    $('#bRep').textContent = S.rep.target > 0.5 ? '↩ 복제 전으로 되돌리기' : '🧬 DNA 복제하기';
    $$('#gSel button').forEach((b, i) => { b.classList.toggle('on', S.gene.sel === i); b.classList.toggle('seen', S.gene.seen[i]); });
    const gn = $('#gNote');
    if (S.gene.sel < 0) gn.innerHTML = '번호 <b>① ② ③</b>을 눌러 두 염색체의 <b>같은 자리</b>를 비교해요. (' + S.gene.seen.filter(Boolean).length + ' / 3)';
    else { const g = GENES[S.gene.sel], same = g.blue.seq === g.red.seq; gn.innerHTML = '<b>유전자 ' + g.name + '</b>: 아버지 쪽 <b>' + g.blue.al + '</b>, 어머니 쪽 <b>' + g.red.al + '</b> → ' + (same ? '<b>같은</b> 대립유전자' : '<b>서로 다른</b> 대립유전자') + '예요. (' + S.gene.seen.filter(Boolean).length + ' / 3)'; }
    const k = S.k, caseOK = k.done || FREE();
    $$('#kCases button').forEach((b) => {
      const v = b.dataset.v === 'sort' ? 'sort' : +b.dataset.v;
      b.classList.toggle('on', k.view === v);
      b.disabled = v !== 'sort' && !caseOK;
    });
    $('#kAns').hidden = !(k.view !== 'sort' && S.mode === 'karyo');
    $('#kSortNote').hidden = !(k.view === 'sort' && S.mode === 'karyo'); $('#kSortRow').hidden = $('#kSortNote').hidden;
    if (k.view !== 'sort') {
      const a = k.ans[k.view];
      if (document.activeElement !== $('#kCount')) $('#kCount').value = a.n;
      $('#kSex').value = a.sex; $('#kExtra').value = a.extra;
      const cs = CASES[k.view];
      $('#kCount').classList.toggle('ok', k.cleared[k.view]);
    }
    $('#kSortNote').innerHTML = k.done ? '모든 카드를 놓았어요! 성염색체 칸을 보면 이 세포의 성별도 알 수 있어요.' : '카드 <b>' + placedCount() + ' / 46</b>장 · 큰 짝부터 <b>1, 2, 3 …</b> 번호예요. X는 중간 크기, Y는 작은 편이에요.';
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#sZoom').addEventListener('input', (e) => { S.z.target = +e.target.value / 100; Sound.tick(); updateCtl(); });
  $('#calcIn').addEventListener('input', (e) => { S.z.calc = e.target.value.trim(); S.z.calcOk = S.z.calc === '5'; if (S.z.calcOk) { Sound.success(); parts.burst(RULER.x + RULER.w / 2, RULER.y + RULER.h / 2, { count: 14, colors: ['#16a34a', '#fde047', '#fff'], speed: 130, size: 3.5, life: 0.8 }); } updateCtl(); });
  $('#sCond').addEventListener('input', (e) => { S.cond.target = +e.target.value / 100; Sound.tick(); updateCtl(); });
  $('#bRep').addEventListener('click', () => { Sound.click(); S.rep.target = S.rep.target > 0.5 ? 0 : 1; updateCtl(); });
  $$('#gSel button').forEach((b, i) => b.addEventListener('click', () => selectGene(i, null)));
  $$('#kCases button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.k.view = b.dataset.v === 'sort' ? 'sort' : +b.dataset.v; S.k.caseT = 0; updateCtl(); }));
  $('#kCount').addEventListener('input', (e) => { S.k.ans[S.k.view].n = e.target.value.trim(); updateCtl(); });
  $('#kSex').addEventListener('change', (e) => { S.k.ans[S.k.view].sex = e.target.value; Sound.click(); updateCtl(); });
  $('#kExtra').addEventListener('change', (e) => { S.k.ans[S.k.view].extra = e.target.value; Sound.click(); updateCtl(); });
  $('#kShuffle').addEventListener('click', () => { Sound.click(); resetKaryo(); S.k.view = 'sort'; updateCtl(); });
  let pkOrder = null, pkNest = null;
  const ORDER_ITEMS = [{ id: 'fib', html: '염색사' }, { id: 'chr', html: '염색체' }, { id: 'dna', html: 'DNA 이중 나선' }, { id: 'nuc', html: '뉴클레오솜 (DNA가 히스톤을 감음)' }];
  const NESTP_ITEMS = [{ id: 'gene', html: '유전자' }, { id: 'base', html: '염기 서열' }, { id: 'chr', html: '염색체' }, { id: 'dna', html: 'DNA' }];
  pkOrder = makePicker($('#orderBox'), ORDER_ITEMS, () => updateCtl());
  pkNest = makePicker($('#nestBox'), NESTP_ITEMS, (seq) => { S.nest.seq = seq; updateCtl(); });

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'zoom') { for (let i = 0; i < 4; i++) if (inRect(p, PILL(i))) { S.z.target = i; Sound.click(); updateCtl(); } return false; }
      if (S.mode === 'struct') {
        const pw = (CD.w - 20) / 4;
        for (let i = 0; i < 4; i++) if (inRect(p, { x: CD.x + 10 + i * pw, y: CD.y + 8, w: pw, h: 30 })) { S.cond.target = i; Sound.click(); updateCtl(); }
        return false;
      }
      if (S.mode === 'gene') return geneDown(p);
      if (S.mode === 'karyo') return karyoDown(p);
      return false;
    },
    move(p) { if (S.mode === 'karyo') karyoMove(p); },
    up(p) { if (S.mode === 'karyo') { karyoUp(p); updateCtl(); } },
    hover(p) {
      if (S.mode === 'zoom') { for (let i = 0; i < 4; i++) if (inRect(p, PILL(i))) return 'pointer'; return 'default'; }
      if (S.mode === 'karyo' && S.k.view === 'sort') { return S.k.cards.some((c) => Math.abs(p.x - c.x) < 20 && Math.abs(p.y - c.y) < PAIRS[c.type].len / 2 + 6) ? 'grab' : 'default'; }
      if (S.mode === 'gene') { for (let i = 0; i < 3; i++) if (Math.abs(p.x - locX(GENES[i])) < 24 && p.y > GR1.y + 24) return 'pointer'; }
      return 'default';
    },
  });

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'zoom') { const k = clamp(Math.round(S.z.v), 0, 3); L1 = '지금 보는 곳'; a = STAGE_NAMES[k]; L2 = '핵 지름'; b = '약 6 µm'; L3 = 'DNA 길이(펼치면)'; c = '약 2 m'; }
    else if (m === 'struct') { const k = clamp(Math.round(S.cond.v), 0, 3), r2 = S.rep.target > 0.5 && S.rep.r > 0.5; L1 = '응축 정도'; a = COND_NAMES[k]; L2 = '염색 분체'; b = k === 3 ? (r2 ? '2개 (동원체로 연결)' : '1개') : '—'; L3 = '염색체 1개의 DNA'; c = r2 ? '2분자 (같은 정보)' : '1분자'; }
    else if (m === 'gene') { const G = S.gene; L1 = '살펴본 유전자 자리'; a = G.seen.filter(Boolean).length + ' / 3'; L2 = '고른 자리'; b = G.sel < 0 ? '—' : '유전자 ' + GENES[G.sel].name; L3 = '대립유전자'; c = G.sel < 0 ? '—' : GENES[G.sel].blue.al + ' , ' + GENES[G.sel].red.al; }
    else if (m === 'nest') { L1 = '고른 카드'; a = S.nest.seq.length + ' / 4'; L2 = '가장 바깥'; b = S.nest.seq.length ? NEST_ITEMS.find((x) => x.id === S.nest.seq[0]).name : '—'; L3 = '가장 안쪽'; c = S.nest.seq.length ? NEST_ITEMS.find((x) => x.id === S.nest.seq[S.nest.seq.length - 1]).name : '—'; }
    else if (S.k.view === 'sort') { L1 = '놓은 카드'; a = placedCount() + ' / 46'; L2 = '완성한 칸'; b = pairsDone() + ' / 24'; L3 = '틀린 시도'; c = S.k.wrong + '번'; }
    else { const v = S.k.view; L1 = '보는 사례'; a = CASES[v].name; L2 = '표시한 염색체'; b = Object.keys(S.k.marks[v]).length + '개'; L3 = '맞힌 사례'; c = S.k.cleared.filter(Boolean).length + ' / 3'; }
    const keyS = [L1, a, L2, b, L3, c].join('|');
    if (keyS === rlast) return; rlast = keyS;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function autoFill() {
    S.z.calc = '5'; S.z.calcOk = true; S.z.seen = [true, true, true, true];
    S.k.cards.forEach((c) => { c.slot = c.type; }); S.k.done = true; S.k.doneBurst = true;
    S.gene.seen = [true, true, true];
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '핵 속 DNA', short: '핵 속 DNA', icon: '🔍', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 2 m나 되는 DNA가 6 µm 핵 속에 어떻게 들어가 있고, 염색체·DNA·유전자는 서로 어떤 관계일까?</p><p>🔗 <b>중학교</b>에서 유전자가 염색체에 있다고 배웠고, <b>통합과학</b>에서 DNA의 이중 나선 구조를 배웠어요. 이번 시간에는 세포에서 DNA까지 <b>줌 인</b>하면서 이 둘을 하나로 이어 봐요.</p><p>이번 단계에서는 세포 속 핵과 DNA의 크기를 비교해요.</p>',
      features: ['zoom', 'calc'],
      setup() { setMode('zoom'); },
      recap: '사람 세포 하나의 DNA는 약 2 m인데 핵 지름은 약 6 µm라서, DNA가 약 3 × 10⁵배 압축되어 핵 속에 들어 있어요.',
      summary: '<ul><li>세포 속 <b>핵</b>(지름 약 6 µm) 안에는 실처럼 가는 <b>염색사</b>가 들어 있고, 그 속에 <b>DNA 이중 나선</b>이 있어요.</li><li>사람 세포 하나의 DNA를 모두 펴면 약 <b>2 m</b> → 핵 지름의 약 <b>3 × 10⁵배</b>.</li><li>그래서 DNA는 <b>히스톤 단백질</b>에 감겨 응축된 채로 핵 속에 들어 있어요.</li></ul>',
      missions: [
        {
          id: 'zoom', title: '줌 인: 세포에서 DNA까지',
          goal: '돋보기 슬라이더(또는 위쪽 이름표)로 <b>세포 → 핵 → 염색사 → DNA</b>를 차례로 끝까지 확대해 보세요.',
          hint: '슬라이더를 오른쪽 끝까지 천천히 움직이면 네 장면을 모두 지나가요.',
          setup() { setMode('zoom'); S.z.seen = [true, false, false, false]; S.z.target = 0; updateCtl(); },
          check: zoomAll, hold: 0.6,
          status: () => STAGE_NAMES.map((n, i) => mark(S.z.seen[i]) + ' ' + n).join(' &nbsp; '),
          explain: '세포 → 핵 → 염색사 → DNA로 갈수록 점점 가는 구조가 나타나요. 핵 속에는 DNA가 <b>히스톤 단백질</b>을 감은 구슬 줄 모양의 염색사로 들어 있고, 염색사 속에 DNA 이중 나선이 있어요.',
        },
        {
          id: 'calc', title: 'DNA는 몇 배로 압축되어 있을까?',
          goal: '사람 세포 하나의 DNA는 펴면 약 <b>2 m</b>, 핵 지름은 약 <b>6 µm</b>예요. 압축 배율 ≈ 3.3 × 10<sup>□</sup>배에서 <b>□</b>에 들어갈 정수를 입력하세요.',
          hint: '2 m ÷ (6 × 10⁻⁶ m) = 0.33 × 10⁶ = 3.3 × 10⁵ 이에요.',
          setup() { setMode('zoom'); S.z.calc = ''; S.z.calcOk = false; $('#calcIn').value = ''; updateCtl(); },
          check: () => S.z.calcOk, hold: 0.4,
          status: () => (S.z.calcOk ? '✅ 정답' : S.z.calc !== '' ? '❌ 다시 계산해 보세요' : '⬜ □ 입력'),
          explain: '2 m ÷ 6 µm = 2 ÷ (6 × 10⁻⁶) ≈ <b>3.3 × 10⁵</b>배예요. 지름 6 µm인 공 안에 2 m 길이의 실을 넣는 것과 같아서, DNA는 단단하게 접혀 있어야 해요.',
        },
        {
          type: 'quiz', title: 'DNA가 감겨 있는 까닭',
          goal: 'DNA가 핵 속에서 길게 펴져 있지 않고 단백질에 <b>감겨</b> 있는 까닭으로 가장 알맞은 것은?',
          setup() { setMode('zoom'); },
          choices: ['핵이 커서 DNA를 펴 둘 공간이 충분하기 때문이다', 'DNA가 감기면 유전 정보가 사라져서 안전하기 때문이다', '세포가 필요 없을 때 DNA를 버리기 위해서이다', 'DNA가 매우 길어서, 히스톤 단백질에 감겨 응축되어야 작은 핵 속에 들어갈 수 있기 때문이다'],
          answer: 3,
          feedback: ['핵 지름은 약 6 µm밖에 안 돼요. 2 m나 되는 DNA를 펴 둘 수 없어요.', '감겨도 염기 서열은 그대로예요. 정보는 사라지지 않아요.', 'DNA는 버려지지 않고 핵 속에 보관돼요.', ''],
          explain: 'DNA는 약 2 m인데 핵은 약 6 µm라서, 히스톤에 감기고 접혀서 약 3 × 10⁵배로 압축되어야 핵 속에 들어갈 수 있어요. 감겨 있어도 염기 서열(유전 정보)은 그대로예요.',
        },
      ],
    },
    {
      title: '염색체의 구조', short: '염색체 구조', icon: '🧶', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> DNA가 핵보다 훨씬 길어서 접혀 있어야 한다는 것을 알았어요.</div><p>이제 슬라이더로 DNA를 <b>응축</b>시켜 염색체가 되는 과정을 따라가요. 그리고 <b>DNA 복제</b> 버튼으로 복제 전과 후의 염색체, 아버지·어머니에게서 하나씩 받은 <b>상동 염색체</b>를 살펴봐요.</p>',
      features: ['struct'],
      setup() { setMode('struct'); },
      recap: 'DNA가 히스톤에 감겨 뉴클레오솜 → 염색사 → 염색체로 응축돼요. 복제된 염색체는 같은 염색 분체 2개가 동원체에서 붙어 있어요.',
      summary: '<ul><li>응축 순서: <b>DNA 이중 나선 → 뉴클레오솜(DNA가 히스톤에 감김) → 염색사 → 염색체</b>. 분열기에 가장 응축돼요.</li><li>DNA 복제 후 염색체는 <b>같은 염색 분체 2개</b>가 <b>동원체</b>에서 붙은 모양이에요. 두 염색 분체의 DNA 염기 서열은 같아요.</li><li><b>상동 염색체</b>: 아버지·어머니에게서 하나씩 받은 크기와 모양이 같은 한 쌍. 같은 자리에 같은 형질의 유전자가 있어요.</li></ul>',
      missions: [
        {
          id: 'order', title: '응축 순서 맞추기', manual: true,
          goal: '슬라이더로 응축 과정을 본 뒤, 카드를 <b>덜 응축된 것부터</b> 차례로 눌러 보세요.',
          hint: '맨 처음은 DNA 이중 나선, 구슬을 감은 것이 뉴클레오솜이에요. 가장 응축된 것은 분열기의 염색체예요.',
          setup() { setMode('struct'); S.ui.order = true; pkOrder.reset(); S.cond.target = 0; updateCtl(); },
          check() {
            const s = pkOrder.seq, ans = ['dna', 'nuc', 'fib', 'chr'];
            if (s.length < 4) return '카드 4장을 모두 눌러 순서를 정해 주세요. (' + s.length + ' / 4)';
            if (s[0] !== 'dna') return '가장 덜 응축된 것은 DNA 이중 나선이에요.';
            if (s[3] !== 'chr') return '가장 많이 응축된 것은 염색체예요.';
            if (s[1] !== 'nuc' || s[2] !== 'fib') return '뉴클레오솜(구슬)이 먼저 만들어지고, 그것이 감겨 염색사가 돼요.';
            return true;
          },
          explain: 'DNA 이중 나선 → <b>뉴클레오솜</b>(DNA가 히스톤 단백질 구슬을 감음) → <b>염색사</b>(뉴클레오솜 줄이 더 촘촘히 감김) → <b>염색체</b>(세포 분열기에 가장 응축). 응축될수록 길이는 짧아지고 굵어져요.',
        },
        {
          id: 'rep', title: '복제 전·후 비교',
          goal: '<b>🧬 DNA 복제하기</b>를 눌러 염색체가 어떻게 달라지는지 복제 <b>전</b>과 <b>후</b> 모두 확인하세요.',
          hint: '복제 후에는 같은 막대 2개가 가운데(동원체)에서 붙어 있어요.',
          setup() { setMode('struct'); S.cond.target = 3; S.rep.target = 0; S.rep.seen = [false, false]; updateCtl(); },
          check: () => S.rep.seen[0] && S.rep.seen[1], hold: 0.5,
          status: () => mark(S.rep.seen[0]) + ' 복제 전 &nbsp; ' + mark(S.rep.seen[1]) + ' 복제 후',
          explain: 'DNA가 복제되면 염색체 하나가 <b>동일한 염색 분체 2개</b>로 이루어져요. 두 염색 분체는 <b>동원체</b>에서 붙어 있고, 각각 DNA 1분자를 가지고 있어요.',
        },
        {
          type: 'quiz', title: '염색 분체의 유전 정보',
          goal: '복제된 염색체를 이루는 <b>두 염색 분체</b>가 가진 유전 정보에 대한 설명으로 옳은 것은?',
          setup() { setMode('struct'); },
          choices: ['하나는 아버지, 하나는 어머니에게서 와서 서로 다르다', '하나는 유전자만, 다른 하나는 단백질만 가지고 있다', '한 DNA가 복제되어 만들어졌으므로 염기 서열이 같다', '복제 후에는 유전 정보가 두 염색 분체로 반씩 나뉜다'],
          answer: 2,
          feedback: ['아버지와 어머니에게서 받은 것은 두 염색 분체가 아니라 두 염색체(상동 염색체)예요.', '염색 분체는 둘 다 DNA와 히스톤으로 이루어져 있어요.', '', '정보가 반씩 나뉘는 것이 아니라 똑같은 DNA가 하나 더 만들어져요.'],
          explain: '염색 분체 2개는 DNA를 복제해서 만든 <b>복사본</b>이라 염기 서열이 같아요. 아버지·어머니에게서 받은 <b>상동 염색체</b>는 서로 다른 염색체이고, 같은 자리의 유전자가 대립유전자로 서로 다를 수 있어요.',
        },
      ],
    },
    {
      title: '유전자와 DNA', short: '유전자와 DNA', icon: '🧬', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 염색체가 DNA와 히스톤으로 이루어져 있고, 상동 염색체는 쌍으로 존재한다는 것을 알았어요.</div><p>이제 염색체 위에서 <b>유전자</b>를 찾아봐요. 유전자는 DNA의 어떤 부분일까요? 통합과학에서 배운 전사·번역과도 이어서 정리해요.</p>',
      features: ['gene', 'nest'],
      setup() { setMode('gene'); },
      recap: '유전자는 DNA의 특정 부위로 단백질의 정보를 담고 있어요. 포함 관계는 염색체 ⊃ DNA ⊃ 유전자 ⊃ 염기 서열이에요.',
      summary: '<ul><li>상동 염색체의 <b>같은 자리</b>(유전자 자리)에는 같은 형질을 정하는 유전자가 있어요. 두 유전자가 서로 다르면 <b>대립유전자</b>(예: A와 a)예요.</li><li><b>유전자</b>는 DNA 중 <b>특정 부위</b>로, 염기 서열이 단백질의 정보가 돼요. (DNA → 전사 → mRNA → 번역 → 단백질 → 형질)</li><li>포함 관계: <b>염색체 ⊃ DNA ⊃ 유전자 ⊃ 염기 서열</b>. 사람은 유전자가 약 2만 개이고, DNA에는 유전자 사이 부위가 많아요.</li></ul>',
      missions: [
        {
          id: 'nest', title: '포함 관계 배열', manual: true,
          goal: '먼저 염색체 위 <b>①②③</b>을 모두 눌러 같은 자리의 유전자를 비교한 뒤, 카드를 <b>큰 것부터</b> 차례로 눌러 보세요.',
          hint: '염색체 안에 DNA가 있고, DNA의 일부분이 유전자이고, 유전자는 염기 서열로 이루어져요.',
          setup() { setMode('gene'); S.ui.nest = true; pkNest.reset(); updateCtl(); },
          check() {
            const n = S.gene.seen.filter(Boolean).length;
            if (n < 3) return '먼저 염색체 위의 ①②③을 모두 눌러 보세요. (' + n + ' / 3)';
            const s = pkNest.seq;
            if (s.length < 4) return '카드 4장을 모두 눌러 순서를 정해 주세요. (' + s.length + ' / 4)';
            if (s[0] !== 'chr') return '가장 큰 것은 염색체예요. 염색체는 DNA와 히스톤으로 이루어져 있어요.';
            if (s[1] !== 'dna') return 'DNA 안에 유전자가 들어 있어요. 유전자가 DNA보다 클 수는 없어요.';
            if (s[2] !== 'gene' || s[3] !== 'base') return '유전자는 염기 서열(A, T, G, C의 배열)로 이루어진 DNA의 한 부분이에요.';
            return true;
          },
          explain: '<b>염색체 ⊃ DNA ⊃ 유전자 ⊃ 염기 서열</b>이에요. 염색체는 DNA와 히스톤 단백질로 이루어지고, 유전자는 DNA의 특정 부위(단백질에 대한 정보)이며, 그 정보는 염기 서열에 들어 있어요. 상동 염색체의 같은 자리에는 같은 형질의 유전자가 있고, 서로 다르면 대립유전자예요.',
        },
        {
          type: 'quiz', title: '"유전자 = DNA 전체"?',
          goal: '유전자와 DNA의 관계에 대한 설명으로 옳은 것은?',
          setup() { setMode('gene'); },
          choices: ['유전자는 DNA 전체와 같은 말이다', '유전자는 염색체 밖의 세포질에 따로 들어 있다', '유전자 하나가 염색체 하나에 해당한다', '유전자는 DNA의 특정 부위이고, 한 염색체의 DNA에는 많은 유전자가 들어 있다'],
          answer: 3,
          feedback: ['DNA에는 유전자가 아닌 부분(유전자 사이 부위)도 있어요.', '유전자는 염색체의 DNA 위에 있어요.', '사람은 유전자가 약 2만 개인데 염색체는 46개예요. 한 염색체에 많은 유전자가 있어요.', ''],
          explain: '유전자는 DNA 중 <b>단백질 등의 정보를 담은 특정 부위</b>예요. 한 DNA 분자(염색체 하나)에 수백~수천 개의 유전자가 있고, 사람 전체로는 약 2만 개예요. DNA 중 유전자가 아닌 부분도 많아요.',
        },
      ],
    },
    {
      title: '핵형 분석', short: '핵형 분석', icon: '🔬', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 염색체가 쌍으로 있고, 쌍마다 크기와 모양이 다르다는 것을 알았어요.</div><p><b>핵형</b>은 한 생물의 염색체 수·모양·크기예요. 세포 분열 중기의 염색체를 <b>크기와 동원체 위치</b>로 짝지어 번호를 붙이는 것이 <b>핵형 분석</b>이에요. 가상 염색체 카드 46개로 직접 해 봐요.</p>',
      features: ['karyo'],
      setup() { setMode('karyo'); },
      recap: '핵형 분석은 염색체를 크기·동원체 위치로 짝지어 번호를 붙여, 염색체 수와 성별, 염색체 수의 이상을 알아보는 방법이에요.',
      summary: '<ul><li><b>핵형</b>: 한 생물 종의 염색체 수·모양·크기. 사람은 <b>2n = 46</b> = 상염색체 22쌍 + 성염색체 1쌍(여성 XX, 남성 XY).</li><li><b>핵형 분석</b>: 분열 중기 염색체를 크기와 동원체 위치로 짝지어 번호를 붙여 배열해요.</li><li>염색체 수·성별·염색체 수 이상을 알 수 있어요. 예: 21번 염색체가 3개 → 47개(다운 증후군). 핵형으로 개별 유전자의 염기 서열은 알 수 없어요.</li></ul>',
      missions: [
        {
          id: 'karyo', title: '염색체 카드 짝짓기',
          goal: '섞인 염색체 카드 <b>46장</b>을 끌어서(또는 눌러서) 크기와 동원체 위치가 같은 짝끼리 <b>번호 칸</b>에 놓으세요.',
          hint: '1번이 가장 크고 번호가 커질수록 작아져요. 큰 카드부터 동원체 위치와 줄무늬가 같은 것을 찾아 보세요. 여러 번 틀리면 연한 도움 윤곽이 나타나요.',
          setup() { setMode('karyo'); S.k.view = 'sort'; updateCtl(); },
          check: () => placedCount() === 46, hold: 0.6,
          status: () => '카드 ' + placedCount() + ' / 46 &nbsp; 완성한 칸 ' + pairsDone() + ' / 24',
          explain: '염색체는 크기와 동원체 위치로 짝을 지어요. 상염색체 22쌍은 큰 것부터 1~22번, 성염색체는 X, Y예요. 이 세포는 X와 Y가 하나씩 있으니 <b>남성의 핵형(46, XY)</b>이에요.',
        },
        {
          id: 'cases', title: '핵형 사례 분석', manual: true,
          goal: '<b>사례 A, B, C</b>를 눌러 염색체 수와 성별을 판독하고, 개수가 다른 번호가 있으면 골라 보세요.',
          hint: '염색체를 눌러 표시하며 세어 보세요. 성염색체가 XX면 여성, XY면 남성이에요. 어느 칸만 3개인지도 확인해요.',
          setup() { if (!S.k.done) { S.k.cards.forEach((c) => { c.slot = c.type; }); S.k.done = true; S.k.doneBurst = true; } S.k.ans = CASES.map(() => ({ n: '', sex: '', extra: '' })); S.k.cleared = [false, false, false]; setMode('karyo'); S.k.view = 0; S.k.caseT = 0; updateCtl(); },
          check() {
            const k = S.k;
            let bad = null;
            CASES.forEach((cs, i) => {
              const a = k.ans[i], ok = a.n === String(cs.n) && a.sex === cs.sex && a.extra === cs.extra;
              if (ok) { if (!k.cleared[i]) { k.cleared[i] = true; } }
              else { k.cleared[i] = false; if (bad === null) bad = i; }
            });
            if (bad === null) return true;
            const a = k.ans[bad], cs = CASES[bad];
            if (a.n === '' || a.sex === '') return CASES[bad].name + ': 염색체 수와 성별을 입력해 주세요.';
            if (a.n !== String(cs.n)) return cs.name + ': 염색체 수를 다시 세어 보세요.';
            if (a.sex !== cs.sex) return cs.name + ': 성염색체가 XX인지 XY인지 다시 확인해 보세요.';
            return cs.name + ': 개수가 다른 번호가 있는지 다시 확인해 보세요.';
          },
          explain: '사례 A: 46개, XX → <b>여성</b>. 사례 B: 46개, XY → <b>남성</b>. 사례 C: 21번 염색체가 3개라서 <b>47개</b>이고 XY → 남성이며 <b>다운 증후군</b>의 핵형이에요. 핵형 분석으로 염색체의 수와 성별, 수의 이상을 알 수 있어요.',
        },
        {
          type: 'quiz', title: '핵형 분석으로 알 수 있는 것',
          goal: '핵형 분석으로 <b>알 수 있는</b> 것은?',
          setup() { setMode('karyo'); },
          choices: ['유전자 하나하나의 염기 서열', '눈 색깔, 키 같은 모든 형질의 유전자형', '염색체의 수와 모양, 성별, 염색체 수의 이상', '앞으로 걸릴 모든 질병'],
          answer: 2,
          feedback: ['핵형은 염색체의 크기와 모양을 보는 것이라 염기 서열까지는 알 수 없어요.', '핵형만으로 개별 유전자의 형태(유전자형)를 알 수는 없어요.', '', '핵형으로 알 수 있는 것은 염색체의 수와 큰 구조의 이상까지예요.'],
          explain: '핵형 분석은 염색체의 <b>수·크기·모양</b>을 보는 방법이라 염색체 수 이상, 성별을 알 수 있어요. 염기 서열이나 개별 유전자는 알 수 없어요. 또 상동 염색체 두 개는 같은 자리에 같은 형질의 유전자를 갖지만, 대립유전자가 달라 유전 정보가 완전히 같지는 않을 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-chromosome', mount: '#game', badge: '염색체 탐험가', homeHref: '../../index.html#hb',
    featureLabels: { zoom: '🔍 줌 인 돋보기', calc: '🧮 압축 배율 계산', struct: '🧶 염색체 응축 · 복제', gene: '🧬 유전자 자리 비교', nest: '📦 포함 관계 상자', karyo: '🔬 핵형 분석 판' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetKaryo();
  setMode('zoom');
  let lastFree = false, lastMode = '', lastLv = -1, lastPc = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    const pc = placedCount(); if (pc === 46) S.k.done = true;
    if (pc !== lastPc) { lastPc = pc; updateCtl(); }
    view.apply();
    stepStruct(dt);
    ctx.clearRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'zoom': drawZoom(dt, t); break;
      case 'struct': bgFill('#eef4f2', '#e3ece8'); drawCond(dt, t); break;
      case 'gene': bgFill('#eef4f2', '#e3ece8'); drawGene(dt, t); break;
      case 'nest': bgFill('#eef4f2', '#e3ece8'); drawNest(dt, t); break;
      default: drawKaryo(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm) {
      if (cm.id === 'order' && S.ui.order) { S.ui.order = false; updateCtl(); }
      if (cm.id === 'nest' && S.ui.nest) { S.ui.nest = false; setMode('nest'); }
    }
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, PAIRS, CASES, slotRect, slotAt, placeAll() { S.k.cards.forEach((c) => { c.slot = c.type; }); S.k.done = true; updateCtl(); },
    pkOrder, pkNest, selectGene, GENES, zoomTo(v) { S.z.target = v; S.z.v = v; updateCtl(); }, protOf, mrnaOf, updateCtl, resetKaryo, dropCard, karyoDown, karyoMove, karyoUp,
  };
})();
