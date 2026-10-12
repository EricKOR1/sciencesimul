/* =========================================================
   중3 Ⅲ. 수권과 해수의 순환 - 해류와 표층 순환  [9과18-03]
   ① [실험] 수조에 선풍기 바람: 표면의 물이 바람 방향으로 흐르고, 바람이 셀수록 빨라진다
   ② [모형] 북태평양 지도: 무역풍 → 북적도 해류, 편서풍 → 북태평양 해류, 대륙에 막혀 쿠로시오·캘리포니아 해류 → 시계 방향 순환
   ③ [탐구] 해수면 온도(예시 자료) 위에서 난류·한류, 표류병이 쿠로시오 해류를 따라간다
   ④ [적용] 도쿄(난류)·샌프란시스코(한류) 8월 평균 기온(예시 자료), 해류가 없다면? 해류와 기후 변화
   ※ 다루지 않음: 북태평양 아열대 순환 밖의 해류 이름, 우리나라 주변 세부 해류. 지도는 단순화한 모형이에요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, fmt, Sound, toast } = SciSim;
  const RM = !!SciSim.reduceMotion;
  const approach = SciSim.approach, EZ = SciSim.ease;
  const shade = SciSim.color.shade, rgba = SciSim.color.rgba, mixc = SciSim.color.mix;
  const TAU = Math.PI * 2;
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const VW = 800, VH = 600;
  const SS = Math.max(1.5, Math.min(2, window.devicePixelRatio || 1));

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#e4eef6' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  let game = null;

  /* ---------------- 작은 도우미 ---------------- */
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const SPR = {};
  function sprite(key, w, h, fn) {
    let c = SPR[key];
    if (!c) {
      c = document.createElement('canvas'); c.width = Math.ceil(w * SS); c.height = Math.ceil(h * SS);
      const g = c.getContext('2d'); g.scale(SS, SS); fn(g, w, h, SciSim.draw(g));
      SPR[key] = c;
    }
    return c;
  }
  function blit(c, x, y, a) {
    const w = c.width / SS, h = c.height / SS;
    if (a != null && a < 1) { ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(c, x - w / 2, y - h / 2, w, h); ctx.restore(); }
    else ctx.drawImage(c, x - w / 2, y - h / 2, w, h);
  }
  function card(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { D.roundRect(x, y, w, h, o.r || 14); ctx.fillStyle = o.bg || 'rgba(255,255,255,.94)'; ctx.fill(); }, { blur: o.blur || 14, y: 4 });
    if (o.border) { D.roundRect(x, y, w, h, o.r || 14); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 2; ctx.stroke(); }
  }
  function ellipse(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU); }
  function alphaDo(a, fn) { if (a <= 0.003) return; ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); fn(); ctx.restore(); }
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const pfx = new SciSim.Particles();
  function pBurst(x, y, n) { pfx.burst(x, y, { count: n || 22, speed: 150, colors: ['#ffd23f', '#38bdf8', '#34d399', '#f472b6'] }); }

  /* ---------------- 전체 상태 ---------------- */
  const S = { scene: 0, prev: -1, fade: 1 };
  const WIND_NAME = ['꺼짐', '약', '중', '강'];
  const S1 = { wind: 0, w: 0, dir: 1, fanDir: 1, fanA: 1, blade: 0, obs: [0, 0, 0, 0], dirT: [0, 0], papers: [], streaks: [], fp: [], vShown: 0 };
  const S2 = { p: 0, playing: false, tray: 0, cards: [], placed: [-1, -1, -1, -1], checked: false, drag: -1, dragDX: 0, dragDY: 0, spinA: 0, hint: 0 };
  const S3 = { sst: 0, sstA: 0, bottle: null, kuroDone: false, sel: -1, selT: 0, trail: [], bottleT: 0, dragging: false, msg: '', msgT: 0, done: 0 };
  const S4 = { city: 0, seen: new Set([0]), off: false, offA: 0, bars: [0, 0], barsA: 0, offSeen: 0 };

  /* =========================================================
     장면 1 · 수조에 바람 불기
     ========================================================= */
  const TK = { x0: 150, x1: 650, top: 292, wy: 334, bot: 482 };
  const PXCM = 14;
  const vcmOf = (w) => (w <= 1 ? w * 1.2 : w <= 2 ? lerp(1.2, 2.6, w - 1) : lerp(2.6, 4.2, Math.min(w, 3) - 2));
  (function initS1() {
    const r = rng(7), cols = ['#ef4444', '#fbbf24', '#ffffff', '#34d399', '#f472b6', '#60a5fa', '#ffffff'];
    for (let i = 0; i < 7; i++) S1.papers.push({ x: 195 + i * 62 + r() * 18, ph: r() * TAU, col: cols[i], a: 1, rot: (r() - 0.5) * 0.4, len: 20 + r() * 6 });
    for (let i = 0; i < 18; i++) S1.streaks.push({ u: r(), y: 262 + r() * 54, len: 34 + r() * 36, ph: r() * TAU });
    for (let i = 0; i < 80; i++) { const y = TK.wy + 8 + r() * (TK.bot - TK.wy - 20); S1.fp.push({ x: TK.x0 + 10 + r() * (TK.x1 - TK.x0 - 20), y, k: Math.exp(-(y - TK.wy) / 62) }); }
  })();
  function setWind(w) { S1.wind = w; Sound.click(); }
  function flipDir() { S1.dir = -S1.dir; Sound.click(); }
  function surfY(x) { return TK.wy - S1.dir * (x - 400) * 0.011 * S1.w; }
  function updateS1(dt) {
    S1.w = approach(S1.w, S1.wind, dt, 1.6);
    const v = vcmOf(S1.w), vpx = v * PXCM * S1.dir;
    S1.vShown = approach(S1.vShown, v, dt, 4);
    if (S1.fanDir !== S1.dir) { S1.fanA = Math.max(0, S1.fanA - dt * 5); if (S1.fanA <= 0) S1.fanDir = S1.dir; }
    else S1.fanA = Math.min(1, S1.fanA + dt * 4);
    S1.blade += S1.w * 14 * dt * S1.fanA;
    S1.papers.forEach((p) => {
      p.ph += dt * 2;
      p.x += vpx * dt * (0.94 + 0.12 * Math.sin(p.ph * 0.7));
      if (p.x > TK.x1 - 14) { p.x = TK.x0 + 14; p.a = 0; } else if (p.x < TK.x0 + 14) { p.x = TK.x1 - 14; p.a = 0; }
      const edge = Math.min(TK.x1 - p.x, p.x - TK.x0);
      p.a = Math.min(clamp(edge / 36, 0, 1), p.a + dt * 2.5);
    });
    S1.fp.forEach((p) => {
      p.x += vpx * dt * p.k * 1.15;
      if (p.x > TK.x1 - 8) p.x -= TK.x1 - TK.x0 - 16; else if (p.x < TK.x0 + 8) p.x += TK.x1 - TK.x0 - 16;
    });
    S1.streaks.forEach((s) => { s.u += dt * (0.18 + 0.32 * S1.w); if (s.u > 1) s.u -= 1; });
    const settled = Math.abs(S1.w - S1.wind) < 0.2;
    if (S1.wind >= 1 && settled) { S1.obs[S1.wind] += dt; S1.dirT[S1.dir > 0 ? 0 : 1] += dt; }
  }

  function drawFan(fx, dir, a, t) {
    alphaDo(a, () => {
      ctx.save(); ctx.translate(fx, 0); ctx.scale(dir, 1);
      // 그림자와 받침
      ellipse(0, 486, 40, 7); ctx.fillStyle = 'rgba(30,50,80,.22)'; ctx.fill();
      let g = ctx.createLinearGradient(-8, 0, 8, 0); g.addColorStop(0, '#9fb0c2'); g.addColorStop(1, '#5d6e82');
      ctx.fillStyle = g; D.roundRect(-5, 330, 10, 150, 4); ctx.fill();
      g = ctx.createLinearGradient(0, 470, 0, 490); g.addColorStop(0, '#7b8ca0'); g.addColorStop(1, '#4b5a6c');
      ctx.fillStyle = g; D.roundRect(-34, 472, 68, 14, 7); ctx.fill();
      // 모터
      g = ctx.createLinearGradient(0, 270, 0, 330); g.addColorStop(0, '#f6f8fb'); g.addColorStop(1, '#b9c5d2');
      ctx.fillStyle = g; D.roundRect(-34, 292, 34, 30, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(80,100,120,.4)'; ctx.lineWidth = 1.2; D.roundRect(-34, 292, 34, 30, 8); ctx.stroke();
      // 날개
      const w = S1.w, cy = 306;
      if (w > 0.3) { ellipse(6, cy, 14, 44); ctx.fillStyle = 'rgba(150,190,230,' + (0.12 + 0.07 * w) + ')'; ctx.fill(); }
      ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) {
        const ang = S1.blade + k * Math.PI / 2, ty = Math.sin(ang) * 40, tx = Math.cos(ang) * 7;
        ctx.strokeStyle = k % 2 ? '#3b82c4' : '#2f6fb0'; ctx.lineWidth = 11;
        ctx.beginPath(); ctx.moveTo(5, cy); ctx.lineTo(5 + tx, cy + ty); ctx.stroke();
      }
      ctx.lineCap = 'butt';
      D.sphere(5, cy, 7, '#e2e8f0', { gloss: true });
      // 보호망
      ctx.strokeStyle = 'rgba(70,90,110,.75)'; ctx.lineWidth = 2.2; ellipse(9, cy, 16, 47); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(70,90,110,.5)'; ellipse(9, cy, 9, 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(9, cy - 47); ctx.lineTo(9, cy + 47); ctx.moveTo(-7, cy); ctx.lineTo(25, cy); ctx.stroke();
      ctx.restore();
    });
  }

  function drawS1(t) {
    // 벽과 탁자
    let g = ctx.createLinearGradient(0, 0, 0, 490);
    g.addColorStop(0, '#d9e9f4'); g.addColorStop(1, '#f1f7fb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 490);
    g = ctx.createLinearGradient(0, 486, 0, VH);
    g.addColorStop(0, '#d3dbe3'); g.addColorStop(1, '#aab6c2');
    ctx.fillStyle = g; ctx.fillRect(0, 486, VW, VH - 486);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(0, 484, VW, 3);

    const w = S1.w, v = vcmOf(w), dir = S1.dir;
    // 수조 뒤쪽
    D.shadow(() => { D.roundRect(TK.x0 - 6, TK.top - 4, TK.x1 - TK.x0 + 12, TK.bot - TK.top + 14, 12); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); }, { blur: 16, y: 8, color: 'rgba(30,60,100,.25)' });
    // 바람 줄기
    const wa = clamp(w / 3, 0, 1) * S1.fanA;
    if (wa > 0.02) {
      ctx.save(); ctx.lineCap = 'round';
      S1.streaks.forEach((s) => {
        const fx = S1.fanDir > 0 ? 82 : 718, x0 = fx + S1.fanDir * (30 + s.u * 560);
        const fade = Math.sin(Math.PI * clamp(s.u, 0, 1));
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * wa * fade) + ')'; ctx.lineWidth = 3.4;
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) { const xx = x0 - S1.fanDir * s.len * k / 8, yy = s.y + Math.sin(k * 0.7 + s.ph + t * 4) * 3 * (0.4 + w * 0.3); if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
        ctx.stroke();
        ctx.strokeStyle = 'rgba(80,120,170,' + (0.28 * wa * fade) + ')'; ctx.lineWidth = 6.5; ctx.stroke();
      });
      ctx.restore();
    }
    // 물
    const amp = 1.6 + 1.7 * w;
    const yAt = (x) => surfY(x) + Math.sin(x * 0.05 - t * 2 * (0.6 + 0.4 * w) * dir) * amp + Math.sin(x * 0.11 + t * 1.3) * amp * 0.45;
    g = ctx.createLinearGradient(0, TK.wy, 0, TK.bot);
    g.addColorStop(0, '#8fd0f3'); g.addColorStop(1, '#2f86cf');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(TK.x0, TK.bot);
    for (let x = TK.x0; x <= TK.x1; x += 6) ctx.lineTo(x, yAt(x));
    ctx.lineTo(TK.x1, TK.bot); ctx.closePath(); ctx.fill();
    // 물속 흐름 입자
    ctx.save(); ctx.lineCap = 'round';
    S1.fp.forEach((p) => {
      const l = Math.abs(v) * p.k * 2.4 * dir;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.28 + 0.5 * p.k) + ')'; ctx.lineWidth = 1.2 + 1.6 * p.k;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - l - dir * 1.5, p.y); ctx.stroke();
    });
    ctx.restore();
    // 수면선
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = TK.x0; x <= TK.x1; x += 6) { const yy = yAt(x); if (x === TK.x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
    // 종이 조각
    S1.papers.forEach((p) => {
      alphaDo(p.a, () => {
        const y = yAt(p.x) - 1.5 + Math.sin(p.ph) * 0.8;
        ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.rot + Math.sin(p.ph * 0.8) * 0.08);
        ctx.fillStyle = 'rgba(20,50,90,.25)'; ctx.fillRect(-p.len / 2 + 1, 1.5, p.len, 3);
        ctx.fillStyle = p.col; D.roundRect(-p.len / 2, -5, p.len, 7, 2); ctx.fill();
        ctx.strokeStyle = 'rgba(60,80,110,.55)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      });
    });
    // 유리 앞면
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5; D.roundRect(TK.x0, TK.top, TK.x1 - TK.x0, TK.bot - TK.top, 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,130,180,.55)'; ctx.lineWidth = 1.4; D.roundRect(TK.x0 - 2.5, TK.top - 2.5, TK.x1 - TK.x0 + 5, TK.bot - TK.top + 5, 12); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; D.roundRect(TK.x0 + 10, TK.top + 10, 9, TK.bot - TK.top - 36, 4); ctx.fill();
    // 눈금자
    const ry = 494;
    g = ctx.createLinearGradient(0, ry, 0, ry + 22); g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#f2c14e');
    ctx.fillStyle = g; D.roundRect(TK.x0, ry, TK.x1 - TK.x0, 22, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(100,70,0,.7)'; ctx.lineWidth = 1;
    for (let c = 0; c * PXCM <= TK.x1 - TK.x0; c++) { const x = TK.x0 + c * PXCM, len = c % 10 === 0 ? 14 : c % 5 === 0 ? 10 : 6; ctx.beginPath(); ctx.moveTo(x + 0.5, ry); ctx.lineTo(x + 0.5, ry + len); ctx.stroke(); }
    [0, 10, 20, 30].forEach((c) => D.text(TK.x0 + c * PXCM + (c ? 0 : 6), ry + 36, c + (c === 30 ? ' cm' : ''), { size: 13, weight: 800, color: '#6b4a00' }));
    // 선풍기
    drawFan(S1.fanDir > 0 ? 62 : 738, S1.fanDir, S1.fanA, t);
    D.label(S1.fanDir > 0 ? 62 : 738, 516, '선풍기', { bg: 'rgba(27,35,51,.78)', size: 13 });
    // 화살표
    if (w > 0.2) {
      const fx = S1.fanDir > 0 ? 130 : 670, len = 36 + w * 36;
      D.arrow(fx, 252, fx + S1.fanDir * len, 252, { color: '#5b6b7e', width: 6, label: '바람', labelOffset: -18, alpha: clamp(w, 0, 1) * S1.fanA });
      const cx = 400, l2 = 24 + v * 22;
      D.arrow(cx - dir * l2, TK.wy + 24, cx + dir * l2, TK.wy + 24, { color: '#ffffff', width: 6, alpha: clamp(w, 0, 1) });
      D.label(cx, TK.wy + 24 + 24, '표층 물의 흐름', { bg: 'rgba(11,80,140,.85)', size: 13, });
    }
    // 속력 카드
    const px = 316, py = 16, pw = 466, ph = 118;
    card(px, py, pw, ph, {});
    D.text(px + 18, py + 28, '🌬️ 바람 세기', { size: 15, weight: 800, color: '#1b3a5c', align: 'left' });
    D.label(px + 150, py + 24, WIND_NAME[S1.wind], { bg: S1.wind ? '#0ea5e9' : '#94a3b8', size: 14, pad: 12 });
    D.text(px + 18, py + 62, '📄 종이 조각의 속력', { size: 15, weight: 800, color: '#1b3a5c', align: 'left' });
    ctx.font = '800 30px ' + MONO;
    D.text(px + pw - 82, py + 64, S1.vShown.toFixed(1), { size: 30, weight: 800, color: '#0b6fb8', align: 'right' });
    D.text(px + pw - 74, py + 64, 'cm/s', { size: 15, weight: 800, color: '#64748b', align: 'left' });
    // 기록
    for (let k = 1; k <= 3; k++) {
      const ok = S1.obs[k] >= 2, cx = px + 18 + (k - 1) * 146;
      D.label(cx, py + 96, WIND_NAME[k] + ' ' + (ok ? vcmOf(k).toFixed(1) + ' cm/s ✔' : '—'), { bg: ok ? '#dcfce7' : '#eef2f6', color: ok ? '#15803d' : '#94a3b8', size: 13, align: 'left' });
    }
    if (S1.wind === 0 && S1.obs[1] + S1.obs[2] + S1.obs[3] < 0.1) {
      alphaDo(0.6 + 0.4 * Math.sin(t * 4), () => D.label(TK.x0 + (TK.x1 - TK.x0) / 2, 408, '👉 바람 세기를 골라 보세요', { bg: 'rgba(255,255,255,.95)', color: '#1b3a5c', size: 15, border: '#7dd3fc' }));
    }
  }

  /* =========================================================
     북태평양 지도 (경도 110°E ~ 110°W, 위도 0° ~ 58°N)
     ========================================================= */
  const LON0 = 110, LAT1 = 58, MY0 = 62, KX = 800 / 140, KY = 6.4;
  const mx = (lon) => (lon - LON0) * KX, my = (lat) => MY0 + (LAT1 - lat) * KY;
  const MAPH = LAT1 * KY;                       // 지도 높이 (위도 0° 까지)
  const LANDS = [
    [[110, 58.5], [143, 58.5], [141, 56], [138.5, 54.7], [139.5, 53.5], [141, 52.5], [140.3, 50], [140.2, 48], [138, 46.2], [135.5, 43.8], [132.5, 43], [130.6, 42.3], [129.7, 41], [128.3, 39.5], [128.5, 38.3], [129.4, 36.5], [129.4, 35.5], [129.1, 35.1],
      [127.5, 34.6], [126.4, 34.6], [126.5, 36.2], [126.6, 37.5], [125.2, 38.2], [124.8, 39.3], [124.3, 39.9], [122.5, 39.5], [121.6, 38.9], [121.2, 39.4], [122.2, 40.5], [121, 40.8], [119.6, 39.8], [118, 39], [117.8, 38.2], [118.9, 37.5], [120.5, 37.6], [122.5, 37.4],
      [120.4, 36], [119.3, 34.8], [120.6, 33], [121.9, 31.5], [121.9, 30.8], [121.3, 28.5], [119.5, 25.7], [117.5, 23.6], [114.3, 22.3], [111.5, 21.5], [110, 21]],
    [[156, 58.5], [156.2, 56], [156.6, 53], [156.7, 51], [158.6, 52.8], [160.4, 54.8], [162.5, 56.3], [163.5, 58.5]],
    [[142, 46], [143.3, 48], [143.2, 50.5], [143.5, 52.5], [143.3, 54.2], [142.4, 53.5], [142, 51], [141.8, 48]],
    [[140, 41.5], [140.9, 43.3], [141.6, 45.4], [142.6, 44.4], [144.5, 43.9], [145.5, 43.3], [143.3, 42], [141.8, 42.5], [141, 42.2]],
    [[130.9, 34], [132, 35.4], [133.2, 35.6], [135.5, 35.7], [136.8, 37.3], [138.8, 37.6], [139.8, 39], [140, 40.3], [140.8, 41.4], [141.9, 40], [141.8, 39], [141, 38], [141, 36.3], [140.6, 35.5], [139.9, 35], [138.5, 34.7], [137, 34.6], [136.8, 34.3], [135.8, 33.5], [135.1, 34.3], [134.5, 34.7], [133, 34.3], [131.7, 33.9]],
    [[129.7, 33.2], [129.8, 33.6], [130.9, 33.9], [131.8, 33.5], [131.7, 32.3], [131.2, 31.3], [130.6, 31.2], [130.2, 32], [129.9, 32.8]],
    [[132.4, 33.5], [132.9, 34.1], [134.6, 34.2], [134.5, 33.5], [133.3, 33.3], [132.6, 32.9]],
    [[120.1, 23.1], [120.6, 24.3], [121.6, 25.2], [122, 24.8], [121.5, 23], [120.9, 22]],
    [[120, 18.5], [121.6, 18.5], [122.3, 17.2], [122.2, 16], [121.6, 15], [122.5, 14.3], [124, 12.8], [122.5, 13.5], [121, 13.8], [120.6, 14.7], [120, 16]],
    [[122.3, 11.5], [125, 12.5], [125.8, 10.5], [126.5, 8.5], [126.4, 6.5], [125.5, 5.8], [124, 6.5], [122.2, 7], [122.5, 8.5], [123.5, 9.2], [123, 10.5]],
    [[110, 1.4], [111, 2.6], [113, 3.2], [114.7, 4.7], [116, 6.4], [117, 7], [119, 5.3], [118, 4.2], [117.7, 2], [118.8, 1], [116, -1], [110, -1]],
    [[108.7, 19.2], [110.2, 20.1], [111, 19.7], [110, 18.3], [109, 18.4]],
    [[250, 58.5], [224, 58.5], [224.6, 57], [227.5, 55], [229, 52.5], [231.2, 50.4], [232.4, 50], [234.2, 48.8], [235.3, 48.4], [235.9, 46.2], [235.6, 43], [235.6, 40.4], [237.1, 38], [237.6, 37.8], [238.1, 36.7], [239.5, 34.5], [241.5, 33.8], [242.8, 32.7], [244, 30.5], [245, 29], [246.5, 27.2], [248.8, 25.5], [250.1, 22.9], [250.5, 22.9]],
  ];
  const HAWAII = [[204.5, 19.6, 1.1], [203.6, 20.8, 0.5], [202.2, 21.4, 0.5], [200.4, 22, 0.5]];
  function polyPath(g, pts, close) {
    g.beginPath();
    pts.forEach((q, i) => { const x = mx(q[0]), y = my(q[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close !== false) g.closePath();
  }
  function isLand(x, y) {
    for (let k = 0; k < LANDS.length; k++) {
      const P = LANDS[k]; let inside = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        const xi = mx(P[i][0]), yi = my(P[i][1]), xj = mx(P[j][0]), yj = my(P[j][1]);
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) return true;
    }
    return HAWAII.some((h) => Math.hypot(x - mx(h[0]), y - my(h[1])) < h[2] * KX + 2);
  }

  /* ---- 해류 순환 경로 (닫힌 곡선): 북적도 → 쿠로시오 → 북태평양 → 캘리포니아 ---- */
  const KEYS = [
    [241, 16], [225, 15.2], [205, 14.6], [185, 14.4], [165, 14.8], [145, 15.4], [131, 16.2], [126.5, 17.5],
    [124.8, 20.5], [124.8, 23.8], [126.8, 26.6], [130, 29.6], [134, 31.6], [138, 33], [143, 35.2],
    [150, 37.8], [160, 40.2], [172, 42], [186, 43.3], [200, 44], [214, 44.3], [228, 45],
    [231.5, 41], [234.5, 36], [238.5, 30], [242, 24], [243, 19.5],
  ];
  const SEG_B = [7, 14, 21];                 // 구간 경계(키 번호)
  const CUR = [
    { id: 0, name: '북적도 해류', slot: [185, 7.4], info: '무역풍을 따라 동쪽에서 서쪽으로 흘러요. 저위도를 흐르는 따뜻한 물이에요.', hint: '무역풍을 따라 동쪽에서 서쪽으로 흐르는 해류예요.' },
    { id: 1, name: '쿠로시오 해류', slot: [143.5, 24.5], info: '대륙(아시아)에 막혀 북쪽으로 꺾여 흘러요. 난류: 저위도에서 고위도로 따뜻한 물을 옮겨요.', hint: '서쪽 가장자리를 따라 북쪽으로 흐르는 따뜻한 해류예요.' },
    { id: 2, name: '북태평양 해류', slot: [192, 49.5], info: '편서풍을 따라 서쪽에서 동쪽으로 흘러요. 쿠로시오 해류에서 이어진 물이에요.', hint: '편서풍을 따라 서쪽에서 동쪽으로 흐르는 해류예요.' },
    { id: 3, name: '캘리포니아 해류', slot: [219, 31], info: '대륙(북아메리카)에 막혀 남쪽으로 꺾여 흘러요. 한류: 고위도에서 저위도로 차가운 물을 옮겨요.', hint: '동쪽 가장자리를 따라 남쪽으로 흐르는 차가운 해류예요.' },
  ];
  const LOOP = (function () {
    const n = KEYS.length, K = KEYS.map((k) => [mx(k[0]), my(k[1])]), raw = [];
    const cm = (a, b, c, d, t) => {
      const t2 = t * t, t3 = t2 * t, f = (i) => 0.5 * ((2 * b[i]) + (-a[i] + c[i]) * t + (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t2 + (-a[i] + 3 * b[i] - 3 * c[i] + d[i]) * t3);
      return [f(0), f(1)];
    };
    for (let i = 0; i < n; i++) for (let j = 0; j < 16; j++) { const p = cm(K[(i - 1 + n) % n], K[i], K[(i + 1) % n], K[(i + 2) % n], j / 16); raw.push({ x: p[0], y: p[1], u: i + j / 16 }); }
    raw.push({ x: raw[0].x, y: raw[0].y, u: n });
    const step = 3, X = [], Y = [], U = [];
    let acc = 0, next = 0;
    X.push(raw[0].x); Y.push(raw[0].y); U.push(0); next = step;
    for (let i = 1; i < raw.length; i++) {
      const a = raw[i - 1], b = raw[i], d = Math.hypot(b.x - a.x, b.y - a.y);
      while (acc + d >= next) { const f = (next - acc) / d; X.push(a.x + (b.x - a.x) * f); Y.push(a.y + (b.y - a.y) * f); U.push(a.u + (b.u - a.u) * f); next += step; }
      acc += d;
    }
    const N = X.length, seg = new Array(N), start = [0, 0, 0, 0], end = [0, 0, 0, 0];
    for (let i = 0; i < N; i++) seg[i] = U[i] < SEG_B[0] ? 0 : U[i] < SEG_B[1] ? 1 : U[i] < SEG_B[2] ? 2 : 3;
    for (let k = 3; k >= 0; k--) { for (let i = 0; i < N; i++) if (seg[i] === k) { start[k] = i; break; } }
    for (let k = 0; k < 4; k++) end[k] = k < 3 ? start[k + 1] : N;
    return { X, Y, U, N, step, seg, start, end, L: N * step };
  })();
  function loopAt(s) {
    const L = LOOP; let i = s / L.step; i = ((i % L.N) + L.N) % L.N;
    const i0 = Math.floor(i), i1 = (i0 + 1) % L.N, f = i - i0;
    return { x: L.X[i0] + (L.X[i1] - L.X[i0]) * f, y: L.Y[i0] + (L.Y[i1] - L.Y[i0]) * f, i: i0, tx: L.X[i1] - L.X[i0], ty: L.Y[i1] - L.Y[i0] };
  }
  function nearestLoop(x, y) {
    const L = LOOP; let bi = 0, bd = 1e9;
    for (let i = 0; i < L.N; i++) { const d = (L.X[i] - x) * (L.X[i] - x) + (L.Y[i] - y) * (L.Y[i] - y); if (d < bd) { bd = d; bi = i; } }
    return { i: bi, d: Math.sqrt(bd) };
  }
  const SEG_MUL = [1.0, 1.7, 1.0, 0.85], BASE = 52;
  const slotPx = (k) => ({ x: mx(CUR[k].slot[0]), y: my(CUR[k].slot[1]) });

  /* ---- 해류 흐름 입자 ---- */
  const FP = [];
  (function () { const r = rng(21); for (let i = 0; i < 150; i++) FP.push({ s: r() * LOOP.L, off: (r() - 0.5) * 14, sp: 0.8 + r() * 0.5, ph: r() * TAU }); })();
  function updateFlow(dt) {
    FP.forEach((p) => {
      const i = Math.floor(p.s / LOOP.step) % LOOP.N;
      p.s = (p.s + BASE * SEG_MUL[LOOP.seg[i]] * p.sp * dt) % LOOP.L;
    });
  }
  function segFrac(i, fr) { const k = LOOP.seg[i]; return clamp((fr[k] - (i - LOOP.start[k]) / (LOOP.end[k] - LOOP.start[k])) * 10, 0, 1); }

  /* ---- 정적 그림: 바다 · 해수면 온도 · 육지 ---- */
  function oceanSprite() {
    return sprite('ocean', 800, 600, (g, w, h, d) => {
      const gr = g.createLinearGradient(0, MY0, 0, MY0 + MAPH);
      gr.addColorStop(0, '#3f87c6'); gr.addColorStop(1, '#5fb0e0');
      g.fillStyle = gr; g.fillRect(0, MY0, 800, MAPH);
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1;
      for (let lat = 10; lat <= 50; lat += 10) { g.beginPath(); g.moveTo(0, my(lat)); g.lineTo(800, my(lat)); g.stroke(); d.text(14, my(lat) - 4, lat + '°N', { size: 11.5, weight: 700, color: 'rgba(255,255,255,.85)', align: 'left' }); }
      [[120, '120°E'], [140, '140°E'], [160, '160°E'], [180, '180°'], [200, '160°W'], [220, '140°W'], [240, '120°W']].forEach((q) => {
        g.beginPath(); g.moveTo(mx(q[0]), MY0); g.lineTo(mx(q[0]), MY0 + MAPH); g.stroke();
        d.text(mx(q[0]), MY0 + MAPH - 5, q[1], { size: 11.5, weight: 700, color: 'rgba(255,255,255,.85)' });
      });
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.6; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(0, my(0) - 1); g.lineTo(800, my(0) - 1); g.stroke(); g.setLineDash([]);
    });
  }
  function landSprite() {
    return sprite('land', 800, 600, (g) => {
      g.save(); g.beginPath(); g.rect(0, MY0, 800, MAPH); g.clip();
      g.lineJoin = 'round';
      [[12, 'rgba(255,255,255,.22)'], [6, 'rgba(255,255,255,.34)']].forEach((q) => { g.strokeStyle = q[1]; g.lineWidth = q[0]; LANDS.forEach((s) => { polyPath(g, s); g.stroke(); }); HAWAII.forEach((h) => { g.beginPath(); g.arc(mx(h[0]), my(h[1]), h[2] * KX, 0, TAU); g.stroke(); }); });
      const lg = g.createLinearGradient(0, MY0, 0, MY0 + MAPH);
      lg.addColorStop(0, '#f1ecd6'); lg.addColorStop(1, '#d9ceaa');
      g.fillStyle = lg; LANDS.forEach((s) => { polyPath(g, s); g.fill(); }); HAWAII.forEach((h) => { g.beginPath(); g.arc(mx(h[0]), my(h[1]), h[2] * KX, 0, TAU); g.fill(); });
      g.strokeStyle = '#b3a479'; g.lineWidth = 1.5; LANDS.forEach((s) => { polyPath(g, s); g.stroke(); });
      g.restore();
    });
  }
  /* 해수면 온도(예시 자료): 위도에 따른 값 + 쿠로시오(따뜻함) · 캘리포니아(차가움) 영향 */
  function sstAt(lon, lat, dK, dC, dO) {
    let T = 29 * (1 - Math.pow(Math.min(lat, 66) / 66, 1.5));
    T += 5.5 * Math.exp(-Math.pow(dK / 3.4, 2)) * (lat > 18 ? 1 : 0.4);
    T += 2.2 * Math.exp(-Math.pow(dK / 7, 2)) * sstep(130, 150, lon) * (1 - sstep(150, 190, lon)) * (lat > 30 ? 1 : 0.3);
    T -= 5.2 * Math.exp(-Math.pow(dC / 3.6, 2));
    T -= 4.5 * Math.exp(-Math.pow(dO / 8, 2));
    T += 1.6 * Math.exp(-Math.pow((lon - 140) / 22, 2) - Math.pow((lat - 8) / 9, 2));
    return clamp(T, 0, 31);
  }
  const SST_STOPS = [[0, '#33489f'], [6, '#3f7fd0'], [12, '#58bfe0'], [18, '#eaf1b8'], [22, '#fbd67c'], [26, '#f59a4a'], [30, '#dc4a3e']];
  function sstColor(T) {
    for (let i = 1; i < SST_STOPS.length; i++) if (T <= SST_STOPS[i][0]) { const a = SST_STOPS[i - 1], b = SST_STOPS[i]; return mixc(a[1], b[1], (T - a[0]) / (b[0] - a[0])); }
    return SST_STOPS[SST_STOPS.length - 1][1];
  }
  function sstSprite() {
    return sprite('sst', 800, 600, (g) => {
      const cw = 5, cols = Math.ceil(800 / cw), rows = Math.ceil(MAPH / cw);
      const small = document.createElement('canvas'); small.width = cols; small.height = rows;
      const sg = small.getContext('2d'), img = sg.createImageData(cols, rows);
      // 구간별로 몇 개씩만 뽑아 거리 계산을 가볍게
      const pts = [[], [], [], []]; for (let i = 0; i < LOOP.N; i += 3) pts[LOOP.seg[i]].push([LOOP.X[i], LOOP.Y[i]]);
      const dist = (arr, x, y) => { let b = 1e9; for (let i = 0; i < arr.length; i++) { const dx = arr[i][0] - x, dy = arr[i][1] - y, d = dx * dx + dy * dy; if (d < b) b = d; } return Math.sqrt(b) / KX; };
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) * cw, y = MY0 + (r + 0.5) * cw, lon = LON0 + x / KX, lat = LAT1 - (y - MY0) / KY;
        const dK = dist(pts[1], x, y), dC = dist(pts[3], x, y), dO = Math.hypot(lon - 150, (lat - 49) * 1.4);
        const col = SciSim.color.hexToRgb(sstColor(sstAt(lon, lat, dK, dC, dO))), o = (r * cols + c) * 4;
        img.data[o] = col.r; img.data[o + 1] = col.g; img.data[o + 2] = col.b; img.data[o + 3] = 255;
      }
      sg.putImageData(img, 0, 0);
      g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(small, 0, MY0, 800, rows * cw); g.restore();
    });
  }

  /* ---- 지도 겹침 그리기 (장면 2·3·4 공통) ---- */
  function drawFlow(t, o) {
    // o: {fr: [4], mode: 'plain'|'temp', alpha}
    const a0 = o.alpha != null ? o.alpha : 1, L = LOOP;
    if (a0 <= 0.01) return;
    ctx.save(); ctx.globalAlpha *= a0; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 띠
    for (let k = 0; k < 4; k++) {
      const fr = o.fr[k]; if (fr <= 0.001) continue;
      const i0 = L.start[k], n = Math.floor((L.end[k] - i0) * fr);
      if (n < 2) continue;
      let col = 'rgba(210,240,255,.34)';
      if (o.mode === 'temp') col = k === 1 ? 'rgba(255,92,50,.52)' : k === 3 ? 'rgba(40,90,230,.5)' : 'rgba(255,255,255,.3)';
      ctx.strokeStyle = col; ctx.lineWidth = 17; ctx.beginPath();
      for (let j = 0; j < n; j++) { const i = i0 + j; if (j) ctx.lineTo(L.X[i], L.Y[i]); else ctx.moveTo(L.X[i], L.Y[i]); }
      ctx.stroke();
    }
    // 화살촉
    const sp = 120, off = (t * 26) % sp;
    for (let s = off; s < L.L; s += sp) {
      const p = loopAt(s), a = segFrac(p.i, o.fr); if (a < 0.05) continue;
      const ang = Math.atan2(p.ty, p.tx), c = Math.cos(ang), sn = Math.sin(ang);
      ctx.strokeStyle = 'rgba(20,50,100,' + (0.45 * a) + ')'; ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(p.x - c * 8 - sn * 7, p.y - sn * 8 + c * 7); ctx.lineTo(p.x + c * 3, p.y + sn * 3); ctx.lineTo(p.x - c * 8 + sn * 7, p.y - sn * 8 - c * 7); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * a) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p.x - c * 8 - sn * 7, p.y - sn * 8 + c * 7); ctx.lineTo(p.x + c * 3, p.y + sn * 3); ctx.lineTo(p.x - c * 8 + sn * 7, p.y - sn * 8 - c * 7); ctx.stroke();
    }
    // 흐르는 입자와 꼬리
    FP.forEach((p) => {
      const q = loopAt(p.s), a = segFrac(q.i, o.fr); if (a < 0.05) return;
      const tl = Math.hypot(q.tx, q.ty) || 1, nx = -q.ty / tl, ny = q.tx / tl;
      const tail = [];
      for (let j = 0; j < 7; j++) { const r = loopAt(p.s - j * 5); const tl2 = Math.hypot(r.tx, r.ty) || 1; tail.push([r.x - r.ty / tl2 * p.off, r.y + r.tx / tl2 * p.off]); }
      ctx.beginPath(); ctx.moveTo(tail[0][0], tail[0][1]); for (let j = 1; j < 7; j++) ctx.lineTo(tail[j][0], tail[j][1]);
      ctx.strokeStyle = 'rgba(15,45,95,' + (0.3 * a) + ')'; ctx.lineWidth = 4.2; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * a) + ')'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tail[0][0], tail[0][1]); ctx.lineTo(tail[2][0], tail[2][1]);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * a) + ')'; ctx.lineWidth = 3; ctx.stroke();
    });
    ctx.restore();
  }
  function drawMapBase(sstA) {
    blit(oceanSprite(), VW / 2, VH / 2, 1);
    if (sstA > 0.01) blit(sstSprite(), VW / 2, VH / 2, sstA);
    blit(landSprite(), VW / 2, VH / 2, 1);
  }
  const LABELS_LAND = [['아시아', 112, 48, 'left'], ['일본', 140, 39.5, 'c'], ['북아메리카', 241, 46, 'c'], ['필리핀', 120, 13, 'c']];
  function drawLandLabels() {
    LABELS_LAND.forEach((q) => D.text(mx(q[1]) + (q[3] === 'left' ? 6 : 0), my(q[2]), q[0], { size: 14, weight: 800, color: 'rgba(110,90,50,.85)', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4, align: q[3] === 'left' ? 'left' : 'center' }));
  }

  /* =========================================================
     장면 2 · 북태평양 순환 (바람 → 해류 → 대륙에 막힘 → 시계 방향 순환)
     ========================================================= */
  const PHASES = ['① 바람', '② 해류 생성', '③ 대륙에 막혀 꺾임', '④ 순환 완성'];
  const phaseOf = (p) => (p < 0.05 ? -1 : p < 0.25 ? 0 : p < 0.5 ? 1 : p < 0.8 ? 2 : 3);
  const frOf = (p) => [sstep(0.25, 0.5, p), sstep(0.5, 0.8, p), sstep(0.25, 0.5, p), sstep(0.55, 0.85, p)];
  const CAPS = ['▶ 재생을 누르거나 슬라이더를 밀어 보세요', '지속적으로 부는 바람: 무역풍과 편서풍 (앞 단원의 대기 대순환)', '바람이 표층 해류를 만들어요: 북적도 해류(동→서) · 북태평양 해류(서→동)', '해류가 대륙에 막혀 남북으로 꺾여요: 쿠로시오 해류 · 캘리포니아 해류', '시계 방향 순환 완성! 북태평양 아열대 순환'];
  const TRAY_Y = 548, CARD_W = 178, CARD_H = 40;
  const HOME_ORDER = [1, 3, 0, 2];
  (function initCards() {
    for (let k = 0; k < 4; k++) {
      const hx = 12 + CARD_W / 2 + HOME_ORDER.indexOf(k) * 196;
      S2.cards.push({ id: k, name: CUR[k].name, hx, hy: TRAY_Y, x: hx, y: TRAY_Y + 80, slot: -1, sc: 1, lift: 0, shake: 0, wrong: false, ok: false });
    }
    S2.order = [0, 1, 2, 3];
  })();
  function s2ResetCards() {
    S2.cards.forEach((c) => { c.slot = -1; c.wrong = false; c.ok = false; c.x = c.hx; c.y = TRAY_Y + 20; });
    S2.placed = [-1, -1, -1, -1]; S2.checked = false;
  }
  function cardTarget(c) { if (c.slot >= 0) { const s = slotPx(c.slot); return { x: s.x, y: s.y }; } return { x: c.hx, y: c.hy }; }
  function cardAt(p) {
    for (let q = 3; q >= 0; q--) { const c = S2.cards[S2.order[q]]; if (Math.abs(p.x - c.x) <= CARD_W / 2 + 6 && Math.abs(p.y - c.y) <= CARD_H / 2 + 8) return c; }
    return null;
  }
  function dropCard(c) {
    let best = -1, bd = 95;
    for (let k = 0; k < 4; k++) { const s = slotPx(k), d = Math.hypot(c.x - s.x, c.y - s.y * 1); if (d < bd) { bd = d; best = k; } }
    const prev = c.slot;
    if (best >= 0) {
      const other = S2.cards.find((q) => q !== c && q.slot === best);
      if (other) { other.slot = -1; other.wrong = false; }
      c.slot = best;
    } else c.slot = -1;
    c.wrong = false; c.ok = false; S2.checked = false;
    S2.placed = [-1, -1, -1, -1]; S2.cards.forEach((q) => { if (q.slot >= 0) S2.placed[q.slot] = q.id; });
    Sound.tick();
    if (best >= 0 && c.slot === c.id) pfx.burst(slotPx(best).x, slotPx(best).y, { count: 6, speed: 70, life: 0.5, colors: ['#fff', '#7dd3fc'] });
  }
  function s2CardsCheck() {
    const miss = S2.cards.filter((c) => c.slot < 0).length;
    if (miss) return '아직 ' + miss + '장이 남았어요. 카드를 끌어 해류 옆에 놓아 보세요.';
    const bad = S2.cards.filter((c) => c.slot !== c.id);
    if (bad.length) {
      bad.forEach((c) => { if (!c.wrong) { c.wrong = true; c.shake = 1; } });
      return bad[0].name + ' 카드를 다시 생각해 보세요. 힌트: ' + CUR[bad[0].id].hint;
    }
    S2.cards.forEach((c) => { c.ok = true; });
    return true;
  }
  function updateS2(dt) {
    if (S2.playing) {
      S2.p = Math.min(1, S2.p + dt / 15);
      if (S2.p >= 1) S2.playing = false;
    }
    S2.tray = approach(S2.tray, S2.p >= 0.995 ? 1 : 0, dt, 5);
    S2.spinA = (S2.spinA + dt * 0.9) % TAU;
    S2.cards.forEach((c) => {
      if (S2.drag === c.id) { c.lift = approach(c.lift, 1, dt, 14); return; }
      const tg = cardTarget(c);
      if (c.slot < 0 && S2.tray < 0.5) tg.y = TRAY_Y + 90;
      c.x = approach(c.x, tg.x, dt, 14); c.y = approach(c.y, tg.y, dt, 14);
      c.lift = approach(c.lift, 0, dt, 12); c.shake = Math.max(0, c.shake - dt * 2.5);
    });
  }
  function windLane(y, x0, x1, dir, a, t) {
    if (a < 0.02) return;
    alphaDo(a, () => {
      ctx.fillStyle = 'rgba(255,255,255,.14)'; D.roundRect(Math.min(x0, x1), y - 19, Math.abs(x1 - x0), 38, 19); ctx.fill();
      const sp = 44, off = (t * 56) % sp;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let x = (dir > 0 ? x0 : x1) + dir * off; dir > 0 ? x < x1 - 8 : x > x0 + 8; x += dir * sp) {
        const f = Math.min(1, Math.min(Math.abs(x - x0), Math.abs(x1 - x)) / 30);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * f) + ')'; ctx.lineWidth = 4.2;
        ctx.beginPath(); ctx.moveTo(x - dir * 9, y - 9); ctx.lineTo(x, y); ctx.lineTo(x - dir * 9, y + 9); ctx.stroke();
      }
    });
  }
  function drawCard(c, t) {
    const sh = Math.sin(c.shake * 30) * 5 * Math.min(1, c.shake * 3);
    const x = c.x + sh, y = c.y - c.lift * 8, sc = 1 + c.lift * 0.06;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    const col = c.ok ? '#16a34a' : c.wrong ? '#e11d48' : '#0ea5e9';
    D.shadow(() => { D.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12); ctx.fillStyle = c.ok ? '#e8f9ee' : '#ffffff'; ctx.fill(); }, { blur: 8 + c.lift * 12, y: 3 + c.lift * 6, color: 'rgba(15,40,80,.35)' });
    D.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 12); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    D.text(0, 6, c.name, { size: 16, weight: 800, color: c.ok ? '#166534' : '#14395c' });
    if (c.ok) D.check(CARD_W / 2 - 4, -CARD_H / 2 + 4, 11, 1);
    ctx.restore();
  }
  function drawS2(t) {
    ctx.fillStyle = '#dbe9f4'; ctx.fillRect(0, 0, VW, VH);
    drawMapBase(0);
    const p = S2.p, fr = frOf(p), ph = phaseOf(p);
    // 바람
    const wa = sstep(0.02, 0.2, p);
    const wl = [[my(22), mx(150), mx(210), -1], [my(9), mx(150), mx(204), -1], [my(51), mx(165), mx(225), 1], [my(34.5), mx(188), mx(236), 1]];
    wl.forEach((w) => windLane(w[0], w[1], w[2], w[3], wa, t));
    alphaDo(wa, () => {
      D.label(mx(150) + 4, my(22) - 31, '무역풍 (동 → 서)', { bg: 'rgba(100,70,160,.92)', size: 14, align: 'left' });
      D.label(mx(165) + 4, my(51) - 31, '편서풍 (서 → 동)', { bg: 'rgba(190,80,50,.92)', size: 14, align: 'left' });
    });
    drawFlow(t, { fr, mode: 'plain', alpha: 1 });
    drawLandLabels();
    // 대륙에 막혀 꺾이는 곳 강조
    if (ph === 2) {
      D.ring(mx(126.5), my(17.5), 22, t, { color: '#fde047', width: 3 });
      D.ring(mx(228), my(45), 22, t, { color: '#fde047', width: 3 });
    }
    // 시계 방향 표시
    const ca = sstep(0.82, 1, p);
    if (ca > 0.01) alphaDo(ca, () => {
      const cx = mx(186), cy = my(29), r = 46;
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      const a0 = S2.spinA, a1 = a0 + Math.PI * 1.55;
      ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
      const hx = cx + Math.cos(a1) * r, hy = cy + Math.sin(a1) * r, ang = a1 + Math.PI / 2;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(hx + Math.cos(ang) * 14, hy + Math.sin(ang) * 14); ctx.lineTo(hx + Math.cos(ang + 2.3) * 12, hy + Math.sin(ang + 2.3) * 12); ctx.lineTo(hx + Math.cos(ang - 2.3) * 12, hy + Math.sin(ang - 2.3) * 12); ctx.closePath(); ctx.fill();
      D.label(cx, cy + 4, '시계 방향', { bg: 'rgba(20,50,100,.85)', size: 14 });
    });
    // 해류 이름 (카드로 맞춘 뒤, 또는 순환 완성 후 자유 탐구에서)
    // 안내 문구
    const ci = ph + 1;
    card(60, 12, 680, 40, { r: 20, bg: 'rgba(255,255,255,.95)', blur: 10 });
    D.text(400, 38, CAPS[ci], { size: 15, weight: 800, color: '#14395c' });
    // 아래쪽: 단계 표시 또는 카드 상자
    const trayA = S2.tray;
    alphaDo(1 - trayA, () => {
      for (let k = 0; k < 4; k++) {
        const on = ph >= k, cur = ph === k, x = 14 + k * 195, y = 480;
        card(x, y, 184, 86, { r: 14, bg: on ? '#fff' : 'rgba(255,255,255,.55)', border: cur ? '#0ea5e9' : null, bw: 3, blur: on ? 10 : 4 });
        D.text(x + 92, y + 30, PHASES[k], { size: 15.5, weight: 800, color: on ? '#14395c' : '#94a3b8' });
        const sub = ['무역풍 · 편서풍', '동→서 · 서→동', '남북으로 방향 바뀜', '시계 방향으로 돌아요'][k];
        D.text(x + 92, y + 56, sub, { size: 13.5, weight: 700, color: on ? '#587390' : '#a8b5c3' });
      }
    });
    if (trayA > 0.02) {
      alphaDo(trayA, () => {
        ctx.save(); ctx.translate(0, (1 - trayA) * 40);
        card(0, 462, 800, 138, { r: 0, bg: 'rgba(255,255,255,.88)', blur: 12 });
        D.text(400, 490, S2.cards.every((c) => c.ok) ? '🎉 모두 맞았어요!' : '해류 이름 카드를 끌어서 알맞은 해류 옆 ○ 안에 놓아요', { size: 15.5, weight: 800, color: '#14395c' });
        ctx.restore();
      });
      // 칸(슬롯)
      alphaDo(trayA, () => {
        for (let k = 0; k < 4; k++) {
          const s = slotPx(k), occ = S2.cards.some((c) => c.slot === k);
          if (!occ) {
            ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ellipse(s.x, s.y, 27, 27); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255,255,255,.22)'; ellipse(s.x, s.y, 27, 27); ctx.fill();
            D.text(s.x, s.y + 7, '?', { size: 20, weight: 800, color: '#fff', stroke: 'rgba(0,50,120,.5)', strokeWidth: 4 });
          }
          if (S2.drag >= 0) { const c = S2.cards[S2.drag]; if (Math.hypot(c.x - s.x, c.y - s.y) < 95) D.ring(s.x, s.y, 30, t, { color: '#fde047' }); }
        }
      });
      S2.order.forEach((id) => drawCard(S2.cards[id], t));
    }
  }

  /* =========================================================
     장면 3 · 난류와 한류 · 표류병
     ========================================================= */
  const bottleSprite = () => sprite('bottle', 44, 56, (g, w, h, d) => {
    g.translate(22, 30);
    g.fillStyle = 'rgba(40,110,80,.28)'; g.beginPath(); g.ellipse(2, 20, 12, 4, 0, 0, TAU); g.fill();
    const gr = g.createLinearGradient(-9, 0, 9, 0); gr.addColorStop(0, 'rgba(190,255,215,.95)'); gr.addColorStop(0.5, 'rgba(120,220,170,.9)'); gr.addColorStop(1, 'rgba(60,170,120,.95)');
    g.fillStyle = gr; d.roundRect(-9, -8, 18, 28, 8); g.fill();
    g.fillRect(-4, -18, 8, 12);
    g.strokeStyle = 'rgba(30,100,70,.75)'; g.lineWidth = 1.6; d.roundRect(-9, -8, 18, 28, 8); g.stroke(); g.strokeRect(-4, -18, 8, 12);
    g.fillStyle = '#c98a4b'; d.roundRect(-5, -23, 10, 7, 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.95)'; d.roundRect(-4, -2, 8, 16, 2); g.fill();
    g.strokeStyle = 'rgba(200,80,80,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-2, 3); g.lineTo(2, 3); g.moveTo(-2, 7); g.lineTo(2, 7); g.moveTo(-2, 11); g.lineTo(2, 11); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.6)'; d.roundRect(-7, -5, 3, 20, 2); g.fill();
  });
  const MAPBOX = { x: 0, y: MY0, w: 800, h: MAPH };
  function dropBottle(x, y, quiet) {
    if (isLand(x, y)) { if (!quiet) toast('🏝️ 육지예요. 바다를 눌러 주세요.', null, 1800); Sound.fail(); return false; }
    S3.bottle = { x, y, vx: 0, vy: 0, pop: 0, ph: Math.random() * TAU, c: 0, seg: -1, travel: 0, rot: 0 };
    S3.trail = []; S3.trailT = 0; S3.kuroDone = false; S3.done = 0;
    pfx.burst(x, y, { count: 10, speed: 70, life: 0.5, colors: ['#fff', '#7dd3fc'], gravity: 0 });
    Sound.tick();
    return true;
  }
  function updateS3(dt) {
    S3.sstA = approach(S3.sstA, S3.sst, dt, 4);
    S3.selT = Math.max(0, S3.selT - dt);
    S3.done = Math.max(0, S3.done - dt * 0.4);
    const b = S3.bottle; if (!b) return;
    b.pop = Math.min(1, b.pop + dt * 3);
    if (S3.dragging) { b.vx = b.vy = 0; return; }
    const nl = nearestLoop(b.x, b.y), i = nl.i, N = LOOP.N, j = (i + 1) % N;
    const tl = Math.hypot(LOOP.X[j] - LOOP.X[i], LOOP.Y[j] - LOOP.Y[i]) || 1, tx = (LOOP.X[j] - LOOP.X[i]) / tl, ty = (LOOP.Y[j] - LOOP.Y[i]) / tl;
    const c = Math.exp(-Math.pow(nl.d / 40, 2)); b.c = c; b.seg = LOOP.seg[i];
    const sp = BASE * SEG_MUL[b.seg];
    b.ph += dt * 0.5;
    const tvx = tx * sp * c + (1 - c) * Math.cos(b.ph) * 4 + (LOOP.X[i] - b.x) * 1.3 * c;
    const tvy = ty * sp * c + (1 - c) * Math.sin(b.ph) * 4 + (LOOP.Y[i] - b.y) * 1.3 * c;
    b.vx = approach(b.vx, tvx, dt, 3); b.vy = approach(b.vy, tvy, dt, 3);
    const ox = b.x, oy = b.y;
    b.x = clamp(b.x + b.vx * dt, 12, 788); b.y = clamp(b.y + b.vy * dt, MY0 + 12, MY0 + MAPH - 12);
    if (isLand(b.x, b.y)) { if (c > 0.15) { b.x = LOOP.X[i]; b.y = LOOP.Y[i]; } else { b.x = ox; b.y = oy; b.vx = -b.vx * 0.5; b.vy = -b.vy * 0.5; b.ph += 2; } }
    b.rot = approach(b.rot, clamp(b.vx / 40, -0.5, 0.5), dt, 4);
    if (b.seg === 1 && c > 0.3) b.travel += Math.hypot(b.vx, b.vy) * dt;
    S3.trailT += dt;
    if (S3.trailT > 0.14) { S3.trailT = 0; S3.trail.push({ x: b.x, y: b.y }); if (S3.trail.length > 150) S3.trail.shift(); }
    const loc = (i - LOOP.start[1]) / (LOOP.end[1] - LOOP.start[1]);
    if (!S3.kuroDone && b.seg === 1 && loc > 0.82 && nl.d < 42 && b.travel > 110) {
      S3.kuroDone = true; S3.done = 1; Sound.success(); pBurst(b.x, b.y, 26);
    }
  }
  function bottleMsg() {
    const b = S3.bottle;
    if (!b) return '바다를 눌러 표류병을 띄워 보세요.';
    if (S3.kuroDone) return '🎉 표류병이 쿠로시오 해류를 따라 일본 남쪽 바다까지 왔어요!';
    if (b.c > 0.5) return CUR[b.seg].name + '를 따라 흘러가요.';
    return '해류 밖이라 거의 움직이지 않아요. 해류 위로 옮겨 보세요.';
  }
  function drawS3(t) {
    ctx.fillStyle = '#dbe9f4'; ctx.fillRect(0, 0, VW, VH);
    drawMapBase(S3.sstA);
    drawFlow(t, { fr: [1, 1, 1, 1], mode: S3.sstA > 0.5 ? 'temp' : 'plain', alpha: 1 });
    drawLandLabels();
    CUR.forEach((c) => {
      const s = slotPx(c.id);
      D.label(s.x, s.y, c.name, { bg: S3.sel === c.id ? '#0b5fa5' : 'rgba(20,50,100,.85)', size: 14 });
      if (c.id === 1) D.label(s.x, s.y + 28, '난류', { bg: '#e8470f', size: 13.5, pad: 10 });
      if (c.id === 3) D.label(s.x, s.y + 28, '한류', { bg: '#2563eb', size: 13.5, pad: 10 });
    });
    // 표류병 흔적
    if (S3.trail.length > 1) {
      ctx.save(); ctx.lineCap = 'round'; ctx.setLineDash([2, 7]);
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3;
      ctx.beginPath(); S3.trail.forEach((q, i) => { if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke(); ctx.restore();
    }
    const b = S3.bottle;
    if (b) {
      const sc = EZ.outBack(Math.min(1, b.pop)) * (S3.dragging ? 1.25 : 1), bob = Math.sin(t * 2.4 + b.ph) * 1.8;
      ctx.save(); ctx.translate(b.x, b.y + bob); ctx.rotate(0.45 + b.rot + Math.sin(t * 1.7 + b.ph) * 0.08); ctx.scale(sc, sc);
      if (S3.dragging) D.shadow(() => blit(bottleSprite(), 0, 0, 1), { blur: 14, y: 8 }); else blit(bottleSprite(), 0, 0, 1);
      ctx.restore();
      if (S3.done > 0.01) D.check(b.x + 24, b.y - 26, 14 * EZ.outBack(Math.min(1, (1 - S3.done) * 5)), 1);
    }
    // 아래 패널
    const py = 452;
    card(10, py, 388, 140, { r: 14 });
    D.text(26, py + 28, '🌡️ 해수면 온도 (예시 자료)', { size: 15, weight: 800, color: '#14395c', align: 'left' });
    const bx = 28, bw = 354, by = py + 42;
    const lg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    SST_STOPS.forEach((s) => lg.addColorStop(s[0] / 30, s[1]));
    ctx.fillStyle = lg; D.roundRect(bx, by, bw, 16, 8); ctx.fill();
    [0, 10, 20, 30].forEach((v) => D.text(bx + v / 30 * bw, by + 36, v + ' °C', { size: 12.5, weight: 700, color: '#475569' }));
    D.text(bx, by + 56, '차가움', { size: 13, weight: 800, color: '#2563eb', align: 'left' });
    D.text(bx + bw, by + 56, '따뜻함', { size: 13, weight: 800, color: '#e8470f', align: 'right' });
    if (S3.sstA < 0.5) D.text(bx + bw / 2, by + 56, '🌡️ 켜면 색이 보여요', { size: 13, weight: 800, color: '#64748b' });
    card(410, py, 380, 140, { r: 14 });
    if (S3.sel >= 0 && S3.selT > 0) {
      const c = CUR[S3.sel];
      D.text(426, py + 30, c.name, { size: 16.5, weight: 800, color: '#0b5fa5', align: 'left' });
      if (S3.sel === 1) D.label(774, py + 26, '난류', { bg: '#e8470f', size: 13.5, align: 'right' });
      if (S3.sel === 3) D.label(774, py + 26, '한류', { bg: '#2563eb', size: 13.5, align: 'right' });
      ctx.font = D.font(14, 700);
      wrapText(c.info, 346).slice(0, 4).forEach((ln, k) => D.text(426, py + 58 + k * 21, ln, { size: 14, weight: 700, color: '#334155', align: 'left' }));
    } else {
      D.text(426, py + 30, '🍾 표류병', { size: 16.5, weight: 800, color: '#0b5fa5', align: 'left' });
      ctx.font = D.font(14.5, 700);
      wrapText(bottleMsg(), 346).slice(0, 3).forEach((ln, k) => D.text(426, py + 60 + k * 22, ln, { size: 14.5, weight: 700, color: S3.kuroDone ? '#15803d' : '#334155', align: 'left' }));
      D.text(426, py + 126, '해류 이름을 누르면 설명이 나와요', { size: 12.5, weight: 700, color: '#94a3b8', align: 'left' });
    }
  }
  function wrapText(text, maxW) {
    const out = []; let line = '';
    text.split(' ').forEach((w) => {
      const tt = line ? line + ' ' + w : w;
      if (ctx.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt;
    });
    if (line) out.push(line);
    return out;
  }

  /* =========================================================
     장면 4 · 해류와 기후 (도쿄 vs 샌프란시스코, 해류 끄기 생각 실험)
     ========================================================= */
  const MK = 0.78, MOX = 8, MOY = 36 - MY0 * MK;
  const sx4 = (x) => MOX + x * MK, sy4 = (y) => MOY + y * MK;
  const CITIES = [
    { name: '도쿄', lon: 139.7, lat: 35.7, aug: 27, cur: '쿠로시오 해류 (난류)', col: '#e8470f', icon: '🏙️', note: '난류가 흘러서 여름이 더워요.' },
    { name: '샌프란시스코', lon: 237.6, lat: 37.8, aug: 17, cur: '캘리포니아 해류 (한류)', col: '#2563eb', icon: '🌉', note: '한류가 흘러서 여름이 서늘하고 안개가 잦아요.' },
  ];
  function updateS4(dt) {
    S4.offA = approach(S4.offA, S4.off ? 1 : 0, dt, 2.2);
    S4.bars[0] = approach(S4.bars[0], S4.city !== 1 ? CITIES[0].aug : 0, dt, 5);
    S4.bars[1] = approach(S4.bars[1], S4.city !== 0 ? CITIES[1].aug : 0, dt, 5);
    if (S4.off) S4.offSeen += dt;
  }
  function cityRect(i) { return { x: 644, y: 36 + i * 150, w: 148, h: 140 }; }
  function drawS4(t) {
    ctx.fillStyle = '#e4eef6'; ctx.fillRect(0, 0, VW, VH);
    const off = S4.offA;
    // 지도
    ctx.save();
    D.roundRect(MOX, 36, 800 * MK, MAPH * MK, 12); ctx.clip();
    ctx.translate(MOX, MOY); ctx.scale(MK, MK);
    drawMapBase(0.72);
    if (off > 0.01) {
      let g = ctx.createLinearGradient(0, my(0), 0, my(30)); g.addColorStop(0, 'rgba(255,60,30,' + 0.5 * off + ')'); g.addColorStop(1, 'rgba(255,60,30,0)');
      ctx.fillStyle = g; ctx.fillRect(0, my(30), 800, my(0) - my(30));
      g = ctx.createLinearGradient(0, my(58), 0, my(36)); g.addColorStop(0, 'rgba(40,70,255,' + 0.55 * off + ')'); g.addColorStop(1, 'rgba(40,70,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, my(58), 800, my(36) - my(58));
    }
    drawFlow(t, { fr: [1, 1, 1, 1], mode: 'temp', alpha: 1 - off });
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; D.roundRect(MOX, 36, 800 * MK, MAPH * MK, 12); ctx.stroke();
    D.text(MOX + 12, 30, '북태평양 해류 지도', { size: 14.5, weight: 800, color: '#14395c', align: 'left' });
    alphaDo(1 - off, () => {
      D.label(sx4(mx(150)), sy4(my(27)), '쿠로시오 해류 (난류)', { bg: '#e8470f', size: 12.5 });
      D.label(sx4(mx(223)), sy4(my(26)), '캘리포니아 해류 (한류)', { bg: '#2563eb', size: 12.5 });
    });
    alphaDo(off, () => {
      D.label(sx4(mx(180)), sy4(my(8)), '저위도: 더 뜨거워요', { bg: '#dc2626', size: 13.5 });
      D.label(sx4(mx(180)), sy4(my(53)), '고위도: 더 추워요', { bg: '#1d4ed8', size: 13.5 });
      D.label(sx4(mx(180)), sy4(my(30)), '🌊 해류 없음', { bg: 'rgba(30,41,59,.85)', size: 14 });
    });
    // 도시 표시
    CITIES.forEach((c, i) => {
      const x = sx4(mx(c.lon)), y = sy4(my(c.lat)), on = S4.city === i || S4.city === 2;
      if (on) D.ring(x, y, 11, t, { color: c.col, width: 3 });
      D.sphere(x, y, 7, c.col, { shadow: true });
      D.label(x + (i ? -12 : 12), y - 18, c.name, { bg: c.col, size: 13, align: i ? 'right' : 'left' });
    });
    // 도시 카드
    CITIES.forEach((c, i) => {
      const r = cityRect(i), on = S4.city === i || S4.city === 2;
      card(r.x, r.y, r.w, r.h, { r: 14, bg: on ? '#fff' : 'rgba(255,255,255,.7)', border: on ? c.col : null, bw: 3, blur: on ? 12 : 6 });
      D.text(r.x + r.w / 2, r.y + 34, c.icon, { size: 26, weight: 700 });
      D.text(r.x + r.w / 2, r.y + 58, c.name, { size: 16, weight: 800, color: c.col });
      D.text(r.x + r.w / 2, r.y + 80, '8월 평균 기온', { size: 12.5, weight: 700, color: '#64748b' });
      D.text(r.x + r.w / 2, r.y + 108, c.aug + ' °C', { size: 26, weight: 800, color: '#14395c' });
      D.text(r.x + r.w / 2, r.y + 128, c.cur.split(' ')[0], { size: 12.5, weight: 800, color: c.col });
    });
    // 막대 그래프
    const cx0 = 10, cy0 = 342, cw = 410, ch = 250;
    card(cx0, cy0, cw, ch, { r: 14 });
    D.text(cx0 + 16, cy0 + 28, '8월 평균 기온 (예시 자료)', { size: 15, weight: 800, color: '#14395c', align: 'left' });
    const base = cy0 + ch - 50, topY = cy0 + 58, k = (base - topY) / 30;
    ctx.strokeStyle = 'rgba(100,116,139,.35)'; ctx.lineWidth = 1;
    [0, 10, 20, 30].forEach((v) => { const y = base - v * k; ctx.beginPath(); ctx.moveTo(cx0 + 56, y); ctx.lineTo(cx0 + cw - 20, y); ctx.stroke(); D.text(cx0 + 48, y + 4, String(v), { size: 12.5, weight: 700, color: '#64748b', align: 'right' }); });
    D.text(cx0 + 30, topY - 14, '°C', { size: 12.5, weight: 800, color: '#64748b' });
    const bxs = [cx0 + 110, cx0 + 250];
    CITIES.forEach((c, i) => {
      const h = S4.bars[i] * k, x = bxs[i];
      if (h > 0.5) {
        const g = ctx.createLinearGradient(x, 0, x + 70, 0); g.addColorStop(0, shade(c.col, 0.25)); g.addColorStop(1, shade(c.col, -0.2));
        D.shadow(() => { D.roundRect(x, base - h, 70, h, 8); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3 });
        ctx.fillStyle = 'rgba(255,255,255,.35)'; D.roundRect(x + 8, base - h + 6, 10, Math.max(0, h - 14), 5); ctx.fill();
        D.text(x + 35, base - h - 8, S4.bars[i].toFixed(0) + ' °C', { size: 16, weight: 800, color: '#14395c' });
      }
      D.text(x + 35, base + 22, c.name, { size: 14, weight: 800, color: S4.bars[i] > 0.5 ? c.col : '#cbd5e1' });
      D.text(x + 35, base + 40, c.cur.split(' ')[0], { size: 12, weight: 700, color: S4.bars[i] > 0.5 ? '#64748b' : '#cbd5e1' });
    });
    if (S4.bars[0] > 20 && S4.bars[1] > 12) {
      const a = Math.min(1, (Math.min(S4.bars[0], 27) / 27) * (Math.min(S4.bars[1], 17) / 17));
      alphaDo(a, () => {
        const y0 = base - 27 * k, y1 = base - 17 * k, xm = bxs[1] + 70 + 18;
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bxs[1] + 72, y0); ctx.lineTo(xm + 6, y0); ctx.stroke(); ctx.setLineDash([]);
        D.arrow(xm, y0 + 2, xm, y1 - 2, { color: '#475569', width: 3, head: 9 });
        D.arrow(xm, y1 - 2, xm, y0 + 2, { color: '#475569', width: 3, head: 9 });
        D.label(xm, y0 - 16, '약 10 °C 차이', { bg: '#475569', size: 12.5 });
      });
    }
    // 해류 역할 패널
    const rx0 = 432, ry0 = 342, rw = 358, rh = 250;
    card(rx0, ry0, rw, rh, { r: 14 });
    D.text(rx0 + 16, ry0 + 28, off > 0.5 ? '해류가 없다면? (생각 실험)' : '해류가 하는 일', { size: 15, weight: 800, color: off > 0.5 ? '#b91c1c' : '#14395c', align: 'left' });
    const gx0 = rx0 + 52, gx1 = rx0 + rw - 22, gy0 = ry0 + 92, gy1 = ry0 + 176;
    ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 6); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    D.text(gx0 - 6, gy0 + 6, '높음', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    D.text(gx0 - 6, gy1 - 2, '낮음', { size: 12, weight: 700, color: '#64748b', align: 'right' });
    D.text(gx0 + 4, gy1 + 17, '저위도', { size: 12.5, weight: 800, color: '#dc2626', align: 'left' });
    D.text(gx1, gy1 + 17, '고위도', { size: 12.5, weight: 800, color: '#1d4ed8', align: 'right' });
    D.text(gx0 + (gx1 - gx0) / 2, gy1 + 17, '위도 →', { size: 12, weight: 700, color: '#94a3b8' });
    D.text(rx0 + 18, gy0 - 6, '기온', { size: 12, weight: 800, color: '#64748b', align: 'left' });
    const cur = (x) => 0.12 + 0.62 * Math.pow(x, 1.25), none = (x) => 0.02 + 0.92 * Math.pow(x, 1.25);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 3.4; ctx.setLineDash(off > 0.5 ? [7, 6] : []); ctx.globalAlpha = off > 0.5 ? 0.5 : 1;
    ctx.beginPath(); for (let i = 0; i <= 24; i++) { const f = i / 24, x = gx0 + (gx1 - gx0) * f, y = gy0 + (gy1 - gy0) * cur(f); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    if (off > 0.02) {
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3.8; ctx.beginPath();
      const nmax = Math.floor(24 * off);
      for (let i = 0; i <= nmax; i++) { const f = i / 24, x = gx0 + (gx1 - gx0) * f, y = gy0 + (gy1 - gy0) * none(f); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    }
    D.label(gx0 + 70, gy0 + 4 + (gy1 - gy0) * cur(0.15) - 22, off > 0.5 ? '해류 있을 때' : '지금', { bg: 'rgba(51,65,85,.9)', size: 12, align: 'left' });
    if (off > 0.6) alphaDo(off, () => D.label(gx1 - 4, gy0 + (gy1 - gy0) * none(0.78) + 22, '해류가 없다면', { bg: '#dc2626', size: 12, align: 'right' }));
    ctx.lineCap = 'butt';
    if (off < 0.5) {
      alphaDo(1 - off * 2, () => D.arrow(gx0 + 40, ry0 + 66, gx1 - 30, ry0 + 66, { color: '#e8470f', width: 7, head: 16, label: '열에너지 운반 (저위도 → 고위도)', labelOffset: -18, labelColor: '#c2410c' }));
    }
    ctx.font = D.font(14, 700);
    const msg = off > 0.5 ? '저위도는 지금보다 더 뜨거워지고, 고위도는 더 추워져요.' : '해류는 저위도의 남는 열에너지를 고위도로 옮겨 에너지를 재분배하고, 주변 기후에 영향을 줘요.';
    wrapText(msg, rw - 36).slice(0, 3).forEach((ln, i) => D.text(rx0 + 18, ry0 + 218 + i * 20, ln, { size: 14, weight: 700, color: off > 0.5 ? '#991b1b' : '#334155', align: 'left' }));
  }

  /* =========================================================
     화면 전환 · 조작 · 읽기값
     ========================================================= */
  const DRAWS = [drawS1, drawS2, drawS3, drawS4];
  const lvl = () => (game ? (game.free ? 3 : game.level) : 0);
  function setScene(i) {
    if (i === S.scene) return;
    S.prev = S.scene; S.scene = i; S.fade = 0;
    SciSim.tween(S, { fade: 1 }, { duration: 0.45, ease: 'outCubic', onDone() { S.prev = -1; } });
    syncPanels();
  }
  function syncPanels() {
    $$('[data-scene]').forEach((n) => n.classList.toggle('is-off', +n.getAttribute('data-scene') !== S.scene));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.s === S.scene));
    updateReadouts(true);
  }
  function syncTabs() {
    const mx2 = lvl();
    $$('#sceneSeg button').forEach((b) => {
      const i = +b.dataset.s, was = b.disabled;
      b.disabled = i > mx2;
      if (was && !b.disabled && i === mx2 && i > 0) { b.classList.add('nudge'); setTimeout(() => b.classList.remove('nudge'), 3000); }
    });
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); setScene(+b.dataset.s); }));

  /* 장면 1 */
  function syncWindSeg() { $$('#windSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.w === S1.wind)); }
  $$('#windSeg button').forEach((b) => b.addEventListener('click', () => { setWind(+b.dataset.w); syncWindSeg(); }));
  $('#dirBtn').addEventListener('click', () => flipDir());
  /* 장면 2 */
  const GYRE = SciSim.bindRange($('#sGyre'), $('#oGyre'), (v) => '진행 ' + v + '%', (v) => { S2.p = v / 100; S2.playing = false; syncPlayBtn(); });
  function syncPlayBtn() { const b = $('#playBtn'); const l = S2.playing ? '⏸ 멈추기' : S2.p >= 0.995 ? '↺ 다시 재생' : S2.p > 0.01 ? '▶ 이어서 재생' : '▶ 재생'; if (b.textContent !== l) b.textContent = l; }
  $('#playBtn').addEventListener('click', () => {
    Sound.click();
    if (S2.playing) { S2.playing = false; return; }
    if (S2.p >= 0.995) { S2.p = 0; GYRE.set(0); }
    S2.playing = true;
  });
  /* 장면 3 */
  function syncSst() { const b = $('#sstBtn'); b.setAttribute('aria-pressed', S3.sst ? 'true' : 'false'); }
  $('#sstBtn').addEventListener('click', () => { S3.sst = S3.sst ? 0 : 1; syncSst(); Sound.click(); });
  $('#bottleBtn').addEventListener('click', () => { dropBottle(mx(KEYS[8][0]), my(KEYS[8][1]), true); S3.sel = -1; });
  /* 장면 4 */
  function syncCity() { $$('#citySeg button').forEach((b) => b.classList.toggle('on', +b.dataset.c === S4.city)); $('#offBtn').setAttribute('aria-pressed', S4.off ? 'true' : 'false'); }
  function setCity(c) { S4.city = c; S4.seen.add(c); syncCity(); Sound.click(); }
  $$('#citySeg button').forEach((b) => b.addEventListener('click', () => setCity(+b.dataset.c)));
  $('#offBtn').addEventListener('click', () => { S4.off = !S4.off; syncCity(); Sound.click(); });

  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 0) { S1.wind = 0; S1.dir = 1; syncWindSeg(); }
    else if (S.scene === 1) { S2.p = 0; S2.playing = false; GYRE.set(0); s2ResetCards(); }
    else if (S.scene === 2) { S3.bottle = null; S3.trail = []; S3.kuroDone = false; S3.sel = -1; }
    else { S4.off = false; S4.city = 0; syncCity(); }
  });

  /* 읽기값 */
  const rdCache = [];
  function setR(i, label, html) {
    const k = label + '|' + html;
    if (rdCache[i] === k) return;
    rdCache[i] = k;
    $('#rl' + i).textContent = label; $('#rv' + i).innerHTML = html;
  }
  let lastRd = 0;
  function updateReadouts(force) {
    const now = performance.now();
    if (!force && now - lastRd < 100) return;
    lastRd = now;
    if (S.scene === 0) {
      setR(0, '바람 세기', WIND_NAME[S1.wind]);
      setR(1, '종이 조각의 속력', vcmOf(S1.w).toFixed(1) + '<small>cm/s</small>');
      setR(2, '물이 흐르는 방향', S1.w < 0.3 ? '—' : S1.dir > 0 ? '→ 오른쪽' : '← 왼쪽');
    } else if (S.scene === 1) {
      const ph = phaseOf(S2.p);
      setR(0, '진행', Math.round(S2.p * 100) + '<small>%</small>');
      setR(1, '단계', ph < 0 ? '시작 전' : PHASES[ph].slice(2));
      setR(2, '맞게 놓은 카드', S2.cards.filter((c) => c.slot === c.id).length + '<small> / 4</small>');
    } else if (S.scene === 2) {
      const c = S3.sel >= 0 ? CUR[S3.sel] : null;
      setR(0, '선택한 해류', c ? c.name : '—');
      setR(1, '해수면 온도 지도', S3.sst ? '켜짐' : '꺼짐');
      setR(2, '표류병', !S3.bottle ? '아직 없음' : S3.kuroDone ? '쿠로시오 도착!' : S3.bottle.c > 0.5 ? '해류를 따라가요' : '거의 안 움직여요');
    } else {
      const c = S4.city === 2 ? null : CITIES[S4.city];
      setR(0, '도시', c ? c.name : '도쿄 vs 샌프란시스코');
      setR(1, '8월 평균 기온', c ? c.aug + '<small>°C (예시)</small>' : '27 vs 17<small>°C</small>');
      setR(2, '해류', S4.off ? '꺼짐 (생각 실험)' : c ? c.cur.split(' ')[0] : '난류 vs 한류');
    }
  }

  /* 터치·마우스 */
  const inMap = (p) => p.y >= MY0 && p.y <= MY0 + MAPH && p.x >= 0 && p.x <= 800;
  const pillHit = (p) => CUR.find((c) => { const s = slotPx(c.id); return Math.abs(p.x - s.x) < 72 && Math.abs(p.y - s.y) < 17; });
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 1 && S2.tray > 0.5) {
        const c = cardAt(p);
        if (c) {
          S2.drag = c.id; S2.dragDX = c.x - p.x; S2.dragDY = c.y - p.y;
          S2.order = S2.order.filter((i) => i !== c.id).concat(c.id); Sound.click(); return true;
        }
      } else if (S.scene === 2 && inMap(p)) {
        const b = S3.bottle;
        if (b && Math.hypot(p.x - b.x, p.y - b.y) < 30) { S3.dragging = true; S3.dragDX = b.x - p.x; S3.dragDY = b.y - p.y; return true; }
        const pill = pillHit(p);
        if (pill) { S3.sel = pill.id; S3.selT = 6; Sound.tick(); return false; }
        const nl = nearestLoop(p.x, p.y);
        if (nl.d < 22) { S3.sel = LOOP.seg[nl.i]; S3.selT = 6; }
        dropBottle(p.x, p.y);
      } else if (S.scene === 3) {
        for (let i = 0; i < 2; i++) { const r = cityRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { setCity(i); return false; } }
        CITIES.forEach((c, i) => { if (Math.hypot(p.x - sx4(mx(c.lon)), p.y - sy4(my(c.lat))) < 24) setCity(i); });
      }
      return false;
    },
    move(p) {
      if (S2.drag >= 0) { const c = S2.cards[S2.drag]; c.x = clamp(p.x + S2.dragDX, 70, 730); c.y = clamp(p.y + S2.dragDY, 70, VH - 20); }
      else if (S3.dragging && S3.bottle) { S3.bottle.x = clamp(p.x + S3.dragDX, 14, 786); S3.bottle.y = clamp(p.y + S3.dragDY, MY0 + 14, MY0 + MAPH - 14); }
    },
    up() {
      if (S2.drag >= 0) { const c = S2.cards[S2.drag]; S2.drag = -1; dropCard(c); }
      if (S3.dragging) {
        const b = S3.bottle; S3.dragging = false;
        if (b) { if (isLand(b.x, b.y)) { dropBottle(b.x, b.y, true); S3.bottle = null; toast('🏝️ 육지예요. 바다에 놓아 주세요.', null, 1800); } else { b.travel = 0; S3.trail = []; Sound.tick(); } }
      }
    },
    hover(p) {
      if (S.scene === 1 && S2.tray > 0.5 && cardAt(p)) return 'grab';
      if (S.scene === 2 && inMap(p)) return 'pointer';
      return '';
    },
  });

  /* =========================================================
     미션
     ========================================================= */
  const L1 = {
    title: '바람이 만드는 물의 흐름', short: '바람과 해류', icon: '🌬️', phase: '실험',
    features: ['tank'],
    intro: '<p class="si-q">❓ 탐구 질문: 바닷물은 왜 일정한 방향으로 흐르고, 그 흐름은 우리 기후에 어떤 영향을 줄까?</p>' +
      '<p>바닷물은 일정한 방향으로 오랫동안 흐르기도 해요. 이런 흐름을 <b>해류</b>라고 해요. 먼저 수조에 물과 종이 조각을 띄우고 <b>선풍기 바람</b>을 불어서, 바람이 물을 어떻게 움직이는지 실험해 봐요.</p>',
    setup() { setScene(0); },
    recap: '바람이 계속 불면 표면의 물이 <b>바람 방향</b>으로 흘러요. 바람이 셀수록 더 빨리 흘러요. 표층 해류는 주로 지속적으로 부는 <b>바람</b>이 만들어요.',
    summary: '<ul><li><b>해류</b>: 일정한 방향으로 오랫동안 흐르는 바닷물의 흐름.</li>' +
      '<li><b>표층 해류</b>는 주로 지속적으로 부는 <b>바람</b>(대기 대순환)에 의해 생겨요.</li>' +
      '<li>바람이 불면 표면의 물이 <b>바람과 같은 방향</b>으로 흐르고, 바람이 셀수록 흐름이 <b>빨라져요</b>.</li></ul>',
    missions: [
      {
        title: '바람의 세기 비교하기',
        goal: '바람 세기를 <b>약</b>과 <b>강</b>으로 바꿔 가며, 각각 2~3초 동안 종이 조각이 떠내려가는 빠르기를 비교하세요.',
        hint: '오른쪽에서 <b>약</b>을 누르고 잠시 지켜본 뒤 <b>강</b>을 눌러 봐요. 아래 눈금자(cm)로 거리를 가늠해요.',
        setup() { setScene(0); S1.wind = 0; S1.dir = 1; S1.obs = [0, 0, 0, 0]; syncWindSeg(); },
        check: () => S1.obs[1] >= 2 && S1.obs[3] >= 2,
        status: () => chk(S1.obs[1] >= 2, '약' + (S1.obs[1] >= 2 ? ' ' + vcmOf(1).toFixed(1) + ' cm/s' : '')) + ' · ' + chk(S1.obs[3] >= 2, '강' + (S1.obs[3] >= 2 ? ' ' + vcmOf(3).toFixed(1) + ' cm/s' : '')) + '<br>지금 바람: <b>' + WIND_NAME[S1.wind] + '</b>',
        hold: 0.8,
        explain: '바람이 셀수록 종이 조각(표면의 물)이 <b>더 빨리</b> 흘렀어요. 약한 바람에서는 느리게, 강한 바람에서는 빠르게 움직였어요.',
      },
      {
        title: '바람의 방향 바꾸기',
        goal: '<b>🔄 바람 방향 바꾸기</b>를 눌러 선풍기를 반대쪽으로 옮기고, 물이 어느 쪽으로 흐르는지 확인하세요.',
        hint: '바람이 불고 있을 때 방향을 바꿔야 해요. 두 방향 모두 2초쯤 지켜봐요.',
        setup() { setScene(0); S1.wind = 2; S1.dir = 1; S1.dirT = [0, 0]; syncWindSeg(); },
        check: () => S1.dirT[0] >= 2 && S1.dirT[1] >= 2,
        status: () => chk(S1.dirT[0] >= 2, '→ 오른쪽으로 부는 바람') + '<br>' + chk(S1.dirT[1] >= 2, '← 왼쪽으로 부는 바람'),
        hold: 0.8,
        explain: '물은 <b>바람이 부는 방향</b>으로 흘렀어요. 바람이 계속 불면 표면의 물이 바람 방향으로 끌려가요.',
      },
      {
        type: 'quiz', title: '표층 해류의 원인',
        goal: '바다의 표층 해류를 만드는 주된 원인은 무엇일까요?',
        choices: ['달과 태양의 인력', '지속적으로 부는 바람', '바닷물의 염분 차이', '바다 밑의 지진'],
        answer: 1,
        feedback: ['달과 태양의 인력은 밀물과 썰물(조석)을 만들어요. 실험에서 물을 움직인 것은 무엇이었나요?', '', '염분 차이로 생기는 흐름은 주로 깊은 바다에서 일어나요. 실험에서는 바람만 불었어요.', '실험에서는 바람만 불었는데 물이 흘렀어요.'],
        explain: '표층 해류는 주로 <b>지속적으로 부는 바람</b>이 바닷물의 표면을 끌어서 생겨요. 바람이 대기 대순환의 일부라는 것은 다음 단계에서 지도로 확인해요.',
      },
    ],
  };
  const L2 = {
    title: '북태평양의 순환', short: '북태평양 순환', icon: '🗺️', phase: '모형',
    features: ['gyre'],
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 바람이 표면의 물을 같은 방향으로 끈다는 것을 확인했어요. 대기 대순환에서 배운 <b>무역풍과 편서풍</b>도 지속적으로 부는 바람이에요.</div>' +
      '<p>북태평양 지도에서 무역풍과 편서풍이 만드는 <b>표층 해류</b>를 살펴보고, 해류가 대륙에 막혀 꺾이며 이어지는 <b>북태평양 아열대 순환</b>을 완성해 봐요.</p>',
    setup() { setScene(1); S2.p = 0; S2.playing = false; GYRE.set(0); s2ResetCards(); },
    recap: '무역풍은 <b>북적도 해류</b>(동→서), 편서풍은 <b>북태평양 해류</b>(서→동)를 만들고, 대륙에 막혀 <b>쿠로시오 해류</b>와 <b>캘리포니아 해류</b>가 이어져 <b>시계 방향 순환</b>이 돼요.',
    summary: '<ul><li><b>북적도 해류</b>: 무역풍에 의해 동 → 서로 흘러요.</li>' +
      '<li><b>쿠로시오 해류</b>: 대륙(아시아)에 막혀 서쪽 가장자리를 따라 북쪽으로 흘러요.</li>' +
      '<li><b>북태평양 해류</b>: 편서풍에 의해 서 → 동으로 흘러요.</li>' +
      '<li><b>캘리포니아 해류</b>: 대륙(북아메리카)에 막혀 동쪽 가장자리를 따라 남쪽으로 흘러요.</li>' +
      '<li>네 해류가 이어져 북태평양에 <b>시계 방향</b>의 아열대 순환을 이뤄요.</li></ul>',
    missions: [
      {
        title: '바람이 해류를 만드는 과정 보기',
        goal: '슬라이더를 오른쪽 끝까지 밀거나 <b>▶ 재생</b>을 눌러, 바람과 해류가 순환을 만드는 과정을 끝까지 지켜보세요.',
        hint: '슬라이더를 천천히 밀면 ① 바람 → ② 해류 → ③ 대륙에 막혀 꺾임 → ④ 순환 완성 순서로 보여요.',
        setup() { setScene(1); S2.p = 0; S2.playing = false; GYRE.set(0); s2ResetCards(); },
        check: () => S2.p >= 0.995,
        status: () => { const ph = phaseOf(S2.p); return '진행 <b>' + Math.round(S2.p * 100) + '%</b> · ' + (ph < 0 ? '아직 시작 전이에요' : '<b>' + PHASES[ph] + '</b>'); },
        hold: 0.6,
        explain: '무역풍과 편서풍이 <b>북적도 해류</b>와 <b>북태평양 해류</b>를 만들고, 이 해류가 대륙에 막혀 남북으로 꺾이며 <b>쿠로시오 해류</b>와 <b>캘리포니아 해류</b>가 이어져 시계 방향으로 한 바퀴 돌아요.',
      },
      {
        title: '해류 이름 카드 놓기', manual: true,
        goal: '해류 이름 카드 4장을 알맞은 해류 옆 <b>○</b>에 끌어다 놓고 <b>✔ 확인하기</b>를 누르세요.',
        hint: '북적도 해류는 무역풍을 따라 동→서, 쿠로시오 해류는 서쪽에서 북쪽으로, 북태평양 해류는 편서풍을 따라 서→동, 캘리포니아 해류는 동쪽에서 남쪽으로 흘러요.',
        setup() { setScene(1); S2.p = 1; S2.playing = false; GYRE.set(100); s2ResetCards(); },
        check: () => s2CardsCheck(),
        explain: '<b>북적도 해류</b>(무역풍, 동→서) → <b>쿠로시오 해류</b>(서쪽 가장자리, 남→북) → <b>북태평양 해류</b>(편서풍, 서→동) → <b>캘리포니아 해류</b>(동쪽 가장자리, 북→남)가 이어져 시계 방향으로 순환해요.',
      },
      {
        type: 'quiz', title: '바람과 해류의 관계',
        goal: '북적도 해류와 북태평양 해류는 각각 어떤 바람의 영향으로 생길까요?',
        choices: ['북적도 해류 - 편서풍 / 북태평양 해류 - 무역풍', '북적도 해류 - 무역풍 / 북태평양 해류 - 편서풍', '두 해류 모두 무역풍', '두 해류 모두 편서풍'],
        answer: 1,
        feedback: ['바람의 방향을 해류의 방향과 짝지어 보세요. 북적도 해류는 동에서 서로 흘러요.', '', '북태평양 해류는 서에서 동으로 흘러요. 무역풍은 동에서 서로 불어요.', '북적도 해류는 동에서 서로 흘러요. 편서풍은 서에서 동으로 불어요.'],
        explain: '<b>무역풍</b>(동→서)은 <b>북적도 해류</b>를, <b>편서풍</b>(서→동)은 <b>북태평양 해류</b>를 만들어요. 이렇게 대기 대순환의 바람이 해양 표층 순환을 만들어요.',
      },
    ],
  };
  const L3 = {
    title: '난류와 한류', short: '난류와 한류', icon: '🌡️', phase: '탐구',
    features: ['sst'],
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 네 해류가 이어져 시계 방향의 순환을 이룬다는 것을 알았어요.</div>' +
      '<p>해류의 물은 <b>따뜻할까요, 차가울까요?</b> <b>해수면 온도 지도</b>(예시 자료)를 켜 보고 <b>표류병</b>을 띄워 해류를 따라가 봐요. 저위도에서 고위도로 흐르는 따뜻한 해류를 <b>난류</b>, 고위도에서 저위도로 흐르는 차가운 해류를 <b>한류</b>라고 해요.</p>',
    setup() { setScene(2); S3.sst = 1; syncSst(); },
    recap: '<b>난류</b>(예: 쿠로시오 해류)는 저위도에서 고위도로 따뜻한 물을, <b>한류</b>(예: 캘리포니아 해류)는 고위도에서 저위도로 차가운 물을 옮겨요.',
    summary: '<ul><li><b>난류</b>: 저위도 → 고위도로 흐르는 <b>따뜻한</b> 해류 (예: 쿠로시오 해류).</li>' +
      '<li><b>한류</b>: 고위도 → 저위도로 흐르는 <b>차가운</b> 해류 (예: 캘리포니아 해류).</li>' +
      '<li>쿠로시오 해류는 우리나라 쪽으로도 따뜻한 물을 보내요.</li>' +
      '<li>표류병은 해류를 따라 흘러가고, 해류가 없는 곳에서는 거의 움직이지 않아요.</li></ul>',
    missions: [
      {
        title: '표류병 따라가기',
        goal: '표류병을 해류 위에 띄워 <b>쿠로시오 해류</b>를 따라 일본 남쪽 바다까지 흘러가게 하세요.',
        hint: '지도의 바다를 누르면 표류병이 놓여요. 해류가 아닌 곳에서는 거의 움직이지 않아요. <b>🍾 표류병 띄우기</b>는 쿠로시오 해류의 시작 부분에 놓아 줘요.',
        setup() { setScene(2); S3.sst = 1; syncSst(); S3.bottle = null; S3.trail = []; S3.kuroDone = false; S3.sel = -1; },
        check: () => S3.kuroDone,
        status: () => '🍾 ' + bottleMsg(),
        hold: 0.8,
        explain: '표류병은 해류를 따라 움직였어요. 쿠로시오 해류는 <b>저위도에서 고위도로 따뜻한 물</b>을 옮기는 <b>난류</b>예요. 해류가 아닌 곳에서는 표류병이 거의 움직이지 않았죠.',
      },
      {
        type: 'quiz', title: '난류와 한류 구별하기',
        goal: '지도의 해류 중 <b>난류</b>와 <b>한류</b>를 바르게 짝지은 것은?',
        choices: ['쿠로시오 해류 - 난류, 캘리포니아 해류 - 한류', '쿠로시오 해류 - 한류, 캘리포니아 해류 - 난류', '쿠로시오 해류와 캘리포니아 해류 - 모두 난류', '쿠로시오 해류와 캘리포니아 해류 - 모두 한류'],
        answer: 0,
        feedback: ['', '쿠로시오 해류는 저위도에서 고위도로 흐르고, 수온 지도에서 따뜻한 색이었어요.', '캘리포니아 해류는 고위도에서 저위도로 흐르고 주변보다 차가웠어요.', '쿠로시오 해류는 저위도에서 고위도로 흐르는 따뜻한 해류예요.'],
        explain: '<b>쿠로시오 해류</b>는 저위도에서 고위도로 흐르는 <b>난류</b>, <b>캘리포니아 해류</b>는 고위도에서 저위도로 흐르는 <b>한류</b>예요.',
      },
    ],
  };
  const L4 = {
    title: '해류가 기후에 미치는 영향', short: '해류와 기후', icon: '🏙️', phase: '적용',
    features: ['climate'],
    intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 난류는 따뜻한 물을, 한류는 차가운 물을 옮긴다는 것을 알았어요.</div>' +
      '<p>비슷한 위도에 있는 두 도시 <b>도쿄</b>와 <b>샌프란시스코</b>의 8월 평균 기온을 비교하고(예시 자료), <b>해류가 없다면</b> 어떻게 될지 생각해 봐요.</p>',
    setup() { setScene(3); S4.off = false; S4.city = 0; syncCity(); },
    recap: '해류는 저위도의 남는 열에너지를 고위도로 옮겨 <b>에너지를 재분배</b>하고, 주변 기후에 영향을 줘요. 난류가 흐르는 도쿄는 여름이 덥고, 한류가 흐르는 샌프란시스코는 서늘해요.',
    summary: '<ul><li>해류는 대기와 함께 <b>저위도의 남는 열에너지를 고위도로 운반</b>해요 (에너지 재분배).</li>' +
      '<li>비슷한 위도라도 <b>난류</b>가 흐르는 도쿄(8월 약 27 °C)는 덥고, <b>한류</b>가 흐르는 샌프란시스코(8월 약 17 °C)는 서늘하고 안개가 잦아요. (예시 자료)</li>' +
      '<li>해수의 온도가 오르면서 해류가 변하면 <b>기후와 생태계</b>(어종 분포)도 변할 수 있어요.</li></ul>',
    missions: [
      {
        title: '두 도시 기온 비교하기',
        goal: '<b>도쿄</b>와 <b>샌프란시스코</b>를 차례로 고르고, <b>둘 비교</b>로 8월 평균 기온의 차이를 확인하세요.',
        hint: '오른쪽 <b>🏙️ 도시 고르기</b>의 세 버튼을 눌러요. 지도의 도시를 눌러도 돼요.',
        setup() { setScene(3); S4.off = false; S4.city = 0; S4.seen = new Set([0]); syncCity(); },
        check: () => S4.seen.has(0) && S4.seen.has(1) && S4.seen.has(2),
        status: () => chk(S4.seen.has(0), '도쿄') + ' · ' + chk(S4.seen.has(1), '샌프란시스코') + ' · ' + chk(S4.seen.has(2), '둘 비교'),
        hold: 1.0,
        explain: '비슷한 위도인데 <b>도쿄(난류) 약 27 °C</b>, <b>샌프란시스코(한류) 약 17 °C</b>로 약 10 °C 차이가 나요. 해류가 주변 기후에 영향을 줘요. (예시 자료)',
      },
      {
        type: 'quiz', title: '해류가 없다면?',
        goal: '지구에 해류가 없다면 저위도와 고위도 지역의 기온은 어떻게 될까요? (<b>🌊 해류 끄기</b>를 눌러 확인해 보세요)',
        choices: ['저위도는 지금보다 더 뜨거워지고, 고위도는 더 추워진다', '저위도는 더 추워지고, 고위도는 더 따뜻해진다', '지구 전체의 기온이 똑같아진다', '아무 변화가 없다'],
        answer: 0,
        feedback: ['', '해류는 저위도의 열을 고위도로 옮겨 줘요. 해류가 없으면 그 일을 누가 할까요?', '열이 옮겨지지 않으면 위도에 따른 기온 차이가 오히려 커져요.', '해류는 열에너지를 옮기는 중요한 역할을 해요.'],
        explain: '해류는 <b>저위도의 남는 열에너지를 고위도로 옮겨</b> 주어요. 해류가 없다면 저위도는 더 뜨거워지고 고위도는 더 추워질 거예요.',
      },
      {
        type: 'quiz', title: '해류와 기후변화',
        goal: '지구 온난화로 해수의 온도가 오르면서 해류의 흐름이 달라지면 어떤 일이 생길 수 있을까요?',
        choices: ['주변 지역의 기후와 바다 생물(어종)의 분포가 달라질 수 있다', '바다의 염분이 모두 같아진다', '지구의 자전 속도가 변한다', '아무 영향이 없다'],
        answer: 0,
        feedback: ['', '염분이 같아지는 것은 해류 변화의 결과로 보기 어려워요. 해류가 옮기는 것을 떠올려 보세요.', '해류는 자전 속도를 바꾸지 않아요. 해류가 옮기는 것은 무엇이었나요?', '해류는 열에너지를 옮기므로 흐름이 달라지면 영향이 생겨요.'],
        explain: '해류는 열에너지를 옮겨 기후에 영향을 주고, 해수의 온도에 따라 사는 물고기도 달라요. 그래서 해류가 변하면 <b>기후와 생태계(어종 분포)</b>도 달라질 수 있어요.',
      },
    ],
  };

  game = SciSim.game({
    simId: 'm3-ocean-currents',
    mount: '#game',
    badge: '해류 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      tank: '🌬️ 바람 수조 실험',
      gyre: '🗺️ 북태평양 해류 지도 · 이름 카드',
      sst: '🌡️ 해수면 온도 지도 · 🍾 표류병',
      climate: '🏙️ 두 도시 기온 비교 · 🌊 해류 끄기',
    },
    onFeatures() { syncTabs(); },
    onMissionStart(m) { setScene(m._level); syncTabs(); },
    levels: [L1, L2, L3, L4],
  });
  syncPanels(); syncTabs(); syncWindSeg(); syncSst(); syncCity(); syncPlayBtn();

  /* =========================================================
     그리기 · 반복
     ========================================================= */
  let frameMs = 0, lastLvl = -1;
  SciSim.loop((dt, t) => {
    const f0 = performance.now();
    updateS1(dt); updateS2(dt); updateS3(dt); updateS4(dt); updateFlow(dt); pfx.update(dt);
    if (S2.playing) GYRE.set(Math.round(S2.p * 100));
    view.apply();
    ctx.clearRect(0, 0, VW, VH);
    if (S.prev >= 0 && S.fade < 1) {
      ctx.save(); DRAWS[S.prev](t); ctx.restore();
      ctx.save(); ctx.globalAlpha = S.fade; ctx.translate(0, (1 - S.fade) * 14); DRAWS[S.scene](t); ctx.restore();
    } else DRAWS[S.scene](t);
    pfx.draw(ctx);
    updateReadouts();
    syncPlayBtn();
    const L = lvl();
    if (L !== lastLvl) { lastLvl = L; syncTabs(); }
    frameMs = performance.now() - f0;
  });

  window.__sim = {
    SPR, S, S1, S2, S3, S4, LOOP, CUR, KEYS, game: () => game, setScene, setWind, flipDir, dropBottle, slotPx, cardAt, dropCard, GYRE, setCity, mx, my, isLand,
    frameMs: () => frameMs,
    hit(p) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + p.x * r.width / VW, y: r.top + p.y * r.height / VH }; },
  };
})();
