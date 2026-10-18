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
     고등학교 생명과학 Ⅲ. 생명의 연속성과 다양성 - 생식세포와 다양성 (단원 39, 3차시)
     성취기준 [12생과03-02] ... 생식세포 형성의 중요성을 생명의 연속성 및 다양성과 관련지어 추론할 수 있다. (뒷부분)
     ① 모형: 염색체 조합 (2^n)  ② 모형: 교차  ③ 분석: 연속성 (수정, 염색체 수 유지)  ④ 적용: 모델 만들기
     ========================================================= */
  const S = { mode: 'combo', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const approach = SciSim.approach;
  const sup = (n) => String(n).split('').map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('');
  const SUBS = ['#2563eb', '#dc2626'];

  /* ---------- 공통 그리기 ---------- */
  function cellDisc(cx, cy, rx, ry, a) {
    ctx.save(); if (a != null) ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.35, Math.min(rx, ry) * 0.1, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, '#f6fcf8'); g.addColorStop(1, '#d4eedd');
    ctx.fillStyle = g; ctx.strokeStyle = '#3f9a6c'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(2, rx), Math.max(2, ry), 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  /* 염색체 한 개: dbl이면 염색 분체 2개 */
  function chr1(x, y, len, w, col, cen, dbl, o) {
    o = o || {};
    if (dbl) {
      const off = w * 0.55 + 0.6;
      rod(x - off, y, len, w, 0, col, cen, o); rod(x + off, y, len, w, 0, col, cen, o);
      ctx.fillStyle = C.shade(col, -0.5); const cy = y + (cen - 0.5) * len; ctx.beginPath(); ctx.arc(x, cy, w * 0.42, 0, TAU); ctx.fill();
    } else rod(x, y, len, w, 0, col, cen, o);
  }
  /* 혼합 염색 분체: 위 조각과 아래 조각의 색이 서로 다른 막대 */
  function chrMix(x, y, len, w, cTop, cBot, cen, splitF) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x - w, y - len / 2 - 2, w * 2, len * splitF + 2); ctx.clip();
    rod(x, y, len, w, 0, cTop, cen);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.rect(x - w, y - len / 2 + len * splitF, w * 2, len + 2); ctx.clip();
    rod(x, y, len, w, 0, cBot, cen);
    ctx.restore();
  }
  const bitsLabel = (b) => b.map((v) => (v ? '빨' : '파')).join('·');

  /* =========================================================
     ① 염색체 조합 : 2n = 6 (상동 염색체 3쌍), 감수 분열 실행과 조합 모으기
     ========================================================= */
  const SC = PHONE ? { x: 6, y: 8, w: 468, h: 250 } : { x: 12, y: 12, w: 520, h: 330 };
  const RS = PHONE ? { x: 6, y: 266, w: 468, h: 118 } : { x: 12, y: 352, w: 520, h: 196 };
  const TB = PHONE ? { x: 6, y: 392, w: 468, h: 244 } : { x: 544, y: 12, w: 244, h: 536 };
  const PLEN = PHONE ? [44, 34, 25] : [66, 52, 38], PW = PHONE ? 8.5 : 12;       // 쌍마다 다른 길이
  const PCEN = [0.45, 0.4, 0.35];
  const rows = (b) => b[0] * 4 + b[1] * 2 + b[2];
  S.cb = { found: Array(8).fill(false), runs: 0, a: null, last: null, popT: Array(8).fill(-9), lastNew: [], bits: [0, 0, 0] };
  let rngNext = null;      // 테스트에서 다음 결과를 정할 수 있어요
  function randBits() { if (rngNext) { const b = rngNext; rngNext = null; return b.slice(); } return [0, 1, 2].map(() => (Math.random() < 0.5 ? 0 : 1)); }
  function recordGametes(bits) {
    const A = bits, B = bits.map((v) => 1 - v), newOnes = [];
    [A, B].forEach((g) => { const r = rows(g); if (!S.cb.found[r]) { S.cb.found[r] = true; S.cb.popT[r] = S.clock; newOnes.push(r); } });
    S.cb.last = [A, B]; S.cb.lastNew = newOnes; S.cb.runs++;
    return newOnes;
  }
  function runMeiosis() {
    if (S.cb.a) return;
    const bits = randBits();
    S.cb.a = { t: 0, bits, flip: [0, 0, 0], stops: [0.8, 1.15, 1.5], rec: false };
    S.cb.last = null; Sound.click(); updateCtl();
  }
  function runQuick(n) {
    if (S.cb.a) return;
    for (let i = 0; i < n; i++) recordGametes(randBits());
    Sound.success(); updateCtl();
  }
  const foundCount = () => S.cb.found.filter(Boolean).length;
  /* 한 번 실행하는 애니메이션: 0~1.6 굴리기, 1.6~2.8 상동 염색체 분리, 2.8~3.6 세포 2개, 3.6~4.5 생식세포 4개 */
  function stepCombo(dt) {
    const A = S.cb.a; if (!A) return;
    A.t += dt;
    for (let p = 0; p < 3; p++) {
      if (A.t < A.stops[p]) { A.flipT = (A.flipT || 0) + dt; A.flip[p] = Math.floor(A.t / 0.11 + p * 0.5) % 2; } else A.flip[p] = A.bits[p];
    }
    if (A.t > 4.4 && !A.rec) { A.rec = true; const n = recordGametes(A.bits); if (n.length) { Sound.success(); } else Sound.tick(); }
    if (A.t > 5.0) { S.cb.a = null; updateCtl(); }
  }
  function drawComboScene(dt, t) {
    panel(SC.x, SC.y, SC.w, SC.h, 16, '#fff');
    const A = S.cb.a, tt = A ? A.t : 0;
    const cx = SC.x + SC.w / 2, cy = SC.y + SC.h / 2 + (PHONE ? 8 : 10);
    T(SC.x + 12, SC.y + 24, A ? (tt < 1.6 ? '감수 1분열 중기: 쌍마다 서는 쪽이 무작위' : tt < 2.8 ? '감수 1분열 후기: 상동 염색체 분리' : tt < 3.6 ? '감수 1분열 완료: 세포 2개' : '감수 2분열 완료: 생식세포 4개') : '감수 분열 모형 (2n = 6)', PHONE ? 13.5 : 16, '#14532d', 'left', 800);
    const Rc = Math.min(SC.h * 0.39, SC.w * 0.27), rowY = [-0.56, 0, 0.52].map((v) => v * Rc);
    if (!A) {
      cellDisc(cx, cy, Rc, Rc);
      ctx.strokeStyle = 'rgba(100,116,139,.5)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy - Rc); ctx.lineTo(cx, cy + Rc); ctx.stroke(); ctx.setLineDash([]);
      for (let p = 0; p < 3; p++) { chr1(cx - PW * 1.3, cy + rowY[p], PLEN[p], PW, PAT, PCEN[p], true); chr1(cx + PW * 1.3, cy + rowY[p], PLEN[p], PW, MAT, PCEN[p], true); }
      T(cx, cy + Rc + 24, '2n = 6 : 상동 염색체 3쌍 (파랑: 아버지, 빨강: 어머니)', PHONE ? 12.5 : 14, '#475569', 'center', 800);
      return;
    }
    const q1 = smooth((tt - 1.6) / 1.2), q2 = smooth((tt - 2.8) / 0.8), q3 = smooth((tt - 3.6) / 0.9);
    const pole = Rc * 0.95, xc2 = SC.w * 0.24, r2 = Math.min(Rc, xc2 * 0.92);
    const xs4 = [0.125, 0.375, 0.625, 0.875].map((q) => SC.x + SC.w * q), r4 = Math.min(SC.w / 4 * 0.44, Rc * 0.8);
    const dx3 = PW * 3.4, dx4 = PW * 2.2;
    // 세포 윤곽
    if (tt < 2.8) cellDisc(cx, cy, Rc * (1 + 0.55 * q1), Rc * (1 - 0.1 * q1));
    else if (tt < 3.6) {
      const dx = lerp(Rc * 0.0, xc2, q2), rx = lerp(Rc * 1.55, r2, q2), ry = lerp(Rc * 0.9, r2, q2);
      cellDisc(cx - dx, cy, rx, ry); cellDisc(cx + dx, cy, rx, ry);
    } else {
      const sx = (i) => lerp([cx - xc2, cx - xc2, cx + xc2, cx + xc2][i], xs4[i], q3), rr = lerp(r2, r4, q3);
      for (let i = 0; i < 4; i++) cellDisc(sx(i), cy, rr, rr);
    }
    // 염색체
    for (let p = 0; p < 3; p++) {
      for (let h = 0; h < 2; h++) {
        const side = (h === A.flip[p]) ? -1 : 1, col = h ? MAT : PAT, y = cy + rowY[p];
        if (tt < 1.6) chr1(cx + side * PW * 1.3, y, PLEN[p], PW, col, PCEN[p], true);
        else if (tt < 2.8) chr1(lerp(cx + side * PW * 1.3, cx + side * pole * 1.55 * 0.62 / 0.62 * 0.6, q1), y, PLEN[p], PW, col, PCEN[p], true);
        else if (tt < 3.6) {
          const px = cx + side * pole * 1.55 * 0.6, tx = cx + side * xc2 + (p - 1) * dx3;
          chr1(lerp(px, tx, q2), lerp(y, cy, q2), PLEN[p], PW, col, PCEN[p], true);
        } else {
          const base = cx + side * xc2 + (p - 1) * dx3, gi = side < 0 ? [0, 1] : [2, 3];
          for (let k = 0; k < 2; k++) {
            const sx0 = base + (k ? PW * 0.6 : -PW * 0.6), tx0 = xs4[gi[k]] + (p - 1) * dx4;
            chr1(lerp(sx0, tx0, q3), cy, PLEN[p], PW, col, PCEN[p], false);
          }
        }
      }
    }
    if (tt > 4.0) { const a2 = smooth((tt - 4.0) / 0.5); xs4.forEach((x) => T(x, cy + r4 + 22, 'n = 3', PHONE ? 13 : 14, '#14532d', 'center', 800, { alpha: a2 })); }
  }
  function drawComboResult(dt, t) {
    panel(RS.x, RS.y, RS.w, RS.h, 16, '#fff');
    T(RS.x + 12, RS.y + 24, '이번에 만들어진 생식세포', PHONE ? 13.5 : 15.5, '#14532d', 'left', 800);
    const L = S.cb.last;
    if (!L) { T(RS.x + RS.w / 2, RS.y + RS.h / 2 + 14, S.cb.a ? '만드는 중…' : '아직 실행하지 않았어요', PHONE ? 13.5 : 15, '#94a3b8', 'center', 800); return; }
    L.forEach((g, i) => {
      const cx = RS.x + RS.w * (0.27 + i * 0.46), cy = RS.y + RS.h * 0.58, r = PHONE ? 32 : 46;
      cellDisc(cx, cy, r, r);
      for (let p = 0; p < 3; p++) chr1(cx + (p - 1) * (PW * 2.3), cy, PLEN[p] * (PHONE ? 0.82 : 0.78), PW * 0.95, g[p] ? MAT : PAT, PCEN[p], false);
      const isNew = S.cb.lastNew.indexOf(rows(g)) >= 0;
      D.label(cx, RS.y + RS.h - (PHONE ? 10 : 14), isNew ? '새 조합 ✨ ×2' : '이미 모은 조합 ×2', { bg: isNew ? '#16a34a' : '#94a3b8', color: '#fff', size: PHONE ? 12.5 : 13 });
    });
    T(RS.x + RS.w / 2, RS.y + RS.h * 0.62, '+', 22, '#64748b', 'center', 800);
  }
  function drawComboTable(dt, t) {
    panel(TB.x, TB.y, TB.w, TB.h, 16, '#fff');
    T(TB.x + 12, TB.y + 24, '모은 생식세포 조합 ' + foundCount() + ' / 8', PHONE ? 14 : 16, '#14532d', 'left', 800);
    const cols = PHONE ? 2 : 1, n = 8, rh = PHONE ? (TB.h - 44) / 4 : (TB.h - 44) / 8, cw = (TB.w - 16) / cols;
    for (let r = 0; r < n; r++) {
      const col = PHONE ? Math.floor(r / 4) : 0, ri = PHONE ? r % 4 : r;
      const x = TB.x + 8 + col * cw, y = TB.y + 38 + ri * rh, bits = [(r >> 2) & 1, (r >> 1) & 1, r & 1], on = S.cb.found[r];
      const pop = on ? smooth((S.clock - S.cb.popT[r]) * 2.5) : 0, pulse = on && S.clock - S.cb.popT[r] < 0.9 ? 1 + 0.12 * Math.sin((S.clock - S.cb.popT[r]) * 12) * (1 - (S.clock - S.cb.popT[r]) / 0.9) : 1;
      ctx.save(); ctx.translate(x + cw / 2, y + rh / 2); ctx.scale(pulse, pulse); ctx.translate(-(x + cw / 2), -(y + rh / 2));
      D.roundRect(x + 2, y + 2, cw - 8, rh - 4, 10); ctx.fillStyle = on ? '#f0fdf4' : '#f8fafc'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#4ade80' : '#cbd5e1'; if (!on) ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      T(x + 14, y + rh / 2 + 5, String(r + 1), PHONE ? 13 : 14, on ? '#166534' : '#94a3b8', 'left', 800);
      const sy = y + rh / 2;
      for (let p = 0; p < 3; p++) {
        const rx = x + (PHONE ? 52 : 62) + p * (PHONE ? 26 : 32), len = PLEN[p] * (PHONE ? 0.62 : 0.52);
        if (on) chr1(rx, sy, len, PW * (PHONE ? 0.8 : 0.78), bits[p] ? MAT : PAT, PCEN[p], false);
        else { ctx.save(); ctx.globalAlpha = 0.5; D.roundRect(rx - 4, sy - len / 2, 8, len, 4); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.restore(); }
      }
      if (on) D.check(x + cw - 22, sy, 9, pop);
      ctx.restore();
    }
  }

  /* =========================================================
     ① 2ⁿ 그래프 (로그 눈금)
     ========================================================= */
  S.lg = { n: 3, tn: 3, seen23: false, calc: '', calcOk: false, popT: 0 };
  const LGP = PHONE ? { x0: 56, x1: 466, y0: 74, y1: 520 } : { x0: 76, x1: 776, y0: 74, y1: 456 };
  function drawLog(dt, t) {
    const G = S.lg;
    G.n = RM ? G.tn : approach(G.n, G.tn, dt, 10);
    panel(8, 8, VW - 16, VH - 16, 16, '#fff');
    T(24, 38, '생식세포 종류 수 = 2ⁿ (n: 상동 염색체 쌍의 수)', PHONE ? 14.5 : 17, '#14532d', 'left', 800);
    T(24, 60, '세로 눈금은 한 칸마다 10배가 되는 로그 눈금이에요', PHONE ? 12 : 13.5, '#64748b', 'left', 700);
    const W = LGP.x1 - LGP.x0, Hh = LGP.y1 - LGP.y0, ymaxLog = 7;
    const yOf = (lg) => LGP.y1 - lg / ymaxLog * Hh;
    for (let k = 0; k <= 7; k++) {
      const y = yOf(k); ctx.strokeStyle = k === 0 ? '#64748b' : '#e2e8f0'; ctx.lineWidth = k === 0 ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(LGP.x0, y); ctx.lineTo(LGP.x1, y); ctx.stroke();
      T(LGP.x0 - 8, y + 5, k === 0 ? '1' : k === 1 ? '10' : '10' + sup(k), 14, '#475569', 'right', 800);
    }
    const bw = W / 23;
    const sel = Math.round(G.tn);
    for (let n = 1; n <= 23; n++) {
      const lg = n * Math.log10(2), x = LGP.x0 + (n - 0.5) * bw, on = n <= sel;
      const h = lg / ymaxLog * Hh;
      D.roundRect(x - bw * 0.36, LGP.y1 - h, bw * 0.72, h, 3);
      ctx.fillStyle = n === sel ? '#f59e0b' : on ? '#60a5fa' : '#e5e7eb'; ctx.fill();
      if (n === sel) { ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.stroke(); }
      if (!PHONE || n % 2 === 1 || n === 23) T(x, LGP.y1 + 20, String(n), PHONE ? 13 : 14, n === sel ? '#b45309' : '#475569', 'center', 800);
    }
    T((LGP.x0 + LGP.x1) / 2, LGP.y1 + 42, '염색체 쌍의 수 n', PHONE ? 13 : 14, '#475569', 'center', 800);
    // 선택한 n의 값
    const nS = sel, val = Math.pow(2, nS);
    const x = LGP.x0 + (nS - 0.5) * bw, yb = LGP.y1 - nS * Math.log10(2) / ymaxLog * Hh;
    const txt = nS <= 20 ? '2' + sup(nS) + ' = ' + val.toLocaleString('en-US') + '가지' : '2' + sup(nS) + ' = ' + val.toLocaleString('en-US') + '가지 (약 ' + (val / 1e6).toFixed(1) + ' × 10⁶)';
    const bxL = clamp(x, LGP.x0 + 150, LGP.x1 - 20);
    D.label(clamp(x - 8, LGP.x0 + 10, LGP.x1 - (PHONE ? 250 : 330)), Math.max(LGP.y0 + 4, yb - 26), txt, { bg: '#f59e0b', color: '#fff', size: PHONE ? 13.5 : 15, align: 'left' });
    D.dashedLine(x, yb, x, LGP.y1, { color: '#f59e0b', width: 2 });
    if (nS === 3) T(x + bw * 0.5, yb - 40 - (PHONE ? 0 : 0), '', 12, '#000', 'left', 700);
    // 표시
    const tag = (n, s, col) => { const xx = LGP.x0 + (n - 0.5) * bw, yy = LGP.y1 - n * Math.log10(2) / ymaxLog * Hh; };
    T(LGP.x0 + 6, LGP.y0 - 2 + (PHONE ? 20 : 26), nS === 3 ? '2n = 6일 때 n = 3 → 8가지' : nS === 23 ? '사람은 n = 23 → 약 840만 가지' : '', PHONE ? 13 : 14.5, '#b45309', 'left', 800);
  }

  /* =========================================================
     ② 교차 : 2가 염색체에서 DNA 조각 교환 (유전자 A-B / a-b)
     ========================================================= */
  const CR = PHONE ? { x: 6, y: 8, w: 468, h: 410 } : { x: 12, y: 12, w: 520, h: 536 };
  const CI = PHONE ? { x: 6, y: 426, w: 468, h: 210 } : { x: 544, y: 12, w: 244, h: 536 };
  const CWID = PHONE ? 22 : 30, CLEN = PHONE ? 150 : 236, CGAP = CWID * 0.7;
  const CCEN = 0.12, CF_A = 0.4, CF_B = 0.82, CF_X = 0.61;
  const cxPos = () => { const cx = CR.x + CR.w / 2 + (PHONE ? 0 : 0), b2 = -(CGAP / 2 + CWID / 2), r1 = CGAP / 2 + CWID / 2, d = CWID + 3; return [cx + b2 - d, cx + b2, cx + r1, cx + r1 + d]; };
  const cyTop = () => CR.y + (PHONE ? 54 : 74);
  function newCross() {
    // 염색 분체 4개: 0,1 = 아버지(파랑, A B), 2,3 = 어머니(빨강, a b)
    const xs = cxPos();
    return {
      xs, sel: -1, crosses: 0, made: false, gT: 0, pick: [false, false, false, false], swapT: -9, chi: [],
      top: [0, 1, 2, 3].map((i) => ({ col: i < 2 ? PAT : MAT, al: i < 2 ? 'A' : 'a' })),
      bot: [0, 1, 2, 3].map((i) => ({ col: i < 2 ? PAT : MAT, al: i < 2 ? 'B' : 'b', x: xs[i], tx: xs[i] })),
    };
  }
  S.cr = newCross();
  const comboOf = (i) => S.cr.top[i].al + S.cr.bot[i].al;
  const isRecomb = (i) => { const c = comboOf(i); return c === 'Ab' || c === 'aB'; };
  const crKinds = () => { const m = {}; for (let i = 0; i < 4; i++) m[comboOf(i)] = true; return Object.keys(m).length; };
  function doCross(i, j) {
    const C_ = S.cr; if (C_.made) return;
    const tmp = C_.bot[i]; C_.bot[i] = C_.bot[j]; C_.bot[j] = tmp;
    C_.bot[i].tx = C_.xs[i]; C_.bot[j].tx = C_.xs[j];
    C_.crosses++; C_.sel = -1; C_.swapT = S.clock; C_.chi.push({ a: i, b: j, t: S.clock });
    Sound.success();
    const y = cyTop() + CLEN * CF_X;
    parts.burst((C_.xs[i] + C_.xs[j]) / 2, y, { count: 14, colors: ['#fde047', '#fff', PAT, MAT], speed: 120, size: 3, life: 0.7 });
    updateCtl();
  }
  function crossTap(p) {
    const C_ = S.cr;
    if (C_.made) {
      // 새 조합 고르기: 생식세포 4개를 눌러요
      for (let i = 0; i < 4; i++) { const g = gameteXY(i); if (Math.hypot(p.x - g.x, p.y - g.y) < gameteR() + 6) { C_.pick[i] = !C_.pick[i]; Sound.tick(); updateCtl(); return; } }
      return;
    }
    const y0 = cyTop();
    for (let i = 0; i < 4; i++) {
      if (Math.abs(p.x - C_.xs[i]) < CWID / 2 + 3 && p.y > y0 - 6 && p.y < y0 + CLEN + 6) {
        if (C_.sel < 0) { C_.sel = i; Sound.tick(); }
        else if (C_.sel === i) { C_.sel = -1; }
        else if ((C_.sel < 2) === (i < 2)) { C_.sel = i; showHint('상동 염색체끼리(파랑 ↔ 빨강) 교차해요. 다른 색 염색 분체를 눌러 주세요.', 3000); }
        else doCross(C_.sel, i);
        updateCtl(); return;
      }
    }
    C_.sel = -1; updateCtl();
  }
  const gameteR = () => (PHONE ? 38 : 50);
  function gameteXY(i) { const gx = PHONE ? 112 : 122; return { x: CR.x + CR.w / 2 + (i - 1.5) * gx, y: CR.y + CR.h - (PHONE ? 74 : 108) }; }
  function makeGametes() { const C_ = S.cr; if (C_.made) return; C_.made = true; C_.sel = -1; Sound.click(); updateCtl(); }
  function resetCross() { S.cr = newCross(); Sound.click(); updateCtl(); }

  function rodSeg(x, y0, len, w, col, f0, f1, alpha) {
    // 위에서 f0~f1 비율 구간만 그린 막대
    ctx.save(); ctx.beginPath(); ctx.rect(x - w, y0 + len * f0 - (f0 > 0 ? 0 : 3), w * 2, len * (f1 - f0) + (f0 > 0 ? 0 : 3) + (f1 < 1 ? 0 : 3)); ctx.clip();
    rod(x, y0 + len / 2, len, w, 0, col, CCEN, { alpha });
    ctx.restore();
  }
  function drawChromatid(i, x, y0, alpha, showLoci) {
    const C_ = S.cr, len = CLEN, w = CWID, tp = C_.top[i], bt = C_.bot[i], bx = bt.x;
    rodSeg(x, y0, len, w, tp.col, 0, CF_X, alpha);
    rodSeg(bx, y0, len, w, bt.col, CF_X, 1, alpha);
    if (showLoci) {
      const ya = y0 + len * CF_A, yb = y0 + len * CF_B;
      D.sphere(x, ya, w * 0.4, '#fff', { gloss: false }); T(x, ya + w * 0.18, tp.al, w * 0.5, tp.col, 'center', 800);
      D.sphere(bx, yb, w * 0.4, '#fff', { gloss: false }); T(bx, yb + w * 0.18, bt.al, w * 0.5, bt.col, 'center', 800);
    }
  }
  function drawCross(dt, t) {
    const C_ = S.cr, y0 = cyTop();
    C_.bot.forEach((b) => { b.x = RM ? b.tx : approach(b.x, b.tx, dt, 7); });
    C_.gT = RM ? (C_.made ? 1 : 0) : approach(C_.gT, C_.made ? 1 : 0, dt, 4);
    panel(CR.x, CR.y, CR.w, CR.h, 16, '#fff');
    T(CR.x + 12, CR.y + 24, C_.made ? '생식세포 4개의 유전자 조합' : '감수 1분열 전기: 2가 염색체', PHONE ? 14 : 16, '#14532d', 'left', 800);
    const xs = C_.xs, g = C_.gT;
    if (g < 0.98) {
      ctx.save(); ctx.globalAlpha = 1 - g;
      // 교차 지점 안내
      const yx = y0 + CLEN * CF_X;
      D.dashedLine(xs[0] - CWID, yx, xs[3] + CWID, yx, { color: '#ca8a04', width: 2, dash: [6, 5] });
      T(xs[3] + CWID * 1.5, yx + 5, '교차 지점', PHONE ? 12.5 : 13.5, '#a16207', 'left', 800);
      T(xs[3] + CWID * 1.5, y0 + CLEN * CF_A + 5, '유전자 자리 1', PHONE ? 12 : 13, '#64748b', 'left', 700);
      T(xs[3] + CWID * 1.5, y0 + CLEN * CF_B + 5, '유전자 자리 2', PHONE ? 12 : 13, '#64748b', 'left', 700);
      // 염색체 이름
      T((xs[0] + xs[1]) / 2, y0 - 12, '아버지', PHONE ? 13 : 14.5, PAT, 'center', 800);
      T((xs[2] + xs[3]) / 2, y0 - 12, '어머니', PHONE ? 13 : 14.5, MAT, 'center', 800);
      for (let i = 0; i < 4; i++) {
        if (C_.sel === i) { D.glow(xs[i], y0 + CLEN / 2, CLEN * 0.62, '#fde047', 0.6); }
        drawChromatid(i, xs[i], y0, 1 - g, true);
      }
      // 같은 염색체의 두 염색 분체를 잇는 동원체
      for (let k = 0; k < 2; k++) { const a = xs[k * 2], b = xs[k * 2 + 1], cy = y0 + CLEN * CCEN; ctx.fillStyle = C.shade(k ? MAT : PAT, -0.55); ctx.beginPath(); ctx.arc((a + b) / 2, cy, CWID * 0.42, 0, TAU); ctx.fill(); }
      // 교차 표시(키아스마)
      C_.chi.forEach((c) => { const age = S.clock - c.t; const mx = (xs[c.a] + xs[c.b]) / 2, my = y0 + CLEN * CF_X; ctx.save(); ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 3; ctx.globalAlpha = 0.9 * (1 - g); ctx.beginPath(); ctx.ellipse(mx, my, Math.abs(xs[c.a] - xs[c.b]) / 2 + 6, 9, 0, 0, TAU); ctx.stroke(); if (age < 1) { ctx.globalAlpha = (1 - age) * 0.6 * (1 - g); ctx.beginPath(); ctx.ellipse(mx, my, Math.abs(xs[c.a] - xs[c.b]) / 2 + 6 + age * 20, 9 + age * 14, 0, 0, TAU); ctx.stroke(); } ctx.restore(); });
      ctx.restore();
      if (!C_.crosses && !C_.made) {
        const tw = 0.5 + 0.5 * Math.sin(t * 4);
        T(CR.x + CR.w / 2, CR.y + CR.h - (PHONE ? 90 : 120), C_.sel >= 0 ? '이제 반대 색 염색 분체를 눌러 보세요' : '파랑 염색 분체 하나, 빨강 염색 분체 하나를 차례로 눌러요', PHONE ? 13 : 15, '#a16207', 'center', 800, { alpha: 0.6 + 0.4 * tw });
      }
    }
    // 생식세포 4개
    if (g > 0.02) {
      for (let i = 0; i < 4; i++) {
        const gp = gameteXY(i), r = gameteR();
        const sx = xs[i], sy = y0 + CLEN / 2;
        const q = smooth(g), px = lerp(sx, gp.x, q), py = lerp(sy, gp.y, q);
        ctx.save(); ctx.globalAlpha = q;
        cellDisc(gp.x, gp.y, r, r);
        ctx.restore();
        const sc = lerp(1, Math.min(0.5, r * 1.5 / CLEN), q);
        const len = CLEN * sc, w = CWID * sc, yTop = py - len / 2;
        ctx.save();
        const bt = C_.bot[i], tp = C_.top[i];
        rodSeg(px, yTop, len, w, tp.col, 0, CF_X, 1);
        rodSeg(px, yTop, len, w, bt.col, CF_X, 1, 1);
        ctx.restore();
        if (q > 0.8) {
          const rec = isRecomb(i);
          D.roundRect(gp.x - r * 0.75, gp.y + r + 6, r * 1.5, PHONE ? 24 : 28, 12); ctx.fillStyle = C_.pick[i] ? '#f59e0b' : '#f1f5f9'; ctx.fill(); ctx.strokeStyle = C_.pick[i] ? '#b45309' : '#cbd5e1'; ctx.lineWidth = 2; ctx.stroke();
          T(gp.x, gp.y + r + (PHONE ? 23 : 26), comboOf(i).split('').join(' '), PHONE ? 15 : 17, C_.pick[i] ? '#fff' : '#1f2d44', 'center', 800);
          if (C_.pick[i]) D.label(gp.x, gp.y - r - 12, '새 조합 ✨', { bg: '#f59e0b', color: '#fff', size: PHONE ? 12.5 : 13.5 });
          if (S.crAns && rec) D.ring(gp.x, gp.y, r + 4, t + i * 0.2, { color: '#16a34a' });
        }
      }
      if (g > 0.9) T(CR.x + CR.w / 2, CR.y + 52, '생식세포 하나를 눌러서 ‘새 조합’인지 표시해요', PHONE ? 13 : 14.5, '#a16207', 'center', 800);
    }
    // 오른쪽(또는 아래) 정보 카드
    panel(CI.x, CI.y, CI.w, CI.h, 16, '#fff');
    const x = CI.x + 14, w = CI.w - 28;
    T(x, CI.y + 26, '생식세포 종류 수 비교', PHONE ? 14.5 : 16, '#14532d', 'left', 800);
    const kinds = C_.made ? crKinds() : null;
    const rowsI = [
      ['교차 없을 때', '2가지', 'AB, ab', '#64748b'],
      ['교차 일어난 뒤', C_.made ? kinds + '가지' : '?', C_.made ? Array.from(new Set([0, 1, 2, 3].map(comboOf))).sort().join(', ') : '생식세포를 만들어 보세요', C_.made && kinds > 2 ? '#ea580c' : '#64748b'],
    ];
    rowsI.forEach((r, i) => {
      const yy = CI.y + 40 + i * (PHONE ? 62 : 82);
      D.roundRect(x, yy, w, PHONE ? 54 : 70, 12); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = r[3]; ctx.stroke();
      T(x + 10, yy + 20, r[0], PHONE ? 13 : 14, '#64748b', 'left', 800);
      T(x + w - 10, yy + (PHONE ? 22 : 34), r[1], PHONE ? 20 : 26, r[3], 'right', 800);
      T(x + 10, yy + (PHONE ? 44 : 56), r[2], PHONE ? 13 : 14, '#1f2d44', 'left', 800);
    });
    const ty = CI.y + 40 + 2 * (PHONE ? 62 : 82) + 16;
    textBlock(x, ty, w, C_.made ? '교차가 일어나면 한 염색체에 아버지 쪽(A)과 어머니 쪽(b) 유전자가 섞인 새 조합이 만들어져요. 염색체 수와 DNA 양은 그대로예요.' : '교차: 2가 염색체에서 상동 염색체의 염색 분체끼리 DNA 조각을 서로 바꾸는 일이에요. (유전자 A와 B 사이에서)', PHONE ? 12.5 : 13.5, '#475569', PHONE ? 17 : 19, 700);
  }

  /* =========================================================
     ③ 연속성 : 수정으로 염색체 수 유지 / 체세포분열로 만들면 (가정)
     ========================================================= */
  const CS = PHONE ? { x: 6, y: 8, w: 468, h: 232 } : { x: 12, y: 12, w: 500, h: 296 };
  const CB = PHONE ? { x: 6, y: 248, w: 468, h: 232 } : { x: 12, y: 318, w: 776, h: 230 };
  const CC = PHONE ? { x: 6, y: 488, w: 468, h: 148 } : { x: 524, y: 12, w: 264, h: 296 };
  const GEN = [46, 92, 184, 368];
  S.ct = { hypo: false, f: null, pred: ['', '', ''], predOK: false, ferT: -1, done: false };
  function startFert() {
    const F = S.ct;
    F.f = { t: 0, burst: false }; Sound.click(); updateCtl();
  }
  function resetFert() { S.ct.f = null; S.ct.done = false; }
  const predVals = () => S.ct.pred.map((v) => (v === '' || isNaN(+v) ? null : +v));
  const predRight = (i) => predVals()[i] === GEN[i + 1];
  function rodsGrid(cx, cy, n, col, w, h, cols) {
    const rows = Math.ceil(n / cols), gw = w * 1.7, gh = h * 1.35;
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols, cn = r === rows - 1 ? n - r * cols : cols;
      const x = cx + (c - (cn - 1) / 2) * gw, y = cy + (r - (rows - 1) / 2) * gh;
      D.roundRect(x - w / 2, y - h / 2, w, h, w / 2); ctx.fillStyle = col; ctx.fill();
    }
  }
  function drawGameteCell(cx, cy, r, n, col, label) {
    cellDisc(cx, cy, r, r);
    const cols = n <= 23 ? 6 : n <= 46 ? 8 : 12;
    rodsGrid(cx, cy + 2, n, col, r > 40 ? 3.6 : 3, r > 40 ? 13 : 11, cols);
    D.label(cx, cy + r + 18, label, { bg: '#fff', color: col, border: col, size: PHONE ? 13 : 14 });
  }
  function drawCont(dt, t) {
    const F = S.ct, hypo = F.hypo;
    panel(CS.x, CS.y, CS.w, CS.h, 16, '#fff');
    T(CS.x + 12, CS.y + 24, hypo ? '가정: 생식세포를 체세포분열로 만들면' : '실제: 생식세포를 감수 분열로 만들면', PHONE ? 13.5 : 16, hypo ? '#c2410c' : '#14532d', 'left', 800);
    const nG = hypo ? 46 : 23, nZ = hypo ? 92 : 46;
    const ey = CS.y + CS.h * 0.52, er = PHONE ? 52 : 74, sx0 = CS.x + CS.w * 0.24, ex = CS.x + CS.w * 0.78, zx = CS.x + CS.w * 0.5;
    let tt = F.f ? F.f.t : -1;
    if (F.f) { F.f.t += dt; tt = F.f.t; }
    const approachP = smooth(tt / 1.5), fuse = smooth((tt - 1.8) / 1.0);
    // 난자
    if (tt < 1.8) {
      cellDisc(ex, ey, er, er);
      T(ex, ey + er + 22, '난자 (n = ' + nG + ')', PHONE ? 13 : 15, MAT, 'center', 800);
      ctx.save(); ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.restore();
      rodsGrid(ex, ey, nG, MAT, PHONE ? 2.8 : 3.6, PHONE ? 10 : 14, hypo ? 9 : 6);
      // 정자
      const sx = lerp(sx0, ex - er * 0.9, approachP), sy = ey + Math.sin(t * 9) * 3 * (1 - approachP);
      ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 12; i++) { const px = sx - 20 - i * 6, py = sy + Math.sin(t * 12 - i * 0.7) * 5; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.restore();
      D.sphere(sx, sy, PHONE ? 16 : 20, '#e0e7ff', { shadow: true });
      rodsGrid(sx, sy, nG, PAT, PHONE ? 1.6 : 2, PHONE ? 7 : 9, hypo ? 9 : 6);
      if (approachP < 0.4) T(sx0, ey + er + 22, '정자 (n = ' + nG + ')', PHONE ? 13 : 15, PAT, 'center', 800);
    } else {
      // 핵 융합
      const r0 = lerp(er, er * 1.1, fuse);
      cellDisc(zx + (ex - zx) * (1 - fuse), ey, r0, r0);
      const nr = lerp(PHONE ? 20 : 28, PHONE ? 32 : 44, fuse);
      const x1 = lerp(ex - 14, zx - 8, fuse) , x2 = lerp(ex + 14, zx + 8, fuse);
      const cxz = zx + (ex - zx) * (1 - fuse);
      ctx.fillStyle = '#ede9fe'; ctx.strokeStyle = '#8b6bc9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cxz, ey, nr + 8 * fuse, 0, TAU); ctx.fill(); ctx.stroke();
      const rw = PHONE ? 2.2 : 3.2, rh = PHONE ? 8 : 12;
      rodsGrid(cxz - (PHONE ? 10 : 15) * (1 - fuse * 0.2), ey, nG, PAT, rw, rh, hypo ? 6 : 4);
      rodsGrid(cxz + (PHONE ? 10 : 15) * (1 - fuse * 0.2), ey, nG, MAT, rw, rh, hypo ? 6 : 4);
      if (tt > 2.2 && !F.f.burst) { F.f.burst = true; Sound.success(); parts.burst(cxz, ey, { count: 26, colors: [PAT, MAT, '#fde047', '#fff'], speed: 190, size: 4, life: 0.9 }); }
      if (tt > 3.0) { F.done = true; T(zx, ey + er + 26, '수정란 2n = ' + nZ + (hypo ? ' (2배로 늘어요!)' : ' (그대로!)'), PHONE ? 14 : 17, hypo ? '#c2410c' : '#166534', 'center', 800); }
    }
    if (!F.f) T(CS.x + CS.w / 2, CS.y + CS.h - 14, '▶ 수정시키기 버튼을 눌러 보세요', PHONE ? 13 : 14.5, '#16a34a', 'center', 800);
    // 막대 그래프 : 세대별 염색체 수
    panel(CB.x, CB.y, CB.w, CB.h, 16, '#fff');
    T(CB.x + 12, CB.y + 24, PHONE ? '세대별 염색체 수' : '세대별 염색체 수 (체세포)', PHONE ? 13.5 : 16, '#14532d', 'left', 800);
    const px0 = CB.x + (PHONE ? 46 : 60), px1 = CB.x + CB.w - 16, py0 = CB.y + (PHONE ? 70 : 52), py1 = CB.y + CB.h - (PHONE ? 38 : 40), ymax = 400;
    const yv = (v) => py1 - clamp(v, 0, ymax) / ymax * (py1 - py0);
    for (let v = 0; v <= 400; v += 100) { ctx.strokeStyle = v === 0 ? '#64748b' : '#e2e8f0'; ctx.lineWidth = v === 0 ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(px0, yv(v)); ctx.lineTo(px1, yv(v)); ctx.stroke(); T(px0 - 8, yv(v) + 5, String(v), 13.5, '#475569', 'right', 800); }
    const cw = (px1 - px0) / 4, names = ['부모 세대', '1세대', '2세대', '3세대'];
    const pv = predVals(), allOK = F.predOK || (game && game.free);
    for (let g = 0; g < 4; g++) {
      const x = px0 + g * cw + cw / 2;
      T(x, py1 + 22, names[g], PHONE ? 13 : 14.5, '#475569', 'center', 800);
      const bw = cw * 0.28;
      // 감수 분열 (실제): 항상 46
      D.roundRect(x - bw - 3, yv(46), bw, py1 - yv(46), 4); ctx.fillStyle = COL_G; ctx.fill();
      T(x - bw / 2 - 3, yv(46) - 6, '46', 13, '#166534', 'center', 800);
      // 체세포분열(가정): 예측값
      const val = g === 0 ? 46 : pv[g - 1];
      if (val != null && (g === 0 || true)) {
        const ok = g === 0 || val === GEN[g];
        ctx.save(); D.roundRect(x + 3, yv(val), bw, py1 - yv(val), 4); ctx.fillStyle = ok ? COL_H : 'rgba(249,115,22,.25)'; ctx.fill(); if (!ok) { ctx.strokeStyle = '#ea580c'; ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.stroke(); } ctx.restore();
        T(x + 3 + bw / 2, Math.max(py0 + 6, yv(val) - 6), val > ymax ? String(val) + '↑' : String(val), 13, ok ? '#9a3412' : '#c2410c', 'center', 800);
      }
    }
    const lx = CB.x + CB.w - 12, ly = CB.y + (PHONE ? 48 : 22);
    D.label(lx, ly, '체세포분열로 만들면 (가정)', { bg: COL_H, color: '#fff', size: PHONE ? 12.5 : 13.5, align: 'right' });
    D.label(lx - (PHONE ? 196 : 218), ly, '감수 분열 (실제)', { bg: COL_G, color: '#fff', size: PHONE ? 12.5 : 13.5, align: 'right' });
    // 수정 조합 카드
    panel(CC.x, CC.y, CC.w, CC.h, 16, '#fff');
    const x = CC.x + 14, w = CC.w - 28;
    T(x, CC.y + 26, '수정할 때 만들어지는 조합', PHONE ? 14 : 16, '#14532d', 'left', 800);
    const lines = PHONE
      ? [['2n = 6', '8 × 8 = 64가지'], ['사람 (n = 23)', '2²³ × 2²³ = 2⁴⁶ ≈ 7.0 × 10¹³가지 (약 70조)']]
      : [['2n = 6 (n = 3)', '8 × 8 = 64가지'], ['사람 (n = 23)', '2²³ × 2²³ = 2⁴⁶'], ['', '≈ 7.0 × 10¹³가지 (약 70조)']];
    let yy = CC.y + 52;
    lines.forEach((l, i) => { if (l[0]) { D.label(x, yy + 4, l[0], { bg: i === 0 ? '#2563eb' : '#7c3aed', color: '#fff', size: PHONE ? 12.5 : 13.5, align: 'left' }); yy += PHONE ? 30 : 34; } T(x + (l[0] ? 4 : 4), yy + 4, l[1], PHONE ? 13.5 : 15, '#1f2d44', 'left', 800); yy += PHONE ? 22 : 26; });
    if (!PHONE) textBlock(x, yy + 8, w, '교차까지 더하면 훨씬 많아요. 그래서 같은 부모에게서 태어난 형제자매도 서로 달라요.', 13.5, '#475569', 19, 700);
  }
  const COL_G = '#16a34a', COL_H = '#f97316';

  /* =========================================================
     ④ 모델 스튜디오 : 단계 장면을 골라 배열하고 저장·재생 → 갤러리에서 비교
     ========================================================= */
  const TOKENS = [
    { id: 'rep', name: '복제', ico: '🧬', req: 0 },
    { id: 'syn', name: '2가 염색체 형성', ico: '🤝', req: 1 },
    { id: 'crs', name: '교차', ico: '✂️', req: 2 },
    { id: 'sp1', name: '상동 염색체 분리', ico: '↔️', req: 3 },
    { id: 'sp2', name: '염색 분체 분리', ico: '🔀', req: 4 },
    { id: 'gam', name: '생식세포 4개', ico: '🔵', req: 5 },
    { id: 'fer', name: '수정 (2n 회복)', ico: '💥', req: 6 },
    { id: 'bad1', name: '복제 없이 분리', ico: '❓', req: -1 },
    { id: 'bad2', name: '체세포분열로 만든 생식세포', ico: '❓', req: -1 },
  ];
  const TOK = {}; TOKENS.forEach((k) => { TOK[k.id] = k; });
  const REQ_NAMES = ['복제', '2가 염색체 형성', '교차', '상동 염색체 분리', '염색 분체 분리', '생식세포 4개의 염색체 수 표시', '수정으로 2n 회복'];
  const PALS = [{ n: '파랑·빨강', c: [PAT, MAT] }, { n: '초록·주황', c: ['#16a34a', '#ea580c'] }, { n: '보라·노랑', c: ['#7c3aed', '#d4a106'] }];
  const MAXSLOT = 8;
  S.st = { seq: [], pal: 0, tag: true, nlab: true, style: 'name', sel: 0, play: null, posted: false, postT: -9, view: 0, flip: 0 };
  const stItems = () => {
    const sq = S.st.seq, has = (id) => sq.indexOf(id) >= 0;
    return [has('rep'), has('syn'), has('crs'), has('sp1'), has('sp2'), has('gam') && S.st.nlab, has('fer')];
  };
  const stOrderOK = () => { let last = -1; for (const id of S.st.seq) { const r = TOK[id].req; if (r < 0) continue; if (r <= last) return false; last = r; } return true; };
  const stBad = () => S.st.seq.filter((id) => TOK[id].req < 0).length;
  const stOK = () => stItems().every(Boolean) && stOrderOK() && stBad() === 0;
  function stMsg() {
    const it = stItems();
    if (it.every(Boolean) && stOrderOK() && stBad() === 0) return true;
    if (stBad()) return '모형에 맞지 않는 장면이 들어 있어요. 빨간 표시(❓) 장면을 빼 보세요.';
    const miss = it.map((v, i) => (v ? null : i)).filter((v) => v !== null);
    if (miss.length) { const m = miss[0]; return m === 5 && S.st.seq.indexOf('gam') >= 0 ? '생식세포 4개 장면에서 염색체 수(n)를 표시하도록 ‘염색체 수 표시’를 켜 주세요.' : '필수 요소 ' + (m + 1) + '번 ‘' + REQ_NAMES[m] + '’ 장면이 빠졌어요.'; }
    return '장면 순서를 확인해 보세요. 복제 → 2가 염색체 → 교차 → 상동 염색체 분리 → 염색 분체 분리 → 생식세포 → 수정 순서예요.';
  }
  function modelOf(m) { return { seq: m.seq, pal: m.pal, tag: m.tag, nlab: m.nlab, style: m.style }; }
  const GALLERY = [
    { id: 'A', name: '모둠 A', seq: ['rep', 'syn', 'crs', 'sp1', 'sp2', 'gam', 'fer'], pal: 1, tag: true, nlab: true, style: 'num', miss: null },
    { id: 'B', name: '모둠 B', seq: ['rep', 'syn', 'sp1', 'sp2', 'gam', 'fer'], pal: 2, tag: true, nlab: true, style: 'name', miss: 'crs' },
    { id: 'C', name: '모둠 C', seq: ['rep', 'syn', 'crs', 'sp1', 'sp2', 'gam'], pal: 0, tag: true, nlab: true, style: 'name', miss: 'fer' },
  ];
  S.gal = { ans: { B: '', C: '' }, shown: [false, false, false, false], t0: 0 };

  /* 장면 하나 그리기: 2n = 4 모형 */
  function drawToken(id, x, y, w, h, o) {
    o = o || {};
    const pal = (o.pal || PALS[S.st.pal]).c, nlab = o.nlab != null ? o.nlab : S.st.nlab, tm = o.t || 0;
    const m = Math.min(w, h), LLx = m * 0.3, LSx = m * 0.19, wd = m * 0.058;
    const cx = x + w / 2, cy = y + h / 2;
    const rr = (id2, ox, oy, pp, hh, dbl, a) => chr1(cx + ox * m, cy + oy * m, pp ? LSx : LLx, wd, pal[hh], pp ? 0.4 : 0.45, dbl, { alpha: a });
    const cell = (ox, oy, rx, ry) => cellDisc(cx + ox * m, cy + oy * m, rx * m, ry * m);
    const bobF = Math.sin(tm * 2) * 0.008, bob = bobF * m;
    const lab = (txt, ox, oy) => T(cx + ox * m, cy + oy * m, txt, o.fs || Math.max(12.5, m * 0.075), '#14532d', 'center', 800);
    switch (id) {
      case 'rep':
        cell(0, 0, 0.44, 0.44);
        rr(0, -0.2, -0.05 + bobF, 0, 0, true); rr(0, 0.0, 0.1 - bobF, 0, 1, true); rr(0, 0.18, -0.12 + bobF, 1, 0, true); rr(0, 0.12, 0.16 - bobF, 1, 1, true);
        break;
      case 'syn':
        cell(0, 0, 0.44, 0.44);
        rr(0, -0.22 - wd / m * 1.4, 0 + bobF, 0, 0, true); rr(0, -0.22 + wd / m * 1.4, 0 - bobF, 0, 1, true);
        rr(0, 0.2 - wd / m * 1.4, 0.04 + bobF, 1, 0, true); rr(0, 0.2 + wd / m * 1.4, 0.04 - bobF, 1, 1, true);
        break;
      case 'crs': {
        cell(0, 0, 0.44, 0.44);
        const bx = cx - 0.22 * m, by = cy;
        chr1(bx - wd * 2.7, by, LLx, wd, pal[0], 0.45, false); chrMix(bx - wd * 0.9, by, LLx, wd, pal[0], pal[1], 0.45, 0.58);
        chrMix(bx + wd * 0.9, by, LLx, wd, pal[1], pal[0], 0.45, 0.58); chr1(bx + wd * 2.7, by, LLx, wd, pal[1], 0.45, false);
        ctx.strokeStyle = '#ca8a04'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(bx, by + LLx * 0.08, wd * 2.6, wd * 1.1, 0, 0, TAU); ctx.stroke();
        rr(0, 0.2 - wd / m * 1.4, 0.04, 1, 0, true); rr(0, 0.2 + wd / m * 1.4, 0.04, 1, 1, true);
        break;
      }
      case 'sp1':
        cell(-0.24, 0, 0.23, 0.36); cell(0.24, 0, 0.23, 0.36);
        rr(0, -0.29, -0.05, 0, 0, true); rr(0, -0.19, 0.1, 1, 1, true); rr(0, 0.19, -0.05, 0, 1, true); rr(0, 0.29, 0.1, 1, 0, true);
        if (nlab && !o.mini) { lab('n = 2', -0.24, 0.46); lab('n = 2', 0.24, 0.46); }
        break;
      case 'sp2':
        cell(-0.24, 0, 0.23, 0.36); cell(0.24, 0, 0.23, 0.36);
        [[-0.24, 0, 1], [0.24, 1, 0]].forEach(([ox, a, b]) => {
          chr1(cx + (ox - 0.12) * m, cy - 0.12 * m, LLx * 0.9, wd, pal[a], 0.45, false); chr1(cx + (ox + 0.12) * m, cy - 0.12 * m, LLx * 0.9, wd, pal[a], 0.45, false);
          chr1(cx + (ox - 0.12) * m, cy + 0.17 * m, LSx * 0.9, wd, pal[b], 0.4, false); chr1(cx + (ox + 0.12) * m, cy + 0.17 * m, LSx * 0.9, wd, pal[b], 0.4, false);
        });
        break;
      case 'gam': {
        const xs = [-0.36, -0.12, 0.12, 0.36];
        xs.forEach((ox, i) => { const left = i < 2; cell(ox, 0, 0.115, 0.2); chr1(cx + (ox - 0.035) * m, cy - 0.01 * m, LLx * 0.55, wd * 0.8, pal[left ? 0 : 1], 0.45, false); chr1(cx + (ox + 0.04) * m, cy + 0.02 * m, LSx * 0.55, wd * 0.8, pal[left ? 1 : 0], 0.4, false); if (nlab) T(cx + ox * m, cy + 0.3 * m, 'n', o.fs || Math.max(12.5, m * 0.075), '#14532d', 'center', 800); });
        break;
      }
      case 'fer':
        cellDisc(cx, cy, 0.4 * m, 0.4 * m);
        ctx.fillStyle = '#ede9fe'; ctx.strokeStyle = '#8b6bc9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 0.26 * m, 0, TAU); ctx.fill(); ctx.stroke();
        chr1(cx - 0.12 * m, cy - 0.02 * m + bob, LLx * 0.62, wd * 0.9, pal[0], 0.45, false); chr1(cx - 0.04 * m, cy - 0.02 * m - bob, LLx * 0.62, wd * 0.9, pal[1], 0.45, false);
        chr1(cx + 0.06 * m, cy + 0.02 * m + bob, LSx * 0.62, wd * 0.9, pal[0], 0.4, false); chr1(cx + 0.14 * m, cy + 0.02 * m - bob, LSx * 0.62, wd * 0.9, pal[1], 0.4, false);
        D.sphere(cx - 0.34 * m, cy - 0.34 * m, 0.04 * m, '#e0e7ff', { gloss: false });
        if (nlab && !o.mini) lab('2n = 4', 0, 0.5);
        break;
      case 'bad1':
        cell(-0.24, 0, 0.23, 0.36); cell(0.24, 0, 0.23, 0.36);
        chr1(cx - 0.29 * m, cy, LLx, wd, pal[0], 0.45, false); chr1(cx - 0.19 * m, cy, LSx, wd, pal[1], 0.4, false); chr1(cx + 0.19 * m, cy, LLx, wd, pal[1], 0.45, false); chr1(cx + 0.29 * m, cy, LSx, wd, pal[0], 0.4, false);
        break;
      default: // bad2
        cell(-0.24, 0, 0.23, 0.36); cell(0.24, 0, 0.23, 0.36);
        [-0.24, 0.24].forEach((ox) => { chr1(cx + (ox - 0.1) * m, cy - 0.04 * m, LLx * 0.8, wd, pal[0], 0.45, false); chr1(cx + (ox - 0.03) * m, cy - 0.04 * m, LLx * 0.8, wd, pal[1], 0.45, false); chr1(cx + (ox + 0.05) * m, cy + 0.06 * m, LSx * 0.8, wd, pal[0], 0.4, false); chr1(cx + (ox + 0.12) * m, cy + 0.06 * m, LSx * 0.8, wd, pal[1], 0.4, false); });
        if (nlab && !o.mini) { lab('2n = 4', -0.24, 0.46); lab('2n = 4', 0.24, 0.46); }
    }
  }
  const tagOf = (seq, i, style) => (style === 'num' ? (i + 1) + '단계' : TOK[seq[i]].name);
  const STV = PHONE ? { x: 6, y: 8, w: 468, h: 268 } : { x: 12, y: 12, w: 776, h: 300 };
  const STL = PHONE ? { x: 6, y: 284, w: 468, h: 352 } : { x: 12, y: 322, w: 776, h: 226 };
  const slotRectS = (i) => {
    if (PHONE) { const cols = 4, w = (STL.w - 16) / cols, h = (STL.h - 16) / 2; return { x: STL.x + 8 + (i % cols) * w, y: STL.y + 8 + Math.floor(i / cols) * h, w: w - 6, h: h - 6 }; }
    const w = (STL.w - 16) / MAXSLOT; return { x: STL.x + 8 + i * w, y: STL.y + 8, w: w - 6, h: STL.h - 16 };
  };
  function stepStudio(dt) {
    const P = S.st.play;
    if (P) {
      P.t += dt;
      const per = 1.6, idx = Math.floor(P.t / per);
      if (idx >= S.st.seq.length) { S.st.play = null; S.st.sel = Math.max(0, S.st.seq.length - 1); updateCtl(); }
      else if (idx !== S.st.view) { S.st.view = idx; S.st.flip = 1; Sound.tick(); }
    }
    S.st.flip = RM ? 0 : approach(S.st.flip, 0, dt, 5);
  }
  function drawStudio(dt, t) {
    const St = S.st;
    stepStudio(dt);
    panel(STV.x, STV.y, STV.w, STV.h, 16, '#fff');
    const sq = St.seq, vi = St.play ? St.view : St.sel;
    if (!sq.length) {
      T(STV.x + STV.w / 2, STV.y + STV.h / 2 - 6, '오른쪽 장면 도구에서 장면을 골라 모델을 만들어 보세요', PHONE ? 14 : 18, '#94a3b8', 'center', 800);
      T(STV.x + STV.w / 2, STV.y + STV.h / 2 + 22, '(필수 요소 7개를 모두 넣으면 완성!)', PHONE ? 13 : 15, '#94a3b8', 'center', 700);
    } else {
      const id = sq[clamp(vi, 0, sq.length - 1)], fl = St.flip;
      ctx.save(); ctx.globalAlpha = 1 - fl * 0.6; ctx.translate(STV.x + STV.w / 2, STV.y + STV.h / 2); ctx.scale(1 - fl * 0.06, 1 - fl * 0.06); ctx.translate(-(STV.x + STV.w / 2), -(STV.y + STV.h / 2));
      const vh = STV.h - (PHONE ? 74 : 40), vw = PHONE ? Math.min(STV.w - 40, vh * 1.7) : Math.min(STV.w - 250, vh * 1.7);
      drawToken(id, PHONE ? STV.x + (STV.w - vw) / 2 : STV.x + 14 + (STV.w - 250 - vw) / 2 + 20, STV.y + 36, vw, vh, { t, fs: PHONE ? 14 : 17 });
      ctx.restore();
      if (St.tag) D.label(STV.x + 14, STV.y + 22, tagOf(sq, clamp(vi, 0, sq.length - 1), St.style), { bg: TOK[id].req < 0 ? '#dc2626' : '#16a34a', color: '#fff', size: PHONE ? 14 : 16, align: 'left' });
      T(STV.x + STV.w - 14, STV.y + 24, (clamp(vi, 0, sq.length - 1) + 1) + ' / ' + sq.length + (St.play ? '  ▶ 재생 중' : ''), PHONE ? 13.5 : 15, '#475569', 'right', 800);
    }
    // 필수 요소 점검표
    const its = stItems();
    if (PHONE) {
      const n = its.filter(Boolean).length;
      T(STV.x + STV.w / 2, STV.y + STV.h - 8, '필수 요소 ' + n + ' / 7  ' + its.map((v) => (v ? '●' : '○')).join(' '), 13.5, n === 7 ? '#16a34a' : '#64748b', 'center', 800);
    } else {
      const cx0 = STV.x + STV.w - 214;
      T(cx0, STV.y + 56, '필수 요소 ' + its.filter(Boolean).length + ' / 7', 15, '#14532d', 'left', 800);
      REQ_NAMES.forEach((nm, i) => { const y = STV.y + 80 + i * 26; D.sphere(cx0 + 9, y - 5, 8, its[i] ? '#16a34a' : '#e2e8f0', { gloss: false }); T(cx0 + 9, y - 0.5, its[i] ? '✓' : String(i + 1), 11, its[i] ? '#fff' : '#94a3b8', 'center', 800); T(cx0 + 24, y, nm, 13.5, its[i] ? '#166534' : '#64748b', 'left', 800); });
    }
    // 타임라인
    panel(STL.x, STL.y, STL.w, STL.h, 16, '#fff');
    for (let i = 0; i < MAXSLOT; i++) {
      const r = slotRectS(i), id = sq[i];
      if (!id) { D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); T(r.x + r.w / 2, r.y + r.h / 2 + 6, String(i + 1), 16, '#cbd5e1', 'center', 800); continue; }
      const on = i === vi, bad = TOK[id].req < 0;
      D.roundRect(r.x, r.y, r.w, r.h, 10); ctx.fillStyle = on ? '#f0fdf4' : '#fff'; ctx.fill(); ctx.lineWidth = on ? 3 : 1.8; ctx.strokeStyle = bad ? '#dc2626' : on ? '#16a34a' : '#cbd5e1'; ctx.stroke();
      drawToken(id, r.x + 2, r.y + 18, r.w - 4, PHONE ? r.h - 56 : r.h - 82, { t, fs: 12.5, mini: true });
      D.sphere(r.x + 13, r.y + 13, 9, bad ? '#dc2626' : '#16a34a', { text: String(i + 1), gloss: false });
      if (St.tag) textBlock(r.x + r.w / 2, r.y + r.h - (PHONE ? 30 : 46), r.w - 6, tagOf(sq, i, St.style), PHONE ? 12 : 13, bad ? '#dc2626' : '#1f2d44', PHONE ? 14 : 16, 800, 'center');
    }
    if (St.posted && S.clock - St.postT < 1.2) { const k = (S.clock - St.postT) / 1.2; ctx.save(); ctx.globalAlpha = 1 - k; D.ring(STV.x + STV.w / 2, STV.y + STV.h / 2, 60 + k * 150, 0.5, { color: '#16a34a' }); ctx.restore(); }
  }
  function stTapSlot(p) {
    for (let i = 0; i < MAXSLOT; i++) if (S.st.seq[i] && inRect(p, slotRectS(i))) { S.st.sel = i; S.st.play = null; Sound.tick(); updateCtl(); return; }
  }
  function stAdd(id) {
    const St = S.st; if (St.play) return;
    if (St.seq.length >= MAXSLOT) { showHint('빈 칸이 없어요. 필요 없는 장면은 ✕로 지워 보세요.'); return; }
    St.seq.push(id); St.sel = St.seq.length - 1; St.flip = 1; St.posted = false; Sound.click(); updateCtl();
  }
  function stRemove(i) { const St = S.st; St.seq.splice(i, 1); St.sel = clamp(St.sel, 0, Math.max(0, St.seq.length - 1)); St.posted = false; Sound.click(); updateCtl(); }
  function stMove(i, d) { const St = S.st, j = i + d; if (j < 0 || j >= St.seq.length) return; const t = St.seq[i]; St.seq[i] = St.seq[j]; St.seq[j] = t; St.sel = j; St.posted = false; Sound.click(); updateCtl(); }
  function stPlay() { const St = S.st; if (!St.seq.length) return; St.play = { t: 0 }; St.view = 0; St.flip = 1; Sound.click(); updateCtl(); }
  function stPost() { const St = S.st; if (!stOK()) return; St.posted = true; St.postT = S.clock; S.gal.shown[3] = true; S.gal.t0 = S.clock; Sound.level(); parts.burst(STV.x + STV.w / 2, STV.y + STV.h / 2, { count: 26, colors: ['#16a34a', '#fde047', '#fff', '#2563eb'], speed: 200, size: 4, life: 1 }); updateCtl(); }

  /* 갤러리 : 모둠 모델 3개 + 내 모델 */
  function drawGallery(dt, t) {
    const cols = PHONE ? 2 : 4, gw = (VW - 16 - (cols - 1) * 10) / cols, gh = PHONE ? (VH - 16 - 10) / 2 : VH - 16;
    const models = GALLERY.map((g) => g).concat([{ id: 'ME', name: '내 모델', seq: S.st.seq, pal: S.st.pal, tag: S.st.tag, nlab: S.st.nlab, style: S.st.style, mine: true }]);
    models.forEach((g, i) => {
      const x = 8 + (i % cols) * (gw + 10), y = 8 + Math.floor(i / cols) * (gh + 10);
      const pop = g.mine ? (S.gal.shown[3] ? smooth((S.clock - S.gal.t0) * 3) : 0) : 1;
      ctx.save(); ctx.translate(x + gw / 2, y + gh / 2); ctx.scale(0.8 + 0.2 * pop, 0.8 + 0.2 * pop); ctx.translate(-(x + gw / 2), -(y + gh / 2));
      if (g.mine && !S.gal.shown[3]) {
        D.roundRect(x, y, gw, gh, 16); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#cbd5e1'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
        textBlock(x + gw / 2, y + gh / 2 - 20, gw - 24, '스튜디오에서 모델을 완성하고 📤 갤러리에 올리면 여기에 나타나요', PHONE ? 13 : 14.5, '#94a3b8', 20, 800, 'center');
        ctx.restore(); return;
      }
      panel(x, y, gw, gh, 16, '#fff');
      D.label(x + 10, y + 20, g.name, { bg: g.mine ? '#16a34a' : '#64748b', color: '#fff', size: PHONE ? 13 : 14, align: 'left' });
      const pal = PALS[g.pal];
      T(x + gw - 10, y + 24, pal.n, PHONE ? 12.5 : 13.5, pal.c[0], 'right', 800);
      const tcols = PHONE ? 3 : 2, tw = (gw - 16) / tcols, th = PHONE ? 52 : 66, ty0 = y + 38;
      const SHORT = { rep: '복제', syn: '2가 형성', crs: '교차', sp1: '상동 분리', sp2: '분체 분리', gam: '생식세포', fer: '수정', bad1: '복제 없이', bad2: '체세포식' };
      for (let k = 0; k < Math.min(9, g.seq.length); k++) {
        const tx = x + 8 + (k % tcols) * tw, ty = ty0 + Math.floor(k / tcols) * (th + (PHONE ? 22 : 26));
        D.roundRect(tx, ty, tw - 4, th + (PHONE ? 20 : 22), 8); ctx.fillStyle = '#f8fafc'; ctx.fill(); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.4; ctx.stroke();
        drawToken(g.seq[k], tx, ty + 2, tw - 4, th, { pal, nlab: g.nlab, fs: 12.5, t, mini: true });
        T(tx + (tw - 4) / 2, ty + th + (PHONE ? 16 : 17), g.style === 'num' ? (k + 1) + '단계' : SHORT[g.seq[k]], PHONE ? 12.5 : 13, '#334155', 'center', 800);
      }
      const have = (id) => g.seq.indexOf(id) >= 0;
      const cnt = [have('rep'), have('syn'), have('crs'), have('sp1'), have('sp2'), have('gam') && g.nlab, have('fer')].filter(Boolean).length;
      D.label(x + gw / 2, y + gh - 18, '필수 요소 ' + cnt + ' / 7', { bg: cnt === 7 ? '#16a34a' : '#f59e0b', color: '#fff', size: PHONE ? 13 : 14 });
      ctx.restore();
    });
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const MODE_LABEL = { combo: '🎲 감수 분열로 만들어지는 염색체 조합', log: '📈 생식세포 종류 수 2ⁿ', cross: '✂️ 교차: 상동 염색체의 DNA 조각 교환', cont: '🔗 수정과 염색체 수의 유지', studio: '🛠️ 모델 스튜디오', gallery: '🖼️ 모둠 모델 갤러리' };
  S.ui = {};
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); S.cb.a = null; S.st.play = null; }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  const FREE = () => !!(game && game.free);
  const sciStr = (v) => { if (v < 1e7) return v.toLocaleString('en-US'); const e = Math.floor(Math.log10(v)); return '약 ' + (v / Math.pow(10, e)).toFixed(1) + ' × 10' + sup(e); };
  function buildStudioDom() {
    const tg = $('#tokGrid'); tg.innerHTML = '';
    TOKENS.forEach((k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tok' + (k.req < 0 ? ' bad' : ''); b.innerHTML = '<span>' + k.ico + '</span> ' + k.name;
      b.addEventListener('click', () => stAdd(k.id)); tg.appendChild(b);
    });
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = FREE();
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    // combo
    $('#oRuns').textContent = S.cb.runs + '번';
    $('#bRun').disabled = !!S.cb.a; $('#bRun10').disabled = !!S.cb.a;
    $('#cbNote').innerHTML = foundCount() >= 8 ? '8가지 조합을 모두 모았어요! 🎉' : '쌍마다 파랑·빨강 중 어느 쪽이 갈지 무작위예요. 지금까지 <b>' + foundCount() + ' / 8</b>가지.';
    // log
    const G = S.lg;
    $('#sN').value = G.tn; $('#sN').style.setProperty('--pct', ((G.tn - 1) / 22 * 100) + '%');
    $('#oN').textContent = 'n = ' + G.tn;
    $('#calcIn').classList.toggle('ok', G.calcOk); $('#calcIn').classList.toggle('bad', G.calc !== '' && !G.calcOk);
    $('#calcNote').innerHTML = G.calcOk ? '맞아요! 2²³ = 8,388,608 ≈ 8.4 × 10⁶ (약 840만 가지)' : G.calc !== '' ? '다시 계산해 보세요. 2²³ = 8,388,608이에요.' : '슬라이더를 n = 23으로 맞추고 값을 읽어 소수 첫째 자리까지 써요.';
    // cross
    const Cc = S.cr;
    $('#bGam').disabled = Cc.made; $('#bCrReset').disabled = !Cc.crosses && !Cc.made;
    $('#crNote').innerHTML = Cc.made ? '교차 ' + Cc.crosses + '번 → 생식세포 종류 <b>' + crKinds() + '가지</b>. 교차가 없다면 2가지(AB, ab)뿐이에요.' : Cc.crosses ? '교차를 ' + Cc.crosses + '번 일으켰어요. ▶ 생식세포 만들기를 눌러 보세요.' : '염색 분체를 눌러 교차를 일으켜요: 파랑 1개 → 빨강 1개.';
    // cont
    $('#cmSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b.dataset.h === '1') === S.ct.hypo));
    $('#predWrap').hidden = !(S.mode === 'cont' && S.ui.pred);
    ['pd1', 'pd2', 'pd3'].forEach((id, i) => { const e = $('#' + id); e.classList.toggle('ok', predRight(i)); e.classList.toggle('bad', S.ct.pred[i] !== '' && !predRight(i)); });
    S.ct.predOK = [0, 1, 2].every(predRight);
    $('#ctNote').innerHTML = S.ct.hypo ? '가정: 정자와 난자가 체세포분열로 만들어져 <b>46개</b>씩이면 수정란은 <b>92개</b>가 돼요.' : '실제: 감수 분열로 정자와 난자가 <b>23개</b>(n)씩이라 수정란은 <b>46개</b>(2n)로 일정해요.';
    // studio
    const St = S.st, it = stItems();
    const hasSel = St.seq.length > 0 && St.sel >= 0 && St.sel < St.seq.length;
    $('#tlTitle').textContent = hasSel ? '🎞️ 선택한 장면: ' + (St.sel + 1) + '. ' + TOK[St.seq[St.sel]].name : '🎞️ 장면을 넣으면 아래에서 순서를 바꿀 수 있어요';
    $('#tlUp').disabled = !hasSel || St.sel === 0; $('#tlDn').disabled = !hasSel || St.sel === St.seq.length - 1; $('#tlRm').disabled = !hasSel;
    $('#palSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.p === St.pal));
    $('#stStyle').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.s === St.style));
    $('#tgTag').checked = St.tag; $('#tgN').checked = St.nlab;
    $('#bPlay').disabled = !St.seq.length || !!St.play; $('#bPost').disabled = !stOK();
    $('#stNote').innerHTML = stOK() ? (St.posted ? '갤러리에 올렸어요! 🖼️ 갤러리 화면에서 다른 모둠 모델과 비교해 봐요.' : '필수 요소 7개를 모두 넣었어요! <b>📤 갤러리에 올리기</b>를 눌러요.') : '필수 요소 <b>' + it.filter(Boolean).length + ' / 7</b>' + (stOrderOK() ? '' : ' · 순서를 확인해요') + (stBad() ? ' · ❓ 장면은 빼요' : '');
    // gallery
    ['galB', 'galC'].forEach((id) => { const e = $('#' + id); const k = id === 'galB' ? 'B' : 'C'; e.value = S.gal.ans[k]; });
    $('#galWrap').hidden = !(S.mode === 'gallery' && S.ui.gal);
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#bRun').addEventListener('click', runMeiosis);
  $('#bRun10').addEventListener('click', () => runQuick(10));
  $('#bClr').addEventListener('click', () => { S.cb.found = Array(8).fill(false); S.cb.runs = 0; S.cb.last = null; S.cb.lastNew = []; Sound.click(); updateCtl(); });
  $('#sN').addEventListener('input', (e) => { S.lg.tn = +e.target.value; if (S.lg.tn === 23) S.lg.seen23 = true; Sound.tick(); updateCtl(); });
  $('#calcIn').addEventListener('input', (e) => { S.lg.calc = e.target.value.trim().replace(',', '.'); S.lg.calcOk = S.lg.calc === '8.4'; if (S.lg.calcOk) Sound.success(); updateCtl(); });
  $('#bGam').addEventListener('click', makeGametes);
  $('#bCrReset').addEventListener('click', resetCross);
  $('#cmSeg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ct.hypo = b.dataset.h === '1'; resetFert(); updateCtl(); }));
  $('#bFert').addEventListener('click', () => { if (S.ct.f && !S.ct.done) return; S.ct.ran[S.ct.hypo ? 'hypo' : 'real'] = true; resetFert(); startFert(); });
  ['pd1', 'pd2', 'pd3'].forEach((id, i) => $('#' + id).addEventListener('input', (e) => { S.ct.pred[i] = e.target.value.trim(); updateCtl(); }));
  $('#palSeg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { S.st.pal = +b.dataset.p; S.st.posted = false; Sound.click(); updateCtl(); }));
  $('#stStyle').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { S.st.style = b.dataset.s; S.st.posted = false; Sound.click(); updateCtl(); }));
  $('#tgTag').addEventListener('change', (e) => { S.st.tag = e.target.checked; S.st.posted = false; Sound.click(); updateCtl(); });
  $('#tgN').addEventListener('change', (e) => { S.st.nlab = e.target.checked; S.st.posted = false; Sound.click(); updateCtl(); });
  $('#tlUp').addEventListener('click', () => stMove(S.st.sel, -1));
  $('#tlDn').addEventListener('click', () => stMove(S.st.sel, 1));
  $('#tlRm').addEventListener('click', () => stRemove(S.st.sel));
  $('#bPlay').addEventListener('click', stPlay);
  $('#bPost').addEventListener('click', stPost);
  $('#galB').addEventListener('change', (e) => { S.gal.ans.B = e.target.value; Sound.click(); });
  $('#galC').addEventListener('change', (e) => { S.gal.ans.C = e.target.value; Sound.click(); });
  S.ct.ran = { real: false, hypo: false };
  buildStudioDom();

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'cross') { crossTap(p); return false; }
      if (S.mode === 'studio') { stTapSlot(p); return false; }
      return false;
    },
    hover(p) {
      if (S.mode === 'cross') { const C_ = S.cr; if (C_.made) { for (let i = 0; i < 4; i++) { const g = gameteXY(i); if (Math.hypot(p.x - g.x, p.y - g.y) < gameteR() + 6) return 'pointer'; } } else for (let i = 0; i < 4; i++) if (Math.abs(p.x - C_.xs[i]) < CWID / 2 + 3 && p.y > cyTop() - 6 && p.y < cyTop() + CLEN + 6) return 'pointer'; }
      if (S.mode === 'studio') for (let i = 0; i < MAXSLOT; i++) if (S.st.seq[i] && inRect(p, slotRectS(i))) return 'pointer';
      return 'default';
    },
  });

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'combo') { L1 = '실행 횟수'; a = S.cb.runs + '번'; L2 = '모은 조합'; b = foundCount() + ' / 8가지'; L3 = '이번에 나온 조합'; c = S.cb.last ? S.cb.last.map((g) => bitsLabel(g)).join(' / ') : '—'; }
    else if (m === 'log') { const n = S.lg.tn, v = Math.pow(2, n); L1 = '염색체 쌍의 수 n'; a = String(n); L2 = '생식세포 종류 2ⁿ'; b = sciStr(v) + '가지'; L3 = '수정 조합 2ⁿ × 2ⁿ'; c = sciStr(v * v) + '가지'; }
    else if (m === 'cross') { const C_ = S.cr; L1 = '교차 횟수'; a = C_.crosses + '번'; L2 = '생식세포 종류'; b = C_.made ? crKinds() + '가지' : '—'; L3 = '새 조합이라고 표시한 것'; c = C_.made ? C_.pick.filter(Boolean).length + '개' : '—'; }
    else if (m === 'cont') { L1 = '정자·난자의 염색체 수'; a = S.ct.hypo ? '46개씩 (가정)' : '23개씩 (n)'; L2 = '수정란의 염색체 수'; b = S.ct.hypo ? '92개' : '46개 (2n)'; L3 = '3세대 후 (가정일 때)'; c = (S.ct.predOK || FREE()) ? '368개' : '? (예측해 보세요)'; }
    else if (m === 'studio') { const it = stItems().filter(Boolean).length; L1 = '넣은 장면'; a = S.st.seq.length + ' / ' + MAXSLOT; L2 = '필수 요소'; b = it + ' / 7'; L3 = '장면 순서'; c = S.st.seq.length === 0 ? '—' : stOrderOK() ? '맞아요' : '확인해요'; }
    else { L1 = '갤러리 모델'; a = (S.gal.shown[3] ? 4 : 3) + '개'; L2 = '내 모델'; b = S.gal.shown[3] ? '올림' : '아직'; L3 = '빠진 요소 찾기'; c = (S.gal.ans.B === 'crs' ? 1 : 0) + (S.gal.ans.C === 'fer' ? 1 : 0) + ' / 2'; }
    const keyS = [L1, a, L2, b, L3, c].join('|');
    if (keyS === rlast) return; rlast = keyS;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function autoFill() {
    S.cb.found = Array(8).fill(true); S.lg.calc = '8.4'; S.lg.calcOk = true; S.lg.seen23 = true; S.ct.pred = ['92', '184', '368']; $('#pd1').value = '92'; $('#pd2').value = '184'; $('#pd3').value = '368';
    if (!S.st.seq.length) { S.st.seq = ['rep', 'syn', 'crs', 'sp1', 'sp2', 'gam', 'fer']; S.st.posted = true; S.gal.shown[3] = true; S.gal.t0 = S.clock - 5; }
    S.gal.ans = { B: 'crs', C: 'fer' };
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '염색체 조합', short: '염색체 조합', icon: '🎲', phase: '모형',
      intro: '<p class="si-q">❓ 탐구 질문: 형제자매는 같은 부모에게서 났는데 왜 서로 다를까? 생식세포 형성은 왜 꼭 필요할까?</p><p>🔗 <b>앞 차시에서</b> 감수 1분열 후기에 상동 염색체가 양극으로 분리되는 것을 배웠어요. 그런데 한 쌍에서 파랑(아버지)과 빨강(어머니) 중 어느 쪽이 어느 극으로 갈지는 <b>쌍마다 따로 무작위</b>예요.</p><p>2n = 6인 세포로 감수 분열을 반복 실행해 생식세포의 염색체 <b>조합</b>을 모으고, 쌍의 수 n에 따라 종류가 얼마나 늘어나는지 계산해 봐요.</p>',
      features: ['combo', 'log'],
      setup() { setMode('combo'); },
      recap: '상동 염색체 n쌍이 무작위로 분리되면 생식세포의 염색체 조합은 2ⁿ가지예요. (교차 제외) 사람은 n = 23이라 약 840만 가지예요.',
      summary: '<ul><li>감수 1분열에서 상동 염색체는 쌍마다 <b>무작위</b>로 양극으로 가요. 상동 염색체 n쌍이면 생식세포 종류는 <b>2ⁿ</b>가지(교차 제외).</li><li>2n = 6(n = 3)이면 2³ = <b>8가지</b>, 수정 때는 8 × 8 = 64가지.</li><li>사람은 n = 23 → 2²³ ≈ <b>8.4 × 10⁶</b>가지(약 840만). 수정 조합은 약 7 × 10¹³가지(약 70조)라서 형제도 서로 달라요.</li></ul>',
      missions: [
        {
          id: 'collect', title: '8가지 조합 모으기',
          goal: '🎲 <b>감수 분열 실행!</b>을 반복해서 만들어지는 생식세포 조합을 표에 모으세요. <b>8가지</b>를 모두 모으면 성공이에요.',
          hint: '한 번 실행하면 서로 짝이 되는 2가지가 나와요. 같은 조합이 자꾸 나오면 ⏩ 10번 한꺼번에 실행을 써 보세요.',
          setup() { setMode('combo'); S.cb.found = Array(8).fill(false); S.cb.runs = 0; S.cb.last = null; S.cb.lastNew = []; updateCtl(); },
          check: () => foundCount() === 8, hold: 0.6,
          status: () => '모은 조합 ' + foundCount() + ' / 8 &nbsp; 실행 ' + S.cb.runs + '번',
          explain: '3쌍의 상동 염색체는 각각 파랑·빨강 둘 중 하나가 한 생식세포로 가요. 2 × 2 × 2 = <b>8가지</b>예요. 한 번의 감수 분열에서는 서로 짝이 되는 2가지(각각 2개씩)만 만들어지고, 반복할수록 여러 조합이 나와요.',
        },
        {
          id: 'calc', title: '2ⁿ 계산하기',
          goal: '슬라이더를 <b>n = 23</b>(사람)으로 맞추고, 생식세포 종류 2²³ ≈ □ × 10⁶ 가지에서 <b>□</b>를 소수 첫째 자리까지 쓰세요.',
          hint: '2²³ = 8,388,608이에요. 10⁶로 나누면 8.388…이고, 소수 첫째 자리까지 쓰면 8.4예요.',
          setup() { setMode('log'); S.lg.seen23 = false; S.lg.tn = 3; updateCtl(); },
          check: () => S.lg.seen23 && S.lg.calcOk, hold: 0.4,
          status: () => mark(S.lg.seen23) + ' n = 23 확인 &nbsp; ' + mark(S.lg.calcOk) + ' 값 입력',
          explain: '염색체 쌍이 1쌍 늘 때마다 종류가 <b>2배</b>가 돼요. 2²³ = 8,388,608 ≈ <b>8.4 × 10⁶</b>가지(약 840만)예요. 한 사람이 만들 수 있는 정자의 염색체 조합만 이만큼 많아요.',
        },
        {
          type: 'quiz', title: 'n = 4일 때 생식세포 종류',
          goal: '상동 염색체가 <b>4쌍</b>(2n = 8)인 생물이 만들 수 있는 생식세포의 염색체 조합은 모두 몇 가지일까요? (교차는 없다고 해요)',
          setup() { setMode('log'); },
          choices: ['8가지', '4가지', '32가지', '16가지'],
          answer: 3,
          feedback: ['8가지는 3쌍일 때예요. 쌍이 하나 늘면 2배가 돼요.', '4 = 2² 이에요. 쌍이 4개이면 2를 4번 곱해요.', '32가지는 5쌍일 때예요.', ''],
          explain: '2ⁿ에 n = 4를 넣으면 2⁴ = <b>16가지</b>예요. (2 × 2 × 2 × 2)',
        },
      ],
    },
    {
      title: '교차', short: '교차', icon: '✂️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 상동 염색체가 무작위로 나뉘어 2ⁿ가지가 만들어졌어요. 하지만 이때 파랑·빨강 염색체 <b>자체</b>는 그대로예요.</div><p>감수 1분열 전기에 2가 염색체를 이룬 상동 염색체는 서로 <b>DNA 조각을 바꿀</b> 수 있어요. 이것이 <b>교차</b>예요. 한 염색체에 아버지 쪽 유전자와 어머니 쪽 유전자가 섞여 새로운 조합이 생겨요.</p>',
      features: ['cross'],
      setup() { setMode('cross'); },
      recap: '교차가 일어나면 한 염색체 안에서 부계·모계 유전자가 섞인 새 조합(예: A b, a B)이 만들어져요. 염색체 수와 DNA 양은 변하지 않아요.',
      summary: '<ul><li><b>교차</b>: 감수 1분열 전기의 2가 염색체에서 상동 염색체의 염색 분체끼리 DNA 일부를 교환하는 일.</li><li>A B / a b → 교차 → <b>A b, a B</b> 같은 새 조합이 생겨요. 교차가 없으면 생식세포는 AB, ab 2가지뿐이에요.</li><li>교차가 일어나도 염색체 수와 DNA 양은 그대로예요.</li></ul>',
      missions: [
        {
          id: 'cross', title: '교차 일으키기',
          goal: '파랑 염색 분체 <b>하나</b>와 빨강 염색 분체 <b>하나</b>를 차례로 눌러 교차를 일으킨 뒤, <b>▶ 생식세포 만들기</b>를 눌러요.',
          hint: '파랑 염색 분체 아무거나 하나를 누르고, 이어서 빨강 염색 분체 하나를 눌러요. 두 염색 분체의 아래쪽 조각이 서로 바뀌어요.',
          setup() { setMode('cross'); resetCross(); S.crAns = false; updateCtl(); },
          check: () => S.cr.crosses >= 1 && S.cr.made, hold: 0.6,
          status: () => mark(S.cr.crosses >= 1) + ' 교차 일으키기 &nbsp; ' + mark(S.cr.made) + ' 생식세포 만들기',
          explain: '교차는 서로 다른 상동 염색체의 염색 분체(<b>비자매 염색 분체</b>)끼리 일어나요. 유전자 A와 B 사이에서 아래쪽 조각이 바뀌면, 한 염색 분체가 위는 아버지, 아래는 어머니 유전자를 갖게 돼요.',
        },
        {
          id: 'newc', title: '새 조합 찾기', manual: true,
          goal: '만들어진 생식세포 4개 중 아버지·어머니 유전자가 섞인 <b>새 조합</b>을 모두 눌러 표시하고 확인하세요.',
          hint: '처음 염색체는 파랑 A B, 빨강 a b였어요. 이 두 조합이 아닌 것(A b 또는 a B)이 새 조합이에요.',
          setup() { setMode('cross'); S.crAns = false; updateCtl(); },
          check() {
            const C_ = S.cr;
            if (!C_.made) return '먼저 ▶ 생식세포 만들기를 눌러 생식세포 4개를 만들어요.';
            const need = [0, 1, 2, 3].filter(isRecomb), picked = [0, 1, 2, 3].filter((i) => C_.pick[i]);
            if (!picked.length) return '생식세포를 눌러 ‘새 조합’이라고 생각하는 것을 표시해 주세요.';
            if (!need.length) return '교차가 일어나지 않아 새 조합이 없어요. ↺ 되돌리기 후 교차를 일으켜 보세요.';
            const extra = picked.filter((i) => need.indexOf(i) < 0), miss = need.filter((i) => picked.indexOf(i) < 0);
            if (extra.length) return '표시한 것 중에 원래 조합(AB 또는 ab)이 들어 있어요.';
            if (miss.length) return '새 조합이 더 있어요. (' + miss.length + '개)';
            S.crAns = true; return true;
          },
          explain: '교차가 한 번 일어나면 생식세포 4개의 조합은 <b>AB, Ab, aB, ab</b>예요. 이 중 <b>Ab, aB</b>가 교차로 새로 생긴 조합이에요. 교차가 없으면 AB, ab만 나와 종류가 2가지뿐이에요.',
        },
        {
          type: 'quiz', title: '교차와 염색체 수·DNA 양',
          goal: '교차가 일어난 뒤에도 염색체 수와 DNA 양은 어떻게 될까요?',
          setup() { setMode('cross'); },
          choices: ['염색체 수는 늘고 DNA 양은 그대로이다', '염색체 수는 그대로이고 DNA 양은 줄어든다', '염색체 수와 DNA 양 모두 그대로이고 유전자 조합만 달라진다', '염색체 수와 DNA 양이 모두 늘어난다'],
          answer: 2,
          feedback: ['교차는 조각을 맞바꾸는 것이라 염색체가 새로 생기지 않아요.', '교차로 DNA가 없어지지 않고 같은 길이의 조각을 바꿔 가져요.', '', '교차로 DNA가 새로 만들어지지는 않아요.'],
          explain: '교차는 같은 길이의 DNA 조각을 서로 <b>바꾸는</b> 일이라 염색체 수도 DNA 양도 그대로예요. 달라지는 것은 한 염색체 위의 <b>유전자 조합</b>이에요.',
        },
      ],
    },
    {
      title: '연속성: 수정과 염색체 수', short: '연속성', icon: '🔗', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 감수 분열이 염색체 조합(2ⁿ)과 교차로 다양성을 만든다는 것을 알았어요.</div><p>이제 생식세포가 감수 분열로 만들어지는 또 하나의 중요한 이유, <b>연속성</b>을 살펴봐요. 정자 n과 난자 n이 만나 수정란 2n이 되는 과정을 보고, 만약 생식세포를 체세포분열로 만든다면 세대마다 염색체 수가 어떻게 되는지 예측해 봐요.</p>',
      features: ['cont'],
      setup() { setMode('cont'); },
      recap: '감수 분열로 만든 정자(n)와 난자(n)가 수정되어 2n이 되므로 세대마다 염색체 수가 일정해요. 체세포분열로 만들면 세대마다 2배가 돼요.',
      summary: '<ul><li>정자 n(23) + 난자 n(23) → 수정란 <b>2n(46)</b>. 세대가 바뀌어도 염색체 수가 일정해요(<b>연속성</b>).</li><li>가정: 생식세포를 체세포분열로 만들면 46 → 92 → 184 → 368로 세대마다 2배가 돼요.</li><li>수정 때 정자와 난자가 무작위로 만나요: 2n = 6이면 8 × 8 = 64가지, 사람은 약 7 × 10¹³가지(약 70조).</li></ul>',
      missions: [
        {
          id: 'pred', title: '세대별 염색체 수 예측',
          goal: '<b>▶ 수정시키기</b>를 실제(감수 분열)와 가정(체세포분열) 두 가지로 모두 해 본 뒤, 가정에서 <b>1·2·3세대</b>의 염색체 수를 예측해 쓰세요.',
          hint: '1세대 수정란 = 46 + 46 = 92개예요. 그 사람이 또 같은 방식으로 생식세포를 만들면 다시 2배가 돼요.',
          setup() { setMode('cont'); S.ui.pred = true; resetFert(); S.ct.ran = { real: false, hypo: false }; updateCtl(); },
          check: () => S.ct.predOK && S.ct.ran.real && S.ct.ran.hypo, hold: 0.5,
          status: () => mark(S.ct.ran.real) + ' 실제 수정 &nbsp; ' + mark(S.ct.ran.hypo) + ' 가정 수정 &nbsp; ' + mark(S.ct.predOK) + ' 예측 (' + [0, 1, 2].filter(predRight).length + ' / 3)',
          explain: '가정에서는 생식세포도 46개(2n)라서 수정란은 46 + 46 = <b>92</b>개, 다음 세대는 <b>184</b>개, 그다음은 <b>368</b>개예요. 실제로는 감수 분열로 정자·난자의 염색체가 절반(23개)이라 수정란은 늘 <b>46개</b>예요.',
        },
        {
          type: 'quiz', title: '감수 분열이 꼭 필요한 까닭',
          goal: '생식세포가 <b>감수 분열</b>로 만들어져야 하는 까닭으로 가장 알맞은 것은?',
          setup() { setMode('cont'); S.ui.pred = false; updateCtl(); },
          choices: ['생식세포를 더 많이 만들기 위해서이다', '부모와 완전히 똑같은 자손을 만들기 위해서이다', '염색체 수를 절반(n)으로 줄여 수정 뒤에도 염색체 수(2n)가 일정하게 유지되게 하기 위해서이다', '수정란의 DNA 양을 늘리기 위해서이다'],
          answer: 2,
          feedback: ['감수 분열은 오히려 한 번 분열한 뒤 한 번 더 나누는 과정이고, 핵심은 염색체 수를 줄이는 것이에요.', '감수 분열은 염색체 조합과 교차로 서로 다른 자손을 만들어요.', '', '수정란의 DNA 양이 늘어나는 것이 목적이 아니에요. 염색체 수를 일정하게 유지하는 것이 중요해요.'],
          explain: '생식세포의 염색체 수가 n으로 줄어야, 두 생식세포가 만나 수정란이 되었을 때 <b>2n</b>이 돼요. 이렇게 세대마다 염색체 수가 일정하게 이어지는 것이 <b>생명의 연속성</b>이고, 염색체 조합·교차·수정은 <b>다양성</b>을 만들어요.',
        },
      ],
    },
    {
      title: '모델 만들기', short: '모델 만들기', icon: '🛠️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계들에서</b> 생식세포 형성이 염색체 조합·교차로 <b>다양성</b>을, 수정으로 염색체 수 유지(<b>연속성</b>)를 만든다는 것을 알았어요.</div><p>이제 <b>모델 스튜디오</b>의 장면 도구로 생식세포 형성 과정 모델을 직접 만들어요. 모델은 2n = 4(파랑: 아버지, 빨강: 어머니)로 만들고, <b>필수 요소 7개</b>를 모두 넣어요: 복제, 2가 염색체 형성, 교차, 상동 염색체 분리, 염색 분체 분리, 생식세포 4개의 염색체 수 표시, 수정으로 2n 회복. 완성하면 모둠 갤러리에 올려 다른 모델과 비교해요.</p>',
      features: ['studio', 'gallery'],
      setup() { setMode('studio'); },
      recap: '생식세포 형성 모델에는 복제, 2가 염색체 형성, 교차, 상동 염색체 분리, 염색 분체 분리, 생식세포의 n 표시, 수정으로 2n 회복이 들어가야 해요.',
      summary: '<ul><li>모델의 필수 요소 7개: <b>복제 → 2가 염색체 형성 → 교차 → 상동 염색체 분리 → 염색 분체 분리 → 생식세포 4개(염색체 수 n 표시) → 수정(2n 회복)</b>.</li><li>색(파랑·빨강 등)이나 이름표 표기 방식은 달라도 필수 요소가 모두 들어 있으면 좋은 모델이에요.</li><li>모델을 점검할 때는 빠진 요소와 순서, 염색체 수 표시(n, 2n)를 확인해요.</li></ul>',
      missions: [
        {
          id: 'studio', title: '생식세포 형성 모델 완성하기',
          goal: '장면 도구로 모델을 만들어 <b>필수 요소 7개</b>를 순서대로 넣고, <b>📤 갤러리에 올리기</b>를 누르세요.',
          hint: '순서는 복제 → 2가 염색체 → 교차 → 상동 분리 → 염색 분체 분리 → 생식세포 4개 → 수정이에요. ‘염색체 수 표시’를 켜야 생식세포의 n 표시가 인정돼요. ❓ 장면은 쓰면 안 돼요.',
          setup() { setMode('studio'); S.st.posted = false; updateCtl(); },
          check: () => S.st.posted && stOK(), hold: 0.5,
          status: () => '필수 요소 ' + stItems().filter(Boolean).length + ' / 7 &nbsp; ' + mark(stOrderOK() && stBad() === 0 && S.st.seq.length > 0) + ' 순서·장면 &nbsp; ' + mark(S.st.posted) + ' 올림',
          explain: '완성한 모델에는 <b>복제 → 2가 염색체 형성 → 교차 → 상동 염색체 분리 → 염색 분체 분리 → 생식세포 4개(n) → 수정(2n)</b>이 모두 들어 있어요. 생식세포의 염색체 수를 n으로, 수정란은 2n으로 표시하면 연속성이 드러나요.',
        },
        {
          id: 'gallery', title: '갤러리에서 빠진 요소 찾기', manual: true,
          goal: '갤러리를 눌러 모둠 모델들을 비교하고, <b>모둠 B와 모둠 C</b>에서 각각 빠진 필수 요소를 골라 보세요.',
          hint: '각 모델 카드 아래의 ‘필수 요소 n / 7’을 보고, 장면 목록에서 어떤 단계가 없는지 찾아요.',
          setup() { setMode('gallery'); S.ui.gal = true; updateCtl(); },
          check() {
            const a = S.gal.ans;
            if (!a.B || !a.C) return '모둠 B와 C 모두 빠진 요소를 골라 주세요.';
            if (a.B !== 'crs') return '모둠 B: 장면 목록을 다시 보세요. 어느 단계가 없나요?';
            if (a.C !== 'fer') return '모둠 C: 마지막 장면까지 확인해 보세요.';
            return true;
          },
          explain: '모둠 B는 <b>교차</b> 장면이, 모둠 C는 <b>수정(2n 회복)</b> 장면이 빠져 있어요. 모둠 A는 색과 이름표 표기만 다를 뿐 필수 요소 7개가 모두 들어 있어요.',
        },
        {
          type: 'quiz', title: '모델 고치기',
          goal: '모둠 D의 모델은 복제 → 2가 염색체 → 교차 → 상동 분리 → 염색 분체 분리 → 생식세포 4개(각각 <b>2n = 4</b>로 표시) → 수정 순서예요. 이 모델을 고치는 방법으로 알맞은 것은?',
          setup() { setMode('gallery'); S.ui.gal = false; updateCtl(); },
          choices: ['교차 장면을 지운다', '수정 장면을 맨 앞으로 옮긴다', '복제 장면을 생식세포 뒤로 옮긴다', '생식세포 4개의 염색체 수 표시를 n = 2로 고친다'],
          answer: 3,
          feedback: ['교차는 필수 요소예요. 지우면 다양성이 줄어요.', '수정은 생식세포가 만들어진 다음에 일어나요.', '복제는 분열이 시작되기 전에 먼저 일어나요.', ''],
          explain: '감수 분열로 만든 생식세포의 염색체 수는 <b>n</b>(여기서는 2)이에요. 2n으로 표시하면 수정 뒤 염색체 수가 늘어나는 것처럼 보여서 연속성을 설명할 수 없어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-gamete-diversity', mount: '#game', badge: '생식세포 탐험가', homeHref: '../../index.html#hb',
    featureLabels: { combo: '🎲 염색체 조합 모으기', log: '📈 2ⁿ 로그 그래프', cross: '✂️ 교차 도구', cont: '🔗 수정과 세대별 염색체 수', studio: '🛠️ 모델 스튜디오', gallery: '🖼️ 모둠 갤러리' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setMode('combo');
  let lastFree = false, lastMode = '', lastLv = -1, lastCrAns = false;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    if (game && game.level !== lastLv) { lastLv = game.level; updateCtl(); }
    view.apply();
    stepCombo(dt);
    ctx.clearRect(0, 0, VW, VH);
    bgFill('#eef4f2', '#e3ece8');
    switch (S.mode) {
      case 'combo': drawComboScene(dt, t); drawComboResult(dt, t); drawComboTable(dt, t); break;
      case 'log': drawLog(dt, t); break;
      case 'cross': drawCross(dt, t); break;
      case 'cont': drawCont(dt, t); break;
      case 'studio': drawStudio(dt, t); break;
      default: drawGallery(dt, t);
    }
    parts.update(dt); parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(241,246,243,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : approach(S.fade, 0, dt, 9); }
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm && cm.id === 'collect' && !S.cbBurst) { S.cbBurst = true; parts.burst(TB.x + TB.w / 2, TB.y + TB.h / 2, { count: 30, colors: ['#16a34a', '#fde047', '#fff', '#2563eb'], speed: 220, size: 4, life: 1 }); }
    if (game && game.phase !== 'success') S.cbBurst = false;
    if (S.crAns !== lastCrAns) { lastCrAns = S.crAns; }
    if (S.ct.f && S.ct.f && S.mode === 'cont' && S.ct.done) updateCtlOnce();
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });
  let _once = false;
  function updateCtlOnce() { if (_once) return; _once = true; updateCtl(); setTimeout(() => { _once = false; }, 600); }

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, TOKENS, GALLERY, stItems, stOK, stAdd, stPost, makeGametes, doCross, comboOf, isRecomb, gameteXY, gameteR, cyTop, CWID, CLEN, SC, TB, STL, slotRectS, runQuick, runMeiosis, foundCount, updateCtl, GEN, forceBits(b) { rngNext = b; },
    stepAll(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) stepCombo(0.02); },
  };
})();
