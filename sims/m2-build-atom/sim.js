/* =========================================================
   중2 Ⅳ. 물질의 구성 - 원자·이온 공방
   원자의 구조(원자핵의 (+)전하, 전자의 (−)전하, 전기적 중성)
   원소와 원소 기호(양성자 수로 결정), 이온의 형성과 이온식·이름
   ========================================================= */
(function () {
  'use strict';
  const { $, clamp, lerp, Sound, toast } = SciSim;

  /* ---------- 원소 자료 ---------- */
  const ELEMENTS = [null,
    ['H', '수소'], ['He', '헬륨'], ['Li', '리튬'], ['Be', '베릴륨'], ['B', '붕소'],
    ['C', '탄소'], ['N', '질소'], ['O', '산소'], ['F', '플루오린'], ['Ne', '네온'],
    ['Na', '나트륨'], ['Mg', '마그네슘'], ['Al', '알루미늄'], ['Si', '규소'], ['P', '인'],
    ['S', '황'], ['Cl', '염소'], ['Ar', '아르곤'], ['K', '칼륨'], ['Ca', '칼슘'],
  ];
  // 이 단원에서 다루는 이온 (이온식 → 이름)
  const KNOWN_IONS = {
    'H+1': '수소 이온', 'Li+1': '리튬 이온', 'Na+1': '나트륨 이온', 'K+1': '칼륨 이온',
    'Mg+2': '마그네슘 이온', 'Ca+2': '칼슘 이온', 'Al+3': '알루미늄 이온',
    'F-1': '플루오린화 이온', 'Cl-1': '염화 이온', 'O-2': '산화 이온', 'S-2': '황화 이온',
  };
  const MAX_P = 20, MAX_E = 22;
  const MINUS = '−';

  function chargeSup(q) {
    if (!q) return '';
    const n = Math.abs(q);
    return (n === 1 ? '' : String(n)) + (q > 0 ? '+' : MINUS);
  }
  function signed(q) { return q > 0 ? '+' + q : q < 0 ? MINUS + (-q) : '0'; }
  // 받침에 따라 '이에요/예요'
  function iyeyo(word) {
    const c = word.charCodeAt(word.length - 1);
    const batchim = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
    return word + (batchim ? '이에요' : '예요');
  }
  function formulaHTML(sym, q) { return sym + (q ? '<sup>' + chargeSup(q) + '</sup>' : ''); }

  function identify(p, e) {
    const el = ELEMENTS[clamp(p, 1, MAX_P)];
    const q = p - e;
    const kind = q === 0 ? 'atom' : q > 0 ? 'cation' : 'anion';
    const key = el[0] + (q > 0 ? '+' : '-') + Math.abs(q);
    const ionName = q === 0 ? null : (KNOWN_IONS[key] || null);
    return { p, e, q, sym: el[0], name: el[1], kind, ionName, known: q === 0 || !!ionName };
  }
  function fullName(id) { return id.q === 0 ? id.name + ' 원자' : (id.ionName || '이 단원에서 다루지 않는 이온'); }

  const KIND = {
    atom: { c: '#14a058', soft: '#e2f6eb', band: '원자 · 전기적으로 중성', short: '원자(중성)' },
    cation: { c: '#e2464b', soft: '#fde9e9', band: '양이온 · (+)전하', short: '양이온' },
    anion: { c: '#3867f4', soft: '#e7eeff', band: '음이온 · (−)전하', short: '음이온' },
  };

  /* ---------- 배치(가상 좌표 800 x 520) ---------- */
  const C = { x: 372, y: 262 };              // 원자 중심
  const SHELL_R = [70, 108, 146, 182];       // 전자 껍질(그림 배치용)
  const SHELL_CAP = [2, 8, 8, 4];
  const SHELL_SPEED = [0.55, 0.36, 0.26, 0.2];
  const SHELL_OFF = [-Math.PI / 2, -Math.PI / 2 + 0.2, -Math.PI / 2 + 0.45, -Math.PI / 4];
  const ATOM_R = 206;                        // 이 안에 놓으면 원자에 들어감
  const PR = 10, ER = 10;                    // 입자 반지름
  const PBIN = { x: 16, y: 60, w: 132, h: 168 };
  const EBIN = { x: 16, y: 284, w: 132, h: 168 };
  const CARD1 = { x: 598, y: 14, w: 188, h: 246 };
  const CARD2 = { x: 598, y: 272, w: 188, h: 234 };
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const COL = { p: '#e2464b', e: '#3867f4', good: '#14a058', ink: '#1b2333', muted: '#5d6879', line: '#dde4ef', warn: '#f26b3a' };

  /* ---------- 상태 ---------- */
  const S = {
    protons: [],      // {hx,hy: 원자핵 안 자리, x,y, sx,sy, t, dur, fresh}
    electrons: [],    // {x,y, sx,sy, t, dur, fresh, key}
    drag: null,       // {kind:'p'|'e', from:'bin'|'atom', x, y}
    flying: [],       // 상자로 돌아가는 입자
    pulses: [],       // 자리에 들어갈 때 퍼지는 고리
    phase: [0, 0, 0, 0],
    orbit: true,
    target: null,     // {p, e}
    needle: 0,
    ringR: 120,
    lastP: 1, lastE: 1,
    banner: null,     // {text, color, t0}
    idFlash: null,    // {kind:'element'|'same', t0}
    hinted: false,
    time: 0,
  };

  const np = () => S.protons.length + (S.drag && S.drag.from === 'atom' && S.drag.kind === 'p' ? 1 : 0);
  const ne = () => S.electrons.length + (S.drag && S.drag.from === 'atom' && S.drag.kind === 'e' ? 1 : 0);

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: 800, height: 520 });
  const ctx = view.ctx;

  /* ---------- 원자핵 속 양성자 배치 (서로 밀어내며 뭉치기) ---------- */
  function relax(iter) {
    const ps = S.protons, minD = PR * 2 * 0.93;
    for (let k = 0; k < iter; k++) {
      for (let i = 0; i < ps.length; i++) { ps[i].hx *= 0.96; ps[i].hy *= 0.96; }
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const a = ps[i], b = ps[j];
          let dx = b.hx - a.hx, dy = b.hy - a.hy, d = Math.hypot(dx, dy);
          if (d < 1e-3) { const ang = (i * 2.4 + j) % (Math.PI * 2); dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
          if (d < minD) {
            const push = (minD - d) / 2, ux = dx / d, uy = dy / d;
            a.hx -= ux * push; a.hy -= uy * push; b.hx += ux * push; b.hy += uy * push;
          }
        }
      }
    }
  }
  function nucleusR() {
    let r = 0;
    S.protons.forEach((p) => { r = Math.max(r, Math.hypot(p.hx, p.hy)); });
    return r + PR;
  }
  function newProton(x, y, fresh) {
    const ang = Math.random() * Math.PI * 2, r = S.protons.length ? nucleusR() : 0;
    return { hx: Math.cos(ang) * r, hy: Math.sin(ang) * r, x, y, sx: x, sy: y, t: fresh ? 0 : 1, dur: 0.38, fresh: !!fresh };
  }
  function newElectron(x, y, fresh) {
    return { x, y, sx: x, sy: y, t: fresh ? 0 : 1, dur: 0.38, fresh: !!fresh, key: null };
  }

  /* ---------- 전자 자리 (2, 8, 8 … 그림 배치) ---------- */
  function shellOf(i) {
    let k = 0, start = 0;
    while (k < SHELL_CAP.length - 1 && i >= start + SHELL_CAP[k]) { start += SHELL_CAP[k]; k++; }
    return { k, start };
  }
  function slot(i, n) {
    const { k, start } = shellOf(i);
    const count = k === SHELL_CAP.length - 1 ? n - start : Math.min(SHELL_CAP[k], n - start);
    const a = S.phase[k] + SHELL_OFF[k] + (Math.PI * 2 * (i - start)) / count;
    return { k, x: C.x + Math.cos(a) * SHELL_R[k], y: C.y + Math.sin(a) * SHELL_R[k], key: k + ':' + (i - start) + ':' + count };
  }
  function shellsUsed(n) { return n <= 0 ? 0 : shellOf(n - 1).k + 1; }
  function outerR() {
    const n = ne();
    return n ? SHELL_R[shellsUsed(n) - 1] + ER : Math.max(nucleusR(), 24) + 18;
  }

  /* ---------- 상태 바꾸기 ---------- */
  function setState(p, e) {
    S.drag = null; S.flying = []; S.pulses = [];
    S.protons = []; S.electrons = [];
    for (let i = 0; i < p; i++) {
      const ang = i * 2.39996, r = 9 * Math.sqrt(i);
      S.protons.push({ hx: Math.cos(ang) * r, hy: Math.sin(ang) * r, x: C.x, y: C.y, sx: C.x, sy: C.y, t: 1, dur: 0.3, fresh: false });
    }
    relax(80);
    S.protons.forEach((q) => { q.x = C.x + q.hx; q.y = C.y + q.hy; });
    for (let i = 0; i < e; i++) {
      const s = slot(i, e);
      const el = newElectron(s.x, s.y, false); el.key = s.key;
      S.electrons.push(el);
    }
    S.lastP = p; S.lastE = e;
    S.banner = null; S.idFlash = null;
    S.needle = p - e;
    S.ringR = outerR() + 18;
    updateUI(true);
  }

  function binCenter(kind) { const b = kind === 'p' ? PBIN : EBIN; return { x: b.x + b.w / 2, y: b.y + 110 }; }
  function inRect(p, b) { return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }
  function inAtom(p) { return Math.hypot(p.x - C.x, p.y - C.y) <= ATOM_R && !inRect(p, PBIN) && !inRect(p, EBIN); }

  function addParticle(kind, x, y) {
    if (kind === 'p') S.protons.push(newProton(x, y, true));
    else S.electrons.push(newElectron(x, y, true));
    Sound.tone(kind === 'p' ? 520 : 760, 0.06, 'triangle', 0.07);
  }
  function flyToBin(kind, x, y) {
    const b = binCenter(kind);
    S.flying.push({ kind, x0: x, y0: y, x1: b.x, y1: b.y - 20, t: 0 });
  }
  function hideHint() { if (!S.hinted) { S.hinted = true; $('#stageHint').classList.add('hide'); } }

  // 버튼으로 넣기/빼기
  function plus(kind) {
    hideHint();
    if (kind === 'p' && np() >= MAX_P) { toast('양성자는 ' + MAX_P + '개까지 넣을 수 있어요 (칼슘까지)'); return; }
    if (kind === 'e' && ne() >= MAX_E) { toast('전자는 ' + MAX_E + '개까지 넣을 수 있어요'); return; }
    const b = binCenter(kind);
    addParticle(kind, b.x, b.y - 20);
  }
  function minus(kind) {
    hideHint();
    if (kind === 'p') {
      if (np() <= 1) { toast('원자핵에는 양성자가 1개 이상 있어야 해요'); return; }
      // 가장 바깥쪽 양성자를 뺀다
      let bi = 0, bd = -1;
      S.protons.forEach((q, i) => { const d = Math.hypot(q.hx, q.hy); if (d > bd) { bd = d; bi = i; } });
      const q = S.protons.splice(bi, 1)[0];
      flyToBin('p', q.x, q.y);
    } else {
      if (ne() <= 0) { toast('뺄 전자가 없어요'); return; }
      const el = S.electrons.pop();   // 가장 바깥 전자
      flyToBin('e', el.x, el.y);
    }
    Sound.tone(330, 0.07, 'triangle', 0.06);
  }

  /* ---------- 끌기 ---------- */
  function hitElectron(p) {
    let best = -1, bd = 22;
    S.electrons.forEach((el, i) => { const d = Math.hypot(el.x - p.x, el.y - p.y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function hitProton(p) {
    if (Math.hypot(p.x - C.x, p.y - C.y) > nucleusR() + 10) return -1;
    let best = -1, bd = Infinity;
    S.protons.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = i; } });
    return best;
  }

  SciSim.pointer(view, {
    hover(p) {
      if (inRect(p, PBIN) || inRect(p, EBIN) || hitElectron(p) >= 0 || hitProton(p) >= 0) return 'grab';
      return null;
    },
    down(p) {
      if (S.flying.length > 30) S.flying = [];
      if (inRect(p, PBIN) || inRect(p, EBIN)) {
        const kind = inRect(p, PBIN) ? 'p' : 'e';
        if (kind === 'p' && np() >= MAX_P) { toast('양성자는 ' + MAX_P + '개까지 넣을 수 있어요 (칼슘까지)'); return false; }
        if (kind === 'e' && ne() >= MAX_E) { toast('전자는 ' + MAX_E + '개까지 넣을 수 있어요'); return false; }
        S.drag = { kind, from: 'bin', x: p.x, y: p.y };
      } else {
        const ei = hitElectron(p);
        if (ei >= 0) {
          S.electrons.splice(ei, 1);
          S.drag = { kind: 'e', from: 'atom', x: p.x, y: p.y };
        } else {
          const pi = hitProton(p);
          if (pi < 0) return false;
          if (S.protons.length <= 1) { toast('원자핵에는 양성자가 1개 이상 있어야 해요'); return false; }
          S.protons.splice(pi, 1);
          S.drag = { kind: 'p', from: 'atom', x: p.x, y: p.y };
        }
      }
      hideHint();
      $('#cv').style.cursor = 'grabbing';
      Sound.tone(440, 0.04, 'triangle', 0.05);
      return true;
    },
    move(p) { if (S.drag) { S.drag.x = p.x; S.drag.y = p.y; } },
    up(p) {
      const d = S.drag;
      if (!d) return;
      S.drag = null;
      $('#cv').style.cursor = 'grab';
      const pt = { x: clamp(p.x, 0, 800), y: clamp(p.y, 0, 520) };
      if (inAtom(pt)) {
        addParticle(d.kind, pt.x, pt.y);         // 원자 안에 놓음 → 들어감 (또는 제자리로)
      } else {
        flyToBin(d.kind, pt.x, pt.y);            // 밖에 놓음 → 상자로 (빼기 / 취소)
        if (d.from === 'atom') Sound.tone(330, 0.07, 'triangle', 0.06);
      }
    },
  });

  /* ---------- 갱신 ---------- */
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  function step(dt) {
    S.time += dt;
    if (S.orbit) for (let k = 0; k < 4; k++) S.phase[k] += SHELL_SPEED[k] * dt;

    relax(3);
    S.protons.forEach((q, i) => {
      const wob = 0.6 * Math.sin(S.time * 2.2 + i * 1.7);
      const tx = C.x + q.hx + wob, ty = C.y + q.hy + 0.6 * Math.cos(S.time * 1.9 + i);
      q.t = Math.min(1, q.t + dt / q.dur);
      const k = ease(q.t);
      q.x = lerp(q.sx, tx, k); q.y = lerp(q.sy, ty, k);
      if (q.fresh && q.t >= 1) { q.fresh = false; snapFx(q.x, q.y, COL.p); }
    });

    const n = S.electrons.length;
    S.electrons.forEach((el, i) => {
      const s = slot(i, n);
      if (el.key !== s.key) {
        if (el.key !== null) { el.sx = el.x; el.sy = el.y; el.t = 0; el.dur = 0.32; }
        el.key = s.key;
      }
      el.t = Math.min(1, el.t + dt / el.dur);
      const k = ease(el.t);
      el.x = lerp(el.sx, s.x, k); el.y = lerp(el.sy, s.y, k);
      if (el.fresh && el.t >= 1) { el.fresh = false; snapFx(el.x, el.y, COL.e); }
    });

    S.flying.forEach((f) => { f.t += dt / 0.35; });
    S.flying = S.flying.filter((f) => f.t < 1);
    S.pulses.forEach((pl) => { pl.t += dt / 0.45; });
    S.pulses = S.pulses.filter((pl) => pl.t < 1);

    const p = np(), e = ne(), q = p - e;
    S.needle += (q - S.needle) * Math.min(1, dt * 7);
    S.ringR += (outerR() + 18 - S.ringR) * Math.min(1, dt * 6);

    if (p !== S.lastP || e !== S.lastE) {
      onCountsChanged(S.lastP, S.lastE, p, e);
      S.lastP = p; S.lastE = e;
    }
  }
  function snapFx(x, y, color) {
    S.pulses.push({ x, y, color, t: 0 });
    Sound.tick();
  }

  function onCountsChanged(p0, e0, p1, e1) {
    const a = identify(p0, e0), b = identify(p1, e1);
    const now = S.time;
    if (p0 !== p1) {
      S.banner = { text: '✨ 양성자 수가 바뀌어 원소가 바뀌었어요: ' + a.name + ' → ' + b.name, color: COL.warn, t0: now };
      S.idFlash = { kind: 'element', t0: now };
    } else {
      S.banner = { text: '🔒 전자 수만 바뀌었어요 → 원소는 그대로 ‘' + b.name + '’', color: COL.good, t0: now };
      S.idFlash = { kind: 'same', t0: now };
    }
    updateUI();
  }

  /* ---------- 그리기 도우미 ---------- */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function font(size, bold) { return (bold ? 'bold ' : '') + size + 'px ' + FONT; }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function drawBall(x, y, kind, scale, alpha) {
    const r = (kind === 'p' ? PR : ER) * (scale || 1);
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (kind === 'p') { g.addColorStop(0, '#ffb6b6'); g.addColorStop(0.55, '#e2464b'); g.addColorStop(1, '#a8222a'); }
    else { g.addColorStop(0, '#b8d0ff'); g.addColorStop(0.55, '#3867f4'); g.addColorStop(1, '#1f3fa8'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = font(Math.round(15 * (scale || 1)), true);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(kind === 'p' ? '+' : MINUS, x, y + 1);
    ctx.restore();
  }

  // 원소 기호 + 위첨자 전하. x: 가운데, y: 기준선
  function formulaWidth(sym, q, size) {
    ctx.font = font(size, true);
    let w = ctx.measureText(sym).width;
    if (q) { ctx.font = font(Math.round(size * 0.52), true); w += size * 0.05 + ctx.measureText(chargeSup(q)).width; }
    return w;
  }
  function drawFormula(sym, q, x, y, size, color, supColor, align) {
    const w = formulaWidth(sym, q, size);
    let left = align === 'left' ? x : x - w / 2;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = font(size, true); ctx.fillStyle = color;
    ctx.fillText(sym, left, y);
    if (q) {
      const sw = ctx.measureText(sym).width;
      ctx.font = font(Math.round(size * 0.52), true); ctx.fillStyle = supColor || color;
      ctx.fillText(chargeSup(q), left + sw + size * 0.05, y - size * 0.42);
    }
    return w;
  }

  /* ---------- 그리기 ---------- */
  function draw() {
    view.clear('#ffffff');
    const p = np(), e = ne(), q = p - e;
    drawAtom(q);
    drawBins();
    drawIdCard(identify(p, e));
    drawMeter(p, e);
    drawTarget(p, e);
    drawBanner();
    // 상자로 돌아가는 입자
    S.flying.forEach((f) => {
      const k = ease(f.t);
      drawBall(lerp(f.x0, f.x1, k), lerp(f.y0, f.y1, k), f.kind, 1 - 0.3 * k, 1 - f.t * 0.8);
    });
    // 끌고 있는 입자
    if (S.drag) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      drawBall(S.drag.x, S.drag.y, S.drag.kind, 1.3);
      ctx.restore();
    }
  }

  function drawAtom(q) {
    const t = S.time;
    const ringR = S.ringR;
    // 원자 바탕
    const bg = ctx.createRadialGradient(C.x, C.y, 10, C.x, C.y, ringR + 6);
    bg.addColorStop(0, '#f7f9ff'); bg.addColorStop(1, '#eef3fb');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(C.x, C.y, ringR + 6, 0, Math.PI * 2); ctx.fill();

    // 이온 후광: 양이온은 (+) 붉은빛, 음이온은 (−) 푸른빛
    if (q !== 0) {
      const col = q > 0 ? COL.p : COL.e;
      const a = clamp(0.18 + 0.1 * Math.abs(q), 0.18, 0.55);
      const g = ctx.createRadialGradient(C.x, C.y, ringR - 30, C.x, C.y, ringR + 18);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.62, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(C.x, C.y, ringR + 18, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(20,160,88,.35)'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]);
      ctx.beginPath(); ctx.arc(C.x, C.y, ringR, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }

    // 끌기 중: 놓을 곳 표시
    if (S.drag) {
      const intoAtom = S.drag.from === 'bin';
      const col = S.drag.kind === 'p' ? COL.p : COL.e;
      const over = inAtom(S.drag);
      ctx.save();
      ctx.setLineDash([9, 7]);
      ctx.strokeStyle = intoAtom ? rgba(col, over ? 0.9 : 0.5) : 'rgba(93,104,121,.45)';
      ctx.lineWidth = intoAtom && over ? 3 : 2;
      ctx.fillStyle = intoAtom ? rgba(col, over ? 0.07 : 0.03) : 'rgba(0,0,0,0)';
      ctx.beginPath(); ctx.arc(C.x, C.y, ATOM_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      const label = intoAtom ? '이 원 안에 놓으면 쏙!' : '원 밖(상자)으로 끌어내면 빠져요';
      ctx.font = font(13, true);
      const tw = ctx.measureText(label).width + 20;
      const ly = C.y + ATOM_R - 8;
      ctx.fillStyle = intoAtom ? col : '#5d6879';
      roundRect(C.x - tw / 2, ly - 12, tw, 24, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, C.x, ly + 1);
    }

    // 전자 껍질 (그림 배치)
    const used = shellsUsed(S.electrons.length);
    for (let k = 0; k < used; k++) {
      ctx.strokeStyle = 'rgba(56,103,244,.28)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(C.x, C.y, SHELL_R[k], 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);

    // 원자핵
    const nr = nucleusR();
    const ng = ctx.createRadialGradient(C.x, C.y, 2, C.x, C.y, nr + 12);
    ng.addColorStop(0, 'rgba(255,200,200,.65)'); ng.addColorStop(1, 'rgba(255,200,200,0)');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.arc(C.x, C.y, nr + 12, 0, Math.PI * 2); ctx.fill();
    const sorted = S.protons.slice().sort((a, b) => a.y - b.y);
    sorted.forEach((pp) => drawBall(pp.x, pp.y, 'p', pp.t < 1 ? 1.15 - 0.15 * pp.t : 1));

    // 전자
    S.electrons.forEach((el) => drawBall(el.x, el.y, 'e', el.t < 1 ? 1.15 - 0.15 * el.t : 1));

    // 쏙 들어가는 효과
    S.pulses.forEach((pl) => {
      ctx.strokeStyle = rgba(pl.color, (1 - pl.t) * 0.8); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pl.x, pl.y, 10 + pl.t * 18, 0, Math.PI * 2); ctx.stroke();
    });
  }

  function drawBins() {
    [['p', PBIN], ['e', EBIN]].forEach(([kind, b]) => {
      const col = kind === 'p' ? COL.p : COL.e;
      const full = kind === 'p' ? np() >= MAX_P : ne() >= MAX_E;
      const dropHere = S.drag && S.drag.kind === kind && S.drag.from === 'atom';
      const over = dropHere && inRect(S.drag, b);
      ctx.save();
      if (dropHere) { ctx.shadowColor = rgba(col, 0.5); ctx.shadowBlur = over ? 22 : 12; }
      ctx.fillStyle = kind === 'p' ? '#fff3f3' : '#f0f4ff';
      roundRect(b.x, b.y, b.w, b.h, 16); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = rgba(col, dropHere ? 0.95 : 0.35); ctx.lineWidth = dropHere ? 3 : 2;
      if (dropHere) ctx.setLineDash([7, 5]);
      roundRect(b.x, b.y, b.w, b.h, 16); ctx.stroke(); ctx.setLineDash([]);

      const cx = b.x + b.w / 2;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = col; ctx.font = font(17, true);
      ctx.fillText(kind === 'p' ? '양성자 상자' : '전자 상자', cx, b.y + 28);
      ctx.fillStyle = COL.muted; ctx.font = font(14, true);
      ctx.fillText(kind === 'p' ? '(+)전하' : '(−)전하', cx, b.y + 48);
      // 쌓인 입자 더미
      const rows = [[-30, -10, 10, 30], [-20, 0, 20], [-10, 10]];
      rows.forEach((row, ri) => row.forEach((dx) => drawBall(cx + dx, b.y + 124 - ri * 17, kind, 1, full ? 0.3 : 1)));
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = font(14, true);
      ctx.fillStyle = dropHere ? col : COL.muted;
      ctx.fillText(dropHere ? '여기에 놓아 빼기' : full ? '최대 개수예요' : '끌어서 넣기 ▶', cx, b.y + b.h - 14);
    });
  }

  function drawIdCard(id) {
    const c = CARD1, cx = c.x + c.w / 2, K = KIND[id.kind];
    // 카드
    ctx.save(); ctx.shadowColor = 'rgba(20,40,80,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; roundRect(c.x, c.y, c.w, c.h, 14); ctx.fill(); ctx.restore();
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5; roundRect(c.x, c.y, c.w, c.h, 14); ctx.stroke();
    // 띠: 종류
    ctx.save(); roundRect(c.x, c.y, c.w, c.h, 14); ctx.clip();
    ctx.fillStyle = K.c; ctx.fillRect(c.x, c.y, c.w, 34);
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = font(15, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(K.band, cx, c.y + 18);

    // 원소 이름 강조 효과 (원소가 바뀜: 주황 / 그대로: 초록)
    const f = S.idFlash;
    if (f && S.time - f.t0 < 1.6) {
      const a = 1 - (S.time - f.t0) / 1.6;
      const col = f.kind === 'element' ? COL.warn : COL.good;
      ctx.fillStyle = rgba(col, 0.16 * a + 0.04); ctx.strokeStyle = rgba(col, 0.9 * a); ctx.lineWidth = 2.5;
      roundRect(c.x + 10, c.y + 44, c.w - 20, 132, 12); ctx.fill(); ctx.stroke();
    }

    // 원소 기호 + 전하
    let size = 58;
    while (formulaWidth(id.sym, id.q, size) > c.w - 30 && size > 30) size -= 2;
    drawFormula(id.sym, id.q, cx, c.y + 102, size, COL.ink, K.c);
    // 원소 이름
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.ink; ctx.font = font(21, true);
    ctx.fillText(id.name, cx, c.y + 136);
    ctx.fillStyle = COL.muted; ctx.font = font(12.5, true);
    ctx.fillText((f && f.kind === 'same' && S.time - f.t0 < 1.6 ? '🔒 ' : '') + '양성자 ' + id.p + '개인 원소', cx, c.y + 160);

    // 구분선
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c.x + 14, c.y + 184); ctx.lineTo(c.x + c.w - 14, c.y + 184); ctx.stroke();

    // 이름
    if (id.known) {
      ctx.fillStyle = K.c; ctx.font = font(19, true);
      ctx.fillText(id.q === 0 ? id.name + ' 원자' : id.ionName, cx, c.y + 212);
      ctx.fillStyle = COL.muted; ctx.font = font(12.5, true);
      const sub = id.q === 0 ? '전기적으로 중성' : id.q > 0 ? '원자가 전자 ' + id.q + '개를 잃은 상태' : '원자가 전자 ' + (-id.q) + '개를 얻은 상태';
      ctx.fillText(sub, cx, c.y + 233);
    } else {
      ctx.fillStyle = K.c; ctx.font = font(14, true);
      ctx.fillText(id.q > 0 ? '양이온이지만' : '음이온이지만', cx, c.y + 207);
      ctx.fillStyle = COL.muted; ctx.font = font(13, true);
      ctx.fillText('이 단원에서 다루지', cx, c.y + 226);
      ctx.fillText('않는 이온이에요', cx, c.y + 243 - 2);
    }
  }

  function drawMeter(p, e) {
    const c = CARD2, cx = c.x + c.w / 2, q = p - e;
    ctx.save(); ctx.shadowColor = 'rgba(20,40,80,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; roundRect(c.x, c.y, c.w, c.h, 14); ctx.fill(); ctx.restore();
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5; roundRect(c.x, c.y, c.w, c.h, 14); ctx.stroke();

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; ctx.fillStyle = COL.ink; ctx.font = font(15, true);
    ctx.fillText('전체 전하', c.x + 14, c.y + 24);
    ctx.textAlign = 'right'; ctx.fillStyle = COL.muted; ctx.font = font(12, true);
    ctx.fillText('(+)와 (−)의 합', c.x + c.w - 12, c.y + 24);

    // 반원 계기판: 왼쪽 (−), 오른쪽 (+)
    const gx = cx, gy = c.y + 122, r = 64, MAXQ = 4;
    const ang = (v) => Math.PI * 1.5 + (clamp(v, -MAXQ - 0.4, MAXQ + 0.4) / MAXQ) * Math.PI * 0.5;
    ctx.lineCap = 'butt';
    ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(56,103,244,.75)';
    ctx.beginPath(); ctx.arc(gx, gy, r, ang(-MAXQ), ang(-0.25)); ctx.stroke();
    ctx.strokeStyle = 'rgba(226,70,75,.8)';
    ctx.beginPath(); ctx.arc(gx, gy, r, ang(0.25), ang(MAXQ)); ctx.stroke();
    ctx.strokeStyle = COL.good;
    ctx.beginPath(); ctx.arc(gx, gy, r, ang(-0.25), ang(0.25)); ctx.stroke();
    // 눈금
    for (let v = -MAXQ; v <= MAXQ; v++) {
      const a = ang(v);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * (r - 7), gy + Math.sin(a) * (r - 7)); ctx.lineTo(gx + Math.cos(a) * (r + 7), gy + Math.sin(a) * (r + 7)); ctx.stroke();
      if (v % 2 === 0) {
        ctx.fillStyle = v > 0 ? '#c4313a' : v < 0 ? '#2a52d6' : '#0f8a4b';
        ctx.font = font(12.5, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(signed(v), gx + Math.cos(a) * (r + 19), gy + Math.sin(a) * (r + 17));
      }
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.muted; ctx.font = font(12, true); ctx.textAlign = 'center';
    ctx.fillText('음이온', gx - 38, gy + 18);
    ctx.fillText('양이온', gx + 38, gy + 18);
    // 바늘
    const a = ang(S.needle);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * (r - 14), gy + Math.sin(a) * (r - 14)); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(gx, gy, 7, 0, Math.PI * 2); ctx.fill();
    if (Math.abs(q) > MAXQ) {
      ctx.fillStyle = q > 0 ? '#c4313a' : '#2a52d6'; ctx.font = font(12, true);
      ctx.textAlign = q > 0 ? 'right' : 'left';
      ctx.fillText('범위 넘음 ' + (q > 0 ? '▶' : '◀'), q > 0 ? c.x + c.w - 10 : c.x + 10, gy + 18);
    }

    // 값
    ctx.textAlign = 'center';
    ctx.fillStyle = q > 0 ? '#c4313a' : q < 0 ? '#2a52d6' : '#0f8a4b';
    ctx.font = font(32, true);
    ctx.fillText(signed(q), gx, gy + 56);
    // 식
    ctx.font = font(13, true);
    ctx.textAlign = 'right'; ctx.fillStyle = '#c4313a';
    ctx.fillText('원자핵 +' + p, gx - 8, c.y + c.h - 16);
    ctx.textAlign = 'left'; ctx.fillStyle = '#2a52d6';
    ctx.fillText('전자 ' + (e ? MINUS + e : '0'), gx + 8, c.y + c.h - 16);
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx, c.y + c.h - 29); ctx.lineTo(gx, c.y + c.h - 13); ctx.stroke();
  }

  function drawTarget(p, e) {
    if (!S.target) return;
    const tid = identify(S.target.p, S.target.e);
    const ok = p === S.target.p && e === S.target.e;
    const name = tid.q === 0 ? tid.name + ' 원자' : (tid.ionName || '');
    const pre = ok ? '✔ 목표 달성: ' : '🎯 목표: ';
    ctx.textBaseline = 'alphabetic';
    ctx.font = font(15, true);
    const w1 = ctx.measureText(pre).width;
    const wf = formulaWidth(tid.sym, tid.q, 18);
    ctx.font = font(15, true);
    const w3 = ctx.measureText(name).width;
    const tw = w1 + wf + 8 + w3 + 28;
    const x = C.x - tw / 2, y = 8, h = 32;
    ctx.fillStyle = ok ? COL.good : '#fff';
    ctx.strokeStyle = ok ? COL.good : '#8b5cf6'; ctx.lineWidth = 2;
    roundRect(x, y, tw, h, 16); ctx.fill(); ctx.stroke();
    const tc = ok ? '#fff' : '#5b37c9';
    ctx.textAlign = 'left'; ctx.font = font(15, true); ctx.fillStyle = tc;
    ctx.fillText(pre, x + 14, y + 22);
    drawFormula(tid.sym, tid.q, x + 14 + w1, y + 23, 18, tc, tc, 'left');
    ctx.textAlign = 'left'; ctx.font = font(15, true); ctx.fillStyle = tc;
    ctx.fillText(name, x + 14 + w1 + wf + 8, y + 22);
  }

  function drawBanner() {
    const b = S.banner;
    if (!b) return;
    const age = S.time - b.t0;
    if (age > 2.8) { S.banner = null; return; }
    const a = age < 0.15 ? age / 0.15 : age > 2.4 ? (2.8 - age) / 0.4 : 1;
    let size = 14.5;
    ctx.font = font(size, true);
    while (ctx.measureText(b.text).width > 410 && size > 12) { size -= 0.5; ctx.font = font(size, true); }
    const tw = ctx.measureText(b.text).width + 26;
    const y = 486 + (1 - a) * 8;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = b.color;
    roundRect(C.x - tw / 2, y, tw, 28, 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.text, C.x, y + 15);
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }

  /* ---------- DOM 측정값/버튼 ---------- */
  const rP = $('#rP'), rE = $('#rE'), rQ = $('#rQ'), rK = $('#rK');
  const oP = $('#oP'), oE = $('#oE');
  let uiKey = '';
  function updateUI(force) {
    const p = np(), e = ne(), key = p + ':' + e;
    if (!force && key === uiKey) return;
    uiKey = key;
    const id = identify(p, e);
    rP.innerHTML = p + '<small>개 (+' + p + ')</small>';
    rE.innerHTML = e + '<small>개 (' + (e ? MINUS + e : '0') + ')</small>';
    rQ.textContent = signed(id.q);
    rQ.className = 'value ' + (id.q > 0 ? 'q-pos' : id.q < 0 ? 'q-neg' : 'q-zero');
    rK.innerHTML = KIND[id.kind].short + ' <small>' + formulaHTML(id.sym, id.q) + '</small>';
    oP.textContent = p; oE.textContent = e;
    $('#pMinus').disabled = p <= 1; $('#pPlus').disabled = p >= MAX_P;
    $('#eMinus').disabled = e <= 0; $('#ePlus').disabled = e >= MAX_E;
  }

  $('#pPlus').addEventListener('click', () => plus('p'));
  $('#pMinus').addEventListener('click', () => minus('p'));
  $('#ePlus').addEventListener('click', () => plus('e'));
  $('#eMinus').addEventListener('click', () => minus('e'));
  $('#orbitChk').addEventListener('change', (ev) => { S.orbit = ev.target.checked; });
  $('#resetBtn').addEventListener('click', () => { Sound.click(); setState(1, 1); });

  /* ---------- 미션 ---------- */
  function statusLine() {
    const id = identify(np(), ne());
    return '지금: 양성자 <b>' + id.p + '</b> · 전자 <b>' + id.e + '</b> → <b>' + formulaHTML(id.sym, id.q) + '</b> (' + fullName(id) + ')';
  }
  const is = (p, e) => np() === p && ne() === e;
  function setTarget(p, e) { S.target = { p, e }; }

  // 퀴즈용 모형 그림: 원자핵 +16, 전자 18개
  function modelSVG() {
    const cx = 120, cy = 120, shells = [[36, 2, -90], [68, 8, -67.5], [100, 8, -90]];
    let s = '<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="원자핵 전하 +16, 전자 18개인 모형">';
    s += '<circle cx="120" cy="120" r="116" fill="#f4f7fd"/>';
    shells.forEach(([r]) => { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#9fb3e6" stroke-width="1.5" stroke-dasharray="4 5"/>'; });
    s += '<circle cx="120" cy="120" r="22" fill="#e2464b"/><text x="120" y="127" text-anchor="middle" font-size="19" font-weight="800" fill="#fff" font-family="sans-serif">+16</text>';
    shells.forEach(([r, n, off]) => {
      for (let i = 0; i < n; i++) {
        const a = (off + (360 / n) * i) * Math.PI / 180;
        const x = (cx + Math.cos(a) * r).toFixed(1), y = (cy + Math.sin(a) * r).toFixed(1);
        s += '<circle cx="' + x + '" cy="' + y + '" r="9" fill="#3867f4"/><text x="' + x + '" y="' + (+y + 5) + '" text-anchor="middle" font-size="15" font-weight="800" fill="#fff" font-family="sans-serif">' + MINUS + '</text>';
      }
    });
    s += '</svg>';
    return s;
  }

  const CONCEPT = `
    <h3>⚛️ 원자의 구조</h3>
    <p>원자는 중심에 있는 <b>원자핵</b>과 그 주위를 움직이는 <b>전자</b>로 이루어져 있어요.</p>
    <ul>
      <li><b>원자핵</b>: (+)전하를 띠어요. 원자 크기에 비해 아주 작지만 원자 질량의 대부분을 차지해요.</li>
      <li><b>전자</b>: (−)전하를 띠고, 질량이 매우 작으며 원자핵 주위를 움직여요.</li>
    </ul>
    <span class="formula">원자핵의 (+)전하량 = 전자의 총 (−)전하량<br>→ 원자는 전기적으로 중성</span>
    <h3>🔑 원소의 종류를 정하는 것</h3>
    <p>원소의 종류는 <b>원자핵의 (+)전하량</b>(이 실험에서는 양성자 수)으로 정해져요. 양성자가 6개면 언제나 탄소(C), 8개면 산소(O)예요.</p>
    <table>
      <tr><th>원소</th><th>기호</th><th>양성자 수</th><th>원소</th><th>기호</th><th>양성자 수</th></tr>
      <tr><td>수소</td><td>H</td><td>1</td><td>나트륨</td><td>Na</td><td>11</td></tr>
      <tr><td>탄소</td><td>C</td><td>6</td><td>마그네슘</td><td>Mg</td><td>12</td></tr>
      <tr><td>질소</td><td>N</td><td>7</td><td>황</td><td>S</td><td>16</td></tr>
      <tr><td>산소</td><td>O</td><td>8</td><td>염소</td><td>Cl</td><td>17</td></tr>
    </table>
    <h3>⚡ 이온의 형성</h3>
    <p>원자가 <b>전자를 잃거나 얻으면</b> 전하를 띠는 <b>이온</b>이 돼요. 이때 원자핵은 변하지 않아요.</p>
    <ul>
      <li>전자를 <b>잃으면</b> → (+)전하량 &gt; (−)전하량 → <b>양이온</b> (예: Na → Na<sup>+</sup>)</li>
      <li>전자를 <b>얻으면</b> → (−)전하량 &gt; (+)전하량 → <b>음이온</b> (예: Cl → Cl<sup>−</sup>)</li>
    </ul>
    <span class="formula">이온의 전하 = (원자핵의 전하) + (전자의 총 전하)</span>
    <h3>✍️ 이온식과 이온의 이름</h3>
    <ul>
      <li><b>이온식</b>: 원소 기호의 오른쪽 위에 잃거나 얻은 전자 수와 전하의 종류(+, −)를 써요. 1은 생략해요.<br>Na<sup>+</sup>, Mg<sup>2+</sup>, Al<sup>3+</sup>, Cl<sup>−</sup>, O<sup>2−</sup>, S<sup>2−</sup></li>
      <li><b>양이온</b>: 원소 이름 뒤에 ‘이온’ → 수소 이온(H<sup>+</sup>), 나트륨 이온(Na<sup>+</sup>), 마그네슘 이온(Mg<sup>2+</sup>)</li>
      <li><b>음이온</b>: 원소 이름 뒤에 ‘-화 이온’ (이름이 ‘소’로 끝나면 ‘소’를 빼요) → 염화 이온(Cl<sup>−</sup>), 산화 이온(O<sup>2−</sup>), 황화 이온(S<sup>2−</sup>), 플루오린화 이온(F<sup>−</sup>)</li>
    </ul>
    <p class="note">⚠️ 이온이 될 때 바뀌는 것은 <b>전자 수뿐</b>이에요. 양성자 수(원자핵의 전하)는 그대로라서 Na<sup>+</sup>도 여전히 나트륨이에요.<br>
    ※ 이 모형에서 전자를 원 위에 2, 8, 8개씩 그린 것은 보기 쉽게 나타낸 그림이에요. 실제 전자는 원자핵 주위의 공간을 빠르게 움직이고 있어요. 또 실제 원자핵에는 전하를 띠지 않는 입자도 있지만, 전하와 관계없어서 이 모형에서는 생략했어요.</p>
  `;

  const game = SciSim.game({
    simId: 'm2-build-atom',
    mount: '#game',
    concept: CONCEPT,
    badge: '이온 연금술사',
    homeHref: '../../index.html#g2',
    onMissionStart() { S.target = null; },
    levels: [
      {
        title: '원자 만들기',
        missions: [
          {
            title: '첫 원자: 수소',
            goal: '원자핵(양성자 1개)만 있어요. <b>전자</b>를 끌어다 넣어 전기적으로 중성인 <b>수소 원자</b>를 만들어 보세요.',
            hint: '왼쪽 아래 파란 <b>전자 상자</b>에서 전자를 끌어 원자핵 근처에 놓아요. (오른쪽의 전자 <b>+</b> 버튼도 돼요)',
            setup() { setState(1, 0); setTarget(1, 1); },
            check: () => is(1, 1),
            status: () => statusLine() + (np() !== 1 ? '<br>⚠️ 수소는 양성자가 1개예요. 양성자 수를 되돌려요.' : ne() > 1 ? '<br>⚠️ 전자가 너무 많아요! (−)전하가 더 커졌어요.' : ''),
            hold: 0.6,
            explain: '수소 원자핵의 전하는 <b>+1</b>, 전자 1개의 전하는 <b>−1</b>이에요. (+)전하량과 (−)전하량이 같아서 합이 0, 즉 <b>전기적으로 중성</b>인 원자가 되었어요. 전하 계기판의 바늘이 0을 가리키죠?',
          },
          {
            title: '탄소 원자 만들기',
            goal: '양성자와 전자를 넣어 <b>탄소(C) 원자</b>를 만들어 보세요. 정체 카드에 ‘탄소’가 나타나고, 전체 전하가 <b>0</b>이어야 해요.',
            hint: '원소 이름은 <b>양성자 수</b>로 정해져요. 양성자를 하나씩 넣으며 정체 카드를 보세요. 탄소는 양성자가 <b>6개</b>! 그다음 전자도 같은 수만큼 넣어요.',
            setup() { setState(1, 1); setTarget(6, 6); },
            check: () => is(6, 6),
            status: () => statusLine() + (np() === 6 && ne() !== 6 ? '<br>👍 원소는 탄소! 이제 전체 전하를 0으로 맞춰요.' : np() > 6 ? '<br>⚠️ 양성자가 너무 많아요.' : ''),
            hold: 0.6,
            explain: '양성자를 넣을 때마다 원소가 수소 → 헬륨 → 리튬 → … 으로 바뀌었죠? 원소의 종류는 <b>원자핵의 (+)전하량(양성자 수)</b>으로 정해져요. 탄소 원자는 원자핵의 전하 +6, 전자 6개로 전체 전하가 0이에요.',
          },
          {
            type: 'quiz',
            title: '원자는 왜 중성일까?',
            goal: '원자가 전체적으로 전하를 띠지 않는(<b>전기적으로 중성</b>인) 까닭으로 옳은 것은?',
            setup() { setState(6, 6); },
            choices: [
              '원자 속에 전자가 없기 때문',
              '원자핵이 전하를 띠지 않기 때문',
              '원자핵의 (+)전하량과 전자의 총 (−)전하량이 같기 때문',
              '전자가 원자핵 안에 들어 있기 때문',
            ],
            answer: 2,
            feedback: [
              '화면의 탄소 원자에도 전자가 6개 있어요! 원자에는 전자가 있어요.',
              '원자핵은 <b>(+)전하</b>를 띠어요. 원자핵 속 빨간 (+) 입자를 보세요.',
              '',
              '전자는 원자핵 <b>밖</b>, 원자핵 주위를 움직여요.',
            ],
            explain: '원자핵은 (+)전하, 전자는 (−)전하를 띠어요. 탄소 원자는 원자핵의 전하 <b>+6</b>과 전자 6개의 전하 <b>−6</b>이 같아서 합이 0이에요. 그래서 원자는 <b>전기적으로 중성</b>이에요.',
          },
          {
            title: '질소를 산소로!',
            goal: '지금은 <b>질소(N) 원자</b>예요. 입자를 더 넣어 전기적으로 중성인 <b>산소(O) 원자</b>로 바꿔 보세요.',
            hint: '산소는 양성자가 <b>8개</b>예요. 양성자 1개를 넣으면 원소가 산소로 바뀌지만 전체 전하가 +1이 돼요. 전자도 1개 넣어 중성으로 맞춰요.',
            setup() { setState(7, 7); setTarget(8, 8); },
            check: () => is(8, 8),
            status: () => {
              let extra = '';
              if (np() === 8 && ne() === 7) extra = '<br>👍 산소가 되었어요! 그런데 전체 전하가 +1이네요.';
              else if (np() === 7 && ne() === 8) extra = '<br>🤔 전자만 넣으면 원소는 그대로 질소예요!';
              return statusLine() + extra;
            },
            hold: 0.6,
            explain: '양성자 1개를 넣어 원자핵의 전하가 <b>+8</b>이 되자 원소가 <b>산소</b>로 바뀌었어요. 전자도 1개 넣어 (−)전하를 −8로 맞추니 중성 원자가 되었어요. <b>원소를 정하는 것은 양성자 수</b>, 중성을 맞추는 것은 전자 수예요.',
          },
        ],
      },
      {
        title: '이온 만들기',
        missions: [
          {
            title: '나트륨 이온 만들기',
            goal: '<b>나트륨(Na) 원자</b>에서 <b>전자 1개를 떼어 내어</b> 나트륨 이온(Na<sup>+</sup>)을 만들어 보세요.',
            hint: '가장 바깥쪽에서 도는 전자 1개를 끌어서 <b>전자 상자</b>(또는 원 밖)에 놓아요. 전자 <b>−</b> 버튼도 돼요.',
            setup() { setState(11, 11); setTarget(11, 10); },
            check: () => is(11, 10),
            status: () => statusLine() + (np() !== 11 ? '<br>⚠️ 양성자 수가 바뀌면 나트륨이 아니에요!' : ne() > 11 ? '<br>🤔 전자를 넣으면 (−)전하가 늘어나요.' : ''),
            hold: 0.6,
            explain: '전자 1개를 잃자 원자핵의 (+)전하(+11)가 전자의 (−)전하(−10)보다 많아져 전체 전하가 <b>+1</b>인 <b>양이온</b>이 되었어요. 이온식은 <b>Na<sup>+</sup></b>, 이름은 <b>나트륨 이온</b>! 원자핵은 그대로라서 여전히 나트륨이에요.',
          },
          {
            title: '염화 이온 만들기',
            goal: '<b>염소(Cl) 원자</b>에 <b>전자 1개를 더해</b> 음이온 Cl<sup>−</sup>을 만들어 보세요.',
            hint: '파란 <b>전자 상자</b>에서 전자 1개를 끌어 원자 안에 놓아요.',
            setup() { setState(17, 17); setTarget(17, 18); },
            check: () => is(17, 18),
            status: () => statusLine() + (np() !== 17 ? '<br>⚠️ 양성자 수가 바뀌면 염소가 아니에요!' : ne() < 17 ? '<br>🤔 전자를 잃으면 양이온이 돼요. 음이온은 전자를 <b>얻어야</b> 해요.' : ''),
            hold: 0.6,
            explain: '전자 1개를 얻자 (−)전하(−18)가 (+)전하(+17)보다 많아져 전체 전하가 <b>−1</b>인 <b>음이온</b>이 되었어요. 이온식은 <b>Cl<sup>−</sup></b>, 이름은 <b>염화 이온</b>이에요. (‘염소 이온’이 아니에요!)',
          },
          {
            type: 'quiz',
            title: '전자를 잃으면?',
            goal: '원자가 <b>전자를 잃으면</b> 어떤 이온이 될까요? 그 까닭까지 바르게 짝지은 것은?',
            choices: [
              '양이온 — 전자를 잃어 (+)전하량이 (−)전하량보다 많아지므로',
              '음이온 — (−)전하를 띠는 전자를 잃었으므로',
              '양이온 — 전자를 잃는 대신 양성자를 얻어 (+)전하가 늘어나므로',
              '변하지 않음 — 원자핵이 그대로이므로 여전히 중성이다',
            ],
            answer: 0,
            feedback: [
              '',
              '전자를 <b>잃으면</b> (−)전하가 줄어요. 그러면 (+)와 (−) 중 어느 쪽이 더 많아질까요?',
              '이온이 될 때 원자핵(양성자 수)은 <b>변하지 않아요</b>. 양성자 수가 바뀌면 아예 다른 원소가 돼요!',
              '원자핵은 그대로지만 전자가 줄어 (+)전하량과 (−)전하량이 더 이상 같지 않아요.',
            ],
            explain: '이온이 될 때는 <b>전자만</b> 이동해요. 전자를 잃으면 (+)전하량 &gt; (−)전하량 → <b>양이온</b>, 전자를 얻으면 (−)전하량 &gt; (+)전하량 → <b>음이온</b>이 돼요.',
          },
          {
            type: 'quiz',
            title: 'Na<sup>+</sup>도 나트륨일까?',
            goal: '나트륨 원자가 전자를 잃어 Na<sup>+</sup>이 되어도 여전히 ‘나트륨’이라고 하는 까닭은? (화면의 Na<sup>+</sup>를 살펴보세요)',
            setup() { setState(11, 10); },
            choices: [
              '전자 수가 변하지 않았기 때문',
              '원자핵의 (+)전하량, 즉 양성자 수가 그대로이기 때문',
              'Na<sup>+</sup>도 전기적으로 중성이기 때문',
              '양성자도 전자와 함께 1개 줄었기 때문',
            ],
            answer: 1,
            feedback: [
              '전자 수는 11개 → 10개로 <b>변했어요</b>. 화면을 확인해 보세요.',
              '',
              'Na<sup>+</sup>은 전체 전하가 +1이라 중성이 아니에요.',
              '이온이 될 때 양성자 수는 변하지 않아요. 화면의 원자핵 속 양성자를 세어 보세요: 여전히 11개!',
            ],
            explain: '원소의 종류는 <b>원자핵의 (+)전하량(양성자 수)</b>으로 정해져요. 이온이 될 때는 전자만 이동하고 원자핵은 그대로이므로 Na<sup>+</sup>도 여전히 나트륨이에요. 그래서 이온식에도 같은 원소 기호 Na를 써요.',
          },
        ],
      },
      {
        title: '이온 마스터',
        missions: [
          {
            title: '마그네슘 이온 Mg<sup>2+</sup>',
            manual: true,
            goal: '<b>마그네슘 이온(Mg<sup>2+</sup>)</b>을 만든 뒤 <b>✔ 확인하기</b>를 누르세요. 마그네슘 원자를 먼저 만들고, 이온이 되게 해 보세요.',
            hint: '마그네슘은 양성자가 <b>12개</b>예요. 양성자 12개·전자 12개로 마그네슘 원자를 만든 뒤, 전자 <b>2개</b>를 빼면 전체 전하가 +2가 돼요.',
            setup() { setState(1, 1); setTarget(12, 10); },
            check: () => {
              const p = np(), e = ne(), q = p - e;
              if (p === 12 && e === 10) return true;
              if (p !== 12) return '지금 원소는 ' + iyeyo(identify(p, e).name) + '. 정체 카드에 ‘마그네슘’이 나올 때까지 양성자 수를 맞춰요.';
              if (e === 12) return '마그네슘 원자 완성! 이제 전자를 잃게 해서 전체 전하를 +2로 만들어요.';
              if (e > 12) return '전자를 얻으면 음이온이 돼요. Mg<sup>2+</sup>은 (+)전하가 2만큼 많아야 해요.';
              if (e === 11) return '전체 전하가 +1이에요. 전자를 하나 더 잃어야 해요.';
              return '전자를 너무 많이 뺐어요. (지금 전체 전하: ' + signed(q) + ')';
            },
            status: () => statusLine(),
            explain: '마그네슘 원자(+12, −12)가 전자 <b>2개</b>를 잃으면 (+)전하가 2만큼 많아져 <b>Mg<sup>2+</sup></b>이 돼요. 이온식은 원소 기호 오른쪽 위에 전하의 크기(2)와 종류(+)를 써요. 이름은 <b>마그네슘 이온</b>!',
          },
          {
            title: '산화 이온 O<sup>2−</sup>',
            manual: true,
            goal: '이번엔 음이온! <b>산화 이온(O<sup>2−</sup>)</b>을 만든 뒤 <b>✔ 확인하기</b>를 누르세요.',
            hint: '산소는 양성자가 <b>8개</b>예요. 산소 원자(양성자 8, 전자 8)를 만든 뒤 전자 <b>2개</b>를 더 넣어요.',
            setup() { setState(1, 1); setTarget(8, 10); },
            check: () => {
              const p = np(), e = ne(), q = p - e;
              if (p === 8 && e === 10) return true;
              if (p !== 8) return '지금 원소는 ' + iyeyo(identify(p, e).name) + '. 산소는 양성자가 몇 개였는지 떠올려 보세요. (레벨 1의 질소 → 산소 미션!)';
              if (e === 8) return '산소 원자 완성! 이제 전자를 얻게 해서 전체 전하를 −2로 만들어요.';
              if (e < 8) return '전자를 잃으면 양이온이 돼요! 음이온은 전자를 <b>얻어야</b> 해요.';
              if (e === 9) return '전체 전하가 −1이에요. 전자를 하나 더 얻어야 해요.';
              return '전자가 너무 많아요. (지금 전체 전하: ' + signed(q) + ')';
            },
            status: () => statusLine(),
            explain: '산소 원자(+8, −8)가 전자 <b>2개</b>를 얻으면 (−)전하가 2만큼 많아져 <b>O<sup>2−</sup></b>이 돼요. 음이온은 원소 이름 뒤에 ‘-화 이온’을 붙이는데, ‘산소’처럼 ‘소’로 끝나면 ‘소’를 빼고 <b>산화 이온</b>이라고 해요.',
          },
          {
            type: 'quiz',
            title: '모형을 이온식으로',
            goal: '다음 모형이 나타내는 입자의 <b>이온식</b>은? 원자핵의 전하와 전자 수를 비교해 보세요.',
            figure: modelSVG(),
            choices: ['S<sup>2−</sup>', 'S<sup>2+</sup>', 'Ar', 'S'],
            answer: 0,
            feedback: [
              '',
              '전자가 18개로, 원자핵의 전하 +16보다 (−)전하가 많아요. 그럼 전체 전하는 (+)일까요, (−)일까요?',
              '아르곤은 <b>양성자가 18개</b>인 원소예요. 원소의 종류는 전자 수가 아니라 <b>원자핵의 (+)전하량</b>으로 정해져요!',
              '원자핵의 전하(+16)와 전자 수(18개)가 같지 않아요. 중성 원자가 아니라 이온이에요.',
            ],
            explain: '원자핵의 전하가 <b>+16</b>이므로 원소는 <b>황(S)</b>이에요. 전자는 18개(−18)라 전체 전하는 (+16) + (−18) = <b>−2</b>. 이온식은 <b>S<sup>2−</sup></b>, 이름은 <b>황화 이온</b>이에요. (왼쪽 공방에서 직접 만들어 확인해 봐도 좋아요!)',
          },
          {
            type: 'quiz',
            title: '이름을 붙여 줘!',
            goal: 'Cl<sup>−</sup>의 올바른 이름은?',
            choices: ['염소 이온', '염화 이온', '염화 나트륨', '염소 원자'],
            answer: 1,
            feedback: [
              '‘원소 이름 + 이온’은 <b>양이온</b>의 이름 짓는 법이에요. 음이온은 다르게 불러요!',
              '',
              '염화 나트륨은 나트륨 이온과 염화 이온으로 이루어진 <b>물질</b>(소금의 주성분)의 이름이에요.',
              'Cl<sup>−</sup>은 전자를 1개 얻어 전하를 띤 <b>이온</b>이에요. 중성인 원자가 아니에요.',
            ],
            explain: '음이온은 원소 이름 뒤에 ‘-화 이온’을 붙이고, 이름이 ‘소’로 끝나면 ‘소’를 빼요: 염소 → <b>염화 이온</b>(Cl<sup>−</sup>), 산소 → 산화 이온(O<sup>2−</sup>), 황 → 황화 이온(S<sup>2−</sup>). 양이온은 ‘원소 이름 + 이온’: 나트륨 이온(Na<sup>+</sup>).',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  if (!S.protons.length) setState(1, 1);   // 미션 setup이 없을 때 기본 상태
  setTimeout(hideHint, 7000);
  SciSim.loop((dt) => {
    step(dt);
    draw();
    updateUI();
  });
})();
