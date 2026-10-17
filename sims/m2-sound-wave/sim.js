/* =========================================================
   중2 Ⅲ. 빛과 파동 — 파동과 소리  [9과10-04]
   ① [관찰] 파동    줄 파동(표시점은 제자리에서 위아래) · 공기 입자(제자리에서 앞뒤) · 진공 종(공기가 없으면 소리가 안 들려요)
   ② [탐구] 진폭    오실로스코프: 소리 크기 ↔ 진폭, 마루·골·파장 이름 익히기
   ③ [탐구] 진동수  1초 동안 진동한 횟수(Hz): 높은 소리 ↔ 큰 진동수, 짧은 파장
   ④ [적용] 파형    소리굽쇠·피리·기타: 같은 높이·크기라도 파형이 달라 음색이 달라요
   범위: 소리는 매질(공기)을 통해 전달되는 파동. 진폭·진동수·파장·파형으로 표현. 종파/횡파는 구분하지 않음.
   표시: 파형 화면의 가로는 소리가 나아가는 방향이고(마루~마루 = 파장), 소리의 실제 진동수는 너무 빨라서
         화면은 '슬로 모션'으로 보여 줘요. 소리 듣기는 눌러서 켜는 선택 기능(WebAudio).
   화면: 태블릿용 가로 캔버스(800×580)와 휴대폰용 세로 캔버스(520×900)를 같은 장면 코드로 그림
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, fmt, Sound, toast } = SciSim;
  const TAU = Math.PI * 2;
  const REDUCE = !!SciSim.reduceMotion;               // 움직임 줄이기 설정
  const approach = SciSim.approach;
  const EASE = SciSim.ease;
  const rgba = SciSim.color.rgba;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif';
  const font = (px, w) => (w || 700) + ' ' + (Math.round(px * 2) / 2) + 'px ' + FONT;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rgbS = (c, a) => (a == null
    ? 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'
    : 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')');
  const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; };
  const mulC = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  /* ---------- 색 ---------- */
  const COL = {
    ink: '#1b2333', muted: '#5d6879', rope: [196, 140, 82], ropeD: [132, 88, 44],
    red: '#e2464b', blue: '#2f6df0', green: '#14a058', amber: '#f59e0b', phy: '#f26b3a',
    trace: [84, 255, 166], ghost: [255, 196, 84],
  };
  const MK = [[226, 70, 75], [47, 109, 240], [20, 160, 88]];      // 표시점 색 (빨강·파랑·초록)
  const MKN = ['빨강', '파랑', '초록'];

  /* ---------- 소리의 모양(파형): 사인파의 합 g(φ)=Σ aₙ sin(nφ+θₙ) ---------- */
  const NH = 6;
  const SHAPES = {
    fork: { name: '소리굽쇠', icon: '🔔', a: [1, 0, 0, 0, 0, 0], th: [0, 0, 0, 0, 0, 0] },
    flute: { name: '피리', icon: '🪈', a: [1, 0.55, 0.28, 0.12, 0, 0], th: [0, 2.2, 0.4, 2.6, 0, 0] },
    guitar: { name: '기타', icon: '🎸', a: [1, 0.62, 0.5, 0.36, 0.22, 0.12], th: [0, 0.5, 1.2, 1.8, 2.4, 3.0] },
  };
  // pk: 가장 크게 벗어난 값의 크기(진폭으로 쓰기 위해 이 값으로 나눠요), php: 마루(가장 높은 곳)의 위치
  function peakOf(a, th) {
    let pk = 0, mx = -9, pi = 0;
    for (let i = 0; i < 128; i++) { const ph = (i / 128) * TAU; let v = 0; for (let n = 0; n < NH; n++) v += a[n] * Math.sin((n + 1) * ph + th[n]); pk = Math.max(pk, Math.abs(v)); if (v > mx) { mx = v; pi = i; } }
    return { pk, mx, php: (pi / 128) * TAU };
  }
  // 모든 악기의 파형은 가장 크게 벗어난 곳이 위쪽(마루)이 되도록 맞춰 둬요 (소리는 같아요)
  Object.keys(SHAPES).forEach((k) => {
    const s = SHAPES[k];
    let r = peakOf(s.a, s.th);
    if (r.mx < r.pk - 1e-6) { for (let n = 0; n < NH; n++) s.th[n] += Math.PI; r = peakOf(s.a, s.th); }
    s.peak = r.pk; s.php = r.php;
  });
  // 화면에 그리는 파형(부드럽게 바뀌는 값)
  const W = {
    A: 0.9, f: 300, Phi: 0,                      // 진폭(칸), 진동수(Hz), 위상
    a: SHAPES.fork.a.slice(), th: SHAPES.fork.th.slice(), peak: 1,
    ghostA: 0, ghostF: 0, ghostShape: null, ghostK: 0,
  };
  function updPeak(w) {
    const r = peakOf(w.a, w.th);
    w.peak = Math.max(0.3, r.pk); w.php = r.php;
  }
  const waveG = (a, th, pk, ph) => { let v = 0; for (let n = 0; n < NH; n++) v += a[n] * Math.sin((n + 1) * ph + th[n]); return v / pk; };
  // 입자의 밀림(변위): 압력 파형의 적분. 같은 파형으로부터 구해서 마루 아래에 입자가 모여요
  const waveXi = (a, th, pk, ph) => { let v = 0; for (let n = 0; n < NH; n++) v += (a[n] / (n + 1)) * Math.cos((n + 1) * ph + th[n]); return v / pk; };

  /* ---------- 화면 배치: wide = 태블릿(800×580), tall = 휴대폰(520×900) ---------- */
  const LAYOUTS = {
    wide: { key: 'wide', vw: 800, vh: 580, fs: 1 },
    tall: { key: 'tall', vw: 520, vh: 900, fs: 1.18 },
  };
  const BG = '#edf3fb';
  const VIEWS = ['wide', 'tall'].map((key) => {
    const L = LAYOUTS[key];
    const V = { key, L, cache: {}, fx: new SciSim.Particles(), hint: $(key === 'wide' ? '#hintWide' : '#hintTall') };
    V.v = SciSim.stage($(key === 'wide' ? '#cvWide' : '#cvTall'), { width: L.vw, height: L.vh, background: BG, onResize: () => { V.cache = {}; } });
    V.ctx = V.v.ctx; V.D = SciSim.draw(V.ctx);
    return V;
  });
  const activeView = () => VIEWS.find((V) => V.v.canvas.offsetWidth > 0) || VIEWS[0];

  // 움직이지 않는 배경은 한 번만 그려 두고 재사용
  function cached(V, key, fn) {
    const sc = V.v.scale * V.v.dpr;
    let c = V.cache[key];
    if (!c || c.sc !== sc) {
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(V.L.vw * sc)); cv.height = Math.max(1, Math.ceil(V.L.vh * sc));
      const g = cv.getContext('2d');
      g.scale(sc, sc);
      fn(g, V.L);
      c = V.cache[key] = { cv, sc };
    }
    V.ctx.drawImage(c.cv, 0, 0, V.L.vw, V.L.vh);
  }
  function labBg(g, L) {
    const gr = g.createLinearGradient(0, 0, 0, L.vh);
    gr.addColorStop(0, BG); gr.addColorStop(1, BG);
    g.fillStyle = gr; g.fillRect(0, 0, L.vw, L.vh);
  }

  /* ---------- 상태 ---------- */
  const S = {
    scene: 'rope', fade: { k: 1 }, t: 0,
    auto: false,                                   // 줄 자동 흔들기 / 스피커 켜기
    airOn: true,
    seen: { rope: 0, air: 0 },
    // 진공 종
    pump: false, air: 1, vac: { out: false, back: false },
    // 파형 화면
    vol: 3, pitch: 300, timbre: 'fork', vol0: 3,
    ctl: { vol: false, pitch: false, timbre: false },
    round: 0, roundDone: [false, false], target: null,
    inst: { fork: 0, flute: 0, guitar: 0 }, mystery: ['guitar', 'fork', 'flute'], myDone: [false, false, false], myRound: 0, myHold: 0, myMode: false,
    audio: false,
  };
  let game = null;
  let F = new Set();
  const on = (f) => F.has(f) || !!(game && game.free);
  const isNew = (f) => !!(game && game.isNew(f));
  const gameFlat = () => (game && game.current() ? game.current()._flat : -1);
  const levelNow = () => (game ? game.level : 0);

  /* ---------- 공통 그리기 도구 ---------- */
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function txt(ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    ctx.font = font(o.size || 14, o.weight || 800);
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.halo; ctx.lineWidth = o.haloW || 4; ctx.strokeText(str, x, y); }
    ctx.fillStyle = o.color || COL.ink; ctx.fillText(str, x, y);
    ctx.restore();
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
  // 블러 없이 겹쳐 그리는 가벼운 그림자 (프레임마다 그려도 느려지지 않아요)
  function softShadow(V, pathFn, o) {
    const ctx = V.ctx; o = o || {};
    const a = o.a == null ? 0.3 : o.a, dy = o.y == null ? 4 : o.y, sp = o.spread == null ? 9 : o.spread;
    ctx.save(); ctx.lineJoin = 'round'; ctx.translate(0, dy);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(20,40,80,' + (a * 0.3) + ')'; ctx.strokeStyle = 'rgba(20,40,80,' + (a * 0.22) + ')';
      pathFn(); ctx.lineWidth = sp * 2 * (1 - i / 4); ctx.stroke(); ctx.fill();
    }
    ctx.restore();
  }
  // 흰 카드 판 (그림자 + 얇은 테두리)
  function panel(V, x, y, w, h, r, fill) {
    const { ctx, D } = V;
    softShadow(V, () => D.roundRect(x, y, w, h, r || 14), { a: 0.35, y: 4, spread: 8 });
    ctx.fillStyle = fill || '#fff'; D.roundRect(x, y, w, h, r || 14); ctx.fill();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.2; D.roundRect(x, y, w, h, r || 14); ctx.stroke();
  }
  const pill = (V, x, y, text, o) => V.D.label(x, y, text, Object.assign({ bg: '#1b2333', color: '#fff', size: 13 * Math.min(1.2, V.L.fs) }, o || {}));

  /* ---------- 소리 듣기 (WebAudio, 사용자가 눌렀을 때만) ---------- */
  const Tone = {
    ac: null, osc: null, g: null, shape: '', active: false, waves: {}, last: 0,
    wave(key) {
      if (this.waves[key]) return this.waves[key];
      const s = SHAPES[key], re = new Float32Array(NH + 1), im = new Float32Array(NH + 1);
      for (let n = 0; n < NH; n++) { im[n + 1] = s.a[n] * Math.cos(s.th[n]); re[n + 1] = s.a[n] * Math.sin(s.th[n]); }
      return (this.waves[key] = this.ac.createPeriodicWave(re, im));
    },
    start() {
      const ac = Sound._ensure();
      if (!ac) { toast('🔇 효과음이 꺼져 있어요. 오른쪽 위 소리 버튼을 눌러 켜 주세요.', 'bad', 2600); return false; }
      this.ac = ac;
      if (this.active) return true;
      try {
        this.osc = ac.createOscillator(); this.g = ac.createGain();
        this.g.gain.value = 0;
        this.osc.connect(this.g).connect(ac.destination);
        this.shape = 'fork'; this.osc.setPeriodicWave(this.wave('fork'));
        this.osc.frequency.value = 300;
        this.osc.start();
        this.active = true;
      } catch (e) { console.error(e); return false; }
      return true;
    },
    // freq(Hz), level 0~1(소리 크기), key(악기)
    set(freq, level, key) {
      if (!this.active) return;
      const t = this.ac.currentTime;
      if (key !== this.shape) { this.osc.setPeriodicWave(this.wave(key)); this.shape = key; }
      this.osc.frequency.setTargetAtTime(freq, t, 0.04);
      this.g.gain.setTargetAtTime(level <= 0 ? 0 : 0.02 + 0.15 * Math.pow(level, 1.3), t, 0.05);
    },
    stop() {
      if (!this.active) return;
      this.active = false;
      try {
        const t = this.ac.currentTime, o = this.osc, g = this.g;
        g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.03);
        o.stop(t + 0.15);
      } catch (e) { /* 무시 */ }
      this.osc = null; this.g = null;
    },
  };

  /* =========================================================
     장면 배치
     ========================================================= */
  const GEO = {
    rope(L) {
      if (L.key === 'wide') return { x0: 150, x1: 676, yc: 300, hx: 104, pole: { x: 712, y0: 190, y1: 410 }, rail: { y0: 168, y1: 432 }, ky: 1, cap: { x: 400, y: 486 }, arrow: { x0: 300, x1: 520, y: 128 } };
      return { x0: 96, x1: 408, yc: 430, hx: 58, pole: { x: 446, y0: 330, y1: 530 }, rail: { y0: 316, y1: 544 }, ky: 0.82, cap: { x: 260, y: 640 }, arrow: { x0: 150, x1: 370, y: 270 } };
    },
    air(L) {
      if (L.key === 'wide') return { strip: { x: 200, y: 150, w: 470, h: 270 }, spk: { x: 74, y: 285 }, ear: { x: 726, y: 285 }, cols: 36, rows: 7, lam: 150, dpx: 11, cap: { x: 400, y: 486 }, arrow: { x0: 290, x1: 510, y: 112 } };
      return { strip: { x: 118, y: 250, w: 292, h: 330 }, spk: { x: 56, y: 415 }, ear: { x: 470, y: 415 }, cols: 22, rows: 8, lam: 108, dpx: 9, cap: { x: 260, y: 650 }, arrow: { x0: 150, x1: 370, y: 206 } };
    },
    bell(L) {
      if (L.key === 'wide') return { jar: { x: 250, y: 150, w: 270, h: 290 }, base: { y: 440 }, pump: { x: 612, y: 330, w: 110, h: 120 }, ear: { x: 88, y: 270 }, meter: { x: 60, y: 392, w: 120, h: 18 }, cap: { x: 400, y: 524 } };
      return { jar: { x: 130, y: 290, w: 260, h: 280 }, base: { y: 570 }, pump: { x: 330, y: 650, w: 150, h: 130 }, ear: { x: 60, y: 200 }, meter: { x: 30, y: 740, w: 200, h: 20 }, cap: { x: 260, y: 840 } };
    },
    scope(L) {
      if (L.key === 'wide') {
        return {
          cas: { x: 12, y: 8, w: 776, h: 372 }, scr: { x: 40, y: 30, w: 720, h: 308 }, plot: { x: 124, y: 44, w: 628, h: 282 }, rows: 6, cols: 10,
          strip: { x: 124, y: 408, w: 628, h: 96 }, spk: { x: 62, y: 456 }, mic: { x: 770, y: 456 }, cap: { x: 400, y: 558 }, pcols: 52, prows: 5,
        };
      }
      return {
        cas: { x: 8, y: 8, w: 504, h: 596 }, scr: { x: 24, y: 26, w: 472, h: 520 }, plot: { x: 82, y: 42, w: 402, h: 488 }, rows: 8, cols: 10,
        strip: { x: 82, y: 650, w: 402, h: 130 }, spk: { x: 44, y: 715 }, mic: { x: 500, y: 715 }, cap: { x: 260, y: 840 }, pcols: 34, prows: 6,
      };
    },
  };

  /* =========================================================
     ① 줄 파동: 1차원 파동 방정식 (손으로 한쪽 끝을 흔들면 파동이 줄을 따라가요)
     ========================================================= */
  const RN = 120;                                        // 줄을 나눈 칸 수
  const R = {
    u: new Float32Array(RN), v: new Float32Array(RN),
    hand: 0, handT: 0, drag: false, t: 0, E: 0, endE: 0, demo: -1, shown: false,
    hist: [[], [], []], MKI: [30, 60, 90],
  };
  const ROPE_C = 54;                                     // 파동의 속력 (칸/초)
  function stepRope(dt, t) {
    // 손의 움직임: 끌고 있지 않으면 자동 흔들기 / 데모 / 제자리
    let ht = R.handT;
    if (!R.drag) {
      if (S.auto && S.scene === 'rope') ht = 58 * Math.sin(t * 2 * Math.PI * 0.85);
      else if (R.demo >= 0) { R.demo += dt; ht = R.demo < 0.9 ? 52 * Math.sin(R.demo / 0.9 * TAU) : 0; if (R.demo > 1.2) R.demo = -1; }
      else ht = 0;
    }
    R.handT = ht;
    R.hand = approach(R.hand, ht, dt, 24);
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n, c2 = ROPE_C * ROPE_C;
    const u = R.u, v = R.v;
    for (let s = 0; s < n; s++) {
      u[0] = R.hand; v[0] = 0;
      for (let i = 1; i < RN - 1; i++) {
        const gam = 0.25 + (i > RN - 14 ? (i - (RN - 14)) * 0.5 : 0);
        v[i] += (c2 * (u[i - 1] - 2 * u[i] + u[i + 1]) - gam * v[i]) * h;
      }
      for (let i = 1; i < RN - 1; i++) u[i] += v[i] * h;
      const old = u[RN - 1];
      u[RN - 1] = old - ROPE_C * h * (old - u[RN - 2]);   // 오른쪽 끝에서는 파동이 반사되지 않고 빠져나가요
      v[RN - 1] = (u[RN - 1] - old) / h;
    }
    let mx = 0;
    for (let i = 0; i < RN; i++) mx = Math.max(mx, Math.abs(u[i]));
    R.E = mx; R.endE = approach(R.endE, Math.abs(u[RN - 2]), dt, 10);
    R.MKI.forEach((idx, k) => { const hs = R.hist[k]; hs.push(u[idx]); if (hs.length > 16) hs.shift(); });
  }
  function ropeCache(g, L) {
    labBg(g, L);
    const G = GEO.rope(L), D = SciSim.draw(g);
    // 바닥
    const fy = G.yc + (L.key === 'wide' ? 150 : 138);
    const fg = g.createLinearGradient(0, fy, 0, L.vh);
    fg.addColorStop(0, '#d5e0f1'); fg.addColorStop(1, BG);
    g.fillStyle = fg; g.fillRect(0, fy, L.vw, L.vh - fy);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, fy, L.vw, 2);
    // 손잡이가 오르내리는 홈
    g.fillStyle = 'rgba(80,100,140,.16)'; D.roundRect(G.hx - 10, G.rail.y0, 20, G.rail.y1 - G.rail.y0, 10); g.fill();
    g.strokeStyle = 'rgba(80,100,140,.3)'; g.lineWidth = 1.5; D.roundRect(G.hx - 10, G.rail.y0, 20, G.rail.y1 - G.rail.y0, 10); g.stroke();
    // 끝 기둥
    const pg = g.createLinearGradient(G.pole.x - 7, 0, G.pole.x + 7, 0);
    pg.addColorStop(0, '#8d9bb3'); pg.addColorStop(0.5, '#dfe6f1'); pg.addColorStop(1, '#7e8ca6');
    g.fillStyle = pg; D.roundRect(G.pole.x - 7, G.pole.y0 - 14, 14, G.pole.y1 - G.pole.y0 + 40, 7); g.fill();
    g.fillStyle = '#7e8ca6'; D.roundRect(G.pole.x - 28, G.pole.y1 + 20, 56, 14, 6); g.fill();
  }
  function ropePts(G) {
    const dx = (G.x1 - G.x0) / (RN - 1), ky = G.ky, pts = [];
    for (let i = 0; i < RN; i++) pts.push({ x: G.x0 + i * dx, y: G.yc + R.u[i] * ky });
    return pts;
  }
  function drawRope(V, t) {
    const { ctx, D, L } = V;
    const G = GEO.rope(L), fs = L.fs, ky = G.ky;
    cached(V, 'rope', ropeCache);
    const pts = ropePts(G);
    const hy = G.yc + R.hand * ky;
    // 표시점이 있는 세로선 (표시점은 이 선 위에서만 움직여요)
    R.MKI.forEach((idx, k) => {
      const x = pts[idx].x;
      ctx.strokeStyle = rgbS(MK[k], 0.28); ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(x, G.yc - 128 * ky); ctx.lineTo(x, G.yc + 128 * ky); ctx.stroke(); ctx.setLineDash([]);
    });
    // 에너지: 파동이 지나가는 곳이 은은하게 빛나요
    ctx.save();
    for (let i = 2; i < RN - 2; i += 2) {
      const sl = (R.u[i + 1] - R.u[i - 1]) / 2 * ROPE_C * 0.96 / ((G.x1 - G.x0) / (RN - 1) / (L.key === 'wide' ? 1 : 1));
      const e = (R.v[i] * R.v[i] + R.v[i] * R.v[i] * 0 + sl * sl * 0.0) / 24000;
      const a = Math.min(0.5, e * 1.1);
      if (a < 0.02) continue;
      ctx.fillStyle = 'rgba(245,158,11,' + a + ')'; circle(ctx, pts[i].x, pts[i].y, 17 * fs * 0.85); ctx.fill();
    }
    ctx.restore();
    // 줄의 그림자와 줄
    const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); };
    ctx.save(); ctx.translate(0, 9); path(); ctx.strokeStyle = 'rgba(40,60,100,.14)'; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    path(); ctx.strokeStyle = rgbS(COL.ropeD); ctx.lineWidth = 10 * Math.min(1.1, fs); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    path(); ctx.strokeStyle = rgbS(COL.rope); ctx.lineWidth = 6.4 * Math.min(1.1, fs); ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(255,255,255,.34)'; ctx.lineWidth = 1.8; ctx.save(); ctx.translate(0, -1.6); ctx.stroke(); ctx.restore();
    // 꼬임 무늬
    ctx.strokeStyle = 'rgba(90,56,24,.55)'; ctx.lineWidth = 1.7; ctx.lineCap = 'butt';
    ctx.beginPath();
    for (let i = 2; i < RN - 1; i += 2) {
      const a = pts[i - 1], b = pts[i + 1], nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1, tx = (b.x - a.x) / nl, ty = (b.y - a.y) / nl;
      const px = pts[i].x, py = pts[i].y, k = 3.4 * Math.min(1.1, fs);
      ctx.moveTo(px - nx / nl * k - tx * 2.4, py - ny / nl * k - ty * 2.4); ctx.lineTo(px + nx / nl * k + tx * 2.4, py + ny / nl * k + ty * 2.4);
    }
    ctx.stroke();
    // 끝의 고리와 기둥 (파동의 에너지가 도착하면 고리가 흔들려요)
    const ex = G.pole.x, ey = pts[RN - 1].y;
    ctx.strokeStyle = rgbS(COL.ropeD); ctx.lineWidth = 8; ctx.lineCap = 'round';           // 줄 끝이 기둥의 고리까지 이어져요
    ctx.beginPath(); ctx.moveTo(pts[RN - 1].x, pts[RN - 1].y); ctx.lineTo(ex - 11, ey); ctx.stroke();
    ctx.strokeStyle = rgbS(COL.rope); ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(pts[RN - 1].x, pts[RN - 1].y); ctx.lineTo(ex - 11, ey); ctx.stroke();
    const rv = clamp(Math.abs(R.v[RN - 2]) / 150, 0, 1);
    if (rv > 0.05) { ctx.save(); ctx.fillStyle = 'rgba(245,158,11,' + (0.45 * rv) + ')'; circle(ctx, ex, ey, 26 + 14 * rv); ctx.fill(); ctx.restore(); }
    ctx.strokeStyle = '#6a778f'; ctx.lineWidth = 6; circle(ctx, ex, ey, 11); ctx.stroke();
    ctx.strokeStyle = '#e8eef7'; ctx.lineWidth = 2.4; circle(ctx, ex, ey, 11); ctx.stroke();
    if (R.endE > 7) pill(V, ex - 8, ey - 34 * fs * 0.9, '에너지 도착!', { bg: COL.amber, size: 13 * Math.min(1.15, fs) });
    // 표시점과 자취
    R.MKI.forEach((idx, k) => {
      const p = pts[idx], hs = R.hist[k], c = MK[k];
      for (let j = 0; j < hs.length; j++) { ctx.fillStyle = rgbS(c, 0.05 + 0.3 * j / hs.length); circle(ctx, p.x, G.yc + hs[j] * ky, 6.5 * (0.5 + 0.5 * j / hs.length)); ctx.fill(); }
      D.sphere(p.x, p.y, 10.5 * Math.min(1.15, fs), rgbS(c), { shadow: true });
    });
    // 손잡이
    const hx = G.hx;
    ctx.save();
    const lift = R.drag ? 1 : 0;
    softShadow(V, () => D.roundRect(hx - 13, hy - 31, 26, 62, 13), { a: 0.5 + 0.3 * lift, y: 4 + 3 * lift, spread: 7 });
    const hg = ctx.createLinearGradient(hx - 13, 0, hx + 13, 0);
    hg.addColorStop(0, '#f89a73'); hg.addColorStop(0.45, '#ffc7ae'); hg.addColorStop(1, '#e0572a');
    ctx.fillStyle = hg; D.roundRect(hx - 13, hy - 31, 26, 62, 13); ctx.fill();
    ctx.strokeStyle = 'rgba(120,40,10,.35)'; ctx.lineWidth = 1.5; D.roundRect(hx - 13, hy - 31, 26, 62, 13); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; D.roundRect(hx - 7, hy - 24, 5, 40, 3); ctx.fill();
    ctx.strokeStyle = rgbS(COL.ropeD); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx + 13, hy); ctx.lineTo(pts[0].x, pts[0].y); ctx.stroke();
    ctx.restore();
    // 안내
    if (!R.drag && R.E < 6 && !S.auto) {
      const bob = Math.sin(t * 4) * 5;
      ctx.save(); ctx.globalAlpha = 0.9;
      D.arrow(hx, hy - 48 + bob, hx, hy - 76 + bob, { color: COL.phy, width: 4, head: 10 });
      D.arrow(hx, hy + 48 - bob, hx, hy + 76 - bob, { color: COL.phy, width: 4, head: 10 });
      ctx.restore();
    }
    pill(V, Math.max(hx, 108), G.rail.y0 - 20, '손잡이 (위아래로 끌어요)', { bg: '#1b2333', size: 13 * Math.min(1.15, fs) });
    // 진행 방향 화살표
    D.arrow(G.arrow.x0, G.arrow.y, G.arrow.x1, G.arrow.y, { color: COL.amber, width: 6, head: 16 });
    pill(V, (G.arrow.x0 + G.arrow.x1) / 2, G.arrow.y - 26, '파동이 나아가는 방향', { bg: COL.amber, size: 14 * Math.min(1.15, fs) });
    // 설명
    pill(V, G.cap.x, G.cap.y, '🔴🔵🟢 표시점은 제자리에서 위아래로만 움직여요', { bg: '#1b2333', size: 14 * Math.min(1.15, fs) });
    pill(V, (pts[0].x + pts[RN - 1].x) / 2, G.yc + 108 * ky * 1.45, '줄 (매질)', { bg: '#7a5a38', size: 13 * Math.min(1.15, fs) });
  }

  /* =========================================================
     ① 공기 속 소리: 공기 입자는 제자리에서 앞뒤로 떨리며 이웃에게 진동을 전해요
     ========================================================= */
  const AIRW = { Phi: 0 };
  const PARTS = {};
  function airParts(V, G) {
    const key = V.key;
    if (PARTS[key]) return PARTS[key];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = G.cols * G.rows, hx = new Float32Array(n), hy = new Float32Array(n);
    const cw = G.strip.w / G.cols, rh = G.strip.h / G.rows;
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      const k = r * G.cols + c;
      hx[k] = G.strip.x + (c + 0.5) * cw + (rnd() - 0.5) * cw * 0.4;
      hy[k] = G.strip.y + (r + 0.5) * rh + (rnd() - 0.5) * rh * 0.5;
    }
    // 표시할 입자 3개 (가운데 높이, 서로 다른 거리)
    const mid = Math.floor(G.rows / 2) * G.cols;
    const mk = [Math.floor(G.cols * 0.22), Math.floor(G.cols * 0.5), Math.floor(G.cols * 0.78)].map((c, i) => (i === 1 ? mid - G.cols : i === 2 ? mid + G.cols : mid) + c);
    return (PARTS[key] = { n, hx, hy, mk, hist: [[], [], []], sprite: null });
  }
  function sphereSprite(color, r) {
    const k = 3, s = Math.ceil((r + 2) * 2 * k), c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d'); g.scale(k, k);
    SciSim.draw(g).sphere(r + 2, r + 2, r, color, { shadow: false });
    return c;
  }
  const SPR = {};
  function spr(color, r) { const key = color + r; return SPR[key] || (SPR[key] = sphereSprite(color, r)); }

  function drawSpeaker(V, x, y, cone, sc, label) {
    const { ctx, D } = V;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    softShadow(V, () => D.roundRect(-40, -62, 62, 124, 12), { a: 0.5, y: 5, spread: 8 });
    const g = ctx.createLinearGradient(-40, 0, 22, 0);
    g.addColorStop(0, '#3a4560'); g.addColorStop(0.5, '#556284'); g.addColorStop(1, '#2c3550');
    ctx.fillStyle = g; D.roundRect(-40, -62, 62, 124, 12); ctx.fill();
    // 진동판(콘)
    ctx.fillStyle = '#1f2740'; circle(ctx, -9, 0, 28); ctx.fill();
    const cg = ctx.createRadialGradient(-9 - 8 + cone, -8, 2, -9 + cone, 0, 26);
    cg.addColorStop(0, '#f2f5fb'); cg.addColorStop(0.6, '#bcc7da'); cg.addColorStop(1, '#8794ad');
    ctx.fillStyle = cg; circle(ctx, -9 + cone * 0.8, 0, 22); ctx.fill();
    ctx.fillStyle = '#4a5775'; circle(ctx, -9 + cone, 0, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-9 + cone * 0.8, 0, 17, Math.PI * 1.1, Math.PI * 1.55); ctx.stroke();
    ctx.restore();
    if (label) pill(V, x - 6, y + 62 * sc + 18, label, { bg: '#1b2333', size: 13 * Math.min(1.15, V.L.fs) });
  }
  function drawEar(V, x, y, sc, drum) {
    const { ctx } = V;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    const earPath = () => {
      ctx.beginPath();
      ctx.moveTo(-2, -44);
      ctx.bezierCurveTo(26, -50, 40, -22, 30, 4);
      ctx.bezierCurveTo(24, 22, 12, 26, 10, 42);
      ctx.bezierCurveTo(8, 56, -14, 58, -16, 40);
      ctx.bezierCurveTo(-18, 30, -10, 26, -12, 16);
      ctx.bezierCurveTo(-30, 6, -30, -40, -2, -44);
      ctx.closePath();
    };
    softShadow(V, earPath, { a: 0.4, y: 4, spread: 6 });
    const g = ctx.createLinearGradient(-30, -50, 40, 50);
    g.addColorStop(0, '#ffd9bd'); g.addColorStop(1, '#f1ac86');
    ctx.fillStyle = g; earPath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,80,40,.5)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(160,80,40,.5)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, -30); ctx.bezierCurveTo(14, -34, 22, -14, 14, 2); ctx.bezierCurveTo(10, 12, 0, 12, -2, 22); ctx.stroke();
    // 고막(귓속의 얇은 막): 소리가 닿으면 떨려요
    ctx.strokeStyle = '#d33d4a'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(-23 + drum, -9); ctx.quadraticCurveTo(-27 + drum * 2.2, 4, -23 + drum, 17); ctx.stroke();
    ctx.restore();
  }

  function drawAir(V, t, dt) {
    const { ctx, D, L } = V;
    const G = GEO.air(L), fs = L.fs, P = airParts(V, G), S0 = G.strip;
    cached(V, 'air', (g, L2) => {
      labBg(g, L2);
      const Dg = SciSim.draw(g);
      g.fillStyle = 'rgba(190,215,245,.55)'; Dg.roundRect(S0.x - 14, S0.y - 14, S0.w + 28, S0.h + 28, 22); g.fill();
      g.strokeStyle = 'rgba(100,140,200,.45)'; g.lineWidth = 2; Dg.roundRect(S0.x - 14, S0.y - 14, S0.w + 28, S0.h + 28, 22); g.stroke();
    });
    const lam = G.lam, k = TAU / lam, on_ = S.airOn ? 1 : 0;
    const amp = AIRW.amp = approach(AIRW.amp == null ? 0 : AIRW.amp, on_ * 2.6, dt, 3);
    const Dpx = G.dpx * amp / 3 * 1.35;
    const X0 = S0.x - 12;
    // 밀한 곳 / 소한 곳의 색 띠
    const cw = S0.w / G.cols;
    const fk = SHAPES.fork;
    for (let c = 0; c < G.cols * 2; c++) {
      const x = S0.x + (c + 0.5) * cw / 2, ph = k * (x - X0) - AIRW.Phi;
      const p = Math.sin(ph) * amp / 3;                 // 압력 (마루 = 빽빽한 곳)
      if (p > 0.04) { ctx.fillStyle = 'rgba(47,109,240,' + (0.2 * p) + ')'; ctx.fillRect(x - cw / 4, S0.y - 6, cw / 2, S0.h + 12); }
    }
    // 입자
    const sp = spr('#7aa7e0', 4.6 * Math.min(1.1, fs));
    const hh = sp.width / 3 / 2;
    for (let i = 0; i < P.n; i++) {
      const ph = k * (P.hx[i] - X0) - AIRW.Phi;
      const xi = Dpx * Math.cos(ph) * 1.0;
      ctx.drawImage(sp, P.hx[i] + xi - hh, P.hy[i] - hh, hh * 2, hh * 2);
    }
    // 표시한 입자 3개: 제자리에서 앞뒤로만 움직여요
    P.mk.forEach((i, m) => {
      const ph = k * (P.hx[i] - X0) - AIRW.Phi, xi = Dpx * Math.cos(ph);
      const hs = P.hist[m]; hs.push(xi); if (hs.length > 16) hs.shift();
      const c = rgbS(MK[m]);
      ctx.strokeStyle = rgbS(MK[m], 0.35); ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(P.hx[i] - 26 * 0.6, P.hy[i]); ctx.lineTo(P.hx[i] + 26 * 0.6, P.hy[i]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgbS(MK[m], 0.9); ctx.beginPath(); ctx.moveTo(P.hx[i], P.hy[i] + 20); ctx.lineTo(P.hx[i] - 5, P.hy[i] + 28); ctx.lineTo(P.hx[i] + 5, P.hy[i] + 28); ctx.closePath(); ctx.fill();
      for (let j = 0; j < hs.length; j++) { ctx.fillStyle = rgbS(MK[m], 0.05 + 0.3 * j / hs.length); circle(ctx, P.hx[i] + hs[j], P.hy[i], 6 * (0.5 + 0.5 * j / hs.length)); ctx.fill(); }
      D.sphere(P.hx[i] + xi, P.hy[i], 8.6 * Math.min(1.12, fs), c, { shadow: true });
    });
    // 스피커와 귀
    const cone = Dpx * Math.cos(-AIRW.Phi + k * (X0 - X0)) * 0.9;
    drawSpeaker(V, G.spk.x, G.spk.y, cone, L.key === 'wide' ? 1 : 0.85, '스피커');
    const earDrum = Dpx * Math.cos(k * (S0.x + S0.w - X0) - AIRW.Phi) * 0.5;
    drawEar(V, G.ear.x, G.ear.y, L.key === 'wide' ? 1 : 0.9, earDrum * 0.5);
    pill(V, G.ear.x, G.ear.y + 66, '귀', { bg: '#1b2333', size: 13 * Math.min(1.15, fs) });
    // 설명
    D.arrow(G.arrow.x0, G.arrow.y, G.arrow.x1, G.arrow.y, { color: COL.amber, width: 6, head: 16 });
    pill(V, (G.arrow.x0 + G.arrow.x1) / 2, G.arrow.y - 26, '소리가 나아가는 방향', { bg: COL.amber, size: 14 * Math.min(1.15, fs) });
    pill(V, G.cap.x, G.cap.y, '🔴🔵🟢 공기 입자는 제자리에서 앞뒤로 떨어요', { bg: '#1b2333', size: 14 * Math.min(1.15, fs) });
    pill(V, S0.x + S0.w / 2, S0.y + S0.h + 40, '공기 (매질)', { bg: '#2f6df0', size: 13 * Math.min(1.15, fs) });
    pill(V, G.spk.x + 4, G.spk.y - 92, '🐌 슬로 모션', { bg: '#64748b', size: 13 * Math.min(1.15, fs) });
  }
  function updateAir(dt) {
    const G = GEO.air(LAYOUTS.wide), lam = (activeView().L.key === 'wide' ? G.lam : GEO.air(LAYOUTS.tall).lam);
    const v = 105;                                        // 소리의 모습이 나아가는 빠르기 (슬로 모션, px/초)
    AIRW.Phi += TAU * v / lam * dt * (S.airOn ? 1 : 0.0);
  }

  /* =========================================================
     ① 진공 종: 공기를 빼면 종소리가 작아져요 (소리는 매질이 있어야 전달돼요)
     ========================================================= */
  const BN = 84;
  const BELL = { x: new Float32Array(BN), y: new Float32Array(BN), vx: new Float32Array(BN), vy: new Float32Array(BN), th: new Float32Array(BN), a: new Float32Array(BN), init: false, pumpPh: 0, ring: 0, dingT: 0 };
  function bellInit(G) {
    let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const J = G.jar;
    for (let i = 0; i < BN; i++) {
      BELL.x[i] = J.x + 24 + rnd() * (J.w - 48); BELL.y[i] = J.y + 110 + rnd() * (G.base.y - J.y - 130);
      const a = rnd() * TAU, sp = 40 + rnd() * 50; BELL.vx[i] = Math.cos(a) * sp; BELL.vy[i] = Math.sin(a) * sp;
      BELL.th[i] = (i + 0.5) / BN;                         // 이 값보다 공기가 적으면 입자가 빠져나가요
      BELL.a[i] = 1;
    }
    BELL.init = true;
  }
  const audible = () => (S.air < 0.03 ? 0 : Math.pow(S.air, 1.5));
  function updateBell(dt, t) {
    S.air = clamp(S.air + (S.pump ? -0.22 : (S.refill ? 0.34 : 0)) * dt, 0, 1);
    if (S.pump) BELL.pumpPh += dt * 7.5;
    if (S.air <= 0.08) S.vac.out = true;
    if (S.vac.out && S.air >= 0.92) S.vac.back = true;
    // 종소리 (소리 듣기를 켠 경우)
    if (S.audio && S.scene === 'bell') {
      BELL.dingT -= dt;
      if (BELL.dingT <= 0) {
        BELL.dingT = 0.85;
        const lv = audible();
        if (lv > 0.02) { Sound.tone(880, 0.55, 'sine', 0.2 * lv, 0); Sound.tone(1318, 0.4, 'sine', 0.09 * lv, 0); Sound.tone(2210, 0.25, 'sine', 0.04 * lv, 0); }
      }
    }
    if (!BELL.init) return;
    const G = GEO.bell(activeView().L), J = G.jar;
    const x0 = J.x + 16, x1 = J.x + J.w - 16, y0 = J.y + 22, y1 = G.base.y - 6, cx = J.x + J.w / 2, cyD = J.y + J.w / 2, RD = J.w / 2 - 12;      // 유리 덮개(반원 지붕)의 안쪽 둘레
    const port = { x: J.x + J.w - 8, y: G.base.y - 22 };
    for (let i = 0; i < BN; i++) {
      const gone = BELL.th[i] > S.air + 0.02;
      BELL.a[i] = approach(BELL.a[i], gone ? 0 : 1, dt, gone ? 3 : 6);
      if (BELL.a[i] < 0.02 && gone) continue;
      // 열 운동 (무작위 움직임 + 벽에서 튕김)
      let px = BELL.x[i], py = BELL.y[i];
      if (gone && S.pump) { const d = norm(port.x - px, port.y - py); BELL.vx[i] += d.x * 380 * dt; BELL.vy[i] += d.y * 380 * dt; }
      px += BELL.vx[i] * dt; py += BELL.vy[i] * dt;
      if (px < x0) { px = x0; BELL.vx[i] = Math.abs(BELL.vx[i]); } else if (px > x1) { px = x1; BELL.vx[i] = -Math.abs(BELL.vx[i]); }
      if (py < y0) { py = y0; BELL.vy[i] = Math.abs(BELL.vy[i]); } else if (py > y1) { py = y1; BELL.vy[i] = -Math.abs(BELL.vy[i]); }
      if (py < cyD) { const dx = px - cx, dy = py - cyD, d = Math.hypot(dx, dy); if (d > RD) { px = cx + dx / d * RD; py = cyD + dy / d * RD; const nx = dx / d, ny = dy / d, vd = BELL.vx[i] * nx + BELL.vy[i] * ny; if (vd > 0) { BELL.vx[i] -= 2 * vd * nx; BELL.vy[i] -= 2 * vd * ny; } } }
      if (!gone) { const sp = Math.hypot(BELL.vx[i], BELL.vy[i]); if (sp < 35) { BELL.vx[i] *= 1.08; BELL.vy[i] *= 1.08; } else if (sp > 95) { BELL.vx[i] *= 0.97; BELL.vy[i] *= 0.97; } }
      BELL.x[i] = px; BELL.y[i] = py;
    }
  }
  function bellCache(g, L) {
    labBg(g, L);
    const G = GEO.bell(L), Dg = SciSim.draw(g), J = G.jar;
    // 탁자
    const ty = G.base.y + 22;
    const fg = g.createLinearGradient(0, ty, 0, L.vh);
    fg.addColorStop(0, '#d3deef'); fg.addColorStop(1, BG);
    g.fillStyle = fg; g.fillRect(0, ty, L.vw, L.vh - ty);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(0, ty, L.vw, 2);
    // 받침판
    Dg.shadow(() => { g.fillStyle = '#7e8ca6'; Dg.roundRect(J.x - 22, G.base.y, J.w + 44, 22, 8); g.fill(); }, { blur: 10, y: 4, color: 'rgba(20,40,80,.3)' });
    const bg = g.createLinearGradient(0, G.base.y, 0, G.base.y + 22);
    bg.addColorStop(0, '#c9d3e4'); bg.addColorStop(1, '#8793ad');
    g.fillStyle = bg; Dg.roundRect(J.x - 22, G.base.y, J.w + 44, 22, 8); g.fill();
  }
  function jarPath(ctx, J, base) {
    const r = J.w / 2, cx = J.x + J.w / 2;
    ctx.beginPath();
    ctx.moveTo(J.x, base);
    ctx.lineTo(J.x, J.y + r);
    ctx.arc(cx, J.y + r, r, Math.PI, 0);
    ctx.lineTo(J.x + J.w, base);
    ctx.closePath();
  }
  function drawBellObj(V, cx, cy, ang, s) {
    const { ctx } = V;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(s, s);
    ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, -22); ctx.stroke();
    const body = () => { ctx.beginPath(); ctx.moveTo(-34, 22); ctx.bezierCurveTo(-34, 6, -26, -2, -22, -10); ctx.bezierCurveTo(-18, -26, 18, -26, 22, -10); ctx.bezierCurveTo(26, -2, 34, 6, 34, 22); ctx.closePath(); };
    const g = ctx.createLinearGradient(-34, 0, 34, 0);
    g.addColorStop(0, '#b88a1c'); g.addColorStop(0.35, '#ffe08a'); g.addColorStop(0.6, '#f0b93a'); g.addColorStop(1, '#8a6410');
    ctx.fillStyle = g; body(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,60,0,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#c99a2a'; ctx.beginPath(); ctx.ellipse(0, 22, 34, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6a4a10'; circle(ctx, Math.sin(ang * 6) * 6, 26, 6); ctx.fill();
    ctx.fillStyle = '#c99a2a'; circle(ctx, 0, -24, 5); ctx.fill();
    ctx.restore();
  }
  function drawBell(V, t, dt) {
    const { ctx, D, L } = V;
    const G = GEO.bell(L), fs = L.fs, J = G.jar;
    if (!BELL.init) bellInit(GEO.bell(L));
    cached(V, 'bell', bellCache);
    const cx = J.x + J.w / 2, bellY = J.y + 96, lv = audible();
    // 소리 물결 (귀 쪽으로 퍼져 나가요): 공기가 있어야 멀리 가요
    const dir = norm(G.ear.x - cx, G.ear.y - bellY), dAng = Math.atan2(dir.y, dir.x);
    for (let k = 0; k < 4; k++) {
      const u = (t * 0.5 + k / 4) % 1, rr = 56 + u * Math.hypot(G.ear.x - cx, G.ear.y - bellY) * 0.9;
      const a = (1 - u) * 0.9 * lv;
      if (a < 0.02) continue;
      ctx.strokeStyle = 'rgba(47,109,240,' + a + ')'; ctx.lineWidth = 5 - 2.5 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, bellY, rr, dAng - 0.5, dAng + 0.5); ctx.stroke();
    }
    // 유리 종 모양 덮개 (뒷면)
    ctx.save();
    jarPath(ctx, J, G.base.y); ctx.fillStyle = 'rgba(190,220,255,' + (0.20 + 0.12 * S.air) + ')'; ctx.fill();
    ctx.restore();
    // 공기 입자
    const sp = spr('#7aa7e0', 4.8 * Math.min(1.1, fs)), hh = sp.width / 3 / 2;
    ctx.save();
    jarPath(ctx, J, G.base.y); ctx.clip();
    for (let i = 0; i < BN; i++) { const a = BELL.a[i]; if (a < 0.03) continue; ctx.globalAlpha = a; ctx.drawImage(sp, BELL.x[i] - hh, BELL.y[i] - hh, hh * 2, hh * 2); }
    ctx.globalAlpha = 1;
    ctx.restore();
    // 종 (소리를 내며 계속 떨려요)
    const ang = Math.sin(t * 34) * 0.13;
    drawBellObj(V, cx, bellY, ang, 1.15 * Math.min(1.1, fs));
    ctx.strokeStyle = 'rgba(245,158,11,.9)'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    [-1, 1].forEach((sg) => { for (let i = 0; i < 2; i++) { const o = 50 + i * 9; ctx.globalAlpha = 0.9 - i * 0.35; ctx.beginPath(); ctx.arc(cx, bellY - 4, o * Math.min(1.1, fs), sg < 0 ? Math.PI * 0.92 : -0.28, sg < 0 ? Math.PI * 1.28 : 0.08); ctx.stroke(); } });
    ctx.globalAlpha = 1;
    // 유리 겉면의 반짝임
    jarPath(ctx, J, G.base.y); ctx.strokeStyle = 'rgba(120,160,220,.9)'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, J.y + J.w / 2, J.w / 2 - 14, Math.PI * 1.05, Math.PI * 1.38); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(J.x + 14, J.y + J.w / 2 + 24); ctx.lineTo(J.x + 14, G.base.y - 40); ctx.stroke();
    // 호스와 펌프
    const P = G.pump, port = { x: J.x + J.w + 12, y: G.base.y - 22 };
    const hose = () => { ctx.beginPath(); ctx.moveTo(J.x + J.w - 2, G.base.y - 22); ctx.lineTo(port.x + 10, port.y); ctx.bezierCurveTo(port.x + 50, port.y, P.x - 24, P.y + P.h * 0.78, P.x + 4, P.y + P.h * 0.78); };
    hose(); ctx.strokeStyle = '#46526b'; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.stroke();
    hose(); ctx.strokeStyle = '#8a97b0'; ctx.lineWidth = 6; ctx.stroke();
    if (S.pump || S.air < 0.995) {                            // 공기 흐름 표시
      ctx.save(); hose(); ctx.setLineDash([2, 18]); ctx.lineDashOffset = (S.pump ? 1 : -1) * t * 60; ctx.strokeStyle = '#bde0ff'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore();
    }
    // 펌프
    softShadow(V, () => D.roundRect(P.x, P.y + P.h * 0.45, P.w, P.h * 0.55, 12), { a: 0.5, y: 5, spread: 8 });
    const pg = ctx.createLinearGradient(P.x, 0, P.x + P.w, 0);
    pg.addColorStop(0, '#5a6a8c'); pg.addColorStop(0.5, '#9fb0cf'); pg.addColorStop(1, '#4a5878');
    ctx.fillStyle = pg; D.roundRect(P.x, P.y + P.h * 0.45, P.w, P.h * 0.55, 12); ctx.fill();
    const stroke = S.pump ? (Math.sin(BELL.pumpPh) * 0.5 + 0.5) * 24 : 0;
    ctx.fillStyle = '#c9d3e4'; ctx.fillRect(P.x + P.w / 2 - 6, P.y + P.h * 0.05 + stroke, 12, P.h * 0.42);
    ctx.fillStyle = COL.phy; D.roundRect(P.x + P.w / 2 - 32, P.y + stroke - 4, 64, 16, 8); ctx.fill();
    pill(V, P.x + P.w / 2, P.y + P.h + 22, '공기 펌프', { bg: '#1b2333', size: 13 * Math.min(1.15, fs) });
    // 귀와 소리 크기 표시
    drawEar(V, G.ear.x, G.ear.y, L.key === 'wide' ? 1 : 0.9, lv > 0.05 ? Math.sin(t * 34) * 2 * lv : 0);
    pill(V, G.ear.x, G.ear.y + 66, '귀', { bg: '#1b2333', size: 13 * Math.min(1.15, fs) });
    const M = G.meter;
    ctx.fillStyle = 'rgba(80,100,140,.18)'; D.roundRect(M.x, M.y, M.w, M.h, M.h / 2); ctx.fill();
    ctx.save(); D.roundRect(M.x, M.y, M.w, M.h, M.h / 2); ctx.clip();
    const mg = ctx.createLinearGradient(M.x, 0, M.x + M.w, 0); mg.addColorStop(0, '#3ec97a'); mg.addColorStop(1, '#14a058');
    ctx.fillStyle = mg; ctx.fillRect(M.x, M.y, M.w * lv, M.h); ctx.restore();
    txt(ctx, lv < 0.02 ? '🔇 들리는 소리 없음' : '🔊 들리는 소리 ' + Math.round(lv * 100) + '%', M.x + M.w / 2, M.y - 14 * Math.min(1.2, fs), { size: 14 * Math.min(1.15, fs), color: COL.ink });
    pill(V, J.x + J.w / 2, J.y - 20, '진공 종 (공기를 빼요)', { bg: '#1b2333', size: 13.5 * Math.min(1.15, fs) });
    pill(V, G.cap.x, G.cap.y, '남은 공기 ' + Math.round(S.air * 100) + '%  ·  공기가 줄면 소리도 작아져요', { bg: S.air < 0.1 ? COL.red : '#1b2333', size: 14 * Math.min(1.15, fs) });
  }

  /* =========================================================
     ② ③ ④ 소리 화면(오실로스코프)
     가로: 소리가 나아가는 방향(슬로 모션), 세로: 입자가 밀린 정도(압력)
     마루~마루 = 파장, 중심선~마루 = 진폭, 모양 = 파형
     ========================================================= */
  const SCL = 628;                                          // 기준 화면 폭 (파장 계산의 기준)
  const lamOf = (f, P) => (45000 / f) * (P.w / SCL);         // 진동수가 클수록 파장이 짧아요 (화면 px)
  const speedOf = (P) => 105 * (P.w / SCL);                  // 슬로 모션으로 보여 주는 빠르기
  const ampOf = (vol) => 0.5 * vol;                          // 소리 크기 1~5 → 진폭 0.5~2.5칸
  const GH = { a: SHAPES.fork.a.slice(), th: SHAPES.fork.th.slice(), peak: 1, php: 0, A: 1, f: 300, k: 0, tA: 1, tF: 300, tShape: 'fork', on: false, label: '' };
  const SC = { frz: 0, freeze: false, ghostBtn: null, trace: null, nSamples: 0 };

  function setGhost(opts) {                                   // 목표(점선) 설정. null이면 숨김
    if (!opts) { GH.on = false; return; }
    if (!GH.on || opts.snap) { GH.A = opts.A; GH.f = opts.f; if (opts.shape) { const s = SHAPES[opts.shape]; GH.a = s.a.slice(); GH.th = s.th.slice(); } }
    GH.on = true; GH.tA = opts.A; GH.tF = opts.f; GH.label = opts.label || '';
    if (opts.shape) GH.tShape = opts.shape;
  }
  function updateScope(dt) {
    const V = activeView(), P = GEO.scope(V.L).plot;
    W.A = approach(W.A, ampOf(S.vol), dt, 8);
    W.f = approach(W.f, S.pitch, dt, 8);
    const sh = SHAPES[S.timbre];
    for (let n = 0; n < NH; n++) {
      W.a[n] = approach(W.a[n], sh.a[n], dt, 7);
      if (W.a[n] < 0.05 || sh.a[n] < 0.05) W.th[n] = sh.th[n]; else W.th[n] = approach(W.th[n], sh.th[n], dt, 7);
    }
    updPeak(W);
    GH.k = approach(GH.k, GH.on ? 1 : 0, dt, 6);
    if (GH.k > 0.01) {
      GH.A = approach(GH.A, GH.tA, dt, 6); GH.f = approach(GH.f, GH.tF, dt, 6);
      const gs = SHAPES[GH.tShape];
      for (let n = 0; n < NH; n++) { GH.a[n] = approach(GH.a[n], gs.a[n], dt, 7); if (GH.a[n] < 0.05 || gs.a[n] < 0.05) GH.th[n] = gs.th[n]; else GH.th[n] = approach(GH.th[n], gs.th[n], dt, 7); }
      updPeak(GH);
    }
    SC.frz = approach(SC.frz, SC.freeze ? 1 : 0, dt, 12);
    const lam = lamOf(W.f, P);
    W.Phi = (W.Phi + TAU * speedOf(P) / lam * dt * (1 - SC.frz) * (REDUCE ? 0.5 : 1)) % (TAU * 1000);
    // 소리 듣기: 화면과 같은 소리를 내요
    if (S.audio && Tone.active && S.scene === 'scope') Tone.set(S.pitch, S.vol / 5, S.timbre);
    else if (S.audio && Tone.active && S.scene === 'air') Tone.set(300, S.airOn ? 0.45 : 0, 'fork');
    else if (Tone.active) Tone.set(300, 0, S.timbre);
  }

  function scopeCache(g, L) {
    labBg(g, L);
    const G = GEO.scope(L), Dg = SciSim.draw(g), c = G.cas, s = G.scr, P = G.plot;
    // 기계 본체
    Dg.shadow(() => { g.fillStyle = '#3a4560'; Dg.roundRect(c.x, c.y, c.w, c.h, 22); g.fill(); }, { blur: 16, y: 6, color: 'rgba(20,40,80,.35)' });
    const cg = g.createLinearGradient(0, c.y, 0, c.y + c.h);
    cg.addColorStop(0, '#59668a'); cg.addColorStop(1, '#333d58');
    g.fillStyle = cg; Dg.roundRect(c.x, c.y, c.w, c.h, 22); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; Dg.roundRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2, 21); g.stroke();
    // 화면
    g.fillStyle = '#04100b'; Dg.roundRect(s.x, s.y, s.w, s.h, 14); g.fill();
    const rg = g.createRadialGradient(s.x + s.w / 2, s.y + s.h / 2, 20, s.x + s.w / 2, s.y + s.h / 2, s.w * 0.62);
    rg.addColorStop(0, 'rgba(40,120,80,.34)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; Dg.roundRect(s.x, s.y, s.w, s.h, 14); g.fill();
    // 눈금
    g.lineWidth = 1;
    for (let i = 0; i <= G.cols; i++) { const x = P.x + P.w * i / G.cols; g.strokeStyle = i === 0 ? 'rgba(120,255,180,.34)' : 'rgba(120,255,180,.13)'; g.beginPath(); g.moveTo(x, P.y); g.lineTo(x, P.y + P.h); g.stroke(); }
    for (let j = 0; j <= G.rows; j++) { const y = P.y + P.h * j / G.rows; g.strokeStyle = j === G.rows / 2 ? 'rgba(120,255,180,.42)' : 'rgba(120,255,180,.13)'; g.beginPath(); g.moveTo(P.x, y); g.lineTo(P.x + P.w, y); g.stroke(); }
    // 작은 눈금
    g.strokeStyle = 'rgba(120,255,180,.3)';
    const cy = P.y + P.h / 2, tk = P.w / G.cols / 5;
    g.beginPath();
    for (let i = 0; i <= G.cols * 5; i++) { const x = P.x + i * tk; g.moveTo(x, cy - 4); g.lineTo(x, cy + 4); }
    g.stroke();
    // 본체 아래쪽 장식 (손잡이와 단추)
    const by = c.y + c.h - 22;
    [[0.1, '#f26b3a'], [0.18, '#cfd7e6'], [0.26, '#cfd7e6']].forEach((kn, i) => {
      const x = c.x + c.w * kn[0] + 12; Dg.sphere(x, by, 9, kn[1], { shadow: true });
    });
    g.fillStyle = 'rgba(255,255,255,.22)'; g.font = font(13, 800); g.textAlign = 'right'; g.textBaseline = 'middle';
    g.fillText('SOUND SCOPE', c.x + c.w - 22, by);
    // 공기 띠 판
    const st = G.strip;
    g.fillStyle = 'rgba(190,215,245,.5)'; Dg.roundRect(st.x - 12, st.y - 10, st.w + 24, st.h + 20, 18); g.fill();
    g.strokeStyle = 'rgba(100,140,200,.45)'; g.lineWidth = 2; Dg.roundRect(st.x - 12, st.y - 10, st.w + 24, st.h + 20, 18); g.stroke();
  }

  // 공기 입자 띠의 처음 위치
  let SCP = null;
  function scopeParts(G) {
    const key = G.strip.w;
    if (SCP && SCP.key === key) return SCP;
    let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = G.pcols * G.prows, hx = new Float32Array(n), hy = new Float32Array(n), cw = G.strip.w / G.pcols, rh = G.strip.h / G.prows;
    for (let r = 0; r < G.prows; r++) for (let c = 0; c < G.pcols; c++) {
      const k = r * G.pcols + c;
      hx[k] = G.strip.x + (c + 0.5) * cw + (rnd() - 0.5) * cw * 0.2;
      hy[k] = G.strip.y + (r + 0.5) * rh + (rnd() - 0.5) * rh * 0.3;
    }
    return (SCP = { key, n, hx, hy });
  }

  function traceY(w, ph) { return waveG(w.a, w.th, w.peak, ph); }
  function drawMic(V, x, y, sc) {
    const { ctx, D } = V;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.strokeStyle = '#46526b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 4, 16, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 34); ctx.moveTo(-12, 34); ctx.lineTo(12, 34); ctx.stroke();
    const g = ctx.createLinearGradient(-11, 0, 11, 0);
    g.addColorStop(0, '#8a97b0'); g.addColorStop(0.5, '#e8eef7'); g.addColorStop(1, '#6a778f');
    ctx.fillStyle = g; D.roundRect(-11, -26, 22, 42, 11); ctx.fill();
    ctx.strokeStyle = 'rgba(40,50,80,.4)'; ctx.lineWidth = 1.4; D.roundRect(-11, -26, 22, 42, 11); ctx.stroke();
    ctx.strokeStyle = 'rgba(40,50,80,.28)'; ctx.lineWidth = 1.2;
    for (let i = -16; i <= 4; i += 7) { ctx.beginPath(); ctx.moveTo(-9, i); ctx.lineTo(9, i); ctx.stroke(); }
    ctx.restore();
  }

  function drawScope(V, t) {
    const { ctx, D, L } = V;
    const G = GEO.scope(L), P = G.plot, fs = Math.min(1.2, L.fs), cy = P.y + P.h / 2, rowH = P.h / G.rows;
    cached(V, 'scope', scopeCache);
    const showWL = on('vol'), showHz = on('pitch'), showShape = on('timbre');
    const A = W.A * rowH, lam = lamOf(W.f, P), Phi = W.Phi;
    const N = Math.ceil(P.w / 3) + 1;
    // ----- 화면 안 (그리기 영역을 화면으로 제한) -----
    ctx.save();
    D.roundRect(G.scr.x, G.scr.y, G.scr.w, G.scr.h, 14); ctx.clip();
    // 진폭 점선 (마루·골의 높이)
    ctx.setLineDash([6, 7]); ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(255,214,120,.55)';
    ctx.beginPath(); ctx.moveTo(P.x, cy - A); ctx.lineTo(P.x + P.w, cy - A); ctx.moveTo(P.x, cy + A); ctx.lineTo(P.x + P.w, cy + A); ctx.stroke();
    ctx.setLineDash([]);
    // 목표 파형 (점선)
    if (GH.k > 0.02) {
      const gl = lamOf(GH.f, P), gA = GH.A * rowH;
      ctx.save(); ctx.globalAlpha = GH.k; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = P.x + Math.min(i * 3, P.w), ph = TAU * (x - P.x) / gl - Phi, y = cy - gA * traceY(GH, ph);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,196,84,.25)'; ctx.lineWidth = 9; ctx.stroke();
      ctx.setLineDash([9, 8]); ctx.strokeStyle = 'rgb(255,200,90)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
    // 소리의 파형 (초록 빛줄기)
    const path = () => {
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x = P.x + Math.min(i * 3, P.w), ph = TAU * (x - P.x) / lam - Phi, y = cy - A * traceY(W, ph);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    path(); ctx.strokeStyle = 'rgba(84,255,166,.16)'; ctx.lineWidth = 14; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(84,255,166,.34)'; ctx.lineWidth = 7; ctx.stroke();
    path(); ctx.strokeStyle = 'rgb(150,255,205)'; ctx.lineWidth = 3.2; ctx.stroke();

    // 마루 표시와 파장 (마루~마루)
    if (showWL) {
      const crest = (n) => P.x + lam * ((W.php + Phi) / TAU + n);
      const n0 = Math.floor(-(W.php + Phi) / TAU) - 1, mid = P.x + P.w * 0.52;
      const by = Math.max(P.y + 18, cy - A - 26);
      for (let n = n0; n < n0 + P.w / lam + 4; n++) {
        const x1 = crest(n), x2 = crest(n + 1);
        if (x2 < P.x + 4 || x1 > P.x + P.w - 4) continue;
        // 마루에 점
        if (x1 > P.x + 8 && x1 < P.x + P.w - 6) { ctx.fillStyle = 'rgba(255,214,120,.95)'; circle(ctx, x1, cy - A, 5); ctx.fill(); }
        // 이웃한 두 마루 사이의 화살표 (가운데에 가까운 한 쌍만, 부드럽게 바뀌어요)
        const c = (x1 + x2) / 2, al = clamp(1 - Math.abs(c - mid) / lam, 0, 1) * smooth(P.x + 6, P.x + 6 + 30, x1) * (1 - smooth(P.x + P.w - 36, P.x + P.w - 6, x2));
        if (al < 0.03) continue;
        ctx.save(); ctx.globalAlpha = al;
        ctx.strokeStyle = 'rgba(255,214,120,.8)'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(x1, by + 4); ctx.lineTo(x1, cy - A - 7); ctx.moveTo(x2, by + 4); ctx.lineTo(x2, cy - A - 7); ctx.stroke(); ctx.setLineDash([]);
        D.arrow(c - 3, by, x1 + 1, by, { color: '#ffd678', width: 3, head: 9 });
        D.arrow(c + 3, by, x2 - 1, by, { color: '#ffd678', width: 3, head: 9 });
        const lw = 52 * fs;
        ctx.fillStyle = '#ffd678'; D.roundRect(c - lw / 2, by - 13, lw, 26, 13); ctx.fill();
        txt(ctx, '파장', c, by + 0.5, { size: 15 * fs, color: '#3a2a00' });
        ctx.restore();
      }
    }
    // 소리가 지나가는 한 점 (③ 진동수): 점은 제자리에서 위아래로만 움직여요
    if (showHz) {
      const px = P.x + P.w - 46 * (P.w / SCL), ph = TAU * (px - P.x) / lam - Phi, py = cy - A * traceY(W, ph);
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(px, P.y + 6); ctx.lineTo(px, P.y + P.h - 6); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,255,255,.28)'; circle(ctx, px, py, 13); ctx.fill();
      D.sphere(px, py, 8.5, '#ff6b72', { shadow: false });
    }
    ctx.restore();

    // ----- 화면 둘레의 표시 -----
    // 진폭 화살표 (왼쪽 눈금자 옆)
    {
      const ax = P.x - 18;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,214,120,.9)'; ctx.fillStyle = 'rgba(255,214,120,.9)';
      if (showWL && A > 6) {
        D.arrow(ax, cy - 2, ax, cy - A + 1, { color: '#ffd678', width: 3.4, head: 10 });
        ctx.fillStyle = '#ffd678'; D.roundRect(ax - 52 * fs - 8, cy - A / 2 - 14, 52 * fs, 26, 13); ctx.fill();
        txt(ctx, '진폭', ax - 34 * fs - 8, cy - A / 2 + 0.5, { size: 15 * fs, color: '#3a2a00' });
      }
      ctx.restore();
    }
    // 칸 눈금 숫자
    txt(ctx, '눈금 한 칸 = 1칸', P.x + 10, P.y + P.h - 13, { size: 12.5 * fs, color: 'rgba(160,255,200,.6)', align: 'left' });
    // 파형 이름표
    const nm = SHAPES[S.timbre];
    if (showShape) D.label(P.x + 78 * fs, P.y + 18, nm.icon + ' ' + nm.name + (S.timbre === 'fork' ? ' · 사인 곡선' : ''), { bg: 'rgba(20,60,45,.92)', color: '#aaffd2', size: 14 * fs });
    // 목표 라벨 (눌러서 소리 듣기)
    SC.ghostBtn = null;
    if (GH.k > 0.4 && GH.label) {
      const w = (L.key === 'wide' ? 188 : 170), x = P.x + P.w - w / 2 - 6, y = P.y + P.h - 18;
      SC.ghostBtn = { x: x - w / 2, y: y - 18, w, h: 36 };
      ctx.save(); ctx.globalAlpha = GH.k;
      ctx.fillStyle = 'rgb(255,200,90)'; D.roundRect(x - w / 2, y - 16, w, 32, 16); ctx.fill();
      txt(ctx, GH.label, x, y + 0.5, { size: 14 * fs, color: '#3a2a00' });
      ctx.restore();
    }
    // 화면을 누르면 멈춰요
    if (SC.frz > 0.05) { ctx.save(); ctx.globalAlpha = SC.frz; D.label(P.x + P.w / 2, P.y + P.h + 2, '⏸ 멈춤', { bg: '#1b2333', size: 13 * fs }); ctx.restore(); }

    // ----- 아래: 같은 소리가 공기 속에서 나아가는 모습 -----
    const st = G.strip, Pp = scopeParts(G), cw = st.w / G.pcols;
    const xiScale = 0.11 * lam * (W.A / 2.5);
    // 밀한 곳(마루)에 푸른 띠
    ctx.save();
    ctx.beginPath(); ctx.rect(st.x, st.y - 8, st.w, st.h + 16); ctx.clip();
    for (let x = st.x; x < st.x + st.w; x += 5) {
      const gv = traceY(W, TAU * (x + 2.5 - P.x) / lam - Phi);
      if (gv > 0.05) { ctx.fillStyle = 'rgba(47,109,240,' + (0.22 * gv * (W.A / 2.5 + 0.25)) + ')'; ctx.fillRect(x, st.y - 8, 5, st.h + 16); }
    }
    const sp = spr('#5b8fd6', 3.8 * Math.min(1.1, fs)), hh = sp.width / 3 / 2;
    for (let i = 0; i < Pp.n; i++) {
      const ph = TAU * (Pp.hx[i] - P.x) / lam - Phi;
      const xi = xiScale * waveXi(W.a, W.th, W.peak, ph);
      ctx.drawImage(sp, Pp.hx[i] + xi - hh, Pp.hy[i] - hh, hh * 2, hh * 2);
    }
    ctx.restore();
    // 마루와 밀한 곳을 잇는 점선
    if (showWL) {
      ctx.save(); ctx.strokeStyle = 'rgba(245,158,11,.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]);
      const n0 = Math.floor(-(W.php + Phi) / TAU) - 1;
      for (let n = n0; n < n0 + P.w / lam + 3; n++) {
        const x = P.x + lam * ((W.php + Phi) / TAU + n);
        if (x < P.x + 10 || x > P.x + P.w - 6) continue;
        ctx.beginPath(); ctx.moveTo(x, cy + A + 6); ctx.lineTo(x, st.y - 8); ctx.stroke();
      }
      ctx.restore();
    }
    // 스피커 (콘이 소리를 따라 떨려요)
    const cone = clamp(xiScale * waveXi(W.a, W.th, W.peak, -Phi) * 0.5, -7, 7);
    drawSpeaker(V, G.spk.x, G.spk.y, cone, L.key === 'wide' ? 0.95 : 0.8, null);
    drawMic(V, G.mic.x - (L.key === 'wide' ? 4 : 0), G.mic.y, L.key === 'wide' ? 1 : 0.85);
    pill(V, st.x + st.w / 2, st.y + st.h + (L.key === 'wide' ? 26 : 30), '공기 속에서 나아가는 소리', { bg: '#2f6df0', size: 13 * fs });
    pill(V, G.cap.x, G.cap.y, '🐌 슬로 모션이에요 · 화면을 누르고 있으면 멈춰요', { bg: '#1b2333', size: 14 * fs });
  }

  /* =========================================================
     화면 밖(DOM) 조작과 입력
     ========================================================= */
  Object.assign(S, {
    mkMove: [0, 0, 0], reach: false, refill: true,                       // ① 줄 파동 관찰
    pr: 0, prDone: [false, false], prHold: 0, prWait: 0,    // ③ 목표 음 맞히기
    my: 0, myDone: [false, false, false], myHold: 0, myWait: 0, // ④ 수수께끼 소리
    instT: { fork: 0, flute: 0, guitar: 0 },
    succ: { t0: -9, x: 0, y: 0 },
  });
  const TG3 = [{ f: 720, name: '높은 음' }, { f: 210, name: '낮은 음' }];
  const MYST = ['guitar', 'fork', 'flute'];
  const press = (el, v) => el.setAttribute('aria-pressed', v ? 'true' : 'false');
  function showHint(text, ms) {
    VIEWS.forEach((V) => { V.hint.textContent = text; V.hint.classList.remove('hide'); });
    clearTimeout(showHint.t);
    showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { VIEWS.forEach((V) => V.hint.classList.add('hide')); }

  const VOLN = ['아주 작게', '작게', '보통', '크게', '아주 크게'];
  const bVol = SciSim.bindRange($('#slVol'), $('#outVol'), (v) => VOLN[v - 1], (v) => { S.vol = v; hideHint(); Sound.tick(); });
  const bPitch = SciSim.bindRange($('#slPitch'), $('#outPitch'), (v) => v + ' Hz', (v) => { S.pitch = v; hideHint(); const n = performance.now(); if (n - (bPitch.last || 0) > 120) { bPitch.last = n; Sound.tick(); } });
  function setVol(v) { S.vol = v; bVol.set(v); }
  function setPitch(f) { S.pitch = f; bPitch.set(f); }
  // 직접 흔들기 시작할 때부터 관찰을 세요 (처음의 시범 파동은 세지 않아요)
  function userRope() { if (!S.userRope) { S.userRope = true; S.mkMove = [0, 0, 0]; S.reach = false; } }
  function setTimbre(k) { S.timbre = k; syncUI(); }

  /* ----- 소리 듣기 (눌러야만 켜져요) ----- */
  function beep(freq, key, dur, vol) {
    const ac = Sound._ensure();
    if (!ac) { toast('🔇 효과음이 꺼져 있어요. 오른쪽 위 소리 버튼을 눌러 켜 주세요.', 'bad', 2600); return; }
    Tone.ac = ac;
    try {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.setPeriodicWave(Tone.wave(key)); o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.03); g.gain.setValueAtTime(vol || 0.12, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* 무시 */ }
  }
  function toggleAudio() {
    if (S.audio) { S.audio = false; Tone.stop(); }
    else if (Tone.start()) { S.audio = true; }
    syncUI();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && S.audio) { S.audio = false; Tone.stop(); syncUI(); } });

  /* ----- 장면 ----- */
  const SCENE_LABEL = {
    rope: () => '🪢 줄 위의 표시점은 제자리에서 위아래로만 움직여요',
    air: () => '🔊 공기 입자는 제자리에서 앞뒤로 떨려요',
    bell: () => '🔔 공기를 빼면 종소리가 작아져요',
    scope: () => ['📈 소리 화면', '📈 소리의 크기와 진폭', '📈 소리의 높낮이와 진동수', '📈 소리의 파형과 음색'][game && !game.free ? game.level : 0],
  };
  function setScene(name) {
    if (S.scene !== name) {
      S.scene = name; S.fade.k = 0; SC.freeze = false;
      SciSim.tween(S.fade, { k: 1 }, { duration: 0.45, ease: 'outCubic' });
      hideHint();
    }
    document.body.dataset.scene = name;
    syncUI();
  }
  function groupsFor(scene, free, lv) {
    const g = { rope: false, air: false, bell: false, vol: false, pitch: false, timbre: false };
    if (scene === 'rope') g.rope = true;
    else if (scene === 'air') g.air = true;
    else if (scene === 'bell') g.bell = true;
    else { g.vol = free || lv === 1; g.pitch = free || lv === 2; g.timbre = free || lv === 3; }
    return g;
  }
  let uiKey = '';
  function syncUI() {
    const free = !!(game && game.free), lv = game ? game.level : 0;
    document.body.classList.toggle('free-mode', free);
    $('#sceneSeg').classList.toggle('off', !free);
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === S.scene));
    const g = groupsFor(S.scene, free, lv);
    Object.keys(g).forEach((k) => { $('#g-' + k).style.display = g[k] ? '' : 'none'; });
    // ① 줄 · 공기 · 종
    const ta = $('#tgAuto'); ta.textContent = S.auto ? '⏹ 흔들기 멈추기' : '🔁 자동으로 흔들기'; press(ta, S.auto);
    const ts = $('#tgSpk'); ts.textContent = S.airOn ? '🔇 스피커 끄기' : '🔊 스피커 켜기'; press(ts, S.airOn);
    const tp = $('#tgPump'); tp.textContent = S.pump ? '⏹ 공기 빼기 멈추기' : (S.air < 0.97 ? '🌬️ 공기 더 빼기' : '🌬️ 공기 빼기'); press(tp, S.pump);
    const tb = $('#tgBack'); tb.disabled = S.air > 0.97;
    // ④ 악기
    $$('#instRow .inst-btn').forEach((b) => press(b, b.dataset.inst === S.timbre));
    // 소리 듣기 단추 (줄에서는 필요 없어요)
    const au = $('#audioBtn'); au.classList.toggle('off', S.scene === 'rope'); press(au, S.audio);
    au.textContent = S.audio ? '🔊 소리 끄기' : '🎧 소리 듣기';
    $('#sceneLabel').textContent = SCENE_LABEL[S.scene]();
    $('#ctrlCard').hidden = !Object.keys(g).some((k) => g[k]);
    lastUI = -1;
    uiKey = [free, lv, S.scene].join();
  }
  $('#tgAuto').addEventListener('click', () => { S.auto = !S.auto; R.demo = -1; if (S.auto) userRope(); hideHint(); Sound.click(); syncUI(); });
  $('#tgSpk').addEventListener('click', () => { S.airOn = !S.airOn; hideHint(); Sound.click(); syncUI(); });
  $('#tgPump').addEventListener('click', () => { S.pump = !S.pump; if (S.pump) S.refill = false; hideHint(); Sound.click(); syncUI(); });
  $('#tgBack').addEventListener('click', () => { S.pump = false; S.refill = true; hideHint(); Sound.click(); syncUI(); });
  $('#audioBtn').addEventListener('click', () => { Sound.click(); toggleAudio(); });
  $$('#instRow .inst-btn').forEach((b) => b.addEventListener('click', () => {
    Sound.click(); hideHint(); setTimbre(b.dataset.inst);
    if (!S.audio && !Sound.muted) beep(S.pitch, b.dataset.inst, 0.55, 0.1 * (S.vol / 5 + 0.3));
    if (game && !game.free && gameFlat() === 9 && S.timbre !== MYST[S.my] && !S.myDone[S.my]) showHint('점선과 모양이 달라요. 다른 악기를 눌러 보세요.', 2400);
  }));
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); enterScene(b.dataset.scene); }));
  function enterScene(name) {
    setGhost(null);
    if (name === 'rope') { S.auto = false; }
    if (name === 'air') { S.airOn = true; }
    setScene(name);
  }

  /* ----- 아래 측정값 ----- */
  let lastUI = -1;
  function setRead(i, label, html) {
    const l = $('#rL' + i), v = $('#rV' + i);
    if (l.textContent !== label) l.textContent = label;
    if (v.innerHTML !== html) v.innerHTML = html;
  }
  const showRead = (i, on_) => { const b = $('#rBox' + i); const d = on_ ? '' : 'none'; if (b.style.display !== d) b.style.display = d; };
  function updateReadouts(t) {
    if (t - lastUI < 0.12) return;
    lastUI = t;
    const free = !!(game && game.free);
    [1, 2, 3, 4].forEach((i) => showRead(i, true));
    if (S.scene === 'rope') {
      setRead(1, '손잡이', Math.abs(R.hand) < 3 ? '멈춤' : (R.hand < 0 ? '위' : '아래') + ' ' + Math.round(Math.abs(R.hand) / 7) + '<small>칸</small>');
      setRead(2, '표시점의 가로 이동', '0<small>칸 (제자리)</small>');
      setRead(3, '파동이 나아가는 방향', R.E > 4 ? '오른쪽 →' : '—');
      setRead(4, '줄 끝', R.endE > 7 ? '에너지 도착!' : '아직');
    } else if (S.scene === 'air') {
      setRead(1, '스피커', S.airOn ? '진동 중' : '꺼짐');
      setRead(2, '공기 입자의 이동', S.airOn ? '제자리 진동' : '—');
      setRead(3, '소리가 나아가는 방향', S.airOn ? '오른쪽 →' : '—');
      setRead(4, '귀에 닿는 것', S.airOn ? '진동 (에너지)' : '없음');
    } else if (S.scene === 'bell') {
      setRead(1, '남은 공기', Math.round(S.air * 100) + '<small>%</small>');
      setRead(2, '들리는 소리', audible() < 0.02 ? '없음' : Math.round(audible() * 100) + '<small>%</small>');
      setRead(3, '펌프', S.pump ? '공기 빼는 중' : '멈춤');
      showRead(4, false);
    } else {
      const P = GEO.scope(activeView().L).plot, lamC = (45000 / W.f) / (SCL / 10);
      setRead(1, '진폭', fmt(W.A, 1) + '<small>칸</small>');
      setRead(2, '파장', fmt(lamC, 1) + '<small>칸</small>');
      setRead(3, '진동수', on('pitch') ? fmt(Math.round(W.f / 10) * 10) + '<small>Hz</small>' : '—');
      setRead(4, '파형', on('timbre') ? SHAPES[S.timbre].name : '—');
      showRead(3, on('pitch')); showRead(4, on('timbre'));
    }
  }

  /* ----- 화면 위 입력 ----- */
  const handPos = (V) => { const G = GEO.rope(V.L); return { x: G.hx, y: G.yc + R.hand * G.ky, G }; };
  const hitHandle = (V, p) => { if (S.scene !== 'rope') return false; const h = handPos(V); return Math.abs(p.x - h.x) < 50 && Math.abs(p.y - h.y) < 66; };
  const hitScope = (V, p) => { if (S.scene !== 'scope') return false; const s = GEO.scope(V.L).scr; return p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h; };
  const hitGhost = (p) => SC.ghostBtn && p.x >= SC.ghostBtn.x && p.x <= SC.ghostBtn.x + SC.ghostBtn.w && p.y >= SC.ghostBtn.y && p.y <= SC.ghostBtn.y + SC.ghostBtn.h;
  function playGhost() {
    const f = GH.tF;
    beep(f, GH.tShape, 0.9, 0.1 * (0.4 + 0.6 * GH.tA / 2.5));
  }
  VIEWS.forEach((V) => {
    SciSim.pointer(V.v, {
      hover: (p) => (hitHandle(V, p) ? 'grab' : S.scene === 'scope' && hitGhost(p) ? 'pointer' : hitScope(V, p) ? 'pointer' : null),
      down(p) {
        if (hitHandle(V, p)) {
          R.drag = true; S.auto = false; R.demo = -1; userRope(); hideHint(); syncUI();
          R.handT = clamp((p.y - handPos(V).G.yc) / handPos(V).G.ky, -74, 74);
          V.v.canvas.style.cursor = 'grabbing'; return true;
        }
        if (S.scene === 'scope' && hitGhost(p)) { playGhost(); Sound.click(); return false; }
        if (hitScope(V, p)) { SC.freeze = true; hideHint(); return true; }
        return false;
      },
      move(p) {
        if (R.drag) R.handT = clamp((p.y - handPos(V).G.yc) / handPos(V).G.ky, -74, 74);
      },
      up() { V.v.canvas.style.cursor = ''; R.drag = false; SC.freeze = false; },
    });
    if (V.key === 'tall') {
      // 휴대폰: 손잡이나 파형 화면을 누른 경우가 아니면 손가락으로 페이지를 넘길 수 있게
      V.v.canvas.style.touchAction = 'pan-y';
      V.v.canvas.addEventListener('touchstart', (e) => {
        const tc = e.touches[0];
        if (tc) { const p = V.v.toLocal(tc); if (hitHandle(V, p) || hitScope(V, p)) e.preventDefault(); }
      }, { passive: false });
    }
  });

  /* =========================================================
     그림(문제 보기용 SVG): 오실로스코프 화면 모양
     ========================================================= */
  function wd(x0, x1, cy, A, lam, w, ph0) {                      // 파형 경로
    const w_ = w || SHAPES.fork; let d = '';
    for (let x = x0; x <= x1 + 0.1; x += 2) {
      const ph = TAU * (x - x0) / lam + (ph0 || 0);
      let v = 0; for (let n = 0; n < NH; n++) v += w_.a[n] * Math.sin((n + 1) * ph + w_.th[n]);
      d += (x === x0 ? 'M' : 'L') + x.toFixed(1) + ' ' + (cy - A * v / w_.peak).toFixed(1) + ' ';
    }
    return d;
  }
  const svgHead = (h, label) => '<svg viewBox="0 0 340 ' + h + '" width="100%" style="max-width:340px" role="img" aria-label="' + label + '" font-family="sans-serif"><rect x="1" y="1" width="338" height="' + (h - 2) + '" rx="12" fill="#06130d"/>';
  const grid = (x0, x1, cy, h) => '<line x1="' + x0 + '" y1="' + cy + '" x2="' + x1 + '" y2="' + cy + '" stroke="#3b7a5a" stroke-width="1.2" stroke-dasharray="4 4"/>';
  const trace = (d, col) => '<path d="' + d + '" fill="none" stroke="' + (col || '#7dffc0') + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
  const txtS = (x, y, s, col, sz, anchor) => '<text x="' + x + '" y="' + y + '" font-size="' + (sz || 14) + '" font-weight="800" fill="' + (col || '#d8f5e6') + '" text-anchor="' + (anchor || 'middle') + '">' + s + '</text>';
  const SVG_AMP = svgHead(196, '진폭이 서로 다른 두 소리 ㉮와 ㉯의 파형') +
    grid(54, 322, 52, 0) + trace(wd(54, 322, 52, 15, 76, null, 0.6)) + txtS(26, 58, '㉮', '#ffd678', 24) +
    grid(54, 322, 144, 0) + trace(wd(54, 322, 144, 38, 76, null, 0.6)) + txtS(26, 150, '㉯', '#ffd678', 24) +
    txtS(170, 190, '두 소리의 높이(진동수)는 같아요', '#9fd8bb', 12.5) + '</svg>';
  const SVG_WL = (() => {
    const x0 = 24, cy = 96, A = 40, lam = 110;
    let s = svgHead(184, '파동의 마루와 골, 길이 ㉠ ㉡ ㉢을 나타낸 그림') + grid(14, 326, cy, 0) + trace(wd(x0, 322, cy, A, lam, null, 0));
    // ㉡: 마루에서 이웃한 마루까지 (x = 51.5, 161.5)
    const c1 = x0 + lam / 4, c2 = c1 + lam, c3 = c2 + lam;
    s += '<line x1="' + c1 + '" y1="' + (cy - A - 3) + '" x2="' + c1 + '" y2="30" stroke="#8fd3ff" stroke-width="1.5" stroke-dasharray="3 4"/>' +
      '<line x1="' + c2 + '" y1="' + (cy - A - 3) + '" x2="' + c2 + '" y2="30" stroke="#8fd3ff" stroke-width="1.5" stroke-dasharray="3 4"/>' +
      '<line x1="' + (c1 + 5) + '" y1="38" x2="' + (c2 - 5) + '" y2="38" stroke="#8fd3ff" stroke-width="3" stroke-linecap="round"/>' +
      '<polygon points="' + (c1 + 1) + ',38 ' + (c1 + 10) + ',33 ' + (c1 + 10) + ',43" fill="#8fd3ff"/><polygon points="' + (c2 - 1) + ',38 ' + (c2 - 10) + ',33 ' + (c2 - 10) + ',43" fill="#8fd3ff"/>' +
      txtS((c1 + c2) / 2, 24, '㉡', '#8fd3ff', 24);
    // ㉠: 중심선에서 마루까지 (x = c3)
    s += '<line x1="' + c3 + '" y1="' + (cy - 2) + '" x2="' + c3 + '" y2="' + (cy - A + 3) + '" stroke="#ffd678" stroke-width="3.4" stroke-linecap="round"/>' +
      '<polygon points="' + c3 + ',' + (cy - A) + ' ' + (c3 - 5) + ',' + (cy - A + 10) + ' ' + (c3 + 5) + ',' + (cy - A + 10) + '" fill="#ffd678"/>' + txtS(c3 + 18, cy - A / 2 + 6, '㉠', '#ffd678', 24);
    // ㉢: 마루에서 골까지 (x = 골 위치)
    const tr = x0 + lam * 0.75 + lam;                              // 두 번째 골
    s += '<line x1="' + tr + '" y1="' + (cy - A + 2) + '" x2="' + tr + '" y2="' + (cy + A - 2) + '" stroke="#ff9aa0" stroke-width="3.4" stroke-linecap="round" opacity=".95"/>' +
      '<polygon points="' + tr + ',' + (cy + A) + ' ' + (tr - 5) + ',' + (cy + A - 10) + ' ' + (tr + 5) + ',' + (cy + A - 10) + '" fill="#ff9aa0"/>' +
      '<polygon points="' + tr + ',' + (cy - A) + ' ' + (tr - 5) + ',' + (cy - A + 10) + ' ' + (tr + 5) + ',' + (cy - A + 10) + '" fill="#ff9aa0"/>' + txtS(tr + 18, cy + 6, '㉢', '#ff9aa0', 24);
    s += txtS(24, 172, '마루: 가장 높은 곳', '#9fd8bb', 12.5, 'start') + txtS(210, 172, '골: 가장 낮은 곳', '#9fd8bb', 12.5, 'start') + '</svg>';
    return s;
  })();
  const SVG_FREQ = svgHead(196, '진동수가 서로 다른 두 소리 ㉮와 ㉯의 파형') +
    grid(54, 322, 52, 0) + trace(wd(54, 322, 52, 28, 134, null, 0.4)) + txtS(26, 58, '㉮', '#ffd678', 24) +
    grid(54, 322, 144, 0) + trace(wd(54, 322, 144, 28, 46, null, 0.4)) + txtS(26, 150, '㉯', '#ffd678', 24) +
    txtS(170, 190, '같은 길이의 구간, 진폭은 같아요', '#9fd8bb', 12.5) + '</svg>';
  const SVG_SHAPE = svgHead(196, '높이와 크기가 같지만 모양이 다른 두 목소리의 파형') +
    grid(54, 322, 52, 0) + trace(wd(54, 322, 52, 30, 70, SHAPES.fork, 0.3)) + txtS(26, 58, '지연', '#ffd678', 15) +
    grid(54, 322, 144, 0) + trace(wd(54, 322, 144, 30, 70, SHAPES.guitar, 0.3)) + txtS(26, 150, '도윤', '#ffd678', 15) +
    txtS(170, 190, '같은 높이, 같은 크기로 낸 “아~” 소리', '#9fd8bb', 12.5) + '</svg>';

  /* =========================================================
     미션
     ========================================================= */
  const MK_DOTS = '🔴🔵🟢';
  function prepMission(i) {
    SC.freeze = false; hideHint(); setGhost(null);
    switch (i) {
      case 0: setScene('rope'); S.auto = false; R.demo = 0; S.mkMove = [0, 0, 0]; S.reach = false; S.userRope = false; showHint('손잡이를 위아래로 끌어 보세요', 6000); break;
      case 1: setScene('air'); S.airOn = true; break;
      case 2: setScene('bell'); S.pump = false; S.refill = true; S.vac = { out: false, back: false }; showHint('펌프로 공기를 빼 보세요', 6000); break;
      case 3: setScene('scope'); setVol(2); S.vol0 = 2; setPitch(300); S.timbre = 'fork'; showHint('슬라이더로 소리의 크기를 바꿔요', 6000); break;
      case 4: setScene('scope'); setVol(3); setPitch(300); S.timbre = 'fork'; break;
      case 5: setScene('scope'); setVol(3); setPitch(300); S.timbre = 'fork'; break;
      case 6:
        setScene('scope'); setVol(3); S.timbre = 'fork'; setPitch(450);
        S.pr = 0; S.prDone = [false, false]; S.prHold = 0; S.prWait = 0;
        setGhost({ A: ampOf(3), f: TG3[0].f, shape: 'fork', label: '▶ 목표 음 듣기', snap: true });
        showHint('점선 파형과 똑같이 포개지게 맞춰요', 6000); break;
      case 7: setScene('scope'); setVol(3); setPitch(300); S.timbre = 'fork'; break;
      case 8: setScene('scope'); setVol(3); setPitch(300); S.timbre = 'fork'; S.instT = { fork: 0, flute: 0, guitar: 0 }; showHint('악기를 하나씩 눌러 파형을 비교해요', 6000); break;
      case 9:
        setScene('scope'); setVol(3); setPitch(300); S.timbre = 'fork';
        S.my = 0; S.myDone = [false, false, false]; S.myHold = 0; S.myWait = 0;
        setGhost({ A: ampOf(3), f: 300, shape: MYST[0], label: '▶ 수수께끼 소리 듣기', snap: true });
        break;
      default: if (S.scene !== 'scope') setScene('scope'); break;
    }
    syncUI();
  }
  const INST_NAME = { fork: '🔔 소리굽쇠', flute: '🪈 피리', guitar: '🎸 기타' };

  game = SciSim.game({
    simId: 'm2-sound-wave',
    mount: '#game',
    badge: '파동 박사',
    homeHref: '../../index.html#g2',
    featureLabels: {
      vol: '🔉 소리의 크기',
      pitch: '🎵 소리의 높낮이(진동수)',
      timbre: '🎼 악기 고르기',
    },
    onFeatures(set) { F = set; syncUI(); },
    onMissionStart(m) { prepMission(m._flat); },
    levels: [
      /* ───────── STEP 1 · 파동 ───────── */
      {
        title: '파동: 진동이 전달돼요', short: '파동', icon: '🌊', phase: '관찰',
        features: [],
        intro: '<p class="si-q">❓ 탐구 질문: 소리는 어떻게 우리 귀까지 전달될까?</p>' +
          '<p>줄의 한쪽 끝을 흔들면 흔들림이 줄을 따라 반대쪽 끝까지 가요. 이렇게 <b>한 곳에서 생긴 진동이 주변으로 퍼져 나가는 현상</b>을 <b>파동</b>이라고 해요. 파동을 전달해 주는 물질은 <b>매질</b>이에요.</p>' +
          '<p>줄 위의 <b>표시점</b>과 공기 속 <b>입자</b>를 눈여겨보면서, 파동이 정말 무엇을 전달하는지 알아봐요.</p>',
        setup() { prepMission(0); },
        recap: '파동은 매질이 이동하는 것이 아니라, 매질의 <b>진동(에너지)</b>이 이웃으로 차례로 전달되는 현상이에요. 소리도 공기 같은 <b>매질</b>이 있어야 전달돼요.',
        summary: '<p><b>파동</b>: 한 곳에서 생긴 <b>진동</b>이 매질을 통해 주변으로 퍼져 나가는 현상. 파동을 전달하는 물질을 <b>매질</b>이라고 한다.</p>' +
          '<ul><li>줄 위의 표시점이나 공기 입자 같은 매질은 <b>제자리에서 진동</b>할 뿐, 파동과 함께 이동하지 않는다.</li>' +
          '<li>파동이 전달하는 것은 매질이 아니라 <b>에너지</b>이다.</li>' +
          '<li><b>소리</b>는 파동의 일종이다. 공기 같은 <b>매질이 있어야</b> 전달되고, 진공에서는 전달되지 않는다.</li></ul>',
        missions: [
          {
            title: '줄에 파동 보내기',
            goal: '🪢 손잡이를 위아래로 흔들어 파동을 줄 끝까지 보내세요. 🔴🔵🟢 <b>표시점</b>이 어떻게 움직이는지 살펴봐요.',
            hint: '화면 속 손잡이를 끌거나, 아래의 <b>자동으로 흔들기</b>를 눌러요. 표시점이 파동과 함께 오른쪽으로 가는지 보세요.',
            check: () => S.reach && S.mkMove.every((v) => v > 14),
            hold: 0.3,
            status: () => '표시점 ' + ['🔴', '🔵', '🟢'].map((d, i) => d + mark(S.mkMove[i] > 14)).join(' ') + ' · 줄 끝에 도착 ' + mark(S.reach),
            explain: '손잡이를 흔들면 <b>진동</b>이 줄을 따라 오른쪽으로 전달돼요. 그런데 표시점은 오른쪽으로 가지 않고 <b>제자리에서 위아래로만</b> 움직였어요. 파동이 전달된 것은 줄이 아니라 <b>진동(에너지)</b>이에요. 줄 끝의 고리가 흔들린 것이 그 증거예요.',
          },
          {
            type: 'quiz',
            title: '공기 속에서의 소리',
            goal: '스피커의 소리가 귀까지 전달되는 동안, 화면 속 🔴🔵🟢 <b>공기 입자</b>는 어떻게 움직였나요?',
            choices: [
              '스피커에서 귀까지 날아가며 소리를 전달한다',
              '제자리에서 앞뒤로 떨리고, 그 떨림이 이웃 입자로 차례로 전달된다',
              '움직이지 않고, 소리만 입자 사이를 지나간다',
              '소리가 커질수록 더 빨리 귀까지 날아간다',
            ],
            answer: 1,
            feedback: [
              '표시한 입자들이 어디에 머물러 있었는지 다시 보세요. 입자가 귀까지 날아오는 것은 아니에요.',
              '',
              '입자들도 가만히 있지 않고 앞뒤로 떨렸어요. 입자의 진동이 있어야 소리가 전달돼요.',
              '공기 입자는 이동하지 않아요. 소리가 커지면 입자의 떨리는 폭이 커질 뿐이에요.',
            ],
            explain: '공기 입자(매질)는 <b>제자리에서 진동</b>할 뿐 귀까지 이동하지 않아요. 한 입자의 진동이 이웃 입자를 차례로 진동시켜서 <b>진동(에너지)</b>이 귀까지 전달돼요. 줄에서 표시점이 제자리에서 움직인 것과 같은 원리예요.',
          },
          {
            title: '공기가 없으면 소리가 없어요',
            goal: '🔔 유리 종 안의 <b>공기를 빼서</b> 종소리가 사라지게 한 뒤, 공기를 다시 넣어 소리가 돌아오는지 확인해요.',
            hint: '<b>공기 빼기</b>를 눌러 남은 공기를 거의 0%로 만들어요. 그다음 <b>공기 다시 넣기</b>를 눌러요. 🎧 소리 듣기를 켜면 종소리를 들을 수 있어요.',
            check: () => S.vac.out && S.vac.back,
            hold: 0.3,
            status: () => '공기를 빼서 소리가 사라짐 ' + mark(S.vac.out) + ' · 공기를 다시 넣어 소리가 돌아옴 ' + mark(S.vac.back),
            explain: '종은 계속 울리고 있지만 공기를 빼면 종소리가 점점 <b>작아지다가 들리지 않아요</b>. 진동을 전달해 줄 <b>매질(공기)</b>이 없기 때문이에요. 공기를 다시 넣으면 소리가 돌아와요. 소리는 <b>매질이 있어야</b> 전달되는 파동이에요.',
          },
        ],
      },
      /* ───────── STEP 2 · 진폭 ───────── */
      {
        title: '진폭: 소리의 크기', short: '진폭', icon: '📏', phase: '탐구',
        features: ['vol'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소리는 매질의 진동이 전달되는 파동이라는 것을 알았어요.</div>' +
          '<p>소리의 파동을 <b>소리 화면(오실로스코프)</b>에 나타내 봐요. 파동의 가장 높은 곳은 <b>마루</b>, 가장 낮은 곳은 <b>골</b>이에요. 가운데 선에서 마루까지의 높이가 <b>진폭</b>이고, 마루에서 이웃한 마루까지의 거리가 <b>파장</b>이에요.</p>' +
          '<p style="font-size:14px;color:#5d6879">실제 소리는 너무 빨리 진동해서 화면은 <b>슬로 모션</b>으로 보여 줘요. 화면을 누르고 있으면 멈춰요.</p>',
        setup() { prepMission(3); },
        recap: '소리가 클수록 파형의 <b>진폭</b>이 커요. 마루에서 이웃한 마루까지의 거리는 <b>파장</b>이에요.',
        summary: '<p><b>진폭</b>: 파동의 중심선에서 마루(또는 골)까지의 높이. 진폭이 클수록 <b>큰 소리</b>이다.</p>' +
          '<ul><li><b>마루</b>: 파동의 가장 높은 곳, <b>골</b>: 가장 낮은 곳</li>' +
          '<li><b>파장</b>: 마루에서 이웃한 마루까지(또는 골에서 이웃한 골까지)의 거리</li>' +
          '<li>소리의 크기를 바꾸어도 파장은 변하지 않는다.</li></ul>',
        missions: [
          {
            title: '소리를 크게 하면?',
            goal: '🔉 소리의 크기를 조절해서 <b>진폭을 2배</b>(1칸 → 2칸)로 만들어 보세요.',
            hint: '슬라이더를 오른쪽으로 밀면 소리가 커져요. 파형의 높이가 어떻게 변하는지 보세요.',
            check: () => S.vol === S.vol0 * 2 && Math.abs(W.A - 2 * ampOf(S.vol0)) < 0.05,
            hold: 0.8,
            status: () => '진폭 <b>' + fmt(W.A, 1) + '칸</b> (처음의 ' + fmt(W.A / ampOf(S.vol0), 1) + '배) → 목표 2.0칸',
            explain: '소리를 크게 하면 파형의 <b>진폭</b>이 커져요. 진폭이 클수록 <b>큰 소리</b>, 작을수록 작은 소리예요. 이때 마루와 마루 사이의 거리인 <b>파장</b>은 그대로예요.',
          },
          {
            type: 'quiz',
            title: '어느 쪽이 더 큰 소리일까?',
            goal: '높이(진동수)가 같은 두 소리의 파형이에요. 더 <b>큰 소리</b>는 어느 것이고, 까닭은 무엇일까요?',
            figure: SVG_AMP,
            choices: [
              '㉮, 진폭이 더 작아서',
              '㉮, 파장이 더 길어서',
              '㉯, 진폭이 더 커서',
              '㉯, 파동이 더 빨리 나아가서',
            ],
            answer: 2,
            feedback: [
              '진폭이 작으면 작은 소리예요. 두 파형 중 마루가 더 높은 것을 찾아보세요.',
              '두 파형의 파장은 같아요. 소리의 크기는 파장이 아니라 파형의 높이와 관련 있어요.',
              '',
              '두 소리의 높이는 같고, 다른 것은 파형의 높이(진폭)예요.',
            ],
            explain: '소리의 크기는 <b>진폭</b>으로 나타내요. ㉯는 ㉮보다 마루가 높고(진폭이 크고) 파장은 같아서, ㉯가 더 <b>큰 소리</b>예요.',
          },
          {
            type: 'quiz',
            title: '파장은 어디일까?',
            goal: '파동의 모양을 나타낸 그림이에요. 마루에서 이웃한 마루까지의 거리인 <b>파장</b>을 나타낸 것은?',
            figure: SVG_WL,
            choices: [
              '㉠ (중심선에서 마루까지)',
              '㉡ (마루에서 이웃한 마루까지)',
              '㉢ (마루에서 골까지)',
            ],
            answer: 1,
            feedback: [
              '㉠은 중심선에서 마루까지의 높이, 즉 진폭이에요.',
              '',
              '㉢은 마루에서 골까지의 높이로, 진폭의 2배예요. 파장은 가로 방향의 거리예요.',
            ],
            explain: '<b>파장</b>은 마루에서 이웃한 마루까지(골에서 이웃한 골까지)의 <b>거리</b>예요. ㉠은 <b>진폭</b>, ㉢은 진폭의 2배예요.',
          },
        ],
      },
      /* ───────── STEP 3 · 진동수 ───────── */
      {
        title: '진동수: 소리의 높낮이', short: '진동수', icon: '🎵', phase: '탐구',
        features: ['pitch'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소리의 크기는 <b>진폭</b>과 관련 있다는 것을 알았어요.</div>' +
          '<p>이번에는 소리의 <b>높낮이</b>예요. 피아노의 높은 음과 낮은 음은 무엇이 다를까요? <b>진동수</b>는 <b>1초 동안 진동하는 횟수</b>이고, 단위는 <b>Hz(헤르츠)</b>예요.</p>' +
          '<p>슬라이더로 진동수를 바꾸면서 파형이 어떻게 달라지는지 봐요. 화면 속 🔴 빨간 점은 소리가 지나가는 한 지점이에요.</p>',
        setup() { prepMission(6); },
        recap: '진동수가 클수록 <b>높은 소리</b>이고, 파형의 <b>파장은 짧아져요</b>. 진동수의 단위는 Hz예요.',
        summary: '<p><b>진동수</b>: 1초 동안 진동하는 횟수. 단위는 <b>Hz(헤르츠)</b>. 진동수가 클수록 <b>높은 소리</b>이다.</p>' +
          '<ul><li>진동수가 클수록 파형에서 <b>파장이 짧아진다</b> (같은 길이에 마루가 더 많이 들어간다).</li>' +
          '<li>진동수가 작으면 낮은 소리, 파장은 길다.</li>' +
          '<li>소리의 높낮이를 바꾸어도 진폭(소리의 크기)은 변하지 않는다.</li></ul>',
        missions: [
          {
            title: '목표 음 맞히기',
            goal: '🎯 노란 점선 파형과 똑같이 포개지도록 <b>진동수</b>를 맞춰요. <b>높은 음 → 낮은 음</b> 순서예요.',
            hint: '점선은 목표 음의 파형이에요. 목표 이름표를 누르면 소리를 들을 수 있어요. 높은 음일수록 마루가 촘촘해요.',
            check: () => S.prDone[0] && S.prDone[1],
            hold: 0.3,
            status: () => '높은 음 ' + mark(S.prDone[0]) + ' · 낮은 음 ' + mark(S.prDone[1]) + ' · 지금 ' + fmt(Math.round(S.pitch)) + ' Hz',
            explain: '<b>높은 음</b>은 진동수가 커서 파형의 파장이 짧고(마루가 촘촘하고), <b>낮은 음</b>은 진동수가 작아서 파장이 길어요. 진동수를 바꾸어도 파형의 높이(진폭)는 그대로예요.',
          },
          {
            type: 'quiz',
            title: '어느 쪽이 더 높은 소리일까?',
            goal: '진폭이 같은 두 소리를 같은 길이의 구간에 나타낸 파형이에요. 더 <b>높은 소리</b>는 어느 것이고, 까닭은 무엇일까요?',
            figure: SVG_FREQ,
            choices: [
              '㉮, 파장이 길어서 진동수가 크다',
              '㉯, 파장이 짧고 진동수가 크다',
              '㉯, 진폭이 커서',
              '두 소리의 높이는 같다',
            ],
            answer: 1,
            feedback: [
              '파장이 길면 같은 길이에 마루가 적게 들어가요. 1초 동안 진동하는 횟수(진동수)도 작아서 낮은 소리예요.',
              '',
              '두 파형의 진폭은 같아요. 진폭은 소리의 크기와 관련 있고, 높낮이는 진동수와 관련 있어요.',
              '두 파형은 모양이 달라요. 같은 길이 안에 들어 있는 마루의 수를 세어 비교해 보세요.',
            ],
            explain: '㉯는 같은 길이에 마루가 더 많아서 <b>파장이 짧고 진동수가 커요</b>. 진동수가 클수록 <b>높은 소리</b>이므로 ㉯가 더 높은 소리예요.',
          },
        ],
      },
      /* ───────── STEP 4 · 파형 ───────── */
      {
        title: '파형: 소리의 맵시', short: '파형', icon: '🎼', phase: '적용',
        features: ['timbre'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소리의 크기는 <b>진폭</b>, 소리의 높낮이는 <b>진동수</b>와 관련 있다는 것을 알았어요.</div>' +
          '<p>같은 높이, 같은 크기로 소리굽쇠·피리·기타를 연주해도 소리는 서로 달라요. 이 소리의 맵시를 <b>음색</b>이라고 하고, 음색은 소리의 <b>파형</b>(파동의 모양)이 다르기 때문에 생겨요.</p>' +
          '<p>이번 단계에서는 높이(300 Hz)와 크기를 고정하고, <b>악기만 바꾸면서</b> 파형을 비교해 봐요.</p>',
        setup() { prepMission(8); },
        recap: '같은 높이, 같은 크기의 소리도 <b>파형</b>이 다르면 <b>음색</b>이 달라요. 그래서 악기와 목소리를 구별할 수 있어요.',
        summary: '<p><b>파형</b>: 소리를 화면에 나타냈을 때 파동의 모양. 같은 높이(진동수)와 크기(진폭)의 소리라도 악기나 사람마다 <b>파형이 달라서 음색(소리의 맵시)이 다르다</b>.</p>' +
          '<ul><li>소리굽쇠: 매끈한 곡선 모양의 파형</li><li>피리·기타: 더 복잡한 모양의 파형</li>' +
          '<li>소리의 세 가지 특성: <b>크기 ↔ 진폭</b>, <b>높낮이 ↔ 진동수</b>, <b>음색 ↔ 파형</b></li></ul>',
        missions: [
          {
            title: '세 악기의 파형 비교',
            goal: '🎼 소리굽쇠 · 피리 · 기타를 차례로 눌러 파형을 비교해요. 같은 점과 다른 점은 무엇일까요?',
            hint: '악기를 하나씩 눌러서 1~2초씩 살펴봐요. 마루의 높이와 마루 사이의 거리를 비교해 보세요.',
            check: () => ['fork', 'flute', 'guitar'].every((k) => S.instT[k] >= 1.5),
            hold: 0.3,
            status: () => ['fork', 'flute', 'guitar'].map((k) => INST_NAME[k] + ' ' + mark(S.instT[k] >= 1.5)).join(' · '),
            explain: '세 악기 모두 마루의 높이(<b>진폭</b>)와 마루 사이의 거리(<b>파장</b>)는 같아요. 그래서 크기와 높이는 같아요. 다른 것은 파동의 <b>모양(파형)</b>이에요. 그래서 소리의 맵시, 즉 <b>음색</b>이 달라요.',
          },
          {
            title: '수수께끼 소리 맞히기',
            goal: '🔎 노란 점선은 수수께끼 소리의 파형이에요. 점선과 <b>똑같은 파형</b>이 되는 악기를 골라요. (3문제)',
            hint: '악기를 눌러 초록 파형이 점선과 포개지는지 확인해요. 모양이 부드러운지, 뾰족하게 울퉁불퉁한지 살펴보세요.',
            check: () => S.myDone.every(Boolean),
            hold: 0.3,
            status: () => '맞힌 소리 ' + S.myDone.map(mark).join('') + ' · 지금 고른 악기 ' + INST_NAME[S.timbre],
            explain: '악기마다 파형이 달라요. 소리굽쇠는 <b>매끈한 곡선</b>, 피리는 <b>조금 출렁이는 곡선</b>, 기타는 <b>뾰족하고 복잡한 곡선</b>이에요. 파형을 보면 어떤 악기의 소리인지 알 수 있어요.',
          },
          {
            type: 'quiz',
            title: '목소리로 사람을 구별하는 까닭',
            goal: '지연이와 도윤이가 같은 높이, 같은 크기로 “아~” 하고 소리를 냈어요. 그래도 두 목소리를 구별할 수 있는 까닭은?',
            figure: SVG_SHAPE,
            choices: [
              '두 목소리의 진폭이 서로 다르기 때문이다',
              '두 목소리의 진동수가 서로 다르기 때문이다',
              '두 목소리의 파형이 서로 달라서 음색이 다르기 때문이다',
              '두 목소리가 전달되는 매질이 서로 다르기 때문이다',
            ],
            answer: 2,
            feedback: [
              '같은 크기로 소리를 냈다고 했어요. 그러면 진폭은 같아요.',
              '같은 높이로 소리를 냈다고 했어요. 그러면 진동수도 같아요.',
              '',
              '두 목소리 모두 공기를 통해 전달돼요. 소리를 내는 사람(물체)에 따라 달라지는 것이 무엇인지 그림에서 찾아보세요.',
            ],
            explain: '높이(진동수)와 크기(진폭)가 같아도 사람마다 목소리의 <b>파형</b>이 달라 <b>음색</b>이 달라요. 그래서 얼굴을 보지 않아도 목소리로 누구인지 알 수 있어요.',
          },
        ],
      },
    ],
  });
  syncUI();

  /* ----- 미션 진행 (매 프레임) ----- */
  const gameFlatNow = () => (game && game.phase === 'active' ? gameFlat() : -1);
  function burstAt(x, y) {
    if (REDUCE) return;
    const V = activeView();
    V.fx.burst(x, y, { count: 22, colors: ['#ffd24a', '#7be495', '#7fb2ff', '#ffffff'], speed: 190, gravity: 120, life: 0.8 });
  }
  function updateMission(dt) {
    const f = gameFlatNow();
    if (S.scene === 'rope' && S.userRope) {
      R.MKI.forEach((idx, k) => { S.mkMove[k] = Math.max(S.mkMove[k], Math.abs(R.u[idx])); });
      if (R.endE > 7) S.reach = true;
    }
    // ③ 목표 음 맞히기
    if (f === 6) {
      if (S.pr < 2 && !S.prDone[S.pr]) {
        const ok = Math.abs(S.pitch - TG3[S.pr].f) <= 20;
        S.prHold = ok ? S.prHold + dt : 0;
        if (S.prHold > 0.7) {
          S.prDone[S.pr] = true; S.prHold = 0; S.prWait = 1.1;
          const P = GEO.scope(activeView().L).plot;
          burstAt(P.x + P.w / 2, P.y + P.h / 2); Sound.tone(880, 0.18, 'triangle', 0.1);
          if (S.pr === 0) showHint('좋아요! 이번에는 낮은 음이에요', 2600);
        }
      } else if (S.prWait > 0) {
        S.prWait -= dt;
        if (S.prWait <= 0 && S.pr === 0) { S.pr = 1; setGhost({ A: ampOf(3), f: TG3[1].f, shape: 'fork', label: '▶ 목표 음 듣기' }); }
      }
    }
    // ④ 세 악기 비교, 수수께끼 소리
    if (f === 8 && S.scene === 'scope') S.instT[S.timbre] += dt;
    if (f === 9) {
      if (S.my < 3 && !S.myDone[S.my]) {
        const ok = S.timbre === MYST[S.my];
        S.myHold = ok ? S.myHold + dt : 0;
        if (S.myHold > 0.8) {
          S.myDone[S.my] = true; S.myHold = 0; S.myWait = 1.0;
          const P = GEO.scope(activeView().L).plot;
          burstAt(P.x + P.w / 2, P.y + P.h / 2); Sound.tone(880, 0.18, 'triangle', 0.1);
          if (S.my < 2) showHint('맞아요! 다음 수수께끼 소리예요', 2400);
        }
      } else if (S.myWait > 0) {
        S.myWait -= dt;
        if (S.myWait <= 0 && S.my < 2) { S.my++; setGhost({ A: ampOf(3), f: 300, shape: MYST[S.my], label: '▶ 수수께끼 소리 듣기' }); }
      }
    }
  }

  /* =========================================================
     그리기 · 시작
     ========================================================= */
  let lastPhase = '';
  function successFx(V, t) {
    const ph = game ? game.phase : '';
    if (ph === 'success' && lastPhase === 'active') {
      hideHint();
      S.succ = S.scene === 'scope' ? { t0: t, x: V.L.vw - (V.L.key === 'wide' ? 78 : 66), y: V.L.key === 'wide' ? 78 : 80 } : { t0: t, x: V.L.vw / 2, y: V.L.key === 'wide' ? 58 : 78 };
      if (!REDUCE) V.fx.burst(S.succ.x, S.succ.y, { count: 26, colors: ['#ffd24a', '#7be495', '#7fb2ff', '#ff8a8e', '#ffffff'], speed: 200, gravity: 120, life: 0.9 });
    }
    lastPhase = ph;
  }
  function drawSuccess(V, t) {
    const k = (t - S.succ.t0) / 1.6;
    if (k < 0 || k > 1) return;
    const { ctx, D } = V;
    const pop = EASE.outBack(clamp(k * 3, 0, 1)), fade = 1 - smooth(0.7, 1, k);
    ctx.save(); ctx.globalAlpha = fade; ctx.translate(S.succ.x, S.succ.y); ctx.scale(pop, pop); ctx.translate(-S.succ.x, -S.succ.y);
    D.shadow(() => D.check(S.succ.x, S.succ.y, 30, clamp(k * 3.5, 0, 1)), { blur: 14, y: 3, color: 'rgba(0,0,0,.4)' });
    ctx.restore();
  }
  function drawView(V, t, dt) {
    const { ctx, L } = V;
    V.v.clear();
    ctx.fillStyle = BG; ctx.fillRect(0, 0, L.vw, L.vh);
    const k = clamp(S.fade.k, 0, 1);
    ctx.save();
    if (k < 1) { ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 14); }
    if (S.scene === 'rope') drawRope(V, t);
    else if (S.scene === 'air') drawAir(V, t, dt);
    else if (S.scene === 'bell') drawBell(V, t, dt);
    else drawScope(V, t);
    ctx.restore();
    drawSuccess(V, t);
    V.fx.draw(ctx);
  }

  // 테스트·디버그용 (화면 동작에는 영향 없음)
  window.__sim = { drawView, S, W, GH, R, game, setScene, setVol, setPitch, setTimbre, prepMission, VIEWS, activeView, GEO, SHAPES, Tone, lamOf, ampOf, enterScene, SC, TG3, MYST };

  const PERF = { d: [] };
  window.__perf = PERF;
  let wasFree = false, loopBK = '';
  SciSim.loop((dt, t) => {
    const V = activeView();
    S.t = t;
    const key = [!!(game && game.free), game ? game.level : 0, S.scene].join();
    if (key !== uiKey) syncUI();
    if (game && game.free && !wasFree) { setGhost(null); }
    wasFree = !!(game && game.free);
    stepRope(dt, t);
    updateAir(dt); updateBell(dt, t); updateScope(dt);
    updateMission(dt);
    const bk = [S.pump, S.refill, S.air > 0.97].join();
    if (bk !== loopBK) { loopBK = bk; syncUI(); }
    successFx(V, t);
    V.fx.update(dt);
    const t0 = performance.now();
    drawView(V, t, dt);
    PERF.d.push(performance.now() - t0); if (PERF.d.length > 600) PERF.d.shift();
    updateReadouts(t);
  });
})();
