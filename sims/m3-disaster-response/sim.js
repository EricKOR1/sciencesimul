/* =========================================================
   중3 Ⅶ. 재해·재난과 안전 — 재해·재난의 대비와 대처 [9과22-02]
   ① [관찰] 사전 대비: 집 안 위험 요소 찾기 + 무게 제한 비상 가방 꾸리기
   ② [실험] 화재와 유독 가스: 복도 연기(천장부터 채움)·대피 자세, 유독 가스 대피 지도(높은 곳·바람이 불어오는 쪽)
   ③ [탐구] 지진과 홍수: 진동대 위 건물(일반/내진/면진), 지진 행동 순서, 홍수 대피 경로
   ④ [적용] 안전 홍보: 문장 카드로 예방·대비·대처 포스터 완성
   ※ 사후 대처뿐 아니라 사전 예방·대비를 함께 다뤄요. 수치는 학습용 예시예요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, Sound, clamp, lerp, fmt } = SciSim;
  const TAU = Math.PI * 2;
  const view = SciSim.stage($('#cv'), { width: 800, height: 540, background: '#f1f5f9' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const rgba = SciSim.color.rgba, shade = SciSim.color.shade, mixc = SciSim.color.mix;
  const approach = SciSim.approach;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mkRng = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

  let game = null;
  let F = new Set();
  const isNew = (f) => !!(game && game.isNew(f));
  const chk = (ok, label) => (ok ? '✅ ' : '⬜ ') + label;
  const fx = new SciSim.Particles();

  const SCENES = [
    { id: 'home', step: 0, label: '🏠 집 안 살피기' },
    { id: 'bag', step: 0, label: '🎒 비상 가방' },
    { id: 'fire', step: 1, label: '🔥 복도 연기' },
    { id: 'evac', step: 1, label: '☣️ 가스 대피' },
    { id: 'shake', step: 2, label: '🏢 진동대' },
    { id: 'order', step: 2, label: '🪑 지진 행동' },
    { id: 'flood', step: 2, label: '🌊 홍수 대피' },
    { id: 'pquake', step: 3, label: '🌍 지진' },
    { id: 'pfire', step: 3, label: '🔥 화재' },
    { id: 'pflood', step: 3, label: '🌊 홍수' },
  ];
  const S = { scene: 'home', prev: null, tr: 1, t: 0, hasSnap: false, ph: '', okAt: -9 };

  /* ---------- 공통 그리기 도우미 ---------- */
  function pill(x, y, text, o) { return D.label(x, y, text, Object.assign({ bg: 'rgba(255,255,255,.94)', color: '#1b2333', border: '#cbd5e1', size: 13 }, o || {})); }
  function caption(text) { pill(16, 28, text, { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 14.5, pad: 12, align: 'left' }); }
  function newTag() {
    const x = 14, y = 44, a = 0.5 + 0.5 * Math.sin(S.t * 6);
    ctx.save(); ctx.fillStyle = '#ef4444'; D.roundRect(x, y, 46, 20, 10); ctx.fill();
    ctx.globalAlpha = 0.35 + a * 0.4; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; D.roundRect(x - 3, y - 3, 52, 26, 13); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = D.font(12, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NEW', x + 23, y + 11); ctx.restore();
  }
  function example(x, y, text) { pill(x, y, text || '※ 예시 자료', { bg: '#fff7ed', color: '#9a3412', border: '#fdba74', size: 12.5, weight: 800, align: 'right' }); }
  const wrapCache = new Map();
  function wrapLines(text, maxW, size, weight) {
    const key = text + '|' + maxW + '|' + size + '|' + weight;
    let r = wrapCache.get(key);
    if (r) return r;
    ctx.save(); ctx.font = D.font(size, weight || 700);
    r = []; let line = '';
    for (const ch of text) {
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) { r.push(line); line = ch === ' ' ? '' : ch; } else line = t;
    }
    if (line) r.push(line);
    ctx.restore();
    wrapCache.set(key, r);
    return r;
  }
  function textBox(x, y, w, text, size, o) {
    o = o || {};
    const lines = wrapLines(text, w, size, o.weight || 700), lh = size * 1.32;
    const total = lines.length * lh;
    let yy = y - (o.vcenter ? total / 2 : 0) + size;
    lines.forEach((ln, i) => { D.text(x, yy + i * lh - size * 0.2, ln, { size, weight: o.weight || 700, color: o.color || '#1b2333', align: o.align || 'center' }); });
    return lines.length;
  }
  function panelBG(color) { view.clear(color || '#f1f5f9'); }
  let hintTimer = 0;
  function showHint(text, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = text; h.classList.remove('hide');
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(() => h.classList.add('hide'), ms);
  }
  let lastToast = 0;
  function toastOnce(msg) { const n = performance.now(); if (n - lastToast > 2500) { lastToast = n; SciSim.toast(msg); } }

  /* 사람 그리기 (자세 c: 0 서기 ~ 1 낮은 자세) */
  function drawPerson(x, fy, o) {
    const c = o.c || 0, ph = o.ph || 0, dir = o.dir || 1, mv = o.moving ? 1 : 0, sc = o.s || 1;
    ctx.save(); ctx.translate(x, fy); ctx.scale(sc, sc); ctx.translate(-x, -fy);
    const hipX = x, hipY = fy - lerp(54, 32, c);
    const shX = x + dir * lerp(0, 20, c), shY = fy - lerp(102, 50, c);
    const hdX = shX + dir * lerp(0, 12, c), hdY = shY - lerp(22, 12, c);
    const sw = Math.sin(ph) * lerp(15, 9, c) * mv;
    const col = o.shirt || '#3b82f6', pants = '#475569', skin = '#fcd9b6';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const limb = (x1, y1, x2, y2, bend, w, color) => {
      const mx = (x1 + x2) / 2 + dir * bend, my = (y1 + y2) / 2;
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my, x2, y2); ctx.stroke();
    };
    const lift1 = Math.max(0, Math.sin(ph)) * 5 * mv, lift2 = Math.max(0, -Math.sin(ph)) * 5 * mv;
    limb(hipX, hipY, hipX - sw * dir, fy - lift2, 4 * dir, 8, shade(pants, -0.15));
    limb(shX, shY + 4, shX + sw * dir * 0.9 - dir * 4, shY + lerp(30, 24, c), 3 * dir, 6, shade(skin, -0.12));
    // 몸통
    ctx.strokeStyle = col; ctx.lineWidth = 17; ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(shX, shY); ctx.stroke();
    limb(hipX, hipY, hipX + sw * dir, fy - lift1, 4 * dir, 8, pants);
    limb(shX, shY + 4, shX - sw * dir * 0.9 + dir * 6, shY + lerp(30, 24, c), 3 * dir, 6, skin);
    // 머리
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hdX, hdY, 13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(hdX - dir * 2, hdY - 3, 13, Math.PI * (dir > 0 ? 0.95 : 0.05), Math.PI * (dir > 0 ? 2.05 : 1.05), dir < 0); ctx.fill();
    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(hdX + dir * 5, hdY + 1, 1.8, 0, TAU); ctx.fill();
    if (o.towel) {
      ctx.fillStyle = '#e0f2fe'; ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
      D.roundRect(hdX + dir * 2 - 8, hdY + 3, 16, 9, 3); ctx.fill(); ctx.stroke();
    }
    if (o.cough) { D.text(hdX + dir * 22, hdY - 14, '콜록', { size: 13, weight: 800, color: '#64748b' }); }
    ctx.restore();
  }

  /* ---------- 끌기(드래그) 도우미 ---------- */
  const DR = { it: null, ox: 0, oy: 0, x0: 0, y0: 0, list: null, scene: '' };
  function hitItem(list, p) {
    for (let i = list.length - 1; i >= 0; i--) { const c = list[i]; if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return c; }
    return null;
  }
  function flyTo(c, x, y, w, h) {
    if (c.tw) c.tw.cancel();
    c.tw = SciSim.tween(c, { x, y, w: w != null ? w : c.w, h: h != null ? h : c.h }, { duration: 0.4, ease: 'outBack' });
  }
  function drawCardShape(x, y, w, h, o) {
    ctx.save();
    D.shadow(() => { ctx.fillStyle = o.fill || '#fff'; D.roundRect(x, y, w, h, 12); ctx.fill(); }, { blur: 5 + 12 * (o.lift || 0), y: 2 + 6 * (o.lift || 0), color: 'rgba(30,41,59,' + (0.16 + 0.1 * (o.lift || 0)) + ')' });
    ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke || '#94a3b8'; D.roundRect(x, y, w, h, 12); ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     ① 집 안 위험 요소 찾기
     ========================================================= */
  const FLOOR = 430;
  const HZ = {
    shelf: { x: 30, y: 150, w: 130, h: 280, hazard: true, name: '책장', fix: 0, msg: '고정되지 않은 책장은 흔들리면 쓰러질 수 있어요. 벽에 고정해요!' },
    vase: { x: 290, y: 110, w: 90, h: 70, hazard: true, name: '높은 선반의 무거운 화분', fix: 0, msg: '높은 곳의 무거운 물건은 떨어지면 위험해요. 낮은 곳으로 옮겨요!' },
    alarm: { x: 596, y: 68, w: 56, h: 36, hazard: true, name: '가스 경보기', fix: 0, msg: 'LPG는 공기보다 무거워 바닥에 고여요. 경보기를 바닥 가까이 달아요!' },
    wardrobe: { x: 410, y: 200, w: 112, h: 230, hazard: false, name: '장롱', msg: '벽에 고정 장치가 달려 있어서 괜찮아요.' },
    box: { x: 222, y: 336, w: 100, h: 44, hazard: false, name: '낮은 선반의 상자', msg: '낮은 곳에 두어서 떨어져도 덜 위험해요.' },
    ext: { x: 534, y: 366, w: 34, h: 64, hazard: false, name: '소화기', msg: '소화기가 눈에 잘 띄는 곳에 있어서 좋아요.' },
  };
  const HM = { found: new Set(), looked: new Set(), msg: '', msgT: -9, msgCol: '#334155', bounce: {}, vase: { x: 340, y: 170 }, alarmY: 86, gasLayer: 0, gasP: [], emit: 0, led: 0 };
  function homeReset() {
    HM.found.clear(); HM.looked.clear(); HM.msg = ''; HM.gasP.length = 0; HM.gasLayer = 0; HM.emit = 0; HM.alarmY = 86; HM.vase.y = 170; HM.vase.x = 340;
    Object.keys(HZ).forEach((k) => { HZ[k].fix = 0; HM.bounce[k] = 0; });
  }
  function homeTap(p) {
    for (const k of Object.keys(HZ)) {
      const o = HZ[k];
      const hx = k === 'vase' ? HM.vase.x - 45 : o.x, hy = k === 'vase' ? HM.vase.y - 60 : (k === 'alarm' ? HM.alarmY - 18 : o.y);
      if (p.x >= hx && p.x <= hx + o.w && p.y >= hy && p.y <= hy + o.h) {
        HM.bounce[k] = 1; HM.looked.add(k);
        if (o.hazard) {
          if (!HM.found.has(k)) {
            HM.found.add(k); Sound.tick();
            fx.burst(hx + o.w / 2, hy + o.h / 2, { count: 18, speed: 150, colors: ['#22c55e', '#facc15', '#fff'] });
            HM.msg = '👀 ' + o.msg; HM.msgCol = '#166534'; HM.msgT = S.t;
            SciSim.tween(o, { fix: 1 }, { duration: 1.1, ease: 'inOutCubic' });
          } else { HM.msg = '✔ 이미 고쳤어요! ' + o.msg; HM.msgCol = '#166534'; HM.msgT = S.t; }
        } else {
          HM.msg = '🙂 ' + o.name + ': ' + o.msg; HM.msgCol = '#0369a1'; HM.msgT = S.t; Sound.click();
        }
        return true;
      }
    }
    return false;
  }
  function homeStep(dt) {
    Object.keys(HM.bounce).forEach((k) => { HM.bounce[k] *= Math.exp(-5 * dt); });
    HM.vase.y = approach(HM.vase.y, HZ.vase.fix > 0.01 ? 380 : 170, dt, 5);
    HM.vase.x = approach(HM.vase.x, HZ.vase.fix > 0.01 ? 270 : 340, dt, 5);
    HM.alarmY = approach(HM.alarmY, HZ.alarm.fix > 0.01 ? 402 : 86, dt, 4);
    HM.led = approach(HM.led, HZ.alarm.fix > 0.5 ? 1 : 0, dt, 4);
    if (HZ.alarm.fix > 0.3 && !SciSim.reduceMotion) {
      HM.emit += dt * (HM.gasP.length < 36 ? 9 : 0);
      while (HM.emit >= 1) { HM.emit -= 1; HM.gasP.push({ x: 736 + Math.random() * 6, y: 336, vx: (Math.random() - 0.4) * 24, vy: 10, age: 0 }); }
    }
    HM.gasLayer = approach(HM.gasLayer, HZ.alarm.fix > 0.3 ? 1 : 0, dt, 0.7);
    for (let i = HM.gasP.length - 1; i >= 0; i--) {
      const q = HM.gasP[i]; q.age += dt; q.vy += 120 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.y > FLOOR - 4) { q.y = FLOOR - 4 - Math.random() * 14; q.vy = 0; q.vx = (Math.random() - 0.5) * 50; }
      q.x = clamp(q.x, 560, 780);
      if (q.age > 7) HM.gasP.splice(i, 1);
    }
  }
  const BOOKS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#14b8a6', '#f97316', '#ec4899'];
  function drawHome() {
    panelBG('#f6efe3');
    // 벽 · 바닥
    const g = ctx.createLinearGradient(0, 56, 0, FLOOR); g.addColorStop(0, '#fbf5ea'); g.addColorStop(1, '#f1e6d2'); ctx.fillStyle = g; ctx.fillRect(0, 56, 800, FLOOR - 56);
    const fg = ctx.createLinearGradient(0, FLOOR, 0, 540); fg.addColorStop(0, '#d9b98a'); fg.addColorStop(1, '#bf9a68'); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, 800, 540 - FLOOR);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(0, FLOOR, 800, 3);
    ctx.strokeStyle = 'rgba(120,80,30,.15)'; ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, FLOOR + i * 20); ctx.lineTo(800, FLOOR + i * 20); ctx.stroke(); }
    // 창문
    ctx.save(); D.shadow(() => { ctx.fillStyle = '#bfe3ff'; D.roundRect(228, 70, 130, 70, 8); ctx.fill(); }, { blur: 4, y: 1 });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; D.roundRect(228, 70, 130, 70, 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(293, 70); ctx.lineTo(293, 140); ctx.stroke(); ctx.restore();
    caption('집 안에서 지진·가스 사고 때 위험한 곳을 찾아보세요');
    // 책장
    {
      const o = HZ.shelf, sway = (1 - o.fix) * 0.03 * Math.sin(S.t * 1.8) + (HM.bounce.shelf || 0) * 0.04 * Math.sin(S.t * 30);
      ctx.save(); ctx.translate(o.x + o.w / 2, FLOOR); ctx.rotate(sway); ctx.translate(-o.w / 2, -o.h);
      D.shadow(() => { ctx.fillStyle = '#b07a45'; D.roundRect(0, 0, o.w, o.h, 6); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = '#e9d3b0'; ctx.fillRect(8, 8, o.w - 16, o.h - 16);
      for (let r = 0; r < 5; r++) {
        const yy = 8 + r * ((o.h - 16) / 5);
        ctx.fillStyle = '#b07a45'; ctx.fillRect(8, yy + (o.h - 16) / 5 - 5, o.w - 16, 5);
        let bx = 12; const rr = mkRng(r * 31 + 7);
        while (bx < o.w - 22) { const bw = 9 + rr() * 8, bh = 26 + rr() * 14; ctx.fillStyle = BOOKS[Math.floor(rr() * BOOKS.length)]; ctx.fillRect(bx, yy + (o.h - 16) / 5 - 5 - bh, bw, bh); bx += bw + 1.5; }
      }
      ctx.restore();
      if (o.fix > 0.02) {
        ctx.save(); ctx.globalAlpha = o.fix; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        [[o.x + 6, o.y + 4], [o.x + o.w - 6, o.y + 4]].forEach(([bx, by]) => { ctx.beginPath(); ctx.moveTo(bx, by - 14); ctx.lineTo(bx, by + 2); ctx.lineTo(bx + (bx < o.x + 60 ? -14 : 14), by + 2); ctx.stroke(); });
        ctx.restore();
      }
    }
    // 높은 벽 선반 + 낮은 선반
    ctx.fillStyle = '#9a6b3a'; D.roundRect(214, 170, 160, 9, 3); ctx.fill(); D.roundRect(214, 380, 160, 9, 3); ctx.fill();
    ctx.fillStyle = '#7c5628'; ctx.fillRect(228, 179, 6, 12); ctx.fillRect(354, 179, 6, 12); ctx.fillRect(228, 389, 6, 12); ctx.fillRect(354, 389, 6, 12);
    // 낮은 선반 상자 (안전)
    { const bo = HM.bounce.box || 0; D.shadow(() => { ctx.fillStyle = '#e8c48a'; D.roundRect(228, 346 - bo * 6, 58, 34, 4); ctx.fill(); }, { blur: 4, y: 2 }); ctx.fillStyle = '#d1a665'; ctx.fillRect(228, 360 - bo * 6, 58, 4); ctx.fillStyle = '#c9a0dc'; D.roundRect(292, 356 - bo * 6, 36, 24, 4); ctx.fill(); }
    // 화분(무거운 물건)
    {
      const o = HZ.vase, vx = HM.vase.x, vy = HM.vase.y + (HM.bounce.vase || 0) * Math.sin(S.t * 30) * 2;
      const wob = (1 - o.fix) * (0.06 + 0.04 * Math.sin(S.t * 2.4));
      ctx.save(); ctx.translate(vx, vy); ctx.rotate(wob); ctx.translate(-vx, -vy);
      D.shadow(() => { ctx.fillStyle = '#c2410c'; ctx.beginPath(); ctx.moveTo(vx - 30, vy - 42); ctx.lineTo(vx + 30, vy - 42); ctx.lineTo(vx + 22, vy); ctx.lineTo(vx - 22, vy); ctx.closePath(); ctx.fill(); }, { blur: 6, y: 3 });
      ctx.fillStyle = '#9a3412'; ctx.fillRect(vx - 33, vy - 48, 66, 9);
      ctx.fillStyle = '#16a34a'; [[-18, -62, 22], [4, -78, 26], [20, -60, 20]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.ellipse(vx + dx, vy + dy, r * 0.6, r, dx * 0.03, 0, TAU); ctx.fill(); });
      ctx.restore();
      pill(vx, vy + 14 + (o.fix > 0.5 ? 18 : 0), '무거워요 10 kg', { bg: 'rgba(30,41,59,.82)', color: '#fff', border: null, size: 12.5 });
    }
    // 장롱 (안전: 고정)
    {
      const o = HZ.wardrobe, bo = HM.bounce.wardrobe || 0;
      D.shadow(() => { ctx.fillStyle = '#a3855f'; D.roundRect(o.x, o.y - bo * 4, o.w, o.h, 6); ctx.fill(); }, { blur: 8, y: 3 });
      ctx.fillStyle = '#b89870'; D.roundRect(o.x + 6, o.y + 6 - bo * 4, o.w / 2 - 8, o.h - 12, 4); ctx.fill(); D.roundRect(o.x + o.w / 2 + 2, o.y + 6 - bo * 4, o.w / 2 - 8, o.h - 12, 4); ctx.fill();
      ctx.fillStyle = '#6b5233'; ctx.fillRect(o.x + o.w / 2 - 8, o.y + o.h / 2 - 10, 4, 20); ctx.fillRect(o.x + o.w / 2 + 4, o.y + o.h / 2 - 10, 4, 20);
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(o.x + o.w - 6, o.y - 12); ctx.lineTo(o.x + o.w - 6, o.y + 2); ctx.lineTo(o.x + o.w + 10, o.y + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o.x + 6, o.y - 12); ctx.lineTo(o.x + 6, o.y + 2); ctx.lineTo(o.x - 10, o.y + 2); ctx.stroke();
    }
    // 소화기 (안전)
    { const o = HZ.ext, bo = HM.bounce.ext || 0; D.shadow(() => { ctx.fillStyle = '#dc2626'; D.roundRect(o.x, o.y - bo * 5, o.w, o.h, 9); ctx.fill(); }, { blur: 4, y: 2 }); ctx.fillStyle = '#1e293b'; ctx.fillRect(o.x + 8, o.y - 8 - bo * 5, 18, 10); ctx.fillStyle = '#fff'; ctx.fillRect(o.x + 6, o.y + 22 - bo * 5, 22, 14); }
    // 주방 + LPG
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#e2e8f0'; D.roundRect(578, 330, 150, 100, 5); ctx.fill(); }, { blur: 6, y: 2 });
    ctx.fillStyle = '#94a3b8'; ctx.fillRect(572, 322, 162, 12);
    ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.ellipse(612, 318, 22, 6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(676, 318, 22, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#64748b'; D.roundRect(594, 292, 38, 26, 4); ctx.fill(); ctx.fillStyle = '#475569'; ctx.fillRect(590, 290, 46, 5);
    ctx.restore();
    ctx.save();
    D.shadow(() => { const gg = ctx.createLinearGradient(716, 0, 760, 0); gg.addColorStop(0, '#93a8c6'); gg.addColorStop(0.5, '#cbd5e1'); gg.addColorStop(1, '#7b8ba3'); ctx.fillStyle = gg; D.roundRect(716, 332, 44, 98, 14); ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#475569'; ctx.fillRect(732, 322, 12, 12); ctx.restore();
    D.text(738, 392, 'LPG', { size: 14, weight: 800, color: '#1e293b' });
    pill(738, 452, 'LPG 가스통', { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', size: 12.5 });
    // 바닥에 고이는 LPG
    if (HM.gasLayer > 0.02) {
      const gl = ctx.createLinearGradient(0, FLOOR - 32, 0, FLOOR); gl.addColorStop(0, 'rgba(250,204,21,0)'); gl.addColorStop(1, 'rgba(250,204,21,' + 0.5 * HM.gasLayer + ')');
      ctx.fillStyle = gl; ctx.fillRect(560, FLOOR - 32, 230, 32);
      HM.gasP.forEach((q) => { ctx.fillStyle = 'rgba(234,179,8,' + (0.7 * HM.gasLayer) + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, 3.2, 0, TAU); ctx.fill(); });
      if (HM.gasLayer > 0.4) pill(676, 270, '무거운 가스는 바닥에 고여요 ↓', { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 12.5 });
    }
    // 가스 경보기
    {
      const o = HZ.alarm, ay = HM.alarmY, bo = HM.bounce.alarm || 0;
      const ax = lerp(o.x, 672, sstep(0.0, 1, HZ.alarm.fix));
      D.shadow(() => { ctx.fillStyle = '#f8fafc'; D.roundRect(ax, ay - 16 + bo * 3, 56, 32, 8); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; D.roundRect(ax, ay - 16 + bo * 3, 56, 32, 8); ctx.stroke();
      ctx.fillStyle = HM.led > 0.5 ? '#22c55e' : '#ef4444'; ctx.beginPath(); ctx.arc(ax + 12, ay + bo * 3, 5 + (HM.led > 0.5 ? 1.5 * Math.sin(S.t * 6) : 0), 0, TAU); ctx.fill();
      D.text(ax + 36, ay + 5 + bo * 3, '경보기', { size: 12, weight: 800, color: '#334155' });
      if (HZ.alarm.fix < 0.05) { ctx.strokeStyle = 'rgba(100,116,139,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax + 28, ay - 16); ctx.lineTo(ax + 28, 56); ctx.stroke(); }
    }
    // 찾은 표시
    Object.keys(HZ).forEach((k) => {
      const o = HZ[k]; if (!o.hazard || !HM.found.has(k)) return;
      const cx = k === 'vase' ? HM.vase.x : k === 'alarm' ? lerp(o.x, 672, sstep(0, 1, o.fix)) + 28 : o.x + o.w / 2;
      const cy = k === 'vase' ? HM.vase.y - 90 : k === 'alarm' ? HM.alarmY - 40 : o.y - 16;
      D.check(cx, cy, 15 * SciSim.ease.outBack(Math.min(1, o.fix * 3)), Math.min(1, o.fix * 2.5));
    });
    // 안내 줄
    const age = S.t - HM.msgT;
    if (HM.msg && age < 9) {
      ctx.save(); ctx.globalAlpha = 1 - sstep(7.5, 9, age);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = HM.msgCol; ctx.lineWidth = 2; D.roundRect(16, 480, 768, 44, 14); ctx.fill(); ctx.stroke();
      textBox(400, 502, 740, HM.msg, 14.5, { vcenter: true, color: HM.msgCol, weight: 800 });
      ctx.restore();
    } else pill(400, 502, '👆 이곳저곳을 눌러서 확인해요  (찾은 위험 ' + HM.found.size + ' / 3)', { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 14 });
    if (isNew('home')) newTag();
  }

  /* =========================================================
     ① 비상 가방 꾸리기
     ========================================================= */
  const BAGDEF = [
    { id: 'lap', icon: '💻', name: '노트북', kg: 2.0, tip: '무겁고 대피에 꼭 필요하지는 않아요.' },
    { id: 'water', icon: '💧', name: '물', kg: 2.0, ess: '마실 물', tip: '마실 물이 없으면 오래 버티기 어려워요.' },
    { id: 'game', icon: '🎮', name: '게임기', kg: 1.0, tip: '재미있지만 대피에는 필요하지 않아요.' },
    { id: 'food', icon: '🥫', name: '비상식량', kg: 1.0, ess: '비상식량', tip: '바로 먹을 수 있는 음식이 필요해요.' },
    { id: 'light', icon: '🔦', name: '손전등', kg: 0.3, ess: '손전등', tip: '정전되어 어두울 때 길을 밝혀요.' },
    { id: 'comic', icon: '📚', name: '만화책 묶음', kg: 1.5, tip: '무거워서 가방 무게를 크게 늘려요.' },
    { id: 'radio', icon: '📻', name: '라디오', kg: 0.4, ess: '라디오', tip: '전기·통신이 끊겨도 소식을 들어요.' },
    { id: 'med', icon: '🩹', name: '구급약', kg: 0.5, ess: '구급약', tip: '작은 상처나 먹는 약을 챙겨요.' },
    { id: 'doll', icon: '🧸', name: '인형', kg: 0.5, tip: '마음은 위로되지만 필수품은 아니에요.' },
    { id: 'mask', icon: '😷', name: '마스크', kg: 0.1, ess: '마스크', tip: '먼지와 연기에서 코와 입을 지켜요.' },
    { id: 'batt', icon: '🔋', name: '보조 배터리', kg: 0.3, ess: '보조 배터리', tip: '휴대 전화를 충전해 연락할 수 있어요.' },
    { id: 'whis', icon: '📣', name: '호루라기', kg: 0.05, ess: '호루라기', tip: '갇혔을 때 소리로 위치를 알려요.' },
  ];
  const BAG_LIMIT = 6.0;
  const TRAYW = 120, TRAYH = 88, CHW = 62, CHH = 54;
  const BG = { items: [], sel: null, bagShake: 0, wA: 0, tip: '', order: [] };
  BAGDEF.forEach((d, i) => {
    const px = 18 + (i % 4) * 130, py = 86 + Math.floor(i / 4) * 100;
    BG.items.push(Object.assign({}, d, { px, py, x: px, y: py, w: TRAYW, h: TRAYH, inb: false, lift: 0, drag: false, tw: null, shake: 0 }));
  });
  BG.z = BG.items.slice();
  const BAGBOX = { x: 548, y: 64, w: 236, h: 340 };
  const bagWeight = () => BG.items.reduce((s, c) => s + (c.inb ? c.kg : 0), 0);
  function bagSlot(c) {
    const i = BG.order.indexOf(c);
    return { x: BAGBOX.x + 20 + (i % 3) * 68, y: BAGBOX.y + 96 + Math.floor(i / 3) * 62 };
  }
  function bagLayout() {
    BG.items.forEach((c) => {
      if (c.drag) return;
      if (c.inb) { const s = bagSlot(c); flyTo(c, s.x, s.y, CHW, CHH); } else flyTo(c, c.px, c.py, TRAYW, TRAYH);
    });
  }
  function bagSet(c, inb) {
    if (c.inb === inb) return;
    c.inb = inb;
    if (inb) { BG.order.push(c); if (bagWeight() > BAG_LIMIT + 1e-6) { BG.bagShake = 1; Sound.fail && Sound.fail(); } else Sound.tick(); }
    else { BG.order.splice(BG.order.indexOf(c), 1); Sound.tick(); }
    bagLayout();
  }
  function bagReset() { BG.items.forEach((c) => { c.inb = false; c.drag = false; }); BG.order.length = 0; BG.sel = null; bagLayout(); }
  function bagStep(dt) {
    BG.items.forEach((c) => { c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 16); c.shake *= Math.exp(-4 * dt); });
    BG.bagShake *= Math.exp(-4 * dt);
    BG.wA = approach(BG.wA, bagWeight(), dt, 8);
  }
  function drawBag() {
    panelBG('#f1f5f9');
    caption('가방은 6 kg까지! 꼭 필요한 물건을 골라 담아요');
    // 보관 구역
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.7)'; D.roundRect(8, 56, 532, 356, 18); ctx.fill(); ctx.restore();
    D.text(22, 78, '집에 있는 물건', { size: 14, weight: 800, color: '#475569', align: 'left' });
    // 가방
    const sh = Math.sin(S.t * 50) * 6 * BG.bagShake;
    const B = BAGBOX, over = bagWeight() > BAG_LIMIT + 1e-6;
    ctx.save(); ctx.translate(sh, 0);
    D.shadow(() => {
      const gr = ctx.createLinearGradient(B.x, 0, B.x + B.w, 0); gr.addColorStop(0, '#2563eb'); gr.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = gr; D.roundRect(B.x, B.y + 24, B.w, B.h - 24, 34); ctx.fill();
    }, { blur: 14, y: 6 });
    ctx.fillStyle = '#1e3a8a'; D.roundRect(B.x + 70, B.y + 2, B.w - 140, 40, 18); ctx.fill();
    ctx.fillStyle = '#eff6ff'; D.roundRect(B.x + 14, B.y + 78, B.w - 28, B.h - 100, 22); ctx.fill();
    ctx.strokeStyle = over ? '#ef4444' : '#93c5fd'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); D.roundRect(B.x + 14, B.y + 78, B.w - 28, B.h - 100, 22); ctx.stroke(); ctx.setLineDash([]);
    D.text(B.x + B.w / 2, B.y + 62, '🎒 비상 가방', { size: 15, weight: 800, color: '#fff' });
    ctx.restore();
    // 무게 게이지
    const gx = 548, gy = 426, gw = 236, gh = 26;
    ctx.save(); ctx.fillStyle = '#e2e8f0'; D.roundRect(gx, gy, gw, gh, 13); ctx.fill();
    const w = clamp(BG.wA / (BAG_LIMIT * 1.25), 0, 1);
    ctx.beginPath(); D.roundRect(gx, gy, gw, gh, 13); ctx.clip();
    const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0); gg.addColorStop(0, '#22c55e'); gg.addColorStop(0.8, '#facc15'); gg.addColorStop(1, '#ef4444');
    ctx.fillStyle = over ? '#ef4444' : gg; ctx.fillRect(gx, gy, gw * w, gh);
    ctx.restore();
    const lx = gx + gw / 1.25;
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(lx, gy - 6); ctx.lineTo(lx, gy + gh + 6); ctx.stroke();
    D.text(lx, gy - 10, '6 kg', { size: 13, weight: 800, color: '#1e293b' });
    D.text(gx + gw / 2, gy + gh + 22, '지금 무게 ' + bagWeight().toFixed(2).replace(/\.?0+$/, '') + ' kg' + (over ? '  — 너무 무거워요!' : ''), { size: 14.5, weight: 800, color: over ? '#b91c1c' : '#334155' });
    // 설명 줄
    ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5; D.roundRect(8, 420, 532, 56, 14); ctx.fill(); ctx.stroke(); ctx.restore();
    if (BG.sel) {
      const c = BG.sel; D.text(22, 444, c.icon + ' ' + c.name + ' (' + c.kg + ' kg)', { size: 14.5, weight: 800, color: '#1e293b', align: 'left' });
      textBox(22, 465, 510, c.tip, 13.5, { align: 'left', color: '#475569' });
    } else D.text(274, 452, '👆 물건을 누르면 설명이 나와요', { size: 14.5, weight: 700, color: '#64748b' });
    // 아이템
    BG.z.forEach((c) => { if (!c.drag) drawBagItem(c); });
    BG.z.forEach((c) => { if (c.drag) drawBagItem(c); });
    if (isNew('bag')) newTag();
  }
  function drawBagItem(c) {
    const chip = c.w < 92;
    const sx = c.shake > 0.02 ? Math.sin(S.t * 55) * 5 * c.shake : 0;
    const L = c.lift;
    const x = c.x + sx - L * 3, y = c.y - 5 * L;
    if (chip) {
      D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(x, y, c.w, c.h, 14); ctx.fill(); }, { blur: 4 + 10 * L, y: 2, color: 'rgba(30,41,59,.25)' });
      ctx.strokeStyle = c.ess ? '#22c55e' : '#f59e0b'; ctx.lineWidth = 2; D.roundRect(x, y, c.w, c.h, 14); ctx.stroke();
      ctx.font = '27px ' + 'system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.icon, x + c.w / 2, y + c.h / 2 + 1);
    } else {
      drawCardShape(x, y, c.w, c.h, { lift: L, stroke: BG.sel === c ? '#1e293b' : '#94a3b8', lw: BG.sel === c ? 3.5 : 2 });
      ctx.font = '30px system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.icon, x + c.w / 2, y + 28);
      D.text(x + c.w / 2, y + 60, c.name, { size: 13.5, weight: 800, color: '#1b2333' });
      D.text(x + c.w / 2, y + 78, c.kg + ' kg', { size: 12.5, weight: 700, color: '#64748b' });
    }
  }
  function bagCheck() {
    const miss = BG.items.filter((c) => c.ess && !c.inb);
    if (miss.length) { return '아직 빠진 필수품이 있어요: <b>' + miss.slice(0, 3).map((c) => c.ess).join(', ') + (miss.length > 3 ? ' 외' : '') + '</b>. 물건을 눌러 설명을 읽어 보세요.'; }
    if (bagWeight() > BAG_LIMIT + 1e-6) {
      const heavy = BG.items.filter((c) => c.inb && !c.ess).sort((a, b) => b.kg - a.kg)[0];
      return '가방이 <b>' + bagWeight().toFixed(1) + ' kg</b>로 너무 무거워요. 꼭 필요하지 않은 물건' + (heavy ? '(예: ' + heavy.name + ')' : '') + '을 빼 보세요.';
    }
    return true;
  }

  /* =========================================================
     ② 복도 화재 — 연기는 천장부터 채워요
     ========================================================= */
  const CEIL = 140, FL = 430, EXITX = 722, STARTX = 236, VS = 200;
  const FR = { posture: 0, towel: false, st: 'idle', t: 0, x: STARTX, ph: 0, cS: 0, exp: 0, expA: 0, parts: [], emit: 0, triedStand: false, lowOK: false, lastMsg: '', result: '', idleT: 0, shake: 0, expMax: 0, smokeT: 0 };
  const smokeTh = (t) => clamp(30 + 28 * t, 0, 205);
  const smokeAt = (x, t) => { const tl = t - (x - 170) / VS; return tl < 0 ? 0 : smokeTh(tl); };
  function fireReset() { FR.st = 'idle'; FR.t = 0; FR.x = STARTX; FR.exp = 0; FR.expA = 0; FR.expMax = 0; FR.result = ''; FR.lastMsg = ''; FR.parts.length = 0; FR.idleT = 0; }
  function fireGo() {
    if (FR.st === 'running') return;
    fireReset(); FR.st = 'running'; FR.smokeT = 0; Sound.tick();
  }
  function setPosture(low) {
    if (FR.st === 'running') return;
    FR.posture = low ? 1 : 0;
    $('#pStand').setAttribute('aria-pressed', !low); $('#pLow').setAttribute('aria-pressed', low);
  }
  function setTowel(v) { if (FR.st === 'running') return; FR.towel = v; $('#tgTowel').setAttribute('aria-pressed', v); }
  function fireStep(dt) {
    FR.cS = approach(FR.cS, FR.posture, dt, 9);
    FR.expA = approach(FR.expA, FR.exp, dt, 8);
    FR.shake *= Math.exp(-4 * dt);
    let st = FR.st === 'running' ? FR.t : FR.idleT;
    if (FR.st === 'running') {
      FR.t += dt; FR.smokeT = FR.t;
      const sp = FR.posture ? 38 : 50;
      FR.x += sp * dt; FR.ph += dt * (FR.posture ? 8 : 10);
      const headY = FL - (FR.posture ? 62 : 122);
      const inSmoke = headY < CEIL + smokeAt(FR.x, FR.t);
      if (inSmoke) { FR.exp += dt * 45 * (FR.towel ? 0.5 : 1); FR.shake = Math.max(FR.shake, 0.4); }
      FR.expMax = Math.max(FR.expMax, FR.exp);
      if (FR.exp >= 100) { FR.st = 'fail'; FR.result = 'smoke'; FR.lastMsg = '연기를 너무 많이 마셔서 더 갈 수 없었어요. 연기는 위쪽부터 차오르니 낮은 자세로 다시 도전해요!'; Sound.fail && Sound.fail(); if (!FR.posture) FR.triedStand = true; }
      else if (FR.x >= EXITX) {
        FR.st = 'ok'; FR.result = 'ok';
        if (!FR.posture) { FR.triedStand = true; FR.lastMsg = '서서도 비상구에 닿았지만 연기를 ' + Math.round(FR.exp) + '만큼 마셨어요. 낮은 자세가 훨씬 안전해요.'; }
        else { if (FR.exp < 30) FR.lowOK = true; FR.lastMsg = '안전하게 대피했어요! 연기를 거의 마시지 않았어요.'; fx.burst(EXITX, 330, { count: 26, speed: 190 }); }
      }
    } else { FR.idleT = (FR.idleT + dt * 0.6) % 3; }
    // 연기 입자 (뜨거운 연기는 위로)
    if (!SciSim.reduceMotion && (FR.st === 'running' || FR.st === 'idle' || FR.st === 'ok' || FR.st === 'fail') && FR.parts.length < 150) {
      FR.emit += dt * (FR.st === 'running' ? 40 : 14);
      while (FR.emit >= 1) { FR.emit -= 1; FR.parts.push({ x: 120 + Math.random() * 40, y: 390 + Math.random() * 20, vx: 10 + Math.random() * 30, vy: -80 - Math.random() * 40, age: 0, life: 4 + Math.random() * 2, s: 14 + Math.random() * 8 }); }
    }
    for (let i = FR.parts.length - 1; i >= 0; i--) {
      const p = FR.parts[i]; p.age += dt;
      if (p.age > p.life) { FR.parts.splice(i, 1); continue; }
      if (p.y < CEIL + 14) { p.y = CEIL + 14; p.vy = 0; p.vx = 70 + Math.random() * 40; } else { p.vy = Math.max(p.vy, -110); }
      p.x += p.vx * dt; p.y += p.vy * dt; p.s += 5 * dt;
      if (p.x > 790) FR.parts.splice(i, 1);
    }
  }
  function drawFire() {
    panelBG('#e8edf3');
    const smokeT = FR.st === 'running' || FR.st === 'ok' || FR.st === 'fail' ? FR.smokeT : FR.idleT;
    // 복도 단면
    ctx.fillStyle = '#d6dde6'; ctx.fillRect(0, 56, 800, CEIL - 56);
    const wg = ctx.createLinearGradient(0, CEIL, 0, FL); wg.addColorStop(0, '#f4f1ea'); wg.addColorStop(1, '#e8e3d8'); ctx.fillStyle = wg; ctx.fillRect(0, CEIL, 800, FL - CEIL);
    const fg = ctx.createLinearGradient(0, FL, 0, 540); fg.addColorStop(0, '#8d98a6'); fg.addColorStop(1, '#6b7684'); ctx.fillStyle = fg; ctx.fillRect(0, FL, 800, 540 - FL);
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(0, FL, 800, 3);
    caption('뜨거운 연기는 가벼워서 위쪽(천장)부터 차올라요');
    // 불이 난 방
    ctx.fillStyle = '#4b5563'; ctx.fillRect(0, CEIL, 170, FL - CEIL);
    const rg = ctx.createRadialGradient(100, 400, 10, 100, 380, 160); rg.addColorStop(0, 'rgba(255,160,60,.55)'); rg.addColorStop(1, 'rgba(255,100,30,0)'); ctx.fillStyle = rg; ctx.fillRect(0, CEIL, 220, FL - CEIL);
    D.flame(90, FL - 10, 78, S.t); D.flame(128, FL - 10, 52, S.t + 1.3); D.flame(60, FL - 10, 46, S.t + 2.1);
    pill(86, FL + 30, '🔥 불이 난 방', { bg: '#7f1d1d', color: '#fff', border: null, size: 13 });
    // 엘리베이터(사용 금지)
    ctx.save();
    ctx.fillStyle = '#9ca3af'; D.roundRect(468, 220, 86, 210, 6); ctx.fill(); ctx.fillStyle = '#cbd5e1'; ctx.fillRect(474, 226, 34, 198); ctx.fillRect(514, 226, 34, 198);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(511, 190, 20, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(500, 179); ctx.lineTo(522, 201); ctx.moveTo(522, 179); ctx.lineTo(500, 201); ctx.stroke();
    ctx.restore();
    pill(511, 452, '엘리베이터 사용 금지', { bg: '#fff', color: '#b91c1c', border: '#fca5a5', size: 12.5 });
    // 비상구(계단)
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#16a34a'; D.roundRect(EXITX - 6, 250, 78, 180, 8); ctx.fill(); }, { blur: 8, y: 2 });
    ctx.fillStyle = '#bbf7d0'; D.roundRect(EXITX + 4, 262, 58, 168, 6); ctx.fill();
    ctx.fillStyle = '#15803d'; ctx.font = '36px system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🪜', EXITX + 33, 345);
    ctx.restore();
    pill(EXITX + 33, 232, '비상구·계단', { bg: '#15803d', color: '#fff', border: null, size: 13 });
    D.dashedLine(STARTX + 24, FL - 4, EXITX - 10, FL - 4, { color: 'rgba(22,163,74,.7)', width: 3, dash: [10, 8], offset: S.t * 20 });
    // 연기층 (천장부터)
    ctx.save();
    ctx.beginPath(); ctx.rect(170, CEIL, 630, FL - CEIL); ctx.clip();
    ctx.beginPath(); ctx.moveTo(170, CEIL);
    for (let x = 170; x <= 800; x += 10) ctx.lineTo(x, CEIL + smokeAt(x, smokeT));
    ctx.lineTo(800, CEIL); ctx.closePath();
    const sg = ctx.createLinearGradient(0, CEIL, 0, CEIL + 215); sg.addColorStop(0, 'rgba(55,55,60,.92)'); sg.addColorStop(0.7, 'rgba(95,95,100,.6)'); sg.addColorStop(1, 'rgba(130,130,135,.22)');
    ctx.fillStyle = sg; ctx.fill();
    ctx.restore();
    FR.parts.forEach((p) => {
      const a = (1 - p.age / p.life) * 0.28;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s); g.addColorStop(0, 'rgba(70,70,75,' + a + ')'); g.addColorStop(1, 'rgba(70,70,75,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill();
    });
    // 층 표시
    ctx.save(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.fillStyle = 'rgba(255,255,255,.0)';
    ctx.beginPath(); ctx.moveTo(176, CEIL + 4); ctx.lineTo(176, 214); ctx.stroke(); ctx.restore();
    D.text(184, CEIL + 22, '위: 뜨거운 연기(밀도가 작아요)', { size: 13, weight: 800, color: '#fff', align: 'left', stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    D.text(184, FL - 14, '아래: 비교적 맑은 공기', { size: 13, weight: 800, color: '#334155', align: 'left' });
    // 사람
    const px = FR.x, c = FR.cS;
    const off = FR.st === 'fail' ? Math.sin(S.t * 30) * 2 * FR.shake : 0;
    drawPerson(px + off, FL, { c, ph: FR.ph, moving: FR.st === 'running', towel: FR.towel, cough: FR.st === 'fail' || (FR.st === 'running' && FR.exp > 20), shirt: '#2563eb', dir: 1 });
    // 흡입 게이지
    const gx = 560, gy = 70, gw = 224;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(gx - 12, gy - 14, gw + 24, 56, 12); ctx.fill();
    D.text(gx, gy + 4, '연기를 마신 정도', { size: 13.5, weight: 800, color: '#334155', align: 'left' });
    ctx.fillStyle = '#e2e8f0'; D.roundRect(gx, gy + 14, gw, 16, 8); ctx.fill();
    const ww = clamp(FR.expA / 100, 0, 1);
    ctx.beginPath(); D.roundRect(gx, gy + 14, gw, 16, 8); ctx.clip(); ctx.fillStyle = mixc('#22c55e', '#ef4444', ww); ctx.fillRect(gx, gy + 14, gw * ww, 16);
    ctx.restore();
    // 결과 메시지
    if (FR.lastMsg && (FR.st === 'ok' || FR.st === 'fail')) {
      ctx.save(); ctx.fillStyle = FR.st === 'ok' && FR.posture ? '#f0fdf4' : '#fff7ed'; ctx.strokeStyle = FR.st === 'ok' && FR.posture ? '#22c55e' : '#fb923c'; ctx.lineWidth = 2.5;
      D.roundRect(16, 478, 768, 46, 14); ctx.fill(); ctx.stroke(); ctx.restore();
      textBox(400, 501, 744, FR.lastMsg, 14.5, { vcenter: true, weight: 800, color: '#1e293b' });
    } else if (FR.st === 'idle') {
      pill(400, 502, '🧍 자세를 정하고 🏃 대피를 시작해 보세요', { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 14 });
    }
    if (isNew('fire')) newTag();
  }

  /* =========================================================
     지도 공통: 지형 그리기
     ========================================================= */
  function buildTerrainCanvas(fn, stops, contourN, extraFn) {
    const c = document.createElement('canvas'); c.width = 800; c.height = 540;
    const g = c.getContext('2d');
    const img = g.createImageData(800, 540), d = img.data;
    const colAt = (h) => { for (let s = 1; s < stops.length; s++) { if (h <= stops[s][0]) { const a = stops[s - 1], b = stops[s], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1); return [a[1][0] + (b[1][0] - a[1][0]) * t, a[1][1] + (b[1][1] - a[1][1]) * t, a[1][2] + (b[1][2] - a[1][2]) * t]; } } return stops[stops.length - 1][1]; };
    const H = new Float32Array(800 * 540);
    for (let y = 0; y < 540; y++) for (let x = 0; x < 800; x++) H[y * 800 + x] = fn(x, y);
    for (let y = 0; y < 540; y++) for (let x = 0; x < 800; x++) {
      const k = y * 800 + x, h = H[k];
      const hl = H[y * 800 + Math.max(0, x - 1)], hu = H[Math.max(0, y - 1) * 800 + x];
      const sh = clamp(((hl - h) + (hu - h)) * 18, -0.25, 0.25);
      const col = colAt(h);
      const band = Math.floor(h * contourN);
      const contour = band !== Math.floor(hl * contourN) || band !== Math.floor(hu * contourN);
      const f = contour ? 0.86 : 1 + sh, o = k * 4;
      d[o] = clamp(col[0] * f, 0, 255); d[o + 1] = clamp(col[1] * f, 0, 255); d[o + 2] = clamp(col[2] * f, 0, 255); d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    if (extraFn) extraFn(g);
    return c;
  }
  const TSTOPS = [[0, [188, 224, 170]], [0.38, [214, 232, 176]], [0.55, [236, 232, 176]], [0.8, [214, 188, 140]], [1.1, [176, 142, 104]]];

  /* =========================================================
     ② 유독 가스 대피 지도
     ========================================================= */
  const GW = 40, GH = 27, GC = 20;
  const EFAC = { x: 400, y: 276 };
  const EHOME = { x: 300, y: 380 };
  const EW = { dx: 1, dy: 0 };
  function terrE(x, y) {
    const gs = (cx, cy, sg, a) => a * Math.exp(-((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (2 * sg * sg));
    const yr = 480 + 10 * Math.sin(x / 100);
    const val = 0.3 * Math.exp(-((y - yr) * (y - yr)) / (2 * 55 * 55));
    return clamp(0.45 - 0.30 * (y - 270) / 270 + gs(150, 130, 90, 0.6) + gs(660, 150, 90, 0.4) + gs(700, 470, 60, 0.0) - val, 0, 1.2);
  }
  const ESH = [
    { id: 'n', name: '서쪽 언덕 위 학교', x: 160, y: 150, tag: '높은 곳 · 바람이 불어오는 쪽', ok: true },
    { id: 's', name: '남쪽 강가 체육관', x: 470, y: 420, tag: '낮은 곳 · 바람의 옆 방향' },
    { id: 'h', name: '동쪽 언덕 전망대', x: 620, y: 240, tag: '높은 곳 · 바람이 불어가는 쪽' },
    { id: 'l', name: '동쪽 강가 마을회관', x: 660, y: 430, tag: '낮은 곳 · 바람이 불어가는 쪽' },
  ];
  const EV = { grid: null, h: null, gx: null, gy: null, c: null, c2: null, t: 0, st: 'idle', sel: null, selA: {}, pos: { x: EHOME.x, y: EHOME.y }, exp: 0, expA: 0, peaks: {}, shPeak: 0, result: '', msg: '', safe: false, tries: 0, parts: [], emit: 0, terr: null, shake: {}, path: null, dist: 0 };
  const E_WSPD = 40, E_K = 9000, E_LEAK = 8, E_END = 20, E_Q = 70, E_DIFF = 0.35, E_SP = 62;
  function initGasGrid() {
    EV.h = new Float32Array(GW * GH); EV.gx = new Float32Array(GW * GH); EV.gy = new Float32Array(GW * GH); EV.c = new Float32Array(GW * GH); EV.c2 = new Float32Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) EV.h[j * GW + i] = terrE(i * GC + GC / 2, j * GC + GC / 2);
    const hh = (a, b) => EV.h[clamp(b, 0, GH - 1) * GW + clamp(a, 0, GW - 1)];
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { EV.gx[j * GW + i] = (hh(i + 1, j) - hh(i - 1, j)) / (2 * GC); EV.gy[j * GW + i] = (hh(i, j + 1) - hh(i, j - 1)) / (2 * GC); }
    ESH.forEach((s) => { EV.selA[s.id] = 0; EV.shake[s.id] = 0; EV.peaks[s.id] = 0; });
  }
  initGasGrid();
  function gSample(arr, x, y) {
    const fx_ = clamp(x / GC - 0.5, 0, GW - 1.001), fy_ = clamp(y / GC - 0.5, 0, GH - 1.001);
    const i = Math.floor(fx_), j = Math.floor(fy_), a = fx_ - i, b = fy_ - j;
    return arr[j * GW + i] * (1 - a) * (1 - b) + arr[j * GW + i + 1] * a * (1 - b) + arr[(j + 1) * GW + i] * (1 - a) * b + arr[(j + 1) * GW + i + 1] * a * b;
  }
  const _ev = [0, 0];
  function gVel(x, y, out) { out[0] = EW.dx * E_WSPD - E_K * gSample(EV.gx, x, y); out[1] = EW.dy * E_WSPD - E_K * gSample(EV.gy, x, y); return out; }
  function evPhys(dt) {
    const c = EV.c, o = EV.c2;
    const fi = Math.floor(EFAC.x / GC), fj = Math.floor(EFAC.y / GC);
    if (EV.t < E_LEAK) { c[fj * GW + fi] += E_Q * dt; c[fj * GW + fi + 1] += E_Q * dt * 0.5; c[(fj + 1) * GW + fi] += E_Q * dt * 0.5; }
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const x = i * GC + GC / 2, y = j * GC + GC / 2; gVel(x, y, _ev); o[j * GW + i] = gSample(c, x - _ev[0] * dt, y - _ev[1] * dt); }
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const k = j * GW + i;
      const l = i > 0 ? o[k - 1] : o[k], r = i < GW - 1 ? o[k + 1] : o[k], u = j > 0 ? o[k - GW] : o[k], d = j < GH - 1 ? o[k + GW] : o[k];
      c[k] = Math.max(0, (o[k] + E_DIFF * dt * (l + r + u + d - 4 * o[k])) * (1 - 0.03 * dt));
    }
    EV.t += dt;
  }
  const E_HI = 0.6, E_MID = 0.2;
  function evPath(sel) {
    // 집 → 대피 장소: 직선 경로
    const s = ESH.find((q) => q.id === sel); const dx = s.x - EHOME.x, dy = s.y - EHOME.y; const L = Math.hypot(dx, dy);
    return { x1: EHOME.x, y1: EHOME.y, dx: dx / L, dy: dy / L, L };
  }
  function evacReset() {
    EV.c.fill(0); EV.c2.fill(0); EV.t = 0; EV.st = 'idle'; EV.pos.x = EHOME.x; EV.pos.y = EHOME.y; EV.exp = 0; EV.expA = 0; EV.result = ''; EV.msg = ''; EV.parts.length = 0; EV.dist = 0; EV.path = null;
    ESH.forEach((s) => { EV.peaks[s.id] = 0; });
    EV.shPeak = 0; EV.safe = false;
  }
  function evacGo() {
    if (EV.st === 'run') return;
    if (!EV.sel) { toastOnce('먼저 지도에서 대피 장소를 눌러 골라요.'); return; }
    evacReset(); EV.st = 'run'; EV.path = evPath(EV.sel); EV.tries++; Sound.tick();
  }
  function evacStep(dt) {
    ESH.forEach((s) => { EV.selA[s.id] = approach(EV.selA[s.id], EV.sel === s.id ? 1 : 0, dt, 12); EV.shake[s.id] *= Math.exp(-4 * dt); });
    EV.expA = approach(EV.expA, EV.exp, dt, 8);
    if (EV.st === 'run' || EV.st === 'done') {
      let rem = dt, g = 0;
      while (rem > 1e-6 && g++ < 6) {
        const d = Math.min(0.05, rem); rem -= d;
        evPhys(d);
        if (EV.st === 'run') {
          const P = EV.path;
          if (EV.dist < P.L) { EV.dist = Math.min(P.L, EV.dist + E_SP * d); EV.pos.x = P.x1 + P.dx * EV.dist; EV.pos.y = P.y1 + P.dy * EV.dist; }
          const cc = gSample(EV.c, EV.pos.x, EV.pos.y);
          if (cc > 0.12) EV.exp += cc * 28 * d;
        }
        // 대피 장소 농도(도착 뒤)
        const s = ESH.find((q) => q.id === EV.sel);
        if (EV.dist >= EV.path.L) EV.shPeak = Math.max(EV.shPeak, gSample(EV.c, s.x, s.y));
        ESH.forEach((q) => { EV.peaks[q.id] = Math.max(EV.peaks[q.id], gSample(EV.c, q.x, q.y)); });
      }
      if (EV.st === 'run' && EV.t >= E_END) {
        EV.st = 'done';
        const s = ESH.find((q) => q.id === EV.sel);
        const exposed = EV.exp > 6, bad = EV.shPeak >= E_MID;
        EV.safe = !exposed && !bad;
        if (EV.safe) { EV.result = 'ok'; EV.msg = '안전해요! 높은 곳에서, 가스가 오는 방향의 반대쪽으로 피했어요.'; fx.burst(s.x, s.y, { count: 28, speed: 200 }); Sound.tick(); }
        else if (exposed && !bad) { EV.result = 'path'; EV.msg = '가는 길에 가스를 많이 만났어요. 유출 지점 가까이나 가스가 퍼지는 쪽은 피해야 해요.'; }
        else { EV.result = 'bad'; EV.msg = s.tag.indexOf('낮은') >= 0 ? '이곳은 낮은 곳이라 무거운 가스가 흘러와 고였어요. 높은 곳을 골라 봐요.' : '높아도 바람이 불어가는 쪽이라 가스가 닿았어요. 바람이 불어오는 쪽을 골라 봐요.'; }
      }
    }
    // 연기(시각 효과)
    if ((EV.st === 'run') && EV.t < E_LEAK && !SciSim.reduceMotion) {
      EV.emit += dt * 30;
      while (EV.emit >= 1) { EV.emit -= 1; EV.parts.push({ x: EFAC.x + (Math.random() - 0.5) * 14, y: EFAC.y + (Math.random() - 0.5) * 14, age: 0, life: 5 + Math.random() * 3, s: 8 + Math.random() * 6 }); }
    }
    for (let i = EV.parts.length - 1; i >= 0; i--) {
      const p = EV.parts[i]; p.age += dt; if (p.age > p.life) { EV.parts.splice(i, 1); continue; }
      gVel(p.x, p.y, _ev); p.x += (_ev[0] + (Math.random() - 0.5) * 16) * dt; p.y += (_ev[1] + (Math.random() - 0.5) * 16) * dt; p.s += 7 * dt;
    }
  }
  const gasImg = document.createElement('canvas'); gasImg.width = GW; gasImg.height = GH;
  const gasImgCtx = gasImg.getContext('2d'); const gasData = gasImgCtx.createImageData(GW, GH);
  function drawGasLayer(arr) {
    for (let k = 0; k < GW * GH; k++) {
      const v = arr[k], a = 0.86 * (1 - Math.exp(-4 * v)), t = clamp(v / 2, 0, 1), o = k * 4;
      gasData.data[o] = 250 - 20 * t; gasData.data[o + 1] = 215 - 175 * t; gasData.data[o + 2] = 40 - 10 * t; gasData.data[o + 3] = a * 255;
    }
    gasImgCtx.putImageData(gasData, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(gasImg, 0, 0, 800, 540); ctx.restore();
  }
  function drawEvac() {
    if (!EV.terr) EV.terr = buildTerrainCanvas(terrE, TSTOPS, 14, (g) => {
      g.strokeStyle = '#7fb8e6'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath();
      for (let x = -10; x <= 810; x += 8) { const yv = 480 + 10 * Math.sin(x / 100); x === -10 ? g.moveTo(x, yv) : g.lineTo(x, yv); }
      g.stroke(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.stroke();
    });
    ctx.drawImage(EV.terr, 0, 0, 800, 540);
    // 바람 줄무늬
    ctx.save(); ctx.strokeStyle = 'rgba(30,64,175,.22)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let k = 0; k < 14; k++) {
      const ph = ((S.t * 0.25 + k * 0.137) % 1), bx = (k * 211) % 800, by = (k * 97 + 60) % 540, off = ph * 120 - 60;
      ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.beginPath(); ctx.moveTo(bx + off, by); ctx.lineTo(bx + off + 40, by); ctx.stroke();
    }
    ctx.restore();
    drawGasLayer(EV.c);
    EV.parts.forEach((p) => {
      const a = (1 - p.age / p.life) * 0.35, g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
      g.addColorStop(0, 'rgba(180,150,30,' + a + ')'); g.addColorStop(1, 'rgba(180,150,30,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill();
    });
    // 경로
    if (EV.sel) {
      const P = evPath(EV.sel);
      D.dashedLine(EHOME.x, EHOME.y, EHOME.x + P.dx * P.L, EHOME.y + P.dy * P.L, { color: 'rgba(30,41,59,.55)', width: 3, dash: [8, 8], offset: S.t * 14 });
    }
    // 공장
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#64748b'; D.roundRect(EFAC.x - 24, EFAC.y - 18, 48, 30, 5); ctx.fill(); }, { blur: 6, y: 3 });
    ctx.fillStyle = '#475569'; ctx.fillRect(EFAC.x - 16, EFAC.y - 34, 9, 18); ctx.fillRect(EFAC.x + 4, EFAC.y - 28, 9, 12);
    ctx.fillStyle = '#fde68a'; ctx.fillRect(EFAC.x - 16, EFAC.y - 8, 8, 8); ctx.fillRect(EFAC.x - 3, EFAC.y - 8, 8, 8); ctx.fillRect(EFAC.x + 10, EFAC.y - 8, 8, 8);
    ctx.restore();
    pill(EFAC.x, EFAC.y - 48, '🏭 가스 유출', { bg: '#7f1d1d', color: '#fff', border: null, size: 13 });
    // 대피 장소
    ESH.forEach((s) => {
      const a = EV.selA[s.id], sh = Math.sin(S.t * 50) * 5 * EV.shake[s.id];
      ctx.save(); ctx.translate(s.x + sh, s.y);
      if (a > 0.02) { ctx.globalAlpha = a; ctx.fillStyle = 'rgba(37,99,235,.18)'; ctx.beginPath(); ctx.arc(0, 0, 34 + 4 * Math.sin(S.t * 5), 0, TAU); ctx.fill(); ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.5; ctx.stroke(); ctx.globalAlpha = 1; }
      D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(-22, -18, 44, 34, 8); ctx.fill(); }, { blur: 7, y: 3 });
      ctx.font = '22px system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText('🏫', 0, 0);
      ctx.restore();
      pill(s.x, s.y + 32, s.name, { bg: a > 0.5 ? '#2563eb' : '#fff', color: a > 0.5 ? '#fff' : '#1b2333', border: a > 0.5 ? null : '#94a3b8', size: 12.5 });
      if (EV.st === 'done' || (EV.st === 'run' && EV.t > 6)) {
        const lv = EV.peaks[s.id] >= E_HI ? 2 : EV.peaks[s.id] >= E_MID ? 1 : 0;
        if (EV.st === 'done') pill(s.x, s.y - 34, ['가스 거의 없음', '가스 닿음', '가스 진함'][lv], { bg: ['#16a34a', '#d97706', '#dc2626'][lv], color: '#fff', border: null, size: 12 });
      }
    });
    // 사람
    {
      const moving = EV.st === 'run' && EV.dist < (EV.path ? EV.path.L : 0);
      const px = EV.pos.x, py = EV.pos.y;
      ctx.save(); ctx.translate(px, py);
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.font = '19px system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(moving ? '🏃' : '🧍', 0, 1);
      ctx.restore();
      if (EV.st === 'idle') pill(px, py + 28, '나', { bg: '#2563eb', color: '#fff', border: null, size: 13 });
    }
    // 나침반·바람
    ctx.save(); ctx.translate(748, 76);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(0, 0, 36, 0, TAU); ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    D.text(0, -21, '북', { size: 12.5, weight: 800, color: '#475569' }); D.text(0, 30, '남', { size: 12.5, weight: 800, color: '#475569' }); D.text(-25, 4, '서', { size: 12.5, weight: 800, color: '#475569' }); D.text(25, 4, '동', { size: 12.5, weight: 800, color: '#475569' });
    D.arrow(-10, 1, 15, 1, { color: '#2563eb', width: 5, head: 11 });
    ctx.restore();
    pill(748, 126, '바람: 서 → 동', { bg: '#1d4ed8', color: '#fff', border: null, size: 12.5 });
    // 범례
    ctx.save(); ctx.translate(0, 0);
    ctx.fillStyle = 'rgba(255,255,255,.9)'; D.roundRect(16, 482, 262, 46, 12); ctx.fill();
    const lg = ctx.createLinearGradient(26, 0, 116, 0); lg.addColorStop(0, '#bce0aa'); lg.addColorStop(0.5, '#ece8b0'); lg.addColorStop(1, '#b08e68'); ctx.fillStyle = lg; ctx.fillRect(26, 490, 90, 9);
    D.text(26, 519, '낮은 곳', { size: 12, weight: 700, color: '#475569', align: 'left' }); D.text(116, 519, '높은 곳', { size: 12, weight: 700, color: '#475569', align: 'right' });
    const lg2 = ctx.createLinearGradient(150, 0, 268, 0); lg2.addColorStop(0, 'rgba(250,215,40,.25)'); lg2.addColorStop(0.5, 'rgba(240,150,30,.7)'); lg2.addColorStop(1, 'rgba(230,40,30,.9)'); ctx.fillStyle = lg2; ctx.fillRect(150, 490, 118, 9);
    D.text(150, 519, '묽은 가스', { size: 12, weight: 700, color: '#475569', align: 'left' }); D.text(268, 519, '진한 가스', { size: 12, weight: 700, color: '#475569', align: 'right' });
    ctx.restore();
    caption('☣️ 무거운 유독 가스는 낮은 곳에 고이고 바람을 따라가요');
    // 가스 흡입 게이지 & 메시지
    if (EV.st === 'run' || EV.st === 'done') {
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(560, 142, 224, 50, 12); ctx.fill();
      D.text(572, 160, '가스를 마신 정도', { size: 13, weight: 800, color: '#334155', align: 'left' });
      ctx.fillStyle = '#e2e8f0'; D.roundRect(572, 168, 200, 12, 6); ctx.fill();
      const w = clamp(EV.expA / 12, 0, 1); ctx.beginPath(); D.roundRect(572, 168, 200, 12, 6); ctx.clip(); ctx.fillStyle = mixc('#22c55e', '#ef4444', w); ctx.fillRect(572, 168, 200 * w, 12);
      ctx.restore();
      pill(784, 214, '유출 후 ' + Math.floor(EV.t) + '초', { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 13, align: 'right' });
    }
    if (EV.st === 'done') {
      ctx.save(); ctx.fillStyle = EV.safe ? '#f0fdf4' : '#fff7ed'; ctx.strokeStyle = EV.safe ? '#22c55e' : '#fb923c'; ctx.lineWidth = 2.5; D.roundRect(290, 482, 494, 46, 14); ctx.fill(); ctx.stroke(); ctx.restore();
      textBox(537, 505, 470, EV.msg, 14, { vcenter: true, weight: 800, color: '#1e293b' });
    } else if (EV.st === 'idle') {
      pill(540, 506, EV.sel ? '🏃 대피하기를 눌러요' : '📍 대피 장소를 눌러 골라요', { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 14 });
    }
    if (isNew('evac')) newTag();
  }

  /* =========================================================
     ③ 진동대: 일반 / 내진 / 면진
     ========================================================= */
  const SK = { I: 5, st: 'idle', t: 0, dur: 4.2, g: 0, maxI: 0, done: false, ran: 0, dmg: [0, 0, 0], dmgS: [0, 0, 0], cr: [0, 0, 0], lastI: 0, bearing: 0 };
  const BLD = [
    { id: 'n', name: '일반 건물', sub: '보강 없음', x: 150, w: 110, h: 190, amp: 1.9, col: '#f1e3c8', sp: new SciSim.Spring(0, { stiffness: 520, damping: 9 }), vuln: 1 },
    { id: 'r', name: '내진 설계 건물', sub: '기둥·벽 보강', x: 400, w: 110, h: 190, amp: 1.1, col: '#dbe7f6', sp: new SciSim.Spring(0, { stiffness: 900, damping: 14 }), vuln: 0.4 },
    { id: 'i', name: '면진 설계 건물', sub: '고무 받침', x: 650, w: 110, h: 190, amp: 0.22, col: '#e0f2e9', sp: new SciSim.Spring(0, { stiffness: 120, damping: 14 }), vuln: 0.1 },
  ];
  function damageFor(i, I) {
    if (i === 0) return clamp((I - 3) / 6, 0, 1);
    if (i === 1) return clamp((I - 5) / 5, 0, 1) * 0.6;
    return clamp((I - 8) / 3, 0, 1) * 0.15;
  }
  function shakeGo() {
    if (SK.st === 'run') return;
    SK.st = 'run'; SK.t = 0; SK.lastI = SK.I; SK.maxI = Math.max(SK.maxI, SK.I); SK.done = false;
    BLD.forEach((b, i) => { SK.dmg[i] = damageFor(i, SK.I); SK.dmgS[i] = 0; SK.cr[i] = 0; b.sp.value = 0; b.sp.velocity = 0; b.sp.target = 0; });
    Sound.tick();
  }
  function shakeReset() { SK.st = 'idle'; SK.t = 0; SK.g = 0; SK.done = false; SK.dmgS = [0, 0, 0]; SK.cr = [0, 0, 0]; BLD.forEach((b) => { b.sp.value = 0; b.sp.velocity = 0; b.sp.target = 0; }); }
  function shakeStep(dt) {
    if (SK.st === 'run') {
      SK.t += dt;
      const A = 3 + SK.lastI * 1.5, env = Math.min(1, SK.t / 0.4) * (SK.t < SK.dur - 0.9 ? 1 : Math.max(0, (SK.dur - SK.t) / 0.9));
      SK.g = A * env * Math.sin(SK.t * 17) * (0.8 + 0.2 * Math.sin(SK.t * 5.7));
      BLD.forEach((b, i) => { b.sp.target = SK.g * b.amp; b.sp.update(dt); SK.cr[i] = clamp((SK.t - 0.6) / 2, 0, 1); SK.dmgS[i] = approach(SK.dmgS[i], SK.dmg[i], dt, 1.2); });
      if (SK.t >= SK.dur) { SK.st = 'idle'; SK.done = true; SK.ran++; SK.g = 0; BLD.forEach((b) => { b.sp.target = 0; }); }
    } else {
      SK.g = approach(SK.g, 0, dt, 10);
      BLD.forEach((b) => { b.sp.target = 0; b.sp.update(dt); });
    }
  }
  function dmgLabel(d) { return d < 0.05 ? '피해 없음' : d < 0.2 ? '피해 작음' : d < 0.45 ? '피해 보통' : d < 0.7 ? '피해 큼' : '피해 매우 큼'; }
  function dmgCol(d) { return d < 0.05 ? '#22c55e' : d < 0.2 ? '#84cc16' : d < 0.45 ? '#f59e0b' : d < 0.7 ? '#f97316' : '#dc2626'; }
  function drawBuildingSK(b, i) {
    const gy = 372, g = SK.g, cr = SK.cr[i] * SK.dmgS[i];
    const baseX = b.x - b.w / 2;
    let bodyBase = g, bearingH = 0;
    if (i === 2) { bodyBase = b.sp.value; bearingH = 20; }
    const topX = (i === 2 ? b.sp.value * 1.05 : b.sp.value);
    const yb = gy - bearingH;
    const shx = (f) => bodyBase + (topX - bodyBase) * Math.pow(f, 1.2) + (i === 0 ? cr * 9 * f : i === 1 ? cr * 3 * f : 0);
    const P = (fx_, fy) => [baseX + fx_ * b.w + shx(fy), yb - fy * b.h];
    ctx.save();
    // 면진: 고무 받침
    if (i === 2) {
      for (let k = 0; k < 3; k++) {
        const bx = baseX + 14 + k * 38;
        const topShift = bodyBase, botShift = g;
        ctx.fillStyle = '#374151';
        ctx.beginPath(); ctx.moveTo(bx + botShift, gy); ctx.lineTo(bx + 24 + botShift, gy); ctx.lineTo(bx + 24 + topShift, yb); ctx.lineTo(bx + topShift, yb); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#9ca3af'; ctx.fillRect(bx + 10 + (botShift + topShift) / 2, gy - 17, 4, 14);
        ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 1.2; for (let s = 1; s < 4; s++) { const yy = yb + (gy - yb) * s / 4; ctx.beginPath(); ctx.moveTo(bx + lerp(topShift, botShift, s / 4), yy); ctx.lineTo(bx + 24 + lerp(topShift, botShift, s / 4), yy); ctx.stroke(); }
      }
      ctx.fillStyle = '#6b7280'; ctx.fillRect(baseX - 8 + g, gy - 3, b.w + 16, 5);
      ctx.fillStyle = '#4b5563'; ctx.fillRect(baseX - 6 + bodyBase, yb - 4, b.w + 12, 6);
    }
    // 본체
    const p0 = P(0, 0), p1 = P(1, 0), p2 = P(1, 1), p3 = P(0, 1);
    const col = mixc(b.col, '#a8a29e', clamp(cr * 0.9, 0, 0.8));
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath();
    const gr = ctx.createLinearGradient(baseX, 0, baseX + b.w, 0); gr.addColorStop(0, shade(col, 0.14)); gr.addColorStop(1, shade(col, -0.1));
    ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = shade(col, -0.5); ctx.lineWidth = i === 1 ? 4 : 2; ctx.stroke();
    // 층 구분 + 창
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const f0 = r / rows, f1 = (r + 1) / rows;
      if (r > 0) { const a = P(0, f0), c2 = P(1, f0); ctx.strokeStyle = i === 1 ? '#1d4ed8' : 'rgba(0,0,0,.25)'; ctx.lineWidth = i === 1 ? 3 : 1.2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke(); }
      for (let c = 0; c < 3; c++) {
        const a = P(0.12 + c * 0.3, f0 + 0.35 / rows * 1.2), w = b.w * 0.2;
        const broken = i === 0 && cr > 0.35 && ((r * 3 + c) % 3 === 0);
        ctx.fillStyle = broken ? '#475569' : '#bfdbfe'; ctx.fillRect(a[0], a[1] - 12, w, 12);
      }
    }
    if (i === 1) { // X자 가새와 보강 벽
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3.5;
      for (let r = 0; r < rows; r++) { const f0 = r / rows, f1 = (r + 1) / rows; const a = P(0, f0), c2 = P(1, f1), d2 = P(1, f0), e = P(0, f1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c2[0], c2[1]); ctx.moveTo(d2[0], d2[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); }
      ctx.fillStyle = 'rgba(37,99,235,.35)'; [P(0, 0), P(0.88, 0)].forEach((q) => { ctx.fillRect(q[0], q[1] - b.h, 0, 0); });
    }
    // 지붕
    const r0 = P(-0.05, 1), r1 = P(1.05, 1);
    ctx.fillStyle = mixc('#b45309', '#78716c', clamp(cr, 0, 0.7)); ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.lineTo(r1[0], r1[1]); ctx.lineTo(r1[0] - 10, r1[1] - 12); ctx.lineTo(r0[0] + 10, r0[1] - 12); ctx.closePath(); ctx.fill();
    // 균열
    if (cr > 0.25) {
      ctx.strokeStyle = 'rgba(30,20,10,' + clamp(cr * 1.5, 0, 0.9) + ')'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
      const a = P(0.3, 1), c1 = P(0.5, 0.72), c2 = P(0.32, 0.5), c3 = P(0.55, 0.22), c4 = P(0.4, 0.02);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.lineTo(c3[0], c3[1]); ctx.lineTo(c4[0], c4[1]); ctx.stroke();
      if (cr > 0.5) { const d2 = P(0.85, 0.85), d3 = P(0.7, 0.6), d4 = P(0.88, 0.3); ctx.beginPath(); ctx.moveTo(d2[0], d2[1]); ctx.lineTo(d3[0], d3[1]); ctx.lineTo(d4[0], d4[1]); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawShake() {
    panelBG('#eef2f7');
    ctx.fillStyle = '#e0ecf7'; ctx.fillRect(0, 56, 800, 316);
    caption('같은 진동에서 세 건물은 어떻게 다를까요?');
    // 진동대
    const g = SK.g;
    ctx.save();
    ctx.fillStyle = '#374151'; ctx.fillRect(40, 400, 720, 100);
    ctx.fillStyle = '#4b5563'; for (let k = 0; k < 5; k++) ctx.fillRect(90 + k * 150, 400, 50, 100);
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(40, 496, 720, 10);
    D.shadow(() => { const pg = ctx.createLinearGradient(0, 372, 0, 400); pg.addColorStop(0, '#9aa7b8'); pg.addColorStop(1, '#6b7787'); ctx.fillStyle = pg; ctx.fillRect(40 + g, 372, 720, 30); }, { blur: 8, y: 3 });
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(40 + g, 372, 720, 3);
    ctx.restore();
    D.text(400, 448, '진동대 (땅의 흔들림을 흉내 내요)', { size: 14, weight: 800, color: '#e5e7eb' });
    BLD.forEach((b, i) => drawBuildingSK(b, i));
    // 이름표
    BLD.forEach((b, i) => {
      pill(b.x, 110, b.name, { bg: ['#fff', '#fff', '#fff'][i], color: '#1b2333', border: ['#a8a29e', '#60a5fa', '#34d399'][i], size: 14.5 });
      D.text(b.x, 142, b.sub, { size: 13, weight: 700, color: '#475569' });
      if (SK.ran > 0 || SK.st === 'run') {
        const a = SK.st === 'run' ? sstep(0.8, 2.5, SK.t) : 1;
        ctx.save(); ctx.globalAlpha = a;
        pill(b.x, 168, dmgLabel(SK.dmg[i]), { bg: dmgCol(SK.dmg[i]), color: '#fff', border: null, size: 13.5 });
        ctx.restore();
      }
    });
    // 원리 말풍선
    const notes = ['건물이 그대로 흔들려요', '기둥·벽을 보강해 버텨요', '고무 받침이 흔들림을 줄여요'];
    BLD.forEach((b, i) => { if (SK.ran > 0) D.text(b.x, 490, notes[i], { size: 13, weight: 800, color: '#fff' }); });
    D.text(400, 524, '진동 세기 ' + SK.I + ' / 10 (예시)', { size: 14, weight: 800, color: '#334155' });
    if (SK.st === 'idle' && SK.ran === 0) pill(400, 226, '💥 진동 시작을 눌러 보세요', { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 14.5 });
    if (isNew('shake')) newTag();
  }

  /* =========================================================
     ③ 지진 행동 순서 카드
     ========================================================= */
  const OC = [
    { id: 'a', icon: '🛗', text: '서둘러 엘리베이터를 타고 내려가요', order: 0 },
    { id: 'b', icon: '🚪', text: '흔들림이 멈추면 전기·가스를 잠그고 출구를 확보해요', order: 2 },
    { id: 'c', icon: '🌳', text: '건물·담장에서 먼 넓은 공터로 대피해요', order: 4 },
    { id: 'd', icon: '🪑', text: '흔들릴 때는 탁자 아래로 들어가 머리를 보호해요', order: 1 },
    { id: 'e', icon: '🪜', text: '계단으로 이동해요 (엘리베이터는 타지 않아요)', order: 3 },
  ];
  const OW = 352, OH = 66;
  const ORD = { cards: [], slots: [0, 1, 2, 3].map((i) => ({ x: 424, y: 78 + i * 90, w: OW, h: OH, c: null })), warned: new Set(), over: -1, sel: null };
  OC.forEach((d, i) => { const px = 16, py = 78 + i * 76; ORD.cards.push(Object.assign({}, d, { px, py, x: px, y: py, w: OW, h: 60, slot: -1, lift: 0, drag: false, tw: null, shake: 0 })); });
  ORD.z = ORD.cards.slice();
  function orderLayout(skip) {
    ORD.cards.forEach((c) => {
      if (c === skip || c.drag) return;
      if (c.slot >= 0) { const s = ORD.slots[c.slot]; flyTo(c, s.x, s.y, OW, OH); } else flyTo(c, c.px, c.py, OW, 60);
    });
  }
  function orderReset() { ORD.cards.forEach((c) => { c.slot = -1; c.drag = false; }); ORD.slots.forEach((s) => { s.c = null; }); ORD.warned.clear(); orderLayout(); }
  function orderStep(dt) { ORD.cards.forEach((c) => { c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 16); c.shake *= Math.exp(-4 * dt); }); }
  function drawOrder() {
    panelBG('#eef2f7');
    caption('지진이 났을 때 행동 순서대로 카드를 놓아요');
    D.text(192, 66, '행동 카드', { size: 14, weight: 800, color: '#475569' });
    D.text(600, 66, '행동 순서', { size: 14, weight: 800, color: '#475569' });
    ORD.slots.forEach((s, i) => {
      const over = ORD.over === i;
      ctx.save();
      ctx.fillStyle = over ? 'rgba(37,99,235,.14)' : 'rgba(255,255,255,.7)'; ctx.strokeStyle = over ? '#2563eb' : '#94a3b8'; ctx.lineWidth = over ? 3.5 : 2.5; ctx.setLineDash([9, 7]); ctx.lineDashOffset = -S.t * 10;
      D.roundRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4, 14); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      if (!ORD.slots[i].c) D.text(s.x + s.w / 2 + 16, s.y + s.h / 2 + 5, (i + 1) + '번째 행동', { size: 14.5, weight: 700, color: '#94a3b8' });
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(s.x - 22, s.y + s.h / 2, 14, 0, TAU); ctx.fill();
      D.text(s.x - 22, s.y + s.h / 2 + 6, String(i + 1), { size: 16, weight: 800, color: '#fff' });
    });
    ORD.z.forEach((c) => { if (!c.drag) drawOrderCard(c); }); ORD.z.forEach((c) => { if (c.drag) drawOrderCard(c); });
    if (isNew('order')) newTag();
  }
  function drawOrderCard(c) {
    const sx = c.shake > 0.02 ? Math.sin(S.t * 55) * 6 * c.shake : 0, L = c.lift;
    const x = c.x + sx - 2 * L, y = c.y - 5 * L;
    drawCardShape(x, y, c.w, c.h, { lift: L, stroke: ORD.warned.has(c.id) ? '#ef4444' : c.slot >= 0 ? '#2563eb' : '#94a3b8' });
    ctx.fillStyle = 'rgba(100,116,139,.12)'; D.roundRect(x + 4, y + 4, 46, c.h - 8, 9); ctx.fill();
    ctx.font = '26px system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(c.icon, x + 27, y + c.h / 2 + 1);
    textBox(x + 60, y + c.h / 2, c.w - 70, c.text, 13.5, { align: 'left', vcenter: true, weight: 800 });
  }
  function orderCheck() {
    const filled = ORD.slots.filter((s) => s.c);
    if (filled.length < 4) return '1~4번째 칸을 모두 채워 주세요. 알맞지 않은 카드는 남겨 둬요.';
    const bad = ORD.slots.map((s, i) => (s.c.order !== i + 1 ? i : -1)).filter((i) => i >= 0);
    if (bad.length) {
      bad.forEach((i) => { const c = ORD.slots[i].c; if (!ORD.warned.has(c.id)) { ORD.warned.add(c.id); c.shake = 1; } });
      if (ORD.slots.some((s) => s.c.id === 'a')) return '엘리베이터는 지진 때 멈추거나 갇힐 수 있어요. 이 카드는 쓰지 않아요.';
      return '순서가 맞지 않아요. 흔들릴 때 → 멈춘 뒤 → 이동 → 대피 장소 순서로 생각해 봐요.';
    }
    return true;
  }

  /* =========================================================
     ③ 홍수 대피 지도
     ========================================================= */
  const FH = (x, y) => {
    const yr = 450 - 0.06 * x + 16 * Math.sin(x / 130);
    const d2 = (y - yr) * (y - yr);
    const gs = (cx, cy, sg, a) => a * Math.exp(-((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (2 * sg * sg));
    return clamp(0.52 - 0.22 * Math.exp(-d2 / (2 * 26 * 26)) - 0.14 * Math.exp(-d2 / (2 * 90 * 90)) + gs(590, 110, 110, 0.5) + gs(120, 110, 100, 0.3) - gs(350, 455, 22, 0.07), 0, 1.2);
  };
  const FHOME = { x: 250, y: 360 };
  const FRT = [
    { id: 'r1', name: '하천 둑길', icon: '🏞️', pts: [[250, 360], [330, 372], [450, 372], [560, 355], [650, 352]], dest: '하천 아래쪽 마을회관 (낮은 곳)' },
    { id: 'r2', name: '지하차도 지름길', icon: '🚇', pts: [[250, 360], [285, 425], [350, 455], [440, 452], [530, 440]], dest: '건너편 역 (지하차도로)' },
    { id: 'r3', name: '언덕 위 학교', icon: '🏫', pts: [[250, 360], [268, 300], [330, 234], [440, 170], [560, 128]], dest: '언덕 위 학교 (높은 곳)' },
  ];
  FRT.forEach((r) => { let L = 0; r.seg = []; for (let i = 1; i < r.pts.length; i++) { const l = Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]); r.seg.push(l); L += l; } r.L = L; });
  const FL_SP = 56;
  const FLD = { sel: null, selA: {}, st: 'idle', t: 0, dist: 0, pos: { x: FHOME.x, y: FHOME.y }, wl: 0.2, wlA: 0.2, msg: '', safe: false, terr: null, wimg: null, wctx: null, wdata: null, hgrid: null, blockedAt: -1, shake: {} };
  const WL0 = 0.18, WL_RATE = 0.04;
  FRT.forEach((r) => { FLD.selA[r.id] = 0; FLD.shake[r.id] = 0; });
  const FGW = 200, FGH = 135;
  function floodInit() {
    FLD.hgrid = new Float32Array(FGW * FGH);
    for (let j = 0; j < FGH; j++) for (let i = 0; i < FGW; i++) FLD.hgrid[j * FGW + i] = FH(i * 4 + 2, j * 4 + 2);
    FLD.wimg = document.createElement('canvas'); FLD.wimg.width = FGW; FLD.wimg.height = FGH;
    FLD.wctx = FLD.wimg.getContext('2d'); FLD.wdata = FLD.wctx.createImageData(FGW, FGH);
  }
  floodInit();
  const routePos = (r, d) => {
    let acc = 0;
    for (let i = 0; i < r.seg.length; i++) {
      if (d <= acc + r.seg[i] || i === r.seg.length - 1) { const t = clamp((d - acc) / r.seg[i], 0, 1); return [lerp(r.pts[i][0], r.pts[i + 1][0], t), lerp(r.pts[i][1], r.pts[i + 1][1], t)]; }
      acc += r.seg[i];
    }
    return r.pts[r.pts.length - 1];
  };
  function floodReset() { FLD.st = 'idle'; FLD.t = 0; FLD.dist = 0; FLD.pos.x = FHOME.x; FLD.pos.y = FHOME.y; FLD.wl = WL0; FLD.msg = ''; FLD.safe = false; FLD.blockedAt = -1; }
  function floodGo() {
    if (FLD.st === 'run') return;
    if (!FLD.sel) { toastOnce('먼저 대피 경로 하나를 눌러 골라요.'); return; }
    floodReset(); FLD.st = 'run'; Sound.tick();
  }
  function floodStep(dt) {
    FRT.forEach((r) => { FLD.selA[r.id] = approach(FLD.selA[r.id], FLD.sel === r.id ? 1 : 0, dt, 12); FLD.shake[r.id] *= Math.exp(-4 * dt); });
    if (FLD.st === 'run') {
      FLD.t += dt; FLD.wl = WL0 + WL_RATE * FLD.t;
      const r = FRT.find((q) => q.id === FLD.sel);
      FLD.dist = Math.min(r.L, FLD.dist + FL_SP * dt);
      const p = routePos(r, FLD.dist);
      const h = FH(p[0], p[1]);
      FLD.pos.x = p[0]; FLD.pos.y = p[1];
      if (FLD.wl > h + 0.015 && FLD.dist > 6) {
        FLD.st = 'done'; FLD.safe = false; FLD.blockedAt = FLD.dist;
        FLD.msg = r.id === 'r2' ? '지하차도는 가장 낮아서 물이 먼저 찼어요. 지하 공간은 피해야 해요.' : '하천 가까운 낮은 길은 물이 차올라 막혔어요. 높은 곳으로 가야 해요.';
        FLD.shake[r.id] = 1; Sound.fail && Sound.fail();
      } else if (FLD.dist >= r.L) {
        FLD.st = 'done'; FLD.safe = true; FLD.msg = '안전해요! 물은 낮은 곳부터 차오르니 높은 곳으로 일찍 대피했어요.';
        fx.burst(p[0], p[1], { count: 30, speed: 200 }); Sound.tick();
      }
    } else if (FLD.st === 'done') {
      FLD.wl = Math.min(0.62, FLD.wl + WL_RATE * dt);
    } else FLD.wl = approach(FLD.wl, WL0, dt, 3);
    FLD.wlA = approach(FLD.wlA, FLD.wl, dt, 12);
  }
  function drawFlood() {
    if (!FLD.terr) FLD.terr = buildTerrainCanvas(FH, [[0, [150, 196, 150]], [0.3, [190, 222, 168]], [0.48, [226, 232, 178]], [0.7, [214, 190, 142]], [1.2, [176, 142, 104]]], 14, null);
    ctx.drawImage(FLD.terr, 0, 0, 800, 540);
    // 물
    const wl = FLD.wlA, d = FLD.wdata.data, hg = FLD.hgrid;
    for (let k = 0; k < FGW * FGH; k++) {
      const dep = wl - hg[k]; const o = k * 4;
      if (dep > 0) { const a = clamp(0.42 + dep * 3, 0, 0.82); d[o] = 44 + 30 * (1 - clamp(dep * 4, 0, 1)); d[o + 1] = 130; d[o + 2] = 215; d[o + 3] = a * 255; } else d[o + 3] = 0;
    }
    FLD.wctx.putImageData(FLD.wdata, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(FLD.wimg, 0, 0, 800, 540);
    ctx.globalAlpha = 0.25; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) { const yy = 380 + i * 12; ctx.beginPath(); for (let x = 0; x <= 800; x += 20) { const yv = yy + Math.sin(x / 40 + S.t * 2 + i) * 2; x ? ctx.lineTo(x, yv) : ctx.moveTo(x, yv); } if (wl > 0.3) ctx.stroke(); }
    ctx.restore();
    // 경로
    FRT.forEach((r) => {
      const a = FLD.selA[r.id], sh = Math.sin(S.t * 50) * 4 * FLD.shake[r.id];
      ctx.save(); ctx.translate(sh, 0);
      ctx.strokeStyle = a > 0.5 ? '#2563eb' : 'rgba(30,41,59,.55)'; ctx.lineWidth = 3 + 3 * a; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -S.t * 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); r.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.setLineDash([]);
      const e = r.pts[r.pts.length - 1];
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e[0], e[1], 17, 0, TAU); ctx.fill(); }, { blur: 6, y: 2 });
      if (a > 0.02) { ctx.globalAlpha = a; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e[0], e[1], 22 + 3 * Math.sin(S.t * 5), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.font = '19px system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(r.icon, e[0], e[1] + 1);
      ctx.restore();
      const lx = e[0] + (e[0] > 600 ? -4 : 0), ly = e[1] + 32;
      pill(clamp(lx, 90, 710), ly, r.name, { bg: a > 0.5 ? '#2563eb' : '#fff', color: a > 0.5 ? '#fff' : '#1b2333', border: a > 0.5 ? null : '#94a3b8', size: 12.5 });
    });
    // 집
    ctx.save(); ctx.translate(FHOME.x, FHOME.y);
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill(); }, { blur: 7, y: 3 });
    ctx.font = '22px system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText('🏠', 0, 1); ctx.restore();
    pill(FHOME.x - 8, FHOME.y - 34, '우리 집', { bg: '#1e293b', color: '#fff', border: null, size: 12.5 });
    // 사람
    if (FLD.st !== 'idle') {
      const moving = FLD.st === 'run';
      ctx.save(); ctx.translate(FLD.pos.x, FLD.pos.y);
      D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); }, { blur: 5, y: 2 });
      ctx.font = '18px system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(moving ? '🏃' : (FLD.safe ? '🙂' : '😮'), 0, 1);
      ctx.restore();
      if (FLD.st === 'done' && !FLD.safe) pill(FLD.pos.x, FLD.pos.y - 28, '길이 막혔어요', { bg: '#dc2626', color: '#fff', border: null, size: 12.5 });
    }
    // 수위 단면 (D.wave)
    const ix = 596, iy = 56, iw = 190, ih = 112;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.92)'; D.roundRect(ix, iy, iw, ih, 12); ctx.fill(); ctx.beginPath(); D.roundRect(ix, iy, iw, ih, 12); ctx.clip();
    const sk = ctx.createLinearGradient(0, iy, 0, iy + ih); sk.addColorStop(0, '#e0f2fe'); sk.addColorStop(1, '#f0f9ff'); ctx.fillStyle = sk; ctx.fillRect(ix, iy, iw, ih);
    ctx.fillStyle = '#c9a76f'; ctx.beginPath(); ctx.moveTo(ix, iy + ih); ctx.lineTo(ix, iy + 84); ctx.lineTo(ix + 70, iy + 82); ctx.lineTo(ix + 110, iy + 40); ctx.lineTo(ix + iw, iy + 30); ctx.lineTo(ix + iw, iy + ih); ctx.closePath(); ctx.fill();
    const wy = iy + ih - 10 - clamp((wl - 0.16) / 0.5, 0, 1) * 86;
    ctx.fillStyle = 'rgba(56,140,225,.75)'; ctx.fillRect(ix, wy, iw, iy + ih - wy);
    D.wave(ix, ix + iw, wy, { amp: 3, wavelength: 40, phase: S.t * 3, color: '#2f86d9', width: 3 });
    ctx.font = '16px system-ui,"Apple Color Emoji","Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText('🏠', ix + 28, iy + 80); ctx.fillText('🏫', ix + 150, iy + 28);
    ctx.restore();
    D.text(ix + iw / 2, iy + ih + 18, '물의 높이(단면)', { size: 12.5, weight: 800, color: '#fff', stroke: 'rgba(0,0,0,.45)', strokeWidth: 3 });
    caption('물은 낮은 곳부터 차올라요. 어느 길이 안전할까요?');
    if (FLD.st === 'done') {
      ctx.save(); ctx.fillStyle = FLD.safe ? '#f0fdf4' : '#fff7ed'; ctx.strokeStyle = FLD.safe ? '#22c55e' : '#fb923c'; ctx.lineWidth = 2.5; D.roundRect(16, 480, 768, 46, 14); ctx.fill(); ctx.stroke(); ctx.restore();
      textBox(400, 503, 744, FLD.msg, 14.5, { vcenter: true, weight: 800, color: '#1e293b' });
    } else if (FLD.st === 'idle') pill(400, 506, FLD.sel ? '🏃 대피하기를 눌러요' : '🗺️ 대피 경로(끝의 표시)를 눌러 골라요', { bg: 'rgba(30,41,59,.84)', color: '#fff', border: null, size: 14 });
    if (isNew('flood')) newTag();
  }

  /* =========================================================
     ④ 안전 홍보 포스터
     ========================================================= */
  const POSTER = {
    pquake: {
      title: '🌍 지진, 미리 준비하면 안전해요', color: '#0d9488',
      rib: ['🔬 고정·내진 설계로 흔들림에 버텨요', '🔬 미리 알고 연습하면 당황하지 않아요', '🔬 떨어지는 물건에서 머리를 보호해요'],
      cards: [
        ['p', '가구는 벽에 고정하고 무거운 물건은 아래에 둬요'], ['p', '건물을 내진 설계로 튼튼하게 지어요'],
        ['b', '비상 가방과 대피 장소를 미리 확인해요'], ['b', '가족과 지진 대피 훈련을 해요'],
        ['r', '흔들리면 탁자 아래에서 머리를 보호해요'], ['r', '멈추면 계단으로 넓은 공터에 대피해요'],
        ['x', '엘리베이터를 타고 서둘러 내려가요'], ['x', '흔들리는 동안 건물 밖으로 뛰어나가요'],
      ],
    },
    pfire: {
      title: '🔥 화재, 연기부터 조심해요', color: '#ea580c',
      rib: ['🔬 불이 나는 조건을 미리 줄여요', '🔬 LPG는 무거워 바닥에, LNG는 가벼워 천장에 고여요', '🔬 뜨거운 연기는 가벼워 위로 올라가요'],
      cards: [
        ['p', '콘센트 하나에 플러그를 한꺼번에 많이 꽂지 않아요'], ['p', '가스 밸브는 쓰고 나면 꼭 잠가요'],
        ['b', '소화기와 비상구 위치를 미리 확인해요'], ['b', 'LPG 경보기는 바닥 가까이, LNG는 천장 가까이에 달아요'],
        ['r', '연기는 위로 모이니 낮은 자세로 대피해요'], ['r', '젖은 수건으로 코·입을 막고 계단으로 가요'],
        ['x', '엘리베이터를 타고 빨리 내려가요'], ['x', '연기 속에서는 서서 빠르게 뛰어가요'],
      ],
    },
    pflood: {
      title: '🌊 홍수, 일찍 높은 곳으로!', color: '#2563eb',
      rib: ['🔬 물이 빠지는 길을 열어 두어요', '🔬 물은 낮은 곳으로 흘러 고여요', '🔬 물은 낮은 곳부터 차올라요'],
      cards: [
        ['p', '집 주변 배수구를 치워 물이 잘 빠지게 해요'], ['p', '저지대 건물 입구에 물막이판을 준비해요'],
        ['b', '대피 장소와 높은 곳으로 가는 길을 미리 확인해요'], ['b', '일기 예보와 재난 문자를 자주 확인해요'],
        ['r', '물이 차오르면 높은 곳으로 먼저 대피해요'], ['r', '지하 공간과 하천 가까이를 피해요'],
        ['x', '불어난 하천을 구경하러 가요'], ['x', '물이 차는 지하 주차장에서 차를 옮겨요'],
      ],
    },
  };
  const COLN = { p: 0, b: 1, r: 2 };
  const COLNAME = ['① 예방', '② 대비', '③ 대처'];
  const COLSUB = ['사고가 나기 전에 줄여요', '미리 준비해 둬요', '일어났을 때 몸을 지켜요'];
  const PW = 186, PH = 80, SLW = 240, SLH = 66;
  const PS = {};
  Object.keys(POSTER).forEach((k) => {
    const T = POSTER[k];
    // 보관 카드 순서를 섞어 둠
    const order = [6, 1, 4, 2, 7, 5, 0, 3];
    PS[k] = { cards: [], slots: [], warned: new Set(), done: 0, over: null, doneA: 0, stamp: 0 };
    for (let ci = 0; ci < 3; ci++) for (let si = 0; si < 2; si++) PS[k].slots.push({ col: ci, x: 16 + ci * 258, y: 134 + si * 76, w: SLW, h: SLH, c: null });
    order.forEach((idx, i) => {
      const [kind, text] = T.cards[idx];
      const px = 16 + (i % 4) * 194, py = 350 + Math.floor(i / 4) * 90;
      PS[k].cards.push({ kind, text, px, py, x: px, y: py, w: PW, h: PH, slot: -1, lift: 0, drag: false, tw: null, shake: 0, id: k + idx });
    });
    PS[k].z = PS[k].cards.slice();
  });
  function posterLayout(k, skip) {
    const P = PS[k];
    P.cards.forEach((c) => {
      if (c === skip || c.drag) return;
      if (c.slot >= 0) { const s = P.slots[c.slot]; flyTo(c, s.x, s.y, SLW, SLH); } else flyTo(c, c.px, c.py, PW, PH);
    });
  }
  function posterReset(k) { const P = PS[k]; P.cards.forEach((c) => { c.slot = -1; c.drag = false; }); P.slots.forEach((s) => { s.c = null; }); P.warned.clear(); posterLayout(k); }
  function posterColOK(k, ci) {
    const P = PS[k];
    const sl = P.slots.filter((s) => s.col === ci);
    return sl.every((s) => s.c && COLN[s.c.kind] === ci);
  }
  function posterDone(k) { return [0, 1, 2].every((ci) => posterColOK(k, ci)); }
  function posterStep(k, dt) {
    const P = PS[k];
    P.cards.forEach((c) => { c.lift = approach(c.lift, c.drag ? 1 : 0, dt, 16); c.shake *= Math.exp(-4 * dt); });
    P.doneA = approach(P.doneA, posterDone(k) ? 1 : 0, dt, 4);
    P.colA = P.colA || [0, 0, 0];
    for (let i = 0; i < 3; i++) P.colA[i] = approach(P.colA[i], posterColOK(k, i) ? 1 : 0, dt, 6);
    if (posterDone(k) && !P.stampOn) { P.stampOn = true; P.stamp = 0; SciSim.tween(P, { stamp: 1 }, { duration: 0.6, ease: 'outBack' }); fx.burst(400, 250, { count: 40, speed: 240 }); Sound.tick(); }
    if (!posterDone(k)) P.stampOn = false;
  }
  function drawPoster(k) {
    const T = POSTER[k], P = PS[k];
    panelBG('#eef2f7');
    // 포스터 용지
    ctx.save();
    D.shadow(() => { ctx.fillStyle = '#fff'; D.roundRect(8, 52, 784, 284, 16); ctx.fill(); }, { blur: 14, y: 4 });
    const bg = ctx.createLinearGradient(8, 52, 8, 92); bg.addColorStop(0, T.color); bg.addColorStop(1, shade(T.color, -0.2));
    ctx.beginPath(); D.roundRect(8, 52, 784, 284, 16); ctx.clip(); ctx.fillStyle = bg; ctx.fillRect(8, 52, 784, 42);
    ctx.restore();
    D.text(400, 80, T.title, { size: 20, weight: 800, color: '#fff' });
    for (let ci = 0; ci < 3; ci++) {
      const x = 16 + ci * 258, a = P.colA ? P.colA[ci] : 0;
      ctx.save(); ctx.fillStyle = rgba(T.color, 0.1 + 0.12 * a); D.roundRect(x - 4, 100, SLW + 8, 232, 12); ctx.fill(); ctx.restore();
      D.text(x + 8, 117, COLNAME[ci], { size: 16, weight: 800, color: shade(T.color, -0.3), align: 'left' });
      D.text(x + SLW - 6, 117, COLSUB[ci], { size: 12.5, weight: 700, color: '#64748b', align: 'right' });
      // 과학 원리 띠
      if (a > 0.02) {
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fef9c3'; ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; D.roundRect(x, 288, SLW, 38, 10); ctx.fill(); ctx.stroke();
        textBox(x + SLW / 2, 307, SLW - 14, T.rib[ci], 12.5, { vcenter: true, weight: 800, color: '#713f12' });
        ctx.restore();
        D.check(x + SLW - 12, 126, 11 * a, a);
      }
    }
    P.slots.forEach((s) => {
      const over = P.over === P.slots.indexOf(s);
      ctx.save(); ctx.fillStyle = over ? 'rgba(37,99,235,.16)' : 'rgba(255,255,255,.8)'; ctx.strokeStyle = over ? '#2563eb' : '#94a3b8'; ctx.lineWidth = over ? 3.5 : 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -S.t * 10;
      D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      if (!s.c) D.text(s.x + s.w / 2, s.y + s.h / 2 + 5, '카드 놓기', { size: 13.5, weight: 700, color: '#94a3b8' });
    });
    // 보관 구역
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.55)'; D.roundRect(8, 340, 784, 192, 16); ctx.fill(); ctx.restore();
    D.text(20, 366, '', {});
    P.z.forEach((c) => { if (!c.drag) drawPosterCard(c, k); }); P.z.forEach((c) => { if (c.drag) drawPosterCard(c, k); });
    // 완성 도장
    if (P.stamp > 0.01) {
      ctx.save(); ctx.translate(676, 72); ctx.rotate(-0.08); const sc = P.stamp; ctx.scale(sc, sc);
      ctx.globalAlpha = 0.97; ctx.fillStyle = 'rgba(240,253,244,.96)'; D.roundRect(-104, -19, 208, 38, 12); ctx.fill(); ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 3.5; D.roundRect(-104, -19, 208, 38, 12); ctx.stroke();
      D.text(0, 6, '✔ 안전 포스터 완성!', { size: 16, weight: 800, color: '#15803d' });
      ctx.restore();
    }
    if (isNew('poster')) newTag();
  }
  function drawPosterCard(c, k) {
    const P = PS[k];
    const inSlot = c.slot >= 0, sx = c.shake > 0.02 ? Math.sin(S.t * 55) * 6 * c.shake : 0, L = c.lift;
    const x = c.x + sx - 2 * L, y = c.y - 5 * L;
    const ok = inSlot && COLN[c.kind] === P.slots[c.slot].col;
    drawCardShape(x, y, c.w, c.h, { lift: L, stroke: P.warned.has(c.id) ? '#ef4444' : ok ? '#22c55e' : inSlot ? '#f59e0b' : '#94a3b8', lw: inSlot ? 2.5 : 2 });
    textBox(x + c.w / 2, y + c.h / 2, c.w - 18, c.text, c.w > 200 ? 13.5 : 13, { vcenter: true, weight: 800 });
  }
  function posterCheck(k) {
    const P = PS[k];
    const placedX = P.cards.filter((c) => c.kind === 'x' && c.slot >= 0);
    const empty = P.slots.filter((s) => !s.c).length;
    if (placedX.length) { placedX.forEach((c) => { if (!P.warned.has(c.id)) { P.warned.add(c.id); c.shake = 1; } }); return '과학 원리가 맞지 않는 카드가 포스터에 있어요: <b>' + placedX[0].text + '</b>'; }
    const wrong = P.cards.filter((c) => c.slot >= 0 && c.kind !== 'x' && COLN[c.kind] !== P.slots[c.slot].col);
    if (empty) return '아직 비어 있는 칸이 ' + empty + '곳 있어요. 문장 카드를 끌어다 놓아요.';
    if (wrong.length) { wrong.forEach((c) => { if (!P.warned.has(c.id)) { P.warned.add(c.id); c.shake = 1; } }); return '<b>예방</b>은 일어나기 전에 줄이는 일, <b>대비</b>는 미리 준비하는 일, <b>대처</b>는 일어났을 때 하는 행동이에요. 칸을 다시 확인해요.'; }
    return true;
  }

  /* =========================================================
     장면 전환 · 갱신 · 조작
     ========================================================= */
  const DRAW = { home: drawHome, bag: drawBag, fire: drawFire, evac: drawEvac, shake: drawShake, order: drawOrder, flood: drawFlood, pquake: () => drawPoster('pquake'), pfire: () => drawPoster('pfire'), pflood: () => drawPoster('pflood') };
  const STEPF = { home: homeStep, bag: bagStep, fire: fireStep, evac: evacStep, shake: shakeStep, order: orderStep, flood: floodStep, pquake: (dt) => posterStep('pquake', dt), pfire: (dt) => posterStep('pfire', dt), pflood: (dt) => posterStep('pflood', dt) };
  const PANEL = { home: 'cHome', bag: 'cBag', fire: 'cFire', evac: 'cEvac', shake: 'cShake', order: 'cOrder', flood: 'cFlood', pquake: 'cPoster', pfire: 'cPoster', pflood: 'cPoster' };
  const WRAPBG = { home: '#f6efe3', bag: '#f1f5f9', fire: '#e8edf3', evac: '#c9dfb6', shake: '#eef2f7', order: '#eef2f7', flood: '#b5d6a8', pquake: '#eef2f7', pfire: '#eef2f7', pflood: '#eef2f7' };
  const HINT = {
    home: '👆 집 안을 눌러 위험한 곳 3곳을 찾아요',
    bag: '🎒 물건을 눌러 담거나 끌어다 놓아요 (6 kg까지)',
    fire: '🧍 자세를 고르고 🏃 대피를 시작해요',
    evac: '📍 대피 장소를 고르고 🏃 대피해요',
    shake: '📳 세기를 정하고 💥 진동을 시작해요',
    order: '🪑 카드를 끌어 1~4번 칸에 놓아요',
    flood: '🗺️ 대피 경로를 고르고 🏃 대피해요',
    pquake: '🪧 문장 카드를 알맞은 칸에 끌어 놓아요',
    pfire: '🪧 문장 카드를 알맞은 칸에 끌어 놓아요',
    pflood: '🪧 문장 카드를 알맞은 칸에 끌어 놓아요',
  };
  const snap = document.createElement('canvas');
  function setScene(id) {
    if (id === S.scene) return;
    try { snap.width = view.canvas.width; snap.height = view.canvas.height; snap.getContext('2d').drawImage(view.canvas, 0, 0); S.hasSnap = true; } catch (e) { S.hasSnap = false; }
    S.prev = S.scene; S.scene = id; S.tr = 0;
    SciSim.tween(S, { tr: 1 }, { duration: 0.45, ease: 'outCubic' });
    afterScene();
  }
  let segKey = '';
  function afterScene() {
    Object.keys(PANEL).forEach((k) => { if (k !== 'pfire' && k !== 'pflood') $('#' + PANEL[k]).classList.toggle('is-off', !(PANEL[S.scene] === PANEL[k])); });
    view.wrap.style.setProperty('--stage-bg', WRAPBG[S.scene]);
    showHint(HINT[S.scene], 6000);
    segKey = ''; renderSeg();
  }
  function renderSeg() {
    const lvl = game ? (game.free ? -1 : game.level) : 0;
    const list = SCENES.filter((s) => lvl < 0 || s.step === lvl);
    const key = lvl + '|' + S.scene;
    if (key === segKey) return;
    segKey = key;
    const box = $('#sceneSeg'); box.innerHTML = '';
    list.forEach((s) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s.label;
      if (s.id === S.scene) b.className = 'on';
      b.addEventListener('click', () => { Sound.click(); setScene(s.id); });
      box.appendChild(b);
    });
    box.classList.toggle('is-off', list.length < 2);
  }
  function resetScene() {
    Sound.click();
    switch (S.scene) {
      case 'home': homeReset(); break;
      case 'bag': bagReset(); break;
      case 'fire': fireReset(); break;
      case 'evac': evacReset(); EV.sel = null; break;
      case 'shake': shakeReset(); break;
      case 'order': orderReset(); break;
      case 'flood': floodReset(); FLD.sel = null; break;
      default: posterReset(S.scene);
    }
  }
  $('#resetBtn').addEventListener('click', resetScene);

  /* ---------- 컨트롤 ---------- */
  $('#pStand').addEventListener('click', () => { Sound.click(); setPosture(false); });
  $('#pLow').addEventListener('click', () => { Sound.click(); setPosture(true); });
  $('#tgTowel').addEventListener('click', () => { Sound.click(); setTowel(!FR.towel); $('#tgTowel').textContent = FR.towel ? '💧 젖은 수건으로 막는 중' : '💧 젖은 수건으로 코·입 막기'; });
  $('#fireGo').addEventListener('click', fireGo);
  $('#evacGo').addEventListener('click', evacGo);
  $('#floodGo').addEventListener('click', floodGo);
  const intUI = SciSim.bindRange($('#sInt'), $('#oInt'), (v) => v + ' / 10', (v) => { SK.I = v; });
  $('#shakeGo').addEventListener('click', shakeGo);

  /* ---------- 캔버스 직접 조작 ---------- */
  const dragScene = () => (S.scene === 'bag' ? BG : S.scene === 'order' ? ORD : /^p/.test(S.scene) && PS[S.scene] ? PS[S.scene] : null);
  let ptr = null;
  function slotAtCenter(list, c) { const cx = c.x + c.w / 2, cy = c.y + c.h / 2; for (let i = 0; i < list.length; i++) { const s = list[i]; if (cx >= s.x - 6 && cx <= s.x + s.w + 6 && cy >= s.y - 6 && cy <= s.y + s.h + 6) return i; } return -1; }
  SciSim.pointer(view, {
    down(p) {
      const sc = S.scene;
      if (sc === 'home') { homeTap(p); return false; }
      if (sc === 'evac') {
        for (const s of ESH) if (Math.hypot(p.x - s.x, p.y - s.y + 2) < 36) { if (EV.st === 'run') return false; EV.sel = s.id; if (EV.st === 'done') evacReset(); Sound.tick(); return false; }
        return false;
      }
      if (sc === 'flood') {
        if (FLD.st === 'run') return false;
        for (const r of FRT) { const e = r.pts[r.pts.length - 1]; let hit = Math.hypot(p.x - e[0], p.y - e[1]) < 30; if (!hit) for (let d = 0; d <= r.L; d += 12) { const q = routePos(r, d); if (Math.hypot(p.x - q[0], p.y - q[1]) < 16) { hit = true; break; } } if (hit) { FLD.sel = r.id; if (FLD.st === 'done') floodReset(); Sound.tick(); return false; } }
        return false;
      }
      const P = dragScene();
      if (!P) return false;
      const list = sc === 'bag' ? BG.z : P.z;
      const c = hitItem(list, p);
      if (!c) return false;
      ptr = { c, P, ox: p.x - c.x, oy: p.y - c.y, x0: p.x, y0: p.y, t0: performance.now() };
      c.drag = true; if (c.tw) c.tw.cancel();
      list.splice(list.indexOf(c), 1); list.push(c);
      Sound.tick();
      return true;
    },
    move(p) {
      if (!ptr) return;
      const c = ptr.c;
      c.x = clamp(p.x - ptr.ox, 2, 800 - c.w - 2); c.y = clamp(p.y - ptr.oy, 2, 540 - c.h - 2);
      if (S.scene === 'order') ORD.over = slotAtCenter(ORD.slots, c);
      else if (/^p/.test(S.scene) && PS[S.scene]) { const i = slotAtCenter(PS[S.scene].slots, c); PS[S.scene].over = i >= 0 ? i : null; }
    },
    up(p) {
      if (!ptr) return;
      const c = ptr.c, moved = Math.hypot(p.x - ptr.x0, p.y - ptr.y0), tap = moved < 8;
      c.drag = false;
      const sc = S.scene;
      if (sc === 'bag') {
        BG.sel = c;
        if (tap) bagSet(c, !c.inb);
        else {
          const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
          const inBox = cx >= BAGBOX.x && cx <= BAGBOX.x + BAGBOX.w && cy >= BAGBOX.y && cy <= BAGBOX.y + BAGBOX.h;
          bagSet(c, inBox);
        }
        bagLayout();
      } else if (sc === 'order') {
        ORD.over = -1;
        const i = tap ? -1 : slotAtCenter(ORD.slots, c);
        if (c.slot >= 0) { ORD.slots[c.slot].c = null; }
        const prev = c.slot; c.slot = -1;
        if (i >= 0) {
          const occ = ORD.slots[i].c;
          if (occ) { occ.slot = prev >= 0 ? prev : -1; if (prev >= 0) ORD.slots[prev].c = occ; else occ.slot = -1; }
          ORD.slots[i].c = c; c.slot = i; ORD.warned.delete(c.id); if (occ) ORD.warned.delete(occ.id);
          fx.burst(ORD.slots[i].x + OW / 2, ORD.slots[i].y + OH / 2, { count: 8, speed: 90, life: 0.45, size: 3, colors: ['#2563eb', '#fff'] });
        } else if (tap && prev < 0) {
          const j = ORD.slots.findIndex((s) => !s.c);
          if (j >= 0) { ORD.slots[j].c = c; c.slot = j; }
        }
        orderLayout();
      } else if (PS[sc]) {
        const P = PS[sc]; P.over = null;
        const i = tap ? -1 : slotAtCenter(P.slots, c);
        const prev = c.slot;
        if (c.slot >= 0) P.slots[c.slot].c = null;
        c.slot = -1;
        if (i >= 0) {
          const occ = P.slots[i].c;
          if (occ) { if (prev >= 0) { P.slots[prev].c = occ; occ.slot = prev; } else occ.slot = -1; }
          P.slots[i].c = c; c.slot = i; P.warned.delete(c.id); if (occ) P.warned.delete(occ.id);
          fx.burst(P.slots[i].x + SLW / 2, P.slots[i].y + SLH / 2, { count: 8, speed: 90, life: 0.45, size: 3, colors: [POSTER[sc].color, '#fff'] });
        } else if (tap && prev < 0) {
          const j = P.slots.findIndex((s) => !s.c);
          if (j >= 0) { P.slots[j].c = c; c.slot = j; }
        }
        posterLayout(sc);
      }
      ptr = null;
    },
    hover(p) {
      const sc = S.scene;
      if (sc === 'home') { return Object.keys(HZ).some((k) => p.x >= HZ[k].x && p.x <= HZ[k].x + HZ[k].w && p.y >= HZ[k].y && p.y <= HZ[k].y + HZ[k].h) ? 'pointer' : 'default'; }
      if (sc === 'evac') return ESH.some((s) => Math.hypot(p.x - s.x, p.y - s.y) < 36) ? 'pointer' : 'default';
      const P = dragScene();
      if (P && hitItem(sc === 'bag' ? BG.z : P.z, p)) return 'grab';
      return 'default';
    },
  });

  /* ---------- 읽기 값 ---------- */
  const roC = {};
  function setRO(i, label, html) {
    if (roC['l' + i] !== label) { roC['l' + i] = label; $('#rl' + i).textContent = label; }
    if (roC['v' + i] !== html) { roC['v' + i] = html; $('#rv' + i).innerHTML = html; }
  }
  let lastUI = 0;
  function readouts(t) {
    if (t - lastUI < 0.1) return; lastUI = t;
    switch (S.scene) {
      case 'home':
        setRO(1, '찾은 위험 요소', HM.found.size + '<small>/ 3곳</small>'); setRO(2, '살펴본 곳', HM.looked.size + '<small>/ 6곳</small>'); setRO(3, '고친 곳', HM.found.size + '<small>곳</small>'); break;
      case 'bag': {
        const n = BG.items.filter((c) => c.inb).length, miss = BG.items.filter((c) => c.ess && !c.inb).length;
        setRO(1, '가방 무게 (6 kg까지)', bagWeight().toFixed(1) + '<small>kg</small>'); setRO(2, '담은 물건', n + '<small>개</small>'); setRO(3, '빠진 필수품', miss + '<small>개</small>'); break;
      }
      case 'fire':
        setRO(1, '대피 자세', FR.posture ? '낮은 자세' : '서서 걷기'); setRO(2, '연기를 마신 정도', Math.round(FR.expA) + '<small>/ 100</small>'); setRO(3, '젖은 수건', FR.towel ? '쓰는 중' : '안 씀'); break;
      case 'evac': {
        const s = ESH.find((q) => q.id === EV.sel);
        setRO(1, '고른 대피 장소', s ? s.name : '아직 안 골랐어요'); setRO(2, '높이', s ? s.tag.split(' · ')[0] : '-'); setRO(3, '바람 기준', s ? s.tag.split(' · ')[1].replace('바람이 ', '').replace('바람의 ', '') : '-'); break;
      }
      case 'shake':
        setRO(1, '진동 세기', SK.I + '<small>/ 10 (예시)</small>'); setRO(2, '진동 상태', SK.st === 'run' ? '흔들리는 중' : SK.done ? '끝났어요' : '대기'); setRO(3, '살펴본 횟수', SK.ran + '<small>번</small>'); break;
      case 'order': {
        const n = ORD.slots.filter((s) => s.c).length;
        setRO(1, '채운 칸', n + '<small>/ 4칸</small>'); setRO(2, '남은 카드', (5 - n) + '<small>장</small>'); setRO(3, '엘리베이터 카드', ORD.cards[0].slot >= 0 ? '순서에 넣었어요' : '남겨 뒀어요'); break;
      }
      case 'flood': {
        const r = FRT.find((q) => q.id === FLD.sel);
        setRO(1, '고른 경로', r ? r.name : '아직 안 골랐어요'); setRO(2, '물의 높이', Math.round((FLD.wl - 0.16) / 0.5 * 100) + '<small>%</small>'); setRO(3, '대피 시간', FLD.t.toFixed(1) + '<small>초</small>'); break;
      }
      default: {
        const P = PS[S.scene], n = P.slots.filter((s) => s.c).length, ok = [0, 1, 2].filter((i) => posterColOK(S.scene, i)).length;
        setRO(1, '놓은 카드', n + '<small>/ 6장</small>'); setRO(2, '완성한 칸', ok + '<small>/ 3칸</small>'); setRO(3, '남은 카드', (8 - n) + '<small>장</small>');
      }
    }
  }

  /* =========================================================
     퀴즈 그림 (인라인 SVG)
     ========================================================= */
  const FIG = {
    gas: '<svg viewBox="0 0 320 150" width="320" height="150" role="img" aria-label="부엌: LPG는 아래로 가라앉고 LNG는 위로 올라가는 그림"><rect width="320" height="150" fill="#f8fafc"/>' +
      '<rect x="10" y="12" width="140" height="126" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><rect x="170" y="12" width="140" height="126" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>' +
      '<text x="80" y="30" text-anchor="middle" font-size="13" font-weight="800" fill="#92400e">LPG (프로판)</text><text x="240" y="30" text-anchor="middle" font-size="13" font-weight="800" fill="#1d4ed8">LNG (도시가스)</text>' +
      '<g fill="#eab308"><circle cx="50" cy="118" r="4"/><circle cx="70" cy="122" r="4"/><circle cx="92" cy="119" r="4"/><circle cx="112" cy="123" r="4"/><circle cx="60" cy="108" r="4"/><circle cx="100" cy="109" r="4"/></g>' +
      '<g fill="#38bdf8"><circle cx="210" cy="48" r="4"/><circle cx="232" cy="44" r="4"/><circle cx="254" cy="49" r="4"/><circle cx="274" cy="45" r="4"/><circle cx="222" cy="58" r="4"/><circle cx="262" cy="59" r="4"/></g>' +
      '<text x="80" y="92" text-anchor="middle" font-size="12.5" font-weight="800" fill="#475569">공기보다 무거워요 ↓</text><text x="240" y="92" text-anchor="middle" font-size="12.5" font-weight="800" fill="#475569">공기보다 가벼워요 ↑</text>' +
      '<text x="160" y="146" text-anchor="middle" font-size="12" font-weight="800" fill="#64748b">경보기를 어디에 달까요?</text></svg>',
    shake: '<svg viewBox="0 0 320 130" width="320" height="130" role="img" aria-label="일반 건물, 내진 설계(기둥과 벽 보강), 면진 설계(고무 받침)"><rect width="320" height="130" fill="#f1f5f9"/>' +
      '<rect x="10" y="108" width="300" height="14" fill="#6b7280"/>' +
      '<rect x="24" y="40" width="64" height="68" fill="#f1e3c8" stroke="#78716c" stroke-width="2"/><text x="56" y="30" text-anchor="middle" font-size="12.5" font-weight="800" fill="#334155">일반</text>' +
      '<rect x="126" y="40" width="64" height="68" fill="#dbe7f6" stroke="#2563eb" stroke-width="4"/><path d="M130 44 L186 104 M186 44 L130 104" stroke="#2563eb" stroke-width="3"/><text x="158" y="30" text-anchor="middle" font-size="12.5" font-weight="800" fill="#334155">내진 설계</text>' +
      '<rect x="228" y="34" width="64" height="62" fill="#e0f2e9" stroke="#34d399" stroke-width="2"/><rect x="232" y="96" width="14" height="12" fill="#374151"/><rect x="252" y="96" width="14" height="12" fill="#374151"/><rect x="272" y="96" width="14" height="12" fill="#374151"/><text x="260" y="24" text-anchor="middle" font-size="12.5" font-weight="800" fill="#334155">면진 설계</text></svg>',
  };
  const summaryFig = (svg) => '<div class="note-fig">' + svg + '</div>';

  /* =========================================================
     미션 (4단계)
     ========================================================= */
  game = SciSim.game({
    simId: 'm3-disaster-response',
    mount: '#game',
    badge: '재난 안전 지킴이',
    homeHref: '../../index.html#g3',
    featureLabels: {
      home: '🏠 집 안 위험 요소 찾기',
      bag: '🎒 무게 제한 비상 가방',
      fire: '🔥 복도 연기와 대피 자세',
      evac: '☣️ 유독 가스 대피 지도',
      shake: '🏢 진동대 (일반 · 내진 · 면진)',
      order: '🪑 지진 행동 순서 카드',
      flood: '🌊 홍수 대피 지도',
      poster: '🪧 안전 홍보 포스터 (지진 · 화재 · 홍수)',
    },
    onFeatures(set) { F = set; segKey = ''; renderSeg(); },
    onMissionStart(m) { if (m.scene) setScene(m.scene); },
    levels: [
      {
        title: '재난이 일어나기 전에 할 수 있는 일', short: '사전 대비', icon: '🎒', phase: '관찰',
        features: ['home', 'bag'],
        intro: '<p class="si-q">❓ 탐구 질문: 재해·재난이 일어나기 전에 미리 할 수 있는 일은 무엇이고, 일어났을 때는 어떤 과학 원리로 몸을 지킬까?</p>' +
          '<p>피해를 줄이려면 일어난 뒤의 <b>대처</b>만이 아니라 <b>사전 예방과 대비</b>도 중요해요. 먼저 우리 집의 <b>위험 요소</b>를 찾아 고치고, 꼭 필요한 물건으로 <b>비상 가방</b>을 꾸려 봐요.</p>',
        setup() { setScene('home'); afterScene(); },
        recap: '재난 피해는 <b>사전 예방과 대비</b>로 줄일 수 있어요. 가구를 고정하고, 무거운 물건은 낮은 곳에 두고, 가스 경보기는 가스에 맞는 곳에 달고, 비상 가방을 미리 챙겨요.',
        summary: '<ul><li><b>사전 예방</b>: 가구·TV를 벽에 고정, 무거운 물건은 낮은 곳에 두기, 가스 경보기는 가스 종류에 맞는 높이에 달기</li>' +
          '<li><b>사전 대비</b>: 비상 가방(물, 비상식량, 손전등, 라디오, 구급약, 마스크, 보조 배터리, 호루라기), 대피 장소 확인, 예방 접종·손 씻기</li>' +
          '<li>비상 가방은 <b>꼭 필요한 물건</b> 위주로, 들고 갈 수 있는 <b>무게</b>를 넘지 않게 꾸린다.</li></ul>',
        missions: [
          {
            id: 'home', title: '집 안 위험 요소 찾기', scene: 'home',
            goal: '집 안을 눌러 위험한 곳 <b>3곳</b>을 찾아 고쳐 봐요. 안전한 곳을 눌러도 까닭을 알려 줘요.',
            hint: '지진이 나면 쓰러지거나 떨어질 수 있는 것, 그리고 LPG 경보기의 높이를 살펴봐요.',
            setup() { homeReset(); },
            check: () => HM.found.size >= 3,
            status: () => chk(HM.found.has('shelf'), '고정 안 된 가구') + ' · ' + chk(HM.found.has('vase'), '높은 곳의 무거운 물건') + ' · ' + chk(HM.found.has('alarm'), '잘못된 위치의 가스 경보기'),
            hold: 0.5,
            explain: '흔들리면 <b>고정되지 않은 가구</b>는 쓰러지고, <b>높은 곳의 무거운 물건</b>은 떨어져 다칠 수 있어요. 또 LPG는 공기보다 <b>무거워서 바닥에 고이므로</b>, 경보기는 바닥 가까이에 달아야 해요. 이런 위험은 일이 생기기 <b>전에</b> 고칠 수 있어요.',
          },
          {
            id: 'bag', title: '비상 가방 꾸리기', scene: 'bag', manual: true,
            goal: '꼭 필요한 물건 <b>8가지</b>를 모두 담되, 가방이 <b>6 kg</b>을 넘지 않게 꾸려요.',
            hint: '물건을 눌러 설명을 읽어 봐요. 노트북·게임기·만화책은 무게도 크고 대피에 꼭 필요하지 않아요.',
            setup() { bagReset(); },
            check: () => bagCheck(),
            explain: '비상 가방에는 <b>물, 비상식량, 손전등, 라디오, 구급약, 마스크, 보조 배터리, 호루라기</b>처럼 대피하는 동안 몸을 지키고 연락할 수 있는 물건을 넣어요. 너무 무거우면 빨리 움직이기 어려우니 <b>무게 제한</b>도 지켜야 해요.',
          },
        ],
      },
      {
        title: '화재와 유독 가스에서 몸 지키기', short: '화재와 유독 가스', icon: '🔥', phase: '실험',
        features: ['fire', 'evac'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 무거운 LPG는 바닥에 고인다는 것처럼, 기체의 <b>밀도</b>에 따라 위험한 높이가 달라진다는 것을 알았어요.</div>' +
          '<p>이번에는 사고가 <b>일어났을 때</b> 과학 원리로 몸을 지키는 방법을 실험해요. <b>연기</b>는 어느 높이에 모이는지, <b>무거운 유독 가스</b>가 퍼질 때는 어디로 피해야 하는지 알아봐요.</p>',
        setup() { setScene('fire'); fireReset(); afterScene(); },
        recap: '뜨거운 연기는 밀도가 작아 <b>천장부터</b> 채우므로 <b>낮은 자세</b>로 계단으로 대피해요. 무거운 유독 가스는 낮은 곳에 고이므로 <b>높은 곳</b>으로, <b>바람이 불어오는 쪽</b>(또는 옆 방향)으로 피해요.',
        summary: '<ul><li><b>화재</b>: 뜨거운 연기는 <b>밀도가 작아 위로</b> 올라가 천장부터 채운다. → <b>젖은 수건으로 코와 입을 막고, 낮은 자세</b>로, <b>엘리베이터 대신 계단</b>으로 대피</li>' +
          '<li><b>가스 경보기</b>: <b>LPG</b>는 공기보다 무거워 <b>바닥 가까이</b>, <b>LNG(도시가스)</b>는 공기보다 가벼워 <b>천장 가까이</b>에 단다.</li>' +
          '<li><b>유독 가스 유출</b>: 공기보다 무거운 가스는 낮은 곳에 고이고 바람을 따라 퍼진다. → <b>높은 곳</b>으로, <b>바람이 불어오는 쪽</b>(또는 바람의 옆 방향)으로 대피</li></ul>' + summaryFig(FIG.gas),
        missions: [
          {
            id: 'fire', title: '연기가 찬 복도에서 대피하기', scene: 'fire',
            goal: '<b>서서 걷기</b>로 한 번, <b>낮은 자세</b>로 한 번 대피해 보고, 연기를 덜 마시는 방법을 찾아요.',
            hint: '자세를 고르고 🏃 대피 시작을 눌러요. 💧 젖은 수건을 함께 쓰면 연기를 덜 마셔요.',
            setup() { fireReset(); FR.triedStand = false; FR.lowOK = false; },
            check: () => FR.triedStand && FR.lowOK,
            status: () => chk(FR.triedStand, '서서 대피해 보기') + ' · ' + chk(FR.lowOK, '낮은 자세로 안전하게 대피') + (FR.st === 'running' ? ' · 연기 <b>' + Math.round(FR.exp) + '</b>' : ''),
            hold: 0.4,
            explain: '불이 나면 뜨거운 연기는 주변 공기보다 <b>밀도가 작아서 위로</b> 올라가 <b>천장부터</b> 차올라요. 서 있으면 머리가 연기층 안에 들어가고, <b>낮은 자세</b>로 가면 비교적 맑은 공기를 마실 수 있어요. 엘리베이터는 멈출 수 있으니 <b>계단</b>으로 대피해요.',
          },
          {
            id: 'evac', title: '유독 가스를 피할 장소 고르기', scene: 'evac',
            goal: '공기보다 무거운 유독 가스가 새고 있어요. <b>안전한 대피 장소</b>를 골라 대피에 성공해요.',
            hint: '바람은 서쪽에서 동쪽으로 불어요. 높은 곳과 바람이 불어오는 쪽을 함께 생각해 봐요.',
            setup() { evacReset(); EV.sel = null; EV.tries = 0; },
            check: () => EV.safe && EV.st === 'done',
            status: () => chk(!!EV.sel, '대피 장소 고르기') + ' · ' + chk(EV.st === 'done' && EV.safe, '안전하게 대피' + (EV.st === 'done' && !EV.safe ? ' (다시 도전해요)' : '')),
            hold: 0.5,
            explain: '무거운 유독 가스는 <b>낮은 곳</b>으로 흘러 고이고 <b>바람을 따라</b> 퍼져요. 그래서 <b>높은 곳</b>으로, 가스가 향하는 쪽의 반대인 <b>바람이 불어오는 쪽</b>(또는 바람의 옆 방향)으로 피해야 해요.',
          },
          {
            type: 'quiz', title: '가스 경보기는 어디에 달까?', figure: FIG.gas, scene: 'home',
            goal: 'LPG는 공기보다 무겁고, LNG(도시가스)는 공기보다 가벼워요. 경보기를 알맞게 단 것은?',
            choices: ['LPG와 LNG 모두 천장 가까이', 'LPG는 바닥 가까이, LNG는 천장 가까이', 'LPG는 천장 가까이, LNG는 바닥 가까이', 'LPG와 LNG 모두 바닥 가까이'],
            answer: 1,
            feedback: ['LPG는 공기보다 무거워 천장까지 올라가지 않고 바닥에 고여요.', '', '반대로 생각했어요. 무거운 기체는 아래로, 가벼운 기체는 위로 가요.', 'LNG는 공기보다 가벼워 위로 올라가요.'],
            explain: '공기보다 <b>무거운 LPG</b>는 바닥에 고이므로 경보기를 <b>바닥 가까이</b>, 공기보다 <b>가벼운 LNG(도시가스)</b>는 위로 올라가므로 <b>천장 가까이</b>에 달아요.',
          },
        ],
      },
      {
        title: '지진과 홍수에서 피해 줄이기', short: '지진과 홍수', icon: '🏢', phase: '탐구',
        features: ['shake', 'order', 'flood'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 연기와 가스는 밀도와 바람, 높이에 따라 위험한 곳이 달라졌어요.</div>' +
          '<p>이번에는 <b>지진</b>과 <b>홍수</b>예요. 진동대에서 <b>일반·내진·면진</b> 건물을 비교하고, 지진이 났을 때의 <b>행동 순서</b>를 익혀요. 또 물이 차오르는 지도에서 <b>안전한 대피 경로</b>를 찾아봐요.</p>',
        setup() { setScene('shake'); shakeReset(); afterScene(); },
        recap: '<b>내진 설계</b>는 기둥·벽을 보강해 흔들림에 버티고, <b>면진 설계</b>는 고무 받침으로 흔들림이 건물에 전달되는 것을 줄여요. 홍수 때는 물이 낮은 곳부터 차오르므로 <b>높은 곳</b>으로 일찍 대피해요.',
        summary: '<ul><li><b>내진 설계</b>: 기둥·벽을 보강해 건물이 흔들림에 <b>버티게</b> 한다.</li>' +
          '<li><b>면진 설계</b>: 건물 아래에 <b>고무 받침</b>을 두어 땅의 흔들림이 건물로 <b>전달되는 것을 줄인다</b>.</li>' +
          '<li><b>지진 행동 순서</b>: 흔들릴 때 탁자 아래에서 머리 보호 → 멈추면 전기·가스를 잠그고 출구 확보 → 계단으로 이동(엘리베이터 ✕) → 넓은 공터로 대피</li>' +
          '<li><b>홍수</b>: 물은 낮은 곳부터 찬다. <b>높은 곳</b>으로 대피하고 <b>지하 공간·하천 가까이</b>는 피한다. 미리 <b>배수구를 정비</b>해 둔다.</li></ul>' + summaryFig(FIG.shake),
        missions: [
          {
            id: 'shake', title: '진동대 위의 세 건물', scene: 'shake',
            goal: '진동 세기를 <b>7 이상</b>으로 맞추고 💥 진동을 시작해, 세 건물의 흔들림과 피해를 끝까지 비교해요.',
            hint: '슬라이더를 오른쪽으로 밀어 7 이상으로 맞춘 뒤 버튼을 눌러요.',
            setup() { shakeReset(); SK.ran = 0; SK.maxI = 0; },
            check: () => SK.maxI >= 7 && SK.done,
            status: () => chk(SK.maxI >= 7, '세기 7 이상으로 진동 (지금 <b>' + SK.I + '</b>)') + ' · ' + chk(SK.done, '끝까지 관찰'),
            hold: 0.4,
            explain: '같은 흔들림에서 <b>일반 건물</b>은 크게 흔들려 피해가 컸고, <b>내진 설계</b>는 기둥·벽 보강으로 버텨 피해가 작았어요. <b>면진 설계</b>는 고무 받침이 흔들림을 줄여 건물이 거의 흔들리지 않았어요.',
          },
          {
            id: 'order', title: '지진이 났을 때 행동 순서', scene: 'order', manual: true,
            goal: '카드를 끌어 행동 순서대로 1~4번 칸에 놓아요. 알맞지 않은 카드는 남겨 둬요.',
            hint: '흔들리는 동안 → 멈춘 뒤 → 이동 → 대피 장소 순서로 생각해 봐요.',
            setup() { orderReset(); },
            check: () => orderCheck(),
            explain: '흔들릴 때는 <b>탁자 아래</b>에서 떨어지는 물건으로부터 머리를 보호해요. 멈추면 <b>전기·가스를 잠그고 출구를 확보</b>한 뒤 <b>계단</b>으로 이동해요. 엘리베이터는 멈출 수 있어 쓰지 않아요. 마지막으로 건물·담장에서 먼 <b>넓은 공터</b>로 대피해요.',
          },
          {
            id: 'flood', title: '홍수가 났을 때 안전한 길', scene: 'flood',
            goal: '비가 많이 와서 물이 차올라요. 세 가지 <b>대피 경로</b> 중 안전한 길을 골라 대피에 성공해요.',
            hint: '물은 낮은 곳부터 차올라요. 오른쪽 위의 단면 그림을 보며 높이를 생각해 봐요.',
            setup() { floodReset(); FLD.sel = null; },
            check: () => FLD.safe && FLD.st === 'done',
            status: () => chk(!!FLD.sel, '대피 경로 고르기') + ' · ' + chk(FLD.st === 'done' && FLD.safe, '안전하게 대피' + (FLD.st === 'done' && !FLD.safe ? ' (다시 도전해요)' : '')),
            hold: 0.5,
            explain: '물은 <b>낮은 곳</b>으로 흘러 낮은 곳부터 차올라요. <b>하천 둑길</b>과 <b>지하차도</b> 같은 낮은 곳은 가장 먼저 물에 잠겨요. <b>높은 곳</b>으로 일찍 대피하고, 평소에 배수구를 정비해 물이 잘 빠지게 하면 피해를 줄여요.',
          },
          {
            type: 'quiz', title: '면진 설계가 안전한 까닭', figure: FIG.shake, scene: 'shake',
            goal: '면진 설계를 한 건물이 흔들림에 강한 까닭으로 옳은 것은?',
            choices: ['건물을 땅속 깊이 묻었기 때문이다', '고무 받침이 땅의 흔들림이 건물로 전달되는 것을 줄여 주기 때문이다', '기둥과 벽을 보강해 흔들림을 몸으로 버티기 때문이다', '건물 안에 사람이 없으면 흔들리지 않기 때문이다'],
            answer: 1,
            feedback: ['면진 설계는 건물을 묻는 것이 아니라, 건물 아래에 받침을 두는 방식이에요.', '', '그것은 내진 설계예요. 면진은 흔들림이 전달되는 것을 줄이는 방식이에요.', '사람의 유무와 건물의 흔들림은 관계가 없어요.'],
            explain: '<b>면진 설계</b>는 건물 아래의 <b>고무 받침</b>이 땅의 흔들림이 건물로 전달되는 것을 줄여 줘요. <b>내진 설계</b>는 기둥·벽을 보강해 흔들림에 <b>버티는</b> 방식이에요.',
          },
        ],
      },
      {
        title: '안전 홍보 포스터 만들기', short: '안전 홍보', icon: '🪧', phase: '적용',
        features: ['poster'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화재·유독 가스·지진·홍수에서 과학 원리를 이용해 몸을 지키는 방법을 배웠어요.</div>' +
          '<p>이제 배운 내용을 <b>안전 홍보 포스터</b>로 만들어 봐요. 재해 하나를 골라 <b>예방</b>(일어나기 전에 줄이기), <b>대비</b>(미리 준비하기), <b>대처</b>(일어났을 때 행동) 칸에 <b>과학 원리가 맞는 문장 카드</b>를 넣어요.</p>',
        setup() { setScene('pquake'); afterScene(); },
        recap: '재난 피해를 줄이려면 <b>대처</b>만이 아니라 <b>사전 예방과 대비</b>가 함께 필요해요. 행동마다 <b>과학 원리</b>가 있어서, 원리를 알면 상황이 달라져도 올바르게 행동할 수 있어요.',
        summary: '<ul><li><b>예방</b>(일어나기 전에 줄이기) · <b>대비</b>(미리 준비하기) · <b>대처</b>(일어났을 때 행동)를 함께 갖추면 피해가 줄어든다.</li>' +
          '<li>지진: 가구 고정·내진 설계(예방) / 비상 가방·훈련(대비) / 탁자 아래·계단·공터(대처)</li>' +
          '<li>화재: 과열 방지·가스 밸브 잠금(예방) / 소화기·경보기 위치(대비) / 낮은 자세·젖은 수건·계단(대처)</li>' +
          '<li>홍수: 배수구 정비(예방) / 대피 장소 확인·재난 문자(대비) / 높은 곳으로 대피·지하 피하기(대처)</li></ul>',
        missions: [
          {
            id: 'poster', title: '안전 홍보 포스터 완성하기', scene: 'pquake', manual: true,
            goal: '재해 하나를 골라 <b>예방·대비·대처</b> 칸에 문장 카드를 알맞게 놓아 포스터를 완성해요. 틀린 카드는 남겨 둬요.',
            hint: '위쪽 버튼으로 지진·화재·홍수 중 하나를 골라요. 엘리베이터를 타거나 위험한 곳으로 가는 카드는 쓰지 않아요.',
            setup() { ['pquake', 'pfire', 'pflood'].forEach(posterReset); },
            check() {
              const k = /^p/.test(S.scene) && PS[S.scene] ? S.scene : 'pquake';
              return posterCheck(k);
            },
            explain: '좋은 안전 포스터는 <b>예방·대비·대처</b>가 모두 들어 있고, 행동마다 <b>과학 원리</b>가 있어요. 연기는 위로 모이니 낮은 자세, 무거운 가스는 낮은 곳에 고이니 높은 곳, 물은 낮은 곳부터 차니 높은 곳으로 대피해요.',
          },
          {
            type: 'quiz', title: '예방·대비와 사후 대처 구분하기', scene: 'pquake',
            goal: '다음 중 재난이 일어나기 <b>전에</b> 하는 예방·대비에 해당하는 것은?',
            choices: ['흔들릴 때 탁자 아래로 들어간다', '비상 가방을 챙기고 가구를 벽에 고정해 둔다', '연기가 나면 낮은 자세로 대피한다', '물이 차오르면 높은 곳으로 대피한다'],
            answer: 1,
            feedback: ['그것은 지진이 일어났을 때의 대처예요.', '', '연기가 난 뒤에 하는 대처예요.', '홍수가 난 뒤에 하는 대처예요.'],
            explain: '<b>예방·대비</b>는 일이 일어나기 <b>전에</b>(가구 고정, 비상 가방, 대피 장소 확인) 하는 일이고, 나머지는 일이 일어난 뒤의 <b>대처</b>예요. 피해를 줄이려면 둘 다 필요해요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  homeReset(); bagLayout(); orderLayout();
  Object.keys(PS).forEach((k) => posterLayout(k));
  afterScene();
  window.__sim = {
    S, HM, HZ, BG, FR, EV, ESH, SK, ORD, FLD, FRT, PS, POSTER, game: () => game,
    setScene, fireGo, evacGo, floodGo, shakeGo, evPhys, FH, routePos, bagSet, bagLayout, bagWeight, homeTap,
    unlockAll() { ['home', 'bag', 'fire', 'evac', 'shake', 'order', 'flood', 'poster'].forEach((f) => F.add(f)); },
    evacRun(id, secs) { evacReset(); EV.sel = id; evacGo(); const n = Math.round(secs / 0.05); for (let i = 0; i < n; i++) evacStep(0.05); return { peaks: Object.assign({}, EV.peaks), exp: EV.exp, shPeak: EV.shPeak, safe: EV.safe, msg: EV.msg, st: EV.st }; },
    floodRun(id) { floodReset(); FLD.sel = id; floodGo(); let g = 0; while (FLD.st === 'run' && g++ < 4000) floodStep(0.05); return { st: FLD.st, safe: FLD.safe, t: FLD.t, dist: FLD.dist, msg: FLD.msg }; },
    fireRun(low, towel) { setPosture(low); setTowel(towel); fireReset(); fireGo(); let g = 0; while (FR.st === 'running' && g++ < 4000) fireStep(0.05); return { st: FR.st, exp: FR.exp, t: FR.t }; },
    shakeNow(I) { SK.I = I; $('#sInt').value = I; shakeGo(); },
    solvePoster(k) { const P = PS[k]; const need = { 0: [], 1: [], 2: [] }; P.cards.forEach((c) => { if (c.kind !== 'x') need[COLN[c.kind]].push(c); }); P.slots.forEach((s) => { if (s.c) { s.c.slot = -1; s.c = null; } }); P.slots.forEach((s) => { const c = need[s.col].shift(); s.c = c; c.slot = P.slots.indexOf(s); }); posterLayout(k); },
    solveOrder() { ORD.slots.forEach((s) => { if (s.c) { s.c.slot = -1; s.c = null; } }); ORD.cards.filter((c) => c.order >= 1 && c.order <= 4).forEach((c) => { c.slot = c.order - 1; ORD.slots[c.slot].c = c; }); orderLayout(); },
    packBag() { BG.items.filter((c) => c.ess).forEach((c) => bagSet(c, true)); },
  };
  SciSim.loop((dt, t) => {
    S.t = t;
    const ph = game ? game.phase : '';
    if (ph === 'success' && S.ph !== 'success') { S.okAt = t; fx.burst(748, 38, { count: 28, speed: 210 }); }
    S.ph = ph;
    fx.update(dt);
    if (STEPF[S.scene]) STEPF[S.scene](dt);
    view.clear('#f1f5f9');
    DRAW[S.scene]();
    if (S.tr < 1 && S.hasSnap) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 - S.tr;
      ctx.drawImage(snap, 0, 0, view.canvas.width, view.canvas.height); ctx.restore();
    }
    fx.draw(ctx);
    const k = t - S.okAt;
    if (k >= 0 && k < 1.6) { ctx.save(); ctx.globalAlpha = 1 - sstep(1.1, 1.6, k); D.check(748, 38, 22 * SciSim.ease.outBack(Math.min(1, k / 0.4)), Math.min(1, k / 0.45)); ctx.restore(); }
    readouts(t);
    if (game) renderSeg();
  });
})();
