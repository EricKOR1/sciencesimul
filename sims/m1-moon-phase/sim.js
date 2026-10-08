/* =========================================================
   중1 Ⅶ. 태양계 - 달 모양 탐정
   달의 위상 변화(삭 → 초승달 → 상현달 → 망 → 하현달 → 그믐달)와 일식·월식
   θ : 지구→태양 방향을 0°로 하여 시계 반대 방향(공전 방향)으로 잰 달의 위치 각
       밝게 보이는 부분 = (1 − cos θ) / 2
   ========================================================= */
(function () {
  'use strict';
  const { $, Sound, toast } = SciSim;
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;

  /* ---------- 기하 (두 화면 배치에서 공통, 실제 비율과 다름) ---------- */
  const GEO = { R: 195, rE: 20, rM: 10, h: 14 }; // 궤도 반지름, 지구·달 반지름, 달 위치에서의 지구 본그림자 반폭
  GEO.Lu = GEO.rE * GEO.R / (GEO.rE - GEO.h);    // 지구 본그림자 원뿔의 길이
  // 달의 본그림자(원뿔, 길이 R)가 지구 표면에 닿는 범위 → 일식
  const ZONE_S = Math.asin((GEO.rE + GEO.rM * GEO.rE / GEO.R) / GEO.R) / DEG;
  // 달이 지구 본그림자에 조금이라도 들어가는 범위 → 월식
  const ZONE_L = Math.asin((GEO.h + GEO.rM) / GEO.R) / DEG;
  const TOTAL_S = 1.0;   // 개기 일식으로 보여 줄 범위(°)
  const SNAP = 1.2;      // 일식·월식 모드에서 끌 때 정확한 일직선에 살짝 달라붙는 범위(°)

  const S = {
    theta: 40, playing: false, speed: 2,
    ghost: false, sight: true, eclipse: false,
    dragging: false, target: null, interacted: false,
  };

  const norm = (a) => ((a % 360) + 360) % 360;
  const signed = (a) => { a = norm(a); return a > 180 ? a - 360 : a; };
  const litFrac = (th) => (1 - Math.cos(th * DEG)) / 2;
  const lunarDay = (th) => Math.floor(norm(th) / 360 * 29.5) + 1;
  const inArc = (th, lo, hi) => Math.abs(signed(th - (lo + hi) / 2)) <= (hi - lo) / 2;

  /* ---------- 위상 이름 (허용 범위) ---------- */
  const PH = {
    new:  { name: '삭', short: '삭', sub: '태양 쪽에 있어 보이지 않아요' },
    wxc:  { name: '초승달', short: '초승달', sub: '초저녁 서쪽 하늘에서 보여요' },
    fq:   { name: '상현달', short: '상현달', sub: '저녁 남쪽 하늘에서 보여요' },
    wxg:  { name: '볼록한 달', short: '볼록한 달', sub: '상현달과 보름달 사이' },
    full: { name: '보름달 (망)', short: '보름달(망)', sub: '저녁에 떠서 밤새 보여요' },
    wng:  { name: '볼록한 달', short: '볼록한 달', sub: '보름달과 하현달 사이' },
    lq:   { name: '하현달', short: '하현달', sub: '새벽 남쪽 하늘에서 보여요' },
    wnc:  { name: '그믐달', short: '그믐달', sub: '새벽 동쪽 하늘에서 보여요' },
  };
  function phaseKey(th) {
    th = norm(th);
    if (th < 12 || th >= 348) return 'new';
    if (th < 75) return 'wxc';
    if (th <= 105) return 'fq';
    if (th < 165) return 'wxg';
    if (th <= 195) return 'full';
    if (th < 255) return 'wng';
    if (th <= 285) return 'lq';
    return 'wnc';
  }

  function circleOverlap(r1, r2, d) {
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
    const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
    const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
    const c = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
    return a + b - c;
  }

  /* 일식·월식 상태 (일식·월식 모드일 때만) */
  function eclipseState() {
    if (!S.eclipse) return null;
    const ts = signed(S.theta);
    if (Math.abs(ts) <= ZONE_S) {
      const k = Math.abs(ts) <= TOTAL_S ? 0 : (Math.abs(ts) - TOTAL_S) / (ZONE_S - TOTAL_S);
      const D = 2 * k; // 태양 반지름 단위의 중심 사이 거리 (달과 태양은 하늘에서 크기가 비슷)
      // 삭 이전(θ<0)에는 달이 태양의 서쪽(오른쪽), 이후에는 동쪽(왼쪽)
      return { type: 'solar', ts, D, dir: ts < 0 ? 1 : -1, cover: circleOverlap(1, 1, D) / Math.PI, total: Math.abs(ts) <= TOTAL_S };
    }
    const dl = signed(S.theta - 180);
    const d = Math.abs(GEO.R * Math.sin(dl * DEG));
    if (Math.abs(dl) < 90 && d < GEO.h + GEO.rM) {
      const D = d / GEO.rM, Rs = GEO.h / GEO.rM; // 달 반지름 단위
      // 망 이전에는 달이 그림자의 서쪽(오른쪽) → 그림자는 달의 왼쪽(동쪽 가장자리부터 어두워짐)
      return { type: 'lunar', dl, d, D, Rs, dir: dl < 0 ? -1 : 1, cover: circleOverlap(1, Rs, D) / Math.PI, total: d <= GEO.h - GEO.rM };
    }
    return null;
  }

  /* ---------- 화면 배치 ---------- */
  const LAYOUTS = {
    wide: { vw: 800, vh: 520, reserve: 250, fs: 1, main: { x: 0, y: 0, w: 544, h: 520 }, cx: 266, cy: 258, inset: { x: 552, y: 8, w: 240, h: 504 }, col: true },
    tall: { vw: 520, vh: 752, reserve: 250, fs: 1.2, main: { x: 0, y: 0, w: 520, h: 530 }, cx: 250, cy: 252, inset: { x: 8, y: 536, w: 504, h: 208 }, col: false },
  };
  function insetGeo(L) {
    const I = L.inset;
    if (L.col) {
      const cx = I.x + I.w / 2;
      return {
        tx: cx, ty: I.y + 30, sy: I.y + 48, align: 'center',
        dx: cx, dy: I.y + 154, dr: 70,
        nx: cx, ny: I.y + 286, n2y: I.y + 310, dateY: I.y + 340,
        barX: I.x + 22, barY: I.y + 382, barW: I.w - 44, barLabelY: I.y + 372,
        capY: I.y + 434, stripX: cx - 94.5, stripY: I.y + 462, stripGap: 27, stripR: 11,
      };
    }
    const x0 = I.x + 168;
    return {
      tx: I.x + 16, ty: I.y + 28, sy: I.y + 48, align: 'left',
      dx: I.x + 84, dy: I.y + 132, dr: 56,
      nx: x0, ny: I.y + 92, n2y: I.y + 118, dateY: I.y + 146,
      barX: x0, barY: I.y + 160, barW: 190, barLabelY: null,
      capY: null, stripX: x0 + 10, stripY: I.y + 192, stripGap: 30, stripR: 10,
    };
  }

  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeStars(rect, n, seed) {
    const r = rng(seed), a = [];
    for (let i = 0; i < n; i++) a.push({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, s: 0.5 + r() * 1.1, p: r() * TAU, k: 0.6 + r() * 1.8 });
    return a;
  }

  /* ---------- 그리기 도우미 ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function pill(ctx, text, x, y, o) {
    o = o || {};
    ctx.font = o.font || 'bold 12px ' + FONT;
    const w = ctx.measureText(text).width, h = o.h || 22, pad = o.pad || 9;
    const bx = o.align === 'left' ? x : o.align === 'right' ? x - w - pad * 2 : x - w / 2 - pad;
    ctx.fillStyle = o.bg || 'rgba(6,10,26,.78)';
    roundRect(ctx, bx, y - h / 2, w + pad * 2, h, h / 2); ctx.fill();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + pad, y + 0.5);
    ctx.textBaseline = 'alphabetic';
    return bx + w + pad * 2;
  }
  // 화면 배치별 글자 크기 (세로 배치는 휴대폰용이라 조금 크게)
  const F = (L, px, weight) => (weight ? weight + ' ' : '') + Math.round(px * L.fs) + 'px ' + FONT;
  function sunIcon(ctx, x, y, r) {
    ctx.save();
    ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35); ctx.lineTo(x + Math.cos(a) * r * 1.85, y + Math.sin(a) * r * 1.85); ctx.stroke();
    }
    circle(ctx, x, y, r); ctx.fillStyle = '#ffd36b'; ctx.fill();
    ctx.restore();
  }
  function drawStars(ctx, stars, t, alpha) {
    if (alpha <= 0.01) return;
    stars.forEach((s) => {
      ctx.globalAlpha = alpha * (0.45 + 0.4 * Math.sin(t * s.k + s.p));
      ctx.fillStyle = '#dfe8ff';
      ctx.fillRect(s.x, s.y, s.s * 1.4, s.s * 1.4);
    });
    ctx.globalAlpha = 1;
  }
  function mix(c1, c2, t) {
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const ch = (v, s) => (v >> s) & 255;
    const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
    return 'rgb(' + m(16) + ',' + m(8) + ',' + m(0) + ')';
  }

  /* 지구에서 본 달의 모양: 원점 기준, 오른쪽이 밝은 경우의 밝은 영역 (t: 0~180°) */
  function litPath(ctx, r, t) {
    const c = Math.cos(t * DEG), a = Math.max(0.001, r * Math.abs(c));
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);                      // 위 → 오른쪽 → 아래
    if (c >= 0) ctx.ellipse(0, 0, a, r, 0, Math.PI / 2, -Math.PI / 2, true);  // 명암 경계가 오른쪽으로 볼록 (초승달 꼴)
    else ctx.ellipse(0, 0, a, r, 0, Math.PI / 2, Math.PI * 1.5, false);        // 왼쪽으로 볼록 (볼록한 달 꼴)
    ctx.closePath();
  }
  const CRATERS = [[-0.36, -0.3, 0.17], [0.28, 0.36, 0.13], [0.42, -0.22, 0.1], [-0.08, 0.52, 0.09], [-0.52, 0.22, 0.12], [0.06, -0.06, 0.08], [0.2, -0.55, 0.07]];
  function drawPhase(ctx, x, y, r, th, o) {
    o = o || {};
    th = norm(th);
    circle(ctx, x, y, r);
    ctx.fillStyle = o.dark || '#262d40'; ctx.fill();
    const waxing = th <= 180, t = waxing ? th : 360 - th;
    if (t > 0.4) {
      ctx.save(); ctx.translate(x, y); if (!waxing) ctx.scale(-1, 1);
      litPath(ctx, r, t);
      const g = ctx.createRadialGradient(r * 0.25, -r * 0.25, r * 0.1, 0, 0, r * 1.05);
      g.addColorStop(0, '#fffdf2'); g.addColorStop(1, '#ead58e');
      ctx.fillStyle = g; ctx.fill();
      if (o.craters) {
        ctx.clip(); if (!waxing) ctx.scale(-1, 1);
        ctx.fillStyle = 'rgba(150,128,80,.2)';
        CRATERS.forEach((c) => { circle(ctx, c[0] * r, c[1] * r, c[2] * r); ctx.fill(); });
      }
      ctx.restore();
    }
    circle(ctx, x, y, r);
    ctx.strokeStyle = 'rgba(190,205,240,.38)'; ctx.lineWidth = o.mini ? 1 : 1.5; ctx.stroke();
  }
  /* 위에서 본 달: 태양 쪽(오른쪽) 반이 항상 밝음 */
  function drawMoonTop(ctx, x, y, r, alpha) {
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    circle(ctx, x, y, r); ctx.fillStyle = '#333b52'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.closePath();
    const g = ctx.createLinearGradient(x, y, x + r, y);
    g.addColorStop(0, '#f8e7a8'); g.addColorStop(1, '#fffdf2');
    ctx.fillStyle = g; ctx.fill();
    circle(ctx, x, y, r); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  function drawEarth(ctx, x, y, r) {
    const ag = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.7);
    ag.addColorStop(0, 'rgba(120,180,255,.4)'); ag.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = ag; circle(ctx, x, y, r * 1.7); ctx.fill();
    const og = ctx.createRadialGradient(x + r * 0.45, y - r * 0.2, r * 0.15, x, y, r);
    og.addColorStop(0, '#6cc0ff'); og.addColorStop(1, '#1f5fb6');
    ctx.fillStyle = og; circle(ctx, x, y, r); ctx.fill();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    ctx.fillStyle = '#3fae6a';
    [[0.35, -0.45, 0.32, 0.22], [-0.3, 0.35, 0.36, 0.2], [0.5, 0.45, 0.2, 0.16], [-0.55, -0.35, 0.22, 0.14]].forEach((c) => {
      ctx.beginPath(); ctx.ellipse(x + c[0] * r, y + c[1] * r, c[2] * r, c[3] * r, 0.5, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = 'rgba(3,7,22,.72)'; ctx.fillRect(x - r - 1, y - r - 1, r + 1, r * 2 + 2); // 밤 (태양 반대쪽 반)
    ctx.restore();
    circle(ctx, x, y, r); ctx.strokeStyle = 'rgba(200,225,255,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = 'bold 12px ' + FONT; ctx.textAlign = 'center';
    ctx.fillStyle = '#06325f'; ctx.fillText('낮', x + r * 0.5, y + 4.5);
    ctx.fillStyle = '#d4defc'; ctx.fillText('밤', x - r * 0.5, y + 4.5);
  }

  /* ---------- 메인 화면 (북극 위에서 내려다본 모습) ---------- */
  function moonPos(L, th) {
    th = th == null ? S.theta : th;
    return { x: L.cx + GEO.R * Math.cos(th * DEG), y: L.cy - GEO.R * Math.sin(th * DEG) };
  }
  function drawMain(ctx, L, E, t) {
    const M = L.main, cx = L.cx, cy = L.cy, R = GEO.R, right = M.x + M.w;
    const m = moonPos(L);
    ctx.save();
    ctx.beginPath(); ctx.rect(M.x, M.y, M.w, M.h); ctx.clip();

    const bg = ctx.createRadialGradient(cx, cy, 20, cx, cy, 300);
    bg.addColorStop(0, '#17264f'); bg.addColorStop(0.6, '#0e1838'); bg.addColorStop(1, '#070d1f');
    ctx.fillStyle = bg; ctx.fillRect(M.x, M.y, M.w, M.h);
    drawStars(ctx, L.starsMain, t, 1);

    // 햇빛 (오른쪽에서 들어옴)
    const sg = ctx.createLinearGradient(right - 90, 0, right, 0);
    sg.addColorStop(0, 'rgba(255,196,80,0)'); sg.addColorStop(1, 'rgba(255,200,90,.45)');
    ctx.fillStyle = sg; ctx.fillRect(right - 90, M.y, 90, M.h);
    if (S.eclipse) {
      ctx.strokeStyle = 'rgba(255,214,120,.075)'; ctx.lineWidth = 2;
      for (let y = M.y + 14; y < M.y + M.h; y += 26) { ctx.beginPath(); ctx.moveTo(right - 40, y); ctx.lineTo(M.x, y); ctx.stroke(); }
    }
    ctx.strokeStyle = 'rgba(255,214,110,.85)'; ctx.fillStyle = 'rgba(255,214,110,.85)'; ctx.lineWidth = 2.5;
    [-180, -120, -60, 0, 60, 120, 180].forEach((dy) => {
      const y = cy + dy, x0 = right - 5, x1 = right - 34;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 + 6, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + 9, y - 5); ctx.lineTo(x1 + 9, y + 5); ctx.closePath(); ctx.fill();
    });

    // 공전 궤도와 방향
    ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(160,190,255,.45)'; ctx.lineWidth = 1.5;
    circle(ctx, cx, cy, R); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(170,200,255,.75)';
    for (let k = 0; k < 4; k++) {
      const a = (22.5 + 90 * k) * DEG, px = cx + R * Math.cos(a), py = cy - R * Math.sin(a);
      const tx = -Math.sin(a), ty = -Math.cos(a), nx = Math.cos(a), ny = -Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(px + tx * 8, py + ty * 8);
      ctx.lineTo(px - tx * 5 + nx * 6, py - ty * 5 + ny * 6);
      ctx.lineTo(px - tx * 5 - nx * 6, py - ty * 5 - ny * 6);
      ctx.closePath(); ctx.fill();
    }

    // 힌트 목표 구간
    if (S.target) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.strokeStyle = 'rgba(52,211,153,' + (0.3 + 0.25 * pulse) + ')'; ctx.lineWidth = 26;
      ctx.beginPath(); ctx.arc(cx, cy, R, -S.target.hi * DEG, -S.target.lo * DEG); ctx.stroke();
    }

    // 8개 위치
    if (S.ghost) {
      for (let k = 0; k < 8; k++) {
        const p = moonPos(L, k * 45);
        drawMoonTop(ctx, p.x, p.y, 8, 0.5);
        const a = k * 45 * DEG, lx = cx + (R + 24) * Math.cos(a), ly = cy - (R + 24) * Math.sin(a);
        circle(ctx, lx, ly, 9.5 * L.fs); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = F(L, 12, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(k + 1), lx, ly + 0.5); ctx.textBaseline = 'alphabetic';
      }
    }

    // 그림자 (일식·월식 모드)
    const hw = (x) => GEO.rE * (1 - (cx - x) / GEO.Lu);
    if (S.eclipse) {
      ctx.fillStyle = 'rgba(2,4,12,.8)';
      ctx.beginPath(); ctx.moveTo(cx, cy - GEO.rE); ctx.lineTo(M.x, cy - hw(M.x)); ctx.lineTo(M.x, cy + hw(M.x)); ctx.lineTo(cx, cy + GEO.rE); ctx.closePath(); ctx.fill();
      ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(170,190,255,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx, cy - GEO.rE); ctx.lineTo(M.x, cy - hw(M.x)); ctx.moveTo(cx, cy + GEO.rE); ctx.lineTo(M.x, cy + hw(M.x)); ctx.stroke();
      ctx.setLineDash([]);
      // 달의 본그림자 (길이 ≈ 지구–달 거리)
      ctx.fillStyle = 'rgba(2,4,12,.8)';
      ctx.beginPath(); ctx.moveTo(m.x, m.y - GEO.rM); ctx.lineTo(m.x - R, m.y); ctx.lineTo(m.x, m.y + GEO.rM); ctx.closePath(); ctx.fill();
    }

    // 지구에서 본 모습 연결선
    if (S.sight) {
      const ux = Math.cos(S.theta * DEG), uy = -Math.sin(S.theta * DEG);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(94,234,212,.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx + ux * (GEO.rE + 4), cy + uy * (GEO.rE + 4)); ctx.lineTo(m.x - ux * (GEO.rM + 5), m.y - uy * (GEO.rM + 5)); ctx.stroke();
      ctx.setLineDash([]);
    }

    drawEarth(ctx, cx, cy, GEO.rE);
    if (S.sight) {
      const ux = Math.cos(S.theta * DEG), uy = -Math.sin(S.theta * DEG);
      circle(ctx, cx + ux * GEO.rE, cy + uy * GEO.rE, 3.6); ctx.fillStyle = '#5eead4'; ctx.fill();
    }

    // 일식: 지구 표면의 달 그림자
    if (E && E.type === 'solar') {
      const d = Math.max(-GEO.rE, Math.min(GEO.rE, m.y - cy));
      const sx = cx + Math.sqrt(Math.max(0, GEO.rE * GEO.rE - d * d)), sy = cy + d;
      ctx.save(); circle(ctx, cx, cy, GEO.rE); ctx.clip();
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 9);
      g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; circle(ctx, sx, sy, 9); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,110,110,' + (0.55 + 0.4 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2;
      circle(ctx, sx, sy, 8 + 2 * Math.sin(t * 6)); ctx.stroke();
    }

    // 달
    if (S.dragging || !S.interacted) {
      const rr = GEO.rM + (S.dragging ? 9 : 8 + 2 * Math.sin(t * 4));
      ctx.setLineDash(S.dragging ? [] : [4, 4]);
      ctx.strokeStyle = S.dragging ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      circle(ctx, m.x, m.y, rr); ctx.stroke(); ctx.setLineDash([]);
    }
    drawMoonTop(ctx, m.x, m.y, GEO.rM, 1);
    if (E && E.type === 'lunar') {
      ctx.save(); circle(ctx, m.x, m.y, GEO.rM); ctx.clip();
      ctx.fillStyle = 'rgba(150,40,16,.88)';
      ctx.beginPath(); ctx.moveTo(cx, cy - GEO.rE); ctx.lineTo(M.x, cy - hw(M.x)); ctx.lineTo(M.x, cy + hw(M.x)); ctx.lineTo(cx, cy + GEO.rE); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (S.sight) {
      // 달에서 지구를 향한 반쪽 (지구에서 보이는 쪽)
      const fa = Math.atan2(cy - m.y, cx - m.x);
      ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(m.x, m.y, GEO.rM + 3.5, fa - Math.PI / 2, fa + Math.PI / 2); ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // ----- 글자 -----
    const ph = Math.round(20 * L.fs), pp = Math.round(7 * L.fs);
    if (S.target) {
      const mid = ((S.target.lo + S.target.hi) / 2) * DEG;
      pill(ctx, '🎯 이쯤!', cx + (R - 50) * Math.cos(mid), cy - (R - 50) * Math.sin(mid), { bg: 'rgba(16,128,86,.92)', font: F(L, 12, 'bold'), h: Math.round(22 * L.fs) });
    }
    if (!S.ghost) {
      const a = S.theta * DEG, rr = R + 25 * L.fs;
      pill(ctx, '달', cx + rr * Math.cos(a), cy - rr * Math.sin(a), { h: ph, pad: pp, font: F(L, 12, 'bold'), bg: 'rgba(255,240,190,.92)', color: '#3b3000' });
    }
    const below = !(S.sight && inArc(S.theta, 245, 295));
    const ey = GEO.rE + 8 + ph / 2;
    pill(ctx, '지구', cx, below ? cy + ey : cy - ey, { h: ph, pad: pp, font: F(L, 12, 'bold'), color: '#d6e6ff' });
    if (S.eclipse) {
      pill(ctx, '지구의 그림자', cx - 112, cy + ey, { h: ph, pad: pp, font: F(L, 12, 'bold'), color: '#c3cdea', bg: 'rgba(6,10,26,.6)' });
      if (E && E.type === 'solar') pill(ctx, '달의 그림자', cx + 104, cy - GEO.rM - 6 - ph / 2, { h: ph, pad: pp, font: F(L, 12, 'bold'), color: '#ffd1d1', bg: 'rgba(6,10,26,.75)' });
    }

    ctx.font = F(L, 13, 'bold'); ctx.textAlign = 'left'; ctx.fillStyle = '#d4e2ff';
    ctx.fillText('북극 위에서 내려다본 모습', M.x + 12, M.y + 22 * L.fs);
    ctx.font = F(L, 12); ctx.fillStyle = 'rgba(212,226,255,.62)';
    ctx.fillText('크기와 거리는 실제와 달라요', M.x + 12, M.y + 40 * L.fs);
    ctx.font = F(L, 14, 'bold'); ctx.textAlign = 'right'; ctx.fillStyle = '#ffd36b';
    const sw = ctx.measureText('태양 빛').width;
    ctx.fillText('태양 빛', right - 8, M.y + 24 * L.fs);
    sunIcon(ctx, right - 8 - sw - 12 * L.fs, M.y + 19 * L.fs, 4.5 * L.fs);

    // 아래쪽 알림
    const bh = Math.round(24 * L.fs), by = M.y + M.h - 8 - bh / 2;
    let pr = M.x;
    if (E && E.type === 'solar') pr = pill(ctx, '🌑 일식: 달의 그림자가 지구에 생겼어요', M.x + 10, by, { align: 'left', bg: 'rgba(196,44,64,.92)', font: F(L, 13, 'bold'), h: bh });
    else if (E && E.type === 'lunar') pr = pill(ctx, '🌕 월식: 달이 지구 그림자 속에 들어갔어요', M.x + 10, by, { align: 'left', bg: 'rgba(170,64,28,.92)', font: F(L, 13, 'bold'), h: bh });
    else if (!S.eclipse && (Math.abs(signed(S.theta)) <= ZONE_S + 2 || Math.abs(signed(S.theta - 180)) <= ZONE_L + 2))
      pr = pill(ctx, '💡 궤도가 약 5° 기울어 그림자를 비껴가요', M.x + 10, by, { align: 'left', bg: 'rgba(36,70,140,.92)', font: F(L, 12, 'bold'), h: bh });
    else if (S.eclipse) pr = pill(ctx, '🌑 일식·월식 모드: 그림자가 보여요', M.x + 10, by, { align: 'left', bg: 'rgba(6,10,26,.7)', color: '#c3cdea', font: F(L, 12, 'bold'), h: bh });
    ctx.font = F(L, 12, 'bold'); ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(190,210,255,.85)';
    const lg = '공전 방향', lw = ctx.measureText(lg).width, ir = 5.5 * L.fs;
    if (pr + 12 < right - 16 - lw - ir * 2.5) {
      ctx.fillText(lg, right - 12, by + 4 * L.fs);
      // 시계 반대 방향 화살표 아이콘
      const ix = right - 12 - lw - ir - 7, iy = by;
      const a1 = 0.4 * Math.PI, a2 = a1 - 1.55 * Math.PI;      // 시계 반대 방향으로 그린 호
      ctx.strokeStyle = 'rgba(190,210,255,.85)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(ix, iy, ir, a1, a2, true); ctx.stroke();
      const ex = ix + ir * Math.cos(a2), ey = iy + ir * Math.sin(a2);
      const tx = Math.sin(a2), ty = -Math.cos(a2);              // 진행 방향(접선)
      const hs = 3.6 * L.fs;
      ctx.beginPath();
      ctx.moveTo(ex + tx * hs, ey + ty * hs);
      ctx.lineTo(ex - tx * hs * 0.6 - ty * hs, ey - ty * hs * 0.6 + tx * hs);
      ctx.lineTo(ex - tx * hs * 0.6 + ty * hs, ey - ty * hs * 0.6 - tx * hs);
      ctx.closePath(); ctx.fill();
    }

    ctx.restore();
  }

  /* ---------- 오른쪽 창: 지구(우리나라)에서 본 달 ---------- */
  function drawInset(ctx, L, E, t) {
    const I = L.inset, G = insetGeo(L);
    const solar = E && E.type === 'solar', lunar = E && E.type === 'lunar';
    ctx.save();
    roundRect(ctx, I.x, I.y, I.w, I.h, 14); ctx.clip();
    if (solar) {
      const f = Math.pow(E.cover, 3);
      const g = ctx.createLinearGradient(0, I.y, 0, I.y + I.h);
      g.addColorStop(0, mix('#3f8fe8', '#070c1f', f)); g.addColorStop(1, mix('#9fd0ff', '#16224a', f));
      ctx.fillStyle = g; ctx.fillRect(I.x, I.y, I.w, I.h);
      drawStars(ctx, L.starsInset, t, E.total ? 0.9 : 0);
    } else {
      const g = ctx.createLinearGradient(0, I.y, 0, I.y + I.h);
      g.addColorStop(0, '#0c1636'); g.addColorStop(1, '#1b2d60');
      ctx.fillStyle = g; ctx.fillRect(I.x, I.y, I.w, I.h);
      drawStars(ctx, L.starsInset, t, 0.8);
    }

    // 제목
    ctx.textAlign = G.align;
    ctx.fillStyle = '#fff'; ctx.font = F(L, 15, 'bold');
    ctx.fillText(solar ? '일식! 태양 쪽을 본 모습' : '지구(우리나라)에서 본 달', G.tx, G.ty);
    ctx.fillStyle = solar ? 'rgba(255,255,255,.85)' : '#9fb3e0'; ctx.font = F(L, 12);
    ctx.fillText(solar ? '달의 그림자 속 지역에서 본 하늘' : '북반구에서 바라본 모습', G.tx, G.sy);

    // 달 / 태양
    if (solar) drawSolar(ctx, G.dx, G.dy, G.dr * 0.74, E);
    else {
      if (lunar && E.total) {
        const gg = ctx.createRadialGradient(G.dx, G.dy, G.dr, G.dx, G.dy, G.dr * 1.4);
        gg.addColorStop(0, 'rgba(220,80,40,.35)'); gg.addColorStop(1, 'rgba(220,80,40,0)');
        ctx.fillStyle = gg; circle(ctx, G.dx, G.dy, G.dr * 1.4); ctx.fill();
      } else if (litFrac(S.theta) > 0.02) {
        const gg = ctx.createRadialGradient(G.dx, G.dy, G.dr * 0.9, G.dx, G.dy, G.dr * 1.35);
        gg.addColorStop(0, 'rgba(255,240,190,' + (0.22 * litFrac(S.theta)) + ')'); gg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = gg; circle(ctx, G.dx, G.dy, G.dr * 1.35); ctx.fill();
      }
      drawPhase(ctx, G.dx, G.dy, G.dr, S.theta, { craters: true });
      if (lunar) {
        ctx.save(); circle(ctx, G.dx, G.dy, G.dr); ctx.clip();
        const sx = G.dx + E.dir * E.D * G.dr, Rs = E.Rs * G.dr;
        const g = ctx.createRadialGradient(sx, G.dy, Rs * 0.9, sx, G.dy, Rs * 1.1);
        g.addColorStop(0, 'rgba(130,32,12,.86)'); g.addColorStop(0.6, 'rgba(120,30,12,.78)'); g.addColorStop(1, 'rgba(60,15,6,0)');
        ctx.fillStyle = g; circle(ctx, sx, G.dy, Rs * 1.1); ctx.fill();
        ctx.restore();
      }
    }

    // 이름 · 설명 · 날짜
    const key = phaseKey(S.theta);
    let name = PH[key].name, sub = PH[key].sub;
    if (solar) { name = E.total ? '개기 일식' : '부분 일식'; sub = E.total ? '달이 태양을 완전히 가렸어요' : '달이 태양의 일부를 가렸어요'; }
    if (lunar) { name = E.total ? '개기 월식' : '부분 월식'; sub = E.total ? '지구 그림자 속에서 붉게 보여요' : '달이 지구 그림자에 들어가요'; }
    ctx.textAlign = G.align;
    ctx.fillStyle = solar || lunar ? '#ffb4a2' : '#fff'; ctx.font = Math.round(28 * L.fs) + 'px ' + DISPLAY;
    ctx.fillText(name, G.nx, G.ny);
    ctx.fillStyle = solar ? (E.cover > 0.6 ? '#dbe5ff' : '#0b1a3a') : '#b9c8ee'; ctx.font = F(L, 13);
    ctx.fillText(sub, G.nx, G.n2y);
    ctx.fillStyle = solar && E.cover <= 0.6 ? '#0b1a3a' : '#ffe08a'; ctx.font = F(L, 16, 'bold');
    ctx.fillText('음력 약 ' + lunarDay(S.theta) + '일' + (solar ? ' (삭)' : lunar ? ' (망)' : ''), G.nx, G.dateY);

    // 막대
    const val = solar || lunar ? E.cover : litFrac(S.theta);
    const label = solar ? '태양이 가려진 정도' : lunar ? '지구 그림자에 가려진 정도' : '밝게 보이는 부분';
    const pct = Math.round(val * 100) + '%';
    const darkText = solar && E.cover <= 0.6;
    if (G.barLabelY) {
      ctx.font = F(L, 12); ctx.textAlign = 'left'; ctx.fillStyle = darkText ? '#0b1a3a' : '#c7d3f2';
      ctx.fillText(label, G.barX, G.barLabelY);
      ctx.textAlign = 'right'; ctx.font = F(L, 13, 'bold'); ctx.fillStyle = darkText ? '#0b1a3a' : '#fff';
      ctx.fillText(pct, G.barX + G.barW, G.barLabelY);
    } else {
      ctx.font = F(L, 13, 'bold'); ctx.textAlign = 'left'; ctx.fillStyle = darkText ? '#0b1a3a' : '#fff';
      ctx.fillText((solar ? '가려짐 ' : lunar ? '그림자 ' : '밝은 부분 ') + pct, G.barX + G.barW + 10, G.barY + 11.5);
    }
    ctx.fillStyle = 'rgba(255,255,255,.16)'; roundRect(ctx, G.barX, G.barY, G.barW, 12, 6); ctx.fill();
    if (val > 0.004) {
      const bw = Math.max(12, G.barW * val);
      const bg = ctx.createLinearGradient(G.barX, 0, G.barX + G.barW, 0);
      if (lunar) { bg.addColorStop(0, '#f97354'); bg.addColorStop(1, '#b91c1c'); }
      else if (solar) { bg.addColorStop(0, '#fb923c'); bg.addColorStop(1, '#1e293b'); }
      else { bg.addColorStop(0, '#fde68a'); bg.addColorStop(1, '#facc15'); }
      ctx.fillStyle = bg; roundRect(ctx, G.barX, G.barY, bw, 12, 6); ctx.fill();
    }

    // 한 달 동안의 변화 띠
    if (G.capY) {
      ctx.font = F(L, 12); ctx.textAlign = 'center'; ctx.fillStyle = darkText ? '#0b1a3a' : '#9fb3e0';
      ctx.fillText('음력 1일부터 한 달 동안의 변화 →', G.dx, G.capY);
    }
    const cur = Math.round(norm(S.theta) / 45) % 8;
    for (let k = 0; k < 8; k++) {
      const x = G.stripX + k * G.stripGap;
      drawPhase(ctx, x, G.stripY, G.stripR, k * 45, { mini: true, dark: '#2b3350' });
      if (k === cur) {
        ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 2.2;
        circle(ctx, x, G.stripY, G.stripR + 4); ctx.stroke();
      }
    }
    ctx.restore();
    roundRect(ctx, I.x, I.y, I.w, I.h, 14);
    ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function drawSolar(ctx, cx, y, r, E) {
    // 태양과 달의 가운데를 창 중앙에 두어 두 원판이 창 밖으로 나가지 않게 함
    const x = cx - E.dir * E.D * r / 2;
    if (E.total) {
      const cg = ctx.createRadialGradient(x, y, r * 0.95, x, y, r * 2);
      cg.addColorStop(0, 'rgba(255,255,255,.85)'); cg.addColorStop(0.35, 'rgba(220,235,255,.35)'); cg.addColorStop(1, 'rgba(220,235,255,0)');
      ctx.fillStyle = cg; circle(ctx, x, y, r * 2); ctx.fill();
    } else {
      const gg = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.7);
      gg.addColorStop(0, 'rgba(255,230,140,' + (0.65 * (1 - E.cover) + 0.15) + ')'); gg.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = gg; circle(ctx, x, y, r * 1.7); ctx.fill();
    }
    const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
    g.addColorStop(0, '#fffbe0'); g.addColorStop(0.7, '#ffd54a'); g.addColorStop(1, '#ffa41b');
    ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
    const mx = x + E.dir * E.D * r;
    ctx.fillStyle = '#0a0e1a'; circle(ctx, mx, y, r * 1.01); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.stroke();
  }

  function draw(v, L, E, t) {
    v.clear('#070d1f');
    drawMain(v.ctx, L, E, t);
    drawInset(v.ctx, L, E, t);
  }

  /* ---------- 입력 ---------- */
  const rangeTheta = SciSim.bindRange($('#sTheta'), $('#oTheta'), (v) => v + '°', (v) => { setPlaying(false); setTheta(v); interacted(); });
  SciSim.bindRange($('#sSpeed'), $('#oSpeed'), (v) => '×' + v, (v) => { S.speed = v; });
  function setTheta(a) {
    S.theta = norm(a);
    rangeTheta.set(Math.round(S.theta) % 360);
  }
  const playBtn = $('#playBtn');
  function setPlaying(p) {
    S.playing = p;
    playBtn.innerHTML = p ? '⏸ 정지' : '▶ 공전 재생';
    playBtn.classList.toggle('btn-primary', !p);
    playBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
  }
  playBtn.addEventListener('click', () => { Sound.click(); setPlaying(!S.playing); interacted(); });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); setPlaying(false); setTheta(40); });

  const tGhost = $('#tGhost'), tSight = $('#tSight'), tEcl = $('#tEclipse');
  tGhost.addEventListener('change', () => { Sound.click(); S.ghost = tGhost.checked; });
  tSight.addEventListener('change', () => { Sound.click(); S.sight = tSight.checked; });
  tEcl.addEventListener('change', () => { Sound.click(); S.eclipse = tEcl.checked; });
  function setEclipse(on) { S.eclipse = on; tEcl.checked = on; }

  const hintEl = $('#stageHint');
  function interacted() {
    if (S.interacted) return;
    S.interacted = true; hintEl.classList.add('hide');
  }
  setTimeout(() => hintEl.classList.add('hide'), 7000);

  function attachPointer(v, L) {
    const hitMoon = (p) => { const m = moonPos(L); return Math.hypot(p.x - m.x, p.y - m.y) < 32; };
    const onOrbit = (p) => {
      const M = L.main;
      if (p.x < M.x || p.x > M.x + M.w || p.y < M.y || p.y > M.y + M.h) return false;
      return Math.abs(Math.hypot(p.x - L.cx, p.y - L.cy) - GEO.R) < 28;
    };
    const dragTo = (p) => {
      let a = norm(Math.atan2(L.cy - p.y, p.x - L.cx) / DEG);
      if (S.eclipse) [0, 180].forEach((s) => { if (Math.abs(signed(a - s)) < SNAP) a = s; });
      setTheta(a);
    };
    SciSim.pointer(v, {
      hover: (p) => (hitMoon(p) ? 'grab' : onOrbit(p) ? 'pointer' : null),
      down(p) {
        if (!hitMoon(p) && !onOrbit(p)) return false;
        S.dragging = true; setPlaying(false); interacted(); dragTo(p);
        v.canvas.style.cursor = 'grabbing';
        return true;
      },
      move: dragTo,
      up() { S.dragging = false; v.canvas.style.cursor = 'grab'; },
    });
  }

  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, reserve: L.reserve });
    L.starsMain = makeStars(L.main, 80, k === 'wide' ? 7 : 11);
    L.starsInset = makeStars(L.inset, 34, k === 'wide' ? 23 : 29);
    attachPointer(v, L);
    return { v, L };
  });

  /* ---------- 측정값 ---------- */
  const rTheta = $('#rTheta'), rName = $('#rName'), rDay = $('#rDay'), rLit = $('#rLit');
  const cache = {};
  function put(el, key, html) { if (cache[key] !== html) { cache[key] = html; el.innerHTML = html; } }
  function updateReadouts(E) {
    put(rTheta, 'th', (Math.round(norm(S.theta)) % 360) + '<small>°</small>');
    put(rName, 'nm', E ? (E.type === 'solar' ? '삭 · 일식' : '망 · 월식') : PH[phaseKey(S.theta)].short);
    put(rDay, 'dy', '<small>약 </small>' + lunarDay(S.theta) + '<small>일</small>');
    put(rLit, 'lt', Math.round(litFrac(S.theta) * 100) + '<small>%</small>');
  }

  /* ---------- 퀴즈 그림 (SVG) ---------- */
  function svgLit(cx, cy, r, th) {
    th = norm(th);
    const waxing = th <= 180, t = waxing ? th : 360 - th;
    if (t < 0.5) return '';
    const c = Math.cos(t * DEG), a = (r * Math.abs(c)).toFixed(2);
    const top = cx + ',' + (cy - r), bot = cx + ',' + (cy + r);
    if (waxing) return 'M' + top + ' A' + r + ',' + r + ' 0 0 1 ' + bot + ' A' + a + ',' + r + ' 0 0 ' + (c >= 0 ? 0 : 1) + ' ' + top + ' Z';
    return 'M' + top + ' A' + r + ',' + r + ' 0 0 0 ' + bot + ' A' + a + ',' + r + ' 0 0 ' + (c >= 0 ? 1 : 0) + ' ' + top + ' Z';
  }
  const LITGRAD = (id) => '<radialGradient id="' + id + '" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#fffdf2"/><stop offset="1" stop-color="#e8d18a"/></radialGradient>';
  function svgPhase(cx, cy, r, th, gid) {
    const p = svgLit(cx, cy, r, th);
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#283048" stroke="#9aa8d4" stroke-opacity=".45"/>' + (p ? '<path d="' + p + '" fill="url(#' + gid + ')"/>' : '');
  }
  function svgEarth(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#3b8fe0"/><path d="M' + x + ',' + (y - r) + ' A' + r + ',' + r + ' 0 0 0 ' + x + ',' + (y + r) + ' Z" fill="#040a1f" opacity=".72"/>';
  }
  function svgMoonTop(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#3a4258"/><path d="M' + x + ',' + (y - r) + ' A' + r + ',' + r + ' 0 0 1 ' + x + ',' + (y + r) + ' Z" fill="#fff6d2"/>';
  }
  function svgSunArrows(x0, x1, ys) {
    return ys.map((y) => '<line x1="' + x0 + '" y1="' + y + '" x2="' + (x1 + 6) + '" y2="' + y + '" stroke="#ffd36b" stroke-width="2"/><path d="M' + x1 + ',' + y + ' l8,-4.5 v9 z" fill="#ffd36b"/>').join('');
  }
  const SVG_OPEN = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FONT.replace(/"/g, '') + '\'>';

  const FIG = {};
  FIG.crescent = (function () {
    let s = SVG_OPEN(340, 172, '관측한 달의 모양과 달의 위치 번호 그림') + '<defs>' + LITGRAD('fgA') + '</defs>';
    s += '<rect x="0" y="0" width="128" height="172" rx="12" fill="#14224d"/>';
    s += '<text x="64" y="24" text-anchor="middle" font-size="13" font-weight="700" fill="#d4e2ff">관측한 달</text>';
    s += svgPhase(64, 92, 42, 45, 'fgA');
    s += '<text x="64" y="158" text-anchor="middle" font-size="12" fill="#b9c8ee">초저녁 서쪽 하늘</text>';
    s += '<rect x="136" y="0" width="204" height="172" rx="12" fill="#0e1838"/>';
    const cx = 230, cy = 90, R = 50;
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="#a0beff" stroke-opacity=".5" stroke-dasharray="3 5"/>';
    s += svgSunArrows(336, 318, [40, 90, 140]);
    s += '<text x="334" y="18" text-anchor="end" font-size="12" font-weight="700" fill="#ffd36b">태양 빛</text>';
    s += svgEarth(cx, cy, 10);
    for (let k = 0; k < 8; k++) {
      const a = k * 45 * DEG;
      s += svgMoonTop(+(cx + R * Math.cos(a)).toFixed(1), +(cy - R * Math.sin(a)).toFixed(1), 7);
      const lx = (cx + 67 * Math.cos(a)).toFixed(1), ly = (cy - 67 * Math.sin(a)).toFixed(1);
      s += '<circle cx="' + lx + '" cy="' + ly + '" r="9" fill="#ffffff" fill-opacity=".14" stroke="#ffffff" stroke-opacity=".5"/>';
      s += '<text x="' + lx + '" y="' + (+ly + 4.3) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">' + (k + 1) + '</text>';
    }
    return s + '</svg>';
  })();
  FIG.order = (function () {
    const list = [['(가)', 180], ['(나)', 270], ['(다)', 45], ['(라)', 315], ['(마)', 90]];
    let s = SVG_OPEN(330, 106, '뒤섞인 다섯 가지 달의 모양') + '<defs>' + LITGRAD('fgB') + '</defs>';
    s += '<rect x="0" y="0" width="330" height="106" rx="12" fill="#14224d"/>';
    list.forEach((it, i) => {
      const x = 37 + i * 64;
      s += svgPhase(x, 44, 25, it[1], 'fgB');
      s += '<text x="' + x + '" y="94" text-anchor="middle" font-size="14" font-weight="700" fill="#d4e2ff">' + it[0] + '</text>';
    });
    return s + '</svg>';
  })();
  FIG.evening = (function () {
    let s = SVG_OPEN(320, 172, '해 질 무렵 남쪽 하늘을 바라본 모습');
    s += '<defs><linearGradient id="fgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2c63"/><stop offset=".62" stop-color="#6f5b9b"/><stop offset="1" stop-color="#f6a65f"/></linearGradient>';
    s += '<radialGradient id="fgSun"><stop offset="0" stop-color="#ffe7a3"/><stop offset="1" stop-color="#ff9f43" stop-opacity="0"/></radialGradient>';
    s += '<clipPath id="fgClip"><rect x="0" y="0" width="320" height="172" rx="12"/></clipPath></defs>';
    s += '<g clip-path="url(#fgClip)"><rect x="0" y="0" width="320" height="172" fill="url(#fgSky)"/>';
    s += '<circle cx="288" cy="130" r="34" fill="url(#fgSun)"/><circle cx="288" cy="130" r="15" fill="#ffb347"/>';
    s += '<path d="M0,130 Q160,122 320,130 L320,172 L0,172 Z" fill="#1d3527"/></g>';
    s += '<circle cx="160" cy="58" r="23" fill="#ffffff" fill-opacity=".1" stroke="#fff" stroke-width="2" stroke-dasharray="5 4"/>';
    s += '<text x="160" y="67" text-anchor="middle" font-size="26" font-weight="800" fill="#fff">?</text>';
    s += '<text x="12" y="24" font-size="13" font-weight="700" fill="#fff">음력 7~8일 · 해 질 무렵</text>';
    s += '<text x="24" y="157" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">동</text>';
    s += '<text x="160" y="157" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">남</text>';
    s += '<text x="296" y="157" text-anchor="middle" font-size="15" font-weight="800" fill="#fff">서</text>';
    s += '<text x="244" y="118" text-anchor="middle" font-size="12" font-weight="700" fill="#fff4d6">지는 해</text>';
    return s + '</svg>';
  })();
  FIG.tilt = (function () {
    let s = SVG_OPEN(340, 162, '옆에서 본 지구와 달의 공전 궤도면');
    s += '<defs>' + LITGRAD('fgC') + '<radialGradient id="fgSun2" cx="40%" cy="45%" r="60%"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffb020"/></radialGradient>';
    s += '<clipPath id="fgClip2"><rect x="0" y="0" width="340" height="162" rx="12"/></clipPath></defs>';
    s += '<g clip-path="url(#fgClip2)"><rect x="0" y="0" width="340" height="162" fill="#0e1838"/>';
    s += '<circle cx="334" cy="80" r="34" fill="url(#fgSun2)"/></g>';
    s += '<text x="334" y="30" text-anchor="end" font-size="12" font-weight="700" fill="#ffd36b">태양 쪽</text>';
    s += '<polygon points="170,70 18,73 18,87 170,90" fill="#000" fill-opacity=".55"/>';
    s += '<line x1="12" y1="80" x2="292" y2="80" stroke="#7dd3fc" stroke-width="1.5" stroke-dasharray="6 5"/>';
    s += '<text x="16" y="106" font-size="12" font-weight="700" fill="#7dd3fc">지구 공전 궤도면</text>';
    s += '<line x1="70" y1="47.5" x2="270" y2="112.5" stroke="#fca5a5" stroke-width="1.6"/>';
    s += '<text x="106" y="131" font-size="12" font-weight="700" fill="#fca5a5">달 공전 궤도면</text>';
    s += '<path d="M100,80 A70,70 0 0 1 103.4,58.4" fill="none" stroke="#fff" stroke-width="1.2"/>';
    s += '<text x="97" y="70" text-anchor="end" font-size="12" font-weight="700" fill="#fff">약 5°</text>';
    s += '<polygon points="270,105.5 196,110 196,115 270,119.5" fill="#000" fill-opacity=".45"/>';
    s += svgEarth(170, 80, 10);
    s += svgMoonTop(70, 47.5, 7);
    s += '<text x="70" y="33" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">망</text>';
    s += svgMoonTop(270, 112.5, 7);
    s += '<text x="270" y="137" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">삭</text>';
    s += '<text x="16" y="153" font-size="12" fill="#94a3b8">(기울기는 과장해서 그렸어요)</text>';
    return s + '</svg>';
  })();

  /* ---------- 미션 ---------- */
  function prep(eclipseOn) { setPlaying(false); setEclipse(eclipseOn); }
  function ensureOutside(lo, hi, fallback) { if (inArc(S.theta, lo, hi)) setTheta(fallback); }
  const thetaTxt = () => Math.round(norm(S.theta)) % 360;
  const playNote = () => (S.playing ? '<br>⏸ 공전을 멈추고 달을 놓아 보세요.' : '');
  const nowStatus = () => '지금 달: <b>' + PH[phaseKey(S.theta)].short + '</b> · θ = <b>' + thetaTxt() + '°</b>' + playNote();
  const isPhase = (k) => !S.playing && phaseKey(S.theta) === k;

  const CONCEPT = `
    <h3>🌙 달은 스스로 빛나지 않아요</h3>
    <p>달은 <b>태양 빛을 반사</b>해서 밝게 보여요. 그래서 달은 언제나 태양을 향한 <b>반쪽</b>만 밝아요.</p>
    <h3>🔄 달의 위상 변화</h3>
    <p>달이 지구 둘레를 약 한 달에 한 바퀴씩 <b>공전</b>하면, 밝은 반쪽 중 지구에서 보이는 부분이 달라져요. 이렇게 달의 모양이 바뀌는 것을 <b>달의 위상 변화</b>라고 해요.</p>
    <span class="formula">삭 → 초승달 → 상현달 → 망(보름달) → 하현달 → 그믐달 → 삭</span>
    <ul>
      <li><b>삭</b>(음력 1일 무렵): 태양–달–지구 순서. 밝은 면이 지구 반대쪽을 향해 보이지 않아요.</li>
      <li><b>상현달</b>(음력 7~8일): 오른쪽 반이 밝아요. 저녁에 남쪽 하늘에서 보여요.</li>
      <li><b>망·보름달</b>(음력 15일 무렵): 태양–지구–달 순서. 저녁에 떠서 밤새 보여요.</li>
      <li><b>하현달</b>(음력 22~23일): 왼쪽 반이 밝아요. 새벽에 남쪽 하늘에서 보여요.</li>
      <li>삭에서 다음 삭까지 약 <b>29.5일</b>이 걸려요. 보름달 전에는 <b>오른쪽</b>부터 차오르고, 보름달 뒤에는 <b>왼쪽</b>만 남아요(우리나라 같은 북반구 기준).</li>
    </ul>
    <p class="note">⚠️ 달의 모양은 <b>지구의 그림자 때문에 바뀌는 것이 아니에요!</b> 지구의 그림자는 늘 태양의 반대쪽에 생기므로, 달이 망의 위치에 있을 때만 달에 닿을 수 있어요(월식).</p>
    <h3>🌑 일식과 월식</h3>
    <ul>
      <li><b>일식</b>: 태양–<b>달</b>–지구가 일직선(달이 <b>삭</b>의 위치)일 때 달이 태양을 가리는 현상이에요. 달의 그림자가 생긴 좁은 지역에서만 볼 수 있어요. (개기 일식, 부분 일식)</li>
      <li><b>월식</b>: 태양–<b>지구</b>–달이 일직선(달이 <b>망</b>의 위치)일 때 달이 지구의 그림자 속에 들어가는 현상이에요. 달이 떠 있는 밤인 지역이라면 어디서나 볼 수 있어요. (개기 월식, 부분 월식)</li>
      <li>개기 월식 때 달은 지구 대기를 지나며 굴절된 붉은빛을 받아 <b>붉게</b> 보여요.</li>
    </ul>
    <p class="note">💡 달의 공전 궤도면은 지구의 공전 궤도면에 대해 <b>약 5°</b> 기울어져 있어요. 그래서 삭과 망은 매달 돌아오지만, 대부분은 달이 그림자의 위나 아래로 비껴가 <b>일식과 월식은 매달 일어나지 않아요.</b> (🌑 일식·월식 모드는 달이 지구 공전 궤도면을 지나며 일직선이 되는 경우를 보여 줘요.)</p>
    <p class="note">📏 이 시뮬레이션의 천체 크기와 거리는 실제 비율과 달라요.</p>
  `;

  const game = SciSim.game({
    simId: 'm1-moon-phase',
    mount: '#game',
    concept: CONCEPT,
    badge: '달의 탐정',
    homeHref: '../../index.html#g1',
    onMissionStart() { S.target = null; },
    levels: [
      {
        title: '달 모양 만들기',
        missions: [
          {
            title: '🌕 보름달을 띄워라!',
            goal: '달을 끌어서 지구에서 <b>보름달(망)</b>이 보이게 만들어 보세요. <b>지구(우리나라)에서 본 달</b> 창에서 모양을 확인해요.',
            hint: '보름달은 달의 밝은 반쪽이 지구를 <b>정면으로</b> 향할 때 보여요. 달이 지구를 사이에 두고 태양의 <b>반대편</b>에 있어야 해요. (궤도 위에 초록색으로 표시했어요)',
            target: { lo: 168, hi: 192 },
            setup() { prep(false); ensureOutside(150, 210, 40); },
            check: () => isPhase('full'),
            hold: 0.8,
            status: nowStatus,
            explain: '태양–지구–달 순서로 늘어서면(<b>망</b>) 태양 빛을 받는 달의 밝은 반쪽 <b>전체</b>가 지구를 향해요. 그래서 둥근 <b>보름달</b>이 보여요. 음력 15일 무렵이에요.',
          },
          {
            title: '🌓 오른쪽 반달, 상현달',
            goal: '오른쪽 반이 밝은 반달, <b>상현달</b>을 만들어 보세요.',
            hint: '삭(태양 쪽, θ = 0°)에서 공전 방향(시계 반대 방향)으로 <b>¼ 바퀴</b> 돌린 곳이에요. 태양–지구–달이 직각을 이뤄요.',
            target: { lo: 80, hi: 100 },
            setup() { prep(false); ensureOutside(70, 110, 180); },
            check: () => isPhase('fq'),
            hold: 0.8,
            status: nowStatus,
            explain: '삭에서 시계 반대 방향으로 90°(¼ 바퀴) 공전하면, 달의 밝은 반쪽 중 <b>절반</b>만 지구를 향해요. 그래서 오른쪽 반이 밝은 <b>상현달</b>(음력 7~8일)이 돼요.',
          },
          {
            title: '🌘 새벽의 그믐달',
            goal: '새벽 동쪽 하늘에 뜨는, <b>왼쪽</b>이 가늘게 빛나는 <b>그믐달</b>을 만들어 보세요.',
            hint: '그믐달은 하현달(θ ≈ 270°)을 지나 다시 삭으로 돌아가기 직전의 달이에요.',
            target: { lo: 295, hi: 340 },
            setup() { prep(false); ensureOutside(280, 350, 90); },
            check: () => isPhase('wnc'),
            hold: 0.8,
            status: nowStatus,
            explain: '그믐달은 달이 한 바퀴를 거의 다 돌아 삭에 가까워졌을 때(음력 26~27일 무렵) 보여요. 밝은 반쪽이 거의 지구 반대쪽을 향해서 <b>왼쪽</b>만 가늘게 보이죠. 초승달과 밝은 쪽이 <b>반대</b>예요!',
          },
          {
            type: 'quiz',
            title: '🤔 달은 왜 모양이 바뀔까?',
            goal: '달의 모양이 날마다 바뀌어 보이는 까닭으로 옳은 것은?',
            choices: [
              '지구의 그림자가 달을 가리는 정도가 달라지기 때문',
              '달이 공전하면서, 태양 빛을 받아 밝은 부분이 지구에서 보이는 정도가 달라지기 때문',
              '달이 스스로 내는 빛의 양이 날마다 달라지기 때문',
              '달의 실제 크기가 커졌다 작아졌다 하기 때문',
            ],
            answer: 1,
            feedback: [
              '많은 사람이 이렇게 착각해요! 지구의 그림자는 언제나 태양의 <b>반대쪽</b>에만 생겨요. 초승달·상현달일 때 달은 그림자와 멀리 떨어져 있어요. (🌑 일식·월식 모드를 켜고 확인해 보세요)',
              '',
              '달은 스스로 빛을 내지 못해요. 태양 빛을 <b>반사</b>해서 밝게 보일 뿐이에요.',
              '달의 크기는 변하지 않아요. ‘지구에서 본 달’ 창에서 어두운 부분까지 합치면 늘 같은 크기의 원이에요.',
            ],
            explain: '달은 언제나 태양을 향한 <b>반쪽</b>만 밝아요. 달이 지구 둘레를 공전하면 그 밝은 반쪽 중 지구를 향하는 부분이 달라져 <b>위상</b>(모양)이 바뀌어요. 지구의 그림자가 달을 가리는 것은 <b>월식</b>이라는 다른 현상이에요.',
          },
        ],
      },
      {
        title: '위상 탐정',
        missions: [
          {
            type: 'quiz',
            title: '🔍 사건 ① 초저녁 서쪽 하늘의 달',
            goal: '해가 진 직후 서쪽 하늘에서 왼쪽 그림 같은 달을 발견했어요. 이 달의 <b>이름</b>과 오른쪽 그림에서의 <b>위치</b>를 바르게 짝지은 것은?',
            figure: FIG.crescent,
            setup() { prep(false); },
            choices: ['그믐달 · 8번 위치', '초승달 · 2번 위치', '초승달 · 8번 위치', '그믐달 · 2번 위치'],
            answer: 1,
            feedback: [
              '그믐달은 <b>왼쪽</b>이 가늘게 밝아요. 그림 속 달은 어느 쪽이 밝나요?',
              '',
              '이름은 맞았어요! 하지만 8번 위치의 달은 지구에서 볼 때 <b>왼쪽</b>이 밝아요. 🔢 8개 위치 표시를 켜고 달을 8번에 놓아 보세요.',
              '2번 위치는 맞아요. 그런데 오른쪽이 가늘게 밝은 달의 이름은 무엇일까요?',
            ],
            explain: '2번 위치(삭에서 시계 반대 방향으로 45°)의 달은 밝은 반쪽의 일부만 지구를 향해, <b>오른쪽</b>이 가늘게 빛나는 <b>초승달</b>(음력 3~4일 무렵)로 보여요. 태양을 뒤따라 서쪽으로 지기 때문에 초저녁에 잠깐 보여요.',
          },
          {
            type: 'quiz',
            title: '🔍 사건 ② 뒤죽박죽 달 사진',
            goal: '탐정 수첩의 달 사진 순서가 뒤섞였어요. <b>삭(음력 1일)</b> 이후 한 달 동안 보이는 순서대로 바르게 나열한 것은?',
            figure: FIG.order,
            choices: [
              '(라) → (나) → (가) → (마) → (다)',
              '(다) → (나) → (가) → (마) → (라)',
              '(다) → (마) → (가) → (나) → (라)',
              '(가) → (마) → (다) → (라) → (나)',
            ],
            answer: 2,
            feedback: [
              '순서가 거꾸로예요! 달은 시계 반대 방향으로 공전하며 <b>오른쪽부터</b> 차올라요. ▶ 공전 재생으로 확인해 보세요.',
              '(나)와 (마)의 순서가 바뀌었어요. 보름달 <b>전</b>에는 오른쪽이, <b>뒤</b>에는 왼쪽이 밝아요.',
              '',
              '삭 바로 다음에는 달이 가느다랗게 보이기 시작해요. 보름달은 한 달의 한가운데(음력 15일 무렵)예요.',
            ],
            explain: '(다) 초승달 → (마) 상현달 → (가) 보름달 → (나) 하현달 → (라) 그믐달 순서예요. 보름달까지는 <b>오른쪽</b>부터 점점 차오르고, 보름달 뒤에는 오른쪽부터 줄어들어 <b>왼쪽</b>만 남아요. 이 변화가 약 29.5일마다 되풀이돼요.',
          },
          {
            type: 'quiz',
            title: '🔍 사건 ③ 해 질 녘 남쪽 하늘',
            goal: '음력 <b>7~8일</b>, 해가 질 무렵 <b>남쪽 하늘</b>에 높이 떠 있는 달은 무엇일까요?',
            figure: FIG.evening,
            choices: ['초승달', '하현달', '상현달', '보름달'],
            answer: 2,
            feedback: [
              '초승달은 음력 2~4일 무렵, 초저녁 <b>서쪽</b> 하늘에 낮게 떠 있다가 곧 져요.',
              '하현달은 음력 22~23일 무렵의 달로, 한밤중에 떠서 <b>새벽</b>에 남쪽 하늘에서 보여요. 상현과 하현을 헷갈리지 마세요!',
              '',
              '보름달은 음력 15일 무렵, 해가 질 때 <b>동쪽</b>에서 떠올라요.',
            ],
            explain: '음력 7~8일에는 달이 태양에서 시계 반대 방향으로 약 90° 떨어져 있어요(시뮬레이션에서 θ ≈ 90°, 지구 위쪽). 해 질 무렵 이 달은 <b>남쪽 하늘</b>에 있고, 태양이 있는 서쪽(오른쪽)이 밝은 <b>상현달</b>이에요.',
          },
          {
            title: '🔍 사건 ④ 음력 22~23일의 범인',
            goal: '범인은 <b>음력 22~23일</b>에 나타나는 달! 달을 그 위치에 놓은 뒤 <b>✔ 확인하기</b>를 누르세요. 어떤 모양인지도 관찰해요.',
            manual: true,
            hint: '아래 <b>음력 날짜</b> 측정값을 보면서 달을 돌려 보세요. 보름달(음력 15일)에서 공전 방향으로 ¼ 바퀴 더 가면 돼요.',
            target: { lo: 258, hi: 280 },
            setup() { prep(false); },
            status: () => '지금: 음력 약 <b>' + lunarDay(S.theta) + '일</b> · <b>' + PH[phaseKey(S.theta)].short + '</b>' + playNote(),
            check() {
              if (S.playing) return '⏸ 공전을 멈추고 달을 놓은 뒤 확인해요.';
              const d = lunarDay(S.theta);
              if (d === 22 || d === 23) return true;
              if (d < 22) return '지금은 음력 약 ' + d + '일이에요. 공전 방향(시계 반대 방향)으로 조금 더 돌려 보세요.';
              return '지금은 음력 약 ' + d + '일이에요. 너무 많이 돌렸어요! 조금 되돌려 보세요.';
            },
            explain: '음력 22~23일에는 달이 지구의 아래쪽(θ ≈ 270°)에 있어요. 지구에서 보면 <b>왼쪽 반</b>이 밝은 <b>하현달</b>이에요. 한밤중에 떠서 새벽에 남쪽 하늘에서 보여요.',
          },
        ],
      },
      {
        title: '일식과 월식',
        missions: [
          {
            title: '🌑 태양을 가려라! 일식',
            goal: '<b>🌑 일식·월식 모드</b>가 켜졌어요. 달을 움직여 달의 그림자가 지구에 닿는 <b>일식</b>을 일으켜 보세요.',
            hint: '일식은 달이 태양을 가리는 현상이에요. <b>태양–달–지구</b> 순서로 일직선이 되게 해 보세요.',
            target: { lo: -ZONE_S, hi: ZONE_S },
            setup() { prep(true); ensureOutside(-15, 15, 50); toast('🌑 일식·월식 모드가 켜졌어요'); },
            check: () => { const E = eclipseState(); return !S.playing && !!E && E.type === 'solar'; },
            hold: 1.0,
            status() {
              if (!S.eclipse) return '🌑 <b>일식·월식 모드</b>를 켜 주세요.';
              const E = eclipseState();
              if (E && E.type === 'solar') return '☀ 달의 그림자가 지구에 <b>닿았어요!</b>' + (E.total ? ' (개기 일식)' : ' (부분 일식)') + playNote();
              return '달의 그림자: 지구에 <b>닿지 않음</b> · θ = <b>' + thetaTxt() + '°</b>' + playNote();
            },
            explain: '<b>태양–달–지구</b>가 일직선(달이 <b>삭</b>의 위치)이 되면 달이 태양을 가리고, 달의 그림자가 지구에 생겨요. 그림자가 생긴 <b>좁은 지역</b>에서만 일식을 볼 수 있어요. 태양은 달보다 약 400배 크지만 약 400배 멀리 있어 하늘에서 두 천체가 비슷한 크기로 보여요. 그래서 달이 태양을 완전히 가리는 <b>개기 일식</b>도 일어나요.',
          },
          {
            title: '🌕 붉은 달! 월식',
            goal: '이번엔 달을 <b>지구의 그림자</b> 속으로 넣어 <b>월식</b>을 일으켜 보세요. (도전: 달이 그림자 속에 완전히 들어가는 <b>개기 월식</b>!)',
            hint: '지구의 그림자는 태양의 반대쪽(왼쪽)으로 생겨요. <b>태양–지구–달</b> 순서로 일직선이 되게 해 보세요.',
            target: { lo: 180 - ZONE_L, hi: 180 + ZONE_L },
            setup() { prep(true); ensureOutside(160, 200, 120); },
            check: () => { const E = eclipseState(); return !S.playing && !!E && E.type === 'lunar'; },
            hold: 1.0,
            status() {
              if (!S.eclipse) return '🌑 <b>일식·월식 모드</b>를 켜 주세요.';
              const E = eclipseState();
              if (E && E.type === 'lunar') return '🌕 달이 지구 그림자 속에 들어갔어요!' + (E.total ? ' <b>(개기 월식)</b>' : ' (부분 월식)') + playNote();
              return '달이 지구 그림자 <b>밖</b>에 있어요 · θ = <b>' + thetaTxt() + '°</b>' + playNote();
            },
            explain: '<b>태양–지구–달</b>이 일직선(달이 <b>망</b>의 위치)이 되면 달이 지구의 그림자 속에 들어가 <b>월식</b>이 일어나요. 월식은 달이 떠 있는 밤인 지역이라면 어디서나 볼 수 있어요. 개기 월식 때 달이 사라지지 않고 <b>붉게</b> 보이는 까닭은, 지구 대기를 지나며 꺾인 붉은빛이 달에 닿기 때문이에요.',
          },
          {
            type: 'quiz',
            title: '🧩 일식과 월식, 달은 어디에?',
            goal: '일식과 월식이 일어날 때 달의 위치(위상)를 바르게 짝지은 것은?',
            choices: ['일식 – 망, 월식 – 삭', '일식 – 상현, 월식 – 하현', '일식 – 삭, 월식 – 망', '일식과 월식 모두 – 망'],
            answer: 2,
            feedback: [
              '반대예요! 일식은 <b>달이 태양을 가리는</b> 현상이니, 달이 태양과 같은 방향에 있어야 해요.',
              '상현·하현일 때는 태양–지구–달이 직각을 이뤄서 일직선이 되지 않아요.',
              '',
              '일식 때 달은 태양 쪽에 있어요. 태양 반대편에 있는 보름달이 태양을 가릴 수 있을까요?',
            ],
            explain: '<b>일식</b>: 태양–달–지구 (달이 <b>삭</b>) → 달이 태양을 가려요.<br><b>월식</b>: 태양–지구–달 (달이 <b>망</b>) → 지구의 그림자가 달을 가려요.<br>그래서 일식은 음력 1일 무렵, 월식은 음력 15일 무렵에만 일어날 수 있어요.',
          },
          {
            type: 'quiz',
            title: '🧩 왜 매달 일어나지 않을까?',
            goal: '삭과 망은 매달 돌아오는데, 일식과 월식은 <b>매달 일어나지 않아요</b>. 그 까닭으로 옳은 것은?',
            figure: FIG.tilt,
            choices: [
              '달이 태양보다 훨씬 작기 때문',
              '삭과 망이 1년에 한 번씩만 돌아오기 때문',
              '달이 스스로 빛을 내지 못하기 때문',
              '달의 공전 궤도면이 지구의 공전 궤도면에 대해 약 5° 기울어져 있기 때문',
            ],
            answer: 3,
            feedback: [
              '달은 태양보다 작지만 훨씬 가까워서 하늘에서는 크기가 비슷해 보여요. 크기 때문에 드문 것은 아니에요.',
              '삭과 망은 약 29.5일마다, 즉 <b>매달</b> 돌아와요!',
              '달이 빛을 내지 못하는 것은 위상 변화의 까닭이지, 일식·월식이 드문 까닭은 아니에요.',
              '',
            ],
            explain: '달의 궤도가 약 5° 기울어져 있어서, 대부분의 삭과 망 때 달은 태양–지구를 잇는 직선보다 조금 <b>위나 아래</b>로 지나가 그림자가 비껴가요. 달이 지구 공전 궤도면 근처를 지나면서 동시에 삭이나 망이 될 때만 일식이나 월식이 일어나요. (🌑 일식·월식 모드를 끄고 삭·망 위치에 달을 놓아 보세요!)',
          },
        ],
      },
    ],
  });

  // 💡 힌트를 누르면 궤도 위에 목표 구간을 보여 줌 (엔진에 힌트 이벤트가 없어 클릭을 직접 감지)
  $('#game').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.textContent.indexOf('힌트') < 0) return;
    const m = game.current();
    if (m && m.target) S.target = m.target;
  });

  /* ---------- 시작 ---------- */
  let lastKey = phaseKey(S.theta), lastE = null, lastUI = -1;
  SciSim.loop((dt, t) => {
    if (S.playing) setTheta(S.theta + S.speed * 10 * dt);
    const E = eclipseState();
    const key = phaseKey(S.theta);
    if (key !== lastKey) { if (!S.playing) Sound.tick(); lastKey = key; }
    const et = E ? E.type : null;
    if (et !== lastE) { if (et) Sound.tone(et === 'solar' ? 330 : 262, 0.35, 'sine', 0.08); lastE = et; }
    views.forEach(({ v, L }) => { if (v.canvas.offsetWidth > 0) draw(v, L, E, t); });
    if (t - lastUI > 0.08) { lastUI = t; updateReadouts(E); }
  });
})();
