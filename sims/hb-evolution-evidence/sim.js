(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;
  const C = SciSim.color;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 700 : 560;
  const RM = SciSim.reduceMotion;
  const TAU = Math.PI * 2;
  const mark = (b) => (b ? '✅' : '⬜');
  const L = (a, b) => (PHONE ? b : a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const ease = SciSim.ease;
  function mulberry(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  /* 받침 유무에 따라 조사 고르기: josa('핵형', '은', '는') */
  function josa(w, a, b) { const ch = String(w).charCodeAt(String(w).length - 1); if (ch < 0xAC00 || ch > 0xD7A3) return b; return ((ch - 0xAC00) % 28) ? a : b; }

  const BG = '#eef5ee';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FONT_EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function E(ch, x, y, size, o) {
    o = o || {};
    ctx.save(); ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = size + 'px ' + FONT_EMO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(ch, 0, 0); ctx.restore();
  }
  function wrap(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '', sp = -1;
    for (const ch of str) {
      if (ch === '\n') { out.push(line); line = ''; sp = -1; continue; }
      const t = line + ch;
      if (ctx.measureText(t).width > maxW && line) {
        if (sp > 0 && ch !== ' ') { out.push(line.slice(0, sp).trimEnd()); line = line.slice(sp + 1) + ch; } else { out.push(line); line = ch.trim() === '' ? '' : ch; }
        sp = line.lastIndexOf(' ');
      } else { line = t; if (ch === ' ') sp = line.length - 1; }
    }
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function textBlock(x, y, maxW, str, size, color, lh, weight, align) {
    const ls = wrap(str, maxW, size, weight || 700);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  function bgFill(top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 4200);
  }
  function hideHint() { const h = $('#stageHint'); if (h) h.classList.add('hide'); clearTimeout(hintTimer); }
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* 염색 분체 한 가닥 (세로 막대): 가운데 y를 기준으로 len 길이, 동원체는 위에서 cen 비율 */

  /* 순서 고르기 (DOM): 보기 버튼을 누른 순서대로 번호 칩이 쌓여요 */
  function makePicker(root, items, onChange) {
    let seq = [];
    root.innerHTML = '';
    const pool = document.createElement('div'); pool.className = 'pk-pool';
    const row = document.createElement('div'); row.className = 'pk-seq';
    const rst = document.createElement('button'); rst.type = 'button'; rst.className = 'btn btn-sm pk-reset'; rst.textContent = '↺ 다시 고르기';
    root.append(pool, row, rst);
    const btns = items.map((it) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pk-item'; b.innerHTML = it.html; b.dataset.id = it.id;
      b.addEventListener('click', () => { if (seq.indexOf(it.id) >= 0) return; seq.push(it.id); Sound.click(); render(); onChange && onChange(seq.slice()); });
      pool.appendChild(b); return b;
    });
    function render() {
      row.innerHTML = '';
      seq.forEach((id, i) => {
        const it = items.find((x) => x.id === id);
        const c = document.createElement('button'); c.type = 'button'; c.className = 'pk-chip'; c.innerHTML = '<b>' + (i + 1) + '</b> ' + it.html; c.title = '눌러서 빼기';
        c.addEventListener('click', () => { seq = seq.slice(0, i); Sound.click(); render(); onChange && onChange(seq.slice()); });
        row.appendChild(c);
      });
      btns.forEach((b) => { b.disabled = seq.indexOf(b.dataset.id) >= 0; });
      row.classList.remove('bad'); row.classList.remove('ok');
    }
    rst.addEventListener('click', () => { seq = []; Sound.click(); render(); onChange && onChange([]); });
    render();
    return { get seq() { return seq.slice(); }, set(a) { seq = a.slice(); render(); onChange && onChange(seq.slice()); }, reset() { seq = []; render(); onChange && onChange([]); }, mark(cls) { row.classList.remove('bad', 'ok'); if (cls) row.classList.add(cls); } };
  }

  /* =========================================================
     고등학교 생명과학 Ⅲ. 생명의 연속성과 다양성 - 진화의 증거 (단원 39, 4차시)
     성취기준 [12생과03-03] 생물 진화의 원리를 이해하고, 생물 진화 연구의 다양한 사례를 조사하여 협력적으로 소통할 수 있다. (앞부분)
     ① 관찰: 진화란(말 화석 계열)  ② 분석: 비교 해부(상동·상사·흔적 기관)
     ③ 분석: 분자 증거(사이토크롬 c)  ④ 조사: 다윈의 생각(자연선택설 조립, 용불용설 비교)
     ========================================================= */
  const S = { mode: 'horse', clock: 0, fade: 0 };
  let game = null;
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  const MODE_LABEL = { horse: '🐎 말의 화석 계열', bones: '🦴 앞다리 뼈 색칠하기', class: '🔎 상동 · 상사 · 흔적 기관', molec: '🧪 사이토크롬 c 아미노산 차이', darwin: '🧠 다윈의 자연선택설 조립', giraffe: '🦒 기린 목 사례: 두 가지 설명' };
  const rr = (a, b) => a + Math.random() * (b - a);

  /* =========================================================
     ① 말 화석 계열 (모식도: 값은 교과서 수준으로 단순화)
     ========================================================= */
  const HS = [
    { n: '에오히푸스', time: '약 5500만 년 전', h: 0.4, toe: [[14, 80], [18, 100], [16, 90], [12, 70]], tooth: 16, neck: 0.2, ang: 18, food: '부드러운 잎' },
    { n: '메소히푸스', time: '약 3500만 년 전', h: 0.6, toe: [[14, 90], [22, 105], [14, 90], [0, 0]], tooth: 24, neck: 0.26, ang: 28, food: '잎과 풀' },
    { n: '메리키푸스', time: '약 1500만 년 전', h: 1.0, toe: [[10, 70], [28, 115], [10, 70], [0, 0]], tooth: 34, neck: 0.32, ang: 40, food: '풀' },
    { n: '에쿠스(현재의 말)', time: '현재', h: 1.5, toe: [[4, 40], [36, 125], [4, 40], [0, 0]], tooth: 46, neck: 0.38, ang: 52, food: '질긴 풀' },
  ];
  const hv = (t, f) => { const k = clamp(t, 0, 299.999) / 100, i = Math.floor(k), r = k - i; return lerp(f(HS[i]), f(HS[i + 1]), r); };
  const toeAt = (t, s) => [hv(t, (h) => h.toe[s][0]), hv(t, (h) => h.toe[s][1])];
  const toeCount = (t) => [0, 1, 2, 3].filter((s) => toeAt(t, s)[0] >= 6).length;
  const heightAt = (t) => hv(t, (h) => h.h);
  const nearStage = (t) => clamp(Math.round(t / 100), 0, 3);
  const heightTxt = (t) => '약 ' + heightAt(t).toFixed(1) + ' m';
  const timeTxt = (t) => HS[nearStage(t)].time;
  const HSC = L({ x: 14, y: 46, w: 506, h: 318 }, { x: 6, y: 34, w: 468, h: 270 });
  const HFOOT = L({ x: 532, y: 46, w: 254, h: 154 }, { x: 6, y: 312, w: 231, h: 150 });
  const HTOOTH = L({ x: 532, y: 210, w: 254, h: 154 }, { x: 243, y: 312, w: 231, h: 150 });
  const HTL = L({ x: 14, y: 374, w: 772, h: 92 }, { x: 6, y: 470, w: 468, h: 96 });
  const HPOP = L({ x: 14, y: 476, w: 772, h: 72 }, { x: 6, y: 574, w: 468, h: 120 });
  const PXM = L(118, 98);
  const tlX = (i) => HTL.x + 70 + i * (HTL.w - 140) / 3;
  function resetHorse() { S.horse = { t: 0, auto: false, seen: [true, false, false, false], pick: {}, popT: 0 }; const s = $('#sTime'); if (s) { s.value = 0; } const b = $('#bPlay'); if (b) b.textContent = '▶ 처음부터 재생'; }
  function drawHorse(cx, gy, H, p, alpha) {
    const sw = Math.sin(S.clock * 1.6) * 0.04, bob = RM ? 0 : Math.sin(S.clock * 2.2) * 0.006;
    const ry = lerp(0.30, 0.2, p), rx = lerp(0.56, 0.5, p), belly = -1 + 2 * ry, by = -1 + ry;
    ctx.save(); ctx.translate(cx, gy); ctx.scale(H, H); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const legs = (xs, col) => xs.forEach((x) => {
      ctx.strokeStyle = col; ctx.lineWidth = lerp(0.1, 0.07, p); ctx.beginPath(); ctx.moveTo(x, belly + 0.02); ctx.lineTo(x + 0.01, belly + (-belly) * 0.5); ctx.stroke();
      ctx.lineWidth = lerp(0.07, 0.05, p); ctx.beginPath(); ctx.moveTo(x + 0.01, belly + (-belly) * 0.5); ctx.lineTo(x, -0.035); ctx.stroke();
      ctx.strokeStyle = '#3b2a1c'; ctx.lineWidth = lerp(0.085, 0.065, p); ctx.beginPath(); ctx.moveTo(x, -0.04); ctx.lineTo(x, -0.005); ctx.stroke();
    });
    legs([rx * 0.62, -rx * 0.62], '#8a5a34');
    // 꼬리
    ctx.strokeStyle = '#4a2f1b'; ctx.lineWidth = 0.045; ctx.beginPath(); ctx.moveTo(-rx * 0.95, by - 0.04);
    ctx.bezierCurveTo(-rx - 0.12, by + 0.02, -rx - 0.2 + sw, by + 0.18, -rx - 0.16 + sw * 2, by + lerp(0.26, 0.34, p)); ctx.stroke();
    // 몸통
    const g = ctx.createLinearGradient(0, by - ry, 0, by + ry); g.addColorStop(0, '#c58a55'); g.addColorStop(1, '#9a6a3f');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, by + bob, rx, ry, 0, 0, TAU); ctx.fill();
    legs([rx * 0.44, -rx * 0.8], '#b07a4a');
    // 목과 머리
    const nl = lerp(HS[0].neck, HS[3].neck, p), a = lerp(18, 52, p) * Math.PI / 180;
    const nbx = rx * 0.66, nby = by - ry * 0.55, hx = nbx + Math.cos(a) * nl, hy = nby - Math.sin(a) * nl + bob;
    ctx.strokeStyle = '#b07a4a'; ctx.lineWidth = lerp(0.2, 0.15, p); ctx.beginPath(); ctx.moveTo(nbx - 0.05, nby + 0.03); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = '#4a2f1b'; ctx.lineWidth = 0.035; ctx.beginPath(); ctx.moveTo(nbx - 0.1, nby - 0.08); ctx.lineTo(hx - 0.07, hy - 0.08); ctx.stroke();
    ctx.save(); ctx.translate(hx + 0.05, hy + 0.02); ctx.rotate(lerp(0.25, 1.0, p));
    ctx.fillStyle = '#b07a4a'; ctx.beginPath(); ctx.ellipse(0.05, 0, lerp(0.15, 0.2, p), 0.075, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a2f1b'; ctx.beginPath(); ctx.moveTo(-0.07, -0.05); ctx.lineTo(-0.1, -0.17); ctx.lineTo(-0.02, -0.07); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -0.02, 0.018, 0, TAU); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0.004, -0.02, 0.01, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  /* 앞발 뼈: 가운데 발가락(III)이 패널 가운데에 오도록 그려요 */
  function drawFoot(px, py, w, h, t) {
    const x0 = px + w / 2 - 6, top = py + 36, sc = (h - 48) / 142;
    const slotX = [-22, 0, 22, 44];
    ctx.save(); ctx.translate(x0, top); ctx.scale(sc, sc);
    // 발허리뼈(몸쪽 뼈)
    const cw = 22 + toeAt(t, 1)[0] * 0.5;
    const g = ctx.createLinearGradient(-cw / 2, 0, cw / 2, 0); g.addColorStop(0, '#f5ecd6'); g.addColorStop(1, '#d9cba6');
    ctx.fillStyle = g; D.roundRect(-cw / 2 - 6, -4, cw + 12, 34, 10); ctx.fill(); ctx.strokeStyle = '#a08c5c'; ctx.lineWidth = 1.5; ctx.stroke();
    const tips = [];
    for (let s = 0; s < 4; s++) {
      const [tw, tl] = toeAt(t, s); if (tw < 0.6) continue;
      const x = slotX[s] - (s === 1 ? 0 : 0), len = tl * 0.9;
      const gg = ctx.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0); gg.addColorStop(0, '#f5ecd6'); gg.addColorStop(1, '#cbb98a');
      ctx.fillStyle = gg; ctx.globalAlpha = clamp(tw / 6, 0.35, 1);
      D.roundRect(x - tw / 2, 24, tw, len, Math.min(tw / 2, 8)); ctx.fill(); ctx.strokeStyle = '#a08c5c'; ctx.lineWidth = 1.3; ctx.stroke();
      ctx.globalAlpha = 1; tips.push([x, 24 + len, tw, s]);
      if (s === 1) { ctx.fillStyle = '#4b3a28'; D.roundRect(x - tw / 2 - 1, 24 + len - 14, tw + 2, 16, 6); ctx.fill(); }
    }
    // 바닥선
    const mainBottom = 24 + toeAt(t, 1)[1] * 0.9 + 2;
    ctx.strokeStyle = '#8b6b3e'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(-70, mainBottom); ctx.lineTo(90, mainBottom); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  function drawTooth(px, py, w, h, t) {
    const th = hv(t, (s) => s.tooth), cx = px + w / 2 + 24, base = py + h - 34, tw = 56;
    ctx.fillStyle = '#e9dcb7'; D.roundRect(cx - tw / 2, base, tw, 20, 6); ctx.fill();
    const gg = ctx.createLinearGradient(0, base - th, 0, base); gg.addColorStop(0, '#fffdf5'); gg.addColorStop(1, '#efe6cf');
    ctx.fillStyle = gg; D.roundRect(cx - tw / 2, base - th, tw, th + 2, 8); ctx.fill(); ctx.strokeStyle = '#b7a67a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(120,100,60,.45)'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) { const x = cx - tw / 2 + 10 + i * 18; ctx.beginPath(); ctx.moveTo(x, base - th + 5); ctx.lineTo(x, base - th + 5 + Math.min(th - 8, 12 + i % 2 * 6)); ctx.stroke(); }
    D.dashedLine(cx - tw / 2 - 30, base - th, cx - tw / 2, base - th, { color: '#64748b', width: 1.6, dash: [3, 3] });
    T(cx - tw / 2 - 34, base - th + 5, '관의 높이', 13, '#475569', 'right', 800);
    const f = clamp(t / 300, 0, 1), ex = px + w - 46, ey = py + 62;
    E('🍃', ex, ey, 30, { alpha: 1 - smooth(f * 1.6) });
    E('🌾', ex, ey, 30, { alpha: smooth(f * 1.6 - 0.2) });
    T(ex, ey + 32, HS[nearStage(t)].food, 13, '#475569', 'center', 800);
  }
  function drawHorseMode(dt, t) {
    const q = S.horse;
    bgFill('#e6f2e8', '#f3efdf');
    T(HSC.x, L(28, 22), '🐎 말의 화석 계열 (모식도)', L(19, 17), '#0f5132', 'left', 800);
    const ns = nearStage(q.t), st = HS[ns];
    T(HSC.x + HSC.w, L(28, 22), st.n + ' · ' + st.time, L(15, 14), '#7c3aed', 'right', 800);
    panel(HSC.x, HSC.y, HSC.w, HSC.h, 18);
    const gy = HSC.y + HSC.h - L(36, 30);
    ctx.save(); D.roundRect(HSC.x, HSC.y, HSC.w, HSC.h, 18); ctx.clip();
    const sg = ctx.createLinearGradient(0, HSC.y, 0, gy); sg.addColorStop(0, '#dff1fb'); sg.addColorStop(1, '#f4faf6'); ctx.fillStyle = sg; ctx.fillRect(HSC.x, HSC.y, HSC.w, gy - HSC.y);
    ctx.fillStyle = '#b9d9a4'; ctx.fillRect(HSC.x, gy, HSC.w, HSC.h); ctx.fillStyle = '#9cc787'; ctx.fillRect(HSC.x, gy, HSC.w, 4);
    ctx.restore();
    // 눈금자(키)
    const rx0 = HSC.x + 34;
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx0, gy); ctx.lineTo(rx0, gy - 1.5 * PXM); ctx.stroke();
    [0, 0.5, 1.0, 1.5].forEach((m) => { const y = gy - m * PXM; ctx.beginPath(); ctx.moveTo(rx0 - 6, y); ctx.lineTo(rx0 + 6, y); ctx.stroke(); T(rx0 + 10, y + 4.5, m.toFixed(1) + ' m', 13, '#475569', 'left', 800); });
    const H = heightAt(q.t) * PXM, p = clamp(q.t / 300, 0, 1);
    D.dashedLine(rx0, gy - H, HSC.x + HSC.w - 16, gy - H, { color: '#7c3aed', width: 1.6, dash: [5, 5] });
    drawHorse(HSC.x + L(290, 270), gy, H, p);
    D.label(HSC.x + 116, Math.max(HSC.y + 22, gy - H - 14), '키 ' + heightTxt(q.t), { bg: '#7c3aed', size: L(14, 13), align: 'left' });
    // 앞발 · 이빨 패널
    [[HFOOT, '앞발 뼈 (단순화)'], [HTOOTH, '이빨(어금니) 단면']].forEach(([r, name]) => { panel(r.x, r.y, r.w, r.h, 16); T(r.x + 14, r.y + 24, name, 14.5, '#26324a', 'left', 800); });
    drawFoot(HFOOT.x, HFOOT.y, HFOOT.w, HFOOT.h, q.t);
    T(HFOOT.x + HFOOT.w - 12, HFOOT.y + 24, '발가락 ' + toeCount(q.t) + '개', 15, '#b91c1c', 'right', 800);
    drawTooth(HTOOTH.x, HTOOTH.y, HTOOTH.w, HTOOTH.h, q.t);
    // 시간 줄
    panel(HTL.x, HTL.y, HTL.w, HTL.h, 16);
    const ly = HTL.y + L(34, 34);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(tlX(0), ly); ctx.lineTo(tlX(3), ly); ctx.stroke();
    const mx = tlX(0) + (tlX(3) - tlX(0)) * clamp(q.t / 300, 0, 1);
    ctx.strokeStyle = '#7c3aed'; ctx.beginPath(); ctx.moveTo(tlX(0), ly); ctx.lineTo(mx, ly); ctx.stroke(); ctx.lineCap = 'butt';
    for (let i = 0; i < 4; i++) {
      const x = tlX(i), on = i === ns, seen = q.seen[i];
      if (seen) D.check(x, ly, on ? 14 : 11, 1, { color: '#16a34a' }); else D.sphere(x, ly, on ? 14 : 11, '#94a3b8', { shadow: on });
      T(x, ly + 32, HS[i].n.replace('(현재의 말)', ''), L(14, 12.5), on ? '#7c3aed' : '#475569', 'center', 800);
      T(x, ly + 50, HS[i].time, L(13, 11.5), '#64748b', 'center', 700);
    }
    D.sphere(mx, ly, 9, '#7c3aed', { shadow: true, outline: '#fff', outlineWidth: 2.5 });
    // 개체 / 집단 모식도
    panel(HPOP.x, HPOP.y, HPOP.w, HPOP.h, 16);
    const nNew = Math.round(10 * clamp(q.t / 300, 0, 1));
    if (!PHONE) {
      T(HPOP.x + 16, HPOP.y + 28, '집단 모식도 (10마리) · 진한 점 = 발가락이 더 적은 형질', 14.5, '#26324a', 'left', 800);
      T(HPOP.x + 16, HPOP.y + 54, '개체는 평생 그대로, 집단 안의 비율이 세대에 걸쳐 변해요', 14, '#0f5132', 'left', 800);
      for (let i = 0; i < 10; i++) { const on = i < nNew; D.sphere(HPOP.x + 440 + i * 25, HPOP.y + 36, 10.5, on ? '#7c3aed' : '#cbd5e1', { gloss: on }); }
      T(HPOP.x + HPOP.w - 14, HPOP.y + 42, nNew + ' / 10', 17, '#7c3aed', 'right', 800);
    } else {
      T(HPOP.x + 14, HPOP.y + 26, '집단 모식도 (10마리)', 14.5, '#26324a', 'left', 800);
      T(HPOP.x + 14, HPOP.y + 48, '진한 점 = 발가락이 더 적은 형질의 개체', 13, '#64748b', 'left', 700);
      for (let i = 0; i < 10; i++) { const on = i < nNew; D.sphere(HPOP.x + 44 + i * 42, HPOP.y + 74, 13, on ? '#7c3aed' : '#cbd5e1', { gloss: on }); }
      T(HPOP.x + 14, HPOP.y + 106, '개체는 평생 그대로, 집단의 비율이 세대에 걸쳐 변해요', 13.5, '#0f5132', 'left', 800);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ② 비교 해부: 앞다리 뼈 색칠하기, 상동 · 상사 · 흔적 기관
     ========================================================= */
  const BCAT = [{ n: '위팔뼈', c: '#e8503f' }, { n: '아래팔뼈', c: '#3b82f6' }, { n: '손목뼈', c: '#22a05a' }, { n: '손가락뼈', c: '#a855f7' }];
  const digit = (x0, y0, x1, y1, n, r) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n + 0.012, b = (i + 1) / n - 0.012; out.push({ a: [x0 + (x1 - x0) * a, y0 + (y1 - y0) * a], b: [x0 + (x1 - x0) * b, y0 + (y1 - y0) * b], r }); } return out; };
  const dot = (x, y, r) => ({ a: [x, y], b: [x + 0.01, y], r });
  const LIMBS = [
    { id: 'human', n: '사람의 팔', fn: '물건 잡기', skin: 'rgba(240,190,150,.55)',
      out: [[4, 72], [110, 70], [215, 66], [236, 60], [300, 44], [316, 70], [318, 92], [308, 114], [286, 138], [232, 108], [214, 102], [110, 100], [4, 98]],
      g: [[{ a: [8, 85], b: [108, 85], r: 9 }],
        [{ a: [112, 78], b: [210, 78], r: 5.5 }, { a: [112, 92], b: [212, 92], r: 6 }],
        [dot(219, 74, 6.5), dot(231, 75, 6.5), dot(219, 88, 6.5), dot(231, 89, 6.5)],
        [{ a: [240, 70], b: [298, 52], r: 3.6 }, { a: [242, 79], b: [308, 72], r: 3.6 }, { a: [242, 88], b: [312, 90], r: 3.6 }, { a: [240, 97], b: [304, 108], r: 3.6 }, { a: [236, 104], b: [282, 128], r: 3.6 }]] },
    { id: 'whale', n: '고래의 지느러미', fn: '헤엄치기', skin: 'rgba(120,160,200,.45)',
      out: [[4, 66], [110, 58], [200, 46], [290, 58], [314, 84], [290, 114], [200, 128], [110, 114], [4, 104]],
      g: [[{ a: [8, 85], b: [60, 85], r: 13 }],
        [{ a: [64, 74], b: [104, 74], r: 9 }, { a: [64, 96], b: [104, 96], r: 9 }],
        [dot(113, 68, 8), dot(113, 85, 8), dot(113, 102, 8), dot(127, 76, 8), dot(127, 94, 8)],
        [].concat(digit(138, 64, 250, 58, 4, 4), digit(138, 76, 292, 76, 5, 4), digit(138, 86, 300, 88, 5, 4), digit(138, 98, 282, 104, 4, 4), digit(138, 108, 232, 122, 3, 4))] },
    { id: 'bat', n: '박쥐의 날개', fn: '날기', skin: 'rgba(150,120,170,.4)',
      out: [[4, 62], [80, 60], [196, 46], [222, 30], [308, 12], [316, 52], [312, 94], [292, 140], [206, 72], [140, 100], [110, 98], [60, 98], [4, 80]],
      g: [[{ a: [8, 70], b: [78, 70], r: 6 }],
        [{ a: [82, 68], b: [196, 52], r: 4 }, { a: [82, 74], b: [112, 76], r: 2.5 }],
        [dot(202, 50, 5), dot(200, 61, 4.5)],
        [{ a: [208, 46], b: [222, 34], r: 3 }].concat(digit(210, 52, 308, 16, 3, 2.8), digit(210, 56, 314, 52, 3, 2.8), digit(208, 60, 310, 94, 3, 2.8), digit(206, 64, 290, 138, 3, 2.8))] },
    { id: 'bird', n: '새의 날개', fn: '날기', skin: 'rgba(120,180,140,.45)',
      out: [[4, 70], [100, 62], [210, 58], [270, 52], [318, 66], [308, 88], [280, 106], [220, 112], [110, 104], [4, 92]],
      g: [[{ a: [8, 80], b: [92, 80], r: 8 }],
        [{ a: [96, 74], b: [196, 74], r: 4.5 }, { a: [96, 86], b: [200, 86], r: 6 }],
        [dot(205, 76, 5.5), dot(205, 88, 5.5)],
        [{ a: [214, 74], b: [262, 70], r: 4 }, { a: [214, 82], b: [250, 86], r: 3.2 }, { a: [214, 90], b: [236, 98], r: 2.6 }]] },
  ];
  LIMBS.forEach((lb) => { lb.cen = lb.g.map((caps) => { let sx = 0, sy = 0, n = 0; caps.forEach((c) => { sx += c.a[0] + c.b[0]; sy += c.a[1] + c.b[1]; n += 2; }); return [sx / n, sy / n]; }); });
  const BN_SC = L(1.128, 0.68);
  const BCARD = (i) => L({ x: 10 + (i % 2) * 395, y: 46 + Math.floor(i / 2) * 254, w: 385, h: 246 }, { x: 6 + (i % 2) * 237, y: 34 + Math.floor(i / 2) * 164, w: 231, h: 158 });
  const limbOrigin = (i) => { const c = BCARD(i); return [c.x + L(12, 6), c.y + L(40, 32)]; };
  function resetBones() {
    S.bn = { brush: 0, paint: LIMBS.map((l, i) => (i === 0 ? [0, 1, 2, 3] : [null, null, null, null])), pop: LIMBS.map(() => [1, 1, 1, 1]), link: LIMBS.map((l, i) => (i === 0 ? [0, 0, 0, 0] : [0, 0, 0, 0])), shake: LIMBS.map(() => [0, 0, 0, 0]), wrong: LIMBS.map(() => [false, false, false, false]) };
    $$('#brushSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.b === 0));
  }
  const bnPainted = () => { let n = 0; for (let i = 1; i < 4; i++) for (let g = 0; g < 4; g++) if (S.bn.paint[i][g] != null) n++; return n; };
  const bnRight = () => { let n = 0; for (let i = 1; i < 4; i++) for (let g = 0; g < 4; g++) if (S.bn.paint[i][g] === g) n++; return n; };
  function capDist(c, x, y) { const ax = c.a[0], ay = c.a[1], bx = c.b[0], by = c.b[1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1); return Math.hypot(x - (ax + dx * t), y - (ay + dy * t)) - c.r; }
  function groupAt(p) {
    let best = null, bd = 1e9;
    for (let i = 1; i < 4; i++) {
      const c = BCARD(i); if (!inRect(p, c)) continue;
      const [ox, oy] = limbOrigin(i), lx = (p.x - ox) / BN_SC, ly = (p.y - oy) / BN_SC, tol = 9 / BN_SC;
      for (let g = 0; g < 4; g++) LIMBS[i].g[g].forEach((cp) => { const d = capDist(cp, lx, ly); if (d < bd && d <= tol) { bd = d; best = [i, g]; } });
    }
    return best;
  }
  function bonesDown(p) {
    const h = groupAt(p); if (!h) return false;
    const [i, g] = h, q = S.bn, br = q.brush;
    q.paint[i][g] = br; q.pop[i][g] = 0.3; SciSim.tween(q.pop[i], { [g]: 1 }, { duration: 0.4, ease: 'outBack' });
    const [ox, oy] = limbOrigin(i), cx = ox + LIMBS[i].cen[g][0] * BN_SC, cy = oy + LIMBS[i].cen[g][1] * BN_SC;
    if (br === g) {
      q.wrong[i][g] = false; q.link[i][g] = 0; SciSim.tween(q.link[i], { [g]: 1 }, { duration: 0.8, ease: 'inOutQuad' }); Sound.success();
      parts.burst(cx, cy, { count: 8, colors: [BCAT[g].c, '#fff'], speed: 90, size: 3, life: 0.55, gravity: 0 });
    } else {
      q.wrong[i][g] = true; q.link[i][g] = 0; q.shake[i][g] = 1; Sound.fail();
      showHint('사람의 팔에서 같은 위치의 뼈 색을 다시 확인해요. 어깨에서 손끝 쪽으로 위팔뼈 → 아래팔뼈 → 손목뼈 → 손가락뼈 순서예요.', 4200);
    }
    updateCtl(); return false;
  }
  function capPath(c) { ctx.beginPath(); ctx.moveTo(c.a[0], c.a[1]); ctx.lineTo(c.b[0], c.b[1]); }
  /* 앞다리 한 개 그리기. mode: 'paint'(칠한 대로) | 'true'(정답 색) */
  function drawLimb(i, ox, oy, sc, mode, t, small) {
    const lb = LIMBS[i], q = S.bn;
    ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
    ctx.fillStyle = lb.skin; ctx.strokeStyle = 'rgba(80,60,40,.35)'; ctx.lineWidth = 2 / sc * 0.8; ctx.beginPath(); lb.out.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (lb.id === 'bird') { ctx.strokeStyle = 'rgba(60,110,80,.5)'; ctx.lineWidth = 2; for (let k = 0; k < 5; k++) { const x = 230 + k * 18; ctx.beginPath(); ctx.moveTo(x, 62 + k * 2); ctx.lineTo(x + 24, 80 + k * 6); ctx.stroke(); } }
    ctx.lineCap = 'round';
    for (let g = 0; g < 4; g++) {
      const pc = mode === 'true' ? g : q.paint[i][g], pop = mode === 'true' ? 1 : q.pop[i][g], sh = mode === 'true' ? 0 : q.shake[i][g];
      const col = pc == null ? '#efe7d3' : BCAT[pc].c, edge = pc == null ? '#a89870' : C.shade(col, -0.4);
      ctx.save();
      if (sh > 0.01 && !RM) ctx.translate(Math.sin(sh * 24) * 3 * sh / sc, 0);
      if (pop !== 1) { const cx = lb.cen[g][0], cy = lb.cen[g][1], k = 0.9 + 0.1 * clamp(pop, 0, 1.3); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); }
      lb.g[g].forEach((cp) => { capPath(cp); ctx.strokeStyle = edge; ctx.lineWidth = cp.r * 2 + 2.6; ctx.stroke(); });
      lb.g[g].forEach((cp) => { capPath(cp); ctx.strokeStyle = col; ctx.lineWidth = cp.r * 2; ctx.stroke(); });
      lb.g[g].forEach((cp) => { capPath(cp); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = Math.max(1, cp.r * 0.6); ctx.translate(0, -cp.r * 0.3); ctx.stroke(); ctx.translate(0, cp.r * 0.3); });
      ctx.restore();
    }
    ctx.restore();
    // 번호표시와 오답 표시
    for (let g = 0; g < 4; g++) {
      const pc = mode === 'true' ? g : q.paint[i][g]; if (pc == null || small) continue;
      const bx = ox + lb.cen[g][0] * sc, by = oy + lb.cen[g][1] * sc;
      if (mode !== 'true' && q.wrong[i][g]) {
        ctx.save(); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); lb.g[g].forEach((cp) => { const x1 = ox + cp.a[0] * sc, y1 = oy + cp.a[1] * sc; ctx.beginPath(); ctx.arc((x1 + ox + cp.b[0] * sc) / 2, (y1 + oy + cp.b[1] * sc) / 2, cp.r * sc + 5, 0, TAU); ctx.stroke(); }); ctx.restore();
      }
      D.sphere(bx, by - (g === 3 ? 0 : 0), 9.5, mode !== 'true' && q.wrong[i][g] ? '#dc2626' : '#334155', { text: String(pc + 1), gloss: false });
    }
  }
  function drawBones(dt, t) {
    const q = S.bn;
    bgFill('#f3efe3', '#eef3ea');
    for (let i = 0; i < 4; i++) for (let g = 0; g < 4; g++) q.shake[i][g] = SciSim.approach(q.shake[i][g], 0, dt, 5);
    T(L(14, 8), L(30, 22), '🦴 앞다리 뼈를 같은 위치끼리 같은 색으로 칠해요', L(17, 15), '#5b4630', 'left', 800);
    for (let i = 0; i < 4; i++) {
      const c = BCARD(i); panel(c.x, c.y, c.w, c.h, 16, '#fffdf7');
      const lb = LIMBS[i];
      T(c.x + 14, c.y + L(26, 22), lb.n, L(17, 14.5), '#26324a', 'left', 800);
      T(c.x + c.w - 14, c.y + L(26, 22), lb.fn, L(14, 12.5), '#64748b', 'right', 800);
      const [ox, oy] = limbOrigin(i);
      drawLimb(i, ox, oy, BN_SC, 'paint', t);
      if (i === 0) D.label(c.x + c.w - 14, c.y + c.h - 18, '기준(예시)', { bg: '#475569', size: 12.5, align: 'right' });
      else if (S.bn.paint[i].every((v, g) => v === g)) D.label(c.x + c.w - 14, c.y + c.h - 18, '✅ 모두 맞아요', { bg: '#15803d', size: 12.5, align: 'right' });
    }
    // 연결선 (옳게 칠한 뼈와 사람 팔의 같은 위치 뼈)
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 1; i < 4; i++) for (let g = 0; g < 4; g++) {
      const pg = q.link[i][g]; if (pg <= 0.01 || q.paint[i][g] !== g) continue;
      const [ax, ay] = limbOrigin(0), [bx, by] = limbOrigin(i);
      const x1 = ax + LIMBS[0].cen[g][0] * BN_SC, y1 = ay + LIMBS[0].cen[g][1] * BN_SC, x2 = bx + LIMBS[i].cen[g][0] * BN_SC, y2 = by + LIMBS[i].cen[g][1] * BN_SC;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 24 - g * 6;
      ctx.strokeStyle = BCAT[g].c; ctx.globalAlpha = 0.5; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(x1, y1);
      const n = 24, up = Math.floor(n * clamp(pg, 0, 1));
      for (let k = 1; k <= up; k++) { const u = k / n, a = 1 - u; ctx.lineTo(a * a * x1 + 2 * a * u * mx + u * u * x2, a * a * y1 + 2 * a * u * my + u * u * y2); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    if (PHONE) {
      panel(6, 372, 468, 318, 16);
      T(20, 400, '📋 뼈 이름과 번호', 16, '#26324a', 'left', 800);
      BCAT.forEach((c, k) => { D.sphere(34, 436 + k * 34, 11, c.c, { text: String(k + 1), gloss: false }); T(56, 442 + k * 34, c.n + (k === 1 ? ' (뼈 2개)' : k === 2 ? ' (작은 뼈 여러 개)' : k === 3 ? ' (끝마디까지)' : ''), 15, '#334155', 'left', 800); });
      textBlock(20, 592, 440, '위쪽 팔 모양을 기준으로, 같은 위치의 뼈에 같은 색을 칠해요. 옳게 칠하면 사람 팔과 점선으로 이어져요.', 14, '#64748b', 20, 700);
      T(20, 668, '칠한 뼈 ' + bnPainted() + ' / 12 · 맞게 칠한 뼈 ' + bnRight() + ' / 12', 14.5, '#0f5132', 'left', 800);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 상동 · 상사 · 흔적 기관 ---------- */
  const CL_ROWS = [
    { q: '① 사람의 팔 – 박쥐의 날개', ans: 0, tip: '쓰임은 다르지만 뼈의 배열이 같은지 비교해요.', why: '기능은 달라도 뼈의 배열(기원)이 같아요. 공통 조상의 앞다리에서 갈라져 나온 상동 기관이에요.' },
    { q: '② 새의 날개 – 곤충의 날개', ans: 1, tip: '두 날개의 구조가 같은지, 기능만 같은지 따져 봐요.', why: '날기라는 기능만 같고, 뼈가 있는 앞다리와 뼈 없는 날개맥으로 기원과 구조가 달라요. 상사 기관이에요.' },
    { q: '③ 사람의 팔 – 고래의 지느러미', ans: 0, tip: '쓰임은 달라도 뼈의 배열(기원)이 같은지 비교해요.', why: '쓰임은 달라도 같은 뼈 배열이에요. 상동 기관이에요.' },
    { q: '④ 사람의 꼬리뼈', ans: 2, tip: '지금은 거의 쓰이지 않고 조상의 꼬리 흔적이 남은 구조예요.', why: '조상에게는 꼬리가 있었다는 흔적이에요. 쓰임이 거의 없이 퇴화한 흔적 기관이에요.' },
    { q: '⑤ 고래의 뒷다리뼈', ans: 2, tip: '몸속에 작게 남은 구조예요. 뒷다리가 있던 조상을 떠올려 봐요.', why: '뒷다리가 있던 조상의 흔적이 몸속에 작게 남은 흔적 기관이에요.' },
  ];
  const CL_OPT = ['상동 기관', '상사 기관', '흔적 기관'];
  const CCARD = (i) => L({ x: 14 + (i % 3) * 258, y: 46 + Math.floor(i / 3) * 254, w: 256, h: 246 }, { x: 6 + (i % 2) * 237, y: 34 + Math.floor(i / 2) * 218, w: 231, h: 212 });
  function resetClass() { S.cl = { pick: CL_ROWS.map(() => null), flag: CL_ROWS.map(() => 0), ok: false }; }
  const clRight = () => S.cl.pick.filter((v, i) => v === CL_ROWS[i].ans).length;
  const clDone = () => S.cl.pick.filter((v) => v != null).length;
  function insectWing(ox, oy, sc) {
    ctx.save(); ctx.translate(ox, oy); ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(190,225,240,.6)'; ctx.strokeStyle = '#6b9fb5'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, 86); ctx.bezierCurveTo(60, 20, 200, 12, 312, 50); ctx.bezierCurveTo(250, 110, 120, 128, 8, 86); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#4f7f95'; ctx.lineWidth = 2.4;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(10, 86); ctx.bezierCurveTo(70, 70 - k * 4 + 20, 190, 40 + k * 10 - 20, 300 - k * 12, 54 + k * 9); ctx.stroke(); }
    ctx.restore();
  }
  function drawTail(x, y, w, h) {
    const cx = x + w * 0.45;
    for (let k = 0; k < 6; k++) { const yy = y + 12 + k * 20, ww = 56 - k * 3; ctx.fillStyle = '#efe7d3'; ctx.strokeStyle = '#a89870'; ctx.lineWidth = 2; D.roundRect(cx - ww / 2, yy, ww, 16, 6); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#a855f7'; ctx.strokeStyle = '#6b21a8';
    [[0, 0.8], [1, 0.62], [2, 0.44]].forEach(([k, s]) => { const yy = y + 12 + 6 * 20 + k * 11, ww = 30 * s + 8; D.roundRect(cx - ww / 2, yy, ww, 10, 5); ctx.fill(); ctx.stroke(); });
    D.arrow(x + w - 36, y + 160, cx + 32, y + 146, { color: '#a855f7', width: 3, head: 11 });
    T(x + w - 14, y + 172, '꼬리뼈', 14.5, '#7e22ce', 'right', 800);
    T(x + 14, y + 38, '척추뼈', 13.5, '#64748b', 'left', 800);
  }
  function drawWhaleVest(x, y, w, h) {
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(0, 30, 0, 110); g.addColorStop(0, '#9ec1de'); g.addColorStop(1, '#5d8fb8');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(w * 0.46, 76, w * 0.36, 40, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * 0.78, 74); ctx.lineTo(w * 0.94, 48); ctx.lineTo(w * 0.9, 76); ctx.lineTo(w * 0.94, 104); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(w * 0.4, 62, w * 0.26, 10, 0, 0, TAU); ctx.fill();
    // 앞쪽 몸속의 작은 뒷다리뼈
    ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(w * 0.6, 88); ctx.lineTo(w * 0.68, 98); ctx.stroke();
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(w * 0.6, 88); ctx.lineTo(w * 0.55, 98); ctx.stroke();
    ctx.restore();
    D.arrow(x + w * 0.4, y + 172, x + w * 0.6, y + 106, { color: '#a855f7', width: 3, head: 11 });
    T(x + 6, y + 190, '뒷다리뼈(퇴화)', 14.5, '#7e22ce', 'left', 800);
  }
  function drawClass(dt, t) {
    const q = S.cl;
    bgFill('#eef3f8', '#f2eef7');
    T(L(14, 8), L(30, 22), '🔎 두 구조를 비교해 알맞은 이름을 골라요', L(17, 15), '#334155', 'left', 800);
    const cs = L(0.6, 0.46);
    for (let i = 0; i < 6; i++) {
      const c = CCARD(i); panel(c.x, c.y, c.w, c.h, 16, '#fffefc');
      if (i < 5) {
        const pk = q.pick[i], fl = q.flag[i];
        if (pk != null) { ctx.save(); ctx.strokeStyle = fl === 1 ? '#16a34a' : fl === 2 ? '#dc2626' : '#7c3aed'; ctx.lineWidth = 3.5; D.roundRect(c.x + 1.5, c.y + 1.5, c.w - 3, c.h - 3, 15); ctx.stroke(); ctx.restore(); }
        T(c.x + 12, c.y + 22, CL_ROWS[i].q, L(14.5, 12.5), '#26324a', 'left', 800);
        if (pk != null) D.label(c.x + c.w - 10, c.y + c.h - 16, CL_OPT[pk], { bg: fl === 1 ? '#15803d' : fl === 2 ? '#dc2626' : '#7c3aed', size: 12.5, align: 'right' });
      }
      const lx = c.x + (c.w - 320 * cs) / 2, h1 = 170 * cs;
      const nm = (s, y) => T(lx + 2, y, s, L(13, 12), '#475569', 'left', 800);
      if (i === 0) { drawLimb(0, lx, c.y + 34, cs, 'true', t, true); nm('사람 팔', c.y + 46); drawLimb(2, lx, c.y + 34 + h1 + 10, cs, 'true', t, true); nm('박쥐 날개', c.y + 56 + h1); }
      else if (i === 1) { drawLimb(3, lx, c.y + 34, cs, 'true', t, true); nm('새 날개 (뼈 있음)', c.y + 46); insectWing(lx, c.y + 34 + h1 + 10, cs); nm('곤충 날개 (뼈 없음)', c.y + 56 + h1); }
      else if (i === 2) { drawLimb(0, lx, c.y + 34, cs, 'true', t, true); nm('사람 팔', c.y + 46); drawLimb(1, lx, c.y + 34 + h1 + 10, cs, 'true', t, true); nm('고래 지느러미', c.y + 56 + h1); }
      else if (i === 3) drawTail(c.x + 10, c.y + 38, c.w - 20, c.h - 50);
      else if (i === 4) drawWhaleVest(c.x + 12, c.y + 40, c.w - 24, c.h - 50);
      else {
        T(c.x + 12, c.y + 24, '📖 세 가지 구분', L(15, 13.5), '#26324a', 'left', 800);
        const items = [['상동 기관', '#2563eb', '기원이 같아요. 모양과 기능은 달라도 돼요.'], ['상사 기관', '#d97706', '기능만 같고 기원과 구조가 달라요.'], ['흔적 기관', '#7e22ce', '조상에게는 쓰였다가 퇴화해 흔적만 남았어요.']];
        items.forEach(([n, col, tx], k) => { const yy = c.y + L(46, 40) + k * L(62, 54); D.label(c.x + 12, yy + 10, n, { bg: col, size: L(13, 12), align: 'left' }); textBlock(c.x + 14, yy + 34, c.w - 26, tx, L(13, 12), '#475569', L(17, 15), 700); });
      }
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ③ 분자 증거: 사이토크롬 c (사람과 다른 아미노산 수, 104개 중)
     ========================================================= */
  const SP = [
    { id: 'chimp', n: '침팬지', d: 0, c: '#16a34a' }, { id: 'monkey', n: '붉은털원숭이', d: 1, c: '#16a34a' }, { id: 'dog', n: '개', d: 10, c: '#0ea5e9' },
    { id: 'hen', n: '닭', d: 13, c: '#f59e0b' }, { id: 'turtle', n: '거북', d: 15, c: '#f59e0b' }, { id: 'tuna', n: '참치', d: 21, c: '#3b82f6' }, { id: 'yeast', n: '효모', d: 44, c: '#a855f7' },
  ];
  const SP_ORDER0 = ['dog', 'yeast', 'chimp', 'hen', 'tuna', 'monkey', 'turtle'];
  const spById = (id) => SP.find((s) => s.id === id);
  const MG = L({ rowY: 108, rh: 46, lx: 14, bx: 150, bw: 350, unit: 350 / 46, tx: 548, tw: 236, maxD: 44 }, { rowY: 112, rh: 56, lx: 6, bx: 100, bw: 230, unit: 230 / 46, tx: 346, tw: 126, maxD: 44 });
  const rowCY = (r) => MG.rowY + r * MG.rh;
  function resetMolec() {
    const rows = {}; SP_ORDER0.forEach((id, i) => { rows[id] = i + 1; });
    S.mol = { val: {}, lock: {}, row: rows, rowV: Object.assign({}, rows), sorted: false, treeP: 0, drag: null, miss: 0, pop: {} };
    SP.forEach((s) => { S.mol.val[s.id] = 0; S.mol.lock[s.id] = false; S.mol.pop[s.id] = 1; });
  }
  const molLocked = () => SP.filter((s) => S.mol.lock[s.id]).length;
  const ORDER_OK = SP.slice().sort((a, b) => a.d - b.d).map((s) => s.id);
  function molRowAt(p) {
    if (p.x < MG.bx - 14 || p.x > MG.bx + MG.bw + 18) return null;
    for (const s of SP) { if (S.mol.lock[s.id]) continue; const cy = MG.rowY + S.mol.rowV[s.id] * MG.rh; if (Math.abs(p.y - cy) <= MG.rh / 2 - 2) return s; }
    return null;
  }
  function molSet(s, p) { S.mol.val[s.id] = clamp(Math.round((p.x - MG.bx) / MG.unit), 0, 46); }
  function molDown(p) {
    const s = molRowAt(p); if (!s) return false;
    S.mol.drag = s.id; molSet(s, p); Sound.tick(); return true;
  }
  function molMove(p) { const s = S.mol.drag && spById(S.mol.drag); if (s) { molSet(s, p); } }
  function molUp(p) {
    const s = S.mol.drag && spById(S.mol.drag); S.mol.drag = null; if (!s) return;
    molSet(s, p);
    if (Math.abs(S.mol.val[s.id] - s.d) <= 1) {
      S.mol.lock[s.id] = true; SciSim.tween(S.mol.val, { [s.id]: s.d }, { duration: 0.35, ease: 'outBack' }); Sound.success();
      parts.burst(MG.bx + s.d * MG.unit, MG.rowY + S.mol.rowV[s.id] * MG.rh, { count: 10, colors: [s.c, '#fff'], speed: 90, size: 3, life: 0.6, gravity: 80 });
      showHint(s.n + ' 막대 완성: 사람과 ' + s.d + '개 달라요', 2200);
    } else {
      S.mol.miss++; Sound.fail(); const row = s.id; S.mol.pop[row] = 0.2;
      showHint('표의 값은 ' + s.d + '개예요. 막대 끝을 ' + s.d + ' 눈금(±1)에 맞춰 보세요.', 3200);
      setTimeout(() => { if (!S.mol.lock[row]) SciSim.tween(S.mol.val, { [row]: 0 }, { duration: 0.35 }); }, 700);
    }
    updateCtl();
  }
  function stepMolec(dt) {
    const q = S.mol; if (!q) return;
    SP.forEach((s) => { q.rowV[s.id] = SciSim.approach(q.rowV[s.id], q.row[s.id], dt, 7); if (Math.abs(q.rowV[s.id] - q.row[s.id]) < 0.002) q.rowV[s.id] = q.row[s.id]; });
    if (q.sorted && q.treeP < 1) q.treeP = Math.min(1, q.treeP + dt / 3.2);
  }
  function sortMolec() { // 사람과 가까운 순으로 줄 세우기
    const q = S.mol; ORDER_OK.forEach((id, i) => { q.row[id] = i + 1; }); q.sorted = true; q.treeP = 0;
  }
  function drawMolec(dt, t) {
    const q = S.mol;
    bgFill('#eef2fb', '#f3f0f9');
    T(MG.lx, L(30, 22), '🧪 사이토크롬 c: 사람과 다른 아미노산 수', L(17, 15), '#312e81', 'left', 800);
    T(MG.lx, L(52, 42), '(전체 104개 중, 교과서 값을 단순화한 자료)', L(13.5, 13), '#64748b', 'left', 700);
    // 눈금
    const ay = MG.rowY - MG.rh / 2 - 6;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.4;
    for (let v = 0; v <= 45; v += 5) { const x = MG.bx + v * MG.unit; ctx.beginPath(); ctx.moveTo(x, ay + 6); ctx.lineTo(x, MG.rowY + 8 * MG.rh - MG.rh / 2); ctx.stroke(); if (v % 10 === 0) T(x, ay + 2, String(v), 13, '#64748b', 'center', 800); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(MG.bx, ay + 6); ctx.lineTo(MG.bx, MG.rowY + 8 * MG.rh - MG.rh / 2); ctx.stroke();
    // 기준 행: 사람
    const hy = rowCY(0);
    T(MG.lx, hy + 5, '사람 (기준)', L(15, 13.5), '#26324a', 'left', 800); T(MG.bx - 10, hy + 5, '0', 14, '#64748b', 'right', 800);
    D.roundRect(MG.bx, hy - 11, 4, 22, 2); ctx.fillStyle = '#0f172a'; ctx.fill();
    // 막대
    SP.forEach((s) => {
      const ry = MG.rowY + q.rowV[s.id] * MG.rh, locked = q.lock[s.id], drag = q.drag === s.id;
      ctx.save(); ctx.fillStyle = 'rgba(99,102,241,.05)'; if (!locked) { D.roundRect(MG.bx, ry - MG.rh / 2 + 3, MG.bw, MG.rh - 6, 8); ctx.fill(); } ctx.restore();
      T(MG.lx, ry - 3, s.n, L(15, 13.5), '#26324a', 'left', 800);
      T(MG.lx, ry + 15, '차이 ' + s.d + '개', L(13.5, 12.5), '#6366f1', 'left', 800);
      const len = clamp(q.val[s.id], 0, 46) * MG.unit, bad = !locked && !drag && q.val[s.id] > 0.5 && Math.abs(q.val[s.id] - s.d) > 1;
      if (len > 0.5) {
        const g = ctx.createLinearGradient(MG.bx, 0, MG.bx + len, 0); g.addColorStop(0, C.shade(s.c, 0.25)); g.addColorStop(1, s.c);
        ctx.save(); ctx.globalAlpha = locked ? 1 : 0.8; ctx.fillStyle = bad ? '#f87171' : g; D.roundRect(MG.bx, ry - 11, Math.max(len, 8), 22, 6); ctx.fill(); ctx.restore();
        if (locked) T(MG.bx + len + 8, ry + 5, s.d + '', 15, '#1f2d44', 'left', 800);
        else T(MG.bx + len + 8, ry + 5, String(Math.round(q.val[s.id])), 14.5, bad ? '#dc2626' : '#64748b', 'left', 800);
      } else if (!locked) {
        T(MG.bx + 14, ry + 5, '← 눌러서 ' + s.d + ' 눈금까지 끌어요', L(13.5, 12.5), '#94a3b8', 'left', 700);
      }
      if (locked) D.check(MG.bx - 12 + 0, ry - 18, 7, 1, {});
    });
    // 가지 그림
    if (q.sorted) {
      const tp = q.treeP, X0 = MG.tx, X1 = MG.tx + MG.tw;
      panel(X0 - 14, hy - 36, MG.tw + 22, 8 * MG.rh + 26, 14, 'rgba(255,255,255,.75)');
      T(X0 - 4, hy - 16, '가지 그림 (예고)', L(14, 13), '#312e81', 'left', 800);
      const xb = (d) => X1 - 10 - (d / MG.maxD) * (MG.tw - 40);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // 사람 줄기
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(X0 + 4, hy); ctx.lineTo(X0 + 4 + (X1 - X0 - 4) * clamp(tp * 1.6, 0, 1), hy); ctx.stroke();
      const rev = ORDER_OK.slice().reverse();
      rev.forEach((id, k) => {
        const s = spById(id), p = clamp(tp * 3 - 0.6 - k * 0.3, 0, 1); if (p <= 0) return;
        const y = rowCY(q.rowV[id]), x = xb(s.d);
        ctx.strokeStyle = s.c; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x, hy + (y - hy) * clamp(p * 2, 0, 1)); ctx.stroke();
        if (p > 0.5) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (X1 - x) * (p - 0.5) * 2, y); ctx.stroke(); }
        D.sphere(x, hy, 4.5, s.c, { gloss: false });
      });
      ctx.restore();
      if (!PHONE) T(X1 + 2, hy - 16, '과거 ← → 현재', 12.5, '#64748b', 'right', 800);
    }
    const by0 = MG.rowY + 7.5 * MG.rh + 10, bh = VH - by0 - 10;
    if (bh > 50) {
      panel(MG.lx, by0, VW - MG.lx * 2, bh, 14);
      textBlock(MG.lx + 14, by0 + 26, VW - MG.lx * 2 - 28, q.sorted ? '사람과 차이가 작을수록 가지가 늦게 갈라져요. 차이 수가 클수록 사람과 공통 조상에서 갈라진 지 오래되었어요.' : molLocked() < 7 ? '표의 차이 수만큼 막대를 끌어 그려요. 막대를 다 그리면 사람과 가까운 순서로 줄을 세워 봐요. (' + molLocked() + ' / 7)' : '막대를 모두 그렸어요. 사람과 가까운 순서로 이름을 눌러 줄을 세워 봐요.', L(14.5, 14), '#334155', L(22, 21), 800);
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     ④ 다윈의 생각: 자연선택설 조립 + 기린 목 사례
     ========================================================= */
  const DC = [
    { id: 'a', g: 'obs', k: '과잉 생산', t: '자손을 살아남을 수 있는 수보다 훨씬 많이 낳아요' },
    { id: 'b', g: 'obs', k: '개체 간 변이', t: '같은 종 안에서도 개체마다 형질이 조금씩 달라요' },
    { id: 'c', g: 'obs', k: '형질 유전', t: '변이 가운데 일부는 자손에게 유전돼요' },
    { id: 'd', g: 'obs', k: '한정된 자원', t: '먹이와 서식 공간 같은 자원은 한정돼 있어요' },
    { id: 'e', g: 'inf1', k: '생존 경쟁', t: '모두 살아남을 수 없어서 개체들이 경쟁해요' },
    { id: 'f', g: 'inf2', k: '유리한 변이의 번식', t: '환경에 유리한 변이를 가진 개체가 더 많이 살아남아 번식해요' },
    { id: 'g', g: 'end', k: '여러 세대 누적', t: '이런 일이 여러 세대 쌓이면 집단의 형질이 달라져요' },
    { id: 'x', g: 'none', k: '획득 형질의 유전', t: '개체가 필요에 따라 얻은 형질이 자손에게 전해져요' },
  ];
  const DBAND = { obs: { bg: '#e0f2fe', bd: '#38bdf8', n: '관찰' }, inf1: { bg: '#fef3c7', bd: '#f59e0b', n: '추론 1' }, inf2: { bg: '#fde68a', bd: '#f59e0b', n: '추론 2' }, end: { bg: '#dcfce7', bd: '#22c55e', n: '결론' }, none: { bg: '#fff', bd: '#94a3b8', n: '' } };
  /* 칸: 관찰 4칸, 추론 2칸, 결론 1칸 */
  const DSLOT = [];
  (function () {
    if (!PHONE) {
      for (let i = 0; i < 4; i++) DSLOT.push({ g: 'obs', x: 14 + i * 196, y: 64, w: 186, h: 80 });
      DSLOT.push({ g: 'inf1', x: 14, y: 176, w: 380, h: 70 }, { g: 'inf2', x: 406, y: 176, w: 380, h: 70 }, { g: 'end', x: 14, y: 276, w: 772, h: 70 });
    } else {
      for (let i = 0; i < 4; i++) DSLOT.push({ g: 'obs', x: 6 + (i % 2) * 237, y: 54 + Math.floor(i / 2) * 68, w: 231, h: 62 });
      DSLOT.push({ g: 'inf1', x: 6, y: 198, w: 468, h: 58 }, { g: 'inf2', x: 6, y: 264, w: 468, h: 58 }, { g: 'end', x: 6, y: 330, w: 468, h: 58 });
    }
  })();
  const DHOME = (i) => L({ x: 14 + (i % 4) * 196, y: 384 + Math.floor(i / 4) * 90, w: 186, h: 80 }, { x: 6 + (i % 2) * 237, y: 422 + Math.floor(i / 2) * 68, w: 231, h: 62 });
  const DORDER = [7, 0, 5, 2, 4, 1, 6, 3]; // 섞인 배치 (카드 인덱스)
  function resetDarwin() {
    S.dw = { cards: DC.map((c, k) => { const slotPos = DORDER.indexOf(k), h = DHOME(slotPos); return { c, home: slotPos, slot: -1, x: h.x, y: h.y, w: h.w, h: h.h, shake: 0 }; }), sel: null, drag: null, off: [0, 0], moved: 0, solved: false, glow: 0 };
  }
  const dwPlaced = () => S.dw.cards.filter((c) => c.slot >= 0).length;
  const dwTarget = (c) => (c.slot >= 0 ? DSLOT[c.slot] : DHOME(c.home));
  function dwHint(card, slot) {
    if (card.c.g === 'none') return '이 카드는 라마르크의 용불용설이에요. 다윈의 자연선택설 조립에는 쓰지 않아요.';
    if (slot.g === 'obs') return '관찰 칸에는 직접 확인할 수 있는 사실이 들어가요. "추론"은 사실에서 이끌어 낸 생각이에요.';
    if (card.c.g === 'obs') return '관찰한 사실은 맨 위 관찰 칸에 두어요.';
    return '이 칸에 맞지 않아요. 관찰 → 추론 1(경쟁) → 추론 2(유리한 개체의 번식) → 결론(누적) 순서로 생각해요.';
  }
  function dwPlace(card, si) {
    const q = S.dw, slot = DSLOT[si];
    const accept = card.c.g === slot.g;
    if (!accept) { card.shake = 1; Sound.fail(); showHint(dwHint(card, slot), 4800); return false; }
    const old = q.cards.find((o) => o.slot === si && o !== card); if (old) old.slot = -1;
    card.slot = si; q.sel = null; Sound.success();
    const r = slot; parts.burst(r.x + r.w / 2, r.y + r.h / 2, { count: 10, colors: [DBAND[slot.g].bd, '#fff'], speed: 90, size: 3, life: 0.6, gravity: 60 });
    if (dwPlaced() === 7 && !q.solved) { q.solved = true; setTimeout(() => { parts.burst(VW / 2, DSLOT[6].y + 30, { count: 24, speed: 160, life: 0.9 }); Sound.level(); }, 250); }
    updateCtl(); return true;
  }
  function dwCardAt(p) {
    const cs = S.dw.cards;
    for (let i = cs.length - 1; i >= 0; i--) { const c = cs[i]; if (c.slot >= 0 && S.dw.solved) continue; if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h) return c; }
    return null;
  }
  function dwSlotAt(p) { for (let i = 0; i < DSLOT.length; i++) { const r = DSLOT[i]; if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i; } return -1; }
  function dwDown(p) {
    const q = S.dw, c = dwCardAt(p);
    if (!c) { if (q.sel) { const si = dwSlotAt(p); if (si >= 0) { dwPlace(q.sel, si); } } return false; }
    q.drag = c; q.off = [p.x - c.x, p.y - c.y]; q.moved = 0; q.dstart = [p.x, p.y]; q.cards.splice(q.cards.indexOf(c), 1); q.cards.push(c); Sound.tick(); return true;
  }
  function dwMove(p) { const q = S.dw; if (!q.drag) return; q.moved = Math.max(q.moved, Math.hypot(p.x - q.dstart[0], p.y - q.dstart[1])); q.drag.x = p.x - q.off[0]; q.drag.y = p.y - q.off[1]; }
  function dwUp(p) {
    const q = S.dw, c = q.drag; if (!c) return; q.drag = null;
    if (q.moved < 7) { q.sel = q.sel === c ? null : c; return; }
    const si = dwSlotAt(p);
    if (si >= 0) { const was = c.slot; if (!dwPlace(c, si)) c.slot = was; } else { c.slot = -1; updateCtl(); }
  }
  function stepDarwin(dt) {
    const q = S.dw; if (!q) return;
    q.cards.forEach((c) => {
      if (c === q.drag) return;
      const tg = dwTarget(c); c.x = SciSim.approach(c.x, tg.x, dt, 14); c.y = SciSim.approach(c.y, tg.y, dt, 14); c.w = SciSim.approach(c.w, tg.w, dt, 14); c.h = SciSim.approach(c.h, tg.h, dt, 14);
      c.shake = SciSim.approach(c.shake, 0, dt, 6);
    });
    q.glow = q.solved ? Math.min(1, q.glow + dt * 1.5) : 0;
  }
  function drawCard(c, q) {
    const band = c.slot >= 0 ? DBAND[c.c.g] : DBAND.none, sel = q.sel === c, drag = q.drag === c;
    const sx = c.shake > 0.02 && !RM ? Math.sin(c.shake * 30) * 4 * c.shake : 0;
    ctx.save(); ctx.translate(sx, drag ? -3 : 0);
    D.shadow(() => { D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.fillStyle = band.bg; ctx.fill(); }, { blur: drag ? 14 : 5, y: drag ? 7 : 2 });
    D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.lineWidth = sel ? 4 : 2.4; ctx.strokeStyle = sel ? '#7c3aed' : band.bd; ctx.stroke();
    const fs = L(14, 13), ts = L(12.5, 12);
    T(c.x + 10, c.y + 21, c.c.k, fs, c.c.g === 'none' ? '#991b1b' : '#1f2d44', 'left', 800);
    textBlock(c.x + 10, c.y + 21 + L(19, 17), c.w - 18, c.c.t, ts, '#475569', L(16, 15), 700);
    ctx.restore();
  }
  function drawDarwin(dt, t) {
    const q = S.dw;
    bgFill('#f3f1ea', '#eaf3ee');
    T(L(14, 8), L(30, 22), '🧠 관찰한 사실에서 추론으로, 자연선택설 만들기', L(17, 15), '#5b4630', 'left', 800);
    // 칸
    DSLOT.forEach((s, i) => {
      const b = DBAND[s.g], filled = q.cards.some((c) => c.slot === i);
      ctx.save(); D.roundRect(s.x, s.y, s.w, s.h, 12); ctx.fillStyle = filled ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.55)'; ctx.fill(); ctx.setLineDash([7, 5]); ctx.lineWidth = 2; ctx.strokeStyle = b.bd; ctx.stroke(); ctx.restore();
      if (!filled) T(s.x + s.w / 2, s.y + s.h / 2 + 5, (s.g === 'obs' ? '관찰' : b.n) + ' 카드 놓기', L(14, 13), b.bd, 'center', 800);
    });
    const bandName = (x, y, s, col) => T(x, y, s, L(13.5, 12.5), col, 'left', 800);
    if (!PHONE) { bandName(14, 56, '① 관찰한 사실 (4가지)', '#0369a1'); bandName(14, 168, '② 관찰에서 이끌어 낸 추론', '#b45309'); bandName(14, 268, '③ 결론', '#15803d'); T(VW - 14, 30, '🚢 비글호 항해 → 🕊️ 인위 선택 → 📖 맬서스 인구론', 13.5, '#64748b', 'right', 800); }
    else { bandName(8, 48, '① 관찰한 사실 (4가지)', '#0369a1'); bandName(8, 192, '② 추론', '#b45309'); bandName(8, 324, '③ 결론', '#15803d'); }
    // 화살표 (아래로)
    const ar = (x, y1, y2) => D.arrow(x, y1, x, y2, { color: '#94a3b8', width: 3, head: 10 });
    if (!PHONE) { ar(400, 146, 166); ar(400, 248, 266); }
    T(L(14, 8), L(374, 414), '카드 보관함 (끌어서 칸에 놓거나, 카드와 칸을 차례로 눌러요)', L(13.5, 12.5), '#64748b', 'left', 800);
    // 선택된 카드가 놓일 수 있는 칸 표시
    if (q.sel || q.drag) { const cc = q.drag || q.sel; DSLOT.forEach((s, i) => { if (s.g === cc.c.g && !q.cards.some((c) => c.slot === i)) D.ring(s.x + s.w / 2, s.y + s.h / 2, Math.min(s.h / 2 + 2, 40), t, { color: DBAND[s.g].bd }); }); }
    q.cards.forEach((c) => { if (c !== q.drag) drawCard(c, q); });
    if (q.drag) drawCard(q.drag, q);
    if (q.solved) {
      const x = L(14, 6), y = L(384, 422), w = VW - x * 2, h = L(166, 260), al = smooth(q.glow);
      ctx.save(); ctx.globalAlpha = al;
      panel(x, y, w, h, 16, '#f0fdf4');
      T(x + 16, y + 30, '✅ 자연선택설 완성', L(18, 16), '#15803d', 'left', 800);
      textBlock(x + 16, y + 60, w - 32, '생물은 살아남을 수 있는 수보다 많은 자손을 낳고(과잉 생산), 개체마다 형질이 달라요(변이). 변이 가운데 일부는 유전돼요. 자원은 한정되어 생존 경쟁이 일어나고, 환경에 유리한 변이를 가진 개체가 더 많이 살아남아 번식해요. 이 과정이 여러 세대 쌓이면 집단의 형질이 달라져 진화가 일어나요.', L(14.5, 14), '#334155', L(23, 22), 700);
      ctx.restore();
    }
    parts.update(dt); parts.draw(ctx);
  }

  /* ---------- 기린 목: 용불용설 vs 자연선택설 ---------- */
  const GR_ROWS = [
    { q: '높은 가지의 잎을 먹으려고 목을 늘이다 보니 목이 길어졌고, 그 목이 자손에게 전해졌다.', ans: 0 },
    { q: '목 길이에 변이가 있었고, 목이 긴 개체가 높은 잎을 먹어 더 많이 살아남아 번식했다.', ans: 1 },
    { q: '자주 쓰는 기관은 발달하고 쓰지 않는 기관은 퇴화하며, 그 변화가 자손에게 유전된다.', ans: 0 },
    { q: '유전되는 변이 중 환경에 유리한 형질을 가진 개체의 비율이 세대마다 늘었다.', ans: 1 },
  ];
  const GR_OPT = ['용불용설 (라마르크)', '자연선택설 (다윈)'];
  function resetGiraffe() { S.gf = { pick: GR_ROWS.map(() => null), flag: GR_ROWS.map(() => 0), seen: false }; }
  const grRight = () => S.gf.pick.filter((v, i) => v === GR_ROWS[i].ans).length;
  function giraffe(x, gy, s, neck, col, alpha, bendDown) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(s, s); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.lineCap = 'round';
    ctx.strokeStyle = C.shade(col, -0.15); ctx.lineWidth = 6;
    [[-16, 0], [-8, 4], [12, 4], [20, 0]].forEach(([lx, off]) => { ctx.beginPath(); ctx.moveTo(lx, -28); ctx.lineTo(lx + off * 0.2, 0); ctx.stroke(); });
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(2, -38, 28, 15, 0, 0, TAU); ctx.fill();
    const nx = 22, ny = -46, ex = nx + 6 + neck * 0.12 + (bendDown ? 14 : 0), ey = ny - neck * (bendDown ? 0.7 : 1);
    ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(ex + 7, ey - 2, 9, 5.5, -0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex + 1, ey - 6); ctx.lineTo(ex - 1, ey - 12); ctx.stroke();
    ctx.fillStyle = 'rgba(120,70,20,.55)'; [[-12, -42, 4], [2, -34, 3.5], [10, -44, 3.5], [-2, -46, 3]].forEach(([px, py, r]) => { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); });
    ctx.restore();
  }
  function drawGiraffe(dt, t) {
    bgFill('#e8f3f9', '#f2f1e0');
    const cyc = (S.clock % 12) / 12, c1 = L({ x: 14, y: 46, w: 384, h: 500 }, { x: 6, y: 34, w: 468, h: 316 }), c2 = L({ x: 402, y: 46, w: 384, h: 500 }, { x: 6, y: 360, w: 468, h: 330 });
    T(L(14, 8), L(30, 22), '🦒 같은 기린 목, 두 가지 설명', L(17, 15), '#334155', 'left', 800);
    [c1, c2].forEach((c) => { panel(c.x, c.y, c.w, c.h, 18, '#fffefa'); ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 18); ctx.clip(); const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); g.addColorStop(0, '#dff1fb'); g.addColorStop(0.72, '#f1f8ee'); g.addColorStop(0.72, '#b9d9a4'); g.addColorStop(1, '#a6cc90'); ctx.fillStyle = g; ctx.fillRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4); ctx.restore(); });
    const sc = L(2.0, 1.3), gyA = c1.y + c1.h * 0.72, gyB = c2.y + c2.h * 0.72;
    // 나무 (높은 잎)
    const tree = (x, gy, h) => { ctx.fillStyle = '#7a5a36'; ctx.fillRect(x - 4, gy - h, 8, h); ctx.fillStyle = '#3f9d5b'; ctx.beginPath(); ctx.ellipse(x, gy - h, 34, 16, 0, 0, TAU); ctx.fill(); };
    // ---- 왼쪽: 용불용설
    T(c1.x + 14, c1.y + 26, '용불용설 (라마르크)', L(17, 15), '#b45309', 'left', 800);
    T(c1.x + 14, c1.y + 48, '쓰면 발달하고, 얻은 형질이 유전된다고 주장했어요', L(13.5, 12.5), '#64748b', 'left', 700);
    const th = L(210, 140), tx1 = c1.x + c1.w - 60;
    tree(tx1, gyA, th);
    let k1 = clamp(cyc * 2.2, 0, 1), neckA = lerp(46, 84, smooth(k1)); // 일생 동안 목을 늘임
    const babyP = smooth(clamp((cyc - 0.5) * 3, 0, 1));
    giraffe(c1.x + 110, gyA, sc, neckA, '#e0a63c', 1, false);
    D.label(c1.x + 110, gyA + 26, '어른: 목을 늘임', { bg: '#b45309', size: 12.5 });
    if (babyP > 0.01) {
      giraffe(c1.x + 270, gyA, sc * 0.72, 46, '#e0a63c', babyP, false);
      D.label(c1.x + 270, gyA + 26, '새끼: 목이 짧음', { bg: '#475569', size: 12.5 });
      T(c1.x + c1.w / 2, c1.y + c1.h * 0.34, '획득 형질은 유전되지 않아요', L(15, 13.5), '#dc2626', 'center', 800, { alpha: babyP });
      D.arrow(c1.x + 175, gyA - 60 * sc * 0.6, c1.x + 240, gyA - 44 * sc * 0.55, { color: 'rgba(220,38,38,.8)', width: 3, head: 10, dash: [5, 4], alpha: babyP });
    }
    // ---- 오른쪽: 자연선택설
    T(c2.x + 14, c2.y + 26, '자연선택설 (다윈)', L(17, 15), '#15803d', 'left', 800);
    T(c2.x + 14, c2.y + 48, '유전되는 변이 중 유리한 형질이 선택돼요', L(13.5, 12.5), '#64748b', 'left', 700);
    tree(c2.x + c2.w - 50, gyB, th);
    const necks = [36, 48, 60, 74, 86], gen = Math.floor(S.clock / 6) % 2, k2 = ((S.clock % 6) / 6);
    const survive = necks.map((n) => n >= 60);
    const gx0 = c2.x + L(46, 46), gstep = (c2.w - 130) / 4;
    necks.forEach((n, i) => {
      const x = gx0 + i * gstep; let a = 1, ncur = n;
      if (gen === 0) { if (!survive[i]) a = 1 - smooth(clamp((k2 - 0.45) * 3, 0, 1)) * 0.85; }
      else { ncur = n; a = survive[i] ? 1 : 0.0; }
      const s2 = L(1.2, 0.92);
      if (gen === 0 && a > 0.05) giraffe(x, gyB, s2, ncur, survive[i] ? '#e0a63c' : '#c9b79a', a, false);
      if (gen === 1) { // 다음 세대: 긴 목 비율이 늘어요
        const nn = [60, 74, 86, 74, 86][i];
        giraffe(x, gyB, s2 * smooth(clamp(k2 * 3, 0, 1)), nn, '#e0a63c', 1, false); 
      }
    });
    D.label(c2.x + c2.w / 2, c2.y + c2.h * 0.42, gen === 0 ? (k2 < 0.45 ? '1세대: 목 길이가 제각각이에요 (변이)' : '높은 잎을 못 먹은 개체가 줄어요') : '다음 세대: 목이 긴 개체의 비율이 늘었어요', { bg: '#15803d', size: L(14, 12.5) });
    // 새로 추가: 라벨
    T(c2.x + c2.w / 2, gyB + 28, gen === 0 ? '세대 1' : '세대 2', L(14, 13), '#475569', 'center', 800);
    parts.update(dt); parts.draw(ctx);
  }

  /* =========================================================
     화면 전환 · 조작 연결 · 읽음 칸
     ========================================================= */
  const TRAITS = [{ id: 'toe', n: '앞발 발가락 수', ok: true }, { id: 'height', n: '키(몸의 크기)', ok: true }, { id: 'teeth', n: '이빨의 높이', ok: true }, { id: 'legs', n: '다리의 수', ok: false, why: '다리는 모든 시기에 4개로 같아요.' }, { id: 'eyes', n: '눈의 수', ok: false, why: '눈은 모든 시기에 2개로 같아요.' }, { id: 'tail', n: '꼬리의 유무', ok: false, why: '꼬리는 모든 시기에 있어요.' }];
  const curId = () => { const m = game && game.current(); return m ? m.id : ''; };
  function setMode(mode) {
    if (S.mode !== mode) { S.fade = 1; parts.clear(); hideHint(); }
    S.mode = mode; $('#tbLabel').textContent = MODE_LABEL[mode]; updateCtl();
  }
  function updateCtl() {
    $$('#ctrlCard [data-modes]').forEach((n) => { n.hidden = n.getAttribute('data-modes').split(' ').indexOf(S.mode) < 0; });
    const curLv = game ? game.level + 1 : 1, showAll = !!(game && game.free), id = curId();
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.classList.toggle('lv-off', !showAll && +b.dataset.lv !== curLv && b.dataset.mode !== S.mode); });
    $('#traitWrap').hidden = !(S.mode === 'horse' && (id === 'traits' || showAll));
    $('#sortWrap').hidden = !(S.mode === 'molec' && (molLocked() >= 7 || showAll));
    if (S.horse) {
      $('#sTime').style.setProperty('--pct', (S.horse.t / 3) + '%'); $('#oTime').textContent = timeTxt(S.horse.t);
      $('#bPlay').textContent = S.horse.auto ? '⏸ 멈춤' : S.horse.t >= 299 ? '↺ 다시 재생' : '▶ 처음부터 재생';
      $$('#traitGrid button').forEach((b) => b.classList.toggle('on', !!S.horse.pick[b.dataset.t]));
    }
    if (S.bn) $$('#brushSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.b === S.bn.brush));
    if (S.cl) $$('#clRows select').forEach((s, i) => { s.value = S.cl.pick[i] == null ? '' : String(S.cl.pick[i]); s.classList.toggle('ok', S.cl.flag[i] === 1); s.classList.toggle('bad', S.cl.flag[i] === 2); });
    if (S.gf) $$('#grRows select').forEach((s, i) => { s.value = S.gf.pick[i] == null ? '' : String(S.gf.pick[i]); s.classList.toggle('ok', S.gf.flag[i] === 1); s.classList.toggle('bad', S.gf.flag[i] === 2); });
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode); }));
  $('#sTime').addEventListener('input', (e) => { S.horse.auto = false; if (S.horse.tw) S.horse.tw.cancel(); S.horse.t = +e.target.value; Sound.tick(); updateCtl(); });
  $('#bPlay').addEventListener('click', () => {
    Sound.click(); const q = S.horse;
    if (q.tw) q.tw.cancel();
    if (q.auto) { q.auto = false; } else { if (q.t >= 299) q.t = 0; q.auto = true; }
    updateCtl();
  });
  TRAITS.forEach((tr) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.t = tr.id; b.textContent = tr.n; b.addEventListener('click', () => { Sound.click(); S.horse.pick[tr.id] = !S.horse.pick[tr.id]; updateCtl(); }); $('#traitGrid').appendChild(b); });
  BCAT.forEach((c, k) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.b = k; b.innerHTML = '<i style="background:' + c.c + '"></i>' + (k + 1) + ' ' + c.n; b.addEventListener('click', () => { Sound.click(); S.bn.brush = k; updateCtl(); }); $('#brushSeg').appendChild(b); });
  function buildSel(box, rows, opts, onPick) {
    rows.forEach((r, i) => {
      const row = document.createElement('div'); row.className = 'sel-row'; row.innerHTML = '<div class="q">' + r.q + '</div>';
      const sel = document.createElement('select'); sel.className = 'sel-in'; sel.setAttribute('aria-label', r.q);
      sel.innerHTML = '<option value="">고르기</option>' + opts.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('');
      sel.addEventListener('change', () => { onPick(i, sel.value === '' ? null : +sel.value); Sound.click(); updateCtl(); });
      row.appendChild(sel); box.appendChild(row);
    });
  }
  buildSel($('#clRows'), CL_ROWS, CL_OPT, (i, v) => { S.cl.pick[i] = v; S.cl.flag[i] = 0; });
  buildSel($('#grRows'), GR_ROWS, GR_OPT, (i, v) => { S.gf.pick[i] = v; S.gf.flag[i] = 0; });
  $('#bDwReset').addEventListener('click', () => { Sound.click(); resetDarwin(); updateCtl(); });
  const sortPicker = makePicker($('#sortBox'), ['dog', 'yeast', 'chimp', 'hen', 'tuna', 'monkey', 'turtle'].map((id) => ({ id, html: spById(id).n })), () => { sortPicker && sortPicker.mark(''); });

  SciSim.pointer(view, {
    down(p) {
      if (S.mode === 'horse') { if (inRect(p, { x: HTL.x, y: HTL.y, w: HTL.w, h: HTL.h })) { S.horse.auto = false; if (S.horse.tw) S.horse.tw.cancel(); tlSet(p); return true; } return false; }
      if (S.mode === 'bones') return bonesDown(p);
      if (S.mode === 'molec') return molDown(p);
      if (S.mode === 'darwin') return dwDown(p);
      return false;
    },
    move(p) { if (S.mode === 'horse') tlSet(p); else if (S.mode === 'molec') molMove(p); else if (S.mode === 'darwin') dwMove(p); },
    up(p) {
      if (S.mode === 'horse') { const k = (S.horse.t) / 100, n = Math.round(k); if (Math.abs(k - n) * 100 < 9) S.horse.tw = SciSim.tween(S.horse, { t: n * 100 }, { duration: 0.25 }); updateCtl(); }
      else if (S.mode === 'molec') molUp(p); else if (S.mode === 'darwin') dwUp(p);
    },
    hover(p) {
      if (S.mode === 'bones') return groupAt(p) ? 'pointer' : 'default';
      if (S.mode === 'molec') return molRowAt(p) ? 'ew-resize' : 'default';
      if (S.mode === 'darwin') return dwCardAt(p) ? 'grab' : 'default';
      if (S.mode === 'horse') return inRect(p, HTL) ? 'pointer' : 'default';
      return 'default';
    },
  });
  function tlSet(p) { const f = clamp((p.x - tlX(0)) / (tlX(3) - tlX(0)), 0, 1); S.horse.t = f * 300; updateCtl(); }

  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c; const m = S.mode;
    if (m === 'horse') { const q = S.horse; L1 = '화석의 시대'; a = timeTxt(q.t); L2 = '키'; b = heightTxt(q.t); L3 = '앞발 발가락'; c = toeCount(q.t) + '개'; }
    else if (m === 'bones') { L1 = '칠한 뼈'; a = bnPainted() + ' / 12'; L2 = '맞게 칠한 뼈'; b = bnRight() + ' / 12'; L3 = '고른 브러시'; c = (S.bn.brush + 1) + ' ' + BCAT[S.bn.brush].n; }
    else if (m === 'class') { L1 = '이름을 붙인 사례'; a = clDone() + ' / 5'; L2 = '맞게 붙인 사례'; b = clRight() + ' / 5'; L3 = '구분 기준'; c = '기원 · 기능'; }
    else if (m === 'molec') { L1 = '그린 막대'; a = molLocked() + ' / 7'; L2 = '사람과 가장 가까운 종'; b = '침팬지 (0개)'; L3 = '가장 먼 종'; c = '효모 (44개)'; }
    else if (m === 'darwin') { L1 = '놓은 카드'; a = dwPlaced() + ' / 7'; L2 = '관찰 칸'; b = S.dw.cards.filter((x) => x.slot >= 0 && x.c.g === 'obs').length + ' / 4'; L3 = '쓰지 않는 카드'; c = '1장'; }
    else { L1 = '판정한 설명'; a = S.gf.pick.filter((v) => v != null).length + ' / 4'; L2 = '맞게 판정'; b = grRight() + ' / 4'; L3 = '비교 대상'; c = '용불용설 · 자연선택설'; }
    const key = [L1, a, L2, b, L3, c].join('|'); if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }
  function autoFill() {
    const q = S.bn; q.paint = LIMBS.map(() => [0, 1, 2, 3]); q.link = LIMBS.map(() => [1, 1, 1, 1]); q.wrong = LIMBS.map(() => [false, false, false, false]);
    S.cl.pick = CL_ROWS.map((r) => r.ans); S.cl.flag = CL_ROWS.map(() => 1);
    SP.forEach((s) => { S.mol.val[s.id] = s.d; S.mol.lock[s.id] = true; }); if (!S.mol.sorted) sortMolec(); S.mol.treeP = 1;
    if (!S.dw.solved) { S.dw.cards.forEach((c) => { if (c.c.g === 'none') return; const si = DSLOT.findIndex((s, i) => s.g === c.c.g && !S.dw.cards.some((o) => o.slot === i)); if (si >= 0) c.slot = si; }); S.dw.solved = true; }
    S.gf.pick = GR_ROWS.map((r) => r.ans); S.gf.flag = GR_ROWS.map(() => 1);
    updateCtl();
  }

  /* =========================================================
     미션
     ========================================================= */
  const levels = [
    {
      title: '진화란: 화석에 남은 변화', short: '진화란', icon: '🐎', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 생물이 공통 조상에서 변해 왔다는 사실을 무엇으로 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>통합과학에서</b> 변이와 자연선택, 지질 시대와 화석을 배웠어요. 이번 차시는 그 내용을 되풀이하지 않고, <b>진화의 증거</b>를 종류별로 읽는 법과 <b>다윈의 생각</b>을 알아봐요.</div>' +
        '<p>먼저 지층에서 나온 <b>말의 화석 계열</b>을 시대 순서로 보면서, 진화에서 무엇이 어떻게 변하는지 관찰해요.</p>',
      features: ['horse'],
      setup() { resetHorse(); setMode('horse'); },
      recap: '진화는 한 개체가 아니라 집단의 형질이 여러 세대에 걸쳐 변하는 것이에요. 말은 발가락 수가 줄고 키가 커졌으며 이빨이 높아졌어요.',
      summary: '<ul><li><b>진화</b>: 집단의 형질(유전적 구성)이 여러 세대에 걸쳐 변하는 것. 한 개체가 평생 동안 바뀌는 것이 아니에요.</li><li><b>화석 증거</b>: 말은 에오히푸스(앞발 발가락 4개, 키 약 0.4 m)에서 현재의 말(발가락 1개, 키 약 1.5 m)까지 발가락이 줄고 키가 커졌으며, 이빨의 관이 높아져 풀을 먹기에 알맞게 변했어요.</li><li>시조새는 새와 파충류의 특징을 함께 가진 화석 증거예요.</li></ul>',
      missions: [
        {
          id: 'play', title: '화석 계열 전체 보기',
          goal: '<b>화석의 시대</b> 슬라이더를 움직여 네 시기의 말 화석을 모두 만나 보세요. (▶ 재생을 눌러도 좋아요)',
          hint: '▶ 재생 버튼은 5500만 년 전부터 현재까지 자동으로 움직여요. 아래 시간 줄의 동그라미를 눌러도 그 시기로 이동해요.',
          setup() { setMode('horse'); },
          check: () => S.horse.seen.every(Boolean), hold: 0.5,
          status: () => HS.map((h, i) => mark(S.horse.seen[i]) + ' ' + h.n.replace('(현재의 말)', '')).join(' &nbsp; '),
          explain: '말은 약 5500만 년 전의 작은 에오히푸스에서 현재의 말까지 <b>앞발 발가락이 줄고</b>, <b>키가 커지고</b>, <b>이빨이 높아지며</b> 서서히 변했어요. 화석은 이렇게 시대별 변화를 직접 보여 주는 증거예요.',
        },
        {
          id: 'traits', title: '변한 형질 3가지 기록',
          goal: '말 화석에서 시대에 따라 <b>달라진 형질 3가지</b>만 골라 ✔ 확인하기를 누르세요.',
          hint: '슬라이더를 움직이며 앞발 뼈, 몸의 크기, 이빨 단면을 살펴봐요. 다리 수나 눈의 수는 달라졌나요?',
          manual: true, setup() { setMode('horse'); updateCtl(); },
          check: () => {
            const pk = TRAITS.filter((t) => S.horse.pick[t.id]);
            const bad = pk.find((t) => !t.ok); if (bad) return '"' + bad.n + '"' + josa(bad.n, '은', '는') + ' 달라지지 않았어요. ' + bad.why;
            if (pk.length < 3) return '변한 형질이 ' + (3 - pk.length) + '개 더 있어요. 앞발 뼈, 키, 이빨을 다시 비교해요.';
            return true;
          },
          explain: '말 화석에서 달라진 것은 <b>앞발 발가락 수(4 → 3 → 1)</b>, <b>키(약 0.4 m → 약 1.5 m)</b>, <b>이빨의 높이</b>예요. 다리의 수 같은 형질은 그대로예요.',
        },
        {
          type: 'quiz', title: '진화의 단위', setup() { setMode('horse'); },
          goal: '다음 중 <b>진화</b>를 가장 알맞게 설명한 것은?',
          choices: ['한 마리의 말이 평생 동안 발가락을 줄여 가는 것', '집단의 형질이 여러 세대에 걸쳐 변해 가는 것', '환경이 바뀌면 생물이 곧바로 필요한 모습으로 바뀌는 것', '생물이 정해진 방향을 따라 점점 더 고등해지는 것'],
          answer: 1,
          feedback: ['개체는 평생 같은 형질을 가져요. 형질이 달라지는 것은 개체가 아니라 집단이에요.', '', '변이는 환경이 만들어 주는 것이 아니에요. 이미 있던 변이가 선택되며 집단이 서서히 달라져요.', '진화에는 정해진 방향이나 목적이 없어요. 환경에 따라 달라질 뿐이에요.'],
          explain: '진화의 단위는 <b>집단</b>이에요. 개체의 형질은 평생 그대로이고, 세대가 거듭되면서 집단 안에서 형질을 가진 개체의 비율이 달라져요.',
        },
      ],
    },
    {
      title: '비교 해부: 상동 기관과 상사 기관', short: '비교 해부', icon: '🦴', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화석으로 형질이 시대에 따라 변하는 것을 보았어요. 이번에는 <b>현재 살고 있는 생물의 몸 구조</b>를 비교해 공통 조상의 증거를 찾아요.</div>' +
        '<p>사람 · 고래 · 박쥐 · 새의 <b>앞다리 뼈</b>를 같은 위치끼리 같은 색으로 칠해 보고, 구조와 기원에 따라 상동 기관 · 상사 기관 · 흔적 기관을 구분해요.</p>',
      features: ['bones', 'class'],
      setup() { resetBones(); resetClass(); setMode('bones'); },
      recap: '기능이 달라도 뼈 배열이 같은 상동 기관은 공통 조상의 증거예요. 기능만 같은 상사 기관은 공통 조상의 증거가 아니에요.',
      summary: '<ul><li><b>상동 기관</b>: 기원이 같아 구조가 비슷한 기관. 사람 팔 · 고래 지느러미 · 박쥐 날개는 쓰임이 달라도 뼈 배열이 같아요 → 공통 조상의 증거.</li><li><b>상사 기관</b>: 기능만 같고 기원과 구조가 다른 기관. 곤충 날개와 새 날개 → 공통 조상의 증거가 아니에요.</li><li><b>흔적 기관</b>: 조상에게는 쓰였지만 퇴화해 흔적만 남은 기관. 사람의 꼬리뼈, 고래의 뒷다리뼈.</li></ul>',
      missions: [
        {
          id: 'paint', title: '앞다리 뼈 대응 맞추기',
          goal: '사람 팔을 기준으로 <b>고래 · 박쥐 · 새</b>의 뼈를 같은 위치끼리 같은 색으로 칠하세요. (12곳)',
          hint: '브러시를 고른 뒤 뼈를 눌러요. 어깨 쪽부터 위팔뼈 1개, 아래팔뼈 2개, 작은 손목뼈들, 손가락뼈 순서예요.',
          manual: true, setup() { setMode('bones'); },
          check: () => { const n = bnPainted(), r = bnRight(); if (n < 12) return '아직 칠하지 않은 뼈가 ' + (12 - n) + '곳 있어요.'; if (r < 12) return '색이 다른 뼈가 ' + (12 - r) + '곳 있어요. 빨간 점선 표시를 다시 칠해요.'; return true; },
          explain: '네 동물의 앞다리는 쓰임이 달라도 <b>위팔뼈 → 아래팔뼈 → 손목뼈 → 손가락뼈</b>의 같은 배열이에요. 뼈의 길이와 모양만 환경에 따라 달라졌어요.',
        },
        {
          id: 'homol', title: '상동 · 상사 · 흔적 기관 분류',
          goal: '다섯 가지 사례에 <b>상동 기관 · 상사 기관 · 흔적 기관</b> 중 알맞은 이름을 붙이세요.',
          hint: '기원(뼈 배열)이 같은지, 기능만 같은지, 퇴화해 흔적만 남았는지 차례로 물어요.',
          manual: true, setup() { setMode('class'); },
          check: () => {
            const q = S.cl; let first = null;
            CL_ROWS.forEach((r, i) => { if (q.pick[i] == null) q.flag[i] = 0; else q.flag[i] = q.pick[i] === r.ans ? 1 : 2; });
            for (let i = 0; i < CL_ROWS.length; i++) { if (q.pick[i] == null) return CL_ROWS[i].q.slice(0, 1) + '번 사례의 이름을 골라 주세요.'; if (q.pick[i] !== CL_ROWS[i].ans && first == null) first = i; }
            if (first != null) return CL_ROWS[first].q + ' 사례는 다시 생각해 봐요. ' + CL_ROWS[first].tip;
            return true;
          },
          explain: CL_ROWS.map((r) => '<b>' + r.q + '</b>: ' + r.why).join('<br>'),
        },
        {
          type: 'quiz', title: '기능이 달라도 상동인 까닭', setup() { setMode('bones'); },
          goal: '사람의 팔, 고래의 지느러미, 박쥐의 날개는 하는 일이 다른데도 뼈의 배열이 같아요. 가장 알맞은 설명은?',
          choices: ['세 동물이 같은 일을 하려고 똑같이 변했기 때문이다', '공통 조상의 앞다리에서 갈라져 나온 뒤 환경에 따라 쓰임이 달라졌기 때문이다', '고래와 박쥐가 사람에서 곧바로 진화했기 때문이다', '우연히 뼈의 모양이 비슷해졌기 때문이다'],
          answer: 1,
          feedback: ['쓰임이 다른데도 구조가 같아요. 같은 일을 하려고 비슷해진 것은 상사 기관의 경우예요.', '', '현재 살고 있는 생물끼리는 서로의 조상이 아니에요. 공통 조상에서 각자 갈라졌어요.', '뼈의 위치와 개수까지 같아서 우연으로 보기 어려워요.'],
          explain: '상동 기관은 <b>공통 조상의 앞다리</b>에서 비롯된 구조가 서식 환경에 따라 쓰임이 달라진 것이에요.',
        },
      ],
    },
    {
      title: '분자 증거: 사이토크롬 c', short: '분자 증거', icon: '🧪', phase: '분석',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 몸의 구조를 비교해 공통 조상의 증거를 찾았어요. 이번에는 구조 대신 <b>분자(단백질의 아미노산 서열)</b>를 비교해요.</div>' +
        '<p>세포 호흡에 쓰이는 단백질 <b>사이토크롬 c</b>는 여러 생물에 있어요. 사람과 다른 아미노산의 수를 막대그래프로 그리면 어떤 생물이 사람과 가까운지 알 수 있어요.</p>',
      features: ['molec'],
      setup() { resetMolec(); sortPicker.reset(); setMode('molec'); },
      recap: '같은 단백질의 아미노산 서열이 비슷할수록 공통 조상에서 갈라진 지 얼마 되지 않은, 유연관계가 가까운 생물이에요.',
      summary: '<ul><li><b>분자 증거</b>: 여러 생물이 가진 같은 단백질의 아미노산 서열을 비교해요. 사이토크롬 c(104개)에서 사람과 다른 아미노산 수는 침팬지 0, 붉은털원숭이 1, 개 10, 닭 13, 거북 15, 참치 21, 효모 44개예요(단순화한 값).</li><li>차이가 클수록 공통 조상에서 갈라진 지 오래되었어요. 차이 수는 갈라진 위치를 가진 가지 그림으로 나타낼 수 있어요(계통수는 다른 차시에서 자세히 배워요).</li></ul>',
      missions: [
        {
          id: 'bars', title: '막대그래프 완성',
          goal: '표의 <b>차이 수</b>만큼 막대 끝을 끌어서 7종의 막대를 모두 그리세요.',
          hint: '행을 누른 채 오른쪽으로 끌면 막대가 늘어나요. 이름 아래 "차이 N개"의 N 눈금에서 손을 떼요. ±1 눈금 안이면 맞아요.',
          setup() { setMode('molec'); },
          check: () => molLocked() === 7, hold: 0.5,
          status: () => '완성한 막대 ' + molLocked() + ' / 7',
          explain: '사람과의 차이는 침팬지 0개 < 붉은털원숭이 1개 < 개 10개 < 닭 13개 < 거북 15개 < 참치 21개 < 효모 44개예요. 사람과 가까운 척추동물일수록 서열이 비슷해요.',
        },
        {
          id: 'sort', title: '사람과 가까운 순서로 정렬',
          goal: '<b>사람과 차이가 적은 종부터</b> 이름을 차례로 눌러요. 맞으면 막대가 줄을 서고 가지 그림이 그려져요.',
          hint: '차이가 0인 침팬지가 가장 가까워요. 막대가 짧은 종부터 눌러요.',
          manual: true, setup() { setMode('molec'); updateCtl(); },
          check: () => { const sq = sortPicker.seq; if (sq.length < 7) { return '7종을 모두 골라 주세요. (' + sq.length + ' / 7)'; } for (let i = 0; i < 7; i++) if (sq[i] !== ORDER_OK[i]) { sortPicker.mark('bad'); return (i + 1) + '번째 종을 다시 생각해 봐요. 앞에 둔 종일수록 사람과 차이가 적어요.'; } sortPicker.mark('ok'); return true; },
          explain: '사람과 가까운 순서는 <b>침팬지 → 붉은털원숭이 → 개 → 닭 → 거북 → 참치 → 효모</b>예요. 차이가 클수록 가지가 왼쪽(먼 과거)에서 갈라져요. 이 그림이 나중에 배울 <b>계통수</b>의 시작이에요.',
        },
        {
          type: 'quiz', title: '아미노산 차이가 0인 침팬지', setup() { setMode('molec'); },
          goal: '사이토크롬 c의 아미노산 서열이 사람과 <b>차이가 없는</b> 침팬지가 의미하는 것은?',
          choices: ['침팬지와 사람은 같은 종이다', '두 종이 공통 조상에서 갈라진 지 얼마 되지 않아 유연관계가 매우 가깝다', '침팬지는 사람의 직접적인 조상이다', '사람은 침팬지에서 진화했다'],
          answer: 1,
          feedback: ['한 단백질의 서열이 같을 뿐이에요. 종은 서열 하나로 정해지지 않고, 침팬지와 사람은 다른 종이에요.', '', '현재의 생물끼리는 서로의 조상이 아니에요. 공통 조상에서 갈라져 각자 진화했어요.', '현재의 생물끼리는 서로의 조상이 아니에요. 공통 조상에서 갈라져 각자 진화했어요.'],
          explain: '서열 차이가 0이면 <b>갈라진 지 오래되지 않았다</b>는 뜻이지, 한 종이거나 서로가 서로의 조상이라는 뜻이 아니에요.',
        },
      ],
    },
    {
      title: '다윈의 생각 조사하기', short: '다윈의 생각', icon: '🧠', phase: '탐구',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 화석, 비교 해부, 분자 자료로 생물이 공통 조상에서 변해 왔다는 증거를 모았어요. 다윈은 그 변화를 어떻게 <b>설명</b>했을까요?</div>' +
        '<p>다윈은 <b>비글호 항해</b>에서 갈라파고스의 생물을 관찰하고, 육종가의 <b>인위 선택</b>과 맬서스의 <b>인구론</b>(번식은 많고 자원은 한정)에서 힌트를 얻었어요. 이 생각을 카드로 조립하고 라마르크의 <b>용불용설</b>과 비교해 봐요.</p>',
      features: ['darwin', 'giraffe'],
      setup() { resetDarwin(); resetGiraffe(); setMode('darwin'); },
      recap: '자연선택설은 과잉 생산 · 변이 · 유전 · 한정된 자원이라는 관찰에서 생존 경쟁과 유리한 변이의 번식을 추론하고, 이것이 여러 세대 쌓여 진화한다고 설명해요.',
      summary: '<ul><li><b>다윈의 생각 흐름</b>: 비글호 항해(갈라파고스) → 육종가의 인위 선택 → 맬서스의 인구론 → 자연선택설.</li><li><b>관찰</b>: 과잉 생산, 개체 간 변이, 형질의 유전, 한정된 자원. <b>추론</b>: 생존 경쟁 → 환경에 유리한 변이를 가진 개체가 더 많이 번식 → 여러 세대 누적 → 진화.</li><li><b>용불용설</b>(라마르크): 쓰면 발달하고 얻은 형질이 유전된다고 주장했지만 획득 형질이 유전된다는 증거는 없어요. 자연선택은 <b>이미 있던 변이</b> 가운데 유리한 것이 선택되는 것이고, 진화에는 목적이나 정해진 방향이 없어요.</li></ul>',
      missions: [
        {
          id: 'assemble', title: '자연선택설 조립',
          goal: '다윈의 생각을 카드로 조립해요. <b>관찰 4장 → 추론 2장 → 결론 1장</b>을 알맞은 칸에 놓으세요. 카드 한 장은 쓰지 않아요.',
          hint: '관찰: 과잉 생산 · 변이 · 유전 · 한정된 자원. 추론 1은 경쟁, 추론 2는 유리한 개체의 번식, 결론은 여러 세대의 누적이에요.',
          manual: true, setup() { setMode('darwin'); },
          check: () => { const n = dwPlaced(); if (n < 7) return '아직 비어 있는 칸이 ' + (7 - n) + '개 있어요.'; return true; },
          explain: '관찰한 <b>사실</b>(과잉 생산, 변이, 유전, 한정된 자원)에서 <b>생존 경쟁</b>과 <b>유리한 변이를 가진 개체의 더 많은 번식</b>을 추론하고, 이것이 <b>여러 세대</b> 쌓이면 집단의 형질이 달라져요.',
        },
        {
          id: 'giraffe', title: '용불용설과 자연선택설 구분',
          goal: '기린 목에 대한 네 가지 설명이 <b>용불용설</b>인지 <b>자연선택설</b>인지 판정하세요.',
          hint: '"노력해서 얻은 형질이 유전된다"면 용불용설, "이미 있던 변이 중 유리한 것이 선택된다"면 자연선택설이에요.',
          manual: true, setup() { setMode('giraffe'); },
          check: () => {
            const q = S.gf; let first = null;
            GR_ROWS.forEach((r, i) => { if (q.pick[i] == null) q.flag[i] = 0; else q.flag[i] = q.pick[i] === r.ans ? 1 : 2; });
            for (let i = 0; i < GR_ROWS.length; i++) { if (q.pick[i] == null) return (i + 1) + '번 설명을 판정해 주세요.'; if (q.pick[i] !== GR_ROWS[i].ans && first == null) first = i; }
            if (first != null) return (first + 1) + '번 설명을 다시 읽어 봐요. ' + (GR_ROWS[first].ans === 0 ? '이 설명은 노력으로 얻은 형질이 유전된다는 내용이에요.' : '이 설명은 이미 있던 변이가 선택된다는 내용이에요.');
            return true;
          },
          explain: '1번과 3번은 <b>획득 형질의 유전</b>을 가정하는 <b>용불용설</b>이에요. 2번과 4번은 <b>유전되는 변이</b>가 선택되어 집단의 비율이 달라진다는 <b>자연선택설</b>이에요.',
        },
        {
          type: 'quiz', title: '획득 형질의 유전', setup() { setMode('giraffe'); },
          goal: '"개체가 살면서 필요에 따라 얻은 형질이 자손에게 유전되어 진화한다"는 주장에 대한 설명으로 옳은 것은?',
          choices: ['다윈이 주장한 자연선택설의 핵심 내용이다', '라마르크의 용불용설이며, 획득한 형질이 유전된다는 증거는 없다', '오늘날 가장 잘 입증된 진화의 원리이다', '노력하면 자손에게 전해질 유전자가 바뀐다는 뜻이다'],
          answer: 1,
          feedback: ['자연선택설은 유전되는 변이가 이미 집단에 있다가 선택된다고 설명해요.', '', '획득 형질이 유전된다는 증거는 없어요. 입증된 것은 유전되는 변이의 자연선택이에요.', '운동이나 노력으로 얻은 형질은 생식세포의 유전자를 바꾸지 못해요.'],
          explain: '살면서 얻은 형질(근육, 늘어난 목 등)은 <b>유전되지 않아요</b>. 자손에게 전해지는 것은 유전자에 있는 변이예요.',
        },
        {
          type: 'quiz', title: '진화는 목적이 있는 변화일까?', setup() { setMode('giraffe'); },
          goal: '자연선택에 의한 진화를 바르게 설명한 것은?',
          choices: ['생물이 더 나은 모습이 되려는 목적을 가지고 스스로 변하는 것이다', '환경에 유리한 변이를 가진 개체가 더 많이 번식한 결과이며 정해진 목적이나 방향이 없다', '환경이 바뀌면 필요한 변이가 곧바로 생겨 모든 개체가 변하는 것이다', '항상 몸집이 커지고 구조가 복잡해지는 방향으로 일어난다'],
          answer: 1,
          feedback: ['생물에게는 진화하려는 의도가 없어요. 변이는 무작위로 생기고 환경이 그 가운데 유리한 것을 선택해요.', '', '환경이 변이를 만들어 내는 것이 아니라, 이미 있던 변이를 선택해요.', '단순해지거나 작아지는 진화도 많아요. 정해진 방향은 없어요.'],
          explain: '진화는 <b>목적 없는 변화</b>예요. 변이는 무작위로 생기고, 그중 그때의 환경에 유리한 것이 더 많이 남을 뿐이에요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hb-evolution-evidence', mount: '#game', badge: '진화 탐정', homeHref: '../../index.html#hb',
    featureLabels: { horse: '🐎 말 화석 타임라인', bones: '🦴 앞다리 뼈 색칠', class: '🔎 상동 · 상사 · 흔적 분류', molec: '🧪 사이토크롬 c 막대그래프', darwin: '🧠 자연선택설 카드 조립', giraffe: '🦒 기린 목 사례 비교' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  resetHorse(); resetBones(); resetClass(); resetMolec(); resetDarwin(); resetGiraffe();
  setMode('horse');
  let lastFree = false, lastMode = '', lastMission = '';
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (S.mode !== lastMode) { lastMode = S.mode; updateCtl(); }
    const cmid = curId(); if (cmid !== lastMission) { lastMission = cmid; updateCtl(); }
    const hq = S.horse;
    if (hq.auto) { hq.t = Math.min(300, hq.t + dt * 36); if (hq.t >= 300) { hq.auto = false; updateCtl(); } }
    for (let i = 0; i < 4; i++) if (Math.abs(hq.t - i * 100) <= 6 && !hq.seen[i]) { hq.seen[i] = true; Sound.tick(); }
    const sl = $('#sTime'); if (+sl.value !== Math.round(hq.t)) { sl.value = Math.round(hq.t); updateCtl(); }
    view.apply();
    stepMolec(dt); stepDarwin(dt);
    switch (S.mode) {
      case 'horse': drawHorseMode(dt, t); break;
      case 'bones': drawBones(dt, t); break;
      case 'class': drawClass(dt, t); break;
      case 'molec': drawMolec(dt, t); break;
      case 'darwin': drawDarwin(dt, t); break;
      default: drawGiraffe(dt, t);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,245,238,' + S.fade * 0.85 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 9); }
    const cm = game && game.current();
    if (game && game.phase === 'success' && cm) {
      if (cm.id === 'sort' && !S.mol.sorted) { sortMolec(); updateCtl(); }
    }
    if (game && game.free && !S.filled) { S.filled = true; autoFill(); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, PHONE, get game() { return game; }, setMode, levels, HS, SP, MG, LIMBS, BN_SC, BCARD, limbOrigin, groupAt, DSLOT, DHOME, DC, sortPicker, ORDER_OK, CL_ROWS, GR_ROWS, HTL, tlX, molRowAt, autoFill, toeCount, heightAt, rowCY,
  };
})();
