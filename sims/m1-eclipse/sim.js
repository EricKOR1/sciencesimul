/* =========================================================
   중1 Ⅶ. 태양계 - 일식과 월식  [9과07-04]
   탐구 흐름(4단계):
   ① 관찰: 그림자와 일직선 (본그림자 · 반그림자)
   ② 설명: 일식 — 태양–달–지구(삭), 본그림자 지역은 개기 일식, 반그림자 지역은 부분 일식
   ③ 설명: 월식 — 태양–지구–달(망), 개기 월식 때 붉은 달
   ④ 적용: 매달 일어나지 않는 까닭(궤도 약 5° 기울기, 옆에서 본 모습) + 태양 관측 안전
   θ : 지구→태양 방향을 0°로 하여 시계 반대 방향(공전 방향)으로 잰 달의 위치 각
   모형의 크기·거리·기울기는 실제와 다름(보기 쉽게 과장)
   ========================================================= */
(function () {
  'use strict';
  const { $, Sound, clamp } = SciSim;
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;
  const FONT = '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  const DISPLAY = '"Jua", ' + FONT;

  /* ---------- 모형 기하 (가상 좌표) ---------- */
  const R = 185, RE = 30, RM = 11;  // 달 궤도 반지름, 지구·달 반지름
  const AS = 0.058;                 // 태양의 겉보기 반지름(라디안): 그림자 원뿔의 기울기. 달의 본그림자가 지구에 겨우 닿도록 고름
  const ZT = 56;                    // 궤도 기울기를 반영할 때 삭·망에서 달이 지구 공전 궤도면에서 벗어나는 거리(과장)
  const KS = 0.6;                   // 옆에서 본 모습의 세로 축척
  const SNAP = 1.5;                 // 정확한 일직선(0°, 180°)에 달라붙는 범위(°)
  const OBS = {                     // 관측 지역 (지구 중심 기준, 위쪽이 +)
    A: { x: RE, y: 0 },
    B: { x: RE * Math.cos(35 * DEG), y: RE * Math.sin(35 * DEG) },
  };
  const SPOTS = [45, 135, 225, 315];
  const SPOT_TOL = 25;

  const S = {
    theta: 40, tilt: true,
    dragging: false, target: null, interacted: false,
    spots: false, visit: new Set(),                  // 1단계: 그림자 방향 관찰
    align: false, lined: new Set(), holdKey: null, holdT: 0,  // 1단계: 일직선 두 가지
    sideTask: false, seen: new Set(),                // 4단계: 기울어진 궤도에서 삭·망
  };

  let FEAT = new Set();
  const on = (f) => FEAT.has(f);
  let game = null;
  const isNew = (f) => !!game && game.isNew(f);
  const tiltOn = () => on('tilt') && S.tilt;

  const norm = (a) => ((a % 360) + 360) % 360;
  const signed = (a) => { a = norm(a); return a > 180 ? a - 360 : a; };
  const spotAt = (th) => SPOTS.findIndex((a) => Math.abs(signed(th - a)) <= SPOT_TOL);
  const tiltZ = (th) => (tiltOn() ? -ZT * Math.cos(th * DEG) : 0); // 지구 공전 궤도면 위(+)·아래(−)로 벗어난 거리

  const PH = { new: '삭', wxc: '초승달', fq: '상현달', wxg: '볼록한 달', full: '보름달 (망)', wng: '볼록한 달', lq: '하현달', wnc: '그믐달' };
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

  /* 관측 지역에서 본 태양과 달 (일식) */
  function solarView(o) {
    const th = S.theta * DEG;
    const dx = R * Math.cos(th) - o.x, dy = R * Math.sin(th) - o.y, z = tiltZ(S.theta);
    if (dx <= 0) return { cover: 0, near: false };
    const dist = Math.hypot(dx, dy, z);
    const sIn = Math.atan2(dy, dx), sZ = Math.asin(z / dist);
    const s = Math.hypot(sIn, sZ), aM = Math.asin(RM / dist);
    const cover = circleOverlap(AS, aM, s) / (Math.PI * AS * AS);
    return {
      cover, total: aM >= AS && s <= aM - AS, near: s < (AS + aM) * 1.6,
      ox: -sIn / AS, oy: -sZ / AS, k: aM / AS,   // 태양 반지름 단위: 달의 위치(서쪽 = 오른쪽)와 크기
    };
  }
  /* 지구의 밤 쪽에서 본 달 (월식) */
  function lunarView() {
    const th = S.theta * DEG, along = -R * Math.cos(th);
    if (along <= 0) return { umb: 0, pen: 0, total: false };
    const dy = R * Math.sin(th), z = tiltZ(S.theta), off = Math.hypot(dy, z);
    const U = RE - along * AS, Pn = RE + along * AS;
    const area = Math.PI * RM * RM;
    const dl = signed(S.theta - 180);
    return {
      umb: circleOverlap(RM, U, off) / area, pen: circleOverlap(RM, Pn, off) / area, total: off <= U - RM,
      ox: (dl < 0 ? -1 : 1) * Math.abs(dy) / RM, oy: z / RM, U: U / RM, P: Pn / RM, // 달 반지름 단위: 그림자 중심의 위치와 크기
    };
  }
  /* 달의 그림자가 지구에 닿는가 */
  function moonShadowOnEarth() {
    const th = S.theta * DEG, d = R * Math.cos(th) - RE;
    if (d <= 0) return { pen: false, umb: false };
    const off = Math.hypot(R * Math.sin(th), tiltZ(S.theta));
    return { pen: off < RE + RM + d * AS, umb: off < RE + Math.max(0, RM - d * AS) };
  }
  function state() {
    const A = solarView(OBS.A), B = solarView(OBS.B), Lv = lunarView(), Ms = moonShadowOnEarth();
    const solar = Math.max(A.cover, B.cover) > 0.01;
    return { A, B, Lv, Ms, solar, solarTotal: A.total || B.total, lunar: Lv.umb > 0.01, lunarTotal: Lv.total, penOnly: Lv.umb <= 0.01 && Lv.pen > 0.01 };
  }

  /* ---------- 화면 배치 ----------
     wide: 태블릿 — 왼쪽 위에서 본 모형(+아래 띠), 오른쪽 [낮: 태양 / 밤: 달]
     tall: 휴대폰 — 위아래로 쌓음 */
  const LAYOUTS = {
    wide: {
      vw: 800, vh: 660, fs: 1,
      main: { x: 0, y: 0, w: 540, h: 660 }, cx: 262, cy: 262,
      strip: { x: 8, y: 494, w: 524, h: 158 },
      sunP: { x: 548, y: 8, w: 244, h: 318 }, moonP: { x: 548, y: 334, w: 244, h: 318 },
    },
    tall: {
      vw: 520, vh: 1042, fs: 1.15,
      main: { x: 0, y: 0, w: 520, h: 666 }, cx: 250, cy: 262,
      strip: { x: 8, y: 492, w: 504, h: 166 },
      sunP: { x: 8, y: 674, w: 248, h: 360 }, moonP: { x: 264, y: 674, w: 248, h: 360 },
    },
  };

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
  const fnt = (L, px, weight) => (weight ? weight + ' ' : '') + Math.round(px * L.fs) + 'px ' + FONT;
  function pillWidth(ctx, text, o) { ctx.font = o.font; return ctx.measureText(text).width + (o.pad || 9) * 2; }
  function pill(ctx, text, x, y, o) {
    o = o || {};
    ctx.font = o.font || 'bold 13px ' + FONT;
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
  function starShape(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  function checkMark(ctx, x, y, s) {
    ctx.beginPath(); ctx.moveTo(x - s * 0.5, y); ctx.lineTo(x - s * 0.12, y + s * 0.4); ctx.lineTo(x + s * 0.55, y - s * 0.4); ctx.stroke();
  }
  function drawStars(ctx, stars, t, alpha) {
    stars.forEach((s) => {
      ctx.globalAlpha = alpha * (0.45 + 0.4 * Math.sin(t * s.k + s.p));
      ctx.fillStyle = '#dfe8ff';
      ctx.fillRect(s.x, s.y, s.s * 1.4, s.s * 1.4);
    });
    ctx.globalAlpha = 1;
  }
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 160);
  function newTag(ctx, L, rx, ty) {
    ctx.font = fnt(L, 13, 'bold');
    const tw = ctx.measureText('NEW').width + 16, th = Math.round(22 * L.fs);
    ctx.fillStyle = '#0ea5e9'; roundRect(ctx, rx - tw, ty, tw, th, th / 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NEW', rx - tw / 2, ty + th / 2 + 0.5); ctx.textBaseline = 'alphabetic';
  }
  function newRing(ctx, L, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56,189,248,' + (0.35 + pulse() * 0.6) + ')'; ctx.lineWidth = 4;
    roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 14); ctx.stroke();
    newTag(ctx, L, x + w - 6, Math.max(0, y - Math.round(11 * L.fs)));   // 테두리 위에 걸쳐서 (제목을 가리지 않게)
    ctx.restore();
  }

  /* 지구에서 본 달의 모양 (위상) */
  function litPath(ctx, r, t) {
    const c = Math.cos(t * DEG), a = Math.max(0.001, r * Math.abs(c));
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    if (c >= 0) ctx.ellipse(0, 0, a, r, 0, Math.PI / 2, -Math.PI / 2, true);
    else ctx.ellipse(0, 0, a, r, 0, Math.PI / 2, Math.PI * 1.5, false);
    ctx.closePath();
  }
  const CRATERS = [[-0.36, -0.3, 0.17], [0.28, 0.36, 0.13], [0.42, -0.22, 0.1], [-0.08, 0.52, 0.09], [-0.52, 0.22, 0.12], [0.06, -0.06, 0.08], [0.2, -0.55, 0.07]];
  function drawPhase(ctx, x, y, r, th) {
    th = norm(th);
    circle(ctx, x, y, r);
    ctx.fillStyle = '#262d40'; ctx.fill();
    const waxing = th <= 180, t = waxing ? th : 360 - th;
    if (t > 0.4) {
      ctx.save(); ctx.translate(x, y); if (!waxing) ctx.scale(-1, 1);
      litPath(ctx, r, t);
      const g = ctx.createRadialGradient(r * 0.25, -r * 0.25, r * 0.1, 0, 0, r * 1.05);
      g.addColorStop(0, '#fffdf2'); g.addColorStop(1, '#ead58e');
      ctx.fillStyle = g; ctx.fill();
      ctx.clip(); if (!waxing) ctx.scale(-1, 1);
      ctx.fillStyle = 'rgba(150,128,80,.2)';
      CRATERS.forEach((c) => { circle(ctx, c[0] * r, c[1] * r, c[2] * r); ctx.fill(); });
      ctx.restore();
    }
    circle(ctx, x, y, r);
    ctx.strokeStyle = 'rgba(190,205,240,.38)'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  /* 위에서 본 달: 태양 쪽(오른쪽) 반이 밝음 */
  function drawMoonTop(ctx, x, y, r) {
    circle(ctx, x, y, r); ctx.fillStyle = '#333b52'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2); ctx.closePath();
    const g = ctx.createLinearGradient(x, y, x + r, y);
    g.addColorStop(0, '#f8e7a8'); g.addColorStop(1, '#fffdf2');
    ctx.fillStyle = g; ctx.fill();
    circle(ctx, x, y, r); ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  function drawEarth(ctx, L, x, y, r) {
    const ag = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.5);
    ag.addColorStop(0, 'rgba(120,180,255,.35)'); ag.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = ag; circle(ctx, x, y, r * 1.5); ctx.fill();
    const og = ctx.createRadialGradient(x + r * 0.45, y - r * 0.2, r * 0.15, x, y, r);
    og.addColorStop(0, '#6cc0ff'); og.addColorStop(1, '#1f5fb6');
    ctx.fillStyle = og; circle(ctx, x, y, r); ctx.fill();
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    ctx.fillStyle = '#3fae6a';
    [[0.35, -0.45, 0.32, 0.22], [-0.3, 0.35, 0.36, 0.2], [0.5, 0.45, 0.2, 0.16], [-0.55, -0.35, 0.22, 0.14]].forEach((c) => {
      ctx.beginPath(); ctx.ellipse(x + c[0] * r, y + c[1] * r, c[2] * r, c[3] * r, 0.5, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = 'rgba(3,7,22,.72)'; ctx.fillRect(x - r - 1, y - r - 1, r + 1, r * 2 + 2);
    ctx.restore();
    circle(ctx, x, y, r); ctx.strokeStyle = 'rgba(200,225,255,.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#06325f'; ctx.fillText('낮', x + r * 0.45, y + 1);
    ctx.fillStyle = '#d4defc'; ctx.fillText('밤', x - r * 0.45, y + 1);
    ctx.textBaseline = 'alphabetic';
  }
  // 그림자 원뿔: (x, y)에서 왼쪽(태양 반대쪽)으로, 시작 반폭 r0, 거리 d에서 반폭 r0 + sgn·d·AS
  function cone(ctx, x, y, r0, sgn, len) {
    const end = sgn < 0 ? Math.min(len, r0 / AS) : len;
    const w = Math.max(0, r0 + sgn * end * AS);
    ctx.beginPath(); ctx.moveTo(x, y - r0); ctx.lineTo(x - end, y - w); ctx.lineTo(x - end, y + w); ctx.lineTo(x, y + r0); ctx.closePath();
  }

  /* ---------- 위에서 본 모형 ---------- */
  function moonPos(L, th) {
    th = th == null ? S.theta : th;
    return { x: L.cx + R * Math.cos(th * DEG), y: L.cy - R * Math.sin(th * DEG) };
  }
  function drawSpots(ctx, L, t) {
    SPOTS.forEach((a, k) => {
      const p = moonPos(L, a), done = S.visit.has(k);
      const q = { x: L.cx + (R + 34) * Math.cos(a * DEG), y: L.cy - (R + 34) * Math.sin(a * DEG) };
      ctx.save();
      if (done) {
        ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2.5; circle(ctx, p.x, p.y, 19); ctx.stroke();
        ctx.fillStyle = '#10b981'; circle(ctx, q.x, q.y, 11 * L.fs); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        checkMark(ctx, q.x, q.y, 11 * L.fs);
      } else {
        ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,224,130,' + (0.45 + 0.4 * Math.sin(t * 4 + k)) + ')'; ctx.lineWidth = 2.5;
        circle(ctx, p.x, p.y, 19); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,214,90,.9)'; starShape(ctx, q.x, q.y, 9 * L.fs); ctx.fill();
      }
      ctx.restore();
    });
  }
  function drawTop(ctx, L, st, t) {
    const M = L.main, cx = L.cx, cy = L.cy, right = M.x + M.w, fs = L.fs;
    const top = { x: M.x, y: M.y, w: M.w, h: L.strip.y - 6 - M.y };
    const m = moonPos(L);
    ctx.save();
    ctx.beginPath(); ctx.rect(top.x, top.y, top.w, top.h); ctx.clip();

    // 햇빛
    const sg = ctx.createLinearGradient(right - 90, 0, right, 0);
    sg.addColorStop(0, 'rgba(255,196,80,0)'); sg.addColorStop(1, 'rgba(255,200,90,.45)');
    ctx.fillStyle = sg; ctx.fillRect(right - 90, top.y, 90, top.h);
    ctx.strokeStyle = 'rgba(255,214,110,.85)'; ctx.fillStyle = 'rgba(255,214,110,.85)'; ctx.lineWidth = 2.5;
    for (let dy = -180; dy <= 180; dy += 60) {
      const y = cy + dy, x0 = right - 5, x1 = right - 34;
      if (y < top.y + 48 || y > top.y + top.h - 14) continue;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 + 6, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + 9, y - 5); ctx.lineTo(x1 + 9, y + 5); ctx.closePath(); ctx.fill();
    }

    // 궤도
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
    if (S.target) {
      const p = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.strokeStyle = 'rgba(52,211,153,' + (0.3 + 0.25 * p) + ')'; ctx.lineWidth = 26;
      ctx.beginPath(); ctx.arc(cx, cy, R, -S.target.hi * DEG, -S.target.lo * DEG); ctx.stroke();
    }
    if (S.spots) drawSpots(ctx, L, t);

    // 지구의 그림자 (반그림자 → 본그림자)
    const far = cx - top.x;
    ctx.fillStyle = 'rgba(0,0,0,.32)'; cone(ctx, cx, cy, RE, 1, far); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.62)'; cone(ctx, cx, cy, RE, -1, far); ctx.fill();
    // 달의 그림자 (기울기 때문에 지구를 비껴가면 흐리게)
    const tz = Math.abs(tiltZ(S.theta)), fade = tiltOn() && Math.cos(S.theta * DEG) > 0 && tz > RE ? 0.45 : 1;
    ctx.fillStyle = 'rgba(0,0,0,' + 0.32 * fade + ')'; cone(ctx, m.x, m.y, RM, 1, 2 * R); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,' + 0.7 * fade + ')'; cone(ctx, m.x, m.y, RM, -1, 2 * R); ctx.fill();

    drawEarth(ctx, L, cx, cy, RE);
    // 지구에 생긴 달의 그림자
    if (st.Ms.pen) {
      ctx.save(); circle(ctx, cx, cy, RE); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,.38)'; cone(ctx, m.x, m.y, RM, 1, 2 * R); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.85)'; cone(ctx, m.x, m.y, RM, -1, 2 * R); ctx.fill();
      ctx.restore();
    }
    // 관측 지역 A · B
    if (on('places')) {
      [['A', OBS.A, st.A], ['B', OBS.B, st.B]].forEach(([k, o, v]) => {
        const px = cx + o.x, py = cy - o.y, ang = Math.atan2(o.y, o.x);
        const lx = cx + (RE + 14 * fs) * Math.cos(ang), ly = cy - (RE + 14 * fs) * Math.sin(ang);
        circle(ctx, px, py, 3.5); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(lx - 6 * Math.cos(ang), ly + 6 * Math.sin(ang)); ctx.stroke();
        circle(ctx, lx, ly, 10 * fs); ctx.fillStyle = v.total ? '#e11d48' : v.cover > 0.01 ? '#f97316' : 'rgba(14,30,70,.92)'; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = fnt(L, 13, 'bold'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(k, lx, ly + 0.5); ctx.textBaseline = 'alphabetic';
      });
    }

    // 달
    if (S.dragging || !S.interacted) {
      const rr = RM + (S.dragging ? 9 : 8 + 2 * Math.sin(t * 4));
      ctx.setLineDash(S.dragging ? [] : [4, 4]);
      ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 2;
      circle(ctx, m.x, m.y, rr); ctx.stroke(); ctx.setLineDash([]);
    }
    drawMoonTop(ctx, m.x, m.y, RM);
    if (st.Lv.pen > 0.01) {
      // 지구의 그림자 속에 들어간 달
      ctx.save(); circle(ctx, m.x, m.y, RM); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,.35)'; cone(ctx, cx, cy, RE, 1, far); ctx.fill();
      if (st.Lv.umb > 0.01) { ctx.fillStyle = 'rgba(150,40,16,.85)'; cone(ctx, cx, cy, RE, -1, far); ctx.fill(); }
      ctx.restore();
    }

    // 글자
    const ph = Math.round(20 * fs), pp = Math.round(7 * fs);
    if (S.target) {
      const mid = ((S.target.lo + S.target.hi) / 2) * DEG;
      pill(ctx, '🎯 이쯤!', cx + (R - 52) * Math.cos(mid), cy - (R - 52) * Math.sin(mid), { bg: 'rgba(16,128,86,.92)', font: fnt(L, 13, 'bold'), h: Math.round(22 * fs) });
    }
    if (!S.spots) { const a = S.theta * DEG, rr = R + 26 * fs; pill(ctx, '달', cx + rr * Math.cos(a), cy - rr * Math.sin(a), { h: ph, pad: pp, font: fnt(L, 13, 'bold'), bg: 'rgba(255,240,190,.92)', color: '#3b3000' }); }
    pill(ctx, '지구', cx, cy + RE + 10 + ph / 2, { h: ph, pad: pp, font: fnt(L, 13, 'bold'), color: '#d6e6ff' });
    pill(ctx, '지구의 그림자', cx - 128 * fs, cy + 50 * fs, { h: ph, pad: pp, font: fnt(L, 13, 'bold'), color: '#c3cdea', bg: 'rgba(6,10,26,.66)' });
    if (Math.cos(S.theta * DEG) > 0.35) {
      const lx = m.x - 70, ly = m.y + (m.y > cy ? 32 : -32) * fs;
      pill(ctx, '달의 그림자', lx, ly, { h: ph, pad: pp, font: fnt(L, 13, 'bold'), color: '#ffd1d1', bg: 'rgba(6,10,26,.72)' });
    }
    ctx.font = fnt(L, 14, 'bold'); ctx.textAlign = 'left'; ctx.fillStyle = '#d4e2ff';
    ctx.fillText('북극 위에서 내려다본 모습', M.x + 12, M.y + 24 * fs);
    ctx.font = fnt(L, 13); ctx.fillStyle = 'rgba(212,226,255,.66)';
    ctx.fillText('크기와 거리는 실제와 달라요', M.x + 12, M.y + 43 * fs);
    ctx.font = fnt(L, 15, 'bold'); ctx.textAlign = 'right'; ctx.fillStyle = '#ffd36b';
    const sw = ctx.measureText('태양 빛').width;
    ctx.fillText('태양 빛', right - 8, M.y + 25 * fs);
    sunIcon(ctx, right - 8 - sw - 12 * fs, M.y + 20 * fs, 4.5 * fs);
    if (tiltOn() && (Math.abs(signed(S.theta)) < 20 || Math.abs(signed(S.theta - 180)) < 20)) {
      pill(ctx, '📐 실제로는 그림자의 위·아래로 비껴가요', M.x + 10, top.y + top.h - 16 * fs, { align: 'left', h: Math.round(26 * fs), font: fnt(L, 13, 'bold'), bg: 'rgba(36,70,140,.92)' });
    }
    if (!S.interacted && !S.dragging) {
      const txt = '👆 달을 끌어서 옮겨 보세요', o = { font: fnt(L, 14, 'bold'), h: Math.round(28 * fs), pad: 11, bg: 'rgba(14,165,233,.94)' };
      const w = pillWidth(ctx, txt, o);
      pill(ctx, txt, clamp(m.x, M.x + w / 2 + 8, right - w / 2 - 8), m.y + (m.y < cy ? 44 : -44) * fs, o);
    }
    ctx.restore();
  }

  /* ---------- 아래 띠: 그림자 안내(1~3단계) / 옆에서 본 모습(4단계) ---------- */
  function statusLine(st) {
    if (st.solar) return [on('places') ? '☀️ 태양–달–지구 일직선: 일식!' : '☀️ 달의 그림자가 지구에 닿았어요!', '#fca5a5'];
    if (st.Ms.pen) return ['☀️ 달의 그림자가 지구에 살짝 닿았어요', '#fdba74'];
    if (st.lunar) return [on('lunar') ? '🌕 태양–지구–달 일직선: 월식!' : '🌕 달이 지구의 본그림자 속에 들어갔어요!', '#fca5a5'];
    if (st.penOnly) return ['🌕 달이 지구의 반그림자 속에 (조금 어두워져요)', '#fdba74'];
    return ['그림자가 다른 천체에 닿지 않아요', '#c7d3f2'];
  }
  function drawLegend(ctx, L, st) {
    const B = L.strip, fs = L.fs, x = B.x + 16;
    ctx.textAlign = 'left'; ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = '#e6eeff';
    ctx.fillText('🔦 그림자 안내', x, B.y + 26 * fs);
    const row = (y, a, label, desc) => {
      roundRect(ctx, x, y - 13 * fs, 30 * fs, 16 * fs, 4); ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fill();
      ctx.strokeStyle = 'rgba(190,205,240,.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = '#fff'; ctx.fillText(label, x + 40 * fs, y);
      const lw = ctx.measureText(label).width;
      ctx.font = fnt(L, 13); ctx.fillStyle = '#c7d3f2'; ctx.fillText(desc, x + 40 * fs + lw + 8, y);
    };
    row(B.y + 58 * fs, 0.85, '본그림자', '햇빛이 완전히 가려진 곳');
    row(B.y + 86 * fs, 0.4, '반그림자', '햇빛이 일부만 가려진 곳');
    const s = statusLine(st);
    ctx.font = fnt(L, 15, 'bold'); ctx.fillStyle = s[1];
    ctx.fillText(s[0], x, B.y + 126 * fs);
  }
  function drawSide(ctx, L, st, t) {
    const B = L.strip, fs = L.fs, ey = B.y + B.h * 0.56, x0 = L.cx;
    const P = (th) => ({ x: x0 + R * Math.cos(th * DEG), y: ey - KS * tiltZ(th) });
    // 태양
    const sx = B.x + B.w + 34, sr = 62;
    const sg = ctx.createRadialGradient(sx, ey, sr * 0.6, sx, ey, sr * 1.5);
    sg.addColorStop(0, 'rgba(255,214,110,.5)'); sg.addColorStop(1, 'rgba(255,214,110,0)');
    ctx.fillStyle = sg; circle(ctx, sx, ey, sr * 1.5); ctx.fill();
    ctx.fillStyle = '#ffc23a'; circle(ctx, sx, ey, sr); ctx.fill();
    // 지구 공전 궤도면
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(125,211,252,.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(B.x + 4, ey); ctx.lineTo(sx - sr - 4, ey); ctx.stroke(); ctx.setLineDash([]);
    // 지구의 그림자 (세로 축척 KS)
    const far = x0 - B.x;
    const band = (sgn, a) => {
      const w = Math.max(0, RE + sgn * far * AS) * KS;
      ctx.fillStyle = 'rgba(0,0,0,' + a + ')';
      ctx.beginPath(); ctx.moveTo(x0, ey - RE * KS); ctx.lineTo(B.x, ey - w); ctx.lineTo(B.x, ey + w); ctx.lineTo(x0, ey + RE * KS); ctx.closePath(); ctx.fill();
    };
    band(1, 0.3); band(-1, 0.55);
    // 달의 공전 궤도
    const p0 = P(0), p180 = P(180);
    ctx.strokeStyle = 'rgba(252,165,165,.95)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(p180.x, p180.y); ctx.lineTo(p0.x, p0.y); ctx.stroke();
    // 달과 그림자
    const mp = P(S.theta), c = Math.cos(S.theta * DEG), rm = RM * KS;
    if (c > 0.3) {
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.beginPath(); ctx.moveTo(mp.x, mp.y - rm); ctx.lineTo(mp.x - R - 10, mp.y); ctx.lineTo(mp.x, mp.y + rm); ctx.closePath(); ctx.fill();
    }
    const behind = Math.sin(S.theta * DEG) > 0.05;
    const moon = () => {
      drawMoonTop(ctx, mp.x, mp.y, rm);
      if (st.lunar) { ctx.fillStyle = 'rgba(170,50,20,.8)'; circle(ctx, mp.x, mp.y, rm); ctx.fill(); }
    };
    if (behind) moon();
    const er = RE * KS;
    const og = ctx.createRadialGradient(x0 + er * 0.4, ey - er * 0.2, er * 0.1, x0, ey, er);
    og.addColorStop(0, '#6cc0ff'); og.addColorStop(1, '#1f5fb6');
    ctx.fillStyle = og; circle(ctx, x0, ey, er); ctx.fill();
    ctx.save(); circle(ctx, x0, ey, er); ctx.clip(); ctx.fillStyle = 'rgba(3,7,22,.65)'; ctx.fillRect(x0 - er - 1, ey - er - 1, er + 1, 2 * er + 2); ctx.restore();
    if (st.Ms.pen) { ctx.strokeStyle = 'rgba(255,110,110,' + (0.55 + 0.4 * Math.sin(t * 6)) + ')'; ctx.lineWidth = 2; circle(ctx, x0 + er * 0.75, ey, 5); ctx.stroke(); }
    if (!behind) moon();
    // 글자
    ctx.textAlign = 'left'; ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = '#fff';
    ctx.fillText('📐 옆에서 본 모습', B.x + 14, B.y + 24 * fs);
    ctx.font = fnt(L, 13); ctx.fillStyle = tiltOn() ? '#fdba74' : '#9fb3e0';
    ctx.fillText(tiltOn() ? '달 궤도 약 5° 기울어짐 (과장)' : '기울기 없는 단순 모형', B.x + 14, B.y + 43 * fs);
    const lx = B.x + B.w - 196 * fs;
    const leg = (y, color, dashed, text) => {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dashed ? [5, 4] : []);
      ctx.beginPath(); ctx.moveTo(lx, y - 5); ctx.lineTo(lx + 20, y - 5); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = fnt(L, 13); ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.fillText(text, lx + 27, y);
    };
    leg(B.y + 24 * fs, 'rgba(125,211,252,.95)', true, '지구 공전 궤도면');
    leg(B.y + 43 * fs, 'rgba(252,165,165,.95)', false, '달 공전 궤도');
    const k = phaseKey(S.theta);
    let s = ['달을 삭이나 망 위치에 놓아 보세요', '#c7d3f2'];
    if (st.solar || st.Ms.pen) s = ['☀️ 달의 그림자가 지구에 닿아요 → 일식', '#fca5a5'];
    else if (st.lunar) s = ['🌕 달이 지구 그림자 속에 → 월식', '#fca5a5'];
    else if (tiltOn() && k === 'full') s = ['망: 달이 지구 그림자 위로 비껴가요 → 월식 없음', '#fde68a'];
    else if (tiltOn() && k === 'new') s = ['삭: 달 그림자가 지구 아래로 비껴가요 → 일식 없음', '#fde68a'];
    ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = s[1]; ctx.textAlign = 'left';
    ctx.fillText(s[0], B.x + 14, B.y + B.h - 12 * fs);
  }
  function drawStrip(ctx, L, st, t) {
    const B = L.strip;
    ctx.save();
    roundRect(ctx, B.x, B.y, B.w, B.h, 14); ctx.clip();
    const g = ctx.createLinearGradient(0, B.y, 0, B.y + B.h);
    g.addColorStop(0, on('side') ? '#1c2d63' : '#0b1534'); g.addColorStop(1, on('side') ? '#26397a' : '#14234f');
    ctx.fillStyle = g; ctx.fillRect(B.x, B.y, B.w, B.h);
    if (on('side')) drawSide(ctx, L, st, t); else drawLegend(ctx, L, st);
    ctx.restore();
    roundRect(ctx, B.x, B.y, B.w, B.h, 14);
    ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (isNew('side')) newRing(ctx, L, B.x, B.y, B.w, B.h);
  }

  /* ---------- 오른쪽 창 ①: 낮인 곳에서 본 태양 (필터) ---------- */
  function drawSunTile(ctx, L, x, y, w, h, v, label) {
    const fs = L.fs, f = Math.pow(v.cover, 3);
    ctx.save();
    roundRect(ctx, x, y, w, h, 12); ctx.clip();
    ctx.fillStyle = mix('#1a1206', '#020203', f); ctx.fillRect(x, y, w, h);  // 필터로 보면 하늘은 어둡게 보임
    const cx = x + w / 2, cy = y + h * 0.52, rs = Math.min(w * 0.31, h * 0.26);
    if (v.total) {
      const cg = ctx.createRadialGradient(cx, cy, rs * 0.95, cx, cy, rs * 2.1);
      cg.addColorStop(0, 'rgba(255,255,255,.9)'); cg.addColorStop(0.35, 'rgba(220,235,255,.35)'); cg.addColorStop(1, 'rgba(220,235,255,0)');
      ctx.fillStyle = cg; circle(ctx, cx, cy, rs * 2.1); ctx.fill();
    } else {
      const gg = ctx.createRadialGradient(cx, cy, rs * 0.9, cx, cy, rs * 1.5);
      gg.addColorStop(0, 'rgba(255,150,40,' + (0.45 * (1 - v.cover) + 0.1) + ')'); gg.addColorStop(1, 'rgba(255,150,40,0)');
      ctx.fillStyle = gg; circle(ctx, cx, cy, rs * 1.5); ctx.fill();
    }
    const g = ctx.createRadialGradient(cx - rs * 0.2, cy - rs * 0.2, rs * 0.1, cx, cy, rs);
    g.addColorStop(0, '#ffd27a'); g.addColorStop(0.75, '#ff9a1f'); g.addColorStop(1, '#e8620c');
    ctx.fillStyle = g; circle(ctx, cx, cy, rs); ctx.fill();
    if (v.near) {
      ctx.fillStyle = '#07080c'; circle(ctx, cx + v.ox * rs, cy + v.oy * rs, rs * v.k); ctx.fill();
    }
    ctx.restore();
    roundRect(ctx, x, y, w, h, 12); ctx.strokeStyle = 'rgba(255,190,120,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.textAlign = 'center';
    if (label) { ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = '#ffe2b8'; ctx.fillText(label, cx, y + 21 * fs); }
    let name, col = '#fff';
    if (v.total) { name = on('places') ? '개기 일식' : '완전히 가려짐'; col = '#fda4af'; }
    else if (v.cover > 0.01) { name = (on('places') ? '부분 일식 ' : '일부 가려짐 ') + Math.round(v.cover * 100) + '%'; col = '#fdba74'; }
    else name = '평소 태양';
    ctx.font = fnt(L, 14, 'bold'); ctx.fillStyle = col;
    ctx.fillText(name, cx, y + h - 13 * fs);
  }
  function mix(c1, c2, t) {
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const ch = (v, s) => (v >> s) & 255;
    const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
    return 'rgb(' + m(16) + ',' + m(8) + ',' + m(0) + ')';
  }
  function panelBase(ctx, L, P, t, title, sub) {
    roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.clip();
    const g = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
    g.addColorStop(0, '#0c1636'); g.addColorStop(1, '#1b2d60');
    ctx.fillStyle = g; ctx.fillRect(P.x, P.y, P.w, P.h);
    drawStars(ctx, L.stars[title] || [], t, 0.7);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = fnt(L, 15, 'bold');
    ctx.fillText(title, P.x + P.w / 2, P.y + 26 * L.fs);
    ctx.fillStyle = '#9fb3e0'; ctx.font = fnt(L, 13);
    ctx.fillText(sub, P.x + P.w / 2, P.y + 46 * L.fs);
  }
  function drawSunPanel(ctx, L, st, t) {
    const P = L.sunP, fs = L.fs;
    ctx.save();
    panelBase(ctx, L, P, t, '☀️ 낮인 곳에서 본 태양', '🕶️ 태양 관측용 필터로 본 모습');
    const ty = P.y + 60 * fs, th = P.h - 60 * fs - 64 * fs;
    if (on('places')) {
      const w = (P.w - 30) / 2;
      drawSunTile(ctx, L, P.x + 10, ty, w, th, st.A, 'A 지역');
      drawSunTile(ctx, L, P.x + 20 + w, ty, w, th, st.B, 'B 지역');
    } else drawSunTile(ctx, L, P.x + 10, ty, P.w - 20, th, st.A, '');
    ctx.textAlign = 'center'; ctx.font = fnt(L, 13); ctx.fillStyle = '#c7d3f2';
    const note = on('places') ? (st.solar ? '본그림자 → 개기, 반그림자 → 부분' : '지역마다 보이는 모습이 달라요') : (st.solar ? '달이 태양을 가렸어요!' : '태양이 가려지면 낮이 어두워져요');
    ctx.fillText(note, P.x + P.w / 2, P.y + P.h - 38 * fs);
    ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = '#fb923c';
    ctx.fillText('⚠️ 태양을 맨눈으로 보지 마세요!', P.x + P.w / 2, P.y + P.h - 14 * fs);
    ctx.restore();
    roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (isNew('places')) newRing(ctx, L, P.x, P.y, P.w, P.h);
  }

  /* ---------- 오른쪽 창 ②: 밤인 곳에서 본 달 ---------- */
  function drawMoonPanel(ctx, L, st, t) {
    const P = L.moonP, fs = L.fs, Lv = st.Lv;
    ctx.save();
    panelBase(ctx, L, P, t, '🌙 밤인 곳에서 본 달', '지구의 밤 쪽에서 바라본 모습');
    const dx = P.x + P.w / 2, dy = P.y + 138 * fs, dr = 56 * fs;
    if (Lv.total) {
      const gg = ctx.createRadialGradient(dx, dy, dr, dx, dy, dr * 1.4);
      gg.addColorStop(0, 'rgba(220,80,40,.35)'); gg.addColorStop(1, 'rgba(220,80,40,0)');
      ctx.fillStyle = gg; circle(ctx, dx, dy, dr * 1.4); ctx.fill();
    }
    drawPhase(ctx, dx, dy, dr, S.theta);
    if (Lv.pen > 0.01) {
      ctx.save(); circle(ctx, dx, dy, dr); ctx.clip();
      const sx = dx + Lv.ox * dr, sy = dy + Lv.oy * dr;
      ctx.fillStyle = 'rgba(0,0,0,.28)'; circle(ctx, sx, sy, Lv.P * dr); ctx.fill();
      if (Lv.umb > 0.01) {
        const g = ctx.createRadialGradient(sx, sy, Lv.U * dr * 0.9, sx, sy, Lv.U * dr * 1.08);
        g.addColorStop(0, 'rgba(130,32,12,.88)'); g.addColorStop(0.6, 'rgba(120,30,12,.8)'); g.addColorStop(1, 'rgba(60,15,6,0)');
        ctx.fillStyle = g; circle(ctx, sx, sy, Lv.U * dr * 1.08); ctx.fill();
      }
      ctx.restore();
    }
    let name = PH[phaseKey(S.theta)], sub = phaseKey(S.theta) === 'new' ? '태양 쪽에 있어 밤에는 보이지 않아요' : '태양 빛을 반사해 밝게 보여요', col = '#fff';
    if (st.lunar) {
      name = on('lunar') ? (Lv.total ? '개기 월식' : '부분 월식') : '그림자 속 달';
      sub = Lv.total ? '지구 그림자 속에서 붉게 보여요' : '달이 지구 그림자에 가려져요'; col = '#ffb4a2';
    } else if (st.penOnly) sub = '반그림자 속이라 조금 어두워요';
    ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.font = Math.round(26 * fs) + 'px ' + DISPLAY;
    ctx.fillText(name, dx, P.y + 232 * fs);
    ctx.font = fnt(L, 13); ctx.fillStyle = '#c7d3f2';
    ctx.fillText(sub, dx, P.y + 256 * fs);
    if (on('lunar')) {
      const bx = P.x + 20, bw = P.w - 40, by = P.y + P.h - 26 * fs;
      ctx.textAlign = 'left'; ctx.font = fnt(L, 13); ctx.fillStyle = '#c7d3f2';
      ctx.fillText('본그림자에 가려진 부분', bx, by - 10 * fs);
      ctx.textAlign = 'right'; ctx.font = fnt(L, 13, 'bold'); ctx.fillStyle = '#fff';
      ctx.fillText(Math.round(Lv.umb * 100) + '%', bx + bw, by - 10 * fs);
      ctx.fillStyle = 'rgba(255,255,255,.16)'; roundRect(ctx, bx, by, bw, 12, 6); ctx.fill();
      if (Lv.umb > 0.004) {
        const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        bg.addColorStop(0, '#f97354'); bg.addColorStop(1, '#b91c1c');
        ctx.fillStyle = bg; roundRect(ctx, bx, by, Math.max(12, bw * Lv.umb), 12, 6); ctx.fill();
      }
    } else {
      ctx.textAlign = 'center'; ctx.font = fnt(L, 13); ctx.fillStyle = '#8391b3';
      ctx.fillText('보름달 무렵의 달을 살펴봐요', dx, P.y + P.h - 18 * fs);
    }
    ctx.restore();
    roundRect(ctx, P.x, P.y, P.w, P.h, 14); ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (isNew('lunar')) newRing(ctx, L, P.x, P.y, P.w, P.h);
  }

  function draw(v, L, st, t) {
    v.clear('#070d1f');
    const ctx = v.ctx, M = L.main;
    ctx.save();
    ctx.beginPath(); ctx.rect(M.x, M.y, M.w, M.h); ctx.clip();
    const bg = ctx.createRadialGradient(L.cx, L.cy, 20, L.cx, L.cy, 360);
    bg.addColorStop(0, '#17264f'); bg.addColorStop(0.6, '#0e1838'); bg.addColorStop(1, '#070d1f');
    ctx.fillStyle = bg; ctx.fillRect(M.x, M.y, M.w, M.h);
    drawStars(ctx, L.starsMain, t, 1);
    ctx.restore();
    drawTop(ctx, L, st, t);
    drawStrip(ctx, L, st, t);
    drawSunPanel(ctx, L, st, t);
    drawMoonPanel(ctx, L, st, t);
  }

  /* ---------- 입력 ---------- */
  const rangeTheta = SciSim.bindRange($('#sTheta'), $('#oTheta'), (v) => v + '°', (v) => { setTheta(v); interacted(); });
  function setTheta(a) {
    S.theta = norm(a);
    rangeTheta.set(Math.round(S.theta) % 360);
  }
  const tTilt = $('#tTilt');
  tTilt.addEventListener('change', () => { Sound.click(); S.tilt = tTilt.checked; });
  function setTilt(v) { S.tilt = !!v; tTilt.checked = S.tilt; }
  function interacted() { S.interacted = true; }

  function attachPointer(v, L) {
    const hitMoon = (p) => { const m = moonPos(L); return Math.hypot(p.x - m.x, p.y - m.y) < 36; };
    const onOrbit = (p) => {
      if (p.x < L.main.x || p.x > L.main.x + L.main.w || p.y < L.main.y || p.y > L.strip.y - 6) return false;
      return Math.abs(Math.hypot(p.x - L.cx, p.y - L.cy) - R) < 32;
    };
    const dragTo = (p) => {
      let a = norm(Math.atan2(L.cy - p.y, p.x - L.cx) / DEG);
      [0, 180].forEach((s) => { if (Math.abs(signed(a - s)) < SNAP) a = s; });
      setTheta(a);
    };
    SciSim.pointer(v, {
      hover: (p) => (hitMoon(p) ? 'grab' : onOrbit(p) ? 'pointer' : null),
      down(p) {
        if (!hitMoon(p) && !onOrbit(p)) return false;
        S.dragging = true; interacted(); dragTo(p);
        v.canvas.style.cursor = 'grabbing';
        return true;
      },
      move: dragTo,
      up() { S.dragging = false; v.canvas.style.cursor = ''; },
    });
    return (p) => hitMoon(p) || onOrbit(p);
  }

  const views = ['wide', 'tall'].map((k) => {
    const L = LAYOUTS[k];
    const v = SciSim.stage($(k === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#070d1f' });
    L.starsMain = makeStars(L.main, 80, k === 'wide' ? 7 : 11);
    L.stars = { '☀️ 낮인 곳에서 본 태양': makeStars(L.sunP, 20, 23), '🌙 밤인 곳에서 본 달': makeStars(L.moonP, 30, 29) };
    const hits = attachPointer(v, L);
    if (k === 'tall') {
      v.canvas.style.touchAction = 'pan-y';
      v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc && hits(v.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
    return { v, L };
  });

  /* ---------- 퀴즈 그림 (SVG) ---------- */
  function svgEarth(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#3b8fe0"/><path d="M' + x + ',' + (y - r) + ' A' + r + ',' + r + ' 0 0 0 ' + x + ',' + (y + r) + ' Z" fill="#040a1f" opacity=".72"/>';
  }
  function svgMoonTop(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#3a4258"/><path d="M' + x + ',' + (y - r) + ' A' + r + ',' + r + ' 0 0 1 ' + x + ',' + (y + r) + ' Z" fill="#fff6d2"/>';
  }
  const SVG_OPEN = (w, h, label) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" role="img" aria-label="' + label + '" font-family=\'' + FONT.replace(/"/g, '') + '\'>';
  const FIG = {};
  FIG.tilt = (function () {
    let s = SVG_OPEN(340, 162, '옆에서 본 지구와 달의 공전 궤도면');
    s += '<defs><radialGradient id="fgSun2" cx="40%" cy="45%" r="60%"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#ffb020"/></radialGradient>';
    s += '<clipPath id="fgClip2"><rect x="0" y="0" width="340" height="162" rx="12"/></clipPath></defs>';
    s += '<g clip-path="url(#fgClip2)"><rect x="0" y="0" width="340" height="162" fill="#0e1838"/>';
    s += '<circle cx="334" cy="80" r="34" fill="url(#fgSun2)"/></g>';
    s += '<text x="334" y="26" text-anchor="end" font-size="13" font-weight="700" fill="#ffd36b">태양 쪽</text>';
    s += '<polygon points="170,70 18,73 18,87 170,90" fill="#000" fill-opacity=".55"/>';
    s += '<line x1="12" y1="80" x2="292" y2="80" stroke="#7dd3fc" stroke-width="1.5" stroke-dasharray="6 5"/>';
    s += '<text x="14" y="107" font-size="13" font-weight="700" fill="#7dd3fc">지구 공전 궤도면</text>';
    s += '<line x1="70" y1="47.5" x2="270" y2="112.5" stroke="#fca5a5" stroke-width="1.6"/>';
    s += '<text x="150" y="134" font-size="13" font-weight="700" fill="#fca5a5">달 공전 궤도면</text>';
    s += '<path d="M100,80 A70,70 0 0 1 103.4,58.4" fill="none" stroke="#fff" stroke-width="1.2"/>';
    s += '<text x="97" y="70" text-anchor="end" font-size="13" font-weight="700" fill="#fff">약 5°</text>';
    s += '<polygon points="270,105.5 196,110 196,115 270,119.5" fill="#000" fill-opacity=".45"/>';
    s += svgEarth(170, 80, 10);
    s += svgMoonTop(70, 47.5, 7);
    s += '<text x="70" y="32" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">망</text>';
    s += svgMoonTop(270, 112.5, 7);
    s += '<text x="270" y="138" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">삭</text>';
    s += '<text x="14" y="154" font-size="13" fill="#94a3b8">(기울기는 과장해서 그렸어요)</text>';
    return s + '</svg>';
  })();

  /* ---------- 미션 도우미 ---------- */
  function aids() { S.target = null; S.spots = false; S.align = false; S.sideTask = false; }
  function ensureOutside(lo, hi, fallback) { if (Math.abs(signed(S.theta - (lo + hi) / 2)) <= (hi - lo) / 2) setTheta(fallback); }
  const thetaTxt = () => Math.round(norm(S.theta)) % 360;
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const covTxt = (v) => (v.total ? '개기' : v.cover > 0.01 ? '부분 ' + Math.round(v.cover * 100) + '%' : '없음');
  let ST = state();

  /* ---------- 단계별 학습 ---------- */
  game = SciSim.game({
    simId: 'm1-eclipse',
    mount: '#game',
    badge: '그림자 탐정',
    homeHref: '../../index.html#g1',
    featureLabels: {
      shadow: '🔦 지구와 달의 그림자',
      sky: '🔭 지구에서 본 태양 · 달',
      places: '📍 관측 지역 A · B',
      lunar: '🌕 달이 가려진 정도',
      side: '📐 옆에서 본 모습',
      tilt: '🌐 궤도 기울기 (실제처럼)',
    },
    onFeatures(set) { FEAT = set; },
    onMissionStart() { aids(); },
    onHint(m) { if (m.target) S.target = m.target; },
    levels: [
      /* ---------- 1단계 · 관찰 ---------- */
      {
        title: '그림자와 일직선', short: '그림자', icon: '🔦', phase: '관찰',
        features: ['shadow', 'sky'],
        intro: '<p><b>🔍 탐구 질문: 맑은 낮에 해가 갑자기 가려진다면, 무엇이 해를 가린 걸까?</b></p>' +
          '<p>빛을 받는 물체 뒤에는 <b>그림자</b>가 생겨요. 북극 위에서 내려다본 모형에서 지구와 달의 그림자를 살펴봐요.</p>',
        setup() { aids(); setTilt(false); setTheta(40); S.interacted = false; },
        recap: '지구와 달의 그림자는 늘 <b>태양 반대쪽</b>에 생기고, 세 천체가 <b>일직선</b>이 되면 그림자가 다른 천체에 닿아요.',
        summary: '<ul><li>햇빛을 받는 지구와 달의 뒤쪽(<b>태양 반대쪽</b>)에 그림자가 생긴다.</li>' +
          '<li><b>본그림자</b>: 햇빛이 완전히 가려진 진한 그림자 · <b>반그림자</b>: 햇빛이 일부만 가려진 옅은 그림자</li>' +
          '<li>태양–달–지구 또는 태양–지구–달이 <b>일직선</b>이 되면 그림자가 다른 천체에 닿는다.</li></ul>',
        missions: [
          {
            title: '🔦 그림자는 어느 쪽에?',
            goal: '달을 끌어서 궤도 위 <b>노란 점선 동그라미</b> 4곳 중 <b>3곳</b>으로 옮기며, 달의 그림자가 생기는 방향을 살펴보세요.',
            hint: '달(또는 궤도 위 아무 곳)을 누른 채 원을 따라 끌어요. <b>🌙 달의 위치</b> 슬라이더를 써도 돼요.',
            setup() { setTilt(false); setTheta(90); S.visit = new Set(); S.spots = true; },
            check: () => S.visit.size >= 3,
            hold: 0,
            status: () => '옮겨 본 자리: <b>' + Math.min(3, S.visit.size) + ' / 3</b>' + (S.visit.size ? ' · 그림자는 어느 쪽에 생겼나요?' : ''),
            explain: '달이 어디에 있든 달의 그림자는 늘 <b>태양 반대쪽(왼쪽)</b>으로 생겨요. 지구의 그림자도 마찬가지예요. 진한 <b>본그림자</b> 둘레에는 옅은 <b>반그림자</b>가 있어요.',
          },
          {
            title: '📏 세 천체를 한 줄로!',
            goal: '달을 옮겨 <b>태양–달–지구</b>, <b>태양–지구–달</b> 순서로 한 줄이 되게 각각 만들어 보세요. 지구에서 본 태양과 달은 어떻게 되나요?',
            hint: '태양–달–지구: 달이 지구와 태양 <b>사이</b>(오른쪽). 태양–지구–달: 달이 지구 <b>뒤</b>(왼쪽). 일직선 근처에서는 달이 자석처럼 달라붙어요.',
            setup() { setTilt(false); ensureOutside(-25, 25, 60); ensureOutside(155, 205, 60); S.lined = new Set(); S.holdKey = null; S.align = true; },
            check: () => S.lined.size >= 2,
            hold: 0,
            status: () => chk(S.lined.has('sme'), '태양–달–지구') + ' · ' + chk(S.lined.has('sem'), '태양–지구–달') + '<br>θ = <b>' + thetaTxt() + '°</b>',
            explain: '세 천체가 일직선이 되자 <b>달의 그림자가 지구에</b> 닿아 낮인 곳에서 태양이 가려지고, <b>달이 지구의 그림자 속</b>에 들어가 달이 가려졌어요. 이것이 바로 <b>일식</b>과 <b>월식</b>이에요!',
          },
        ],
      },
      /* ---------- 2단계 · 설명: 일식 ---------- */
      {
        title: '일식', short: '일식', icon: '🌑', phase: '설명',
        features: ['places'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 태양–달–지구가 일직선이 되면 달의 그림자가 지구에 닿는 것을 봤어요.</div>' +
          '<p>달이 태양을 가리는 현상을 <b>일식</b>이라고 해요. 지구의 <b>A 지역</b>과 <b>B 지역</b>에서 각각 태양이 어떻게 보이는지 비교해 봐요.</p>',
        setup() { aids(); setTilt(false); setTheta(40); },
        recap: '<b>일식</b>은 태양–달–지구가 일직선(달이 <b>삭</b>)일 때 달이 태양을 가리는 현상이에요.',
        summary: '<ul><li><b>일식</b>: 달이 태양을 가리는 현상. 태양–<b>달</b>–지구 순서로 일직선(달이 <b>삭</b>의 위치)일 때 일어난다.</li>' +
          '<li>달의 <b>본그림자</b>가 닿은 지역 → <b>개기 일식</b> · <b>반그림자</b>가 닿은 지역 → <b>부분 일식</b></li>' +
          '<li>달의 그림자가 닿은 <b>좁은 지역</b>에서 낮에만 볼 수 있다.</li></ul>',
        missions: [
          {
            title: '🌑 태양을 가려라!',
            goal: '달을 옮겨 A나 B 지역에서 태양이 가려지는 <b>일식</b>을 일으켜 보세요.',
            hint: '일식은 달이 태양을 가리는 현상이에요. 달이 태양과 지구 <b>사이</b>에 오게 해요. (궤도 위에 초록색으로 표시했어요)',
            target: { lo: -6, hi: 6 },
            setup() { setTilt(false); ensureOutside(-20, 20, 50); },
            check: () => !S.dragging && ST.solar,
            hold: 0.8,
            status: () => 'A 지역: <b>' + covTxt(ST.A) + '</b> · B 지역: <b>' + covTxt(ST.B) + '</b>',
            explain: '<b>태양–달–지구</b>가 일직선이 되자 달의 그림자가 지구에 닿고, 그 지역에서 달이 태양을 가렸어요. 이것이 <b>일식</b>이에요.',
          },
          {
            title: '🌘 개기 일식을 찾아라',
            goal: 'A나 B 지역에서 태양이 <b>완전히</b> 가려지는 <b>개기 일식</b>을 만들어 보세요. 다른 지역은 어떻게 보이나요?',
            hint: '달을 태양–지구를 잇는 선 위에 <b>정확히</b> 놓아요(θ = 0°). 달의 진한 <b>본그림자</b>가 닿는 곳이 개기 일식 지역이에요.',
            target: { lo: -1.5, hi: 1.5 },
            setup() { setTilt(false); ensureOutside(-8, 8, 30); },
            check: () => !S.dragging && ST.solarTotal,
            hold: 0.8,
            status: () => 'A 지역: <b>' + covTxt(ST.A) + '</b> · B 지역: <b>' + covTxt(ST.B) + '</b> · θ = <b>' + thetaTxt() + '°</b>',
            explain: '달의 <b>본그림자</b>가 닿은 지역에서는 태양이 완전히 가려지는 <b>개기 일식</b>이, 둘레의 <b>반그림자</b> 지역에서는 태양의 일부만 가려지는 <b>부분 일식</b>이 보여요. 달은 태양보다 훨씬 작지만 훨씬 가까워서 하늘에서 비슷한 크기로 보여요.',
          },
          {
            type: 'quiz',
            title: '🧩 일식 때 달은 어디에?',
            goal: '일식이 일어날 때 달의 위치(위상)는?',
            choices: ['망 (보름달)', '삭', '상현달', '하현달'],
            answer: 1,
            feedback: [
              '망일 때 달은 태양의 <b>반대편</b>에 있어요. 태양을 가릴 수 없어요.',
              '',
              '상현일 때 태양–지구–달은 <b>직각</b>을 이뤄요. 일직선이 아니에요.',
              '하현일 때도 태양–지구–달이 <b>직각</b>이에요.',
            ],
            explain: '일식은 태양–달–지구가 일직선인 <b>삭</b>일 때 일어나요. 그래서 일식은 음력 1일 무렵의 <b>낮</b>에, 달의 그림자가 닿은 <b>좁은 지역</b>에서만 볼 수 있어요.',
          },
        ],
      },
      /* ---------- 3단계 · 설명: 월식 ---------- */
      {
        title: '월식', short: '월식', icon: '🌕', phase: '설명',
        features: ['lunar'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 달이 태양을 가리는 일식은 삭일 때 일어난다는 것을 알았어요.</div>' +
          '<p>이번에는 반대로 <b>지구의 그림자</b>가 달을 가리는 경우를 알아봐요. 이것을 <b>월식</b>이라고 해요.</p>',
        setup() { aids(); setTilt(false); setTheta(130); },
        recap: '<b>월식</b>은 태양–지구–달이 일직선(달이 <b>망</b>)일 때 달이 지구 그림자에 들어가는 현상이에요.',
        summary: '<ul><li><b>월식</b>: 달이 지구의 그림자에 들어가 가려지는 현상. 태양–<b>지구</b>–달 순서로 일직선(달이 <b>망</b>의 위치)일 때 일어난다.</li>' +
          '<li>달 전체가 본그림자에 들어가면 <b>개기 월식</b>, 일부만 들어가면 <b>부분 월식</b></li>' +
          '<li>달이 떠 있는 <b>밤인 지역</b>이면 어디서나 볼 수 있다. 개기 월식 때 달은 <b>붉게</b> 보인다.</li></ul>',
        missions: [
          {
            title: '🌕 달을 그림자 속으로',
            goal: '달을 지구의 <b>본그림자</b> 속으로 옮겨 <b>월식</b>을 일으켜 보세요.',
            hint: '지구의 그림자는 태양의 반대쪽(왼쪽)에 있어요. <b>태양–지구–달</b> 순서가 되게 해요. (궤도 위에 초록색으로 표시했어요)',
            target: { lo: 171, hi: 189 },
            setup() { setTilt(false); ensureOutside(160, 200, 120); },
            check: () => !S.dragging && ST.lunar,
            hold: 0.8,
            status: () => '본그림자에 가려진 부분: <b>' + Math.round(ST.Lv.umb * 100) + '%</b> · θ = <b>' + thetaTxt() + '°</b>',
            explain: '<b>태양–지구–달</b>이 일직선이 되자 달이 지구의 그림자 속에 들어가 가려졌어요. 이것이 <b>월식</b>이에요.',
          },
          {
            title: '🔴 붉은 달, 개기 월식',
            goal: '달 전체가 본그림자에 들어가는 <b>개기 월식</b>을 만들어 보세요. 달의 색을 관찰해요.',
            hint: '달을 태양–지구를 잇는 선의 연장선 위(θ = 180°)에 놓아요.',
            target: { lo: 178, hi: 182 },
            setup() { setTilt(false); ensureOutside(176, 184, 165); },
            check: () => !S.dragging && ST.lunarTotal,
            hold: 0.8,
            status: () => '본그림자에 가려진 부분: <b>' + Math.round(ST.Lv.umb * 100) + '%</b> · θ = <b>' + thetaTxt() + '°</b>',
            explain: '달 전체가 본그림자에 들어가면 <b>개기 월식</b>이에요. 이때 달은 사라지지 않고 <b>붉게</b> 보여요. 지구 대기를 지나며 꺾인 붉은빛이 달에 닿기 때문이에요.',
          },
          {
            type: 'quiz',
            title: '🧩 월식, 맞는 설명은?',
            goal: '월식에 대한 설명으로 옳은 것은?',
            choices: [
              '달이 삭의 위치에 있을 때 일어난다',
              '달이 망의 위치에 있을 때 일어나며, 밤인 지역이면 어디서나 볼 수 있다',
              '달의 그림자가 지구를 가려서 일어난다',
              '개기 월식 때 달은 완전히 사라져 보이지 않는다',
            ],
            answer: 1,
            feedback: [
              '삭일 때 달이 태양을 가리면 <b>일식</b>이에요.',
              '',
              '그것은 <b>일식</b>이에요. 월식은 <b>지구</b>의 그림자가 달을 가려요.',
              '개기 월식 때도 달은 사라지지 않고 <b>붉게</b> 보여요.',
            ],
            explain: '월식은 태양–지구–달이 일직선인 <b>망</b>일 때 일어나요. 지구의 그림자가 달을 가리므로, 그때 달이 떠 있는 <b>밤인 지역</b>이면 어디서나 볼 수 있어요. (일식은 좁은 지역에서만!)',
          },
        ],
      },
      /* ---------- 4단계 · 적용 ---------- */
      {
        title: '매달 일어나지 않는 까닭', short: '적용', icon: '📐', phase: '적용',
        features: ['side', 'tilt'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 일식은 <b>삭</b>, 월식은 <b>망</b>일 때 일어난다는 것을 알았어요. 삭과 망은 <b>매달</b> 돌아오죠.</div>' +
          '<p>그런데 일식과 월식은 <b>매달 일어나지 않아요.</b> 태양–지구–달을 <b>옆에서</b> 보며 그 까닭을 찾고, 일식을 <b>안전하게</b> 관찰하는 방법도 알아봐요.</p>',
        setup() { aids(); setTilt(true); setTheta(150); },
        recap: '달의 공전 궤도가 약 <b>5° 기울어져</b> 있어 대부분의 삭·망 때는 그림자가 비껴가요. 일식은 반드시 <b>필터</b>로 관찰해요.',
        summary: '<ul><li>달의 공전 궤도면은 지구의 공전 궤도면에 대해 <b>약 5°</b> 기울어져 있어, 대부분의 삭·망 때는 그림자가 비껴간다. → 일식과 월식은 <b>매달 일어나지 않는다</b>.</li>' +
          '<li>⚠️ 일식을 관찰할 때는 태양을 <b>맨눈으로 보지 않고</b> 태양 관측용 필터(일식 안경)를 사용한다.</li></ul>' +
          '<p class="note">📏 이 시뮬레이션의 천체 크기, 거리, 궤도 기울기는 실제와 달라요(보기 쉽게 과장).</p>',
        missions: [
          {
            title: '📐 옆에서 보면 비껴간다!',
            goal: '<b>🌐 궤도 기울기</b>를 켠 채 달을 <b>망</b>과 <b>삭</b> 위치에 각각 놓고, 아래 <b>옆에서 본 모습</b>을 관찰하세요.',
            hint: '망은 태양의 반대편(왼쪽), 삭은 태양 쪽(오른쪽)이에요. 옆에서 보면 달이 하늘색 점선(지구 공전 궤도면)보다 위에 있나요, 아래에 있나요?',
            setup() { setTilt(true); ensureOutside(150, 210, 120); S.seen = new Set(); S.sideTask = true; },
            check: () => S.seen.has('full') && S.seen.has('new'),
            hold: 0,
            status: () => (tiltOn() ? '' : '🌐 <b>궤도 기울기</b>를 켜 주세요.<br>') + chk(S.seen.has('full'), '망') + ' · ' + chk(S.seen.has('new'), '삭') + ' · 지금: <b>' + PH[phaseKey(S.theta)] + '</b>',
            explain: '궤도가 기울어져 있으면 <b>망</b>일 때 달은 지구 그림자 <b>위</b>로, <b>삭</b>일 때 달의 그림자는 지구 <b>아래</b>로 지나가요. 위에서 보면 일직선 같지만 실제로는 비껴가서 식이 일어나지 않아요.',
          },
          {
            type: 'quiz',
            title: '🧩 왜 매달 일어나지 않을까?',
            goal: '삭과 망은 매달 돌아오는데, 일식과 월식은 <b>매달 일어나지 않아요</b>. 그 까닭은?',
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
            explain: '달의 궤도가 약 5° 기울어져 있어서, 대부분의 삭과 망 때 달은 태양–지구를 잇는 직선보다 조금 <b>위나 아래</b>로 지나가요. 달이 지구 공전 궤도면 근처를 지나면서 동시에 삭이나 망이 될 때만 일식이나 월식이 일어나요.',
          },
          {
            type: 'quiz',
            title: '🕶️ 일식을 안전하게 보려면?',
            goal: '일식을 관찰하는 방법으로 옳은 것은?',
            figure: '<div style="font-size:44px;line-height:1.2">🌞 🚫👀 → 🕶️</div>',
            choices: [
              '맨눈으로 잠깐씩 끊어서 본다',
              '선글라스를 두세 개 겹쳐 쓰고 본다',
              '태양 관측용 필터(일식 안경)를 쓰고 본다',
              '망원경이나 쌍안경으로 태양을 직접 본다',
            ],
            answer: 2,
            feedback: [
              '잠깐이라도 태양을 맨눈으로 보면 눈이 크게 다칠 수 있어요. 아프지 않아서 더 위험해요!',
              '선글라스는 겹쳐 써도 해로운 빛을 충분히 막지 못해요.',
              '',
              '망원경과 쌍안경은 빛을 모아 주어서, 필터 없이 태양을 보면 눈을 크게 다쳐요.',
            ],
            explain: '부분 일식 때도 태양 빛은 매우 강해요. 반드시 <b>태양 관측용 필터</b>(일식 안경)를 사용하고, 망원경을 쓸 때도 전용 필터를 끼워 관찰해요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  const tone = () => Sound.tone(880, 0.12, 'triangle', 0.08);
  let lastSolar = false, lastLunar = false;
  SciSim.loop((dt, t) => {
    ST = state();
    if (S.spots) { const k = spotAt(S.theta); if (k >= 0 && !S.visit.has(k)) { S.visit.add(k); tone(); } }
    if (S.align) {
      const key = Math.abs(signed(S.theta)) <= 1 ? 'sme' : Math.abs(signed(S.theta - 180)) <= 1 ? 'sem' : null;
      if (key === S.holdKey) S.holdT += dt; else { S.holdKey = key; S.holdT = 0; }
      if (key && S.holdT >= 0.3 && !S.lined.has(key)) { S.lined.add(key); tone(); }
    }
    if (S.sideTask && tiltOn()) {
      const k = phaseKey(S.theta);
      if ((k === 'full' || k === 'new') && !S.seen.has(k) && !S.dragging) { S.seen.add(k); tone(); }
    }
    if (ST.solar !== lastSolar) { if (ST.solar) Sound.tone(330, 0.35, 'sine', 0.08); lastSolar = ST.solar; }
    if (ST.lunar !== lastLunar) { if (ST.lunar) Sound.tone(262, 0.35, 'sine', 0.08); lastLunar = ST.lunar; }
    views.forEach(({ v, L }) => { if (v.canvas.offsetWidth > 0) draw(v, L, ST, t); });
  });
})();
