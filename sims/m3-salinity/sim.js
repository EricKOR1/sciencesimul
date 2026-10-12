/* =========================================================
   중3 Ⅲ. 수권과 해수의 순환 - 해수의 염분  [9과18-02]
   ① [실험] 해수 1000 g을 증발 접시에서 증발시켜 남은 염류의 질량으로 염분을 구한다 (해수 35, 황해 31, 홍해 40)
   ② [탐구] 바다 상자: 증발·강수·강물 유입·결빙에 따라 물 분자와 염류 입자의 비율(입자 돋보기)과 염분이 달라진다
   ③ [분석] 세 해역의 염류 구성 원그래프: 총량(원의 크기)은 달라도 구성 비율은 같다 (염분비 일정 법칙)
   ④ [적용] 우리나라 바다(예시 자료): 황해·동해, 겨울·여름의 염분 비교
   ※ 다루지 않음: 해수의 밀도 계산, 수온–염분도, 심층 순환. 우리나라 바다 값은 '예시 자료'.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, fmt, Sound, toast } = SciSim;
  const RM = !!SciSim.reduceMotion;
  const approach = SciSim.approach, EZ = SciSim.ease;
  const shade = SciSim.color.shade, rgba = SciSim.color.rgba, mixc = SciSim.color.mix;
  const TAU = Math.PI * 2;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const MONO = 'ui-monospace,"SF Mono",Menlo,Consolas,monospace';
  const VW = 800, VH = 600;
  const SS = Math.max(1.5, Math.min(2, window.devicePixelRatio || 1));

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#cfe3f1' });
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
  function ballSprite(color, r) {
    return sprite('ball|' + color + '|' + r, r * 2 + 6, r * 2 + 6, (g, w, h, d) => d.sphere(w / 2, h / 2, r, color, { gloss: true }));
  }
  function blit(c, x, y, a, s) {
    const w = c.width / SS * (s || 1), h = c.height / SS * (s || 1);
    if (a != null && a < 1) { ctx.save(); ctx.globalAlpha *= a; ctx.drawImage(c, x - w / 2, y - h / 2, w, h); ctx.restore(); }
    else ctx.drawImage(c, x - w / 2, y - h / 2, w, h);
  }
  function rrect(x, y, w, h, r) { D.roundRect(x, y, w, h, r); }
  function card(x, y, w, h, o) {
    o = o || {};
    D.shadow(() => { rrect(x, y, w, h, o.r || 14); ctx.fillStyle = o.bg || 'rgba(255,255,255,.94)'; ctx.fill(); }, { blur: o.blur || 14, y: 4 });
    if (o.border) { rrect(x, y, w, h, o.r || 14); ctx.strokeStyle = o.border; ctx.lineWidth = o.bw || 2; ctx.stroke(); }
  }
  const pulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 170);
  function ellipse(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU); }
  function alphaDo(a, fn) { if (a <= 0.003) return; ctx.save(); ctx.globalAlpha *= clamp(a, 0, 1); fn(); ctx.restore(); }

  /* 화면 안내 문구 */
  let hintTimer = 0;
  function showHint(text, ms) {
    const el = $('#stageHint');
    if (!el) return;
    clearTimeout(hintTimer);
    if (!text) { el.classList.add('hide'); return; }
    el.textContent = text; el.classList.remove('hide');
    if (ms !== 0) hintTimer = setTimeout(() => el.classList.add('hide'), ms || 5000);
  }

  /* ---------------- 전체 상태 ---------------- */
  const S = { scene: 0, prev: -1, fade: 1, maxScene: 0 };
  const S1 = {
    sample: 0, prog: 0, pour: 1, heating: false, heat: 0, phase: 'idle', t0: 0, dryT: 0,
    crystals: [], landed: 0, measured: [false, false, false], steam: new SciSim.Particles(), bub: 0, doneFx: 0, labelA: 1,
  };
  const S2 = {
    P: [], nW: 61, nIce: 0, nWs: 61, sal: 35, fired: new Set(), fx: { evap: 0, rain: 0, river: 0, freeze: 0 }, cap: { text: '', t: 0 },
    drops: [], ripples: [], iceUsed: 0, floor: 0, iceT: 0, last: null, slots: [], flow: 0, spotNew: 0,
  };
  const S3 = { mode: 0, sel: -1, visited: new Set([0]), tapped: new Set(), r: [98, 105, 112], x: [150, 400, 650], ex: [0, 0, 0, 0, 0, 0], intro: 0, msgA: 0 };
  const S4 = { season: 0, sum: 0, sel: -1, seen: new Set(), v: [32.3, 34.2, 34.2], plume: 0, seasonsSeen: new Set([0]), cloudT: 0 };

  const SAMPLES = [
    { name: '해수 시료', short: '해수', salt: 35, tint: '#4f9fe3' },
    { name: '황해 시료', short: '황해', salt: 31, tint: '#6bbcc0' },
    { name: '홍해 시료', short: '홍해', salt: 40, tint: '#2f6fd0' },
  ];

  /* =========================================================
     장면 1 · 증발 접시로 염분 재기
     ========================================================= */
  const DISH = { cx: 300, rimY: 322, rx: 118, depth: 46 };
  const PAN = { cx: 622, y: 428, rx: 64 };
  const BOTTLE_REST = { x: 82, y: 346, rot: 0 };

  function makeCrystals(n, seed) {
    const r = rng(seed), arr = [];
    for (let i = 0; i < n; i++) {
      const layer = i < n * 0.5 ? 0 : i < n * 0.82 ? 1 : 2, W = [92, 68, 42][layer];
      const x = clamp((r() + r() - 1) * W, -98, 98);
      const yb = DISH.rimY + (DISH.depth - 7) * Math.sqrt(Math.max(0, 1 - Math.pow(x / (DISH.rx - 8), 2)));
      const w2 = [46, 34, 20][layer], px = (r() + r() - 1) * w2;
      arr.push({ x, y: yb - 5 - layer * 7 - r() * 3, s: 8.5 + r() * 3, rot: (r() - 0.5) * 0.9, th: i / n, sc: 0, fly: -1, ft: 0, land: false,
        px: PAN.cx + px, py: PAN.y - 6 - layer * 6.5 - r() * 2 - Math.abs(px) * 0.05 });
    }
    arr.sort((a, b) => a.y - b.y);
    return arr;
  }
  function bottlePose(p) {
    // 병을 접시 위로 옮겨 기울여 붓고 제자리로 돌아오는 움직임
    const POUR = { x: 262, y: 236, rot: 1.9 };
    let a;
    if (p < 0.22) a = EZ.inOutCubic(p / 0.22);
    else if (p < 0.78) a = 1;
    else a = 1 - EZ.inOutCubic((p - 0.78) / 0.22);
    const lift = Math.sin(a * Math.PI) * 26;
    return { x: lerp(BOTTLE_REST.x, POUR.x, a), y: lerp(BOTTLE_REST.y, POUR.y, a) - lift, rot: POUR.rot * a, a };
  }
  const pourLevel = (p) => EZ.inOutQuad(clamp((p - 0.25) / 0.5, 0, 1));
  function s1Select(i, instant) {
    S1.sample = i; S1.heating = false; S1.phase = 'idle'; S1.landed = 0; S1.dryT = 0;
    S1.crystals = makeCrystals(SAMPLES[i].salt, 11 + i * 17);
    S1.steam.clear();
    if (instant) { S1.pour = 1; S1.prog = 0; }
    else {
      S1.pour = 0; S1.prog = 1;
      SciSim.tween(S1, { pour: 1 }, { duration: 2.3, ease: 'linear' });
      Sound.tick();
    }
  }
  const s1Busy = () => S1.pour < 0.999;
  function s1Heat() {
    if (s1Busy()) return;
    if (S1.phase === 'idle') { S1.heating = true; S1.phase = 'heating'; Sound.click(); showHint('', 0); }
    else if (S1.phase === 'heating') { S1.heating = false; S1.phase = 'idle'; Sound.click(); }
    else if (S1.phase === 'weighed' || S1.phase === 'dried' || S1.phase === 'weighing') {
      if (S1.phase === 'weighing') return;
      s1Select(S1.sample, false);
    }
  }
  function updateS1(dt) {
    if (S1.pour < 1) { S1.prog = 1 - pourLevel(S1.pour); }
    S1.heat = approach(S1.heat, S1.heating && !s1Busy() ? 1 : 0, dt, 2.4);
    if (S1.phase === 'heating' && S1.prog < 1) {
      S1.prog = Math.min(1, S1.prog + dt / 7.5 * (0.25 + 0.75 * S1.heat));
      if (S1.prog >= 1) { S1.heating = false; S1.phase = 'dried'; S1.dryT = 0; Sound.tick(); }
    }
    if (S1.phase === 'dried') {
      S1.dryT += dt;
      if (S1.dryT > 0.9) {
        S1.phase = 'weighing';
        S1.crystals.forEach((c, i) => { c.fly = i * 0.032; c.ft = 0; });
      }
    }
    const n = S1.crystals.length;
    const cp = clamp((S1.prog - 0.45) / 0.5, 0, 1);
    S1.crystals.forEach((c) => {
      const vis = c.fly < 0 && cp > c.th * 0.94 && cp > 0;
      if (vis) c.sc = Math.min(1, c.sc + dt * 4.5); else if (c.fly < 0) c.sc = Math.max(0, c.sc - dt * 6);
      if (c.fly >= 0) {
        if (c.fly > 0) c.fly -= dt;
        else if (!c.land) {
          c.ft = Math.min(1, c.ft + dt / 0.85);
          if (c.ft >= 1) { c.land = true; S1.landed++; if (S1.landed % 6 === 1) Sound.tick(); }
        }
        if (c.fly < 0) c.fly = 0;
      }
    });
    if (S1.phase === 'weighing' && S1.landed >= n && n > 0) {
      S1.phase = 'weighed'; S1.measured[S1.sample] = true; S1.doneFx = 1;
      Sound.success();
      pBurst(PAN.cx, PAN.y - 30);
    }
    S1.doneFx = Math.max(0, S1.doneFx - dt * 0.5);
    // 김과 거품
    if (!RM && S1.heat > 0.2 && S1.prog < 0.995 && S1.pour >= 1) {
      const water = 1 - S1.prog;
      S1.bub += dt * (14 * S1.heat) * (0.3 + water);
      while (S1.bub > 1) {
        S1.bub -= 1;
        const sy = DISH.rimY + 10 + S1.prog * (DISH.depth - 16);
        S1.steam.emit({ x: DISH.cx + (Math.random() - 0.5) * DISH.rx * 1.2 * (0.4 + water * 0.6), y: sy - 4, vx: (Math.random() - 0.5) * 14, vy: -(42 + Math.random() * 40),
          life: 2 + Math.random() * 1.2, size: 14 + Math.random() * 8, grow: 16, color: 'rgba(255,255,255,.75)', shape: 'smoke', drag: 0.25 });
        if (Math.random() < 0.5 && water > 0.06) {
          S1.steam.emit({ x: DISH.cx + (Math.random() - 0.5) * DISH.rx * 1.1 * water, y: sy + 4, vx: (Math.random() - 0.5) * 14, vy: -(50 + Math.random() * 30),
            life: 0.5 + Math.random() * 0.3, size: 3 + Math.random() * 3, color: '#cfe8fa', shape: 'bubble', gravity: 40 });
        }
      }
    }
    S1.steam.update(dt);
  }

  const pfx = new SciSim.Particles();
  function pBurst(x, y) { pfx.burst(x, y, { count: 22, speed: 150, colors: ['#ffd23f', '#38bdf8', '#34d399', '#f472b6'] }); }

  function drawCrystal(x, y, s, rot, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    if (a != null && a < 1) ctx.globalAlpha *= a;
    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d7e1ec');
    ctx.fillStyle = g; D.roundRect(-s * 0.5, -s * 0.5, s, s, s * 0.18); ctx.fill();
    ctx.strokeStyle = 'rgba(110,135,160,.75)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(-s * 0.38, -s * 0.38, s * 0.3, s * 0.12);
    ctx.restore();
  }

  function drawBottle(pose, t) {
    const p = S1.pour;
    ctx.save();
    ctx.translate(pose.x, pose.y); ctx.rotate(pose.rot);
    // 몸통 (원점 = 병 입구)
    const bw = 40, nw = 15;
    ctx.beginPath();
    ctx.moveTo(-nw, 0); ctx.lineTo(nw, 0); ctx.lineTo(nw, 26);
    ctx.bezierCurveTo(nw, 40, bw, 38, bw, 62); ctx.lineTo(bw, 150); ctx.arcTo(bw, 162, bw - 14, 162, 12); ctx.lineTo(-bw + 12, 162);
    ctx.arcTo(-bw, 162, -bw, 150, 12); ctx.lineTo(-bw, 62);
    ctx.bezierCurveTo(-bw, 38, -nw, 40, -nw, 26); ctx.closePath();
    const sm = SAMPLES[S1.sample];
    const g = ctx.createLinearGradient(-bw, 0, bw, 0);
    g.addColorStop(0, rgba(sm.tint, 0.55)); g.addColorStop(0.35, rgba(sm.tint, 0.85)); g.addColorStop(1, rgba(shade(sm.tint, -0.3), 0.85));
    D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 12, y: 5, color: 'rgba(20,40,70,.28)' });
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2.5; ctx.stroke();
    // 라벨
    alphaDo(1, () => {
      ctx.fillStyle = '#fff'; D.roundRect(-bw + 6, 78, bw * 2 - 12, 62, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(80,110,150,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      const rot = pose.rot;
      ctx.save(); ctx.translate(0, 0);
      D.text(0, 100, sm.name, { size: 14, weight: 800, color: '#1b3a5c' });
      D.text(0, 122, '1000 g', { size: 17, weight: 800, color: '#0b6fb8' });
      ctx.restore();
    });
    // 하이라이트
    ctx.fillStyle = 'rgba(255,255,255,.4)'; D.roundRect(-bw + 7, 66, 8, 84, 4); ctx.fill();
    // 마개
    if (p >= 0.999) {
      ctx.fillStyle = '#1e4f8f'; D.roundRect(-nw - 3, -14, nw * 2 + 6, 16, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(-nw, -12, 6, 12);
    }
    ctx.restore();
  }

  function drawS1(t) {
    // 벽과 실험대
    let g = ctx.createLinearGradient(0, 0, 0, 470);
    g.addColorStop(0, '#7fa8c6'); g.addColorStop(1, '#b3d0e3');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, 470);
    const gl = ctx.createRadialGradient(660, 70, 10, 660, 70, 340);
    gl.addColorStop(0, 'rgba(255,255,255,.35)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, VW, 470);
    g = ctx.createLinearGradient(0, 470, 0, VH);
    g.addColorStop(0, '#e9eef2'); g.addColorStop(1, '#bcc7d1');
    ctx.fillStyle = g; ctx.fillRect(0, 470, VW, VH - 470);
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(0, 468, VW, 3);
    ctx.fillStyle = 'rgba(40,70,100,.12)'; ctx.fillRect(0, 471, VW, 5);

    const cx = DISH.cx, dishBot = DISH.rimY + DISH.depth;
    const sm = SAMPLES[S1.sample];

    // 삼발이 다리
    ctx.strokeStyle = '#59677a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    [[-86, -130], [86, 130]].forEach((q) => { ctx.beginPath(); ctx.moveTo(cx + q[0], dishBot + 10); ctx.lineTo(cx + q[1], 505); ctx.stroke(); });
    // 알코올 램프
    const lampY = 505;
    D.shadow(() => { ellipse(cx, lampY + 2, 46, 8); ctx.fillStyle = 'rgba(30,50,80,.28)'; ctx.fill(); }, { blur: 6, y: 0 });
    g = ctx.createLinearGradient(cx - 36, 0, cx + 36, 0);
    g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(0.5, 'rgba(200,225,245,.55)'); g.addColorStop(1, 'rgba(140,175,205,.7)');
    ctx.fillStyle = g; D.roundRect(cx - 36, lampY - 62, 72, 64, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(214,150,70,.55)'; D.roundRect(cx - 31, lampY - 40, 62, 36, 12); ctx.fill();
    ctx.fillStyle = '#6b7685'; D.roundRect(cx - 12, lampY - 74, 24, 14, 4); ctx.fill();
    ctx.fillStyle = '#2f3a47'; ctx.fillRect(cx - 2, lampY - 80, 4, 8);
    // 불꽃
    D.flame(cx, lampY - 78, 74 * S1.heat, t);
    // 삼발이 고리
    ctx.strokeStyle = '#4b5868'; ctx.lineWidth = 6;
    ellipse(cx, dishBot + 7, DISH.rx * 0.78, 10); ctx.stroke();
    // 앞다리
    ctx.strokeStyle = '#59677a'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx, dishBot + 16); ctx.lineTo(cx, 508); ctx.stroke();
    ctx.lineCap = 'butt';

    // 증발 접시 몸통
    ctx.beginPath();
    ctx.ellipse(cx, DISH.rimY, DISH.rx, DISH.depth, 0, 0, Math.PI);
    ctx.ellipse(cx, DISH.rimY, DISH.rx, 13, 0, Math.PI, 0, true);
    ctx.closePath();
    g = ctx.createLinearGradient(cx - DISH.rx, 0, cx + DISH.rx, 0);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#eef3f7'); g.addColorStop(1, '#bccad6');
    D.shadow(() => { ctx.fillStyle = g; ctx.fill(); }, { blur: 14, y: 6, color: 'rgba(30,50,80,.3)' });
    // 안쪽 벽
    ellipse(cx, DISH.rimY, DISH.rx - 4, 11);
    g = ctx.createLinearGradient(0, DISH.rimY - 11, 0, DISH.rimY + 11);
    g.addColorStop(0, '#aebccb'); g.addColorStop(1, '#dbe4ec');
    ctx.fillStyle = g; ctx.fill();

    // 물
    const surfY = DISH.rimY + 8 + S1.prog * (DISH.depth - 16);
    if (S1.prog < 0.995) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, DISH.rimY, DISH.rx - 5, DISH.depth - 4, 0, 0, Math.PI);
      ctx.ellipse(cx, DISH.rimY, DISH.rx - 6, 11, 0, Math.PI, 0, true);
      ctx.closePath(); ctx.clip();
      g = ctx.createLinearGradient(0, surfY, 0, DISH.rimY + DISH.depth);
      g.addColorStop(0, rgba(shade(sm.tint, 0.2), 0.95)); g.addColorStop(1, rgba(shade(sm.tint, -0.15), 0.98));
      ctx.fillStyle = g; ctx.fillRect(cx - DISH.rx, surfY, DISH.rx * 2, DISH.depth + 20);
      const wAt = (DISH.rx - 6) * Math.sqrt(Math.max(0.03, 1 - Math.pow((surfY - DISH.rimY) / (DISH.depth - 4), 2)));
      ellipse(cx, surfY, wAt, 7 * Math.min(1, (1 - S1.prog) * 3 + 0.25));
      ctx.fillStyle = rgba(shade(sm.tint, 0.5), 0.95); ctx.fill();
      // 일렁임
      if (S1.heat > 0.1) {
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          const ph = (t * 1.1 + k * 0.33) % 1;
          ellipse(cx + Math.sin(k * 2.3 + t) * wAt * 0.3, surfY, wAt * (0.2 + ph * 0.6), 6 * (0.2 + ph * 0.6));
          ctx.globalAlpha = (1 - ph) * S1.heat * 0.8; ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }
    // 소금 결정
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, DISH.rimY, DISH.rx - 4, DISH.depth - 2, 0, 0, Math.PI);
    ctx.ellipse(cx, DISH.rimY, DISH.rx - 4, 11, 0, Math.PI, 0, true);
    ctx.closePath(); ctx.clip();
    S1.crystals.forEach((c) => {
      if (c.fly >= 0 || c.sc <= 0.01) return;
      const sc = EZ.outBack(Math.min(1, c.sc));
      drawCrystal(cx + c.x, c.y, c.s * sc, c.rot, Math.min(1, c.sc * 2));
    });
    ctx.restore();
    // 앞쪽 테두리
    ellipse(cx, DISH.rimY, DISH.rx, 13);
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(120,140,160,.5)'; ctx.lineWidth = 1; ellipse(cx, DISH.rimY, DISH.rx + 1.5, 14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(cx - 70, DISH.rimY + 28, 30, 9, 0.5, 0, TAU); ctx.fill();

    // 날아가는 결정
    S1.crystals.forEach((c) => {
      if (c.fly < 0 || c.land) return;
      if (c.fly > 0) { drawCrystal(cx + c.x, c.y, c.s, c.rot, 1); return; }
      const e = EZ.inOutCubic(c.ft);
      const x = lerp(cx + c.x, c.px, e), y = lerp(c.y, c.py, e) - Math.sin(c.ft * Math.PI) * 120;
      drawCrystal(x, y, lerp(c.s, c.s * 0.78, e), c.rot + c.ft * 5, 1);
    });

    // 전자저울
    const bx = 506, by = 474, bwid = 236, bh = 68;
    ctx.fillStyle = '#7f8fa1'; ctx.fillRect(PAN.cx - 6, PAN.y + 6, 12, by - PAN.y - 4);
    D.shadow(() => {
      g = ctx.createLinearGradient(0, by, 0, by + bh);
      g.addColorStop(0, '#f4f7fa'); g.addColorStop(1, '#c6d0da');
      D.roundRect(bx, by, bwid, bh, 14); ctx.fillStyle = g; ctx.fill();
    }, { blur: 14, y: 6 });
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; D.roundRect(bx, by, bwid, bh, 14); ctx.stroke();
    ctx.fillStyle = '#16301f'; D.roundRect(bx + 18, by + 12, bwid - 36, 44, 8); ctx.fill();
    ctx.fillStyle = '#b9e0a0'; D.roundRect(bx + 21, by + 15, bwid - 42, 38, 6); ctx.fill();
    const shown = S1.landed.toFixed(1);
    D.text(bx + bwid - 62, by + 45, shown, { size: 30, weight: 800, color: '#18361f', align: 'right', baseline: 'alphabetic' });
    D.text(bx + bwid - 54, by + 45, 'g', { size: 19, weight: 800, color: '#18361f', align: 'left' });
    // 접시(저울판)
    g = ctx.createLinearGradient(PAN.cx - PAN.rx, 0, PAN.cx + PAN.rx, 0);
    g.addColorStop(0, '#dfe6ed'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#a9b6c3');
    ellipse(PAN.cx, PAN.y + 4, PAN.rx, 12); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(90,110,130,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
    S1.crystals.forEach((c) => { if (c.land) drawCrystal(c.px, c.py, c.s * 0.78, c.rot, 1); });
    if (S1.doneFx > 0) D.check(PAN.cx + 80, PAN.y - 34, 15 * EZ.outBack(Math.min(1, (1 - S1.doneFx) * 4)), 1);

    // 병
    const pose = bottlePose(S1.pour);
    // 붓는 물줄기
    if (S1.pour > 0.24 && S1.pour < 0.78) {
      const k = S1.pour, mx = pose.x + Math.cos(pose.rot) * 0 + 0, my = pose.y;
      const sx = mx + 2, sy = my + 4, ex = DISH.cx - 26, ey = surfY;
      ctx.strokeStyle = rgba(sm.tint, 0.85); ctx.lineWidth = 6 * Math.min(1, (k - 0.24) * 14) * Math.min(1, (0.78 - k) * 14);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + 18, sy + 24, ex, ey); ctx.stroke();
      ctx.lineCap = 'butt';
      if (!RM && Math.random() < 0.5) S1.steam.emit({ x: ex + (Math.random() - 0.5) * 10, y: ey, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 40, life: 0.45, size: 2.6, color: '#e2f2ff', gravity: 260, shape: 'circle' });
    }
    drawBottle(pose, t);

    // 김과 거품
    S1.steam.draw(ctx);

    // 이름표
    D.label(DISH.cx + DISH.rx + 14, DISH.rimY + 22, '증발 접시', { bg: 'rgba(27,35,51,.78)', size: 13, align: 'left' });
    D.label(cx, 538, '알코올 램프', { bg: 'rgba(27,35,51,.78)', size: 13 });
    D.label(bx + bwid / 2, 576, '전자저울 (염류의 질량)', { bg: 'rgba(27,35,51,.78)', size: 13 });
    if (S1.prog < 0.995 && S1.heat > 0.4) D.label(cx - 30, 140 - 0, '수증기 (물만 날아가요)', { bg: 'rgba(255,255,255,.9)', color: '#1b4e7a', size: 14 });
    if (S1.crystals.some((c) => c.sc > 0.9 && c.fly < 0)) D.label(DISH.cx - DISH.rx - 14, DISH.rimY + 52, '남은 염류 (소금 결정)', { bg: '#fff', color: '#0b4f8a', size: 14, align: 'right', border: '#7dd3fc' });

    // 염분 계산 카드
    const px = 420, py = 20, pw = 362, ph = 122;
    card(px, py, pw, ph, { bg: 'rgba(255,255,255,.95)' });
    D.text(px + pw / 2, py + 26, '염분(psu) = 염류의 양(g) ÷ 해수의 양(g) × 1000', { size: 14.5, weight: 800, color: '#1b3a5c' });
    const done = S1.phase === 'weighed';
    const saltTxt = S1.landed > 0 || done ? String(S1.landed) : '?';
    D.text(px + pw / 2, py + 62, '= ' + saltTxt + ' ÷ 1000 × 1000', { size: 20, weight: 800, color: '#3a5578', align: 'center' });
    if (done) {
      D.text(px + pw / 2, py + 100, '= ' + S1.landed + ' psu', { size: 28, weight: 800, color: '#0b6fb8' });
    } else {
      D.text(px + pw / 2, py + 100, '= ? psu', { size: 24, weight: 800, color: '#a6b6c8' });
    }
  }

  /* =========================================================
     장면 2 · 바다 상자와 입자 돋보기
     염류 입자 10개(고정) + 물 분자 61개 = 35 psu. 입자 수가 곧 염분을 정해요.
     ========================================================= */
  const TANK = { x: 118, y: 238, w: 354, h: 296 };
  const LENS = { cx: 624, cy: 376, r: 136 };
  const SPOT = { x: 424, y: 452, r: 24 };
  const NS = 10, NW0 = 61, NW_MIN = 43, NW_MAX = 79, DELTA = 6;
  const salOf = (nW) => 35 * (NS / (NS + nW)) / (NS / (NS + NW0));
  const EV = {
    evap: { d: -DELTA, text: '☀️ 햇빛 → 물만 증발해요. 염류는 남아서 염분이 높아져요.', col: '#e11d48' },
    freeze: { d: -DELTA, text: '❄️ 물만 얼어요. 얼음에는 염류가 거의 없어서 염분이 높아져요.', col: '#e11d48' },
    rain: { d: DELTA, text: '🌧️ 빗물(담수)이 더해져요. 물이 늘어나 염분이 낮아져요.', col: '#2563eb' },
    river: { d: DELTA, text: '🏞️ 강물(담수)이 흘러들어요. 물이 늘어나 염분이 낮아져요.', col: '#2563eb' },
  };

  function makeSlots() {
    const R = LENS.r, out = [];
    for (let j = 0; j < 5; j++) {
      const y = LENS.cy - R + 22 + j * 16;
      const hw = Math.sqrt(Math.max(0, R * R - (y - LENS.cy) * (y - LENS.cy))) - 16;
      const row = [];
      for (let x = 0; x <= hw; x += 17) { row.push({ x: LENS.cx + x, y, j }); if (x > 0) row.push({ x: LENS.cx - x, y, j }); }
      out.push.apply(out, row);
    }
    return out;
  }
  S2.slots = makeSlots();

  function initBox(keepFired) {
    const r = rng(5), R = LENS.r - 16;
    S2.P = [];
    const place = (t) => {
      for (let k = 0; k < 60; k++) {
        const a = r() * TAU, d = Math.sqrt(r()) * R * 0.95;
        const x = LENS.cx + Math.cos(a) * d, y = LENS.cy + Math.sin(a) * d + 8;
        if (!S2.P.some((q) => Math.hypot(q.x - x, q.y - y) < (t === 's' ? 20 : 15))) return { x, y };
      }
      return { x: LENS.cx, y: LENS.cy };
    };
    for (let i = 0; i < NS + NW0; i++) {
      const t = i < NS ? 's' : 'w', pos = place(t), a = r() * TAU, sp = 30 + r() * 30;
      S2.P.push({ t, st: 'free', x: pos.x, y: pos.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, delay: 0, a: 1, rad: t === 's' ? 9 : 7 });
    }
    S2.nW = NW0; S2.nIce = 0; S2.iceUsed = 0; S2.floor = LENS.cy - LENS.r; S2.iceT = 0;
    S2.nWs = NW0; S2.sal = 35; S2.drops.length = 0; S2.ripples.length = 0;
    Object.keys(S2.fx).forEach((k) => { S2.fx[k] = 0; });
    S2.cap.t = 0; S2.last = null;
    if (!keepFired) S2.fired = new Set();
  }
  initBox();

  function fireEv(kind) {
    const e = EV[kind];
    const n2 = S2.nW + e.d;
    if (n2 < NW_MIN || n2 > NW_MAX) {
      S2.cap = { text: e.d < 0 ? '모형이 더 졸아들 수 없어요. 비나 강물로 물을 채워 보세요.' : '바다 상자가 가득 찼어요. 증발이나 결빙으로 물을 줄여 보세요.', t: 2.4, col: '#64748b' };
      Sound.fail();
      return false;
    }
    S2.nW = n2;
    const free = S2.P.filter((p) => p.t === 'w' && p.st === 'free');
    for (let i = free.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = free[i]; free[i] = free[j]; free[j] = tmp; }
    if (kind === 'evap') {
      free.slice(0, DELTA).forEach((p, i) => { p.st = 'vapor'; p.delay = 0.15 + i * 0.16; });
    } else if (kind === 'freeze') {
      // 위쪽에 가까운 입자부터 얼음 칸으로
      free.sort((a, b) => a.y - b.y);
      free.slice(0, DELTA).forEach((p, i) => {
        const sl = S2.slots[S2.iceUsed++];
        p.st = 'freezing'; p.delay = 0.1 + i * 0.14; p.tx = sl.x; p.ty = sl.y; p.row = sl.j;
      });
      S2.nIce += DELTA;
    } else {
      for (let i = 0; i < DELTA; i++) {
        const R = LENS.r - 30, a = -Math.PI / 2 + (Math.random() - 0.5) * 2.0;
        const fromLeft = kind === 'river';
        const x = fromLeft ? LENS.cx - R * 0.8 + Math.random() * 30 : LENS.cx + Math.cos(a) * R * 0.8;
        S2.P.push({ t: 'w', st: 'enter', x: x, y: LENS.cy - LENS.r - 14 - i * 6, vx: fromLeft ? 18 : (Math.random() - 0.5) * 30, vy: 110, delay: 0.15 + i * 0.17, a: 0, rad: 7 });
      }
    }
    S2.fx[kind] = 3.0;
    S2.cap = { text: e.text, t: 3.6, col: e.col };
    S2.fired.add(kind);
    S2.last = kind;
    Sound.tick();
    return true;
  }

  function updateS2(dt) {
    const R = LENS.r - 6;
    Object.keys(S2.fx).forEach((k) => { S2.fx[k] = Math.max(0, S2.fx[k] - dt); });
    S2.cap.t = Math.max(0, S2.cap.t - dt);
    S2.flow += dt * (1 + 3 * Math.min(1, S2.fx.river));
    S2.nWs = approach(S2.nWs, S2.nW, dt, 2.2);
    const salT = salOf(S2.nW);
    S2.sal = approach(S2.sal, salT, dt, 2.6);
    S2.iceT = approach(S2.iceT, S2.nIce, dt, 2.2);
    let fl = LENS.cy - LENS.r + 4;
    for (let i = 0; i < S2.iceUsed; i++) fl = Math.max(fl, S2.slots[i].y + 13);
    S2.floor = approach(S2.floor, fl, dt, 3);
    if (S.scene !== 1 && S.prev !== 1) return;
    const P = S2.P;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (p.delay > 0) { p.delay -= dt; if (p.st === 'enter') { continue; } }
      if (p.st === 'enter') {
        p.a = Math.min(1, p.a + dt * 3);
        p.vy = Math.max(60, p.vy);
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > S2.floor + 24 && Math.hypot(p.x - LENS.cx, p.y - LENS.cy) < R - p.rad) { p.st = 'free'; const a = Math.random() * TAU; p.vx = Math.cos(a) * 40; p.vy = Math.abs(Math.sin(a)) * 30 + 20; }
        continue;
      }
      if (p.st === 'vapor') {
        if (p.delay <= 0) { p.vy -= 260 * dt; p.vx *= 0.99; p.y += p.vy * dt; p.x += p.vx * dt; p.a = Math.max(0, 1 - Math.max(0, (LENS.cy - LENS.r + 24 - p.y)) / 40); }
        else Brown(p, dt, R);
        if (p.y < LENS.cy - LENS.r - 40) P.splice(i, 1);
        continue;
      }
      if (p.st === 'freezing') {
        if (p.delay > 0) { Brown(p, dt, R); continue; }
        p.x = approach(p.x, p.tx, dt, 4.2); p.y = approach(p.y, p.ty, dt, 4.2);
        if (Math.hypot(p.x - p.tx, p.y - p.ty) < 2.5) { p.st = 'ice'; p.x = p.tx; p.y = p.ty; }
        continue;
      }
      if (p.st === 'ice') continue;
      Brown(p, dt, R);
    }
    // 겹침 풀기
    for (let i = 0; i < P.length; i++) {
      const a = P[i];
      if (a.st !== 'free' && !(a.st === 'vapor' && a.delay > 0) && !(a.st === 'freezing' && a.delay > 0)) continue;
      for (let j = i + 1; j < P.length; j++) {
        const b = P[j];
        if (b.st !== 'free' && !(b.st === 'vapor' && b.delay > 0) && !(b.st === 'freezing' && b.delay > 0)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, md = (a.rad + b.rad) * 0.98, d2 = dx * dx + dy * dy;
        if (d2 < md * md && d2 > 0.01) {
          const d = Math.sqrt(d2), push = (md - d) / 2, ux = dx / d, uy = dy / d;
          a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
          const rv = (b.vx - a.vx) * ux + (b.vy - a.vy) * uy;
          if (rv < 0) { a.vx += ux * rv; a.vy += uy * rv; b.vx -= ux * rv; b.vy -= uy * rv; }
        }
      }
    }
    // 장면 효과: 수면 물결·빗방울
    const wy = waterY();
    if (S2.fx.rain > 0.2 && !RM) {
      for (let k = 0; k < 2; k++) if (Math.random() < 0.8) S2.drops.push({ x: 232 + Math.random() * 170, y: 132 + Math.random() * 10, v: 380 + Math.random() * 120 });
    }
    for (let i = S2.drops.length - 1; i >= 0; i--) {
      const d = S2.drops[i]; d.y += d.v * dt;
      if (d.y >= wy) { S2.ripples.push({ x: d.x, y: wy, t: 0 }); S2.drops.splice(i, 1); }
    }
    for (let i = S2.ripples.length - 1; i >= 0; i--) { S2.ripples[i].t += dt; if (S2.ripples[i].t > 0.7) S2.ripples.splice(i, 1); }
    if (S2.fx.river > 0.3 && !RM && Math.random() < 0.6) S2.ripples.push({ x: TANK.x + 14 + Math.random() * 28, y: wy, t: 0 });
  }
  function Brown(p, dt, R) {
    p.vx += (Math.random() - 0.5) * 520 * dt; p.vy += (Math.random() - 0.5) * 520 * dt;
    let sp = Math.hypot(p.vx, p.vy);
    const tgt = p.t === 's' ? 38 : 46;
    if (sp < 1) { p.vx = tgt; sp = tgt; }
    const k = Math.exp(-2 * dt), s2 = tgt + (sp - tgt) * k;
    p.vx *= s2 / sp; p.vy *= s2 / sp;
    p.x += p.vx * dt; p.y += p.vy * dt;
    const dx = p.x - LENS.cx, dy = p.y - LENS.cy, d = Math.hypot(dx, dy), lim = R - p.rad - 3;
    if (d > lim) {
      const nx = dx / d, ny = dy / d;
      p.x = LENS.cx + nx * lim; p.y = LENS.cy + ny * lim;
      const dot = p.vx * nx + p.vy * ny; if (dot > 0) { p.vx -= 2 * dot * nx; p.vy -= 2 * dot * ny; }
    }
    const fl = S2.floor + p.rad + 2;
    if (p.y < fl) { p.y = fl; if (p.vy < 0) p.vy = -p.vy; }
  }
  function waterY() { return 312 - (S2.nWs - NW0) * 0.85; }

  function cloudPath(x, y, s) {
    ctx.beginPath();
    [[-34, 8, 22], [-12, -8, 30], [20, -4, 26], [44, 8, 19], [4, 10, 26]].forEach((c) => { ctx.moveTo(x + c[0] * s + c[2] * s, y + c[1] * s); ctx.arc(x + c[0] * s, y + c[1] * s, c[2] * s, 0, TAU); });
  }

  function drawS2(t) {
    // 하늘
    let g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#8fc9f0'); g.addColorStop(0.5, '#d6edfa'); g.addColorStop(1, '#e8f4fb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    const evap = Math.min(1, S2.fx.evap), rain = Math.min(1, S2.fx.rain), river = Math.min(1, S2.fx.river), frz = Math.min(1, S2.fx.freeze);
    const wy = waterY();
    const sal = S2.sal, tsal = clamp((sal - 27) / 20, 0, 1);

    // 해
    const sx = 66, sy = 82;
    D.glow(sx, sy, 80 + 50 * evap, '#ffd34d', 0.55 + 0.3 * evap);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.25);
    ctx.strokeStyle = '#ffb703'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r1 = 34, r2 = 44 + 8 * evap + (i % 2) * 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke(); }
    ctx.restore();
    D.sphere(sx, sy, 30, '#ffc928', { gloss: false });
    // 구름
    const cc = mixc('#ffffff', '#8c9db0', rain);
    ctx.fillStyle = 'rgba(40,70,110,.12)'; cloudPath(322, 104, 1.5); ctx.fill();
    ctx.fillStyle = cc; cloudPath(320, 98, 1.5); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; cloudPath(314, 90, 1.25); ctx.fill();

    // 땅 단면
    g = ctx.createLinearGradient(0, TANK.y, 0, VH);
    g.addColorStop(0, '#b78a5c'); g.addColorStop(1, '#8b6440');
    ctx.fillStyle = g; ctx.fillRect(0, TANK.y + 14, TANK.x + 2, VH - TANK.y - 14);
    ctx.fillStyle = '#6dbf5a'; D.roundRect(-10, TANK.y - 2, TANK.x + 12, 22, 8); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    for (let i = 0; i < 14; i++) { const r = rng(i + 3); ctx.beginPath(); ctx.arc(10 + r() * 96, TANK.y + 50 + r() * 240, 3 + r() * 4, 0, TAU); ctx.fill(); }
    // 강
    ctx.fillStyle = '#58b0ea'; D.roundRect(-10, TANK.y - 7, TANK.x + 6, 12, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.setLineDash([12, 14]); ctx.lineDashOffset = -S2.flow * 40;
    ctx.beginPath(); ctx.moveTo(0, TANK.y - 1); ctx.lineTo(TANK.x + 10, TANK.y - 1); ctx.stroke(); ctx.setLineDash([]);
    D.label(48, TANK.y - 26, '강', { bg: 'rgba(255,255,255,.9)', color: '#1b4e7a', size: 14 });
    D.text(58, TANK.y + 62, '육지', { size: 14, weight: 800, color: 'rgba(255,255,255,.85)' });

    // 탱크 속 공기와 폭포
    ctx.fillStyle = 'rgba(255,255,255,.28)'; D.roundRect(TANK.x, TANK.y, TANK.w, TANK.h, 14); ctx.fill();
    ctx.save(); D.roundRect(TANK.x + 3, TANK.y + 3, TANK.w - 6, TANK.h - 6, 12); ctx.clip();
    const wf = 0.5 + 0.5 * river;
    ctx.fillStyle = rgba('#58b0ea', 0.88);
    ctx.beginPath(); ctx.moveTo(TANK.x, TANK.y - 3); ctx.lineTo(TANK.x + 12 + 8 * wf, TANK.y - 3); ctx.lineTo(TANK.x + 6 + 6 * wf, wy + 2); ctx.lineTo(TANK.x, wy + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -S2.flow * 70;
    ctx.beginPath(); ctx.moveTo(TANK.x + 6, TANK.y); ctx.lineTo(TANK.x + 6, wy); ctx.stroke(); ctx.setLineDash([]);

    // 물
    const wcol = mixc('#8fd3f6', '#2f7fcf', tsal);
    g = ctx.createLinearGradient(0, wy, 0, TANK.y + TANK.h);
    g.addColorStop(0, rgba(shade(wcol, 0.12), 0.96)); g.addColorStop(1, rgba(shade(wcol, -0.28), 0.98));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(TANK.x, TANK.y + TANK.h);
    const amp = 2.2 + 3 * Math.max(rain, river) + 1.5 * evap;
    for (let x = TANK.x; x <= TANK.x + TANK.w + 4; x += 6) ctx.lineTo(x, wy + Math.sin(x * 0.045 + t * 2.1) * amp + Math.sin(x * 0.09 - t * 1.3) * amp * 0.5);
    ctx.lineTo(TANK.x + TANK.w, TANK.y + TANK.h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = TANK.x; x <= TANK.x + TANK.w + 4; x += 6) { const yy = wy + Math.sin(x * 0.045 + t * 2.1) * amp + Math.sin(x * 0.09 - t * 1.3) * amp * 0.5; if (x === TANK.x) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
    // 물속 반짝임(염류 입자 알갱이 느낌)
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    const rr2 = rng(9);
    for (let i = 0; i < 22; i++) { const px = TANK.x + 20 + rr2() * (TANK.w - 40), py = wy + 24 + rr2() * (TANK.y + TANK.h - wy - 50); ctx.beginPath(); ctx.arc(px + Math.sin(t * 0.6 + i) * 4, py + Math.cos(t * 0.5 + i * 1.3) * 3, 1.8, 0, TAU); ctx.fill(); }
    // 얼음
    if (S2.iceT > 0.05) {
      const th = 5 + S2.iceT * 1.25, ix = 326, iw = 136, bob = Math.sin(t * 1.4) * 1.2;
      const top = wy - th * 0.32 + bob, bot = wy + th * 0.68 + bob;
      g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, 'rgba(255,255,255,.98)'); g.addColorStop(1, 'rgba(190,230,250,.9)');
      D.shadow(() => { D.roundRect(ix, top, iw, bot - top, 8); ctx.fillStyle = g; ctx.fill(); }, { blur: 8, y: 3, color: 'rgba(20,70,120,.3)' });
      ctx.strokeStyle = 'rgba(120,190,230,.9)'; ctx.lineWidth = 1.5; D.roundRect(ix, top, iw, bot - top, 8); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; D.roundRect(ix + 10, top + 3, iw * 0.45, 4, 2); ctx.fill();
      D.label(ix + iw / 2, top - 16, '얼음 (염류가 거의 없음)', { bg: 'rgba(255,255,255,.92)', color: '#1b4e7a', size: 13 });
    }
    S2.ripples.forEach((r) => { ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - r.t / 0.7)) + ')'; ctx.lineWidth = 1.6; ellipse(r.x, r.y + 1, 4 + r.t * 26, 1.5 + r.t * 6); ctx.stroke(); });
    // 확대 위치 표시
    ctx.restore();

    // 유리 테두리
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 5; D.roundRect(TANK.x, TANK.y, TANK.w, TANK.h, 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,140,190,.5)'; ctx.lineWidth = 1.5; D.roundRect(TANK.x - 2.5, TANK.y - 2.5, TANK.w + 5, TANK.h + 5, 16); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.28)'; D.roundRect(TANK.x + 12, TANK.y + 14, 10, TANK.h - 40, 5); ctx.fill();

    // 증발: 위로 오르는 물결선
    if (evap > 0.02) {
      ctx.save(); ctx.lineCap = 'round';
      [150, 215, 285, 360, 430].forEach((x0, i) => {
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * evap) + ')'; ctx.lineWidth = 4.5;
        ctx.setLineDash([16, 14]); ctx.lineDashOffset = t * 36 + i * 9;
        ctx.beginPath();
        for (let k = 0; k <= 22; k++) { const yy = wy - 6 - k * 6.2, xx = x0 + Math.sin(k * 0.55 + t * 3 + i) * 7; if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
        ctx.stroke();
      });
      ctx.setLineDash([]); ctx.restore();
    }
    // 비
    if (rain > 0.02) {
      ctx.strokeStyle = 'rgba(40,100,170,.85)'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      S2.drops.forEach((d) => { ctx.beginPath(); ctx.moveTo(d.x, d.y - 11); ctx.lineTo(d.x - 1.5, d.y); ctx.stroke(); });
    }
    // 결빙: 반짝이는 눈꽃
    if (frz > 0.02 && !RM) {
      ctx.fillStyle = 'rgba(255,255,255,' + frz + ')';
      for (let i = 0; i < 6; i++) { const px = 330 + ((i * 53 + t * 20) % 130), py = wy - 14 - ((t * 24 + i * 31) % 60); D.spark(px, py, 6, t + i, '#ffffff'); }
    }
    D.label(TANK.x + TANK.w / 2, TANK.y + TANK.h + 28, '바다 상자 (모형)', { bg: 'rgba(27,35,51,.8)', size: 14 });

    // 확대 위치 표시와 돋보기 연결선
    const L = LENS, aa = 0.62;
    const p1 = [L.cx - Math.cos(aa) * (L.r + 4), L.cy - Math.sin(aa) * (L.r + 4)], p2 = [L.cx - Math.cos(aa) * (L.r + 4), L.cy + Math.sin(aa) * (L.r + 4)];
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath(); ctx.moveTo(SPOT.x, SPOT.y - SPOT.r); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(SPOT.x, SPOT.y + SPOT.r); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(SPOT.x, SPOT.y - SPOT.r); ctx.lineTo(p1[0], p1[1]); ctx.moveTo(SPOT.x, SPOT.y + SPOT.r); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ellipse(SPOT.x, SPOT.y, SPOT.r, SPOT.r); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,70,130,.55)'; ctx.lineWidth = 1.2; ellipse(SPOT.x, SPOT.y, SPOT.r + 1.5, SPOT.r + 1.5); ctx.stroke();
    if (S2.spotNew > 0) D.ring(SPOT.x, SPOT.y, SPOT.r + 4, t, { color: '#f59e0b' });

    // 입자 돋보기
    drawLens(t);

    // 염분계
    drawMeter(t);

    // 설명 알약
    if (S2.cap.t > 0) {
      const a = Math.min(1, S2.cap.t * 3);
      alphaDo(a, () => {
        ctx.font = D.font(14.5, 800);
        const w = Math.min(440, ctx.measureText(S2.cap.text).width + 28);
        card(TANK.x + TANK.w / 2 - w / 2 + 40, 168, w, 36, { r: 18, bg: 'rgba(255,255,255,.96)', border: S2.cap.col, bw: 2.2, blur: 10 });
        D.text(TANK.x + TANK.w / 2 + 40, 191, S2.cap.text, { size: 14.5, weight: 800, color: S2.cap.col });
      });
    }
  }

  const BALL = () => ({ w: ballSprite('#4cb3f5', 7), s: ballSprite('#f59e0b', 9) });
  function drawLens(t) {
    const L = LENS, sp = BALL();
    // 손잡이
    ctx.save(); ctx.translate(L.cx, L.cy); ctx.rotate(-Math.PI / 4);
    g2(ctx, L.r + 4, 62);
    ctx.restore();
    ctx.save();
    ctx.beginPath(); ctx.arc(L.cx, L.cy, L.r, 0, TAU); ctx.clip();
    let g = ctx.createRadialGradient(L.cx - 40, L.cy - 50, 10, L.cx, L.cy, L.r);
    g.addColorStop(0, '#e6f6ff'); g.addColorStop(1, mixc('#aedcf7', '#7fb9e8', clamp((S2.sal - 28) / 18, 0, 1)));
    ctx.fillStyle = g; ctx.fillRect(L.cx - L.r, L.cy - L.r, L.r * 2, L.r * 2);
    // 얼음 띠
    if (S2.floor > L.cy - L.r + 6) {
      const h = S2.floor - (L.cy - L.r);
      g = ctx.createLinearGradient(0, L.cy - L.r, 0, L.cy - L.r + h);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(205,236,252,.85)');
      ctx.fillStyle = g; ctx.fillRect(L.cx - L.r, L.cy - L.r, L.r * 2, h);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(L.cx - L.r, L.cy - L.r + h - 2, L.r * 2, 2);
    }
    // 입자
    S2.P.forEach((p) => {
      if (p.st === 'enter' && p.delay > 0) return;
      const a = p.a != null ? p.a : 1;
      if (p.st === 'ice' || (p.st === 'freezing' && p.delay <= 0 && Math.hypot(p.x - p.tx, p.y - p.ty) < 10)) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha *= 0.96;
        ctx.fillStyle = 'rgba(255,255,255,.95)'; D.roundRect(-7.5, -7.5, 15, 15, 4); ctx.fill();
        ctx.strokeStyle = '#8ccaf0'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = 'rgba(160,215,245,.6)'; ctx.fillRect(-3.5, -3.5, 7, 7);
        ctx.restore();
        return;
      }
      blit(p.t === 's' ? sp.s : sp.w, p.x, p.y, a);
    });
    // 반사광
    g = ctx.createRadialGradient(L.cx, L.cy, L.r * 0.6, L.cx, L.cy, L.r);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(40,90,150,.16)');
    ctx.fillStyle = g; ctx.fillRect(L.cx - L.r, L.cy - L.r, L.r * 2, L.r * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(L.cx, L.cy, L.r - 14, Math.PI * 1.05, Math.PI * 1.38); ctx.stroke(); ctx.lineCap = 'butt';
    // 테두리
    g = ctx.createLinearGradient(L.cx - L.r, L.cy - L.r, L.cx + L.r, L.cy + L.r);
    g.addColorStop(0, '#d6dde6'); g.addColorStop(0.5, '#7f8da0'); g.addColorStop(1, '#4b5868');
    ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(L.cx, L.cy, L.r + 5, 0, TAU); ctx.stroke();
    D.label(L.cx, L.cy - L.r - 22, '🔍 입자 모형으로 보기', { bg: '#1b2333', size: 14 });
    // 범례
    const ly = L.cy + L.r + 34;
    card(L.cx - 128, ly - 20, 232, 52, { r: 14, blur: 8 });
    blit(sp.w, L.cx - 106, ly - 4, 1); D.text(L.cx - 94, ly, '물 분자', { size: 14, weight: 800, color: '#1b3a5c', align: 'left' });
    blit(sp.s, L.cx - 20, ly - 4, 1); D.text(L.cx - 7, ly, '염류 입자', { size: 14, weight: 800, color: '#1b3a5c', align: 'left' });
    const nw = Math.round(S2.nW);
    D.text(L.cx - 12, ly + 20, '염류 ' + NS + ' : 물 ' + nw, { size: 14.5, weight: 800, color: '#a35a00' });
  }
  function g2(c, r, len) {
    const gg = c.createLinearGradient(0, r, 0, r + len);
    gg.addColorStop(0, '#8b5a2b'); gg.addColorStop(1, '#5a3817');
    c.fillStyle = gg; D.roundRect(-9, r - 4, 18, len, 8); c.fill();
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-5, r + 4, 3, len - 14);
  }

  function drawMeter(t) {
    const x = 486, y = 14, w = 298, h = 134;
    card(x, y, w, h, { bg: 'rgba(255,255,255,.96)' });
    D.text(x + 16, y + 28, '염분계', { size: 16, weight: 800, color: '#1b3a5c', align: 'left' });
    const d = S2.sal - 35, col = Math.abs(d) < 0.25 ? '#334155' : d > 0 ? '#e11d48' : '#2563eb';
    ctx.font = '800 38px ' + MONO;
    const txt = S2.sal.toFixed(1);
    D.text(x + 16, y + 74, txt, { size: 38, weight: 800, color: col, align: 'left' });
    ctx.font = '800 38px ' + MONO; const tw = ctx.measureText(txt).width;
    D.text(x + 22 + tw, y + 74, 'psu', { size: 16, weight: 800, color: '#64748b', align: 'left' });
    if (Math.abs(d) >= 0.25) D.label(x + w - 16, y + 28, (d > 0 ? '▲ 높아졌어요 +' : '▼ 낮아졌어요 ') + d.toFixed(1), { bg: d > 0 ? '#ffe4e6' : '#dbeafe', color: col, size: 13.5, align: 'right' });
    else D.label(x + w - 16, y + 28, '처음 값 (35 psu)', { bg: '#eef2f6', color: '#64748b', size: 13.5, align: 'right' });
    // 눈금 막대
    const bx = x + 18, bw = w - 36, by = y + 94, lo = 26, hi = 46;
    g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, '#c9ecfb'); g.addColorStop(1, '#1d5fb8');
    ctx.fillStyle = g; D.roundRect(bx, by, bw, 12, 6); ctx.fill();
    [30, 35, 40, 45].forEach((v) => {
      const px = bx + (v - lo) / (hi - lo) * bw;
      ctx.fillStyle = '#64748b'; ctx.fillRect(px - 0.75, by + 12, 1.5, 5);
      D.text(px, by + 30, String(v), { size: 12.5, weight: 700, color: '#64748b' });
    });
    const mx = bx + clamp((S2.sal - lo) / (hi - lo), 0, 1) * bw;
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(mx, by + 2); ctx.lineTo(mx - 8, by - 10); ctx.lineTo(mx + 8, by - 10); ctx.closePath(); ctx.fill();
    const mx0 = bx + (35 - lo) / (hi - lo) * bw;
    ctx.strokeStyle = 'rgba(30,40,60,.5)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(mx0, by - 8); ctx.lineTo(mx0, by + 14); ctx.stroke(); ctx.setLineDash([]);
  }
  let g;

  /* =========================================================
     장면 3 · 세 해역의 염류 구성 원그래프
     ========================================================= */
  const SEA3 = [{ name: '황해 시료', salt: 31, col: '#0d9488' }, { name: '해수 시료', salt: 35, col: '#2563eb' }, { name: '홍해 시료', salt: 40, col: '#b45309' }];
  const SALTS = [
    { name: '염화 나트륨', pct: 77.9, col: '#2563eb' },
    { name: '염화 마그네슘', pct: 9.6, col: '#f59e0b' },
    { name: '황산 마그네슘', pct: 6.1, col: '#10b981' },
    { name: '황산 칼슘', pct: 4.0, col: '#ef4444' },
    { name: '황산 칼륨', pct: 2.1, col: '#8b5cf6' },
    { name: '기타', pct: 0.3, col: '#94a3b8' },
  ];
  const PIE_Y = 240;
  function pieTarget(i) {
    const r0 = 112 * Math.sqrt(SEA3[i].salt / 40);
    if (S3.mode === 0) return { x: [150, 400, 650][i], r: r0 };
    if (S3.mode === 1) return { x: [150, 400, 650][i], r: 104 };
    return { x: 400, r: 104 };
  }
  function updateS3(dt) {
    for (let i = 0; i < 3; i++) {
      const tg = pieTarget(i);
      S3.x[i] = approach(S3.x[i], tg.x, dt, 5.5); S3.r[i] = approach(S3.r[i], tg.r, dt, 5.5);
    }
    for (let k = 0; k < 6; k++) S3.ex[k] = approach(S3.ex[k], S3.sel === k ? 1 : 0, dt, 11);
    S3.msgA = approach(S3.msgA, S3.mode === 2 ? 1 : 0, dt, 4);
  }
  function chipRect(k) { return { x: 22 + (k % 3) * 254, y: 420 + Math.floor(k / 3) * 52, w: 240, h: 42 }; }
  function sliceAt(p) {
    const order = S3.mode === 2 ? [2] : [0, 1, 2];
    for (let q = order.length - 1; q >= 0; q--) {
      const i = order[q], dx = p.x - S3.x[i], dy = p.y - PIE_Y, d = Math.hypot(dx, dy);
      if (d <= S3.r[i] + 6) {
        let ang = Math.atan2(dy, dx) + Math.PI / 2; if (ang < 0) ang += TAU;
        let cum = 0;
        for (let k = 0; k < 6; k++) { cum += SALTS[k].pct; if (ang / TAU * 100 <= cum + 1e-6) return k; }
        return 5;
      }
    }
    return -1;
  }
  function s3Select(k) {
    if (k < 0) return;
    S3.sel = S3.sel === k ? -1 : k;
    if (S3.sel >= 0) S3.tapped.add(k);
    Sound.tick();
  }
  function s3Mode(m) {
    if (S3.mode === m) return;
    S3.mode = m; S3.visited.add(m); Sound.click();
  }
  function drawPie(i, alpha) {
    const cx = S3.x[i], cy = PIE_Y, r = S3.r[i];
    alphaDo(alpha, () => {
      D.shadow(() => { ellipse(cx, cy, r, r); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 16, y: 6, color: 'rgba(30,60,100,.25)' });
      let a0 = -Math.PI / 2;
      SALTS.forEach((s, k) => {
        const a1 = a0 + s.pct / 100 * TAU, mid = (a0 + a1) / 2, ex = S3.ex[k] * 14;
        const ox = Math.cos(mid) * ex, oy = Math.sin(mid) * ex;
        ctx.beginPath(); ctx.moveTo(cx + ox, cy + oy); ctx.arc(cx + ox, cy + oy, r, a0, a1); ctx.closePath();
        ctx.fillStyle = s.col; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = S3.sel === k ? 3.5 : 2; ctx.lineJoin = 'round'; ctx.stroke();
        if (s.pct >= 9) {
          const rr = k === 0 ? 0.52 : 0.72;
          D.text(cx + ox + Math.cos(mid) * r * rr, cy + oy + Math.sin(mid) * r * rr + 5, s.pct.toFixed(1) + '%', { size: k === 0 ? 20 : 13.5, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.28)', strokeWidth: 3 });
        }
        a0 = a1;
      });
      const gl = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.1, cx, cy, r);
      gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(0.6, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.08)');
      ctx.fillStyle = gl; ellipse(cx, cy, r, r); ctx.fill();
    });
  }
  function drawS3(t) {
    let gg = ctx.createLinearGradient(0, 0, 0, VH);
    gg.addColorStop(0, '#e9f3fb'); gg.addColorStop(1, '#fbfdff');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, VW, VH);
    const heads = ['세 바다의 염류 구성 (해수 1 kg 속 염류)', '원의 크기를 똑같이 맞춰 보니…', '세 원그래프를 겹쳐 보니… 똑같아요!'];
    const subs = ['원의 넓이 = 염류의 총량이에요. 염분이 클수록 커요.', '조각의 크기와 순서가 모두 같아요.', '염분이 달라도 염류 사이의 비율은 같아요.'];
    D.text(VW / 2, 32, heads[S3.mode], { size: 20, weight: 800, color: '#14395c' });
    D.text(VW / 2, 56, subs[S3.mode], { size: 14.5, weight: 700, color: '#587390' });
    // 이름표
    for (let i = 0; i < 3; i++) {
      const x = [150, 400, 650][i];
      D.label(x, 96, SEA3[i].name + ' · ' + SEA3[i].salt + ' psu', { bg: SEA3[i].col, size: 14.5 });
    }
    if (S3.mode === 2) { drawPie(0, 1); drawPie(1, 1); drawPie(2, 1); }
    else { drawPie(0, 1); drawPie(1, 1); drawPie(2, 1); }
    // 아래 값
    for (let i = 0; i < 3; i++) {
      const x = [150, 400, 650][i];
      const a = S3.mode === 2 ? 0 : 1;
      alphaDo(a, () => {
        let txt;
        if (S3.sel >= 0) {
          const s = SALTS[S3.sel], g = SEA3[i].salt * s.pct / 100;
          txt = g.toFixed(1) + ' g · ' + s.pct.toFixed(1) + ' %';
          const w = 170;
          card(x - w / 2, 366, w, 34, { r: 17, bg: '#fff', border: s.col, bw: 2.4, blur: 8 });
          D.text(x, 389, txt, { size: 15, weight: 800, color: shade(s.col, -0.2) });
        } else {
          txt = S3.mode === 0 ? '염류 ' + SEA3[i].salt + ' g' : '전체 100 %';
          card(x - 70, 366, 140, 34, { r: 17, bg: '#fff', blur: 8 });
          D.text(x, 389, txt, { size: 15, weight: 800, color: '#14395c' });
        }
      });
    }
    if (S3.mode === 2) {
      alphaDo(S3.msgA, () => {
        const sel = S3.sel >= 0 ? SALTS[S3.sel] : null;
        card(200, 366, 400, 34, { r: 17, bg: '#fff', border: '#10b981', bw: 2.4, blur: 8 });
        D.text(400, 389, sel ? sel.name + '은 세 바다에서 모두 ' + sel.pct.toFixed(1) + ' %' : '세 바다 모두 NaCl 77.9 % · MgCl₂ 9.6 % …', { size: 15, weight: 800, color: '#047857' });
      });
    }
    // 범례 이름표
    SALTS.forEach((s, k) => {
      const c = chipRect(k), on = S3.sel === k;
      card(c.x, c.y, c.w, c.h, { r: 12, bg: on ? '#fff' : 'rgba(255,255,255,.92)', border: on ? s.col : 'rgba(120,150,180,.35)', bw: on ? 3 : 1.5, blur: on ? 12 : 6 });
      ctx.fillStyle = s.col; D.roundRect(c.x + 12, c.y + 12, 18, 18, 5); ctx.fill();
      D.text(c.x + 40, c.y + 27, s.name, { size: 15, weight: 800, color: '#14395c', align: 'left' });
      D.text(c.x + c.w - 14, c.y + 27, s.pct.toFixed(1) + ' %', { size: 15, weight: 800, color: shade(s.col, -0.25), align: 'right' });
    });
    if (S3.mode === 2) {
      alphaDo(S3.msgA, () => D.label(VW / 2, 556, '염분비 일정 법칙: 염분은 달라도 염류 사이의 비율은 일정해요', { bg: '#047857', size: 15 }));
    } else {
      D.text(VW / 2, 558, '👆 조각이나 이름표를 눌러 보세요', { size: 15, weight: 700, color: '#587390' });
    }
  }

  /* =========================================================
     장면 4 · 우리나라 주변 바다의 염분 (예시 자료)
     ========================================================= */
  const px4 = (lon) => (lon - 118) / 24.5 * VW, py4 = (lat) => (44.5 - lat) / 14.5 * VH;
  const ASIA = [[116, 46], [137.5, 46], [136.6, 45], [135.5, 44], [134, 43.2], [132.6, 42.9], [131.9, 42.7], [130.65, 42.3], [129.8, 41.8], [129.3, 41], [128.2, 40.1], [127.65, 39.85], [127.45, 39.15],
    [127.9, 38.9], [128.37, 38.6], [128.6, 38.2], [128.95, 37.75], [129.2, 37.4], [129.4, 37], [129.4, 36.4], [129.58, 36.07], [129.45, 35.5], [129.2, 35.2], [128.8, 35], [128.5, 34.95], [128, 34.75],
    [127.5, 34.6], [127.1, 34.45], [126.7, 34.3], [126.35, 34.45], [126.35, 34.8], [126.45, 35.3], [126.55, 35.95], [126.5, 36.4], [126.15, 36.75], [126.8, 36.95], [126.6, 37.45], [126.4, 37.75],
    [125.9, 37.65], [125.4, 37.7], [125.1, 37.75], [124.85, 38.15], [125.3, 38.65], [124.9, 38.95], [125.1, 39.5], [124.7, 39.75], [124.35, 39.9], [123.5, 39.7], [122.8, 39.5], [121.65, 38.85],
    [121.2, 39.4], [121.9, 40.2], [122.2, 40.6], [121.8, 40.85], [121, 40.8], [120.7, 40.6], [119.6, 39.9], [118.9, 39.2], [117.7, 38.95], [117.9, 38.3], [119, 37.7], [119.2, 37.3], [119.9, 37.2],
    [120.8, 37.82], [121.4, 37.6], [122.1, 37.5], [122.7, 37.4], [121.2, 36.7], [120.4, 36.05], [119.5, 35.4], [119.3, 34.75], [120.45, 33.4], [121, 32.8], [121.6, 32], [121.9, 31.6],
    [121.9, 30.9], [121.4, 30.6], [121, 30.4], [121.9, 29.95], [122.2, 29.5], [116, 29.5]];
  const HONSHU = [[130.9, 33.95], [131.4, 34.4], [131.85, 34.7], [132.1, 34.9], [132.7, 35.4], [133.3, 35.57], [134.2, 35.55], [134.8, 35.65], [135.4, 35.55], [136.05, 35.65], [136.2, 36.2],
    [136.65, 36.6], [136.75, 36.9], [136.9, 37.4], [137.35, 37.5], [137.0, 37.1], [137.2, 36.75], [137.85, 37.05], [138.2, 37.2], [139, 37.95], [139.4, 38.25], [139.83, 38.92], [140.05, 39.75],
    [139.7, 39.95], [140, 40.2], [139.9, 40.65], [140.3, 41.25], [140.7, 41], [140.9, 41.5], [141.45, 41.4], [141.55, 40.5], [142, 39.65], [141.9, 39.25], [141.5, 38.4], [141.05, 38.2],
    [141, 37.05], [140.6, 36.4], [140.85, 35.7], [140.3, 35.1], [139.85, 34.9], [139.65, 35.25], [139.85, 35.6], [139.65, 35.4], [139.15, 35.25], [138.85, 34.6], [138.4, 34.9], [138.2, 34.6],
    [137.7, 34.65], [137, 34.6], [136.8, 35], [136.85, 34.4], [136, 33.7], [135.75, 33.45], [135.15, 34.2], [135.4, 34.65], [134.7, 34.75], [133.9, 34.5], [133.35, 34.45], [132.4, 34.35], [132.1, 34.15], [131.8, 33.95]];
  const KYUSHU = [[129.7, 33.2], [129.8, 33.6], [130.3, 33.6], [130.9, 33.9], [131.7, 33.6], [131.9, 33.2], [131.7, 32.4], [131.3, 31.4], [130.65, 31], [130.2, 31.3], [130.2, 32], [130, 32.6], [129.9, 32.8]];
  const SHIKOKU = [[132.9, 34.1], [133.7, 34.3], [134.6, 34.2], [134.7, 33.8], [134.2, 33.25], [133, 32.75], [132.4, 33.4], [132.4, 33.9]];
  const HOKKAIDO = [[140, 41.4], [140.7, 41.8], [141, 42.3], [141.7, 42.6], [143, 42.8], [143, 45], [141.65, 45], [141.35, 43.7], [141, 43.2], [140.4, 43.2], [140.3, 42.6], [140.1, 42.3]];
  const JEJU = [[126.2, 33.4], [126.5, 33.55], [126.95, 33.45], [126.9, 33.25], [126.5, 33.2]];
  const TSUSHIMA = [[129.3, 34.7], [129.45, 34.65], [129.35, 34.2], [129.15, 34.3]];
  const RIVERS = [
    { n: '양쯔 강', pts: [[118, 31.2], [120, 31.6], [121.9, 31.5]], mouth: [121.9, 31.6], k: 1.5, tx: 119.2, ty: 31.9 },
    { n: '황허', pts: [[118, 36.3], [118.5, 37], [118.95, 37.7]], mouth: [119, 37.75], k: 1.2, tx: 118.3, ty: 36.6 },
    { n: '압록강', pts: [[126.5, 41.5], [125.2, 40.5], [124.4, 39.9]], mouth: [124.35, 39.85], k: 1.0, tx: 126.3, ty: 41.2 },
    { n: '한강', pts: [[128.2, 37.6], [127.2, 37.55], [126.6, 37.65]], mouth: [126.55, 37.65], k: 0.9, tx: 127.7, ty: 37.9 },
    { n: '낙동강', pts: [[128.7, 36.5], [128.6, 35.6], [128.95, 35.1]], mouth: [128.95, 35.08], k: 0.7, tx: 129.4, ty: 35.75 },
  ];
  const SEAS4 = [
    { name: '황해', lon: 124.2, lat: 36.3, w: [32.0, 31.0], col: '#0d9488', why: '큰 강이 많이 흘러들어 염분이 낮아요.' },
    { name: '남해', lon: 127.6, lat: 33.6, w: [34.2, 32.8], col: '#2563eb', why: '강물의 영향이 황해보다 작아요.' },
    { name: '동해', lon: 132.6, lat: 39.5, w: [34.2, 33.8], col: '#7c3aed', why: '큰 강이 적어 염분이 높고 변화가 작아요.' },
  ];
  function polyPath(g, pts, close) {
    g.beginPath();
    pts.forEach((q, i) => { const x = px4(q[0]), y = py4(q[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    if (close !== false) g.closePath();
  }
  function landSprite() {
    return sprite('land4', VW, VH, (g) => {
      const shapes = [ASIA, HONSHU, KYUSHU, SHIKOKU, HOKKAIDO, JEJU, TSUSHIMA];
      g.lineJoin = 'round';
      [[16, 'rgba(255,255,255,.28)'], [8, 'rgba(255,255,255,.4)']].forEach((q) => { g.strokeStyle = q[1]; g.lineWidth = q[0]; shapes.forEach((s) => { polyPath(g, s); g.stroke(); }); });
      const lg = g.createLinearGradient(0, 0, 0, VH);
      lg.addColorStop(0, '#efe9d2'); lg.addColorStop(1, '#ddd2ac');
      g.fillStyle = lg; shapes.forEach((s) => { polyPath(g, s); g.fill(); });
      g.strokeStyle = '#b8a97c'; g.lineWidth = 1.6; shapes.forEach((s) => { polyPath(g, s); g.stroke(); });
      // 국경선 느낌(점선)
      g.strokeStyle = 'rgba(150,130,90,.5)'; g.lineWidth = 1.4; g.setLineDash([5, 4]);
      g.beginPath(); [[124.35, 39.9], [125.5, 40.6], [126.5, 41.5], [128.1, 42.0], [129.2, 42.4], [130.65, 42.3]].forEach((q, i) => { const x = px4(q[0]), y = py4(q[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
      g.beginPath(); [[127.45, 38.6], [128.37, 38.6]].forEach((q, i) => { const x = px4(q[0]), y = py4(q[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
      g.setLineDash([]);
    });
  }
  function salCol(v) { return mixc('#d3effb', '#265fb4', clamp((v - 30) / 5, 0, 1)); }
  function pillRect(i) { const s = SEAS4[i]; return { x: px4(s.lon) - 60, y: py4(s.lat) - 25, w: 120, h: 50 }; }
  function updateS4(dt) {
    S4.sum = approach(S4.sum, S4.season, dt, 3.2);
    for (let i = 0; i < 3; i++) S4.v[i] = approach(S4.v[i], SEAS4[i].w[S4.season], dt, 3.2);
    S4.cloudT += dt;
  }
  function s4Pick(i) {
    S4.sel = i; S4.seen.add(i + '|' + S4.season); Sound.tick();
  }
  function s4Season(s) {
    if (S4.season === s) return;
    S4.season = s; S4.seasonsSeen.add(s); Sound.click();
    if (S4.sel >= 0) S4.seen.add(S4.sel + '|' + s);
  }
  function drawS4(t) {
    const sm = S4.sum;
    ctx.fillStyle = salCol(33.4); ctx.fillRect(0, 0, VW, VH);
    // 해역별 염분 색
    [[0, 218, 350, 170], [1, 330, 470, 130], [2, 470, 215, 250]].forEach((b) => {
      const gg = ctx.createRadialGradient(b[1], b[2], 0, b[1], b[2], b[3]);
      const c = salCol(S4.v[b[0]]);
      gg.addColorStop(0, rgba(c, 1)); gg.addColorStop(0.62, rgba(c, 0.92)); gg.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = gg; ctx.fillRect(b[1] - b[3], b[2] - b[3], b[3] * 2, b[3] * 2);
    });
    // 강물 퍼짐 (여름에 더 넓게)
    RIVERS.forEach((r) => {
      const x = px4(r.mouth[0]), y = py4(r.mouth[1]), rad = (16 + 30 * sm) * r.k * (1 + 0.04 * Math.sin(t * 1.5 + x));
      const gg = ctx.createRadialGradient(x, y, 0, x, y, rad);
      gg.addColorStop(0, 'rgba(226,214,160,.78)'); gg.addColorStop(1, 'rgba(226,214,160,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    });
    blit(landSprite(), VW / 2, VH / 2, 1);
    // 강
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    RIVERS.forEach((r) => {
      polyPath(ctx, r.pts, false);
      ctx.strokeStyle = '#4aa6e3'; ctx.lineWidth = 3 + 1.4 * sm * r.k; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.4; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -t * (22 + 26 * sm); ctx.stroke(); ctx.setLineDash([]);
      D.text(px4(r.tx), py4(r.ty), r.n, { size: 13, weight: 800, color: '#2c6aa0', stroke: 'rgba(255,255,255,.9)', strokeWidth: 4 });
    });
    ctx.restore();
    // 나라 이름
    [['중국', 120.2, 34.2], ['북한', 126.9, 40.2], ['한국', 128.0, 36.7], ['일본', 137.6, 36.2], ['러시아', 134.2, 44.1]].forEach((q) => D.text(px4(q[1]), py4(q[2]), q[0], { size: 16, weight: 800, color: 'rgba(120,100,60,.85)', stroke: 'rgba(255,255,255,.7)', strokeWidth: 4 }));
    // 구름과 비 (여름)
    if (sm > 0.03) {
      alphaDo(sm, () => {
        [[170, 300, 1], [300, 430, 0.9], [220, 205, 0.8]].forEach((c, i) => {
          const cx = c[0] + Math.sin(S4.cloudT * 0.25 + i * 2) * 22, cy = c[1] + Math.cos(S4.cloudT * 0.2 + i) * 6;
          ctx.fillStyle = 'rgba(90,110,135,.22)'; cloudPath(cx + 3, cy + 5, c[2]); ctx.fill();
          ctx.fillStyle = 'rgba(105,125,150,.95)'; cloudPath(cx, cy, c[2]); ctx.fill();
          ctx.fillStyle = 'rgba(160,180,200,.7)'; cloudPath(cx - 3, cy - 6, c[2] * 0.82); ctx.fill();
          ctx.strokeStyle = 'rgba(40,90,160,.8)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
          for (let k = 0; k < 6; k++) {
            const ph = (t * 1.5 + k * 0.17 + i * 0.3) % 1, rx = cx - 40 + k * 15, ry = cy + 30 + ph * 40;
            ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 11); ctx.stroke();
          }
        });
      });
    }
    // 바다 이름표
    SEAS4.forEach((s, i) => {
      const r = pillRect(i), on = S4.sel === i, v = S4.v[i];
      card(r.x, r.y, r.w, r.h, { r: 16, bg: 'rgba(255,255,255,.96)', border: on ? s.col : 'rgba(255,255,255,0)', bw: 3, blur: on ? 14 : 8 });
      D.text(r.x + r.w / 2, r.y + 20, s.name, { size: 15, weight: 800, color: s.col });
      ctx.font = '800 20px ' + MONO;
      D.text(r.x + r.w / 2 - 12, r.y + 42, v.toFixed(1), { size: 20, weight: 800, color: '#14395c' });
      D.text(r.x + r.w / 2 + 28, r.y + 42, 'psu', { size: 12.5, weight: 800, color: '#64748b', align: 'left' });
      if (!on && game && game.level === 3 && !S4.seen.size) D.ring(r.x + r.w / 2, r.y + r.h / 2, 38, t, { color: '#f59e0b', width: 2.5 });
    });
    // 계절 배지와 안내
    card(14, 14, 150, 40, { r: 20, bg: S4.season ? '#fff4d6' : '#e4f1ff', blur: 8 });
    D.text(89, 40, S4.season ? '☀️ 여름 (장마)' : '❄️ 겨울', { size: 16, weight: 800, color: S4.season ? '#9a5b00' : '#1d4e89' });
    card(176, 10, 612, 50, { r: 14, bg: 'rgba(255,255,255,.93)', blur: 8 });
    D.label(204, 28, '예시 자료', { bg: '#f59e0b', size: 13, pad: 7 });
    D.text(280, 29, '실제 값과 다를 수 있어요.', { size: 13.5, weight: 700, color: '#475569', align: 'left' });
    D.text(188, 50, '국립해양조사원 바다누리에서 실시간 자료를 확인해 보세요.', { size: 13.5, weight: 700, color: '#1d4e89', align: 'left' });
    // 범례
    card(150, 538, 214, 52, { r: 12, bg: 'rgba(255,255,255,.95)', blur: 8 });
    const lg = ctx.createLinearGradient(164, 0, 350, 0); lg.addColorStop(0, salCol(30)); lg.addColorStop(1, salCol(35));
    ctx.fillStyle = lg; D.roundRect(164, 548, 186, 12, 6); ctx.fill();
    D.text(164, 580, '30', { size: 12.5, weight: 700, color: '#475569', align: 'left' });
    D.text(257, 580, '염분(psu)', { size: 12.5, weight: 700, color: '#475569' });
    D.text(350, 580, '35', { size: 12.5, weight: 700, color: '#475569', align: 'right' });
    // 정보 상자
    const bx = 530, by = 486, bw = 262, bh = 106;
    card(bx, by, bw, bh, { r: 14, bg: 'rgba(255,255,255,.96)', blur: 12 });
    if (S4.sel < 0) {
      D.text(bx + bw / 2, by + 48, '👆 바다 이름표를 눌러 보세요', { size: 15, weight: 800, color: '#14395c' });
      D.text(bx + bw / 2, by + 74, '겨울·여름 값을 비교해요', { size: 13.5, weight: 700, color: '#64748b' });
    } else {
      const s = SEAS4[S4.sel];
      D.text(bx + 14, by + 28, s.name + ' · ' + (S4.season ? '여름' : '겨울') + ' ' + s.w[S4.season].toFixed(1) + ' psu', { size: 16, weight: 800, color: s.col, align: 'left' });
      ctx.font = D.font(13.5, 700);
      let why = s.why + (S4.season && S4.sel < 2 ? ' 여름엔 장마·강수로 더 낮아져요.' : S4.season ? ' 여름엔 비가 와서 조금 낮아져요.' : '');
      const lines = wrapText(why, bw - 28);
      lines.slice(0, 3).forEach((ln, k) => D.text(bx + 14, by + 52 + k * 20, ln, { size: 13.5, weight: 700, color: '#334155', align: 'left' }));
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
     화면 전환 · 조작 · 읽기값
     ========================================================= */
  const DRAWS = [drawS1, drawS2, drawS3, drawS4];
  const lvl = () => (game ? (game.free ? 3 : game.level) : 0);
  function setScene(i) {
    if (i === S.scene) return;
    S.prev = S.scene; S.scene = i; S.fade = 0;
    SciSim.tween(S, { fade: 1 }, { duration: 0.45, ease: 'outCubic', onDone() { S.prev = -1; } });
    syncPanels();
    if (i === 1) { S2.spotNew = 1; setTimeout(() => { S2.spotNew = 0; }, 5000); }
  }
  function syncPanels() {
    $$('[data-scene]').forEach((n) => n.classList.toggle('is-off', +n.getAttribute('data-scene') !== S.scene));
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.s === S.scene));
    const hints = ['', '', '', ''];
    updateReadouts(true);
  }
  function syncTabs() {
    const mx = lvl();
    $$('#sceneSeg button').forEach((b) => {
      const i = +b.dataset.s, was = b.disabled;
      b.disabled = i > mx;
      if (was && !b.disabled && i === mx && i > 0) { b.classList.add('nudge'); setTimeout(() => b.classList.remove('nudge'), 3000); }
    });
  }
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { if (b.disabled) return; Sound.click(); setScene(+b.dataset.s); }));

  /* 시료 · 가열 */
  $$('#sampleSeg button').forEach((b) => b.addEventListener('click', () => {
    if (s1Busy() || S1.phase === 'weighing') { Sound.fail(); return; }
    const i = +b.dataset.i;
    $$('#sampleSeg button').forEach((x) => x.classList.toggle('on', x === b));
    if (i === S1.sample && S1.phase === 'idle' && S1.prog === 0) return;
    s1Select(i, false);
  }));
  $('#heatBtn').addEventListener('click', () => s1Heat());
  function syncHeatBtn() {
    const b = $('#heatBtn');
    const label = s1Busy() ? '🫗 시료를 붓는 중…' : S1.phase === 'idle' ? (S1.prog > 0.01 ? '🔥 가열 계속하기' : '🔥 가열하기') : S1.phase === 'heating' ? '⏸ 가열 멈추기' : S1.phase === 'weighed' ? '↺ 다시 하기' : '⚖️ 질량을 재는 중…';
    if (b.textContent !== label) b.textContent = label;
    b.disabled = s1Busy() || S1.phase === 'weighing' || S1.phase === 'dried';
    $$('#sampleSeg button').forEach((x) => { x.classList.toggle('on', +x.dataset.i === S1.sample); });
  }
  /* 바다 상자 */
  $$('#evGrid button').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.ev;
    if (!fireEv(k)) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
    syncEvButtons();
  }));
  function syncEvButtons() {
    $$('#evGrid button').forEach((b) => b.classList.toggle('done', S2.fired.has(b.dataset.ev)));
  }
  /* 원그래프 */
  $$('#pieSeg button').forEach((b) => b.addEventListener('click', () => { s3Mode(+b.dataset.m); syncSegs(); }));
  /* 계절 */
  $$('#seasonSeg button').forEach((b) => b.addEventListener('click', () => { s4Season(+b.dataset.s); syncSegs(); }));
  function syncSegs() {
    $$('#pieSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.m === S3.mode));
    $$('#seasonSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.s === S4.season));
  }
  /* 처음으로 */
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    if (S.scene === 0) { s1Select(S1.sample, false); }
    else if (S.scene === 1) { initBox(true); syncEvButtons(); }
    else if (S.scene === 2) { S3.mode = 0; S3.sel = -1; syncSegs(); }
    else { S4.season = 0; S4.sel = -1; syncSegs(); }
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
      const sm = SAMPLES[S1.sample];
      setR(0, '해수의 양 (' + sm.short + ' 시료)', '1000<small>g</small>');
      setR(1, '남은 염류의 질량', S1.landed.toFixed(1) + '<small>g</small>');
      setR(2, '염분', S1.phase === 'weighed' ? S1.landed + '<small>psu</small>' : '? <small>psu</small>');
    } else if (S.scene === 1) {
      const d = S2.sal - 35;
      setR(0, '염분계', S2.sal.toFixed(1) + '<small>psu</small>');
      setR(1, '염류 입자 : 물 분자', NS + ' : ' + Math.round(S2.nW));
      setR(2, '처음(35 psu)보다', (Math.abs(d) < 0.25 ? '변화 없음' : (d > 0 ? '▲ +' : '▼ ') + d.toFixed(1) + '<small>psu</small>'));
    } else if (S.scene === 2) {
      const sel = S3.sel >= 0 ? SALTS[S3.sel] : SALTS[0];
      for (let i = 0; i < 3; i++) setR(i, SEA3[i].name + ' · ' + sel.name, (SEA3[i].salt * sel.pct / 100).toFixed(1) + '<small>g (' + sel.pct.toFixed(1) + '%)</small>');
    } else {
      const s = S4.sel >= 0 ? SEAS4[S4.sel] : null;
      setR(0, '선택한 바다', s ? s.name : '—');
      setR(1, '염분 (예시 자료)', s ? s.w[S4.season].toFixed(1) + '<small>psu</small>' : '—');
      setR(2, '계절', S4.season ? '☀️ 여름' : '❄️ 겨울');
    }
  }

  /* 터치·마우스 */
  SciSim.pointer(view, {
    down(p) {
      if (S.scene === 0) {
        if (Math.hypot(p.x - DISH.cx, p.y - 470) < 90 || (Math.abs(p.x - DISH.cx) < DISH.rx && p.y > DISH.rimY - 20 && p.y < 520)) s1Heat();
      } else if (S.scene === 1) {
        if (Math.hypot(p.x - 66, p.y - 82) < 52) { fireEv('evap'); syncEvButtons(); }
        else if (p.x > 230 && p.x < 410 && p.y > 50 && p.y < 150) { fireEv('rain'); syncEvButtons(); }
        else if (p.x < TANK.x + 20 && p.y > TANK.y - 40 && p.y < TANK.y + 60) { fireEv('river'); syncEvButtons(); }
      } else if (S.scene === 2) {
        for (let k = 0; k < 6; k++) { const c = chipRect(k); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) { s3Select(k); return false; } }
        const k = sliceAt(p);
        if (k >= 0) s3Select(k); else if (S3.sel >= 0 && p.y < 420) { S3.sel = -1; }
      } else {
        for (let i = 0; i < 3; i++) { const r = pillRect(i); if (p.x >= r.x - 8 && p.x <= r.x + r.w + 8 && p.y >= r.y - 8 && p.y <= r.y + r.h + 8) { s4Pick(i); return false; } }
      }
      return false;
    },
    hover(p) {
      if (S.scene === 2) { if (sliceAt(p) >= 0) return 'pointer'; for (let k = 0; k < 6; k++) { const c = chipRect(k); if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return 'pointer'; } }
      if (S.scene === 3) { for (let i = 0; i < 3; i++) { const r = pillRect(i); if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return 'pointer'; } }
      if (S.scene === 1 && (Math.hypot(p.x - 66, p.y - 82) < 52 || (p.x > 230 && p.x < 410 && p.y > 50 && p.y < 150))) return 'pointer';
      return '';
    },
  });

  /* =========================================================
     미션
     ========================================================= */
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const dishStatus = () => {
    if (s1Busy()) return '시료를 증발 접시에 붓는 중…';
    if (S1.phase === 'idle') return S1.prog > 0.01 ? '⏸ 가열을 멈췄어요. 계속 가열하세요.' : '🔥 가열하기를 눌러요.';
    if (S1.phase === 'heating') return '물이 증발하는 중… 남은 물 <b>' + Math.round((1 - S1.prog) * 100) + ' %</b>';
    if (S1.phase === 'dried' || S1.phase === 'weighing') return '염류를 저울에 올리는 중… <b>' + S1.landed + ' g</b>';
    return '✅ 염류 <b>' + S1.landed + ' g</b> → 염분 <b>' + S1.landed + ' psu</b>';
  };
  function startS1(sample) { setScene(0); if (S1.sample !== sample || S1.phase !== 'idle' || S1.prog !== 0) s1Select(sample, false); }

  const LEVELS = [
    {
      title: '증발시켜 염분 구하기', short: '염분 측정', icon: '🧪', phase: '실험',
      features: ['dish'],
      intro: '<p class="si-q">❓ 탐구 질문: 바닷물은 어디서나 똑같이 짤까?</p>' +
        '<p>바닷물이 짠 까닭은 <b>염류</b>(소금 같은 물질)가 녹아 있기 때문이에요. 바닷물 <b>1 kg(1000 g)</b>에 녹아 있는 염류의 양을 g 수로 나타낸 것을 <b>염분</b>이라고 하고, 단위는 <b>psu</b>(실용 염분 단위)를 써요.</p>' +
        '<p>증발 접시에서 바닷물을 증발시켜 남은 염류의 질량으로 염분을 구해 봐요.</p>',
      setup() { setScene(0); },
      recap: '염분은 해수 1000 g에 녹아 있는 <b>염류의 g 수</b>예요. 바다마다 달라서 해수 35, 황해 31, 홍해 40 psu였어요.',
      summary: '<ul><li><b>염류</b>: 바닷물에 녹아 있는 소금 같은 물질들.</li>' +
        '<li><b>염분</b> = 해수 1 kg(1000 g)에 녹아 있는 염류의 총량(g). 단위는 <b>psu</b>.</li>' +
        '<li>염분 = 염류의 양(g) ÷ 해수의 양(g) × 1000</li>' +
        '<li>전 세계 바다의 평균 염분은 약 <b>35 psu</b>이지만, 바다마다 달라요.</li></ul>',
      missions: [
        {
          title: '증발시켜 염분 구하기',
          goal: '해수 시료 1000 g을 <b>가열</b>해 물을 모두 증발시키고, 남은 <b>염류의 질량</b>으로 염분을 구하세요.',
          hint: '오른쪽의 <b>🔥 가열하기</b>를 눌러요. 물이 다 날아가면 소금 결정이 저울로 옮겨져요.',
          setup() { startS1(0); showHint('🔥 가열하기를 눌러 보세요', 6000); },
          check: () => S1.measured[0],
          status: dishStatus,
          hold: 0.8,
          explain: '해수 1000 g을 모두 증발시키자 염류 <b>35 g</b>이 남았어요. 염분 = 35 ÷ 1000 × 1000 = <b>35 psu</b>예요.',
        },
        {
          title: '다른 바다의 시료도 재 보기',
          goal: '<b>황해 시료</b>와 <b>홍해 시료</b>도 같은 방법으로 염분을 구하세요. 세 값을 비교해 봐요.',
          hint: '시료 버튼에서 황해 시료를 고르고 가열해요. 이어서 홍해 시료도 해 보세요.',
          setup() { setScene(0); },
          check: () => S1.measured[1] && S1.measured[2],
          status: () => chk(S1.measured[1], '황해 시료' + (S1.measured[1] ? ' 31 psu' : '')) + ' · ' + chk(S1.measured[2], '홍해 시료' + (S1.measured[2] ? ' 40 psu' : '')) + '<br>' + dishStatus(),
          hold: 0.8,
          explain: '황해 시료는 <b>31 psu</b>, 홍해 시료는 <b>40 psu</b>예요. 같은 1000 g의 바닷물이어도 바다마다 녹아 있는 염류의 양이 달라요.',
        },
        {
          type: 'quiz', title: '염분 계산하기',
          goal: '해수 500 g을 증발시켰더니 염류 17 g이 남았어요. 이 해수의 염분은 몇 psu일까요?',
          choices: ['17 psu', '34 psu', '3.4 psu', '8.5 psu'],
          answer: 1,
          feedback: ['17 g은 해수 500 g 속의 염류예요. 염분은 해수 1000 g을 기준으로 나타내요.', '', '염류 17 g ÷ 해수 500 g = 0.034예요. 여기에 1000을 곱해야 해요.', '1000 g은 500 g의 2배이므로, 염류도 2배로 생각해 보세요.'],
          explain: '염분 = 17 ÷ 500 × 1000 = <b>34 psu</b>. 해수 1000 g(500 g의 2배)에는 염류가 34 g 들어 있는 셈이에요.',
        },
      ],
    },
    {
      title: '염분이 달라지는 까닭', short: '염분의 변화', icon: '🌊', phase: '탐구',
      features: ['box'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 바다마다 염분이 31, 35, 40 psu로 달랐어요.</div>' +
        '<p>같은 바다에서도 일어나는 일에 따라 염분이 달라져요. <b>바다 상자</b>에 햇빛(증발), 비, 강물, 결빙을 일으키고 <b>입자 돋보기</b>로 <b>물 분자와 염류 입자의 비율</b>을 지켜보며 까닭을 찾아봐요.</p>',
      setup() { setScene(1); initBox(false); syncEvButtons(); },
      recap: '<b>증발·결빙</b>은 물만 줄어 염분이 <b>높아지고</b>, <b>강수·강물 유입</b>은 물이 늘어 염분이 <b>낮아져요</b>. 염류 입자의 수는 그대로예요.',
      summary: '<ul><li>염분을 <b>높이는</b> 요인: <b>증발</b>, <b>해수의 결빙</b> (물만 줄거나 얼음이 되고, 얼음에는 염류가 거의 들어가지 않아요).</li>' +
        '<li>염분을 <b>낮추는</b> 요인: <b>강수</b>, <b>강물 유입</b>, <b>빙하의 융해</b> (담수가 더해져 물이 늘어요).</li>' +
        '<li>염류의 양은 그대로이고 <b>물의 양</b>이 달라져 염분이 변해요.</li></ul>',
      missions: [
        {
          title: '염분을 높이는 일 찾기',
          goal: '바다 상자에서 염분이 <b>높아지는</b> 일을 <b>2가지</b> 일으켜 보세요. 돋보기 속 입자와 염분계를 지켜봐요.',
          hint: '<b>☀️ 햇빛</b>과 <b>❄️ 바닷물 얼기</b> 버튼을 눌러 보세요. 화면의 해를 눌러도 돼요.',
          setup() { setScene(1); initBox(false); syncEvButtons(); showHint('☀️ 햇빛이나 ❄️ 얼기를 눌러 보세요', 6000); },
          check: () => S2.fired.has('evap') && S2.fired.has('freeze'),
          status: () => chk(S2.fired.has('evap'), '증발') + ' · ' + chk(S2.fired.has('freeze'), '결빙') + ' · 염분 <b>' + S2.sal.toFixed(1) + ' psu</b>',
          hold: 1.0,
          explain: '<b>증발</b>과 <b>결빙</b> 때는 물만 줄어들고 염류 입자 수는 그대로여서 염분이 높아졌어요.',
        },
        {
          title: '염분을 낮추는 일 찾기',
          goal: '이번에는 염분이 <b>낮아지는</b> 일을 <b>2가지</b> 일으켜 보세요.',
          hint: '<b>🌧️ 비</b>와 <b>🏞️ 강물 흘러듦</b> 버튼을 눌러 보세요. 구름이나 강을 눌러도 돼요.',
          setup() { setScene(1); initBox(false); syncEvButtons(); },
          check: () => S2.fired.has('rain') && S2.fired.has('river'),
          status: () => chk(S2.fired.has('rain'), '강수') + ' · ' + chk(S2.fired.has('river'), '강물 유입') + ' · 염분 <b>' + S2.sal.toFixed(1) + ' psu</b>',
          hold: 1.0,
          explain: '<b>강수</b>와 <b>강물 유입</b> 때는 담수가 더해져 물이 늘어나고, 염류 입자 수는 그대로여서 염분이 낮아졌어요.',
        },
        {
          type: 'quiz', title: '결빙과 염분',
          goal: '바닷물이 얼어 얼음이 생기면 남은 바닷물의 염분이 높아져요. 그 까닭은?',
          choices: ['얼음이 염류를 더 많이 만들어 내기 때문', '바닷물이 얼 때 물만 얼고 염류는 얼음에 거의 들어가지 않아, 남은 바닷물에 염류가 모이기 때문', '얼음이 녹아서 바닷물이 늘어나기 때문', '얼음이 생기면 바닷물의 부피가 늘어나기 때문'],
          answer: 1,
          feedback: ['염류는 새로 생기지 않아요. 돋보기 속 염류 입자 수는 그대로였죠?', '', '얼음이 "생기는" 것은 물이 줄어드는 일이에요. 물이 늘어나면 오히려 염분이 낮아져요.', '염분은 물과 염류의 비율로 정해져요. 얼음에 염류가 들어가는지 돋보기를 떠올려 보세요.'],
          explain: '바닷물이 얼 때는 <b>물만 얼음이 되고 염류는 얼음에 거의 들어가지 않아요</b>. 그래서 남은 바닷물은 염류의 비율이 커져 염분이 높아져요.',
        },
      ],
    },
    {
      title: '염류 구성 비교하기', short: '염분비 일정', icon: '🥧', phase: '분석',
      features: ['pies'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 바다마다, 그리고 일어나는 일에 따라 염분이 달라진다는 것을 알았어요.</div>' +
        '<p>그렇다면 염분이 다른 바다의 <b>염류 구성</b>도 다를까요? 세 시료 속 염류의 종류와 비율을 <b>원그래프</b>로 비교해 봐요.</p>',
      setup() { setScene(2); },
      recap: '염분이 달라도 염류 <b>사이의 비율은 일정</b>해요. 이를 <b>염분비 일정 법칙</b>이라고 해요.',
      summary: '<ul><li>해수의 염류 중 <b>염화 나트륨 약 77.9 %</b>, 염화 마그네슘 약 9.6 %, 황산 마그네슘 약 6.1 %, 황산 칼슘 약 4.0 %, 황산 칼륨 약 2.1 %, 기타예요.</li>' +
        '<li>바다마다 염분(염류의 총량)은 달라도 <b>염류 사이의 비율은 일정</b>해요 → <b>염분비 일정 법칙</b>.</li>' +
        '<li>해수가 오랜 시간 <b>순환하며 섞였기</b> 때문이에요.</li></ul>',
      missions: [
        {
          title: '세 원그래프 비교하기',
          goal: '<b>크기 같게</b>와 <b>겹쳐 보기</b>로 바꿔 보고, 원그래프의 <b>조각을 눌러</b> 세 바다의 값을 비교하세요.',
          hint: '오른쪽 <b>🥧 원그래프 보기</b> 버튼으로 바꿔요. 조각이나 아래 이름표를 눌러 봐요.',
          setup() { setScene(2); S3.mode = 0; S3.visited = new Set([0]); S3.tapped = new Set(); S3.sel = -1; syncSegs(); showHint('조각을 눌러 세 바다를 비교해 보세요', 6000); },
          check: () => S3.visited.has(1) && S3.visited.has(2) && S3.tapped.size >= 1,
          status: () => chk(S3.visited.has(1), '크기 같게') + ' · ' + chk(S3.visited.has(2), '겹쳐 보기') + ' · ' + chk(S3.tapped.size >= 1, '조각 누르기'),
          hold: 1.0,
          explain: '원의 <b>크기</b>(염류의 총량)는 달랐지만, 크기를 맞추거나 겹쳐 보니 <b>조각의 비율이 모두 같았어요</b>. 어느 바다에서나 염화 나트륨이 약 77.9 %예요.',
        },
        {
          type: 'quiz', title: '염분비가 일정한 까닭',
          goal: '황해·해수·홍해는 염분이 다른데도 염류 사이의 비율은 같아요. 그 까닭으로 알맞은 것은?',
          choices: ['바다마다 녹아 있는 염류의 종류가 달라서', '해수가 오랜 시간 순환하며 서로 섞였기 때문', '염분이 높을수록 염화 나트륨이 더 많이 녹기 때문', '강물이 염류를 같은 비율로 더해 주기 때문'],
          answer: 1,
          feedback: ['세 바다 모두 같은 종류의 염류가 들어 있었어요. 원그래프를 다시 보세요.', '', '염분이 높아도 염화 나트륨의 "비율"은 77.9 %로 같았어요.', '강물은 담수를 더해 염분을 낮춰요. 염류의 비율을 맞춰 주지는 않아요.'],
          explain: '해수는 <b>오랜 시간 순환하며 서로 섞여</b> 염류의 구성 비율이 어디서나 같아요. 염분이 달라지는 것은 물의 양이 달라지기 때문이에요.',
        },
      ],
    },
    {
      title: '우리나라 바다의 염분', short: '우리나라 바다', icon: '🗺️', phase: '적용',
      features: ['map'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 염분은 증발·강수·강물·결빙에 따라 달라지고, 염류 사이의 비율은 일정하다는 것을 알았어요.</div>' +
        '<p>우리나라 주변 바다인 <b>황해</b>, <b>남해</b>, <b>동해</b>의 염분을 <b>겨울</b>과 <b>여름</b>에 비교하고, 염분이 다른 까닭을 설명해 봐요. (예시 자료)</p>',
      setup() { setScene(3); },
      recap: '황해는 <b>강물 유입</b>이 많아 염분이 낮고, 여름에는 <b>장마·강수</b>로 염분이 더 낮아져요.',
      summary: '<ul><li><b>황해</b>: 큰 강이 흘러들어 염분이 낮아요 (예: 약 31~32 psu). <b>동해</b>는 약 34 psu로 더 높아요.</li>' +
        '<li><b>여름</b>에는 장마와 강수로 담수가 늘어 염분이 낮아져요.</li>' +
        '<li>실시간 자료는 국립해양조사원 <b>바다누리</b>에서 확인할 수 있어요. (이 화면은 예시 자료)</li></ul>',
      missions: [
        {
          title: '염분 지도 읽기',
          goal: '<b>겨울</b>과 <b>여름</b> 모두에서 <b>황해</b>와 <b>동해</b> 이름표를 눌러 염분을 읽어 보세요.',
          hint: '오른쪽에서 계절을 바꾸고, 지도의 이름표를 눌러요. 4가지를 모두 확인해야 해요.',
          setup() { setScene(3); S4.season = 0; S4.sel = -1; S4.seen = new Set(); syncSegs(); showHint('이름표를 눌러 염분을 읽어 보세요', 6000); },
          check: () => ['0|0', '0|1', '2|0', '2|1'].every((k) => S4.seen.has(k)),
          status: () => chk(S4.seen.has('0|0'), '황해·겨울') + ' · ' + chk(S4.seen.has('0|1'), '황해·여름') + '<br>' + chk(S4.seen.has('2|0'), '동해·겨울') + ' · ' + chk(S4.seen.has('2|1'), '동해·여름'),
          hold: 1.0,
          explain: '황해는 겨울 <b>32.0</b>, 여름 <b>31.0 psu</b>로 동해(겨울 34.2, 여름 33.8 psu)보다 낮고, 여름에 더 낮아져요. (예시 자료)',
        },
        {
          type: 'quiz', title: '황해의 염분이 낮은 까닭',
          goal: '지도를 보면 황해는 동해보다 염분이 낮아요. 그 까닭으로 가장 알맞은 것은?',
          choices: ['황해는 물이 많이 증발하기 때문', '황해로 큰 강물(담수)이 많이 흘러들기 때문', '황해에는 얼음이 얼어 염류가 모이기 때문', '황해에는 염류가 거의 녹아 있지 않기 때문'],
          answer: 1,
          feedback: ['증발은 염분을 높이는 요인이에요. 염분이 "낮은" 까닭을 찾아봐요.', '', '결빙도 염분을 높이는 요인이에요.', '황해에도 염류가 녹아 있어요. 다만 담수가 더해져 묽어졌을 뿐이에요.'],
          explain: '황해로는 큰 강물이 많이 흘러들어요. <b>담수가 더해져 염류가 묽어지므로</b> 염분이 낮아요.',
        },
        {
          type: 'quiz', title: '여름에 염분이 낮아지는 까닭',
          goal: '우리나라 바다는 겨울보다 여름에 염분이 낮아져요. 가장 알맞은 까닭은?',
          choices: ['여름에는 바다가 얼기 때문', '여름에는 햇빛이 강해 물이 모두 증발하기 때문', '여름에는 장마와 강수로 담수가 많이 더해지기 때문', '여름에는 염류가 바다 밑으로 가라앉기 때문'],
          answer: 2,
          feedback: ['여름에는 바다가 얼지 않아요. 결빙은 염분을 높이는 요인이기도 해요.', '증발은 염분을 높여요. 여름에는 그보다 담수가 늘어나는 효과가 커요.', '', '염류는 가라앉지 않고 바닷물에 고르게 녹아 있어요.'],
          explain: '여름에는 <b>장마와 강수, 강물 유입</b>으로 담수가 많이 더해져요. 물이 늘어나므로 염분이 낮아져요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'm3-salinity',
    mount: '#game',
    badge: '염분 탐험가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      dish: '🔥 증발 접시와 전자저울',
      box: '🌊 바다 상자 · 🔍 입자 돋보기 · 염분계',
      pies: '🥧 염류 구성 원그래프',
      map: '🗺️ 우리나라 바다 염분 지도',
    },
    onFeatures() { syncTabs(); },
    onMissionStart(m) { setScene(m._level); syncTabs(); },
    levels: LEVELS,
  });
  syncPanels(); syncTabs(); syncSegs(); syncEvButtons();

  /* =========================================================
     그리기 · 반복
     ========================================================= */
  let frameMs = 0, lastLvl = -1;
  SciSim.loop((dt, t) => {
    const f0 = performance.now();
    updateS1(dt); updateS2(dt); updateS3(dt); updateS4(dt); pfx.update(dt);
    view.apply();
    ctx.clearRect(0, 0, VW, VH);
    if (S.prev >= 0 && S.fade < 1) {
      ctx.save(); DRAWS[S.prev](t); ctx.restore();
      ctx.save(); ctx.globalAlpha = S.fade; ctx.translate(0, (1 - S.fade) * 14); DRAWS[S.scene](t); ctx.restore();
    } else DRAWS[S.scene](t);
    pfx.draw(ctx);
    updateReadouts();
    syncHeatBtn();
    const L = lvl();
    if (L !== lastLvl) { lastLvl = L; syncTabs(); }
    frameMs = performance.now() - f0;
  });

  window.__sim = {
    S, S1, S2, S3, S4, game: () => game, setScene, s1Select, s1Heat, fireEv, initBox, s3Mode, s3Select, s4Season, s4Pick, LEVELS, frameMs: () => frameMs, chipRect, pillRect,
    hit(p) { const r = view.canvas.getBoundingClientRect(); return { x: r.left + p.x * r.width / VW, y: r.top + p.y * r.height / VH }; },
  };
})();
