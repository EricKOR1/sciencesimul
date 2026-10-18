(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 720 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#eef2fa' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = [];
    String(str).split('\n').forEach((para) => {
      let line = '';
      para.split(' ').forEach((tok) => {
        const sep = line ? ' ' : '';
        if (ctx.measureText(line + sep + tok).width <= maxW) { line += sep + tok; return; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(tok).width <= maxW) { line = tok; return; }
        for (const ch of tok) { if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
      });
      out.push(line);
    });
    ctx.restore(); return out;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700); ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700)); return ls.length * lh;
  }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3600);
  }
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const f0 = (v) => String(Math.round(v));
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- 파장 → 색 ---------- */
  const WLC = [];
  (function () {
    for (let i = 0; i <= 800; i++) {
      const l = 380 + i * 0.5;
      let r = 0, g = 0, b = 0;
      if (l < 440) { r = -(l - 440) / 60; b = 1; }
      else if (l < 490) { g = (l - 440) / 50; b = 1; }
      else if (l < 510) { g = 1; b = -(l - 510) / 20; }
      else if (l < 580) { r = (l - 510) / 70; g = 1; }
      else if (l < 645) { r = 1; g = -(l - 645) / 65; }
      else { r = 1; }
      const f = l < 420 ? 0.45 + 0.55 * (l - 380) / 40 : l > 700 ? 0.45 + 0.55 * (780 - l) / 80 : 1;
      const gm = 0.8;
      WLC.push([Math.round(255 * Math.pow(Math.max(0, r) * f, gm)), Math.round(255 * Math.pow(Math.max(0, g) * f, gm)), Math.round(255 * Math.pow(Math.max(0, b) * f, gm))]);
    }
  })();
  const wl = (l) => WLC[clamp(Math.round((l - 380) * 2), 0, 800)];
  const wlHex = (l, a) => { const c = wl(l); return a == null ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')' : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const rgbHex = (c) => '#' + c.map((v) => ('0' + v.toString(16)).slice(-2)).join('');
  const wlSolid = (l) => rgbHex(wl(l));

  /* ---------- 캔버스 버튼 · 포인터 ---------- */
  const HITS = [];
  const DRAG = { down: null, move: null, up: null, hover: null };
  function hitAt(p) { for (let i = HITS.length - 1; i >= 0; i--) { const h = HITS[i]; if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; }
  function cbtn(x, y, w, h, label, fn, o) {
    o = o || {};
    const on = !!o.on, dis = !!o.disabled;
    D.roundRect(x, y, w, h, o.r != null ? o.r : h / 2);
    ctx.fillStyle = dis ? '#eef0f4' : on ? (o.color || '#f26b3a') : '#fff'; ctx.fill();
    ctx.lineWidth = 2.2; ctx.strokeStyle = dis ? '#cfd5df' : (o.color || '#f26b3a'); ctx.stroke();
    T(x + w / 2, y + h / 2 + (o.size || 14) * 0.36, label, o.size || 14, dis ? '#a3acba' : on ? '#fff' : '#26324a', 'center', 800);
    if (!dis && fn) HITS.push({ x, y, w, h, fn });
  }
  let press = null;
  SciSim.pointer(view, {
    down(p) {
      if (DRAG.down && DRAG.down(p)) { press = { drag: true }; return true; }
      const h = hitAt(p); if (h) { press = { hit: h, x: p.x, y: p.y }; return true; } return false;
    },
    move(p) { if (press && press.drag && DRAG.move) DRAG.move(p); },
    up(p) {
      if (press && press.drag) { DRAG.up && DRAG.up(p); }
      else if (press && press.hit && Math.hypot(p.x - press.x, p.y - press.y) < 14) press.hit.fn(p);
      press = null;
    },
    hover(p) { if (DRAG.hover) { const c = DRAG.hover(p); if (c) return c; } return hitAt(p) ? 'pointer' : 'default'; },
  });

  /* ---------- 읽음 칸 · 툴바 ---------- */
  let rlast = '';
  function readouts(L1, a, L2, b, L3, c) {
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    $('#l1').textContent = L1; $('#v1').textContent = a; $('#l2').textContent = L2; $('#v2').textContent = b; $('#l3').textContent = L3; $('#v3').textContent = c;
  }
  function setTb(label, items, cur, onPick) {
    $('#tbLabel').textContent = label;
    const seg = $('#tbSeg'); seg.innerHTML = '';
    seg.hidden = !items || items.length < 2;
    (items || []).forEach((it) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = it[1]; b.dataset.v = it[0];
      b.classList.toggle('on', it[0] === cur);
      b.addEventListener('click', () => { Sound.click(); onPick(it[0]); });
      seg.appendChild(b);
    });
  }
  const setSlider = (id, v, min, max, outId, txt) => {
    const e = $(id); if (!e) return; if (+e.value !== v) e.value = v;
    e.style.setProperty('--pct', ((v - min) / (max - min) * 100) + '%');
    if (outId) $(outId).textContent = txt;
  };
  const syncSeg = (sel, v) => $$(sel + ' button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
  function mkSelects(host, defs, store, okStore) {
    // defs: [[question, [[value, label]...], answer]]
    host.innerHTML = '';
    const sels = [];
    defs.forEach((w, i) => {
      const row = document.createElement('div'); row.className = 'sel-row';
      row.innerHTML = '<div class="q">' + w[0] + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', w[0].replace(/<[^>]+>/g, ''));
      sel.innerHTML = '<option value="">— 고르기 —</option>' + w[1].map((o) => '<option value="' + o[0] + '">' + o[1] + '</option>').join('');
      sel.addEventListener('change', () => { store[i] = sel.value; sel.classList.remove('ok', 'bad'); delete okStore[i]; Sound.click(); });
      row.appendChild(sel); host.appendChild(row); sels.push(sel);
    });
    return sels;
  }
  function checkSelects(defs, sels, store, okStore) {
    const miss = defs.filter((w, i) => !store[i]);
    if (miss.length) return { miss: miss.length };
    let bad = 0;
    defs.forEach((w, i) => {
      const ok = store[i] === w[2];
      if (!ok) bad++;
      if (!ok && okStore[i] !== false) { sels[i].classList.remove('ok', 'bad'); void sels[i].offsetWidth; sels[i].classList.add('bad'); }
      if (ok) { sels[i].classList.remove('bad'); sels[i].classList.add('ok'); }
      okStore[i] = ok;
    });
    return { bad };
  }
  const numOf = (s) => parseFloat(String(s).replace(',', '.'));


  /* =========================================================
     물리학 Ⅲ. 빛과 물질 - 수소 원자와 에너지 준위 (단원 5차시)
     성취기준 [12물리03-04] 원자 내의 전자는 양자화된 에너지 준위를 가지고 있음을 스펙트럼 관찰 증거를 바탕으로 논증할 수 있다.
     ① 관찰: 수소 방전관의 선스펙트럼 (분광기 눈금 읽기)
     ② 탐구: 선 → 광자 에너지 → 불연속 에너지 (두 가설 비교)
     ③ 모형: 보어 모형 (전이 · 방출 · 흡수)
     ④ 분석: 보어 모형의 한계 (헬륨 · 전자 구름)
     보어 반지름 유도, 각운동량 양자화 조건, 리드베리 식, 슈뢰딩거 방정식, 양자수 l·m은 다루지 않아요.
     ========================================================= */

  /* ---------- 모델 상수 (화면의 숫자와 모두 같은 값) ---------- */
  const HC = 1240, E_ION = 13.6, TOL = 0.03;                    // E(eV) = 1240 / λ(nm), 이온화 에너지 13.6 eV, 흡수 허용 오차 ±0.03 eV
  const NLEV = 6;
  const En = (n) => -E_ION / (n * n);
  const dEn = (hi, lo) => En(hi) - En(lo);
  const lamOf = (e) => HC / e;
  const fmtNm = (l) => (l < 200 ? (Math.round(l * 10) / 10).toFixed(1) : String(Math.round(l)));
  const kindOf = (l) => (l < 400 ? 'uv' : l > 700 ? 'ir' : 'vis');
  const H_LINES = [3, 4, 5, 6].map((n, i) => ({ n, nm: Math.round(lamOf(dEn(n, 2))), a: [1, 0.78, 0.58, 0.48][i] }));   // 656 486 434 410
  const E_OBS = H_LINES.map((l) => Math.round(HC / l.nm * 100) / 100);                                               // 1.89 2.55 2.86 3.02
  const LINES = {
    H: H_LINES,
    He: [{ nm: 668, a: 0.55 }, { nm: 588, a: 1 }, { nm: 502, a: 0.8 }, { nm: 447, a: 0.62 }],
    Ne: [{ nm: 585, a: 0.8 }, { nm: 594, a: 0.55 }, { nm: 603, a: 0.5 }, { nm: 609, a: 0.6 }, { nm: 614, a: 0.95 }, { nm: 621, a: 0.6 }, { nm: 627, a: 0.7 }, { nm: 633, a: 0.62 }, { nm: 640, a: 0.9 }],
  };
  const SRC = {
    incand: { name: '백열등', kind: '연속 스펙트럼', tint: '#ffd9a0', cls: 'c' },
    H: { name: '수소 방전관', kind: '선스펙트럼', tint: '#e879f9', cls: 'l' },
    He: { name: '헬륨 방전관', kind: '선스펙트럼', tint: '#fde68a', cls: 'l' },
    Ne: { name: '네온 방전관', kind: '선스펙트럼', tint: '#fb7a24', cls: 'l' },
  };
  const A0_NM = 0.0529;                                          // 보어 반지름 (nm) - 전자 구름의 가장 확률 높은 거리
  const SNAP = 4;                                                // 눈금이 선에 닿았다고 보는 범위 (nm)

  /* ---------- 상태 ---------- */
  const mkS = () => ({ src: 'incand', nm: 550, rec: {} });
  const mkL = () => ({ vals: ['', '', '', ''], ok: [false, false, false, false], rungA: [0, 0, 0, 0] });
  const clsSt = {}, clsOk = {}, hypSt = {}, hypOk = {};
  const mkB = () => ({ mode: 'emit', n: 1, ang: 0, rad: 0, ph: 1.9, photon: null, seen: {}, absorbed: 0, lit: [], last: '', pred: { ly: '', pa: '' }, ion: 0, busy: 0 });
  const mkK = () => ({ view: 'he', ring: 3, ringSeen: false, ph: 0 });
  const S = { mode: 'spec', t: 0, fade: 0, s: mkS(), l: mkL(), b: mkB(), k: mkK() };
  let game = null, need = '';
  const MODES = { spec: '🔭 분광기', ladder: '🪜 에너지 사다리', bohr: '⚛️ 보어 모형', limit: '🔬 보어 모형의 한계' };
  const K_VIEWS = [['he', '헬륨 비교'], ['cloud', '전자 구름'], ['abs', '흡수선']];
  S.b.rad = 0;

  /* ---------- 장면 · 컨트롤 ---------- */
  const subOf = () => (S.mode === 'bohr' ? S.b.mode : S.mode === 'limit' ? S.k.view : '');
  function setScene(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); }
    S.mode = mode;
    updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on && n.hasAttribute('data-need')) on = n.getAttribute('data-need') === need;
      if (on && n.hasAttribute('data-hide')) on = n.getAttribute('data-hide') !== need;
      if (on && n.hasAttribute('data-sub')) on = n.getAttribute('data-sub').split(' ').indexOf(subOf()) >= 0;
      n.hidden = !on;
    });
    if (S.mode === 'limit') setTb(MODES.limit, K_VIEWS, S.k.view, (v) => { S.k.view = v; S.fade = 1; updateCtl(); });
    else setTb(MODES[S.mode], null);
    syncSeg('#srcSeg', S.s.src); syncSeg('#bmSeg', S.b.mode);
    setSlider('#sNm', S.s.nm, 400, 700, '#oNm', S.s.nm + ' nm');
    setSlider('#sPh', S.b.ph, 0.5, 13.25, '#oPh', f2(S.b.ph) + ' eV');
    setSlider('#sRing', S.k.ring, 1.5, 5.5, '#oRing', f1(S.k.ring));
    const note = $('#limNote');
    if (note) note.textContent = S.k.view === 'he' ? '수소용 모형이 예측한 선과 실제 헬륨의 선을 비교해 보세요.' : '수소 방전관의 방출선과, 백색광이 수소 기체를 지난 뒤의 흡수선을 비교해 보세요.';
  }

  /* ---------- 공통: 스펙트럼 띠 ---------- */
  const ST = PHONE ? { x: 28, w: 424 } : { x: 40, w: 720 };
  function stripDraw(x, y, w, h, o) {
    ctx.save(); D.roundRect(x, y, w, h, 8); ctx.clip();
    ctx.fillStyle = '#0a0e1a'; ctx.fillRect(x, y, w, h);
    if (o.cont) for (let px = 0; px < w; px += 2) { const nm = 400 + px / w * 300; ctx.fillStyle = wlHex(nm, o.cont(nm)); ctx.fillRect(x + px, y, 2.5, h); }
    (o.dark || []).forEach((d) => { const lx = x + (d.nm - 400) / 300 * w; ctx.fillStyle = 'rgba(8,10,20,' + d.d + ')'; ctx.fillRect(lx - 2.5, y, 5, h); });
    (o.lines || []).forEach((l) => {
      const lx = x + (l.nm - 400) / 300 * w, a = (l.a != null ? l.a : 1) * (l.k != null ? l.k : 1);
      if (a <= 0.01) return;
      ctx.fillStyle = wlHex(l.nm, a * 0.22); ctx.fillRect(lx - 6, y, 12, h);
      ctx.fillStyle = wlHex(l.nm, Math.min(1, a * 0.5 + 0.5)); ctx.fillRect(lx - 1.6, y, 3.2, h);
    });
    ctx.restore();
    if (o.ruler) {
      ctx.strokeStyle = '#7b8aa3'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + h + 4); ctx.lineTo(x + w, y + h + 4); ctx.stroke();
      for (let nm = 400; nm <= 700; nm += 50) {
        const tx = x + (nm - 400) / 300 * w; ctx.beginPath(); ctx.moveTo(tx, y + h + 4); ctx.lineTo(tx, y + h + 10); ctx.stroke();
        T(tx, y + h + 24, String(nm), 12.5, '#5a6679', 'center', 700);
      }
      T(x + w, y + h + 40, 'nm (파장)', 12, '#7b8aa3', 'right', 700);
    }
  }
  const xOfNm = (nm, x, w) => x + (nm - 400) / 300 * w;

  /* ================= ① 분광기 ================= */
  const L1 = PHONE
    ? { app: [12, 12, 456, 176], sx: 56, sy: 96, slit: 120, px: 186, py: 96, exX: 208, exY: 100, strip: [12, 196, 456, 128], bx: 28, by: 212, bw: 424, bh: 46, rec: [12, 332, 456, 376] }
    : { app: [14, 14, 772, 206], sx: 78, sy: 100, slit: 184, px: 300, py: 100, exX: 326, exY: 104, strip: [14, 228, 772, 120], bx: 40, by: 244, bw: 720, bh: 50, rec: [14, 356, 772, 190] };
  const curLines = () => (S.s.src === 'incand' ? [] : LINES[S.s.src]);
  const nearLine = (nm) => { let best = null; curLines().forEach((l) => { if (Math.abs(l.nm - nm) <= SNAP && (!best || Math.abs(l.nm - nm) < Math.abs(best.nm - nm))) best = l; }); return best; };
  function setNm(v) { S.s.nm = clamp(Math.round(v), 400, 700); updateCtl(); }
  function recordLine() {
    const s = S.s;
    if (s.src === 'incand') { SciSim.toast('백열등에는 선이 없어요. 수소 방전관으로 바꿔 보세요.', 'bad'); Sound.fail(); return; }
    if (s.src !== 'H') { SciSim.toast('이 선은 수소의 선이 아니에요. 수소 방전관으로 바꿔요.', 'bad'); Sound.fail(); return; }
    const l = nearLine(s.nm);
    if (!l) { SciSim.toast('눈금 근처(±' + SNAP + ' nm)에 밝은 선이 없어요. 눈금을 선에 맞춰 보세요.', 'bad'); Sound.fail(); return; }
    s.rec[l.nm] = true; Sound.success();
    const x = xOfNm(l.nm, L1.bx, L1.bw);
    parts.burst(x, L1.by + L1.bh / 2, { count: 10, speed: 90, size: 3, colors: [wlSolid(l.nm), '#fff'], gravity: 120 });
  }
  DRAG.down = (p) => {
    if (S.mode !== 'spec') return false;
    const r = L1.strip; if (p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3]) { setNm(400 + (p.x - L1.bx) / L1.bw * 300); return true; }
    return false;
  };
  DRAG.move = (p) => { setNm(400 + (p.x - L1.bx) / L1.bw * 300); };
  DRAG.up = () => {};
  DRAG.hover = (p) => { if (S.mode !== 'spec') return null; const r = L1.strip; return (p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3]) ? 'ew-resize' : null; };

  function tubeDraw(x, y, w, h, tint, on) {
    if (on) D.glow(x + w / 2, y + h / 2, w * 0.95, tint, 0.45 + 0.1 * Math.sin(S.t * 6));
    D.shadow(() => { D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = on ? C.mix('#ffffff', tint, 0.55) : '#e9eef6'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#9aa7bd'; ctx.lineWidth = 2.5; D.roundRect(x, y, w, h, h / 2); ctx.stroke();
    ctx.fillStyle = '#6b7488'; ctx.fillRect(x - 8, y + h / 2 - 3, 12, 6); ctx.fillRect(x + w - 4, y + h / 2 - 3, 12, 6);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; D.roundRect(x + 12, y + 5, w - 24, 6, 3); ctx.fill();
  }
  function bulbDraw(cx, cy, r, on) {
    if (on) D.glow(cx, cy, r * 3, '#ffd27a', 0.6);
    D.sphere(cx, cy, r, on ? '#fff3c4' : '#e7ecf3', { gloss: true, shadow: true });
    ctx.strokeStyle = on ? '#e2552a' : '#9aa7bd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - r * 0.45, cy + r * 0.2); ctx.lineTo(cx - r * 0.2, cy - r * 0.25); ctx.lineTo(cx + r * 0.2, cy + r * 0.2); ctx.lineTo(cx + r * 0.45, cy - r * 0.25); ctx.stroke();
    ctx.fillStyle = '#6b7488'; ctx.fillRect(cx - r * 0.45, cy + r * 0.85, r * 0.9, r * 0.5);
  }
  function drawSpec(dt) {
    const s = S.s, g = L1;
    panel(g.app[0], g.app[1], g.app[2], g.app[3]);
    T(g.app[0] + 14, g.app[1] + 24, '분광기: 광원 → 슬릿 → 프리즘 → 스펙트럼', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const src = SRC[s.src];
    // 광원
    if (s.src === 'incand') bulbDraw(g.sx, g.sy, PHONE ? 20 : 26, true); else tubeDraw(g.sx - (PHONE ? 36 : 48), g.sy - 18, PHONE ? 72 : 96, 36, src.tint, true);
    T(g.sx, g.sy + 50, src.name, PHONE ? 12 : 13.5, '#3a465c', 'center', 800);
    // 빔 → 슬릿 → 프리즘
    const tintBeam = s.src === 'incand' ? '#fff3c4' : src.tint;
    ctx.strokeStyle = C.rgba(tintBeam, 0.9); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.sx + (PHONE ? 38 : 52), g.sy); ctx.lineTo(g.px - 22, g.py); ctx.stroke();
    ctx.fillStyle = '#394258'; ctx.fillRect(g.slit - 4, g.sy - 46, 8, 34); ctx.fillRect(g.slit - 4, g.sy + 12, 8, 34);
    T(g.slit + 22, g.sy - 22, '슬릿', 12, '#5a6679', 'left', 700);
    const pr = PHONE ? 34 : 42;
    D.shadow(() => { ctx.beginPath(); ctx.moveTo(g.px, g.py - pr); ctx.lineTo(g.px - pr * 0.9, g.py + pr * 0.7); ctx.lineTo(g.px + pr * 0.9, g.py + pr * 0.7); ctx.closePath(); const gr = ctx.createLinearGradient(g.px - pr, g.py - pr, g.px + pr, g.py + pr); gr.addColorStop(0, 'rgba(210,235,255,.9)'); gr.addColorStop(1, 'rgba(150,190,235,.75)'); ctx.fillStyle = gr; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#8fb0d8'; ctx.lineWidth = 2; ctx.stroke();
    T(g.px, g.py + pr + 18, '프리즘', 12, '#5a6679', 'center', 700);
    // 부채꼴 광선
    const sy = g.by;
    if (s.src === 'incand') {
      const grd = ctx.createLinearGradient(g.bx, 0, g.bx + g.bw, 0);
      for (let nm = 400; nm <= 700; nm += 20) grd.addColorStop((nm - 400) / 300, wlHex(nm, 0.5));
      ctx.beginPath(); ctx.moveTo(g.exX, g.exY); ctx.lineTo(g.bx, sy); ctx.lineTo(g.bx + g.bw, sy); ctx.closePath(); ctx.fillStyle = grd; ctx.fill();
    } else {
      LINES[s.src].forEach((l) => {
        const x = xOfNm(l.nm, g.bx, g.bw); ctx.strokeStyle = wlHex(l.nm, 0.35 + 0.5 * l.a); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(g.exX, g.exY); ctx.lineTo(x, sy); ctx.stroke();
      });
    }
    // 스펙트럼 띠
    const sp = g.strip;
    panel(sp[0], sp[1], sp[2], sp[3]);
    const lines = s.src === 'H' ? LINES.H.map((l) => ({ nm: l.nm, a: l.a * (s.rec[l.nm] ? 1 : 0.88) })) : curLines();
    stripDraw(g.bx, g.by, g.bw, g.bh, { cont: s.src === 'incand' ? (nm) => 0.28 + 0.72 * Math.pow((nm - 400) / 300, 1.1) : null, lines, ruler: true });
    T(g.app[0] + g.app[2] - 14, g.app[1] + 24, src.kind, PHONE ? 12.5 : 14, '#7c5cff', 'right', 800);
    // 눈금(커서)
    const cx = xOfNm(s.nm, g.bx, g.bw), nl = nearLine(s.nm);
    ctx.strokeStyle = nl ? '#ffd447' : '#ffffff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(cx, g.by - 6); ctx.lineTo(cx, g.by + g.bh + 5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = nl ? '#ffd447' : '#fff'; ctx.strokeStyle = '#394258'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 8, g.by - 17); ctx.lineTo(cx + 8, g.by - 17); ctx.lineTo(cx, g.by - 5); ctx.closePath(); ctx.fill(); ctx.stroke();
    D.label(clamp(cx, g.bx + 42, g.bx + g.bw - 42), g.by - 30, nl ? '선 발견! ' + nl.nm + ' nm' : s.nm + ' nm', { bg: nl ? '#e2552a' : '#394258', size: 12.5 });
    // 기록 칸
    const rc = g.rec;
    panel(rc[0], rc[1], rc[2], rc[3]);
    T(rc[0] + 14, rc[1] + 26, '📒 수소 방전관의 밝은 선 (파장이 큰 쪽부터)', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const n4 = 4, gap = 10, cw = (rc[2] - 28 - gap * (n4 - 1)) / n4, ch = PHONE ? 84 : 76;
    LINES.H.forEach((l, i) => {
      const x = rc[0] + 14 + i * (cw + gap), y = rc[1] + 42, got = !!s.rec[l.nm];
      D.roundRect(x, y, cw, ch, 12); ctx.fillStyle = got ? C.rgba(wlSolid(l.nm), 0.18) : '#f3f6fb'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = got ? wlSolid(l.nm) : '#d3dbe8'; ctx.stroke();
      if (got) { D.sphere(x + 18, y + 22, 9, wlSolid(l.nm), { gloss: true }); T(x + cw / 2 + 8, y + 32, l.nm + ' nm', PHONE ? 16 : 20, '#26324a', 'center', 800); T(x + cw / 2, y + ch - 12, wlName(l.nm), 12.5, '#5a6679', 'center', 700); }
      else T(x + cw / 2, y + ch / 2 + 6, '?', 26, '#b7c1d2', 'center', 800);
    });
    const done = LINES.H.filter((l) => s.rec[l.nm]).length;
    textBlock(rc[0] + 14, rc[1] + 42 + ch + 26, rc[2] - 28, s.src === 'incand' ? '백열등은 보라에서 빨강까지 색이 끊김 없이 이어져요 (연속 스펙트럼). 광원을 바꿔 선스펙트럼과 비교해 보세요.' : s.src === 'H' ? '눈금을 선 가까이 가져가면 노란색 “선 발견!”이 떠요. 그때 📏 이 선 기록하기를 눌러요. (' + done + ' / 4)' : src.name + '도 선스펙트럼이지만 선의 위치가 수소와 달라요. 원소마다 선의 위치가 달라서 “원소의 지문”이라고 해요.', PHONE ? 13 : 14.5, '#3a465c', PHONE ? 19 : 21, 700);
    parts.update(dt); parts.draw(ctx);
  }
  function wlName(nm) { return nm >= 620 ? '빨강' : nm >= 570 ? '노랑' : nm >= 495 ? '초록' : nm >= 476 ? '청록' : nm >= 450 ? '파랑' : nm >= 425 ? '남색' : '보라'; }

  /* ================= ② 에너지 사다리 ================= */
  const L2 = PHONE
    ? { pa: [12, 12, 456, 176], sx: 28, sw: 424, pb: [12, 196, 456, 196], pc: [12, 400, 456, 308] }
    : { pa: [14, 14, 500, 238], sx: 30, sw: 468, pb: [14, 262, 500, 284], pc: [526, 14, 260, 532] };
  function drawLadder(dt) {
    const l = S.l, g = L2;
    // A: 두 가설
    panel(g.pa[0], g.pa[1], g.pa[2], g.pa[3]);
    T(g.pa[0] + 14, g.pa[1] + 26, '두 가설이 예상하는 스펙트럼', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const sx = g.pa[0] + (PHONE ? 16 : 16), sw = g.pa[2] - 32, bh = PHONE ? 26 : 32, y0 = g.pa[1] + 50, gp = PHONE ? 46 : 56;
    const rows = [['(A) 전자 에너지가 연속적이면 → 아무 색이나 나와요', { cont: () => 0.85 }, '#c2410c'], ['(B) 특정 값만 가지면 → 몇 개의 선만 나와요', { lines: [{ nm: 450, a: 0.7 }, { nm: 520, a: 0.7 }, { nm: 600, a: 0.7 }, { nm: 660, a: 0.7 }] }, '#1d4ed8'], ['실제로 관찰한 수소의 스펙트럼', { lines: LINES.H }, '#14653b']];
    rows.forEach((r, i) => {
      T(sx, y0 + i * gp - 6, r[0], PHONE ? 12 : 13.5, r[2], 'left', 800);
      stripDraw(sx, y0 + i * gp, sw, bh, r[1]);
    });
    T(g.pa[0] + g.pa[2] - 14, g.pa[1] + 26, '관찰은 (B)를 닮았어요', PHONE ? 12 : 13.5, '#14653b', 'right', 800);
    // B: 계산표
    panel(g.pb[0], g.pb[1], g.pb[2], g.pb[3]);
    T(g.pb[0] + 14, g.pb[1] + 26, '파장 → 광자 에너지 (E = 1240 ÷ λ)', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    const cols = PHONE ? [g.pb[0] + 14, g.pb[0] + 130, g.pb[0] + 270, g.pb[0] + 380] : [g.pb[0] + 18, g.pb[0] + 150, g.pb[0] + 300, g.pb[0] + 420];
    ['선', '파장 λ', '내가 계산한 E', '결과'].forEach((h, i) => T(cols[i], g.pb[1] + 52, h, 12.5, '#5a6679', 'left', 800));
    ctx.strokeStyle = '#e1e6ef'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(g.pb[0] + 10, g.pb[1] + 60); ctx.lineTo(g.pb[0] + g.pb[2] - 10, g.pb[1] + 60); ctx.stroke();
    const rh = PHONE ? 36 : 46;
    H_LINES.forEach((ln, i) => {
      const y = g.pb[1] + 62 + i * rh + rh / 2 + 6;
      D.sphere(cols[0] + 10, y - 6, 8, wlSolid(ln.nm), { gloss: true }); T(cols[0] + 26, y, wlName(ln.nm), 13.5, '#26324a', 'left', 800);
      T(cols[1], y, ln.nm + ' nm', 16, '#26324a', 'left', 800);
      const v = l.vals[i];
      T(cols[2], y, v === '' ? '—' : String(v) + ' eV', 16, l.ok[i] ? '#0f7a43' : v === '' ? '#98a2b3' : '#b42318', 'left', 800);
      T(cols[3], y, l.ok[i] ? '✅ ' + f2(E_OBS[i]) + ' eV' : '⬜', 14.5, l.ok[i] ? '#0f7a43' : '#98a2b3', 'left', 800);
    });
    // C: 사다리
    panel(g.pc[0], g.pc[1], g.pc[2], g.pc[3]);
    T(g.pc[0] + 14, g.pc[1] + 26, '에너지 사다리', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
    T(g.pc[0] + g.pc[2] - 14, g.pc[1] + 26, '맨 아래 준위 기준', 12, '#7b8aa3', 'right', 700);
    const ax = g.pc[0] + (PHONE ? 80 : 60), axw = g.pc[2] - (PHONE ? 130 : 90);
    const yb = g.pc[1] + g.pc[3] - (PHONE ? 70 : 84), ytop = g.pc[1] + 56, emax = 3.2, py = (e) => yb - (e / emax) * (yb - ytop);
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 22, yb + 6); ctx.lineTo(ax - 22, ytop - 12); ctx.stroke();
    D.arrow(ax - 22, ytop - 2, ax - 22, ytop - 16, { color: '#8a95a8', width: 2, head: 8 });
    T(ax - 30, ytop - 14, 'E (eV)', 12, '#5a6679', 'right', 700);
    for (let e = 0; e <= 3; e++) { ctx.beginPath(); ctx.moveTo(ax - 26, py(e)); ctx.lineTo(ax - 18, py(e)); ctx.stroke(); T(ax - 32, py(e) + 4, String(e), 12, '#5a6679', 'right', 700); }
    ctx.strokeStyle = '#2f6df6'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ax, yb); ctx.lineTo(ax + axw, yb); ctx.stroke();
    T(ax + axw + 8, yb + 4, '0', 12.5, '#1d4ed8', 'left', 800);
    H_LINES.forEach((ln, i) => {
      l.rungA[i] = SciSim.approach(l.rungA[i], l.ok[i] ? 1 : 0, dt, 6);
      const a = l.rungA[i]; if (a < 0.02) return;
      const y = py(E_OBS[i]);
      ctx.save(); ctx.globalAlpha = a;
      D.arrow(ax + 18 + i * 12, yb - 3, ax + 18 + i * 12, y + 5, { color: C.rgba(wlSolid(ln.nm), 0.8), width: 2.5, head: 8 });
      ctx.strokeStyle = wlSolid(ln.nm); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ax, y); ctx.lineTo(ax + axw, y); ctx.stroke();
      T(ax + axw + 8, y + 4 + (i === 3 ? -3 : i === 2 ? 3 : 0), f2(E_OBS[i]), 12.5, '#26324a', 'left', 800);
      ctx.restore();
    });
    const nOK = l.ok.filter(Boolean).length;
    textBlock(g.pc[0] + 14, g.pc[1] + g.pc[3] - (PHONE ? 38 : 46), g.pc[2] - 28, nOK === 0 ? '계산한 값이 맞으면 눈금이 사다리에 놓여요.' : nOK < 4 ? '준위가 띄엄띄엄 놓이고 있어요 (' + nOK + ' / 4).' : '4개의 값이 아무 데나 있지 않고 일정한 칸에만 있어요!', 12.5, '#3a465c', 17, 700);
    parts.update(dt); parts.draw(ctx);
  }
  function evalL() {
    const l = S.l;
    H_LINES.forEach((ln, i) => { const v = numOf(l.vals[i]); const ex = HC / ln.nm; const ok = isFinite(v) && Math.abs(v - ex) <= 0.015; if (ok && !l.ok[i] && S.mode === 'ladder') { const g = L2; Sound.tick(); parts.burst(g.pc[0] + g.pc[2] / 2, g.pc[1] + g.pc[3] / 2, { count: 8, speed: 80, size: 3, colors: [wlSolid(ln.nm), '#fff'], gravity: 100 }); } l.ok[i] = ok; });
  }
  const eGrid = $('#eGrid'), eIn = [];
  H_LINES.forEach((ln, i) => {
    const lab = document.createElement('span'); lab.className = 'lab'; lab.textContent = ln.nm + ' nm → E ='; eGrid.appendChild(lab);
    const inp = document.createElement('input'); inp.className = 'num-in'; inp.type = 'number'; inp.step = '0.01'; inp.min = '0'; inp.inputMode = 'decimal'; inp.placeholder = 'eV'; inp.setAttribute('aria-label', ln.nm + ' 나노미터 선의 광자 에너지 (전자볼트)');
    inp.addEventListener('input', () => { S.l.vals[i] = inp.value; evalL(); }); eGrid.appendChild(inp); eIn.push(inp);
  });

  /* ================= ③ 보어 모형 ================= */
  const L3 = PHONE
    ? { atom: [12, 12, 456, 280], ax: 160, ay: 168, lad: [12, 300, 456, 300], strip: [12, 608, 456, 100], bx: 28, by: 638, bw: 424, bh: 30 }
    : { atom: [14, 14, 380, 408], ax: 204, ay: 232, lad: [404, 14, 382, 408], strip: [14, 432, 772, 114], bx: 40, by: 462, bw: 720, bh: 36 };
  const orbR = (n) => (PHONE ? 18 + 20 * (n - 1) : 24 + 28 * (n - 1));
  const angSpeed = (n) => 2.6 / Math.pow(n, 1.3);
  const levY = (n) => { const g = L3.lad; const y0 = g[1] + 64, y1 = g[1] + g[3] - 70; return y0 + (-En(n) / E_ION) * (y1 - y0); };
  const chipY = (n) => { const g = L3.lad; return n === 1 ? levY(1) : g[1] + 66 + (6 - n) * 28; };
  function startTransition(to, how) {
    const b = S.b; if (b.busy > 0 || b.ion > 0 || to === b.n) return;
    const from = b.n;
    if (to < from) {
      const E = dEn(from, to), lam = lamOf(E);
      b.last = from + ' → ' + to; b.seen[from + '>' + to] = true;
      b.busy = 0.5; const o = { r: orbR(from) }; b.rad = o.r;
      SciSim.tween(o, { r: orbR(to) }, { duration: RM ? 0.01 : 0.45, ease: 'outBack', onUpdate: () => { b.rad = o.r; }, onDone: () => { b.n = to; b.busy = 0; } });
      b.n = to;
      emitPhoton(E, lam, from, to);
      Sound.tone(300 + 900 * (E / E_ION), 0.18, 'triangle', 0.1);
    } else {
      // 충돌로 들뜨기 (방전관 속 전자와 부딪쳐 에너지를 얻어요)
      b.last = from + ' ↑ ' + to; b.busy = 0.5; const o = { r: orbR(from) }; b.rad = o.r;
      SciSim.tween(o, { r: orbR(to) }, { duration: RM ? 0.01 : 0.45, ease: 'outBack', onUpdate: () => { b.rad = o.r; }, onDone: () => { b.busy = 0; } });
      b.n = to; Sound.tick();
      const g = L3; parts.burst(g.ax, g.ay, { count: 6, speed: 70, size: 2.5, colors: ['#ffd447', '#fff'], gravity: 60, life: 0.5 });
    }
  }
  function emitPhoton(E, lam, from, to) {
    const g = L3, k = kindOf(lam);
    const ph = { E, lam, kind: k, from, to, x0: g.ax, y0: g.ay, p: 0, type: 'emit' };
    if (k === 'vis') { ph.tx = xOfNm(lam, g.bx, g.bw); } else if (k === 'uv') { ph.tx = g.bx + 30; } else { ph.tx = g.bx + g.bw - 30; }
    ph.ty = g.by + g.bh / 2;
    S.b.photon = ph;
  }
  function firePhoton() {
    const b = S.b; if (b.photon || b.busy > 0) return;
    const E = b.ph, lam = lamOf(E);
    b.photon = { E, lam, kind: kindOf(lam), type: 'in', x0: L3.atom[0] + 18, y0: L3.ay, tx: L3.ax, ty: L3.ay, p: 0 };
    Sound.tone(500, 0.1, 'sine', 0.05);
  }
  function photonLand(ph) {
    const b = S.b, g = L3;
    if (ph.type === 'emit') {
      if (ph.kind === 'vis') { const nm = Math.round(ph.lam); b.lit.push({ nm, k: 1, kind: 'vis' }); }
      else b.lit.push({ nm: ph.lam, k: 1, kind: ph.kind });
      if (b.lit.length > 40) b.lit.shift();
      parts.burst(ph.tx, ph.ty, { count: 8, speed: 80, size: 3, colors: [ph.kind === 'vis' ? wlSolid(Math.round(ph.lam)) : '#c4b5fd', '#fff'], gravity: 80 });
    }
  }
  function stepBohr(dt) {
    const b = S.b;
    if (!b.busy && b.ion <= 0) b.rad = orbR(b.n);
    if (b.ion > 0) { b.ion -= dt; if (b.ion <= 0) { b.n = 1; b.rad = orbR(1); b.busy = 0; } }
    b.ang += angSpeed(b.n) * dt;
    const ph = b.photon;
    if (ph) {
      const dur = ph.type === 'emit' ? 0.9 : 0.8;
      ph.p += dt / dur;
      if (ph.type === 'in' && ph.p >= 1 && !ph.decided) {
        ph.decided = true;
        const n = b.n; let up = 0;
        for (let m = n + 1; m <= NLEV; m++) if (Math.abs(dEn(m, n) - ph.E) <= TOL) up = m;
        if (up) {
          b.absorbed++; b.last = n + ' ↑ ' + up + ' (흡수)'; b.busy = 0.5; const o = { r: orbR(n) };
          SciSim.tween(o, { r: orbR(up) }, { duration: RM ? 0.01 : 0.5, ease: 'outBack', onUpdate: () => { b.rad = o.r; }, onDone: () => { b.busy = 0; } });
          b.n = up; b.photon = null; Sound.success();
          parts.burst(L3.ax, L3.ay, { count: 14, speed: 120, size: 3, colors: ['#ffd447', '#ff8a3d', '#fff'], gravity: 60 });
        } else if (ph.E >= -En(n) - 1e-9) {
          b.last = '이온화'; b.photon = null; b.busy = 9; b.ion = 1.4; Sound.level();
          parts.burst(L3.ax, L3.ay, { count: 16, speed: 150, size: 3, colors: ['#8bd0ff', '#fff'], gravity: 0 });
          const o = { r: b.rad || orbR(n) }; SciSim.tween(o, { r: 220 }, { duration: 0.9, ease: 'inCubic', onUpdate: () => { b.rad = o.r; }, onDone: () => { b.busy = 0; } });
          showHint('광자 에너지가 이온화 에너지보다 커서 전자가 원자를 떠났어요. (곧 새 전자가 붙잡혀요)', 3600);
        } else { ph.pass = true; Sound.fail(); showHint('에너지가 맞지 않아 광자가 그냥 통과했어요. 사다리의 준위 간격과 같은 에너지만 흡수돼요.', 3600); }
      }
      if (ph.p >= 1 && ph.type === 'emit') { photonLand(ph); b.photon = null; }
      else if (ph.p >= 1.6 && ph.type === 'in') b.photon = null;
    }
  }
  function photonDraw(ph) {
    let x, y, ang, alpha = 1;
    if (ph.type === 'emit') { const q = smooth(ph.p); x = lerp(ph.x0, ph.tx, q); y = lerp(ph.y0, ph.ty, q); ang = Math.atan2(ph.ty - ph.y0, ph.tx - ph.x0); }
    else { const q = ph.pass ? ph.p : Math.min(ph.p, 1); const tx = ph.pass ? L3.atom[0] + L3.atom[2] - 10 : ph.tx; x = lerp(ph.x0, tx, ph.pass ? clamp((ph.p) / 1.6, 0, 1) : q); y = ph.y0; ang = 0; if (ph.pass) alpha = clamp(1 - (ph.p - 1) / 0.6, 0, 1); }
    const col = ph.kind === 'vis' ? wlSolid(Math.round(ph.lam)) : ph.kind === 'uv' ? '#a78bfa' : '#c2410c';
    const wlp = clamp(ph.lam * 0.05, 7, 28), len = 70;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(ang);
    D.glow(0, 0, 26, col, 0.45);
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = -len / 2; i <= len / 2; i += 2) { const env = Math.cos((i / (len / 2)) * Math.PI / 2); const yy = 9 * env * Math.sin(i / wlp * TAU - S.t * 12); if (i === -len / 2) ctx.moveTo(i, yy); else ctx.lineTo(i, yy); }
    ctx.stroke(); ctx.restore();
    if (ph.type === 'emit' || ph.type === 'in') D.label(x, y - 26, f2(ph.E) + ' eV · ' + fmtNm(ph.lam) + ' nm', { bg: 'rgba(38,50,74,.88)', size: 12 });
  }
  function drawBohr(dt) {
    const b = S.b, g = L3;
    // 원자
    panel(g.atom[0], g.atom[1], g.atom[2], g.atom[3]);
    T(g.atom[0] + 14, g.atom[1] + 26, '수소 원자 (궤도 간격은 줄여 그렸어요)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    ctx.save(); D.roundRect(g.atom[0], g.atom[1], g.atom[2], g.atom[3], 14); ctx.clip();
    for (let n = 1; n <= NLEV; n++) {
      const r = orbR(n), cur = b.n === n;
      ctx.beginPath(); ctx.arc(g.ax, g.ay, r, 0, TAU); ctx.strokeStyle = cur ? '#7c5cff' : '#cbd3e2'; ctx.lineWidth = cur ? 2.6 : 1.8; ctx.setLineDash(cur ? [] : [5, 5]); ctx.stroke(); ctx.setLineDash([]);
      T(g.ax + r * 0.707 + 3, g.ay - r * 0.707 - 2, 'n=' + n, 11.5, cur ? '#5b3fd0' : '#8a95a8', 'left', 800);
    }
    D.glow(g.ax, g.ay, 26, '#ff9a8a', 0.5); D.sphere(g.ax, g.ay, 11, '#e2464b', { gloss: true }); T(g.ax, g.ay + 4, '+', 13, '#fff', 'center', 800);
    const rr = b.rad || orbR(b.n), ex = g.ax + rr * Math.cos(b.ang), ey = g.ay + rr * Math.sin(b.ang);
    D.glow(ex, ey, 16, '#4aa8ff', 0.5); D.sphere(ex, ey, 7, '#2f6df6', { gloss: true, shadow: true });
    ctx.restore();
    if (b.ion > 0) T(g.ax, g.atom[1] + g.atom[3] - 14, '이온화! 전자가 원자를 떠났어요', 13.5, '#1d4ed8', 'center', 800);
    // 사다리
    const ld = g.lad;
    panel(ld[0], ld[1], ld[2], ld[3]);
    T(ld[0] + 14, ld[1] + 26, '에너지 준위 E = −13.6 ÷ n² (eV)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
    const lx0 = ld[0] + 18, lx1 = ld[0] + (PHONE ? 130 : 130), cx0 = ld[0] + (PHONE ? 196 : 190), cw = PHONE ? 244 : 176;
    const y0line = ld[1] + 64;
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(lx0, y0line); ctx.lineTo(lx1, y0line); ctx.stroke(); ctx.setLineDash([]);
    T(lx0, y0line - 8, '0 eV · 전자가 떨어져 나가요(이온화)', 11.5, '#5a6679', 'left', 700);
    for (let n = 1; n <= NLEV; n++) {
      const y = levY(n), cur = b.n === n, cy = chipY(n);
      ctx.strokeStyle = cur ? '#7c5cff' : '#2f6df6'; ctx.lineWidth = cur ? 4.5 : 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx0, y); ctx.lineTo(lx1, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(138,149,168,.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx1, y); ctx.lineTo(cx0 - 4, cy); ctx.stroke();
      const lab = 'n = ' + n + '  ' + f2(En(n)) + ' eV';
      D.roundRect(cx0, cy - 13, cw, 26, 13); ctx.fillStyle = cur ? '#7c5cff' : '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = cur ? '#7c5cff' : '#9aa7bd'; ctx.stroke();
      T(cx0 + cw / 2, cy + 5, lab, 13, cur ? '#fff' : '#26324a', 'center', 800);
      if (b.mode === 'emit') HITS.push({ x: cx0, y: cy - 15, w: cw, h: 30, fn: () => startTransition(n, 'chip') });
    }
    // 전자 표시와 전이 화살표
    const ey2 = levY(b.n); D.sphere(lx0 + 14, ey2 - 9, 6, '#2f6df6', { gloss: true });
    if (b.mode === 'abs') {
      const n = b.n; const ups = []; for (let m = n + 1; m <= NLEV; m++) ups.push(f2(dEn(m, n)));
      const t1 = n >= NLEV ? '맨 위 준위(n=' + NLEV + ')예요. 이 모형에서는 이온화 에너지 ' + f2(-En(n)) + ' eV 이상이면 전자가 떨어져 나가요.' : 'n = ' + n + ' 전자가 흡수하는 광자 에너지(eV): ' + ups.join(' · ') + ' · 이온화 ' + f2(-En(n)) + ' 이상';
      textBlock(ld[0] + 14, ld[1] + ld[3] - 40, ld[2] - 28, t1, 12.5, '#3a465c', 16, 700);
    } else textBlock(ld[0] + 14, ld[1] + ld[3] - 40, ld[2] - 28, '준위나 궤도를 눌러 전자를 옮겨요. 위로 올라갈 때는 방전관 속 전자와 부딪쳐 에너지를 얻어요. 아래로 내려가면 광자를 내보내요.', 12.5, '#3a465c', 16, 700);
    // 궤도 클릭
    // 스펙트럼 띠
    const sp = g.strip;
    panel(sp[0], sp[1], sp[2], sp[3]);
    T(sp[0] + 14, sp[1] + 20, '분광기에 나타난 선 (가시광선 400 ~ 700 nm)', PHONE ? 12 : 13.5, '#26324a', 'left', 800);
    const vis = b.lit.filter((l) => l.kind === 'vis'), uv = b.lit.some((l) => l.kind === 'uv'), ir = b.lit.some((l) => l.kind === 'ir');
    stripDraw(g.bx, g.by, g.bw, g.bh, { lines: vis.map((l) => ({ nm: l.nm, a: 1 })), ruler: false });
    for (let nm = 400; nm <= 700; nm += 50) { const tx = xOfNm(nm, g.bx, g.bw); T(tx, g.by + g.bh + 16, String(nm), 12, '#5a6679', 'center', 700); }
    T(g.bx - 4, g.by + g.bh + 34, uv ? '◀ 자외선 (보이지 않는 선 있음)' : '◀ 자외선 쪽', 12, uv ? '#7c5cff' : '#98a2b3', 'left', 800);
    T(g.bx + g.bw + 4, g.by + g.bh + 34, ir ? '적외선 (보이지 않는 선 있음) ▶' : '적외선 쪽 ▶', 12, ir ? '#c2410c' : '#98a2b3', 'right', 800);
    cbtn(sp[0] + sp[2] - 96, sp[1] + 6, 84, 26, '지우기', () => { b.lit = []; Sound.click(); }, { size: 12.5, color: '#7b8aa3' });
    if (b.photon) photonDraw(b.photon);
    parts.update(dt); parts.draw(ctx);
  }
  DRAG.down = ((prev) => (p) => {
    if (prev && prev(p)) return true;
    if (S.mode === 'bohr' && S.b.mode === 'emit') {
      const g = L3, d = Math.hypot(p.x - g.ax, p.y - g.ay);
      for (let n = 1; n <= NLEV; n++) if (Math.abs(d - orbR(n)) <= (PHONE ? 11 : 13) && d > 14) { startTransition(n, 'orbit'); return false; }
    }
    return false;
  })(DRAG.down);

  /* ================= ④ 한계 ================= */
  const CLOUD = [];
  (function () { for (let i = 0; i < 520; i++) { const r = -(A0_NM / 2) * Math.log((1 - Math.random()) * (1 - Math.random()) * (1 - Math.random())); const u = Math.random() * 2 - 1, ph = Math.random() * TAU, s = Math.sqrt(1 - u * u); CLOUD.push({ x: r * s * Math.cos(ph) / A0_NM, y: r * u / A0_NM, ph: Math.random() * TAU }); } })();
  const P_BASE = PHONE ? { sx: 28, sw: 424 } : { sx: 40, sw: 720 };
  function drawLimit(dt) {
    const k = S.k, v = k.view;
    if (v === 'he') {
      const px = PHONE ? 12 : 14, pw = PHONE ? 456 : 772;
      panel(px, 14, pw, PHONE ? 330 : 330);
      T(px + 14, 40, '헬륨(전자 2개)에 보어 모형을 적용해 보면', PHONE ? 13 : 15, '#26324a', 'left', 800);
      const sx = P_BASE.sx, sw = P_BASE.sw, bh = PHONE ? 34 : 40;
      T(sx, 84, '수소의 준위로 예측한 선 (위치만 예측해요 · 세기는 설명하지 못해요)', PHONE ? 11.5 : 13.5, '#1d4ed8', 'left', 800);
      stripDraw(sx, 92, sw, bh, { lines: H_LINES.map((l) => ({ nm: l.nm, a: 0.75 })) });
      T(sx, 172, '실제로 관찰한 헬륨 방전관의 선', PHONE ? 11.5 : 13.5, '#b45309', 'left', 800);
      stripDraw(sx, 180, sw, bh, { lines: LINES.He, ruler: true });
      const my = 92 + bh, ey = 180;
      H_LINES.forEach((l) => { const x = xOfNm(l.nm, sx, sw); ctx.strokeStyle = 'rgba(226,70,75,.5)'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x, ey + bh); ctx.stroke(); ctx.setLineDash([]); });
      D.label(PHONE ? 240 : 400, 292, '예측한 선과 실제 헬륨의 선이 어긋나요', { bg: '#e2464b', size: PHONE ? 13 : 14.5 });
      textBlock(px + 14, 316, pw - 28, PHONE ? '전자가 둘이면 전자끼리도 밀어내서 준위가 달라져요. 보어 모형은 전자가 1개인 수소(와 비슷한 이온)에만 맞아요.' : '전자가 2개면 전자끼리도 서로 밀어내서 준위가 수소와 달라져요. 보어 모형은 전자가 1개인 수소(와 비슷한 이온)에만 맞아요.', PHONE ? 12.5 : 14, '#3a465c', 18, 700);
      panel(px, 358, pw, PHONE ? 350 : 188);
      T(px + 14, 382, '수소 선의 실제 밝기', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      const bw = PHONE ? 70 : 100;
      H_LINES.forEach((l, i) => {
        const x = px + 40 + i * (PHONE ? 104 : 176);
        ctx.fillStyle = '#eef1f7'; ctx.fillRect(x, 394, bw / 2, 70); ctx.fillStyle = wlSolid(l.nm); ctx.fillRect(x, 394 + 70 - 70 * l.a, bw / 2, 70 * l.a);
        T(x + bw / 4, 482, l.nm + ' nm', 12.5, '#26324a', 'center', 800); T(x + bw / 4 + 38, 432, f2(l.a), 12.5, '#5a6679', 'left', 700);
      });
      textBlock(px + 14, PHONE ? 520 : 506, pw - 28, '선마다 밝기가 달라요. 보어 모형은 선이 나타나는 위치는 맞히지만, 밝기 차이와 선이 미세하게 갈라지는 것은 설명하지 못해요.', PHONE ? 12.5 : 14, '#3a465c', 18, 700);
    } else if (v === 'cloud') {
      const px = PHONE ? 12 : 14, pw = PHONE ? 456 : 382, ph = PHONE ? 214 : 290;
      // 보어 궤도
      panel(px, 14, pw, ph);
      T(px + 14, 38, '보어 모형: 정해진 궤도를 도는 입자', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
      const cx = px + pw / 2, cy = 14 + ph / 2 + 14, R = PHONE ? 34 : 46;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.strokeStyle = '#7c5cff'; ctx.lineWidth = 2.4; ctx.stroke();
      D.sphere(cx, cy, 8, '#e2464b', { gloss: true });
      const a = S.t * 2.6; D.sphere(cx + R * Math.cos(a), cy + R * Math.sin(a), 6.5, '#2f6df6', { gloss: true, shadow: true });
      T(cx, cy + R + 22, '궤도 반지름 ' + A0_NM + ' nm (n = 1)', 12.5, '#5b3fd0', 'center', 800);
      // 전자 구름
      const qx = PHONE ? 12 : 14 + pw + 8, qy = PHONE ? 14 + ph + 8 : 14;
      panel(qx, qy, pw, ph);
      T(qx + 14, qy + 24, '현대 모형: 전자 구름 (확률 분포)', PHONE ? 12.5 : 14, '#26324a', 'left', 800);
      const ccx = qx + pw / 2, ccy = qy + ph / 2 + 14, sc = R;
      ctx.beginPath(); ctx.arc(ccx, ccy, sc, 0, TAU); ctx.strokeStyle = 'rgba(124,92,255,.55)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.8; ctx.stroke(); ctx.setLineDash([]);
      CLOUD.forEach((c) => {
        const x = ccx + c.x * sc, y = ccy + c.y * sc;
        if (Math.abs(x - ccx) > pw / 2 - 6 || Math.abs(y - ccy) > ph / 2 - 20) return;
        const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(S.t * 2.2 + c.ph));
        ctx.fillStyle = 'rgba(47,109,246,' + (0.18 + 0.5 * tw) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.9, 0, TAU); ctx.fill();
      });
      D.sphere(ccx, ccy, 6, '#e2464b', { gloss: false });
      T(ccx, qy + ph - 10, '점선 = 보어 궤도 반지름 · 전자는 그 안팎 어디서나 발견될 수 있어요', PHONE ? 10.5 : 11.5, '#5a6679', 'center', 700);
      // 정상파
      const wx = PHONE ? 12 : 14, wy = PHONE ? 14 + (ph + 8) * 2 : 14 + ph + 12, ww = PHONE ? 456 : 772, wh = PHONE ? 250 : 546 - wy;
      panel(wx, wy, ww, wh);
      T(wx + 14, wy + 26, '전자를 물질파(파동)로 보면', PHONE ? 13 : 14.5, '#26324a', 'left', 800);
      const rcx = wx + (PHONE ? 96 : 150), rcy = wy + wh / 2 + 12, rr = PHONE ? 54 : 66;
      const m = k.ring, amp = 9;
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) { const th = i / 240 * TAU; const r2 = rr + amp * Math.sin(m * th - S.t * 2); const x = rcx + r2 * Math.cos(th), y = rcy + r2 * Math.sin(th); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      const ok = Math.abs(m - Math.round(m)) < 0.05;
      ctx.strokeStyle = ok ? '#14a058' : '#e2464b'; ctx.lineWidth = 3.2; ctx.stroke();
      D.sphere(rcx, rcy, 5, '#e2464b', { gloss: false });
      if (!ok) { const r0 = rr + amp * Math.sin(-S.t * 2), r1 = rr + amp * Math.sin(m * TAU - S.t * 2); D.label(rcx + rr + 26, rcy, '이어지지 않아요', { bg: '#e2464b', size: 12, align: 'left' }); ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rcx + r0, rcy); ctx.lineTo(rcx + r1, rcy); ctx.stroke(); }
      else D.label(rcx + rr + 26, rcy, '잘 이어져요 ✔', { bg: '#14a058', size: 12, align: 'left' });
      const tx = wx + (PHONE ? 200 : 300);
      textBlock(tx, wy + 52, ww - (tx - wx) - 14, '원둘레 = ' + f1(m) + ' × 파장', PHONE ? 14 : 16, '#26324a', 22, 800);
      textBlock(tx, wy + 80, ww - (tx - wx) - 14, ok ? '파장이 원둘레에 정수 번 들어가서 파동이 안정하게 이어져요. 이런 경우가 보어 궤도 n = ' + Math.round(m) + '에 해당하는 개략적인 그림이에요.' : '파장이 정수 번 들어가지 않으면 파동이 서로 어긋나요. 슬라이더를 움직여 정수가 되는 값을 찾아보세요.', PHONE ? 12.5 : 14, '#3a465c', 19, 700);
      if (ok) k.ringSeen = true;
    } else {
      const px = PHONE ? 12 : 14, pw = PHONE ? 456 : 772;
      panel(px, 14, pw, PHONE ? 400 : 440);
      const sx = P_BASE.sx, sw = P_BASE.sw, bh = PHONE ? 44 : 56;
      T(px + 14, 40, '같은 위치에서 흡수하고 같은 위치에서 방출해요', PHONE ? 13 : 15, '#26324a', 'left', 800);
      T(sx, PHONE ? 78 : 86, '① 백색광을 차가운 수소 기체에 통과시킨 뒤 (흡수 스펙트럼)', PHONE ? 11.5 : 13.5, '#1d4ed8', 'left', 800);
      const y1 = PHONE ? 86 : 96;
      stripDraw(sx, y1, sw, bh, { cont: (nm) => 0.28 + 0.72 * Math.pow((nm - 400) / 300, 1.1), dark: H_LINES.map((l) => ({ nm: l.nm, d: 0.92 })) });
      const y2 = y1 + bh + (PHONE ? 52 : 64);
      T(sx, y2 - 8, '② 수소 방전관이 내는 빛 (방출 스펙트럼)', PHONE ? 11.5 : 13.5, '#b45309', 'left', 800);
      stripDraw(sx, y2, sw, bh, { lines: H_LINES, ruler: true });
      H_LINES.forEach((l) => { const x = xOfNm(l.nm, sx, sw); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y1 + bh); ctx.lineTo(x, y2); ctx.stroke(); ctx.setLineDash([]); ctx.strokeStyle = 'rgba(80,90,110,.7)'; ctx.beginPath(); ctx.moveTo(x, y1 + bh); ctx.lineTo(x, y2); ctx.stroke(); });
      const ty = y2 + bh + (PHONE ? 62 : 74);
      // 준위 그림 (n=2 ↔ n=3)
      const ex = sx + 20, ew = PHONE ? 90 : 120;
      const ya = ty + 10, yb = ty + (PHONE ? 70 : 80);
      ctx.strokeStyle = '#2f6df6'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex, ya); ctx.lineTo(ex + ew, ya); ctx.moveTo(ex, yb); ctx.lineTo(ex + ew, yb); ctx.stroke();
      T(ex + ew + 8, ya + 4, 'n = 3', 13, '#26324a', 'left', 800); T(ex + ew + 8, yb + 4, 'n = 2', 13, '#26324a', 'left', 800);
      const tt = (S.t * 0.8) % 2;
      D.arrow(ex + ew * 0.25, yb - 4, ex + ew * 0.25, ya + 6, { color: '#14a058', width: 3, head: 9, alpha: tt < 1 ? 1 : 0.25 });
      D.arrow(ex + ew * 0.75, ya + 6, ex + ew * 0.75, yb - 4, { color: '#e2552a', width: 3, head: 9, alpha: tt >= 1 ? 1 : 0.25 });
      T(ex + ew * 0.25 - 6, ya + (yb - ya) / 2 + 4, '흡수', 12, '#0f7a43', 'right', 800); T(ex + ew * 0.75 + 6, ya + (yb - ya) / 2 + 4, '방출', 12, '#c2410c', 'left', 800);
      textBlock(ex + ew + 70, ty + 8, sw - ew - 100, '두 준위의 에너지 차이 ' + f2(dEn(3, 2)) + ' eV에 해당하는 빛(' + H_LINES[0].nm + ' nm)만 흡수하고, 같은 빛만 방출해요.', PHONE ? 12.5 : 14, '#3a465c', 19, 700);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 읽음 칸 ---------- */
  function updReadouts() {
    if (S.mode === 'spec') {
      const nl = nearLine(S.s.nm);
      readouts('분광기 눈금', S.s.nm + ' nm', '광원', SRC[S.s.src].name, '기록한 선', LINES.H.filter((l) => S.s.rec[l.nm]).length + ' / 4');
    } else if (S.mode === 'ladder') {
      readouts('맞게 계산한 선', S.l.ok.filter(Boolean).length + ' / 4', '계산 규칙', 'E = 1240 ÷ λ', '가장 큰 에너지', S.l.ok[3] ? f2(E_OBS[3]) + ' eV' : '—');
    } else if (S.mode === 'bohr') {
      const b = S.b;
      readouts('전자의 준위', 'n = ' + b.n, '준위 에너지', f2(En(b.n)) + ' eV', '마지막 전이', b.last || '—');
    } else {
      const v = S.k.view;
      readouts('화면', v === 'he' ? '헬륨 비교' : v === 'cloud' ? '전자 구름' : '흡수선', '수소 준위', 'E = −13.6 ÷ n²', '이온화 에너지', f1(E_ION) + ' eV');
    }
  }

  /* ---------- 컨트롤 연결 ---------- */
  $$('#srcSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.s.src = b.dataset.v; updateCtl(); }));
  $('#sNm').addEventListener('input', (e) => { S.s.nm = +e.target.value; Sound.tick(); updateCtl(); });
  $('#bRec').addEventListener('click', recordLine);
  $('#bRecClear').addEventListener('click', () => { Sound.click(); S.s.rec = {}; });
  $$('#bmSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.b.mode = b.dataset.v; updateCtl(); }));
  $('#sPh').addEventListener('input', (e) => { S.b.ph = Math.round(+e.target.value * 100) / 100; Sound.tick(); updateCtl(); });
  $('#bFire').addEventListener('click', firePhoton);
  $('#sRing').addEventListener('input', (e) => { S.k.ring = Math.round(+e.target.value * 10) / 10; Sound.tick(); updateCtl(); });
  $('#inLy').addEventListener('input', (e) => { S.b.pred.ly = e.target.value; e.target.classList.remove('ok', 'bad'); });
  $('#inPa').addEventListener('input', (e) => { S.b.pred.pa = e.target.value; e.target.classList.remove('ok', 'bad'); });

  const CLS = [['incand', '백열등의 스펙트럼은?'], ['H', '수소 방전관의 스펙트럼은?'], ['He', '헬륨 방전관의 스펙트럼은?'], ['Ne', '네온 방전관의 스펙트럼은?']];
  const clsDefs = CLS.map((c) => [c[1], [['c', '연속 스펙트럼'], ['l', '선스펙트럼']], SRC[c[0]].cls]);
  const clsSels = mkSelects($('#clsRows'), clsDefs, clsSt, clsOk);
  const HYP = [
    ['관찰한 선 4개를 설명할 수 있는 가설은?', [['A', '(A) 전자의 에너지는 연속적이다'], ['B', '(B) 전자의 에너지는 특정한 값만 가진다']], 'B'],
    ['(B)가 맞다면 원자가 내는 광자의 에너지는?', [['diff', '두 에너지 값의 차이와 같다'], ['any', '아무 값이나 될 수 있다'], ['same', '항상 13.6 eV이다']], 'diff'],
  ];
  const hypSels = mkSelects($('#hypRows'), HYP, hypSt, hypOk);
  function resetSel(sels, store, okStore) { Object.keys(store).forEach((k) => delete store[k]); Object.keys(okStore).forEach((k) => delete okStore[k]); sels.forEach((s) => { s.value = ''; s.classList.remove('ok', 'bad'); }); }

  /* ================= 미션 ================= */
  const nRec = () => LINES.H.filter((l) => S.s.rec[l.nm]).length;
  const levels = [
    {
      title: '수소 방전관의 선스펙트럼', short: '선스펙트럼', icon: '🔭', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 원자가 내는 빛이 왜 무지개 전체가 아니라 몇 개의 선만일까? 선의 위치는 무엇을 알려 줄까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 분광기로 본 원소의 선스펙트럼이 “원소의 지문”이라는 것을 배웠어요. 이번에는 <b>왜 선인지</b>를 원자 속 전자의 에너지로 설명해요.</div>' +
        '<p>수소 방전관의 빛을 분광기(눈금 단위: nm)로 보고 밝은 선의 위치를 정확히 읽어 봐요. 백열등과도 비교해 봐요.</p>',
      features: ['spec'],
      setup() { S.s = mkS(); need = ''; resetSel(clsSels, clsSt, clsOk); setScene('spec'); updateCtl(); },
      recap: '백열등은 색이 끊김 없는 연속 스펙트럼이고, 수소 방전관은 656, 486, 434, 410 nm의 선 4개만 내는 선스펙트럼이에요. 선의 위치는 원소마다 정해져 있어요.',
      summary: '<ul><li><b>연속 스펙트럼</b>: 백열등처럼 색이 끊김 없이 이어져요. <b>선스펙트럼</b>: 방전관의 기체처럼 몇 개의 밝은 선만 나타나요.</li><li>수소의 가시광선 선 4개: <b>' + H_LINES.map((l) => l.nm).join(' · ') + ' nm</b> (빨강 · 청록 · 남색 · 보라).</li><li>선의 위치는 원소마다 달라서 <b>원소의 지문</b>이에요. 원자마다 낼 수 있는 빛이 정해져 있다는 뜻이에요.</li></ul>',
      missions: [
        {
          title: '수소의 밝은 선 4개 읽기',
          goal: '광원을 <b>수소 방전관</b>으로 바꾸고, 눈금을 선에 맞춰 <b>밝은 선 4개</b>의 파장을 모두 기록하세요.',
          hint: '광원에서 “수소”를 고른 뒤 눈금 슬라이더(또는 스펙트럼을 직접 끌기)로 선에 가져가요. 노란색 “선 발견!”이 뜨면 📏 이 선 기록하기를 눌러요. 빨강(약 656 nm)부터 찾으면 쉬워요.',
          setup() { need = ''; updateCtl(); setScene('spec'); },
          check: () => nRec() === 4,
          hold: 0.3,
          status: () => LINES.H.map((l) => mark(S.s.rec[l.nm]) + ' ' + l.nm + ' nm').join(' &nbsp; '),
          explain: '수소 방전관은 <b>' + H_LINES.map((l) => l.nm).join(' · ') + ' nm</b>의 선 4개만 내요. 백열등처럼 모든 색을 내지 않고, 정해진 색(파장)의 빛만 내는 것이 선스펙트럼이에요.',
        },
        {
          title: '연속인가, 선인가?', manual: true,
          goal: '광원 4개의 스펙트럼을 <b>연속 스펙트럼</b>과 <b>선스펙트럼</b>으로 분류하고 ✔ 확인하기를 누르세요.',
          hint: '위쪽 광원 버튼으로 바꿔 가며 스펙트럼 띠를 살펴봐요. 색이 끊김 없이 이어지면 연속, 몇 개의 밝은 선만 있으면 선스펙트럼이에요.',
          setup() { need = 'cls'; updateCtl(); setScene('spec'); },
          check() {
            const r = checkSelects(clsDefs, clsSels, clsSt, clsOk);
            if (r.miss) return '아직 고르지 않은 칸이 ' + r.miss + '개 있어요.';
            return r.bad ? '빨간 칸을 다시 골라 보세요. 광원 버튼으로 스펙트럼 띠를 다시 확인할 수 있어요.' : true;
          },
          status: () => '고른 칸 ' + CLS.filter((c, i) => clsSt[i]).length + ' / ' + CLS.length,
          explain: '<b>백열등</b>은 연속 스펙트럼, <b>수소 · 헬륨 · 네온 방전관</b>은 선스펙트럼이에요. 뜨거운 고체는 모든 색을 내고, 낮은 압력의 기체 원자는 정해진 색만 내요.',
        },
        {
          type: 'quiz', title: '선의 위치가 원소마다 다른 까닭',
          goal: '원소마다 선스펙트럼의 선 위치가 다른 까닭을 가장 잘 설명한 것은?',
          setup() { need = ''; updateCtl(); setScene('spec'); },
          choices: ['원자마다 낼 수 있는 빛의 에너지(색)가 정해져 있어서', '방전관 유리의 색이 원소마다 달라서', '백열등보다 온도가 낮아서', '프리즘이 빛을 일부만 통과시켜서'],
          answer: 0,
          feedback: ['', '유리는 투명해요. 같은 유리 관에서도 기체가 다르면 선이 달라요.', '온도가 낮아도 연속 스펙트럼을 내는 물질이 있어요. 기체 원자가 정해진 빛만 내기 때문이에요.', '프리즘은 빛을 색(파장)별로 나눌 뿐 일부만 통과시키지 않아요.'],
          explain: '선의 위치는 원자가 낼 수 있는 빛의 에너지가 정해져 있다는 뜻이에요. 다음 단계에서 이것이 원자 속 전자의 <b>에너지</b>와 어떤 관계인지 알아봐요.',
        },
      ],
    },
    {
      title: '선의 파장에서 에너지의 불연속 읽기', short: '불연속 준위', icon: '🪜', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 수소가 ' + H_LINES.map((l) => l.nm).join(' · ') + ' nm의 선만 낸다는 것을 관찰했어요. 선 하나는 광자 하나의 에너지예요. <b>광자 에너지 E(eV) = 1240 ÷ λ(nm)</b>를 써서 선의 파장을 에너지로 바꿔 봐요.</div>' +
        '<p>두 가설을 세워요. <b>(A)</b> 전자의 에너지는 아무 값이나 가질 수 있다. <b>(B)</b> 전자의 에너지는 특정한 값만 가진다. 관찰한 스펙트럼은 어느 가설을 지지할까요?</p>',
      features: ['ladder'],
      setup() { S.l = mkL(); need = ''; eIn.forEach((e) => { e.value = ''; e.classList.remove('ok', 'bad'); }); resetSel(hypSels, hypSt, hypOk); setScene('ladder'); updateCtl(); },
      recap: '선의 파장을 광자 에너지로 바꾸면 ' + E_OBS.map(f2).join(' · ') + ' eV예요. 전자의 에너지가 연속적이면 연속 스펙트럼이 나와야 하므로, 선스펙트럼은 전자의 에너지가 특정한 값만 가진다(양자화)는 증거예요.',
      summary: '<ul><li>광자 에너지 <b>E = hf = hc/λ</b> ≈ <b>1240 ÷ λ</b> (E: eV, λ: nm).</li><li>수소의 선: ' + H_LINES.map((l, i) => l.nm + ' nm → ' + f2(E_OBS[i]) + ' eV').join(', ') + '.</li><li>(A) 연속적인 에너지 → 연속 스펙트럼 예상, (B) 특정 값만 → 선스펙트럼 예상. 관찰은 <b>(B)를 지지</b>해요.</li><li>원자 속 전자의 에너지는 띄엄띄엄한 값만 가져요 = <b>양자화</b>. 이 값들이 <b>에너지 준위</b>예요. 빛은 두 준위의 <b>에너지 차이</b>만큼 나와요.</li></ul>',
      missions: [
        {
          title: '파장을 광자 에너지로 바꾸기',
          goal: '네 선의 파장을 <b>E = 1240 ÷ λ</b>로 계산해 eV 값을 입력하세요. 소수 둘째 자리까지 써요.',
          hint: '예) 656 nm → 1240 ÷ 656 = 1.89 eV. 계산기를 써도 좋아요. 맞게 입력하면 오른쪽 사다리에 눈금이 놓여요.',
          setup() { need = ''; updateCtl(); setScene('ladder'); },
          check: () => S.l.ok.every(Boolean),
          hold: 0.4,
          status: () => H_LINES.map((l, i) => mark(S.l.ok[i]) + ' ' + l.nm + ' nm').join(' &nbsp; '),
          explain: H_LINES.map((l, i) => l.nm + ' nm → 1240 ÷ ' + l.nm + ' = <b>' + f2(E_OBS[i]) + ' eV</b>').join('<br>') + '<br>에너지 값이 아무렇게나 흩어져 있지 않고, 맨 아래 준위 위의 정해진 높이에만 놓여요.',
        },
        {
          title: '어느 가설이 맞을까?', manual: true,
          goal: '두 가설 중 관찰과 맞는 것을 고르고, 원자가 내는 광자의 에너지가 무엇과 같은지 고른 뒤 ✔ 확인하기를 누르세요.',
          hint: '(A)가 맞다면 에너지 차이가 아무 값이나 될 수 있어서 색이 끊김 없이 나와야 해요. 위쪽 세 개의 스펙트럼 띠를 비교해 보세요.',
          setup() { need = 'hyp'; updateCtl(); setScene('ladder'); },
          check() {
            const r = checkSelects(HYP, hypSels, hypSt, hypOk);
            if (r.miss) return '아직 고르지 않은 문장이 ' + r.miss + '개 있어요.';
            return r.bad ? '빨간 칸을 다시 골라 보세요. 위쪽의 세 스펙트럼 띠를 비교해 보세요.' : true;
          },
          status: () => '고른 문장 ' + HYP.filter((h, i) => hypSt[i]).length + ' / ' + HYP.length,
          explain: '(A)가 맞다면 모든 에너지 차이가 가능해 <b>연속 스펙트럼</b>이 나와야 해요. 하지만 관찰된 것은 <b>선 4개</b>이므로 <b>(B) 전자의 에너지는 특정 값만 가진다</b>가 맞아요. 광자의 에너지는 전자가 옮겨 가는 <b>두 준위의 에너지 차이</b>와 같아요.',
        },
        {
          type: 'quiz', title: '양자화의 뜻',
          goal: '“원자 속 전자의 에너지는 양자화되어 있다”는 말의 뜻으로 옳은 것은?',
          setup() { need = ''; updateCtl(); setScene('ladder'); },
          choices: ['전자의 에너지가 띄엄띄엄한 특정 값만 가질 수 있다', '전자가 궤도 사이를 연속적으로 미끄러지듯 이동한다', '전자의 에너지가 항상 0이다', '전자가 원자핵 속으로 사라진다'],
          answer: 0,
          feedback: ['', '만약 연속적으로 이동하며 빛을 낸다면 연속 스펙트럼이 나와야 해요. 관찰된 것은 선이에요.', '전자의 에너지는 준위마다 정해진 값(수소는 −13.6 ÷ n² eV)이에요.', '전자는 사라지지 않고, 정해진 준위 사이를 옮겨 다녀요.'],
          explain: '양자화는 에너지가 <b>띄엄띄엄한 값</b>만 가지는 것이에요. 전자는 준위 사이를 연속적으로 움직이는 것이 아니라, 한 준위에서 다른 준위로 <b>옮겨 가며</b> 그 차이만큼의 빛을 내요.',
        },
      ],
    },
    {
      title: '보어 모형으로 선 재현하기', short: '보어 모형', icon: '⚛️', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 전자의 에너지가 띄엄띄엄한 값만 가진다는 것을 알았어요. 보어는 수소 선스펙트럼을 설명하려고 <b>전자는 정해진 궤도(n = 1, 2, 3, …)에만 있고, 각 궤도의 에너지는 E<sub>n</sub> = −13.6 ÷ n² (eV)</b>라는 모형을 제안했어요.</div>' +
        '<p>전자가 높은 준위에서 낮은 준위로 내려오면 그 <b>에너지 차이</b>만큼의 광자를 내보내고(ΔE = hf ≈ 1240 ÷ λ), 같은 에너지의 광자를 흡수하면 높은 준위로 올라가요.</p>',
      features: ['bohr'],
      setup() { S.b = mkB(); need = ''; $('#inLy').value = ''; $('#inPa').value = ''; $('#inLy').classList.remove('ok', 'bad'); $('#inPa').classList.remove('ok', 'bad'); setScene('bohr'); updateCtl(); },
      recap: '보어 모형에서 전자가 n = 3, 4, 5, 6에서 n = 2로 내려올 때 수소의 가시광선 선 656, 486, 434, 410 nm가 나와요. n = 1로 내려오면 자외선, n = 3으로 내려오면 적외선이에요.',
      summary: '<ul><li>보어 모형: 전자는 정해진 궤도 n = 1, 2, 3, …에만 있어요. <b>E<sub>n</sub> = −13.6 ÷ n² (eV)</b>: ' + [1, 2, 3, 4, 5, 6].map((n) => 'E' + n + ' = ' + f2(En(n))).join(', ') + '.</li><li>전이 때 광자 에너지는 두 준위의 차이: <b>ΔE = E<sub>높은</sub> − E<sub>낮은</sub> = hf ≈ 1240 ÷ λ</b>.</li><li>n → 2: 가시광선(' + H_LINES.map((l) => l.n + '→2 ' + l.nm + ' nm').join(', ') + '). n → 1(라이먼): 자외선(2→1은 ' + fmtNm(lamOf(dEn(2, 1))) + ' nm). n → 3(파셴): 적외선(4→3은 ' + fmtNm(lamOf(dEn(4, 3))) + ' nm).</li><li>흡수: 두 준위의 차이와 <b>같은 에너지의 광자만</b> 흡수돼요. 맞지 않으면 통과해요.</li></ul>',
      missions: [
        {
          title: '가시광선 선 4개를 모두 방출시키기',
          goal: '전자를 옮겨 <b>3→2, 4→2, 5→2, 6→2</b> 전이로 가시광선 선 4개를 모두 내보내고, <b>흡수</b>로 전자를 한 번 올려 보세요.',
          hint: '방출 화면에서 먼저 위 준위(예: n=4)를 눌러 전자를 올린 뒤, n=2를 눌러 내려요. 흡수는 “흡수” 버튼을 고르고 사다리 아래에 적힌 에너지로 광자 에너지를 맞춘 뒤 쏘아요.',
          setup() { need = ''; S.b.mode = 'emit'; updateCtl(); setScene('bohr'); },
          check: () => [3, 4, 5, 6].every((n) => S.b.seen[n + '>2']) && S.b.absorbed > 0,
          hold: 0.3,
          status: () => H_LINES.map((l) => mark(S.b.seen[l.n + '>2']) + ' ' + l.n + '→2 (' + l.nm + ' nm)').join(' &nbsp; ') + '<br>' + mark(S.b.absorbed > 0) + ' 광자 흡수로 전자 올리기 (허용 오차 ±' + TOL + ' eV)',
          explain: H_LINES.map((l) => l.n + '→2: ΔE = ' + f2(dEn(l.n, 2)) + ' eV → 1240 ÷ ' + f2(dEn(l.n, 2)) + ' ≈ <b>' + l.nm + ' nm</b>').join('<br>') + '<br>수소의 선 4개가 모두 <b>n = 2로 내려오는 전이</b>예요. 흡수는 같은 에너지 차이의 광자만 가능해요.',
        },
        {
          title: '보이지 않는 선의 파장 예측하기', manual: true,
          goal: '<b>n = 2 → 1</b>(라이먼)과 <b>n = 4 → 3</b>(파셴) 전이에서 나오는 빛의 파장(nm)을 계산해 입력하고 ✔ 확인하기를 누르세요.',
          hint: '먼저 ΔE = E높은 − E낮은 (E<sub>n</sub> = −13.6 ÷ n²)을 구하고, λ = 1240 ÷ ΔE로 바꿔요. 라이먼은 소수 첫째 자리까지, 파셴은 정수로 써요.',
          setup() { need = 'pred'; updateCtl(); setScene('bohr'); },
          check() {
            const ly = numOf(S.b.pred.ly), pa = numOf(S.b.pred.pa), a = $('#inLy'), c = $('#inPa');
            if (!isFinite(ly) || !isFinite(pa)) { if (!isFinite(ly)) a.classList.add('bad'); if (!isFinite(pa)) c.classList.add('bad'); return '두 칸에 파장(nm)을 숫자로 입력해 주세요.'; }
            const exL = lamOf(dEn(2, 1)), exP = lamOf(dEn(4, 3));
            const okL = Math.abs(ly - exL) <= 1.5, okP = Math.abs(pa - exP) <= exP * 0.01;
            a.classList.toggle('ok', okL); a.classList.toggle('bad', !okL); c.classList.toggle('ok', okP); c.classList.toggle('bad', !okP);
            if (okL && okP) return true;
            if (!okL && ly > 400) return '라이먼(2→1)은 에너지 차이가 커서(' + f1(dEn(2, 1)) + ' eV) 파장이 가시광선보다 짧아요. λ = 1240 ÷ ΔE로 다시 계산해 보세요.';
            if (!okP && pa < 700) return '파셴(4→3)은 에너지 차이가 작아서(' + f2(dEn(4, 3)) + ' eV) 파장이 가시광선보다 길어요. λ = 1240 ÷ ΔE로 다시 계산해 보세요.';
            return '빨간 칸을 다시 계산해 보세요. ΔE = 13.6 × (1/낮은² − 1/높은²) 이에요.';
          },
          status: () => '라이먼 2→1 &nbsp; 파셴 4→3 &nbsp;(방출 화면에서 직접 확인해 봐도 좋아요)',
          explain: '2→1: ΔE = 13.6 × (1 − 1/4) = <b>' + f1(dEn(2, 1)) + ' eV</b> → λ = 1240 ÷ ' + f1(dEn(2, 1)) + ' ≈ <b>' + fmtNm(lamOf(dEn(2, 1))) + ' nm</b> (자외선).<br>4→3: ΔE = 13.6 × (1/9 − 1/16) = <b>' + f2(dEn(4, 3)) + ' eV</b> → λ ≈ <b>' + fmtNm(lamOf(dEn(4, 3))) + ' nm</b> (적외선).',
        },
        {
          type: 'quiz', title: 'n = 2 → 1 전이가 보이지 않는 까닭',
          goal: '전자가 n = 2에서 n = 1로 내려올 때 나오는 빛을 눈으로 볼 수 없는 까닭은?',
          setup() { need = ''; updateCtl(); setScene('bohr'); },
          choices: ['에너지 차이가 가시광선보다 훨씬 커서 파장이 짧은 자외선이기 때문', '에너지 차이가 0이어서 빛이 나오지 않기 때문', '에너지 차이가 가시광선보다 작아서 파장이 긴 적외선이기 때문', '전자가 n = 1에는 내려올 수 없기 때문'],
          answer: 0,
          feedback: ['', '에너지 차이는 ' + f1(dEn(2, 1)) + ' eV로 오히려 커요.', '2→1은 n → 2 전이(약 2~3 eV)보다 에너지가 훨씬 커요. 에너지가 클수록 파장은 짧아요.', 'n = 1은 가장 낮은 준위(바닥 상태)예요. 전자가 가장 안정하게 머무는 곳이에요.'],
          explain: '에너지 차이 ' + f1(dEn(2, 1)) + ' eV → λ = 1240 ÷ ' + f1(dEn(2, 1)) + ' ≈ ' + fmtNm(lamOf(dEn(2, 1))) + ' nm로 <b>자외선</b>이에요. 광자의 에너지가 클수록 파장이 짧아서 가시광선(400 ~ 700 nm)을 벗어나요.',
        },
      ],
    },
    {
      title: '보어 모형의 한계', short: '한계', icon: '🔬', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 보어 모형이 수소의 선 위치를 잘 설명한다는 것을 확인했어요. 그런데 이 모형은 어디까지 맞을까요?</div>' +
        '<p>위쪽 버튼으로 <b>헬륨 비교</b>, <b>전자 구름</b>, <b>흡수선</b> 화면을 바꿔 가며 보어 모형이 맞는 것과 맞지 않는 것을 정리해 봐요.</p>',
      features: ['limit'],
      setup() { S.k = mkK(); need = ''; setScene('limit'); updateCtl(); },
      recap: '보어 모형은 수소의 선 위치를 설명하지만, 전자가 2개 이상인 원자와 선의 세기는 설명하지 못해요. 전자를 정해진 궤도를 도는 입자로 본 점도 물질파와 맞지 않아, 현대 양자 역학은 전자를 확률 분포(전자 구름)로 나타내요.',
      summary: '<ul><li>보어 모형이 <b>맞는 것</b>: 수소 선스펙트럼의 파장, 에너지 준위 E<sub>n</sub> = −13.6 ÷ n², 흡수선과 방출선이 같은 위치.</li><li>보어 모형의 <b>한계</b>: 전자가 2개 이상인 원자(헬륨 등)의 스펙트럼, 선의 세기 차이와 미세한 갈라짐을 설명하지 못해요.</li><li>전자를 궤도를 도는 입자로 본 점은 <b>물질파</b>(전자의 파동성)와 맞지 않아요. 현대 양자 역학은 전자의 위치를 <b>확률 분포(전자 구름 · 오비탈)</b>로 나타내요.</li><li>흡수선은 방출선과 같은 위치: 두 준위의 에너지 차이만큼만 흡수하고 방출하기 때문이에요.</li></ul>',
      missions: [
        {
          type: 'quiz', title: '보어 모형이 맞는 것과 틀린 것',
          setup() { need = ''; S.k.view = 'he'; updateCtl(); setScene('limit'); },
          goal: '보어 모형에 대한 설명으로 옳은 것은? (헬륨 비교와 전자 구름 화면을 살펴보세요.)',
          choices: ['수소의 선스펙트럼 파장을 잘 설명하지만, 전자가 2개 이상인 원자에는 맞지 않는다', '모든 원소의 선스펙트럼을 정확히 설명한다', '전자가 정해진 궤도를 도는 입자라는 점이 현대 양자 역학에서도 그대로 받아들여진다', '선의 밝기 차이까지 모두 설명한다'],
          answer: 0,
          feedback: ['', '헬륨 화면을 보세요. 수소 준위로 예측한 선이 실제 헬륨의 선과 어긋나요.', '현대 양자 역학에서는 전자의 위치를 확률 분포(전자 구름)로 나타내요. 전자 구름 화면을 보세요.', '보어 모형은 선의 위치만 설명해요. 선마다 밝기가 다른 까닭은 설명하지 못해요.'],
          explain: '보어 모형은 <b>수소의 선 위치</b>를 설명한 큰 성과였지만, <b>전자가 2개 이상</b>인 원자, <b>선의 세기</b>, 미세한 갈라짐은 설명하지 못해요. 또 전자를 궤도를 도는 입자로 본 점은 전자의 파동성과 맞지 않아, 현대 모형은 전자를 <b>전자 구름</b>으로 나타내요.',
        },
        {
          type: 'quiz', title: '흡수선과 방출선의 위치가 같은 까닭',
          setup() { need = ''; S.k.view = 'abs'; updateCtl(); setScene('limit'); },
          goal: '수소의 흡수선은 방출선과 같은 위치에 나타나요. 그 까닭은?',
          choices: ['흡수하는 에너지와 방출하는 에너지가 모두 같은 두 준위의 에너지 차이이기 때문', '흡수한 빛을 그대로 반사하기 때문', '흡수선은 열 때문에 생기고 방출선은 빛 때문에 생기기 때문', '흡수와 방출은 서로 관계가 없기 때문'],
          answer: 0,
          feedback: ['', '반사가 아니라 전자가 에너지를 얻어 높은 준위로 올라가는 과정이에요.', '둘 다 전자가 준위 사이를 옮겨 가는 과정이에요.', '둘 다 같은 두 준위 사이의 에너지 차이로 정해져요. 그래서 위치가 같아요.'],
          explain: '전자는 두 준위 사이의 <b>에너지 차이</b>와 같은 광자만 흡수하고(올라감), 같은 차이만큼의 광자를 방출해요(내려옴). 그래서 흡수선의 위치가 방출선과 <b>같아요</b>. 이 때문에 별빛의 흡수선으로 별의 구성 원소를 알아낼 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hp-energy-level', mount: '#game', badge: '준위 탐험가', homeHref: '../../index.html#hp',
    featureLabels: { spec: '🔭 분광기 · 광원 4종', ladder: '🪜 광자 에너지 계산 · 에너지 사다리', bohr: '⚛️ 보어 모형 · 전이 · 흡수', limit: '🔬 헬륨 비교 · 전자 구름 · 흡수선' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  setScene('spec');
  let lastLvl = -1, lastFree = false;
  SciSim.loop((dt, t) => {
    S.t = t;
    if (game && (game.level !== lastLvl || game.free !== lastFree)) { lastLvl = game.level; lastFree = game.free; updateCtl(); }
    HITS.length = 0;
    stepBohr(dt);
    view.apply(); ctx.fillStyle = '#eef2fa'; ctx.fillRect(0, 0, VW, VH);
    if (S.mode === 'spec') drawSpec(dt); else if (S.mode === 'ladder') drawLadder(dt); else if (S.mode === 'bohr') drawBohr(dt); else drawLimit(dt);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    updReadouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, updateCtl, L1, L3, orbR, levY, chipY, startTransition, firePhoton, recordLine, H_LINES, E_OBS, dEn, lamOf, TOL,
  };
})();
