/* =========================================================
   역학과 에너지 Ⅱ. 열과 에너지 - 엔트로피와 비가역 (6차시)
   성취기준 [12역학02-05] 열의 이동, 기체의 확산과 같은 비가역 현상을 엔트로피를 이용하여 설명할 수 있다.
   ① 관찰: 되돌릴 수 없음 (영상을 정방향·거꾸로 재생, 가역/비가역 판정, 에너지는 두 방향 모두 보존)
   ② 모형: 경우의 수 (칸막이 상자, N = 2~100, 왼쪽 k개의 경우의 수 C(N,k), 모두 한쪽에 있을 확률 2^-N)
   ③ 설명: 엔트로피 (미시 상태 수 W ↑ → S ↑, 열의 이동 ΔS = Q/T, 제2법칙의 정성적 서술)
   ④ 적용: 시나리오 판정 (냉장고, 열기관의 Q_c, 마찰열, 확산)
   볼츠만 분포, 통계적 엔트로피의 일반 식, 정보 엔트로피, 카르노 사이클의 엔트로피, 시간의 화살 논의는 다루지 않아요.
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 480 : 800, VH = PHONE ? 720 : 620;
  const SH = PHONE ? 340 : 350;
  const PX = 10, PY = SH + 6, PW = VW - 20, PH = VH - SH - 16;
  const RM = SciSim.reduceMotion;
  const mark = (b) => (b ? '✅' : '⬜');
  const TAU = Math.PI * 2;
  const MINUS = '−';
  const BG = '#eef2fa';
  const INK = '#26324a', MUTED = '#5a6679';
  const BLUE = '#2563eb', RED = '#e2464b', GREEN = '#14a058', ORANGE = '#f59e0b', PURPLE = '#7c3aed';

  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  if (PHONE) view.canvas.style.touchAction = 'pan-y';
  const D = SciSim.draw(ctx);
  const _dtext = D.text, _dlabel = D.label;
  D.text = (x, y, str, o) => _dtext(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 14) }));
  D.label = (x, y, str, o) => _dlabel(x, y, str, Object.assign({}, o, { size: Math.max(13, (o && o.size) || 13) }));
  const parts = new SciSim.Particles();
  const T = (x, y, s, size, color, align, weight, extra) => D.text(x, y, s, Object.assign({ size, color, align, weight }, extra));
  function panel(x, y, w, h, r, fill) { D.shadow(() => { D.roundRect(x, y, w, h, r || 14); ctx.fillStyle = fill || '#fff'; ctx.fill(); }, { blur: 8, y: 2 }); }
  let hintTimer = 0;
  function showHint(msg, ms) {
    const h = $('#stageHint'); if (!h) return;
    h.textContent = msg; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer = setTimeout(() => h.classList.add('hide'), ms || 3800);
  }
  const approach = (a, b, dt, k) => (RM ? b : SciSim.approach(a, b, dt, k));
  const topCard = () => ({ x: 6, y: 6, w: VW - 12, h: SH - 12 });
  const fN = (v) => { const r = Math.round(v); return (r < 0 ? MINUS : '') + Math.abs(r).toLocaleString('en-US'); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const sup = (s) => String(s).replace(/[-0-9]/g, (c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }[c]));
  function sci(x, d) { if (x === 0) return '0'; const e = Math.floor(Math.log10(Math.abs(x))); let m = x / Math.pow(10, e); if (+m.toFixed(d) >= 10) { m /= 10; return m.toFixed(d) + ' × 10' + sup(e + 1); } return m.toFixed(d) + ' × 10' + sup(e); }
  /* ΔS 표기: 소수 첫째 자리로 딱 떨어지면 한 자리, 아니면 두 자리 (부호 포함) */
  function fd(v, plus) {
    const r = Math.round(v * 100) / 100, one = Math.abs(r * 10 - Math.round(r * 10)) < 1e-9;
    const txt = Math.abs(r).toFixed(one ? 1 : 2);
    return (r < 0 ? MINUS : plus && r > 0 ? '+' : '') + txt;
  }
  const num = (id) => { const v = $('#' + id).value.trim().replace(/[, ]/g, '').replace(/−/g, '-'); return v === '' || !isFinite(+v) ? null : +v; };
  /* 확률 입력: 1/16, 0.0625, 6.25 %, 6.3% 같은 모양을 모두 읽어요 */
  function parseProb(id) {
    let v = $('#' + id).value.trim().replace(/[, ]/g, '').replace(/−/g, '-'); if (v === '') return null;
    if (/%$/.test(v)) { const n = +v.slice(0, -1); return isFinite(n) ? n / 100 : null; }
    if (v.indexOf('/') > 0) { const p = v.split('/'); const a = +p[0], b = +p[1]; return p.length === 2 && isFinite(a) && isFinite(b) && b !== 0 ? a / b : null; }
    const n = +v; return isFinite(n) ? n : null;
  }
  function cardBegin(c, a, b) {
    ctx.save(); D.roundRect(c.x, c.y, c.w, c.h, 12); ctx.clip();
    const g = ctx.createLinearGradient(0, c.y, 0, c.y + c.h); g.addColorStop(0, a || '#f4f7fd'); g.addColorStop(1, b || '#dde5f3'); ctx.fillStyle = g; ctx.fillRect(c.x, c.y, c.w, c.h);
  }
  function wrapLines(str, maxW, size, weight) {
    ctx.save(); ctx.font = D.font(size, weight || 700);
    const out = []; let line = '';
    str.split(' ').forEach((wd) => { const t2 = line ? line + ' ' + wd : wd; if (ctx.measureText(t2).width > maxW && line) { out.push(line); line = wd; } else line = t2; });
    if (line) out.push(line);
    ctx.restore(); return out;
  }
  function para(x, y, str, maxW, size, color, lh, weight, align) {
    const ls = wrapLines(str, maxW, size, weight);
    ls.forEach((l, i) => T(x, y + i * lh, l, size, color, align || 'left', weight || 700));
    return ls.length * lh;
  }
  /* 0을 가운데 두는 막대 (−max .. +max) */
  function dbar(x, y, w, h, val, max, color) {
    D.roundRect(x, y, w, h, h / 2); ctx.fillStyle = '#d3dcec'; ctx.fill();
    const z = x + w / 2, e = z + clamp(val / max, -1, 1) * w / 2;
    ctx.save(); D.roundRect(x, y, w, h, h / 2); ctx.clip(); ctx.fillStyle = color; ctx.fillRect(Math.min(z, e), y, Math.abs(e - z), h); ctx.restore();
    ctx.strokeStyle = '#516079'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(z, y - 3); ctx.lineTo(z, y + h + 3); ctx.stroke();
  }
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ================= 자료 ================= */
  const QJ = 600;                                   // 이동하는 열 (J)
  const VID = [
    { ic: '🕰️', n: '진자의 진동', s: '진자', rev: 1 },
    { ic: '🎱', n: '당구공 충돌 한 번', s: '당구공 충돌', rev: 1 },
    { ic: '🖋️', n: '잉크가 물에 퍼짐', s: '잉크 퍼짐', rev: 2 },
    { ic: '☕', n: '뜨거운 커피가 식음', s: '커피 식음', rev: 2 },
    { ic: '🍵', n: '컵이 깨짐', s: '컵 깨짐', rev: 2 },
    { ic: '🧪', n: '상자 속 기체가 퍼짐', s: '기체 확산', rev: 2 },
  ];
  const J_NAME = ['판정하기', '가역', '비가역'];
  const J_COL = ['#94a3b8', '#2563eb', '#dc2626'];
  const SCN = [
    { ic: '🌸', n: '향수 냄새가 방 전체로 퍼져요', ans: 1 },
    { ic: '🫙', n: '퍼진 향수 냄새가 저절로 병 속으로 되돌아가요', ans: 2 },
    { ic: '🛷', n: '마찰로 미끄러지던 상자가 멈추고 바닥이 따뜻해져요', ans: 1 },
    { ic: '📦', n: '바닥의 열이 저절로 모여 멈춘 상자가 움직여요', ans: 2 },
    { ic: '🧊', n: '냉장고가 일을 받아 안을 식히고 주방으로 열을 내보내요', ans: 1 },
    { ic: '⚙️', n: '열기관이 받은 열을 100 % 일로 바꾸고 열을 버리지 않아요', ans: 2 },
  ];
  const V_NAME = ['❓ 눌러서 판정', '📈 엔트로피 증가 (일어나요)', '🚫 일어나지 않아요'];
  const V_COL = ['#94a3b8', '#15803d', '#b91c1c'];
  const FRIDGE = { Qc: 300, Tin: 270, Qh: 400, Tk: 300 };      // 냉장고: 안쪽에서 300 J, 주방으로 400 J (W = 100 J)
  const ENG = { Qh: 600, Th: 600, W: 200, Qc: 400, Tc: 300 };  // 열기관 예
  const binCache = {};
  function binRow(N) {
    if (binCache[N]) return binCache[N];
    const r = [1]; for (let k = 1; k <= N; k++) r.push(r[k - 1] * (N - k + 1) / k);
    return (binCache[N] = r.map((v) => Math.round(v) === v || v < 1e15 ? Math.round(v) : v));
  }
  const fW = (w) => (w < 1e7 ? Math.round(w).toLocaleString('en-US') : sci(w, 1));
  const pow2 = (N) => Math.pow(2, N);
  function probTxt(N) {
    const p = 1 / pow2(N);
    if (N <= 20) return '1/' + pow2(N).toLocaleString('en-US') + (p >= 5e-4 ? ' ≈ ' + (p * 100).toFixed(1) + ' %' : '');
    return sci(p, 1);
  }

  /* ================= 상태 ================= */
  const S = {
    mode: 'video', clock: 0, fade: 0,
    vid: { sel: 0, rev: false, t: 0, j: [0, 0, 0, 0, 0, 0], revT: [0, 0, 0, 0, 0, 0], com: '' },
    bx: { N: 10, open: false, fast: false, P: [], k: 10, openT: 0, door: 0, hist: [], histT: 0, W: 350, H: 248 },
    ht: { T1: 600, T2: 300, dir: '12', flow: 0 },
    ap: { v: [0, 0, 0, 0, 0, 0], flip: -1, flipT: 1 },
    flags: { judge: false, com: false, prob: false, ds: false, apOK: false },
  };
  let game = null;
  const showCalc = (k) => (game && game.free ? false : S.flags[k]);
  const revealed = (k) => (game && game.free) || S.flags[k];
  const l1 = $('#l1'), l2 = $('#l2'), l3 = $('#l3'), v1 = $('#v1'), v2 = $('#v2'), v3 = $('#v3');
  const MODES = ['video', 'box', 'heat', 'apply'];
  const ALLOWED = [['video'], ['box'], ['heat'], ['apply']];
  function allowedModes() { if (!game || game.free) return MODES; return ALLOWED[clamp(game.level || 0, 0, 3)]; }
  function setScene(mode) { if (S.mode !== mode) { S.fade = 1; parts.clear(); } S.mode = mode; updateCtl(); }
  const setFlag = (k, v) => { S.flags[k] = v; updateCtl(); };

  /* ================= ① 되돌릴 수 없음: 영상 ================= */
  const LOOP = 5.2;
  function vidTau() { const ph = (S.vid.t % LOOP) / LOOP; const f = clamp((ph - 0.08) / 0.84, 0, 1); return S.vid.rev ? 1 - f : f; }
  /* 영상 안의 무작위 배치는 매번 같게 (시드 고정) */
  const RNG = mulberry(7);
  const INKP = [], GASP = [];
  for (let i = 0; i < 70; i++) INKP.push({ sx: (RNG() - 0.5) * 0.12, sy: RNG() * 0.1, ex: RNG() - 0.5, ey: RNG() * 0.9 + 0.05, ph: RNG() * TAU });
  for (let i = 0; i < 30; i++) GASP.push({ lx: RNG() * 0.5, ex: RNG(), ly: RNG(), ey: RNG(), ph: RNG() * TAU });
  const SHARD = [[-0.62, 0.15], [-0.35, -0.1], [-0.1, 0.35], [0.1, -0.2], [0.34, 0.2], [0.58, -0.05], [0.8, 0.3]].map((q, i) => ({ fx: q[0], rot: q[1] * 5 + i, sz: 11 + (i % 3) * 3 }));
  function vidBox(r, a, b) { D.roundRect(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = a || '#fdfefe'; ctx.fill(); }
  function drawPend(r, tau) {
    const cx = r.x + r.w / 2, py = r.y + 18, L = Math.min(r.h * 0.72, r.w * 0.38);
    const th = 0.68 * Math.cos(TAU * 2 * tau);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2.5; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(cx, py, L, Math.PI / 2 - 0.68, Math.PI / 2 + 0.68); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#64748b'; ctx.fillRect(cx - 30, py - 10, 60, 8);
    const bx = cx + L * Math.sin(th), by = py + L * Math.cos(th);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, py - 2); ctx.lineTo(bx, by); ctx.stroke();
    D.sphere(bx, by, 15, '#f26b3a', { gloss: true, shadow: true });
    T(r.x + r.w - 12, r.y + r.h - 12, '마찰 없는 진자', 13, MUTED, 'right', 700);
  }
  function drawBill(r, tau, dir) {
    const cy = r.y + r.h * 0.5, xl = r.x + 54, xr = r.x + r.w - 54, xc = r.x + r.w / 2, rad = 15;
    D.roundRect(r.x + 14, cy - 40, r.w - 28, 80, 14); ctx.fillStyle = '#1f7a4d'; ctx.fill(); ctx.strokeStyle = '#7c4a21'; ctx.lineWidth = 5; ctx.stroke();
    const s1 = clamp((tau - 0.06) / 0.42, 0, 1), s2 = clamp((tau - 0.48) / 0.46, 0, 1);
    const ax = tau < 0.48 ? lerp(xl, xc - rad, s1) : xc - rad, bx = tau < 0.48 ? xc + rad : lerp(xc + rad, xr, s2);
    const aMoving = tau > 0.06 && tau < 0.48, bMoving = tau >= 0.48 && tau < 0.94;
    const arrow = (x, sg) => D.arrow(x - sg * 4, cy - 28, x + sg * 30, cy - 28, { color: '#fde68a', width: 3.5, head: 9 });
    if (aMoving) arrow(ax, dir);
    if (bMoving) arrow(bx, dir);
    D.sphere(ax, cy, rad, '#f8fafc', { gloss: true, shadow: true }); D.sphere(bx, cy, rad, '#dc2626', { gloss: true, shadow: true });
    T(r.x + r.w - 12, r.y + r.h - 10, '공 두 개가 한 번 부딪쳐요', 13, MUTED, 'right', 700);
  }
  function drawInk(r, tau) {
    const gw = Math.min(r.w * 0.55, 220), gh = r.h - 40, gx = r.x + r.w / 2 - gw / 2, gy = r.y + 16;
    const e = sm((tau - 0.05) / 0.9);
    ctx.fillStyle = 'rgba(147,197,253,.45)'; ctx.fillRect(gx, gy + 8, gw, gh - 8);
    ctx.fillStyle = 'rgba(30,27,120,' + (0.34 * e) + ')'; ctx.fillRect(gx, gy + 8, gw, gh - 8);
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
    INKP.forEach((p) => {
      const x = gx + gw / 2 + lerp(p.sx, p.ex, e) * (gw - 24) + Math.sin(S.clock * 1.5 + p.ph) * 2.5 * (0.3 + e);
      const y = gy + 16 + lerp(p.sy, p.ey, e) * (gh - 36);
      ctx.fillStyle = 'rgba(30,27,120,.85)'; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill();
    });
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(gx - 4, gy); ctx.lineTo(gx, gy + 4); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.lineTo(gx + gw, gy + 4); ctx.lineTo(gx + gw + 4, gy); ctx.stroke();
    if (tau < 0.06) { ctx.fillStyle = '#1e1b78'; ctx.beginPath(); ctx.arc(gx + gw / 2, gy - 6, 5, 0, TAU); ctx.fill(); }
    T(r.x + r.w - 12, r.y + r.h - 12, '잉크 한 방울', 13, MUTED, 'right', 700);
  }
  function drawCoffee(r, tau, dir) {
    const p = clamp((tau - 0.05) / 0.9, 0, 1), Tc = 25 + 55 * Math.exp(-3 * p), hot = clamp((Tc - 25) / 55, 0, 1);
    const cx = r.x + r.w / 2, cw = 96, ch = 74, cy = r.y + r.h - 34 - ch;
    D.shadow(() => { D.roundRect(cx - cw / 2, cy, cw, ch, 14); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx + cw / 2 + 4, cy + ch * 0.45, 17, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = SciSim.color.mix('#7c4a21', '#4a2c14', hot); D.roundRect(cx - cw / 2 + 5, cy + 8, cw - 10, ch - 14, 10); ctx.fill();
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(148,163,184,' + (0.7 * hot) + ')'; ctx.lineWidth = 4; ctx.beginPath(); for (let k = 0; k <= 10; k++) { const yy = cy - 4 - k * 4.4, xx = cx - 22 + i * 22 + Math.sin(S.clock * 2 + k * 0.7 + i) * 4; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    const mag = 8 + 22 * hot;
    [[-1, -0.3], [1, -0.3], [0, -1]].forEach(([ux, uy], i) => {
      const bx0 = cx + ux * (cw / 2 + 16) * (i === 2 ? 0 : 1), by0 = cy + ch / 2 + uy * (i === 2 ? ch / 2 + 20 : 0);
      const a = hot > 0.04 ? 1 : 0.3;
      if (i < 2) { const s = i === 0 ? -1 : 1; if (dir > 0) D.arrow(bx0 - s * 8, by0, bx0 + s * mag, by0, { color: 'rgba(239,68,68,' + a + ')', width: 3.5, head: 9 }); else D.arrow(bx0 + s * (mag + 6), by0, bx0 - s * 2, by0, { color: 'rgba(37,99,235,' + a + ')', width: 3.5, head: 9 }); }
    });
    T(cx - cw / 2 - 12, cy + 16, '커피 ' + Math.round(Tc) + ' °C', 14, '#b91c1c', 'right', 800);
    T(cx + cw / 2 + 40, cy + 6, '방 25 °C', 13, '#2563eb', 'left', 800);
    T(r.x + 12, r.y + r.h - 10, dir > 0 ? '열이 컵 밖으로 나가요' : '열이 컵 안으로 들어와요', 13, MUTED, 'left', 700);
  }
  function drawCup(r, tau) {
    const cx = r.x + r.w / 2, fl = r.y + r.h - 26, cw = 52, ch = 58;
    ctx.fillStyle = '#cbd5e1'; ctx.fillRect(r.x + 14, fl, r.w - 28, 5);
    const tb = 0.4;
    if (tau < tb) {
      const u = tau / tb, y0 = r.y + 12, yy = lerp(y0, fl - ch, u * u);
      cup(cx, yy, cw, ch, 1);
    } else {
      const u = clamp((tau - tb) / (1 - tb), 0, 1), ue = 1 - (1 - u) * (1 - u);
      SHARD.forEach((s, i) => {
        const x0 = cx + (i - 3) * 3, x = lerp(x0, cx + s.fx * (r.w * 0.36), ue), y = fl - 8 - Math.sin(Math.PI * Math.min(1, ue * 1.0)) * (36 + (i % 3) * 14) * (1 - 0.3 * ue);
        ctx.save(); ctx.translate(x, y); ctx.rotate(s.rot * ue); ctx.fillStyle = '#f1f5f9'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-s.sz, s.sz * 0.6); ctx.lineTo(0, -s.sz); ctx.lineTo(s.sz, s.sz * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      });
    }
    T(r.x + r.w - 12, r.y + 24, '컵이 바닥에 떨어져요', 13, MUTED, 'right', 700);
    function cup(x, y, w, h) {
      D.shadow(() => { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 2 - 8, y + h); ctx.lineTo(x - w / 2 + 8, y + h); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x + w / 2 + 2, y + h * 0.4, 12, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
  }
  function drawGasV(r, tau) {
    const bw = Math.min(r.w - 60, 330), bh = r.h - 44, bx = r.x + r.w / 2 - bw / 2, by = r.y + 14, e = sm((tau - 0.14) / 0.82);
    ctx.fillStyle = 'rgba(240,246,255,.9)'; ctx.fillRect(bx, by, bw, bh);
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    GASP.forEach((p) => {
      const x = bx + 8 + lerp(p.lx * 0.9, p.ex, e) * (bw - 16) + Math.sin(S.clock * 3 + p.ph) * 3, y = by + 8 + lerp(p.ly, p.ey, e) * (bh - 16) + Math.cos(S.clock * 3 + p.ph) * 3;
      D.sphere(clamp(x, bx + 6, bx + bw - 6), clamp(y, by + 6, by + bh - 6), 5.5, '#3b82f6', { gloss: true });
    });
    ctx.restore();
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.strokeRect(bx, by, bw, bh);
    if (tau < 0.13) { ctx.strokeStyle = 'rgba(71,85,105,' + (tau < 0.08 ? 1 : 1 - (tau - 0.08) / 0.05) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx + bw / 2, by); ctx.lineTo(bx + bw / 2, by + bh); ctx.stroke(); }
    T(r.x + r.w - 12, r.y + r.h - 10, '칸막이가 사라져요', 13, MUTED, 'right', 700);
  }
  const VDRAW = [drawPend, drawBill, drawInk, drawCoffee, drawCup, drawGasV];
  function vidSel(i) { S.vid.sel = i; S.vid.t = 0; Sound.click(); updateCtl(); }
  function vidStep(dt) {
    const v = S.vid; v.t += dt;
    if (S.mode === 'video' && v.rev && v.t > 0.4) v.revT[v.sel] += dt;
  }
  const seenCount = () => S.vid.revT.filter((t) => t >= 1.2).length;
  const judgedCount = () => S.vid.j.filter((x) => x > 0).length;
  function vidLayout() {
    const c = topCard();
    if (PHONE) return { pr: { x: c.x + 6, y: c.y + 30, w: c.w - 12, h: 140 }, items: VID.map((d, i) => ({ x: c.x + 6 + (i % 2) * 227, y: c.y + 178 + Math.floor(i / 2) * 48, w: 221, h: 44 })) };
    return { pr: { x: c.x + 12, y: c.y + 34, w: 500, h: 254 }, items: VID.map((d, i) => ({ x: c.x + 528, y: c.y + 34 + i * 49, w: c.w - 528 - 12, h: 45 })) };
  }
  function drawVideoScene(dt) {
    const c = topCard(), v = S.vid, L = vidLayout(), pr = L.pr;
    cardBegin(c);
    T(c.x + 14, c.y + 22, '영상을 고르고 정방향과 거꾸로 재생해 봐요', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    // 플레이어
    D.shadow(() => vidBox(pr), { blur: 8, y: 2 });
    ctx.save(); D.roundRect(pr.x, pr.y, pr.w, pr.h, 12); ctx.clip();
    const tau = vidTau(), dir = v.rev ? -1 : 1;
    VDRAW[v.sel](pr, tau, dir);
    ctx.restore();
    D.label(pr.x + 14, pr.y + 16, (v.rev ? '◀ 거꾸로 재생' : '▶ 정방향 재생'), { bg: v.rev ? '#7c3aed' : '#2563eb', size: 13, align: 'left' });
    // 시간 막대
    const ph = (v.t % LOOP) / LOOP;
    ctx.fillStyle = 'rgba(100,116,139,.25)'; ctx.fillRect(pr.x + 12, pr.y + pr.h - 6, pr.w - 24, 3);
    ctx.fillStyle = v.rev ? '#7c3aed' : '#2563eb';
    ctx.fillRect(v.rev ? pr.x + pr.w - 12 - (pr.w - 24) * ph : pr.x + 12, pr.y + pr.h - 6, (pr.w - 24) * ph, 3);
    // 목록
    L.items.forEach((it, i) => {
      const sel = v.sel === i, j = v.j[i];
      D.shadow(() => { D.roundRect(it.x, it.y, it.w, it.h, 11); ctx.fillStyle = sel ? '#fff7ed' : '#fff'; ctx.fill(); }, { blur: 4, y: 1 });
      if (sel) { ctx.strokeStyle = '#f26b3a'; ctx.lineWidth = 2.5; D.roundRect(it.x, it.y, it.w, it.h, 11); ctx.stroke(); }
      T(it.x + 24, it.y + it.h / 2 + 8, VID[i].ic, PHONE ? 20 : 22, INK, 'center', 700);
      T(it.x + 44, it.y + it.h / 2 + 5, PHONE ? VID[i].s : VID[i].n, PHONE ? 13.5 : 14, INK, 'left', 800);
      const seen = v.revT[i] >= 1.2;
      D.label(it.x + it.w - 8, it.y + it.h / 2 + 1, j ? J_NAME[j] : (seen ? '거꾸로 ✓' : '?'), { bg: j ? J_COL[j] : seen ? '#64748b' : '#cbd5e1', color: j || seen ? '#fff' : '#475569', size: 13, align: 'right', pad: 7 });
    });
    ctx.restore();
    // 아래: 에너지는 두 방향 모두 보존돼요
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16, w1 = PW - 32;
    T(x1, PY + 28, '⚖️ 에너지는 정방향에서도, 거꾸로 틀어도 보존돼요', PHONE ? 13.5 : 15, INK, 'left', 800);
    [['▶ 정방향', BLUE], ['◀ 거꾸로', PURPLE]].forEach(([n, col], i) => {
      const yy = PY + 48 + i * 34;
      T(x1, yy + 14, n, 14, col, 'left', 800);
      D.roundRect(x1 + 86, yy, w1 - 86 - 120, 18, 9); ctx.fillStyle = col; ctx.fill();
      T(x1 + 86 + 10, yy + 14, '에너지의 합 = 일정', 13, '#fff', 'left', 800);
      T(x1 + w1, yy + 14, '100 %', 14, col, 'right', 800);
    });
    para(x1, PY + 132, '두 방향 모두 에너지는 그대로예요. 그래서 에너지 보존(제1법칙)만으로는 "어느 쪽이 자연스러운가"를 알 수 없어요.', w1, PHONE ? 13.5 : 14, '#c2410c', 20, 800);
    // 내 판정
    const jy = PY + (PHONE ? 196 : 176);
    T(x1, jy, '내 판정', 14, MUTED, 'left', 800);
    const cw = (w1 - 5 * 6) / 6;
    VID.forEach((d, i) => {
      const xx = x1 + i * (cw + 6), j = v.j[i];
      D.roundRect(xx, jy + 10, cw, PHONE ? 62 : 52, 10); ctx.fillStyle = j ? SciSim.color.rgba(J_COL[j], 0.12) : '#f4f7fd'; ctx.fill(); ctx.strokeStyle = j ? J_COL[j] : '#dde4f0'; ctx.lineWidth = 1.5; ctx.stroke();
      T(xx + cw / 2, jy + 36, d.ic, PHONE ? 20 : 24, INK, 'center', 700);
      T(xx + cw / 2, jy + (PHONE ? 62 : 62), j ? J_NAME[j] : '?', 13, j ? J_COL[j] : '#94a3b8', 'center', 800);
    });
    if (revealed('judge') && judgedCount() === 6) { /* 정답 확인 표시는 미션에서 */ }
  }

  /* ================= ② 경우의 수: 칸막이 상자 ================= */
  const RB = 6;
  function boxGeom() { const c = topCard(); return PHONE ? { x: c.x + 8, y: c.y + 34, w: c.w - 16, h: 118 } : { x: c.x + 14, y: c.y + 40, w: 350, h: 252 }; }
  function boxInit(N) {
    const b = S.bx, g = boxGeom(); b.N = N != null ? N : b.N; b.W = g.w; b.H = g.h; b.P = [];
    for (let i = 0; i < b.N; i++) { const th = Math.random() * TAU, sp = 0.75 + 0.5 * Math.random(); b.P.push({ x: RB + 3 + Math.random() * (g.w / 2 - 2 * RB - 8), y: RB + Math.random() * (g.h - 2 * RB), ux: Math.cos(th) * sp, uy: Math.sin(th) * sp, side: 0 }); }
    b.open = false; b.openT = 0; b.door = 0; b.hist = []; b.histT = 0; b.k = b.N; parts.clear();
  }
  function boxSetOpen(open) {
    const b = S.bx, mid = b.W / 2;
    if (!open) b.P.forEach((p) => { p.side = p.x < mid ? 0 : 1; if (p.side === 0 && p.x > mid - RB - 2) p.x = mid - RB - 2; if (p.side === 1 && p.x < mid + RB + 2) p.x = mid + RB + 2; });
    b.open = open; if (open) b.openT = 0; Sound.click(); updateCtl();
  }
  function boxStep(dt) {
    const b = S.bx; const mult = b.fast ? 4 : 1, g = b.W, h = b.H, mid = g / 2, spd = (PHONE ? 75 : 95);
    const n = Math.max(1, Math.ceil(dt * mult / 0.02)), d = dt * mult / n;
    for (let s = 0; s < n; s++) {
      b.P.forEach((p) => {
        p.x += p.ux * spd * d; p.y += p.uy * spd * d;
        if (p.y < RB) { p.y = RB; p.uy = Math.abs(p.uy); } else if (p.y > h - RB) { p.y = h - RB; p.uy = -Math.abs(p.uy); }
        let lo = RB, hi = g - RB;
        if (!b.open) { if (p.side === 0) hi = mid - RB - 2; else lo = mid + RB + 2; }
        if (p.x < lo) { p.x = lo; p.ux = Math.abs(p.ux); } else if (p.x > hi) { p.x = hi; p.ux = -Math.abs(p.ux); }
      });
      if (b.open) b.openT += d;
      b.histT += d;
      if (b.histT >= 0.3) { b.histT -= 0.3; b.hist.push(b.P.filter((p) => p.x < mid).length / b.N); if (b.hist.length > 100) b.hist.shift(); }
    }
    b.k = b.P.filter((p) => p.x < mid).length;
    b.door = approach(b.door, b.open ? 1 : 0, dt, 5);
  }
  function drawBars(rc, N, k) {
    const row = binRow(N), mx = Math.max.apply(null, row);
    const top = rc.y + (N > 10 ? (PHONE ? 52 : 56) : (PHONE ? 30 : 46)), base = rc.y + rc.h - (PHONE ? 38 : 44), ix = rc.x + 10, iw = rc.w - 20;
    T(rc.x + 10, rc.y + 20, '왼쪽에 ' + (PHONE ? '' : '분자가 ') + 'k개 있는 경우의 수 W(k)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    const bw = Math.min(iw / (N + 1), 64), gap = N <= 30 ? Math.min(6, bw * 0.15) : 0, x0 = ix + (iw - bw * (N + 1)) / 2;
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ix - 2, base); ctx.lineTo(ix + iw + 2, base); ctx.stroke();
    const step = bw >= 30 ? 1 : bw >= 14 ? 2 : bw >= 6 ? 5 : 10;
    for (let i = 0; i <= N; i++) {
      const hh = (base - top) * row[i] / mx, xx = x0 + i * bw;
      const cur = i === k;
      ctx.fillStyle = cur ? ORANGE : (i === Math.round(N / 2) ? '#60a5fa' : '#93c5fd');
      if (hh > 0.4) ctx.fillRect(xx + gap / 2, base - hh, Math.max(1, bw - gap), hh);
      if (N <= 10) T(xx + bw / 2, base - hh - 5, fW(row[i]), 13, cur ? '#b45309' : '#1e3a8a', 'center', 800);
      if (i % step === 0 || i === N) T(xx + bw / 2, base + 17, String(i), 13, cur ? '#b45309' : '#3a465c', 'center', 800);
      if (cur) { ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.moveTo(xx + bw / 2, base - Math.max(hh, 2) - (N <= 10 ? 24 : 8)); ctx.lineTo(xx + bw / 2 - 7, base - Math.max(hh, 2) - (N <= 10 ? 36 : 20)); ctx.lineTo(xx + bw / 2 + 7, base - Math.max(hh, 2) - (N <= 10 ? 36 : 20)); ctx.closePath(); ctx.fill(); }
    }
    T(rc.x + rc.w / 2, rc.y + rc.h - 4, '왼쪽에 있는 분자 수 k', 13, MUTED, 'center', 700);
    if (N > 10) T(rc.x + 10, rc.y + 40, '가장 많은 경우: k = ' + Math.round(N / 2) + '일 때 W = ' + fW(mx), 13, '#1e3a8a', 'left', 800);
  }
  function drawBoxScene(dt) {
    const c = topCard(), b = S.bx, g = boxGeom(), mid = g.x + g.w / 2;
    cardBegin(c);
    T(g.x, c.y + 24, '칸막이 상자 (분자 ' + b.N + '개)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    // 상자
    ctx.fillStyle = 'rgba(240,246,255,.95)'; ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip();
    b.P.forEach((p) => D.sphere(g.x + p.x, g.y + p.y, RB, '#3b82f6', { gloss: true }));
    ctx.restore();
    // 칸막이 (열면 위로 올라가요)
    if (b.door < 0.98) { const dh = g.h * (1 - b.door); D.shadow(() => { ctx.fillStyle = '#64748b'; ctx.fillRect(mid - 3, g.y, 6, dh); }, { blur: 3, y: 0 }); }
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 4; ctx.strokeRect(g.x, g.y, g.w, g.h);
    D.label(g.x + g.w / 4, g.y + g.h + 17, '왼쪽 ' + b.k + '개', { bg: '#1d4ed8', size: 13 });
    D.label(g.x + g.w * 3 / 4, g.y + g.h + 17, '오른쪽 ' + (b.N - b.k) + '개', { bg: '#475569', size: 13 });
    const rc = PHONE ? { x: c.x + 4, y: c.y + g.h + 66, w: c.w - 8, h: c.h - g.h - 70 } : { x: c.x + 384, y: c.y + 30, w: c.w - 384 - 8, h: c.h - 36 };
    D.roundRect(rc.x, rc.y, rc.w, rc.h, 10); ctx.fillStyle = '#fff'; ctx.fill();
    drawBars(rc, b.N, b.k);
    ctx.restore();
    // 아래: 시간에 따른 왼쪽 비율 + 숫자
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14, gw = PHONE ? PW - 28 : 372, gh = PHONE ? 110 : 150, gy = PY + 40;
    T(x1, PY + 26, '시간에 따른 왼쪽 분자의 비율 (k / N)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    const gx0 = x1 + 34, gx1 = x1 + gw - 6, gyb = gy + gh, gyt = gy + 4;
    ctx.strokeStyle = '#e1e7f2'; ctx.lineWidth = 1; [0, 0.5, 1].forEach((v) => { const yy = gyb - (gyb - gyt) * v; ctx.beginPath(); ctx.moveTo(gx0, yy); ctx.lineTo(gx1, yy); ctx.stroke(); T(gx0 - 5, yy + 5, v === 0.5 ? '0.5' : String(v), 13, MUTED, 'right', 700); });
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(245,158,11,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx0, gyb - (gyb - gyt) * 0.5); ctx.lineTo(gx1, gyb - (gyb - gyt) * 0.5); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#8a95a8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx0, gyt - 2); ctx.lineTo(gx0, gyb); ctx.lineTo(gx1, gyb); ctx.stroke();
    const H = b.hist;
    if (H.length > 1) { ctx.strokeStyle = BLUE; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); H.forEach((v, i) => { const xx = gx1 - (H.length - 1 - i) * ((gx1 - gx0) / 100), yy = gyb - (gyb - gyt) * v; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }); ctx.stroke(); }
    T(gx1, gyb + 17, '시간 →', 13, MUTED, 'right', 700);
    // 숫자 정보
    const tx = PHONE ? x1 : x1 + gw + 24, tw = PHONE ? PW - 28 : PW - gw - 52, ty0 = PHONE ? gy + gh + 40 : PY + 26, lh = PHONE ? 22 : 26;
    const row = binRow(b.N), Wk = row[b.k], hide = showCalc('prob');
    const lines = [
      ['지금: 왼쪽 ' + b.k + '개, 오른쪽 ' + (b.N - b.k) + '개', INK],
      ['이 상태의 경우의 수 W = ' + fW(Wk), '#1d4ed8'],
      ['전체 경우의 수 2' + sup(b.N) + ' = ' + (b.N <= 20 ? pow2(b.N).toLocaleString('en-US') : sci(pow2(b.N), 1)), INK],
      ['모두 왼쪽일 확률 = ' + (hide ? '?' : probTxt(b.N)), hide ? ORANGE : '#b91c1c'],
    ];
    lines.forEach((l, i) => T(tx, ty0 + i * lh, l[0], PHONE ? 13.5 : 14.5, l[1], 'left', 800));
    para(tx, ty0 + 4 * lh + 6, b.open ? (b.N <= 10 ? '분자가 적으면 가끔 한쪽으로 쏠리기도 해요.' : '분자가 많을수록 거의 5 : 5 근처에만 머물러요.') : '칸막이를 열면 분자가 퍼져 나가요.', tw, 13.5, MUTED, 19, 700);
  }

  /* ================= ③ 엔트로피 ================= */
  const tcol = (TK) => SciSim.color.mix('#4aa3ff', '#ff5a4a', clamp((TK - 200) / 600, 0, 1));
  function htCalc() {
    const h = S.ht, a = h.dir === '12' ? { T: h.T1, n: 1 } : { T: h.T2, n: 2 }, bb = h.dir === '12' ? { T: h.T2, n: 2 } : { T: h.T1, n: 1 };
    const dDon = -QJ / a.T, dRec = QJ / bb.T;
    return { don: a.n, rec: bb.n, Td: a.T, Tr: bb.T, dDon, dRec, tot: dDon + dRec, d1: a.n === 1 ? dDon : dRec, d2: a.n === 2 ? dDon : dRec };
  }
  const verdict = (tot) => (Math.abs(tot) < 0.005 ? 0 : tot > 0 ? 1 : -1);
  function diffusionPic(x, y, w, h) {
    const rng = mulberry(31);
    [[0, '모두 왼쪽', 'W = 1', false], [1, '고르게 퍼짐', 'W = 252 (5 : 5)', true]].forEach(([i, n, wt, spread]) => {
      const bw = (w - 52) / 2, bx = x + i * (bw + 52);
      ctx.fillStyle = '#fff'; ctx.fillRect(bx, y, bw, h);
      for (let k = 0; k < 10; k++) { const px = spread ? rng() : rng() * 0.46, py = rng(); D.sphere(bx + 8 + px * (bw - 16) * (spread ? 1 : 1), y + 8 + py * (h - 16), 5.5, '#3b82f6', { gloss: true }); }
      ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3; ctx.strokeRect(bx, y, bw, h);
      if (!spread) { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx + bw / 2, y); ctx.lineTo(bx + bw / 2, y + h); ctx.stroke(); }
      T(bx + bw / 2, y + h + 18, n, 13.5, INK, 'center', 800);
      T(bx + bw / 2, y + h + 38, wt, 14, i ? '#15803d' : '#b91c1c', 'center', 800);
    });
    D.arrow(x + (w - 52) / 2 + 6, y + h / 2, x + (w - 52) / 2 + 46, y + h / 2, { color: '#f26b3a', width: 4, head: 10 });
  }
  function heatPic(rc, dt) {
    const h = S.ht, cc = htCalc(), hideCalc = showCalc('ds');
    const bw = PHONE ? 100 : 116, bh = PHONE ? 70 : 84, y0 = rc.y + (PHONE ? 38 : 44);
    const xa = rc.x + 10, xb = rc.x + rc.w - 10 - bw;
    const objs = [{ x: xa, T: h.T1, n: 1 }, { x: xb, T: h.T2, n: 2 }];
    objs.forEach((o) => {
      D.shadow(() => { D.roundRect(o.x, y0, bw, bh, 14); const g = ctx.createLinearGradient(0, y0, 0, y0 + bh); g.addColorStop(0, SciSim.color.shade(tcol(o.T), 0.25)); g.addColorStop(1, tcol(o.T)); ctx.fillStyle = g; ctx.fill(); }, { blur: 7, y: 3 });
      T(o.x + bw / 2, y0 + bh / 2 - 4, '물체 ' + o.n, 15, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 });
      T(o.x + bw / 2, y0 + bh / 2 + 18, o.T + ' K', 15, '#fff', 'center', 800, { stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 });
    });
    // 열 화살표
    const donX = cc.don === 1 ? xa + bw : xb, recX = cc.don === 1 ? xb : xa + bw, ay = y0 + bh / 2, ok = verdict(cc.tot) >= 0;
    const sgn = cc.don === 1 ? 1 : -1;
    D.arrow(donX + sgn * 6, ay, recX - sgn * 6, ay, { color: ok ? 'rgba(239,68,68,.9)' : 'rgba(148,163,184,.9)', width: 6, head: 14, dash: ok ? null : [8, 6] });
    D.label((xa + bw + xb) / 2, ay - 22, 'Q = ' + QJ + ' J', { bg: ok ? RED : '#64748b', size: 13 });
    if (!ok) { T((xa + bw + xb) / 2, ay + 36, '🚫', 26, INK, 'center', 700); }
    else if (!RM) { h.flow = (h.flow + dt * 0.9) % 1; for (let i = 0; i < 4; i++) { const f = (h.flow + i / 4) % 1; const px = lerp(donX + sgn * 10, recX - sgn * 10, f); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.arc(px, ay, 3.5, 0, TAU); ctx.fill(); } }
    // ΔS 막대
    const by = y0 + bh + (PHONE ? 38 : 46), bww = bw + 20;
    [[xa - 10, cc.d1, 1], [xb - 10, cc.d2, 2]].forEach(([bx, v, n]) => {
      T(bx + bww / 2, by - 8, 'ΔS' + (n === 1 ? '₁' : '₂') + ' = ' + (hideCalc ? '?' : fd(v, true) + ' J/K'), PHONE ? 13.5 : 14.5, hideCalc ? ORANGE : v < 0 ? '#1d4ed8' : '#b91c1c', 'center', 800);
      dbar(bx, by, bww, 14, hideCalc ? 0 : v, 3, v < 0 ? '#2563eb' : '#e2464b');
    });
    // 합
    const ty = by + (PHONE ? 52 : 62), tw = rc.w - 40;
    T(rc.x + rc.w / 2, ty - 10, '합 ΔS = ΔS₁ + ΔS₂ = ' + (hideCalc ? '?' : fd(cc.tot, true) + ' J/K'), PHONE ? 14 : 15.5, hideCalc ? ORANGE : cc.tot > 0.005 ? '#15803d' : cc.tot < -0.005 ? '#b91c1c' : '#1d4ed8', 'center', 800);
    dbar(rc.x + 20, ty, tw, 16, hideCalc ? 0 : cc.tot, 3, cc.tot >= 0 ? GREEN : '#e2464b');
    const vd = verdict(cc.tot);
    if (!hideCalc) D.label(rc.x + rc.w / 2, ty + (PHONE ? 38 : 44), vd > 0 ? '합 > 0 → 저절로 일어나요' : vd < 0 ? '합 < 0 → 저절로 일어나지 않아요' : '합 = 0 → 열평형 (더 이상 변하지 않아요)', { bg: vd > 0 ? '#15803d' : vd < 0 ? '#dc2626' : '#2563eb', size: 13.5 });
    else D.label(rc.x + rc.w / 2, ty + (PHONE ? 38 : 44), '합의 부호를 계산해 보세요', { bg: '#64748b', size: 13.5 });
  }
  function drawHeatScene(dt) {
    const c = topCard(), cc = htCalc(), hideCalc = showCalc('ds');
    cardBegin(c);
    if (!PHONE) {
      T(c.x + 14, c.y + 26, '🌫️ 확산: 퍼질수록 경우의 수가 많아져요', 14.5, INK, 'left', 800);
      diffusionPic(c.x + 18, c.y + 46, 346, 100);
      para(c.x + 18, c.y + 204, '분자 10개의 전체 경우의 수는 2¹⁰ = 1 024개예요. 모여 있는 상태는 1가지뿐이지만, 고르게 퍼진 상태에는 훨씬 더 많은 경우(5 : 5는 252가지)가 있어요.', 346, 13.5, MUTED, 19, 700);
      D.roundRect(c.x + 18, c.y + 288, 346, 38, 10); ctx.fillStyle = '#fef3c7'; ctx.fill();
      T(c.x + 191, c.y + 313, '경우의 수 W ↑  →  엔트로피 S ↑', 15, '#92400e', 'center', 800);
      ctx.strokeStyle = '#d5deec'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x + 380, c.y + 16); ctx.lineTo(c.x + 380, c.y + c.h - 16); ctx.stroke();
      T(c.x + 396, c.y + 26, '🔥 열의 이동: ΔS = Q / T', 14.5, INK, 'left', 800);
      heatPic({ x: c.x + 386, y: c.y + 20, w: c.w - 386 - 10, h: c.h - 24 }, dt);
    } else {
      T(c.x + 12, c.y + 24, '🔥 열의 이동: ΔS = Q / T', 14, INK, 'left', 800);
      heatPic({ x: c.x + 4, y: c.y + 14, w: c.w - 8, h: c.h - 18 }, dt);
    }
    ctx.restore();
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 16;
    if (!PHONE) {
      T(x1, PY + 28, '🧮 두 물체의 엔트로피 변화', 15, INK, 'left', 800);
      const q = hideCalc ? '?' : null;
      T(x1, PY + 62, '열을 잃은 물체 ' + cc.don + ': ΔS = ' + MINUS + 'Q / T = ' + MINUS + QJ + ' / ' + cc.Td + ' = ' + (q || fd(cc.dDon, true)) + ' J/K', 15, '#1d4ed8', 'left', 800);
      T(x1, PY + 92, '열을 받은 물체 ' + cc.rec + ': ΔS = +Q / T = +' + QJ + ' / ' + cc.Tr + ' = ' + (q || fd(cc.dRec, true)) + ' J/K', 15, '#b91c1c', 'left', 800);
      T(x1, PY + 126, '합: ΔS = ' + (q || fd(cc.tot, true)) + ' J/K', 17, q ? ORANGE : cc.tot > 0.005 ? '#15803d' : cc.tot < -0.005 ? '#b91c1c' : '#1d4ed8', 'left', 800);
      para(x1, PY + 160, '열을 받은 쪽은 +, 준 쪽은 −예요. 낮은 온도일수록 같은 열에도 엔트로피가 더 크게 늘어서, 고온 → 저온이면 합이 +가 돼요.', 420, 13.5, MUTED, 19, 700);
      const kx = x1 + 456, kw = PW - 456 - 32;
      D.roundRect(kx, PY + 14, kw, PH - 28, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill(); ctx.strokeStyle = '#dde4f0'; ctx.lineWidth = 1.5; ctx.stroke();
      T(kx + 12, PY + 38, '📜 열역학 제2법칙 (정성적)', 14.5, INK, 'left', 800);
      para(kx + 12, PY + 66, '고립계에서 저절로 일어나는 변화는 엔트로피가 증가하는 방향이에요.', kw - 24, 14, '#14532d', 20, 800);
      para(kx + 12, PY + 130, '에너지의 총량은 그대로이고(제1법칙), 엔트로피는 변화의 방향을 알려 줘요.', kw - 24, 13.5, MUTED, 19, 700);
      para(kx + 12, PY + 192, '엔트로피가 커진다는 것은 에너지가 늘어난다는 뜻이 아니에요.', kw - 24, 13.5, '#b45309', 19, 800);
    } else {
      T(x1, PY + 26, '🌫️ 확산: 퍼질수록 경우의 수가 많아져요', 13.5, INK, 'left', 800);
      diffusionPic(PX + 28, PY + 40, PW - 56, 74);
      D.roundRect(x1, PY + 168, PW - 32, 34, 10); ctx.fillStyle = '#fef3c7'; ctx.fill();
      T(PX + PW / 2, PY + 191, '경우의 수 W ↑  →  엔트로피 S ↑', 14.5, '#92400e', 'center', 800);
      const q = hideCalc ? '?' : null;
      T(x1, PY + 228, '열을 잃은 쪽: ΔS = ' + MINUS + QJ + ' / ' + cc.Td + ' = ' + (q || fd(cc.dDon, true)) + ' J/K', 13.5, '#1d4ed8', 'left', 800);
      T(x1, PY + 252, '열을 받은 쪽: ΔS = +' + QJ + ' / ' + cc.Tr + ' = ' + (q || fd(cc.dRec, true)) + ' J/K', 13.5, '#b91c1c', 'left', 800);
      para(x1, PY + 284, '📜 제2법칙: 고립계에서 저절로 일어나는 변화는 엔트로피가 증가하는 방향이에요.', PW - 32, 13.5, '#14532d', 19, 800);
      para(x1, PY + 330, '엔트로피가 커진다고 에너지가 늘어나는 것은 아니에요.', PW - 32, 13.5, '#b45309', 19, 800);
    }
  }

  /* ================= ④ 적용 ================= */
  function apLayout() {
    const c = topCard(), cols = PHONE ? 2 : 3, rows = PHONE ? 3 : 2;
    const gw = (c.w - 16 - (cols - 1) * 8) / cols, gh = PHONE ? 92 : 142, y0 = c.y + (PHONE ? 32 : 34);
    return { cols, gw, gh, y0, x0: c.x + 8 };
  }
  const apOK = (i) => S.ap.v[i] === SCN[i].ans;
  function apTap(p) {
    const L = apLayout();
    for (let i = 0; i < 6; i++) {
      const x = L.x0 + (i % L.cols) * (L.gw + 8), y = L.y0 + Math.floor(i / L.cols) * (L.gh + 8);
      if (p.x >= x && p.x <= x + L.gw && p.y >= y && p.y <= y + L.gh) { S.ap.v[i] = (S.ap.v[i] + 1) % 3; S.ap.flip = i; S.ap.flipT = 0; Sound.click(); updateCtl(); return; }
    }
  }
  function drawApplyScene(dt) {
    const c = topCard(), L = apLayout(), ap = S.ap, done = revealed('apOK');
    cardBegin(c);
    const n = ap.v.filter((v) => v > 0).length;
    T(c.x + 14, c.y + 22, PHONE ? '카드를 눌러 판정해요 (' + n + ' / 6)' : '카드를 눌러 "엔트로피 증가(일어나요)"와 "일어나지 않아요"를 판정해요 (' + n + ' / 6)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    ap.flipT += dt;
    for (let i = 0; i < 6; i++) {
      const d = SCN[i], x = L.x0 + (i % L.cols) * (L.gw + 8), y = L.y0 + Math.floor(i / L.cols) * (L.gh + 8), v = ap.v[i];
      const pop = ap.flip === i && ap.flipT < 0.3 ? 1 + 0.05 * Math.sin(ap.flipT / 0.3 * Math.PI) : 1;
      ctx.save(); ctx.translate(x + L.gw / 2, y + L.gh / 2); ctx.scale(pop, pop); ctx.translate(-(x + L.gw / 2), -(y + L.gh / 2));
      D.shadow(() => { D.roundRect(x, y, L.gw, L.gh, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6, y: 2 });
      if (v > 0) { ctx.strokeStyle = V_COL[v]; ctx.lineWidth = 2.5; D.roundRect(x, y, L.gw, L.gh, 12); ctx.stroke(); }
      if (done && v > 0) { ctx.strokeStyle = apOK(i) ? 'rgba(20,160,88,.85)' : 'rgba(226,70,75,.85)'; ctx.lineWidth = 4; D.roundRect(x - 1, y - 1, L.gw + 2, L.gh + 2, 13); ctx.stroke(); }
      if (PHONE) {
        T(x + 22, y + 34, d.ic, 24, INK, 'center', 700);
        para(x + 42, y + 24, d.n, L.gw - 50, 13, INK, 16, 800);
        T(x + 10, y + L.gh - 12, V_NAME[v].replace(' (일어나요)', ''), 13, v ? V_COL[v] : '#9aa6bd', 'left', 800);
      } else {
        T(x + L.gw / 2, y + 36, d.ic, 30, INK, 'center', 700);
        para(x + L.gw / 2, y + 58, d.n, L.gw - 20, 13.5, INK, 18, 800, 'center');
        D.roundRect(x + 10, y + L.gh - 34, L.gw - 20, 26, 13); ctx.fillStyle = v ? SciSim.color.rgba(V_COL[v], 0.12) : '#eef2fa'; ctx.fill();
        T(x + L.gw / 2, y + L.gh - 16, V_NAME[v], 13.5, v ? V_COL[v] : '#8794ab', 'center', 800);
      }
      ctx.restore();
    }
    ctx.restore();
    // 아래: 냉장고, 열기관의 엔트로피 합
    panel(PX, PY, PW, PH, 16);
    const x1 = PX + 14, bw = PHONE ? PW - 28 : (PW - 28 - 14) / 2, bh = PHONE ? 158 : PH - 24;
    const dIn = -FRIDGE.Qc / FRIDGE.Tin, dK = FRIDGE.Qh / FRIDGE.Tk, dT = dIn + dK;
    let bx = x1, by = PY + 12;
    D.roundRect(bx, by, bw, bh, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    T(bx + 12, by + 26, '🧊 냉장고 (일 W = 100 J을 받아요)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    T(bx + 12, by + 56, '안쪽 ' + FRIDGE.Tin + ' K에서 열 ' + FRIDGE.Qc + ' J을 퍼냄: ' + fd(dIn, true) + ' J/K', PHONE ? 13 : 14, '#1d4ed8', 'left', 800);
    T(bx + 12, by + 82, '주방 ' + FRIDGE.Tk + ' K으로 열 ' + FRIDGE.Qh + ' J을 내보냄: ' + fd(dK, true) + ' J/K', PHONE ? 13 : 14, '#b91c1c', 'left', 800);
    T(bx + 12, by + 112, '합 ΔS = ' + fd(dT, true) + ' J/K > 0  → 일어나요', PHONE ? 14 : 15, '#15803d', 'left', 800);
    if (!PHONE) para(bx + 12, by + 140, '안쪽의 엔트로피는 줄지만 주방이 더 크게 늘어요. 전체로는 증가해요.', bw - 24, 13.5, MUTED, 19, 700);
    if (PHONE) { bx = x1; by = PY + 12 + bh + 10; } else { bx = x1 + bw + 14; by = PY + 12; }
    D.roundRect(bx, by, bw, PHONE ? 170 : bh, 12); ctx.fillStyle = '#f4f7fd'; ctx.fill();
    const e1 = -ENG.Qh / ENG.Th, e2 = ENG.Qc / ENG.Tc;
    T(bx + 12, by + 26, '⚙️ 열기관 (고온 ' + ENG.Th + ' K, 저온 ' + ENG.Tc + ' K)', PHONE ? 13.5 : 14.5, INK, 'left', 800);
    T(bx + 12, by + 54, '열 ' + ENG.Qh + ' J을 모두 일로: ΔS = ' + fd(e1, true) + ' J/K < 0  → 불가능', PHONE ? 13 : 14, '#b91c1c', 'left', 800);
    T(bx + 12, by + 80, '일 ' + ENG.W + ' J + 버리는 열 ' + ENG.Qc + ' J:', PHONE ? 13 : 14, INK, 'left', 800);
    T(bx + 12, by + 104, 'ΔS = ' + fd(e1, true) + ' + ' + fd(e2, true) + ' = ' + fd(e1 + e2, true) + ' J/K > 0  → 가능', PHONE ? 13.5 : 14.5, '#15803d', 'left', 800);
    para(bx + 12, by + 132, '열기관이 Q_c를 버려야 하는 까닭이에요. 저온 열원의 엔트로피가 늘어야 합이 +가 돼요.', bw - 24, 13.5, MUTED, 19, 700);
  }

  /* ================= 컨트롤 연결 ================= */
  const setSl = (id, v, mn, mx) => { const sl = $('#' + id); if (+sl.value !== v) sl.value = v; sl.style.setProperty('--pct', ((v - mn) / (mx - mn) * 100) + '%'); };
  function updateCtl() {
    const modes = allowedModes();
    $$('#ctrlCard [data-modes]').forEach((n) => {
      let on = n.getAttribute('data-modes').split(' ').indexOf(S.mode) >= 0;
      if (on) { const c = n.getAttribute('data-calc'); if (c && !showCalc(c)) on = false; }
      n.hidden = !on;
    });
    $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === S.mode); b.hidden = modes.indexOf(b.dataset.mode) < 0; });
    $('.stage-toolbar').hidden = modes.length < 2;
    const v = S.vid;
    $$('#vDir button').forEach((b) => b.classList.toggle('on', b.dataset.d === (v.rev ? 'r' : 'f')));
    $('#nVd').textContent = '지금 보는 영상: ' + VID[v.sel].n + ' (거꾸로 본 영상 ' + seenCount() + ' / 6)';
    $('#jHead').textContent = '🧐 "' + VID[v.sel].n + '"을(를) 판정해요';
    $('#bJ1').classList.toggle('btn-primary', v.j[v.sel] === 1); $('#bJ2').classList.toggle('btn-primary', v.j[v.sel] === 2);
    if ($('#sCom').value !== v.com) $('#sCom').value = v.com;
    const b = S.bx;
    $('#oN').textContent = b.N + '개'; setSl('sN', b.N, 2, 100);
    $('#bOpen').textContent = b.open ? '🚪 칸막이 닫기' : '🚪 칸막이 열기'; $('#bOpen').classList.toggle('btn-primary', !b.open);
    $('#bFast').textContent = b.fast ? '⏩ 보통 속도로' : '⏩ 빠르게 (4배)'; $('#bFast').classList.toggle('btn-primary', b.fast);
    $('#nBx').textContent = b.open ? '칸막이를 연 지 ' + Math.floor(b.openT) + '초 지났어요.' : '분자가 모두 왼쪽에 모여 있어요. 칸막이를 열어 보세요.';
    const h = S.ht;
    $('#oT1').textContent = h.T1 + ' K'; setSl('sT1', h.T1, 200, 800); $('#oT2').textContent = h.T2 + ' K'; setSl('sT2', h.T2, 200, 800);
    $$('#hDir button').forEach((bb) => bb.classList.toggle('on', bb.dataset.d === h.dir));
  }
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.mode); }));
  $$('#vDir button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.vid.rev = b.dataset.d === 'r'; S.vid.t = 0; updateCtl(); }));
  $('#bJ1').addEventListener('click', () => { Sound.click(); S.vid.j[S.vid.sel] = 1; updateCtl(); });
  $('#bJ2').addEventListener('click', () => { Sound.click(); S.vid.j[S.vid.sel] = 2; updateCtl(); });
  $('#sCom').addEventListener('change', (e) => { S.vid.com = e.target.value; e.target.classList.remove('ok', 'bad'); });
  $('#sN').addEventListener('input', (e) => { boxInit(+e.target.value); updateCtl(); });
  $('#bOpen').addEventListener('click', () => boxSetOpen(!S.bx.open));
  $('#bFast').addEventListener('click', () => { Sound.click(); S.bx.fast = !S.bx.fast; updateCtl(); });
  $('#bBoxR').addEventListener('click', () => { Sound.click(); boxInit(S.bx.N); updateCtl(); });
  $('#sT1').addEventListener('input', (e) => { S.ht.T1 = +e.target.value; updateCtl(); });
  $('#sT2').addEventListener('input', (e) => { S.ht.T2 = +e.target.value; updateCtl(); });
  $$('#hDir button').forEach((b) => b.addEventListener('click', () => { Sound.click(); S.ht.dir = b.dataset.d; updateCtl(); }));
  $('#bApR').addEventListener('click', () => { Sound.click(); S.ap.v = [0, 0, 0, 0, 0, 0]; updateCtl(); });
  ['iP4', 'iP10', 'iDs1', 'iDs2', 'iDsT'].forEach((id) => $('#' + id).addEventListener('input', (e) => e.target.classList.remove('ok', 'bad')));
  SciSim.pointer(view, {
    down(p) { if (S.mode === 'video' || S.mode === 'apply') { S.tap = { x: p.x, y: p.y }; return true; } return false; },
    move() {},
    up(p) {
      const t = S.tap; S.tap = null; if (!t || Math.hypot(p.x - t.x, p.y - t.y) > 14) return;
      if (S.mode === 'video') { vidLayout().items.forEach((it, i) => { if (p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + it.h) vidSel(i); }); }
      else apTap(p);
    },
    hover() { return S.mode === 'video' || S.mode === 'apply' ? 'pointer' : null; },
  });

  /* ---------- 읽음 칸 ---------- */
  let rlast = '';
  function readouts() {
    let L1, a, L2, b, L3, c;
    const m = S.mode;
    if (m === 'video') { L1 = '고른 영상'; a = VID[S.vid.sel].n; L2 = '거꾸로 본 영상'; b = seenCount() + ' / 6'; L3 = '판정한 영상'; c = judgedCount() + ' / 6'; }
    else if (m === 'box') { const bx = S.bx, hide = showCalc('prob'); L1 = '왼쪽 / 오른쪽'; a = bx.k + '개 / ' + (bx.N - bx.k) + '개'; L2 = '이 상태의 경우의 수'; b = fW(binRow(bx.N)[bx.k]); L3 = '모두 왼쪽일 확률'; c = hide ? '?' : probTxt(bx.N); }
    else if (m === 'heat') { const cc = htCalc(), hide = showCalc('ds'); L1 = 'ΔS (물체 1)'; a = hide ? '?' : fd(cc.d1, true) + ' J/K'; L2 = 'ΔS (물체 2)'; b = hide ? '?' : fd(cc.d2, true) + ' J/K'; L3 = 'ΔS 합'; c = hide ? '?' : fd(cc.tot, true) + ' J/K'; }
    else { L1 = '판정한 카드'; a = S.ap.v.filter((v) => v > 0).length + ' / 6'; L2 = '제2법칙'; b = '엔트로피 증가'; L3 = '에너지 총량'; c = '보존'; }
    const key = [L1, a, L2, b, L3, c].join('|');
    if (key === rlast) return; rlast = key;
    l1.textContent = L1; v1.textContent = a; l2.textContent = L2; v2.textContent = b; l3.textContent = L3; v3.textContent = c;
  }

  /* ================= 미션 ================= */
  const fb = (pairs) => pairs.forEach(([el, ok]) => { if (ok) { el.classList.remove('bad'); el.classList.add('ok'); } else if (!el.classList.contains('bad')) { el.classList.remove('ok'); void el.offsetWidth; el.classList.add('bad'); } });
  function clr(...ids) { ids.forEach((id) => { const el = $('#' + id); el.value = ''; el.classList.remove('ok', 'bad'); }); }
  const resetFlags = () => { Object.keys(S.flags).forEach((k) => { S.flags[k] = false; }); };
  const near = (v, a, tol) => v != null && Math.abs(v - a) <= tol;

  const levels = [
    {
      title: '되돌릴 수 없음: 거꾸로 틀면?', short: '되돌릴 수 없음', icon: '📺', phase: '관찰',
      intro: '<p class="si-q">❓ 탐구 질문: 왜 뜨거운 커피는 저절로 식기만 하고, 식은 커피가 저절로 데워지지는 않을까? 에너지는 보존되는데 방향은 누가 정할까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시에서</b> 제1법칙(에너지 보존)과 열기관의 열효율을 배웠고, <b>중학교에서</b> 열이 고온에서 저온으로 이동하다 열평형에 이른다는 것을 배웠어요. 열기관이 열의 일부를 반드시 버려야 하는 까닭은 아직 모르고 있었죠. 이번 차시에서 그 까닭을 찾아봐요.</div>' +
        '<p>여섯 개의 영상을 <b>정방향</b>과 <b>거꾸로</b> 재생해 봐요. 거꾸로 틀어도 어색하지 않은 현상(<b>가역</b>)과 어색한 현상(<b>비가역</b>)을 구별하고, 에너지 보존만으로 그 차이를 알 수 있는지 생각해 봐요.</p>',
      features: ['video'],
      setup() { resetFlags(); S.vid.j = [0, 0, 0, 0, 0, 0]; S.vid.revT = [0, 0, 0, 0, 0, 0]; S.vid.rev = false; S.vid.sel = 0; S.vid.t = 0; S.vid.com = ''; setScene('video'); },
      recap: '거꾸로 틀면 어색한 현상이 비가역이에요. 비가역 현상에서도 에너지는 두 방향 모두 보존되므로, 에너지 보존(제1법칙)만으로는 일어나는 방향을 알 수 없어요.',
      summary: '<ul><li><b>가역에 가까운 현상</b>: 진자의 진동, 공 한 번의 충돌처럼 거꾸로 틀어도 어색하지 않은 현상(마찰·열 발생 없이 입자가 몇 개 안 되는 경우).</li>' +
        '<li><b>비가역 현상</b>: 잉크가 물에 퍼짐, 뜨거운 커피가 식음, 깨진 컵, 상자 속 기체의 확산처럼 <b>자연 상태에서 한쪽 방향으로만</b> 일어나는 현상.</li>' +
        '<li>비가역 현상에서도 에너지는 정방향·역방향 모두 보존돼요. 비가역은 에너지 보존이 깨지는 것이 아니에요.</li>' +
        '<li>공통점: 아주 많은 입자가 관여하고, 한곳에 몰려 있거나 한쪽이 뜨거운 상태에서 <b>고르게 퍼지는 방향</b>으로만 일어나요.</li></ul>',
      missions: [
        {
          title: '영상 여섯 개 판정하기', manual: true,
          goal: '여섯 영상을 모두 <b>◀ 거꾸로</b> 재생해 보고, 영상마다 <b>가역</b>(거꾸로 봐도 어색하지 않음)인지 <b>비가역</b>인지 판정한 뒤 ✔ 확인하기를 누르세요.',
          hint: '목록에서 영상을 고르고 ◀ 거꾸로를 눌러요. 컵이 저절로 붙거나 커피가 저절로 데워지면 어색하죠? 진자와 공의 충돌은 거꾸로 틀어도 자연스러워요.',
          setup() { resetFlags(); S.vid.j = [0, 0, 0, 0, 0, 0]; S.vid.revT = [0, 0, 0, 0, 0, 0]; S.vid.rev = false; S.vid.sel = 0; S.vid.t = 0; setFlag('judge', true); setScene('video'); },
          check() {
            if (seenCount() < 6) return '여섯 영상을 모두 ◀ 거꾸로 재생해서 1~2초씩 봐요 (지금 ' + seenCount() + '개).';
            if (judgedCount() < 6) return '여섯 영상을 모두 판정해 주세요 (지금 ' + judgedCount() + '개).';
            const bad = VID.map((d, i) => i).filter((i) => S.vid.j[i] !== VID[i].rev);
            if (!bad.length) return true;
            const i = bad[0];
            return '"' + VID[i].n + '"을(를) 다시 생각해 보세요. ' + (VID[i].rev === 1 ? '거꾸로 틀어도 물리적으로 자연스러운 움직임이에요.' : '거꾸로 틀면 자연에서는 저절로 일어나지 않는 일이에요.');
          },
          status: () => mark(seenCount() === 6) + ' 거꾸로 본 영상 ' + seenCount() + ' / 6 &nbsp; ' + mark(judgedCount() === 6) + ' 판정 ' + judgedCount() + ' / 6',
          explain: '<b>가역</b>: 진자의 진동, 당구공 충돌 한 번(거꾸로 틀어도 어색하지 않아요). <b>비가역</b>: 잉크가 퍼짐, 커피가 식음, 컵이 깨짐, 기체가 퍼짐(거꾸로면 어색해요). 모두 에너지는 정방향·역방향에서 같아요.',
        },
        {
          title: '비가역 현상의 공통점 정리하기', manual: true,
          goal: '비가역으로 판정한 현상들(잉크, 커피, 깨진 컵, 기체)의 <b>공통점</b>으로 알맞은 것을 고르고 ✔ 확인하기를 누르세요.',
          hint: '잉크 입자, 컵 조각, 기체 분자... 얼마나 많은 입자가 관여하나요? 그리고 처음에 몰려 있다가 어떻게 되나요?',
          setup() { resetFlags(); S.vid.com = ''; $('#sCom').classList.remove('ok', 'bad'); setFlag('com', true); setScene('video'); },
          check() {
            const v = S.vid.com; if (!v) return '공통점을 하나 골라 주세요.';
            const ok = v === 'b'; fb([[$('#sCom'), ok]]);
            if (ok) return true;
            if (v === 'a') return '에너지는 새로 생기지 않아요. 에너지의 합은 두 방향에서 같았어요.';
            if (v === 'c') return '비가역이라도 에너지 보존은 깨지지 않아요. 에너지의 합은 두 방향에서 같았어요.';
            return '진동수와는 상관이 없어요. 입자의 수와 퍼지는 방향을 생각해 보세요.';
          },
          status: () => '고른 것: ' + (S.vid.com ? '선택함' : '—'),
          explain: '잉크·커피·컵·기체는 모두 <b>아주 많은 입자</b>가 관여하고, 몰려 있던 것이 <b>고르게 퍼지는 쪽</b>(또는 뜨거운 것이 식는 쪽)으로만 일어나요. 에너지 보존이 깨지거나 에너지가 새로 생기는 것은 아니에요.',
        },
        {
          type: 'quiz', title: '거꾸로 틀어도 어색하지 않은 영상은?',
          goal: '정방향과 거꾸로 재생했을 때 구별하기 어려운(거꾸로 틀어도 어색하지 않은) 영상은 어느 쪽일까요?',
          setup() { resetFlags(); setScene('video'); },
          choices: ['비가역 현상: 에너지 보존이 깨지기 때문에 거꾸로 틀면 어색해요', '가역에 가까운 현상: 진자의 진동, 공 한 번의 충돌처럼 움직임이 거꾸로여도 같은 법칙을 따라요', '확산하는 기체: 분자가 서로 밀어서 퍼지기 때문에 거꾸로도 같아요', '뜨거운 커피가 식는 영상: 에너지가 두 방향에서 같으므로 구별할 수 없어요'],
          answer: 1,
          feedback: ['비가역 현상에서도 에너지는 보존돼요. 어색한 까닭은 에너지 보존이 깨져서가 아니에요.', '', '분자가 서로 밀어서 퍼지는 것이 아니에요. 그리고 기체가 저절로 한쪽으로 모이는 영상은 어색해요.', '에너지의 합은 같지만 거꾸로 틀면 커피가 저절로 데워져서 어색해요. 에너지 보존만으로는 구별할 수 없지만 현상은 구별돼요.'],
          explain: '진자나 공 한 번의 충돌은 거꾸로 틀어도 같은 법칙을 따라 자연스러워요(<b>가역</b>에 가까워요). 비가역 현상도 에너지는 보존되지만 <b>저절로 일어나는 방향</b>이 정해져 있어요. 이 방향을 정하는 것이 이번 차시에서 배울 <b>엔트로피</b>예요.',
        },
      ],
    },
    {
      title: '경우의 수: 퍼진 상태가 압도적', short: '경우의 수', icon: '🧱', phase: '모형',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 많은 입자가 관여하는 현상은 한쪽 방향으로만 일어난다는 것을 봤어요. 왜 그럴까요? 분자는 서로 밀지 않아요. 분자는 그저 <b>제멋대로 움직일</b> 뿐인데도 퍼져 나가요.</div>' +
        '<p>칸막이로 나뉜 상자에 분자 N개를 넣고 <b>칸막이를 열어요</b>. 왼쪽에 k개 있는 <b>경우의 수</b> W(k)를 세어 보면, 고르게 퍼진 상태가 압도적으로 많다는 것을 알 수 있어요. N을 바꿔 가며 확인해요.</p>',
      features: ['box'],
      setup() { resetFlags(); boxInit(10); S.bx.fast = false; setScene('box'); },
      recap: '분자가 제멋대로 움직여도 고르게 퍼진 상태(왼쪽·오른쪽이 비슷한 상태)가 경우의 수가 압도적으로 많아서 거의 그 상태에만 머물러요. 분자가 많을수록 모두 한쪽에 모일 확률은 2⁻ᴺ으로 줄어 사실상 0이 돼요.',
      summary: '<ul><li>분자 N개를 왼쪽·오른쪽에 놓는 전체 경우의 수는 <b>2ᴺ</b>가지예요.</li>' +
        '<li>N = 4: 왼쪽에 k = 0~4개일 때 경우의 수 1, 4, 6, 4, 1 (합 16). 모두 왼쪽일 확률 1/16 ≈ 6 %.</li>' +
        '<li>N = 10: 5 : 5로 나뉘는 경우의 수 252(전체 1 024의 약 24.6 %), 모두 왼쪽일 확률 1/1 024 ≈ 0.1 %.</li>' +
        '<li>N = 100: 모두 한쪽일 확률 2⁻¹⁰⁰ ≈ 8 × 10⁻³¹. 실제 기체 1몰(약 6 × 10²³개)이면 사실상 0이에요. 그래서 퍼진 기체는 저절로 한쪽으로 모이지 않아요.</li>' +
        '<li>분자가 서로 밀어서 퍼지는 것이 아니라, 퍼진 상태가 <b>가능한 경우가 압도적으로 많기 때문</b>에 그 상태에 머무르는 거예요.</li></ul>',
      missions: [
        {
          title: '모두 한쪽에 있을 확률 계산하기', manual: true,
          goal: '분자가 N = 4개, N = 10개일 때 <b>모두 왼쪽에 있을 확률</b>을 구해 입력하고 ✔ 확인하기를 누르세요. (분수 1/8, 소수 0.125, 퍼센트 12.5 % 모두 괜찮아요)',
          hint: '전체 경우의 수는 2ᴺ(N = 4이면 2 × 2 × 2 × 2 = 16)이고, 모두 왼쪽인 경우는 1가지예요. 확률 = 1 / 2ᴺ.',
          setup() { resetFlags(); boxInit(4); clr('iP4', 'iP10'); setFlag('prob', true); setScene('box'); },
          check() {
            const a = parseProb('iP4'), b = parseProb('iP10');
            if (a == null || b == null) return '두 칸 모두 입력해 주세요 (예: 1/8).';
            const oka = Math.abs(a - 1 / 16) <= (1 / 16) * 0.06, okb = Math.abs(b - 1 / 1024) <= (1 / 1024) * 0.06;
            fb([[$('#iP4'), oka], [$('#iP10'), okb]]);
            if (oka && okb) return true;
            if (!oka && near(a, 1 / 4, 0.01)) return 'N = 4일 때 전체 경우의 수는 4가 아니라 2⁴ = 16이에요.';
            if (!oka && near(a, 1 / 8, 0.003)) return 'N = 4이면 2 × 2 × 2 × 2 = 16가지예요. 1/8은 N = 3일 때 값이에요.';
            if (!okb && near(b, 1 / 100, 0.001)) return 'N = 10일 때 전체 경우의 수는 2¹⁰ = 1 024예요.';
            return '확률 = 1 / (전체 경우의 수 2ᴺ)이에요. 2¹⁰ = 1 024를 이용해 보세요.';
          },
          status: () => '입력 N = 4: ' + ($('#iP4').value.trim() || '—') + ', N = 10: ' + ($('#iP10').value.trim() || '—'),
          explain: '전체 경우의 수는 2ᴺ이고 모두 왼쪽인 경우는 1가지이므로 확률은 <b>1/2ᴺ</b>이에요. N = 4: 1/16 ≈ 6.3 %, N = 10: 1/1 024 ≈ 0.1 %. 분자가 조금만 늘어도 확률이 빠르게 작아져요.',
        },
        {
          title: '칸막이를 열고 지켜보기',
          goal: '<b>N = 10</b>에서 <b>🚪 칸막이 열기</b>를 누르고 8초 이상 지켜보세요. 분자가 퍼져 왼쪽에 <b>3~7개</b>가 있는 상태가 계속되면 성공이에요.',
          hint: '분자 수 N이 10인지 확인하고 칸막이를 열어요. ⏩ 빠르게를 켜면 시간이 4배로 빨리 흘러요.',
          setup() { resetFlags(); boxInit(10); setScene('box'); },
          check: () => S.bx.N === 10 && S.bx.open && S.bx.openT >= 8 && S.bx.k >= 3 && S.bx.k <= 7,
          hold: 1.2,
          status() { const b = S.bx; return mark(b.N === 10) + ' N = 10 &nbsp; ' + mark(b.open) + ' 칸막이 열림 &nbsp; ' + mark(b.openT >= 8) + ' ' + Math.min(8, Math.floor(b.openT)) + ' / 8초 &nbsp; ' + mark(b.k >= 3 && b.k <= 7) + ' 왼쪽 ' + b.k + '개'; },
          explain: '칸막이를 열면 분자가 서로 밀지 않아도 제멋대로 움직여 <b>왼쪽·오른쪽에 고르게</b> 퍼져요. 5 : 5 근처(W = 252)가 가장 경우의 수가 많아서 그 근처에 머물러요. 분자가 10개뿐이어서 가끔은 한쪽으로 쏠리기도 해요.',
        },
        {
          type: 'quiz', title: '분자가 많으면 되돌아오기가 어려운 까닭',
          goal: 'N을 100으로 해서 확인해 보세요. 분자 수가 많을수록 퍼진 기체가 저절로 한쪽으로 모이는 일이 사실상 일어나지 않는 까닭은?',
          setup() { resetFlags(); boxInit(100); setScene('box'); },
          choices: ['분자들이 서로 밀어서 한쪽으로 가지 못하게 막기 때문이에요', '한쪽으로 몰린 경우는 2ᴺ가지 중 단 하나뿐이라, N이 클수록 그 확률(1/2ᴺ)이 사실상 0이 되기 때문이에요', '분자가 많아지면 에너지가 늘어나서 퍼지기만 하기 때문이에요', '분자는 한 번 퍼지면 에너지 보존 때문에 되돌아올 수 없기 때문이에요'],
          answer: 1,
          feedback: ['분자는 서로 밀어서 퍼지는 것이 아니에요. 제멋대로 움직일 뿐이에요.', '', '분자가 많아도 에너지는 그대로예요. 달라지는 것은 경우의 수예요.', '에너지 보존은 방향을 정하지 않아요. 되돌아오는 것이 에너지 보존에 어긋나지는 않고, 확률이 극히 작을 뿐이에요.'],
          explain: '전체 2ᴺ가지 중 모두 한쪽에 있는 경우는 1가지뿐이라 확률은 <b>1/2ᴺ</b>이에요. N = 100이면 약 8 × 10⁻³¹, 실제 기체(약 6 × 10²³개)라면 사실상 0이에요. 법칙으로 금지돼서가 아니라 <b>확률이 극히 작아서</b> 일어나지 않아요.',
        },
      ],
    },
    {
      title: '엔트로피: 경우의 수와 방향', short: '엔트로피', icon: '🌡️', phase: '설명',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 퍼진 상태는 경우의 수가 압도적으로 많아서 저절로 일어난다는 것을 봤어요. 이 "경우의 수(미시 상태의 가짓수 W)"를 나타내는 양이 <b>엔트로피 S</b>예요. W가 많은 상태일수록 S가 커요.</div>' +
        '<p>기체의 확산은 W가 늘어나는 방향이에요. <b>열의 이동</b>에서는 열 Q가 이동할 때 <b>ΔS = Q / T</b>(열을 받은 쪽 +, 준 쪽 −)로 두 물체의 엔트로피 변화를 구해요. 그 <b>합이 +</b>인 방향으로만 저절로 일어나요.</p>',
      features: ['heat'],
      setup() { resetFlags(); S.ht.T1 = 600; S.ht.T2 = 300; S.ht.dir = '12'; setScene('heat'); },
      recap: '경우의 수(W)가 늘어나는 방향이 엔트로피 S가 증가하는 방향이에요. 열의 이동에서는 두 물체의 ΔS = Q / T를 합해 + 이면 저절로 일어나요. 고립계에서 저절로 일어나는 변화는 엔트로피가 증가하는 방향이에요(제2법칙).',
      summary: '<ul><li><b>엔트로피 S</b>: 계가 가질 수 있는 미시 상태의 가짓수 W가 많을수록 커요. 확산은 W가 늘어나므로 S가 증가해요.</li>' +
        '<li>열의 이동: 열 Q가 이동하면 <b>ΔS = Q / T</b>. 받은 쪽은 +Q/T, 준 쪽은 ' + MINUS + 'Q/T.</li>' +
        '<li>600 K 물체 → 300 K 물체로 600 J: ΔS = ' + MINUS + '1.0 + 2.0 = <b>+1.0 J/K</b> &gt; 0 → 일어나요. 반대 방향(300 K → 600 K)이면 ΔS = +1.0 ' + MINUS + ' 2.0 = <b>' + MINUS + '1.0 J/K</b> &lt; 0 → 저절로 일어나지 않아요. 온도가 같으면 합이 0(열평형).</li>' +
        '<li><b>제2법칙(정성적)</b>: 고립계에서 저절로 일어나는 변화는 엔트로피가 증가하는 방향이에요.</li>' +
        '<li>엔트로피가 증가한다는 것은 에너지가 늘어난다는 뜻이 아니에요. 에너지 총량은 그대로예요.</li></ul>',
      missions: [
        {
          title: '열의 이동에서 ΔS 합 계산하기', manual: true,
          goal: '<b>물체 1(600 K)</b>에서 <b>물체 2(300 K)</b>로 열 <b>600 J</b>이 이동할 때, 열을 잃은 물체와 받은 물체의 엔트로피 변화 <b>ΔS = ±Q / T</b>와 그 <b>합</b>(J/K)을 입력하고 ✔ 확인하기를 누르세요.',
          hint: '열을 잃은 쪽: ΔS = ' + MINUS + '600 / 600. 열을 받은 쪽: ΔS = +600 / 300. 합은 둘을 더해요.',
          setup() { resetFlags(); S.ht.T1 = 600; S.ht.T2 = 300; S.ht.dir = '12'; clr('iDs1', 'iDs2', 'iDsT'); setFlag('ds', true); setScene('heat'); },
          check() {
            const cc = htCalc();
            const a = num('iDs1'), b = num('iDs2'), t = num('iDsT');
            if (a == null || b == null || t == null) return '세 칸에 모두 숫자를 입력해 주세요 (J/K).';
            const oks = [near(a, cc.dDon, 0.06), near(b, cc.dRec, 0.06), near(t, cc.tot, 0.06)];
            fb([[$('#iDs1'), oks[0]], [$('#iDs2'), oks[1]], [$('#iDsT'), oks[2]]]);
            if (oks.every(Boolean)) return true;
            if (!oks[0] && near(a, -cc.dDon, 0.06)) return '열을 잃은 쪽은 엔트로피가 줄어요. 부호가 −예요.';
            if (!oks[1] && near(b, -cc.dRec, 0.06)) return '열을 받은 쪽은 엔트로피가 늘어요. 부호가 +예요.';
            if (!oks[2] && oks[0] && oks[1]) return '합은 두 변화를 그대로 더해요: (' + fd(cc.dDon, true) + ') + (' + fd(cc.dRec, true) + ').';
            return 'ΔS = Q / T에 알맞은 온도를 넣어 보세요 (열을 잃은 물체 ' + cc.Td + ' K, 받은 물체 ' + cc.Tr + ' K).';
          },
          status: () => '입력 ' + ['iDs1', 'iDs2', 'iDsT'].filter((id) => $('#' + id).value.trim()).length + ' / 3',
          explain: '열을 잃은 쪽 ΔS = ' + MINUS + '600 / 600 = <b>' + MINUS + '1.0 J/K</b>, 열을 받은 쪽 ΔS = +600 / 300 = <b>+2.0 J/K</b>. 합 = <b>+1.0 J/K &gt; 0</b>이므로 이 방향(고온 → 저온)의 열 이동은 저절로 일어나요.',
        },
        {
          title: '온도가 같으면 합이 0',
          goal: '두 물체의 온도를 <b>같게</b> 맞추고(두 슬라이더 모두), 엔트로피 변화의 합이 <b>0</b>이 되는 것을 확인하세요.',
          hint: 'T₁과 T₂ 슬라이더를 같은 값으로 맞춰요. 같은 온도에서는 열을 준 쪽과 받은 쪽의 ΔS가 크기는 같고 부호가 반대예요.',
          setup() { resetFlags(); S.ht.T1 = 600; S.ht.T2 = 300; S.ht.dir = '12'; setScene('heat'); },
          check: () => S.ht.T1 === S.ht.T2,
          hold: 1.0,
          status() { const cc = htCalc(); return mark(S.ht.T1 === S.ht.T2) + ' T₁ = ' + S.ht.T1 + ' K, T₂ = ' + S.ht.T2 + ' K &nbsp; ΔS 합 = ' + fd(cc.tot, true) + ' J/K'; },
          explain: '온도가 같으면 열을 준 쪽 ' + MINUS + 'Q/T와 받은 쪽 +Q/T가 서로 상쇄돼 <b>합 = 0</b>이에요. 이것이 <b>열평형</b>이에요. 더 이상 어느 쪽으로도 엔트로피가 늘지 않아서 열이 일부러 이동하지 않아요.',
        },
        {
          type: 'quiz', title: '열이 저절로 저온 → 고온으로 가지 않는 까닭',
          goal: '300 K 물체에서 600 K 물체로 열 600 J이 <b>저절로</b> 이동하지 않는 까닭을 엔트로피의 합으로 설명한 것은?',
          setup() { resetFlags(); S.ht.T1 = 600; S.ht.T2 = 300; S.ht.dir = '21'; setScene('heat'); },
          choices: ['에너지 보존에 어긋나서 불가능해요', '이동하면 두 물체의 엔트로피 변화의 합이 ' + MINUS + '1.0 J/K로 감소하기 때문이에요 (저절로는 증가하는 방향으로만 일어나요)', '엔트로피가 늘어나면 에너지가 늘어나서 불가능해요', '열은 온도가 낮은 곳이 더 많이 끌어당겨서 일어나지 않아요'],
          answer: 1,
          feedback: ['에너지는 두 방향 모두 보존돼요(제1법칙). 방향을 정하는 것은 엔트로피예요.', '', '엔트로피가 증가해도 에너지가 늘어나지 않아요. 에너지 총량은 그대로예요.', '열 이동의 방향은 끌어당김이 아니라 엔트로피 합이 늘어나는 쪽이에요.'],
          explain: '저온(300 K) → 고온(600 K)으로 600 J이 가면 ΔS = ' + MINUS + '600/300 + 600/600 = ' + MINUS + '2.0 + 1.0 = <b>' + MINUS + '1.0 J/K &lt; 0</b>이에요. 고립계에서 저절로 일어나는 변화는 엔트로피가 증가하는 방향이므로 이 방향은 저절로 일어나지 않아요(제2법칙). 에너지는 두 방향 모두 보존돼요.',
        },
      ],
    },
    {
      title: '적용: 냉장고와 열기관', short: '적용', icon: '🏠', phase: '적용',
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 엔트로피의 합이 늘어나는 방향으로만 저절로 변화가 일어난다는 것을 알았어요. 이것으로 <b>냉장고</b>(안쪽이 식는데 엔트로피가 줄어드는 것 아닐까?)와 <b>열기관</b>(왜 열을 100 % 일로 바꿀 수 없을까?)을 설명해 봐요.</div>' +
        '<p>여섯 개의 시나리오 카드를 눌러 <b>📈 엔트로피 증가(일어나요)</b>인지 <b>🚫 일어나지 않아요</b>인지 판정해요. 아래 표의 엔트로피 변화가 단서예요.</p>',
      features: ['apply'],
      setup() { resetFlags(); S.ap.v = [0, 0, 0, 0, 0, 0]; setScene('apply'); },
      recap: '냉장고는 안쪽의 엔트로피를 줄이지만 방출하는 열이 주방의 엔트로피를 더 크게 늘려 전체로는 증가해요. 열기관은 열을 100 % 일로 바꾸면 고온 열원의 엔트로피만 줄어 불가능하므로 Q_c를 버려야 해요. 에너지는 보존되지만 쓸모 있는 에너지는 줄어요.',
      summary: '<ul><li><b>냉장고</b>: 안쪽 ' + MINUS + '1.11 J/K, 주방 +1.33 J/K → 합 +0.22 J/K &gt; 0(전체로는 증가). 일을 받아야 가능해요.</li>' +
        '<li><b>열기관</b>: 열 600 J을 모두 일로 바꾸면 ΔS = ' + MINUS + '1.0 J/K &lt; 0(불가능). 저온 열원에 Q_c = 400 J을 버리면 ' + MINUS + '1.0 + 1.33 = +0.33 J/K &gt; 0(가능). 그래서 열효율은 100 %가 될 수 없어요.</li>' +
        '<li><b>마찰열</b>: 역학적 에너지가 열로 흩어지는 것은 엔트로피 증가, 그 반대(열이 모여 저절로 움직임)는 일어나지 않아요.</li>' +
        '<li>에너지는 보존되지만 흩어진 에너지는 다시 쓸모 있는 일로 바꾸기 어려워요. 그래서 <b>에너지 절약</b>이 중요해요.</li>' +
        '<li>생명체가 질서 있는 구조를 만들 수 있는 것도 주위의 엔트로피를 더 크게 늘리기 때문이에요.</li></ul>',
      missions: [
        {
          title: '시나리오 여섯 개 판정하기', manual: true,
          goal: '카드를 눌러 <b>📈 엔트로피 증가(일어나요)</b>와 <b>🚫 일어나지 않아요</b> 중 알맞게 판정하고 ✔ 확인하기를 누르세요. (누를 때마다 바뀌어요)',
          hint: '퍼지거나 흩어지는 방향은 엔트로피가 늘어요. 저절로 모이거나 100 % 일로 바뀌는 것은 엔트로피가 줄어요. 냉장고는 아래 표처럼 전체 합을 보세요.',
          setup() { resetFlags(); S.ap.v = [0, 0, 0, 0, 0, 0]; setScene('apply'); },
          check() {
            if (S.ap.v.some((v) => v === 0)) return '여섯 장을 모두 판정해 주세요 (지금 ' + S.ap.v.filter((v) => v > 0).length + '장).';
            const bad = SCN.map((d, i) => i).filter((i) => !apOK(i));
            if (!bad.length) { S.flags.apOK = true; return true; }
            const i = bad[0];
            return '"' + SCN[i].n + '"를 다시 생각해 보세요. ' + (SCN[i].ans === 1 ? '전체로 보면 엔트로피가 늘어나는 방향이에요.' : '엔트로피가 줄어드는 방향이라 저절로는 일어나지 않아요.');
          },
          status: () => '판정 ' + S.ap.v.filter((v) => v > 0).length + ' / 6',
          explain: '향수 퍼짐·마찰열·냉장고(전체)는 <b>엔트로피 증가</b>라 일어나요. 퍼진 냄새가 저절로 병으로 돌아가기, 열이 저절로 모여 상자가 움직이기, 열기관이 열을 100 % 일로 바꾸기는 엔트로피가 <b>줄어서</b> 저절로 일어나지 않아요.',
        },
        {
          type: 'quiz', title: '문을 열어 둔 냉장고',
          goal: '닫힌 방에서 냉장고 문을 열어 둔 채 켜 두었어요. 방 <b>전체</b>의 엔트로피는 어떻게 될까요?',
          setup() { resetFlags(); setScene('apply'); },
          choices: ['냉장고가 안을 식히니까 방 전체의 엔트로피도 줄어요', '냉장고가 받은 일이 열로 방출되고 열이 방 전체로 퍼져 방 전체의 엔트로피는 늘어요', '에너지가 보존되므로 엔트로피는 변하지 않아요', '냉장고는 엔트로피를 없애는 장치이므로 계속 줄어요'],
          answer: 1,
          feedback: ['안쪽만 보면 줄지만, 방출되는 열이 방의 엔트로피를 더 크게 늘려요. 방 전체로는 증가해요.', '', '에너지가 보존되어도 엔트로피는 변화의 방향을 따라 늘어나요.', '엔트로피를 없애는 장치는 없어요. 한쪽을 줄이려면 다른 쪽을 더 크게 늘려야 해요.'],
          explain: '냉장고는 일을 받아 안쪽에서 열을 퍼내 방출해요. 안쪽의 엔트로피 감소(' + MINUS + '1.11 J/K)보다 방출한 열이 늘리는 엔트로피(+1.33 J/K)가 더 커서 <b>합은 증가</b>해요. 문을 열어 둔 방은 오히려 약간 더 따뜻해져요.',
        },
        {
          type: 'quiz', title: '에너지는 보존되는데 왜 아껴야 할까?',
          goal: '에너지는 보존되는데도 에너지를 절약하는 것이 중요한 까닭으로 알맞은 것은?',
          setup() { resetFlags(); setScene('apply'); },
          choices: ['쓰고 나면 에너지가 실제로 없어지기 때문이에요', '엔트로피가 늘면서 에너지가 흩어져, 일로 바꿔 쓸 수 있는 쓸모 있는 에너지가 줄어들기 때문이에요', '에너지를 쓰면 엔트로피가 줄어들기 때문이에요', '에너지를 아끼면 엔트로피가 증가하지 않기 때문이에요'],
          answer: 1,
          feedback: ['에너지는 없어지지 않고 보존돼요. 흩어져서 쓰기 어려워질 뿐이에요.', '', '에너지를 쓰는 과정(비가역)에서는 엔트로피가 늘어나요.', '엔트로피는 비가역 변화가 일어나는 한 늘어나요. 아낀다고 엔트로피 증가가 없어지지는 않지만, 덜 늘릴 수 있어요.'],
          explain: '에너지는 보존되지만 마찰열·폐열처럼 <b>흩어진 에너지</b>는 다시 모아 일로 쓰기 어려워요(엔트로피 증가). 그래서 에너지의 <b>양</b>은 같아도 쓸모 있는 에너지는 줄어요. 에너지를 아껴 쓰면 이 손실을 줄일 수 있어요.',
        },
      ],
    },
  ];

  game = SciSim.game({
    simId: 'hm-entropy', mount: '#game', badge: '엔트로피 박사', homeHref: '../../index.html#hm',
    featureLabels: { video: '📺 영상 정방향·거꾸로 재생', box: '🧱 칸막이 상자와 경우의 수', heat: '🌡️ 엔트로피와 ΔS = Q/T', apply: '🏠 냉장고·열기관 판정' },
    onFeatures() { updateCtl(); },
    levels,
  });

  /* ---------- 시작 ---------- */
  boxInit(10);
  setScene('video');
  let lastFree = false, lastLevel = -1, ctlT = 0;
  SciSim.loop((dt, t) => {
    S.clock = t;
    if (game && game.free !== lastFree) { lastFree = game.free; updateCtl(); }
    if (game && game.level !== lastLevel) { lastLevel = game.level; const al = allowedModes(); if (al.indexOf(S.mode) < 0) setScene(al[0]); else updateCtl(); }
    view.apply();
    vidStep(dt); boxStep(dt);
    ctlT += dt; if (ctlT > 0.5) { ctlT = 0; if (S.mode === 'video' || S.mode === 'box') updateCtl(); }
    ctx.fillStyle = BG; ctx.fillRect(0, 0, VW, VH);
    switch (S.mode) {
      case 'video': drawVideoScene(dt); break;
      case 'box': drawBoxScene(dt); break;
      case 'heat': drawHeatScene(dt); break;
      default: drawApplyScene(dt);
    }
    if (S.fade > 0.005) { ctx.fillStyle = 'rgba(238,242,250,' + S.fade * 0.8 + ')'; ctx.fillRect(0, 0, VW, VH); S.fade = approach(S.fade, 0, dt, 9); }
    readouts();
  });

  /* ---------- 디버그 (Playwright) ---------- */
  window.__sim = {
    S, VW, VH, get game() { return game; }, setScene, setFlag, VID, SCN, htCalc, binRow, probTxt, boxInit, boxSetOpen, vidLayout, apLayout, vidSel, apTap, apOK, seenCount, judgedCount, fd, parseProb,
    stepBox(sec) { const n = Math.ceil(sec / 0.02); for (let i = 0; i < n; i++) boxStep(0.02); },
    watchAll() { for (let i = 0; i < 6; i++) S.vid.revT[i] = 2; },
  };
})();
