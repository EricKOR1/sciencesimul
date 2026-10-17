/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 스펙트럼과 원소 (단원 1차시)
   성취기준 [10통과1-02-01] 천체에서 방출되는 빛의 스펙트럼을 분석하여 우주 초기에 형성된 원소와
   천체의 구성 물질을 추론할 수 있다.
   ① 관찰: 분광기 (연속 스펙트럼 · 슬릿/초점)
   ② 실험: 방전관 선스펙트럼 (눈금 읽기 · 기록표)
   ③ 탐구: 지문 맞추기 (이름 없는 방전관 · 기준 선 겹치기)
   ④ 분석: 흡수선 (차가운 기체 · 태양 스펙트럼)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 896 : 560;
  const RM = SciSim.reduceMotion;
  const NM0 = 400, NM1 = 700;
  const mark = (b) => (b ? '✅' : '⬜');
  const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
  const gs = (l, c, s) => Math.exp(-0.5 * ((l - c) / s) * ((l - c) / s));

  /* ---------- 배치 ---------- */
  const L = PHONE ? {
    cx: 300, srcY: 48, cellY: 114, slitY: 154, gratY: 202,
    scr: { cx: 300, w: 210, y: 268, h: 14 },
    strip: { x: 24, y: 340, w: 552, h: 52 },
    banner: { x: 24, y: 458, w: 552, h: 118 },
    panel: { x: 24, y: 588, w: 552, h: 296 },
  } : {
    cx: 268, srcY: 48, cellY: 114, slitY: 154, gratY: 202,
    scr: { cx: 268, w: 200, y: 262, h: 14 },
    strip: { x: 40, y: 336, w: 720, h: 54 },
    banner: { x: 40, y: 454, w: 720, h: 92 },
    panel: { x: 548, y: 14, w: 240, h: 308 },
  };
  const xOf = (nm) => L.strip.x + (nm - NM0) / (NM1 - NM0) * L.strip.w;
  const nmOf = (x) => NM0 + (x - L.strip.x) / L.strip.w * (NM1 - NM0);
  const scrX = (nm) => L.scr.cx - L.scr.w / 2 + (nm - NM0) / (NM1 - NM0) * L.scr.w;

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

  /* ---------- 자료 ---------- */
  const EL = {
    H: { name: '수소', col: '#e879f9', glow: '#e879f9' },
    He: { name: '헬륨', col: '#38bdf8', glow: '#fde68a' },
    Ne: { name: '네온', col: '#fb923c', glow: '#fb7a24' },
    Na: { name: '나트륨', col: '#facc15', glow: '#facc15' },
    Ca: { name: '칼슘', col: '#fb7185', glow: '#fb7185' },
  };
  const LINES = {
    H: [{ nm: 656, a: 1 }, { nm: 486, a: 0.78 }, { nm: 434, a: 0.58 }, { nm: 410, a: 0.48 }],
    He: [{ nm: 668, a: 0.55 }, { nm: 588, a: 1 }, { nm: 502, a: 0.8 }, { nm: 447, a: 0.62 }],
    Ne: [{ nm: 585, a: 0.8 }, { nm: 594, a: 0.55 }, { nm: 603, a: 0.5 }, { nm: 609, a: 0.6 }, { nm: 614, a: 0.95 }, { nm: 621, a: 0.6 }, { nm: 627, a: 0.7 }, { nm: 633, a: 0.62 }, { nm: 640, a: 0.9 }],
    Na: [{ nm: 589, a: 1 }],
    Ca: [{ nm: 423, a: 1 }],
  };
  const NEED = { H: 4, He: 3, Ne: 3, Na: 1 };      // '기록 완료'로 보는 선의 개수
  const TRUTH = { A: 'He', B: 'H', C: 'Na' };

  const SPEC = {};
  function mk(key, o) { o.key = key; o.lines = (o.lines || []).slice().sort((a, b) => a.nm - b.nm); o.dark = (o.dark || []).slice().sort((a, b) => a.nm - b.nm); SPEC[key] = o; return o; }
  mk('incand', {
    name: '백열등', icon: '🔆', kind: '연속 스펙트럼', tint: '#ffd9a0', srcW: 28,
    cont: (l) => 0.2 + 0.8 * Math.pow((l - NM0) / 300, 1.1),
    desc: '뜨거운 필라멘트가 내는 빛이에요. 보라에서 빨강까지 색이 끊김 없이 이어진 연속 스펙트럼이고, 붉은 쪽이 더 밝아요.',
  });
  mk('sun', {
    name: '햇빛', icon: '☀️', kind: '연속 스펙트럼', tint: '#fff3c4', srcW: 36,
    cont: (l) => 0.9 + 0.08 * gs(l, 500, 120),
    desc: '프리즘으로 본 무지개와 같아요. 보라에서 빨강까지 모든 색이 끊김 없이 이어져 있어요.',
  });
  mk('fluor', {
    name: '형광등', icon: '💡', kind: '띠 + 밝은 선', tint: '#e8f4ff', srcW: 70,
    cont: (l) => 0.05 + 0.32 * gs(l, 450, 17) + 0.3 * gs(l, 545, 9) + 0.3 * gs(l, 611, 7) + 0.1 * gs(l, 500, 40),
    lines: [{ nm: 405, a: 0.7 }, { nm: 436, a: 0.95 }, { nm: 546, a: 1 }, { nm: 578, a: 0.7 }],
    desc: '관 속 수은 기체가 내는 밝은 선과 형광 물질이 내는 색 띠가 섞여 있어요. 연속 스펙트럼이 아니에요.',
  });
  mk('led', {
    name: 'LED', icon: '🔦', kind: '넓은 봉우리 2개', tint: '#dbeafe', srcW: 24,
    cont: (l) => 0.95 * gs(l, 452, 10) + 0.82 * gs(l, 562, 55),
    desc: '파란 LED 빛과 이 빛을 받은 형광 물질의 노란 빛이 합쳐져 흰빛으로 보여요. 봉우리가 두 개이고 보라·빨강 끝은 거의 비어 있어요.',
  });
  ['H', 'He', 'Ne', 'Na'].forEach((e) => mk('tube' + e, { name: EL[e].name + ' 방전관', kind: '선스펙트럼', tint: EL[e].glow, lines: LINES[e], el: e, srcW: 18 }));
  mk('unkA', { name: '방전관 A', kind: '선스펙트럼', tint: '#dbeafe', lines: LINES.He, srcW: 18 });
  mk('unkB', { name: '방전관 B', kind: '선스펙트럼', tint: '#dbeafe', lines: LINES.H, srcW: 18 });
  mk('unkC', { name: '방전관 C', kind: '선스펙트럼', tint: '#dbeafe', lines: LINES.Na, srcW: 18 });
  mk('unkM', { name: '혼합관', kind: '선스펙트럼', tint: '#dbeafe', lines: LINES.H.concat(LINES.He), srcW: 18 });
  const SUNDARK = [
    { nm: 656, d: 0.85, el: 'H' }, { nm: 486, d: 0.72, el: 'H' }, { nm: 434, d: 0.6, el: 'H' }, { nm: 410, d: 0.55, el: 'H' },
    { nm: 589, d: 0.82, el: 'Na' }, { nm: 423, d: 0.66, el: 'Ca' },
    { nm: 438, d: 0.34 }, { nm: 466, d: 0.22 }, { nm: 495, d: 0.3 }, { nm: 517, d: 0.55 }, { nm: 527, d: 0.5 }, { nm: 541, d: 0.2 }, { nm: 616, d: 0.2 }, { nm: 687, d: 0.42 },
  ];
  mk('lab', {
    name: '백열등 + 수소 기체 관', kind: '흡수 스펙트럼', tint: '#ffd9a0', srcW: 28,
    cont: SPEC.incand.cont, dark: LINES.H.map((o) => ({ nm: o.nm, d: [0.88, 0.76, 0.66, 0.6][LINES.H.indexOf(o)], el: 'H' })), dgain: () => S.cell.v * S.cell.v,
  });
  mk('sunabs', {
    name: '태양', kind: '흡수 스펙트럼', tint: '#fff3c4', srcW: 40,
    cont: (l) => 0.9 + 0.08 * gs(l, 500, 120), dark: SUNDARK, dgain: () => 1,
  });

  const SRC_IDS = ['incand', 'sun', 'fluor', 'led'];
  const ANS_OPT = ['?', 'H', 'He', 'Ne', 'Na'];

  /* ---------- 상태 ---------- */
  const S = {
    mode: 'sources', sub: 'lab', t: 0, rev: 0, lastKey: '',
    src: 'incand', tube: 'H', unk: 'A', cur: 550,
    slitT: 2.4, focusT: 0.6, slit: 2.4, focus: 0.6,
    seen: new Set(), seenT: 0,
    rec: { H: new Set(), He: new Set(), Ne: new Set(), Na: new Set() }, flags: [],
    ov: { H: false, He: false, Ne: false, Na: false },
    ans: { A: 0, B: 0, C: 0 }, ansBad: { A: false, B: false, C: false }, ansOK: 0,
    cell: { target: 0, v: 0 }, cmp: false, sunOv: { H: false, Na: false, Ca: false }, sunSeen: new Set(),
    labDone: false, sunDone: false, mixOK: false,
    fade: 0, drag: false, snapped: null, atoms: [],
  };
  let game = null;
  const has = (n) => !!(game && game.has(n));

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#0b1226' });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const parts = new SciSim.Particles();
  const FS = PHONE ? 1.25 : 1;
  { const f0 = D.font; D.font = (n, w) => f0(Math.round(n * FS * 10) / 10, w); }
  const font = (n, w) => D.font(n, w || 700);
  const rr = (x, y, w, h, r) => { D.roundRect(x, y, w, h, r); return ctx; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function wrap(text, maxW, size, weight) {
    ctx.font = font(size, weight || 600);
    const out = []; let line = '';
    text.split(' ').forEach((w) => {
      const tr = line ? line + ' ' + w : w;
      if (ctx.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr;
    });
    if (line) out.push(line);
    return out;
  }
  function paragraph(text, x, y, maxW, size, color, lh, weight) {
    const ls = wrap(text, maxW, size, weight);
    ls.forEach((s, i) => D.text(x, y + i * (lh || size * 1.45), s, { size, color, align: 'left', weight: weight || 600 }));
    return ls.length * (lh || size * 1.45);
  }
  function panel(r, title) {
    ctx.fillStyle = 'rgba(255,255,255,.065)'; rr(r.x, r.y, r.w, r.h, 14).fill();
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1.2; rr(r.x, r.y, r.w, r.h, 14).stroke();
    if (title) D.text(r.x + 14, r.y + 24, title, { size: 15, color: '#e6ecff', align: 'left', weight: 800 });
  }

  /* ---------- 스펙트럼 계산 ---------- */
  function curKey() {
    if (S.mode === 'sources') return S.src;
    if (S.mode === 'tubes') return 'tube' + S.tube;
    if (S.mode === 'unknown') return 'unk' + S.unk;
    return S.sub === 'sun' ? 'sunabs' : 'lab';
  }
  const curSpec = () => SPEC[curKey()];
  const sigma = () => Math.sqrt(1.7 + (1.7 * S.slit) * (1.7 * S.slit) + (9 * S.focus) * (9 * S.focus));
  const sharpPct = () => Math.round(100 * clamp((6.5 - sigma()) / 5, 0, 1));
  const bright = () => 0.72 + 0.28 * Math.pow(clamp(S.slit / 3, 0, 1), 0.6);
  function gains(spec) {
    const sig = sigma(), r = S.rev;
    return {
      sig, pk: Math.min(1, 1.55 / sig), gc: smooth(r / 0.5), br: bright(),
      gl: spec.lines.map((_, k) => smooth((r - 0.3 - k * 0.11) / 0.35)),
      gd: spec.dark.length ? (spec.dgain ? spec.dgain() : 1) * smooth((r - 0.2) / 0.6) : 0,
    };
  }
  function evalI(spec, l, G) {
    let v = spec.cont ? spec.cont(l) * G.gc : 0;
    for (let k = 0; k < spec.lines.length; k++) {
      const o = spec.lines[k];
      if (G.gl[k] > 0.001) v += (0.6 + 0.4 * o.a) * G.pk * G.gl[k] * gs(l, o.nm, G.sig);
    }
    if (G.gd > 0.001) {
      let f = 1;
      for (let k = 0; k < spec.dark.length; k++) { const o = spec.dark[k]; f *= 1 - o.d * G.pk * G.gd * gs(l, o.nm, G.sig); }
      v *= f;
    }
    return Math.min(1, v * G.br);
  }
  function drawBar(x, y, w, h, spec, G, step, alpha) {
    ctx.fillStyle = '#04060d'; ctx.fillRect(x, y, w, h);
    const n = Math.max(1, Math.floor(w / step));
    for (let i = 0; i < n; i++) {
      const l = NM0 + (NM1 - NM0) * (i + 0.5) / n;
      const I = evalI(spec, l, G);
      if (I < 0.012) continue;
      const c = wl(l), k = Math.pow(I, 0.8) * (alpha == null ? 1 : alpha), wh = k > 0.8 && spec.lines.length ? (k - 0.8) * 1.4 : 0;
      ctx.fillStyle = 'rgb(' + Math.round(c[0] * k + (255 - c[0] * k) * wh) + ',' + Math.round(c[1] * k + (255 - c[1] * k) * wh) + ',' + Math.round(c[2] * k + (255 - c[2] * k) * wh) + ')';
      ctx.fillRect(x + i * step, y, step + 0.6, h);
    }
  }

  /* ---------- 광자 (빛알) ---------- */
  const PH = [];
  let spawnAcc = 0;
  function pickLambda(spec) {
    const dark = spec.dark || [];
    if (dark.length && Math.random() < 0.4) return dark[Math.floor(Math.random() * dark.length)].nm + (Math.random() - 0.5);
    if (spec.lines.length && (!spec.cont || Math.random() < 0.6)) {
      let tot = 0; spec.lines.forEach((o) => { tot += o.a; });
      let r = Math.random() * tot;
      for (const o of spec.lines) { r -= o.a; if (r <= 0) return o.nm + (Math.random() - 0.5) * 0.8; }
    }
    if (spec.cont) { for (let i = 0; i < 8; i++) { const l = NM0 + Math.random() * 300; if (Math.random() < spec.cont(l)) return l; } }
    return NM0 + Math.random() * 300;
  }
  function slitGap() { return 3 + S.slit * 7; }
  function darkHit(spec, l) {
    if (!spec.dark.length) return false;
    const G = spec.dgain ? spec.dgain() : 1;
    for (const o of spec.dark) if (Math.abs(l - o.nm) < 2.6 && Math.random() < o.d * G + 0.1 * G) return true;
    return false;
  }
  function stepPhotons(dt, spec) {
    spawnAcc += dt * (RM ? 25 : 62) * (0.4 + 0.6 * clamp(S.rev / 0.4, 0, 1));
    const out = L.srcY + (S.mode === 'absorb' && S.sub === 'sun' ? 56 : 40);
    while (spawnAcc >= 1) {
      spawnAcc -= 1;
      if (PH.length > 230) break;
      const hw = (spec.srcW || 20) / 2;
      PH.push({ x: L.cx + (Math.random() * 2 - 1) * hw, y: out, l: pickLambda(spec), s: 0, tx: 0, ty: 0, cd: false, sd: false, tr: [] });
    }
    const gap = slitGap();
    const cellOn = S.mode === 'absorb' && S.sub === 'lab' && S.cell.v > 0.85;
    const sunOn = S.mode === 'absorb' && S.sub === 'sun';
    for (let i = PH.length - 1; i >= 0; i--) {
      const p = PH[i];
      if (p.s === 0) {
        p.y += 230 * dt;
        if (!p.cd && cellOn && p.y >= L.cellY) {
          p.cd = true;
          if (Math.abs(p.x - L.cx) < 36 && darkHit(spec, p.l)) {
            S.cell.flash = 1;
            parts.emit({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.4, size: 9, color: wlHex(p.l), shape: 'smoke' });
            for (let k = 0; k < 2; k++) { const a = Math.random() * 6.28; parts.emit({ x: p.x, y: p.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, life: 0.7, size: 2, color: wlHex(p.l, 0.5), drag: 1 }); }
            PH.splice(i, 1); continue;
          }
        }
        if (!p.cd && sunOn && p.y >= L.srcY + 74) {
          p.cd = true;
          if (darkHit(spec, p.l)) {
            const a = Math.random() * 3.1; parts.emit({ x: p.x, y: p.y, vx: Math.cos(a) * 80 * (Math.random() < 0.5 ? -1 : 1), vy: Math.sin(a) * 60, life: 0.6, size: 2, color: wlHex(p.l, 0.5), drag: 1 });
            parts.emit({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, size: 7, color: wlHex(p.l), shape: 'smoke' });
            PH.splice(i, 1); continue;
          }
        }
        if (!p.sd && p.y >= L.slitY) {
          p.sd = true;
          if (Math.abs(p.x - L.cx) > gap / 2) { parts.emit({ x: p.x, y: L.slitY, vx: (p.x - L.cx) * 0.8, vy: -20, life: 0.25, size: 1.6, color: 'rgba(255,255,255,.8)' }); PH.splice(i, 1); continue; }
          p.x = L.cx + (p.x - L.cx) * 0.35;
        }
        if (p.y >= L.gratY) {
          p.s = 1; p.tx = scrX(clamp(p.l, NM0, NM1)); p.ty = L.scr.y;
          const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy) || 1;
          p.vx = dx / d * 250; p.vy = dy / d * 250;
        }
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y >= p.ty) PH.splice(i, 1);
      }
    }
  }
  function drawPhotons() {
    PH.forEach((p) => {
      if (p.s === 0) { ctx.fillStyle = 'rgba(255,250,230,.92)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.1, 0, 6.3); ctx.fill(); }
      else {
        const c = wlHex(p.l);
        ctx.strokeStyle = wlHex(p.l, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke();
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.3, 0, 6.3); ctx.fill();
      }
    });
  }

  /* ======================================================
     그림: 광원 · 방전관 · 슬릿 · 회절 격자
     ====================================================== */
  const ELECT = Array.from({ length: 9 }, (_, i) => ({ ph: i / 9, off: ((i * 37) % 13 - 6) * 1.4 }));
  const ATOMS = (() => { const r = rng(5); return Array.from({ length: 8 }, () => ({ x: (r() - 0.5) * 16, y: r() * 62 - 31, ph: r() * 6, sp: 2 + r() * 3 })); })();
  function drawSource(t, spec) {
    const cx = L.cx, y = L.srcY;
    const on = clamp(S.rev / 0.3, 0, 1);
    const isTube = S.mode === 'tubes' || S.mode === 'unknown';
    if (isTube) {
      // 방전관: 유리관 + 전극 + 전자 흐름
      const col = S.mode === 'tubes' ? EL[S.tube].glow : '#dbeafe';
      D.glow(cx, y, 74, col, 0.38 * on);
      D.shadow(() => { const g = ctx.createLinearGradient(cx - 17, 0, cx + 17, 0); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(0.5, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(255,255,255,.14)'); ctx.fillStyle = g; rr(cx - 17, y - 42, 34, 84, 15).fill(); }, { blur: 8, y: 2, color: 'rgba(0,0,0,.4)' });
      ctx.save(); rr(cx - 15, y - 40, 30, 80, 13).clip();
      const gg = ctx.createRadialGradient(cx, y, 2, cx, y, 46); gg.addColorStop(0, wlHexSafe(col, 0.95 * on)); gg.addColorStop(1, wlHexSafe(col, 0.35 * on));
      ctx.fillStyle = gg; ctx.fillRect(cx - 16, y - 41, 32, 82);
      // 전자: 위 (−) → 아래 (+)
      ELECT.forEach((e) => {
        const k = ((t * 0.9 + e.ph) % 1);
        ctx.fillStyle = 'rgba(96,165,250,.95)'; ctx.beginPath(); ctx.arc(cx + e.off, y - 36 + k * 72, 2.2, 0, 6.3); ctx.fill();
      });
      // 반짝이는 원자
      ATOMS.forEach((a) => {
        const f = Math.max(0, Math.sin(t * a.sp + a.ph));
        if (f > 0.7) { ctx.fillStyle = 'rgba(255,255,255,' + (f - 0.5) + ')'; ctx.beginPath(); ctx.arc(cx + a.x, y + a.y, 3.5 * f, 0, 6.3); ctx.fill(); }
      });
      ctx.restore();
      ctx.fillStyle = '#475569'; rr(cx - 12, y - 48, 24, 10, 4).fill(); rr(cx - 12, y + 38, 24, 10, 4).fill();
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(cx - 4, y - 56, 8, 10); ctx.fillRect(cx - 4, y + 46, 8, 6);
      D.text(cx - 22, y - 44, '−', { size: 15, color: '#93c5fd', weight: 800 }); D.text(cx + 22, y + 52, '+', { size: 15, color: '#fca5a5', weight: 800 });
      D.text(cx + 30, y - 8, S.mode === 'unknown' ? '방전관 ' + S.unk.replace('M', '(혼합)') : EL[S.tube].name + ' 방전관', { size: 14, color: '#cbd5e1', align: 'left', weight: 800 });
      D.text(cx + 30, y + 12, '저압 기체 + 전류', { size: 13, color: '#94a3b8', align: 'left', weight: 600 });
      return;
    }
    const tint = spec.tint || '#fff3c4';
    if (S.mode === 'absorb' && S.sub === 'sun') {
      D.glow(cx, y - 14, 120, '#fbbf24', 0.45);
      D.sphere(cx, y - 14, 58, '#fbbf24', { light: '#fff3b0', dark: '#f59e0b', gloss: false });
      // 대기층
      ctx.strokeStyle = 'rgba(251,146,60,.5)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(cx, y - 14, 70, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      for (let i = 0; i < 7; i++) { const a = 0.22 * Math.PI + i * 0.09 * Math.PI, rrr = 70 + Math.sin(t * 2 + i) * 4; D.sphere(cx + Math.cos(a) * rrr, y - 14 + Math.sin(a) * rrr, 3.5, ['#e879f9', '#facc15', '#fb7185'][i % 3], { gloss: false }); }
      D.text(cx + 76, y + 14, '태양', { size: 15, color: '#fde68a', align: 'left', weight: 800 });
      D.text(cx + 82, y + 44, '태양 대기 (차가운 기체)', { size: 13, color: '#fdba74', align: 'left', weight: 700 });
      return;
    }
    D.glow(cx, y, 90, tint, 0.45 * on);
    const key = S.mode === 'sources' ? S.src : 'incand';
    if (key === 'sun') {
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + t * 0.2; ctx.strokeStyle = 'rgba(253,224,71,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 30, y + Math.sin(a) * 30); ctx.lineTo(cx + Math.cos(a) * 40, y + Math.sin(a) * 40); ctx.stroke(); }
      D.sphere(cx, y, 24, '#fbbf24', { light: '#fff7c2', dark: '#f59e0b', gloss: false });
    } else if (key === 'fluor') {
      D.shadow(() => { ctx.fillStyle = '#e8f4ff'; rr(cx - 46, y - 11, 92, 22, 11).fill(); }, { blur: 14, y: 0, color: 'rgba(200,225,255,.8)' });
      ctx.fillStyle = '#475569'; rr(cx - 52, y - 9, 8, 18, 3).fill(); rr(cx + 44, y - 9, 8, 18, 3).fill();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; rr(cx - 38, y - 7, 76, 5, 3).fill();
    } else if (key === 'led') {
      D.shadow(() => { ctx.fillStyle = '#334155'; rr(cx - 16, y + 6, 32, 16, 3).fill(); }, { blur: 4, y: 2 });
      const g = ctx.createRadialGradient(cx - 5, y - 4, 2, cx, y, 20); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#dbeafe'); g.addColorStop(1, '#93c5fd');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, y + 6, 17, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 6, y + 22); ctx.lineTo(cx - 6, y + 32); ctx.moveTo(cx + 6, y + 22); ctx.lineTo(cx + 6, y + 32); ctx.stroke();
    } else {
      const g = ctx.createRadialGradient(cx - 6, y - 8, 2, cx, y, 24); g.addColorStop(0, '#fffbe6'); g.addColorStop(0.55, 'rgba(255,236,170,.9)'); g.addColorStop(1, 'rgba(255,200,120,.55)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, y - 2, 23, 0, 6.3); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 8, y + 20); ctx.lineTo(cx - 6, y + 4); ctx.lineTo(cx - 3, y + 9); ctx.lineTo(cx, y + 2); ctx.lineTo(cx + 3, y + 9); ctx.lineTo(cx + 6, y + 4); ctx.lineTo(cx + 8, y + 20); ctx.stroke();
      ctx.fillStyle = '#64748b'; rr(cx - 9, y + 22, 18, 12, 3).fill();
    }
    D.text(cx + 54, y + 4, spec.name, { size: 15, color: '#fde68a', align: 'left', weight: 800 });
  }
  function wlHexSafe(hex, a) { return SciSim.color.rgba(hex, clamp(a, 0, 1)); }

  function drawCell(t) {
    const v = S.cell.v;
    if (v < 0.02) return;
    const cx = L.cx + (1 - smooth(v)) * 170, y = L.cellY, w = 96, h = 44;
    ctx.save(); ctx.globalAlpha = clamp(v * 1.6, 0, 1);
    D.shadow(() => { ctx.fillStyle = 'rgba(232,121,249,.20)'; rr(cx - w / 2, y - h / 2, w, h, 10).fill(); }, { blur: 10, y: 3, color: 'rgba(0,0,0,.45)' });
    ctx.strokeStyle = 'rgba(244,200,255,.8)'; ctx.lineWidth = 2; rr(cx - w / 2, y - h / 2, w, h, 10).stroke();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(cx - w / 2 + 6, y - h / 2 + 4, w - 12, 5, 3).fill();
    const fl = S.cell.flash || 0;
    for (let i = 0; i < 9; i++) {
      const ax = cx - 36 + (i % 5) * 18 + Math.sin(t * 1.3 + i * 2.1) * 4, ay = y - 8 + Math.floor(i / 5) * 18 + Math.cos(t * 1.7 + i) * 4;
      D.sphere(ax, ay, 4.6, i % 3 === 0 && fl > 0.2 ? '#fff' : '#e879f9', { gloss: false });
    }
    ctx.restore();
    if (v > 0.9) {
      D.text(cx + 58, y - 6, '차가운 수소', { size: 14, color: '#f5d0fe', align: 'left', weight: 800 });
      D.text(cx + 58, y + 12, '기체 관', { size: 14, color: '#f5d0fe', align: 'left', weight: 800 });
    }
  }

  function drawBench(t, spec, G) {
    const cx = L.cx, gap = slitGap();
    // 광축 (희미한 점선)
    ctx.strokeStyle = 'rgba(148,163,184,.14)'; ctx.lineWidth = 1; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(cx, L.srcY + 40); ctx.lineTo(cx, L.scr.y); ctx.stroke(); ctx.setLineDash([]);
    const on = clamp(S.rev / 0.3, 0, 1);
    const sunMode = S.mode === 'absorb' && S.sub === 'sun';
    const top = L.srcY + (sunMode ? 56 : 40);
    // 빛줄기 (광원 → 슬릿)
    const hw = (spec.srcW || 20) / 2;
    const gb = ctx.createLinearGradient(0, top, 0, L.slitY); gb.addColorStop(0, wlHexSafe(spec.tint || '#fff', 0.22 * on)); gb.addColorStop(1, wlHexSafe(spec.tint || '#fff', 0.08 * on));
    ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(cx - hw, top); ctx.lineTo(cx + hw, top); ctx.lineTo(cx + hw * 0.8, L.slitY); ctx.lineTo(cx - hw * 0.8, L.slitY); ctx.closePath(); ctx.fill();
    // 슬릿 판
    const jaw = 62;
    D.shadow(() => { ctx.fillStyle = '#334155'; rr(cx - gap / 2 - jaw, L.slitY - 4, jaw, 8, 3).fill(); rr(cx + gap / 2, L.slitY - 4, jaw, 8, 3).fill(); }, { blur: 5, y: 2, color: 'rgba(0,0,0,.5)' });
    ctx.fillStyle = '#64748b'; ctx.fillRect(cx - gap / 2 - jaw + 2, L.slitY - 3, jaw - 4, 2); ctx.fillRect(cx + gap / 2 + 2, L.slitY - 3, jaw - 4, 2);
    D.text(cx + jaw + 14, L.slitY + 5, '슬릿 (좁은 틈)', { size: 14, color: '#cbd5e1', align: 'left', weight: 700 });
    // 슬릿 → 격자 가는 빛
    ctx.fillStyle = wlHexSafe(spec.tint || '#fff', 0.35 * on); ctx.fillRect(cx - gap * 0.2, L.slitY + 4, gap * 0.4, L.gratY - L.slitY - 4);
    // 부채꼴 빛 (격자 → 스크린)
    const N = 120, y0 = L.gratY + 7, y1 = L.scr.y;
    for (let j = 0; j < N; j++) {
      const l0 = NM0 + 300 * j / N, l1 = NM0 + 300 * (j + 1) / N, lm = (l0 + l1) / 2;
      let I = 0;
      if (spec.cont) I = spec.cont(lm) * G.gc;
      if (spec.dark.length && G.gd > 0.001) { let f = 1; spec.dark.forEach((o) => { f *= 1 - o.d * G.pk * G.gd * gs(lm, o.nm, G.sig); }); I *= f; }
      if (I < 0.03) continue;
      ctx.fillStyle = wlHex(lm, 0.26 * I * G.br);
      ctx.beginPath(); ctx.moveTo(cx - 2, y0); ctx.lineTo(cx + 2, y0); ctx.lineTo(scrX(l1) + 0.3, y1); ctx.lineTo(scrX(l0) - 0.3, y1); ctx.closePath(); ctx.fill();
    }
    spec.lines.forEach((o, k) => {
      const g = G.gl[k] * o.a * G.br; if (g < 0.02) return;
      ctx.strokeStyle = wlHex(o.nm, 0.5 * g); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(scrX(o.nm), y1); ctx.stroke();
    });
    // 회절 격자
    D.shadow(() => { ctx.fillStyle = 'rgba(186,230,253,.30)'; rr(cx - 46, L.gratY - 5, 92, 12, 3).fill(); }, { blur: 8, y: 2, color: 'rgba(0,0,0,.4)' });
    ctx.strokeStyle = 'rgba(224,242,254,.75)'; ctx.lineWidth = 1; ctx.beginPath(); for (let x = cx - 42; x <= cx + 42; x += 3) { ctx.moveTo(x, L.gratY - 4); ctx.lineTo(x, L.gratY + 6); } ctx.stroke();
    ctx.strokeStyle = 'rgba(224,242,254,.9)'; ctx.lineWidth = 1.5; rr(cx - 46, L.gratY - 5, 92, 12, 3).stroke();
    D.text(cx + 60, L.gratY + 4, '회절 격자 (또는 프리즘)', { size: 14, color: '#bae6fd', align: 'left', weight: 700 });
    // 빛 알갱이
    drawPhotons();
    // 작은 스크린
    const sc = L.scr;
    D.shadow(() => { ctx.fillStyle = '#0a0f1f'; rr(sc.cx - sc.w / 2 - 4, sc.y, sc.w + 8, sc.h + 2, 4).fill(); }, { blur: 8, y: 2, color: 'rgba(0,0,0,.5)' });
    ctx.save(); rr(sc.cx - sc.w / 2, sc.y + 1, sc.w, sc.h, 3).clip();
    drawBar(sc.cx - sc.w / 2, sc.y + 1, sc.w, sc.h, spec, G, 2);
    ctx.restore();
    D.text(sc.cx + sc.w / 2 + 14, sc.y + 14, '스크린', { size: 14, color: '#cbd5e1', align: 'left', weight: 700 });
    // 확대 깔때기
    ctx.fillStyle = 'rgba(148,163,184,.06)'; ctx.beginPath(); ctx.moveTo(sc.cx - sc.w / 2, sc.y + sc.h + 2); ctx.lineTo(sc.cx + sc.w / 2, sc.y + sc.h + 2); ctx.lineTo(L.strip.x + L.strip.w, L.strip.y); ctx.lineTo(L.strip.x, L.strip.y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,.3)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sc.cx - sc.w / 2, sc.y + sc.h + 2); ctx.lineTo(L.strip.x, L.strip.y); ctx.moveTo(sc.cx + sc.w / 2, sc.y + sc.h + 2); ctx.lineTo(L.strip.x + L.strip.w, L.strip.y); ctx.stroke(); ctx.setLineDash([]);
  }

  /* ---------- 스펙트럼 띠 (접안렌즈) ---------- */
  function refLines(el) { return LINES[el]; }
  function drawStrip(t, spec, G) {
    const s = L.strip;
    D.shadow(() => { ctx.fillStyle = '#04060d'; rr(s.x - 4, s.y - 4, s.w + 8, s.h + 8, 10).fill(); }, { blur: 10, y: 3, color: 'rgba(0,0,0,.55)' });
    ctx.save(); rr(s.x, s.y, s.w, s.h, 6).clip();
    drawBar(s.x, s.y, s.w, s.h, spec, G, 2);
    // 유리 반사
    const gl = ctx.createLinearGradient(0, s.y, 0, s.y + s.h); gl.addColorStop(0, 'rgba(255,255,255,.10)'); gl.addColorStop(0.35, 'rgba(255,255,255,0)'); ctx.fillStyle = gl; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.restore();
    ctx.strokeStyle = 'rgba(148,163,184,.55)'; ctx.lineWidth = 1.5; rr(s.x - 1, s.y - 1, s.w + 2, s.h + 2, 6).stroke();
    // 눈금
    const ty = s.y + s.h;
    ctx.strokeStyle = 'rgba(203,213,225,.8)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let nm = NM0; nm <= NM1; nm += 10) { const x = xOf(nm), m = nm % 50 === 0; ctx.moveTo(x, ty + 3); ctx.lineTo(x, ty + (m ? 11 : 7)); }
    ctx.stroke();
    const names = { 400: '보라', 450: '파랑', 500: '청록', 550: '초록', 600: '주황', 650: '빨강' };
    for (let nm = NM0; nm <= NM1; nm += 50) {
      D.text(xOf(nm) - (nm === NM1 ? 8 : 0), ty + 26, nm === NM1 ? '700 nm' : String(nm), { size: 13, color: '#e2e8f0', weight: 800 });
    }
    // 기준 선 겹치기 (점선 눈금)
    const ticks = [];
    if (S.mode === 'unknown') Object.keys(S.ov).forEach((e) => { if (S.ov[e]) ticks.push([e, LINES[e]]); });
    if (S.mode === 'absorb' && S.sub === 'lab' && S.cmp) ticks.push(['H', LINES.H]);
    if (S.mode === 'absorb' && S.sub === 'sun') Object.keys(S.sunOv).forEach((e) => { if (S.sunOv[e]) ticks.push([e, LINES[e]]); });
    ticks.forEach(([e, ls], ti) => {
      ls.forEach((o) => {
        const x = xOf(o.nm), a = 0.9;
        ctx.strokeStyle = EL[e].col; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -t * 12; ctx.globalAlpha = a;
        ctx.beginPath(); ctx.moveTo(x, s.y - 10 - ti * 2); ctx.lineTo(x, s.y + s.h + 2); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillStyle = EL[e].col; ctx.beginPath(); ctx.moveTo(x - 6, s.y - 22); ctx.lineTo(x + 6, s.y - 22); ctx.lineTo(x, s.y - 10); ctx.closePath(); ctx.fill();
      });
    });
    if (ticks.length) {
      let lx = s.x;
      ticks.forEach(([e]) => { const r = D.label(lx, s.y - 40, '▼ ' + EL[e].name + ' 기준 선', { bg: EL[e].col, color: '#0b1226', size: 13, align: 'left' }); lx += r.w + 8; });
    }
    // 기록 깃발
    if (S.mode === 'tubes') {
      const lst = S.flags.slice().sort((a, b) => a.nm - b.nm).filter((f) => f.el === S.tube);
      lst.forEach((f, i) => {
        const x = xOf(f.nm), pop = clamp((t - f.t0) / 0.4, 0, 1), sc = SciSim.ease.outBack(pop), yy = s.y - 14 - (i % 3) * 17;
        ctx.save(); ctx.translate(x, yy); ctx.scale(sc, sc);
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, s.y - yy + 4); ctx.stroke();
        D.label(0, 0, String(f.nm), { bg: '#f8fafc', color: '#0b1226', size: 13, pad: 5 });
        ctx.restore();
      });
    }
  }
  function drawCursor(t) {
    if (S.mode !== 'tubes') return;
    const s = L.strip, x = xOf(S.cur);
    const near = nearLine(S.tube, S.cur, 3.2);
    ctx.strokeStyle = near ? '#fde047' : '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.moveTo(x, s.y - 8); ctx.lineTo(x, s.y + s.h + 4); ctx.stroke(); ctx.globalAlpha = 1;
    // 읽기 말풍선 (눈금 숫자 아래)
    const txt = Math.round(S.cur) + ' nm';
    const w = 66 * (PHONE ? 1.2 : 1), ty = s.y + s.h + 34, bx = clamp(x - w / 2, s.x, s.x + s.w - w);
    ctx.fillStyle = near ? '#fde047' : '#f8fafc'; rr(bx, ty, w, 24, 12).fill();
    ctx.beginPath(); ctx.moveTo(x - 5, ty + 1); ctx.lineTo(x + 5, ty + 1); ctx.lineTo(x, ty - 6); ctx.closePath(); ctx.fill();
    D.text(bx + w / 2, ty + 17, txt, { size: 14, color: '#0b1226', weight: 800 });
    if (near) D.ring(x, s.y + s.h / 2, 16, t, { color: '#fde047', width: 2 });
  }

  /* ======================================================
     오른쪽(휴대폰은 아래) 패널: 기록표 / 설명
     ====================================================== */
  function nearLine(el, nm, tol) {
    let best = null;
    refLines(el).forEach((o) => { const d = Math.abs(o.nm - nm); if (d <= tol && (!best || d < Math.abs(best.nm - nm))) best = o; });
    return best;
  }
  function drawTable(t, ref) {
    const r = L.panel;
    panel(r, ref ? '📋 기준 기록표 (앞 단계에서 기록)' : '📋 기록표 (읽은 선의 파장)');
    const els = ['H', 'He', 'Ne', 'Na'];
    const rowH = (r.h - 36) / 4, bw = r.w - 28;
    els.forEach((e, i) => {
      const y = r.y + 36 + i * rowH;
      const got = ref ? new Set(LINES[e].map((o) => o.nm)) : S.rec[e];
      const cnt = got.size, tot = LINES[e].length;
      const cur = (S.mode === 'tubes' && S.tube === e) || (S.mode === 'unknown' && S.ov[e]);
      if (cur) { ctx.fillStyle = 'rgba(255,255,255,.07)'; rr(r.x + 6, y - 3, r.w - 12, rowH - 4, 10).fill(); }
      D.sphere(r.x + 22, y + 11, 7, EL[e].col, { gloss: false });
      D.text(r.x + 36, y + 17, EL[e].name, { size: 15, color: '#f1f5f9', align: 'left', weight: 800 });
      const done = !ref && cnt >= NEED[e];
      D.text(r.x + r.w - 14, y + 17, ref ? tot + '개 선' : cnt + ' / ' + (e === 'Na' ? 1 : tot) + (done ? ' ✓' : ''), { size: 13.5, color: done ? '#86efac' : '#94a3b8', align: 'right', weight: 800 });
      // 미니 스펙트럼 띠
      const bx = r.x + 14, by = y + 26, bh = 14;
      ctx.fillStyle = '#04060d'; rr(bx, by, bw, bh, 4).fill();
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      for (let k = 0; k <= 6; k++) g.addColorStop(k / 6, wlHex(NM0 + 50 * k, 0.16));
      ctx.fillStyle = g; rr(bx, by, bw, bh, 4).fill();
      LINES[e].forEach((o) => {
        const x = bx + (o.nm - NM0) / 300 * bw, has2 = got.has(o.nm);
        if (!has2) { ctx.fillStyle = 'rgba(148,163,184,.25)'; ctx.fillRect(x - 0.5, by + bh - 4, 1, 4); return; }
        const fl = S.flags.find((f) => f.el === e && f.nm === o.nm);
        const pop = fl ? clamp((t - fl.t0) / 0.5, 0, 1) : 1;
        ctx.fillStyle = wlHex(o.nm, 1); ctx.fillRect(x - 1.1, by - 1 - 3 * (1 - pop), 2.2, bh + 2 + 3 * (1 - pop));
        if (pop < 1) D.glow(x, by + bh / 2, 12 * (1 - pop) + 4, wlHex(o.nm), 0.7 * (1 - pop));
      });
      // 숫자
      const arr = LINES[e].filter((o) => got.has(o.nm)).map((o) => o.nm);
      let txt = arr.length ? arr.slice(0, 5).join(' · ') + (arr.length > 5 ? ' …+' + (arr.length - 5) : '') + ' nm' : '—';
      if (e === 'Na' && arr.length) txt = '589 nm (노란 겹선)';
      D.text(r.x + 14, y + 26 + bh + 15, txt, { size: 13, color: arr.length ? '#cbd5e1' : '#64748b', align: 'left', weight: 700 });
    });
  }
  function drawInfo(t, spec) {
    const r = L.panel;
    if (S.mode === 'sources') {
      panel(r, spec.icon + ' ' + spec.name);
      const chip = D.label(r.x + 14, r.y + 50, spec.kind, { bg: spec.cont && !spec.lines.length ? '#34d399' : '#fbbf24', color: '#0b1226', size: 13, align: 'left' });
      let yy = r.y + 78;
      yy += paragraph(spec.desc, r.x + 14, yy, r.w - 28, 14.5, '#dbe4ff', 21, 600) + 8;
      // 선명도 게이지
      const sp = sharpPct();
      D.text(r.x + 14, r.y + r.h - 58, '선명도', { size: 14, color: '#cbd5e1', align: 'left', weight: 800 });
      D.text(r.x + r.w - 14, r.y + r.h - 58, sp + '%', { size: 15, color: sp >= 80 ? '#86efac' : '#fde68a', align: 'right', weight: 800 });
      ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(r.x + 14, r.y + r.h - 46, r.w - 28, 12, 6).fill();
      ctx.fillStyle = sp >= 80 ? '#4ade80' : '#facc15'; rr(r.x + 14, r.y + r.h - 46, Math.max(10, (r.w - 28) * sp / 100), 12, 6).fill();
      D.text(r.x + 14, r.y + r.h - 16, '밝기', { size: 14, color: '#cbd5e1', align: 'left', weight: 800 });
      ctx.fillStyle = 'rgba(255,255,255,.12)'; rr(r.x + 62, r.y + r.h - 26, r.w - 76, 10, 5).fill();
      ctx.fillStyle = '#fef08a'; rr(r.x + 62, r.y + r.h - 26, Math.max(8, (r.w - 76) * (bright() - 0.55) / 0.45), 10, 5).fill();
      return;
    }
    if (S.mode === 'absorb') {
      if (S.sub === 'lab') {
        panel(r, '🧊 빛이 기체를 지나면?');
        let yy = r.y + 48;
        yy += paragraph('백열등의 연속된 빛이 차가운 수소 기체를 지나면 수소 원자가 자기가 낼 수 있는 파장의 빛만 골라 흡수해요.', r.x + 14, yy, r.w - 28, 14.5, '#dbe4ff', 21, 600) + 6;
        yy += paragraph(S.cell.v > 0.9 ? '그래서 연속 스펙트럼 속에 어두운 선 4개가 생겨요. 방출선과 같은 위치예요.' : '아직 기체 관이 없어서 연속 스펙트럼이 그대로 보여요.', r.x + 14, yy, r.w - 28, 14.5, S.cell.v > 0.9 ? '#fde68a' : '#94a3b8', 21, 700);
        // 흡수 대응 막대
        const by = r.y + r.h - 62;
        D.text(r.x + 14, by - 10, '어두운 선이 생긴 파장', { size: 13.5, color: '#cbd5e1', align: 'left', weight: 800 });
        LINES.H.forEach((o, i) => {
          const x = r.x + 14 + i * ((r.w - 28) / 4), w = (r.w - 28) / 4 - 6;
          const on = S.cell.v > 0.9;
          ctx.fillStyle = on ? '#0b1020' : 'rgba(255,255,255,.07)'; rr(x, by, w, 34, 8).fill();
          ctx.strokeStyle = on ? wlHex(o.nm, 0.9) : 'rgba(255,255,255,.15)'; ctx.lineWidth = 1.5; rr(x, by, w, 34, 8).stroke();
          D.text(x + w / 2, by + 22, on ? String(o.nm) : '—', { size: 14, color: on ? wlHex(o.nm) : '#64748b', weight: 800 });
        });
      } else {
        panel(r, '☀️ 태양 스펙트럼의 어두운 선');
        let yy = r.y + 48;
        yy += paragraph('태양 속은 아주 뜨겁고, 바깥 대기는 상대적으로 차가워요. 대기의 원소가 자기 고유 파장의 빛을 흡수해 어두운 선이 생겨요.', r.x + 14, yy, r.w - 28, 14.5, '#dbe4ff', 21, 600) + 8;
        const rows = [['H', '수소', 4], ['Na', '나트륨', 1], ['Ca', '칼슘', 1]];
        rows.forEach(([e, nm, n], i) => {
          const y = r.y + r.h - 108 + i * 34, ok = S.sunSeen.has(e);
          ctx.fillStyle = ok ? 'rgba(74,222,128,.14)' : 'rgba(255,255,255,.06)'; rr(r.x + 12, y, r.w - 24, 28, 8).fill();
          D.sphere(r.x + 28, y + 14, 7, EL[e].col, { gloss: false });
          D.text(r.x + 42, y + 19, nm, { size: 14.5, color: '#f1f5f9', align: 'left', weight: 800 });
          D.text(r.x + r.w - 20, y + 19, ok ? '확인 ✓ (선 ' + n + '개)' : '비교 전', { size: 13.5, color: ok ? '#86efac' : '#94a3b8', align: 'right', weight: 800 });
        });
      }
    }
  }
  function drawBanner(t, spec) {
    const b = L.banner;
    panel(b);
    let l1 = '', l2 = '', col = '#e6ecff';
    const x = b.x + 16;
    if (S.mode === 'sources') {
      l1 = 'slit(틈)을 좁히고 초점을 맞출수록 선이 또렷해져요. 대신 들어오는 빛이 줄어 조금 어두워져요.';
      l2 = spec.lines.length ? '지금 광원에서는 밝은 선이 ' + spec.lines.length + '개 있어요. 슬릿 폭과 초점을 바꾸며 선이 흐려졌다 또렷해지는 것을 살펴봐요.' : '이 광원은 선이 아니라 색이 이어진 스펙트럼이라서, 초점이 흐려도 색의 이어짐은 그대로예요.';
    } else if (S.mode === 'tubes') {
      const nl = nearLine(S.tube, S.cur, 3.2);
      l1 = '눈금 ' + Math.round(S.cur) + ' nm  →  ' + (nl ? '가까운 밝은 선: ' + nl.nm + ' nm (' + EL[S.tube].name + ')  📝 기록할 수 있어요' : '이 위치에는 밝은 선이 없어요. 눈금을 선 가까이로 옮겨요.');
      l2 = '원소마다 선의 개수와 위치가 달라요. 선의 파장은 원소의 "지문"처럼 늘 같아요.';
    } else if (S.mode === 'unknown') {
      const ks = Object.keys(S.ov).filter((e) => S.ov[e]);
      if (!ks.length) { l1 = '관찰 중: ' + spec.name + ' — 위에서 "기준 선 겹쳐 보기" 원소를 눌러 선 위치를 비교해요.'; l2 = '방전관 빛깔만 보고 정하지 말고, 선의 위치가 기준 선과 모두 맞는지 살펴봐요.'; }
      else {
        const tl = spec.lines;
        const info = ks.map((e) => { const m = LINES[e].filter((o) => tl.some((q) => Math.abs(q.nm - o.nm) < 2.5)).length; return EL[e].name + ' 기준 선 ' + LINES[e].length + '개 중 ' + m + '개 일치'; });
        l1 = '관찰 중: ' + spec.name + ' (밝은 선 ' + tl.length + '개)'; l2 = info.join('  ·  ');
      }
    } else if (S.sub === 'lab') {
      l1 = S.cell.v > 0.9 ? '수소 기체 관을 지난 빛의 스펙트럼: 656, 486, 434, 410 nm에서 선이 어두워졌어요.' : '연속 광원 앞에 차가운 수소 기체 관을 넣어 보세요.';
      l2 = S.cell.v > 0.9 ? (S.cmp ? '점선(수소 방출선)과 어두운 선이 같은 위치에 있어요! 원자는 내는 빛과 같은 파장의 빛을 흡수해요.' : '"방출선 위치 겹쳐 보기"를 눌러 방전관에서 본 수소의 밝은 선 위치와 비교해 봐요.') : '기체 관이 없으면 어두운 선도 없어요.';
    } else {
      const ks = Object.keys(S.sunOv).filter((e) => S.sunOv[e]);
      l1 = '태양 빛의 스펙트럼에는 어두운 선이 아주 많아요. 기준 선과 겹쳐 어떤 원소의 선인지 찾아봐요.';
      l2 = ks.length ? ks.map((e) => EL[e].name + ' 기준 선 → 어두운 선과 ' + (e === 'H' ? '4개' : '1개') + ' 모두 일치').join('  ·  ') : '표시한 기준 선이 없어요.';
    }
    const h1 = wrap(l1, b.w - 32, 15.5, 800).length * 23, h2 = wrap(l2, b.w - 32, 14.5, 600).length * 21;
    paragraph(l1, x, b.y + 30, b.w - 32, 15.5, '#f1f5f9', 23, 800);
    if (30 + h1 + 4 + h2 <= b.h - 6) paragraph(l2, x, b.y + 30 + h1 + 4, b.w - 32, 14.5, '#b6c4e8', 21, 600);
  }

  /* ---------- 배경 ---------- */
  const BGSTARS = (() => { const r = rng(9); return Array.from({ length: 50 }, () => ({ x: r() * VW, y: r() * VH, s: 0.4 + r() * 1.1, p: r() * 6 })); })();
  function drawBg(t) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0b1226'); g.addColorStop(1, '#101a38');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    BGSTARS.forEach((s) => { ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.12 * Math.sin(t + s.p)) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, 6.3); ctx.fill(); });
  }

  /* ======================================================
     입력
     ====================================================== */
  const sCur = $('#sCur'), oCur = $('#oCur'), sSlit = $('#sSlit'), oSlit = $('#oSlit'), sFocus = $('#sFocus'), oFocus = $('#oFocus');
  const bSlit = SciSim.bindRange(sSlit, oSlit, (v) => (+v).toFixed(2).replace(/0$/, '') + ' mm', (v) => { S.slitT = v; });
  const bFocus = SciSim.bindRange(sFocus, oFocus, (v) => (Math.abs(v) < 0.18 ? '맞음' : '어긋남'), (v) => { S.focusT = v; });
  const bCur = SciSim.bindRange(sCur, oCur, (v) => Math.round(v) + ' nm', (v) => { S.cur = v; });
  function setCur(nm) { S.cur = clamp(nm, NM0, NM1); sCur.value = S.cur; bCur.refresh(); }
  function setSlit(sl, fo) { S.slitT = sl; S.focusT = fo; sSlit.value = sl; sFocus.value = fo; bSlit.refresh(); bFocus.refresh(); }

  SciSim.pointer(view, {
    down(p) {
      if (S.mode !== 'tubes') return false;
      const s = L.strip;
      if (p.x < s.x - 14 || p.x > s.x + s.w + 14 || p.y < s.y - 46 || p.y > s.y + s.h + 80) return false;
      S.drag = true; dragTo(p); return true;
    },
    move(p) { if (S.drag) dragTo(p); },
    up() { S.drag = false; },
    hover(p) { const s = L.strip; return S.mode === 'tubes' && p.x > s.x - 14 && p.x < s.x + s.w + 14 && p.y > s.y - 46 && p.y < s.y + s.h + 80 ? 'ew-resize' : 'default'; },
  });
  function dragTo(p) {
    let nm = nmOf(p.x);
    const n = nearLine(S.tube, nm, 2.6);
    if (n) nm = n.nm;
    setCur(nm);
  }

  function recordNow() {
    if (S.mode !== 'tubes') return;
    const n = nearLine(S.tube, S.cur, 3.2);
    if (!n) { Sound.fail(); toast('이 위치에는 밝은 선이 없어요. 눈금을 선 가까이 옮겨 보세요.', 'bad', 1800); return; }
    recordLine(S.tube, n.nm, true);
  }
  function recordLine(e, nm, fancy) {
    if (S.rec[e].has(nm)) { toast('이미 기록한 선이에요.', '', 1200); return; }
    S.rec[e].add(nm);
    S.flags.push({ el: e, nm, t0: S.t });
    if (fancy) { Sound.success(); const c = Math.round(xOf(nm)); parts.burst(c, L.strip.y + 10, { count: 12, speed: 120, size: 3, life: 0.7, colors: [wlHex(nm), '#fff'], gravity: 80 }); }
  }
  $('#bRec').addEventListener('click', recordNow);

  const ctl = {
    src: $$('#srcBtns .opt'), tube: $$('#tubeBtns .opt'), unk: $$('#unkBtns .opt'), ov: $$('#ovBtns .opt'), ans: $$('#ansBtns .opt'), sub: $$('#subBtns .opt'), sun: $$('#sunBtns .opt'),
  };
  ctl.src.forEach((b) => b.addEventListener('click', () => { Sound.tick(); S.src = b.dataset.src; S.slitT = S.slitT; updateCtl(); }));
  ctl.tube.forEach((b) => b.addEventListener('click', () => { Sound.tick(); S.tube = b.dataset.tube; updateCtl(); }));
  ctl.unk.forEach((b) => b.addEventListener('click', () => { Sound.tick(); S.unk = b.dataset.unk; updateCtl(); }));
  ctl.ov.forEach((b) => b.addEventListener('click', () => { Sound.tick(); S.ov[b.dataset.ov] = !S.ov[b.dataset.ov]; updateCtl(); }));
  ctl.ans.forEach((b) => b.addEventListener('click', () => { Sound.tick(); const k = b.dataset.ans; S.ans[k] = (S.ans[k] + 1) % ANS_OPT.length; S.ansBad[k] = false; b.classList.remove('shake', 'ok'); updateCtl(); }));
  ctl.sub.forEach((b) => b.addEventListener('click', () => { Sound.tick(); setSub(b.dataset.sub); }));
  ctl.sun.forEach((b) => b.addEventListener('click', () => { Sound.tick(); const e = b.dataset.sunov; S.sunOv[e] = !S.sunOv[e]; if (S.sunOv[e]) S.sunSeen.add(e); updateCtl(); }));
  $('#bCell').addEventListener('click', () => { Sound.click(); S.cell.target = S.cell.target ? 0 : 1; if (!S.cell.target) S.cmp = false; updateCtl(); });
  $('#bEmis').addEventListener('click', () => { Sound.tick(); S.cmp = !S.cmp; updateCtl(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setMode(b.dataset.mode, b.dataset.mode === 'absorb' ? 'lab' : null); }));

  function setSub(sub) { if (S.sub === sub && S.mode === 'absorb') return; S.sub = sub; S.rev = 0; S.fade = 0.8; PH.length = 0; updateCtl(); }
  function setMode(m, sub) {
    if (S.mode !== m) { S.fade = 1; PH.length = 0; S.rev = 0; }
    S.mode = m;
    if (m === 'absorb') S.sub = sub || S.sub;
    if (m !== 'sources') setSlit(0.5, 0);
    updateCtl();
  }
  const MODE_LABEL = { sources: '🔭 분광기 · 광원 비교', tubes: '⚡ 방전관의 선스펙트럼', unknown: '🕵️ 이름 없는 방전관', absorb: '☀️ 흡수 스펙트럼' };
  function updateCtl() {
    $('#tbLabel').textContent = MODE_LABEL[S.mode] + (S.mode === 'absorb' ? (S.sub === 'sun' ? ' · 태양' : ' · 실험실') : '');
    $$('#ctrlCard .control').forEach((c) => {
      const ok = c.dataset.modes.split(' ').includes(S.mode) && (!c.dataset.sub || c.dataset.sub === S.sub || c.dataset.sub === 'ans');
      c.hidden = !ok;
    });
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $('#modeSeg').hidden = !(game && game.free);
    ctl.src.forEach((b) => b.classList.toggle('on', b.dataset.src === S.src));
    ctl.tube.forEach((b) => b.classList.toggle('on', b.dataset.tube === S.tube));
    ctl.unk.forEach((b) => b.classList.toggle('on', b.dataset.unk === S.unk));
    ctl.ov.forEach((b) => b.classList.toggle('on', !!S.ov[b.dataset.ov]));
    ctl.sub.forEach((b) => b.classList.toggle('on', b.dataset.sub === S.sub));
    ctl.sun.forEach((b) => b.classList.toggle('on', !!S.sunOv[b.dataset.sunov]));
    ctl.ans.forEach((b) => { const k = b.dataset.ans, v = S.ans[k]; b.textContent = k + ': ' + (v ? EL[ANS_OPT[v]].name : '?'); b.classList.toggle('on', v > 0 && !S.ansOK); b.classList.toggle('ok', !!S.ansOK); });
    $('#bCell').classList.toggle('on', !!S.cell.target); $('#bCell').textContent = S.cell.target ? '🧊 수소 기체 관 빼기' : '🧊 차가운 수소 기체 관 넣기';
    $('#bEmis').classList.toggle('on', S.cmp);
  }

  /* ---------- 읽음 칸 ---------- */
  const v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3'), l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3');
  let rlast = '';
  function readouts(spec) {
    let A, a, B, b, C, c;
    if (S.mode === 'sources') { A = '광원'; a = spec.name; B = '스펙트럼 종류'; b = spec.kind; C = '선명도'; c = sharpPct() + '%'; }
    else if (S.mode === 'tubes') {
      const n = nearLine(S.tube, S.cur, 3.2);
      A = '눈금 위치'; a = Math.round(S.cur) + ' nm'; B = '가까운 밝은 선'; b = n ? n.nm + ' nm' : '없음';
      C = '기록한 선'; c = Object.keys(S.rec).reduce((s, e) => s + S.rec[e].size, 0) + '개';
    } else if (S.mode === 'unknown') {
      const ks = Object.keys(S.ov).filter((e) => S.ov[e]);
      A = '관찰 중'; a = spec.name.replace('방전관 ', '') + (S.ansOK && TRUTH[S.unk] ? ' = ' + EL[TRUTH[S.unk]].name : ''); B = '겹친 기준 선'; b = ks.length ? ks.map((e) => EL[e].name).join(', ') : '없음';
      C = '밝은 선 개수'; c = spec.lines.length + '개';
    } else if (S.sub === 'lab') {
      A = '수소 기체 관'; a = S.cell.v > 0.9 ? '있음' : '없음'; B = '어두운 선'; b = S.cell.v > 0.9 ? '4개' : '없음'; C = '위치'; c = S.cell.v > 0.9 ? '656·486·434·410 nm' : '—';
    } else {
      const ks = Object.keys(S.sunOv).filter((e) => S.sunOv[e]);
      A = '관측 대상'; a = '태양 빛'; B = '겹친 기준 선'; b = ks.length ? ks.map((e) => EL[e].name).join(', ') : '없음'; C = '확인한 원소'; c = S.sunSeen.size + ' / 3';
    }
    const key = A + a + B + b + C + c;
    if (key === rlast) return; rlast = key;
    l1.textContent = A; v1.textContent = a; l2.textContent = B; v2.textContent = b; l3.textContent = C; v3.textContent = c;
  }

  let hintTimer = null;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 5000);
  }

  /* ======================================================
     단계 · 미션
     ====================================================== */
  function enterLevel(li) {
    if (li === 0) { setMode('sources'); setSlit(2.4, 0.6); S.src = 'incand'; S.seen = new Set(); S.rev = 0; }
    else if (li === 1) { setMode('tubes'); S.tube = 'H'; setCur(550); S.rev = 0; }
    else if (li === 2) { setMode('unknown'); S.unk = 'A'; S.ov = { H: false, He: false, Ne: false, Na: false }; S.rev = 0; }
    else { setMode('absorb', 'lab'); S.rev = 0; S.cell.target = 0; S.cmp = false; S.labDone = false; S.sunDone = false; S.sunOv = { H: false, Na: false, Ca: false }; S.sunSeen = new Set(); }
    updateCtl();
  }
  const dotName = (e) => '<b style="color:' + EL[e].col + '">●</b> ' + EL[e].name;
  const levels = [
    {
      title: '분광기로 빛 나눠 보기', short: '분광기', icon: '🔭', phase: '관찰',
      features: ['bench', 'sources', 'slit'],
      intro: '<p class="si-q">❓ 탐구 질문: 멀리 있는 별에 무엇이 들어 있는지, 직접 가 보지 않고 어떻게 알 수 있을까?</p>' +
        '<div class="si-link">🔗 <b>중학교에서</b> 프리즘이 햇빛을 여러 색으로 나누는 것(중2 Ⅲ 빛의 합성)과 원소·원자의 구조(중2 Ⅳ 물질의 구성)를 배웠어요. 이제 빛을 파장별로 나누는 <b>분광기</b>로 빛의 정체를 들여다봐요.</div>' +
        '<p>분광기는 <b>슬릿</b>으로 가느다란 빛줄기를 만들고, <b>회절 격자(또는 프리즘)</b>로 파장별로 나눠 <b>스펙트럼</b>을 보여 줘요. 우리 눈에 보이는 빛(가시광선)은 <b>400 nm(보라) ~ 700 nm(빨강)</b>이에요.</p>' +
        '<p>백열등·햇빛·형광등·LED를 분광기로 보며 스펙트럼의 종류를 비교해 봐요.</p>',
      setup() { enterLevel(0); showHint('💡 광원을 바꿔 가며 스펙트럼을 살펴보세요', 6000); },
      recap: '분광기는 빛을 파장별로 나눠 스펙트럼으로 보여 줘요. 백열등·햇빛은 연속 스펙트럼, 형광등은 띠와 밝은 선이 섞여 있어요.',
      summary: '<ul><li><b>분광기</b>: 슬릿 → 회절 격자(프리즘) → 스펙트럼. 가시광선은 약 <b>400 nm(보라) ~ 700 nm(빨강)</b>.</li><li><b>연속 스펙트럼</b>: 백열등·햇빛처럼 색이 끊김 없이 이어진 스펙트럼.</li><li>형광등은 <b>밝은 선 + 색 띠</b>, LED는 <b>넓은 봉우리 2개</b>예요.</li><li>슬릿이 좁고 초점이 맞을수록 스펙트럼이 <b>선명</b>하지만 더 어두워져요.</li></ul>',
      missions: [
        {
          title: '광원 4개 살펴보기',
          goal: '백열등, 햇빛, 형광등, LED를 <b>차례로 모두</b> 켜서 스펙트럼을 살펴보세요.',
          hint: '오른쪽 위 💡 광원 버튼을 눌러 하나씩 바꿔 보세요. 각각 1초쯤 살펴봐요.',
          setup() { enterLevel(0); },
          check: () => S.seen.size >= 4, hold: 0.3,
          status: () => SRC_IDS.map((k) => mark(S.seen.has(k)) + ' ' + SPEC[k].name).join(' · '),
          explain: '<b>백열등·햇빛</b>은 보라에서 빨강까지 끊김 없이 이어진 <b>연속 스펙트럼</b>이에요. <b>형광등</b>은 밝은 선(수은)과 색 띠가, <b>LED</b>는 넓은 봉우리 두 개가 보여요. 광원마다 스펙트럼이 달라요.',
        },
        {
          title: '선명한 스펙트럼 만들기',
          goal: '<b>형광등</b>의 밝은 선이 또렷하게 보이도록 <b>슬릿 폭</b>과 <b>초점</b>을 조절하세요. (선명도 80% 이상)',
          hint: '슬릿 폭을 0.8 mm 아래로 줄이고, 초점 슬라이더를 가운데(0) 근처에 맞추면 선이 가늘어져요.',
          setup() { enterLevel(0); S.src = 'fluor'; S.rev = 0; if (S.slitT < 1.2 && Math.abs(S.focusT) < 0.2) setSlit(2.4, 0.6); updateCtl(); },
          check: () => S.src === 'fluor' && sharpPct() >= 80, hold: 1.0,
          status: () => (S.src !== 'fluor' ? '💡 광원을 <b>형광등</b>으로 바꿔요' : '선명도 <b>' + sharpPct() + '%</b> ' + (sharpPct() >= 80 ? '✅' : '⬜ (80% 이상이 목표)')),
          explain: '슬릿이 넓거나 초점이 어긋나면 한 파장의 빛이 여러 위치에 퍼져 <b>선이 번져요</b>. 슬릿을 좁히고 초점을 맞추면 선이 가늘고 또렷해져요. 대신 들어오는 빛이 줄어 조금 어두워져요.',
        },
        {
          type: 'quiz', title: '연속 스펙트럼을 내는 광원',
          goal: '보라에서 빨강까지 <b>끊김 없이 이어진 연속 스펙트럼</b>을 내는 광원 두 가지는 무엇일까요?',
          setup() { enterLevel(0); },
          choices: ['백열등과 햇빛', '형광등과 LED', '백열등과 형광등', '햇빛과 LED'],
          answer: 0,
          feedback: ['', '형광등은 밝은 선이 있고 LED는 봉우리 두 개뿐이라서 끊김 없는 무지개가 아니에요.', '형광등은 밝은 선과 색 띠가 섞여 있어요. 연속 스펙트럼이 아니에요.', 'LED는 보라·빨강 끝이 거의 비어 있어서 끊김 없는 무지개가 아니에요.'],
          explain: '뜨겁게 달궈진 물체(필라멘트, 태양 표면)는 모든 파장의 빛을 내서 <b>연속 스펙트럼</b>이 돼요. 기체나 형광 물질이 내는 빛은 특정 파장에 몰려 있어 <b>선이나 띠</b> 모양으로 나타나요.',
        },
      ],
    },
    {
      title: '방전관의 선스펙트럼', short: '선스펙트럼', icon: '⚡', phase: '실험',
      features: ['tubes'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 형광등의 스펙트럼에 밝은 선이 보였어요. 한 가지 기체만 들어 있는 <b>방전관</b>에서는 어떻게 보일까요?</div>' +
        '<p>저압 기체에 전류를 흘리면 기체가 빛을 내요. 이 빛을 분광기로 보면 몇 개의 <b>밝은 선</b>만 나타나는 <b>선스펙트럼</b>(방출 스펙트럼)이에요.</p>' +
        '<p><b>눈금 커서</b>를 선에 맞춘 뒤 <b>📝 이 선 기록하기</b>를 눌러 파장(nm)을 기록표에 적어요. 선 가까이에 커서를 가져가면 눈금이 달라붙어요.</p>',
      setup() { enterLevel(1); showHint('📏 스펙트럼 위를 끌어 눈금을 선에 맞춰요', 6000); },
      recap: '원소마다 선스펙트럼의 선 개수와 위치(파장)가 달라요. 수소의 가시광선 선은 656, 486, 434, 410 nm예요.',
      summary: '<table class="mini"><tr><th>원소</th><th>밝은 선의 파장 (nm)</th></tr><tr><td>수소</td><td>656 · 486 · 434 · 410</td></tr><tr><td>헬륨</td><td>668 · 588 · 502 · 447</td></tr><tr><td>나트륨</td><td>589 (노란 겹선)</td></tr><tr><td>네온</td><td>585 ~ 640 (주황~빨강 선 여러 개)</td></tr></table><ul><li>저압 기체에 전류를 흘려 얻는 스펙트럼은 <b>선스펙트럼</b>이에요.</li><li>원소마다 선의 <b>위치</b>가 달라서 원소를 구별하는 단서가 돼요.</li></ul>',
      missions: [
        {
          title: '수소 선 4개 기록하기',
          goal: '<b>수소 방전관</b>의 밝은 선 <b>4개</b>의 파장을 읽어 모두 기록하세요.',
          hint: '붉은 선(약 656 nm)부터 보라 선(약 410 nm)까지 4개예요. 눈금을 선 가까이 끌고 📝 버튼을 눌러요.',
          setup() { enterLevel(1); S.tube = 'H'; updateCtl(); },
          check: () => S.rec.H.size >= 4, hold: 0.4,
          status: () => '수소 선 <b>' + S.rec.H.size + ' / 4</b> ' + LINES.H.map((o) => mark(S.rec.H.has(o.nm)) + o.nm).join(' '),
          explain: '수소의 가시광선 선스펙트럼은 <b>656(빨강) · 486(청록) · 434(청남) · 410(보라) nm</b>의 4개 선이에요. 어느 수소 방전관에서도 같은 위치에 나타나요.',
        },
        {
          title: '원소 2개 더 기록하기',
          goal: '다른 방전관을 켜서 <b>두 원소</b>의 선을 기록해요. (헬륨 3개 이상, 네온 3개 이상, 나트륨 1개 중 두 원소)',
          hint: '나트륨은 노란 선 하나(589 nm)만 기록하면 돼요. 네온은 주황~빨강 선이 많으니 3개를 골라요.',
          setup() { enterLevel(1); S.tube = 'He'; updateCtl(); },
          check: () => ['He', 'Ne', 'Na'].filter((e) => S.rec[e].size >= NEED[e]).length >= 2, hold: 0.4,
          status: () => ['He', 'Ne', 'Na'].map((e) => mark(S.rec[e].size >= NEED[e]) + ' ' + EL[e].name + ' ' + S.rec[e].size + '/' + NEED[e]).join(' · '),
          explain: '헬륨은 <b>668 · 588 · 502 · 447 nm</b>, 나트륨은 노란 선 <b>589 nm</b> 하나(가까이 붙은 겹선), 네온은 <b>585~640 nm</b>의 주황~빨강 선이 여러 개예요. 같은 노란 빛이라도 헬륨(588)과 나트륨(589)은 다른 선들까지 보면 구별돼요.',
        },
        {
          type: 'quiz', title: '선의 위치가 다른 까닭',
          goal: '원소마다 선스펙트럼에서 선의 <b>위치</b>가 다른 까닭은 무엇일까요?',
          setup() { enterLevel(1); },
          choices: ['원소마다 원자가 낼 수 있는 빛의 파장이 정해져 있고 서로 다르기 때문이다', '방전관 유리의 색이 서로 다르기 때문이다', '흘려 준 전류의 세기가 서로 다르기 때문이다', '슬릿의 폭이 매번 다르기 때문이다'],
          answer: 0,
          feedback: ['', '유리는 투명해서 색을 바꾸지 않아요. 선의 위치는 원자가 내는 빛 자체의 파장이에요.', '전류가 세면 선이 더 밝아질 뿐, 선의 위치는 그대로예요.', '슬릿 폭은 선의 굵기와 밝기에만 영향을 줘요.'],
          explain: '원자 속 전자가 가질 수 있는 에너지는 <b>정해진 값</b>뿐이에요. 에너지가 높은 곳에서 낮은 곳으로 내려올 때 그 에너지 차이에 해당하는 <b>특정 파장의 빛</b>만 나와요. 원소마다 이 값이 달라서 선의 위치가 달라요.',
        },
      ],
    },
    {
      title: '원소의 지문 맞추기', short: '지문 맞추기', icon: '🕵️', phase: '탐구',
      features: ['unknown'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원소마다 밝은 선의 위치(파장)가 다르다는 것을 기록표로 남겼어요. 선의 위치는 원소의 <b>지문</b>이에요.</div>' +
        '<p>이름표가 없는 방전관 <b>A, B, C</b>가 있어요. 방전관의 빛깔은 같아 보여서 눈으로는 알 수 없어요. 분광기로 선을 보고, <b>기준 선</b>(기록표)을 겹쳐 어떤 원소인지 알아맞혀 봐요.</p>' +
        '<p>또 두 원소가 <b>섞인 혼합관</b>의 스펙트럼에서 두 원소의 선이 모두 보이는지도 확인해요.</p>',
      setup() { enterLevel(2); },
      recap: '선의 위치가 기준 선과 모두 겹치면 같은 원소예요. 혼합물의 스펙트럼에는 들어 있는 원소들의 선이 모두 나타나요.',
      summary: '<ul><li>스펙트럼의 선 <b>위치(파장)</b>를 기준 스펙트럼과 비교하면 어떤 원소인지 알아낼 수 있어요.</li><li>밝기나 선 개수만 비교하면 안 돼요. 헬륨(588 nm)과 나트륨(589 nm)은 노란 선 위치가 거의 같지만, 헬륨은 다른 선도 있어요.</li><li><b>혼합물</b>의 스펙트럼에는 들어 있는 원소들의 선이 모두 나타나요.</li></ul>',
      missions: [
        {
          title: '이름 없는 방전관 A, B, C',
          goal: '방전관 A, B, C가 각각 어떤 원소인지 알아맞히고 <b>✔ 확인하기</b>를 누르세요.',
          hint: '관을 고른 뒤 기준 선을 겹쳐 보세요. 선이 하나라도 안 맞으면 다른 원소예요. 노란 선이 하나뿐인 관은 어느 원소일까요?',
          manual: true,
          setup() { enterLevel(2); S.unk = 'A'; updateCtl(); },
          check() {
            const names = Object.keys(TRUTH);
            const unset = names.filter((k) => !S.ans[k]);
            if (unset.length) return '<b>' + unset.join(', ') + '</b> 관의 원소를 아직 고르지 않았어요. 아래 "내 추리" 버튼을 눌러요.';
            const bad = names.filter((k) => ANS_OPT[S.ans[k]] !== TRUTH[k]);
            names.forEach((k) => { if (bad.includes(k) && !S.ansBad[k]) { S.ansBad[k] = true; shakeAns(k); } if (!bad.includes(k)) S.ansBad[k] = false; });
            if (bad.length) {
              const tip = { A: '<b>A</b>: 노란 선 말고 푸른 선(447, 502 nm)과 붉은 선(668 nm)도 있는지 살펴봐요.', B: '<b>B</b>: 선 4개의 위치가 한 기준 선과 모두 겹치는지 확인해요.', C: '<b>C</b>: 밝은 선이 몇 개 있는지, 그 위치가 어느 기준 선과 맞는지 봐요.' };
              return bad.map((k) => tip[k]).join('<br>');
            }
            if (!S.ansOK) { S.ansOK = 1; updateCtl(); parts.burst(L.cx, L.srcY, { count: 20, speed: 160 }); }
            return true;
          },
          explain: 'A는 <b>헬륨</b>(668 · 588 · 502 · 447 nm), B는 <b>수소</b>(656 · 486 · 434 · 410 nm), C는 <b>나트륨</b>(589 nm 하나)이에요. 방전관의 빛깔이 비슷해도 선의 위치(지문)는 원소마다 달라요.',
        },
        {
          title: '혼합관 분석하기',
          goal: '<b>혼합관</b>을 켜고 <b>수소</b>와 <b>헬륨</b> 기준 선을 겹쳐서, 두 원소의 선이 모두 나타나는지 확인하세요.',
          hint: '혼합관 버튼을 누른 뒤 기준 선에서 수소와 헬륨을 모두 켜요. 점선과 밝은 선이 겹치는 개수를 살펴봐요.',
          setup() { enterLevel(2); S.unk = 'M'; S.ov = { H: false, He: false, Ne: false, Na: false }; updateCtl(); },
          check: () => S.unk === 'M' && S.ov.H && S.ov.He, hold: 0.8,
          status: () => mark(S.unk === 'M') + ' 혼합관 · ' + mark(S.ov.H) + ' 수소 기준 선 · ' + mark(S.ov.He) + ' 헬륨 기준 선',
          explain: '혼합관에는 <b>수소 선 4개와 헬륨 선 4개</b>가 모두 나타나요. 여러 원소가 섞여 있으면 각 원소의 선이 겹쳐서 보이므로, 스펙트럼으로 혼합물의 성분도 알아낼 수 있어요.',
        },
        {
          type: 'quiz', title: '같은 원소인지 판단하는 방법',
          goal: '스펙트럼으로 두 빛이 <b>같은 원소</b>에서 나왔는지 확인할 때 가장 믿을 만한 단서는 무엇일까요?',
          setup() { enterLevel(2); },
          choices: ['선의 밝기만 비교한다', '선의 개수만 센다', '선의 위치(파장) 패턴이 모두 같은지 본다', '방전관 빛의 대략적인 색만 본다'],
          answer: 2,
          feedback: ['밝기는 전류 세기나 슬릿 폭에 따라 달라져요. 지문은 밝기가 아니라 위치예요.', '선의 개수가 같아도 위치가 다르면 다른 원소예요. (예: 선이 4개인 수소와 헬륨)', '', '헬륨(노랑)과 나트륨(노랑)처럼 비슷한 빛깔이어도 다른 원소일 수 있어요.'],
          explain: '원소의 지문은 선의 <b>위치(파장)</b> 패턴이에요. 밝기나 개수, 눈으로 본 빛깔만으로는 잘못 판단할 수 있어요. 위치가 모두 같을 때 같은 원소라고 말할 수 있어요.',
        },
      ],
    },
    {
      title: '흡수선: 별빛 속의 지문', short: '흡수선', icon: '☀️', phase: '분석',
      features: ['absorb'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원소의 선스펙트럼으로 원소를 알아냈어요. 그런데 별이나 태양은 방전관이 아니라 연속 스펙트럼을 내는 뜨거운 천체예요. 이 빛 속에서도 원소를 찾을 수 있을까요?</div>' +
        '<p>연속 스펙트럼을 내는 빛이 <b>차가운 기체</b>를 지나면, 기체의 원자가 자기가 낼 수 있는 파장의 빛만 <b>흡수</b>해요. 그러면 연속 스펙트럼 속에 <b>어두운 선(흡수선)</b>이 생겨요.</p>' +
        '<p>먼저 실험실에서 수소 기체 관으로 흡수선을 만들고, 이어서 <b>태양 스펙트럼</b>의 어두운 선을 기준 선과 비교해 태양 대기의 원소를 찾아봐요.</p>',
      setup() { enterLevel(3); showHint('🧊 차가운 수소 기체 관을 넣어 보세요', 6000); },
      recap: '흡수선은 방출선과 같은 위치에 생겨요. 태양 스펙트럼의 어두운 선을 분석하면 태양 대기에 있는 원소를 알 수 있어요.',
      summary: '<ul><li><b>흡수 스펙트럼</b>: 연속 스펙트럼 속에 어두운 선이 나타나는 스펙트럼.</li><li>차가운 기체의 원자는 자기가 방출할 수 있는 파장의 빛만 흡수해서, <b>흡수선의 위치 = 방출선의 위치</b>예요.</li><li>태양 스펙트럼의 어두운 선을 비교하면 태양 대기에 <b>수소, 나트륨, 칼슘</b> 등이 있음을 알 수 있어요.</li><li>이렇게 <b>천체에서 오는 빛의 스펙트럼</b>을 분석해 천체의 구성 물질을 추론해요.</li></ul>',
      missions: [
        {
          title: '흡수선 위치 비교하기',
          goal: '① <b>실험실</b>에서 수소 기체 관을 넣고 방출선 위치와 비교해요. ② <b>태양</b> 장면에서 수소·나트륨·칼슘 기준 선을 모두 겹쳐 보세요.',
          hint: '① "수소 기체 관 넣기" → "방출선 위치 겹쳐 보기"를 차례로 눌러요. ② 위의 "☀️ 태양" 장면으로 바꾼 뒤 기준 선 3개를 한 번씩 눌러요.',
          setup() { enterLevel(3); },
          check() { return S.labDone && S.sunDone; },
          hold: 0.5,
          status: () => mark(S.labDone) + ' ① 수소 흡수선 비교 · ' + mark(S.sunDone) + ' ② 태양 기준 선 3개 (' + S.sunSeen.size + '/3)',
          explain: '수소 기체를 지난 빛에서 어두워진 위치(656 · 486 · 434 · 410 nm)는 수소 방전관의 <b>밝은 선과 같은 위치</b>예요. 태양 스펙트럼의 어두운 선도 수소(4개), 나트륨(589 nm), 칼슘(423 nm) 기준 선과 겹쳐요.',
        },
        {
          type: 'quiz', title: '태양에 나트륨이 있다는 증거',
          goal: '태양 스펙트럼의 <b>589 nm</b>에 어두운 선이 있어요. 이 선에서 알 수 있는 것과 그 까닭을 바르게 짝지은 것은?',
          setup() { enterLevel(3); S.sub = 'sun'; updateCtl(); },
          choices: ['태양 대기에 나트륨이 있다 — 나트륨 원자가 자기가 내는 파장(589 nm)의 빛을 흡수하기 때문', '태양에 나트륨이 없다 — 589 nm의 빛이 아예 나오지 않기 때문', '태양 대기에 수소가 있다 — 수소가 589 nm의 빛을 흡수하기 때문', '태양이 589 nm의 빛을 특히 많이 낸다 — 선이 어둡다는 것은 빛이 강하다는 뜻이기 때문'],
          answer: 0,
          feedback: ['', '선이 어둡다는 것은 그 파장의 빛이 줄었다는 뜻이고, 이는 그 파장을 흡수하는 원소가 있다는 증거예요.', '수소가 흡수하는 파장은 656 · 486 · 434 · 410 nm예요. 589 nm는 나트륨의 위치예요.', '어두운 선은 빛이 약해진 곳이에요. 빛이 강하면 밝은 선으로 보여요.'],
          explain: '어두운 선의 위치(589 nm)는 나트륨의 선스펙트럼 위치와 같아요. 태양 대기의 <b>차가운 나트륨 원자</b>가 589 nm의 빛을 흡수했다는 증거예요. 이렇게 별빛의 흡수선을 분석하면 직접 가지 않고도 별의 구성 원소를 알 수 있어요.',
        },
      ],
    },
  ];

  function shakeAns(k) {
    const b = ctl.ans.find((x) => x.dataset.ans === k);
    if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
  }

  game = SciSim.game({
    simId: 'h1-spectrum', mount: '#game', badge: '스펙트럼 탐정', homeHref: '../../index.html#h1a',
    featureLabels: {
      bench: '🔭 분광기 (슬릿 · 회절 격자 · 스크린)', sources: '💡 광원 4종', slit: '🎚 슬릿 폭 · 초점',
      tubes: '⚡ 방전관 4종 · 📏 눈금 커서 · 📋 기록표', unknown: '🕵️ 이름 없는 방전관 · 📋 기준 선 겹치기', absorb: '🧊 차가운 기체 관 · ☀️ 태양 스펙트럼',
    },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 루프 ---------- */
  updateCtl();
  let lastFree = false;
  SciSim.loop((dt, tt) => {
    S.t = tt;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    // 상태 갱신
    const key = curKey();
    if (key !== S.lastKey) { S.lastKey = key; S.rev = 0; PH.length = 0; S.seenT = 0; }
    S.rev += dt;
    S.slit = RM ? S.slitT : SciSim.approach(S.slit, S.slitT, dt, 9);
    S.focus = RM ? S.focusT : SciSim.approach(S.focus, S.focusT, dt, 9);
    S.cell.v = RM ? S.cell.target : SciSim.approach(S.cell.v, S.cell.target, dt, 3.2);
    if (Math.abs(S.cell.v - S.cell.target) < 0.004) S.cell.v = S.cell.target;
    S.cell.flash = Math.max(0, (S.cell.flash || 0) - dt * 4);
    if (S.mode === 'sources') { S.seenT += dt; if (S.seenT > 0.6) S.seen.add(S.src); }
    if (S.mode === 'absorb' && S.sub === 'lab') { if (S.cell.v > 0.95 && S.cmp) S.labDone = true; }
    if (S.sunSeen.size >= 3) S.sunDone = true;
    const spec = curSpec(), G = gains(spec);
    stepPhotons(dt, spec); parts.update(dt);
    // 그리기
    ctx.setTransform(view.scale * view.dpr, 0, 0, view.scale * view.dpr, 0, 0);
    drawBg(tt);
    drawBench(tt, spec, G);
    drawSource(tt, spec);
    drawCell(tt);
    drawStrip(tt, spec, G);
    drawCursor(tt);
    if (S.mode === 'tubes') drawTable(tt, false); else if (S.mode === 'unknown') drawTable(tt, true); else drawInfo(tt, spec);
    drawBanner(tt, spec);
    parts.draw(ctx);
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(11,18,38,' + S.fade * 0.9 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = RM ? 0 : SciSim.approach(S.fade, 0, dt, 8); }
    readouts(spec);
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, L, get game() { return game; }, SPEC, LINES, enterLevel, setMode, setSlit, setCur, recordLine, xOf, nmOf, sharpPct, updateCtl,
    setSub, sigma, TRUTH,
  };
})();
