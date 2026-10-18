/* =========================================================
   물리학 Ⅰ. 힘과 에너지 - 작용 반작용과 운동량 보존 (단원 4차시)
   성취기준 [12물리01-03] 작용과 반작용 관계와 운동량 보존 법칙을 알고, 스포츠, 교통수단, 발사체 등에 적용할 수 있다.
   ① 관찰: 작용 반작용 (힘 센서 두 개, 질량이 다른 두 수레)
   ② 탐구: 일차원 충돌 (합체/튕김, 충돌 전후 총 운동량)
   ③ 모형: 반동과 발사 (스케이트, 총, 우주 공구, 로켓)
   ④ 적용: 스포츠·교통·발사체 (운동량 보존 식 세우기, 뉴턴의 요람)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 690 : 600, MH = PHONE ? 300 : 290;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
  const sg = (n, d) => { const s = (Math.round(n * Math.pow(10, d == null ? 1 : d)) / Math.pow(10, d == null ? 1 : d)); return (s > 0 ? '+' : s < 0 ? '−' : '') + Math.abs(s).toFixed(d == null ? 1 : d); };

  /* 장면에서 쓰는 값 (글자로 보이는 숫자는 모두 여기서 만들어요) */
  const GUN = { M: 4.0, m: 0.010, v: 400 };            // 총 질량(kg), 탄환 질량(kg), 탄환 속력(m/s)
  const SPACE = { M: 80, m: 2, v: 3 };                 // 우주인, 공구, 공구 속력
  const ROCKET = { mdot: 50, u: 2000 };                // 분사 질량(kg/s), 가스 속력(m/s)
  const ROCKET_F = ROCKET.mdot * ROCKET.u;             // 추력 (N)
  const SKATE = { m1: 60, u: 2.5 };                    // 왼쪽 선수 질량, 서로 밀어 멀어지는 상대 속력
  const CAR = { mA: 1000, vA: 15, mB: 2000, vB: -15 };
  const SWIM = { M: 120, m: 60, v: 2.0 };              // 출발대 질량, 선수 질량, 선수 속력
  const BALL = { m: 0.17, v: 2.0 };                  // 당구공 질량(kg), A의 처음 속력
  const CANNON = { M: 1000, m: 10, v: 200 };
  const sci5 = (n) => { const e = Math.floor(Math.log10(Math.abs(n))); return (n / Math.pow(10, e)).toFixed(1) + ' × 10' + String(e).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]); };

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = ch.trim() === '' ? '' : ch; } else line = t;
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, 'left', weight || 700)); return ls.length * lh;
  }
  function bgMain() { const g = ctx.createLinearGradient(0, 0, 0, MH); g.addColorStop(0, '#e6eefb'); g.addColorStop(1, '#f7faff'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, MH); }
  function beginMain() { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, MH); ctx.clip(); }
  function endMain() { ctx.restore(); }
  function bgData() { ctx.fillStyle = '#f1f5fb'; ctx.fillRect(0, MH, VW, VH - MH); ctx.fillStyle = '#d3dcea'; ctx.fillRect(0, MH, VW, 2); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  const num = (s) => parseFloat(String(s).replace(/−/g, '-').replace(/,/g, '.').trim());

  /* ---------- 데이터 영역 배치 ---------- */
  const RL = PHONE ? { x: 10, y: MH + 8, w: VW - 20, h: 156 } : { x: 12, y: MH + 10, w: 372, h: VH - MH - 20 };
  const RR = PHONE ? { x: 10, y: MH + 172, w: VW - 20, h: VH - MH - 182 } : { x: 394, y: MH + 10, w: VW - 406, h: VH - MH - 20 };

  /* 운동량 막대: items [{label, color, before, now}] 가운데 0 기준, 왼쪽 −, 오른쪽 + */
  function drawPBars(r, title, items, pmax, unit) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 12, r.y + 22, title, PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const labW = 40, x0 = r.x + labW + 14, x1 = r.x + r.w - 14, cx = (x0 + x1) / 2, half = (x1 - x0) / 2 - 4;
    const top = r.y + 36, rh = Math.min(PHONE ? 44 : 62, (r.h - 46 - 14) / items.length);
    const k = half / pmax;
    ctx.strokeStyle = '#8b97ab'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, top - 4); ctx.lineTo(cx, top + rh * items.length + 2); ctx.stroke();
    T(x0 - 2, r.y + r.h - 6, '− 왼쪽', 12, '#5a6679', 'left', 800); T(x1 + 2, r.y + r.h - 6, '오른쪽 +', 12, '#5a6679', 'right', 800);
    T(cx, r.y + r.h - 6, '0', 12, '#5a6679', 'center', 800);
    items.forEach((it, i) => {
      const y = top + i * rh;
      T(r.x + 12, y + rh / 2 + 4, it.label, 13, it.color, 'left', 800);
      const bar = (v, yy, hh, alpha, outline) => {
        const w = clamp(v * k, -half, half);
        if (Math.abs(w) < 0.5) return;
        D.roundRect(Math.min(cx, cx + w), yy, Math.abs(w), hh, 3);
        if (outline) { ctx.strokeStyle = it.color; ctx.lineWidth = 1.6; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.fillStyle = C.rgba(it.color, alpha); ctx.fill(); }
      };
      const hb = Math.round(rh * 0.2), hn = Math.round(rh * 0.36);
      if (it.before != null) bar(it.before, y + rh * 0.12, hb, 1, true);
      bar(it.now, y + (it.before != null ? rh * 0.12 + hb + 3 : (rh - hn) / 2), it.before != null ? hn : Math.round(rh * 0.42), 0.9, false);
      const txt = Math.abs(it.now) >= 100 ? sg(it.now, 0) : sg(it.now, 2);
      const w = clamp(it.now * k, -half, half), ty = y + rh / 2 + 6;
      if (Math.abs(w) > half * 0.62) T(cx + w - Math.sign(w) * 6, ty, txt, 12.5, '#fff', w >= 0 ? 'right' : 'left', 800);
      else if (w >= 0) T(cx + w + 4, ty, txt, 12.5, '#26324a', 'left', 800); else T(cx + w - 4, ty, txt, 12.5, '#26324a', 'right', 800);
    });
    T(r.x + r.w - 12, r.y + 22, unit || 'kg·m/s', 12, '#5a6679', 'right', 800);
  }

  /* 표: cols [{h, w(비율), get(row), color?}] */
  function drawTable(r, title, cols, rows, nmax, emptyMsg) {
    panel(r.x, r.y, r.w, r.h, 14);
    T(r.x + 12, r.y + 22, title, PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    const tw = r.w - 16, hy = r.y + 34, rh = Math.min(30, (r.h - 66) / nmax);
    const tot = cols.reduce((s, c) => s + c.w, 0);
    let xx = r.x + 8; const cxs = [];
    cols.forEach((c) => { const cw = tw * c.w / tot; cxs.push([xx, cw]); xx += cw; });
    cols.forEach((c, i) => { const ls = wrap(c.h, cxs[i][1] - 2, 11.5, 800); ls.forEach((l, j) => T(cxs[i][0] + cxs[i][1] / 2, hy + 10 + j * 13, l, 11.5, '#5a6679', 'center', 800)); });
    const shown = rows.slice(-nmax);
    const y0 = hy + 32;
    shown.forEach((row, i) => {
      const yy = y0 + i * rh;
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(56,103,244,.05)'; ctx.fillRect(r.x + 8, yy, tw, rh); }
      cols.forEach((c, j) => T(cxs[j][0] + cxs[j][1] / 2, yy + rh / 2 + 5, String(c.get(row)), PHONE ? 12.5 : 13.5, c.color || '#26324a', 'center', 800));
    });
    if (!shown.length) T(r.x + r.w / 2, y0 + 30, emptyMsg || '아직 기록이 없어요', 13.5, '#98a2b3', 'center', 700);
  }

  /* ---------- 상태 ---------- */
  const S = { mode: 'pair', clock: 0, fade: 0, pr: null, co: null, rc: null, ap: null, showCls: false, cls: {}, clsOK: {}, showPIn: false, showVIn: false };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { pair: '🤝 작용 반작용', collide: '🎱 일차원 충돌', recoil: '🚀 반동과 발사', apply: '🏟️ 적용' };
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    $('#tbLabel').textContent = MODE_LABEL[mode];
    updateCtl();
  }

  /* =====================================================
     ① 작용 반작용: 줄로 연결된 두 수레
     ===================================================== */
  const PL = 8, PFS = [4, 6, 8], PX0 = 30, PPM = (VW - 60) / PL, PGY = MH - 70, PSEP_END = 2.2;
  function resetPair(keep) {
    const prev = S.pr;
    S.pr = { mA: prev ? prev.mA : 1, mB: prev ? prev.mB : 3, F: prev ? prev.F : 6, st: 'ready', xA: 1.0, xB: 7.0, vA: 0, vB: 0, rows: keep && prev ? prev.rows : [], sens: 0 };
    updateCtl();
  }
  function pairGo() {
    const p = S.pr; if (p.st === 'pull') return;
    const rows = p.rows; const { mA, mB, F } = p;
    S.pr = { mA, mB, F, st: 'pull', xA: 1.0, xB: 7.0, vA: 0, vB: 0, rows, sens: F };
    Sound.click(); parts.clear(); updateCtl();
  }
  function stepPair(dt) {
    const p = S.pr; if (p.st !== 'pull') return;
    let left = dt;
    while (left > 1e-9 && p.st === 'pull') {
      const h = Math.min(left, 0.005); left -= h;
      p.vA += p.F / p.mA * h; p.vB -= p.F / p.mB * h;
      p.xA += p.vA * h; p.xB += p.vB * h;
      if (p.xB - p.xA <= PSEP_END) {
        p.xB = p.xA + PSEP_END; p.st = 'done';
        p.rows.push({ mA: p.mA, mB: p.mB, F: p.F, fA: p.F, fB: p.F, aA: p.F / p.mA, aB: p.F / p.mB });
        if (p.rows.length > 12) p.rows.shift();
        Sound.success(); parts.burst(PX0 + (p.xA + p.xB) / 2 * PPM, PGY - 40, { count: 14, speed: 120, size: 3, colors: ['#ffb400', '#3867f4', '#f2873a'], gravity: 160 });
        updateCtl();
      }
    }
  }

  function rail(x0, x1, gy, ppm, len, tickEvery, label) {
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(x0 - 10, gy, x1 - x0 + 20, 12);
    ctx.fillStyle = '#8a98ae'; ctx.fillRect(x0 - 10, gy, x1 - x0 + 20, 3);
    ctx.fillStyle = '#7b889e'; ctx.fillRect(x0 - 10, gy + 12, 8, 14); ctx.fillRect(x1 + 2, gy + 12, 8, 14);
    if (tickEvery) for (let m = 0; m <= len + 1e-6; m += tickEvery) {
      const x = x0 + m * ppm; ctx.fillStyle = '#6b778c'; ctx.fillRect(x - 0.75, gy + 12, 1.5, 6);
      if (m % (tickEvery * 2) === 0 || len <= 8) T(x, gy + 31, String(m), 11.5, '#5a6679', 'center', 700);
    }
    if (label) T(x1 + 8, gy + 31, label, 11.5, '#5a6679', 'right', 700);
  }
  /* 질량 m(kg)에 따라 짐 높이가 달라지는 수레 */
  function drawLoadCart(cx, gy, wpx, mass, color, name, o) {
    o = o || {};
    const bh = PHONE ? 20 : 28, lh = (PHONE ? 6 : 10) + (PHONE ? 8 : 12.5) * mass, y = gy - bh - 6;
    D.shadow(() => { D.roundRect(cx - wpx / 2, y, wpx, bh, 6); ctx.fillStyle = color; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(cx - wpx / 2 + 4, y + 3, wpx - 8, 3);
    [-0.3, 0.3].forEach((k) => { const wx = cx + k * wpx; ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(wx, gy - 3, 6, 0, TAU); ctx.fill(); ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.arc(wx, gy - 3, 2.2, 0, TAU); ctx.fill(); });
    const lw = wpx * 0.72;
    D.shadow(() => { D.roundRect(cx - lw / 2, y - lh + 2, lw, lh, 4); ctx.fillStyle = C.shade(color, -0.22); ctx.fill(); }, { blur: 4, y: 2 });
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - lw / 2 + 2, y - lh + 4, lw - 4, lh - 4);
    T(cx, y - lh / 2 + 6, name, PHONE ? 12 : 14, '#fff', 'center', 800);
    return { top: y - lh, cy: y };
  }
  function tagPill(x, y, text, color) { D.label(x, y, text, { bg: color, size: PHONE ? 12 : 13 }); }

  function drawPair(dt) {
    const p = S.pr;
    bgData(); beginMain(); bgMain();
    rail(PX0, PX0 + PL * PPM, PGY, PPM, PL, 1, '미터(m)');
    T(16, PHONE ? 24 : 30, '🤝 줄로 연결된 두 수레 · 서로 당겨요', PHONE ? 15 : 18, '#26324a', 'left', 800);
    const wpx = (PHONE ? 1.0 : 1.3) * PPM, SB = PHONE ? 16 : 22;
    const ax = PX0 + p.xA * PPM, bx = PX0 + p.xB * PPM;
    // 줄: 감기는 줄 (A쪽 도르래에서 B 센서까지)
    const sa = ax + wpx / 2, sb = bx - wpx / 2, sy = PGY - (PHONE ? 22 : 30);
    const taut = p.st === 'pull' || p.st === 'done';
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sa + SB - 2, sy);
    if (taut) ctx.lineTo(sb - SB + 2, sy); else ctx.quadraticCurveTo((sa + sb) / 2, sy + 18, sb - SB + 2, sy);
    ctx.stroke();
    const cA = drawLoadCart(ax, PGY, wpx, p.mA, '#3867f4', 'A');
    const cB = drawLoadCart(bx, PGY, wpx, p.mB, '#f2873a', 'B');
    // 힘 센서 상자
    [sa, sb - SB].forEach((sx0) => {
      D.roundRect(sx0, sy - SB / 2, SB, SB, 4); ctx.fillStyle = '#1f2937'; ctx.fill();
      T(sx0 + SB / 2, sy + 4, 'N', 11, '#9ae6b4', 'center', 800);
    });
    // 힘 화살표 (두 힘은 크기가 같고 방향이 반대, 서로 다른 물체에 작용)
    const fl = p.F * (PHONE ? 6 : 9);
    if (taut) {
      D.arrow(sa + SB, sy - 26, sa + SB + fl, sy - 26, { color: '#3867f4', width: 5, label: 'A가 받는 힘 ' + f1(p.sens) + ' N', labelOffset: -18, labelSize: PHONE ? 12 : 13 });
      D.arrow(sb - SB, sy - 54, sb - SB - fl, sy - 54, { color: '#f2873a', width: 5, label: 'B가 받는 힘 ' + f1(p.sens) + ' N', labelOffset: 18, labelSize: PHONE ? 12 : 13 });
    }
    tagPill(ax, PGY + 52, 'A ' + f1(p.mA) + ' kg', '#3867f4'); tagPill(bx, PGY + 52, 'B ' + f1(p.mB) + ' kg', '#f2873a');
    if (p.st === 'ready') T(VW / 2, PGY - (PHONE ? 140 : 160), '▶ 줄 당기기를 눌러 보세요', PHONE ? 14 : 16, '#5a6679', 'center', 800);
    if (p.st === 'done') D.label(VW / 2, PHONE ? 52 : 58, '줄이 다 감겼어요 · 측정 끝', { bg: '#26324a', size: 12.5 });
    parts.update(dt); parts.draw(ctx); endMain();
    // 데이터 영역
    const items = [
      { label: 'A', color: '#3867f4', before: 0, now: p.mA * p.vA },
      { label: 'B', color: '#f2873a', before: 0, now: p.mB * p.vB },
      { label: '합', color: '#14a058', before: 0, now: p.mA * p.vA + p.mB * p.vB },
    ];
    drawPBars(RL, '운동량 p = mv (처음엔 모두 0)', items, 12, 'kg·m/s');
    drawPairTable(RR, p);
  }
  function drawPairTable(r, p) {
    drawTable(r, '줄 당기기 기록', [
      { h: '실험', w: 0.8, get: (x) => '#' + (p.rows.indexOf(x) + 1) },
      { h: 'A 질량', w: 1, get: (x) => f1(x.mA) + ' kg' },
      { h: 'B 질량', w: 1, get: (x) => f1(x.mB) + ' kg' },
      { h: '센서 A', w: 1, get: (x) => f1(x.fA) + ' N', color: '#3867f4' },
      { h: '센서 B', w: 1, get: (x) => f1(x.fB) + ' N', color: '#c2410c' },
      { h: '가속도 A', w: 1.1, get: (x) => f2(x.aA) },
      { h: '가속도 B', w: 1.1, get: (x) => f2(x.aB) },
    ], p.rows, PHONE ? 4 : 5, '줄을 당기면 기록이 쌓여요');
    ctx.save(); T(r.x + r.w - 10, r.y + 22, '가속도 단위 m/s²', 11.5, '#5a6679', 'right', 800); ctx.restore();
  }

  /* =====================================================
     일차원 충돌 엔진 (② 수레 · ④ 자동차/당구공)
     ===================================================== */
  const CK = 200;          // 수레 범퍼 용수철 상수 (N/m)
  const SENSOR_ROUND = (v) => Math.round(v * 100) / 100;
  function makeCol(s) {
    const c = Object.assign({ st: 'ready', t: 0, hitT: 0, t2: 0, squash: 0, flash: 0, rec: null, T0: 1.0, TPOST: 1.0 }, s);
    c.D0 = (c.wA + c.wB) / 2; c.xc = c.len / 2;
    c.xAc = c.xc - c.D0 / 2; c.xBc = c.xc + c.D0 / 2;
    c.xA = c.xAc - c.vA * c.T0; c.xB = c.xBc - c.vB * c.T0;
    c.cvA = c.vA; c.cvB = c.vB;
    const M = c.mA + c.mB;
    if (c.type === 'stick') { c.v2A = c.v2B = (c.mA * c.vA + c.mB * c.vB) / M; }
    else { c.v2A = ((c.mA - c.mB) * c.vA + 2 * c.mB * c.vB) / M; c.v2B = ((c.mB - c.mA) * c.vB + 2 * c.mA * c.vA) / M; }
    c.willHit = c.vA > c.vB + 1e-9;
    return c;
  }
  function colGo(c) { if (c.st === 'ready' || c.st === 'done') { if (c.st === 'done') return false; c.st = 'approach'; return true; } return false; }
  function colRecord(c) {
    const vA2 = SENSOR_ROUND(c.v2A), vB2 = SENSOR_ROUND(c.v2B);
    const pb = c.mA * c.vA + c.mB * c.vB, pa = c.mA * vA2 + c.mB * vB2;
    const kb = 0.5 * c.mA * c.vA * c.vA + 0.5 * c.mB * c.vB * c.vB, ka = 0.5 * c.mA * vA2 * vA2 + 0.5 * c.mB * vB2 * vB2;
    c.rec = { type: c.type, mA: c.mA, vA: c.vA, mB: c.mB, vB: c.vB, vA2, vB2, pb, pa, kb, ka };
    if (c.onHit) c.onHit(c.rec);
  }
  function stepCol(c, dt) {
    if (c.st === 'ready' || c.st === 'done') return;
    c.squash = Math.max(0, c.squash - dt * 3.5); c.flash = Math.max(0, c.flash - dt * 3);
    let left = dt;
    while (left > 1e-9 && c.st !== 'done') {
      const h = Math.min(left, c.spring ? 0.0005 : 0.004); left -= h;
      if (c.st === 'approach') {
        const hh = Math.min(h, c.T0 - c.t);
        c.xA += c.cvA * hh; c.xB += c.cvB * hh; c.t += hh;
        if (c.t >= c.T0 - 1e-9) {
          c.xA = c.xAc; c.xB = c.xBc;
          if (!c.willHit) { c.st = 'after'; c.t2 = 0; c.joined = false; }
          else if (c.spring) { c.st = 'hit'; c.hitT = 0; c.flash = 1; Sound.tick(); }
          else {
            c.cvA = c.v2A; c.cvB = c.v2B; c.joined = c.type === 'stick'; c.squash = 1; c.flash = 1;
            colRecord(c); c.st = 'after'; c.t2 = 0; Sound.tick();
            if (c.onBurst) c.onBurst(c);
          }
        }
      } else if (c.st === 'hit') {
        const comp = c.D0 - (c.xB - c.xA), F = comp > 0 ? CK * comp : 0;
        c.cvA += -F / c.mA * h; c.cvB += F / c.mB * h;
        c.xA += c.cvA * h; c.xB += c.cvB * h; c.hitT += h;
        const comp2 = c.D0 - (c.xB - c.xA);
        if (c.hitT > 0.003 && comp2 <= 0 && c.cvB >= c.cvA) {
          c.cvA = c.v2A; c.cvB = c.v2B; c.xB = c.xA + c.D0; c.joined = false;
          colRecord(c); c.st = 'after'; c.t2 = 0;
          if (c.onBurst) c.onBurst(c);
        }
      } else if (c.st === 'after') {
        if (c.joined) {
          c.xA += c.cvA * h; c.xB = c.xA + c.D0;
          if (c.xA < c.wA / 2) { c.xA = c.wA / 2; c.xB = c.xA + c.D0; c.cvA = c.cvB = 0; }
          if (c.xB > c.len - c.wB / 2) { c.xB = c.len - c.wB / 2; c.xA = c.xB - c.D0; c.cvA = c.cvB = 0; }
        } else {
          c.xA += c.cvA * h; c.xB += c.cvB * h;
          if (c.xA < c.wA / 2) { c.xA = c.wA / 2; c.cvA = 0; }
          if (c.xA > c.len - c.wA / 2) { c.xA = c.len - c.wA / 2; c.cvA = 0; }
          if (c.xB > c.len - c.wB / 2) { c.xB = c.len - c.wB / 2; c.cvB = 0; }
          if (c.xB < c.wB / 2) { c.xB = c.wB / 2; c.cvB = 0; }
          if (c.xB - c.xA < c.D0 && c.cvB < c.cvA) { c.xB = c.xA + c.D0; }
        }
        c.t2 += h; if (c.t2 >= c.TPOST) c.st = 'done';
      }
    }
  }
  /* ---- 몸체 그리기 ---- */
  function drawCar(cx, gy, wpx, color, name, sq, facing) {
    const h = wpx * 0.34, y = gy - 10 - h, x0 = cx - wpx / 2, sc = 1 - sq * 0.07;
    ctx.save(); ctx.translate(cx, gy); ctx.scale(sc, 1); ctx.translate(-cx, -gy);
    D.shadow(() => {
      ctx.beginPath(); ctx.moveTo(x0, gy - 12); ctx.lineTo(x0, y + h * 0.5); ctx.quadraticCurveTo(x0 + 2, y + h * 0.38, x0 + wpx * 0.14, y + h * 0.38);
      ctx.lineTo(x0 + wpx * 0.28, y); ctx.lineTo(x0 + wpx * 0.72, y); ctx.lineTo(x0 + wpx * 0.86, y + h * 0.38);
      ctx.quadraticCurveTo(x0 + wpx - 2, y + h * 0.38, x0 + wpx, y + h * 0.5); ctx.lineTo(x0 + wpx, gy - 12); ctx.closePath();
      const g = ctx.createLinearGradient(0, y, 0, gy); g.addColorStop(0, C.shade(color, 0.2)); g.addColorStop(1, C.shade(color, -0.2)); ctx.fillStyle = g; ctx.fill();
    }, { blur: 6, y: 3 });
    ctx.fillStyle = 'rgba(214,236,252,.92)';
    ctx.beginPath(); ctx.moveTo(x0 + wpx * 0.31, y + h * 0.08); ctx.lineTo(x0 + wpx * 0.69, y + h * 0.08); ctx.lineTo(x0 + wpx * 0.8, y + h * 0.38); ctx.lineTo(x0 + wpx * 0.2, y + h * 0.38); ctx.closePath(); ctx.fill();
    [0.22, 0.78].forEach((k) => { D.sphere(x0 + wpx * k, gy - 6, wpx * 0.075, '#2b3140', { gloss: false }); });
    ctx.restore();
    T(cx, y + h * 0.78, name, PHONE ? 11.5 : 13.5, '#fff', 'center', 800);
  }
  function drawBall(cx, gy, d, color, name) {
    const r = d / 2;
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.beginPath(); ctx.ellipse(cx, gy - 1, r * 0.9, r * 0.22, 0, 0, TAU); ctx.fill();
    D.sphere(cx, gy - r - 2, r, color, { shadow: true });
    T(cx, gy - r + 2, name, PHONE ? 12 : 14, '#fff', 'center', 800);
  }
  function drawSpringZig(x1, x2, y, hgt, n) {
    ctx.strokeStyle = '#9aa5b8'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y);
    const len = x2 - x1;
    for (let i = 0; i < n; i++) { const xa = x1 + len * (i + 0.5) / n; ctx.lineTo(xa, y + (i % 2 ? hgt : -hgt)); }
    ctx.lineTo(x2, y); ctx.stroke();
  }
  /* 충돌 장면 그리기. g = {x0, ppm, gy, style, ak(화살표 px per m/s), colA, colB, nameA, nameB, ruler} */
  function drawColScene(c, g) {
    const X = (m) => g.x0 + m * g.ppm;
    const wA = c.wA * g.ppm, wB = c.wB * g.ppm;
    const sq = c.squash;
    if (g.style === 'cart') {
      const wiA = wA * 0.6, wiB = wB * 0.6, bL = wA * 0.2, bR = wB * 0.2;
      const ax = X(c.xA), bx = X(c.xB);
      const gap = (bx - wiB / 2) - (ax + wiA / 2);        // px
      const half = Math.min(gap / 2, Math.max(bL, bR));
      const yv = g.gy - (PHONE ? 30 : 40);
      const cA = drawLoadCart(ax, g.gy, wiA, c.mA, g.colA, g.nameA);
      const cB = drawLoadCart(bx, g.gy, wiB, c.mB, g.colB, g.nameB);
      const ay = g.gy - (PHONE ? 20 : 28) - 6 + (PHONE ? 10 : 14);
      if (c.type === 'bounce') {
        drawSpringZig(ax + wiA / 2, ax + wiA / 2 + half, ay, PHONE ? 5 : 7, 5);
        drawSpringZig(bx - wiB / 2 - half, bx - wiB / 2, ay, PHONE ? 5 : 7, 5);
        D.roundRect(ax + wiA / 2 + half - 2, ay - 8, 5, 16, 2); ctx.fillStyle = '#6b778c'; ctx.fill();
        D.roundRect(bx - wiB / 2 - half - 3, ay - 8, 5, 16, 2); ctx.fill();
      } else {
        const pw = Math.max(1, half);
        D.roundRect(ax + wiA / 2, ay - 8, pw, 16, 3); ctx.fillStyle = '#d98f5a'; ctx.fill(); ctx.strokeStyle = '#a8663a'; ctx.lineWidth = 1.5; ctx.stroke();
        D.roundRect(bx - wiB / 2 - pw, ay - 8, pw, 16, 3); ctx.fillStyle = '#d98f5a'; ctx.fill(); ctx.stroke();
      }
      g.topA = cA.top; g.topB = cB.top; g.cxA = ax; g.cxB = bx;
    } else if (g.style === 'car') {
      drawCar(X(c.xA), g.gy, wA, g.colA, g.nameA, sq); drawCar(X(c.xB), g.gy, wB, g.colB, g.nameB, sq);
      g.topA = g.topB = g.gy - wA * 0.34 - 14; g.cxA = X(c.xA); g.cxB = X(c.xB);
    } else {
      drawBall(X(c.xA), g.gy, wA, g.colA, g.nameA); drawBall(X(c.xB), g.gy, wB, g.colB, g.nameB);
      g.topA = g.topB = g.gy - wA - 8; g.cxA = X(c.xA); g.cxB = X(c.xB);
    }
    // 속도 화살표
    const arrow = (cx, top, v, color, nm) => {
      if (Math.abs(v) < 0.04) { T(cx, top - 14, nm + ' 0 m/s', PHONE ? 12 : 13, '#5a6679', 'center', 800); return; }
      const L = clamp(v * g.ak, -g.akMax, g.akMax), y = top - (PHONE ? 16 : 22);
      D.arrow(cx - L / 2, y, cx + L / 2, y, { color, width: 5, label: sg(v, 1) + ' m/s', labelOffset: -15, labelSize: PHONE ? 12 : 13 });
    };
    arrow(g.cxA, g.topA, c.cvA, '#14a058', g.nameA); arrow(g.cxB, g.topB, c.cvB, '#14a058', g.nameB);
  }

  /* ② 수레 충돌 */
  const CPPM = (VW - 60) / 10;
  function newColCart() {
    const o = S.co;
    const run = makeCol({ len: 10, mA: o.mA, vA: o.vA, mB: o.mB, vB: o.vB, type: o.type, spring: o.type === 'bounce', wA: 1.5, wB: 1.5 });
    run.onHit = (rec) => { o.rows.push(rec); if (o.rows.length > 12) o.rows.shift(); updateCtl(); };
    run.onBurst = (c) => { parts.burst(CX0 + c.xAc * CPPM + c.D0 / 2 * CPPM, CGY0 - 36, { count: 16, speed: 150, size: 3.2, colors: ['#ffb400', '#fff', '#ff8a3d'], gravity: 220 }); };
    o.run = run; updateCtl();
  }
  const CX0 = 30, CGY0 = MH - 70;
  function resetCol(keepRows) {
    const prev = S.co;
    S.co = { sel: 'A', mA: 1, vA: 2, mB: 1, vB: 0, type: 'stick', rows: keepRows && prev ? prev.rows : [], run: null };
    if (prev && keepRows) { S.co.mA = prev.mA; S.co.vA = prev.vA; S.co.mB = prev.mB; S.co.vB = prev.vB; S.co.type = prev.type; }
    newColCart();
  }
  function colSet(k, v) { const o = S.co; o[k] = v; parts.clear(); newColCart(); }
  function colRun() {
    const o = S.co; const r = o.run;
    if (!r.willHit) { showHint('A가 B보다 느려서 부딪히지 않아요. A의 속도를 B보다 크게 해 보세요.'); Sound.fail(); return false; }
    if (r.st === 'done') newColCart();
    if (o.run.st !== 'ready') return false;
    colGo(o.run); Sound.click(); updateCtl(); return true;
  }
  function colRows(rows) {
    return rows.map((r, i) => ({ i, r }));
  }
  const TYPE_NAME = { stick: '합체', bounce: '튕김' };
  function drawCollide(dt) {
    const o = S.co, c = o.run;
    bgData(); beginMain(); bgMain();
    rail(CX0, CX0 + 10 * CPPM, CGY0, CPPM, 10, 1, '미터(m)');
    T(16, PHONE ? 24 : 30, '🎱 마찰 없는 트랙 · ' + TYPE_NAME[o.type] + ' 충돌', PHONE ? 15 : 18, '#26324a', 'left', 800);
    const g = { x0: CX0, ppm: CPPM, gy: CGY0, style: 'cart', ak: PHONE ? 13 : 22, akMax: PHONE ? 60 : 100, colA: '#3867f4', colB: '#f2873a', nameA: 'A', nameB: 'B' };
    drawColScene(c, g);
    tagPill(g.cxA, CGY0 + 52, 'A ' + f1(o.mA) + ' kg', '#3867f4'); tagPill(g.cxB, CGY0 + 52, 'B ' + f1(o.mB) + ' kg', '#f2873a');
    if (!c.willHit) D.label(VW / 2, PHONE ? 52 : 58, '⚠ A가 B를 따라잡지 못해요 (충돌 없음)', { bg: '#c0392b', size: 13 });
    else if (c.st === 'ready') T(VW / 2, PHONE ? 56 : 62, '▶ 충돌 시키기를 눌러 보세요', PHONE ? 14 : 15, '#5a6679', 'center', 800);
    if (c.st === 'hit') D.label(VW - (PHONE ? 70 : 90), PHONE ? 52 : 58, '🐌 충돌 순간 슬로모션', { bg: '#26324a', size: 12.5 });
    parts.update(dt); parts.draw(ctx); endMain();
    // 운동량 막대 (실시간)
    const pA = c.mA * c.cvA, pB = c.mB * c.cvB;
    const pbA = c.mA * c.vA, pbB = c.mB * c.vB;
    const pm = Math.max(4, 1.15 * Math.max(Math.abs(pbA), Math.abs(pbB), Math.abs(pbA + pbB), Math.abs(c.mA * c.v2A), Math.abs(c.mB * c.v2B)));
    drawPBars(RL, '운동량 p = mv (점선: 충돌 전)', [
      { label: 'A', color: '#3867f4', before: pbA, now: pA },
      { label: 'B', color: '#f2873a', before: pbB, now: pB },
      { label: '합', color: '#14a058', before: pbA + pbB, now: pA + pB },
    ], pm, 'kg·m/s');
    drawTable(RR, '충돌 기록 (센서 값으로 계산)', [
      { h: '유형', w: 0.8, get: (x) => TYPE_NAME[x.type] },
      { h: 'A (kg, m/s)', w: 1.5, get: (x) => f1(x.mA) + ', ' + sg(x.vA, 1) },
      { h: 'B (kg, m/s)', w: 1.5, get: (x) => f1(x.mB) + ', ' + sg(x.vB, 1) },
      { h: '전 총 p', w: 1, get: (x) => sg(x.pb, 2), color: '#0b6b39' },
      { h: '후 총 p', w: 1, get: (x) => sg(x.pa, 2), color: '#0b6b39' },
      { h: '운동에너지 전→후 (J)', w: 1.6, get: (x) => f2(x.kb) + '→' + f2(x.ka), color: '#9a3412' },
    ], o.rows, PHONE ? 4 : 5, '충돌시키면 기록이 쌓여요');
  }

  /* =====================================================
     ③ 반동과 발사
     ===================================================== */
  const RPPM = (VW - 60) / 10, RX0 = 30, RGY = MH - 70;
    const RSCN = {
    skate: { name: '⛸️ 스케이트', dur: 2.4, ts: 1, L: { n: '왼쪽 선수', m: SKATE.m1 }, R: { n: '오른쪽 선수', m: 40 } },
    gun: { name: '🔫 총 쏘기', dur: 1.6, ts: 1, L: { n: '총', m: GUN.M }, R: { n: '탄환', m: GUN.m }, vR: GUN.v },
    space: { name: '👨‍🚀 우주 공구', dur: 2.0, ts: 10, L: { n: '우주인', m: SPACE.M }, R: { n: '공구', m: SPACE.m }, vR: SPACE.v },
    rocket: { name: '🚀 로켓', dur: 3, ts: 1, L: { n: '로켓', m: 0 }, R: { n: '가스', m: 0 } },
  };
  function rcQ(sc, partner) {          // 두 물체가 서로에게 준 운동량의 크기 Q (kg·m/s)
    if (sc === 'skate') return SKATE.m1 * partner * SKATE.u / (SKATE.m1 + partner);
    if (sc === 'gun') return GUN.m * GUN.v;
    if (sc === 'space') return SPACE.m * SPACE.v;
    return 0;
  }
  function resetRc(sc, partner, env) {
    const prev = S.rc;
    const scene = sc || (prev ? prev.scene : 'skate');
    const pt = partner || (prev ? prev.partner : 40);
    const e = env || (prev ? prev.env : 'air');
    const done = prev ? prev.done : {};
    const q = rcQ(scene, pt), spec = RSCN[scene];
    const mL = scene === 'skate' ? SKATE.m1 : spec.L.m, mR = scene === 'skate' ? pt : spec.R.m;
    const vR = scene === 'rocket' ? 0 : q / mR, vL = scene === 'rocket' ? 0 : -q / mL;
    S.rc = { scene, partner: pt, env: e, st: 'ready', t: 0, Q: q, mL, mR, vL, vR, xL: scene === 'gun' ? 5.0 : 4.6, xR: scene === 'gun' ? 5.9 : 5.4, shown: false, yR: 0, spd: 0, burn: 0, done, flame: 0 };
    if (scene === 'space') { S.rc.xL = 5.0; S.rc.xR = 5.7; }
    updateCtl();
  }
  function rcFire() {
    const r = S.rc; if (r.st === 'go') return false;
    if (r.st === 'done') { resetRc(); }
    const q = S.rc; q.st = 'go'; q.t = 0; q.shown = true; Sound.click();
    if (q.scene === 'skate') q.done[q.partner] = true;
    if (q.scene === 'gun') { q.gunFired = true; S.rc.done.gun = true; }
    if (q.scene === 'space') S.rc.done.space = true;
    if (q.scene === 'rocket') { S.rc.done.rocket = S.rc.done.rocket || {}; S.rc.done.rocket[q.env] = true; }
    if (q.scene === 'gun') parts.burst(RX0 + 5.9 * RPPM, RGY - 40, { count: 14, speed: 160, size: 3, colors: ['#ffd447', '#ffb400', '#fff'], gravity: 40 });
    updateCtl(); return true;
  }
  function stepRc(dt) {
    const r = S.rc; if (r.st !== 'go') return;
    const spec = RSCN[r.scene];
    r.t += dt * spec.ts;
    if (r.scene === 'rocket') {
      r.burn = Math.min(1, r.burn + dt * 1.2); r.spd = r.spd + dt * 3.2; r.flame += dt;
      if (r.t >= spec.dur) { r.st = 'done'; Sound.success(); updateCtl(); }
      return;
    }
    let left = dt * spec.ts;
    r.xL += r.vL * left; r.xR += r.vR * left;
    const hw = r.scene === 'skate' ? 0.45 : 0.6;
    if (r.scene === 'skate' || r.scene === 'gun' || r.scene === 'space') { r.xL = Math.max(0.6, r.xL); }
    if (r.scene === 'skate') r.xR = Math.min(9.4, r.xR);
    if (r.scene === 'gun') r.xR = Math.min(r.xR, 40);
    if (r.t >= spec.dur) { r.st = 'done'; Sound.success(); parts.burst(RX0 + clamp(r.xL, 0, 10) * RPPM, RGY - 50, { count: 10, speed: 100, size: 3, colors: ['#14a058', '#3867f4'], gravity: 160 }); updateCtl(); }
  }
  function drawSkater(cx, gy, mass, color, lean, flip) {
    const s = 0.85 + 0.25 * (mass / 60) * 0.0 + 0.0, hgt = (PHONE ? 62 : 84) * (0.8 + 0.25 * Math.sqrt(mass / 60));
    const w = (PHONE ? 20 : 28) * (0.8 + 0.3 * Math.sqrt(mass / 60));
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(cx, gy, w * 0.9, 4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#34405a'; ctx.lineWidth = w * 0.38; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.25, gy - hgt * 0.45); ctx.lineTo(cx - w * 0.3, gy - 4); ctx.moveTo(cx + w * 0.25, gy - hgt * 0.45); ctx.lineTo(cx + w * 0.3, gy - 4); ctx.stroke();
    ctx.fillStyle = '#9aa5b8'; ctx.fillRect(cx - w * 0.6, gy - 3, w * 1.2, 3);
    D.shadow(() => { D.roundRect(cx - w * 0.55, gy - hgt * 0.88, w * 1.1, hgt * 0.5, w * 0.4); ctx.fillStyle = color; ctx.fill(); }, { blur: 4, y: 2 });
    ctx.strokeStyle = color; ctx.lineWidth = w * 0.26;
    const d = flip ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(cx + d * w * 0.4, gy - hgt * 0.74); ctx.lineTo(cx + d * (w * 0.9 + lean), gy - hgt * 0.62); ctx.stroke();
    D.sphere(cx, gy - hgt * 0.97, w * 0.42, '#f3cfa8', { gloss: false });
  }
  function drawGun(cx, gy, rec) {
    const w = (PHONE ? 62 : 96), h = (PHONE ? 22 : 32);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(cx, gy, w * 0.6, 4, 0, 0, TAU); ctx.fill();
    D.shadow(() => { D.roundRect(cx - w * 0.5, gy - h - 22, w, h, 8); const g = ctx.createLinearGradient(0, gy - h - 22, 0, gy - 22); g.addColorStop(0, '#6b7a99'); g.addColorStop(1, '#3a4660'); ctx.fillStyle = g; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = '#2b3345'; ctx.fillRect(cx + w * 0.5 - 2, gy - h - 22 + h * 0.3, w * 0.38, h * 0.32);
    D.roundRect(cx - w * 0.45, gy - 24, w * 0.3, 24, 5); ctx.fillStyle = '#4d5a78'; ctx.fill();
    [-0.3, 0.3].forEach((k) => { ctx.fillStyle = '#2b3140'; ctx.beginPath(); ctx.arc(cx + k * w, gy - 8, 8, 0, TAU); ctx.fill(); });
  }
  function drawAstro(cx, cy, scale) {
    D.shadow(() => { D.roundRect(cx - 17 * scale, cy - 6 * scale, 34 * scale, 42 * scale, 10 * scale); ctx.fillStyle = '#e8edf6'; ctx.fill(); }, { blur: 6, y: 2, color: 'rgba(0,0,0,.4)' });
    D.roundRect(cx - 11 * scale, cy + 4 * scale, 22 * scale, 14 * scale, 4 * scale); ctx.fillStyle = '#f2873a'; ctx.fill();
    D.sphere(cx, cy - 16 * scale, 15 * scale, '#f4f6fb', { gloss: false });
    D.roundRect(cx - 10 * scale, cy - 24 * scale, 20 * scale, 13 * scale, 6 * scale); ctx.fillStyle = '#2f4a8a'; ctx.fill();
    ctx.strokeStyle = '#e8edf6'; ctx.lineWidth = 8 * scale; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + 15 * scale, cy + 2 * scale); ctx.lineTo(cx + 30 * scale, cy - 4 * scale); ctx.stroke();
    ctx.strokeStyle = '#e8edf6'; ctx.beginPath(); ctx.moveTo(cx - 15 * scale, cy + 4 * scale); ctx.lineTo(cx - 22 * scale, cy + 18 * scale); ctx.stroke();
  }
  function drawRocketShape(cx, cy, s, flameLen, t) {
    if (flameLen > 0) {
      for (let i = 0; i < 3; i++) {
        const fx = cx + (i - 1) * 9 * s, fl = flameLen * (1 + Math.sin(t * 25 + i * 2) * 0.12);
        const g = ctx.createLinearGradient(0, cy + 44 * s, 0, cy + 44 * s + fl);
        g.addColorStop(0, 'rgba(255,240,180,.95)'); g.addColorStop(0.4, 'rgba(255,150,50,.85)'); g.addColorStop(1, 'rgba(255,80,30,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx - 6 * s, cy + 44 * s); ctx.lineTo(fx, cy + 44 * s + fl); ctx.lineTo(fx + 6 * s, cy + 44 * s); ctx.closePath(); ctx.fill();
      }
    }
    D.shadow(() => {
      ctx.beginPath(); ctx.moveTo(cx, cy - 62 * s); ctx.quadraticCurveTo(cx + 24 * s, cy - 30 * s, cx + 20 * s, cy + 44 * s); ctx.lineTo(cx - 20 * s, cy + 44 * s); ctx.quadraticCurveTo(cx - 24 * s, cy - 30 * s, cx, cy - 62 * s); ctx.closePath();
      const g = ctx.createLinearGradient(cx - 22 * s, 0, cx + 22 * s, 0); g.addColorStop(0, '#fff'); g.addColorStop(0.6, '#dfe6f2'); g.addColorStop(1, '#aeb9cd'); ctx.fillStyle = g; ctx.fill();
    }, { blur: 6, y: 2, color: 'rgba(0,0,0,.35)' });
    D.sphere(cx, cy - 14 * s, 9 * s, '#6cb4ff', { gloss: true });
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(cx - 20 * s, cy + 20 * s); ctx.lineTo(cx - 36 * s, cy + 48 * s); ctx.lineTo(cx - 20 * s, cy + 44 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 20 * s, cy + 20 * s); ctx.lineTo(cx + 36 * s, cy + 48 * s); ctx.lineTo(cx + 20 * s, cy + 44 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e2464b'; ctx.beginPath(); ctx.moveTo(cx, cy - 62 * s); ctx.quadraticCurveTo(cx + 14 * s, cy - 46 * s, cx + 15 * s, cy - 36 * s); ctx.lineTo(cx - 15 * s, cy - 36 * s); ctx.quadraticCurveTo(cx - 14 * s, cy - 46 * s, cx, cy - 62 * s); ctx.fill();
  }
  const gasP = new SciSim.Particles();
  function drawRecoil(dt) {
    const r = S.rc;
    bgData(); beginMain();
    const sc = r.scene, X = (m) => RX0 + m * RPPM;
    if (sc === 'skate') {
      const g = ctx.createLinearGradient(0, 0, 0, MH); g.addColorStop(0, '#dcefff'); g.addColorStop(1, '#f2f9ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, MH);
      ctx.fillStyle = '#cfe6f7'; ctx.fillRect(RX0 - 14, RGY, 10 * RPPM + 28, 14); ctx.fillStyle = '#9ec7e6'; ctx.fillRect(RX0 - 14, RGY, 10 * RPPM + 28, 3);
      ctx.fillStyle = '#7b8aa6'; ctx.fillRect(RX0 - 20, RGY - 30, 8, 44); ctx.fillRect(RX0 + 10 * RPPM + 12, RGY - 30, 8, 44);
      T(RX0 + 10 * RPPM, RGY + 34, '얼음판 10 m (마찰 없음)', 11.5, '#5a6679', 'right', 700);
      drawSkater(X(r.xL), RGY, r.mL, '#3867f4', r.st === 'ready' ? 8 : 0, true);
      drawSkater(X(r.xR), RGY, r.mR, '#f2873a', r.st === 'ready' ? 8 : 0, false);
      if (r.st === 'ready') { D.arrow(X(5) - 18, RGY - 100, X(5) - 52, RGY - 100, { color: '#8b97ab', width: 4, dash: [6, 5] }); D.arrow(X(5) + 18, RGY - 100, X(5) + 52, RGY - 100, { color: '#8b97ab', width: 4, dash: [6, 5] }); T(X(5), RGY - 108, '서로 밀면', 13, '#5a6679', 'center', 800); }
      else {
        const lv = r.vL, rv = r.vR;
        D.arrow(X(r.xL), RGY - 128, X(r.xL) + lv * (PHONE ? 38 : 70), RGY - 128, { color: '#14a058', width: 5, label: sg(lv, 2) + ' m/s', labelOffset: -15, labelSize: PHONE ? 12 : 13 });
        D.arrow(X(r.xR), RGY - 128, X(r.xR) + rv * (PHONE ? 38 : 70), RGY - 128, { color: '#14a058', width: 5, label: sg(rv, 2) + ' m/s', labelOffset: -15, labelSize: PHONE ? 12 : 13 });
      }
      tagPill(X(r.xL), RGY + 52, f1(r.mL).replace('.0', '') + ' kg', '#3867f4'); tagPill(X(r.xR), RGY + 52, f1(r.mR).replace('.0', '') + ' kg', '#f2873a');
    } else if (sc === 'gun') {
      const g = ctx.createLinearGradient(0, 0, 0, MH); g.addColorStop(0, '#eef2f8'); g.addColorStop(1, '#fafbfd'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, MH);
      ctx.fillStyle = '#b6c2d4'; ctx.fillRect(RX0 - 14, RGY, 10 * RPPM + 28, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(RX0 - 14, RGY, 10 * RPPM + 28, 3);
      drawGun(X(r.xL), RGY, r);
      const bx = X(r.xR), by = RGY - (PHONE ? 22 : 32) - 22 + (PHONE ? 8 : 12);
      if (r.st === 'ready') { D.sphere(bx - (PHONE ? 20 : 32), by, 5, '#c9a227', { gloss: true }); }
      else {
        if (bx < VW + 40) { ctx.strokeStyle = 'rgba(201,162,39,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Math.max(bx - 60, X(5.9)), by); ctx.lineTo(Math.min(bx, VW), by); ctx.stroke(); D.sphere(Math.min(bx, VW - 6), by, 5, '#c9a227', { gloss: true }); }
        D.arrow(X(r.xL) + 4, RGY - 100, X(r.xL) + r.vL * (PHONE ? 38 : 70) , RGY - 100, { color: '#14a058', width: 5, label: '총 ' + sg(r.vL, 2) + ' m/s', labelOffset: -15, labelSize: PHONE ? 12 : 13 });
        D.arrow(VW - 150, RGY - 130, VW - 30, RGY - 130, { color: '#c2410c', width: 5, label: '탄환 ' + sg(GUN.v, 0) + ' m/s', labelOffset: -15, labelSize: PHONE ? 12 : 13 });
      }
      tagPill(X(r.xL), RGY + 52, '총 ' + f1(GUN.M) + ' kg', '#3867f4'); tagPill(VW - 70, RGY + 52, '탄환 ' + GUN.m.toFixed(3) + ' kg', '#f2873a');
    } else if (sc === 'space') {
      D.space(0, 0, VW, MH, S.clock, { stars: 70 });
      const sx = X(r.xL), sy = MH / 2 - 10;
      const sc2 = PHONE ? 0.9 : 1.2;
      drawAstro(sx, sy, sc2);
      const tx = X(r.xR), ty = sy - 2 * sc2;
      if (tx < VW + 30) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(r.st === 'ready' ? 0 : S.clock * 3); D.roundRect(-9, -5, 18, 10, 3); ctx.fillStyle = '#ffd447'; ctx.fill(); ctx.strokeStyle = '#a77f00'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
      T(PHONE ? 12 : 16, PHONE ? 24 : 30, '👨‍🚀 우주 공간 (마찰·공기 없음)', PHONE ? 14 : 17, '#fff', 'left', 800);
      if (r.st !== 'ready') {
        D.label(VW - (PHONE ? 82 : 100), PHONE ? 50 : 58, '⏩ 10배 빠르게 재생', { bg: '#26324a', size: 12.5 });
        D.arrow(sx, sy + 66, sx + r.vL * 10 * (PHONE ? 38 : 70), sy + 66, { color: '#6ee7a0', width: 5, label: '우주인 ' + sg(r.vL, 3) + ' m/s', labelOffset: 16, labelColor: '#0b6b39', labelSize: PHONE ? 12 : 13 });
      }
      tagPill(sx, sy + 96, '우주인 ' + SPACE.M + ' kg', '#3867f4'); if (tx < VW - 20) tagPill(tx, ty - 26, '공구 ' + SPACE.m + ' kg', '#c2410c');
      // 눈금: 위치 비교용 점선
      D.dashedLine(X(5.0), sy + 38, X(5.0), sy + 52, { color: 'rgba(255,255,255,.6)', width: 2 });
    } else {
      const space = r.env === 'space';
      if (space) D.space(0, 0, VW, MH, S.clock, { stars: 70 }); else { D.sky(0, 0, VW, MH, '#8ec8f5', '#e6f4ff'); }
      // 스크롤 배경: 속도에 비례해 아래로
      const off = (r.t * (r.spd + 4) * 18) % 80;
      if (!space) { ctx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 6; i++) { const cy2 = ((i * 80 + off) % 480) - 40; ctx.beginPath(); ctx.ellipse(70 + (i * 137) % (VW - 140), cy2, 38, 12, 0, 0, TAU); ctx.fill(); } }
      else { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 12; i++) { const cy2 = ((i * 53 + off * 2) % 340) - 20; ctx.fillRect(30 + (i * 97) % (VW - 60), cy2, 2, 8 + (r.st === 'go' ? r.spd * 2 : 0)); } }
      if (!space) { // 공기 분자
        ctx.fillStyle = 'rgba(80,120,170,.35)'; for (let i = 0; i < 26; i++) { const ax = 20 + (i * 71) % (VW - 40), ay = 20 + (i * 43 + Math.sin(S.clock * 2 + i) * 6) % (MH - 40); ctx.beginPath(); ctx.arc(ax, ay, 3, 0, TAU); ctx.fill(); }
      }
      const rx = VW / 2 - (PHONE ? 90 : 160), ry = MH / 2 - 6, s = PHONE ? 0.8 : 1.0;
      const fl = r.st === 'go' ? 70 * s * r.burn : 0;
      drawRocketShape(rx, ry, s, fl, S.clock);
      if (r.st === 'go' && !RM) { for (let i = 0; i < 2; i++) gasP.emit({ x: rx + (Math.random() - 0.5) * 18, y: ry + 46 * s, vx: (Math.random() - 0.5) * 30, vy: 250 + Math.random() * 120, life: 0.7, size: 3 + Math.random() * 2.5, color: Math.random() < 0.5 ? '#ffb347' : '#ff7a3d', gravity: 0, drag: 0.2, shape: 'circle' }); }
      gasP.update(dt); gasP.draw(ctx);
      T(PHONE ? 12 : 16, PHONE ? 24 : 30, '🚀 ' + (space ? '우주 공간' : '대기 중') + ' · 분사 가스 ' + ROCKET.mdot + ' kg/s × ' + ROCKET.u + ' m/s', PHONE ? 13.5 : 17, space ? '#fff' : '#26324a', 'left', 800);
      if (r.st !== 'ready') {
        D.arrow(rx + 56, ry + 6, rx + 56, ry - 40, { color: '#14a058', width: 6, label: '로켓이 받는 힘 ↑', labelOffset: 76, labelColor: '#0b6b39', labelSize: PHONE ? 12 : 13 });
        D.arrow(rx + 56, ry + 52 * s, rx + 56, ry + 52 * s + 40, { color: '#c2410c', width: 6, label: '가스가 받는 힘 ↓', labelOffset: -76, labelColor: '#9a3412', labelSize: PHONE ? 12 : 13 });
      } else T(VW / 2, MH - 20, '▶ 분사하기를 눌러 보세요', 14, space ? '#fff' : '#5a6679', 'center', 800);
    }
    parts.update(dt); parts.draw(ctx); endMain();
    // 데이터 영역
    if (sc === 'rocket') {
      drawPBars(RL, '1초 동안 운동량 변화 (×10⁵ kg·m/s)', [
        { label: '로켓', color: '#3867f4', now: r.st === 'ready' ? 0 : ROCKET_F / 1e5 },
        { label: '가스', color: '#f2873a', now: r.st === 'ready' ? 0 : -ROCKET_F / 1e5 },
        { label: '합', color: '#14a058', now: 0 },
      ], 1.6, '×10⁵ kg·m/s');
      drawRcInfo(RR, r);
    } else {
      const on = r.st !== 'ready';
      const pL = on ? -r.Q : 0, pR = on ? r.Q : 0;
      const pm = sc === 'gun' ? 5 : sc === 'space' ? 7 : 80;
      drawPBars(RL, '운동량 p = mv (처음엔 모두 0)', [
        { label: sc === 'skate' ? '왼쪽' : RSCN[sc].L.n, color: '#3867f4', now: pL },
        { label: sc === 'skate' ? '오른쪽' : RSCN[sc].R.n, color: '#f2873a', now: pR },
        { label: '합', color: '#14a058', now: pL + pR },
      ], pm, 'kg·m/s');
      drawRcInfo(RR, r);
    }
  }
  function rcFormula(r) {
    if (r.scene === 'skate') return '0 = ' + r.mL + ' × (' + sg(r.vL, 2) + ') + ' + r.mR + ' × (' + sg(r.vR, 2) + ')';
    if (r.scene === 'gun') return '0 = ' + f1(GUN.M) + ' × (' + sg(r.vL, 2) + ') + ' + GUN.m.toFixed(3) + ' × (' + sg(GUN.v, 0) + ')';
    if (r.scene === 'space') return '0 = ' + SPACE.M + ' × (' + sg(r.vL, 3) + ') + ' + SPACE.m + ' × (' + sg(SPACE.v, 0) + ')';
    return '로켓 +' + sci5(ROCKET_F) + ' + 가스 (−' + sci5(ROCKET_F) + ') = 0 (1초 동안, kg·m/s)';
  }
  function drawRcInfo(r0, r) {
    panel(r0.x, r0.y, r0.w, r0.h, 14);
    T(r0.x + 12, r0.y + 22, '운동량 보존 식', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = r0.y + 48;
    if (r.st === 'ready') { textBlock(r0.x + 14, y, r0.w - 28, r.scene === 'rocket' ? '처음엔 정지해 있어요. 분사하면 가스는 뒤로, 로켓은 앞으로 같은 크기의 운동량을 얻어요.' : '처음엔 두 물체가 정지해 있어서 총 운동량은 0이에요. 서로 밀면 총 운동량은 어떻게 될까요?', 13.5, '#5a6679', 19, 700); return; }
    y += textBlock(r0.x + 14, y, r0.w - 28, rcFormula(r), PHONE ? 13.5 : 15, '#0b6b39', 20, 800);
    y += 8;
    if (r.scene === 'skate') {
      y += textBlock(r0.x + 14, y, r0.w - 28, '속력의 비 v왼쪽 : v오른쪽 = ' + Math.abs(r.vL).toFixed(2) + ' : ' + Math.abs(r.vR).toFixed(2) + ' = ' + r.mR + ' : ' + r.mL + ' (질량의 반비율)', 13.5, '#26324a', 19, 800);
      textBlock(r0.x + 14, y + 6, r0.w - 28, '질량이 큰 선수일수록 속력이 작아요. (v ∝ 1/m)', 13.5, '#5a6679', 19, 700);
    } else if (r.scene === 'gun') {
      y += textBlock(r0.x + 14, y, r0.w - 28, '탄환의 운동량 ' + GUN.m.toFixed(3) + ' × ' + GUN.v + ' = ' + f1(r.Q) + ' kg·m/s → 총은 반대로 ' + f1(r.Q) + ' kg·m/s', 13.5, '#26324a', 19, 800);
      textBlock(r0.x + 14, y + 6, r0.w - 28, '총의 반동 속력 = ' + f1(r.Q) + ' ÷ ' + f1(GUN.M) + ' = ' + Math.abs(r.vL).toFixed(1) + ' m/s', 13.5, '#c2410c', 19, 800);
    } else if (r.scene === 'space') {
      y += textBlock(r0.x + 14, y, r0.w - 28, '공구의 운동량 ' + SPACE.m + ' × ' + SPACE.v + ' = ' + r.Q + ' kg·m/s → 우주인은 반대로 ' + r.Q + ' kg·m/s', 13.5, '#26324a', 19, 800);
      textBlock(r0.x + 14, y + 6, r0.w - 28, '우주인의 반동 속력 = ' + r.Q + ' ÷ ' + SPACE.M + ' = ' + Math.abs(r.vL).toFixed(3) + ' m/s (공기가 없어도 돼요)', 13.5, '#c2410c', 19, 800);
    } else {
      y += textBlock(r0.x + 14, y, r0.w - 28, '가스를 밀어내는 힘 F = (' + ROCKET.mdot + ' kg/s × ' + ROCKET.u + ' m/s) = ' + sci5(ROCKET_F) + ' N', 13.5, '#26324a', 19, 800);
      textBlock(r0.x + 14, y + 6, r0.w - 28, '가스가 로켓을 미는 반작용으로 나아가요. 대기 중이든 우주 공간이든 같아요.', 13.5, '#c2410c', 19, 800);
    }
  }
  /* =====================================================
     ④ 적용: 장면 카드
     ===================================================== */
  const APS = {
    car: { name: '🚗 자동차 정면 충돌', kind: 'col', ok: 1,
      q: '승용차(' + CAR.mA + ' kg, +' + CAR.vA + ' m/s)와 SUV(' + CAR.mB + ' kg, 반대로 ' + Math.abs(CAR.vB) + ' m/s)가 정면 충돌해 한 덩어리가 돼요. 오른쪽(+)을 기준으로 운동량 보존 식은?',
      opts: [CAR.mA + ' × ' + CAR.vA + ' + ' + CAR.mB + ' × ' + CAR.vA + ' = (' + CAR.mA + ' + ' + CAR.mB + ') × v', CAR.mA + ' × ' + CAR.vA + ' + ' + CAR.mB + ' × (−' + CAR.vA + ') = (' + CAR.mA + ' + ' + CAR.mB + ') × v', CAR.mA + ' × ' + CAR.vA + ' = ' + CAR.mB + ' × ' + CAR.vA + ' + (' + CAR.mA + ' + ' + CAR.mB + ') × v'],
      spec: { len: 32, mA: CAR.mA, vA: CAR.vA, mB: CAR.mB, vB: CAR.vB, type: 'stick', wA: 4, wB: 5, T0: 0.7 } },
    ball: { name: '🎱 당구공 정면 충돌', kind: 'col', ok: 0,
      q: '질량이 같은 당구공 A(' + f1(BALL.v) + ' m/s)가 정지한 B에 정면으로 부딪혀 튕겨요(탄성 충돌). 공 한 개의 질량을 m, 충돌 후 속도를 v_A, v_B라 할 때 운동량 보존 식은?',
      opts: ['m × ' + f1(BALL.v) + ' + 0 = m × v_A + m × v_B', 'm × ' + f1(BALL.v) + ' = m × v_A − m × v_B', 'm × ' + f1(BALL.v) + ' + 0 = (m + m) × v'],
      spec: { len: 6, mA: BALL.m, vA: BALL.v, mB: BALL.m, vB: 0, type: 'bounce', wA: 0.6, wB: 0.6 } },
    swim: { name: '🏊 수영 출발', kind: 'rc', ok: 2,
      q: SWIM.m + ' kg 선수가 물에 떠 있는 ' + SWIM.M + ' kg 출발대(처음 정지)를 밀며 앞(+)으로 ' + f1(SWIM.v) + ' m/s로 출발해요. 출발대의 속도를 V(+ 방향 기준)라 할 때 식은?',
      opts: [SWIM.m + ' × ' + f1(SWIM.v) + ' = ' + SWIM.M + ' × V', '0 = ' + SWIM.m + ' × ' + f1(SWIM.v) + ' − ' + SWIM.M + ' × V', '0 = ' + SWIM.m + ' × ' + f1(SWIM.v) + ' + ' + SWIM.M + ' × V'] },
    cannon: { name: '💥 대포 발사', kind: 'rc', ok: 1,
      q: '정지한 ' + CANNON.M + ' kg 대포가 ' + CANNON.m + ' kg 포탄을 앞(+)으로 ' + CANNON.v + ' m/s로 쏘아요. 대포의 속도를 V(+ 방향 기준)라 할 때 식은?',
      opts: [CANNON.m + ' × ' + CANNON.v + ' = ' + CANNON.M + ' × V', '0 = ' + CANNON.m + ' × ' + CANNON.v + ' + ' + CANNON.M + ' × V', '0 = ' + CANNON.m + ' × ' + CANNON.v + ' − ' + CANNON.M + ' × V'] },
    cradle: { name: '🔔 뉴턴의 요람', kind: 'cradle' },
  };
  const APK = ['car', 'ball', 'swim', 'cannon', 'cradle'];
  const EQK = ['car', 'ball', 'swim', 'cannon'];
  const RC_AP = {
    swim: { dur: 2.0, mL: SWIM.M, mR: SWIM.m, vR: SWIM.v, nL: '출발대 ' + SWIM.M + ' kg', nR: '선수 ' + SWIM.m + ' kg', Lc: '#7a8aa6', Rc: '#f2873a', x0: 5.0 },
    cannon: { dur: 1.8, mL: CANNON.M, mR: CANNON.m, vR: CANNON.v, nL: '대포 ' + CANNON.M + ' kg', nR: '포탄 ' + CANNON.m + ' kg', Lc: '#4d5a78', Rc: '#c9a227', x0: 5.0 },
  };
  function resetAp(sel) {
    const prev = S.ap;
    S.ap = { sel: sel || (prev ? prev.sel : 'car'), eq: prev ? prev.eq : {}, eqOK: {}, run: null, rc: null, cr: prev ? prev.cr : { n: 1, st: 'hold', t: 0, ang: 0, played: {} }, ran: prev ? prev.ran : {} };
    newApRun();
    updateCtl();
  }
  function newApRun() {
    const a = S.ap, sc = APS[a.sel];
    a.run = null; a.rc = null;
    if (sc.kind === 'col') {
      a.run = makeCol(Object.assign({ T0: 1.0 }, sc.spec, { spring: false, TPOST: 1.2 }));
      a.run.onBurst = () => { const c = a.run, g = apGeo(); parts.burst(g.x0 + (c.xAc + c.D0 / 2) * g.ppm, g.gy - 30, { count: 16, speed: 150, size: 3.2, colors: ['#ffb400', '#fff', '#ff8a3d'], gravity: 220 }); };
    } else if (sc.kind === 'rc') {
      const s = RC_AP[a.sel], q = s.mR * s.vR;
      a.rc = { st: 'ready', t: 0, xL: s.x0, xR: s.x0 + 0.5, vL: -q / s.mL, vR: s.vR, Q: q, s };
    }
  }
  function apGeo() {
    const sel = S.ap.sel;
    if (sel === 'car') return { x0: 30, ppm: (VW - 60) / 32, gy: MH - 70, style: 'car', ak: PHONE ? 2.6 : 4.4, akMax: 90, colA: '#3867f4', colB: '#e2464b', nameA: '승용차', nameB: 'SUV' };
    return { x0: 30, ppm: (VW - 60) / 6, gy: MH - 70, style: 'ball', ak: PHONE ? 22 : 40, akMax: 110, colA: '#3867f4', colB: '#e2464b', nameA: 'A', nameB: 'B' };
  }
  function apRun() {
    const a = S.ap, sc = APS[a.sel];
    if (sc.kind === 'col') {
      if (a.run.st === 'done') newApRun();
      if (a.run.st !== 'ready') return false;
      colGo(a.run); a.ran[a.sel] = true; Sound.click(); updateCtl(); return true;
    }
    if (sc.kind === 'rc') {
      if (a.rc.st === 'done') newApRun();
      if (a.rc.st !== 'ready') return false;
      a.rc.st = 'go'; a.rc.t = 0; a.ran[a.sel] = true; Sound.click(); updateCtl(); return true;
    }
    if (sc.kind === 'cradle') { crRelease(); return true; }
    return false;
  }
  function stepAp(dt) {
    const a = S.ap, sc = APS[a.sel];
    if (sc.kind === 'col') stepCol(a.run, dt);
    else if (sc.kind === 'rc') {
      const r = a.rc; if (r.st !== 'go') return;
      r.t += dt; r.xL += r.vL * dt; r.xR += r.vR * dt;
      if (r.xL < 0.9) { r.xL = 0.9; }
      if (r.xR > 60) r.xR = 60;
      if (r.t >= r.s.dur) { r.st = 'done'; Sound.success(); updateCtl(); }
    } else stepCradle(dt);
  }
  /* 뉴턴의 요람: 이상적(마찰 없음) */
  const CR_T = 0.5;         // 1/4 주기 (초)
  const CR_A0 = 0.62;       // 들어 올린 각 (rad)
  function crRelease() {
    const c = S.ap.cr; c.st = 'swing'; c.t = 0; c.played[c.n] = true; Sound.click(); updateCtl();
  }
  function crReset() { const c = S.ap.cr; c.st = 'hold'; c.t = 0; updateCtl(); }
  function crAngles() {
    const c = S.ap.cr, n = c.n, a = [0, 0, 0, 0, 0];
    let left = -CR_A0, right = 0;           // 그룹 각도 (왼쪽 −, 오른쪽 +)
    let L = -CR_A0, R = 0;
    if (c.st === 'swing') {
      const s = c.t / CR_T * (Math.PI / 2), q = Math.floor(s / (Math.PI / 2)) % 4, f = s - Math.floor(s / (Math.PI / 2)) * (Math.PI / 2);
      if (q === 0) { L = -CR_A0 * Math.cos(f); R = 0; }
      else if (q === 1) { L = 0; R = CR_A0 * Math.sin(f); }
      else if (q === 2) { L = 0; R = CR_A0 * Math.cos(f); }
      else { L = -CR_A0 * Math.sin(f); R = 0; }
    } else if (c.st === 'hold') { L = -CR_A0; R = 0; }
    for (let i = 0; i < n; i++) a[i] = L;
    for (let i = 0; i < n; i++) a[4 - i] = R;
    return a;
  }
  function stepCradle(dt) { const c = S.ap.cr; if (c.st === 'swing') c.t += dt; }
  function drawCradle(dt) {
    const c = S.ap.cr, n = c.n;
    bgData(); beginMain();
    const g = ctx.createLinearGradient(0, 0, 0, MH); g.addColorStop(0, '#eaf0fa'); g.addColorStop(1, '#f8fafe'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, MH);
    const r = PHONE ? 20 : 26, L = PHONE ? 150 : 170, cx = VW / 2, topY = 60;
    D.shadow(() => { D.roundRect(cx - r * 5 - 24, topY - 14, r * 10 + 48, 12, 6); ctx.fillStyle = '#7a8aa6'; ctx.fill(); }, { blur: 5, y: 2 });
    ctx.fillStyle = '#7a8aa6'; ctx.fillRect(cx - r * 5 - 24, topY - 8, 8, L + r + 30); ctx.fillRect(cx + r * 5 + 16, topY - 8, 8, L + r + 30);
    ctx.fillStyle = '#b6c2d4'; ctx.fillRect(cx - r * 5 - 34, topY + L + r + 22, r * 10 + 68, 10);
    const ang = crAngles();
    for (let i = 0; i < 5; i++) {
      const px = cx + (i - 2) * r * 2, a = ang[i];
      const bx = px + Math.sin(a) * L, by = topY + Math.cos(a) * L;
      ctx.strokeStyle = '#4d5a78'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, topY - 6); ctx.lineTo(bx, by); ctx.stroke();
      D.sphere(bx, by, r, i < n ? '#d7dde8' : '#d7dde8', { shadow: true, light: '#ffffff', dark: '#8a96ac' });
    }
    // 들어 올린/나가는 공 표시
    T(16, PHONE ? 24 : 30, '🔔 뉴턴의 요람 · 마찰을 무시한 이상적인 경우', PHONE ? 14 : 17, '#26324a', 'left', 800);
    const vv = 1;
    const y0 = topY + L + r + 54;
    if (c.st === 'hold') T(VW / 2, y0 + 4, '왼쪽 공 ' + n + '개를 들어 올렸어요 → 놓기를 눌러 보세요', 14, '#5a6679', 'center', 800);
    else T(VW / 2, y0 + 4, '오른쪽에서도 공이 ' + n + '개 튀어 올라요', 14, '#0b6b39', 'center', 800);
    endMain();
    // 데이터: 가능한 경우 vs 불가능한 경우
    panel(RL.x, RL.y, RL.w, RL.h, 14);
    T(RL.x + 12, RL.y + 22, '충돌 전 (공 ' + n + '개, 속력 v)', 14, '#26324a', 'left', 800);
    T(RL.x + 12, RL.y + 48, '운동량 ' + n + 'mv = ' + n + 'mv', 14, '#26324a', 'left', 800);
    T(RL.x + 12, RL.y + 72, '운동 에너지 ' + (n === 1 ? '½mv²' : n + ' × ½mv²') + (n === 1 ? '' : ' = ' + n + '·(½mv²)'), 13.5, '#26324a', 'left', 800);
    T(RL.x + 12, RL.y + 100, '충돌 후 두 가지를 비교해 봐요', 13, '#5a6679', 'left', 700);
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '충돌 후 가능한 경우는?', 14.5, '#26324a', 'left', 800);
    const opt1 = n + '개가 속력 v로', opt2 = '1개가 속력 ' + n + 'v로';
    const rows = [
      { t: opt1, p: n + 'mv', e: n + '·(½mv²)', ok: true },
      { t: opt2, p: n + 'mv', e: n === 1 ? '½mv²' : '½m(' + n + 'v)² = ' + (n * n) + '·(½mv²)', ok: n === 1 },
    ];
    rows.forEach((o, i) => {
      const yy = RR.y + 40 + i * (PHONE ? 52 : 60);
      D.roundRect(RR.x + 10, yy, RR.w - 20, PHONE ? 46 : 52, 10); ctx.fillStyle = o.ok ? '#e5f7ec' : '#fdecec'; ctx.fill(); ctx.strokeStyle = o.ok ? '#14a058' : '#e2464b'; ctx.lineWidth = 1.8; ctx.stroke();
      T(RR.x + 20, yy + 20, (o.ok ? '○ ' : '✕ ') + o.t, 14, o.ok ? '#0b6b39' : '#a3262b', 'left', 800);
      T(RR.x + 20, yy + 40, '운동량 ' + o.p + ' · 에너지 ' + o.e, 12.5, '#26324a', 'left', 800);
    });
    T(RR.x + 14, RR.y + RR.h - 12, '운동량과 운동 에너지가 모두 보존되는 경우만 가능해요.', 12.5, '#5a6679', 'left', 700);
  }
  function drawApRc(dt) {
    const a = S.ap, r = a.rc, s = r.s, sel = a.sel;
    const X = (m) => RX0 + m * RPPM;
    bgData(); beginMain();
    const g0 = ctx.createLinearGradient(0, 0, 0, MH); g0.addColorStop(0, sel === 'swim' ? '#d8efff' : '#eef2f8'); g0.addColorStop(1, sel === 'swim' ? '#f2f9ff' : '#fafbfd'); ctx.fillStyle = g0; ctx.fillRect(0, 0, VW, MH);
    T(16, PHONE ? 24 : 30, APS[sel].name, PHONE ? 15 : 18, '#26324a', 'left', 800);
    if (sel === 'swim') {
      ctx.fillStyle = '#7cc4ff'; ctx.fillRect(0, RGY - 6, VW, MH - RGY + 6); ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 14; i++) ctx.fillRect(20 + i * (VW / 14), RGY - 4 + Math.sin(S.clock * 2 + i) * 2, 22, 3);
      // 출발대 (물에 떠 있는 판)
      D.shadow(() => { D.roundRect(X(r.xL) - 50, RGY - 22, 100, 20, 5); ctx.fillStyle = s.Lc; ctx.fill(); }, { blur: 4, y: 2 });
      // 선수 (수면 위를 미끄러지듯)
      D.shadow(() => { D.roundRect(X(r.xR) - 30, RGY - 38, 60, 16, 8); ctx.fillStyle = s.Rc; ctx.fill(); }, { blur: 4, y: 2 });
      D.sphere(X(r.xR) + 30, RGY - 30, 9, '#f3cfa8', { gloss: false });
      ctx.fillStyle = '#2b3345'; ctx.fillRect(X(r.xR) + 24, RGY - 36, 14, 4);
    } else {
      ctx.fillStyle = '#b6c2d4'; ctx.fillRect(0, RGY, VW, 12); ctx.fillStyle = '#8a98ae'; ctx.fillRect(0, RGY, VW, 3);
      D.shadow(() => { D.roundRect(X(r.xL) - 48, RGY - 44, 96, 26, 6); ctx.fillStyle = s.Lc; ctx.fill(); }, { blur: 4, y: 2 });
      ctx.fillStyle = '#2b3345'; ctx.fillRect(X(r.xL) + 30, RGY - 36, 52, 9);
      [-30, 30].forEach((k) => { D.sphere(X(r.xL) + k, RGY - 12, 11, '#2b3140', { gloss: false }); });
      const tx = X(r.xR);
      if (tx < VW + 20) { if (r.st !== 'ready') { ctx.strokeStyle = 'rgba(201,162,39,.5)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(Math.max(X(r.xL) + 80, tx - 80), RGY - 32); ctx.lineTo(Math.min(tx, VW), RGY - 32); ctx.stroke(); } D.sphere(Math.min(tx, VW - 8), RGY - 32, 8, s.Rc, { gloss: true }); }
    }
    if (r.st !== 'ready') {
      D.arrow(X(r.xL), RGY - 78, X(r.xL) + r.vL * (PHONE ? 38 : 70), RGY - 78, { color: '#14a058', width: 5, label: sg(r.vL, 1) + ' m/s', labelOffset: -15, labelSize: PHONE ? 12 : 13 });
      D.arrow(clamp(X(r.xR), 30, VW - 150) - 20, RGY - 108, clamp(X(r.xR), 30, VW - 150) + 60, RGY - 108, { color: '#c2410c', width: 5, label: sg(r.vR, 1) + ' m/s', labelOffset: -15, labelSize: PHONE ? 12 : 13 });
    }
    tagPill(X(r.xL), RGY + 40, s.nL, '#3867f4'); if (r.st === 'ready') tagPill(X(r.xR) + 30, RGY - 70, s.nR, '#f2873a');
    parts.update(dt); parts.draw(ctx); endMain();
    drawApData(a);
  }
  function drawApData(a) {
    const sel = a.sel, sc = APS[sel];
    if (sc.kind === 'col') {
      const c = a.run;
      const pA = c.mA * c.cvA, pB = c.mB * c.cvB, pbA = c.mA * c.vA, pbB = c.mB * c.vB;
      const pm = sel === 'car' ? 30000 : 0.5;
      drawPBars(RL, '운동량 p = mv (점선: 충돌 전)', [
        { label: sel === 'car' ? '승용차' : 'A', color: '#3867f4', before: pbA, now: pA },
        { label: sel === 'car' ? 'SUV' : 'B', color: '#e2464b', before: pbB, now: pB },
        { label: '합', color: '#14a058', before: pbA + pbB, now: pA + pB },
      ], pm, 'kg·m/s');
    } else if (sc.kind === 'rc') {
      const r = a.rc, on = r.st !== 'ready';
      const pm = sel === 'swim' ? 150 : 2500;
      drawPBars(RL, '운동량 p = mv (처음엔 모두 0)', [
        { label: sel === 'swim' ? '출발대' : '대포', color: '#3867f4', now: on ? -r.Q : 0 },
        { label: sel === 'swim' ? '선수' : '포탄', color: '#f2873a', now: on ? r.Q : 0 },
        { label: '합', color: '#14a058', now: 0 },
      ], pm, 'kg·m/s');
    }
    // 식과 결과
    panel(RR.x, RR.y, RR.w, RR.h, 14);
    T(RR.x + 12, RR.y + 22, '이 장면의 결과', PHONE ? 13.5 : 14.5, '#26324a', 'left', 800);
    let y = RR.y + 46;
    const put = (s, col, w) => { y += textBlock(RR.x + 14, y, RR.w - 28, s, 13.5, col || '#26324a', 19, w || 800) + 4; };
    if (sel === 'car') {
      const c = a.run, done = c.rec;
      put('총 운동량 = ' + CAR.mA + ' × ' + CAR.vA + ' + ' + CAR.mB + ' × (' + sg(CAR.vB, 0) + ') = ' + sg(CAR.mA * CAR.vA + CAR.mB * CAR.vB, 0) + ' kg·m/s');
      if (done) {
        put('합체 후 속도 v = ' + sg(CAR.mA * CAR.vA + CAR.mB * CAR.vB, 0) + ' ÷ ' + (CAR.mA + CAR.mB) + ' = ' + sg(c.v2A, 1) + ' m/s (SUV 방향)', '#0b6b39');
        put('속도 변화: 승용차 ' + Math.abs(c.v2A - c.vA) + ' m/s, SUV ' + Math.abs(c.v2B - c.vB) + ' m/s → 가벼운 승용차가 더 크게 변해요.', '#c2410c');
      } else put('▶ 충돌 시키기를 눌러 결과를 확인해요.', '#5a6679', 700);
    } else if (sel === 'ball') {
      const c = a.run, done = c.rec;
      put('같은 질량 + 정면 탄성 충돌 → 속도를 서로 바꿔 가져요.');
      if (done) put('충돌 후 A ' + sg(c.v2A, 1) + ' m/s, B ' + sg(c.v2B, 1) + ' m/s (운동량·운동 에너지 모두 보존)', '#0b6b39');
      else put('▶ 충돌 시키기를 눌러 결과를 확인해요.', '#5a6679', 700);
    } else if (sel === 'swim') {
      put('0 = ' + SWIM.m + ' × ' + f1(SWIM.v) + ' + ' + SWIM.M + ' × V → V = ' + sg(-SWIM.m * SWIM.v / SWIM.M, 1) + ' m/s');
      put(a.rc.st === 'ready' ? '▶ 출발하기를 눌러 결과를 확인해요.' : '출발대는 반대 방향으로 ' + f1(Math.abs(a.rc.vL)) + ' m/s로 밀려나요.', a.rc.st === 'ready' ? '#5a6679' : '#0b6b39', a.rc.st === 'ready' ? 700 : 800);
    } else if (sel === 'cannon') {
      put('0 = ' + CANNON.m + ' × ' + CANNON.v + ' + ' + CANNON.M + ' × V → V = ' + sg(-CANNON.m * CANNON.v / CANNON.M, 1) + ' m/s');
      put(a.rc.st === 'ready' ? '▶ 발사를 눌러 결과를 확인해요.' : '대포는 반대 방향으로 ' + f1(Math.abs(a.rc.vL)) + ' m/s로 반동해요.', a.rc.st === 'ready' ? '#5a6679' : '#0b6b39', a.rc.st === 'ready' ? 700 : 800);
    }
  }
  function drawApCol(dt) {
    const a = S.ap, c = a.run, sel = a.sel, g = apGeo();
    const G = g.gy;
    bgData(); beginMain();
    // 배경
    if (sel === 'car') {
      D.sky(0, 0, VW, MH, '#cfe8ff', '#eef7ff'); ctx.fillStyle = '#6b7384'; ctx.fillRect(0, G - 2, VW, MH - G + 2); ctx.fillStyle = '#f5d142';
      for (let i = 0; i < 12; i++) ctx.fillRect(i * (VW / 12) + 10, G + 26, VW / 24, 4);
    } else {
      bgMain(); ctx.fillStyle = '#1f7a4d'; ctx.fillRect(0, G - 2, VW, MH - G + 2); ctx.fillStyle = '#16603c'; ctx.fillRect(0, G - 2, VW, 6);
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(0, G - 2, VW, 3);
    }
    T(16, PHONE ? 24 : 30, APS[sel].name + (sel === 'car' ? ' · 한 덩어리로 합체' : ' · 튕김'), PHONE ? 15 : 18, '#26324a', 'left', 800);
    drawColScene(c, g);
    if (c.st === 'ready') T(VW / 2, PHONE ? 86 : 100, '▶ 충돌 시키기를 눌러 보세요', 15, '#26324a', 'center', 800);
    const nm = (s) => s;
    tagPill(VW / 2 - (PHONE ? 100 : 130), PHONE ? 54 : 62, sel === 'car' ? '승용차 ' + CAR.mA + ' kg' : 'A ' + BALL.m + ' kg', '#3867f4');
    tagPill(VW / 2 + (PHONE ? 100 : 130), PHONE ? 54 : 62, sel === 'car' ? 'SUV ' + CAR.mB + ' kg' : 'B ' + BALL.m + ' kg', '#e2464b');
    parts.update(dt); parts.draw(ctx); endMain();
    drawApData(a);
  }

  /* ---------- 장면 전환·컨트롤 ---------- */
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-cls')) on = S.showCls;
      if (on && n.hasAttribute('data-nocls')) on = !S.showCls;
      if (on && n.hasAttribute('data-pin')) on = S.showPIn;
      if (on && n.hasAttribute('data-vin')) on = S.showVIn;
      if (on && n.hasAttribute('data-sc') && S.rc) on = n.getAttribute('data-sc').split(' ').indexOf(S.rc.scene) >= 0;
      if (on && n.hasAttribute('data-ap') && S.ap) on = n.getAttribute('data-ap').split(' ').indexOf(APS[S.ap.sel].kind) >= 0;
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    const p = S.pr;
    if (p) {
      $$('#pmASeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === p.mA));
      $$('#pmBSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === p.mB));
      $$('#pfSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === p.F));
      $('#bPull').disabled = p.st === 'pull';
      $$('#pmASeg button, #pmBSeg button, #pfSeg button').forEach((b) => (b.disabled = p.st === 'pull'));
    }
    const o = S.co;
    if (o) {
      $$('#cartSeg button').forEach((b) => b.classList.toggle('on', b.dataset.c === o.sel));
      $$('#typeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.t === o.type));
      const m = o.sel === 'A' ? o.mA : o.mB, v = o.sel === 'A' ? o.vA : o.vB;
      const sm = $('#sMass'), sv = $('#sVel');
      if (+sm.value !== m) sm.value = m; if (+sv.value !== v) sv.value = v;
      sm.style.setProperty('--pct', ((m - 0.5) / 2.5 * 100) + '%'); sv.style.setProperty('--pct', ((v + 3) / 6 * 100) + '%');
      $('#oMass').textContent = f1(m) + ' kg'; $('#oVel').textContent = sg(v, 1) + ' m/s';
      $('#lblCart').textContent = o.sel;
      const run = o.run, busy = run.st === 'approach' || run.st === 'hit' || run.st === 'after';
      $('#bColRun').disabled = busy || !run.willHit;
      $('#bColRun').textContent = run.st === 'done' ? '↺ 다시 충돌' : '▶ 충돌 시키기';
      $$('#cartSeg button, #typeSeg button, #sMass, #sVel').forEach((b) => (b.disabled = busy));
    }
    const r = S.rc;
    if (r) {
      $$('#rcSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === r.scene));
      $$('#rcMassSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === r.partner));
      $$('#rcEnvSeg button').forEach((b) => b.classList.toggle('on', b.dataset.e === r.env));
      const busy = r.st === 'go';
      $('#bRcFire').disabled = busy;
      $('#bRcFire').textContent = r.st === 'done' ? '↺ 다시' : r.scene === 'skate' ? '🤝 서로 밀기' : r.scene === 'gun' ? '💥 발사' : r.scene === 'space' ? '🛠️ 공구 던지기' : '🔥 분사하기';
      $$('#rcSeg button, #rcMassSeg button, #rcEnvSeg button').forEach((b) => (b.disabled = busy));
    }
    const a = S.ap;
    if (a) {
      $$('#apSeg button').forEach((b) => b.classList.toggle('on', b.dataset.s === a.sel));
      const sc = APS[a.sel];
      $('#eqQ').textContent = sc.q || '';
      const sel = $('#eqSel');
      if (sc.opts) {
        if (sel.dataset.sc !== a.sel) {
          sel.dataset.sc = a.sel;
          sel.innerHTML = '<option value="">식을 골라 보세요</option>' + sc.opts.map((t, i) => '<option value="' + i + '">' + t + '</option>').join('');
          sel.value = a.eq[a.sel] != null ? a.eq[a.sel] : '';
        }
        sel.classList.toggle('ok', a.eqOK[a.sel] === true); sel.classList.toggle('bad', a.eqOK[a.sel] === false);
      }
      $$('#crSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.n === a.cr.n));
      const busy = (a.run && ['approach', 'hit', 'after'].indexOf(a.run.st) >= 0) || (a.rc && a.rc.st === 'go') || false;
      const runB = $('#bApRun');
      runB.disabled = !!busy;
      runB.textContent = sc.kind === 'cradle' ? (a.cr.st === 'hold' ? '▶ 놓기' : '↺ 다시 들어 올리기') : a.sel === 'swim' ? (a.rc.st === 'done' ? '↺ 다시' : '🏊 출발하기') : a.sel === 'cannon' ? (a.rc.st === 'done' ? '↺ 다시' : '💥 발사') : (a.run.st === 'done' ? '↺ 다시 충돌' : '▶ 충돌 시키기');
    }
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));

  /* ① */
  $$('#pmASeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pr.mA = +b.dataset.v; resetPair(true); }));
  $$('#pmBSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pr.mB = +b.dataset.v; resetPair(true); }));
  $$('#pfSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.pr.F = +b.dataset.v; resetPair(true); }));
  $('#bPull').addEventListener('click', pairGo);
  const CLS = [
    { t: '책상 위 책에 작용하는 <b>중력</b>과 책상이 책을 떠받치는 <b>수직 항력</b>', a: 2 },
    { t: '<b>책이 책상을 누르는 힘</b>과 <b>책상이 책을 떠받치는 힘</b>', a: 1 },
    { t: '<b>지구가 사과를 당기는 힘</b>과 <b>사과가 지구를 당기는 힘</b>', a: 1 },
    { t: '정지한 줄다리기 줄에서 <b>왼쪽 팀이 줄을 당기는 힘</b>과 <b>오른쪽 팀이 줄을 당기는 힘</b>', a: 2 },
  ];
  const clsSel = [];
  (function buildCls() {
    const box = $('#clsRows');
    CLS.forEach((c, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + (i + 1) + '. ' + c.t + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', (i + 1) + '번 두 힘의 관계');
      sel.innerHTML = '<option value="">관계를 골라요</option><option value="1">작용 반작용 (힘의 짝)</option><option value="2">힘의 평형</option>';
      sel.addEventListener('change', () => { S.cls[i] = sel.value; S.clsOK[i] = undefined; sel.classList.remove('ok', 'bad'); Sound.click(); });
      row.appendChild(sel); box.appendChild(row); clsSel.push(sel);
    });
  })();
  function resetCls() { S.cls = {}; S.clsOK = {}; clsSel.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ② */
  $$('#cartSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.co.sel = b.dataset.c; updateCtl(); }));
  $$('#typeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); colSet('type', b.dataset.t); }));
  $('#sMass').addEventListener('input', (e) => { const o = S.co; colSet(o.sel === 'A' ? 'mA' : 'mB', +e.target.value); });
  $('#sVel').addEventListener('input', (e) => { const o = S.co; colSet(o.sel === 'A' ? 'vA' : 'vB', +e.target.value); });
  $('#bColRun').addEventListener('click', colRun);
  $('#bColClear').addEventListener('click', () => { Sound.click(); parts.clear(); resetCol(false); });

  /* ③ */
  $$('#rcSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); gasP.clear(); resetRc(b.dataset.s); }));
  $$('#rcMassSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); resetRc(null, +b.dataset.v); }));
  $$('#rcEnvSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); gasP.clear(); resetRc(null, null, b.dataset.e); }));
  $('#bRcFire').addEventListener('click', () => { if (S.rc.st === 'done') { parts.clear(); gasP.clear(); resetRc(); } else rcFire(); });

  /* ④ */
  $$('#apSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); parts.clear(); S.ap.sel = b.dataset.s; newApRun(); crReset(); updateCtl(); }));
  $('#eqSel').addEventListener('change', (e) => { const a = S.ap; a.eq[a.sel] = e.target.value === '' ? undefined : +e.target.value; a.eqOK[a.sel] = undefined; e.target.classList.remove('ok', 'bad'); Sound.click(); });
  $('#bApRun').addEventListener('click', () => { const a = S.ap, sc = APS[a.sel]; if (sc.kind === 'cradle') { if (a.cr.st === 'hold') crRelease(); else crReset(); } else apRun(); });
  $$('#crSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ap.cr.n = +b.dataset.n; crReset(); }));

  /* ---------- 판독값 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    if (S.mode === 'pair') {
      const p = S.pr;
      L1 = '센서 A'; a = p.st === 'ready' ? '— N' : '→ ' + f1(p.sens) + ' N';
      L2 = '센서 B'; b = p.st === 'ready' ? '— N' : '← ' + f1(p.sens) + ' N';
      L3 = '가속도 A : B'; c = f2(p.F / p.mA) + ' : ' + f2(p.F / p.mB) + ' m/s²';
    } else if (S.mode === 'collide') {
      const o = S.co, r = o.run.rec;
      L1 = '충돌 전 총 p'; a = sg(o.mA * o.vA + o.mB * o.vB, 2) + ' kg·m/s';
      L2 = '충돌 후 총 p'; b = r ? sg(r.pa, 2) + ' kg·m/s' : '—';
      L3 = '운동 에너지 전→후'; c = r ? f2(r.kb) + ' → ' + f2(r.ka) + ' J' : '—';
    } else if (S.mode === 'recoil') {
      const r = S.rc;
      if (r.scene === 'rocket') { L1 = '가스 p (1초)'; a = r.st === 'ready' ? '—' : '−' + sci5(ROCKET_F); L2 = '로켓 p (1초)'; b = r.st === 'ready' ? '—' : '+' + sci5(ROCKET_F); L3 = '합'; c = r.st === 'ready' ? '—' : '0'; }
      else { L1 = '왼쪽 p'; a = r.st === 'ready' ? '0' : sg(-r.Q, 2); L2 = '오른쪽 p'; b = r.st === 'ready' ? '0' : sg(r.Q, 2); L3 = '총 운동량'; c = '0 kg·m/s'; }
    } else {
      const a0 = S.ap;
      L1 = '장면'; a = APS[a0.sel].name.replace(/^[^ ]+ /, '');
      L2 = '식 고르기'; b = APS[a0.sel].opts ? (a0.eqOK[a0.sel] === true ? '정답 ✅' : a0.eq[a0.sel] != null ? '고름' : '아직') : '—';
      L3 = '공기'; c = '—';
      if (a0.sel === 'cradle') { L2 = '들어 올린 공'; b = a0.cr.n + '개'; L3 = '나가는 공'; c = a0.cr.st === 'hold' ? '—' : a0.cr.n + '개'; }
      else { L3 = '진행'; c = (a0.run && a0.run.st !== 'ready') || (a0.rc && a0.rc.st !== 'ready') ? '실행함' : '아직'; }
    }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const pairCombos = () => new Set(S.pr.rows.filter((r) => r.mA !== r.mB).map((r) => r.mA + '|' + r.mB)).size;
  const colRowsOK = () => {
    const keys = new Set(S.co.rows.map((r) => [r.type, r.mA, r.vA, r.mB, r.vB].join('|')));
    return keys;
  };
  const levels = [
    {
      title: '작용과 반작용: 힘은 짝으로 나타나요', short: '작용 반작용', icon: '🤝', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 트럭과 경차가 부딪칠 때 경차가 더 세게 부딪히는 걸까? 총을 쏘면 총은 왜 뒤로 밀릴까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 운동량 p = mv와 충격량 I = FΔt = Δp를 배웠어요. 이번에는 한 물체가 아니라 <b>서로 힘을 주고받는 두 물체</b>를 함께 살펴봐요.</div>' +
        '<p>질량이 다른 두 수레를 줄로 연결하고 서로 당기게 해요. 두 수레에 붙은 <b>힘 센서</b>의 눈금을 비교해 보세요.</p>',
      features: ['pair'],
      setup() { S.showCls = false; S.showPIn = false; S.showVIn = false; resetPair(false); resetCls(); setScene('pair'); },
      recap: '두 물체가 서로에게 작용하는 힘은 크기가 같고 방향이 반대예요(작용 반작용). 이 두 힘은 서로 다른 물체에 하나씩 작용해서 한 물체에 작용하는 힘의 평형과 달라요.',
      summary: '<ul><li><b>뉴턴 제3법칙</b>: 두 물체가 서로에게 작용하는 힘은 <b>크기가 같고 방향이 반대</b>예요. (F₁₂ = −F₂₁)</li><li>작용 반작용은 <b>서로 다른 두 물체에 하나씩</b> 작용해요. → 한 물체에 작용하는 두 힘이 비기는 <b>힘의 평형</b>과 구별해요.</li><li>힘이 같아도 가속도 a = F ÷ m은 질량이 작은 물체가 더 커요.</li><li>큰 트럭이 작은 차를 더 세게 미는 것이 아니에요. 두 힘의 크기는 같아요.</li></ul>',
      missions: [
        {
          title: '질량이 다른 두 수레로 당기기',
          goal: '수레 A와 B의 <b>질량이 서로 다른</b> 조합을 골라 줄을 당기는 실험을 <b>2가지 조합</b>으로 해 보세요.',
          hint: 'A와 B의 질량을 서로 다르게 고르고 ▶ 줄 당기기를 눌러요. 줄이 다 감기면 질량 조합을 바꿔서 한 번 더 해요.',
          setup() { S.showCls = false; setScene('pair'); },
          check: () => pairCombos() >= 2,
          hold: 0.6,
          status: () => '질량이 다른 서로 다른 조합 ' + Math.min(2, pairCombos()) + ' / 2',
          explain: '두 센서의 눈금은 질량에 상관없이 늘 <b>같은 크기</b>(예: 6.0 N)이고 방향은 반대예요. 힘이 같아도 가속도는 a = F ÷ m이라서 가벼운 수레가 더 크게 가속돼요.',
        },
        {
          title: '힘의 짝 찾기', manual: true,
          goal: '네 가지 상황에서 두 힘이 <b>작용 반작용</b>인지 <b>힘의 평형</b>인지 골라 <b>✔ 확인하기</b>를 누르세요.',
          hint: '두 힘이 같은 물체에 작용하면 힘의 평형, 서로 다른 두 물체가 주고받는 힘이면 작용 반작용이에요.',
          setup() { resetCls(); S.showCls = true; setScene('pair'); updateCtl(); },
          check() {
            const miss = CLS.filter((c, i) => !S.cls[i]);
            if (miss.length) return '아직 고르지 않은 상황이 ' + miss.length + '개 있어요.';
            let bad = 0;
            CLS.forEach((c, i) => {
              const ok = +S.cls[i] === c.a;
              if (!ok) bad++;
              if (!ok && S.clsOK[i] !== false) { clsSel[i].classList.remove('ok', 'bad'); void clsSel[i].offsetWidth; clsSel[i].classList.add('bad'); }
              if (ok) { clsSel[i].classList.remove('bad'); clsSel[i].classList.add('ok'); }
              S.clsOK[i] = ok;
            });
            if (bad) return '빨간 칸을 다시 생각해 보세요. 두 힘이 각각 어떤 물체에 작용하는지 확인해요.';
            return true;
          },
          status: () => '고른 상황 ' + CLS.filter((c, i) => S.cls[i]).length + ' / 4',
          explain: '<b>책의 중력과 수직 항력</b>은 둘 다 책 한 개에 작용해서 비기는 <b>힘의 평형</b>이에요. 반면 책이 책상을 누르는 힘과 책상이 책을 떠받치는 힘, 지구와 사과가 서로 당기는 힘은 서로 다른 물체에 하나씩 작용하는 <b>작용 반작용</b>이에요. 정지한 줄에 작용하는 두 팀의 힘은 줄 하나에 작용해서 평형이에요.',
        },
        {
          type: 'quiz', title: '큰 트럭이 더 세게 밀까?',
          goal: '트럭(질량 큼)이 경차(질량 작음)와 정면으로 충돌해요. 충돌하는 동안 두 차가 <b>서로에게 가하는 힘</b>은 어떨까요?',
          setup() { S.showCls = false; setScene('pair'); updateCtl(); },
          choices: ['트럭이 경차를 미는 힘이 더 크다', '두 힘의 크기는 같고 방향은 반대다', '경차가 더 많이 가속되므로 경차가 트럭을 미는 힘이 더 크다', '트럭이 앞으로 움직이고 있으면 트럭의 힘만 작용한다'],
          answer: 1,
          feedback: ['질량이 커도 힘이 더 큰 것은 아니에요. 줄로 당기던 두 센서의 눈금을 떠올려 보세요.', '', '가속도가 큰 것은 맞지만(a = F ÷ m) 그것은 힘이 아니라 질량이 작기 때문이에요. 힘은 같아요.', '충돌하는 동안 두 차는 서로에게 동시에 힘을 가해요. 한쪽만 힘을 주는 일은 없어요.'],
          explain: '두 차는 서로에게 <b>크기가 같고 방향이 반대인 힘</b>을 가해요. 같은 힘이 작용해도 경차는 질량이 작아서 <b>가속도(속도 변화)가 더 커서</b> 더 큰 충격을 느껴요.',
        },
      ],
    },
    {
      title: '일차원 충돌: 총 운동량은 그대로', short: '일차원 충돌', icon: '🎱', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 두 물체가 크기가 같고 방향이 반대인 힘을 주고받는다는 것을 확인했어요. 힘이 작용하는 시간 Δt도 같으니 충격량 FΔt의 크기도 같고 방향은 반대예요. 그러면 <b>두 물체의 운동량 변화 Δp₁ = −Δp₂</b>이고, 총 운동량 p₁ + p₂는 변하지 않을 거예요.</div>' +
        '<p>마찰 없는 트랙에서 두 수레의 질량과 속도를 정해 충돌시키고, <b>충돌 전후의 총 운동량</b>을 속도 센서 값으로 비교해요. 충돌 유형은 <b>합체</b>(한 덩어리)와 <b>튕김</b>(용수철 범퍼)이에요. 오른쪽(+) 방향을 양수로 해요.</p>',
      features: ['collide'],
      setup() { S.showPIn = false; resetCol(false); setScene('collide'); },
      recap: '외력이 없으면 충돌 전후 두 물체의 총 운동량 p₁ + p₂는 같아요. 운동 에너지는 합체에서는 줄어들고, 튕김에서는 그대로일 수 있어요.',
      summary: '<ul><li><b>운동량 보존</b>: 외력이 없을 때 m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′ (총 운동량이 일정)</li><li><b>합체</b>: v′ = (m₁v₁ + m₂v₂) ÷ (m₁ + m₂)</li><li>예) 2.0 kg(+3.0 m/s)가 정지한 1.0 kg에 합체 → v′ = 6.0 ÷ 3.0 = 2.0 m/s, 운동 에너지 9 J → 6 J</li><li>속도는 방향(부호)이 있어서 마주 보는 충돌은 부호를 넣어 더해요. 총 운동량이 0이면 합체 후 멈춰요.</li><li>운동 에너지는 합체에서 줄지만, 튕김에서는 같게 유지될 수 있어요. 운동량은 두 경우 모두 보존돼요.</li></ul>',
      missions: [
        {
          title: '충돌 세 가지 측정하기',
          goal: '질량이나 속도, 충돌 유형을 바꿔 가며 <b>서로 다른 충돌 3가지</b>를 측정하세요. <b>합체와 튕김</b>이 모두 있어야 해요.',
          hint: '수레 A·B를 번갈아 골라 질량과 속도를 바꾸고, 유형도 바꿔 ▶ 충돌 시키기를 눌러요. A의 속도가 B보다 커야 부딪혀요.',
          setup() { S.showPIn = false; setScene('collide'); },
          check: () => { const rs = S.co.rows; return colRowsOK().size >= 3 && rs.some((r) => r.type === 'stick') && rs.some((r) => r.type === 'bounce'); },
          hold: 0.6,
          status: () => { const rs = S.co.rows; return '서로 다른 충돌 ' + Math.min(3, colRowsOK().size) + ' / 3 &nbsp; ' + mark(rs.some((r) => r.type === 'stick')) + '합체 &nbsp; ' + mark(rs.some((r) => r.type === 'bounce')) + '튕김'; },
          explain: '어떤 조합이든 표에서 <b>충돌 전 총 운동량 = 충돌 후 총 운동량</b>이에요. 속도 센서 값을 소수 둘째 자리까지 읽어서 생기는 아주 작은 차이는 측정 오차예요. 운동 에너지는 합체에서 줄고, 튕김에서는 같게 나와요.',
        },
        {
          title: '마주 보는 충돌의 총 운동량', manual: true,
          goal: '<b>A 1.0 kg(+2.0 m/s)</b>와 <b>B 2.0 kg(−1.0 m/s)</b>가 마주 보고 부딪혀 <b>합체</b>하는 충돌을 측정하고, 충돌 후 <b>총 운동량(kg·m/s)</b>을 입력하세요.',
          hint: '오른쪽(+)을 기준으로 B의 속도는 −1.0 m/s예요. 충돌 전 총 운동량 = 1.0 × (+2.0) + 2.0 × (−1.0)을 계산해요. 외력이 없으니 충돌 후에도 같아요.',
          setup() { S.showPIn = true; $('#pInput').value = ''; $('#pInput').classList.remove('bad'); S.lastP = null; setScene('collide'); updateCtl(); },
          check() {
            const hit = () => S.co.rows.some((r) => r.type === 'stick' && r.mA === 1 && r.vA === 2 && r.mB === 2 && r.vB === -1);
            if (!hit()) return '먼저 A 1.0 kg(+2.0 m/s), B 2.0 kg(−1.0 m/s), 유형 합체로 충돌을 측정해요.';
            const v = num($('#pInput').value);
            if (!isFinite(v)) return '충돌 후 총 운동량을 숫자로 입력해요. 0도 숫자예요.';
            if (Math.abs(v) > 0.05) {
              if (S.lastP !== v) { S.lastP = v; $('#pInput').classList.remove('bad'); void $('#pInput').offsetWidth; $('#pInput').classList.add('bad'); }
              return '다시 계산해 보세요. B는 왼쪽(−)으로 움직이니까 운동량이 2.0 × (−1.0) = −2.0 kg·m/s예요. 두 운동량을 부호까지 더해 봐요.';
            }
            $('#pInput').classList.remove('bad'); return true;
          },
          status: () => { const r = S.co.run, ok = r.rec && r.type === 'stick' && r.mA === 1 && r.vA === 2 && r.mB === 2 && r.vB === -1; return mark(S.co.rows.some((x) => x.type === 'stick' && x.mA === 1 && x.vA === 2 && x.mB === 2 && x.vB === -1)) + ' 합체 충돌 측정 &nbsp; 합체 후 속도 센서: ' + (ok ? sg(r.rec.vA2, 2) + ' m/s' : '—'); },
          explain: '충돌 전 총 운동량은 1.0 × (+2.0) + 2.0 × (−1.0) = <b>0</b>이에요. 외력이 없으므로 충돌 후에도 <b>0</b>이고, 합체한 수레는 멈춰요(v′ = 0 ÷ 3.0 = 0). 방향이 반대인 운동량은 서로 상쇄돼요. 이때 운동 에너지 3.0 J은 모두 사라진 것처럼 보이는데, 어디로 갔는지는 다음 차시들에서 다뤄요.',
        },
        {
          type: 'quiz', title: '예상과 측정이 다른 까닭',
          goal: '실제 에어 트랙 실험에서 충돌 후 총 운동량이 계산값보다 <b>조금 작게</b> 측정되었어요. 가장 알맞은 까닭은?',
          setup() { S.showPIn = false; setScene('collide'); updateCtl(); },
          choices: ['충돌할 때 운동량이 열로 바뀌어 없어졌기 때문에', '마찰과 공기 저항 같은 외력이 조금 작용하고, 속도 센서에도 측정 오차가 있기 때문에', '합체한 수레의 질량이 충돌하면서 줄어들기 때문에', '운동량 보존 법칙은 실제 실험에서는 성립하지 않기 때문에'],
          answer: 1,
          feedback: ['열로 바뀌는 것은 운동 에너지의 일부예요. 운동량은 외력이 없으면 보존돼요.', '', '질량은 충돌해도 변하지 않아요.', '법칙은 성립해요. 실제 장치에서 외력과 오차 때문에 값이 조금 달라질 뿐이에요.'],
          explain: '운동량 보존은 <b>외력이 없을 때</b> 성립해요. 실제 장치에서는 마찰과 공기 저항이 조금 작용하고 센서 눈금에도 오차가 있어서 값이 약간 달라져요. 차이가 오차 범위 안이면 운동량이 보존된다고 해석해요. 이 시뮬레이션의 표에도 센서 눈금을 소수 둘째 자리까지 읽어서 생기는 작은 차이가 있어요.',
        },
      ],
    },
    {
      title: '반동과 발사: 정지에서 갈라질 때', short: '반동과 발사', icon: '🚀', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충돌 전후 총 운동량이 보존된다는 것을 확인했어요. 처음에 모두 정지해 있으면 총 운동량은 0이에요. 이 상태에서 <b>서로 밀어 갈라지면</b> 총 운동량은 어떻게 될까요?</div>' +
        '<p>스케이트, 총, 우주 공간의 공구 던지기, 로켓 분사를 비교해요. 운동량 막대가 <b>+와 −로 갈라져도 합은 0</b>으로 유지되는지 보세요.</p>',
      features: ['recoil'],
      setup() { S.showVIn = false; gasP.clear(); resetRc('skate', 40, 'air'); S.rc.done = {}; setScene('recoil'); },
      recap: '처음에 정지해 있던 물체가 갈라지면 두 운동량은 크기가 같고 방향이 반대라서 합이 0이에요. 그래서 질량이 큰 쪽의 속력이 작아요(v ∝ 1/m). 로켓은 공기가 아니라 분사한 가스를 반작용으로 나아가요.',
      summary: '<ul><li>처음 정지 → 총 운동량 0 → 갈라진 뒤에도 <b>0 = m₁v₁ + m₂v₂</b>, 즉 v₁ : v₂ = m₂ : m₁ (질량이 클수록 속력이 작아요)</li><li>스케이트: 60 kg과 40 kg이 밀면 60 kg은 1.0 m/s, 40 kg은 반대로 1.5 m/s</li><li>총: 0.010 kg 탄환이 400 m/s → 4.0 kg 총은 1.0 m/s로 반동</li><li>우주 공간: 80 kg 우주인이 2 kg 공구를 3 m/s로 던지면 반대로 0.075 m/s</li><li>로켓: 분사 가스 50 kg/s × 2000 m/s → 추력 1.0 × 10⁵ N. 가스를 밀어내는 반작용이라 <b>공기가 없어도</b> 나아가요.</li></ul>',
      missions: [
        {
          title: '질량에 따른 속력 비교',
          goal: '60 kg 선수가 <b>40 kg</b> 선수, <b>90 kg</b> 선수와 각각 서로 밀어 헤어지게 해 보세요. 질량이 큰 선수의 속력은 어떤가요?',
          hint: '스케이트 장면에서 상대 선수의 질량을 40 kg, 90 kg으로 바꾸고 🤝 서로 밀기를 눌러요.',
          setup() { S.showVIn = false; resetRc('skate'); setScene('recoil'); },
          check: () => !!(S.rc.done[40] && S.rc.done[90]),
          hold: 0.6,
          status: () => mark(!!S.rc.done[40]) + ' 40 kg &nbsp; ' + mark(!!S.rc.done[90]) + ' 90 kg',
          explain: '총 운동량이 0이므로 두 선수의 운동량은 크기가 같고 방향이 반대예요. 그래서 <b>속력의 비는 질량의 반비율</b>이에요. 60 kg과 40 kg이면 v₁ : v₂ = 40 : 60 = 2 : 3(1.0 m/s와 1.5 m/s), 60 kg과 90 kg이면 3 : 2(1.5 m/s와 1.0 m/s)예요.',
        },
        {
          title: '총의 반동 속력 예측하기', manual: true,
          goal: '4.0 kg 총이 0.010 kg 탄환을 400 m/s로 쏘면 총은 얼마의 <b>속력(m/s)</b>으로 반동할까요? 계산해서 입력하세요.',
          hint: '탄환의 운동량은 0.010 × 400 = 4.0 kg·m/s예요. 총은 같은 크기의 운동량을 반대 방향으로 얻어요. 이 값을 총의 질량으로 나눠요.',
          setup() { S.showVIn = true; $('#vInput').value = ''; $('#vInput').classList.remove('bad'); resetRc('gun'); setScene('recoil'); updateCtl(); },
          check() {
            const v = num($('#vInput').value);
            if (!isFinite(v)) return '총의 반동 속력을 숫자로 입력해요.';
            if (v < 0) { return '속력은 방향이 없는 크기예요. 방향(−)은 속도에서 나타내고, 속력은 0 이상의 값으로 입력해요.'; }
            if (Math.abs(v - 1.0) > 0.05) { if (S.lastV !== v) { S.lastV = v; $('#vInput').classList.remove('bad'); void $('#vInput').offsetWidth; $('#vInput').classList.add('bad'); } return Math.abs(v - 4) < 0.05 ? '4.0은 탄환의 운동량이에요. 총의 속력은 운동량을 총의 질량 4.0 kg으로 나눠야 해요.' : '다시 계산해 보세요. 0 = 4.0 × v + 0.010 × 400에서 총의 속도 v를 구해요.'; }
            $('#vInput').classList.remove('bad'); return true;
          },
          status: () => '발사해서 확인도 해 보세요: ' + (S.rc.scene === 'gun' && S.rc.st !== 'ready' ? '총 ' + sg(S.rc.vL, 2) + ' m/s' : '—'),
          explain: '탄환의 운동량 0.010 × 400 = <b>4.0 kg·m/s</b>이고, 총의 운동량은 반대로 −4.0 kg·m/s예요. 총의 속도 = −4.0 ÷ 4.0 = <b>−1.0 m/s</b>, 즉 반대 방향으로 <b>1.0 m/s</b>로 반동해요.',
        },
        {
          type: 'quiz', title: '우주 공간의 로켓',
          goal: '공기가 없는 우주 공간에서도 로켓이 앞으로 나아가는 까닭은?',
          setup() { S.showVIn = false; resetRc('rocket'); setScene('recoil'); updateCtl(); },
          choices: ['분사한 가스가 주변 공기를 밀어서', '로켓이 가스를 뒤로 밀어내고, 가스가 로켓을 앞으로 미는 반작용을 받아서', '우주 공간에는 중력이 없어서 저절로 가속돼서', '연료가 타면서 질량이 사라지기 때문에'],
          answer: 1,
          feedback: ['공기가 없는 우주에서도 로켓은 나아가요. 공기를 밀어서 가는 것이 아니에요.', '', '중력이 없어도 힘이 없으면 가속되지 않아요. 가속하려면 로켓이 받는 힘이 있어야 해요.', '질량은 사라지지 않아요. 가스로 바뀌어 뒤로 빠져나갈 뿐이에요.'],
          explain: '로켓이 가스를 뒤로 밀어내면, 가스가 로켓을 앞으로 미는 <b>반작용</b>이 생겨요(분사 가스 50 kg/s × 2000 m/s → 추력 1.0 × 10⁵ N). 가스가 얻은 운동량과 로켓이 얻은 운동량은 크기가 같고 방향이 반대여서 총 운동량은 보존돼요.',
        },
      ],
    },
    {
      title: '스포츠·교통·발사체에 적용하기', short: '적용', icon: '🏟️', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 충돌과 반동 모두 총 운동량이 보존된다는 것을 확인했어요. 이제 <b>운동량 보존 식을 직접 세워</b> 교통, 스포츠, 발사체의 결과를 예측해 봐요.</div>' +
        '<p>장면 카드를 골라 상황을 읽고 <b>맞는 식</b>을 고르세요. 오른쪽(+) 방향을 기준으로 속도의 부호를 정확히 넣어야 해요. 식이 맞으면 결과가 예측과 같은지 직접 실행해서 확인해요.</p>',
      features: ['apply'],
      setup() { S.showPIn = false; S.showVIn = false; resetAp('car'); S.ap.eq = {}; S.ap.eqOK = {}; $('#eqSel').dataset.sc = ''; setScene('apply'); },
      recap: '운동량 보존 식은 “충돌(발사) 전 총 운동량 = 후 총 운동량”이에요. 방향이 반대인 속도에는 부호를 넣고, 뉴턴의 요람처럼 운동량과 운동 에너지가 모두 보존되는 경우만 가능해요.',
      summary: '<ul><li>식 세우기: <b>충돌(발사) 전 Σmv = 후 Σmv</b>, 오른쪽(+)·왼쪽(−)을 정해 부호를 넣어요.</li><li>자동차 정면 충돌: 승용차 1000 kg(+15 m/s)와 SUV 2000 kg(−15 m/s) 합체 → v = −5 m/s. 속도 변화는 승용차 20 m/s, SUV 10 m/s라 가벼운 차가 더 큰 충격을 받아요.</li><li>같은 질량의 당구공 정면 탄성 충돌: 속도를 서로 바꿔 가져요. (A 정지, B 2.0 m/s)</li><li>수영 출발대, 대포: 정지 상태에서 갈라지면 0 = m₁v₁ + m₂v₂. 대포 1000 kg이 포탄 10 kg을 200 m/s로 쏘면 −2.0 m/s로 반동해요.</li><li>뉴턴의 요람: 공 n개를 놓으면 n개가 튀어 나가요. 1개가 n배 빠르게 나가면 운동량은 같아도 운동 에너지가 달라서 불가능해요.</li></ul>',
      missions: [
        {
          title: '운동량 보존 식 세우기', manual: true,
          goal: '<b>자동차 · 당구공 · 수영 출발 · 대포</b> 네 장면에서 알맞은 운동량 보존 식을 골라 <b>✔ 확인하기</b>를 누르세요. 장면 카드를 바꿔 가며 골라요.',
          hint: '오른쪽(+)을 기준으로 해요. 왼쪽으로 가는 물체는 속도에 −를 붙이고, 처음 정지해 있다가 갈라지는 경우 왼쪽 변은 0이에요.',
          setup() { setScene('apply'); updateCtl(); },
          check() {
            const miss = EQK.filter((k) => S.ap.eq[k] == null);
            if (miss.length) return '아직 식을 고르지 않은 장면이 ' + miss.length + '개 있어요: ' + miss.map((k) => APS[k].name.replace(/^[^ ]+ /, '')).join(', ');
            const bad = EQK.filter((k) => S.ap.eq[k] !== APS[k].ok);
            EQK.forEach((k) => { S.ap.eqOK[k] = S.ap.eq[k] === APS[k].ok; });
            const cur = $('#eqSel'); cur.classList.toggle('ok', S.ap.eqOK[S.ap.sel] === true); cur.classList.toggle('bad', S.ap.eqOK[S.ap.sel] === false);
            if (bad.length) return '다시 확인해 봐요: ' + bad.map((k) => APS[k].name.replace(/^[^ ]+ /, '')).join(', ') + '. 부호와 어느 물체에 몇 kg이 붙는지 살펴봐요.';
            return true;
          },
          status: () => EQK.map((k) => mark(S.ap.eq[k] != null) + APS[k].name.replace(/^[^ ]+ /, '')).join(' &nbsp; '),
          explain: '<b>자동차</b>: 1000 × 15 + 2000 × (−15) = 3000 v → v = −5 m/s. <b>당구공</b>: m × 2.0 + 0 = m v_A + m v_B(같은 질량이면 A 정지, B 2.0 m/s). <b>수영 출발</b>: 0 = 60 × 2.0 + 120 V → V = −1.0 m/s. <b>대포</b>: 0 = 10 × 200 + 1000 V → V = −2.0 m/s. 정지 상태에서 갈라지는 경우 왼쪽은 0이고, 방향이 반대면 부호가 달라져요.',
        },
        {
          type: 'quiz', title: '뉴턴의 요람',
          goal: '뉴턴의 요람에서 왼쪽 공 <b>2개</b>를 들어 놓았더니 오른쪽에서도 공 <b>2개</b>가 튀어 올랐어요. 공 1개가 2배 빠르게 튀어 오르지 않는 까닭은?',
          setup() { resetAp('cradle'); setScene('apply'); updateCtl(); },
          choices: ['공 1개가 2배 빠르면 운동량이 달라지기 때문에', '공 1개가 2배 빠르면 운동량은 같지만 운동 에너지가 2배가 되어 보존되지 않기 때문에', '공 1개가 2배 빠르면 운동량도 운동 에너지도 모두 같아서 가능하지만 우연히 아닐 뿐이어서', '공은 항상 같은 개수만 움직이도록 정해져 있기 때문에'],
          answer: 1,
          feedback: ['공 1개가 2v로 가도 운동량 m × 2v = 2mv로 같아요. 운동량만으로는 구별할 수 없어요.', '', '운동 에너지는 속력의 제곱에 비례해서 ½m(2v)² = 4 × ½mv²이에요. 2개가 v로 갈 때의 2 × ½mv²와 달라요.', '그런 규칙은 없어요. 운동량과 운동 에너지가 모두 보존되기 때문이에요.'],
          explain: '충돌 전 2개가 v로 움직이면 운동량은 2mv, 운동 에너지는 2 × ½mv²예요. 충돌 후 1개가 2v이면 운동량은 2mv로 같지만 운동 에너지가 ½m(2v)² = 4 × ½mv²로 <b>2배</b>가 돼요. <b>운동량과 운동 에너지가 모두 보존되는 경우는 2개가 v로 나가는 것뿐</b>이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-momentum', mount: '#game', badge: '운동량 박사', homeHref: '../../index.html#hp',
    featureLabels: { pair: '🤝 힘 센서 두 개 · 줄 당기기', collide: '🎱 일차원 충돌 트랙 · 운동량 막대', recoil: '🚀 스케이트 · 총 · 우주 공구 · 로켓', apply: '🏟️ 장면 카드 · 식 고르기 · 뉴턴의 요람' },
    onFeatures() { updateCtl(); },
    levels,
  });

  view.canvas.addEventListener('click', () => {
    if (S.mode === 'pair') pairGo();
    else if (S.mode === 'collide') colRun();
    else if (S.mode === 'recoil') { if (S.rc.st === 'ready') rcFire(); }
    else if (S.mode === 'apply') { const a = S.ap, sc = APS[a.sel]; if (sc.kind === 'cradle') { if (a.cr.st === 'hold') crRelease(); } else apRun(); }
  });

  /* ---------- 시작 ---------- */
  resetPair(false); resetCol(false); resetRc('skate', 40, 'air'); resetAp('car');
  setScene('pair');
  let lastFree = false, lastMode = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    view.apply();
    if (S.mode === 'pair') { stepPair(dt); drawPair(dt); }
    else if (S.mode === 'collide') { stepCol(S.co.run, dt); drawCollide(dt); if (S.co.run.st !== 'ready') updCtlSoon(); }
    else if (S.mode === 'recoil') { stepRc(dt); drawRecoil(dt); }
    else { stepAp(dt); const sc = APS[S.ap.sel]; if (sc.kind === 'cradle') { drawCradle(dt); } else if (sc.kind === 'col') drawApCol(dt); else drawApRc(dt); if (sc.kind === 'cradle' && S.ap.cr.st === 'swing' && S.ap.cr.t > CR_T * 4 && false) crReset(); }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    readouts();
  });
  let lastRunSt = '';
  function updCtlSoon() { const k = S.co.run.st; if (k !== lastRunSt) { lastRunSt = k; updateCtl(); } }

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, resetPair, pairGo, resetCol, colSet, colRun, resetRc, rcFire, resetAp, apRun, crRelease, crReset, makeCol, stepCol, APS, CLS, updateCtl,
    stepAll(sec) {
      const n = Math.ceil(sec / 0.02);
      for (let i = 0; i < n; i++) {
        if (S.mode === 'pair') stepPair(0.02); else if (S.mode === 'collide') stepCol(S.co.run, 0.02); else if (S.mode === 'recoil') stepRc(0.02); else stepAp(0.02);
      }
      updateCtl();
    },
  };
})();
