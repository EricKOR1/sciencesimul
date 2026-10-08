/* =========================================================
   중2 Ⅳ. 물질의 구성 - 원자의 구조  [9과11-02]
   원자는 양성자, 중성자, 전자로 구성되며,
   양성자의 수에 따라 원소의 종류가 달라진다. (질량수·동위 원소는 다루지 않음)
   ① 관찰: 원자 모형 살펴보기 → ② 탐구: 전기적 중성
   → ③ 설명: 양성자 수가 원소를 결정 → ④ 적용: 원소 찾기
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
  // 이 모형에서 원소마다 함께 그리는 중성자 수 (자연에 가장 흔한 원자 기준, 학생이 따로 바꾸지 않음)
  const NEUT = [0, 0, 2, 4, 5, 6, 6, 7, 8, 10, 10, 12, 12, 14, 14, 16, 16, 18, 22, 20, 20];
  const MAX_P = 20, MAX_E = 20;
  const MINUS = '−';
  function signed(q) { return q > 0 ? '+' + q : q < 0 ? MINUS + (-q) : '0'; }
  function elem(p) { const e = ELEMENTS[clamp(p, 1, MAX_P)]; return { sym: e[0], name: e[1] }; }

  const PART = {
    p: { name: '양성자', pos: '원자핵 속', charge: '(+)전하', col: '#c4313a' },
    n: { name: '중성자', pos: '원자핵 속', charge: '전하 없음', col: '#5d6879' },
    e: { name: '전자', pos: '원자핵 주위', charge: '(−)전하', col: '#2a52d6' },
  };

  /* ---------- 배치(가상 좌표 800 x 520) ---------- */
  const C = { x: 372, y: 262 };              // 원자 중심
  const SHELL_R = [80, 116, 152, 186];       // 전자를 그리는 원 (보기 쉽게 배치한 그림일 뿐)
  const SHELL_CAP = [2, 8, 8, 4];
  const SHELL_SPEED = [0.5, 0.33, 0.24, 0.18];
  const SHELL_OFF = [-Math.PI / 2, -Math.PI / 2 + 0.2, -Math.PI / 2 + 0.45, -Math.PI / 4];
  const ATOM_R = 214;                        // 이 안에 놓으면 원자에 들어감
  const NR = 9, ER = 10;                     // 원자핵 속 입자 / 전자 반지름
  const BIN_X = 16, BIN_W = 132, BIN_H = 168;
  const CARD_X = 598, CARD_W = 188;
  const INSET = { x: 82, y: 250, r: 64 };    // 원자핵 확대 그림 (1단계)
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const COL = { p: '#e2464b', e: '#3867f4', n: '#8a94a6', good: '#14a058', ink: '#1b2333', muted: '#5d6879', line: '#dde4ef', warn: '#f26b3a', sub: '#8b5cf6' };
  const MAXQ = 6;

  /* ---------- 상태 ---------- */
  const S = {
    nucleons: [],     // {type:'p'|'n', hx,hy, x,y, sx,sy, t, dur, fresh, grow}
    electrons: [],    // {x,y, sx,sy, t, dur, fresh, key}
    drag: null,       // {kind:'p'|'e', from:'bin'|'atom', x, y, off}
    flying: [], fading: [], pulses: [],
    phase: [0, 0, 0, 0],
    target: null,     // {p, e, text}
    needle: 0, ringR: 120,
    lastP: 2, lastE: 2,
    banner: null, idFlash: null, focus: null, ePt: null,
    seen: { p: false, n: false, e: false },
    callout: null,    // {kind, ref, inset, t0}
    time: 0,
  };

  let F = new Set();
  const on = (f) => F.has(f);
  let game = null;
  const isNew = (f) => !!(game && game.isNew(f));

  const protons = () => S.nucleons.filter((q) => q.type === 'p');
  const np = () => protons().length + (S.drag && S.drag.from === 'atom' && S.drag.kind === 'p' ? 1 : 0);
  const nn = () => S.nucleons.length - protons().length;
  const ne = () => S.electrons.length + (S.drag && S.drag.from === 'atom' && S.drag.kind === 'e' ? 1 : 0);

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: 800, height: 520, background: '#fff' });
  const ctx = view.ctx;

  /* ---------- 화면 배치 (열린 도구에 따라) ---------- */
  function bins() {
    const kinds = [];
    if (on('pbin')) kinds.push('p');
    if (on('ebin')) kinds.push('e');
    const gap = 56, H = kinds.length * BIN_H + (kinds.length - 1) * gap;
    let y = (520 - H) / 2;
    const out = {};
    kinds.forEach((k) => { out[k] = { x: BIN_X, y, w: BIN_W, h: BIN_H }; y += BIN_H + gap; });
    return out;
  }
  function cards() {
    if (on('idcard')) return { id: { x: CARD_X, y: 14, w: CARD_W, h: 246 }, meter: { x: CARD_X, y: 272, w: CARD_W, h: 234 } };
    if (on('meter')) return { meter: { x: CARD_X, y: 143, w: CARD_W, h: 234 } };
    return { record: { x: CARD_X, y: 36, w: CARD_W, h: 448 } };
  }
  const insetOn = () => !on('ebin') && !on('pbin');

  /* ---------- 원자핵 (양성자 + 중성자, 서로 밀어내며 뭉치기) ---------- */
  function relax(iter) {
    const ps = S.nucleons, minD = NR * 2 * 0.93;
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
    S.nucleons.forEach((q) => { r = Math.max(r, Math.hypot(q.hx, q.hy)); });
    return r + NR;
  }
  function edgeSpot() {
    const ang = Math.random() * Math.PI * 2, r = S.nucleons.length ? nucleusR() : 0;
    return { hx: Math.cos(ang) * r, hy: Math.sin(ang) * r };
  }
  function addProton(x, y) {
    const s = edgeSpot();
    S.nucleons.push({ type: 'p', hx: s.hx, hy: s.hy, x, y, sx: x, sy: y, t: 0, dur: 0.38, fresh: true, grow: 1 });
  }
  // 중성자 수를 양성자 수에 맞춤 (자동)
  function syncNeutrons(p) {
    const want = NEUT[clamp(p, 0, MAX_P)];
    while (nn() < want) {
      const s = edgeSpot();
      S.nucleons.push({ type: 'n', hx: s.hx, hy: s.hy, x: C.x + s.hx, y: C.y + s.hy, sx: C.x + s.hx, sy: C.y + s.hy, t: 1, dur: 0.3, fresh: false, grow: 0 });
    }
    while (nn() > want) {
      let bi = -1, bd = -1;
      S.nucleons.forEach((q, i) => { if (q.type === 'n') { const d = Math.hypot(q.hx, q.hy); if (d > bd) { bd = d; bi = i; } } });
      const q = S.nucleons.splice(bi, 1)[0];
      S.fading.push({ x: q.x, y: q.y, t: 0 });
    }
  }
  function newElectron(x, y, fresh) { return { x, y, sx: x, sy: y, t: fresh ? 0 : 1, dur: 0.38, fresh: !!fresh, key: null }; }

  /* ---------- 전자 자리 (보기 쉽게 원 위에 나누어 그리기) ---------- */
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
    S.drag = null; S.flying = []; S.fading = []; S.pulses = []; S.callout = null;
    S.nucleons = [];
    const n = NEUT[p];
    for (let i = 0; i < p + n; i++) {
      // 양성자와 중성자를 고르게 섞어서 배치
      const type = Math.floor((i + 1) * p / (p + n)) > Math.floor(i * p / (p + n)) ? 'p' : 'n';
      const ang = i * 2.39996, r = 8 * Math.sqrt(i);
      S.nucleons.push({ type, hx: Math.cos(ang) * r, hy: Math.sin(ang) * r, x: C.x, y: C.y, sx: C.x, sy: C.y, t: 1, dur: 0.3, fresh: false, grow: 1 });
    }
    relax(100);
    S.nucleons.forEach((q) => { q.x = C.x + q.hx; q.y = C.y + q.hy; });
    S.electrons = [];
    for (let i = 0; i < e; i++) {
      const s = slot(i, e);
      const el = newElectron(s.x, s.y, false); el.key = s.key;
      S.electrons.push(el);
    }
    S.lastP = p; S.lastE = e;
    S.banner = null; S.idFlash = null; S.ePt = null;
    S.needle = p - e;
    S.ringR = outerR() + 18;
    updateUI(true);
  }

  function binCenter(kind) { const b = bins()[kind] || { x: BIN_X, y: 176, w: BIN_W, h: BIN_H }; return { x: b.x + b.w / 2, y: b.y + 110 }; }
  function inRect(p, b) { return !!b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }
  function inAtom(p) { const B = bins(); return Math.hypot(p.x - C.x, p.y - C.y) <= ATOM_R && !inRect(p, B.p) && !inRect(p, B.e); }

  function addParticle(kind, x, y) {
    if (kind === 'p') addProton(x, y);
    else S.electrons.push(newElectron(x, y, true));
    Sound.tone(kind === 'p' ? 520 : 760, 0.06, 'triangle', 0.07);
  }
  function flyToBin(kind, x, y) {
    const b = binCenter(kind);
    S.flying.push({ kind, x0: x, y0: y, x1: b.x, y1: b.y - 20, t: 0 });
  }

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 6000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

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
      let bi = -1, bd = -1;
      S.nucleons.forEach((q, i) => { if (q.type === 'p') { const d = Math.hypot(q.hx, q.hy); if (d > bd) { bd = d; bi = i; } } });
      const q = S.nucleons.splice(bi, 1)[0];
      flyToBin('p', q.x, q.y);
    } else {
      if (ne() <= 0) { toast('뺄 전자가 없어요'); return; }
      const el = S.electrons.pop();
      flyToBin('e', el.x, el.y);
    }
    Sound.tone(330, 0.07, 'triangle', 0.06);
  }

  /* ---------- 관찰: 입자 눌러 보기 ---------- */
  function inspect(kind, ref, inset) {
    S.seen[kind] = true;
    S.callout = { kind, ref, inset: !!inset, t0: S.time };
    Sound.tick();
    hideHint();
  }
  function insetScale() { return clamp((INSET.r - 26) / Math.max(1, nucleusR() - NR), 1.6, 2.6); }
  function insetPos(q) { const k = insetScale(); return { x: INSET.x + (q.x - C.x) * k, y: INSET.y + (q.y - C.y) * k }; }
  function insetHit(p) {
    if (Math.hypot(p.x - INSET.x, p.y - INSET.y) > INSET.r) return null;
    const k = insetScale();
    let best = null, bd = NR * k * 1.5;
    S.nucleons.forEach((q) => { const s = insetPos(q); const d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd) { bd = d; best = q; } });
    return best || 'inset';
  }

  /* ---------- 끌기 / 누르기 (마우스·터치) ---------- */
  function hitElectron(p) {
    let best = -1, bd = 26;
    S.electrons.forEach((el, i) => { const d = Math.hypot(el.x - p.x, el.y - p.y); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function hitNucleon(p) {
    if (!S.nucleons.length || Math.hypot(p.x - C.x, p.y - C.y) > nucleusR() + 14) return null;
    let best = null, bd = Infinity;
    S.nucleons.forEach((q) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = q; } });
    return best;
  }

  SciSim.pointer(view, {
    hover(p) {
      const B = bins();
      if (inRect(p, B.p) || inRect(p, B.e)) return 'grab';
      if (insetOn() && Math.hypot(p.x - INSET.x, p.y - INSET.y) <= INSET.r) return 'pointer';
      if (hitElectron(p) >= 0) return on('ebin') ? 'grab' : 'pointer';
      const q = hitNucleon(p);
      if (q) return q.type === 'p' && on('pbin') ? 'grab' : 'pointer';
      return null;
    },
    down(p, ev) {
      if (S.flying.length > 30) S.flying = [];
      const off = ev && ev.pointerType === 'touch' ? -26 : 0;
      const B = bins();
      const binKind = inRect(p, B.p) ? 'p' : inRect(p, B.e) ? 'e' : null;
      if (binKind) {
        if (binKind === 'p' && np() >= MAX_P) { toast('양성자는 ' + MAX_P + '개까지 넣을 수 있어요 (칼슘까지)'); return false; }
        if (binKind === 'e' && ne() >= MAX_E) { toast('전자는 ' + MAX_E + '개까지 넣을 수 있어요'); return false; }
        S.drag = { kind: binKind, from: 'bin', x: p.x, y: p.y + off, off };
      } else if (insetOn() && Math.hypot(p.x - INSET.x, p.y - INSET.y) <= INSET.r) {
        const q = insetHit(p);
        if (q && q !== 'inset') inspect(q.type, q, true);
        return false;
      } else {
        const ei = hitElectron(p);
        if (ei >= 0) {
          if (!on('ebin')) { inspect('e', S.electrons[ei], false); return false; }
          S.electrons.splice(ei, 1);
          S.drag = { kind: 'e', from: 'atom', x: p.x, y: p.y + off, off };
        } else {
          const q = hitNucleon(p);
          if (!q) return false;
          if (q.type === 'p' && on('pbin')) {
            if (protons().length <= 1) { toast('원자핵에는 양성자가 1개 이상 있어야 해요'); return false; }
            S.nucleons.splice(S.nucleons.indexOf(q), 1);
            S.drag = { kind: 'p', from: 'atom', x: p.x, y: p.y + off, off };
          } else {
            inspect(q.type, q, false);
            if (q.type === 'n' && on('pbin')) toast('중성자는 양성자 수에 맞춰 자동으로 채워져요');
            return false;
          }
        }
      }
      hideHint();
      view.canvas.style.cursor = 'grabbing';
      Sound.tone(440, 0.04, 'triangle', 0.05);
      return true;
    },
    move(p) { if (S.drag) { S.drag.x = p.x; S.drag.y = p.y + S.drag.off; } },
    up() {
      const d = S.drag;
      if (!d) return;
      S.drag = null;
      view.canvas.style.cursor = 'grab';
      const pt = { x: clamp(d.x, 0, 800), y: clamp(d.y, 0, 520) };
      if (inAtom(pt)) addParticle(d.kind, pt.x, pt.y);
      else {
        flyToBin(d.kind, pt.x, pt.y);
        if (d.from === 'atom') Sound.tone(330, 0.07, 'triangle', 0.06);
      }
    },
  });

  /* ---------- 갱신 ---------- */
  const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  function step(dt) {
    S.time += dt;
    for (let k = 0; k < 4; k++) S.phase[k] += SHELL_SPEED[k] * dt;

    relax(3);
    S.nucleons.forEach((q, i) => {
      const wob = 0.5 * Math.sin(S.time * 2.2 + i * 1.7);
      const tx = C.x + q.hx + wob, ty = C.y + q.hy + 0.5 * Math.cos(S.time * 1.9 + i);
      q.t = Math.min(1, q.t + dt / q.dur);
      const k = ease(q.t);
      if (q.type === 'n' && q.grow < 1) { q.grow = Math.min(1, q.grow + dt / 0.35); q.x = tx; q.y = ty; }
      else { q.x = lerp(q.sx, tx, k); q.y = lerp(q.sy, ty, k); }
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

    // 전자 이름표가 가리킬 전자 (이름표에서 가장 가까운 전자를 부드럽게 따라감)
    if (n) {
      const d = S.ringR + 20, ax = Math.min(590, C.x + d * 0.74) + 16, ay = Math.min(446, C.y + d * 0.68);
      let best = null, bd = Infinity;
      S.electrons.forEach((el) => { const dd = Math.hypot(el.x - ax, el.y - ay); if (dd < bd) { bd = dd; best = el; } });
      if (!S.ePt) S.ePt = { x: best.x, y: best.y };
      const k = Math.min(1, dt * 9);
      S.ePt.x += (best.x - S.ePt.x) * k; S.ePt.y += (best.y - S.ePt.y) * k;
    } else S.ePt = null;

    S.flying.forEach((f) => { f.t += dt / 0.35; });
    S.flying = S.flying.filter((f) => f.t < 1);
    S.fading.forEach((f) => { f.t += dt / 0.4; });
    S.fading = S.fading.filter((f) => f.t < 1);
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
  function snapFx(x, y, color) { S.pulses.push({ x, y, color, t: 0 }); Sound.tick(); }

  function onCountsChanged(p0, e0, p1, e1) {
    if (p0 !== p1) {
      syncNeutrons(p1);
      if (on('idcard')) {
        S.banner = { text: '✨ 양성자 수가 바뀌어 원소가 바뀌었어요: ' + elem(p0).name + ' → ' + elem(p1).name, color: COL.warn, t0: S.time };
        S.idFlash = { kind: 'element', t0: S.time };
      }
    } else if (on('idcard')) S.idFlash = { kind: 'same', t0: S.time };
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
  function cardBg(b) {
    ctx.save(); ctx.shadowColor = 'rgba(20,40,80,.12)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff'; roundRect(b.x, b.y, b.w, b.h, 14); ctx.fill(); ctx.restore();
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5; roundRect(b.x, b.y, b.w, b.h, 14); ctx.stroke();
  }
  function newRing(b) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save(); ctx.strokeStyle = rgba(COL.sub, 0.35 + a * 0.5); ctx.lineWidth = 4;
    roundRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10, 17); ctx.stroke();
    const bx = Math.min(b.x + b.w - 44, 800 - 54), by = Math.max(b.y - 12, 2);
    ctx.fillStyle = COL.sub; roundRect(bx, by, 50, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(13, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NEW', bx + 25, by + 12);
    ctx.restore();
  }
  function focusRing() {
    const f = S.focus;
    if (!f) return;
    const age = S.time - f.t0;
    if (age > 4) { S.focus = null; return; }
    const a = (0.5 + 0.5 * Math.sin(age * 9)) * (age > 3.4 ? (4 - age) / 0.6 : 1);
    ctx.save(); ctx.strokeStyle = rgba(COL.warn, 0.25 + 0.65 * a); ctx.lineWidth = 5;
    if (f.what === 'atom') { ctx.beginPath(); ctx.arc(C.x, C.y, S.ringR + 10, 0, Math.PI * 2); ctx.stroke(); }
    else if (f.what === 'inset') { ctx.beginPath(); ctx.arc(INSET.x, INSET.y, INSET.r + 8, 0, Math.PI * 2); ctx.stroke(); }
    else {
      const b = Object.assign({}, bins(), cards())[f.what];
      if (b) { roundRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12, 18); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawBall(x, y, kind, scale, alpha) {
    const r = (kind === 'e' ? ER : NR) * (scale || 1);
    if (r <= 0.5) return;
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (kind === 'p') { g.addColorStop(0, '#ffb6b6'); g.addColorStop(0.55, '#e2464b'); g.addColorStop(1, '#a8222a'); }
    else if (kind === 'n') { g.addColorStop(0, '#f4f6f9'); g.addColorStop(0.55, '#a6afbd'); g.addColorStop(1, '#6b7486'); }
    else { g.addColorStop(0, '#b8d0ff'); g.addColorStop(0.55, '#3867f4'); g.addColorStop(1, '#1f3fa8'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (kind !== 'n') {
      ctx.fillStyle = '#fff';
      ctx.font = font(Math.round(15 * (scale || 1) * (kind === 'p' ? 0.95 : 1)), true);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(kind === 'p' ? '+' : MINUS, x, y + 1);
    }
    ctx.restore();
  }

  /* ---------- 그리기 ---------- */
  function draw() {
    view.clear('#ffffff');
    const p = np(), n = nn(), e = ne();
    drawAtom(p - e);
    if (insetOn()) drawInset();
    if (on('meter') && !S.drag) drawLabels(p, e);
    drawBins();
    const K = cards();
    if (K.record) drawRecord(K.record);
    if (K.id) { drawIdCard(K.id, p, e); if (isNew('idcard')) newRing(K.id); }
    if (K.meter) { drawMeter(K.meter, p, n, e); if (isNew('meter')) newRing(K.meter); }
    drawTarget(p, e);
    drawCallout();
    drawBanner();
    focusRing();
    S.flying.forEach((f) => {
      const k = ease(f.t);
      drawBall(lerp(f.x0, f.x1, k), lerp(f.y0, f.y1, k), f.kind, 1 - 0.3 * k, 1 - f.t * 0.8);
    });
    if (S.drag) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      drawBall(S.drag.x, S.drag.y, S.drag.kind, 1.3);
      ctx.restore();
    }
  }

  function drawAtom(q) {
    const ringR = S.ringR;
    const bg = ctx.createRadialGradient(C.x, C.y, 10, C.x, C.y, ringR + 6);
    bg.addColorStop(0, '#f7f9ff'); bg.addColorStop(1, '#eef3fb');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(C.x, C.y, ringR + 6, 0, Math.PI * 2); ctx.fill();
    const neutral = q === 0 && on('meter');
    ctx.strokeStyle = neutral ? 'rgba(20,160,88,.4)' : 'rgba(93,104,121,.22)'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]);
    ctx.beginPath(); ctx.arc(C.x, C.y, ringR, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);

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
      ctx.font = font(14, true);
      const tw = ctx.measureText(label).width + 22;
      const ly = C.y + ATOM_R - 10;
      ctx.fillStyle = intoAtom ? col : '#5d6879';
      roundRect(C.x - tw / 2, ly - 13, tw, 26, 13); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, C.x, ly + 1);
    }

    const used = shellsUsed(S.electrons.length);
    for (let k = 0; k < used; k++) {
      ctx.strokeStyle = 'rgba(56,103,244,.28)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(C.x, C.y, SHELL_R[k], 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);

    // 원자핵
    const nr = nucleusR();
    const ng = ctx.createRadialGradient(C.x, C.y, 2, C.x, C.y, nr + 12);
    ng.addColorStop(0, 'rgba(255,205,205,.6)'); ng.addColorStop(1, 'rgba(255,205,205,0)');
    ctx.fillStyle = ng;
    ctx.beginPath(); ctx.arc(C.x, C.y, nr + 12, 0, Math.PI * 2); ctx.fill();
    S.nucleons.slice().sort((a, b) => a.y - b.y).forEach((q2) => {
      const sc = q2.type === 'n' ? ease(q2.grow) : (q2.t < 1 ? 1.15 - 0.15 * q2.t : 1);
      drawBall(q2.x, q2.y, q2.type, sc);
    });
    S.fading.forEach((f) => drawBall(f.x, f.y, 'n', 1 - f.t * 0.5, 1 - f.t));
    S.electrons.forEach((el) => drawBall(el.x, el.y, 'e', el.t < 1 ? 1.15 - 0.15 * el.t : 1));
    S.pulses.forEach((pl) => {
      ctx.strokeStyle = rgba(pl.color, (1 - pl.t) * 0.8); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pl.x, pl.y, 10 + pl.t * 18, 0, Math.PI * 2); ctx.stroke();
    });
  }

  // 1단계: 원자핵 확대 그림
  function drawInset() {
    const I = INSET, nr = nucleusR(), k = insetScale();
    ctx.save();
    ctx.strokeStyle = 'rgba(139,92,246,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(I.x + I.r * 0.5, I.y - I.r * 0.87); ctx.lineTo(C.x, C.y - nr - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(I.x + I.r * 0.5, I.y + I.r * 0.87); ctx.lineTo(C.x, C.y + nr + 3); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(139,92,246,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(C.x, C.y, nr + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = COL.sub; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(I.x, I.y, I.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(I.x, I.y, I.r - 2, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createRadialGradient(I.x, I.y, 4, I.x, I.y, I.r);
    g.addColorStop(0, 'rgba(255,205,205,.55)'); g.addColorStop(1, 'rgba(255,205,205,0)');
    ctx.fillStyle = g; ctx.fillRect(I.x - I.r, I.y - I.r, I.r * 2, I.r * 2);
    S.nucleons.slice().sort((a, b) => a.y - b.y).forEach((q) => { const s = insetPos(q); drawBall(s.x, s.y, q.type, k * (q.type === 'n' ? ease(q.grow) : 1)); });
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#5b37c9'; ctx.font = font(15, true);
    ctx.fillText('🔍 원자핵 확대', I.x, I.y - I.r - 12);
    ctx.fillStyle = COL.muted; ctx.font = font(13, true);
    ctx.fillText('실제 원자핵은', I.x, I.y + I.r + 22);
    ctx.fillText('훨씬 더 작아요', I.x, I.y + I.r + 40);
  }

  // 1단계: 관찰 기록표
  function drawRecord(b) {
    cardBg(b);
    const cx = b.x + b.w / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.ink; ctx.font = font(17, true);
    ctx.fillText('📝 관찰 기록', cx, b.y + 30);
    ctx.fillStyle = COL.muted; ctx.font = font(13, true);
    ctx.fillText('입자를 눌러서 채워요', cx, b.y + 50);
    ['p', 'n', 'e'].forEach((k, i) => {
      const y0 = b.y + 66 + i * 112, P = PART[k], seen = S.seen[k];
      ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.x + 12, y0); ctx.lineTo(b.x + b.w - 12, y0); ctx.stroke();
      if (seen) drawBall(b.x + 30, y0 + 30, k, 1.5);
      else {
        ctx.fillStyle = '#eef2f7'; ctx.beginPath(); ctx.arc(b.x + 30, y0 + 30, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9aa5b6'; ctx.font = font(16, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', b.x + 30, y0 + 31);
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = seen ? P.col : '#9aa5b6'; ctx.font = font(19, true);
      ctx.fillText(seen ? P.name : '???', b.x + 56, y0 + 37);
      ctx.font = font(14, true);
      ctx.fillStyle = seen ? COL.muted : '#b5bfcd';
      ctx.fillText('위치: ' + (seen ? P.pos : '?'), b.x + 18, y0 + 72);
      ctx.fillStyle = seen ? P.col : '#b5bfcd';
      ctx.fillText('전하: ' + (seen ? P.charge : '?'), b.x + 18, y0 + 96);
    });
    if (S.seen.p && S.seen.n) {
      ctx.fillStyle = COL.sub; ctx.font = font(14, true); ctx.textAlign = 'center';
      ctx.fillText('원자핵 = 양성자 + 중성자', cx, b.y + b.h - 16);
    }
  }

  // 관찰 말풍선 (위쪽 가운데)
  function drawCallout() {
    const c = S.callout;
    if (!c) return;
    const age = S.time - c.t0;
    if (age > 4) { S.callout = null; return; }
    let pt;
    if (c.kind === 'e') {
      if (S.electrons.indexOf(c.ref) < 0) { S.callout = null; return; }
      pt = { x: c.ref.x, y: c.ref.y };
    } else {
      if (S.nucleons.indexOf(c.ref) < 0) { S.callout = null; return; }
      pt = c.inset && insetOn() ? insetPos(c.ref) : { x: c.ref.x, y: c.ref.y };
    }
    const P = PART[c.kind];
    const l1 = P.name + ' · ' + P.charge, l2 = P.pos + (c.kind === 'e' ? '를 움직여요' : '에 있어요');
    ctx.font = font(17, true);
    const w = Math.max(ctx.measureText(l1).width, (ctx.font = font(14, true), ctx.measureText(l2).width)) + 32;
    const h = 52, x = C.x - w / 2, y = S.target ? 46 : 8;
    const a = age > 3.5 ? (4 - age) / 0.5 : 1;
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.strokeStyle = rgba(P.col, 0.8); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(C.x, y + h); ctx.lineTo(pt.x, pt.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(pt.x, pt.y, (c.kind === 'e' ? ER : NR) * (c.inset ? insetScale() : 1) + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = P.col; ctx.font = font(17, true); ctx.fillText(l1, C.x, y + 23);
    ctx.fillStyle = COL.muted; ctx.font = font(14, true); ctx.fillText(l2, C.x, y + 43);
    ctx.restore();
  }

  // 원자핵·전자 이름표 (2단계부터, 전하량 표시)
  function tag(x, y, text, col) {
    ctx.font = font(14, true);
    const w = ctx.measureText(text).width + 22, h = 28;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
    roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
    ctx.textBaseline = 'alphabetic';
  }
  function leader(x0, y0, x1, y1, col, gap) {
    const d = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ex = x1 - (x1 - x0) / d * gap, ey = y1 - (y1 - y0) / d * gap;
    ctx.strokeStyle = rgba(col, 0.75); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  function drawLabels(p, e) {
    const pc = '#c4313a', ec = '#2a52d6';
    const nt = '원자핵 ' + signed(p);
    const et = e > 0 && S.ePt ? '전자 ' + e + '개 · ' + MINUS + e : '';
    const d = S.ringR + 20;
    ctx.font = font(14, true);
    const nw = ctx.measureText(nt).width + 22, ew = et ? ctx.measureText(et).width + 22 : 0;
    const nb = { x: Math.max(158, C.x - d * 0.74 - nw), y: Math.max(48, C.y - d * 0.68 - 28), w: nw, h: 28 };
    const eb = { x: Math.min(590 - ew, C.x + d * 0.74), y: Math.min(446, C.y + d * 0.68) };
    const nr = nucleusR();
    const sx = nb.x + nb.w - 16, sy = nb.y + nb.h;
    const ang = Math.atan2(sy - C.y, sx - C.x);
    leader(sx, sy, C.x + Math.cos(ang) * nr, C.y + Math.sin(ang) * nr, pc, 2);
    tag(nb.x, nb.y, nt, pc);
    if (et) { leader(eb.x + 16, eb.y, S.ePt.x, S.ePt.y, ec, ER + 2); tag(eb.x, eb.y, et, ec); }
  }

  function drawBins() {
    const B = bins();
    Object.keys(B).forEach((kind) => {
      const b = B[kind];
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
      const rows = [[-30, -10, 10, 30], [-20, 0, 20], [-10, 10]];
      rows.forEach((row, ri) => row.forEach((dx) => drawBall(cx + dx, b.y + 124 - ri * 17, kind, kind === 'p' ? 1.1 : 1, full ? 0.3 : 1)));
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = font(14, true);
      ctx.fillStyle = dropHere ? col : COL.muted;
      ctx.fillText(dropHere ? '여기에 놓아 빼기' : full ? '최대 개수예요' : '끌어서 넣기 ▶', cx, b.y + b.h - 14);
      if (isNew(kind === 'p' ? 'pbin' : 'ebin')) newRing(b);
    });
  }

  function drawIdCard(c, p, e) {
    const cx = c.x + c.w / 2, el = elem(p), q = p - e;
    cardBg(c);
    ctx.save(); roundRect(c.x, c.y, c.w, c.h, 14); ctx.clip();
    ctx.fillStyle = COL.sub; ctx.fillRect(c.x, c.y, c.w, 34);
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = font(15, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏷️ 원소 카드', cx, c.y + 18);
    const f = S.idFlash, flashing = f && S.time - f.t0 < 1.6;
    if (flashing) {
      const a = 1 - (S.time - f.t0) / 1.6, col = f.kind === 'element' ? COL.warn : COL.good;
      ctx.fillStyle = rgba(col, 0.16 * a + 0.04); ctx.strokeStyle = rgba(col, 0.9 * a); ctx.lineWidth = 2.5;
      roundRect(c.x + 10, c.y + 44, c.w - 20, 132, 12); ctx.fill(); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COL.ink; ctx.font = font(58, true);
    ctx.fillText(el.sym, cx, c.y + 102);
    ctx.font = font(21, true);
    ctx.fillText(el.name, cx, c.y + 136);
    ctx.fillStyle = COL.muted; ctx.font = font(14, true);
    ctx.fillText((flashing && f.kind === 'same' ? '🔒 ' : '') + '양성자 ' + p + '개인 원소', cx, c.y + 160);
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(c.x + 14, c.y + 184); ctx.lineTo(c.x + c.w - 14, c.y + 184); ctx.stroke();
    ctx.font = font(19, true);
    if (q === 0) {
      ctx.fillStyle = COL.good; ctx.fillText(el.name + ' 원자', cx, c.y + 212);
      ctx.fillStyle = COL.muted; ctx.font = font(13, true); ctx.fillText('전기적으로 중성', cx, c.y + 234);
    } else {
      ctx.fillStyle = COL.warn; ctx.fillText('전체 전하 ' + signed(q), cx, c.y + 212);
      ctx.fillStyle = COL.muted; ctx.font = font(13, true); ctx.fillText('중성 원자가 아니에요', cx, c.y + 234);
    }
  }

  function drawMeter(c, p, n, e) {
    const cx = c.x + c.w / 2, q = p - e;
    cardBg(c);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
    ctx.fillStyle = COL.ink; ctx.font = font(16, true);
    ctx.fillText('⚖️ 전체 전하', cx, c.y + 24);
    const gx = cx, gy = c.y + 110, r = 58;
    const ang = (v) => Math.PI * 1.5 + (clamp(v, -MAXQ - 0.4, MAXQ + 0.4) / MAXQ) * Math.PI * 0.5;
    ctx.lineCap = 'butt'; ctx.lineWidth = 14;
    ctx.strokeStyle = 'rgba(56,103,244,.75)'; ctx.beginPath(); ctx.arc(gx, gy, r, ang(-MAXQ), ang(-0.3)); ctx.stroke();
    ctx.strokeStyle = 'rgba(226,70,75,.8)'; ctx.beginPath(); ctx.arc(gx, gy, r, ang(0.3), ang(MAXQ)); ctx.stroke();
    ctx.strokeStyle = COL.good; ctx.beginPath(); ctx.arc(gx, gy, r, ang(-0.3), ang(0.3)); ctx.stroke();
    for (let v = -MAXQ; v <= MAXQ; v++) {
      const a = ang(v);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * (r - 7), gy + Math.sin(a) * (r - 7)); ctx.lineTo(gx + Math.cos(a) * (r + 7), gy + Math.sin(a) * (r + 7)); ctx.stroke();
      if (v % 2 === 0) {
        ctx.fillStyle = v > 0 ? '#c4313a' : v < 0 ? '#2a52d6' : '#0f8a4b';
        ctx.font = font(13, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(signed(v), gx + Math.cos(a) * (r + 18), gy + Math.sin(a) * (r + 16));
      }
    }
    ctx.textBaseline = 'alphabetic'; ctx.font = font(13, true); ctx.textAlign = 'center';
    if (q < -MAXQ) { ctx.fillStyle = '#2a52d6'; ctx.fillText('◀ 범위 넘음', gx - 42, gy + 20); }
    else { ctx.fillStyle = COL.muted; ctx.fillText('(−)가 많음', gx - 42, gy + 20); }
    if (q > MAXQ) { ctx.fillStyle = '#c4313a'; ctx.fillText('범위 넘음 ▶', gx + 42, gy + 20); }
    else { ctx.fillStyle = COL.muted; ctx.fillText('(+)가 많음', gx + 42, gy + 20); }
    const a = ang(S.needle);
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(a) * (r - 14), gy + Math.sin(a) * (r - 14)); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(gx, gy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = q > 0 ? '#c4313a' : q < 0 ? '#2a52d6' : '#0f8a4b';
    ctx.font = font(30, true);
    ctx.fillText(signed(q), gx, gy + 54);
    // (+) + (0) + (−) 의 합
    const cols = [['양성자', '+' + p, '#c4313a'], ['중성자', '0', '#5d6879'], ['전자', e ? MINUS + e : '0', '#2a52d6']];
    cols.forEach(([lab, val, col], i) => {
      const x = c.x + 32 + i * 62;
      ctx.fillStyle = COL.muted; ctx.font = font(13, true); ctx.fillText(lab, x, c.y + c.h - 30);
      ctx.fillStyle = col; ctx.font = font(16, true); ctx.fillText(val, x, c.y + c.h - 10);
    });
    ctx.fillStyle = COL.muted; ctx.font = font(14, true);
    ctx.fillText('+', c.x + 63, c.y + c.h - 11); ctx.fillText('+', c.x + 125, c.y + c.h - 11);
  }

  function drawTarget(p, e) {
    const T = S.target;
    if (!T) return;
    const ok = p === T.p && e === T.e;
    const text = (ok ? '✔ 목표 달성: ' : '🎯 목표: ') + T.text;
    ctx.font = font(15, true);
    const tw = ctx.measureText(text).width + 28, x = C.x - tw / 2, y = 8, h = 32;
    ctx.fillStyle = ok ? COL.good : '#fff';
    ctx.strokeStyle = ok ? COL.good : COL.sub; ctx.lineWidth = 2;
    roundRect(x, y, tw, h, 16); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ok ? '#fff' : '#5b37c9'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, C.x, y + 22);
  }

  function drawBanner() {
    const b = S.banner;
    if (!b) return;
    const age = S.time - b.t0;
    if (age > 2.8) { S.banner = null; return; }
    const a = age < 0.15 ? age / 0.15 : age > 2.4 ? (2.8 - age) / 0.4 : 1;
    let size = 15;
    ctx.font = font(size, true);
    while (ctx.measureText(b.text).width > 410 && size > 13) { size -= 0.5; ctx.font = font(size, true); }
    const tw = ctx.measureText(b.text).width + 26;
    const y = 484 + (1 - a) * 8;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = b.color;
    roundRect(C.x - tw / 2, y, tw, 30, 15); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.text, C.x, y + 16);
    ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
  }

  /* ---------- DOM 측정값/버튼 ---------- */
  const rP = $('#rP'), rN = $('#rN'), rE = $('#rE'), oP = $('#oP'), oE = $('#oE');
  let uiKey = '';
  function updateUI(force) {
    const p = np(), n = nn(), e = ne(), key = p + ':' + n + ':' + e;
    if (!force && key === uiKey) return;
    uiKey = key;
    rP.innerHTML = p + '<small>개 (+' + p + ')</small>';
    rN.innerHTML = n + '<small>개 (전하 0)</small>';
    rE.innerHTML = e + '<small>개 (' + (e ? MINUS + e : '0') + ')</small>';
    oP.textContent = p; oE.textContent = e;
    $('#pMinus').disabled = p <= 1; $('#pPlus').disabled = p >= MAX_P;
    $('#eMinus').disabled = e <= 0; $('#ePlus').disabled = e >= MAX_E;
  }
  function sideNote() {
    if (on('pbin')) return '💡 양성자를 넣으면 <b>중성자</b>는 이 원소에 맞게 자동으로 채워져요.';
    return '💡 전자를 원 안에 끌어다 놓으면 들어가고, 원 밖으로 끌어내면 빠져요.';
  }

  $('#pPlus').addEventListener('click', () => plus('p'));
  $('#pMinus').addEventListener('click', () => minus('p'));
  $('#ePlus').addEventListener('click', () => plus('e'));
  $('#eMinus').addEventListener('click', () => minus('e'));
  $('#resetBtn').addEventListener('click', () => { Sound.click(); resetCurrent(); });

  /* ---------- 미션 도우미 ---------- */
  const is = (p, e) => np() === p && ne() === e;
  function setTarget(p, e, text) { S.target = { p, e, text }; }
  function statusLine() {
    const p = np(), e = ne(), q = p - e;
    let s = '양성자 <b>' + p + '</b>개 · 중성자 <b>' + nn() + '</b>개 · 전자 <b>' + e + '</b>개 → 전체 전하 <b>' + signed(q) + '</b>';
    if (on('idcard')) s += ' · 원소 <b>' + elem(p).name + '(' + elem(p).sym + ')</b>';
    return s;
  }
  const seenLine = () => '찾은 입자: ' + ['p', 'n', 'e'].map((k) => (S.seen[k] ? '✔ <b>' : '○ ') + PART[k].name + (S.seen[k] ? '</b>' : '')).join(' · ');

  // 적용 퀴즈용 모형: 양성자 3, 중성자 4, 전자 3 (원자핵을 크게 그려 셀 수 있게)
  function modelSVG() {
    const cx = 120, cy = 120;
    let s = '<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="빨간 입자 3개와 회색 입자 4개로 된 원자핵, 전자 3개인 원자 모형">';
    s += '<circle cx="120" cy="120" r="117" fill="#f4f7fd"/>';
    [74, 106].forEach((r) => { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#9fb3e6" stroke-width="1.5" stroke-dasharray="4 5"/>'; });
    s += '<circle cx="120" cy="120" r="50" fill="#ffe3e3" opacity=".7"/>';
    const nuc = [[0, 0, 'n']];
    ['p', 'n', 'p', 'n', 'p', 'n'].forEach((t, i) => { const a = (i * 60 - 90) * Math.PI / 180; nuc.push([Math.cos(a) * 29, Math.sin(a) * 29, t]); });
    nuc.forEach(([dx, dy, t]) => {
      const x = (cx + dx).toFixed(1), y = (cy + dy).toFixed(1);
      s += '<circle cx="' + x + '" cy="' + y + '" r="14" fill="' + (t === 'p' ? '#e2464b' : '#a3acbb') + '" stroke="#fff" stroke-width="2"/>';
      if (t === 'p') s += '<text x="' + x + '" y="' + (+y + 6) + '" text-anchor="middle" font-size="19" font-weight="800" fill="#fff" font-family="sans-serif">+</text>';
    });
    [[74, 180], [74, 0], [106, -50]].forEach(([r, deg]) => {
      const a = deg * Math.PI / 180, x = (cx + Math.cos(a) * r).toFixed(1), y = (cy + Math.sin(a) * r).toFixed(1);
      s += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="#3867f4"/><text x="' + x + '" y="' + (+y + 5) + '" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" font-family="sans-serif">' + MINUS + '</text>';
    });
    return s + '</svg>';
  }

  /* ---------- 탐구 단계 ---------- */
  const LEVELS = [
    {
      title: '원자 모형 살펴보기', short: '구성 입자', icon: '🔍', phase: '관찰',
      features: ['inspect'],
      intro: '<p>❓ <b>탐구 질문: 모든 물질을 이루는 원자 속에는 무엇이 있을까?</b></p>' +
        '<p>원자는 너무 작아 눈으로 볼 수 없어서 <b>원자 모형</b>으로 나타내요. 헬륨 원자 모형 속 입자를 하나씩 눌러 보며 관찰해 봐요.</p>',
      setup() { setState(2, 2); showHint('👆 확대 그림의 입자와 파란 전자를 눌러 보세요', 7000); },
      recap: '원자는 <b>원자핵</b>(양성자 + 중성자)과 그 주위를 움직이는 <b>전자</b>로 이루어져 있어요.',
      summary: '<p>원자는 중심의 <b>원자핵</b>과 그 주위를 움직이는 <b>전자</b>로 이루어져 있다. 원자핵은 <b>양성자</b>와 <b>중성자</b>로 이루어져 있다.</p>' +
        '<table><tr><th>입자</th><th>위치</th><th>전하</th></tr><tr><td>양성자</td><td>원자핵 속</td><td>(+)</td></tr>' +
        '<tr><td>중성자</td><td>원자핵 속</td><td>없음</td></tr><tr><td>전자</td><td>원자핵 주위</td><td>(−)</td></tr></table>' +
        '<p class="note">※ 원자핵은 원자 크기에 비해 매우 작아요. 모형의 크기와 전자의 원은 보기 쉽게 그린 것이에요.</p>',
      missions: [
        {
          title: '원자 속 입자 찾기',
          goal: '확대 그림의 <b>빨간 입자</b>, <b>회색 입자</b>와 원자핵 주위의 <b>파란 입자</b>를 하나씩 눌러 보세요.',
          hint: '왼쪽 <b>🔍 원자핵 확대</b> 그림 속 입자를 손가락으로 톡 눌러요. 오른쪽 관찰 기록이 채워져요.',
          focus: 'inset',
          setup() { S.seen = { p: false, n: false, e: false }; if (!is(2, 2)) setState(2, 2); },
          check: () => S.seen.p && S.seen.n && S.seen.e,
          status: seenLine,
          hold: 0.4,
          explain: '원자핵 속에는 (+)전하를 띤 <b>양성자</b>와 전하를 띠지 않는 <b>중성자</b>가 있고, 원자핵 주위에는 (−)전하를 띤 <b>전자</b>가 움직여요.',
        },
        {
          type: 'quiz',
          title: '세 입자의 전하',
          goal: '원자를 이루는 세 입자의 전하를 바르게 짝지은 것은?',
          choices: [
            '양성자 (+), 중성자 (−), 전자 (−)',
            '양성자 (−), 중성자 없음, 전자 (+)',
            '양성자 (+), 중성자 없음, 전자 (−)',
            '양성자 없음, 중성자 (+), 전자 (−)',
          ],
          answer: 2,
          feedback: [
            '중성자는 이름처럼 전하를 띠지 <b>않아요</b>. 관찰 기록을 다시 보세요.',
            '양성자와 전자의 전하가 반대로 되었어요. 빨간 입자와 파란 입자에 적힌 부호를 보세요.',
            '',
            '(+)전하를 띠는 것은 빨간 <b>양성자</b>예요. 회색 중성자에는 부호가 없어요.',
          ],
          explain: '양성자는 <b>(+)전하</b>, 중성자는 <b>전하가 없고</b>, 전자는 <b>(−)전하</b>를 띠어요. 그래서 양성자와 중성자로 된 원자핵은 (+)전하를 띠어요.',
        },
        {
          type: 'quiz',
          title: '원자핵은 어디에?',
          goal: '원자핵에 대한 설명으로 옳은 것은?',
          choices: [
            '원자핵은 원자의 대부분의 공간을 차지한다',
            '원자핵은 원자의 중심에 있고, 원자 크기에 비해 매우 작다',
            '원자핵 속에는 전자가 들어 있다',
            '원자핵은 전하를 띠지 않는다',
          ],
          answer: 1,
          feedback: [
            '모형에서는 보기 쉽게 크게 그렸지만, 실제 원자핵은 원자에 비해 <b>아주 작아요</b>.',
            '',
            '전자는 원자핵 <b>바깥</b>, 그 주위를 움직여요. 원자핵 속에는 양성자와 중성자가 있어요.',
            '원자핵 속 <b>양성자</b>가 (+)전하를 띠므로 원자핵은 (+)전하를 띠어요.',
          ],
          explain: '원자핵은 원자의 <b>중심</b>에 있고 원자 크기에 비해 <b>매우 작아요</b>. 원자를 축구장만큼 키워도 원자핵은 그 한가운데의 모래알 정도예요. 전자는 원자핵 주위를 움직여요.',
        },
      ],
    },
    {
      title: '원자는 전기적으로 중성', short: '중성', icon: '⚖️', phase: '탐구',
      features: ['ebin', 'meter'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원자핵에는 (+)전하를 띤 양성자와 전하가 없는 중성자가, 그 주위에는 (−)전하를 띤 전자가 있음을 알았어요.</div>' +
        '<p>그렇다면 원자 <b>전체</b>는 어떤 전하를 띨까요? <b>전하 계기판</b>으로 양성자(+1씩)와 전자(−1씩)의 전하를 더해 봐요.</p>',
      setup() { setState(6, 0); showHint('👆 전자 상자에서 전자를 끌어 원자에 넣어 보세요', 6000); },
      recap: '원자는 <b>양성자 수 = 전자 수</b>라서 (+)전하량과 (−)전하량이 같아 <b>전기적으로 중성</b>이에요.',
      summary: '<span class="formula">양성자 수 = 전자 수 → 원자는 전기적으로 중성</span>' +
        '<ul><li>양성자 1개는 +1, 전자 1개는 −1의 전하를 띤다. 원자에서는 (+)전하량과 (−)전하량이 같다.</li>' +
        '<li>중성자는 전하가 없어서 전체 전하에 영향을 주지 않는다.</li></ul>',
      missions: [
        {
          title: '중성 원자 만들기',
          goal: '원자핵에 <b>양성자 6개</b>(+6)가 있어요. 전자를 넣어 <b>전체 전하가 0</b>인 원자를 만들어 보세요.',
          hint: '파란 <b>전자 상자</b>에서 전자를 끌어 원 안에 놓아요(전자 <b>+</b> 버튼도 돼요). 전자 1개를 넣을 때마다 전체 전하가 1씩 줄어요.',
          focus: 'e',
          setup() { setState(6, 0); setTarget(6, 6, '전체 전하 0'); },
          check: () => is(6, 6),
          status: () => statusLine() + (ne() > 6 ? '<br>⚠️ 전자가 너무 많아 (−)전하가 더 커졌어요. 전자를 빼 보세요.' : ''),
          hold: 0.6,
          explain: '양성자 6개의 전하 <b>+6</b>과 전자 6개의 전하 <b>−6</b>을 더하면 0이에요. 중성자 6개는 전하가 없어서 계산에 들어가지 않아요.',
        },
        {
          type: 'quiz',
          title: '전자는 몇 개?',
          goal: '원자핵에 <b>양성자 8개</b>와 <b>중성자 8개</b>가 있는 원자예요. 이 원자에 전자는 몇 개 있을까요?',
          choices: ['0개', '4개', '8개', '16개'],
          answer: 2,
          feedback: [
            '전자가 없으면 원자 전체가 (+)전하를 띠게 돼요. 원자는 전기적으로 중성이에요.',
            '양성자 8개의 전하 +8을 없애려면 (−)전하가 얼마나 필요할까요?',
            '',
            '중성자는 전하가 <b>없어요</b>! (+)전하를 띠는 양성자 수만 생각해야 해요.',
          ],
          explain: '원자는 중성이므로 <b>전자 수 = 양성자 수 = 8개</b>예요. 중성자는 전하가 없어서 전자 수와 관계없어요. (공방에서 직접 확인해 봐도 좋아요)',
        },
        {
          type: 'quiz',
          title: '원자는 왜 중성일까?',
          goal: '원자가 전체적으로 전하를 띠지 않는(<b>전기적으로 중성</b>인) 까닭으로 옳은 것은?',
          setup() { if (!is(6, 6)) setState(6, 6); },
          choices: [
            '원자 속 입자들은 모두 전하를 띠지 않기 때문',
            '중성자가 양성자와 전자의 전하를 없애 주기 때문',
            '양성자 수와 전자 수가 같아 (+)전하량과 (−)전하량이 같기 때문',
            '전자가 원자핵 속에 들어가 있기 때문',
          ],
          answer: 2,
          feedback: [
            '양성자는 (+), 전자는 (−)전하를 띠어요. 전하가 없는 것은 중성자뿐이에요.',
            '중성자는 전하가 없어서 다른 입자의 전하를 바꾸지 못해요. 계기판에서 중성자는 0이었죠?',
            '',
            '전자는 원자핵 <b>밖</b>, 원자핵 주위를 움직여요.',
          ],
          explain: '원자 속에는 (+)전하를 띤 양성자와 (−)전하를 띤 전자가 <b>같은 수</b>만큼 있어요. 그래서 (+)전하량과 (−)전하량이 같아 원자는 <b>전기적으로 중성</b>이에요.',
        },
      ],
    },
    {
      title: '양성자 수가 원소를 결정한다', short: '원소 결정', icon: '🏷️', phase: '설명',
      features: ['pbin', 'idcard'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원자는 양성자 수와 전자 수가 같아 <b>전기적으로 중성</b>이라는 것을 알았어요. 양성자 6개인 원자도 만들었죠.</div>' +
        '<p>원자마다 양성자 수가 달라요. 양성자 수가 바뀌면 무엇이 달라질까요? <b>양성자 상자</b>와 <b>원소 카드</b>로 알아봐요.</p>',
      setup() { setState(6, 6); showHint('🏷️ 원소 카드에서 양성자 6개인 원자의 정체를 확인해요', 6000); },
      recap: '원소의 종류는 <b>양성자 수</b>로 정해져요. 양성자 수가 달라지면 다른 원소가 돼요.',
      summary: '<ul><li>원소의 종류는 원자핵 속 <b>양성자 수</b>에 따라 달라진다.</li>' +
        '<li>양성자 수가 같으면 같은 원소이다. 전자 수나 중성자 수로 원소를 정하지 않는다.</li></ul>' +
        '<table><tr><th>원소</th><th>양성자 수</th><th>원소</th><th>양성자 수</th></tr>' +
        '<tr><td>수소 (H)</td><td>1</td><td>질소 (N)</td><td>7</td></tr>' +
        '<tr><td>헬륨 (He)</td><td>2</td><td>산소 (O)</td><td>8</td></tr>' +
        '<tr><td>리튬 (Li)</td><td>3</td><td>플루오린 (F)</td><td>9</td></tr>' +
        '<tr><td>탄소 (C)</td><td>6</td><td>나트륨 (Na)</td><td>11</td></tr></table>',
      missions: [
        {
          title: '탄소를 산소로!',
          goal: '지금은 양성자가 6개인 <b>탄소 원자</b>예요. 양성자와 전자를 넣어 <b>산소 원자</b>(중성)로 바꿔 보세요.',
          hint: '빨간 <b>양성자 상자</b>에서 양성자를 하나씩 넣으며 원소 카드를 보세요. 산소가 되면 전자도 같은 수만큼 넣어 중성으로 맞춰요.',
          focus: 'p',
          setup() { setState(6, 6); setTarget(8, 8, '산소 원자 (중성)'); },
          check: () => is(8, 8),
          status: () => {
            const p = np(), e = ne();
            let extra = '';
            if (p === 8 && e < 8) extra = '<br>👍 산소가 되었어요! 이제 전체 전하를 0으로 맞춰요.';
            else if (p < 8 && e > p) extra = '<br>🤔 전자만 넣으면 원소는 바뀌지 않아요. 원소 카드를 보세요!';
            else if (p > 8) extra = '<br>⚠️ 양성자가 너무 많아요. 원소 카드를 보세요.';
            return statusLine() + extra;
          },
          hold: 0.6,
          explain: '양성자를 넣을 때마다 원소가 탄소(6) → 질소(7) → <b>산소(8)</b>로 바뀌었어요. 전자를 넣어도 원소는 그대로였죠? <b>원소를 정하는 것은 양성자 수</b>예요.',
        },
        {
          type: 'quiz',
          title: '원소를 정하는 것은?',
          goal: '원자의 종류, 즉 <b>원소</b>를 결정하는 것은 무엇일까요?',
          choices: ['전자의 수', '양성자의 수', '중성자의 수', '원자핵 속 입자의 총수'],
          answer: 1,
          feedback: [
            '앞 미션에서 전자를 넣어도 원소 카드는 바뀌지 않았어요. 전자 수로는 원소가 정해지지 않아요!',
            '',
            '중성자는 양성자 수에 맞춰 함께 바뀌었을 뿐이에요. 원소 카드를 바꾼 것은 어떤 입자였나요?',
            '원자핵 속에는 양성자와 중성자가 있어요. 그중 원소를 결정하는 것은 하나뿐이에요.',
          ],
          explain: '원소의 종류는 <b>양성자 수</b>로 정해져요. 양성자가 1개면 언제나 수소, 6개면 탄소, 8개면 산소예요.',
        },
      ],
    },
    {
      title: '원소 탐정', short: '적용', icon: '🕵️', phase: '적용',
      features: [],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원소의 종류는 <b>양성자 수</b>로 정해진다는 것을 알았어요.</div>' +
        '<p>이제 원자 모형이나 단서만 보고 어떤 원소인지 찾아내는 <b>원소 탐정</b>이 되어 봐요!</p>',
      setup() { setState(8, 8); },
      recap: '원자 모형에서 <b>양성자 수</b>를 세면 원소를 알 수 있고, 중성 원자는 <b>전자 수 = 양성자 수</b>예요.',
      summary: '<ul><li>원자 모형에서 원소를 찾으려면 <b>양성자 수</b>만 센다. (중성자 수, 전체 입자 수 ✗)</li>' +
        '<li>중성 원자는 전자 수 = 양성자 수이므로, 전자 수로도 양성자 수를 알 수 있다.</li></ul>',
      missions: [
        {
          type: 'quiz',
          title: '이 원자는 무엇일까?',
          goal: '다음 원자 모형이 나타내는 원소는? (빨간색: 양성자, 회색: 중성자, 파란색: 전자)',
          figure: modelSVG(),
          choices: ['리튬 (양성자 3개인 원소)', '베릴륨 (양성자 4개인 원소)', '질소 (양성자 7개인 원소)', '네온 (양성자 10개인 원소)'],
          answer: 0,
          feedback: [
            '',
            '회색 입자 4개는 전하가 없는 <b>중성자</b>예요. 원소는 빨간 양성자 수로 정해요!',
            '원자핵 속 입자를 모두 센 7개는 양성자와 중성자를 합한 수예요. 양성자만 세어 보세요.',
            '모든 입자(10개)를 세면 안 돼요. 원소를 정하는 입자는 하나뿐이에요.',
          ],
          explain: '빨간 <b>양성자가 3개</b>이므로 이 원자는 <b>리튬</b>이에요. 전자도 3개라서 중성 원자예요. 중성자 수는 원소를 정할 때 세지 않아요.',
        },
        {
          title: '수수께끼 원자 X',
          goal: '원자 X는 전자가 <b>9개</b>인 중성 원자예요. 공방에서 원자 X를 만들어 원소 카드로 정체를 밝혀 보세요.',
          hint: '중성 원자는 양성자 수와 전자 수가 같아요. 양성자도 9개가 되도록 넣어 보세요.',
          focus: 'id',
          setup() { setState(8, 8); setTarget(9, 9, '전자 9개인 중성 원자 X'); },
          check: () => is(9, 9),
          status: () => {
            const p = np(), e = ne();
            let extra = '';
            if (e === 9 && p !== 9) extra = '<br>👍 전자 9개! 그런데 아직 중성이 아니에요. 양성자는 몇 개여야 할까요?';
            else if (p === 9 && e !== 9) extra = '<br>👍 양성자 9개! 이제 전자를 9개로 맞춰 중성으로 만들어요.';
            return statusLine() + extra;
          },
          hold: 0.6,
          explain: '중성 원자는 <b>양성자 수 = 전자 수</b>이므로 원자 X의 양성자는 9개예요. 원소 카드가 알려 준 원자 X의 정체는 <b>플루오린(F)</b>이에요.',
        },
      ],
    },
  ];

  function resetCurrent() {
    if (!game || game.phase === 'complete' || game.free) { setState(6, 6); return; }
    const m = game.current();
    if (game.phase !== 'intro' && m && m.setup) { m.setup(); return; }
    const lv = LEVELS[game.level];
    if (lv && lv.setup) lv.setup(); else setState(6, 6);
  }

  game = SciSim.game({
    simId: 'm2-build-atom',
    mount: '#game',
    badge: '원자 탐험가',
    homeHref: '../../index.html#g2',
    featureLabels: {
      inspect: '🔍 입자 눌러 관찰하기 · 원자핵 확대',
      ebin: '🔵 전자 상자',
      meter: '⚖️ 전하 계기판',
      pbin: '🔴 양성자 상자 (중성자는 자동)',
      idcard: '🏷️ 원소 카드',
    },
    onFeatures(set) {
      F = set;
      if (S.drag && ((S.drag.kind === 'p' && !on('pbin')) || (S.drag.kind === 'e' && !on('ebin')))) S.drag = null;
      $('#tbLabel').hidden = on('meter');
      document.body.classList.toggle('no-ctrl', !on('ebin'));
      $('#sideNote').innerHTML = sideNote();
      if (!on('idcard')) S.banner = null;
      updateUI(true);
    },
    onMissionStart(m) {
      S.target = null; S.focus = null;
      if (!S.nucleons.length) { const lv = LEVELS[m._level]; if (lv && lv.setup) lv.setup(); }
    },
    onHint(m) { if (m.focus) S.focus = { what: m.focus, t0: S.time }; },
    onComplete() { S.target = null; S.focus = null; },
    levels: LEVELS,
  });

  /* ---------- 시작 ---------- */
  if (!S.nucleons.length) setState(2, 2);
  SciSim.loop((dt) => { step(dt); draw(); updateUI(); });
})();
