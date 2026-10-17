/* =========================================================
   통합과학1 Ⅱ. 물질과 규칙성 - 공유 결합과 물·산소 [10통과1-02-04]
   ① 모형: 전자쌍 공유 (H₂, Cl₂: 각 원자가 전자 1개씩 내놓아 공유 → 18족과 같은 전자 배치)
   ② 탐구: 분자 만들기 (H, C, N, O 원자 카드 · 결합 수 H 1, O 2, N 3, C 4 · H₂O, O₂, N₂, CO₂, NH₃, CH₄)
   ③ 실험: 전도성 실험 (증류수·설탕·설탕물·에탄올·소금물, 입자 모형)
   ④ 분석: 결합 비교 (이온 결합 / 공유 결합 분류와 전도성 예측)
   ※ 결합으로 나타나는 성질은 전기 전도성에 한정 (분자 모양·극성·전기 음성도, 공유 결정, HCl 등은 다루지 않음)
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, lerp, Sound, toast } = SciSim;
  const { tween, approach, Spring, Particles } = SciSim;

  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 560 : 800, VH = PHONE ? 760 : 600;
  const FS = PHONE ? 1.3 : 1;
  const RM = SciSim.reduceMotion;
  const BG = '#f3f0fb';
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: BG });
  const ctx = view.ctx;
  const D = SciSim.draw(ctx);
  const CO = SciSim.color;
  const fx = new Particles();
  const TAU = Math.PI * 2;
  const POS = '#e2464b', NEG = '#3867f4', NEU = '#14a058', INK = '#1b2333', MUTED = '#5d6879';
  const E1 = '#ffb400', E2 = '#ff7a3d';          // 왼쪽 · 오른쪽 원자의 전자
  const ION_C = '#7c3aed', COV_C = '#0d9488';
  const MINUS = '−';
  let game = null;
  let F = new Set();
  const mark = (b) => (b ? '✅' : '⬜');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const fs = (n) => Math.round(n * FS);
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const subN = (n) => String(n).split('').map((c) => SUBD[+c]).join('');
  const ionHTML = (sym, q) => sym + '<sup>' + (Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : MINUS) + '</sup>';

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(() => hintEl.classList.add('hide'), ms || 4500);
  }
  const roCache = {};
  function setRO(i, label, value) {
    const k = label + '|' + value;
    if (roCache[i] === k) return;
    roCache[i] = k;
    $('#roL' + i).textContent = label;
    $('#roV' + i).innerHTML = value;
  }
  const pill = (x, y, text, o) => D.label(x, y, text, Object.assign({ size: fs(13) }, o));
  const shade = (c, a) => CO.shade(c, a);
  function bgFill() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#f7f4fe'); g.addColorStop(1, '#ece7f9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  }
  function electron(x, y, r, col) {
    D.sphere(x, y, r, col || E1, { shadow: false, outline: 'rgba(120,70,0,.55)', outlineWidth: 1.2 });
  }
  function lines(x, y, arr, o) {
    o = o || {};
    arr.forEach((s, i) => D.text(x, y + i * (o.lh || fs(20)), s, Object.assign({ size: fs(14), weight: 700, color: INK }, o)));
  }

  /* ---------- 화면(장면) ---------- */
  const S = { scene: 'share', sceneA: 1 };
  const TB = { share: '🤝 전자쌍 공유', build: '🧩 분자 만들기', conduct: '💡 전기 전도성 실험', classify: '📊 이온 결합 · 공유 결합 비교' };
  function setScene(sc) {
    S.scene = sc; hintEl.classList.add('hide');
    S.sceneA = 0; tween(S, { sceneA: 1 }, { duration: 0.4, ease: 'outCubic' });
    updateUI();
  }
  function updateUI() {
    const sc = S.scene;
    ['share', 'build', 'conduct', 'classify'].forEach((k) => { $('#cs-' + k).hidden = k !== sc; });
    $('#tbLabel').textContent = TB[sc];
    $('#sceneSeg').hidden = F.size < 2;
    $$('#sceneSeg button').forEach((b) => b.classList.toggle('on', b.dataset.scene === sc));
  }

  /* =========================================================
     ① 전자쌍 공유 (H₂, Cl₂)
     ========================================================= */
  const R3 = PHONE ? 70 : 98;                        // 가장 바깥 껍질 반지름
  const RH = R3 * 0.82;                               // 수소의 (유일한) 껍질 반지름
  const AY = PHONE ? 300 : 270;
  const MOLS = {
    H2: { sym: 'H', Z: 1, shells: [RH], outer: 1, dBond: RH * 1.5, name: '수소 분자', want: 2, ng: 'He' },
    Cl2: { sym: 'Cl', Z: 17, shells: [R3 * 0.34, R3 * 0.64, R3], outer: 7, dBond: R3 * 1.62, name: '염소 분자', want: 8, ng: 'Ar' },
  };
  const SH = { mol: 'H2', slider: 0, d: new Spring(0, { stiffness: 120, damping: 14 }), bonded: false, bondA: 0, made: { H2: false, Cl2: false }, drag: false, hinted: false };
  const dFar = (m) => 2 * (m.shells[m.shells.length - 1]) + (PHONE ? 74 : 110);
  const shM = () => MOLS[SH.mol];
  function resetShare(mol) {
    if (mol) SH.mol = mol;
    SH.slider = 0; SH.bonded = false; SH.bondA = 0; SH.drag = false;
    SH.d.value = SH.d.target = dFar(shM()); SH.d.velocity = 0;
    const s = $('#sDist'); s.value = 0; syncDist();
    $$('#molSeg button').forEach((b) => b.classList.toggle('on', b.dataset.m === SH.mol));
    $('#shareNote').textContent = '거리를 줄여 두 원자의 바깥 전자껍질을 겹쳐 봐요. 오른쪽 원자를 끌어도 돼요.';
  }
  function syncDist() {
    const s = $('#sDist'), v = +s.value;
    s.style.setProperty('--pct', v + '%');
    $('#oDist').textContent = SH.bonded ? '결합!' : v < 30 ? '멀리' : v < 90 ? '가까워지는 중' : '거의 닿음';
  }
  function setSlider(v) {
    SH.slider = clamp(v, 0, 1);
    const s = $('#sDist'); s.value = Math.round(SH.slider * 100); syncDist();
  }
  function stepShare(dt) {
    const m = shM();
    // 결합 판정: 거의 끝까지 가까이 가면 결합 (살짝 물러나도 유지, 많이 물러나면 끊어짐)
    if (!SH.bonded && SH.slider >= 0.96) {
      SH.bonded = true; Sound.success();
      tween(SH, { bondA: 1 }, { duration: RM ? 0.01 : 0.7, ease: 'outCubic' });
      const x = VW / 2;
      fx.burst(x, AY, { count: 20, colors: [E1, E2, '#fff6c2'], speed: 140, size: 3.5, gravity: 0 });
      SH.made[SH.mol] = true;
      $('#shareNote').textContent = '두 원자가 전자 1개씩 내놓아 전자쌍을 함께 써요. 이것이 공유 결합이에요.';
      showHint(m.name + ' ' + (SH.mol === 'H2' ? 'H₂' : 'Cl₂') + ' 완성! 두 원자가 전자쌍을 공유해요', 5000);
      syncDist();
    } else if (SH.bonded && SH.slider < 0.8) {
      SH.bonded = false;
      tween(SH, { bondA: 0 }, { duration: RM ? 0.01 : 0.4, ease: 'outCubic' });
      syncDist();
    }
    const dNear = SH.bonded ? m.dBond : lerp(dFar(m), m.dBond * 0.98, clamp(SH.slider / 0.96, 0, 1));
    SH.d.target = SH.bonded ? m.dBond : dNear;
    SH.d.update(dt);
  }
  // 한 원자 그리기: facing = +1(오른쪽 원자와 결합) / -1
  function drawShareAtom(x, y, facing, t) {
    const m = shM(), isH = SH.mol === 'H2';
    const col1 = facing > 0 ? E1 : E2;
    const sh = m.shells;
    ctx.save();
    for (let i = 0; i < sh.length; i++) {
      const outer = i === sh.length - 1;
      ctx.strokeStyle = outer ? (SH.bondA > 0.5 ? COV_C : '#8aa0c0') : '#b7c2d6';
      ctx.lineWidth = outer ? 2.8 : 1.6;
      if (outer) ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.arc(x, y, sh[i], 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    // 안쪽 껍질 전자
    if (!isH) {
      const nIn = [2, 8];
      for (let i = 0; i < 2; i++) {
        const n = nIn[i], off = i === 0 ? Math.PI / 2 : Math.PI / 8;
        for (let j = 0; j < n; j++) {
          const a = off + (j * TAU) / n;
          electron(x + Math.cos(a) * sh[i], y + Math.sin(a) * sh[i], PHONE ? 4.8 : 4.4, col1);
        }
      }
    }
    // 바깥 껍질: 비공유 전자쌍(Cl) + 짝 없는 전자 1개
    const Ro = sh[sh.length - 1];
    const faceAng = facing > 0 ? 0 : Math.PI;
    if (!isH) {
      const pairAngs = [faceAng + Math.PI / 2, faceAng + Math.PI, faceAng + (3 * Math.PI) / 2];
      pairAngs.forEach((a, k) => {
        [-0.17, 0.17].forEach((da) => {
          const aa = a + da;
          electron(x + Math.cos(aa) * Ro, y + Math.sin(aa) * Ro, PHONE ? 6 : 5.6, col1);
        });
      });
    }
    // 원자핵
    const nr = PHONE ? 14 : 17;
    D.sphere(x, y, nr, '#6a7899', { shadow: true });
    D.text(x, y + 4, m.Z + '+', { size: fs(12), weight: 800, color: '#fff' });
    return { faceAng, Ro };
  }
  function drawShare(t) {
    const m = shM(), isH = SH.mol === 'H2';
    const mid = VW / 2, d = SH.d.value;
    const lx = mid - d / 2, rx = mid + d / 2;
    const Ro = m.shells[m.shells.length - 1];
    const bA = SH.bondA;
    // 공유 영역 (겹친 부분) 강조
    if (d < 2 * Ro) {
      ctx.save();
      ctx.beginPath(); ctx.arc(lx, AY, Ro, 0, TAU); ctx.clip();
      ctx.beginPath(); ctx.arc(rx, AY, Ro, 0, TAU);
      ctx.fillStyle = 'rgba(251,191,36,' + (0.18 + 0.3 * bA) + ')'; ctx.fill();
      ctx.restore();
    }
    drawShareAtom(lx, AY, +1, t);
    drawShareAtom(rx, AY, -1, t);
    // 짝 없는 전자 (결합 전: 서로 마주보는 위치 → 결합 후: 가운데 전자쌍)
    const ex1 = { x: lx + Ro, y: AY }, ex2 = { x: rx - Ro, y: AY };
    const pr1 = { x: mid - (PHONE ? 7 : 8), y: AY }, pr2 = { x: mid + (PHONE ? 7 : 8), y: AY };
    const wob = (1 - bA) * Math.sin(t * 3) * 1.5;
    const p1 = { x: lerp(ex1.x, pr1.x, smooth(bA)), y: AY + wob }, p2 = { x: lerp(ex2.x, pr2.x, smooth(bA)), y: AY - wob };
    if (bA > 0.02) {
      D.glow(mid, AY, 36 + 10 * Math.sin(t * 4) * bA, '#fbbf24', 0.75 * bA);
      // 공유 전자쌍 띠
      ctx.save(); ctx.globalAlpha = 0.5 * bA; ctx.lineCap = 'round'; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(lx + 16, AY); ctx.lineTo(rx - 16, AY); ctx.stroke(); ctx.restore();
    } else if (SH.slider > 0.5) {
      D.ring(mid, AY, 22, t, { color: COV_C, width: 2.5 });
    }
    electron(p1.x, p1.y, PHONE ? 7.4 : 6.8, E1);
    electron(p2.x, p2.y, PHONE ? 7.4 : 6.8, E2);
    // 이름표
    const topY = AY - Ro - fs(46);
    const el = isH ? 'H' : 'Cl';
    D.text(lx, topY, el, { size: fs(22), weight: 800, color: INK });
    D.text(rx, topY, el, { size: fs(22), weight: 800, color: INK });
    D.text(lx, topY + fs(22), '비금속 원소', { size: fs(13), weight: 700, color: MUTED });
    D.text(rx, topY + fs(22), '비금속 원소', { size: fs(13), weight: 700, color: MUTED });
    // 바깥 전자 개수 알약 (두 원자의 알약이 겹치지 않게 가운데를 기준으로 양쪽에 놓아요)
    const py = AY + Ro + fs(36);
    const okc = bA > 0.5;
    const txt = okc ? (isH ? 'H: 1 + 1 = 2개' : 'Cl: 7 + 1 = 8개') : (isH ? '전자 1개' : '바깥 전자 7개');
    const gap = fs(6);
    const side = (alignRight, y, text, o) => pill(alignRight ? mid - gap : mid + gap, y, text, Object.assign({ align: alignRight ? 'right' : 'left' }, o));
    const pst = { bg: okc ? '#e2f6eb' : '#fff', color: okc ? '#0b6b39' : INK, border: okc ? '#14a058' : '#c9d2e3', size: fs(13) };
    if (okc || d > 2 * Ro) { pill(lx, py, txt, pst); pill(rx, py, txt, pst); }
    else { side(true, py, txt, pst); side(false, py, txt, pst); }
    if (okc) {
      ctx.save(); ctx.globalAlpha = smooth((bA - 0.5) * 2);
      const ngt = (m.ng === 'He' ? '헬륨(He)' : '아르곤(Ar)') + '과 같은 배치';
      side(true, py + fs(34), ngt, { bg: '#14a058', color: '#fff', size: fs(13) }); side(false, py + fs(34), ngt, { bg: '#14a058', color: '#fff', size: fs(13) });
      ctx.restore();
      // 공유 전자쌍 · 비공유 전자쌍 표지
      ctx.save(); ctx.globalAlpha = smooth((bA - 0.6) * 2.5);
      D.arrow(mid, topY - fs(10), mid, AY - 20, { color: '#b45309', width: 3 });
      pill(mid, topY - fs(30), '공유 전자쌍 (결합 1개)', { bg: '#b45309', color: '#fff', size: fs(13) });
      if (!isH) pill(lx - Ro - fs(8), AY, '비공유 전자쌍', { bg: '#7c3aed', color: '#fff', size: fs(12), align: 'right' });
      ctx.restore();
    }
    // 분자 이름 / 구조 표시 (결합 후)
    if (bA > 0.6) {
      ctx.save(); ctx.globalAlpha = smooth((bA - 0.6) * 2.5);
      pill(mid, VH - fs(70), (isH ? 'H–H' : 'Cl–Cl') + ' · ' + m.name + ' ' + (isH ? 'H₂' : 'Cl₂'), { bg: COV_C, color: '#fff', size: fs(15) });
      ctx.restore();
    }
    // 범례
    const ly2 = VH - fs(30);
    electron(mid - fs(150), ly2, 6, E1); D.text(mid - fs(138), ly2 + 5, '왼쪽 원자의 전자', { size: fs(12), weight: 700, color: MUTED, align: 'left' });
    electron(mid + fs(8), ly2, 6, E2); D.text(mid + fs(20), ly2 + 5, '오른쪽 원자의 전자', { size: fs(12), weight: 700, color: MUTED, align: 'left' });
    if (SH.slider < 0.2 && !SH.bonded) pill(mid, AY - Ro - fs(100), '거리를 줄여 두 원자를 가까이 가져가 봐요', { bg: ION_C, color: '#fff', size: fs(14) });
  }
  function shareHit(p) {
    const m = shM(), d = SH.d.value, rx = VW / 2 + d / 2;
    return Math.hypot(p.x - rx, p.y - AY) < m.shells[m.shells.length - 1] + 12;
  }
  function sharePointer(p, type) {
    if (type === 'down') {
      if (!shareHit(p)) return false;
      SH.drag = { x0: p.x, s0: SH.slider };
      return true;
    }
    if (!SH.drag) return true;
    if (type === 'move') {
      const m = shM(), span = dFar(m) - m.dBond * 0.98;
      // 오른쪽 원자를 왼쪽으로 끌면 거리가 줄어요 (오른쪽 원자는 거리의 절반만큼 움직이므로 2배)
      setSlider(SH.drag.s0 + ((SH.drag.x0 - p.x) * 2) / span);
    } else if (type === 'up') SH.drag = false;
    return true;
  }

  /* =========================================================
     ② 분자 만들기
     ========================================================= */
  const EL = {
    H: { v: 1, r: 19, col: '#e8eef6', outline: '#8fa3bd', tc: '#334155', name: '수소' },
    C: { v: 4, r: 28, col: '#4b5563', outline: '#1f2937', tc: '#fff', name: '탄소' },
    N: { v: 3, r: 26, col: '#3b82f6', outline: '#1e40af', tc: '#fff', name: '질소' },
    O: { v: 2, r: 26, col: '#ef4444', outline: '#991b1b', tc: '#fff', name: '산소' },
  };
  const KNOWN = {
    H2O1: ['H₂O', '물'], O2: ['O₂', '산소'], N2: ['N₂', '질소'], C1O2: ['CO₂', '이산화 탄소'], H3N1: ['NH₃', '암모니아'], C1H4: ['CH₄', '메테인'], H2: ['H₂', '수소'],
  };
  const SIX = ['H2O1', 'O2', 'N2', 'C1O2', 'H3N1', 'C1H4'];
  const WS = PHONE ? { x0: 12, y0: 104, x1: 548, y1: 584 } : { x0: 20, y0: 64, x1: 780, y1: 464 };
  const TRAY = PHONE ? { y0: 600, y1: 748 } : { y0: 480, y1: 588 };
  const trayPos = (i) => (PHONE ? { x: 80 + i * 134, y: 674 } : { x: 125 + i * 183, y: 538 });
  const TORDER = ['H', 'C', 'N', 'O'];
  const BU = { atoms: [], nid: 1, drag: null, made: {}, labels: [], msg: 0, anyBond: false };
  const free = (a) => EL[a.el].v - Object.values(a.bonds).reduce((s, o) => s + o, 0);
  function compOf(a) {
    const seen = new Set([a.id]), out = [a], q = [a];
    while (q.length) {
      const c = q.pop();
      Object.keys(c.bonds).forEach((id) => {
        if (seen.has(+id)) return; seen.add(+id);
        const n = BU.atoms.find((x) => x.id === +id); if (n) { out.push(n); q.push(n); }
      });
    }
    return out;
  }
  const atomById = (id) => BU.atoms.find((x) => x.id === id);
  function sigOf(atoms) {
    const cnt = {}; atoms.forEach((a) => { cnt[a.el] = (cnt[a.el] || 0) + 1; });
    return ['C', 'H', 'N', 'O'].filter((e) => cnt[e]).map((e) => e + (cnt[e] > 1 || ['C1O2', 'C1H4'].length < 0 ? cnt[e] : cnt[e])).join('').replace(/^H(\d)$/, 'H$1');
  }
  function sigKey(atoms) {
    const cnt = {}; atoms.forEach((a) => { cnt[a.el] = (cnt[a.el] || 0) + 1; });
    const parts = ['C', 'H', 'N', 'O'].filter((e) => cnt[e]);
    // 한 가지 원소만 있으면 (예: O₂) 개수만, 아니면 원소+개수를 모두 적는다
    if (parts.length === 1) return parts[0] + cnt[parts[0]];
    return parts.map((e) => e + cnt[e]).join('');
  }
  function genericFormula(atoms) {
    const cnt = {}; atoms.forEach((a) => { cnt[a.el] = (cnt[a.el] || 0) + 1; });
    return ['C', 'H', 'N', 'O'].filter((e) => cnt[e]).map((e) => e + (cnt[e] > 1 ? subN(cnt[e]) : '')).join('');
  }
  const isComplete = (atoms) => atoms.length >= 2 && atoms.every((a) => free(a) === 0);
  function spawn(el, x, y) {
    if (BU.atoms.length >= 22) { toast('원자가 너무 많아요. 🧹로 지워 주세요', 'bad', 1800); return null; }
    const a = { id: BU.nid++, el, x, y, vx: 0, vy: 0, bonds: {}, sc: 0.3, shake: 0, a: 1, done: null };
    tween(a, { sc: 1 }, { duration: RM ? 0.01 : 0.5, ease: 'outBack' });
    BU.atoms.push(a);
    return a;
  }
  function removeComp(comp) {
    comp.forEach((a) => {
      Object.keys(a.bonds).forEach((id) => { const n = atomById(+id); if (n) delete n.bonds[a.id]; });
      tween(a, { a: 0, sc: 0.4 }, { duration: RM ? 0.01 : 0.3, ease: 'outCubic', onDone: () => { const k = BU.atoms.indexOf(a); if (k >= 0) BU.atoms.splice(k, 1); } });
      a.dead = true; a.bonds = {};
    });
  }
  function clearBuild() {
    BU.atoms.forEach((a) => { a.dead = true; });
    removeComp(BU.atoms.slice());
    BU.drag = null; BU.labels.length = 0;
  }
  function makeBond(a, b, order) {
    a.bonds[b.id] = order; b.bonds[a.id] = order;
    BU.anyBond = true;
  }
  function restLen(a, b, order) { return (EL[a.el].r + EL[b.el].r) * 0.9 + 12 - (order - 1) * 5; }
  function stepBuild(dt) {
    const atoms = BU.atoms.filter((a) => !a.dead);
    // 힘 계산
    atoms.forEach((a) => { a.fx = 0; a.fy = 0; });
    const dragSet = BU.drag && BU.drag.comp ? new Set(BU.drag.comp.map((a) => a.id)) : null;
    const rootOf = {};
    atoms.forEach((a) => { if (rootOf[a.id] != null) return; compOf(a).forEach((c) => { rootOf[c.id] = a.id; }); });
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      Object.keys(a.bonds).forEach((id) => {
        const b = atomById(+id); if (!b || b.id < a.id) return;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        const L = restLen(a, b, a.bonds[id]), f = (d - L) * 70;
        const ux = dx / d, uy = dy / d;
        a.fx += ux * f; a.fy += uy * f; b.fx -= ux * f; b.fy -= uy * f;
      });
      for (let j = i + 1; j < atoms.length; j++) {
        const b = atoms[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        const same = rootOf[a.id] === rootOf[b.id];
        const rr = EL[a.el].r + EL[b.el].r;
        if (same && sharesPair(a, b)) continue;
        const lim = same ? rr + 56 : rr + 14;
        if (d < lim) {
          const f = (lim - d) * (same ? 30 : 120);
          const ux = dx / d, uy = dy / d;
          a.fx -= ux * f; a.fy -= uy * f; b.fx += ux * f; b.fy += uy * f;
        }
      }
      // 중심 원자에 이웃이 2개이면 결합각을 맞춰요 (O는 굽은 모양, 나머지는 곧은 모양) — 모양을 외우는 것이 목적은 아니에요
      const nb = Object.keys(a.bonds).map((id) => atomById(+id)).filter(Boolean);
      if (nb.length === 2) {
        const n1 = nb[0], n2 = nb[1];
        const L1 = restLen(a, n1, a.bonds[n1.id]), L2 = restLen(a, n2, a.bonds[n2.id]);
        const th = a.el === 'O' || a.el === 'N' ? (105 * Math.PI) / 180 : Math.PI;
        const tgt = Math.sqrt(L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos(th));
        const dx = n2.x - n1.x, dy = n2.y - n1.y, d = Math.hypot(dx, dy) || 0.01, f = (d - tgt) * 55;
        const ux = dx / d, uy = dy / d;
        n1.fx += ux * f; n1.fy += uy * f; n2.fx -= ux * f; n2.fy -= uy * f;
      }
    }
    atoms.forEach((a) => {
      if (dragSet && dragSet.has(a.id)) { a.vx = a.vy = 0; return; }
      a.vx = (a.vx + a.fx * dt) * Math.exp(-6.5 * dt); a.vy = (a.vy + a.fy * dt) * Math.exp(-6.5 * dt);
      const sp = Math.hypot(a.vx, a.vy); if (sp > 700) { a.vx *= 700 / sp; a.vy *= 700 / sp; }
      a.x += a.vx * dt; a.y += a.vy * dt;
      const r = EL[a.el].r;
      a.x = clamp(a.x, WS.x0 + r, WS.x1 - r); a.y = clamp(a.y, WS.y0 + r, WS.y1 - r);
      if (a.shake > 0) a.shake = Math.max(0, a.shake - dt * 2.4);
    });
    // 완성 판정
    const seen = new Set();
    atoms.forEach((a) => {
      if (seen.has(a.id)) return;
      const comp = compOf(a); comp.forEach((c) => seen.add(c.id));
      const key = comp.map((c) => c.id).sort().join(',') + '|' + comp.map((c) => Object.values(c.bonds).join('')).join('.');
      const ok = isComplete(comp);
      if (ok) {
        if (comp.some((c) => c.done !== key)) { comp.forEach((c) => { c.done = key; }); celebrate(comp); }
      } else comp.forEach((c) => { c.done = null; });
    });
    BU.labels.forEach((l) => { l.t += dt; });
    BU.labels = BU.labels.filter((l) => l.t < 2.6);
  }
  function sharesPair(a, b) {
    // a와 b가 이웃이 2개뿐인 같은 원자에 결합해 있으면 (각도는 따로 맞춰요) true
    for (const id of Object.keys(a.bonds)) { if (b.bonds[id] != null) { const c = atomById(+id); if (c && Object.keys(c.bonds).length === 2) return true; } }
    return false;
  }
  function compOfId(id) { const a = atomById(id); return a ? compOf(a).map((c) => c.id).sort((x, y) => x - y)[0] : -1; }
  function celebrate(comp) {
    const key = sigKey(comp), info = KNOWN[key];
    const cx = comp.reduce((s, a) => s + a.x, 0) / comp.length, cy = comp.reduce((s, a) => s + a.y, 0) / comp.length;
    Sound.success();
    fx.burst(cx, cy, { count: 24, speed: 190, size: 4, gravity: 120 });
    comp.forEach((a) => { a.sc = 1.25; tween(a, { sc: 1 }, { duration: RM ? 0.01 : 0.5, ease: 'outBack' }); });
    if (info) {
      if (SIX.indexOf(key) >= 0) BU.made[key] = true;
      BU.labels.push({ x: cx, y: cy, text: info[0] + ' ' + info[1] + ' 분자 완성!', t: 0, ok: true });
      showHint(info[1] + ' 분자 ' + info[0] + ' 완성! 모든 원자의 결합 수가 채워졌어요', 4200);
    } else {
      BU.labels.push({ x: cx, y: cy, text: genericFormula(comp) + ' 새로운 분자!', t: 0, ok: true });
      showHint('새로운 분자를 만들었어요! (' + genericFormula(comp) + ')', 4200);
    }
  }
  const madeCount = () => SIX.filter((k) => BU.made[k]).length;

  function bondHit(p) {
    let best = null, bd = PHONE ? 20 : 14;
    BU.atoms.forEach((a) => {
      Object.keys(a.bonds).forEach((id) => {
        const b = atomById(+id); if (!b || b.id < a.id) return;
        const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1;
        let u = ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2; u = clamp(u, 0.0, 1.0);
        const px = a.x + vx * u, py = a.y + vy * u, d = Math.hypot(p.x - px, p.y - py);
        if (d < bd) { bd = d; best = [a, b]; }
      });
    });
    return best;
  }
  function atomHit(p) {
    let best = null, bd = 1e9;
    BU.atoms.forEach((a) => {
      if (a.dead) return;
      const d = Math.hypot(p.x - a.x, p.y - a.y);
      if (d < EL[a.el].r + (PHONE ? 10 : 6) && d < bd) { bd = d; best = a; }
    });
    return best;
  }
  function trayHit(p) {
    for (let i = 0; i < 4; i++) { const t = trayPos(i); if (Math.hypot(p.x - t.x, p.y - t.y) < EL[TORDER[i]].r + 18) return TORDER[i]; }
    return null;
  }
  function buildPointer(p, type) {
    if (type === 'down') {
      const te = trayHit(p);
      if (te) {
        const a = spawn(te, p.x, p.y); if (!a) return false;
        BU.drag = { atom: a, comp: [a], ox: 0, oy: 0, from: 'tray', moved: false, sx: p.x, sy: p.y };
        Sound.click(); return true;
      }
      const a = atomHit(p);
      if (a) {
        const comp = compOf(a);
        BU.drag = { atom: a, comp, ox: p.x - a.x, oy: p.y - a.y, from: 'ws', moved: false, sx: p.x, sy: p.y };
        comp.forEach((c) => { c.lift = 1; });
        return true;
      }
      const bd = bondHit(p);
      if (bd) { BU.drag = { bond: bd, from: 'bond', moved: false, sx: p.x, sy: p.y }; return true; }
      return false;
    }
    const d = BU.drag; if (!d) return true;
    if (type === 'move') {
      if (Math.hypot(p.x - d.sx, p.y - d.sy) > 7) d.moved = true;
      if (d.comp) {
        const nx = p.x - d.ox, ny = p.y - d.oy, dx = nx - d.atom.x, dy = ny - d.atom.y;
        d.comp.forEach((a) => { a.x = clamp(a.x + dx, 0 + EL[a.el].r, VW - EL[a.el].r); a.y = clamp(a.y + dy, 20, VH - 20); });
      }
    } else if (type === 'up') {
      BU.drag = null;
      if (d.bond) { if (!d.moved) cycleBond(d.bond[0], d.bond[1]); return true; }
      d.comp.forEach((c) => { c.lift = 0; });
      // 원자 카드를 눌러 놓기만 했으면 가운데쯤에 놓아요
      if (d.from === 'tray' && !d.moved) {
        const a = d.atom; a.x = (WS.x0 + WS.x1) / 2 + rnd(-90, 90); a.y = (WS.y0 + WS.y1) / 2 + rnd(-60, 60);
        return true;
      }
      const g = d.atom;
      // 카드 보관함에 놓으면 지워요
      if (p.y > TRAY.y0) { removeComp(d.comp); Sound.click(); return true; }
      tryBond(d);
    }
    return true;
  }
  function tryBond(d) {
    const comp = d.comp, ids = new Set(comp.map((c) => c.id));
    let best = null, bd = 1e9;
    comp.forEach((a) => BU.atoms.forEach((b) => {
      if (b.dead || ids.has(b.id)) return;
      const gap = Math.hypot(a.x - b.x, a.y - b.y) - EL[a.el].r - EL[b.el].r;
      if (gap < bd) { bd = gap; best = [a, b]; }
    }));
    if (!best || bd > 30) return;
    const [a, b] = best;
    if (free(a) >= 1 && free(b) >= 1) {
      // 결합 방향: 끌어 온 원자가 상대 쪽으로 붙도록 살짝 당겨 줘요
      makeBond(a, b, 1);
      Sound.tick();
      fx.burst((a.x + b.x) / 2, (a.y + b.y) / 2, { count: 8, colors: ['#fbbf24', '#fff'], speed: 90, size: 3, gravity: 0, life: 0.5 });
      if (free(a) === 0 || free(b) === 0) { /* 한쪽이 가득 찼어요 */ }
      showHint(free(a) + free(b) > 0 ? '남은 결합 손(점선)을 채워 봐요' : '결합했어요', 2500);
    } else {
      const full = free(a) < 1 ? a : b;
      Sound.fail();
      [a, b].forEach((x) => { x.shake = 1; });
      comp.forEach((c) => { const dx = c.x - best[1].x, dy = c.y - best[1].y, dd = Math.hypot(dx, dy) || 1; c.vx += (dx / dd) * 260; c.vy += (dy / dd) * 260; });
      showHint(EL[full.el].name + '(' + full.el + ') 원자는 결합을 ' + EL[full.el].v + '개만 만들 수 있고, 이미 다 채워졌어요', 4200);
    }
  }
  function cycleBond(a, b) {
    const o = a.bonds[b.id];
    if (o < 3 && free(a) >= 1 && free(b) >= 1) {
      makeBond(a, b, o + 1); Sound.tick();
      fx.burst((a.x + b.x) / 2, (a.y + b.y) / 2, { count: 6, colors: ['#fbbf24'], speed: 80, size: 3, gravity: 0, life: 0.4 });
    } else if (o > 1) {
      makeBond(a, b, 1); Sound.click();
    } else {
      a.shake = b.shake = 1; Sound.fail();
      showHint('두 원자 모두 남은 결합 손이 있어야 이중 결합으로 바꿀 수 있어요', 3800);
    }
  }
  function drawAtomBall(a, t) {
    const e = EL[a.el], r = e.r * a.sc * (1 + (a.lift ? 0.1 : 0));
    const sx = a.shake > 0 ? Math.sin(a.shake * 34) * 5 * a.shake : 0;
    if (a.lift) D.glow(a.x, a.y + 4, r * 1.9, '#7c3aed', 0.22);
    ctx.save(); ctx.globalAlpha *= a.a;
    D.sphere(a.x + sx, a.y, r, e.col, { shadow: true, outline: e.outline, outlineWidth: 1.6, dark: shade(e.col, -0.25) });
    D.text(a.x + sx, a.y + r * 0.34, a.el, { size: Math.round(r * 0.95), weight: 800, color: e.tc });
    ctx.restore();
  }
  function drawBond(a, b, o, glow) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
    const offs = o === 1 ? [0] : o === 2 ? [-5, 5] : [-8, 0, 8];
    ctx.save(); ctx.lineCap = 'round';
    offs.forEach((of) => {
      ctx.strokeStyle = 'rgba(60,70,95,.55)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(a.x + nx * of, a.y + ny * of); ctx.lineTo(b.x + nx * of, b.y + ny * of); ctx.stroke();
      ctx.strokeStyle = glow ? '#fde68a' : '#d8dfec'; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(a.x + nx * of, a.y + ny * of); ctx.lineTo(b.x + nx * of, b.y + ny * of); ctx.stroke();
    });
    ctx.restore();
  }
  function drawStubs(a, t) {
    const f = free(a); if (f <= 0 || a.dead) return;
    const nbrs = Object.keys(a.bonds).map((id) => atomById(+id)).filter(Boolean);
    let dir = -Math.PI / 2;
    if (nbrs.length) { let sx = 0, sy = 0; nbrs.forEach((n) => { const dx = n.x - a.x, dy = n.y - a.y, dd = Math.hypot(dx, dy) || 1; sx -= dx / dd; sy -= dy / dd; }); dir = Math.atan2(sy, sx); }
    const e = EL[a.el], r = e.r * a.sc;
    for (let k = 0; k < f; k++) {
      const ang = dir + (nbrs.length === 0 ? (k * TAU) / f - Math.PI / 2 - dir : (k - (f - 1) / 2) * 0.62) + Math.sin(t * 3 + a.id + k) * 0.05;
      const x1 = a.x + Math.cos(ang) * (r + 2), y1 = a.y + Math.sin(ang) * (r + 2), x2 = a.x + Math.cos(ang) * (r + 17), y2 = a.y + Math.sin(ang) * (r + 17);
      ctx.save(); ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 4 + k + a.id);
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 2.6; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x2, y2, 5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  function drawBuild(t) {
    // 작업대
    D.shadow(() => { D.roundRect(WS.x0, WS.y0, WS.x1 - WS.x0, WS.y1 - WS.y0, 20); ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fill(); }, { blur: 12, y: 4 });
    ctx.save(); ctx.strokeStyle = 'rgba(124,58,237,.12)'; ctx.lineWidth = 1.5;
    for (let x = WS.x0 + 40; x < WS.x1; x += 40) { ctx.beginPath(); ctx.moveTo(x, WS.y0 + 10); ctx.lineTo(x, WS.y1 - 10); ctx.stroke(); }
    for (let y = WS.y0 + 40; y < WS.y1; y += 40) { ctx.beginPath(); ctx.moveTo(WS.x0 + 10, y); ctx.lineTo(WS.x1 - 10, y); ctx.stroke(); }
    ctx.restore();
    // 만든 분자 목록
    const chipY = PHONE ? [34, 76] : [34];
    SIX.forEach((k, i) => {
      const row = PHONE ? Math.floor(i / 3) : 0, col = PHONE ? i % 3 : i, per = PHONE ? 3 : 6;
      const cw = (VW - 24) / per, x = 12 + cw * (col + 0.5), y = chipY[row];
      const ok = BU.made[k];
      pill(x, y, (ok ? '✔ ' : '') + KNOWN[k][0] + ' ' + KNOWN[k][1], { bg: ok ? '#14a058' : '#fff', color: ok ? '#fff' : INK, border: ok ? null : '#c9b6f5', size: fs(PHONE ? 12 : 13) });
    });
    // 결합과 원자
    const atoms = BU.atoms;
    const done = new Set();
    atoms.forEach((a) => { if (a.done) done.add(a.id); });
    atoms.forEach((a) => { Object.keys(a.bonds).forEach((id) => { const b = atomById(+id); if (b && b.id > a.id) drawBond(a, b, a.bonds[id], done.has(a.id)); }); });
    // 완성 후광
    const seen = new Set();
    atoms.forEach((a) => {
      if (seen.has(a.id) || !a.done) return;
      const comp = compOf(a); comp.forEach((c) => seen.add(c.id));
      const cx = comp.reduce((s, c) => s + c.x, 0) / comp.length, cy = comp.reduce((s, c) => s + c.y, 0) / comp.length;
      D.glow(cx, cy, 70 + comp.length * 14, '#34d399', 0.28);
    });
    atoms.forEach((a) => drawAtomBall(a, t));
    atoms.forEach((a) => drawStubs(a, t));
    // 덜 채워진 분자 표시
    const seen2 = new Set();
    atoms.forEach((a) => {
      if (seen2.has(a.id) || a.dead) return;
      const comp = compOf(a); comp.forEach((c) => seen2.add(c.id));
      if (comp.length < 2 || isComplete(comp)) return;
      const cx = comp.reduce((s, c) => s + c.x, 0) / comp.length, top = Math.min.apply(null, comp.map((c) => c.y - EL[c.el].r));
      const n = comp.reduce((s, c) => s + free(c), 0);
      pill(cx, top - fs(26), '빈 손 ' + n + '개 · 아직 덜 채워졌어요', { bg: '#fff', color: '#7c3aed', border: '#c9b6f5', size: fs(12) });
    });
    // 완성 라벨
    BU.labels.forEach((l) => {
      const k = l.t / 2.6, y = l.y - 64 - Math.min(l.t, 0.6) * 24;
      ctx.save(); ctx.globalAlpha = k < 0.8 ? 1 : (1 - k) / 0.2;
      pill(l.x, y, l.text, { bg: '#14a058', size: fs(14) });
      D.check(l.x - 0 , y - 26, 11, clamp(l.t * 3, 0, 1));
      ctx.restore();
    });
    if (!BU.atoms.length) lines(VW / 2, (WS.y0 + WS.y1) / 2 - 10, ['아래 원자 카드를 끌어 와서', '원자끼리 가까이 가져가 결합시켜요'], { size: fs(16), color: MUTED, lh: fs(26) });
    // 원자 카드 보관함
    D.shadow(() => { D.roundRect(WS.x0, TRAY.y0, WS.x1 - WS.x0, TRAY.y1 - TRAY.y0, 20); ctx.fillStyle = BU.drag && BU.drag.comp && BU.drag.from === 'ws' ? '#fde8e8' : '#fff'; ctx.fill(); }, { blur: 10, y: 3 });
    D.text(VW / 2, TRAY.y0 + fs(22), BU.drag && BU.drag.from === 'ws' ? '🗑 여기에 놓으면 지워져요' : '원자 카드 (끌어 가거나 눌러요) · 결합 수가 표시돼요', { size: fs(13), weight: 800, color: MUTED });
    TORDER.forEach((k, i) => {
      const tp = trayPos(i), e = EL[k];
      const bob = Math.sin(t * 2 + i) * 2;
      D.sphere(tp.x, tp.y + bob - 6, e.r, e.col, { shadow: true, outline: e.outline, outlineWidth: 1.6, dark: shade(e.col, -0.25) });
      D.text(tp.x, tp.y + bob - 6 + e.r * 0.34, k, { size: Math.round(e.r * 0.95), weight: 800, color: e.tc });
      D.text(tp.x, tp.y + e.r + fs(16), e.name + ' · 결합 ' + e.v + '개', { size: fs(13), weight: 700, color: INK });
    });
  }

  /* =========================================================
     ③ 전도성 실험: 증류수 · 설탕(고체) · 설탕물 · 에탄올 · 소금물
     ========================================================= */
  const CG = PHONE ? {
    bat: { x: 58, y: 150 }, topY: 70, bulb: { x: 300, y: 70 }, amm: { x: 490, y: 170 }, rightX: 490,
    box: { x: 56, y: 420, w: 448, h: 246 }, wireY: 330, exInset: 44, exTop: 350,
  } : {
    bat: { x: 100, y: 132 }, topY: 56, bulb: { x: 400, y: 56 }, amm: { x: 690, y: 134 }, rightX: 690,
    box: { x: 210, y: 292, w: 380, h: 208 }, wireY: 210, exInset: 38, exTop: 226,
  };
  const exX = () => [CG.box.x + CG.exInset, CG.box.x + CG.box.w - CG.exInset];
  const boxIn = () => { const b = CG.box; return { x0: b.x + 16, x1: b.x + b.w - 16, y0: b.y + 34, y1: b.y + b.h - 14 }; };
  const SAMPLES = {
    water: { name: '증류수', imax: 0, liquid: true, desc: '물 분자뿐이고 전하를 띤 입자가 없어요' },
    sugarS: { name: '설탕 (고체)', imax: 0, liquid: false, desc: '설탕 분자가 쌓여 있어요 (전하가 없어요)' },
    sugar: { name: '설탕물', imax: 0, liquid: true, desc: '설탕 분자가 흩어져도 전하가 없어요' },
    eth: { name: '에탄올', imax: 0, liquid: false, desc: '에탄올 분자도 전하가 없어요' },
    brine: { name: '소금물', imax: 120, liquid: true, desc: '이온이 자유롭게 움직여 전류가 흘러요' },
  };
  const CD = {
    sample: 'water', sw: false, swT: 0, I: 0, flow: 0, lampSmooth: 0, fade: 1, pts: [],
    results: { water: null, sugarS: null, sugar: null, eth: null, brine: null },
  };
  function buildSample(s) {
    const bi = boxIn(), [exL, exR] = exX(), P = [];
    const cx = (bi.x0 + bi.x1) / 2;
    const mk = (kind, x, y) => ({ kind, x, y, sx: x, sy: y, vx: rnd(-25, 25), vy: rnd(-25, 25), th: rnd(0, TAU), w: rnd(-0.8, 0.8), a: 0, j: rnd(0, 6) });
    const rndPos = () => [rnd(exL + 24, exR - 24), rnd(bi.y0 + 14, bi.y1 - 12)];
    if (s === 'water') for (let i = 0; i < 40; i++) P.push(mk('w', ...rndPos()));
    else if (s === 'sugarS') {
      const cols = 5, rows = 3, sp = Math.min(54, (exR - exL - 70) / (cols - 1));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) P.push(mk('s', cx + (c - (cols - 1) / 2) * sp, bi.y1 - 30 - r * sp));
    } else if (s === 'sugar') { for (let i = 0; i < 8; i++) P.push(mk('s', ...rndPos())); for (let i = 0; i < 30; i++) P.push(mk('w', ...rndPos())); }
    else if (s === 'eth') for (let i = 0; i < 22; i++) P.push(mk('e', ...rndPos()));
    else { for (let i = 0; i < 12; i++) P.push(mk(i % 2 ? 'cl' : 'na', ...rndPos())); for (let i = 0; i < 28; i++) P.push(mk('w', ...rndPos())); }
    CD.pts = P; CD.fade = 0;
  }
  function resetCond() {
    CD.sw = false; CD.swT = 0; CD.sample = 'water'; CD.I = 0;
    CD.results = { water: null, sugarS: null, sugar: null, eth: null, brine: null };
    buildSample('water'); syncCond();
  }
  function setSample(s) {
    CD.sample = s; CD.sw = false; CD.swT = 0; buildSample(s);
    Sound.click(); syncCond();
    showHint(SAMPLES[s].name + '에 전극을 넣었어요. 스위치를 켜 보세요.', 3500);
  }
  function setSwitch(on) { CD.sw = on; if (!on) CD.swT = 0; Sound.click(); syncCond(); }
  function syncCond() {
    $$('#sampleBtns .opt[data-s]').forEach((b) => { b.classList.toggle('on', b.dataset.s === CD.sample); b.classList.toggle('done', !!CD.results[b.dataset.s]); });
    const sw = $('#swBtn');
    sw.textContent = CD.sw ? '⚡ 스위치 끄기' : '⚡ 스위치 켜기';
    sw.classList.toggle('sw-on', CD.sw);
  }
  function recordCond() {
    const s = CD.sample;
    CD.results[s] = { I: Math.round(CD.I), lamp: CD.I > 15 };
    Sound.success();
    fx.burst(CG.bulb.x, CG.bulb.y + 60, { count: 14, speed: 120, size: 3.5, colors: ['#ffd34d', '#fff'] });
    toast('📝 ' + SAMPLES[s].name + ': 전구 ' + (CD.results[s].lamp ? '켜짐' : '꺼짐') + ' · ' + CD.results[s].I + ' mA (기록됨)', 'good', 2200);
    syncCond();
  }
  const nRec = () => Object.values(CD.results).filter(Boolean).length;
  function stepCond(dt) {
    const s = CD.sample, bi = boxIn(), [exL, exR] = exX();
    CD.fade = approach(CD.fade, 1, dt, 4);
    const It = CD.sw ? SAMPLES[s].imax : 0;
    CD.I = approach(CD.I, It, dt, 5);
    if (CD.I < 0.5 && It === 0) CD.I = 0;
    CD.lampSmooth = approach(CD.lampSmooth, clamp(CD.I / 100, 0, 1), dt, 8);
    CD.flow += dt * (CD.I / 180) * 2.2;
    if (CD.sw) CD.swT += dt; else CD.swT = 0;
    if (CD.swT > 1.4 && !CD.results[s]) recordCond();
    CD.pts.forEach((p) => {
      p.a = approach(p.a, 1, dt, 3);
      if (p.kind === 's' && s === 'sugarS') { p.x = approach(p.x, p.sx, dt, 9); p.y = approach(p.y, p.sy, dt, 9); return; }
      const ion = p.kind === 'na' || p.kind === 'cl';
      const spd = p.kind === 'e' ? 70 : p.kind === 's' ? 36 : 90;
      p.vx += rnd(-1, 1) * (p.kind === 'w' ? 120 : 160) * dt; p.vy += rnd(-1, 1) * (p.kind === 'w' ? 120 : 160) * dt;
      if (ion && CD.sw) p.vx += (p.kind === 'na' ? -1 : 1) * 190 * dt;
      const damp = Math.exp(-(ion ? 2.1 : 1.6) * dt); p.vx *= damp; p.vy *= damp;
      const sp = Math.hypot(p.vx, p.vy), mx = ion ? 120 : spd; if (sp > mx) { p.vx *= mx / sp; p.vy *= mx / sp; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.th += p.w * dt;
      if (p.y < bi.y0 + 8) { p.y = bi.y0 + 8; p.vy = Math.abs(p.vy); }
      if (p.y > bi.y1 - 6) { p.y = bi.y1 - 6; p.vy = -Math.abs(p.vy); }
      if (p.x < exL + 12 && !ion) { p.x = exL + 12; p.vx = Math.abs(p.vx); }
      if (p.x > exR - 12 && !ion) { p.x = exR - 12; p.vx = -Math.abs(p.vx); }
      if (p.x < bi.x0 + 8) { p.x = bi.x0 + 8; p.vx = Math.abs(p.vx); }
      if (p.x > bi.x1 - 8) { p.x = bi.x1 - 8; p.vx = -Math.abs(p.vx); }
      if (ion && CD.sw) {
        if (p.kind === 'na' && p.x < exL + 12) { p.x = rnd(exR - 70, exR - 24); p.y = rnd(bi.y0 + 14, bi.y1 - 10); p.a = 0; }
        else if (p.kind === 'cl' && p.x > exR - 12) { p.x = rnd(exL + 24, exL + 70); p.y = rnd(bi.y0 + 14, bi.y1 - 10); p.a = 0; }
      }
    });
  }
  function drawBattery(x, y) {
    D.shadow(() => { D.roundRect(x - 26, y - 38, 52, 76, 10); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 8, y: 3 });
    ctx.strokeStyle = '#1b2333'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 17, y - 10); ctx.lineTo(x + 17, y - 10); ctx.stroke();
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - 9, y + 12); ctx.lineTo(x + 9, y + 12); ctx.stroke();
    D.text(x - 32, y - 22, '+', { size: fs(18), weight: 800, color: POS, align: 'right' });
    D.text(x - 32, y + 28, MINUS, { size: fs(20), weight: 800, color: NEG, align: 'right' });
    D.text(x, y + 55, '전지', { size: fs(13), weight: 700, color: MUTED });
  }
  function drawAmmeter(x, y, I) {
    const r = 44, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
    const ang = (v) => a0 + (a1 - a0) * clamp(v / 200, 0, 1);
    D.shadow(() => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }, { blur: 9, y: 3 });
    ctx.strokeStyle = '#c9d2df'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#3a4456'; ctx.lineCap = 'butt';
    for (let v = 0; v <= 200; v += 20) {
      const a = ang(v), major = v % 100 === 0;
      ctx.lineWidth = major ? 2.4 : 1.2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 7), y + Math.sin(a) * (r - 7)); ctx.lineTo(x + Math.cos(a) * (r - (major ? 16 : 12)), y + Math.sin(a) * (r - (major ? 16 : 12))); ctx.stroke();
      if (major) D.text(x + Math.cos(a) * (r - 27), y + Math.sin(a) * (r - 27) + 4, String(v), { size: 11, weight: 700, color: '#3a4456' });
    }
    D.text(x, y + 22, 'mA', { size: 12, weight: 800, color: MUTED });
    const a = ang(Math.min(I, 200));
    ctx.strokeStyle = '#e2464b'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 7, y - Math.sin(a) * 7); ctx.lineTo(x + Math.cos(a) * (r - 12), y + Math.sin(a) * (r - 12)); ctx.stroke();
    D.sphere(x, y, 5, '#3a4456', { gloss: false, shadow: false });
  }
  function drawBulb(x, y, lamp, t) {
    if (lamp > 0.02) { D.glow(x, y, 80 + lamp * 22, '#ffd34d', 0.65 * lamp); }
    ctx.save();
    const g = ctx.createRadialGradient(x - 7, y - 8, 3, x, y, 26);
    g.addColorStop(0, CO.mix('#eef2f8', '#fff6b0', lamp)); g.addColorStop(1, CO.mix('#cfd8e6', '#ffd34d', lamp));
    ctx.fillStyle = g; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y - 4, 24, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8b95a8'; D.roundRect(x - 11, y + 17, 22, 12, 3); ctx.fill();
    ctx.strokeStyle = lamp > 0.05 ? '#f59e0b' : '#7b8799'; ctx.lineWidth = lamp > 0.05 ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(x - 8, y + 17); ctx.lineTo(x - 5, y - 2); ctx.lineTo(x, y + 4); ctx.lineTo(x + 5, y - 2); ctx.lineTo(x + 8, y + 17); ctx.stroke();
    ctx.restore();
    D.text(x, y + 50, '전구', { size: fs(13), weight: 700, color: MUTED });
  }
  const swPos = () => ({ x: CG.bat.x + (CG.bulb.x - CG.bat.x) * 0.42, y: CG.topY });
  function wireSegs() {
    const b = CG.bat, [exL, exR] = exX(), sw = swPos();
    return [
      [[b.x, b.y - 38], [b.x, CG.topY], [sw.x - 26, CG.topY]],
      [[sw.x + 26, CG.topY], [CG.bulb.x - 30, CG.topY]],
      [[CG.bulb.x + 30, CG.topY], [CG.rightX, CG.topY], [CG.rightX, CG.amm.y - 44]],
      [[CG.rightX, CG.amm.y + 44], [CG.rightX, CG.wireY], [exR, CG.wireY], [exR, CG.exTop]],
      [[exL, CG.exTop], [exL, CG.wireY], [b.x, CG.wireY], [b.x, b.y + 38]],
    ];
  }
  function strokePoly(pts, w, col) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore();
  }
  function polyPoint(pts, d) {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.hypot(dx, dy);
      if (d <= acc + l) { const u = (d - acc) / l; return [pts[i - 1][0] + dx * u, pts[i - 1][1] + dy * u]; }
      acc += l;
    }
    return pts[pts.length - 1];
  }
  const polyLen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
  function drawWaterMol(x, y, th, s, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(th);
    const h = (sg) => [Math.cos(0.91) * 8 * s, sg * Math.sin(0.91) * 8 * s];
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2 * s;
    [-1, 1].forEach((sg) => { const p = h(sg); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p[0], p[1]); ctx.stroke(); });
    D.sphere(0, 0, 5.2 * s, '#ef6b5a', { gloss: false, shadow: false });
    [-1, 1].forEach((sg) => { const p = h(sg); D.sphere(p[0], p[1], 3.4 * s, '#f4f7fb', { gloss: false, shadow: false, outline: 'rgba(120,140,170,.6)', outlineWidth: 1 }); });
    ctx.restore();
  }

  function drawSugar(x, y, th, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(th);
    const r = PHONE ? 17 : 15;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const ang = (i * TAU) / 6; ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } ctx.closePath();
    const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#b45309'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
    D.sphere(-r * 0.35, -r * 0.2, 3.6, '#ef4444', { gloss: false, shadow: false }); D.sphere(r * 0.38, r * 0.25, 3.6, '#ef4444', { gloss: false, shadow: false }); D.sphere(r * 0.1, -r * 0.45, 3, '#fff', { gloss: false, shadow: false });
    ctx.restore();
  }
  function drawEth(x, y, th, a) {
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(th);
    ctx.strokeStyle = 'rgba(60,70,95,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, 3); ctx.lineTo(0, -3); ctx.lineTo(13, 3); ctx.stroke();
    D.sphere(-13, 3, 6.5, '#4b5563', { gloss: false, shadow: false }); D.sphere(0, -3, 6.5, '#4b5563', { gloss: false, shadow: false }); D.sphere(13, 3, 6.5, '#ef4444', { gloss: false, shadow: false });
    ctx.restore();
  }
  function drawCond(t) {
    const b = CG.box, [exL, exR] = exX();
    const s = CD.sample, lamp = CD.lampSmooth;
    const segs = wireSegs();
    segs.forEach((sg) => strokePoly(sg, 5, '#8a96ab'));
    if (CD.I > 2) {
      ctx.fillStyle = '#ffb400'; ctx.globalAlpha = 0.55 + 0.45 * clamp(CD.I / 120, 0, 1);
      segs.forEach((sg, si) => {
        const L = polyLen(sg), n = Math.max(1, Math.floor(L / 34));
        for (let i = 0; i < n; i++) { const d = (((i * 34 + CD.flow * 60 + si * 11) % L) + L) % L; const q = polyPoint(sg, d); ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, TAU); ctx.fill(); }
      });
      ctx.globalAlpha = 1;
    }
    drawBulb(CG.bulb.x, CG.topY, lamp, t);
    drawBattery(CG.bat.x, CG.bat.y);
    const swx = swPos().x, swy = swPos().y;
    D.sphere(swx - 24, swy, 5, '#4b5873', { gloss: false, shadow: false }); D.sphere(swx + 24, swy, 5, '#4b5873', { gloss: false, shadow: false });
    ctx.save(); ctx.strokeStyle = CD.sw ? NEU : '#e2464b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(swx - 24, swy); ctx.lineTo(CD.sw ? swx + 24 : swx + 15, CD.sw ? swy : swy - 20); ctx.stroke(); ctx.restore();
    D.text(swx, swy + 30, '스위치 ' + (CD.sw ? 'ON' : 'OFF'), { size: fs(13), weight: 800, color: CD.sw ? '#0b6b39' : '#a3262b' });
    drawAmmeter(CG.amm.x, CG.amm.y, CD.I);
    D.text(CG.amm.x, CG.amm.y + 66, '전류 ' + (CD.I < 0.5 ? '0.0' : Math.round(CD.I)) + ' mA', { size: fs(14), weight: 800, color: INK });
    // 용기
    ctx.save();
    D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 22); ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fill(); }, { blur: 14, y: 5 });
    if (s === 'water' || s === 'sugar' || s === 'brine') {
      const g = ctx.createLinearGradient(0, b.y + 30, 0, b.y + b.h);
      g.addColorStop(0, s === 'sugar' ? 'rgba(255,236,170,.55)' : 'rgba(150,205,255,.55)'); g.addColorStop(1, s === 'sugar' ? 'rgba(250,215,120,.7)' : 'rgba(110,175,245,.75)');
      D.roundRect(b.x + 6, b.y + 30, b.w - 12, b.h - 36, 18); ctx.fillStyle = g; ctx.fill();
    } else if (s === 'eth') {
      D.roundRect(b.x + 6, b.y + 30, b.w - 12, b.h - 36, 18); ctx.fillStyle = 'rgba(214,200,250,.5)'; ctx.fill();
    }
    ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 3.5; D.roundRect(b.x, b.y, b.w, b.h, 22); ctx.stroke();
    ctx.restore();
    // 입자 모형
    ctx.save(); ctx.globalAlpha = CD.fade;
    CD.pts.forEach((p) => {
      const a = p.a;
      if (p.kind === 'w') drawWaterMol(p.x, p.y, p.th, PHONE ? 1.15 : 1, a * 0.95);
      else if (p.kind === 's') {
        const jit = s === 'sugarS' ? Math.sin(t * 9 + p.j) * 1.1 : 0;
        drawSugar(p.x + jit, p.y + jit * 0.6, p.th, a);
      } else if (p.kind === 'e') drawEth(p.x, p.y, p.th, a);
      else {
        const na = p.kind === 'na', r = na ? (PHONE ? 13 : 11.5) : (PHONE ? 18 : 16);
        if (CD.sw && CD.I > 5) {
          ctx.strokeStyle = na ? 'rgba(226,70,75,.28)' : 'rgba(56,103,244,.28)'; ctx.lineWidth = r * 0.9; ctx.lineCap = 'round';
          ctx.globalAlpha = CD.fade * a; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + (na ? 20 : -20), p.y); ctx.stroke(); ctx.globalAlpha = CD.fade;
        }
        ctx.save(); ctx.globalAlpha = CD.fade * a;
        D.sphere(p.x, p.y, r, na ? POS : NEG, { shadow: false });
        D.text(p.x, p.y + fs(5), na ? '+' : MINUS, { size: Math.round(r * 1.25), weight: 800, color: '#fff' });
        ctx.restore();
      }
    });
    ctx.restore();
    // 전극
    [exL, exR].forEach((x, i) => {
      D.shadow(() => { D.roundRect(x - 6, CG.exTop, 12, b.y + b.h - 28 - CG.exTop, 4); ctx.fillStyle = '#7b8799'; ctx.fill(); }, { blur: 5, y: 2 });
      ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - 4, CG.exTop + 2, 3, b.y + b.h - 34 - CG.exTop);
      D.sphere(x, CG.exTop - 14, 14, i ? POS : NEG, { gloss: false, shadow: false });
      D.text(x, CG.exTop - 8, i ? '+' : MINUS, { size: fs(18), weight: 800, color: '#fff' });
    });
    pill(b.x + b.w / 2, b.y - (PHONE ? 8 : 10) - 4, '🔍 입자 모형: ' + SAMPLES[s].name, { bg: '#4c1d95', color: '#fff', size: fs(14) });
    D.text(b.x + b.w / 2, b.y + b.h + fs(28), SAMPLES[s].desc, { size: fs(14), weight: 700, color: MUTED });
    if (CD.sw && CD.I > 20) {
      pill(exL - 6, b.y + b.h + fs(54), 'Na⁺ → (−)극', { bg: POS, size: fs(12) });
      pill(exR + 6, b.y + b.h + fs(54), '(+)극 ← Cl⁻', { bg: NEG, size: fs(12) });
    }
    if (CD.results[s]) D.check(b.x + 22, b.y + 20, 14, 1);
    // 범례
    const ly = b.y + b.h + fs(82);
    if (!PHONE || ly < VH - 10) {
      if (s === 'sugar' || s === 'sugarS') pill(b.x + b.w / 2, ly, '🍬 설탕 분자: 하나의 덩어리, 전하 없음', { bg: '#fff', color: INK, border: '#f59e0b', size: fs(13) });
      else if (s === 'eth') pill(b.x + b.w / 2, ly, '에탄올 분자: 전하 없음', { bg: '#fff', color: INK, border: '#c9b6f5', size: fs(13) });
      else if (s === 'brine') pill(b.x + b.w / 2, ly, '이온 결합 물질이 녹아 이온이 생겼어요', { bg: '#fff', color: INK, border: '#c9b6f5', size: fs(13) });
    }
  }

  /* =========================================================
     ④ 결합 비교: 이온 결합 / 공유 결합 분류 + 전도성 예측
     ========================================================= */
  const CARDS = [
    { id: 'CO2', f: 'CO₂', n: '이산화 탄소', k: 'cov', els: [['C', 0], ['O', 0]] },
    { id: 'NaCl', f: 'NaCl', n: '소금', k: 'ion', els: [['Na', 1], ['Cl', 0]] },
    { id: 'sugar', f: '설탕', n: '', k: 'cov', els: [['C', 0], ['H', 0], ['O', 0]] },
    { id: 'MgO', f: 'MgO', n: '산화 마그네슘', k: 'ion', els: [['Mg', 1], ['O', 0]] },
    { id: 'O2', f: 'O₂', n: '산소', k: 'cov', els: [['O', 0]] },
    { id: 'CaCl2', f: 'CaCl₂', n: '염화 칼슘', k: 'ion', els: [['Ca', 1], ['Cl', 0]] },
    { id: 'H2O', f: 'H₂O', n: '물', k: 'cov', els: [['H', 0], ['O', 0]] },
    { id: 'eth', f: '에탄올', n: '', k: 'cov', els: [['C', 0], ['H', 0], ['O', 0]] },
  ];
  const BIN = PHONE
    ? { ion: { x: 12, y: 58, w: 262, h: 296 }, cov: { x: 286, y: 58, w: 262, h: 296 } }
    : { ion: { x: 24, y: 50, w: 364, h: 270 }, cov: { x: 412, y: 50, w: 364, h: 270 } };
  const CSZ = PHONE ? { bw: 117, bh: 40, tw: 244, th: 48 } : { bw: 163, bh: 46, tw: 172, th: 56 };
  const CL = { cards: [], seqN: 0, drag: null, pred: { ion: null, cov: null }, verified: false, lit: { ion: 0, cov: 0 }, msg: '' };
  function trayTarget(i) {
    if (PHONE) { return { x: 12 + 122 + (i % 2) * 262 + (i % 2 ? 0 : 0), y: 404 + Math.floor(i / 2) * 58 }; }
    return { x: 24 + 86 + (i % 4) * 182, y: 388 + Math.floor(i / 4) * 68 };
  }
  function binTarget(bin, slot) {
    const b = BIN[bin], col = slot % 2, row = Math.floor(slot / 2);
    return { x: b.x + 14 + CSZ.bw / 2 + col * (CSZ.bw + 10), y: b.y + (PHONE ? 74 : 84) + CSZ.bh / 2 + row * (CSZ.bh + 8) };
  }
  function layoutCards() {
    ['ion', 'cov'].forEach((k) => {
      CL.cards.filter((c) => c.bin === k).sort((a, b) => a.seq - b.seq).forEach((c, i) => { const t = binTarget(k, i); c.tx = t.x; c.ty = t.y; });
    });
    CL.cards.forEach((c) => { if (!c.bin) { const t = trayTarget(CARDS.findIndex((x) => x.id === c.id)); c.tx = t.x; c.ty = t.y; } });
  }
  function resetClassify() {
    CL.cards = CARDS.map((c, i) => { const t = trayTarget(i); return { ...c, bin: null, seq: 0, x: t.x, y: t.y, tx: t.x, ty: t.y, lift: 0, mark: null, shake: 0 }; });
    CL.drag = null; CL.seqN = 0; CL.pred = { ion: null, cov: null }; CL.verified = false; CL.lit = { ion: 0, cov: 0 };
    syncPred();
    $('#classNote').textContent = '물질 카드를 끌어 알맞은 결합 상자에 넣어요.';
  }
  function syncPred() {
    $$('#predIon button').forEach((b) => b.classList.toggle('on', CL.pred.ion !== null && +b.dataset.p === CL.pred.ion));
    $$('#predCov button').forEach((b) => b.classList.toggle('on', CL.pred.cov !== null && +b.dataset.p === CL.pred.cov));
    $('#verifyBtn').disabled = CL.pred.ion === null || CL.pred.cov === null || CL.cards.some((c) => !c.bin);
  }
  function verifyConduct() {
    if (CL.pred.ion === null || CL.pred.cov === null) return;
    CL.verified = true; Sound.success();
    tween(CL.lit, { ion: 1 }, { duration: RM ? 0.01 : 0.8, ease: 'outCubic' });
    CL.lit.cov = 0;
    const okI = CL.pred.ion === 1, okC = CL.pred.cov === 0;
    $('#classNote').textContent = '이온 결합 물질: 녹이거나 물에 녹이면 이온이 움직여 전기가 통해요 ' + (okI ? '(예측 ✔)' : '(예측과 달라요)') + ' / 공유 결합 분자 물질: 이온이 없어 전기가 통하지 않아요 ' + (okC ? '(예측 ✔)' : '(예측과 달라요)');
    fx.burst(BIN.ion.x + 40, BIN.ion.y + 30, { count: 16, speed: 140, size: 3.5, colors: ['#ffd34d', '#fff'] });
  }
  function classifyCheck() {
    const un = CL.cards.filter((c) => !c.bin).length;
    if (un) return '아직 ' + un + '장이 상자에 들어가지 않았어요.';
    const bad = CL.cards.filter((c) => c.bin !== c.k);
    CL.cards.forEach((c) => { const m = c.bin !== c.k ? 'bad' : null; if (c.mark !== m) { c.mark = m; if (m) c.shake = 1; } });
    if (bad.length) return '✕ 표시된 ' + bad.length + '장을 다시 확인해요. 금속과 비금속이 만나면 전자를 주고받는 이온 결합, 비금속끼리는 전자를 함께 쓰는 공유 결합이에요.';
    if (CL.pred.ion === null || CL.pred.cov === null) return '이온 결합 물질과 공유 결합 물질을 녹이거나 물에 녹였을 때 전기가 통할지 예측해 골라요.';
    if (CL.pred.ion !== 1 || CL.pred.cov !== 0) return '예측을 다시 생각해 봐요. 앞의 실험에서 소금물은 전기가 통했고 설탕물·증류수는 통하지 않았어요.';
    if (!CL.verified) return '⚡ 전도성 확인하기를 눌러 예측이 맞는지 확인해요.';
    return true;
  }
  const classifyOK = () => CL.cards.length > 0 && CL.cards.every((c) => c.bin === c.k);
  function stepClassify(dt) {
    layoutCards();
    CL.cards.forEach((c) => {
      if (CL.drag && CL.drag.card === c) { c.lift = approach(c.lift, 1, dt, 14); return; }
      c.lift = approach(c.lift, 0, dt, 12);
      c.x = approach(c.x, c.tx, dt, 14); c.y = approach(c.y, c.ty, dt, 14);
      if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 2.4);
    });
  }
  function cardAt(p) {
    for (let i = CL.cards.length - 1; i >= 0; i--) {
      const c = CL.cards[i], inBin = !!c.bin, w = inBin ? CSZ.bw : CSZ.tw, h = inBin ? CSZ.bh : CSZ.th;
      if (Math.abs(p.x - c.x) < w / 2 && Math.abs(p.y - c.y) < h / 2) return c;
    }
    return null;
  }
  function classifyPointer(p, type) {
    if (type === 'down') {
      const c = cardAt(p); if (!c) return false;
      CL.drag = { card: c, ox: p.x - c.x, oy: p.y - c.y };
      c.mark = null; Sound.click();
      return true;
    }
    const d = CL.drag; if (!d) return true;
    if (type === 'move') { d.card.x = p.x - d.ox; d.card.y = p.y - d.oy; }
    else if (type === 'up') {
      const c = d.card; CL.drag = null;
      let nb = null;
      ['ion', 'cov'].forEach((k) => { const b = BIN[k]; if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) nb = k; });
      const was = c.bin; c.bin = nb;
      if (nb) { Sound.tick(); if (nb !== was) fx.burst(c.x, c.y, { count: 6, colors: [nb === 'ion' ? ION_C : COV_C], speed: 70, size: 3, gravity: 0, life: 0.4 }); }
      if (nb && nb !== was) c.seq = ++CL.seqN;
      syncPred();
      const left = CL.cards.filter((x) => !x.bin).length;
      if (!left && !CL.verified) $('#classNote').textContent = '모두 넣었어요! 이제 아래에서 전기가 통할지 예측해 봐요.';
    }
    return true;
  }
  function drawCard(c, t) {
    const inBin = !!c.bin, w = inBin ? CSZ.bw : CSZ.tw, h = inBin ? CSZ.bh : CSZ.th;
    const sc = 1 + c.lift * 0.1, sx = c.shake > 0 ? Math.sin(c.shake * 30) * 5 * c.shake : 0;
    ctx.save(); ctx.translate(c.x + sx, c.y - c.lift * 6); ctx.scale(sc, sc);
    D.shadow(() => { D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.fillStyle = '#fff'; ctx.fill(); }, { blur: 6 + c.lift * 12, y: 2 + c.lift * 7 });
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = c.mark === 'bad' ? '#e2464b' : inBin ? (c.bin === 'ion' ? ION_C : COV_C) : '#c9d2e3';
    D.roundRect(-w / 2, -h / 2, w, h, 12); ctx.stroke();
    if (inBin) {
      D.text(0, 6, c.f, { size: fs(PHONE ? 15 : 17), weight: 800, color: INK });
    } else {
      D.text(c.n ? -w / 2 + 14 : -w / 2 + 14, c.n ? -2 : 6, c.f, { size: fs(PHONE ? 16 : 18), weight: 800, color: INK, align: 'left' });
      if (c.n) D.text(-w / 2 + 14, fs(16), c.n, { size: fs(12), weight: 700, color: MUTED, align: 'left' });
      // 원소 점 (금속 / 비금속)
      const n = c.els.length, r = PHONE ? 11 : 11.5;
      c.els.forEach((e, i) => {
        const ex = w / 2 - 18 - (n - 1 - i) * (r * 2 + 4);
        D.sphere(ex, 0, r, e[1] ? '#64748b' : '#f59e0b', { gloss: false, shadow: false });
        D.text(ex, 4, e[0], { size: e[0].length > 1 ? 11 : 12, weight: 800, color: '#fff' });
      });
    }
    if (c.mark === 'bad') { D.text(w / 2 - 6, -h / 2 + 4, '✕', { size: 22, weight: 800, color: '#e2464b', align: 'right', stroke: '#fff', strokeWidth: 4 }); }
    ctx.restore();
  }
  function drawClassify(t) {
    ['ion', 'cov'].forEach((k) => {
      const b = BIN[k], col = k === 'ion' ? ION_C : COV_C;
      const hot = CL.drag && CL.drag.card && CL.drag.card.x > b.x && CL.drag.card.x < b.x + b.w && CL.drag.card.y > b.y && CL.drag.card.y < b.y + b.h;
      D.shadow(() => { D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.fillStyle = hot ? (k === 'ion' ? '#ede9fe' : '#d5f5ee') : 'rgba(255,255,255,.8)'; ctx.fill(); }, { blur: 10, y: 3 });
      ctx.strokeStyle = col; ctx.lineWidth = hot ? 4 : 2.5; ctx.setLineDash(hot ? [] : [8, 6]); D.roundRect(b.x, b.y, b.w, b.h, 18); ctx.stroke(); ctx.setLineDash([]);
      // 제목 + 전구
      const lit = CL.lit[k];
      drawBulbMini(b.x + 34, b.y + 32, lit, t);
      D.text(b.x + (PHONE ? 62 : 70), b.y + 30, k === 'ion' ? '이온 결합' : '공유 결합', { size: fs(PHONE ? 17 : 20), weight: 800, color: col, align: 'left' });
      D.text(b.x + (PHONE ? 62 : 70), b.y + 52, k === 'ion' ? '전자를 주고받아 만든 결합' : '전자를 함께 써서 만든 결합', { size: fs(PHONE ? 11 : 13), weight: 700, color: MUTED, align: 'left' });
      if (CL.verified) {
        const on = k === 'ion';
        pill(b.x + b.w - (PHONE ? 52 : 84), b.y + 24, on ? '전기 통함 ⚡' : '전기 안 통함', { bg: on ? '#f59e0b' : '#94a3b8', size: fs(PHONE ? 11 : 12) });
      }
    });
    // 카드 (상자 안 카드를 먼저, 끄는 카드는 맨 위)
    const inb = CL.cards.filter((c) => c.bin && c !== (CL.drag && CL.drag.card)), outb = CL.cards.filter((c) => !c.bin && c !== (CL.drag && CL.drag.card));
    outb.forEach((c) => drawCard(c, t)); inb.forEach((c) => drawCard(c, t));
    if (CL.drag) drawCard(CL.drag.card, t);
    const ty = PHONE ? 370 : 346;
    if (CL.verified) { /* 설명 칸이 아래에 나타나요 */ }
    const left = CL.cards.filter((c) => !c.bin).length;
    D.text(VW / 2, ty, left ? '물질 카드 ' + left + '장 · 끌어서 상자에 넣어요' : '모든 카드를 상자에 넣었어요 ✔', { size: fs(14), weight: 800, color: left ? MUTED : '#0b6b39' });
    // 전도성 확인 뒤: 입자 모형 비교 (이온은 움직이고, 분자는 전하가 없어요)
    if (CL.verified) {
      const by = PHONE ? 400 : 372;
      const bi = BIN.ion, bc = BIN.cov;
      const pw = PHONE ? 262 : 364;
      ctx.save(); ctx.globalAlpha = smooth(CL.lit.ion);
      D.roundRect(bi.x, by, pw, PHONE ? 150 : 120, 16); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = ION_C; ctx.lineWidth = 2; ctx.stroke();
      D.roundRect(bc.x, by, pw, PHONE ? 150 : 120, 16); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.strokeStyle = COV_C; ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const na = i % 2 === 0, x = bi.x + 40 + i * (pw - 80) / 5 + Math.sin(t * 2 + i) * 6, y = by + (PHONE ? 52 : 46) + Math.cos(t * 1.7 + i * 1.3) * 8;
        D.sphere(x, y, na ? 11 : 15, na ? POS : NEG, { shadow: false }); D.text(x, y + 5, na ? '+' : MINUS, { size: 15, weight: 800, color: '#fff' });
        D.arrow(x, y + 24, x + (na ? -20 : 20), y + 24, { color: na ? POS : NEG, width: 3, head: 8 });
      }
      for (let i = 0; i < 4; i++) {
        const x = bc.x + 52 + i * (pw - 104) / 3, y = by + (PHONE ? 52 : 46) + Math.sin(t * 1.5 + i * 2) * 5;
        drawWaterMol(x, y, t * 0.3 + i, 1.5, 1);
      }
      if (PHONE) {
        lines(bi.x + pw / 2, by + 98, ['이온이 움직여 전류를 나르니', '전기가 통해요'], { size: fs(12), color: '#5b21b6', weight: 800, lh: fs(18) });
        lines(bc.x + pw / 2, by + 98, ['전하가 없는 분자라', '전기가 안 통해요'], { size: fs(12), color: '#0f766e', weight: 800, lh: fs(18) });
      } else {
        D.text(bi.x + pw / 2, by + 90, '이온이 움직여 전류를 나르니 전기가 통해요', { size: fs(13), weight: 800, color: '#5b21b6' });
        D.text(bc.x + pw / 2, by + 90, '전하가 없는 분자라 전기가 안 통해요', { size: fs(13), weight: 800, color: '#0f766e' });
      }
      ctx.restore();
    }
    // 범례
    const ly = PHONE ? 640 : 566;
    D.sphere(VW / 2 - fs(120), ly, 9, '#64748b', { gloss: false, shadow: false }); D.text(VW / 2 - fs(106), ly + 5, '금속 원소', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
    D.sphere(VW / 2 + fs(10), ly, 9, '#f59e0b', { gloss: false, shadow: false }); D.text(VW / 2 + fs(24), ly + 5, '비금속 원소', { size: fs(13), weight: 700, color: MUTED, align: 'left' });
    D.text(VW / 2, ly + fs(34), '카드의 동그라미는 물질을 이루는 원소의 종류를 나타내요', { size: fs(12), weight: 700, color: MUTED });
  }
  function drawBulbMini(x, y, lit, t) {
    if (lit > 0.02) D.glow(x, y, 44 + 14 * lit, '#ffd34d', 0.7 * lit);
    ctx.save();
    const g = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, 17);
    g.addColorStop(0, CO.mix('#eef2f8', '#fff6b0', lit)); g.addColorStop(1, CO.mix('#cfd8e6', '#ffd34d', lit));
    ctx.fillStyle = g; ctx.strokeStyle = '#8fa3bd'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y - 3, 16, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8b95a8'; D.roundRect(x - 7, y + 10, 14, 8, 2); ctx.fill();
    ctx.strokeStyle = lit > 0.05 ? '#f59e0b' : '#7b8799'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 5, y + 10); ctx.lineTo(x - 3, y); ctx.lineTo(x, y + 4); ctx.lineTo(x + 3, y); ctx.lineTo(x + 5, y + 10); ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     읽기판 · 입력 · 그리기 · 반복
     ========================================================= */
  function updateReadouts() {
    const sc = S.scene;
    if (sc === 'share') {
      const isH = SH.mol === 'H2';
      setRO(1, '만드는 분자', isH ? 'H₂ (수소)' : 'Cl₂ (염소)');
      setRO(2, '공유 전자쌍', SH.bondA > 0.5 ? '1쌍 (결합 1개)' : '0쌍');
      setRO(3, '바깥 전자 수 (각 원자)', SH.bondA > 0.5 ? (isH ? '2개 · He과 같음' : '8개 · Ar과 같음') : (isH ? '1개' : '7개'));
    } else if (sc === 'build') {
      const n = BU.atoms.filter((a) => !a.dead).length, fr = BU.atoms.filter((a) => !a.dead).reduce((s, a) => s + free(a), 0);
      setRO(1, '놓인 원자', n + '개');
      setRO(2, '완성한 분자', madeCount() + ' / 6가지');
      setRO(3, '남은 빈 손', fr + '개');
    } else if (sc === 'conduct') {
      setRO(1, '시료', SAMPLES[CD.sample].name);
      setRO(2, '전류', (CD.I < 0.5 ? '0.0' : Math.round(CD.I)) + '<small>mA</small>');
      setRO(3, '전구', CD.lampSmooth > 0.1 ? '켜짐 💡' : '꺼짐');
    } else {
      const a = CL.cards.filter((c) => c.bin === 'ion').length, b = CL.cards.filter((c) => c.bin === 'cov').length;
      setRO(1, '이온 결합 상자', a + '장'); setRO(2, '공유 결합 상자', b + '장'); setRO(3, '남은 카드', (CL.cards.length - a - b) + '장');
    }
  }
  SciSim.pointer(view, {
    down(p) {
      const sc = S.scene;
      if (sc === 'share') return sharePointer(p, 'down');
      if (sc === 'build') return buildPointer(p, 'down');
      if (sc === 'classify') return classifyPointer(p, 'down');
      if (sc === 'conduct') { if (Math.hypot(p.x - swPos().x, p.y - swPos().y) < 44) setSwitch(!CD.sw); }
      return false;
    },
    move(p) { const sc = S.scene; if (sc === 'share') sharePointer(p, 'move'); else if (sc === 'build') buildPointer(p, 'move'); else if (sc === 'classify') classifyPointer(p, 'move'); },
    up(p) { const sc = S.scene; if (sc === 'share') sharePointer(p, 'up'); else if (sc === 'build') buildPointer(p, 'up'); else if (sc === 'classify') classifyPointer(p, 'up'); },
    hover(p) {
      const sc = S.scene;
      if (sc === 'share') return shareHit(p) ? 'grab' : null;
      if (sc === 'build') return trayHit(p) || atomHit(p) ? 'grab' : bondHit(p) ? 'pointer' : null;
      if (sc === 'classify') return cardAt(p) ? 'grab' : null;
      return null;
    },
  });
  if (PHONE) {
    view.canvas.style.touchAction = 'pan-y';
    view.canvas.addEventListener('touchstart', (e) => {
      const t0 = e.touches[0]; if (!t0) return;
      const p = view.toLocal(t0), sc = S.scene;
      let hit = false;
      if (sc === 'share') hit = shareHit(p);
      else if (sc === 'build') hit = !!(trayHit(p) || atomHit(p) || bondHit(p));
      else if (sc === 'classify') hit = !!cardAt(p);
      if (hit) e.preventDefault();
    }, { passive: false });
  }
  $('#sDist').addEventListener('input', (e) => { setSlider(+e.target.value / 100); });
  $$('#molSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); resetShare(b.dataset.m); }));
  $('#clearBtn').addEventListener('click', () => { Sound.click(); clearBuild(); });
  $$('#sampleBtns .opt[data-s]').forEach((b) => b.addEventListener('click', () => setSample(b.dataset.s)));
  $('#swBtn').addEventListener('click', () => setSwitch(!CD.sw));
  $$('#predIon button').forEach((b) => b.addEventListener('click', () => { Sound.click(); CL.pred.ion = +b.dataset.p; syncPred(); }));
  $$('#predCov button').forEach((b) => b.addEventListener('click', () => { Sound.click(); CL.pred.cov = +b.dataset.p; syncPred(); }));
  $('#verifyBtn').addEventListener('click', verifyConduct);
  $$('#sceneSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setScene(b.dataset.scene); }));
  $('#resetBtn').addEventListener('click', () => {
    Sound.click();
    const sc = S.scene;
    if (sc === 'share') resetShare();
    else if (sc === 'build') clearBuild();
    else if (sc === 'conduct') { const was = CD.results; resetCond(); CD.results = was; syncCond(); }
    else resetClassify();
  });

  function draw(t) {
    view.clear(BG);
    bgFill();
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * clamp(S.sceneA, 0, 1);
    const sc = S.scene;
    if (sc === 'share') drawShare(t);
    else if (sc === 'build') drawBuild(t);
    else if (sc === 'conduct') drawCond(t);
    else drawClassify(t);
    fx.draw(ctx);
    ctx.restore();
  }

  /* ---------- 문제 그림 ---------- */
  function figO2() {
    return '<svg class="fig-box" viewBox="0 0 300 130" width="300" height="130" role="img" aria-label="산소 원자 두 개가 전자를 공유하는 그림">' +
      '<rect width="300" height="130" rx="14" fill="#f5f2fd"/>' +
      '<circle cx="110" cy="62" r="46" fill="none" stroke="#8aa0c0" stroke-width="3" stroke-dasharray="7 5"/><circle cx="190" cy="62" r="46" fill="none" stroke="#8aa0c0" stroke-width="3" stroke-dasharray="7 5"/>' +
      '<g fill="#ffb400" stroke="#8a5200" stroke-width="1.2"><circle cx="150" cy="44" r="6"/><circle cx="150" cy="58" r="6"/><circle cx="150" cy="72" r="6"/><circle cx="150" cy="86" r="6"/></g>' +
      '<g fill="#ffb400" stroke="#8a5200" stroke-width="1.2"><circle cx="70" cy="40" r="5"/><circle cx="64" cy="54" r="5"/><circle cx="64" cy="72" r="5"/><circle cx="70" cy="86" r="5"/><circle cx="230" cy="40" r="5"/><circle cx="236" cy="54" r="5"/><circle cx="236" cy="72" r="5"/><circle cx="230" cy="86" r="5"/></g>' +
      '<text x="110" y="66" text-anchor="middle" font-size="20" font-weight="800" fill="#1b2333">O</text><text x="190" y="66" text-anchor="middle" font-size="20" font-weight="800" fill="#1b2333">O</text>' +
      '<text x="150" y="122" text-anchor="middle" font-size="13" font-weight="700" fill="#5d6879">가운데에서 공유하는 전자는 모두 몇 개일까요?</text></svg>';
  }

  /* ---------- 미션 ---------- */
  const levels = [
    /* ---------- 1단계 · 모형 ---------- */
    {
      title: '전자쌍을 함께 써요', short: '전자쌍 공유', icon: '🤝', phase: '모형',
      features: ['share'],
      intro: '<p class="si-q">❓ 탐구 질문: 산소와 물은 이온 결합처럼 전자를 주고받지 않았는데, 어떻게 결합해 있을까?</p>' +
        '<div class="si-link">🔗 <b>앞 차시(이온 결합)에서</b> 금속은 전자를 잃고 비금속은 전자를 얻어 이온이 되었어요. 그런데 <b>비금속 원소끼리</b> 만나면 둘 다 전자를 얻고 싶어 해요. 이럴 땐 어떻게 안정해질까요?</div>' +
        '<p>수소(H)와 염소(Cl) 원자를 가까이 가져가서, 두 원자가 <b>전자를 1개씩 내놓아 함께 쓰는</b> 모습을 직접 만들어 봐요.</p>',
      setup() { setScene('share'); resetShare('H2'); showHint('↔️ 거리 슬라이더로 두 원자를 가까이 가져가 봐요', 4500); },
      recap: '비금속 원자들이 전자를 <b>1개씩 내놓아 전자쌍을 공유</b>하면, 각 원자가 18족과 같은 전자 배치(H는 2개, 나머지는 8개)가 돼요. 이것이 <b>공유 결합</b>이에요.',
      summary: '<ul><li><b>공유 결합</b>: 비금속 원소의 원자들이 전자를 1개씩 내놓아 <b>전자쌍을 공유</b>하며, 각 원자가 18족과 같은 전자 배치(H는 2개, 그 외는 8개)를 이루는 결합.</li>' +
        '<li>H–H: 전자 1 + 1(공유) = 2개 → 헬륨(He)과 같음<br>Cl–Cl: 바깥 전자 7 + 1(공유) = 8개 → 아르곤(Ar)과 같음</li>' +
        '<li>공유 전자쌍 1개 = 결합 1개. 공유하지 않는 전자쌍은 <b>비공유 전자쌍</b>이에요.</li></ul>' +
        '<span class="formula">H · + · H → H : H &nbsp;(H–H)</span>',
      missions: [
        {
          title: 'H₂ 만들기',
          goal: '<b>H₂</b>를 고르고 두 수소 원자를 가까이 가져가 <b>전자쌍을 공유</b>시켜요.',
          hint: '슬라이더를 오른쪽 끝까지 밀어요. 오른쪽 원자를 왼쪽으로 끌어도 돼요. 전자껍질이 겹치면서 전자 2개가 가운데에 모여요.',
          setup() { setScene('share'); SH.made.H2 = false; resetShare('H2'); },
          check: () => SH.made.H2 && SH.bonded && SH.mol === 'H2',
          hold: 0.8,
          status: () => mark(SH.slider >= 0.7 && SH.mol === 'H2') + ' 가까이 · ' + mark(SH.made.H2 && SH.mol === 'H2') + ' 전자쌍 공유 · ' + mark(SH.bonded && SH.bondA > 0.9 && SH.mol === 'H2') + ' 공유 결합 H₂',
          explain: '수소 원자는 전자가 1개뿐이라 전자 1개를 더 가지면 헬륨(전자 2개)과 같아져요. 두 수소 원자가 전자를 <b>1개씩 내놓아 전자쌍 1개를 함께</b> 쓰면, 두 원자 모두 전자가 2개인 것처럼 안정해져요. 이렇게 전자쌍을 공유하는 결합이 <b>공유 결합</b>이에요.',
        },
        {
          title: 'Cl₂ 만들기',
          goal: '<b>Cl₂</b>도 같은 방법으로 만들고, 각 원자의 바깥 전자가 <b>8개</b>가 되는지 확인해요.',
          hint: 'Cl₂를 고르고 두 염소 원자를 가까이 가져가요. 염소는 바깥 전자가 7개라서 1개씩만 공유하면 돼요.',
          setup() { setScene('share'); SH.made.Cl2 = false; resetShare('Cl2'); },
          check: () => SH.made.Cl2 && SH.bonded && SH.mol === 'Cl2',
          hold: 0.8,
          status: () => mark(SH.slider >= 0.7 && SH.mol === 'Cl2') + ' 가까이 · ' + mark(SH.made.Cl2 && SH.mol === 'Cl2') + ' 전자쌍 공유 · ' + mark(SH.bonded && SH.bondA > 0.9 && SH.mol === 'Cl2') + ' 공유 결합 Cl₂',
          explain: '염소 원자는 바깥 전자가 7개예요. 전자 1개씩을 내놓아 <b>전자쌍 1개를 공유</b>하면 각 원자의 바깥 전자가 7 + 1 = <b>8개</b>가 되어 아르곤과 같은 배치가 돼요. 공유하지 않는 나머지 전자쌍 3쌍은 <b>비공유 전자쌍</b>이에요.',
        },
        {
          type: 'quiz', title: '비금속끼리 결합하는 까닭',
          goal: '공유 결합이 <b>비금속 원소끼리</b> 이루어지는 까닭으로 가장 알맞은 것은?',
          choices: ['둘 다 전자를 얻어 안정해지기 쉬워서, 전자를 내놓아 함께 쓰면 두 원자 모두 18족과 같은 배치가 되기 때문이에요', '한쪽은 전자를 잃고 다른 쪽은 전자를 얻기 때문이에요', '전자가 원자핵 속으로 들어가 붙기 때문이에요', '양성자를 서로 나눠 가지기 때문이에요'],
          answer: 0,
          feedback: ['', '전자를 잃고 얻는 것은 이온 결합이에요. 비금속끼리는 둘 다 전자를 얻으려 하므로 한쪽이 전자를 잃기 어려워요.', '전자는 원자핵 밖의 전자껍질에 있고, 원자핵 속으로 들어가지 않아요.', '결합에 참여하는 것은 양성자가 아니라 가장 바깥 전자예요.'],
          explain: '비금속 원소는 전자를 얻어 18족과 같은 배치가 되기 쉬워요. 둘 다 전자를 얻고 싶으니 <b>전자를 1개씩 내놓아 함께 쓰면</b> 두 원자 모두 안정해져요.',
        },
      ],
    },
    /* ---------- 2단계 · 탐구 ---------- */
    {
      title: '분자를 조립해요', short: '분자 만들기', icon: '🧩', phase: '탐구',
      features: ['build'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 원자들이 전자쌍을 공유하며 결합한다는 것을 알았어요. 원자마다 공유할 수 있는 전자의 수, 즉 <b>만들 수 있는 결합 수</b>가 정해져 있어요.</div>' +
        '<p><b>H 1개 · O 2개 · N 3개 · C 4개</b> — 원자 카드를 끌어 와 이 결합 수를 모두 채운 <b>분자</b>를 조립해 봐요. 산소(O₂)나 질소(N₂)는 결합선을 눌러 <b>이중·삼중 결합</b>으로 바꿔요.</p>' +
        '<p class="note">결합 수가 모자라면 점선 ‘빈 손’이 남고, 넘치면 결합이 거절돼요.</p>',
      setup() { setScene('build'); BU.made = {}; clearBuild(); showHint('원자 카드를 끌어 놓고, 원자끼리 가까이 붙여 봐요', 4500); },
      recap: '공유 결합에서는 원자마다 <b>결합 수</b>(H 1, O 2, N 3, C 4)를 모두 채워요. 그래서 H₂O는 단일 결합 2개, O₂는 <b>2중 결합</b>, N₂는 <b>3중 결합</b>이에요.',
      summary: '<table class="mini"><tr><th>원자</th><th>H</th><th>O</th><th>N</th><th>C</th></tr><tr><td>결합 수</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></table>' +
        '<ul><li><b>H₂O</b>(물): O 1 + H 2, 단일 결합 2개</li><li><b>O₂</b>(산소): <b>2중 결합</b> (공유 전자쌍 2쌍)</li><li><b>N₂</b>(질소): <b>3중 결합</b> (공유 전자쌍 3쌍)</li><li><b>CO₂</b>: C 1 + O 2, C=O 2중 결합이 2개</li><li><b>NH₃</b>: N 1 + H 3 · <b>CH₄</b>: C 1 + H 4</li></ul>',
      missions: [
        {
          title: '분자 4가지 이상 조립하기',
          goal: '<b>H₂O · O₂ · N₂ · CO₂ · NH₃ · CH₄</b> 중 <b>4가지 이상</b>을 조립해 보세요.',
          hint: 'H₂O는 O 1개 + H 2개예요. 원자를 가까이 붙이면 결합해요. O₂나 N₂는 결합선을 눌러 이중·삼중 결합으로 바꿔요.',
          setup() { setScene('build'); },
          check: () => madeCount() >= 4,
          hold: 0.6,
          status: () => SIX.map((k) => mark(BU.made[k]) + ' ' + KNOWN[k][0]).join(' · ') + ' (' + madeCount() + '/4)',
          explain: '분자가 완성되려면 모든 원자의 결합 수가 채워져야 해요. H는 결합 1개, O는 2개, N은 3개, C는 4개예요. 결합 수가 모자라면 <b>빈 손</b>이 남아 아직 안정하지 않은 거예요.',
        },
        {
          type: 'quiz', title: '산소 분자의 결합',
          get figure() { return figO2(); },
          goal: '산소 원자는 결합을 <b>2개</b> 만들 수 있어요. 산소 분자(O₂)에서 두 산소 원자가 <b>공유하는 전자쌍</b>은 몇 쌍일까요?',
          choices: ['1쌍 (단일 결합)', '2쌍 (2중 결합)', '3쌍 (3중 결합)', '4쌍'],
          answer: 1,
          feedback: ['한 쌍만 공유하면 각 산소 원자에 빈 손이 1개씩 남아요. 산소는 결합이 2개 필요해요.', '', '3쌍을 공유하면 산소의 결합 수(2개)를 넘어요. 3중 결합은 결합이 3개인 질소(N₂)에서 만들어져요.', '산소 원자가 만들 수 있는 결합은 2개뿐이므로 공유 전자쌍은 2쌍까지예요.'],
          explain: '산소 원자는 결합이 2개 필요해서 두 산소 원자가 전자쌍을 <b>2쌍</b> 공유해요. 이것을 <b>2중 결합</b>(O=O)이라고 해요. 전자 4개가 두 원자 사이에서 공유되지요.',
        },
      ],
    },
    /* ---------- 3단계 · 실험 ---------- */
    {
      title: '전기가 통할까요?', short: '전도성 실험', icon: '💡', phase: '실험',
      features: ['conduct'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 물과 산소 같은 분자는 전자를 공유해 만들어졌어요. 앞 차시에서 이온 결합 물질인 소금물은 전기가 통했지요.</div>' +
        '<p>그렇다면 공유 결합으로 만들어진 <b>물, 설탕, 에탄올</b>은 전기가 통할까요? 같은 회로로 <b>증류수 · 설탕 · 설탕물 · 에탄올 · 소금물</b>을 차례로 측정해 비교해요.</p>' +
        '<p class="note">전류 값은 설명을 위한 예시예요. 입자 모형에서 전하를 띤 입자가 있는지 살펴봐요.</p>',
      setup() { setScene('conduct'); resetCond(); showHint('시료를 고르고 ⚡ 스위치를 켜 보세요', 4500); },
      recap: '<b>소금물만 전기가 통하고</b>, 증류수·설탕·설탕물·에탄올은 통하지 않아요. 공유 결합 물질은 전하가 없는 <b>분자</b>로 이루어져 전류를 나르는 이온이 없기 때문이에요.',
      summary: '<table class="mini"><tr><th>시료</th><th>전구</th><th>입자</th></tr><tr><td>증류수</td><td>꺼짐</td><td>물 분자</td></tr><tr><td>설탕(고체) · 설탕물</td><td>꺼짐</td><td>설탕 분자</td></tr><tr><td>에탄올</td><td>꺼짐</td><td>에탄올 분자</td></tr><tr><td>소금물</td><td>켜짐</td><td>Na⁺, Cl⁻ 이온</td></tr></table>' +
        '<p>공유 결합 물질(분자)은 전하를 띤 입자가 없어서 액체나 수용액에서도 전기가 통하지 않아요.</p>',
      missions: [
        {
          title: '5가지 시료 측정하기',
          goal: '<b>증류수 · 설탕 · 설탕물 · 에탄올 · 소금물</b>에서 각각 스위치를 켜고 전구와 전류를 확인해요.',
          hint: '시료를 고른 뒤 ⚡ 스위치를 켜 두면 잠시 뒤 자동으로 기록돼요. 5가지를 모두 해 봐요.',
          check: () => nRec() >= 5,
          hold: 0.4,
          status: () => ['water', 'sugarS', 'sugar', 'eth', 'brine'].map((k) => mark(CD.results[k]) + ' ' + SAMPLES[k].name.replace(' (고체)', '')).join(' · '),
          explain: '전구가 켜진 것은 <b>소금물</b>뿐이에요. 증류수, 설탕, 설탕물, 에탄올에서는 전류가 거의 흐르지 않았어요.',
        },
        {
          type: 'quiz', title: '설탕물이 안 통하는 까닭',
          goal: '설탕물에는 전류가 거의 흐르지 않아요. 그 까닭으로 가장 알맞은 것은?',
          choices: ['설탕은 전하가 없는 분자로 흩어져 있어서, 전류를 나를 이온이 없기 때문이에요', '설탕은 고체라서 물에 녹아도 전기가 통하지 않기 때문이에요', '설탕물에는 물이 많아서 이온이 모두 사라지기 때문이에요', '설탕이 물과 반응해 기체가 되기 때문이에요'],
          answer: 0,
          feedback: ['', '소금도 고체지만 물에 녹으면 전기가 통했어요. 중요한 것은 이온이 생기는지예요.', '설탕은 처음부터 이온이 없는 분자로 이루어져 있어요.', '설탕을 녹여도 기체가 생기지 않아요. 설탕 분자가 물속에 흩어질 뿐이에요.'],
          explain: '설탕은 공유 결합으로 이루어진 <b>분자</b>예요. 물에 녹아도 분자 그대로 흩어질 뿐 전하를 띠지 않아서, <b>전류를 나르는 입자(이온)가 없어요</b>. 소금물은 Na⁺와 Cl⁻ 이온이 움직여 전기가 통해요.',
        },
      ],
    },
    /* ---------- 4단계 · 분석 ---------- */
    {
      title: '결합 비교하기', short: '결합 비교', icon: '📊', phase: '분석',
      features: ['classify'],
      intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 소금물만 전기가 통하고, 공유 결합 물질은 통하지 않았어요.</div>' +
        '<p>이제 8가지 물질을 <b>이온 결합 / 공유 결합</b>으로 분류하고, 녹이거나 물에 녹였을 때의 <b>전기 전도성</b>을 예측한 뒤 확인해 봐요.</p>' +
        '<p class="note">※ 염화 수소(HCl)처럼 물에 녹아 이온이 되는 분자나 다이아몬드·흑연 같은 공유 결정은 이번 차시에서 다루지 않아요.</p>',
      setup() { setScene('classify'); resetClassify(); showHint('물질 카드를 끌어 알맞은 상자에 넣어요', 4500); },
      recap: '<b>금속 + 비금속</b>은 전자를 주고받는 <b>이온 결합</b>(녹이거나 물에 녹이면 전기가 통함), <b>비금속끼리</b>는 전자를 공유하는 <b>공유 결합</b>(분자 물질은 전기가 통하지 않음)이에요.',
      summary: '<table class="mini"><tr><th>구분</th><th>이온 결합</th><th>공유 결합</th></tr><tr><td>이루는 원소</td><td>금속 + 비금속</td><td>비금속 + 비금속</td></tr><tr><td>전자</td><td>주고받음</td><td>공유함</td></tr><tr><td>입자</td><td>양이온, 음이온</td><td>분자</td></tr><tr><td>고체</td><td>전기 ✕</td><td>전기 ✕</td></tr><tr><td>액체 · 수용액</td><td>전기 ○</td><td>전기 ✕</td></tr><tr><td>예</td><td>NaCl, MgO, CaCl₂</td><td>H₂O, O₂, CO₂, 설탕, 에탄올</td></tr></table>',
      missions: [
        {
          title: '물질 분류하고 전도성 예측하기', manual: true,
          goal: '8가지 물질을 <b>이온 결합 / 공유 결합</b> 상자에 나누어 넣고, 전기가 통할지 예측한 뒤 <b>확인</b>해요.',
          hint: '카드의 동그라미를 보세요. 금속 원소 + 비금속 원소는 이온 결합, 비금속 원소끼리는 공유 결합이에요.',
          setup() { setScene('classify'); },
          check: () => classifyCheck(),
          explain: 'NaCl, MgO, CaCl₂는 <b>금속 + 비금속</b>이라 전자를 주고받는 <b>이온 결합</b>이에요. H₂O, O₂, CO₂, 설탕, 에탄올은 <b>비금속끼리</b>라 전자를 공유하는 <b>공유 결합</b>이에요. 이온 결합 물질은 녹이거나 물에 녹이면 이온이 움직여 전기가 통하지만, 공유 결합 분자 물질은 이온이 없어 통하지 않아요.',
        },
        {
          type: 'quiz', title: '결합 종류로 전도성 예측',
          goal: '다음 중 <b>전기가 통하는</b> 것은?',
          choices: ['염화 칼슘(CaCl₂) 수용액', '설탕물', '에탄올', '증류수'],
          answer: 0,
          feedback: ['', '설탕은 공유 결합 분자 물질이라 물에 녹아도 이온이 생기지 않아요.', '에탄올은 공유 결합 분자 물질이라 이온이 없어요.', '물 분자는 공유 결합으로 이루어져 이온이 거의 없어요.'],
          explain: '염화 칼슘은 <b>이온 결합 물질</b>이라 물에 녹으면 Ca²⁺와 Cl⁻로 나뉘어 전기가 통해요. 나머지는 공유 결합 분자 물질이라 전류를 나르는 이온이 없어요.',
        },
        {
          type: 'quiz', title: '물과 소금의 차이',
          goal: '물(H₂O)은 소금(NaCl)과 달리 전기가 거의 통하지 않아요. 그 까닭은?',
          choices: ['물은 공유 결합한 분자로 이루어져 있어, 전하를 띤 입자(이온)가 거의 없기 때문이에요', '물은 액체라서 전기가 통하지 않기 때문이에요', '물 분자에는 전자가 하나도 없기 때문이에요', '물은 이온 결합 물질이지만 이온이 고정되어 있기 때문이에요'],
          answer: 0,
          feedback: ['', '소금을 녹인 액체나 소금물도 액체인데 전기가 통했어요. 액체라서가 아니라 이온이 있기 때문이에요.', '모든 분자에는 전자가 있어요. 다만 전체적으로 전하를 띠지 않아요.', '물은 이온 결합이 아니라 O와 H가 전자를 공유한 공유 결합 물질이에요.'],
          explain: '물은 산소와 수소가 전자쌍을 <b>공유</b>한 분자로 이루어져 있어요. 전하를 띤 입자(이온)가 거의 없어서 전류가 거의 흐르지 않아요. 소금은 이온 결합이라 녹이면 이온이 움직여 전기가 통해요.',
        },
      ],
    },
  ];

  resetShare('H2'); resetCond(); resetClassify(); syncCond();
  game = SciSim.game({
    simId: 'h1-covalent-bond',
    mount: '#game',
    badge: '공유 결합 박사',
    homeHref: '../../index.html#h1a',
    featureLabels: { share: '🤝 전자쌍 공유 모형', build: '🧩 원자 카드 · 분자 조립', conduct: '💡 전기 전도성 회로', classify: '📊 결합 분류 상자' },
    onFeatures(set) { F = new Set(set); updateUI(); },
    levels,
  });
  updateUI();
  SciSim.loop((dt, t) => {
    const sc = S.scene;
    if (sc === 'share') stepShare(dt);
    else if (sc === 'build') stepBuild(dt);
    else if (sc === 'conduct') stepCond(dt);
    else stepClassify(dt);
    fx.update(dt);
    updateReadouts();
    draw(t);
  });

  window.__sim = {
    S, SH, BU, CD, CL, game, levels, setScene, resetShare, setSlider, spawn, makeBond, compOf, free, madeCount, KNOWN, SIX, setSample, setSwitch, resetCond, verifyConduct, classifyCheck, classifyOK, CARDS, BIN, CSZ, TRAY, WS, trayPos, clearBuild, CG, atomById,
    toClient: (x, y) => { const r = view.canvas.getBoundingClientRect(); return { x: r.left + x * r.width / VW, y: r.top + y * r.height / VH }; },
    sceneStep: (sc) => setScene(sc),
    place(id, bin) { const c = CL.cards.find((x) => x.id === id); if (c) { c.bin = bin; c.seq = ++CL.seqN; syncPred(); } },
  };
})();
