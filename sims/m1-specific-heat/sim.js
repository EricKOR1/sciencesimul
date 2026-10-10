/* =========================================================
   중1 Ⅲ. 열 — 비열과 열팽창  [9과03-03]
   물질에 따라 비열과 열팽창 정도가 다름을 알고, 이러한 성질이 일상생활에서 유용하게 활용됨을 인식할 수 있다.
   ① [관찰] 같은 열: 같은 질량의 물과 식용유를 같은 알코올램프로 3분 가열 → 온도 변화 비교
   ② [실험] 비열 비교: 물·식용유·모래의 시간–온도 그래프 (기울기가 작을수록 비열이 큼) + 비열 표(비교 수준)
   ③ [설명] 열팽창: 구리·철 막대의 늘어남(확대 표시) + 입자 모형(입자 사이 거리만 늘어남) + 바이메탈 스위치
   ④ [적용] 생활 활용: 철로 이음새·전깃줄·유리병 뚜껑(열팽창), 뚝배기·찜질팩·바닷가 일교차(비열) 분류 카드
   ※ 정성적(비교) 수준: 열량 계산(Q = cmΔT) 문제는 다루지 않음. 비열 값은 비교용(물 1.00, 식용유 약 0.47, 모래 약 0.19, 철 0.11, 구리 0.09).
   화면: 태블릿용 가로 캔버스(800×580)와 휴대폰용 세로 캔버스(520×900)를 같은 장면 코드로 그림
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, fmt, Sound } = SciSim;
  const TAU = Math.PI * 2;
  const REDUCE = !!SciSim.reduceMotion;                 // 움직임 줄이기 설정
  const approach = SciSim.approach;
  const rgba = SciSim.color.rgba;
  const shade = SciSim.color.shade;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const font = (px, w) => (w || 700) + ' ' + px.toFixed(1) + 'px ' + FONT;
  const mono = (px, w) => (w || 800) + ' ' + px.toFixed(1) + 'px ' + MONO;
  const mark = (b) => (b ? '✅' : '⬜');

  /* ---------- 색 ---------- */
  const h2r = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const r2h = (c) => '#' + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  function ramp(stops, x) {
    if (x <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (x <= stops[i][0]) {
        const a = stops[i - 1], b = stops[i], k = (x - a[0]) / (b[0] - a[0]);
        const A = h2r(a[1]), B = h2r(b[1]);
        return r2h([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
      }
    }
    return stops[stops.length - 1][1];
  }
  // 입자의 색(온도): 파랑 → 보라 → 빨강. 5 °C 단위로 미리 만든 색을 씀
  const PART = [[0, '#2563eb'], [30, '#3f7df0'], [55, '#9b5de5'], [80, '#e2463e'], [100, '#d42a2a']];
  const PARTC = [];
  for (let i = 0; i <= 20; i++) PARTC.push(ramp(PART, i * 5));
  const partColor = (T) => PARTC[clamp(Math.round(T / 5), 0, 20)];
  // 열화상 카메라 색: 파랑(차가움) → 하늘 → 초록 → 노랑 → 주황 → 빨강(뜨거움)
  const THERM = [[20, '#2433d6'], [32, '#1b8df0'], [44, '#17c6c0'], [56, '#7ad84a'], [68, '#f6d726'], [84, '#ff8a1f'], [100, '#e8262a']];
  const THC = [];
  for (let i = 0; i <= 80; i++) THC.push(ramp(THERM, 20 + i));
  const thermColor = (T) => THC[clamp(Math.round(T - 20), 0, 80)];
  // 공기·물의 온도에 따른 색(부드러운 파스텔): 장면 배경에 깔아 줌
  const AIRMAP = [[8, '#8db8f2'], [16, '#b9e0e6'], [24, '#f7efc4'], [34, '#ffd08a'], [46, '#ff9a6c'], [60, '#f0584a']];
  const WATMAP = [[18, '#9fd0f7'], [30, '#bfe0f0'], [42, '#ffe7a6'], [58, '#ffb878'], [74, '#f2604f']];
  const HOT = '#e2463e', COLD = '#2f6fe4', HEAT = '#ff7a2f';

  /* ---------- 입자 그림(광택 있는 공)을 미리 그려 두고 재사용 ---------- */
  const SPR = new Map();
  function ball(ctx, x, y, r, color) {
    const rq = Math.max(1, Math.round(r * 2) / 2), key = color + rq;
    let c = SPR.get(key);
    if (!c) {
      const k = 3, pad = 2, s = Math.ceil((rq + pad) * 2 * k);
      c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      g.scale(k, k);
      SciSim.draw(g).sphere(rq + pad, rq + pad, rq, color);
      SPR.set(key, c);
    }
    const h = rq + 2;
    ctx.drawImage(c, x - h, y - h, h * 2, h * 2);
  }
  const mixc = (a, b, k) => { const A = h2r(a), B = h2r(b); return r2h([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]); };   // 16진수 색 섞기
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function groundShadow(ctx, x, y, rx, ry, a) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(25,40,70,' + a + ')'); g.addColorStop(1, 'rgba(25,40,70,0)');
    ctx.fillStyle = g; circle(ctx, 0, 0, rx); ctx.fill();
    ctx.restore();
  }
  function drawBench(ctx, R) {
    const g = ctx.createLinearGradient(0, R.y, 0, R.y + R.h);
    g.addColorStop(0, '#e4eaf2'); g.addColorStop(0.2, '#cfd8e4'); g.addColorStop(0.215, '#a9b6c7'); g.addColorStop(1, '#8f9db1');
    ctx.fillStyle = g; ctx.fillRect(R.x, R.y, R.w, R.h);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(R.x, R.y, R.w, 1.5);
  }
  function newRing(V, R, t) {
    const { ctx, D } = V;
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = rgba('#f26b3a', 0.35 + a * 0.5); ctx.lineWidth = 4;
    D.roundRect(R.x - 5, R.y - 5, R.w + 10, R.h + 10, 18); ctx.stroke();
    D.label(R.x + R.w - 22, R.y - 3, 'NEW', { bg: '#f26b3a', size: 13 });
    ctx.restore();
  }
  // 흰 카드 판 (그림자 + 얇은 테두리)
  function panel(V, R, r) {
    const { ctx, D } = V;
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(R.x, R.y, R.w, R.h, r || 14); ctx.fill(); }, { blur: 14, y: 4, color: 'rgba(20,40,80,.14)' });
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.2; D.roundRect(R.x, R.y, R.w, R.h, r || 14); ctx.stroke();
  }

  /* ---------- 간단한 시간–온도 그래프 ----------
     o: {title, xmax, xstep, ymin, ymax, ystep, xt, yt, series:[{pts:[[x,y]..], color, label, w, dash}], marks:[{x,y,color}], fs} */
  function plot(V, R, o) {
    const { ctx, D } = V, fs = o.fs || V.L.fs;
    panel(V, R);
    const cp = !!o.compact;
    const x0 = R.x + 48 * fs, x1 = R.x + R.w - 16, y1 = R.y + (cp ? 38 : 56) * fs, y0 = R.y + R.h - (cp ? 30 : 38) * fs;
    const px = (v) => x0 + (v / o.xmax) * (x1 - x0), py = (v) => y0 - ((v - o.ymin) / (o.ymax - o.ymin)) * (y0 - y1);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#2b3445'; ctx.font = font(14 * fs, 800); ctx.textAlign = 'left';
    ctx.fillText(o.title, R.x + 12, R.y + 22 * fs);
    // 범례
    ctx.font = font(13 * fs, 800); ctx.textAlign = 'right';
    let lx = R.x + R.w - 12;
    for (let i = o.series.length - 1; i >= 0; i--) {
      const s = o.series[i], txt = '● ' + s.label;
      ctx.fillStyle = s.color; ctx.fillText(txt, lx, R.y + 22 * fs);
      lx -= ctx.measureText(txt).width + 12;
    }
    ctx.font = font(13 * fs, 600); ctx.lineWidth = 1;
    for (let v = 0; v <= o.xmax + 1e-6; v += o.xstep) {
      ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(px(v), y0); ctx.lineTo(px(v), y1); ctx.stroke();
      ctx.fillStyle = '#5d6879'; ctx.textAlign = 'center'; ctx.fillText(String(Math.round(v)), px(v), y0 + 17 * fs);
    }
    for (let v = o.ymin; v <= o.ymax + 1e-6; v += o.ystep) {
      ctx.strokeStyle = '#e7ecf3'; ctx.beginPath(); ctx.moveTo(x0, py(v)); ctx.lineTo(x1, py(v)); ctx.stroke();
      ctx.fillStyle = '#5d6879'; ctx.textAlign = 'right'; ctx.fillText(String(Math.round(v)), x0 - 6, py(v) + 4);
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y1 - 6); ctx.lineTo(x0, y0); ctx.lineTo(x1 + 4, y0); ctx.stroke();
    ctx.fillStyle = '#5d6879'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'right';
    ctx.fillText(o.xt, x1, y0 + (cp ? 28 : 33) * fs);
    if (!cp) { ctx.textAlign = 'left'; ctx.fillText(o.yt, R.x + 12, y1 - 14 * fs); }
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y1 - 10, x1 - x0 + 10, y0 - y1 + 20); ctx.clip();
    if (o.band) { ctx.fillStyle = o.band.color; ctx.fillRect(x0, py(o.band.hi), x1 - x0, py(o.band.lo) - py(o.band.hi)); }
    o.series.forEach((s) => {
      if (!s.pts.length) return;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const path = () => { ctx.beginPath(); s.pts.forEach((p, i) => { const x = px(p[0]), y = py(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); };
      if (s.dash) { ctx.setLineDash(s.dash); ctx.strokeStyle = s.color; ctx.lineWidth = s.w || 3; path(); ctx.stroke(); ctx.setLineDash([]); return; }
      ctx.strokeStyle = rgba(s.color, 0.2); ctx.lineWidth = (s.w || 3.4) + 5; path(); ctx.stroke();
      ctx.strokeStyle = s.color; ctx.lineWidth = s.w || 3.4; path(); ctx.stroke();
    });
    ctx.restore();
    o.series.forEach((s) => {
      if (!s.pts.length || s.nodot) return;
      const p = s.pts[s.pts.length - 1];
      ball(ctx, px(p[0]), py(p[1]), 5.5, s.color);
    });
    ctx.textAlign = 'left';
    return { px, py, x0, x1, y0, y1 };
  }

  /* ---------- 공통 그리기 도우미 ---------- */
  function vgrad(ctx, y, h, stops) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  }
  function tangents(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d <= Math.abs(b.r - a.r) + 1) return null;
    const th = Math.atan2(dy, dx), ph = Math.acos((a.r - b.r) / d);
    const P = (c, ang) => ({ x: c.x + Math.cos(ang) * c.r, y: c.y + Math.sin(ang) * c.r });
    return [[P(a, th + ph), P(b, th + ph)], [P(a, th - ph), P(b, th - ph)]];
  }
  // 디지털 온도 센서 표시창
  function drawDisplay(V, R, label, T, col, dec) {
    const { ctx, D } = V, fs = V.L.fs;
    D.shadow(() => { ctx.fillStyle = '#2b3445'; D.roundRect(R.x, R.y, R.w, R.h, 12); ctx.fill(); }, { blur: 10, y: 3 });
    ctx.fillStyle = '#d6deeb'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, R.x + 10, R.y + 19 * fs);
    const lx = R.x + 8, ly = R.y + 27 * fs, lw = R.w - 16, lh = R.h - 27 * fs - 8;
    ctx.fillStyle = '#101a2b'; D.roundRect(lx, ly, lw, lh, 7); ctx.fill();
    ctx.fillStyle = col; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.font = mono(Math.min(27, lh * 0.72) * (fs > 1 ? 1.05 : 1), 800);
    ctx.fillText(T.toFixed(dec == null ? 1 : dec), lx + lw - 34 * fs, ly + lh / 2 + 1);
    ctx.font = font(14 * fs, 800); ctx.fillText('°C', lx + lw - 8, ly + lh / 2 + 1);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  }
  // 알코올램프 (병 + 심지 + 불꽃)
  function drawLamp(V, x, wickY, benchY, k, t) {
    const { ctx, D } = V;
    const bw = 62, top = wickY + 10;
    ctx.save();
    D.shadow(() => {
      const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
      g.addColorStop(0, 'rgba(210,230,245,.95)'); g.addColorStop(0.35, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(170,200,225,.95)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - 13, top); ctx.bezierCurveTo(x - 13, top + 10, x - bw / 2, top + 4, x - bw / 2, benchY - 14);
      ctx.quadraticCurveTo(x - bw / 2, benchY, x - bw / 2 + 12, benchY); ctx.lineTo(x + bw / 2 - 12, benchY); ctx.quadraticCurveTo(x + bw / 2, benchY, x + bw / 2, benchY - 14);
      ctx.bezierCurveTo(x + bw / 2, top + 4, x + 13, top + 10, x + 13, top); ctx.closePath(); ctx.fill();
    }, { blur: 8, y: 3 });
    ctx.fillStyle = 'rgba(244,180,90,.55)';
    ctx.beginPath(); ctx.moveTo(x - bw / 2 + 3, benchY - 20); ctx.lineTo(x + bw / 2 - 3, benchY - 20); ctx.quadraticCurveTo(x + bw / 2 - 2, benchY - 1, x + bw / 2 - 12, benchY - 1); ctx.lineTo(x - bw / 2 + 12, benchY - 1); ctx.quadraticCurveTo(x - bw / 2 + 2, benchY - 1, x - bw / 2 + 3, benchY - 20); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - bw / 2 + 10, top + 14); ctx.lineTo(x - bw / 2 + 8, benchY - 26); ctx.stroke();
    ctx.fillStyle = '#9aa3b2'; D.roundRect(x - 11, wickY + 2, 22, 11, 3); ctx.fill();
    ctx.fillStyle = '#4a4036'; D.roundRect(x - 3, wickY - 4, 6, 8, 2); ctx.fill();
    ctx.restore();
    if (k > 0.02) D.flame(x, wickY - 3, 44 * k, t + x * 0.01);
  }

  /* =========================================================
     화면 배치: wide = 태블릿(800×580), tall = 휴대폰(520×900)
     ========================================================= */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 580, fs: 1 },
    tall: { key: 'tall', vw: 520, vh: 900, fs: 1.25 },
  };
  const SCENE_LABEL = {
    same: '🔥 같은 열을 받으면 온도는 얼마나 오를까요?',
    graph: '📈 물·식용유·모래를 같은 열로 가열해요',
    expand: '📏 금속 막대를 가열하면 길이가 어떻게 될까요?',
    bimetal: '🧲 두 금속을 붙인 얇은 판, 바이메탈',
    life: '🗂️ 생활 속 비열과 열팽창',
  };
  const GEO = {
    same(L) {
      if (L.key === 'wide') {
        return {
          bk: [{ x: 151, y: 196, w: 170, h: 236 }, { x: 479, y: 196, w: 170, h: 236 }], gauzeY: 440, wickY: 478, benchY: 522, bench: { x: 60, y: 522, w: 680, h: 26 },
          disp: [{ x: 158, y: 46, w: 156, h: 70 }, { x: 486, y: 46, w: 156, h: 70 }], clock: { x: 400, y: 262 }, badgeY: 566,
        };
      }
      return {
        bk: [{ x: 46, y: 360, w: 190, h: 250 }, { x: 284, y: 360, w: 190, h: 250 }], gauzeY: 618, wickY: 656, benchY: 700, bench: { x: 20, y: 700, w: 480, h: 26 },
        disp: [{ x: 56, y: 170, w: 170, h: 76 }, { x: 294, y: 170, w: 170, h: 76 }], clock: { x: 260, y: 100 }, badgeY: 752, note: { x: 10, y: 790, w: 500, h: 100 },
      };
    },
    graph(L) {
      if (L.key === 'wide') {
        return {
          cx: [100, 266, 432], bw: 118, bh: 150, benchTop: 300, gauzeY: 230, wickY: 258, bench: { x: 8, y: 300, w: 512, h: 12 },
          dispW: 148, dispY: 6, dispH: 62, table: { x: 530, y: 10, w: 262, h: 292 }, graph: { x: 8, y: 318, w: 784, h: 256 }, tall: false,
        };
      }
      return {
        cx: [92, 260, 428], bw: 126, bh: 170, benchTop: 340, gauzeY: 272, wickY: 300, bench: { x: 6, y: 340, w: 508, h: 12 },
        dispW: 160, dispY: 8, dispH: 72, table: { x: 6, y: 366, w: 508, h: 226 }, graph: { x: 6, y: 604, w: 508, h: 288 }, tall: true,
      };
    },
    expand(L, e) {
      if (L.key === 'wide') {
        const yc = [lerp(122, 78, e), lerp(236, 172, e)];
        return {
          wall: { x: 20, y: yc[0] - 52, w: 26, h: yc[1] - yc[0] + 104 }, x0: 46, L0: 380, rodH: lerp(44, 38, e), yc, emax: 40,
          heater: { x: 46, y: yc[1] + 58, w: 380, h: 20 },
          bars: { x: 572, y: 10, w: 218, h: 296 },
          panel: { x: 8, y: lerp(620, 322, e), w: 784, h: 250 }, cols: 12, rows: 3,
        };
      }
      const yc = [lerp(130, 98, e), lerp(250, 214, e)];
      return {
        wall: { x: 12, y: yc[0] - 50, w: 22, h: yc[1] - yc[0] + 100 }, x0: 34, L0: 272, rodH: lerp(44, 38, e), yc, emax: 30,
        heater: { x: 34, y: yc[1] + 56, w: 272, h: 20 },
        bars: { x: 372, y: 10, w: 140, h: 296 },
        panel: { x: 6, y: lerp(1000, 352, e), w: 508, h: 540 }, cols: 8, rows: 5,
      };
    },
    bimetal(L) {
      if (L.key === 'wide') {
        return { cx: 128, L: 380, yc: 352, circuitY: 104, batt: { x: 250, y: 104 }, bulb: { x: 470, y: 104, r: 28 }, wireL: 118, wireR: 660, post: { x: 540, y: 400 }, heater: { x: 200, y: 412, w: 200, h: 22 }, benchY: 470, disp: { x: 168, y: 138, w: 196, h: 72 }, note: { x: 392, y: 132, w: 250, h: 112 } };
      }
      return { cx: 70, L: 300, yc: 520, circuitY: 150, batt: { x: 170, y: 150 }, bulb: { x: 350, y: 150, r: 30 }, wireL: 54, wireR: 480, post: { x: 408, y: 568 }, heater: { x: 120, y: 584, w: 170, h: 22 }, benchY: 640, disp: { x: 290, y: 240, w: 220, h: 78 }, note: { x: 30, y: 690, w: 460, h: 190 } };
    },
    life(L) {
      if (L.key === 'wide') {
        return { bins: { c: { x: 14, y: 12, w: 384, h: 254 }, e: { x: 402, y: 12, w: 384, h: 254 } }, slots: [0, 1, 2, 3, 4, 5].map((i) => ({ x: 14 + (i % 3) * 262, y: 288 + Math.floor(i / 3) * 144, w: 246, h: 132 })), card: { w: 232, h: 106 }, item: { dy: 58, h: 58 } };
      }
      return { bins: { c: { x: 8, y: 10, w: 504, h: 262 }, e: { x: 8, y: 280, w: 504, h: 262 } }, slots: [0, 1, 2, 3, 4, 5].map((i) => ({ x: 8 + (i % 2) * 258, y: 556 + Math.floor(i / 2) * 114, w: 246, h: 104 })), card: { w: 232, h: 92 }, item: { dy: 58, h: 62 } };
    },
  };

  /* ---------- 상태 ---------- */
  const S = { scene: 'same', fade: { k: 1 }, pick: false };
  let game = null;
  let F = new Set();
  const on = (f) => F.has(f) || !!(game && game.free);
  const isNew = (f) => !!(game && game.isNew(f));
  const VIEWS = ['wide', 'tall'].map((key) => {
    const L = LAYOUTS[key];
    const v = SciSim.stage($(key === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#f4f8fd' });
    return { key, L, v, ctx: v.ctx, D: SciSim.draw(v.ctx), fx: new SciSim.Particles(), hint: $(key === 'wide' ? '#hintWide' : '#hintTall'), bg: null };
  });
  const activeView = () => VIEWS.find((V) => V.v.canvas.offsetWidth > 0) || VIEWS[0];

  /* =========================================================
     ① ② 같은 열로 가열: 물 · 식용유 · 모래 (비열 비교용 값)
        온도 상승 = (같은 열) ÷ (비열) 에 비례 — 정성적 비교 수준
     ========================================================= */
  const SPEC = [
    { key: 'water', name: '물', icon: '💧', c: 1.0, color: '#2f6fe4', liq: '#8ec9f7', sub: '200 g' },
    { key: 'oil', name: '식용유', icon: '🛢️', c: 0.47, color: '#e08a00', liq: '#f3c84a', sub: '200 g' },
    { key: 'sand', name: '모래', icon: '🏖️', c: 0.19, color: '#a9743a', liq: '#d9b47a', sub: '200 g' },
    { key: 'iron', name: '철', icon: '⚙️', c: 0.11, color: '#64748b', liq: '#aab4c3', sub: '' },
    { key: 'copper', name: '구리', icon: '🟠', c: 0.09, color: '#c8672b', liq: '#e08a4a', sub: '' },
  ];
  const HX_END = 180, HX_RATE = 18, KHEAT = 5.5 / 60;      // 3분(180초), 화면 1초 = 실험 18초, 비열 1일 때 °C/초
  const HX = { on: false, t: 0, done: false, flame: 0, T: [20, 20, 20], rec: [[0, 20, 20, 20]], nextRec: 3, parts: [[], [], []], tableK: 0, table: false, finishPop: { s: 0 } };
  function hxSeed() {
    for (let k = 0; k < 3; k++) {
      HX.parts[k] = [];
      for (let i = 0; i < 26; i++) HX.parts[k].push({ x: 0.1 + Math.random() * 0.8, y: 0.12 + Math.random() * 0.8, ph: Math.random() * 6 });
    }
  }
  hxSeed();
  const hxTemp = (i, t) => 20 + (KHEAT * t) / SPEC[i].c;
  function hxReset() {
    Object.assign(HX, { on: false, t: 0, done: false, T: [20, 20, 20], rec: [[0, 20, 20, 20]], nextRec: 3 });
    HX.finishPop.s = 0;
    hxSeed();
    syncUI();
  }
  function hxFinishNow() {                 // 퀴즈·확인용: 3분 기록을 한 번에 채움
    HX.rec = [];
    for (let t = 0; t <= HX_END + 1e-9; t += 3) HX.rec.push([t, hxTemp(0, t), hxTemp(1, t), hxTemp(2, t)]);
    HX.t = HX_END; HX.T = [hxTemp(0, HX_END), hxTemp(1, HX_END), hxTemp(2, HX_END)]; HX.done = true; HX.on = false; HX.finishPop.s = 1;
    syncUI();
  }
  function updateHX(dt) {
    HX.flame = approach(HX.flame, HX.on && !HX.done ? 1 : 0, dt, 6);
    if (HX.on && !HX.done) {
      HX.t = Math.min(HX_END, HX.t + dt * HX_RATE);
      for (let i = 0; i < 3; i++) HX.T[i] = hxTemp(i, HX.t);
      while (HX.nextRec <= HX.t + 1e-9) { HX.rec.push([HX.nextRec, hxTemp(0, HX.nextRec), hxTemp(1, HX.nextRec), hxTemp(2, HX.nextRec)]); HX.nextRec += 3; }
      if (HX.t >= HX_END) {
        HX.done = true; HX.on = false; syncUI();
        HX.finishPop.s = 0; SciSim.tween(HX.finishPop, { s: 1 }, { duration: 0.6, ease: 'outBack' });
        Sound.tone(880, 0.14, 'triangle', 0.08); Sound.tone(1175, 0.18, 'triangle', 0.07, 0.1);
      }
    }
    // 액체 속 작은 흐름(미세 대류): 데워질수록 빨라짐
    for (let k = 0; k < 2; k++) {
      const sp = clamp((HX.T[k] - 20) / 40, 0, 2.2) * 0.55 + 0.05;
      for (const p of HX.parts[k]) {
        const u = -Math.PI * Math.sin(Math.PI * p.x) * Math.cos(Math.PI * (1 - p.y)), vu = Math.PI * Math.cos(Math.PI * p.x) * Math.sin(Math.PI * (1 - p.y));
        p.x = clamp(p.x + u * sp * dt * 0.5 + (Math.random() - 0.5) * 0.002, 0.05, 0.95); p.y = clamp(p.y - vu * sp * dt * 0.5 + (Math.random() - 0.5) * 0.002, 0.06, 0.95);
      }
    }
    HX.tableK = approach(HX.tableK, HX.table && on('table') ? 1 : 0, dt, 6);
    if (HX.tableK < 0.002) HX.tableK = 0;
  }

  /* =========================================================
     ③ 열팽창: 구리·철 막대 (확대해서 그림) + 입자 모형 (입자 사이 거리만 늘어남)
     ========================================================= */
  const RODX = [
    { key: 'cu', name: '구리', label: '구리 막대', k: 1.0, mm: 0.017, color: '#d9833f' },
    { key: 'fe', name: '철', label: '철 막대', k: 0.706, mm: 0.012, color: '#8b97a8' },
  ];
  const EX = { heat: false, heatK: 0, T: 20, sel: -1, model: true, modelK: 1, maxT: 20, sp: [new SciSim.Spring(0, { stiffness: 120, damping: 13 }), new SciSim.Spring(0, { stiffness: 120, damping: 13 })], hits: 0 };
  const exDx = (i, G) => G.emax * RODX[i].k * clamp((EX.T - 20) / 80, 0, 1.1);
  function exReset() { Object.assign(EX, { heat: false, T: 20, sel: -1, maxT: 20 }); EX.sp.forEach((s) => { s.value = 0; s.target = 0; s.velocity = 0; }); syncUI(); }
  function updateExpand(dt) {
    EX.heatK = approach(EX.heatK, EX.heat ? 1 : 0, dt, 4);
    EX.modelK = approach(EX.modelK, EX.model && on('model') ? 1 : 0, dt, 5);
    if (EX.modelK < 0.002) EX.modelK = 0; else if (EX.modelK > 0.998) EX.modelK = 1;
    EX.T = approach(EX.T, EX.heat ? 102 : 20, dt, EX.heat ? 0.26 : 0.4);
    if (!EX.heat && EX.T < 20.05) EX.T = 20;
    EX.maxT = Math.max(EX.maxT, EX.T);
    const G = GEO.expand(activeView().L, EX.modelK);
    EX.sp.forEach((s, i) => { s.target = exDx(i, G); s.update(dt); });
  }

  /* =========================================================
     ③ 바이메탈: 구리(팽창 큼) + 철(팽창 작음) → 가열하면 철 쪽(위)으로 휘어 회로가 끊김
     ========================================================= */
  const BM = {
    T: 20, heat: false, auto: false, closed: true, heatK: 0, lampK: 1, cur: 0, tOpen: 0, sparks: [],
    arc: new SciSim.Spring(0, { stiffness: 80, damping: 10 }), arm: new SciSim.Spring(0, { stiffness: 320, damping: 20 }), opened: 0,
  };
  const bmRise = (theta, L) => (theta > 1e-4 ? (L * (1 - Math.cos(theta))) / theta : 0);
  function bmReset() { Object.assign(BM, { T: 20, heat: false, closed: true, opened: 0 }); BM.arc.value = BM.arc.target = 0; BM.arc.velocity = 0; BM.arm.value = BM.arm.target = 0; BM.arm.velocity = 0; syncUI(); }
  function updateBimetal(dt) {
    const V = activeView(), G = GEO.bimetal(V.L);
    const heaterOn = BM.auto ? BM.closed : BM.heat;
    BM.heatK = approach(BM.heatK, heaterOn ? 1 : 0, dt, 9);
    BM.T = clamp(BM.T + ((heaterOn ? 7 : 0) - 0.18 * (BM.T - 20)) * dt, 20, 120);
    BM.arc.target = (clamp(1.6 * (BM.T - 40), 0, 75) * Math.PI) / 180;
    BM.arc.update(dt);
    const th = Math.max(0, BM.arc.value), rise = bmRise(th, G.L);
    if (BM.closed) {
      BM.arm.target = Math.min(rise, 22);
      if (rise > 22.5) {
        BM.closed = false; BM.arm.target = 22; BM.opened++;
        Sound.tone(520, 0.05, 'square', 0.05);
        if (!REDUCE && S.scene === 'bimetal') { V.fx.burst(G.cx + G.L, G.yc + 10, { count: 9, colors: ['#ffe27a', '#ffffff', '#ffb35a'], speed: 110, gravity: 80, life: 0.45, size: 2.4, shape: 'circle' }); }
        syncUI();
      }
    } else {
      BM.arm.target = 22;
      if (rise < 4) { BM.closed = true; Sound.tick(); syncUI(); }
    }
    BM.arm.update(dt);
    BM.lampK = approach(BM.lampK, BM.closed ? 1 : 0, dt, 12);
    if (BM.closed) BM.cur += dt;
  }

  /* =========================================================
     ④ 생활 속 사례 카드 분류 (끌어서 상자에 넣기)
     ========================================================= */
  const CARDS = [
    { id: 'rail', icon: '🚂', title: '철로 이음새의 틈', bin: 'e', why: '여름에 늘어나도 휘지 않게 틈을 둬요.' },
    { id: 'pot', icon: '🍲', title: '오래 따뜻한 뚝배기', bin: 'c', why: '비열이 큰 재료라 온도가 천천히 변해요.' },
    { id: 'wire', icon: '⚡', title: '여름철 늘어진 전깃줄', bin: 'e', why: '더우면 늘어나서 아래로 처져요.' },
    { id: 'pack', icon: '🧣', title: '오래 따뜻한 찜질팩', bin: 'c', why: '비열이 큰 물질이라 천천히 식어요.' },
    { id: 'lid', icon: '🫙', title: '안 열리는 병뚜껑', bin: 'e', why: '금속 뚜껑이 더 늘어나 헐거워져요.' },
    { id: 'sea', icon: '🏖️', title: '바닷가의 작은 일교차', bin: 'c', why: '물은 비열이 커서 온도가 천천히 변해요.' },
  ];
  const CD = CARDS.map((c, i) => Object.assign({ x: 0, y: 0, k: 0, lift: 0, shake: 0, drag: false, placed: false, order: -1, pop: 0, init: false, i }, c));
  const placedCount = () => CD.filter((c) => c.placed).length;
  function cardsReset() { CD.forEach((c) => { c.placed = false; c.order = -1; c.k = 0; c.drag = false; c.init = false; c.shake = 0; c.lift = 0; }); syncUI(); }
  function cardHome(G, c) { const s = G.slots[c.i]; return { x: s.x + (s.w - G.card.w) / 2, y: s.y + (s.h - G.card.h) / 2 }; }
  function cardTarget(G, c) {
    if (!c.placed) return cardHome(G, c);
    const b = G.bins[c.bin], n = CD.filter((q) => q.placed && q.bin === c.bin && q.order < c.order).length;
    return { x: b.x + 12, y: b.y + G.item.dy + n * (G.item.h + 6) };
  }
  function updateLife(dt) {
    const G = GEO.life(activeView().L);
    CD.forEach((c) => {
      const tg = cardTarget(G, c);
      if (!c.init) { c.x = tg.x; c.y = tg.y; c.init = true; }
      if (!c.drag) { c.x = approach(c.x, tg.x, dt, c.placed ? 12 : 13); c.y = approach(c.y, tg.y, dt, c.placed ? 12 : 13); }
      c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 16);
      c.k = approach(c.k, c.placed ? 1 : 0, dt, 9);
      c.shake = Math.max(0, c.shake - dt * 2.4);
      c.pop = Math.max(0, c.pop - dt * 2.2);
    });
  }

  /* =========================================================
     업데이트 · 그리기 공통
     ========================================================= */
  function update(dt, t) {
    if (S.scene === 'same' || S.scene === 'graph') updateHX(dt);
    else if (S.scene === 'expand') updateExpand(dt);
    else if (S.scene === 'bimetal') updateBimetal(dt);
    else updateLife(dt);
    watchSuccess(dt);
    VIEWS.forEach((V) => V.fx.update(dt));
  }
  /* ---------- 미션 성공 표시: 화면 오른쪽 위에 체크가 톡 튀어나오며 반짝임이 터짐 ---------- */
  const SUCC = { s: 0, a: 0, t: 0 };
  let lastPhase = '';
  function watchSuccess(dt) {
    const ph = game ? game.phase : '';
    if (ph === 'success' && lastPhase !== 'success') {
      SUCC.s = 0; SUCC.a = 1; SUCC.t = 0;
      SciSim.tween(SUCC, { s: 1 }, { duration: 0.55, ease: 'outBack' });
      const V = activeView();
      if (!REDUCE) V.fx.burst(V.L.vw - 42, 42, { count: 20, speed: 170, life: 0.9, colors: ['#14a058', '#ffb400', '#3867f4', '#f26b3a'] });
    }
    lastPhase = ph;
    if (SUCC.a > 0) { SUCC.t += dt; if (SUCC.t > 1.3) SUCC.a = Math.max(0, SUCC.a - dt * 2.2); }
  }
  function drawSuccess(V) {
    if (SUCC.a <= 0.01) return;
    const { ctx, D } = V;
    ctx.save(); ctx.globalAlpha = SUCC.a;
    D.check(V.L.vw - 42, 42, 24 * clamp(SUCC.s, 0, 1.15), clamp(SUCC.s, 0, 1));
    ctx.restore();
  }

  function drawView(V, t) {
    const { ctx } = V;
    V.v.clear();
    if (!V.bg) {
      V.bg = ctx.createLinearGradient(0, 0, 0, V.L.vh);
      V.bg.addColorStop(0, '#f9fbff'); V.bg.addColorStop(1, '#e8eff8');
    }
    ctx.fillStyle = V.bg; ctx.fillRect(0, 0, V.L.vw, V.L.vh);
    const k = clamp(S.fade.k, 0, 1);
    ctx.save();
    if (k < 1) { ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 18); }
    if (S.scene === 'same') drawSame(V, t);
    else if (S.scene === 'graph') drawGraph(V, t);
    else if (S.scene === 'expand') drawExpand(V, t);
    else if (S.scene === 'bimetal') drawBimetal(V, t);
    else drawLife(V, t);
    ctx.restore();
    drawSuccess(V);
    V.fx.draw(ctx);
  }
  const mss = (sec) => Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');

  /* ---------- 가열 장치: 받침대 + 알코올램프 (모두 같은 불꽃) ---------- */
  function drawRig(V, cxs, widths, gauzeY, wickY, benchY, bench, t, showHeat) {
    const { ctx, D } = V, fs = V.L.fs;
    D.shadow(() => { ctx.fillStyle = vgrad(ctx, bench.y, bench.h, [[0, '#d9e0ea'], [0.3, '#bcc7d6'], [1, '#97a5b9']]); D.roundRect(bench.x, bench.y, bench.w, bench.h, 8); ctx.fill(); }, { blur: 10, y: 4 });
    cxs.forEach((cx, i) => {
      const hw = widths[i] / 2 + 14;
      ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - hw + 6, gauzeY + 2); ctx.lineTo(cx - hw - 10, benchY); ctx.moveTo(cx + hw - 6, gauzeY + 2); ctx.lineTo(cx + hw + 10, benchY); ctx.stroke();
      drawLamp(V, cx, wickY, benchY, HX.flame, t);
    });
    // 철망 (용기 아래)
    cxs.forEach((cx, i) => {
      const hw = widths[i] / 2 + 16;
      ctx.strokeStyle = '#6b7588'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - hw, gauzeY); ctx.lineTo(cx + hw, gauzeY); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - hw + 2, gauzeY - 1); ctx.lineTo(cx + hw - 2, gauzeY - 1); ctx.stroke(); ctx.setLineDash([]);
    });
    if (showHeat && HX.flame > 0.1) {
      cxs.forEach((cx, i) => {
        [-1, 1].forEach((sd) => {
          const x = cx + sd * (widths[i] / 2 + 26 + (fs > 1 ? 4 : 0));
          const ph = REDUCE ? 0.5 : (t * 0.9 + (sd > 0 ? 0.3 : 0)) % 1;
          D.arrow(x, gauzeY + 34, x, gauzeY - 8, { color: HEAT, width: 5, head: 13, alpha: 0.7 * HX.flame });
          ctx.fillStyle = rgba('#ffd27a', HX.flame); circle(ctx, x, gauzeY + 34 - 40 * ph, 3.2); ctx.fill();
        });
      });
    }
  }

  /* ---------- 비커 속 액체 · 모래 그릇 · 온도 센서 ---------- */
  function drawLiquid(V, i, x, y, w, h, t) {
    const { ctx, D } = V, fs = V.L.fs, spec = SPEC[i], T = HX.T[i];
    groundShadow(ctx, x + w / 2, y + h + 6, w * 0.62, 8, 0.2);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; D.roundRect(x, y, w, h, 10); ctx.fill();
    const level = 0.62, ly = y + h - h * level, warm = clamp((T - 20) / 70, 0, 1);
    const top = mixc(mixc(spec.liq, '#ffffff', 0.25), '#ffd0a0', warm * 0.5), bot = mixc(spec.liq, '#ff8a5a', warm * 0.5);
    ctx.save();
    D.roundRect(x + 3, y, w - 6, h - 3, 8); ctx.clip();
    const g = ctx.createLinearGradient(0, ly, 0, y + h); g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.globalAlpha *= 0.9; ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y + h);
    for (let k = 0; k <= 24; k++) ctx.lineTo(x + (w * k) / 24, ly + (REDUCE ? 0 : Math.sin(t * 2.4 + k * 0.7 + i) * (0.8 + warm * 1.5)));
    ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + 4, ly - 1, w - 8, 3);
    // 미세한 흐름 알갱이
    const r = (fs > 1 ? 3.2 : 2.7), px0 = x + 8, pw = w - 16, py0 = ly + 8, ph = y + h - ly - 18;
    for (const p of HX.parts[i]) {
      ctx.fillStyle = i ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.7)';
      circle(ctx, px0 + p.x * pw, py0 + p.y * ph, r * (0.7 + 0.5 * Math.sin(p.ph + t * 2) * 0.3 + 0.3)); ctx.fill();
    }
    ctx.restore();
    D.beaker(x, y, w, h, { level: 0, ticks: 5 });
    return { ly };
  }
  function drawSandBowl(V, x, y, w, h, t) {
    const { ctx, D } = V, T = HX.T[2], warm = clamp((T - 20) / 90, 0, 1);
    const cx = x + w / 2, rimY = y + h * 0.42, bowlH = h - (rimY - y);
    groundShadow(ctx, cx, y + h + 5, w * 0.6, 7, 0.22);
    // 그릇(금속)
    const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#8d99ad'); g.addColorStop(0.3, '#eef2f7'); g.addColorStop(0.7, '#b3bece'); g.addColorStop(1, '#7a879b');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, rimY); ctx.bezierCurveTo(x + 2, y + h + 4, x + w - 2, y + h + 4, x + w, rimY); ctx.closePath(); ctx.fill();
    // 모래
    ctx.save();
    ctx.beginPath(); ctx.moveTo(x + 5, rimY + 2); ctx.bezierCurveTo(x + 8, y + h - 3, x + w - 8, y + h - 3, x + w - 5, rimY + 2); ctx.closePath(); ctx.clip();
    const sg = ctx.createLinearGradient(0, rimY - 20, 0, y + h);
    sg.addColorStop(0, SciSim.color.mix('#e9cf9a', '#f0a766', warm * 0.7)); sg.addColorStop(1, SciSim.color.mix('#c79a5c', '#d7742f', warm * 0.7));
    ctx.fillStyle = sg; ctx.fillRect(x, rimY - 24, w, bowlH + 30);
    ctx.restore();
    ctx.fillStyle = SciSim.color.mix('#f1d9a8', '#f5b36f', warm * 0.7);       // 모래 더미 윗면
    ctx.beginPath(); ctx.ellipse(cx, rimY + 1, w / 2 - 5, 12, 0, Math.PI, 0); ctx.fill();
    // 모래알
    for (let k = 0; k < 40; k++) {
      const a = (k * 97.3) % 1, b = (k * 53.7) % 1, gx = x + 12 + a * (w - 24), gy = rimY + 2 + b * (bowlH * 0.7);
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + k * 1.9);
      ctx.fillStyle = 'rgba(255,248,225,' + (0.25 + 0.4 * tw * (REDUCE ? 0 : 1)).toFixed(2) + ')'; circle(ctx, gx, gy, 1.3 + (k % 3) * 0.4); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(90,105,130,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, rimY); ctx.bezierCurveTo(x + 2, y + h + 4, x + w - 2, y + h + 4, x + w, rimY); ctx.stroke();
    ctx.fillStyle = '#e9eef5'; D.roundRect(x - 4, rimY - 4, w + 8, 7, 3); ctx.fill();
    if (T > 55 && !REDUCE) {                         // 뜨거워진 모래 위의 아지랑이
      ctx.save(); ctx.strokeStyle = 'rgba(255,150,80,' + (0.35 * clamp((T - 55) / 40, 0, 1)).toFixed(3) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.6 + k / 3) % 1, bx = x + w * (0.25 + k * 0.25);
        ctx.beginPath();
        for (let q = 0; q <= 7; q++) { const yy = rimY - 14 - ph * 26 - q * 4, xx = bx + Math.sin(q * 0.9 + t * 4 + k) * 3; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
      }
      ctx.restore();
    }
    return { ly: rimY - 8 };
  }
  function drawProbeLine(V, d, x, tipY, T) {
    const { ctx, D } = V;
    ctx.strokeStyle = '#3a4456'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(d.x + d.w / 2, d.y + d.h - 2); ctx.bezierCurveTo(d.x + d.w / 2, d.y + d.h + 24, x, tipY - 60, x, tipY - 32); ctx.stroke();
    ctx.fillStyle = vgrad(ctx, tipY - 34, 36, [[0, '#cfd6e2'], [1, '#7f8ba0']]); D.roundRect(x - 3, tipY - 34, 6, 34, 3); ctx.fill();
    ctx.fillStyle = thermColor(clamp(T, 20, 100)); circle(ctx, x, tipY, 4.4); ctx.fill();
  }
  function drawSample(V, i, x, y, w, h, t, dispRect, label) {
    const { ctx, D } = V, fs = V.L.fs;
    const info = i === 2 ? drawSandBowl(V, x, y, w, h, t) : drawLiquid(V, i, x, y, w, h, t);
    const px = x + w * 0.76, tip = i === 2 ? y + h * 0.78 : y + h * 0.82;
    if (on('sensor') || on('graph')) {
      drawProbeLine(V, dispRect, px, tip, HX.T[i]);
      drawDisplay(V, dispRect, SPEC[i].icon + ' ' + SPEC[i].name, HX.T[i], thermColor(clamp(HX.T[i], 20, 100)));
    }
    if (label) D.label(x + w / 2, y + h + 22 * (fs > 1 ? 1.1 : 1), SPEC[i].name + ' ' + SPEC[i].sub, { bg: shade(SPEC[i].color, -0.18), size: 13.5 * fs });
    return info;
  }

  /* ---------- ① 같은 열 ---------- */
  function drawSame(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, G = GEO.same(L), tall = L.key === 'tall';
    const cxs = G.bk.map((b) => b.x + b.w / 2);
    drawRig(V, cxs, G.bk.map((b) => b.w), G.gauzeY, G.wickY, G.benchY, G.bench, t, true);
    G.bk.forEach((b, i) => {
      drawSample(V, i, b.x, b.y, b.w, b.h, t, G.disp[i], false);
      D.label(b.x + b.w / 2, b.y - 14, SPEC[i].icon + ' ' + SPEC[i].name + ' ' + SPEC[i].sub, { bg: shade(SPEC[i].color, -0.2), size: 14 * fs });
    });
    // 가운데: 같은 가열 장치 · 시간
    const C0 = G.clock;
    const pw = tall ? 300 : 148;
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(C0.x - pw / 2, C0.y - 26, pw, 52, 16); ctx.fill(); }, { blur: 10, y: 3, color: 'rgba(20,40,80,.14)' });
    ctx.fillStyle = '#2b3445'; ctx.font = font(15 * fs, 800); ctx.textAlign = 'center';
    ctx.fillText('⏱ ' + mss(HX.t) + ' / 3:00', C0.x, C0.y - 4);
    ctx.fillStyle = '#e8edf4'; D.roundRect(C0.x - pw / 2 + 16, C0.y + 7, pw - 32, 9, 5); ctx.fill();
    ctx.fillStyle = HEAT; D.roundRect(C0.x - pw / 2 + 16, C0.y + 7, Math.max(9, (pw - 32) * HX.t / HX_END), 9, 5); ctx.fill();
    ctx.textAlign = 'left';
    D.label(cxs[0] + (cxs[1] - cxs[0]) / 2, G.bench.y + G.bench.h / 2, '같은 불꽃 = 같은 열', { bg: 'rgba(194,65,12,.92)', size: 13 * fs });
    // 온도가 오른 만큼
    if (HX.t > 0) {
      G.bk.forEach((b, i) => {
        const dT = HX.T[i] - 20;
        D.label(b.x + b.w / 2, G.badgeY, '온도 +' + dT.toFixed(1) + ' °C ▲', { bg: shade(SPEC[i].color, -0.12), size: 15 * fs });
      });
    }
    if (HX.done) {
      const s = clamp(HX.finishPop.s, 0, 1.2);
      ctx.save(); ctx.translate(C0.x, C0.y + (tall ? 70 : 62)); ctx.scale(0.6 + 0.4 * s, 0.6 + 0.4 * s);
      D.label(0, 0, '🤔 같은 열인데 오른 온도가 달라요!', { bg: '#14a058', size: 14 * fs });
      ctx.restore();
    }
    if (tall && G.note) {
      const N = G.note; panel(V, N);
      ctx.fillStyle = '#2b3445'; ctx.font = font(14 * fs, 800); ctx.fillText('👀 같은 조건', N.x + 14, N.y + 26);
      ctx.font = font(13.5 * fs, 700); ctx.fillStyle = '#3a4456';
      ctx.fillText('질량 200 g · 똑같은 알코올램프 · 같은 시간', N.x + 14, N.y + 54);
      ctx.fillStyle = '#6b7588'; ctx.fillText('= 두 물질이 받은 열의 양이 같아요.', N.x + 14, N.y + 80);
    }
    if (isNew('lamp') && !HX.on && HX.t === 0) newRing(V, { x: cxs[0] - 40, y: G.wickY - 20, w: cxs[1] - cxs[0] + 80, h: 98 }, t);
  }

  /* ---------- ② 비열 비교: 세 물질 + 그래프 + 비열 표 ---------- */
  function drawTable(V, R, k) {
    const { ctx, D } = V, fs = V.L.fs, tall = V.L.key === 'tall';
    ctx.save();
    ctx.globalAlpha *= clamp(k * 1.4, 0, 1);
    ctx.translate(0, (1 - k) * 14);
    panel(V, R, 16);
    ctx.fillStyle = '#2b3445'; ctx.font = font(14.5 * fs, 800); ctx.textAlign = 'left';
    ctx.fillText('📊 비열 (kcal/(kg·°C))', R.x + 14, R.y + 24 * fs);
    ctx.fillStyle = '#6b7588'; ctx.font = font(13 * fs, 700);
    if (tall) ctx.fillText('1 kg의 온도를 1 °C 높이는 데 필요한 열량', R.x + 14, R.y + 46 * fs);
    else { ctx.fillText('1 kg의 온도를 1 °C 높이는 데', R.x + 14, R.y + 44); ctx.fillText('필요한 열량', R.x + 14, R.y + 62); }
    const y0 = R.y + (tall ? 64 : 82), rh = (R.h - (tall ? 64 : 82) - (tall ? 32 : 46)) / 5;
    const bx0 = R.x + (tall ? 118 : 96), bmax = R.w - (tall ? 118 : 96) - (tall ? 76 : 70);
    SPEC.forEach((s, i) => {
      const yy = y0 + i * rh + rh / 2, tested = i < 3;
      ctx.fillStyle = tested ? '#2b3445' : '#6b7588'; ctx.font = font(14 * fs, 800); ctx.textAlign = 'left';
      ctx.fillText(s.icon + ' ' + s.name, R.x + 12, yy + 5);
      ctx.fillStyle = '#edf1f6'; D.roundRect(bx0, yy - 9, bmax, 18, 9); ctx.fill();
      const bw = Math.max(18, bmax * s.c * clamp(k * 1.2, 0, 1));
      const g = ctx.createLinearGradient(bx0, 0, bx0 + bw, 0); g.addColorStop(0, shade(s.color, 0.3)); g.addColorStop(1, s.color);
      ctx.fillStyle = g; D.roundRect(bx0, yy - 9, bw, 18, 9); ctx.fill();
      ctx.fillStyle = tested ? '#2b3445' : '#6b7588'; ctx.font = mono(14 * fs, 800); ctx.textAlign = 'left';
      ctx.fillText((i === 1 || i === 2 ? '≈' : '') + s.c.toFixed(2), bx0 + bmax + 8, yy + 5);
    });
    ctx.fillStyle = '#0b7a41'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'center';
    ctx.fillText('비열이 클수록 같은 열에도 온도가 잘 안 변해요', R.x + R.w / 2, R.y + R.h - 14);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  function drawGraph(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, G = GEO.graph(L), tall = G.tall;
    const bws = [G.bw, G.bw, G.bw + 12];
    const by = G.gauzeY - 6;
    drawRig(V, G.cx, bws, G.gauzeY, G.wickY, G.benchTop, G.bench, t, false);
    // 램프 받침대(실험대) 아래쪽 바닥 면
    G.cx.forEach((cx, i) => {
      const w = bws[i], h = i === 2 ? G.bh * 0.62 : G.bh;
      const x = cx - w / 2, y = by - h;
      const dr = { x: cx - G.dispW / 2, y: G.dispY, w: G.dispW, h: G.dispH };
      drawSample(V, i, x, y, w, h, t, dr, false);
    });
    // 시간–온도 그래프
    const pts = (k) => HX.rec.map((r) => [r[0] / 60, r[k]]);
    const cur = (k) => { const p = pts(k); if (HX.on && !HX.done) p.push([HX.t / 60, HX.T[k - 1]]); return p; };
    const gp = plot(V, G.graph, {
      title: '📈 시간–온도 그래프', xmax: 3, xstep: 1, ymin: 20, ymax: 110, ystep: 20, xt: '시간 (분)', yt: '온도 (°C)',
      series: [{ pts: cur(1), color: SPEC[0].color, label: '물' }, { pts: cur(2), color: SPEC[1].color, label: '식용유' }, { pts: cur(3), color: SPEC[2].color, label: '모래' }],
    });
    if (HX.rec.length < 2) { ctx.fillStyle = '#8a95a6'; ctx.font = font(13 * fs, 700); ctx.textAlign = 'center'; ctx.fillText('가열을 시작하면 그래프가 그려져요', (gp.x0 + gp.x1) / 2, (gp.y0 + gp.y1) / 2); ctx.textAlign = 'left'; }
    if (HX.t > 140) {                                                    // 선 끝에 이름표
      [0, 1, 2].forEach((i) => {
        const x = gp.px(HX.t / 60), y = gp.py(HX.T[i]);
        D.label(x - 6, y + (i === 0 ? 18 : -17), SPEC[i].name, { bg: shade(SPEC[i].color, -0.1), size: 13 * fs, align: 'right' });
      });
    }
    if (HX.done) {
      const s = clamp(HX.finishPop.s, 0, 1.2);
      const msg = '기울기가 가장 가파른 건 모래, 가장 완만한 건 물!';
      ctx.save(); ctx.font = font(13.5 * fs, 800); const lw = ctx.measureText(msg).width + 16; ctx.restore();
      ctx.save(); ctx.translate(Math.max(G.graph.x + 12 + lw / 2, gp.x0 + (gp.x1 - gp.x0) * 0.3), gp.y1 + 20); ctx.scale(0.6 + 0.4 * s, 0.6 + 0.4 * s);
      D.label(0, 0, msg, { bg: '#14a058', size: 13.5 * fs });
      ctx.restore();
    }
    if (HX.tableK > 0.01) drawTable(V, G.table, HX.tableK);
    else {                                                               // 비열 표를 열기 전에는 안내
      const R = G.table; panel(V, R, 16);
      ctx.fillStyle = '#2b3445'; ctx.font = font(14.5 * fs, 800); ctx.fillText('🔎 이렇게 비교해요', R.x + 14, R.y + 28 * (tall ? 1.1 : 1));
      ctx.fillStyle = '#3a4456'; ctx.font = font(13.5 * fs, 700);
      const tl = tall ? ['• 같은 질량 · 같은 불꽃 · 같은 시간', '• 그래프의 기울기 = 온도가 오르는 빠르기', '• 기울기가 클수록 온도가 빨리 올라요', '', '📊 비열 표를 열면 비열 값을 볼 수 있어요.'] : ['• 같은 질량 · 같은 불꽃 · 같은 시간', '• 기울기 = 온도가 오르는 빠르기', '• 기울기가 클수록 빨리 올라요', '', '📊 비열 표를 열면 물질마다', '    다른 비열 값을 볼 수 있어요.'];
      tl.forEach((s, i) => ctx.fillText(s, R.x + 14, R.y + (tall ? 64 : 62) + i * (tall ? 30 : 26)));
    }
    if (isNew('table') && HX.tableK < 0.5) newRing(V, G.table, t);
    if (isNew('graph')) newRing(V, G.graph, t);
  }

  /* ---------- ③ 열팽창: 금속 막대 ---------- */
  const ROD_STYLE = {
    cu: [[0, '#ffe0bd'], [0.2, '#f2a96b'], [0.55, '#c8672b'], [1, '#7c3a16']],
    fe: [[0, '#f6f8fb'], [0.2, '#c8d0db'], [0.6, '#8995a8'], [1, '#556075']],
  };
  function drawExpand(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, tall = L.key === 'tall';
    const G = GEO.expand(L, EX.modelK);
    const warm = clamp((EX.T - 20) / 80, 0, 1);
    // 전열기(막대 아래) + 벽
    const Hh = G.heater;
    D.shadow(() => { ctx.fillStyle = vgrad(ctx, Hh.y, Hh.h, [[0, '#8793a8'], [1, '#475268']]); D.roundRect(Hh.x, Hh.y, Hh.w + 40, Hh.h, 8); ctx.fill(); }, { blur: 10, y: 4 });
    const hg = ctx.createLinearGradient(Hh.x, 0, Hh.x + Hh.w + 40, 0);
    const hc = ramp([[0, '#3a3f4d'], [0.4, '#a83a1e'], [0.75, '#ff7a2f'], [1, '#ffd27a']], EX.heatK);
    hg.addColorStop(0, shade(hc, -0.15)); hg.addColorStop(0.5, hc); hg.addColorStop(1, shade(hc, -0.15));
    ctx.fillStyle = hg; D.roundRect(Hh.x + 8, Hh.y + 5, Hh.w + 24, Hh.h - 10, 6); ctx.fill();
    if (EX.heatK > 0.05) { ctx.save(); ctx.globalAlpha *= EX.heatK; D.glow(Hh.x + Hh.w / 2, Hh.y + Hh.h / 2, 90, '#ff8a3d', 0.32); ctx.restore(); }
    D.label(Hh.x + (tall ? 74 : Hh.w / 2 + 20), Hh.y + Hh.h / 2, EX.heatK > 0.5 ? '🔥 전열기 켜짐' : '전열기', { bg: EX.heatK > 0.5 ? '#c2410c' : '#475569', size: 13 * fs });
    const W0 = G.wall;
    D.shadow(() => { ctx.fillStyle = vgrad(ctx, W0.y, W0.h, [[0, '#8793a8'], [1, '#5a6579']]); D.roundRect(W0.x, W0.y, W0.w, W0.h, 6); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3; for (let yy = W0.y + 12; yy < W0.y + W0.h - 8; yy += 14) { ctx.beginPath(); ctx.moveTo(W0.x + 4, yy + 6); ctx.lineTo(W0.x + W0.w - 4, yy); ctx.stroke(); }
    D.label(W0.x + W0.w / 2 + 14, W0.y - 14, '고정', { bg: '#475569', size: 13 * fs });
    // 막대 2개
    RODX.forEach((r, i) => {
      const yc = G.yc[i], y0 = yc - G.rodH / 2, dx = EX.sp[i].value, x0 = G.x0, w = G.L0 + dx;
      groundShadow(ctx, x0 + w / 2, y0 + G.rodH + 10, w * 0.5, 6, 0.14);
      ctx.fillStyle = vgrad(ctx, y0, G.rodH, ROD_STYLE[r.key]); D.roundRect(x0, y0, w, G.rodH, 10); ctx.fill();
      if (warm > 0.02) { ctx.fillStyle = 'rgba(255,90,40,' + (0.32 * warm).toFixed(3) + ')'; D.roundRect(x0, y0, w, G.rodH, 10); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.4)'; D.roundRect(x0 + 6, y0 + 3, w - 12, Math.max(3, G.rodH * 0.12), 3); ctx.fill();
      ctx.fillStyle = shade(r.color, -0.25); D.roundRect(x0 + w - 7, y0, 7, G.rodH, 3); ctx.fill();
      // 처음 길이(점선) + 늘어난 부분 표시
      const xr = x0 + G.L0;
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(40,50,70,.55)'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(xr, y0 - 12); ctx.lineTo(xr, y0 + G.rodH + 12); ctx.stroke(); ctx.restore();
      if (dx > 1.2) {
        const ay = y0 + G.rodH + 15;
        D.arrow(xr, ay, xr + dx, ay, { color: '#e2463e', width: 3.5, head: 9 });
        ctx.fillStyle = 'rgba(226,70,62,.35)'; ctx.fillRect(xr, y0 + 2, dx, G.rodH - 4);
        if (tall) D.label(xr + dx / 2 - 30, ay + 24, '늘어난 부분', { bg: '#e2463e', size: 13 * fs });
        else D.label(xr + dx + 12, ay, '늘어난 부분', { bg: '#e2463e', size: 13 * fs, align: 'left' });
      }
      const nb = D.label(x0 + 10, y0 - 13, r.label, { bg: shade(r.color, -0.32), size: 13.5 * fs, align: 'left' });
      const sel = EX.sel === i;
      if (sel || S.pick) {
        const a = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.save(); ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 18; ctx.strokeStyle = rgba('#14a058', sel ? 0.85 : 0.35 + a * 0.4); ctx.lineWidth = sel ? 3.5 : 2.5;
        D.roundRect(x0 - 5, y0 - 5, w + 10, G.rodH + 10, 14); ctx.stroke(); ctx.restore();
        D.label(nb.x + nb.w + 8, y0 - 13, sel ? '✔ 선택' : '👆 눌러서 고르기', { bg: sel ? '#14a058' : 'rgba(20,160,88,.92)', size: 13 * fs, align: 'left' });
      }
    });
    D.label(G.x0 + G.L0 - (tall ? 24 : 0), G.yc[0] - G.rodH / 2 - 28, '┆ 처음 길이', { bg: 'rgba(71,85,105,.9)', size: 13 * fs });
    ctx.fillStyle = '#6b7588'; ctx.font = font(13 * fs, 700); ctx.textAlign = 'left';
    if (tall) { ctx.fillText('※ 늘어난 길이는 눈에 보이도록', G.x0, Hh.y + Hh.h + 24); ctx.fillText('  크게 확대해서 그렸어요.', G.x0, Hh.y + Hh.h + 42); }
    else ctx.fillText('※ 늘어난 길이는 눈에 보이도록 크게 확대해서 그렸어요.', G.x0, Hh.y + Hh.h + 26);
    // 늘어난 정도 막대
    const B = G.bars;
    panel(V, B, 14);
    ctx.fillStyle = '#2b3445'; ctx.font = font(14 * fs, 800); ctx.textAlign = 'center';
    ctx.fillText('📊 늘어난 정도', B.x + B.w / 2, B.y + 24 * fs);
    const bt = B.y + 52 * fs, bb = B.y + B.h - 52 * fs, bwid = tall ? 40 : 52;
    RODX.forEach((r, i) => {
      const x = B.x + B.w * (i ? 0.7 : 0.3), hmax = bb - bt;
      ctx.fillStyle = '#edf1f6'; D.roundRect(x - bwid / 2, bt, bwid, hmax, 10); ctx.fill();
      const hh = hmax * clamp(EX.sp[i].value / (G.emax * 1.05), 0, 1);
      const g = ctx.createLinearGradient(x - bwid / 2, 0, x + bwid / 2, 0); g.addColorStop(0, shade(r.color, 0.35)); g.addColorStop(0.5, r.color); g.addColorStop(1, shade(r.color, -0.2));
      ctx.fillStyle = g; D.roundRect(x - bwid / 2, bb - Math.max(hh, 4), bwid, Math.max(hh, 4), 10); ctx.fill();
      ctx.fillStyle = '#3a4456'; ctx.font = font(13.5 * fs, 800); ctx.fillText(r.name, x, bb + 20 * fs);
    });
    ctx.fillStyle = '#8a95a6'; ctx.font = font(13 * fs, 700); ctx.fillText('많이 ▲', B.x + B.w / 2, bt - 8); ctx.fillText('(같은 온도로 가열)', B.x + B.w / 2, B.y + B.h - 10);
    ctx.textAlign = 'left';
    if (EX.modelK > 0.01) drawExpandModel(V, G, t);
    if (isNew('model')) newRing(V, G.panel, t);
  }
  // 입자 모형: 입자 크기는 그대로, 사이 거리만 늘어난다
  function drawExpandModel(V, G, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, tall = L.key === 'tall', e = EX.modelK;
    const P = G.panel, ri = EX.sel >= 0 ? EX.sel : 0, r = RODX[ri];
    ctx.save();
    ctx.globalAlpha *= clamp(e * 1.3, 0, 1);
    panel(V, P, 16);
    ctx.fillStyle = '#2b3445'; ctx.font = font(15 * fs, 800); ctx.textAlign = 'left';
    ctx.fillText('🔍 입자 모형 — ' + r.label + ' 속', P.x + 14, P.y + 26 * fs);
    D.label(P.x + P.w - 12, P.y + 22 * fs, '온도 ' + EX.T.toFixed(0) + ' °C', { bg: ramp([[20, '#3f7df0'], [60, '#9b5de5'], [100, '#e2463e']], EX.T), size: 14 * fs, align: 'right' });
    const cols = G.cols, rows = G.rows;
    const lx0 = P.x + (tall ? 58 : 70), lw0 = P.w - (tall ? 58 : 70) - (tall ? 118 : 90);
    const aTop = P.y + 80 * fs, aBot = P.y + P.h - (tall ? 196 : 96);
    const d0 = lw0 / (cols - 1) / 1.72, g = 0.6 * r.k * clamp((EX.T - 20) / 80, 0, 1.1);       // 입자 사이 거리 늘어남(과장)
    const d = d0 * (1 + g), dy = rows > 1 ? Math.min(d0 * 1.15, (aBot - aTop) / (rows - 1)) : 0;
    const ly0 = (aTop + aBot) / 2 - (dy * (rows - 1)) / 2, ly1 = ly0 + dy * (rows - 1);
    const rad = clamp(d0 * 0.3, 6, 12), ampMax = d0 * 0.26;
    const heat = clamp((EX.T - 20) / 80, 0, 1), A = (REDUCE ? 0.4 : 1) * (0.06 + 0.94 * heat) * ampMax;
    // 고정 벽
    ctx.fillStyle = vgrad(ctx, ly0 - 20, ly1 - ly0 + 40, [[0, '#8793a8'], [1, '#5a6579']]); D.roundRect(lx0 - 36, ly0 - 20, 22, ly1 - ly0 + 40, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'center'; ctx.fillText('고정', lx0 - 25, ly1 + 38);
    const col = partColor(20 + heat * 60);
    const pos = [];
    for (let rr = 0; rr < rows; rr++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const sx = lx0 + c * d, sy = rows > 1 ? ly0 + rr * dy : (ly0 + ly1) / 2;
        const w1 = 11 + jit(c, rr, 3) * 7, w2 = 10 + jit(c, rr, 4) * 8, p1 = jit(c, rr, 5) * TAU, p2 = jit(c, rr, 6) * TAU;
        row.push({ x: sx + A * Math.cos(w1 * t + p1), y: sy + A * Math.sin(w2 * t + p2), sx, sy });
      }
      pos.push(row);
    }
    // 처음 자리(점선 고리): 입자 사이가 얼마나 벌어졌는지 보여 줌
    if (g > 0.03) {
      ctx.save(); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.4;
      for (let c = 1; c < cols; c++) { circle(ctx, lx0 + c * d0, rows > 1 ? ly0 : (ly0 + ly1) / 2, rad); ctx.stroke(); }
      ctx.restore();
    }
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = 'rgba(110,128,160,.55)'; ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
        const a = pos[rr][c];
        if (pass === 0 && c < cols - 1) { const b = pos[rr][c + 1]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        if (pass === 1 && rr < rows - 1) { const b = pos[rr + 1][c]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      }
      ctx.stroke();
    }
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) ball(ctx, pos[rr][c].x, pos[rr][c].y, rad, col);
    // 거리 · 크기 표시선
    const mr = rows > 1 ? 0 : 0, my = ly1 + 22 * fs, cA = Math.floor(cols / 2) - 1, cB = cA + 1;
    const xa = lx0 + cA * d, xb = lx0 + cB * d;
    ctx.strokeStyle = '#e2463e'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(xa, my - 8); ctx.lineTo(xa, my + 8); ctx.moveTo(xb, my - 8); ctx.lineTo(xb, my + 8); ctx.moveTo(xa, my); ctx.lineTo(xb, my); ctx.stroke();
    D.label((xa + xb) / 2, my + 20 * fs, '입자 사이 거리 ' + (g > 0.03 ? '↔ 늘어남' : ''), { bg: '#e2463e', size: 13 * fs });
    const ex = lx0 + (cols - 1) * d + 34;
    D.label(P.x + P.w - 52, ly0 + (ly1 - ly0) / 2 - 18, '입자 크기', { bg: '#14a058', size: 13 * fs });
    D.label(P.x + P.w - 52, ly0 + (ly1 - ly0) / 2 + 10, '그대로!', { bg: '#14a058', size: 13 * fs });
    ctx.fillStyle = '#3a4456'; ctx.font = font(14 * fs, 800); ctx.textAlign = 'center';
    if (tall) {
      ctx.fillText('온도가 높아지면 입자 운동이 활발해져요.', P.x + P.w / 2, P.y + P.h - 126);
      ctx.fillText('그래서 입자 사이의 거리가 멀어지고,', P.x + P.w / 2, P.y + P.h - 100);
      ctx.fillText('물질의 길이(부피)가 늘어나요.', P.x + P.w / 2, P.y + P.h - 74);
      ctx.fillStyle = '#6b7588'; ctx.font = font(13 * fs, 700);
      ctx.fillText('(입자 자체의 크기와 개수는 변하지 않아요)', P.x + P.w / 2, P.y + P.h - 44);
    } else ctx.fillText('입자 운동이 활발해져 입자 사이의 거리가 멀어져요 (입자 크기는 그대로)', P.x + P.w / 2, P.y + P.h - 14);
    ctx.textAlign = 'left';
    ctx.restore();
  }
  function jit(c, r, k) { const s = Math.sin(c * 127.1 + r * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }

  /* ---------- ③ 바이메탈 스위치 ---------- */
  function stripPoints(x0, yc, Ls, th, n) {
    const k = th > 1e-4 ? th / Ls : 0, P = [];
    for (let i = 0; i <= n; i++) {
      const s = (Ls * i) / n;
      const phi = k * s;
      const px = k ? Math.sin(phi) / k : s, py = k ? (1 - Math.cos(phi)) / k : 0;
      P.push({ x: x0 + px, y: yc - py, nx: -Math.sin(phi), ny: -Math.cos(phi) });     // (nx, ny): 위쪽(오목한 쪽) 법선
    }
    return P;
  }
  function polyBand(ctx, P, o1, o2) {
    ctx.beginPath();
    P.forEach((p, i) => { const x = p.x + p.nx * o1, y = p.y + p.ny * o1; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    for (let i = P.length - 1; i >= 0; i--) ctx.lineTo(P[i].x + P[i].nx * o2, P[i].y + P[i].ny * o2);
    ctx.closePath();
  }
  function alongPath(pts, dist) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (dist <= acc + l) { const f = (dist - acc) / l; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; }
      acc += l;
    }
    return pts[pts.length - 1];
  }
  function drawBimetal(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, G = GEO.bimetal(L), tall = L.key === 'tall';
    const th = Math.max(0, BM.arc.value), thick = 24, half = thick / 2;
    const tipFlatX = G.cx + G.L;
    // 실험대
    D.shadow(() => { ctx.fillStyle = vgrad(ctx, G.benchY, 24, [[0, '#d9e0ea'], [0.3, '#bcc7d6'], [1, '#97a5b9']]); D.roundRect(20, G.benchY, L.vw - 40, 24, 8); ctx.fill(); }, { blur: 10, y: 4 });
    // 전열기(바이메탈 아래)
    const Hh = G.heater;
    D.shadow(() => { ctx.fillStyle = vgrad(ctx, Hh.y, Hh.h, [[0, '#8793a8'], [1, '#475268']]); D.roundRect(Hh.x, Hh.y, Hh.w, Hh.h, 8); ctx.fill(); }, { blur: 8, y: 3 });
    const hc = ramp([[0, '#3a3f4d'], [0.4, '#a83a1e'], [0.75, '#ff7a2f'], [1, '#ffd27a']], BM.heatK);
    const hg = ctx.createLinearGradient(Hh.x, 0, Hh.x + Hh.w, 0); hg.addColorStop(0, shade(hc, -0.15)); hg.addColorStop(0.5, hc); hg.addColorStop(1, shade(hc, -0.15));
    ctx.fillStyle = hg; D.roundRect(Hh.x + 8, Hh.y + 5, Hh.w - 16, Hh.h - 10, 6); ctx.fill();
    ctx.fillStyle = vgrad(ctx, Hh.y + Hh.h, G.benchY - Hh.y - Hh.h, [[0, '#6b7588'], [1, '#4a5568']]); ctx.fillRect(Hh.x + 20, Hh.y + Hh.h, 12, G.benchY - Hh.y - Hh.h); ctx.fillRect(Hh.x + Hh.w - 32, Hh.y + Hh.h, 12, G.benchY - Hh.y - Hh.h);
    if (BM.heatK > 0.05) {
      ctx.save(); ctx.globalAlpha *= BM.heatK; D.glow(Hh.x + Hh.w / 2, Hh.y - 4, 110, '#ff8a3d', 0.45); ctx.restore();
      if (!REDUCE) { ctx.save(); ctx.strokeStyle = 'rgba(255,140,70,' + (0.4 * BM.heatK).toFixed(3) + ')'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) { const ph = (t * 0.7 + i / 4) % 1, bx = Hh.x + Hh.w * (0.18 + i * 0.21); ctx.beginPath(); for (let q = 0; q <= 6; q++) { const yy = Hh.y - 6 - ph * 22 - q * 4, xx = bx + Math.sin(q * 0.9 + t * 4 + i) * 3; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
        ctx.restore(); }
    }
    D.label(Hh.x + Hh.w / 2, Hh.y + Hh.h + 20, BM.heatK > 0.5 ? '🔥 전열기 켜짐' : '전열기 (꺼짐)', { bg: BM.heatK > 0.5 ? '#c2410c' : '#475569', size: 13 * fs });
    // 회로: 전선 경로
    const pad = { x: G.post.x, y: G.benchY - 2 }, cl = { x: G.cx - 6, y: G.yc - 40 };
    const path = [[G.wireL + (tall ? 0 : 8), G.circuitY], [G.batt.x - 34, G.circuitY]];
    const wire = [[cl.x, cl.y], [cl.x, G.circuitY], [G.wireL, G.circuitY]];
    ctx.strokeStyle = '#3a4456'; ctx.lineWidth = 4.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // (왼쪽) 클램프 → 위 → 건전지
    const loop = [[cl.x, cl.y + 30], [cl.x, G.circuitY], [G.batt.x - 30, G.circuitY]];
    ctx.beginPath(); loop.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    // 건전지 → 전구
    ctx.beginPath(); ctx.moveTo(G.batt.x + 30, G.circuitY); ctx.lineTo(G.bulb.x - G.bulb.r, G.circuitY); ctx.stroke();
    // 전구 → 오른쪽 → 아래 → 접점 기둥
    const rloop = [[G.bulb.x + G.bulb.r, G.circuitY], [G.wireR, G.circuitY], [G.wireR, G.post.y + 36], [pad.x + 4, G.post.y + 36], [pad.x + 4, G.post.y + 12]];
    ctx.beginPath(); rloop.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    // 흐르는 전류(닫힘일 때만)
    if (BM.closed && BM.lampK > 0.3) {
      const full = [].concat([[cl.x, cl.y + 30], [cl.x, G.circuitY], [G.bulb.x - G.bulb.r, G.circuitY]], [[G.bulb.x + G.bulb.r, G.circuitY]], rloop.slice(1));
      let len = 0; for (let i = 1; i < full.length; i++) len += Math.hypot(full[i][0] - full[i - 1][0], full[i][1] - full[i - 1][1]);
      const n = 16;
      for (let i = 0; i < n; i++) {
        const d = ((i / n) * len + (REDUCE ? 0 : BM.cur * 110)) % len;
        const [x, y] = alongPath(full, d);
        ctx.fillStyle = 'rgba(255,211,77,' + (0.85 * BM.lampK).toFixed(2) + ')'; circle(ctx, x, y, 3.6); ctx.fill();
      }
    }
    // 건전지
    const bt = G.batt;
    ctx.strokeStyle = '#3a4456'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(bt.x - 30, bt.y); ctx.lineTo(bt.x - 14, bt.y); ctx.moveTo(bt.x + 14, bt.y); ctx.lineTo(bt.x + 30, bt.y); ctx.stroke();
    ctx.fillStyle = '#3a4456'; D.roundRect(bt.x - 14, bt.y - 22, 6, 44, 3); ctx.fill(); D.roundRect(bt.x - 2, bt.y - 12, 6, 24, 3); ctx.fill(); D.roundRect(bt.x + 10, bt.y - 22, 6, 44, 3); ctx.fill();
    D.label(bt.x, bt.y - 38, '🔋 건전지', { bg: '#64748b', size: 13 * fs });
    // 전구
    const bu = G.bulb;
    if (BM.lampK > 0.02) { ctx.save(); ctx.globalAlpha *= BM.lampK; D.glow(bu.x, bu.y, bu.r * 3.4, '#ffe27a', 0.85); ctx.restore(); }
    const bgc = ctx.createRadialGradient(bu.x - bu.r * 0.3, bu.y - bu.r * 0.35, 2, bu.x, bu.y, bu.r);
    bgc.addColorStop(0, SciSim.color.mix('#f0f3f8', '#fffbd6', BM.lampK)); bgc.addColorStop(1, SciSim.color.mix('#aab4c3', '#ffd34d', BM.lampK));
    ctx.fillStyle = bgc; circle(ctx, bu.x, bu.y, bu.r); ctx.fill();
    ctx.strokeStyle = 'rgba(90,105,130,.7)'; ctx.lineWidth = 2.5; circle(ctx, bu.x, bu.y, bu.r); ctx.stroke();
    ctx.strokeStyle = SciSim.color.mix('#7d8696', '#ff9a1f', BM.lampK); ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(bu.x - 9, bu.y + bu.r * 0.6); ctx.lineTo(bu.x - 9, bu.y); ctx.lineTo(bu.x - 4, bu.y - 8); ctx.lineTo(bu.x + 4, bu.y + 8); ctx.lineTo(bu.x + 9, bu.y); ctx.lineTo(bu.x + 9, bu.y + bu.r * 0.6); ctx.stroke();
    D.label(bu.x, bu.y - bu.r - 18, BM.closed ? '💡 전구 켜짐' : '💡 전구 꺼짐', { bg: BM.closed ? '#b45309' : '#475569', size: 13.5 * fs });
    // 접점 기둥 + 스프링 판
    const arm = BM.arm.value;
    ctx.fillStyle = vgrad(ctx, G.post.y, G.benchY - G.post.y, [[0, '#8793a8'], [1, '#5a6579']]); D.roundRect(G.post.x - 4, G.post.y + 4, 16, G.benchY - G.post.y - 4, 4); ctx.fill();
    const armY = G.yc + half + 3 - arm;
    ctx.fillStyle = '#c9d2de'; ctx.save(); ctx.translate(G.post.x + 6, G.post.y + 6); ctx.restore();
    ctx.strokeStyle = '#7d8aa0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(G.post.x + 6, G.post.y + 8); ctx.lineTo(G.post.x + 6, armY + 8); ctx.lineTo(tipFlatX - 16, armY + 4); ctx.stroke();
    ctx.fillStyle = '#ffd34d'; circle(ctx, tipFlatX - 12, armY + 3, 4.2); ctx.fill();
    // 바이메탈 판 (아래 구리 · 위 철)
    const P = stripPoints(G.cx, G.yc, G.L, th, 36);
    D.shadow(() => { ctx.fillStyle = '#9aa6b8'; polyBand(ctx, P, 0, half); ctx.fill(); polyBand(ctx, P, -half, 0); ctx.fillStyle = '#d9833f'; ctx.fill(); }, { blur: 10, y: 5 });
    ctx.fillStyle = vgrad(ctx, G.yc - half, half, [[0, '#f2f5fa'], [0.4, '#b8c2d1'], [1, '#8794a8']]);
    ctx.save(); polyBand(ctx, P, 0, half); ctx.clip(); ctx.fillStyle = '#9aa6b8'; ctx.fillRect(0, 0, L.vw, L.vh); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); P.forEach((p, i) => { const x = p.x + p.nx * (half - 3), y = p.y + p.ny * (half - 3); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,50,70,.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    // 클램프(고정)
    D.shadow(() => { ctx.fillStyle = vgrad(ctx, G.yc - 44, 88, [[0, '#8793a8'], [1, '#556075']]); D.roundRect(G.cx - 34, G.yc - 40, 36, 80, 8); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = '#cfd6e2'; circle(ctx, G.cx - 16, G.yc - 24, 4); ctx.fill(); circle(ctx, G.cx - 16, G.yc + 24, 4); ctx.fill();
    D.label(G.cx - 16, G.yc + 62, '고정', { bg: '#475569', size: 13 * fs });
    // 금속 이름표
    const mid = P[Math.floor(P.length * 0.45)];
    D.label(mid.x + mid.nx * 30, mid.y + mid.ny * 30 - 4, '철 (팽창 작음)', { bg: '#64748b', size: 13 * fs });
    D.label(mid.x - mid.nx * 30, mid.y - mid.ny * 30 + 6, '구리 (팽창 큼)', { bg: '#b45309', size: 13 * fs });
    // 온도 표시 + 안내
    drawDisplay(V, G.disp, '🌡️ 바이메탈 온도', BM.T, thermColor(clamp(BM.T, 20, 100)));
    const stc = BM.closed ? '#14a058' : '#e2463e';
    D.label(G.disp.x + G.disp.w / 2, G.disp.y + G.disp.h + 22, BM.closed ? '🔌 회로 닫힘' : '🔌 회로 끊김', { bg: stc, size: 14 * fs });
    const N = G.note; panel(V, N, 14);
    ctx.fillStyle = '#3a4456'; ctx.font = font(13.5 * fs, 700); ctx.textAlign = 'left';
    const lines = tall ? ['구리가 철보다 더 늘어나서', '판이 철 쪽(위)으로 휘어요.', '휘면 접점이 떨어져 전류가 끊기고,', '식으면 다시 펴져 이어져요.', '→ 온도 조절 장치에 쓰여요'] : ['구리가 더 늘어나 철 쪽(위)으로', '휘어져요. 그러면 접점이 떨어져', '회로가 끊겨요.', '식으면 다시 펴져서 이어져요.'];
    lines.forEach((s, i) => ctx.fillText(s, N.x + 12, N.y + 28 + i * (tall ? 30 : 24)));
    if (BM.auto) D.label(G.disp.x + G.disp.w / 2, G.disp.y + G.disp.h + 54, '🔌 자동 온도 조절 중', { bg: '#0f766e', size: 13.5 * fs });
    if (isNew('bimetal') && BM.opened === 0 && BM.T < 25) newRing(V, { x: G.cx - 40, y: G.yc - 40, w: G.L + 90, h: 90 }, t);
  }

  /* ---------- ④ 생활 속 사례 카드 분류 ---------- */
  const BIN = {
    c: { name: '🌡️ 비열', sub: '비열이 커서 온도가 천천히 변해요', color: '#2f6fe4', tint: 'rgba(47,111,228,.09)' },
    e: { name: '📏 열팽창', sub: '가열하면 길이·부피가 늘어나요', color: '#e0701f', tint: 'rgba(242,107,58,.10)' },
  };
  const BINF = { c: 0, e: 0 };
  let hoverBin = null;
  function cardRect(G, c) {
    const w = lerp(G.card.w, G.bins[c.bin].w - 24, c.k), h = lerp(G.card.h, G.item.h, c.k);
    return { x: c.x, y: c.y, w, h };
  }
  function drawCard(V, G, c, t) {
    const { ctx, D } = V, fs = V.L.fs, R = cardRect(G, c), b = BIN[c.bin];
    const sc = 1 + c.lift * 0.06 + c.pop * 0.05, sx = Math.sin(t * 46) * 7 * c.shake;
    ctx.save();
    ctx.translate(R.x + R.w / 2 + sx, R.y + R.h / 2); ctx.scale(sc, sc); ctx.translate(-R.w / 2, -R.h / 2);
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(0, 0, R.w, R.h, 14); ctx.fill(); }, { blur: 8 + c.lift * 16, y: 3 + c.lift * 8, color: c.lift > 0.1 ? 'rgba(20,40,80,.3)' : 'rgba(20,40,80,.16)' });
    ctx.strokeStyle = c.placed ? b.color : (c.shake > 0.1 ? '#e2463e' : '#dde4ef'); ctx.lineWidth = c.placed ? 2.5 : 1.6; D.roundRect(0, 0, R.w, R.h, 14); ctx.stroke();
    if (c.k < 0.5) {
      ctx.globalAlpha *= 1 - c.k * 2;
      ctx.font = font(34 * fs * 0.85, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(c.icon, R.w / 2, R.h * 0.5 + 2);
      ctx.fillStyle = '#2b3445'; ctx.font = font(14.5 * fs, 800); ctx.fillText(c.title, R.w / 2, R.h - 18 * fs * 0.9);
      ctx.textAlign = 'left';
    } else {
      ctx.globalAlpha *= (c.k - 0.5) * 2;
      ctx.font = font(26 * fs * 0.9, 700); ctx.textAlign = 'left'; ctx.fillStyle = '#000'; ctx.fillText(c.icon, 10, R.h / 2 + 9);
      ctx.fillStyle = '#2b3445'; ctx.font = font(14 * fs, 800); ctx.fillText(c.title, 50, 22 * fs);
      ctx.fillStyle = '#5d6879'; ctx.font = font(13 * fs, 600);
      const maxW = R.w - 60, words = c.why.split(' '); let line = '', yy = 40 * fs;
      words.forEach((w) => { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, 50, yy); line = w; yy += 16 * fs; } else line = test; });
      ctx.fillText(line, 50, yy);
      D.check(R.w - 18, 18, 9, 1);
    }
    ctx.restore();
  }
  function drawLife(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, G = GEO.life(L);
    ['c', 'e'].forEach((k) => {
      const B = G.bins[k], b = BIN[k], hot = hoverBin === k;
      ctx.save();
      D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(B.x, B.y, B.w, B.h, 16); ctx.fill(); }, { blur: hot ? 20 : 12, y: 4, color: hot ? rgba(b.color, 0.35) : 'rgba(20,40,80,.14)' });
      ctx.fillStyle = b.tint; D.roundRect(B.x, B.y, B.w, B.h, 16); ctx.fill();
      ctx.strokeStyle = BINF[k] > 0.05 ? rgba('#e2463e', 0.4 + BINF[k] * 0.6) : hot ? b.color : rgba(b.color, 0.55); ctx.lineWidth = hot || BINF[k] > 0.05 ? 4 : 2.4; ctx.setLineDash(hot ? [] : [9, 6]); D.roundRect(B.x, B.y, B.w, B.h, 16); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = b.color; ctx.font = font(16.5 * fs, 800); ctx.textAlign = 'left'; ctx.fillText(b.name, B.x + 16, B.y + 28 * fs);
      ctx.fillStyle = '#5d6879'; ctx.font = font(13 * fs, 700); ctx.fillText(b.sub, B.x + 16, B.y + 46 * fs);
      const n = CD.filter((c) => c.placed && c.bin === k).length;
      if (!n) { ctx.fillStyle = rgba(b.color, 0.5); ctx.font = font(14 * fs, 800); ctx.textAlign = 'center'; ctx.fillText('여기에 카드를 넣어요', B.x + B.w / 2, B.y + B.h / 2 + 20); ctx.textAlign = 'left'; }
      ctx.restore();
      BINF[k] = Math.max(0, BINF[k] - 0.03);
    });
    // 카드 (놓지 않은 것 → 놓은 것 → 끌고 있는 것 순서로)
    CD.filter((c) => !c.placed && !c.drag).forEach((c) => drawCard(V, G, c, t));
    CD.filter((c) => c.placed).forEach((c) => drawCard(V, G, c, t));
    CD.filter((c) => c.drag).forEach((c) => drawCard(V, G, c, t));
    if (isNew('cards') && placedCount() === 0) {
      const s0 = G.slots[0], s5 = G.slots[5];
      newRing(V, { x: s0.x, y: s0.y, w: s5.x + s5.w - s0.x, h: s5.y + s5.h - s0.y }, t);
    }
    // 모두 분류하면 정리 카드가 나타남
    const kAll = Math.min(...CD.map((c) => c.k));
    if (kAll > 0.2) {
      const y0 = G.slots[0].y - 4, y1 = G.slots[5].y + G.slots[5].h, R = { x: G.bins.c.x, y: y0, w: G.bins.e.x + G.bins.e.w - G.bins.c.x, h: y1 - y0 };
      ctx.save(); ctx.globalAlpha *= clamp((kAll - 0.2) * 1.5, 0, 1);
      panel(V, R, 16);
      ctx.textAlign = 'center'; ctx.fillStyle = '#0b7a41'; ctx.font = font(18 * fs, 800); ctx.fillText('🎉 모두 알맞게 분류했어요!', R.x + R.w / 2, R.y + 38 * fs);
      const rows = [['🌡️', BIN.c.color, '비열이 큰 물질은 온도가 천천히 변해요', '→ 뚝배기·찜질팩은 오래 따뜻하고, 바닷가는 일교차가 작아요'], ['📏', BIN.e.color, '가열하면 길이(부피)가 늘어나요 (열팽창)', '→ 철로·전깃줄은 늘어나는 것을 고려하고, 병뚜껑·바이메탈은 활용해요']];
      rows.forEach((r, i) => {
        const yy = R.y + 62 * fs + i * (R.h - 70 * fs) / 2, hh = (R.h - 70 * fs) / 2 - 10;
        ctx.fillStyle = rgba(r[1], 0.1); D.roundRect(R.x + 16, yy, R.w - 32, hh, 12); ctx.fill();
        ctx.font = font(30 * fs, 700); ctx.textAlign = 'left'; ctx.fillStyle = '#000'; ctx.fillText(r[0], R.x + 28, yy + hh / 2 + 10);
        ctx.fillStyle = r[1]; ctx.font = font(15.5 * fs, 800); ctx.fillText(r[2], R.x + 76, yy + hh / 2 - 6);
        ctx.fillStyle = '#4a5568'; ctx.font = font(13.5 * fs, 700); ctx.fillText(r[3], R.x + 76, yy + hh / 2 + 18);
      });
      ctx.restore(); ctx.textAlign = 'left';
    }
  }

  /* =========================================================
     입력 (누르기·끌기)
     ========================================================= */
  function hitRod(V, p) {
    if (S.scene !== 'expand') return -1;
    const G = GEO.expand(V.L, EX.modelK);
    for (let i = 0; i < 2; i++) if (p.x > G.x0 - 12 && p.x < G.x0 + G.L0 + G.emax + 16 && Math.abs(p.y - G.yc[i]) <= G.rodH / 2 + 14) return i;
    return -1;
  }
  let drag = null;
  function hitCard(V, p) {
    if (S.scene !== 'life' || !on('cards')) return null;
    const G = GEO.life(V.L), list = CD.filter((c) => !c.placed);
    for (let i = list.length - 1; i >= 0; i--) { const R = cardRect(G, list[i]); if (p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h) return list[i]; }
    return null;
  }
  const binAt = (G, x, y) => ['c', 'e'].find((k) => { const B = G.bins[k]; return x >= B.x && x <= B.x + B.w && y >= B.y && y <= B.y + B.h; }) || null;
  function placeCard(V, G, c, key) {
    c.placed = true; c.order = Math.max(-1, ...CD.map((q) => q.order)) + 1; c.pop = 1; c.drag = false;
    Sound.success();
    const B = G.bins[key];
    if (!REDUCE) V.fx.burst(B.x + B.w / 2, B.y + B.h / 2, { count: 14, colors: [BIN[key].color, '#ffb400', '#14a058'], speed: 150 });
    if (placedCount() === CD.length) { Sound.level(); if (!REDUCE) V.fx.burst(B.x + B.w / 2, B.y + 60, { count: 26, speed: 190 }); }
    syncUI();
  }
  VIEWS.forEach((V) => {
    const hits = (p) => hitRod(V, p) >= 0 || !!hitCard(V, p);
    SciSim.pointer(V.v, {
      hover: (p) => (hitCard(V, p) ? 'grab' : hitRod(V, p) >= 0 ? 'pointer' : null),
      down(p) {
        const ri = hitRod(V, p);
        if (ri >= 0) { EX.sel = ri; Sound.click(); hideHint(); syncUI(); return false; }
        const c = hitCard(V, p);
        if (c) {
          const G = GEO.life(V.L), R = cardRect(G, c);
          drag = { c, ox: p.x - R.x, oy: p.y - R.y, sx: p.x, sy: p.y, moved: false };
          c.drag = true; hideHint(); Sound.click(); V.v.canvas.style.cursor = 'grabbing';
          return true;
        }
        return false;
      },
      move(p) {
        if (!drag) return;
        const G = GEO.life(V.L), R = cardRect(G, drag.c);
        drag.c.x = p.x - drag.ox; drag.c.y = p.y - drag.oy;
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) drag.moved = true;
        hoverBin = binAt(G, drag.c.x + R.w / 2, drag.c.y + R.h / 2);
      },
      up(p) {
        V.v.canvas.style.cursor = '';
        if (!drag) return;
        const { c } = drag, G = GEO.life(V.L), R = cardRect(G, c);
        c.drag = false;
        if (!drag.moved) { showHint(c.icon + ' ' + c.title + ' — 알맞은 상자로 끌어서 넣어 보세요', 3500); drag = null; hoverBin = null; return; }
        const bin = binAt(G, c.x + R.w / 2, c.y + R.h / 2);
        if (bin === c.bin) placeCard(V, G, c, bin);
        else if (bin) { c.shake = 1; BINF[bin] = 1; Sound.fail(); showHint(bin === 'c' ? '이 카드는 비열이 아니라 다른 성질과 관계있어요. 다시 생각해 봐요!' : '이 카드는 열팽창이 아니라 다른 성질과 관계있어요. 다시 생각해 봐요!', 3500); }
        drag = null; hoverBin = null;
      },
    });
    if (V.key === 'tall') {
      V.v.canvas.style.touchAction = 'pan-y';
      V.v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc && hits(V.v.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
  });

  /* =========================================================
     화면 밖(DOM) 조작
     ========================================================= */
  function showHint(text, ms) {
    VIEWS.forEach((V) => { V.hint.textContent = text; V.hint.classList.remove('hide'); });
    clearTimeout(showHint.t);
    showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { VIEWS.forEach((V) => V.hint.classList.add('hide')); }
  const press = (el, v) => el.setAttribute('aria-pressed', v ? 'true' : 'false');
  function toggleHX() {
    Sound.click(); hideHint();
    if (HX.done) { showHint('3분 기록이 끝났어요. ↺ 다시 하기로 처음부터 해 볼 수 있어요', 3500); return; }
    HX.on = !HX.on;
    if (HX.on) Sound.tone(300, 0.2, 'sawtooth', 0.03);
    syncUI();
  }
  $('#btnSame').addEventListener('click', toggleHX);
  $('#btnGraph').addEventListener('click', toggleHX);
  $('#btnSameReset').addEventListener('click', () => { Sound.click(); hxReset(); });
  $('#btnGraphReset').addEventListener('click', () => { Sound.click(); hxReset(); });
  $('#tgTable').addEventListener('click', () => { Sound.click(); HX.table = !HX.table; syncUI(); });
  $('#btnRods').addEventListener('click', () => { Sound.click(); hideHint(); EX.heat = !EX.heat; syncUI(); });
  $('#tgModelX').addEventListener('click', () => { Sound.click(); EX.model = !EX.model; syncUI(); });
  $('#btnBim').addEventListener('click', () => { Sound.click(); hideHint(); if (BM.auto) return; BM.heat = !BM.heat; syncUI(); });
  $('#tgAuto').addEventListener('click', () => {
    Sound.click(); hideHint(); BM.auto = !BM.auto; BM.heat = false;
    if (BM.auto) showHint('전류가 흐르면 가열 → 휘어 회로가 끊기면 가열 멈춤 → 식으면 다시 이어져요', 5500);
    syncUI();
  });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));

  function setScene(name) {
    if (S.scene !== name) {
      S.scene = name;
      S.fade.k = 0;
      SciSim.tween(S.fade, { k: 1 }, { duration: 0.45, ease: 'outCubic' });
      hideHint();
    }
    document.body.dataset.scene = name;
    syncUI();
  }
  function syncUI() {
    const free = !!(game && game.free);
    document.body.classList.toggle('free-mode', free);
    $('#sceneSeg').hidden = !free;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    $$('.only-same, .only-graph, .only-expand, .only-bimetal, .only-life').forEach((n) => { n.style.display = n.classList.contains('only-' + S.scene) ? '' : 'none'; });
    const pb = (id, txt, pr) => { const b = $(id); b.textContent = txt; b.classList.toggle('btn-primary', !pr); press(b, pr); };
    const hxTxt = HX.done ? '✔ 3분 완료' : HX.on ? '⏸ 잠깐 멈춤' : HX.t > 0 ? '▶ 이어서 가열' : '🔥 가열 시작';
    pb('#btnSame', hxTxt, HX.on); pb('#btnGraph', hxTxt, HX.on);
    $('#btnSame').disabled = HX.done; $('#btnGraph').disabled = HX.done;
    press($('#tgTable'), HX.table);
    pb('#btnRods', EX.heat ? '🧊 식히기' : '🔥 가열 시작', EX.heat); press($('#tgModelX'), EX.model);
    pb('#btnBim', BM.heat ? '🧊 가열 멈추기' : '🔥 가열 시작', BM.heat); $('#btnBim').disabled = BM.auto; press($('#tgAuto'), BM.auto);
    $('#sceneLabel').textContent = SCENE_LABEL[S.scene];
    const vis = (n) => !n.hidden && n.style.display !== 'none';
    $('#ctrlCard').hidden = !$$('#ctrlCard .control').some(vis);
    $('#readouts').style.display = $$('#readouts .readout').some(vis) ? '' : 'none';
    const sel = EX.sel >= 0 ? RODX[EX.sel].label : '아직 고르지 않았어요';
    $('#noteRods').textContent = (on('model') ? '막대를 눌러 고르면 입자 모형에서 그 막대를 볼 수 있어요. ' : '막대를 눌러 골라 보세요. ') + '(선택: ' + sel + ')';
    $('#noteBim').textContent = BM.auto ? '자동 조절 중: 전류가 흐르면 가열하고, 판이 휘어 회로가 끊기면 가열이 멈춰요.' : '구리(주황)와 철(회색)을 붙인 얇은 판이에요. 가열하면 어떻게 될까요?';
  }
  let lastUI = -1;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    const set = (id, v, unit, dec) => { const e = $(id); const h = (typeof v === 'string' ? v : fmt(v, dec)) + (unit ? '<small>' + unit + '</small>' : ''); if (e.innerHTML !== h) e.innerHTML = h; };
    if (S.scene === 'same') { set('#rSW', HX.T[0], '°C', 1); set('#rSO', HX.T[1], '°C', 1); set('#rST', mss(HX.t), '분'); }
    else if (S.scene === 'graph') { set('#rGW', HX.T[0], '°C', 1); set('#rGO', HX.T[1], '°C', 1); set('#rGS', HX.T[2], '°C', 1); set('#rGT', mss(HX.t), '분'); }
    else if (S.scene === 'expand') {
      set('#rEX', EX.T, '°C', 0); set('#rEC', RODX[0].mm * (EX.T - 20), 'mm', 2); set('#rEF', RODX[1].mm * (EX.T - 20), 'mm', 2);
      const sel = EX.sel >= 0 ? RODX[EX.sel].label : '아직 고르지 않았어요', n = $('#noteRods');
      const txt = (on('model') ? '막대를 눌러 고르면 입자 모형에서 그 막대를 볼 수 있어요. ' : '막대를 눌러 골라 보세요. ') + '(선택: ' + sel + ')';
      if (n.textContent !== txt) n.textContent = txt;
    }
    else if (S.scene === 'bimetal') { set('#rBT', BM.T, '°C', 1); const e = $('#rBC'); const h = BM.closed ? '닫힘 (전구 켜짐)' : '끊김 (전구 꺼짐)'; if (e.textContent !== h) e.textContent = h; }
    else set('#rLC', placedCount(), '/ 6장', 0);
  }

  /* =========================================================
     미션
     ========================================================= */
  const SCENE_OF = ['same', 'same', 'graph', 'graph', 'graph', 'expand', 'bimetal', 'expand', 'life', 'life'];
  const SVG_COAST = '<svg viewBox="0 0 320 150" width="100%" style="max-width:320px" role="img" aria-label="바닷가는 낮과 밤의 기온 차가 작고 내륙은 크다" font-family="sans-serif">' +
    '<rect x="1" y="1" width="318" height="148" rx="12" fill="#fff" stroke="#dde4ef"/>' +
    '<text x="85" y="21" font-size="14" font-weight="800" fill="#1d4ed8" text-anchor="middle">🌊 바닷가</text><text x="235" y="21" font-size="14" font-weight="800" fill="#9a5b00" text-anchor="middle">🏜️ 내륙</text>' +
    '<rect x="40" y="66" width="30" height="42" rx="6" fill="#f59e0b"/><rect x="100" y="80" width="30" height="28" rx="6" fill="#60a5fa"/>' +
    '<rect x="190" y="50" width="30" height="58" rx="6" fill="#f59e0b"/><rect x="250" y="92" width="30" height="16" rx="6" fill="#60a5fa"/>' +
    '<text x="55" y="60" font-size="13" font-weight="700" fill="#b45309" text-anchor="middle">낮 24°</text><text x="115" y="74" font-size="13" font-weight="700" fill="#1d4ed8" text-anchor="middle">밤 18°</text>' +
    '<text x="205" y="44" font-size="13" font-weight="700" fill="#b45309" text-anchor="middle">낮 32°</text><text x="265" y="86" font-size="13" font-weight="700" fill="#1d4ed8" text-anchor="middle">밤 12°</text>' +
    '<line x1="20" y1="108" x2="300" y2="108" stroke="#94a3b8" stroke-width="2"/>' +
    '<text x="85" y="130" font-size="13" font-weight="800" fill="#3a4456" text-anchor="middle">기온 차 작음 (6°)</text><text x="235" y="130" font-size="13" font-weight="800" fill="#3a4456" text-anchor="middle">기온 차 큼 (20°)</text></svg>';
  const kcal = '<span style="font-size:13.5px">kcal/(kg·°C)</span>';

  game = SciSim.game({
    simId: 'm1-specific-heat',
    mount: '#game',
    badge: '비열·열팽창 박사',
    homeHref: '../../index.html#g1',
    featureLabels: {
      lamp: '🔥 알코올램프',
      sensor: '📟 온도 센서',
      graph: '📈 시간–온도 그래프',
      sand: '🏖️ 모래',
      table: '📊 비열 표',
      rods: '🔥 전열기와 금속 막대',
      model: '🔍 입자 모형',
      bimetal: '🧲 바이메탈',
      cards: '🗂️ 생활 속 사례 카드',
    },
    onFeatures(set, added) {
      F = set;
      if (added.indexOf('model') >= 0) EX.model = true;
      syncUI();
    },
    onMissionStart(m) {
      S.pick = false;
      setScene(SCENE_OF[m._flat]);
    },
    levels: [
      /* ───────── STEP 1 · 같은 열 ───────── */
      {
        title: '같은 열, 다른 온도 변화', short: '같은 열', icon: '🥛', phase: '관찰',
        features: ['lamp', 'sensor'],
        intro: '<p class="si-q">❓ 탐구 질문: 같은 불로 가열해도 왜 물보다 식용유가 더 빨리 뜨거워질까?</p>' +
          '<p>같은 질량(200 g)의 <b>물</b>과 <b>식용유</b>를 <b>똑같은 알코올램프</b>로 3분 동안 가열하고, <b>📟 온도 센서</b>로 온도 변화를 비교해 봐요.</p>' +
          '<p style="font-size:14px;color:#5d6879">⚠️ 실제 가열 실험에서는 보안경과 장갑을 쓰고, 뜨거운 액체와 불에 화상을 입지 않도록 주의해야 해요.</p>',
        setup() { setScene('same'); hxReset(); HX.table = false; },
        recap: '같은 질량의 물질이 같은 열을 받아도 온도가 변하는 정도는 물질마다 달라요.',
        summary: '<p>같은 질량의 물과 식용유를 같은 열로 가열하면 <b>식용유의 온도가 더 많이 올라간다</b>.</p><ul><li>같은 열을 받아도 물질에 따라 온도 변화가 다르다.</li><li>이 차이는 물질마다 온도를 높이는 데 필요한 열의 양이 다르기 때문이다. (→ 비열)</li></ul>',
        missions: [
          {
            title: '3분 동안 가열하기',
            goal: '🔥 가열을 시작해서 <b>3분</b> 동안 두 온도 센서의 값을 비교해 보세요.',
            hint: '<b>가열 시작</b> 버튼을 눌러요. 화면에서는 3분이 약 10초로 빨리 흘러요.',
            setup() { hxReset(); setScene('same'); showHint('🔥 가열 시작을 눌러 3분 동안 비교해 보세요', 4500); },
            check: () => HX.done,
            hold: 0.4,
            status: () => '가열 ' + mark(HX.on || HX.t > 0) + ' · 시간 <b>' + mss(HX.t) + ' / 3:00</b> · 물 +' + fmt(HX.T[0] - 20, 1) + ' °C · 식용유 +' + fmt(HX.T[1] - 20, 1) + ' °C',
            explain: '똑같은 불로 같은 시간 가열했는데 <b>식용유의 온도가 물보다 더 많이 올랐어요</b>. 같은 열을 받아도 물질에 따라 온도가 변하는 정도가 달라요.',
          },
          {
            type: 'quiz',
            title: '온도가 더 많이 오른 것은?',
            setup() { setScene('same'); if (!HX.done) hxFinishNow(); },
            goal: '같은 질량의 물과 식용유가 <b>같은 열</b>을 받았을 때, 온도가 더 많이 오른 것은 무엇일까요?',
            choices: ['물', '식용유', '둘 다 똑같이 올랐다', '알 수 없다'],
            answer: 1,
            feedback: ['온도 센서를 다시 보세요. 3분 뒤 물은 약 +16 °C, 식용유는 약 +35 °C 올랐어요.', '', '두 온도 센서의 값이 서로 달랐어요. 같은 열을 받아도 온도 변화는 같지 않아요.', '실험 결과를 보면 알 수 있어요. 두 온도 센서의 값을 비교해 보세요.'],
            explain: '같은 열을 받았는데 식용유가 더 많이 올랐어요. 물질마다 <b>온도를 높이는 데 필요한 열의 양이 다르기</b> 때문이에요. 이 성질을 나타내는 값이 <b>비열</b>이에요. 다음 단계에서 자세히 알아봐요.',
          },
        ],
      },
      /* ───────── STEP 2 · 비열 비교 ───────── */
      {
        title: '비열 비교', short: '비열 비교', icon: '📈', phase: '실험',
        features: ['graph', 'sand', 'table'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 열을 받아도 물질에 따라 온도가 오르는 정도가 달랐어요.</div>' +
          '<p>이번에는 <b>🏖️ 모래</b>도 함께 가열하고, <b>📈 시간–온도 그래프</b>의 기울기로 물질을 비교해 봐요. <b>비열</b>이 무엇인지도 알아봐요.</p>',
        setup() { setScene('graph'); hxReset(); HX.table = false; },
        recap: '<b>비열</b>은 어떤 물질 1 kg의 온도를 1 °C 높이는 데 필요한 열량이에요. 비열이 큰 물질은 같은 열을 받아도 온도가 잘 변하지 않아요.',
        summary: '<p><b>비열</b>: 어떤 물질 1 kg의 온도를 1 °C 높이는 데 필요한 열량. (단위: kcal/(kg·°C))</p><ul><li>비열이 큰 물질은 온도가 천천히 변하고, 비열이 작은 물질은 온도가 빨리 변한다.</li><li>시간–온도 그래프에서 <b>기울기가 작을수록 비열이 크다</b>.</li><li>비열(비교): 물 1.00 &gt; 식용유 약 0.47 &gt; 모래 약 0.19 &gt; 철 0.11 &gt; 구리 0.09</li><li>바닷물은 비열이 커서 해안 지방은 하루 동안 기온 변화가 작다.</li></ul>',
        missions: [
          {
            title: '세 물질의 온도 기록하기',
            goal: '🔥 물·식용유·모래를 <b>3분</b> 동안 가열해 시간–온도 그래프를 완성하세요.',
            hint: '<b>가열 시작</b>을 누르고 그래프에 세 개의 선이 그려지는 모습을 지켜봐요. (3분 ≈ 10초)',
            setup() { hxReset(); setScene('graph'); HX.table = false; showHint('🔥 가열을 시작해 세 물질의 그래프를 완성해요', 4500); },
            check: () => HX.done,
            hold: 0.4,
            status: () => '가열 ' + mark(HX.on || HX.t > 0) + ' · 시간 <b>' + mss(HX.t) + ' / 3:00</b> · 물 ' + fmt(HX.T[0], 1) + ' · 식용유 ' + fmt(HX.T[1], 1) + ' · 모래 ' + fmt(HX.T[2], 1) + ' °C',
            explain: '같은 열을 받았는데 <b>모래 → 식용유 → 물</b> 순서로 온도가 빨리 올랐어요. 그래프에서 선이 가파를수록 온도가 빨리 오른 거예요.',
          },
          {
            type: 'quiz',
            title: '그래프의 기울기와 비열',
            setup() { setScene('graph'); if (!HX.done) hxFinishNow(); HX.table = true; syncUI(); },
            goal: '그래프에서 <b>기울기가 가장 작은</b> 물질은 무엇이고, 그 물질의 비열은 어떨까요? (📊 비열 표를 참고해요)',
            choices: ['모래 — 비열이 가장 크다', '물 — 비열이 가장 크다', '식용유 — 비열이 가장 작다', '세 선의 기울기가 같아서 비열도 같다'],
            answer: 1,
            feedback: ['모래의 선이 가장 가팔랐어요. 기울기가 큰 모래는 온도가 가장 빨리 올랐으니 비열이 가장 작아요.', '', '식용유는 물과 모래의 중간이에요. 기울기가 가장 작은 선은 어느 물질인가요?', '세 선의 기울기는 달랐어요. 그래프를 다시 보세요.'],
            explain: '<b>기울기가 가장 작은 물</b>은 온도가 가장 천천히 올랐어요. 같은 열을 받아도 온도가 잘 변하지 않는다는 뜻이고, <b>비열이 가장 크다</b>는 뜻이에요. 비열이 크다 = 온도를 높이는 데 많은 열이 필요하다.',
          },
          {
            type: 'quiz',
            title: '바닷가의 일교차가 작은 까닭',
            goal: '바닷가는 내륙보다 하루 동안의 기온 차(일교차)가 작아요. 그 까닭은 무엇일까요?',
            figure: SVG_COAST,
            choices: ['바다는 햇빛을 받지 않기 때문에', '물은 비열이 커서 온도가 잘 변하지 않기 때문에', '바다가 육지보다 넓어서 열이 흩어지기 때문에', '물은 모래보다 비열이 작아서'],
            answer: 1,
            feedback: ['바다도 햇빛을 받아요. 같은 열을 받아도 온도가 달라지는 까닭을 생각해 보세요.', '', '넓이는 비열과 관계없어요. 물질이 가진 성질을 떠올려 보세요.', '표를 보면 물의 비열(1.00)이 모래(약 0.19)보다 훨씬 커요.'],
            explain: '물은 비열이 매우 커서 낮에 열을 받아도, 밤에 열을 잃어도 <b>온도가 천천히 변해요</b>. 그래서 바닷가는 낮과 밤의 기온 차가 작아요. 비열이 작은 모래(육지)는 온도가 빨리 변해요.',
          },
        ],
      },
      /* ───────── STEP 3 · 열팽창 ───────── */
      {
        title: '열팽창과 바이메탈', short: '열팽창', icon: '📏', phase: '설명',
        features: ['rods', 'model', 'bimetal'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물질마다 열을 받았을 때 온도가 변하는 정도(비열)가 다르다는 것을 알았어요.</div>' +
          '<p>물질을 가열하면 온도만 변하는 것이 아니라 <b>길이(부피)</b>도 변해요. 구리 막대와 철 막대를 가열하고, <b>🔍 입자 모형</b>으로 왜 늘어나는지 알아봐요. 두 금속을 붙인 <b>🧲 바이메탈</b>도 살펴봐요.</p>' +
          '<p style="font-size:14px;color:#5d6879">⚠️ 가열 장치와 뜨거워진 금속은 화상을 입을 수 있어요. 실제 실험에서는 장갑과 집게를 써요.</p>',
        setup() { setScene('expand'); exReset(); bmReset(); EX.model = true; },
        recap: '물질을 가열하면 입자 운동이 활발해져 입자 사이의 거리가 멀어지는 <b>열팽창</b>이 일어나요. 열팽창 정도는 물질마다 달라 바이메탈이 휘어져요.',
        summary: '<p><b>열팽창</b>: 물질을 가열하면 길이(부피)가 늘어나는 현상.</p><ul><li>가열하면 입자 운동이 활발해져 <b>입자 사이의 거리</b>가 멀어진다. 입자 자체의 크기와 개수는 변하지 않는다.</li><li>열팽창 정도는 물질마다 다르다. (구리 &gt; 철)</li><li><b>바이메탈</b>: 열팽창 정도가 다른 두 금속을 붙인 것. 가열하면 팽창이 작은 금속 쪽으로 휘어진다. → 온도 조절 장치에서 전기 회로를 끊는 데 쓰인다.</li></ul>',
        missions: [
          {
            title: '더 많이 늘어나는 막대',
            goal: '🔥 막대를 가열(80 °C 이상)한 뒤, <b>더 많이 늘어난</b> 막대를 눌러 고르고 ✔ 확인하기를 누르세요.',
            manual: true,
            hint: '막대 오른쪽 끝에서 점선(처음 길이)보다 얼마나 늘어났는지 비교해 보세요.',
            setup() { exReset(); EX.model = true; S.pick = true; syncUI(); showHint('🔥 가열 시작을 눌러 두 막대를 가열해요', 4500); },
            check: () => {
              if (EX.maxT < 80) return '먼저 🔥 가열해서 막대의 온도를 80 °C 넘게 올려 보세요.';
              if (EX.sel < 0) return '더 많이 늘어난 막대를 눌러서 고른 뒤 확인하세요.';
              return EX.sel === 0 ? true : '철 막대도 늘어났지만 구리 막대보다는 덜 늘어났어요. 늘어난 부분(빨간 화살표)을 다시 비교해 보세요.';
            },
            status: () => '막대 온도 <b>' + fmt(EX.T, 0) + ' °C</b> · 고른 막대: <b>' + (EX.sel >= 0 ? RODX[EX.sel].label : '없음') + '</b>',
            explain: '같은 온도로 가열했는데 <b>구리 막대가 철 막대보다 더 많이 늘어났어요</b>. 열팽창 정도는 물질마다 달라요.',
          },
          {
            title: '바이메탈로 회로 끊기',
            goal: '🧲 바이메탈을 가열해서 전기 회로를 <b>끊어</b> 전구를 꺼 보세요.',
            hint: '<b>가열 시작</b>을 누르고 판이 어느 쪽으로 휘는지 지켜보세요. 휘면 접점이 떨어져요.',
            setup() { bmReset(); setScene('bimetal'); BM.auto = false; syncUI(); showHint('🔥 가열 시작을 눌러 바이메탈을 데워 보세요', 4500); },
            check: () => !BM.closed && BM.T >= 44,
            hold: 0.6,
            status: () => '바이메탈 <b>' + fmt(BM.T, 1) + ' °C</b> · 회로 <b>' + (BM.closed ? '닫힘 (전구 켜짐)' : '끊김 (전구 꺼짐)') + '</b>',
            explain: '구리가 철보다 더 많이 늘어나서 판이 <b>팽창이 작은 철 쪽</b>으로 휘었어요. 그러자 접점이 떨어져 전기 회로가 끊기고 전구가 꺼졌어요. 이런 성질을 이용해 다리미·전기장판 같은 <b>온도 조절 장치</b>를 만들어요.',
          },
          {
            type: 'quiz',
            title: '왜 늘어날까?',
            setup() { setScene('expand'); EX.model = true; EX.heat = true; if (EX.sel < 0) EX.sel = 0; syncUI(); },
            goal: '🔍 입자 모형을 보세요. 금속 막대를 가열하면 길이가 늘어나는 까닭은 무엇일까요?',
            choices: ['입자의 크기가 커지기 때문', '입자의 개수가 늘어나기 때문', '입자 운동이 활발해져 입자 사이의 거리가 멀어지기 때문', '입자가 막대 바깥에서 새로 생기기 때문'],
            answer: 2,
            feedback: ['입자 모형에서 입자의 크기를 비교해 보세요. 크기는 그대로이고, 입자 사이의 거리만 달라졌어요!', '입자의 개수는 변하지 않아요. 입자 모형의 입자 수를 세어 보세요.', '', '막대 속 입자는 새로 생기지 않아요. 입자 모형을 다시 살펴보세요.'],
            explain: '온도가 높아지면 입자 운동이 활발해져요. 그래서 <b>입자 사이의 거리가 멀어지고</b> 막대가 늘어나요. 입자 자체의 크기와 개수는 변하지 않아요.',
          },
        ],
      },
      /* ───────── STEP 4 · 생활 활용 ───────── */
      {
        title: '생활 속 비열과 열팽창', short: '생활 활용', icon: '🗂️', phase: '적용',
        features: ['cards'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물질에 따라 <b>비열</b>과 <b>열팽창</b> 정도가 다르다는 것을 알았어요.</div>' +
          '<p>이런 성질은 생활 곳곳에서 활용돼요. 카드 6장을 알맞은 상자에 <b>분류</b>하며 생활 속 사례를 찾아봐요.</p>',
        setup() { setScene('life'); cardsReset(); },
        recap: '비열이 큰 물질은 온도가 천천히 변해 오래 따뜻하게 쓰이고, 열팽창은 철로·전깃줄·병뚜껑·바이메탈 등에서 고려하거나 활용돼요.',
        summary: '<ul><li><b>비열</b>이 큰 물질(물 등): 온도가 천천히 변해 뚝배기·찜질팩은 오래 따뜻하고, 바닷가는 일교차가 작다.</li><li><b>열팽창</b>: 철로·다리 이음새에 틈을 두고, 여름철 전깃줄이 처지며, 뜨거운 물로 병뚜껑을 열고, 바이메탈로 온도를 조절한다.</li></ul>',
        missions: [
          {
            title: '생활 속 사례 분류하기',
            goal: '카드 <b>6장</b>을 끌어서 <b>비열</b> 상자와 <b>열팽창</b> 상자에 알맞게 넣으세요.',
            hint: '카드를 누르면 설명을 볼 수 있어요. “온도가 천천히 변한다”는 비열, “길이가 늘어난다”는 열팽창이에요.',
            setup() { cardsReset(); setScene('life'); showHint('🖐️ 카드를 끌어서 알맞은 상자에 넣어 보세요', 4500); },
            check: () => placedCount() === CD.length,
            hold: 0.4,
            status: () => '맞게 분류한 카드 <b>' + placedCount() + ' / ' + CD.length + '장</b>',
            explain: '<b>뚝배기·찜질팩·바닷가</b>는 비열이 큰 물질 덕분에 온도가 천천히 변해요. <b>철로·전깃줄·병뚜껑</b>은 가열하면 길이가 늘어나는 열팽창과 관계있어요.',
          },
          {
            type: 'quiz',
            title: '병뚜껑 열기',
            goal: '꽉 닫혀서 안 열리는 유리병의 <b>금속 뚜껑</b>을 뜨거운 물에 잠깐 담그면 열리는 까닭은 무엇일까요?',
            figure: '<div style="font-size:44px;line-height:1.2">🫙 ♨️</div>',
            choices: ['뜨거운 물이 뚜껑을 녹여서', '금속 뚜껑이 유리병 입구보다 더 많이 늘어나 헐거워져서', '뚜껑을 이루는 입자의 크기가 커져서', '뚜껑의 비열이 작아져서'],
            answer: 1,
            feedback: ['뚜껑이 녹을 만큼 뜨겁지는 않아요. 뜨거운 물을 만나면 어떤 변화가 일어나는지 떠올려 보세요.', '', '입자의 크기는 변하지 않아요. 입자 사이의 거리가 멀어져 늘어나는 거예요.', '비열은 물질의 고유한 성질이라 가열해도 바뀌지 않아요.'],
            explain: '금속은 유리보다 열팽창이 더 커요. 뜨거운 물에 담그면 <b>금속 뚜껑이 더 많이 늘어나</b> 헐거워져서 쉽게 열려요. 물질에 따라 열팽창 정도가 다른 성질을 생활에 활용한 거예요.',
          },
        ],
      },
    ],
  });
  syncUI();

  // 테스트·디버그용 (화면 동작에는 영향 없음)
  window.__sim = { S, HX, EX, BM, CD, CARDS, game, setScene, hxReset, hxFinishNow, exReset, bmReset, cardsReset, placedCount, placeCard, GEO, SPEC };

  /* ---------- 시작 ---------- */
  const PERF = { u: [], d: [] };
  window.__perf = PERF;
  SciSim.loop((dt, t) => {
    const t0 = performance.now();
    update(dt, t);
    const t1 = performance.now();
    VIEWS.forEach((V) => { if (V.v.canvas.offsetWidth > 0) drawView(V, t); });
    updateReadouts(t);
    const t2 = performance.now();
    if (PERF.on) { PERF.u.push(t1 - t0); PERF.d.push(t2 - t1); }
  });
})();
