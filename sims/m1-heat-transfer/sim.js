/* =========================================================
   중1 Ⅲ. 열 — 열의 이동 방식  [9과03-02]
   열은 전도, 대류, 복사로 전달됨을 알고, 열전달 과정을 모형 등을 사용하여 다양하게 표현할 수 있다.
   ① [관찰] 전도: 구리·철·나무 막대의 한쪽 끝을 가열 + 열화상 카메라 + 입자 모형(이웃 입자에 운동이 차례로 전달)
   ② [모형] 대류: 비커 속 물의 순환(색소 알갱이) + 교실 난방기·에어컨 위치 (작은 격자 유체 시뮬레이션)
   ③ [모형] 복사: 난로의 열이 진공에서도 컵에 전달됨, 은박지로 막기
   ④ [적용] 단열과 비유: 보온병 설계(진공층·은도금·뚜껑) + 시간–온도 그래프 + 줄 서서 물건 나르기 비유
   ※ 정성적 설명 중심: 열량 계산(Q = cmΔT)은 다루지 않음. 시간·빠르기는 비교용(실제 값 아님).
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

  /* =========================================================
     작은 격자 유체 시뮬레이션 (Stam의 안정 유체 + 부력)
     속도 단위: 칸/초, y는 아래쪽이 +. 온도 T가 기준보다 높으면 위로 뜨는 힘을 받아 대류가 저절로 생김
     ========================================================= */
  /*FLUID-START*/
  class Fluid {
    constructor(nx, ny, o) {
      o = o || {};
      this.nx = nx; this.ny = ny; this.W = nx + 2;
      const n = (nx + 2) * (ny + 2);
      this.u = new Float32Array(n); this.v = new Float32Array(n);
      this.u1 = new Float32Array(n); this.v1 = new Float32Array(n);
      this.T = new Float32Array(n); this.T1 = new Float32Array(n);
      this.p = new Float32Array(n); this.dv = new Float32Array(n);
      this.beta = o.beta != null ? o.beta : 0.4;        // 부력 세기 (칸/초² per °C)
      this.damp = o.damp != null ? o.damp : 1.2;        // 속도 감쇠 (1/초)
      this.kappa = o.kappa != null ? o.kappa : 0.25;    // 열 확산 (칸²/초)
      this.visc = o.visc != null ? o.visc : 0;          // 점성 (칸²/초): 클수록 크고 부드러운 순환
      this.T0 = o.T0 != null ? o.T0 : 20;               // 기준 온도
      this.iter = o.iter || 24;
      this.src = [];                                     // 가열·냉각 영역: {i0,i1,j0,j1,T,k,on}
      this.T.fill(this.T0);
    }
    reset(T) { this.u.fill(0); this.v.fill(0); this.T.fill(T); this.T0 = T; }
    bnd(b, x) {
      const nx = this.nx, ny = this.ny, W = this.W;
      for (let j = 1; j <= ny; j++) { x[W * j] = b === 1 ? -x[1 + W * j] : x[1 + W * j]; x[nx + 1 + W * j] = b === 1 ? -x[nx + W * j] : x[nx + W * j]; }
      for (let i = 1; i <= nx; i++) { x[i] = b === 2 ? -x[i + W] : x[i + W]; x[i + W * (ny + 1)] = b === 2 ? -x[i + W * ny] : x[i + W * ny]; }
      x[0] = 0.5 * (x[1] + x[W]); x[nx + 1] = 0.5 * (x[nx] + x[nx + 1 + W]);
      x[W * (ny + 1)] = 0.5 * (x[1 + W * (ny + 1)] + x[W * ny]); x[nx + 1 + W * (ny + 1)] = 0.5 * (x[nx + W * (ny + 1)] + x[nx + 1 + W * ny]);
    }
    project() {
      const { nx, ny, W, u, v, p, dv } = this;
      for (let j = 1; j <= ny; j++) for (let i = 1; i <= nx; i++) {
        const k = i + W * j;
        dv[k] = -0.5 * (u[k + 1] - u[k - 1] + v[k + W] - v[k - W]); p[k] = 0;
      }
      this.bnd(0, dv); this.bnd(0, p);
      for (let it = 0; it < this.iter; it++) {
        for (let j = 1; j <= ny; j++) for (let i = 1; i <= nx; i++) {
          const k = i + W * j;
          p[k] = (dv[k] + p[k - 1] + p[k + 1] + p[k - W] + p[k + W]) * 0.25;
        }
        this.bnd(0, p);
      }
      for (let j = 1; j <= ny; j++) for (let i = 1; i <= nx; i++) {
        const k = i + W * j;
        u[k] -= 0.5 * (p[k + 1] - p[k - 1]); v[k] -= 0.5 * (p[k + W] - p[k - W]);
      }
      this.bnd(1, u); this.bnd(2, v);
    }
    advect(b, d, d0, dt) {
      const { nx, ny, W, u, v } = this;
      for (let j = 1; j <= ny; j++) for (let i = 1; i <= nx; i++) {
        const k = i + W * j;
        let x = i - dt * u[k], y = j - dt * v[k];
        x = x < 0.5 ? 0.5 : x > nx + 0.5 ? nx + 0.5 : x; y = y < 0.5 ? 0.5 : y > ny + 0.5 ? ny + 0.5 : y;
        const i0 = x | 0, j0 = y | 0, s1 = x - i0, t1 = y - j0, s0 = 1 - s1, t0 = 1 - t1, k0 = i0 + W * j0;
        d[k] = s0 * (t0 * d0[k0] + t1 * d0[k0 + W]) + s1 * (t0 * d0[k0 + 1] + t1 * d0[k0 + 1 + W]);
      }
      this.bnd(b, d);
    }
    step(dt) {
      const { nx, ny, W, u, v, T } = this;
      const damp = 1 / (1 + this.damp * dt), bt = dt * this.beta;
      for (let j = 1; j <= ny; j++) for (let i = 1; i <= nx; i++) {
        const k = i + W * j;
        v[k] = (v[k] - bt * (T[k] - this.T0)) * damp; u[k] *= damp;
      }
      this.bnd(1, u); this.bnd(2, v);
      if (this.visc > 0) {
        const kv = Math.min(0.24, this.visc * dt), u1 = this.u1, v1 = this.v1;
        u1.set(u); v1.set(v);
        for (let j = 1; j <= ny; j++) for (let i = 1; i <= nx; i++) {
          const k = i + W * j;
          u[k] = u1[k] + kv * (u1[k - 1] + u1[k + 1] + u1[k - W] + u1[k + W] - 4 * u1[k]);
          v[k] = v1[k] + kv * (v1[k - 1] + v1[k + 1] + v1[k - W] + v1[k + W] - 4 * v1[k]);
        }
        this.bnd(1, u); this.bnd(2, v);
      }
      this.project();
      this.u1.set(u); this.v1.set(v);
      this.advect(1, u, this.u1, dt); this.advect(2, v, this.v1, dt);
      this.project();
      // 온도: 이동 + 확산 + 열원
      this.T1.set(T);
      this.advect(0, T, this.T1, dt);
      this.T1.set(T);
      const kd = this.kappa * dt;
      for (let j = 1; j <= ny; j++) for (let i = 1; i <= nx; i++) {
        const k = i + W * j;
        T[k] = this.T1[k] + kd * (this.T1[k - 1] + this.T1[k + 1] + this.T1[k - W] + this.T1[k + W] - 4 * this.T1[k]);
      }
      this.bnd(0, T);
      for (const s of this.src) {
        if (!s.on) continue;
        const f = 1 - Math.exp(-s.k * dt);
        for (let j = s.j0; j <= s.j1; j++) for (let i = s.i0; i <= s.i1; i++) { const k = i + W * j; T[k] += (s.T - T[k]) * f; }
      }
    }
    // 소수 좌표(칸 단위, 첫 칸의 가운데 = 1)에서 값 읽기
    sample(a, x, y) {
      const { nx, ny, W } = this;
      x = x < 0.5 ? 0.5 : x > nx + 0.5 ? nx + 0.5 : x; y = y < 0.5 ? 0.5 : y > ny + 0.5 ? ny + 0.5 : y;
      const i0 = x | 0, j0 = y | 0, s1 = x - i0, t1 = y - j0, k0 = i0 + W * j0;
      return (1 - s1) * ((1 - t1) * a[k0] + t1 * a[k0 + W]) + s1 * ((1 - t1) * a[k0 + 1] + t1 * a[k0 + 1 + W]);
    }
    meanRows(a, j0, j1) { let s = 0, n = 0; for (let j = j0; j <= j1; j++) for (let i = 1; i <= this.nx; i++) { s += a[i + this.W * j]; n++; } return s / n; }
  }
  /*FLUID-END*/

  /* =========================================================
     화면 배치: wide = 태블릿(800×580), tall = 휴대폰(520×900)
     ========================================================= */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 580, fs: 1 },
    tall: { key: 'tall', vw: 520, vh: 900, fs: 1.25 },
  };
  const SCENE_LABEL = {
    cond: '🔥 구리·철·나무 막대의 한쪽 끝을 가열해요',
    beaker: '🫧 물을 아래에서 가열하면 어떻게 될까요?',
    room: '🏠 추운 교실에 난방기를 놓아요',
    rad: '☀️ 난로의 열이 컵에 닿는 방법',
    thermos: '🫙 열이 빠져나가는 길을 막아요',
  };
  const GEO = {
    cond(L, e) {
      if (L.key === 'wide') {
        const rodH = lerp(62, 50, e);
        const yc = [lerp(150, 84, e), lerp(292, 176, e), lerp(434, 268, e)];
        return {
          x0: 86, x1: 688, rodH, yc,
          heater: { x: 10, y: yc[0] - 50, w: 76, h: yc[2] - yc[0] + 100 },
          disp: yc.map((y) => ({ x: 698, y: y - 26, w: 94, h: 52 })),
          panel: { x: 8, y: lerp(610, 332, e), w: 784, h: 242 },
          cols: 22, rows: 4,
        };
      }
      const rodH = lerp(86, 56, e), ho = lerp(72, 52, e);
      const yc = [lerp(236, 78, e), lerp(466, 188, e), lerp(696, 298, e)];
      return {
        x0: 62, x1: 410, rodH, yc,
        heater: { x: 6, y: yc[0] - ho, w: 56, h: yc[2] - yc[0] + ho + 52 },
        disp: yc.map((y) => ({ x: 418, y: y - 29, w: 96, h: 58 })),
        panel: { x: 6, y: lerp(990, 392, e), w: 508, h: 500 },
        cols: 14, rows: 6,
      };
    },
    beaker(L) {
      if (L.key === 'wide') {
        const B = { x: 282, y: 64, w: 236, h: 372 };
        return {
          B, water: { x: B.x + 6, y: B.y + 42, w: B.w - 12, h: B.h - 48 }, lampX: B.x + B.w * 0.3, lampY: B.y + B.h + 30,
          lensH: { x: B.x + 48, y: B.y + B.h - 58, r: 21 }, lensC: { x: B.x + B.w - 40, y: B.y + 190, r: 21 },
          zH: { x: 130, y: 196, r: 88 }, zC: { x: 670, y: 196, r: 88 },
          capH: { x: 130, y: 330 }, capC: { x: 670, y: 330 },
        };
      }
      const B = { x: 140, y: 40, w: 240, h: 352 };
      return {
        B, water: { x: B.x + 6, y: B.y + 42, w: B.w - 12, h: B.h - 48 }, lampX: B.x + B.w * 0.3, lampY: B.y + B.h + 30,
        lensH: { x: B.x + 48, y: B.y + B.h - 58, r: 22 }, lensC: { x: B.x + B.w - 40, y: B.y + 190, r: 22 },
        zH: { x: 134, y: 618, r: 104 }, zC: { x: 386, y: 618, r: 104 },
        capH: { x: 134, y: 760 }, capC: { x: 386, y: 760 },
      };
    },
    room(L) {
      if (L.key === 'wide') return { R: { x: 100, y: 28, w: 600, h: 400 }, cell: 20, g: { x: 40, y: 446, w: 720, h: 128 } };
      return { R: { x: 12, y: 34, w: 495, h: 330 }, cell: 16.5, g: { x: 10, y: 392, w: 500, h: 300 }, note: { x: 10, y: 706, w: 500, h: 184 } };
    },
    rad(L) {
      if (L.key === 'wide') {
        return {
          ch: { x: 10, y: 12, w: 780, h: 480 }, stove: { x: 40, y: 168, w: 112, h: 226 }, sx: 156,
          cans: [{ x: 664, y: 170 }, { x: 664, y: 392 }], foilX: 424, foilY0: 52, foilY1: 470, pump: { x: 400, y: 492 },
          tray: { x: 36, y: 500, w: 176, h: 74 },
        };
      }
      return {
        ch: { x: 6, y: 12, w: 508, h: 690 }, stove: { x: 26, y: 318, w: 84, h: 214 }, sx: 112,
        cans: [{ x: 428, y: 210 }, { x: 428, y: 574 }], foilX: 258, foilY0: 60, foilY1: 690, pump: { x: 260, y: 702 },
        tray: { x: 326, y: 722, w: 182, h: 74 },
      };
    },
    thermos(L) {
      if (L.key === 'wide') return { fl: { cx: 166, top: 112, w: 196, h: 410 }, graph: { x: 330, y: 14, w: 462, h: 302 }, legend: { x: 330, y: 330, w: 462, h: 236 } };
      return { fl: { cx: 260, top: 124, w: 208, h: 318 }, graph: { x: 6, y: 500, w: 508, h: 246 }, legend: { x: 6, y: 756, w: 508, h: 140 } };
    },
  };

  /* ---------- 상태 ---------- */
  const S = { scene: 'cond', fade: { k: 1 }, pick: false };
  let game = null;
  let F = new Set();
  const on = (f) => F.has(f) || !!(game && game.free);
  const isNew = (f) => !!(game && game.isNew(f));

  /* ---------- 캔버스 두 개 ---------- */
  const VIEWS = ['wide', 'tall'].map((key) => {
    const L = LAYOUTS[key];
    const v = SciSim.stage($(key === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: '#f4f8fd' });
    return { key, L, v, ctx: v.ctx, D: SciSim.draw(v.ctx), fx: new SciSim.Particles(), hint: $(key === 'wide' ? '#hintWide' : '#hintTall'), bg: null };
  });
  const activeView = () => VIEWS.find((V) => V.v.canvas.offsetWidth > 0) || VIEWS[0];

  /* =========================================================
     ① 전도: 막대 3개 (1차원 열 확산) — 구리 > 철 > 나무
     ========================================================= */
  const NR = 48;                                   // 막대를 나눈 칸 수
  const RODS = [
    { key: 'cu', name: '구리', label: '구리 막대', alpha: 0.27, loss: 0.05, color: '#d9833f' },
    { key: 'fe', name: '철', label: '철 막대', alpha: 0.09, loss: 0.05, color: '#8b97a8' },
    { key: 'wd', name: '나무', label: '나무 막대', alpha: 0.005, loss: 0.05, color: '#b88a54' },
  ];
  RODS.forEach((r) => { r.T = new Float32Array(NR).fill(20); r.T1 = new Float32Array(NR); });
  const C = {
    heat: false, heatK: 0, cooling: false, tHeat: 0, camOn: false, camK: 0, scan: { p: 1 }, model: false, modelK: 0,
    sel: -1, obs: 0, sparks: [], spawn: 0, tab: [0, 0, 0],
  };
  const SIMSEC = 6;                                // 화면의 1초 = 실험실의 6초(비교용)
  function rodAt(r, x) {                           // x: 0~1 위치의 온도 (선형 보간)
    const f = clamp(x, 0, 1) * (NR - 1), i = Math.min(NR - 2, Math.floor(f)), k = f - i;
    return r.T[i] * (1 - k) + r.T[i + 1] * k;
  }
  function stepRods(dt) {
    RODS.forEach((r) => {
      const a = r.alpha * (NR - 1) * (NR - 1);
      const n = Math.max(1, Math.ceil((a * dt) / 0.4));
      const h = dt / n, T = r.T, T1 = r.T1;
      const extra = C.cooling ? 0.45 : 0;           // 식히는 중에는 빠르게 식음(다시 실험하기 쉽게)
      for (let s = 0; s < n; s++) {
        for (let i = 0; i < NR; i++) {
          const l = i === 0 ? T[0] : T[i - 1], rr = i === NR - 1 ? T[i] : T[i + 1];
          T1[i] = T[i] + h * (a * (l - 2 * T[i] + rr) - (r.loss + extra) * (T[i] - 20));
        }
        T1[0] = C.heat ? T[0] + (100 - T[0]) * Math.min(1, 14 * h) : T1[0];   // 가열 장치와 닿은 끝
        T.set(T1);
      }
    });
  }
  function condReset() {
    RODS.forEach((r) => { r.T.fill(20); r.T1.fill(20); });
    Object.assign(C, { heat: false, cooling: false, tHeat: 0, obs: 0, sel: -1 });
    C.sparks.length = 0;
    syncUI();
  }
  const rodEnd = (i) => RODS[i].T[NR - 1];

  /* ---------- 입자 모형 돋보기용 작은 입자 무리 (돋보기 반지름 = 1) ---------- */
  const PR = 0.085;
  const speedOf = (T) => 0.22 + 0.0225 * clamp(T, 0, 100);
  function makeSwarm(n, T) {
    const L = [];
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      for (let tries = 0; tries < 80; tries++) {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * (1 - PR * 1.4);
        x = Math.cos(a) * d; y = Math.sin(a) * d;
        if (!L.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < (2.3 * PR) ** 2)) break;
      }
      const a = Math.random() * TAU, sp = speedOf(T) * (0.7 + Math.random() * 0.6);
      L.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    }
    return L;
  }
  function collide(a, b, r) {
    const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = 2 * r;
    if (d2 >= min * min || d2 < 1e-12) return false;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (min - d) / 2;
    a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (rel <= 0) return false;
    a.vx -= rel * nx; a.vy -= rel * ny; b.vx += rel * nx; b.vy += rel * ny;
    return true;
  }
  function thermostat(L, vT, dt) {
    let s = 0;
    for (const p of L) s += Math.hypot(p.vx, p.vy);
    const mean = s / L.length || 1e-6;
    const k = 1 + (vT / mean - 1) * Math.min(1, dt * 4);
    for (const p of L) { p.vx *= k; p.vy *= k; }
    return mean;
  }
  function stepSwarm(L, T, dt) {
    const lim = 1 - PR;
    for (const p of L) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      const d = Math.hypot(p.x, p.y);
      if (d > lim) {
        const nx = p.x / d, ny = p.y / d;
        p.x = nx * lim; p.y = ny * lim;
        const vn = p.vx * nx + p.vy * ny;
        if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
      }
    }
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) collide(L[i], L[j], PR);
    return thermostat(L, speedOf(T), dt);
  }

  /* =========================================================
     ② 대류 (1): 비커 속 물 — 아래에서 가열하면 데워진 물은 위로, 식은 물은 아래로
     ========================================================= */
  const BNX = 16, BNY = 22;
  const BK = {
    F: new Fluid(BNX, BNY, { beta: 1.2, damp: 0.5, kappa: 0.8, visc: 3, T0: 20 }),
    on: false, flame: 0, tOn: 0, acc: 0, parts: [], lensK: 1, lensOn: true,
    swH: makeSwarm(10, 70), swC: makeSwarm(18, 20), TH: 20, TC: 20, vH: speedOf(20), vC: speedOf(20), arrow: 0,
  };
  BK.F.src.push({ i0: 2, i1: 7, j0: BNY - 1, j1: BNY, T: 72, k: 5, on: false });          // 불꽃이 닿는 비커 바닥
  BK.F.src.push({ i0: 1, i1: BNX, j0: 1, j1: 1, T: 20, k: 0.2, on: true });                 // 수면에서 식음
  BK.F.src.push({ i0: BNX - 2, i1: BNX, j0: 3, j1: BNY - 3, T: 20, k: 0.5, on: true });     // 유리벽에서 식음
  function beakerSeed() {
    BK.parts.length = 0;
    for (let i = 0; i < 90; i++) BK.parts.push({ x: 1.5 + Math.random() * (BNX - 1), y: 2 + Math.random() * (BNY - 2.5), T: 20 });
  }
  beakerSeed();
  function beakerReset() {
    BK.F.reset(20); BK.on = false; BK.F.src[0].on = false; BK.tOn = 0; BK.flame = 0; BK.TH = 20; BK.TC = 20;
    beakerSeed();
    syncUI();
  }
  // 고정 시간 간격(1/30초)으로 유체를 풀어 줌
  const FH = 1 / 30;
  function stepFluid(f, dt, rate, holder) {
    holder.acc = Math.min(0.2, (holder.acc || 0) + dt * rate);
    let n = 0;
    while (holder.acc >= FH && n < 4) { f.step(FH); holder.acc -= FH; n++; }
    return n;
  }
  function advectParts(f, parts, dt, rate, rnd) {
    const nx = f.nx, ny = f.ny;
    for (const p of parts) {
      const u = f.sample(f.u, p.x, p.y), v = f.sample(f.v, p.x, p.y);
      p.x += u * dt * rate + (Math.random() - 0.5) * rnd; p.y += v * dt * rate + (Math.random() - 0.5) * rnd;
      if (p.x < 1.1) p.x = 1.1; if (p.x > nx - 0.1) p.x = nx - 0.1;
      if (p.y < 1.2) p.y = 1.2; if (p.y > ny - 0.1) p.y = ny - 0.1;
      const T = f.sample(f.T, p.x, p.y);
      p.T += (T - p.T) * Math.min(1, dt * 8);
      p.u = u; p.v = v;
    }
  }
  const showT = (T) => clamp(20 + (T - 20) * 1.9, 0, 100);   // 돋보기 속 입자의 색·빠르기는 차이를 알아보기 쉽게 조금 키워서 보여 줌
  function updateBeaker(dt) {
    BK.on = !!BK.F.src[0].on;
    BK.flame = approach(BK.flame, BK.on ? 1 : 0, dt, 5);
    if (BK.on) BK.tOn += dt;
    stepFluid(BK.F, dt, 1, BK);
    advectParts(BK.F, BK.parts, dt, 1, 0.02);
    // 돋보기 속 입자: 그 자리 물의 온도에 맞춰 빠르기가 부드럽게 바뀜
    const G = GEO.beaker(activeView().L);
    const cellAt = (lens) => ({ x: 0.5 + ((lens.x - G.water.x) / G.water.w) * BNX, y: 0.5 + ((lens.y - G.water.y) / G.water.h) * BNY });
    const ph = cellAt(G.lensH), pc = cellAt(G.lensC);
    BK.TH = approach(BK.TH, BK.F.sample(BK.F.T, ph.x, ph.y), dt, 3);
    BK.TC = approach(BK.TC, BK.F.sample(BK.F.T, pc.x, pc.y), dt, 3);
    const n = dt > 0.02 ? 2 : 1;
    let mH = BK.vH, mC = BK.vC;
    for (let i = 0; i < n; i++) { mH = stepSwarm(BK.swH, showT(BK.TH), dt / n); mC = stepSwarm(BK.swC, showT(BK.TC), dt / n); }
    BK.vH = approach(BK.vH, mH, dt, 3); BK.vC = approach(BK.vC, mC, dt, 3);
    BK.lensK = approach(BK.lensK, on('lens') && BK.lensOn ? 1 : 0, dt, 7);
    if (BK.lensK < 0.002) BK.lensK = 0;
  }

  /* =========================================================
     ② 대류 (2): 교실 — 난방기(위·가운데·아래)와 에어컨
     ========================================================= */
  const RNX = 30, RNY = 20;
  const ROWS = { top: 2, mid: 8, bottom: 17 };
  const ROOM_RATE = 2.4;                           // 교실 시뮬레이션은 시간을 빠르게 흘려 보냄 (1초 ≈ 2.4분)
  const RM = {
    F: new Fluid(RNX, RNY, { beta: 1.0, damp: 0.6, kappa: 1.0, visc: 0.5, T0: 10 }),
    mode: 'heat', pos: 'bottom', on: false, t: 0, acc: 0, parts: [], hist: [], histT: 0, heatK: 0,
    drag: false, dragRow: 17, lift: 0, upper: 10, lower: 10,
    place: new SciSim.Spring(0, { stiffness: 190, damping: 17 }),
  };
  const RSRC = {
    heater: { i0: 1, i1: 2, j0: ROWS.bottom, j1: ROWS.bottom + 3, T: 46, k: 6, on: false },
    wall: { i0: RNX - 1, i1: RNX, j0: 1, j1: RNY, T: 4, k: 0.04, on: true },
    ac: { i0: 11, i1: 18, j0: 1, j1: 2, T: 2, k: 4, on: false },
  };
  RM.F.src.push(RSRC.heater, RSRC.wall, RSRC.ac);
  function roomSeed() {
    RM.parts.length = 0;
    for (let i = 0; i < 150; i++) RM.parts.push({ x: 1.5 + Math.random() * (RNX - 1), y: 1.5 + Math.random() * (RNY - 1), T: RM.F.T0 });
  }
  roomSeed();
  const heaterRow = () => ROWS[RM.pos];
  function roomReset(mode) {
    if (mode) RM.mode = mode;
    const ac = RM.mode === 'ac';
    RM.F.reset(ac ? 30 : 10);
    RSRC.wall.T = ac ? 38 : 4; RSRC.wall.k = ac ? 0.03 : 0.04;
    RSRC.ac.on = ac; RSRC.heater.on = false; RM.on = ac ? true : false;
    RSRC.heater.j0 = heaterRow(); RSRC.heater.j1 = heaterRow() + 3;
    RM.t = 0; RM.hist = [[0, RM.F.T0, RM.F.T0]]; RM.histT = 0; RM.upper = RM.lower = RM.F.T0;
    roomSeed();
    syncUI();
  }
  function setHeaterPos(pos, silent) {
    if (!ROWS.hasOwnProperty(pos)) return;
    const changed = RM.pos !== pos;
    RM.pos = pos;
    if (changed || !silent) { const keep = RM.on; roomReset(); RM.on = keep; RSRC.heater.on = keep && RM.mode === 'heat'; }
    RM.place.target = ROWS[pos];
    syncUI();
  }
  function updateRoom(dt) {
    RM.heatK = approach(RM.heatK, RM.mode === 'heat' && RM.on ? 1 : 0, dt, 5);
    RM.place.update(dt);
    RSRC.heater.on = RM.mode === 'heat' && RM.on;
    stepFluid(RM.F, dt, ROOM_RATE, RM);
    advectParts(RM.F, RM.parts, dt, ROOM_RATE * 0.85, 0.03);
    if (RM.on || RM.mode === 'ac') RM.t += dt;
    RM.upper = RM.F.meanRows(RM.F.T, 1, 7);
    RM.lower = RM.F.meanRows(RM.F.T, 12, 19);
    RM.histT += dt;
    if (RM.histT >= 0.5) {
      RM.histT = 0;
      if (RM.hist.length < 400 && (RM.on || RM.mode === 'ac')) RM.hist.push([RM.t * ROOM_RATE, RM.upper, RM.lower]);
    }
    RM.lift = approach(RM.lift, RM.drag ? 1 : 0, dt, 14);
  }

  /* =========================================================
     ③ 복사: 난로 → (공기가 있든 없든) → 검은 컵·흰 컵, 은박지로 막기
     ========================================================= */
  const RD = {
    stove: false, stoveK: 0, vac: false, vacK: 0, foil: false, foilK: 0, drag: false, fx: 0, fy: 0, lift: 0,
    Tb: 20, Tw: 20, t: 0, air: [], flashes: [], phase: 0, tw: null, pumpSpin: 0, pose: { x: 0, y: 0, s: 0 }, poseInit: false,
  };
  const RADP = { amb: 20, P: 60, absB: 1.0, absW: 0.3, h: 0.12 };
  function radSeed() {
    RD.air.length = 0;
    for (let i = 0; i < 46; i++) RD.air.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, r: 2.4 + Math.random() * 1.4 });
  }
  radSeed();
  const foilBlock = () => (RD.foil ? clamp((RD.foilK - 0.55) / 0.4, 0, 1) : 0);
  function updateRad(dt) {
    RD.stoveK = approach(RD.stoveK, RD.stove ? 1 : 0, dt, 4);
    RD.vacK = approach(RD.vacK, RD.vac ? 1 : 0, dt, 1.6);
    RD.foilK = approach(RD.foilK, RD.foil ? 1 : 0, dt, 9);
    // 은박지 위치: 끌고 있거나 움직이는 중이 아니면 제자리(화면 배치가 바뀌어도 맞춰 줌)
    const G = GEO.rad(activeView().L);
    if (!RD.drag && !(RD.tw && !RD.tw.done)) {
      if (RD.foil) { RD.pose.x = G.foilX; RD.pose.y = (G.foilY0 + G.foilY1) / 2; RD.pose.s = 1; }
      else { RD.pose.x = G.tray.x + G.tray.w / 2; RD.pose.y = G.tray.y + G.tray.h * 0.66; RD.pose.s = 0; }
    }
    RD.lift = approach(RD.lift, RD.drag ? 1 : 0, dt, 14);
    RD.phase += dt;
    RD.pumpSpin += dt * (RD.vac && RD.vacK < 0.97 ? 14 : 1.5);
    const flux = RD.stoveK * (1 - 0.96 * foilBlock());
    RD.Tb += dt * RADP.h * (RADP.amb + RADP.P * RADP.absB * flux - RD.Tb);
    RD.Tw += dt * RADP.h * (RADP.amb + RADP.P * RADP.absW * flux - RD.Tw);
    if (RD.stove || RD.stoveK > 0.05) RD.t += dt;
    for (const p of RD.air) {                      // 공기 알갱이: 제멋대로 움직임, 진공이면 펌프로 빠져나감
      p.x += p.vx * dt * 0.05; p.y += p.vy * dt * 0.05;
      if (RD.vac) { p.x += (0.5 - p.x) * dt * 0.8 * RD.vacK; p.y += (1.1 - p.y) * dt * 0.9 * RD.vacK; }
      if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1;
      p.x = clamp(p.x, 0, 1); p.y = clamp(p.y, 0, 1);
      if (Math.random() < dt * 2) { p.vx += (Math.random() - 0.5) * 0.8; p.vy += (Math.random() - 0.5) * 0.8; p.vx = clamp(p.vx, -1.4, 1.4); p.vy = clamp(p.vy, -1.4, 1.4); }
    }
    for (let i = RD.flashes.length - 1; i >= 0; i--) { RD.flashes[i].age += dt; if (RD.flashes[i].age > 0.5) RD.flashes.splice(i, 1); }
  }
  function radReset() {
    if (RD.tw) { RD.tw.cancel(); RD.tw = null; }
    Object.assign(RD, { stove: false, vac: false, foil: false, foilK: 0, drag: false, Tb: 20, Tw: 20, t: 0 });
    RD.flashes.length = 0;
    radSeed();
    syncUI();
  }

  /* =========================================================
     ④ 단열: 보온병 — 진공층(전도·대류 차단), 은도금(복사 차단), 뚜껑(대류 차단)
     ========================================================= */
  const TH = { vac: false, silver: false, lid: false, lidK: 0, t: 0, rec: [[0, 90]], recC: [[0, 90]], nextRec: 0.5, T: 90, Tc: 90, done: false, holdOk: 0, pop: { s: 0 } };
  const TH_END = 30, TH_SPEED = 2.2, TH_AMB = 20;     // 분, 분/초
  const THK = { cond: 0.012, convGap: 0.008, convTop: 0.0145, rad: 0.0105 };
  function thLoss(vac, silver, lid) {
    return {
      cond: THK.cond * (vac ? 0.04 : 1), convGap: THK.convGap * (vac ? 0 : 1),
      convTop: THK.convTop * (lid ? 0.07 : 1), rad: THK.rad * (silver ? 0.08 : 1),
    };
  }
  const thSum = (o) => o.cond + o.convGap + o.convTop + o.rad;
  const thTemp = (k, t) => TH_AMB + (90 - TH_AMB) * Math.exp(-k * t);
  const THBASE = thSum(thLoss(false, false, false));
  function thRestart() {
    TH.t = 0; TH.rec = [[0, 90]]; TH.nextRec = 0.5; TH.T = 90; TH.Tc = 90; TH.done = false; TH.pop.s = 0;
  }
  function thFinish() {                            // 퀴즈·확인용: 끝까지 한 번에 계산
    TH.t = TH_END; TH.rec = []; TH.recC = [];
    const k = thSum(thLoss(TH.vac, TH.silver, TH.lid));
    for (let t = 0; t <= TH_END + 1e-9; t += 0.5) { TH.rec.push([t, thTemp(k, t)]); }
    TH.T = thTemp(k, TH_END); TH.Tc = thTemp(THBASE, TH_END); TH.done = true; TH.pop.s = 1;
  }
  function updateThermos(dt) {
    TH.lidK = approach(TH.lidK, TH.lid ? 1 : 0, dt, 9);
    const k = thSum(thLoss(TH.vac, TH.silver, TH.lid));
    if (!TH.done) {
      TH.t = Math.min(TH_END, TH.t + dt * TH_SPEED);
      while (TH.nextRec <= TH.t + 1e-9) { TH.rec.push([TH.nextRec, thTemp(k, TH.nextRec)]); TH.nextRec += 0.5; }
      TH.T = thTemp(k, TH.t);
      if (TH.t >= TH_END) {
        TH.done = true; TH.pop.s = 0;
        SciSim.tween(TH.pop, { s: 1 }, { duration: 0.6, ease: 'outBack' });
      }
    }
    TH.Tc = thTemp(THBASE, TH.t);
  }

  /* =========================================================
     업데이트
     ========================================================= */
  function updateCond(dt) {
    C.heatK = approach(C.heatK, C.heat ? 1 : 0, dt, 4);
    C.camK = approach(C.camK, C.camOn ? 1 : 0, dt, 6);
    C.modelK = approach(C.modelK, C.model && on('model') ? 1 : 0, dt, 5);
    if (C.modelK < 0.002) C.modelK = 0; else if (C.modelK > 0.998) C.modelK = 1;
    stepRods(dt);
    if (C.heat) C.tHeat += dt;
    if (C.heat && C.camOn) C.obs += dt;
    if (C.cooling && RODS.every((r) => Math.max(r.T[0], r.T[NR - 1]) < 21.6)) { C.cooling = false; C.tHeat = 0; syncUI(); }
    // 입자 모형: 온도 차가 큰 이웃 사이에서 운동이 전달되는 순간(번쩍)
    const G = GEO.cond(activeView().L, 1), cols = G.cols;
    if (C.modelK > 0.3 && !REDUCE) {
      const r = RODS[C.sel >= 0 ? C.sel : 0];
      C.spawn += dt * 16;
      while (C.spawn >= 1) {
        C.spawn -= 1;
        let tot = 0; const w = [];
        for (let c = 0; c < cols - 1; c++) { const g = Math.max(0, rodAt(r, c / (cols - 1)) - rodAt(r, (c + 1) / (cols - 1))); w.push(g); tot += g; }
        if (tot < 1.5) continue;
        let x = Math.random() * tot, c = 0;
        while (c < cols - 2 && x > w[c]) { x -= w[c]; c++; }
        if (C.sparks.length < 40) C.sparks.push({ c, row: Math.floor(Math.random() * G.rows), age: 0 });
      }
    }
    for (let i = C.sparks.length - 1; i >= 0; i--) { C.sparks[i].age += dt; if (C.sparks[i].age > 0.4) C.sparks.splice(i, 1); }
  }
  function update(dt, t) {
    if (S.scene === 'cond') updateCond(dt);
    else if (S.scene === 'beaker') updateBeaker(dt);
    else if (S.scene === 'room') updateRoom(dt);
    else if (S.scene === 'rad') updateRad(dt);
    else if (S.scene === 'thermos') updateThermos(dt);
    watchSuccess(dt);
    VIEWS.forEach((V) => V.fx.update(dt));
  }

  /* =========================================================
     그리기 공통
     ========================================================= */
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
    if (S.scene === 'cond') drawCond(V, t);
    else if (S.scene === 'beaker') drawBeaker(V, t);
    else if (S.scene === 'room') drawRoom(V, t);
    else if (S.scene === 'rad') drawRad(V, t);
    else drawThermos(V, t);
    ctx.restore();
    drawSuccess(V);
    V.fx.draw(ctx);
  }
  function tangents(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d <= Math.abs(b.r - a.r) + 1) return null;
    const th = Math.atan2(dy, dx), ph = Math.acos((a.r - b.r) / d);
    const P = (c, ang) => ({ x: c.x + Math.cos(ang) * c.r, y: c.y + Math.sin(ang) * c.r });
    return [[P(a, th + ph), P(b, th + ph)], [P(a, th - ph), P(b, th - ph)]];
  }
  // 작은 렌즈 고리 + 큰 돋보기까지 이어지는 점선 원뿔
  function lensCone(V, lens, big, alpha) {
    const { ctx } = V;
    const tg = tangents(lens, { x: big.x, y: big.y, r: big.r + 8 });
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (tg) {
      ctx.fillStyle = 'rgba(120,150,200,.11)';
      ctx.beginPath(); ctx.moveTo(tg[0][0].x, tg[0][0].y); ctx.lineTo(tg[0][1].x, tg[0][1].y); ctx.lineTo(tg[1][1].x, tg[1][1].y); ctx.lineTo(tg[1][0].x, tg[1][0].y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(90,110,140,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(tg[0][0].x, tg[0][0].y); ctx.lineTo(tg[0][1].x, tg[0][1].y); ctx.moveTo(tg[1][0].x, tg[1][0].y); ctx.lineTo(tg[1][1].x, tg[1][1].y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(255,255,255,.28)'; circle(ctx, lens.x, lens.y, lens.r); ctx.fill();
    ctx.strokeStyle = '#5b6b82'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  // 입자 모형 돋보기(원) 안에 입자 무리를 그림
  function drawMag(V, M, swarm, T, tint, alpha, fs, title, tcolor) {
    const { ctx, D } = V;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const sc = 0.85 + 0.15 * alpha;
    ctx.translate(M.x, M.y); ctx.scale(sc, sc); ctx.translate(-M.x, -M.y);
    D.shadow(() => { ctx.fillStyle = '#fff'; circle(ctx, M.x, M.y, M.r + 8); ctx.fill(); }, { blur: 18, y: 6, color: 'rgba(20,40,80,.28)' });
    const rg = ctx.createLinearGradient(M.x - M.r, M.y - M.r, M.x + M.r, M.y + M.r);
    rg.addColorStop(0, '#f6f8fb'); rg.addColorStop(0.5, '#aeb9c8'); rg.addColorStop(1, '#6f7d92');
    ctx.fillStyle = rg; circle(ctx, M.x, M.y, M.r + 8); ctx.fill();
    ctx.save();
    circle(ctx, M.x, M.y, M.r); ctx.clip();
    const bg = ctx.createRadialGradient(M.x - M.r * 0.3, M.y - M.r * 0.4, M.r * 0.1, M.x, M.y, M.r * 1.05);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, rgba(tint, 0.34));
    ctx.fillStyle = bg; ctx.fillRect(M.x - M.r, M.y - M.r, M.r * 2, M.r * 2);
    const col = partColor(T), r = PR * M.r;
    ctx.strokeStyle = rgba(col, 0.28); ctx.lineWidth = r * 1.1; ctx.lineCap = 'round';
    ctx.beginPath();
    for (const p of swarm) { const x = M.x + p.x * M.r, y = M.y + p.y * M.r; ctx.moveTo(x, y); ctx.lineTo(x - p.vx * M.r * 0.075, y - p.vy * M.r * 0.075); }
    ctx.stroke();
    for (const p of swarm) ball(ctx, M.x + p.x * M.r, M.y + p.y * M.r, r, col);
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.beginPath(); ctx.ellipse(M.x - M.r * 0.42, M.y - M.r * 0.5, M.r * 0.42, M.r * 0.16, -0.65, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,50,70,.35)'; ctx.lineWidth = 1.5; circle(ctx, M.x, M.y, M.r); ctx.stroke();
    if (title) D.label(M.x, M.y - M.r - 24, title, { bg: tcolor || '#2b3445', size: 14 * fs });
    ctx.restore();
  }

  /* =========================================================
     ① 전도 장면
     ========================================================= */
  const ROD_STYLE = {
    cu: [[0, '#ffe0bd'], [0.2, '#f2a96b'], [0.55, '#c8672b'], [1, '#7c3a16']],
    fe: [[0, '#f6f8fb'], [0.2, '#c8d0db'], [0.6, '#8995a8'], [1, '#556075']],
    wd: [[0, '#e8c28a'], [0.3, '#c99c64'], [1, '#8a5d2e']],
  };
  function vgrad(ctx, y, h, stops) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    stops.forEach((s) => g.addColorStop(s[0], s[1]));
    return g;
  }
  function drawRodNormal(V, r, x0, x1, yc, h, key, t) {
    const { ctx, D } = V, y = yc - h / 2, w = x1 - x0;
    groundShadow(ctx, x0 + w / 2, y + h + 12, w * 0.5, 7, 0.16);
    // 받침대 두 개
    ctx.fillStyle = '#9aa7ba';
    [0.22, 0.78].forEach((f) => {
      const sx = x0 + w * f;
      ctx.beginPath(); ctx.moveTo(sx - 12, y + h + 14); ctx.lineTo(sx + 12, y + h + 14); ctx.lineTo(sx + 7, y + h - 2); ctx.lineTo(sx - 7, y + h - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7d8aa0'; ctx.fillRect(sx - 14, y + h + 12, 28, 4); ctx.fillStyle = '#9aa7ba';
    });
    ctx.fillStyle = vgrad(ctx, y, h, ROD_STYLE[key]);
    D.roundRect(x0, y, w, h, Math.min(12, h / 3)); ctx.fill();
    if (key === 'wd') {                                   // 나뭇결
      ctx.save(); D.roundRect(x0, y, w, h, Math.min(12, h / 3)); ctx.clip();
      ctx.strokeStyle = 'rgba(92,56,24,.35)'; ctx.lineWidth = 1.4;
      for (let k = 0; k < 6; k++) {
        const yy = y + h * (0.14 + k * 0.15);
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) { const xx = x0 + (w * i) / 24; const py = yy + Math.sin(i * 0.9 + k * 1.7) * 2.2; i ? ctx.lineTo(xx, py) : ctx.moveTo(xx, py); }
        ctx.stroke();
      }
      ctx.restore();
    }
    // 위쪽 반사광
    ctx.fillStyle = 'rgba(255,255,255,.4)'; D.roundRect(x0 + 6, y + 3, w - 12, Math.max(3, h * 0.12), 3); ctx.fill();
    // 오른쪽 끝 마개
    ctx.fillStyle = shade(r.color, -0.25); D.roundRect(x1 - 7, y, 7, h, 3); ctx.fill();
  }
  function rodThermalGrad(ctx, r, x0, x1) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    const n = 28;
    for (let i = 0; i <= n; i++) g.addColorStop(i / n, thermColor(rodAt(r, i / n)));
    return g;
  }
  function drawHeaterBlock(V, Hh, thermal, t, fs) {
    const { ctx, D } = V, k = C.heatK;
    D.shadow(() => {
      ctx.fillStyle = thermal ? '#2a3350' : vgrad(ctx, Hh.y, Hh.h, [[0, '#8793a8'], [0.5, '#5f6b82'], [1, '#434d62']]);
      D.roundRect(Hh.x, Hh.y, Hh.w, Hh.h, 14); ctx.fill();
    }, { blur: 12, y: 4 });
    // 달궈진 속 (가열하면 주황~흰색)
    const gx = Hh.x + Hh.w * 0.28, gw = Hh.w * 0.44;
    const g = ctx.createLinearGradient(0, Hh.y, 0, Hh.y + Hh.h);
    const hot = ramp([[0, '#2a2f3d'], [0.4, '#8a2f1d'], [0.75, '#ff7a2f'], [1, '#fff0b8']], k);
    g.addColorStop(0, hot); g.addColorStop(1, shade(hot, -0.15));
    ctx.fillStyle = g; D.roundRect(gx, Hh.y + 12, gw, Hh.h - 24, 8); ctx.fill();
    if (k > 0.05) { ctx.save(); ctx.globalAlpha = k * 0.7; D.glow(Hh.x + Hh.w * 0.5, Hh.y + Hh.h / 2, Hh.h * 0.55, '#ff8a3d', 0.6); ctx.restore(); }
    ctx.fillStyle = 'rgba(255,255,255,.22)'; D.roundRect(Hh.x + 5, Hh.y + 5, 5, Hh.h - 10, 3); ctx.fill();
    // 표시등
    ctx.fillStyle = k > 0.5 ? '#ff4b3a' : '#59627a'; circle(ctx, Hh.x + Hh.w - 12, Hh.y + 12, 4.5); ctx.fill();
    D.label(Hh.x + 2, Hh.y - 14, k > 0.5 ? '가열 100 °C' : '가열 장치', { bg: k > 0.5 ? '#c2410c' : '#475569', size: 13 * fs, align: 'left' });
  }
  function drawCond(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs;
    const G = GEO.cond(L, C.modelK);
    const tall = L.key === 'tall';
    // ── 보통 눈으로 본 모습
    drawHeaterBlock(V, G.heater, false, t, fs);
    RODS.forEach((r, i) => drawRodNormal(V, r, G.x0, G.x1, G.yc[i], G.rodH, r.key, t));
    // ── 열화상 카메라로 본 모습 (겹쳐서 서서히 나타남)
    if (C.camK > 0.01) {
      ctx.save();
      ctx.globalAlpha *= C.camK;
      const top = G.yc[0] - G.rodH / 2 - (tall ? lerp(54, 40, C.modelK) : 40), bot = G.yc[2] + G.rodH / 2 + 34;
      const pan = { x: 4, y: top, w: L.vw - 8, h: bot - top };
      const bgG = ctx.createLinearGradient(0, pan.y, 0, pan.y + pan.h);
      bgG.addColorStop(0, '#141a3a'); bgG.addColorStop(1, '#0b1026');
      ctx.fillStyle = bgG; D.roundRect(pan.x, pan.y, pan.w, pan.h, 18); ctx.fill();
      // 스캔 줄무늬
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      for (let yy = pan.y + 4; yy < pan.y + pan.h; yy += 5) ctx.fillRect(pan.x + 6, yy, pan.w - 12, 1);
      // 뷰파인더 모서리 (이름표보다 아래에 그림)
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      const bl = 20, bx0 = pan.x + 8, by0 = pan.y + 8, bx1 = pan.x + pan.w - 8, by1 = pan.y + pan.h - 8;
      [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]].forEach(([x, y, sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(x, y + sy * bl); ctx.lineTo(x, y); ctx.lineTo(x + sx * bl, y); ctx.stroke();
      });
      drawHeaterBlock(V, G.heater, true, t, fs);
      RODS.forEach((r, i) => {
        const y = G.yc[i] - G.rodH / 2;
        const hot = Math.max(0, (rodAt(r, 0) - 25) / 75);
        if (hot > 0.05) D.glow(G.x0 + (G.x1 - G.x0) * 0.12, G.yc[i], G.rodH * 1.6, thermColor(rodAt(r, 0.05)), 0.35 * hot);
        ctx.fillStyle = rodThermalGrad(ctx, r, G.x0, G.x1);
        D.roundRect(G.x0, y, G.x1 - G.x0, G.rodH, Math.min(12, G.rodH / 3)); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.14)'; D.roundRect(G.x0 + 6, y + 3, G.x1 - G.x0 - 12, Math.max(3, G.rodH * 0.12), 3); ctx.fill();
        // 측정점(십자)
        const px = G.x1 - 14, py = G.yc[i];
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.8;
        circle(ctx, px, py, 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px - 14, py); ctx.lineTo(px - 4, py); ctx.moveTo(px + 4, py); ctx.lineTo(px + 14, py); ctx.moveTo(px, py - 14); ctx.lineTo(px, py - 4); ctx.moveTo(px, py + 4); ctx.lineTo(px, py + 14); ctx.stroke();
      });
      // 색 막대
      const cbw = tall ? 110 : 190, cbx = pan.x + pan.w - cbw - (tall ? 76 : 62), cby = pan.y + 14;
      ctx.fillStyle = '#e8eefc'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'right';
      ctx.fillText(tall ? '📷 열화상' : '📷 열화상 카메라', cbx - 44, cby + 11);
      const cg = ctx.createLinearGradient(cbx, 0, cbx + cbw, 0);
      for (let i = 0; i <= 10; i++) cg.addColorStop(i / 10, thermColor(20 + i * 8));
      ctx.fillStyle = cg; D.roundRect(cbx, cby, cbw, 10, 5); ctx.fill();
      ctx.fillStyle = '#c9d4ee'; ctx.font = font(13 * fs, 700); ctx.textAlign = 'right'; ctx.fillText('20°', cbx - 6, cby + 10); ctx.textAlign = 'left'; ctx.fillText('100°C', cbx + cbw + 6, cby + 10);
      // 켜질 때 한 번 훑는 선
      if (C.scan.p < 1) {
        const yy = pan.y + pan.h * C.scan.p;
        const sg = ctx.createLinearGradient(0, yy - 40, 0, yy);
        sg.addColorStop(0, 'rgba(120,200,255,0)'); sg.addColorStop(1, 'rgba(160,225,255,.55)');
        ctx.fillStyle = sg; ctx.fillRect(pan.x + 6, yy - 40, pan.w - 12, 40);
        ctx.fillStyle = 'rgba(210,240,255,.95)'; ctx.fillRect(pan.x + 6, yy - 1.5, pan.w - 12, 3);
      }
      ctx.textAlign = 'left';
      ctx.restore();
    }
    // ── 이름표 · 온도 센서 · 선택 표시
    RODS.forEach((r, i) => {
      const yc = G.yc[i], y0 = yc - G.rodH / 2;
      const nb = D.label(G.x0 + 8, y0 - 14, r.label, { bg: shade(r.color, -0.32), size: 13.5 * fs, align: 'left' });
      // 센서 + 케이블 + 표시창
      const d = G.disp[i];
      ctx.strokeStyle = '#3a4456'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(G.x1 - 1, yc); ctx.bezierCurveTo(G.x1 + 8, yc, d.x - 8, d.y + d.h / 2, d.x + 2, d.y + d.h / 2); ctx.stroke();
      ctx.fillStyle = '#2b3445'; D.roundRect(G.x1 - 11, yc - 9, 11, 18, 4); ctx.fill();
      D.shadow(() => { ctx.fillStyle = '#2b3445'; D.roundRect(d.x, d.y, d.w, d.h, 10); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = '#d6deeb'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'left'; ctx.fillText(r.name + ' 끝', d.x + 9, d.y + 18 * (tall ? 1.1 : 1));
      ctx.fillStyle = thermColor(Math.max(20, rodEnd(i))); ctx.font = mono(21 * (tall ? 1.05 : 1), 800); ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(rodEnd(i).toFixed(1) + '°', d.x + d.w - 8, d.y + d.h - 9);
      ctx.textAlign = 'left';
      // 선택한 막대
      const sel = C.sel === i;
      if (sel || S.pick) {
        const a = 0.5 + 0.5 * Math.sin(t * 5);
        ctx.save(); ctx.setLineDash([8, 6]); ctx.lineDashOffset = -t * 18;
        ctx.strokeStyle = rgba('#14a058', sel ? 0.85 : 0.35 + a * 0.4); ctx.lineWidth = sel ? 3.5 : 2.5;
        D.roundRect(G.x0 - 5, y0 - 5, G.x1 - G.x0 + 10, G.rodH + 10, 14); ctx.stroke(); ctx.restore();
        if (sel) D.label(nb.x + nb.w + 8, y0 - 14, '✔ 선택', { bg: '#14a058', size: 13 * fs, align: 'left' });
        else D.label(nb.x + nb.w + 8, y0 - 14, '👆 눌러서 고르기', { bg: 'rgba(20,160,88,.92)', size: 13 * fs, align: 'left' });
      }
    });
    // 열이 이동하는 방향 안내
    if (C.heat && C.heatK > 0.5 && C.modelK < 0.5) {
      const y = G.yc[2] + G.rodH / 2 + 30;
      ctx.save(); ctx.globalAlpha = 0.9 * (1 - C.modelK * 2);
      D.arrow(G.x0 + 40, y, G.x1 - 60, y, { color: HEAT, width: 5, head: 15, dash: [10, 8], alpha: 0.75 });
      D.label((G.x0 + G.x1) / 2, y - 18, '열은 이쪽으로 이동해요', { bg: 'rgba(194,65,12,.9)', size: 13 * fs });
      ctx.restore();
    }
    if (C.modelK > 0.01) drawCondModel(V, G, t);
  }
  // 입자 모형: 제자리에서 떨리는 입자들. 가열한 쪽부터 진동이 커지며 이웃에게 전해진다.
  function jit(c, r, k) { const s = Math.sin(c * 127.1 + r * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }
  function drawCondModel(V, G, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, e = C.modelK, tall = L.key === 'tall';
    const P = G.panel, ri = C.sel >= 0 ? C.sel : 0, r = RODS[ri];
    ctx.save();
    ctx.globalAlpha *= clamp(e * 1.3, 0, 1);
    panel(V, P, 16);
    ctx.fillStyle = '#2b3445'; ctx.font = font(15 * fs, 800); ctx.textAlign = 'left';
    ctx.fillText('🔍 입자 모형 — ' + r.label + ' 속', P.x + 14, P.y + 26 * fs);
    D.label(P.x + P.w - 12, P.y + 22 * fs, ri === 2 ? '입자가 느슨하게 연결돼 있어요' : '입자가 촘촘하게 연결돼 있어요', { bg: '#64748b', size: 13 * fs, align: 'right' });
    const cols = G.cols, rows = G.rows;
    const lx0 = G.x0 + 14, lx1 = G.x1 - 14;
    const ly0 = P.y + 70 * fs, ly1 = P.y + P.h - (tall ? 108 : 78);
    const dx = (lx1 - lx0) / (cols - 1), dy = rows > 1 ? (ly1 - ly0) / (rows - 1) : 0;
    const rad = clamp(dx * 0.27, 5, 10.5), ampMax = dx * 0.3;
    const wood = ri === 2;
    // 가열 장치(왼쪽) 표시
    const hb = { x: tall ? P.x + 8 : P.x + 12, y: ly0 - 22, w: tall ? 38 : 58, h: ly1 - ly0 + 44 };
    const hg = ctx.createLinearGradient(0, hb.y, 0, hb.y + hb.h);
    const hc = ramp([[0, '#59627a'], [0.5, '#c9552c'], [1, '#ff9a4a']], C.heatK);
    hg.addColorStop(0, hc); hg.addColorStop(1, shade(hc, -0.2));
    D.shadow(() => { ctx.fillStyle = hg; D.roundRect(hb.x, hb.y, hb.w, hb.h, 12); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.fillStyle = '#fff'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'center';
    ctx.fillText('가열', hb.x + hb.w / 2, hb.y + hb.h / 2 + 5);
    // 격자 위치 (나무는 불규칙)
    const site = (c, rr) => {
      let x = lx0 + c * dx, y = rows > 1 ? ly0 + rr * dy : (ly0 + ly1) / 2;
      if (wood) { x += (jit(c, rr, 1) - 0.5) * dx * 0.42; y += (jit(c, rr, 2) - 0.5) * dy * 0.42; }
      return [x, y];
    };
    const pos = [];
    for (let rr = 0; rr < rows; rr++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        const [sx, sy] = site(c, rr), Tl = rodAt(r, c / (cols - 1));
        const heat = clamp((Tl - 20) / 70, 0, 1);
        const A = (REDUCE ? 0.35 : 1) * (0.07 + 0.93 * heat) * ampMax;
        const w1 = 11 + jit(c, rr, 3) * 7, w2 = 10 + jit(c, rr, 4) * 8, p1 = jit(c, rr, 5) * TAU, p2 = jit(c, rr, 6) * TAU;
        row.push({ x: sx + A * Math.cos(w1 * t + p1), y: sy + A * Math.sin(w2 * t + p2), sx, sy, T: Tl });
      }
      pos.push(row);
    }
    // 입자 사이의 결합(용수철)
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = wood ? 'rgba(140,110,80,.35)' : 'rgba(110,128,160,.55)'; ctx.lineWidth = wood ? 1.6 : 2.4;
      ctx.beginPath();
      for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
        const a = pos[rr][c];
        if (pass === 0 && c < cols - 1 && !(wood && jit(c, rr, 9) < 0.35)) { const b = pos[rr][c + 1]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
        if (pass === 1 && rr < rows - 1 && !(wood && jit(c, rr, 8) < 0.35)) { const b = pos[rr + 1][c]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
      }
      ctx.stroke();
    }
    // 제자리 표시(흐린 점)
    ctx.fillStyle = 'rgba(120,135,160,.35)';
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) { circle(ctx, pos[rr][c].sx, pos[rr][c].sy, 2); ctx.fill(); }
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) { const p = pos[rr][c]; ball(ctx, p.x, p.y, rad, partColor(p.T)); }
    // 운동이 전달되는 순간
    C.sparks.forEach((s) => {
      const a = pos[s.row] && pos[s.row][s.c], b = pos[s.row] && pos[s.row][s.c + 1];
      if (!a || !b) return;
      const k = s.age / 0.4, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      ctx.strokeStyle = rgba('#ffb400', 0.95 * (1 - k)); ctx.lineWidth = 2.4; circle(ctx, x, y, rad * (0.7 + k * 1.5)); ctx.stroke();
      D.spark(x, y, rad * 1.1 * (1 - k * 0.4), t, '#fff2b3');
    });
    // 열이 이동하는 방향과 설명
    const ay = ly1 + (tall ? 30 : 30);
    D.arrow(lx0, ay, lx1, ay, { color: HEAT, width: 5, head: 15, alpha: C.heat ? 0.85 : 0.35 });
    D.label((lx0 + lx1) / 2, ay - 16 * (tall ? 1.1 : 1), '열의 이동', { bg: 'rgba(194,65,12,.9)', size: 13 * fs });
    ctx.fillStyle = '#3a4456'; ctx.font = font(14 * fs, 800); ctx.textAlign = 'center';
    if (tall) {
      ctx.fillText('입자는 제자리에서 떨리기만 해요.', P.x + P.w / 2, P.y + P.h - 40);
      ctx.fillText('이웃 입자에 운동을 차례로 전달해요!', P.x + P.w / 2, P.y + P.h - 16);
    } else ctx.fillText('입자는 제자리에서 떨리기만 하고, 이웃 입자에 운동을 차례로 전달해요!', P.x + P.w / 2, P.y + P.h - 14);
    ctx.textAlign = 'left';
    ctx.restore();
    if (isNew('model')) newRing(V, P, t);
  }

  // 유선: 속도장을 따라 몇 걸음씩 나아간 길을 점선으로 그림 (점선이 흐르는 방향으로 움직여요)
  function drawStreams(V, f, seeds, toX, toY, t, o) {
    const { ctx } = V;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = o.w || 2.2; ctx.setLineDash([9, 8]); ctx.lineDashOffset = -(REDUCE ? 0 : t * 26);
    for (const sd of seeds) {
      let x = sd[0], y = sd[1];
      if (Math.hypot(f.sample(f.u, x, y), f.sample(f.v, x, y)) < (o.minSpeed || 1)) continue;
      let seg = 0, px = toX(x), py = toY(y);
      ctx.beginPath(); ctx.moveTo(px, py);
      for (let i = 0; i < (o.steps || 36); i++) {
        const u = f.sample(f.u, x, y), v = f.sample(f.v, x, y), sp = Math.hypot(u, v);
        if (sp < 0.3) break;
        const h = (o.step || 0.6) / sp, u2 = f.sample(f.u, x + u * h * 0.5, y + v * h * 0.5), v2 = f.sample(f.v, x + u * h * 0.5, y + v * h * 0.5);
        x += u2 * h; y += v2 * h;
        if (x < 1 || x > f.nx || y < 1 || y > f.ny) break;
        ctx.lineTo(toX(x), toY(y));
        if (++seg === 4) {                         // 4걸음마다 그 자리의 온도로 색을 바꿈
          const Tl = f.sample(f.T, x, y);
          ctx.strokeStyle = rgba(Tl > o.warm ? '#d9381e' : '#1d4ed8', o.alpha || 0.4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(toX(x), toY(y)); seg = 0;
        }
      }
      ctx.strokeStyle = rgba(f.sample(f.T, x, y) > o.warm ? '#d9381e' : '#1d4ed8', o.alpha || 0.4); ctx.stroke();
    }
    ctx.restore();
  }
  const BK_SEEDS = [[2.3, 18], [2.6, 11], [3.4, 4.5], [8, 2.3], [13.4, 5], [14, 12], [13, 18.5], [8, 20.6], [5, 20.4], [8, 11]];
  const RM_SEEDS = [[3, 17], [3, 9], [5, 3], [15, 2], [26, 3], [29, 9], [28, 17], [15, 19.5], [7, 19], [22, 19], [15.5, 5], [15.5, 11], [15.5, 16], [22, 10], [8, 10]];

  /* =========================================================
     ② 대류 (1) 장면: 알코올램프로 가열하는 비커
     ========================================================= */
  // 온도장 → 작은 그림(격자 1칸 = 1픽셀)으로 만들어 두고 늘려서 그림 (부드러운 색 번짐)
  function makeField(nx, ny, stops, t0, t1, alpha) {
    const cv = document.createElement('canvas'); cv.width = nx; cv.height = ny;
    const cx = cv.getContext('2d'), img = cx.createImageData(nx, ny), table = [];
    for (let T = t0; T <= t1 + 1e-6; T += 0.5) table.push(h2r(ramp(stops, T)));
    return { cv, cx, img, table, t0, nx, ny, alpha };
  }
  function paintField(fd, f) {
    const d = fd.img.data, { nx, ny, table, t0 } = fd;
    for (let j = 1; j <= ny; j++) for (let i = 1; i <= nx; i++) {
      const T = f.T[i + f.W * j], idx = clamp(Math.round((T - t0) * 2), 0, table.length - 1), c = table[idx], k = ((j - 1) * nx + (i - 1)) * 4;
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = fd.alpha;
    }
    fd.cx.putImageData(fd.img, 0, 0);
  }
  const BKF = makeField(BNX, BNY, WATMAP, 18, 80, 232);
  const RMF = makeField(RNX, RNY, AIRMAP, 2, 62, 236);

  function drawLamp(V, x, wickY, benchY, k, t, fs) {
    const { ctx, D } = V;
    // 유리병 몸통
    const bw = 64, top = wickY + 10;
    ctx.save();
    D.shadow(() => {
      const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
      g.addColorStop(0, 'rgba(210,230,245,.95)'); g.addColorStop(0.35, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(170,200,225,.95)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x - 13, top); ctx.bezierCurveTo(x - 13, top + 10, x - bw / 2, top + 4, x - bw / 2, benchY - 14);
      ctx.quadraticCurveTo(x - bw / 2, benchY, x - bw / 2 + 12, benchY); ctx.lineTo(x + bw / 2 - 12, benchY); ctx.quadraticCurveTo(x + bw / 2, benchY, x + bw / 2, benchY - 14);
      ctx.bezierCurveTo(x + bw / 2, top + 4, x + 13, top + 10, x + 13, top); ctx.closePath(); ctx.fill();
    }, { blur: 8, y: 3 });
    ctx.fillStyle = 'rgba(244,180,90,.55)';                     // 알코올
    ctx.beginPath(); ctx.moveTo(x - bw / 2 + 3, benchY - 20); ctx.lineTo(x + bw / 2 - 3, benchY - 20); ctx.quadraticCurveTo(x + bw / 2 - 2, benchY - 1, x + bw / 2 - 12, benchY - 1); ctx.lineTo(x - bw / 2 + 12, benchY - 1); ctx.quadraticCurveTo(x - bw / 2 + 2, benchY - 1, x - bw / 2 + 3, benchY - 20); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - bw / 2 + 10, top + 14); ctx.lineTo(x - bw / 2 + 8, benchY - 26); ctx.stroke();
    // 심지 + 금속 받침
    ctx.fillStyle = '#9aa3b2'; D.roundRect(x - 11, wickY + 2, 22, 11, 3); ctx.fill();
    ctx.fillStyle = '#4a4036'; D.roundRect(x - 3, wickY - 4, 6, 8, 2); ctx.fill();
    ctx.restore();
    if (k > 0.02) D.flame(x, wickY - 3, 46 * k, t);
  }
  function drawBeaker(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, G = GEO.beaker(L), B = G.B, W = G.water, tall = L.key === 'tall';
    const wickY = G.lampY + 12, benchY = wickY + 46;
    // 실험대 + 삼발이 + 철망
    D.shadow(() => { ctx.fillStyle = vgrad(ctx, benchY, 26, [[0, '#d9e0ea'], [0.3, '#bcc7d6'], [1, '#97a5b9']]); D.roundRect(B.x - 100, benchY, B.w + 200, 26, 8); ctx.fill(); }, { blur: 10, y: 4 });
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(B.x - 8, B.y + B.h + 8); ctx.lineTo(B.x - 34, benchY); ctx.moveTo(B.x + B.w + 8, B.y + B.h + 8); ctx.lineTo(B.x + B.w + 34, benchY); ctx.stroke();
    drawLamp(V, G.lampX, wickY, benchY, BK.flame, t, fs);
    // 비커 속 물 (온도장 색)
    groundShadow(ctx, B.x + B.w / 2, B.y + B.h + 6, B.w * 0.62, 8, 0.2);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; D.roundRect(B.x, B.y, B.w, B.h, 10); ctx.fill();
    paintField(BKF, BK.F);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(W.x - 2, B.y + B.h - 10);
    for (let i = 0; i <= 20; i++) ctx.lineTo(W.x - 2 + ((W.w + 4) * i) / 20, W.y + (REDUCE ? 0 : Math.sin(t * 2.2 + i * 0.8) * 1.2));
    ctx.lineTo(W.x + W.w + 2, B.y + B.h - 10); ctx.quadraticCurveTo(W.x + W.w, B.y + B.h, W.x + W.w - 10, B.y + B.h); ctx.lineTo(W.x + 10, B.y + B.h); ctx.quadraticCurveTo(W.x, B.y + B.h, W.x - 2, B.y + B.h - 10); ctx.closePath(); ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(BKF.cv, 0, 0, BNX, BNY, W.x, W.y, W.w, B.y + B.h - W.y - 2);
    const toX = (gx) => W.x + ((gx - 0.5) / BNX) * W.w, toY = (gy) => W.y + ((gy - 0.5) / BNY) * (B.y + B.h - W.y - 2);
    if (BK.flame > 0.15) drawStreams(V, BK.F, BK_SEEDS, toX, toY, t, { warm: 32, minSpeed: 1.0, alpha: 0.42 * BK.flame, w: 2.4 });
    // 색소 알갱이: 짧은 꼬리 + 광택 공
    ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
    const pr = 3.8 * Math.min(fs, 1.1), cw = W.w / BNX;
    for (const p of BK.parts) {
      const sp = Math.hypot(p.u || 0, p.v || 0);
      if (sp > 0.8) { ctx.strokeStyle = rgba(partColor(p.T), 0.35); ctx.beginPath(); ctx.moveTo(toX(p.x), toY(p.y)); ctx.lineTo(toX(p.x) - (p.u || 0) * cw * 0.1, toY(p.y) - (p.v || 0) * cw * 0.1); ctx.stroke(); }
    }
    for (const p of BK.parts) ball(ctx, toX(p.x), toY(p.y), pr, partColor(p.T));
    ctx.restore();
    // 흐름 화살표 (뜨거운 물은 위로, 식은 물은 아래로)
    if (BK.flame > 0.2 || BK.F.meanRows(BK.F.T, 1, BNY) > 24) {
      const spots = [[2.2, 5], [2.2, 10], [2.2, 15], [8, 2.5], [13.5, 6], [13.5, 11], [13.5, 16], [8, 20.5]];
      spots.forEach(([gx, gy]) => {
        const u = BK.F.sample(BK.F.u, gx, gy), v = BK.F.sample(BK.F.v, gx, gy), sp = Math.hypot(u, v);
        if (sp < 1.1) return;
        const Tl = BK.F.sample(BK.F.T, gx, gy), len = clamp(sp * 5, 14, 40), ux = u / sp, uy = v / sp, x = toX(gx), y = toY(gy);
        const warm = Tl > 30;
        D.arrow(x - ux * len / 2, y - uy * len / 2, x + ux * len / 2, y + uy * len / 2, { color: warm ? '#d9381e' : '#1d4ed8', width: 4.5, head: 12, alpha: clamp((sp - 1.1) / 2, 0.25, 0.85) });
      });
    }
    // 유리 (눈금 포함)
    D.beaker(B.x, B.y, B.w, B.h, { level: 0, ticks: 7 });
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(W.x + 3, W.y - 1, W.w - 6, 3);
    // 철망 (비커 아래)
    ctx.strokeStyle = '#6b7588'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(B.x - 22, B.y + B.h + 7); ctx.lineTo(B.x + B.w + 22, B.y + B.h + 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(B.x - 20, B.y + B.h + 6); ctx.lineTo(B.x + B.w + 20, B.y + B.h + 6); ctx.stroke(); ctx.setLineDash([]);
    D.label(B.x + B.w / 2, B.y - 18, '💧 물', { bg: '#1d4ed8', size: 14 * fs });
    // 입자 모형 돋보기 두 개
    if (BK.lensK > 0.01) {
      const a = BK.lensK;
      lensCone(V, G.lensH, G.zH, a); lensCone(V, G.lensC, G.zC, a);
      drawMag(V, G.zH, BK.swH, showT(BK.TH), '#ff7a45', a, fs, '🔥 데워진 물 속', '#b4381b');
      drawMag(V, G.zC, BK.swC, showT(BK.TC), '#4f8df7', a, fs, '❄️ 식은 물 속', '#1d4ed8');
      ctx.save(); ctx.globalAlpha *= a; ctx.textAlign = 'center';
      const lines = (c, l1, l2, col) => { ctx.fillStyle = col; ctx.font = font(14 * fs, 800); ctx.fillText(l1, c.x, c.y); ctx.fillText(l2, c.x, c.y + 20 * fs); };
      lines(G.capH, '입자 운동이 활발하고', '사이가 멀어져 가벼워요 ⬆', '#9a2f12');
      lines(G.capC, '입자 운동이 둔하고', '촘촘해서 무거워요 ⬇', '#1c4aa8');
      ctx.restore(); ctx.textAlign = 'left';
      if (isNew('lens')) [G.zH, G.zC].forEach((z) => newRing(V, { x: z.x - z.r - 14, y: z.y - z.r - 40, w: 2 * z.r + 28, h: 2 * z.r + 96 + (tall ? 0 : 0) }, t));
    }
    // 불 붙이기 안내
    if (!BK.on && BK.tOn < 0.1 && on('flame')) {
      const a = 0.5 + 0.5 * Math.sin(t * 4);
      D.arrow(G.lampX + 104 - a * 8, wickY - 6, G.lampX + 34 - a * 8, wickY - 6, { color: '#14a058', width: 6, head: 18 });
      D.label(G.lampX + 112, wickY - 34, '불을 붙여 보세요', { bg: 'rgba(20,160,88,.92)', size: 13 * fs, align: 'left' });
    }
  }

  /* =========================================================
     ② 대류 (2) 장면: 교실 단면 — 난방기(끌어서 옮김)·에어컨
     ========================================================= */
  function drawHeaterUnit(V, x, y, w, h, k, t, lift, label) {
    const { ctx, D } = V, fs = V.L.fs;
    ctx.save();
    const sc = 1 + lift * 0.05;
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
    if (lift > 0.02) { ctx.shadowColor = 'rgba(20,40,80,' + (0.32 * lift).toFixed(3) + ')'; ctx.shadowBlur = 16 * lift; ctx.shadowOffsetX = 6 * lift; ctx.shadowOffsetY = 8 * lift; }
    ctx.fillStyle = vgrad(ctx, y, h, [[0, '#f4f6fa'], [0.5, '#d5dbe6'], [1, '#a7b1c3']]);
    D.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.shadowColor = 'transparent';
    const n = 4, gw = (w - 10) / n;
    for (let i = 0; i < n; i++) {
      const gx = x + 5 + i * gw + 2, hot = ramp([[0, '#b9c2d1'], [0.5, '#ff9a55'], [1, '#ff5a2a']], k);
      ctx.fillStyle = hot; D.roundRect(gx, y + 6, gw - 4, h - 12, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(gx + 2, y + 9, 2, h - 18);
    }
    if (k > 0.05) { ctx.globalAlpha = k * 0.8; D.glow(x + w, y + h / 2, h * 0.8, '#ff8a3d', 0.5); ctx.globalAlpha = 1; }
    ctx.restore();
    if (k > 0.2 && !REDUCE) {            // 아지랑이
      ctx.save(); ctx.strokeStyle = 'rgba(255,140,70,' + (0.4 * k).toFixed(3) + ')'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.6 + i / 3) % 1, bx = x + w * (0.25 + i * 0.25);
        ctx.beginPath();
        for (let q = 0; q <= 7; q++) { const yy = y - ph * 28 - q * 4, xx = bx + Math.sin(q * 0.9 + t * 4 + i) * 3; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawRoom(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, G = GEO.room(L), R = G.R, cs = G.cell, ac = RM.mode === 'ac';
    // 방 바깥 벽 · 바닥
    ctx.fillStyle = '#c4cddc'; D.roundRect(R.x - 14, R.y - 14, R.w + 28, R.h + 14 + 18, 16); ctx.fill();
    ctx.fillStyle = '#c99d6a'; D.roundRect(R.x - 14, R.y + R.h - 2, R.w + 28, 20, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(R.x - 8, R.y + R.h, R.w + 16, 2);
    // 방 안 공기: 온도장 색
    paintField(RMF, RM.F);
    ctx.save();
    D.roundRect(R.x, R.y, R.w, R.h, 6); ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(RMF.cv, 0, 0, RNX, RNY, R.x, R.y, R.w, R.h);
    // 창문 (오른쪽 벽)
    const wy0 = R.y + cs * 3, wh = cs * 13, wx = R.x + R.w - cs * 1.0;
    ctx.fillStyle = ac ? 'rgba(255,236,170,.7)' : 'rgba(190,225,255,.75)'; D.roundRect(wx, wy0, cs * 0.8, wh, 4); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; D.roundRect(wx, wy0, cs * 0.8, wh, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wx, wy0 + wh / 2); ctx.lineTo(wx + cs * 0.8, wy0 + wh / 2); ctx.stroke();
    // 책상과 학생 (아래쪽 공기에서 생활)
    const floor = R.y + R.h;
    [0.34, 0.6].forEach((f, i) => {
      const dx = R.x + R.w * f;
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(dx - 24, floor - 36, 48, 5); ctx.fillRect(dx - 20, floor - 31, 4, 31); ctx.fillRect(dx + 16, floor - 31, 4, 31);
      ctx.fillStyle = i ? '#ffb4a2' : '#a0c4ff'; D.roundRect(dx - 12, floor - 66, 24, 30, 9); ctx.fill();
      ctx.fillStyle = '#ffe0c8'; circle(ctx, dx, floor - 74, 10.5); ctx.fill();
      ctx.fillStyle = i ? '#5a3a2a' : '#3a2a22'; ctx.beginPath(); ctx.arc(dx, floor - 77, 10.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    });
    // 공기 알갱이 (온도에 따라 색이 변함)
    const toX = (gx) => R.x + (gx - 0.5) * cs, toY = (gy) => R.y + (gy - 0.5) * cs;
    if (RM.on || ac) drawStreams(V, RM.F, RM_SEEDS, toX, toY, t, { warm: ac ? 26 : 18, minSpeed: 1.2, alpha: 0.38, w: 2.2, steps: 44 });
    ctx.lineCap = 'round'; ctx.lineWidth = 2;
    for (const p of RM.parts) {
      const sp = Math.hypot(p.u || 0, p.v || 0);
      if (sp > 0.9) { ctx.strokeStyle = rgba(partColor(clamp((p.T - 4) * 1.6 + 8, 0, 100)), 0.4); ctx.beginPath(); ctx.moveTo(toX(p.x), toY(p.y)); ctx.lineTo(toX(p.x) - p.u * cs * 0.09, toY(p.y) - p.v * cs * 0.09); ctx.stroke(); }
    }
    const pr = 3.1 * Math.min(fs, 1.1);
    for (const p of RM.parts) ball(ctx, toX(p.x), toY(p.y), pr, partColor(clamp((p.T - 4) * 1.6 + 8, 0, 100)));
    // 공기 흐름 화살표
    const act = RM.on || ac;
    if (act) {
      for (let gj = 3; gj <= RNY - 1; gj += 4) for (let gi = 3; gi <= RNX - 1; gi += 5) {
        const u = RM.F.sample(RM.F.u, gi, gj), v = RM.F.sample(RM.F.v, gi, gj), sp = Math.hypot(u, v);
        if (sp < 1.4) continue;
        const Tl = RM.F.sample(RM.F.T, gi, gj), len = clamp(sp * 4.2, 12, 36), ux = u / sp, uy = v / sp, x = toX(gi), y = toY(gj);
        D.arrow(x - ux * len / 2, y - uy * len / 2, x + ux * len / 2, y + uy * len / 2, { color: Tl > (ac ? 26 : 19) ? '#d9381e' : '#1d4ed8', width: 4, head: 11, alpha: clamp((sp - 1.4) / 3, 0.2, 0.8) });
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#8fa0bb'; ctx.lineWidth = 3; D.roundRect(R.x, R.y, R.w, R.h, 6); ctx.stroke();
    ctx.font = font(22 * fs, 700); ctx.textAlign = 'center'; ctx.fillStyle = '#000';
    ctx.fillText(ac ? '☀️' : '❄️', wx + cs * 0.4 - cs * 1.6, wy0 + 24);
    ctx.textAlign = 'left';
    // 난방기 / 에어컨
    if (ac) {
      const ax = R.x + 11 * cs, aw = 8 * cs, ah = 2.3 * cs;
      D.shadow(() => { ctx.fillStyle = vgrad(ctx, R.y, ah, [[0, '#ffffff'], [1, '#d6deeb']]); D.roundRect(ax, R.y, aw, ah, 10); ctx.fill(); }, { blur: 10, y: 4 });
      ctx.strokeStyle = '#9fb0c9'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(ax + 14, R.y + ah * (0.36 + i * 0.14)); ctx.lineTo(ax + aw - 14, R.y + ah * (0.36 + i * 0.14)); ctx.stroke(); }
      ctx.fillStyle = '#3b82f6'; circle(ctx, ax + aw - 12, R.y + 10, 4); ctx.fill();
      D.label(ax + aw / 2, R.y + ah + 22, '❄️ 에어컨', { bg: '#1d4ed8', size: 14 * fs });
    } else if (on('room')) {
      const row = RM.drag ? RM.dragRow : RM.place.value, hy = R.y + (row - 1) * cs, hh = 4 * cs - 4, hw = Math.max(26, cs * 1.35);
      // 놓을 수 있는 자리(점선) — 끌 때는 가까운 자리를 강조
      Object.keys(ROWS).forEach((k) => {
        const yy = R.y + (ROWS[k] - 1) * cs, near = RM.drag && Math.abs(ROWS[k] - row) < 3.2;
        if (!RM.drag && RM.pos === k) return;
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = near ? '#14a058' : 'rgba(80,100,130,.45)'; ctx.lineWidth = near ? 3 : 2;
        D.roundRect(R.x + 2, yy, hw, hh, 8); ctx.stroke(); ctx.restore();
        if (near) D.ring(R.x + 2 + hw / 2, yy + hh / 2, hh * 0.45, t, { color: '#14a058' });
      });
      drawHeaterUnit(V, R.x + 2, hy, hw, hh, RM.heatK, t, RM.lift, '난방기');
      D.label(R.x + 2 + hw + 46, hy + hh / 2, '♨️ 난방기', { bg: RM.heatK > 0.5 ? '#c2410c' : '#475569', size: 14 * fs });
    }
    // 온도 표시 (위쪽/아래쪽 공기)
    const tagX = R.x + R.w - cs * 1.9;
    D.label(tagX, R.y + 0.14 * R.h, '⬆ 위쪽 ' + RM.upper.toFixed(1) + '°', { bg: 'rgba(60,70,90,.88)', size: 14 * fs, align: 'right' });
    D.label(tagX, R.y + 0.66 * R.h, '⬇ 아래쪽 ' + RM.lower.toFixed(1) + '°', { bg: 'rgba(60,70,90,.88)', size: 14 * fs, align: 'right' });
    // 시간–온도 그래프
    const hist = RM.hist.slice();
    if (act && hist.length && hist[hist.length - 1][0] < RM.t * ROOM_RATE - 0.1) hist.push([RM.t * ROOM_RATE, RM.upper, RM.lower]);
    const xmax = Math.max(20, Math.ceil((RM.t * ROOM_RATE + 3) / 10) * 10);
    const lo = ac ? 10 : 5, hi = ac ? 40 : 45;
    const gp = plot(V, G.g, {
      title: '📈 시간–온도 그래프', xmax, xstep: xmax > 40 ? 20 : 10, ymin: lo, ymax: hi, ystep: ac ? 10 : 20, xt: '시간 (분)', yt: '온도 (°C)', compact: L.key === 'wide',
      series: [{ pts: hist.map((h) => [h[0], h[1]]), color: '#e2463e', label: '위쪽 공기' }, { pts: hist.map((h) => [h[0], h[2]]), color: '#2f6fe4', label: '아래쪽 공기' }],
    });
    if (!hist.length || hist.length < 2) { ctx.fillStyle = '#8a95a6'; ctx.font = font(13 * fs, 700); ctx.textAlign = 'center'; ctx.fillText(ac ? '에어컨이 켜지면 기록이 시작돼요' : '난방기를 켜면 기록이 시작돼요', (gp.x0 + gp.x1) / 2, (gp.y0 + gp.y1) / 2 + 4); ctx.textAlign = 'left'; }
    if (G.note) {                                  // 휴대폰 화면: 남는 공간에 관찰 포인트
      const N = G.note;
      panel(V, N);
      ctx.fillStyle = '#2b3445'; ctx.font = font(14 * fs, 800); ctx.fillText('👀 이렇게 관찰해 보세요', N.x + 14, N.y + 26);
      const lines = ac
        ? [['⬇', '#1d4ed8', '차가운 공기(파랑)는 아래로 내려와요'], ['⬆', '#d9381e', '따뜻한 공기(빨강)는 위로 올라가요'], ['🔄', '#5d6879', '공기가 돌면서 방 전체가 시원해져요']]
        : [['⬆', '#d9381e', '데워진 공기(빨강)는 위로 올라가요'], ['⬇', '#1d4ed8', '식은 공기(파랑)는 아래로 내려와요'], ['🔄', '#5d6879', '공기가 돌면서 방 전체에 열이 전달돼요']];
      lines.forEach((l, i) => {
        const yy = N.y + 62 + i * 40;
        ctx.fillStyle = rgba(l[1], 0.12); D.roundRect(N.x + 12, yy - 18, N.w - 24, 34, 10); ctx.fill();
        ctx.font = font(18 * fs, 800); ctx.fillStyle = l[1]; ctx.fillText(l[0], N.x + 22, yy + 6);
        ctx.font = font(13.5 * fs, 700); ctx.fillStyle = '#2b3445'; ctx.fillText(l[2], N.x + 56, yy + 5);
      });
    }
  }

  /* =========================================================
     ③ 복사 장면: 난로 → 컵 (진공 상자 안), 은박지
     ========================================================= */
  function waveRay(ctx, x0, y0, x1, y1, t, o) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    if (len < 8) return;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux, wl = o.wl || 28, A = o.amp || 5, sp = o.speed || 110, head = o.head || 11;
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.strokeStyle = ctx.fillStyle = o.color; ctx.lineWidth = o.w || 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath();
    for (let s = 0; s <= len - head; s += 3) {
      const env = Math.min(1, s / 16) * Math.min(1, (len - head - s) / 10 + 0.25);
      const off = Math.sin(((s - (REDUCE ? 0 : t) * sp) / wl) * TAU) * A * env;
      const x = x0 + ux * s + nx * off, y = y0 + uy * s + ny * off;
      s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (!o.nohead) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * head - nx * 6.5, y1 - uy * head - ny * 6.5); ctx.lineTo(x1 - ux * head + nx * 6.5, y1 - uy * head + ny * 6.5); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  function drawCan(V, cx, cy, black, T, t) {
    const { ctx, D } = V, w = 92, h = 112, ry = 13;
    const heat = clamp((T - 22) / 50, 0, 1);
    if (heat > 0.02) D.glow(cx, cy, 96, thermColor(T), 0.55 * heat);
    groundShadow(ctx, cx, cy + h / 2 + 8, w * 0.62, 7, 0.22);
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    if (black) { g.addColorStop(0, '#4b5263'); g.addColorStop(0.3, '#2a2f3b'); g.addColorStop(0.7, '#12151c'); g.addColorStop(1, '#080a0e'); }
    else { g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#eef2f8'); g.addColorStop(1, '#b3bfd1'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, cy - h / 2); ctx.lineTo(cx - w / 2, cy + h / 2); ctx.ellipse(cx, cy + h / 2, w / 2, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + w / 2, cy - h / 2); ctx.closePath(); ctx.fill();
    // 뚜껑 타원
    ctx.fillStyle = black ? '#3d4454' : '#ffffff'; ellipse(ctx, cx, cy - h / 2, w / 2, ry); ctx.fill();
    ctx.strokeStyle = black ? '#6a7388' : '#c2cce0'; ctx.lineWidth = 2; ellipse(ctx, cx, cy - h / 2, w / 2, ry); ctx.stroke();
    ctx.fillStyle = black ? '#0d0f14' : '#d5dce8'; ellipse(ctx, cx, cy - h / 2, w / 2 - 9, ry - 4); ctx.fill();
    // 광택
    ctx.fillStyle = black ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.9)';
    D.roundRect(cx - w / 2 + 9, cy - h / 2 + 10, 7, h - 20, 4); ctx.fill();
    // 뜨거워지면 김
    if (T > 55 && !REDUCE) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.45 + i / 3) % 1; ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * Math.sin(ph * Math.PI) * clamp((T - 55) / 25, 0, 1)).toFixed(3) + ')';
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const yy = cy - h / 2 - 8 - ph * 30 - k * 3.5, xx = cx - 16 + i * 16 + Math.sin(k * 0.9 + t * 2 + i) * 4; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawFoilSheet(V, pose, t, lift, G) {
    const { ctx, D } = V;
    const Hf = G.foilY1 - G.foilY0, s = clamp(pose.s, 0, 1.15);
    const w = lerp(56, 15, Math.min(1, s)), h = lerp(30, Hf, Math.min(1, s));
    ctx.save();
    ctx.translate(pose.x, pose.y);
    const sc = 1 + lift * 0.04; ctx.scale(sc, sc);
    if (lift > 0.02 || s > 0.05) { ctx.shadowColor = 'rgba(10,20,40,' + (0.28 + 0.2 * lift).toFixed(3) + ')'; ctx.shadowBlur = 10 + lift * 12; ctx.shadowOffsetX = 4 + lift * 5; ctx.shadowOffsetY = 4 + lift * 6; }
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, '#cdd6e4'); g.addColorStop(0.3, '#ffffff'); g.addColorStop(0.55, '#b4bfd0'); g.addColorStop(0.8, '#f6f9fd'); g.addColorStop(1, '#9fabc0');
    ctx.fillStyle = g; D.roundRect(-w / 2, -h / 2, w, h, Math.min(5, w / 2)); ctx.fill();
    ctx.shadowColor = 'transparent';
    // 구김 + 반짝이는 빛 줄기
    ctx.save(); D.roundRect(-w / 2, -h / 2, w, h, Math.min(5, w / 2)); ctx.clip();
    ctx.strokeStyle = 'rgba(120,135,160,.35)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < Math.max(4, h / 30); i++) { const yy = -h / 2 + (i + 0.5) * (h / Math.max(4, h / 30)); ctx.beginPath(); ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy + (i % 2 ? 6 : -6)); ctx.stroke(); }
    const sh = ((t * 0.5) % 1) * (h + 60) - 30 - h / 2;
    const sg = ctx.createLinearGradient(0, sh - 18, 0, sh + 18); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(-w / 2, sh - 18, w, 36);
    ctx.restore();
    ctx.restore();
  }
  function drawRad(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, G = GEO.rad(L), CH = G.ch, tall = L.key === 'tall';
    const k = RD.vacK;
    // 진공 상자(유리) — 공기를 빼면 어둡고 우주 같아짐
    const bgG = ctx.createLinearGradient(0, CH.y, 0, CH.y + CH.h);
    bgG.addColorStop(0, SciSim.color.mix('#fffdf6', '#222a4c', k)); bgG.addColorStop(1, SciSim.color.mix('#eaf1fa', '#10152f', k));
    ctx.fillStyle = bgG; D.roundRect(CH.x, CH.y, CH.w, CH.h, 36); ctx.fill();
    if (k > 0.02) {
      ctx.save(); D.roundRect(CH.x, CH.y, CH.w, CH.h, 36); ctx.clip();
      for (let i = 0; i < 34; i++) { const sx = CH.x + ((i * 97.3) % CH.w), sy = CH.y + ((i * 53.7) % CH.h); ctx.fillStyle = 'rgba(255,255,255,' + (k * (0.25 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.5 + i)))).toFixed(3) + ')'; circle(ctx, sx, sy, 0.8 + (i % 3) * 0.4); ctx.fill(); }
      ctx.restore();
    }
    // 책상 면
    ctx.fillStyle = SciSim.color.mix('#d3dbe7', '#394264', k); ctx.fillRect(CH.x + 20, CH.y + CH.h - 22, CH.w - 40, 10);
    // 공기 알갱이
    const zx0 = G.sx + 22, zx1 = G.cans[0].x - 80, zy0 = CH.y + 36, zy1 = CH.y + CH.h - 40;
    const aAlpha = 1 - k;
    if (aAlpha > 0.02) {
      ctx.fillStyle = 'rgba(120,140,170,' + (0.55 * aAlpha).toFixed(3) + ')';
      for (const p of RD.air) { circle(ctx, zx0 + p.x * (zx1 - zx0), zy0 + p.y * (zy1 - zy0), p.r); ctx.fill(); }
      D.label((zx0 + zx1) / 2, CH.y + 20, '공기 알갱이', { bg: 'rgba(100,116,139,' + (0.85 * aAlpha).toFixed(3) + ')', size: 13 * fs });
    }
    // 난로
    const S0 = G.stove, scy = S0.y + S0.h / 2, sk = RD.stoveK;
    groundShadow(ctx, S0.x + S0.w / 2, S0.y + S0.h + 10, S0.w * 0.7, 8, 0.3);
    D.shadow(() => { ctx.fillStyle = vgrad(ctx, S0.y, S0.h, [[0, '#6b7488'], [0.5, '#434b5e'], [1, '#2c3242']]); D.roundRect(S0.x, S0.y, S0.w, S0.h, 14); ctx.fill(); }, { blur: 12, y: 4 });
    const gr = { x: S0.x + S0.w - 34, y: S0.y + 20, w: 24, h: S0.h - 40 };
    const gcol = ramp([[0, '#3a3f4d'], [0.35, '#9a3a22'], [0.7, '#ff7a2f'], [1, '#ffd27a']], sk);
    ctx.fillStyle = gcol; D.roundRect(gr.x, gr.y, gr.w, gr.h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(20,24,34,.55)'; ctx.lineWidth = 2;
    for (let yy = gr.y + 12; yy < gr.y + gr.h - 6; yy += 14) { ctx.beginPath(); ctx.moveTo(gr.x, yy); ctx.lineTo(gr.x + gr.w, yy); ctx.stroke(); }
    if (sk > 0.04) { ctx.save(); ctx.globalAlpha *= sk; D.glow(S0.x + S0.w, scy, 170, '#ff9a3d', 0.55); ctx.restore(); }
    D.label(S0.x + S0.w / 2, S0.y - 18, sk > 0.5 ? '🔥 난로(켜짐)' : '난로', { bg: sk > 0.5 ? '#c2410c' : '#475569', size: 14 * fs });
    // 컵 두 개 (검은색 / 흰색)
    const cb = G.cans[0], cw = G.cans[1];
    drawCan(V, cb.x, cb.y, true, RD.Tb, t); drawCan(V, cw.x, cw.y, false, RD.Tw, t);
    // 복사선 (파동 화살표)
    const blocked = foilBlock() > 0.5, fxp = G.foilX;
    if (sk > 0.03) {
      const reflect = [0.1, 0.6];            // 컵 표면의 반사 비율(검정, 흰색)
      [cb, cw].forEach((can, ci) => {
        for (let j = 0; j < 3; j++) {
          const x0 = G.sx + 2, y0 = scy + (ci ? 1 : -1) * (tall ? 30 : 38) + (j - 1) * 13;
          const x1 = can.x - 46 - 6, y1 = can.y + (j - 1) * 26;
          const col = rgba('#ff7a2f', 0.9 * sk);
          const hitFoil = blocked && fxp > x0 && fxp < x1;
          if (hitFoil) {
            const f = (fxp - x0) / (x1 - x0), hx = fxp - 8, hy = y0 + (y1 - y0) * f;
            waveRay(ctx, x0, y0, hx, hy, t, { color: col, w: 3, amp: 4.5, alpha: 1, nohead: true });
            // 은박지에서 튕겨 나오는 반사선
            const rx = x0 + (hx - x0) * 0.3, ry = hy + (y1 - y0) * 0.2 + (ci ? 26 : -26);
            waveRay(ctx, hx, hy, rx, ry, t, { color: rgba('#ffd9a0', 0.95 * sk), w: 2.6, amp: 3.5, speed: -110, dash: [7, 5] });
            D.spark(hx, hy, 8 + 3 * Math.sin(t * 9 + j), t, '#fff7d6');
          } else {
            waveRay(ctx, x0, y0, x1, y1, t, { color: col, w: 3, amp: 4.5 });
            const absorb = ci ? 0.3 : 1;
            if (absorb > 0.2 || j === 1) {
              ctx.save(); ctx.globalAlpha *= sk * (ci ? 0.35 : 0.7); D.glow(x1 + 4, y1, ci ? 18 : 26, '#ffb35a', 0.8); ctx.restore();
            }
            if (ci) waveRay(ctx, x1 + 2, y1, x1 - 56, y1 + (j - 1) * 6 + 16, t, { color: rgba('#ffd9a0', 0.8 * sk * reflect[1]), w: 2.2, amp: 2.8, speed: -110, dash: [6, 5], head: 8 });
          }
        }
      });
    }
    // 은박지 (끌어서 놓음)
    if ((on('foil') && (S.revealFoil || (game && game.free))) || RD.foil || RD.drag) {
      const pose = RD.pose;
      if (!RD.foil) {
        ctx.save(); ctx.setLineDash([7, 6]); ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(255,255,255,.55)';
        D.roundRect(G.tray.x, G.tray.y, G.tray.w, G.tray.h, 12); ctx.fill(); ctx.stroke(); ctx.restore();
        D.label(G.tray.x + 10, G.tray.y + 15, '🪞 은박지 (끌어서 놓기)', { bg: '#64748b', size: 13 * fs, align: 'left' });
      }
      drawFoilSheet(V, pose, t, RD.lift, G);
      // 놓을 자리 안내: 난로를 켰는데 은박지를 아직 안 놓았으면 점선 자리가 살짝 깜빡임
      if (!RD.foil && !RD.drag && RD.stove) {
        const ha = REDUCE ? 0.6 : 0.28 + 0.42 * (0.5 + 0.5 * Math.sin(t * 4));
        ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = rgba('#14a058', ha); ctx.lineWidth = 3;
        D.roundRect(fxp - 14, G.foilY0 - 6, 28, G.foilY1 - G.foilY0 + 12, 10); ctx.stroke(); ctx.restore();
      }
      // 놓을 자리 표시
      if (RD.drag && Math.abs(RD.pose.x - fxp) < 90) {
        ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#14a058'; ctx.lineWidth = 3; D.roundRect(fxp - 14, G.foilY0 - 6, 28, G.foilY1 - G.foilY0 + 12, 10); ctx.stroke(); ctx.restore();
      }
    }
    // 이름표 + 컵 온도
    D.label(cb.x, cb.y - 98, '검은 컵 ' + RD.Tb.toFixed(1) + '°', { bg: '#1f2430', size: 14 * fs });
    D.label(cw.x, cw.y - 98, '흰 컵 ' + RD.Tw.toFixed(1) + '°', { bg: '#64748b', size: 14 * fs });
    // 진공 펌프
    const P = G.pump;
    ctx.fillStyle = '#6b7588'; ctx.fillRect(P.x - 6, CH.y + CH.h - 2, 12, 12);
    D.shadow(() => { ctx.fillStyle = vgrad(ctx, P.y, 56, [[0, '#8793a8'], [1, '#556075']]); D.roundRect(P.x - 56, P.y + 8, 112, 52, 12); ctx.fill(); }, { blur: 8, y: 3 });
    ctx.save(); ctx.translate(P.x - 24, P.y + 34); ctx.rotate(RD.pumpSpin);
    ctx.fillStyle = '#d6dde8'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); D.roundRect(-3, 0, 6, 15, 3); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = k > 0.97 ? '#34d27a' : '#ffb400'; circle(ctx, P.x + 30, P.y + 34, 6); ctx.fill();
    D.label(P.x + 4, P.y + 76, '진공 펌프', { bg: '#475569', size: 13 * fs });
    if (k > 0.9) D.label(CH.x + CH.w / 2, CH.y + 20, '🌌 진공: 열을 전달할 물질이 없어요', { bg: 'rgba(30,41,90,.92)', size: 14 * fs });
    // 유리 테두리와 반사
    ctx.strokeStyle = 'rgba(120,145,185,.85)'; ctx.lineWidth = 4; D.roundRect(CH.x, CH.y, CH.w, CH.h, 36); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CH.x + 26, CH.y + CH.h * 0.55); ctx.lineTo(CH.x + 26, CH.y + 70); ctx.stroke();
    if (isNew('vac')) newRing(V, { x: P.x - 60, y: P.y + 4, w: 120, h: 62 }, t);
    if (isNew('foil') && !RD.foil) newRing(V, G.tray, t);
  }

  /* =========================================================
     ④ 단열 장면: 보온병 단면 + 시간–온도 그래프
     ========================================================= */
  const PATH_COL = { cond: '#dc2626', conv: '#d97706', rad: '#7c3aed' };
  function zigzag(ctx, x0, y0, x1, y1, amp, n) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    for (let i = 1; i < n; i++) { const f = i / n, o = (i % 2 ? 1 : -1) * amp; ctx.lineTo(x0 + dx * f + nx * o, y0 + dy * f + ny * o); }
    ctx.lineTo(x1, y1); ctx.stroke();
  }
  function arrowHead(ctx, x, y, ux, uy, s, col) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + ux * s * 0.6, y + uy * s * 0.6); ctx.lineTo(x - ux * s * 0.7 - uy * s * 0.6, y - uy * s * 0.7 + ux * s * 0.6); ctx.lineTo(x - ux * s * 0.7 + uy * s * 0.6, y - uy * s * 0.7 - ux * s * 0.6); ctx.closePath(); ctx.fill();
  }
  function drawThermos(V, t) {
    const { ctx, D } = V, L = V.L, fs = L.fs, G = GEO.thermos(L), FL = G.fl, tall = L.key === 'tall';
    const x0 = FL.cx - FL.w / 2, y0 = FL.top, w = FL.w, h = FL.h;
    const sh = 7, gap = tall ? 26 : 32, iw = 5;
    const lo = thLoss(TH.vac, TH.silver, TH.lid);
    const sC = lo.cond / THK.cond, sV = (lo.convGap + lo.convTop) / (THK.convGap + THK.convTop), sR = lo.rad / THK.rad;
    const sTop = lo.convTop / THK.convTop, sGap = lo.convGap / THK.convGap;
    const lidK = TH.lidK;
    groundShadow(ctx, FL.cx, y0 + h + 14, w * 0.62, 9, 0.28);
    // 바깥 몸통 (스테인리스)
    D.shadow(() => {
      const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
      g.addColorStop(0, '#9aa6b8'); g.addColorStop(0.2, '#eef2f8'); g.addColorStop(0.55, '#c5cedb'); g.addColorStop(1, '#8794aa');
      ctx.fillStyle = g; D.roundRect(x0, y0 + 36, w, h - 36, 34); ctx.fill();
    }, { blur: 14, y: 6 });
    // 틈(이중벽 사이): 공기가 있으면 연한 하늘색, 진공이면 비어 있음
    const gx0 = x0 + sh, gw = w - sh * 2, gy0 = y0 + 40, gh = h - 36 - sh - 8;
    ctx.save(); D.roundRect(gx0, gy0, gw, gh, 28); ctx.clip();
    ctx.fillStyle = TH.vac ? '#dfe5ee' : '#e3f0fb'; ctx.fillRect(gx0, gy0, gw, gh);
    if (TH.vac) {
      ctx.strokeStyle = 'rgba(120,135,165,.35)'; ctx.lineWidth = 1.2;
      for (let i = -gh; i < gw + gh; i += 14) { ctx.beginPath(); ctx.moveTo(gx0 + i, gy0 + gh); ctx.lineTo(gx0 + i + gh, gy0); ctx.stroke(); }
    } else {
      ctx.fillStyle = 'rgba(100,130,170,.55)';
      for (let i = 0; i < 22; i++) {
        const ph = i * 1.93, lap = i % 2, lw = gap * 0.8;
        const left = lap ? gx0 + 4 : gx0 + gw - 4 - lw, side = lap ? 1 : -1;
        const px = left + lw * (0.5 + 0.5 * Math.sin(t * 1.3 + ph)), py = gy0 + ((i * 41.7 + t * 14 * side * (sGap > 0.5 ? 1 : 0.3)) % gh + gh) % gh;
        circle(ctx, px, py, 2.2); ctx.fill();
        // 반대편 틈
        circle(ctx, gx0 + gw - (px - gx0), py, 2.2); ctx.fill();
      }
    }
    ctx.restore();
    // 안쪽 병 (유리) + 물
    const ix0 = x0 + sh + gap, iw2 = w - 2 * (sh + gap), iy0 = y0 + 40 + 2, ih = gh - gap - 2;
    const wTop = iy0 + 44 + (REDUCE ? 0 : Math.sin(t * 2.4) * 1);
    ctx.save(); D.roundRect(ix0, iy0, iw2, ih, 22); ctx.clip();
    ctx.fillStyle = 'rgba(245,250,255,.9)'; ctx.fillRect(ix0, iy0, iw2, ih);
    const wc = ramp(WATMAP, TH.T * 0.8);
    const wg = ctx.createLinearGradient(0, wTop, 0, iy0 + ih);
    wg.addColorStop(0, rgba(wc, 0.85)); wg.addColorStop(1, shade(wc, -0.12));
    ctx.fillStyle = wg;
    ctx.beginPath(); ctx.moveTo(ix0, iy0 + ih);
    for (let i = 0; i <= 16; i++) ctx.lineTo(ix0 + (iw2 * i) / 16, wTop + (REDUCE ? 0 : Math.sin(t * 2.6 + i * 0.8) * 1.4));
    ctx.lineTo(ix0 + iw2, iy0 + ih); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(ix0 + 8, wTop - 1, iw2 - 16, 3);
    // 물속 작은 입자(온도가 높을수록 활발)
    const heat = clamp((TH.T - 20) / 70, 0, 1);
    for (let i = 0; i < 20; i++) {
      const sx = ix0 + 14 + ((i * 53.1) % (iw2 - 28)), sy = wTop + 18 + ((i * 37.7) % (iy0 + ih - wTop - 36));
      const a = 3 + 7 * heat;
      ball(ctx, sx + a * Math.cos(t * (3 + heat * 5) + i * 1.7), sy + a * Math.sin(t * (3.4 + heat * 5) + i * 2.3), 4, partColor(clamp(TH.T, 0, 100)));
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,140,170,.9)'; ctx.lineWidth = iw; D.roundRect(ix0, iy0, iw2, ih, 22); ctx.stroke();
    if (TH.silver) {                                   // 은도금: 안쪽 병 바깥면이 거울처럼 번쩍임
      ctx.strokeStyle = '#f4f7fb'; ctx.lineWidth = 3; D.roundRect(ix0 - 3, iy0 - 3, iw2 + 6, ih + 6, 25); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2;
      const sp = ((t * 0.35) % 1) * (ih + 40);
      ctx.save(); D.roundRect(ix0 - 5, iy0 - 5, iw2 + 10, ih + 10, 26); ctx.clip();
      const sg = ctx.createLinearGradient(0, iy0 + sp - 30, 0, iy0 + sp); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,.9)');
      ctx.fillStyle = sg; ctx.fillRect(ix0 - 5, iy0 + sp - 30, 7, 30); ctx.fillRect(ix0 + iw2 - 2, iy0 + sp - 30, 7, 30);
      ctx.restore();
    }
    // 바깥 몸통 테두리와 윗부분(목)
    ctx.strokeStyle = 'rgba(90,105,130,.55)'; ctx.lineWidth = 2; D.roundRect(x0, y0 + 36, w, h - 36, 34); ctx.stroke();
    ctx.fillStyle = vgrad(ctx, y0 + 12, 32, [[0, '#d9e0ea'], [1, '#97a4b8']]); D.roundRect(x0 + 6, y0 + 14, w - 12, 30, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(90,105,130,.55)'; ctx.lineWidth = 1.5; D.roundRect(x0 + 6, y0 + 14, w - 12, 30, 10); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x0 + 18, y0 + 18, w - 36, 3);
    // 뚜껑(코르크 마개): 옆에 떠 있다가 내려와 입구를 막음
    {
      const k = outBackK(lidK), mw = Math.min(iw2 - 6, 116);
      const lx = lerp(FL.cx + 94, FL.cx, k), ly = lerp(y0 - 66, y0 + 18, k), rot = (1 - lidK) * 0.5;
      if (lidK < 0.98) { ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(100,116,139,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(FL.cx + 94, y0 - 50); ctx.lineTo(FL.cx, y0 + 6); ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(rot);
      D.shadow(() => {
        ctx.fillStyle = vgrad(ctx, -4, 34, [[0, '#f0bd78'], [0.6, '#d99a52'], [1, '#b87433']]);
        ctx.beginPath(); ctx.moveTo(-mw / 2, 0); ctx.lineTo(mw / 2, 0); ctx.lineTo(mw / 2 - 8, 30); ctx.lineTo(-mw / 2 + 8, 30); ctx.closePath(); ctx.fill();
      }, { blur: 8, y: 3 });
      ctx.fillStyle = vgrad(ctx, -16, 18, [[0, '#e9b36a'], [1, '#c98a45']]); D.roundRect(-20, -15, 40, 20, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(120,70,20,.35)'; ctx.lineWidth = 1.4;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * mw / 6, 4); ctx.lineTo(i * mw / 6 * 0.9, 27); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-mw / 2 + 8, 3, mw - 16, 3);
      ctx.restore();
      if (lidK < 0.5) D.label(FL.cx + 94, y0 - 100 + (tall ? 8 : 0), '🧢 뚜껑', { bg: '#a8672a', size: 13 * fs });
    }
    // 김 (뚜껑이 없으면 위로 빠져나감)
    if (lidK < 0.5 && TH.T > 35) {
      const a = clamp((TH.T - 35) / 50, 0, 1) * (1 - lidK * 2);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 3.2;
      for (let i = 0; i < 4; i++) {
        const ph = REDUCE ? 0.4 : ((t * 0.4 + i / 4) % 1), bx = FL.cx + (i - 1.5) * 24;
        ctx.strokeStyle = 'rgba(150,166,190,' + (a * 0.6 * Math.sin(ph * Math.PI)).toFixed(3) + ')';
        ctx.beginPath();
        for (let k = 0; k <= 9; k++) { const yy = y0 + 4 - ph * 34 - k * 4, xx = bx + Math.sin(k * 0.8 + t * 2 + i) * 5; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
      }
      ctx.restore();
    }
    // ── 열이 새어 나가는 길 (전도·대류·복사)
    const wob = REDUCE ? 0 : t;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 전도: 바닥을 통해 아래로 (빨강, 지그재그)
    {
      const by = iy0 + ih, ey = y0 + h + 34;
      [0.28, 0.5, 0.72].forEach((f, i) => {
        const x = x0 + w * f, a = clamp(sC * 1.0, 0, 1);
        const ph = (wob * 0.7 + i * 0.3) % 1;
        if (sC > 0.2) {
          ctx.save(); ctx.globalAlpha = clamp(a, 0.35, 1);
          ctx.strokeStyle = PATH_COL.cond; ctx.lineWidth = 3.6;
          zigzag(ctx, x, by - 8, x, ey - 10, 5, 8);
          arrowHead(ctx, x, ey - 4, 0, 1, 13, PATH_COL.cond);
          ctx.fillStyle = '#ffd1d1'; circle(ctx, x, by - 8 + (ey - by) * ph, 3.4); ctx.fill();
          ctx.restore();
        } else {
          ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = PATH_COL.cond; ctx.lineWidth = 2.4; zigzag(ctx, x, by - 8, x, by + 12, 3, 3); ctx.restore();
        }
      });
      if (sC <= 0.2) D.label(FL.cx, y0 + h + 28, '막힘 (진공)', { bg: '#14a058', size: 13 * fs });
      else D.label(FL.cx, y0 + h + 52 * (tall ? 0.8 : 1), '전도', { bg: PATH_COL.cond, size: 13.5 * fs });
    }
    // 대류(위): 뚜껑이 없으면 데워진 공기가 위로 (주황, 곡선)
    {
      const x = FL.cx;
      if (sTop > 0.2) {
        [-1, 0, 1].forEach((d, i) => {
          const ph = (wob * 0.7 + i * 0.33) % 1;
          ctx.save(); ctx.globalAlpha = clamp(sTop, 0.4, 1) * 0.95; ctx.strokeStyle = PATH_COL.conv; ctx.lineWidth = 4;
          const bx = x - 40 + d * 34, by = y0 - 18, ex = x - 52 + d * 46, ey = y0 - (tall ? 70 : 86);
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.bezierCurveTo(bx, by - 26, ex, ey + 22, ex, ey); ctx.stroke();
          arrowHead(ctx, ex, ey, 0, -1, 13, PATH_COL.conv);
          ctx.fillStyle = '#ffe3b0'; circle(ctx, bx + (ex - bx) * ph, by + (ey - by) * ph, 3.4); ctx.fill();
          ctx.restore();
        });
        D.label(x - 52, y0 - (tall ? 90 : 98), '대류', { bg: PATH_COL.conv, size: 13.5 * fs });
      } else D.label(x, y0 - 22, '막힘 (뚜껑)', { bg: '#14a058', size: 13 * fs });
    }
    // 대류(틈): 틈의 공기가 빙글빙글 (진공이면 없음)
    if (sGap > 0.2) {
      [[x0 + sh + gap * 0.5, -1], [x0 + w - sh - gap * 0.5, 1]].forEach(([gxm, sd], i) => {
        const my = y0 + h * 0.58;
        ctx.save(); ctx.strokeStyle = PATH_COL.conv; ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(gxm - 5, my + 40); ctx.lineTo(gxm - 5, my - 40); ctx.stroke(); arrowHead(ctx, gxm - 5, my - 42, 0, -1, 11, PATH_COL.conv);
        ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(gxm + 6, my - 40); ctx.lineTo(gxm + 6, my + 40); ctx.stroke(); arrowHead(ctx, gxm + 6, my + 42, 0, 1, 11, '#5b8def');
        ctx.restore();
      });
    }
    // 복사: 옆으로 (보라, 물결) — 은도금이면 안쪽 면에서 반사
    {
      const ys = [0.42, 0.56, 0.7].map((f) => y0 + h * f);
      ys.forEach((yy, i) => {
        const xi = x0 + w - sh - gap, xo = x0 + w, xe = xo + (tall ? 34 : 44);
        waveRay(ctx, FL.cx + 20, yy, xi, yy, t + i * 0.2, { color: PATH_COL.rad, w: 3, amp: 4, alpha: 0.9, nohead: true, wl: 22 });
        if (TH.silver) {
          waveRay(ctx, xi, yy, FL.cx + 24, yy + 8 + i * 4, t + i * 0.2, { color: '#b79bff', w: 2.4, amp: 3, alpha: 0.9, speed: 110, dash: [6, 5], head: 9 });
          D.spark(xi + 4, yy, 5 + 2 * Math.sin(t * 8 + i), t, '#ffffff');
          waveRay(ctx, xi + 2, yy, xe - 10, yy, t, { color: PATH_COL.rad, w: 2, amp: 2, alpha: 0.18, wl: 22, head: 7 });
        } else waveRay(ctx, xi, yy, xe, yy, t + i * 0.2, { color: PATH_COL.rad, w: 3, amp: 4.5, alpha: 0.95, wl: 22 });
      });
      D.label(x0 + w + 8, y0 + h * 0.33, TH.silver ? '막힘' : '복사', { bg: TH.silver ? '#14a058' : PATH_COL.rad, size: 13.5 * fs, align: 'left' });
    }
    // 진공 표시
    if (TH.vac) D.label(x0 + 8 + gap / 2 + (tall ? 4 : 2), y0 + h * 0.26, '진공', { bg: '#475569', size: 13 * fs, align: 'left' });
    if (isNew('thermos')) newRing(V, { x: FL.cx - w / 2 - 8, y: y0 - 70, w: w + 16, h: h + 100 }, t);
    // 그래프
    const gP = G.graph;
    const base = []; for (let tt = 0; tt <= TH.t + 1e-6; tt += 0.5) base.push([tt, thTemp(THBASE, tt)]);
    const mine = TH.rec.slice();
    if (!TH.done && mine.length && mine[mine.length - 1][0] < TH.t - 0.01) mine.push([TH.t, TH.T]);
    const gr = plot(V, gP, {
      title: '📈 물의 온도 변화 (30분)', xmax: TH_END, xstep: 5, ymin: 20, ymax: 100, ystep: 20, xt: '시간 (분)', yt: '온도 (°C)',
      band: { lo: 80, hi: 100, color: 'rgba(20,160,88,.10)' },
      series: [{ pts: base, color: '#8a95a6', label: '보통 컵', w: 3, nodot: false }, { pts: mine, color: '#e2463e', label: '내 보온병', w: 4 }],
    });
    ctx.fillStyle = '#0b7a41'; ctx.font = font(13 * fs, 800); ctx.textAlign = 'right'; ctx.fillText('80 °C 이상', gr.x1 - 6, gr.py(80) + 16 * fs);
    if (TH.done && TH.T >= 80 && TH.pop.s > 0.05) {
      const s = clamp(TH.pop.s, 0, 1.2);
      D.check(gr.px(TH_END) - 18, gr.py(TH.T) - 22, 13 * s, clamp(s, 0, 1));
    }
    ctx.textAlign = 'left';
    // 범례(열이 새는 길)
    const Lg = G.legend;
    panel(V, Lg);
    ctx.fillStyle = '#2b3445'; ctx.font = font(14 * fs, 800); ctx.fillText('열이 새어 나가는 길', Lg.x + 14, Lg.y + 24 * fs);
    const rows = [
      { c: PATH_COL.cond, n: '전도', d: '벽과 바닥을 따라', st: sC <= 0.2 ? 2 : 0, how: '진공층으로 막아요' },
      { c: PATH_COL.conv, n: '대류', d: '데워진 공기가 움직여', st: (sTop <= 0.2 && sGap <= 0.2) ? 2 : (sTop <= 0.2 || sGap <= 0.2) ? 1 : 0, how: '진공층 + 뚜껑으로 막아요' },
      { c: PATH_COL.rad, n: '복사', d: '빛처럼 퍼져 나가', st: sR <= 0.2 ? 2 : 0, how: '은도금으로 막아요' },
    ];
    const rh = (Lg.h - 40 * fs) / 3;
    rows.forEach((r, i) => {
      const yy = Lg.y + 36 * fs + i * rh + rh / 2;
      ctx.fillStyle = rgba(r.c, 0.12); D.roundRect(Lg.x + 10, yy - rh / 2 + 3, Lg.w - 20, rh - 6, 10); ctx.fill();
      D.label(Lg.x + 18, yy, r.n, { bg: r.c, size: 14 * fs, align: 'left' });
      ctx.fillStyle = '#3a4456'; ctx.font = font(13 * fs, 700); ctx.textAlign = 'left';
      if (tall) { ctx.fillText(r.d + ' 열이 새요', Lg.x + 76, yy + 5); }
      else { ctx.fillText(r.d + ' 열이 새요', Lg.x + 86, yy - 3); ctx.fillStyle = '#6b7588'; ctx.fillText(r.how, Lg.x + 86, yy + 15); }
      const stTxt = r.st === 2 ? '막힘' : r.st === 1 ? '일부 막힘' : '열려 있음', stCol = r.st === 2 ? '#14a058' : r.st === 1 ? '#f59e0b' : '#e2463e';
      D.label(Lg.x + Lg.w - 16, yy, stTxt, { bg: stCol, size: 13 * fs, align: 'right' });
    });
    ctx.textAlign = 'left';
  }
  const outBackK = (k) => SciSim.ease.outBack(clamp(k, 0, 1));

  /* =========================================================
     입력 (누르기·끌기)
     ========================================================= */
  function hitRod(V, p) {
    if (S.scene !== 'cond') return -1;
    const G = GEO.cond(V.L, C.modelK);
    for (let i = 0; i < 3; i++) if (p.x > G.x0 - 12 && p.x < G.x1 + 12 && Math.abs(p.y - G.yc[i]) <= G.rodH / 2 + 14) return i;
    return -1;
  }
  function heaterRect(V) {
    const G = GEO.room(V.L), cs = G.cell, row = RM.drag ? RM.dragRow : RM.place.value;
    return { x: G.R.x - 6, y: G.R.y + (row - 1) * cs - 6, w: Math.max(26, cs * 1.35) + 18, h: 4 * cs - 4 + 12 };
  }
  function hitHeater(V, p) {
    if (S.scene !== 'room' || RM.mode !== 'heat' || !on('room')) return false;
    const r = heaterRect(V);
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }
  function hitFoil(V, p) {
    if (S.scene !== 'rad' || !on('foil') || !S.revealFoil && !(game && game.free)) return false;
    const G = GEO.rad(V.L);
    if (RD.foil) return Math.abs(p.x - G.foilX) <= 26 && p.y >= G.foilY0 - 10 && p.y <= G.foilY1 + 10;
    return p.x >= G.tray.x - 24 && p.x <= G.tray.x + G.tray.w + 24 && p.y >= G.tray.y - 24 && p.y <= G.tray.y + G.tray.h + 30;
  }
  VIEWS.forEach((V) => {
    const hits = (p) => hitRod(V, p) >= 0 || hitHeater(V, p) || hitFoil(V, p);
    SciSim.pointer(V.v, {
      hover: (p) => (hitHeater(V, p) || hitFoil(V, p) ? 'grab' : hitRod(V, p) >= 0 ? 'pointer' : null),
      down(p) {
        const ri = hitRod(V, p);
        if (ri >= 0) { C.sel = ri; Sound.click(); hideHint(); return false; }
        if (hitHeater(V, p)) {
          const G = GEO.room(V.L);
          RM.drag = true; RM.dragRow = RM.place.value; V.v.canvas.style.cursor = 'grabbing'; hideHint(); Sound.click();
          RM.dragRow = clamp((p.y - G.R.y) / G.cell + 1 - 2, 1, 17);
          return true;
        }
        if (hitFoil(V, p)) {
          if (RD.tw) { RD.tw.cancel(); RD.tw = null; }
          RD.drag = true; RD.foil = false; hideHint(); Sound.click(); V.v.canvas.style.cursor = 'grabbing';
          RD.pose.x = p.x; RD.pose.y = p.y;
          RD.tw = SciSim.tween(RD.pose, { s: 1 }, { duration: 0.25, ease: 'outBack' });
          syncUI();
          return true;
        }
        return false;
      },
      move(p) {
        if (RM.drag) { const G = GEO.room(V.L); RM.dragRow = clamp((p.y - G.R.y) / G.cell + 1 - 2, 1, 17); }
        else if (RD.drag) { RD.pose.x = p.x; RD.pose.y = p.y; }
      },
      up(p) {
        V.v.canvas.style.cursor = '';
        if (RM.drag) {
          RM.drag = false;
          let best = 'bottom', bd = 1e9;
          Object.keys(ROWS).forEach((k) => { const d = Math.abs(ROWS[k] - RM.dragRow); if (d < bd) { bd = d; best = k; } });
          RM.place.value = RM.dragRow; RM.place.velocity = 0;
          const changed = best !== RM.pos;
          if (changed) setHeaterPos(best); else RM.place.target = ROWS[best];
          if (changed) Sound.tick();
        } else if (RD.drag) {
          RD.drag = false;
          const G = GEO.rad(V.L);
          if (RD.tw) { RD.tw.cancel(); RD.tw = null; }
          if (Math.abs(p.x - G.foilX) < 90 && p.y > G.ch.y && p.y < G.ch.y + G.ch.h) placeFoil(true);
          else placeFoil(false);
        }
      },
    });
    if (V.key === 'tall') {
      // 휴대폰: 막대·난방기·은박지를 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
      V.v.canvas.style.touchAction = 'pan-y';
      V.v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc && hits(V.v.toLocal(tc))) e.preventDefault();
      }, { passive: false });
    }
  });
  function placeFoil(inPlace) {
    const G = GEO.rad(activeView().L);
    RD.foil = inPlace;
    if (RD.tw) { RD.tw.cancel(); RD.tw = null; }
    const target = inPlace ? { x: G.foilX, y: (G.foilY0 + G.foilY1) / 2, s: 1 } : { x: G.tray.x + G.tray.w / 2, y: G.tray.y + G.tray.h * 0.66, s: 0 };
    RD.tw = SciSim.tween(RD.pose, target, { duration: 0.4, ease: 'outBack' });
    if (inPlace) {
      Sound.tone(660, 0.1, 'triangle', 0.08);
      if (!REDUCE) { const V = activeView(); V.fx.burst(G.foilX, (G.foilY0 + G.foilY1) / 2, { count: 14, colors: ['#e8eef7', '#ffffff', '#ffd9a0'], speed: 140, gravity: 120 }); }
    } else Sound.click();
    syncUI();
  }

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

  // ① 전도
  $('#btnHeat').addEventListener('click', () => {
    if (C.cooling) return;
    Sound.click(); hideHint();
    if (C.heat) { C.heat = false; C.cooling = true; }
    else { C.heat = true; C.tHeat = 0; showHint(C.camOn ? '열이 막대를 따라 이동하는 모습을 살펴보세요' : '눈으로는 열이 잘 보이지 않아요. 📷 열화상 카메라를 켜 보세요!', 4500); }
    syncUI();
  });
  $('#tgCam').addEventListener('click', () => {
    Sound.click(); hideHint();
    C.camOn = !C.camOn;
    if (C.camOn) { C.scan.p = 0; SciSim.tween(C.scan, { p: 1 }, { duration: REDUCE ? 0.01 : 0.8, ease: 'inOutCubic' }); }
    syncUI();
  });
  $('#tgModel').addEventListener('click', () => { Sound.click(); hideHint(); C.model = !C.model; syncUI(); });
  // ② 대류
  $('#btnFlame').addEventListener('click', () => {
    Sound.click(); hideHint();
    const src = BK.F.src[0];
    src.on = !src.on;
    if (src.on) Sound.tone(300, 0.2, 'sawtooth', 0.03);
    syncUI();
  });
  $('#tgLens').addEventListener('click', () => { Sound.click(); BK.lensOn = !BK.lensOn; syncUI(); });
  $$('#segPos button').forEach((b) => b.addEventListener('click', () => { Sound.click(); hideHint(); setHeaterPos(b.dataset.pos); }));
  $('#btnHeater').addEventListener('click', () => {
    Sound.click(); hideHint();
    if (RM.on) { RM.on = false; }
    else { const p = RM.pos; roomReset('heat'); RM.pos = p; RSRC.heater.j0 = heaterRow(); RSRC.heater.j1 = heaterRow() + 3; RM.on = true; }
    syncUI();
  });
  // ③ 복사
  $('#btnStove').addEventListener('click', () => { Sound.click(); hideHint(); RD.stove = !RD.stove; if (RD.stove) Sound.tone(220, 0.25, 'sawtooth', 0.03); syncUI(); });
  $('#tgVac').addEventListener('click', () => {
    Sound.click(); hideHint(); RD.vac = !RD.vac;
    if (RD.vac) showHint('공기를 빼는 중… 공기 알갱이가 빠져나가요', 3500);
    syncUI();
  });
  $('#tgFoil').addEventListener('click', () => { Sound.click(); hideHint(); placeFoil(!RD.foil); });
  // ④ 단열
  [['#tgVacuum', 'vac'], ['#tgSilver', 'silver'], ['#tgLid', 'lid']].forEach(([id, key]) => {
    $(id).addEventListener('click', () => { Sound.click(); hideHint(); TH[key] = !TH[key]; thRestart(); syncUI(); });
  });
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterScene(b.dataset.scene); }));

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
  // 자유 탐구 모드에서 장면을 바꿀 때: 필요한 준비
  function enterScene(name) {
    if (name === 'room' && RM.mode === 'ac') roomReset('heat');
    setScene(name);
  }
  function syncUI() {
    const free = !!(game && game.free);
    document.body.classList.toggle('free-mode', free);
    $('#sceneSeg').hidden = !free;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    $$('.only-cond, .only-beaker, .only-room, .only-rad, .only-thermos').forEach((n) => {
      const hideAc = RM.mode === 'ac' && n.classList.contains('control') && n.classList.contains('only-room');   // 에어컨 퀴즈 장면에서는 난방기 조작을 숨김
      n.style.display = n.classList.contains('only-' + S.scene) && !hideAc ? '' : 'none';
    });
    const fr = $('[data-reveal="foil"]'); if (fr) fr.hidden = !(free || S.revealFoil);
    // 전도
    const hb = $('#btnHeat');
    hb.textContent = C.cooling ? '🧊 식히는 중…' : C.heat ? '⏹ 가열 멈추고 식히기' : '🔥 가열 시작';
    hb.disabled = C.cooling; hb.classList.toggle('btn-primary', !C.heat); press(hb, C.heat);
    press($('#tgCam'), C.camOn); press($('#tgModel'), C.model);
    // 대류
    const src = BK.F.src[0];
    $('#btnFlame').textContent = src.on ? '🫗 불 끄기' : '🔥 불 붙이기'; press($('#btnFlame'), src.on);
    press($('#tgLens'), BK.lensOn);
    $$('#segPos button').forEach((b) => b.classList.toggle('on', b.dataset.pos === RM.pos));
    $('#btnHeater').textContent = RM.on ? '⏹ 난방기 끄기' : '♨️ 난방기 켜기'; press($('#btnHeater'), RM.on);
    // 복사
    $('#btnStove').textContent = RD.stove ? '⏹ 난로 끄기' : '🔥 난로 켜기'; press($('#btnStove'), RD.stove);
    $('#tgVac').textContent = RD.vac ? '🌬️ 공기 넣기' : '🌌 공기 빼기'; press($('#tgVac'), RD.vac);
    $('#tgFoil').textContent = RD.foil ? '🪞 은박지 치우기' : '🪞 은박지 놓기'; press($('#tgFoil'), RD.foil);
    // 단열
    press($('#tgVacuum'), TH.vac); press($('#tgSilver'), TH.silver); press($('#tgLid'), TH.lid);
    const vis = (n) => !n.hidden && n.style.display !== 'none';
    $('#ctrlCard').hidden = !$$('#ctrlCard .control').some(vis);
    $('#readouts').style.display = $$('#readouts .readout').some(vis) ? '' : 'none';
    $('#sceneLabel').textContent = S.scene === 'room' && RM.mode === 'ac' ? '❄️ 더운 교실에 에어컨을 달아요' : SCENE_LABEL[S.scene];
    const sel = C.sel >= 0 ? RODS[C.sel].label : '아직 고르지 않았어요';
    $('#noteCond').textContent = on('model') ? '막대를 눌러 고르면 🔍 입자 모형에서 그 막대를 볼 수 있어요. (선택: ' + sel + ')' : '막대를 눌러 골라 보세요. (선택: ' + sel + ')';
  }
  let lastUI = -1;
  function updateReadouts(t) {
    if (t - lastUI < 0.1) return;
    lastUI = t;
    const set = (id, v, unit) => { const e = $(id); const h = fmt(v, unit === '°C' ? 1 : 0) + '<small>' + unit + '</small>'; if (e.innerHTML !== h) e.innerHTML = h; };
    if (S.scene === 'cond') {
      set('#rCu', rodEnd(0), '°C'); set('#rFe', rodEnd(1), '°C'); set('#rWd', rodEnd(2), '°C'); set('#rCT', C.tHeat * SIMSEC, '초');
      const sel = C.sel >= 0 ? RODS[C.sel].label : '아직 고르지 않았어요';
      const n = $('#noteCond'), txt = (on('model') ? '막대를 눌러 고르면 🔍 입자 모형에서 그 막대를 볼 수 있어요. (선택: ' : '막대를 눌러 골라 보세요. (선택: ') + sel + ')';
      if (n.textContent !== txt) n.textContent = txt;
    } else if (S.scene === 'beaker') {
      set('#rBU', BK.F.meanRows(BK.F.T, 2, 6), '°C'); set('#rBL', BK.F.meanRows(BK.F.T, 17, 21), '°C'); set('#rBT', BK.tOn, '초');
    } else if (S.scene === 'room') {
      set('#rRU', RM.upper, '°C'); set('#rRL', RM.lower, '°C'); set('#rRT', RM.t * ROOM_RATE, '분');
    } else if (S.scene === 'rad') {
      set('#rDB', RD.Tb, '°C'); set('#rDW', RD.Tw, '°C'); set('#rDT', RD.t, '초');
    } else {
      set('#rHM', TH.T, '°C'); set('#rHC', TH.Tc, '°C'); set('#rHT', TH.t, '분');
    }
  }

  /* =========================================================
     미션
     ========================================================= */
  // 미션 번호(전체 순서) → 장면
  const SCENE_OF = ['cond', 'cond', 'cond', 'beaker', 'room', 'room', 'rad', 'rad', 'rad', 'thermos', 'thermos'];
  const SVG_SUN = '<svg viewBox="0 0 300 120" width="300" role="img" aria-label="태양과 지구 사이는 거의 진공인 우주 공간" font-family="sans-serif">' +
    '<rect x="1" y="1" width="298" height="118" rx="12" fill="#10163a"/>' +
    '<circle cx="46" cy="60" r="30" fill="#ffc53d"/><circle cx="46" cy="60" r="22" fill="#ffdf6e"/>' +
    '<circle cx="252" cy="62" r="20" fill="#3b82f6"/><path d="M240 56 q8 -8 14 0 q6 8 -2 14 q-8 4 -12 -4z" fill="#34d27a"/>' +
    '<path d="M86 60 q14 -12 28 0 t28 0 t28 0 t28 0" fill="none" stroke="#ff9a3c" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M196 54 l12 6 l-12 6" fill="none" stroke="#ff9a3c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<text x="46" y="108" font-size="13" font-weight="700" fill="#e8eefc" text-anchor="middle">태양</text>' +
    '<text x="252" y="108" font-size="13" font-weight="700" fill="#e8eefc" text-anchor="middle">지구</text>' +
    '<text x="150" y="36" font-size="13" font-weight="700" fill="#aeb9e6" text-anchor="middle">거의 아무것도 없는 우주 공간 (진공)</text></svg>';
  const kid = (x, y, col) => '<circle cx="' + x + '" cy="' + y + '" r="10" fill="#ffd9b8" stroke="#c9885a" stroke-width="1.5"/><rect x="' + (x - 8) + '" y="' + (y + 12) + '" width="16" height="12" rx="5" fill="' + col + '"/>';
  const badge = (y, ch) => '<rect x="10" y="' + y + '" width="26" height="26" rx="13" fill="#f26b3a"/><text x="23" y="' + (y + 19) + '" font-size="16" font-weight="800" fill="#fff" text-anchor="middle">' + ch + '</text>';
  const SVG_PLAY = '<svg viewBox="0 0 340 214" width="100%" style="max-width:340px" role="img" aria-label="가: 줄 서서 손으로 물건을 건네기, 나: 사람이 직접 들고 이동하기, 다: 멀리서 던져서 전달하기" font-family="sans-serif">' +
    '<rect x="1" y="1" width="338" height="212" rx="12" fill="#fff" stroke="#dde4ef"/>' +
    // 가: 줄 서서 건네기
    badge(12, '가') + [58, 94, 130, 166, 202].map((x, i) => kid(x, 26, ['#7aa7f7', '#f59ab0', '#7ddc9c', '#f7c85a', '#b69af5'][i])).join('') +
    '<circle cx="76" cy="34" r="4.5" fill="#e2463e"/><circle cx="148" cy="34" r="4.5" fill="#e2463e"/><path d="M80 14 l10 0 m-4 -4 l4 4 l-4 4" fill="none" stroke="#e2463e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M152 14 l10 0 m-4 -4 l4 4 l-4 4" fill="none" stroke="#e2463e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<text x="226" y="30" font-size="13.5" font-weight="700" fill="#4a5568">줄 서서 손으로</text><text x="226" y="48" font-size="13.5" font-weight="700" fill="#4a5568">차례로 건네요</text>' +
    // 나: 들고 이동
    badge(76, '나') + kid(62, 90, '#7aa7f7') + '<circle cx="80" cy="100" r="4.5" fill="#e2463e"/>' +
    '<path d="M94 94 L166 94" stroke="#e2463e" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round"/><path d="M160 87 l9 7 l-9 7" fill="none" stroke="#e2463e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    kid(196, 90, '#f59ab0') +
    '<text x="226" y="94" font-size="13.5" font-weight="700" fill="#4a5568">직접 들고</text><text x="226" y="112" font-size="13.5" font-weight="700" fill="#4a5568">이동해요</text>' +
    // 다: 던지기
    badge(138, '다') + kid(54, 152, '#7ddc9c') +
    '<path d="M70 150 Q124 108 178 150" fill="none" stroke="#e2463e" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round"/><circle cx="124" cy="127" r="5" fill="#e2463e"/>' +
    kid(196, 152, '#f7c85a') +
    '<text x="226" y="156" font-size="13.5" font-weight="700" fill="#4a5568">멀리서</text><text x="226" y="174" font-size="13.5" font-weight="700" fill="#4a5568">던져요</text>' +
    '<text x="170" y="204" font-size="12.5" font-weight="700" fill="#8a95a6" text-anchor="middle">빨간 공 = 열(에너지)</text></svg>';
  const POS_NAME = { top: '위', mid: '가운데', bottom: '아래' };
  let s32 = 0;                                      // 3단계 두 번째 미션의 진행(0: 컵 데우기, 1: 은박지 놓기)

  game = SciSim.game({
    simId: 'm1-heat-transfer',
    mount: '#game',
    badge: '열의 탐험가',
    homeHref: '../../index.html#g1',
    featureLabels: {
      heat: '🔥 가열 장치',
      cam: '📷 열화상 카메라',
      model: '🔍 입자 모형',
      flame: '🔥 알코올램프',
      lens: '🔍 물속 입자 모형',
      room: '🏠 교실 난방기',
      stove: '🔥 난로',
      vac: '🌌 진공 만들기',
      foil: '🪞 은박지',
      thermos: '🫙 보온병 설계',
    },
    onFeatures(set, added) {
      F = set;
      if (added.indexOf('lens') >= 0) BK.lensOn = true;
      syncUI();
    },
    onMissionStart(m) {
      S.pick = false;
      setScene(SCENE_OF[m._flat]);
      S.revealFoil = m._flat >= 7;
    },
    levels: [
      /* ───────── STEP 1 · 전도 ───────── */
      {
        title: '전도: 고체에서 열의 이동', short: '전도', icon: '🔥', phase: '관찰',
        features: ['heat', 'cam', 'model'],
        intro: '<p class="si-q">❓ 탐구 질문: 열은 어떤 방법으로 이동할까?</p>' +
          '<p>먼저 <b>고체</b>에서 열이 이동하는 모습을 살펴봐요. 구리·철·나무 막대의 한쪽 끝을 가열하고, <b>📷 열화상 카메라</b>로 열이 퍼지는 모습을 비교해 봐요.</p>' +
          '<p style="font-size:14px;color:#5d6879">⚠️ 실제 실험에서는 가열 장치와 뜨거워진 막대에 화상을 입지 않도록 주의해야 해요.</p>',
        setup() { setScene('cond'); condReset(); C.camOn = false; C.model = false; C.modelK = 0; syncUI(); },
        recap: '고체에서는 이웃한 입자가 차례로 운동을 전달하며 열이 이동해요. 이것을 <b>전도</b>라고 해요.',
        summary: '<p><b>전도</b>: 고체에서 입자가 이웃한 입자와 충돌하며 운동을 차례로 전달해 열이 이동하는 방법.</p>' +
          '<ul><li>입자는 제자리에서 떨리기만 하고, 입자 자체가 이동하는 것은 아니다.</li><li>물질에 따라 열이 전달되는 빠르기가 다르다. 금속(구리 > 철)은 빠르고, 나무는 느리다.</li></ul>',
        missions: [
          {
            title: '열화상 카메라로 관찰하기',
            goal: '🔥 가열을 시작하고 📷 열화상 카메라를 켜서, 막대에 열이 번지는 모습을 5초 동안 관찰하세요.',
            hint: '아래에서 <b>가열 시작</b>과 <b>열화상 카메라</b> 버튼을 차례로 눌러요.',
            setup() { condReset(); C.camOn = false; syncUI(); showHint('🔥 먼저 가열 장치를 켜 보세요', 4500); },
            check: () => C.heat && C.camOn && C.obs >= 5,
            hold: 0.5,
            status: () => '가열 ' + mark(C.heat) + ' · 열화상 카메라 ' + mark(C.camOn) + ' · 관찰 <b>' + fmt(Math.min(5, C.obs), 1) + ' / 5초</b>',
            explain: '막대의 <b>한쪽 끝만</b> 가열했는데 색이 반대쪽 끝으로 번져 갔어요. 눈에 보이지 않는 열이 막대를 따라 <b>이동</b>한 거예요.',
          },
          {
            title: '가장 빨리 뜨거워지는 막대',
            goal: '세 막대 중 <b>끝까지 가장 빨리 뜨거워지는</b> 막대를 눌러 고른 뒤, ✔ 확인하기를 누르세요.',
            manual: true,
            hint: '막대 오른쪽 끝의 색과 온도를 비교해 보세요. 가열이 멈췄다면 다시 시작해도 돼요.',
            setup() { S.pick = true; if (!C.heat && !C.cooling) { C.heat = true; } syncUI(); showHint('막대 세 개를 비교하고, 가장 빨리 뜨거워지는 막대를 눌러 보세요', 5000); },
            check: () => {
              if (C.tHeat < 3 && rodEnd(0) < 35) return '먼저 가열한 뒤 세 막대의 오른쪽 끝이 어떻게 변하는지 비교해 보세요.';
              if (C.sel < 0) return '가장 빨리 뜨거워지는 막대를 눌러서 고른 뒤 확인하세요.';
              if (C.sel === 0) return true;
              return C.sel === 1 ? '철 막대는 구리 막대보다 늦게 뜨거워졌어요. 오른쪽 끝의 온도를 다시 비교해 보세요.' : '나무 막대는 열이 거의 전달되지 않았어요. 오른쪽 끝의 온도가 가장 먼저 오르는 막대는 어느 것일까요?';
            },
            status: () => '고른 막대: <b>' + (C.sel >= 0 ? RODS[C.sel].label : '없음') + '</b> · 구리 ' + fmt(rodEnd(0), 1) + '° · 철 ' + fmt(rodEnd(1), 1) + '° · 나무 ' + fmt(rodEnd(2), 1) + '°',
            explain: '<b>구리 막대</b>가 가장 빨리 뜨거워졌어요. 물질에 따라 열이 전달되는 빠르기가 달라서, 금속은 열이 잘 전달되고 나무는 거의 전달되지 않아요.',
          },
          {
            type: 'quiz',
            title: '열은 어떻게 전달될까?',
            setup() { S.pick = false; C.model = true; if (C.sel < 0) C.sel = 0; syncUI(); },
            goal: '🔍 입자 모형을 보세요. 막대의 한쪽 끝을 가열하면 반대쪽 끝까지 열이 전달되는 방법으로 알맞은 것은?',
            choices: [
              '뜨거워진 입자가 막대를 따라 반대쪽 끝까지 이동한다',
              '뜨거워진 입자가 이웃한 입자와 충돌해 운동을 차례로 전달한다',
              '열이 눈에 보이지 않는 빛이 되어 공기를 통해 퍼진다',
              '뜨거워진 입자가 위로 올라가고 차가운 입자가 아래로 내려온다',
            ],
            answer: 1,
            feedback: [
              '입자 모형을 다시 보세요. 입자는 제자리에서 떨리기만 하고 자리를 옮기지 않아요.',
              '',
              '그건 복사에 가까운 설명이에요. 고체 막대 속에서는 입자들이 이웃과 직접 부딪히며 전달해요.',
              '그건 액체나 기체에서 일어나는 대류예요. 고체의 입자는 움직이지 못하고 제자리에서 떨어요.',
            ],
            explain: '가열한 쪽의 입자는 활발하게 떨리며 이웃한 입자와 부딪혀 운동을 전달해요. 이렇게 입자가 <b>제자리에서</b> 이웃에게 운동을 차례로 전달하며 열이 이동하는 것을 <b>전도</b>라고 해요.',
          },
        ],
      },
      /* ───────── STEP 2 · 대류 ───────── */
      {
        title: '대류: 액체와 기체의 순환', short: '대류', icon: '🫧', phase: '모형',
        features: ['flame', 'lens', 'room'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 고체에서는 입자가 제자리에서 운동을 전달하는 <b>전도</b>로 열이 이동한다는 것을 알았어요.</div>' +
          '<p>액체와 기체의 입자는 자유롭게 움직일 수 있어요. 물을 아래에서 가열하면 열은 어떻게 이동할까요? 비커 속 알갱이의 움직임을 관찰하고, 추운 교실에 <b>난방기</b>를 놓을 위치도 정해 봐요.</p>',
        setup() { setScene('beaker'); beakerReset(); },
        recap: '액체와 기체는 데워진 부분이 위로 올라가고 차가운 부분이 내려오며 순환해요. 이렇게 물질이 직접 이동하며 열이 전달되는 것을 <b>대류</b>라고 해요.',
        summary: '<p><b>대류</b>: 액체나 기체에서 물질이 직접 이동하며 열이 전달되는 방법.</p>' +
          '<ul><li>데워진 물(공기)은 입자 운동이 활발하고 가벼워져 <b>위로</b> 올라가고, 차가운 물(공기)은 무거워 <b>아래로</b> 내려와 순환한다.</li>' +
          '<li>난방기는 <b>아래쪽</b>에, 에어컨은 <b>위쪽</b>에 두면 방 전체가 효과적으로 데워지거나 시원해진다.</li></ul>',
        missions: [
          {
            title: '물속 알갱이 관찰하기',
            goal: '🔥 알코올램프에 불을 붙이고, 비커 속 알갱이가 빙글빙글 도는 모습을 7초 동안 지켜보세요.',
            hint: '<b>불 붙이기</b> 버튼을 누르면 비커 아래쪽을 가열해요. 🔍 돋보기 속 입자도 비교해 보세요.',
            setup() { beakerReset(); setScene('beaker'); showHint('🔥 불을 붙이고 알갱이의 움직임을 관찰해요', 4500); },
            check: () => BK.on && BK.tOn >= 7,
            hold: 0.4,
            status: () => '불 붙이기 ' + mark(BK.on) + ' · 관찰 <b>' + fmt(Math.min(7, BK.tOn), 1) + ' / 7초</b>',
            explain: '가열한 쪽의 물은 <b>위로 올라가고</b>, 위쪽의 차가운 물은 <b>아래로 내려와</b> 물이 빙글빙글 순환해요. 이렇게 물질이 직접 이동하며 열이 전달되는 것을 <b>대류</b>라고 해요.',
          },
          {
            title: '난방기를 놓을 곳 찾기',
            goal: '추운 교실(10 °C)을 데우려고 해요. 난방기를 <b>위·가운데·아래</b> 중 어디에 놓아야 <b>아래쪽 공기</b>가 가장 빨리 따뜻해질까요?',
            hint: '난방기를 끌어서 옮기거나 위치 버튼을 눌러 보세요. 위치를 바꿀 때마다 교실이 다시 추워져요.',
            setup() { setScene('room'); RM.pos = 'top'; RM.place.value = ROWS.top; RM.place.target = ROWS.top; roomReset('heat'); showHint('난방기를 끌어서 옮겨 볼 수 있어요 ♨️', 5000); },
            check: () => RM.mode === 'heat' && RM.pos === 'bottom' && RM.on && RM.lower >= 16,
            hold: 0.6,
            status: () => {
              const poor = RM.on && RM.pos !== 'bottom' && RM.t * ROOM_RATE > 22 && RM.lower < 13;
              return '난방기 위치 <b>' + POS_NAME[RM.pos] + '</b> · ' + (RM.on ? '켜짐' : '꺼짐') + ' · 아래쪽 공기 <b>' + fmt(RM.lower, 1) + ' °C</b> (목표 16 °C)' + (poor ? '<br>💡 아래쪽 공기가 잘 안 따뜻해져요. 다른 위치도 시험해 보세요!' : '');
            },
            explain: '난방기를 <b>아래</b>에 두면 데워진 공기가 위로 올라가고 위쪽의 찬 공기가 내려오며 <b>대류</b>가 일어나 방 전체가 데워져요. 위쪽에 두면 데워진 공기가 위에만 머물러 아래쪽은 오랫동안 추워요.',
          },
          {
            type: 'quiz',
            title: '에어컨은 어디에?',
            setup() { setScene('room'); roomReset('ac'); },
            goal: '더운 여름, 교실을 시원하게 하려고 해요. 에어컨은 어디에 달면 방 전체가 가장 빨리 시원해질까요?',
            choices: ['바닥 가까이', '벽의 가운데', '천장 가까이'],
            answer: 2,
            feedback: [
              '차가운 공기는 아래로 내려가는 성질이 있어요. 바닥에 두면 위쪽의 따뜻한 공기가 잘 식지 않아요.',
              '가운데에 두면 아래쪽은 시원해지지만 위쪽의 따뜻한 공기가 그대로 남아요.',
              '',
            ],
            explain: '차가운 공기는 무거워서 <b>아래로 내려오고</b>, 아래쪽의 따뜻한 공기는 위로 올라가며 순환해요. 그래서 에어컨은 <b>위쪽</b>에 달아요. (난방기는 반대로 아래쪽!)',
          },
        ],
      },
      /* ───────── STEP 3 · 복사 ───────── */
      {
        title: '복사: 물질 없이 전해지는 열', short: '복사', icon: '☀️', phase: '모형',
        features: ['stove', 'vac', 'foil'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전도와 대류는 열을 전해 주는 <b>물질</b>(고체·액체·기체)이 있어야 한다는 것을 알았어요.</div>' +
          '<p>그런데 태양의 열은 물질이 거의 없는 우주 공간을 지나 지구까지 와요. 물질 없이도 열이 이동할 수 있을까요? 난로의 열이 컵에 닿는 방법을 알아봐요.</p>',
        setup() { setScene('rad'); radReset(); },
        recap: '열은 물질 없이도 직접 전달될 수 있어요. 이런 열의 이동 방법을 <b>복사</b>라고 하고, 은박지는 복사열을 잘 반사해요.',
        summary: '<p><b>복사</b>: 열이 물질의 도움 없이 직접 전달되는 방법. 진공에서도 전달된다. (예: 태양열이 지구에 오는 것, 난로 앞이 따뜻한 것)</p>' +
          '<ul><li>검은색 물체는 복사열을 잘 흡수하고, 은박지나 흰색 물체는 잘 반사한다.</li><li>은박지로 가리면 복사열이 덜 전달된다.</li></ul>',
        missions: [
          {
            title: '공기를 빼도 열이 올까?',
            goal: '🔥 난로를 켜고, 🌌 공기를 모두 뺀(진공) 상태에서도 검은 컵이 따뜻해지는지 확인하세요.',
            hint: '<b>난로 켜기</b>와 <b>공기 빼기</b>를 차례로 누르고 기다려 보세요. 컵 위의 숫자가 변해요.',
            setup() { radReset(); setScene('rad'); S.revealFoil = false; showHint('🔥 난로를 켜고 🌌 공기를 빼 보세요', 4500); },
            check: () => RD.stove && RD.vac && RD.vacK > 0.95 && RD.Tb >= 42,
            hold: 0.6,
            status: () => '난로 ' + mark(RD.stove) + ' · 진공 ' + mark(RD.vac && RD.vacK > 0.95) + ' · 검은 컵 <b>' + fmt(RD.Tb, 1) + ' °C</b> (목표 42 °C)',
            explain: '공기가 없는 <b>진공</b>에서도 컵의 온도가 올랐어요. 열이 중간에 있는 <b>물질 없이 직접</b> 전달된 거예요. 이런 열의 이동 방법을 <b>복사</b>라고 해요.',
          },
          {
            title: '은박지로 복사열 막기',
            goal: '난로로 검은 컵을 데운 다음, 🪞 은박지를 난로와 컵 사이에 놓아 컵이 식도록 해 보세요.',
            hint: '① 난로를 켜고 검은 컵이 42 °C 넘게 오를 때까지 기다려요. ② 은박지를 끌어서 가운데 점선 칸에 놓아요.',
            setup() { radReset(); s32 = 0; setScene('rad'); S.revealFoil = true; syncUI(); showHint('🔥 난로를 켠 뒤, 컵이 뜨거워지면 🪞 은박지를 놓아요', 5500); },
            check: () => {
              if (s32 === 0 && RD.stove && RD.Tb >= 42) { s32 = 1; Sound.tick(); showHint('이제 🪞 은박지를 난로와 컵 사이에 놓아 보세요!', 4500); }
              return s32 === 1 && RD.foil && foilBlock() > 0.9 && RD.Tb <= 33;
            },
            hold: 0.6,
            status: () => '① 컵 데우기 ' + mark(s32 >= 1) + ' · ② 은박지로 막기 ' + mark(RD.foil && s32 >= 1) + ' · 검은 컵 <b>' + fmt(RD.Tb, 1) + ' °C</b>' + (s32 >= 1 ? ' (33 °C 아래로!)' : ''),
            explain: '은박지는 복사열을 거의 <b>반사</b>해서 컵까지 열이 덜 전달돼요. 그래서 컵의 온도가 내려갔어요. 흰색 컵이 검은 컵보다 덜 뜨거웠던 것도 흰색이 복사열을 더 많이 반사하기 때문이에요.',
          },
          {
            type: 'quiz',
            title: '태양의 열은 어떻게?',
            setup() { radReset(); setScene('rad'); RD.stove = true; RD.vac = true; RD.vacK = 1; RD.Tb = 52; RD.Tw = 33; S.revealFoil = true; syncUI(); },
            goal: '태양과 지구 사이는 거의 진공이에요. 태양의 열이 지구에 전달되는 방법은 무엇일까요?',
            figure: SVG_SUN,
            choices: ['전도', '대류', '복사', '전도와 대류'],
            answer: 2,
            feedback: [
              '전도는 이웃한 입자의 충돌로 전달돼요. 우주 공간에는 입자가 거의 없어요.',
              '대류는 액체나 기체가 움직여야 해요. 진공에서는 일어날 수 없어요.',
              '',
              '둘 다 열을 전해 줄 물질이 필요해요. 우주 공간에는 물질이 거의 없어요.',
            ],
            explain: '태양의 열은 물질 없이도 전달되는 <b>복사</b>로 지구에 와요. 난로의 열이 진공 속 컵에 닿은 것과 같은 방법이에요.',
          },
        ],
      },
      /* ───────── STEP 4 · 단열 ───────── */
      {
        title: '단열과 비유', short: '단열', icon: '🫙', phase: '적용',
        features: ['thermos'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 열은 <b>전도·대류·복사</b>의 세 가지 방법으로 이동한다는 것을 알았어요.</div>' +
          '<p>열의 이동을 막는 것을 <b>단열</b>이라고 해요. 세 가지 길을 모두 막으면 뜨거운 물이 오래 식지 않는 <b>보온병</b>을 만들 수 있어요. 보온병을 직접 설계하고, 열의 이동을 우리 생활에 비유해 봐요.</p>',
        setup() { setScene('thermos'); TH.vac = TH.silver = TH.lid = false; thRestart(); },
        recap: '전도·대류·복사를 모두 막으면 열이 잘 이동하지 못해요. 보온병은 진공층, 은도금, 뚜껑으로 단열해요.',
        summary: '<p><b>단열</b>: 열의 이동을 막는 것.</p>' +
          '<ul><li><b>보온병</b>: 이중벽 사이의 <b>진공</b>(전도·대류 차단), 안쪽 면의 <b>은도금</b>(복사 차단), <b>뚜껑</b>(대류 차단).</li>' +
          '<li><b>비유</b>: 전도 = 줄 서서 손으로 물건을 차례로 건네기, 대류 = 사람이 물건을 직접 들고 이동하기, 복사 = 멀리서 물건을 던져 전달하기.</li></ul>',
        missions: [
          {
            title: '보온병 설계하기',
            goal: '🫙 진공층, 🪞 은도금, 🧢 뚜껑을 달아서 90 °C 물이 <b>30분 뒤에도 80 °C 이상</b>이 되게 하세요.',
            hint: '열이 새는 길(전도·대류·복사)을 하나씩 막으면 오른쪽 그래프의 빨간 선이 천천히 내려가요.',
            setup() { setScene('thermos'); TH.vac = TH.silver = TH.lid = false; thRestart(); syncUI(); showHint('장치를 하나씩 달고 그래프가 어떻게 달라지는지 보세요', 5000); },
            check: () => TH.vac && TH.silver && TH.lid && TH.done && TH.T >= 80,
            hold: 0.5,
            status: () => '진공층 ' + mark(TH.vac) + ' · 은도금 ' + mark(TH.silver) + ' · 뚜껑 ' + mark(TH.lid) + ' · ' + fmt(Math.min(TH.t, TH_END), 0) + '분 뒤 <b>' + fmt(TH.T, 1) + ' °C</b>',
            explain: '진공층은 <b>전도·대류</b>를, 은도금은 <b>복사</b>를, 뚜껑은 <b>대류</b>를 막아요. 열이 이동하는 세 가지 길을 모두 막았기 때문에 물이 오래도록 따뜻해요.',
          },
          {
            type: 'quiz',
            title: '열의 이동, 이렇게 비유해요',
            setup() { setScene('thermos'); TH.vac = TH.silver = TH.lid = true; thRestart(); thFinish(); syncUI(); },
            goal: '친구들이 물건(= 열)을 옮기는 놀이로 열의 이동 방법을 표현했어요. 알맞게 짝지은 것은?',
            figure: SVG_PLAY,
            choices: ['전도–가, 대류–나, 복사–다', '전도–나, 대류–가, 복사–다', '전도–다, 대류–나, 복사–가', '전도–가, 대류–다, 복사–나'],
            answer: 0,
            feedback: [
              '',
              '전도는 이웃끼리 차례로 전달하는 방법이에요. 줄 서서 손으로 건네는 것은 어느 쪽일까요?',
              '복사는 중간에 아무것도 없이 직접 전달되는 방법이에요. 멀리서 던지는 것은 어느 쪽일까요?',
              '대류는 물질이 직접 움직이며 열을 옮기는 방법이에요. 사람이 직접 들고 가는 것은 어느 쪽일까요?',
            ],
            explain: '<b>전도</b>는 줄 선 친구들이 제자리에서 차례로 건네는 것(가), <b>대류</b>는 사람이 직접 들고 이동하는 것(나), <b>복사</b>는 멀리서 던져 전달하는 것(다)과 같아요. 여러분만의 비유도 만들어 보세요!',
          },
        ],
      },
    ],
  });
  syncUI();

  // 테스트·디버그용 (화면 동작에는 영향 없음)
  window.__sim = { S, C, RODS, BK, RM, RD, TH, ROWS, game, setScene, condReset, beakerReset, roomReset, setHeaterPos, radReset, placeFoil, thRestart, thFinish, stepRods, Fluid };

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
