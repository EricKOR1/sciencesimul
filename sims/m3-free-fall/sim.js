/* =========================================================
   중3 Ⅳ. 운동과 에너지 - 자유 낙하 운동 (단원 1차시)
   성취기준 [9과19-02] 자유 낙하하는 물체의 운동에서 시간에 따른 속력의 변화가 일정함을 분석할 수 있다.
   ① 관찰: 다중 섬광 사진 → 같은 시간 동안 이동 거리가 점점 커진다 (점점 빨라진다)
   ② 실험: 시각마다 속력 기록 → 시간–속력 그래프 (원점을 지나는 직선)
   ③ 탐구: 1초마다 속력이 9.8 m/s씩 일정하게 증가 · 질량과 관계없음 (공기 저항 무시)
   ④ 적용: 3초 후 속력 예측과 확인 · 등속 운동 그래프와 비교
   ========================================================= */
(function () {
  'use strict';
  const { $, $$, clamp, Sound, toast } = SciSim;

  /* ---------- 상수 ---------- */
  const G = 9.8;                         // 1초마다 늘어나는 속력 (m/s)
  const T_AX = 3, V_AX = 30;             // 그래프 축 최댓값 (s, m/s)
  // 휴대폰(폭 600px 미만)은 세로로 긴 캔버스에 글자를 키워서 그린다.
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const VW = PHONE ? 600 : 800, VH = PHONE ? 900 : 560;
  const FS = PHONE ? 1.25 : 1;
  const FONT = '"Pretendard","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const font = (n, bold) => (bold ? 'bold ' : '') + Math.round(n * FS) + 'px ' + FONT;
  const ORANGE = '#f26b3a', PURPLE = '#8b5cf6';

  // vt: 공기 있을 때의 종단 속력(m/s) - 공기 저항 = 중력 × (v / vt)²
  const OBJ = {
    steel: { name: '쇠공', mass: '1 kg', r: 11, vt: 100, color: '#475569' },
    bowl: { name: '볼링공', mass: '7 kg', r: 16, vt: 80, color: '#3867f4' },
    feather: { name: '깃털', mass: '1 g', r: 13, vt: 1.2, color: '#16a34a' },
  };

  /* ---------- 운동 계산 ---------- */
  const logcosh = (x) => { x = Math.abs(x); return x + Math.log1p(Math.exp(-2 * x)) - Math.LN2; };
  function fallD(o, t, air) {
    if (t <= 0) return 0;
    return air ? (o.vt * o.vt / G) * logcosh(G * t / o.vt) : 0.5 * G * t * t;
  }
  function fallV(o, t, air) {
    if (t <= 0) return 0;
    return air ? o.vt * Math.tanh(G * t / o.vt) : G * t;
  }
  function landT(o, H, air) {
    if (!air) return Math.sqrt(2 * H / G);
    const a = H * G / (o.vt * o.vt);
    return (o.vt / G) * (a > 30 ? a + Math.LN2 : Math.acosh(Math.exp(a)));
  }
  const r2 = (v) => Math.round(v * 100) / 100;
  const isTenth = (t) => Math.abs(t * 10 - Math.round(t * 10)) < 1e-6;
  // 0.98 → "0.98", 9.8 → "9.8", 0 → "0.0"
  function smart(v) { const x = r2(v); return isTenth(x) ? x.toFixed(1) : x.toFixed(2); }
  const fmtT = (t) => (isTenth(t) ? t.toFixed(1) : t.toFixed(2));

  /* ---------- 상태 ---------- */
  const S = {
    H: 20, mode: 'single', air: false, strobe: false, slow: false,
    state: 'ready',            // ready | running | done
    run: null, viewT: 0,
    flashAt: -1e9, landAt: -1e9,
    recs: [], newRec: null,    // 측정 기록 {t, v, air, H}
    cnt: { lands: 0, strobeLands: 0, cmpVac: 0, cmpAir: 0, tallLands: 0 },
    drag: null, gmap: null,
  };
  const base = {};
  const snap = () => Object.assign(base, S.cnt);
  const since = (k) => S.cnt[k] - (base[k] || 0);

  let F = new Set();
  const on = (f) => F.has(f);
  let game = null;
  const isNew = (f) => !!(game && game.isNew(f));

  function makeRun() {
    const keys = S.mode === 'compare' ? ['steel', 'bowl', 'feather'] : ['steel'];
    const objs = keys.map((k) => ({ key: k, o: OBJ[k], T: landT(OBJ[k], S.H, S.air) }));
    // 공(쇠공·볼링공)이 모두 땅에 닿으면 실험 끝 (공기 속 깃털은 그 순간 공중에 멈춰 보인다)
    const tEnd = Math.max.apply(null, objs.filter((x) => x.key !== 'feather').map((x) => x.T));
    return { H: S.H, air: S.air, mode: S.mode, objs, tEnd, t: 0, tMax: Math.floor(tEnd * 10 + 1e-6) / 10 };
  }
  const posD = (ob, t) => (t > ob.T + 1e-9 ? S.run.H : Math.min(S.run.H, fallD(ob.o, t, S.run.air)));
  const velV = (ob, t) => (t > ob.T + 1e-9 ? 0 : fallV(ob.o, t, S.run.air));
  function tForD(ob, d) {
    if (!S.run.air) return Math.sqrt(2 * d / G);
    let a = 0, b = Math.min(ob.T, 60);
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (fallD(ob.o, m, true) < d) a = m; else b = m; }
    return (a + b) / 2;
  }

  /* ---------- 캔버스 ---------- */
  const view = SciSim.stage($('#cv'), { width: VW, height: VH, background: '#f4f8fd' });
  const ctx = view.ctx;

  function layout() {
    const g = on('graph');
    if (PHONE) {
      return g
        ? { sc: { x: 8, y: 8, w: 282, h: 884 }, gr: { x: 298, y: 8, w: 294, h: 430 }, tb: { x: 298, y: 446, w: 294, h: 446 }, narrow: true }
        : { sc: { x: 8, y: 8, w: 584, h: 884 }, narrow: false };
    }
    return g
      ? { sc: { x: 10, y: 10, w: 340, h: 540 }, gr: { x: 362, y: 10, w: 428, h: 292 }, tb: { x: 362, y: 312, w: 428, h: 238 }, narrow: true }
      : { sc: { x: 10, y: 10, w: 780, h: 540 }, narrow: false };
  }
  function geo() {
    const L = layout(), sc = L.sc;
    const AW = PHONE ? (L.narrow ? sc.w : 330) : 340;              // 낙하 장치가 차지하는 폭
    const ax = L.narrow ? sc.x : PHONE ? sc.x + Math.round((sc.w - AW) / 2) : sc.x + 150;
    const top = sc.y + (PHONE ? 112 : 84);                          // 낙하 거리 0 m (출발점)
    const ground = sc.y + sc.h - (PHONE ? 72 : 56);                 // 땅
    const ppm = (ground - top) / S.H;
    const rulerX = ax + (PHONE ? 66 : 54);
    const lanes = S.mode === 'compare' ? [0.43, 0.65, 0.87].map((f) => ax + AW * f) : [ax + AW * 0.55];
    const magH = 12 * FS;
    const armY = top - 2 * OBJ.bowl.r * FS - magH - 10;
    return { L, sc, AW, ax, top, ground, ppm, rulerX, lanes, magH, armY };
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function panel(r) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5;
    rr(r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke();
  }
  function newRing(r) {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    ctx.save();
    ctx.strokeStyle = `rgba(242,107,58,${0.35 + a * 0.5})`; ctx.lineWidth = 4;
    rr(r.x + 2, r.y + 2, r.w - 4, r.h - 4, 12); ctx.stroke();
    ctx.fillStyle = ORANGE; rr(r.x + r.w - 58, r.y + 6, 50, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = font(12, true); ctx.textAlign = 'center'; ctx.fillText('NEW', r.x + r.w - 33, r.y + 21);
    ctx.restore();
  }
  // 둥근 이름표: align = 'left' | 'right' | 'center' (x 기준), y = 가운데
  function pill(text, x, y, bg, fg, align, size) {
    ctx.font = font(size || 13, true);
    const w = ctx.measureText(text).width + 12 * FS, h = 20 * FS;
    const lx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = bg; rr(lx, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.fillText(text, lx + w / 2, y + 4.5 * FS);
    return w;
  }

  /* ---------- 공기 입자 (공기 있음일 때만) ---------- */
  const AIR = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 0.6, p: Math.random() * 6 }));
  function stepAir(dt) {
    AIR.forEach((q) => { q.x += 0.02 * q.s * dt; q.p += dt * 1.3; if (q.x > 1) q.x -= 1; });
  }
  function drawAir(sc, dark) {
    ctx.fillStyle = dark ? 'rgba(148,197,255,.32)' : 'rgba(56,103,244,.20)';
    AIR.forEach((q) => {
      ctx.beginPath();
      ctx.arc(sc.x + q.x * sc.w, sc.y + q.y * sc.h + Math.sin(q.p) * 4, 2.2 * FS, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /* ---------- 물체 그리기 (yb = 물체의 아랫면) ---------- */
  function drawObj(key, x, yb, t, alpha, dark, air) {
    const o = OBJ[key], R = o.r * FS;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (key === 'feather') {
      const k = air ? Math.min(1, t * 1.5) : 0;
      const sway = Math.sin(t * 2.6 + 0.6) * 9 * FS * k;
      const ang = 0.35 + 0.55 * Math.cos(t * 2.6 + 0.6) * k;
      ctx.translate(x + sway, yb - R); ctx.rotate(ang);
      ctx.fillStyle = dark ? '#dcfce7' : '#f0fdf4'; ctx.strokeStyle = dark ? '#86efac' : '#16a34a'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, R * 0.95);
      ctx.bezierCurveTo(R * 0.85, R * 0.4, R * 0.7, -R * 0.6, 0, -R * 1.05);
      ctx.bezierCurveTo(-R * 0.7, -R * 0.6, -R * 0.85, R * 0.4, 0, R * 0.95);
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, R * 1.25); ctx.lineTo(0, -R); ctx.stroke();
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) {
        const yy = i * R * 0.3;
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(R * 0.5, yy - R * 0.25); ctx.moveTo(0, yy); ctx.lineTo(-R * 0.5, yy - R * 0.25); ctx.stroke();
      }
    } else {
      const cy = yb - R;
      const gr = ctx.createRadialGradient(x - R * 0.35, cy - R * 0.4, R * 0.1, x, cy, R);
      if (key === 'bowl') { gr.addColorStop(0, '#8fb0ff'); gr.addColorStop(0.55, '#2f5be3'); gr.addColorStop(1, '#1e3a8a'); }
      else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#b6c2d2'); gr.addColorStop(1, '#4b5768'); }
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, cy, R, 0, Math.PI * 2); ctx.fill();
      if (key === 'bowl') {
        ctx.fillStyle = '#0f1d4a';
        [[-0.25, -0.35], [0.12, -0.42], [-0.05, -0.05]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx * R, cy + dy * R, R * 0.13, 0, Math.PI * 2); ctx.fill(); });
      }
    }
    ctx.restore();
  }

  /* ---------- 장면: 낙하 탑 ---------- */
  function drawScene(g) {
    const { L, sc, top, ground, ppm, rulerX, lanes, magH, armY } = g;
    const dark = S.strobe;
    const run = S.run;
    const air = run ? run.air : S.air;
    const objs = run ? run.objs : (S.mode === 'compare' ? ['steel', 'bowl', 'feather'] : ['steel']).map((k) => ({ key: k, o: OBJ[k], T: Infinity }));
    const tNow = run ? S.viewT : 0;
    const shownT = run ? (S.state === 'running' ? run.t : run.tEnd) : -1;
    const now = performance.now();
    const yB = (d) => top + d * ppm;

    ctx.save();
    rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.clip();
    const bg = ctx.createLinearGradient(0, sc.y, 0, sc.y + sc.h);
    if (dark) { bg.addColorStop(0, '#0b1220'); bg.addColorStop(1, '#1c2940'); }
    else { bg.addColorStop(0, '#d3e6ff'); bg.addColorStop(1, '#f4f9ff'); }
    ctx.fillStyle = bg; ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
    if (!dark && !L.narrow) {
      // 구름 (넓은 화면일 때만)
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      [[sc.x + 70, sc.y + 150, 1], [sc.x + sc.w - 110, sc.y + sc.h - 170, 0.8]].forEach(([cx, cy, s]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 22 * s, 0, Math.PI * 2); ctx.arc(cx + 26 * s, cy - 10 * s, 26 * s, 0, Math.PI * 2); ctx.arc(cx + 54 * s, cy, 20 * s, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    if (air) drawAir(sc, dark);

    // 땅
    ctx.fillStyle = dark ? '#243046' : '#dccba9';
    ctx.fillRect(sc.x, ground, sc.w, sc.y + sc.h - ground);
    ctx.fillStyle = dark ? '#3a4865' : '#b49a72';
    ctx.fillRect(sc.x, ground, sc.w, 3);

    // 기둥(자) + 팔
    const poleW = 10 * FS;
    const armEnd = lanes[lanes.length - 1] + 26 * FS;
    ctx.fillStyle = dark ? '#3b4a63' : '#8d9bb0';
    ctx.fillRect(rulerX, armY - 6, poleW, ground - armY + 6);
    ctx.fillRect(rulerX, armY - 6, armEnd - rulerX, 8);
    ctx.fillStyle = dark ? '#e2e8f0' : '#fff7d6';
    ctx.fillRect(rulerX + 2, top, poleW - 4, ground - top);
    for (let m = 0; m <= S.H; m++) {
      const y = yB(m);
      const major = m % 5 === 0;
      ctx.fillStyle = major ? (dark ? '#f1f5f9' : '#1e293b') : (dark ? '#94a3b8' : '#64748b');
      ctx.fillRect(rulerX + poleW, y - (major ? 1 : 0.5), (major ? 12 : 6) * FS, major ? 2 : 1);
      if (major) {
        ctx.font = font(13, true); ctx.textAlign = 'right';
        ctx.fillText(m + ' m', rulerX - 5, y + 4.5 * FS);
      }
    }
    ctx.save();
    ctx.translate(sc.x + 13 * FS, (top + ground) / 2); ctx.rotate(-Math.PI / 2);
    ctx.font = font(13, true); ctx.textAlign = 'center'; ctx.fillStyle = dark ? '#cbd5e1' : '#475569';
    ctx.fillText('낙하 거리 (m)', 0, 0);
    ctx.restore();

    // 전자석 (물체를 붙잡고 있다가 놓아 준다)
    objs.forEach((ob, i) => {
      const x = lanes[i], R = ob.o.r * FS, my = top - 2 * R - magH;
      ctx.fillStyle = dark ? '#475569' : '#7b889c';
      ctx.fillRect(x - 2, armY, 4, my - armY);
      ctx.fillStyle = '#334155'; rr(x - 15 * FS, my, 30 * FS, magH, 3); ctx.fill();
      ctx.fillStyle = S.state === 'ready' ? '#ef4444' : '#94a3b8';
      ctx.beginPath(); ctx.arc(x + 9 * FS, my + magH / 2, 3 * FS, 0, Math.PI * 2); ctx.fill();
    });

    // 다중 섬광 사진: 0.1초마다 남은 모습
    const single = objs.length === 1;
    if (dark && run) {
      const kMax = Math.floor(shownT * 10 + 1e-6);
      objs.forEach((ob, i) => {
        for (let k = 0; k <= kMax; k++) {
          const t = k / 10;
          if (t > ob.T + 1e-9) break;
          drawObj(ob.key, lanes[i], yB(posD(ob, t)), t, 0.5, true, air);
        }
      });
      // 0.5초마다 시각 표시 (첫 번째 물체)
      const ob = objs[0], R = ob.o.r * FS;
      ctx.font = font(12, true); ctx.textAlign = 'right'; ctx.fillStyle = '#fcd9c6';
      for (let k = 5; k <= (PHONE && !single ? -1 : kMax); k += 5) {
        const t = k / 10;
        if (t > ob.T + 1e-9) break;
        const yl = yB(posD(ob, t)) - R;
        if (S.state === 'done' && on('graph') && Math.abs(yl - (yB(posD(ob, tNow)) - R)) < 16 * FS) continue;
        ctx.fillText(t.toFixed(1) + ' s', lanes[0] - R - 8 * FS, yl + 4 * FS);
      }
      // 0.1초 동안 이동한 거리 (쇠공 하나일 때)
      if (single) {
        const ends = S.H > 30 ? [1, 2, 3] : [0.5, 1, 1.5, 2];
        const bx = lanes[0] + R + 12 * FS;
        let first = true;
        ends.forEach((te) => {
          if (te > shownT + 1e-9 || te > ob.T) return;
          const d0 = posD(ob, te - 0.1), d1 = posD(ob, te);
          const y0 = yB(d0), y1 = yB(d1);
          ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(bx - 4, y0); ctx.lineTo(bx + 2, y0); ctx.lineTo(bx + 2, y1); ctx.lineTo(bx - 4, y1);
          ctx.stroke();
          ctx.font = font(13, true); ctx.textAlign = 'left'; ctx.fillStyle = '#fde68a';
          ctx.fillText((d1 - d0).toFixed(2) + ' m', bx + 8, (y0 + y1) / 2 + 4.5 * FS);
          if (first) {
            ctx.font = font(12, true); ctx.fillStyle = '#fbbf24';
            ctx.fillText(PHONE ? '0.1초 동안' : '↕ 0.1초 동안 이동 거리', bx - 4, Math.min(y0, y1) - 9 * FS);
            first = false;
          }
        });
      }
    }

    // 현재 모습
    objs.forEach((ob, i) => {
      const yb = yB(run ? posD(ob, tNow) : 0);
      drawObj(ob.key, lanes[i], yb, tNow, 1, dark, air);
      const R = ob.o.r * FS;
      if (dark && S.state === 'running' && now - S.flashAt < 140) {
        ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - (now - S.flashAt) / 140)})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(lanes[i], yb - R, R + 6, 0, Math.PI * 2); ctx.stroke();
      }
      if (run && ob.T <= shownT + 1e-9 && now - S.landAt < 600) {
        const a = (now - S.landAt) / 600;
        ctx.strokeStyle = `rgba(160,130,90,${0.7 * (1 - a)})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(lanes[i], ground + 1, R + 22 * a, 5 + 4 * a, 0, Math.PI, Math.PI * 2); ctx.stroke();
      }
    });

    // 기록할 시각 고르기(되감기) 표시
    if (run && S.state === 'done' && on('graph')) {
      const ob = objs[0], R = ob.o.r * FS, x = lanes[0];
      const yb = yB(posD(ob, tNow));
      const pulse = 4 + Math.sin(now / 200) * 2;
      ctx.strokeStyle = ORANGE; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, yb - R, R + pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([5, 4]); ctx.strokeStyle = dark ? 'rgba(253,186,140,.8)' : 'rgba(242,107,58,.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(rulerX + poleW, yb); ctx.lineTo(x - R - 2, yb); ctx.stroke(); ctx.setLineDash([]);
      pill(fmtT(tNow) + ' s', x - R - 8 * FS, yb - R, ORANGE, '#fff', 'right', 13);
    }

    // 바닥 이름표 · 도착 시간
    objs.forEach((ob, i) => {
      const x = lanes[i];
      ctx.textAlign = 'center';
      ctx.font = font(13, true); ctx.fillStyle = dark ? '#e2e8f0' : '#3f3424';
      ctx.fillText(ob.o.name, x, ground + 17 * FS);
      ctx.font = font(12); ctx.fillStyle = dark ? '#a5b4c8' : '#6b5b43';
      ctx.fillText(ob.o.mass, x, ground + 32 * FS);
      if (run && S.state === 'done') {
        ctx.font = font(13, true);
        if (ob.T <= run.tEnd + 1e-9) { ctx.fillStyle = dark ? '#fde68a' : '#9a3412'; ctx.fillText((single || !PHONE ? '⏱ ' : '') + ob.T.toFixed(2) + ' s', x, ground + 48 * FS); }
        else { ctx.fillStyle = dark ? '#86efac' : '#15803d'; ctx.fillText('아직 공중', x, ground + 48 * FS); }
      }
    });

    // 위쪽 안내: 촬영 · 공기
    // 폭이 좁으면 짧은 문구로
    let camTxt = '📸 0.1초마다 찰칵';
    let envTxt = !on('air') ? '※ 공기 저항은 무시' : air ? '🌬️ 공기 있음' : '🫙 진공 (공기 없음)';
    ctx.font = font(12, true);
    const pw = (t) => ctx.measureText(t).width + 12 * FS;
    if (dark && pw(camTxt) + pw(envTxt) + 22 > sc.w) {
      camTxt = '📸 0.1초';
      envTxt = !on('air') ? '※ 공기 저항 무시' : air ? '🌬️ 공기 있음' : '🫙 진공';
    }
    if (dark) pill(camTxt, sc.x + 8, sc.y + 18 * FS, 'rgba(251,191,36,.18)', '#fde68a', 'left', 12);
    pill(envTxt, sc.x + sc.w - 8, sc.y + 18 * FS, dark ? 'rgba(148,163,184,.22)' : 'rgba(255,255,255,.85)', dark ? '#e2e8f0' : '#334155', 'right', 12);

    // 1단계: 탐구 질문 카드 (넓은 화면)
    if (!L.narrow && !PHONE) drawQuestionCard(sc, dark);
    ctx.restore();
    ctx.strokeStyle = '#dde4ef'; ctx.lineWidth = 1.5; rr(sc.x, sc.y, sc.w, sc.h, 14); ctx.stroke();
  }

  function drawQuestionCard(sc, dark) {
    const w = 226, x = sc.x + sc.w - w - 16, y = sc.y + 64, h = 132;
    ctx.fillStyle = dark ? 'rgba(30,41,59,.92)' : 'rgba(255,255,255,.94)';
    ctx.strokeStyle = dark ? '#475569' : '#fdba8c'; ctx.lineWidth = 2;
    rr(x, y, w, h, 14); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left';
    ctx.font = font(14, true); ctx.fillStyle = dark ? '#fdba8c' : '#c2410c';
    ctx.fillText('🤔 탐구 질문', x + 14, y + 26);
    ctx.font = font(15, true); ctx.fillStyle = dark ? '#f1f5f9' : '#1b2333';
    ['떨어지는 공은', '점점 빨라질까,', '같은 빠르기로 떨어질까?'].forEach((s, i) => ctx.fillText(s, x + 14, y + 54 + i * 22));
    if (S.run && dark && S.state === 'done') {
      ctx.font = font(13); ctx.fillStyle = dark ? '#fde68a' : '#9a3412';
      ctx.fillText('👀 공 사이 간격을 살펴보세요', x + 14, y + h + 22);
    }
  }

  /* ---------- 시간–속력 그래프 ---------- */
  function drawGraph(r) {
    panel(r);
    const pad = { l: 52 * FS, r: 16, t: 40 * FS, b: 40 * FS };
    const x0 = r.x + pad.l, x1 = r.x + r.w - pad.r, y0 = r.y + r.h - pad.b, y1 = r.y + pad.t;
    const px = (t) => x0 + (t / T_AX) * (x1 - x0);
    const py = (v) => y0 - (v / V_AX) * (y0 - y1);
    S.gmap = { x0, x1, y0, y1 };

    ctx.textAlign = 'left'; ctx.fillStyle = '#1b2333'; ctx.font = font(15, true);
    ctx.fillText('📈 시간–속력 그래프', r.x + 12, r.y + 24 * FS);
    // 격자
    ctx.font = font(13); ctx.fillStyle = '#5d6879'; ctx.lineWidth = 1;
    for (let t = 0; t <= T_AX + 1e-9; t += 0.5) {
      ctx.strokeStyle = t % 1 === 0 ? '#e3e9f2' : '#f1f4f9';
      ctx.beginPath(); ctx.moveTo(px(t), y0); ctx.lineTo(px(t), y1); ctx.stroke();
      if (t % 1 === 0 || !PHONE) { ctx.textAlign = 'center'; ctx.fillText(String(t), px(t), y0 + 16 * FS); }
    }
    for (let v = 0; v <= V_AX; v += 5) {
      ctx.strokeStyle = v % 10 === 0 ? '#e3e9f2' : '#f1f4f9';
      ctx.beginPath(); ctx.moveTo(x0, py(v)); ctx.lineTo(x1, py(v)); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(String(v), x0 - 6, py(v) + 4.5 * FS);
    }
    ctx.strokeStyle = '#5d6879'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x0, y1 - 4); ctx.lineTo(x0, y0); ctx.lineTo(x1 + 4, y0); ctx.stroke();
    ctx.fillStyle = '#5d6879'; ctx.font = font(13, true); ctx.textAlign = 'right';
    ctx.fillText('시간 (s)', x1, y0 + 33 * FS);
    ctx.save(); ctx.translate(r.x + 13 * FS, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillText('속력 (m/s)', 0, 0); ctx.restore();

    const run = S.run;
    // 1초 동안의 속력 변화 (3단계 분석 후)
    if (showSlope()) {
      ctx.save();
      ctx.fillStyle = 'rgba(139,92,246,.12)';
      ctx.beginPath(); ctx.moveTo(px(1), py(9.8)); ctx.lineTo(px(2), py(9.8)); ctx.lineTo(px(2), py(19.6)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = PURPLE; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(px(1), py(9.8)); ctx.lineTo(px(2), py(9.8)); ctx.lineTo(px(2), py(19.6)); ctx.stroke();
      ctx.fillStyle = '#6d28d9'; ctx.font = font(13, true); ctx.textAlign = 'center';
      ctx.fillText('1초', px(1.5), py(9.8) + 17 * FS);
      ctx.textAlign = 'left';
      ctx.fillText('+9.8 m/s', px(2) + 6, py(14.7) + 4.5 * FS);
      ctx.restore();
    }

    // 여러 물체 비교 (세 물체 함께)
    if (run && run.mode === 'compare') {
      const tLim = Math.min(S.state === 'running' ? run.t : run.tEnd, T_AX);
      const style = { bowl: [8, 'rgba(56,103,244,.45)', []], steel: [3.5, '#475569', []], feather: [2.5, '#16a34a', [7, 5]] };
      ['bowl', 'steel', 'feather'].forEach((k) => {
        const ob = run.objs.find((x) => x.key === k);
        if (!ob) return;
        const [lw, col, dash] = style[k];
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.lineJoin = 'round';
        ctx.beginPath();
        const tE = Math.min(tLim, ob.T);
        for (let t = 0; t <= tE + 1e-9; t += 0.02) { const v = fallV(ob.o, Math.min(t, tE), run.air); if (t === 0) ctx.moveTo(px(t), py(v)); else ctx.lineTo(px(t), py(v)); }
        ctx.lineTo(px(tE), py(fallV(ob.o, tE, run.air)));
        ctx.stroke(); ctx.setLineDash([]);
      });
      // 범례
      const lx = x0 + 10, ly = y1 + 6;
      ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(lx - 6, ly - 4, 128 * FS, 62 * FS, 8); ctx.fill();
      [['bowl', '볼링공 7 kg'], ['steel', '쇠공 1 kg'], ['feather', '깃털 1 g']].forEach(([k, label], i) => {
        const yy = ly + 10 * FS + i * 19 * FS;
        const [lw, col, dash] = style[k];
        ctx.strokeStyle = col; ctx.lineWidth = Math.min(lw, 6); ctx.setLineDash(dash);
        ctx.beginPath(); ctx.moveTo(lx, yy); ctx.lineTo(lx + 24, yy); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#334155'; ctx.font = font(12, true); ctx.textAlign = 'left';
        ctx.fillText(label, lx + 30, yy + 4.5 * FS);
      });
    }

    // 측정 기록 점
    const pts = S.recs.slice().sort((a, b) => a.t - b.t);
    if (pts.length > 1) {
      ctx.strokeStyle = 'rgba(242,107,58,.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(px(p.t), py(p.v)) : ctx.moveTo(px(p.t), py(p.v)))); ctx.stroke();
    }
    // 4단계: 직선을 늘여 예측
    const vac = pts.filter((p) => !p.air);
    if (on('tall') && vac.length >= 2) {
      const last = vac[vac.length - 1];
      if (last.t < T_AX - 1e-6) {
        let sxy = 0, sxx = 0;
        vac.forEach((p) => { sxy += p.t * p.v; sxx += p.t * p.t; });
        const k = sxx > 0 ? sxy / sxx : G;
        ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(242,107,58,.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px(last.t), py(last.v)); ctx.lineTo(px(T_AX), py(k * T_AX)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#c2410c'; ctx.font = font(12, true); ctx.textAlign = 'right';
        ctx.fillText('직선을 늘여 예측 →', px(T_AX) - 10, py(k * T_AX) + 4);
      }
    }
    const nowMs = performance.now();
    pts.forEach((p) => {
      const fresh = S.newRec && Math.abs(S.newRec.t - p.t) < 1e-6 && nowMs - S.newRec.at < 900;
      ctx.fillStyle = p.air ? '#fff' : ORANGE; ctx.strokeStyle = p.air ? ORANGE : '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px(p.t), py(p.v), (fresh ? 8 : 5.5) * FS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    // 지금 시각의 속력 (속력 측정기)
    if (run && on('sensor')) {
      const ob = run.objs[0];
      const t = Math.min(S.viewT, T_AX), v = velV(ob, Math.min(S.viewT, ob.T));
      const cx = px(t), cy = py(v);
      if (S.state === 'done') {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(242,107,58,.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx, cy); ctx.lineTo(x0, cy); ctx.stroke(); ctx.setLineDash([]);
        pill(fmtT(S.viewT), cx, y0 + 15 * FS, ORANGE, '#fff', 'center', 12);
        const right = cx < x1 - 110 * FS;
        pill(smart(v) + ' m/s', cx + (right ? 12 : -12), cy - 16 * FS, ORANGE, '#fff', right ? 'left' : 'right', 13);
      }
      const pulse = 7 + Math.sin(nowMs / 200) * 2;
      ctx.strokeStyle = ORANGE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    if (!pts.length && !(run && run.mode === 'compare')) {
      ctx.fillStyle = '#8a95a6'; ctx.font = font(13); ctx.textAlign = 'right';
      ctx.fillText('📍 기록하면 점이 찍혀요', x1 - 4, y1 + 16 * FS);
    }
  }

  /* ---------- 측정 기록표 ---------- */
  function drawTable(r) {
    panel(r);
    const showD = on('delta');
    ctx.textAlign = 'left'; ctx.fillStyle = '#1b2333'; ctx.font = font(15, true);
    ctx.fillText('📋 쇠공의 측정 기록', r.x + 12, r.y + 24 * FS);
    const hx = r.x + 10, hw = r.w - 20;
    const hy = r.y + 36 * FS, hh = 26 * FS, rowH = (PHONE ? 30 : 24);
    const fr = showD ? [0.24, 0.3, 0.46] : [0.42, 0.58];
    const cols = []; let acc = hx;
    fr.forEach((f) => { cols.push({ x: acc, w: hw * f }); acc += hw * f; });
    ctx.fillStyle = '#f1f5fb'; rr(hx, hy, hw, hh, 6); ctx.fill();
    ctx.font = font(13, true); ctx.fillStyle = '#334155'; ctx.textAlign = 'center';
    const heads = showD ? ['시간 (s)', '속력 (m/s)', '속력 변화 (m/s)'] : ['시간 (s)', '속력 (m/s)'];
    heads.forEach((h, i) => ctx.fillText(h, cols[i].x + cols[i].w / 2, hy + hh / 2 + 4.5 * FS));
    if (isNew('delta')) { ctx.strokeStyle = PURPLE; ctx.lineWidth = 2.5; rr(cols[2].x + 2, hy - 2, cols[2].w - 4, r.h - (hy - r.y) - 8, 6); ctx.stroke(); }

    const rows = S.recs.slice().sort((a, b) => a.t - b.t);
    const maxRows = Math.floor((r.y + r.h - 8 - (hy + hh)) / rowH);
    if (!rows.length) {
      ctx.fillStyle = '#8a95a6'; ctx.font = font(13); ctx.textAlign = 'center';
      const msg = S.state === 'done' ? ['⏱ 시각을 고르고', '📍 기록을 눌러요'] : ['▶ 공을 떨어뜨린 뒤', '⏱ 시각을 골라 📍 기록해요'];
      msg.forEach((s, i) => ctx.fillText(s, r.x + r.w / 2, hy + hh + 40 * FS + i * 20 * FS));
      return;
    }
    const over = rows.length > maxRows;
    const shown = over ? rows.slice(0, maxRows - 1) : rows;
    const nowMs = performance.now();
    shown.forEach((p, i) => {
      const y = hy + hh + i * rowH;
      const fresh = S.newRec && Math.abs(S.newRec.t - p.t) < 1e-6 && nowMs - S.newRec.at < 1200;
      if (fresh) { ctx.fillStyle = 'rgba(242,107,58,.16)'; ctx.fillRect(hx, y, hw, rowH); }
      else if (i % 2) { ctx.fillStyle = '#f8fafd'; ctx.fillRect(hx, y, hw, rowH); }
      const cyT = y + rowH / 2 + 4.5 * FS;
      ctx.textAlign = 'center'; ctx.font = font(14, true); ctx.fillStyle = '#1b2333';
      ctx.fillText(p.t.toFixed(1), cols[0].x + cols[0].w / 2, cyT);
      ctx.fillStyle = p.air ? '#64748b' : '#c2410c';
      ctx.fillText(smart(p.v) + (p.air ? ' (공기)' : ''), cols[1].x + cols[1].w / 2, cyT);
      if (showD) {
        const prev = rows[rows.indexOf(p) - 1];
        if (prev) {
          const dv = '+' + smart(p.v - prev.v), dt = ' (' + smart(p.t - prev.t) + '초 동안)';
          ctx.font = font(14, true);
          const w1 = ctx.measureText(dv).width;
          ctx.font = font(12);
          const w2 = ctx.measureText(dt).width;
          const fits = w1 + w2 < cols[2].w - 8;
          const sx = cols[2].x + cols[2].w / 2 - (fits ? (w1 + w2) / 2 : w1 / 2);
          ctx.textAlign = 'left'; ctx.font = font(14, true); ctx.fillStyle = '#6d28d9';
          ctx.fillText(dv, sx, cyT);
          if (fits) { ctx.font = font(12); ctx.fillStyle = '#7c6aa6'; ctx.fillText(dt, sx + w1, cyT); }
        } else {
          ctx.textAlign = 'center'; ctx.font = font(13); ctx.fillStyle = '#a3adbd';
          ctx.fillText('–', cols[2].x + cols[2].w / 2, cyT);
        }
      }
    });
    ctx.strokeStyle = '#e3e9f2'; ctx.lineWidth = 1;
    cols.slice(1).forEach((c) => { ctx.beginPath(); ctx.moveTo(c.x, hy); ctx.lineTo(c.x, hy + hh + shown.length * rowH); ctx.stroke(); });
    if (over) {
      ctx.fillStyle = '#8a95a6'; ctx.font = font(13); ctx.textAlign = 'center';
      ctx.fillText('… 기록 ' + (rows.length - shown.length) + '개 더', r.x + r.w / 2, hy + hh + shown.length * rowH + rowH / 2 + 4.5 * FS);
    }
  }

  function draw() {
    view.clear('#f4f8fd');
    const g = geo();
    drawScene(g);
    if (g.L.gr) {
      drawGraph(g.L.gr);
      drawTable(g.L.tb);
      if (isNew('graph')) { newRing(g.L.gr); newRing(g.L.tb); }
    } else S.gmap = null;
  }

  /* ---------- 실험 진행 ---------- */
  function resetRun() { S.run = null; S.state = 'ready'; S.viewT = 0; }
  function drop() {
    if (S.state === 'running') return;
    S.run = makeRun(); S.state = 'running'; S.viewT = 0; S.flashAt = performance.now();
    Sound.click();
    hideHint();
    syncCtl();
  }
  function land() {
    const run = S.run;
    S.state = 'done'; run.t = run.tEnd; S.viewT = run.tEnd; S.landAt = performance.now();
    S.cnt.lands++;
    if (S.strobe) S.cnt.strobeLands++;
    if (run.mode === 'compare') { if (run.air) S.cnt.cmpAir++; else S.cnt.cmpVac++; }
    if (run.H > 30) S.cnt.tallLands++;
    Sound.tone(110, 0.18, 'sine', 0.2); Sound.tone(70, 0.25, 'triangle', 0.12, 0.02);
    syncCtl();
    rangeT.set(run.tMax);
    if (on('graph')) showHint(PHONE ? '👆 공을 끌어 시각 고르기' : '👆 공을 위아래로 끌거나 ⏱ 시각을 골라 📍 기록해요', 5000);
  }
  function step(dt) {
    stepAir(dt);
    if (S.state !== 'running') return;
    const run = S.run;
    const prev = run.t;
    run.t = Math.min(run.tEnd, run.t + dt * (S.slow ? 0.25 : 1));
    S.viewT = run.t;
    if (Math.floor(run.t * 10 + 1e-6) > Math.floor(prev * 10 + 1e-6) && S.strobe) { S.flashAt = performance.now(); Sound.tick(); }
    if (run.t >= run.tEnd) land();
  }
  // 이미 끝난 실험 하나를 준비 (새로고침 뒤 이어 하기 등)
  function finishedRun() {
    S.run = makeRun(); S.run.t = S.run.tEnd; S.state = 'done'; S.viewT = S.run.tEnd;
    syncCtl(); rangeT.set(S.run.tMax);
  }

  /* ---------- 기록 ---------- */
  function addRec(t, v, air, H) {
    const i = S.recs.findIndex((r) => Math.abs(r.t - t) < 1e-6);
    const rec = { t, v, air, H };
    if (i >= 0) S.recs[i] = rec; else S.recs.push(rec);
    S.recs.sort((a, b) => a.t - b.t);
    S.newRec = { t, at: performance.now() };
  }
  function record() {
    if (S.state !== 'done') { Sound.fail(); toast(S.state === 'running' ? '공이 땅에 닿은 뒤 기록해요' : '먼저 ▶ 떨어뜨리기로 공을 떨어뜨려요'); return; }
    const t = Math.round(+sTime.value * 10) / 10;
    S.viewT = t;
    const v = r2(velV(S.run.objs[0], t));
    addRec(t, v, S.run.air, S.run.H);
    Sound.tick();
    toast('📍 ' + t.toFixed(1) + ' s · ' + smart(v) + ' m/s 기록!');
  }
  const hasRec = (t) => S.recs.some((r) => Math.abs(r.t - t) < 1e-6 && !r.air && Math.abs(r.v - G * t) < 0.06);

  function setViewT(t) {
    if (!S.run || S.state !== 'done') return;
    t = clamp(Math.round(t * 10) / 10, 0, S.run.tMax);
    if (Math.abs(t - S.viewT) > 1e-6 && isTenth(S.viewT)) Sound.tick();
    S.viewT = t; rangeT.set(t);
  }

  /* ---------- 조작 ---------- */
  const sTime = $('#sTime');
  const rangeT = SciSim.bindRange(sTime, $('#oTime'), (v) => (+v).toFixed(1) + ' s', (v) => {
    if (S.state === 'done') S.viewT = Math.round(v * 10) / 10;
    hideHint();
  });
  $('#tMinus').addEventListener('click', () => { Sound.click(); setViewT(+sTime.value - 0.1); });
  $('#tPlus').addEventListener('click', () => { Sound.click(); setViewT(+sTime.value + 0.1); });
  $('#recBtn').addEventListener('click', record);
  $('#clearBtn').addEventListener('click', () => { Sound.click(); S.recs = []; S.newRec = null; });
  $('#dropBtn').addEventListener('click', drop);
  $('#strobeBtn').addEventListener('click', () => { Sound.click(); S.strobe = !S.strobe; syncCtl(); });
  $('#slowBtn').addEventListener('click', () => { Sound.click(); S.slow = !S.slow; syncCtl(); });
  $$('#modeSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setCfg({ mode: b.dataset.mode }); }));
  $$('#airSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setCfg({ air: b.dataset.air === '1' }); }));
  $$('#hSeg button').forEach((b) => b.addEventListener('click', () => { Sound.click(); setCfg({ H: +b.dataset.h }); }));

  function setCfg(o) {
    let ch = false;
    if (o.mode != null && o.mode !== S.mode) { S.mode = o.mode; ch = true; }
    if (o.air != null && o.air !== S.air) { S.air = o.air; ch = true; }
    if (o.H != null && o.H !== S.H) { S.H = o.H; ch = true; }
    if (o.strobe != null) S.strobe = o.strobe;
    if (ch || o.reset) resetRun();
    syncCtl();
  }
  function syncCtl() {
    const db = $('#dropBtn');
    db.disabled = S.state === 'running';
    db.textContent = S.state === 'running' ? '⏳ 떨어지는 중…' : S.state === 'done' ? '▶ 다시 떨어뜨리기' : '▶ 떨어뜨리기';
    $('#strobeBtn').setAttribute('aria-pressed', String(S.strobe));
    $('#slowBtn').setAttribute('aria-pressed', String(S.slow));
    $$('#modeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === S.mode));
    $$('#airSeg button').forEach((b) => b.classList.toggle('on', (b.dataset.air === '1') === S.air));
    $$('#hSeg button').forEach((b) => b.classList.toggle('on', +b.dataset.h === S.H));
    $('#tbLabel').textContent = (S.H > 30 ? '🏢' : '🏗️') + ' 높이 ' + S.H + ' m 낙하 탑';
    const done = S.state === 'done';
    sTime.disabled = !done; $('#tMinus').disabled = !done; $('#tPlus').disabled = !done; $('#recBtn').disabled = !done;
    if (done) { sTime.max = S.run.tMax; } else { sTime.max = S.H > 30 ? 3 : 2; rangeT.set(S.state === 'running' ? sTime.value : 0); }
    rangeT.refresh();
    $('#timeNote').textContent = done
      ? '시각을 고른 뒤 📍 기록! 화면 속 공이나 그래프를 끌어도 돼요.'
      : S.state === 'running' ? '공이 땅에 닿으면 시각을 고를 수 있어요.' : '먼저 ▶ 떨어뜨리기로 공을 떨어뜨려요.';
  }

  /* 캔버스 끌기: 장면(공의 위치) 또는 그래프(시간 축)로 시각 고르기 */
  function zoneAt(p) {
    if (S.state !== 'done' || !on('graph')) return null;
    const g = geo();
    if (p.x >= g.sc.x && p.x <= g.sc.x + g.sc.w && p.y >= g.sc.y && p.y <= g.sc.y + g.sc.h) return 'scene';
    const m = S.gmap;
    if (m && p.x >= m.x0 - 12 && p.x <= m.x1 + 12 && p.y >= m.y1 - 12 && p.y <= m.y0 + 12) return 'graph';
    return null;
  }
  function scrub(p) {
    if (S.drag === 'scene') {
      const g = geo();
      const ob = S.run.objs[0];
      const d = clamp((p.y - g.top) / g.ppm, 0, S.run.H);
      setViewT(tForD(ob, d));
    } else if (S.drag === 'graph' && S.gmap) {
      setViewT(((p.x - S.gmap.x0) / (S.gmap.x1 - S.gmap.x0)) * T_AX);
    }
  }
  SciSim.pointer(view, {
    hover(p) { const z = zoneAt(p); return z === 'scene' ? 'ns-resize' : z === 'graph' ? 'ew-resize' : null; },
    down(p) { const z = zoneAt(p); if (!z) return false; S.drag = z; scrub(p); hideHint(); return true; },
    move(p) { scrub(p); },
    up() { S.drag = null; },
  });

  const hintEl = $('#stageHint');
  function showHint(text, ms) {
    hintEl.textContent = text; hintEl.classList.remove('hide');
    clearTimeout(showHint.t); showHint.t = setTimeout(hideHint, ms || 5000);
  }
  function hideHint() { hintEl.classList.add('hide'); }

  /* ---------- 측정값 표시 ---------- */
  const rT = $('#rT'), rD = $('#rD'), rV = $('#rV'), rVLabel = $('#rVLabel');
  const last = {};
  function put(el, key, html) { if (last[key] !== html) { el.innerHTML = html; last[key] = html; } }
  function readouts() {
    const run = S.run, t = run ? S.viewT : 0;
    const ob = run ? run.objs[0] : null;
    const d = ob ? posD(ob, t) : 0, v = ob ? velV(ob, Math.min(t, ob.T)) : 0;
    const running = S.state === 'running';
    put(rT, 't', (running ? t.toFixed(2) : fmtT(t)) + '<small>s</small>');
    put(rD, 'd', (running ? d.toFixed(1) : smart(d)) + '<small>m</small>');
    put(rV, 'v', (running ? v.toFixed(1) : smart(v)) + '<small>m/s</small>');
    const lbl = run && run.mode === 'compare' ? '속력 (쇠공)' : '속력';
    if (last.vl !== lbl) { rVLabel.textContent = lbl; last.vl = lbl; }
  }

  /* ---------- 미션 도우미 ---------- */
  function prep(o) { setCfg(o); }
  function ensurePhoto() {
    setCfg({ mode: 'single', air: false, H: 20, strobe: true });
    if (S.state !== 'done') finishedRun();
  }
  function ensureData() {
    if (S.recs.filter((r) => !r.air).length >= 3) return;
    setCfg({ mode: 'single', air: false, H: 20 });
    if (S.state !== 'done') finishedRun();
    [0, 0.5, 1, 1.5, 2].forEach((t) => addRec(t, r2(G * t), false, 20));
    S.newRec = null;
    toast('📋 앞 단계의 측정 기록을 불러왔어요');
  }
  const runNote = () => S.state === 'running'
    ? '⏳ 떨어지는 중… <b>' + S.run.t.toFixed(1) + ' s</b>'
    : S.state === 'done' ? '✔ 땅에 닿았어요 (<b>' + S.run.tEnd.toFixed(2) + ' s</b>)' : '▶ <b>떨어뜨리기</b>를 눌러요.';
  const mark = (ok) => (ok ? '✅' : '⬜');

  /* ---------- 미션 ---------- */
  const M_SLOPE = {
    type: 'quiz',
    title: '1초마다 얼마나 빨라질까?',
    goal: '기록표의 <b>속력 변화</b> 칸을 보세요. 자유 낙하하는 쇠공의 속력은 <b>1초마다</b> 얼마씩 증가할까요?',
    setup() { prep({ mode: 'single', air: false, H: 20 }); ensureData(); },
    choices: ['4.9 m/s씩', '9.8 m/s씩', '19.6 m/s씩', '증가하는 양이 점점 커진다'],
    answer: 1,
    feedback: [
      '4.9 m/s는 <b>0.5초</b> 동안의 변화예요. 1초 동안이면?',
      '',
      '19.6 m/s는 2초일 때의 속력이에요. 1초 → 2초 사이에 얼마나 늘었나요?',
      '속력 변화 칸의 값이 모두 같지 않나요? 늘어나는 양은 일정해요.',
    ],
    explain: '0.5초마다 <b>4.9 m/s</b>씩, 즉 <b>1초마다 9.8 m/s씩</b> 일정하게 증가해요. 그래프에 표시된 보라색 삼각형처럼 1초 동안 속력이 9.8 m/s 늘어나요.',
  };
  function showSlope() {
    if (!on('delta')) return false;
    if (!game || game.free || game.phase === 'complete') return true;
    const i = game.index, k = M_SLOPE._flat;
    return i > k || (i === k && game.phase === 'success');
  }

  const SVG_GRAPHS =
    '<svg viewBox="0 0 330 160" width="330" height="160" font-family="sans-serif" role="img" aria-label="(가) 엘리베이터와 (나) 사과의 시간–속력 그래프">' +
    // (가)
    '<text x="92" y="16" text-anchor="middle" font-size="14" font-weight="700" fill="#1b2333">(가) 엘리베이터</text>' +
    '<line x1="34" y1="126" x2="154" y2="126" stroke="#5d6879" stroke-width="1.5"/><line x1="34" y1="126" x2="34" y2="28" stroke="#5d6879" stroke-width="1.5"/>' +
    '<line x1="34" y1="96.7" x2="144" y2="96.7" stroke="#3867f4" stroke-width="3.5"/>' +
    '<text x="29" y="101" text-anchor="end" font-size="12" fill="#5d6879">10</text>' +
    '<text x="70.7" y="141" text-anchor="middle" font-size="12" fill="#5d6879">1</text><text x="107.3" y="141" text-anchor="middle" font-size="12" fill="#5d6879">2</text><text x="144" y="141" text-anchor="middle" font-size="12" fill="#5d6879">3</text>' +
    '<text x="94" y="157" text-anchor="middle" font-size="12" fill="#5d6879">시간 (s)</text>' +
    '<text x="12" y="80" text-anchor="middle" font-size="12" fill="#5d6879" transform="rotate(-90 12 80)">속력 (m/s)</text>' +
    // (나)
    '<text x="258" y="16" text-anchor="middle" font-size="14" font-weight="700" fill="#1b2333">(나) 떨어지는 사과</text>' +
    '<line x1="200" y1="126" x2="320" y2="126" stroke="#5d6879" stroke-width="1.5"/><line x1="200" y1="126" x2="200" y2="28" stroke="#5d6879" stroke-width="1.5"/>' +
    '<line x1="200" y1="97.2" x2="236.7" y2="97.2" stroke="#cbd5e1" stroke-dasharray="3 3"/><line x1="200" y1="68.5" x2="273.3" y2="68.5" stroke="#cbd5e1" stroke-dasharray="3 3"/>' +
    '<line x1="200" y1="126" x2="310" y2="39.8" stroke="#f26b3a" stroke-width="3.5"/>' +
    '<circle cx="236.7" cy="97.2" r="4" fill="#f26b3a"/><circle cx="273.3" cy="68.5" r="4" fill="#f26b3a"/>' +
    '<text x="195" y="101" text-anchor="end" font-size="12" fill="#5d6879">9.8</text><text x="195" y="72" text-anchor="end" font-size="12" fill="#5d6879">19.6</text>' +
    '<text x="236.7" y="141" text-anchor="middle" font-size="12" fill="#5d6879">1</text><text x="273.3" y="141" text-anchor="middle" font-size="12" fill="#5d6879">2</text><text x="310" y="141" text-anchor="middle" font-size="12" fill="#5d6879">3</text>' +
    '<text x="260" y="157" text-anchor="middle" font-size="12" fill="#5d6879">시간 (s)</text>' +
    '<text x="170" y="80" text-anchor="middle" font-size="12" fill="#5d6879" transform="rotate(-90 170 80)">속력 (m/s)</text>' +
    '</svg>';

  game = SciSim.game({
    simId: 'm3-free-fall',
    mount: '#game',
    badge: '자유 낙하 분석가',
    homeHref: '../../index.html#g3',
    featureLabels: {
      strobe: '📸 다중 섬광 사진',
      slow: '🐢 느리게 보기',
      sensor: '⏱️ 속력 측정기',
      graph: '📈 시간–속력 그래프 · 📋 기록표',
      delta: '➕ 속력 변화 계산',
      compare: '⚖️ 여러 물체 비교',
      air: '🌬️ 공기 있음 / 없음',
      tall: '🏢 45 m 높은 탑',
    },
    onFeatures(set) {
      F = set;
      const o = {};
      if (!set.has('compare') && S.mode !== 'single') o.mode = 'single';
      if (!set.has('air') && S.air) o.air = false;
      if (!set.has('tall') && S.H !== 20) o.H = 20;
      setCfg(o);
    },
    levels: [
      {
        title: '떨어지는 물체 관찰', short: '낙하 관찰', icon: '🍎', phase: '관찰',
        features: ['strobe', 'slow'],
        intro: '<p>🤔 <b>탐구 질문</b>: 떨어지는 공은 <b>점점 빨라질까</b>, 아니면 <b>같은 빠르기로</b> 떨어질까?</p>' +
          '<p>높이 20 m 낙하 탑에서 쇠공을 떨어뜨리고, <b>다중 섬광 사진</b>으로 운동을 기록해 봐요. 쇠공처럼 작고 무거운 물체는 공기의 영향을 거의 받지 않아요.</p>',
        setup() { prep({ mode: 'single', air: false, H: 20, strobe: false, reset: true }); showHint('▶ 떨어뜨리기를 눌러 보세요', 6000); },
        recap: '다중 섬광 사진에서 같은 시간(0.1초) 동안 이동한 거리가 점점 커져요. 자유 낙하하는 물체는 <b>점점 빨라져요</b>.',
        summary: '<ul><li><b>자유 낙하 운동</b>: 정지해 있던 물체가 <b>중력만 받아</b> 떨어지는 운동</li>' +
          '<li><b>다중 섬광 사진</b>: 일정한 시간 간격(예: 0.1초)마다 물체의 위치를 한 장에 찍은 사진</li>' +
          '<li>사진 속 물체 사이의 간격이 아래로 갈수록 넓어진다 → 같은 시간 동안 이동 거리가 커진다 → <b>속력이 점점 빨라진다.</b></li></ul>',
        missions: [
          {
            title: '쇠공 떨어뜨리기',
            goal: '<b>▶ 떨어뜨리기</b>를 눌러 쇠공이 땅에 닿을 때까지 지켜보세요. <b>🐢 느리게</b>를 켜면 더 잘 보여요.',
            hint: '화면 위쪽의 주황색 <b>▶ 떨어뜨리기</b> 버튼을 눌러요.',
            setup() { prep({ mode: 'single', air: false, H: 20, strobe: false }); snap(); },
            check: () => since('lands') > 0 && S.state === 'done',
            status: runNote,
            hold: 0.6,
            explain: '공이 아래로 갈수록 빨라지는 것처럼 보이죠? 이렇게 정지해 있던 물체가 <b>중력만 받아</b> 떨어지는 운동을 <b>자유 낙하 운동</b>이라고 해요. 눈으로만은 정확히 알기 어려우니 사진으로 기록해 봐요!',
          },
          {
            title: '다중 섬광 사진 찍기',
            goal: '<b>📸 다중 섬광 사진</b>을 켜고 다시 떨어뜨려, <b>0.1초마다</b> 찍힌 공의 모습을 남겨 보세요.',
            hint: '도구 막대의 <b>📸 다중 섬광 사진</b>을 눌러 켠 다음 <b>▶ 다시 떨어뜨리기</b>!',
            setup() { prep({ mode: 'single', air: false, H: 20 }); snap(); showHint('📸 다중 섬광 사진을 켜고 떨어뜨려요', 6000); },
            check: () => since('strobeLands') > 0 && S.strobe && S.state === 'done',
            status: () => mark(S.strobe) + ' 📸 사진 켜기 · ' + (S.strobe ? runNote() : '⬜ 떨어뜨리기'),
            hold: 0.8,
            explain: '다중 섬광 사진은 어두운 곳에서 <b>일정한 시간 간격(0.1초)</b>마다 빛을 비춰, 움직이는 물체의 위치를 한 장의 사진에 여러 번 찍은 거예요. 사진 속 간격을 비교하면 빠르기 변화를 알 수 있어요.',
          },
          {
            type: 'quiz',
            title: '사진 속 간격 읽기',
            goal: '사진 속 공과 공 사이의 <b>간격</b>은 아래로 갈수록 어떻게 변하나요? 이것으로 알 수 있는 것은?',
            setup() { ensurePhoto(); },
            choices: [
              '간격이 일정하다 → 같은 빠르기로 떨어진다',
              '간격이 점점 넓어진다 → 속력이 점점 빨라진다',
              '간격이 점점 좁아진다 → 속력이 점점 느려진다',
              '간격이 점점 넓어진다 → 속력이 점점 느려진다',
            ],
            answer: 1,
            feedback: [
              '노란 괄호의 거리를 비교해 보세요. 0.44 m, 0.93 m, … 같은가요?',
              '',
              '아래쪽으로 갈수록 공 사이가 어떻게 되었나요?',
              '같은 0.1초 동안 더 먼 거리를 갔다면 빨라진 걸까요, 느려진 걸까요?',
            ],
            explain: '같은 시간(0.1초) 동안 이동한 거리가 <b>0.44 m → 0.93 m → 1.42 m → 1.91 m</b>로 점점 커져요. 같은 시간에 더 많이 이동하니 <b>속력이 점점 빨라지는</b> 거예요.',
          },
        ],
      },
      {
        title: '시간에 따른 속력 기록', short: '속력 기록', icon: '📈', phase: '실험',
        features: ['sensor', 'graph'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 같은 시간 동안 이동한 거리가 점점 커지는 것을 보고, 공이 점점 빨라진다는 것을 알았어요.</div>' +
          '<p>그렇다면 속력은 <b>어떤 규칙</b>으로 빨라질까요? <b>속력 측정기</b>로 시각마다 속력을 재어 <b>기록표</b>와 <b>시간–속력 그래프</b>로 나타내 봐요.</p>',
        setup() { prep({ mode: 'single', air: false, H: 20, strobe: true }); },
        recap: '시간–속력 그래프는 <b>원점을 지나는 기울어진 직선</b>이에요. 속력이 시간에 비례하여 일정하게 증가해요.',
        summary: '<table class="mini"><tr><th>시간 (s)</th><td>0</td><td>0.5</td><td>1.0</td><td>1.5</td><td>2.0</td></tr>' +
          '<tr><th>속력 (m/s)</th><td>0</td><td>4.9</td><td>9.8</td><td>14.7</td><td>19.6</td></tr></table>' +
          '<p>자유 낙하하는 물체의 <b>시간–속력 그래프</b>는 <b>원점을 지나는 기울어진 직선</b>이다. → 속력이 시간에 비례하여 일정하게 증가하는 운동</p>',
        missions: [
          {
            title: '0.5초마다 속력 기록하기',
            goal: '공을 떨어뜨린 뒤 <b>⏱ 시각</b>을 골라 <b>📍 기록</b>하세요. <b>0, 0.5, 1.0, 1.5, 2.0초</b>의 속력을 모두 기록해요.',
            hint: '떨어뜨린 다음 시각 슬라이더(또는 − / + 버튼)로 시각을 고르고 📍 기록! 화면 속 공을 위아래로 끌어도 시각이 바뀌어요.',
            setup() { prep({ mode: 'single', air: false, H: 20 }); S.recs = []; S.newRec = null; snap(); },
            check: () => [0, 0.5, 1, 1.5, 2].every(hasRec),
            status: () => (S.run ? '' : '먼저 ▶ 떨어뜨리기! · ') + [0, 0.5, 1, 1.5, 2].map((t) => mark(hasRec(t)) + ' ' + t.toFixed(1) + ' s').join(' '),
            hold: 0,
            explain: '기록표와 그래프가 완성되었어요. 그래프의 점들이 <b>어떤 모양</b>으로 늘어서 있는지 살펴보세요.',
          },
          {
            type: 'quiz',
            title: '그래프의 모양',
            goal: '기록한 점들을 이은 <b>시간–속력 그래프</b>의 모양은?',
            setup() { ensureData(); },
            choices: [
              '시간 축에 나란한 수평선',
              '원점을 지나는 기울어진 직선',
              '점점 가팔라지는 곡선',
              '올라가다가 수평이 되는 곡선',
            ],
            answer: 1,
            feedback: [
              '수평선이면 속력이 변하지 않는 거예요. 기록표의 속력은 계속 커졌죠?',
              '',
              '점점 가팔라지는 곡선은 시간에 따른 <b>낙하 거리</b>를 그렸을 때의 모양이에요. 속력 점들은 곧게 늘어서요.',
              '공기 저항을 무시하면 속력은 일정해지지 않고 계속 커져요.',
            ],
            explain: '점들이 <b>원점(0, 0)을 지나는 직선</b> 위에 놓여요. 시간이 2배가 되면 속력도 2배 → 속력이 <b>시간에 비례하여 일정하게 증가</b>하는 운동이에요.',
          },
        ],
      },
      {
        title: '속력 변화 분석하기', short: '변화 분석', icon: '🔍', phase: '탐구',
        features: ['delta', 'compare', 'air'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 시간–속력 그래프가 원점을 지나는 직선이라는 것을 알았어요.</div>' +
          '<p>이제 기록표에서 <b>속력 변화</b>를 계산해 1초 동안 속력이 얼마나 변하는지 분석해요. 그리고 <b>질량이 다른 물체</b>도 똑같이 빨라지는지 비교해 봐요.</p>',
        setup() { prep({ mode: 'single', air: false, H: 20 }); },
        recap: '자유 낙하하는 물체는 <b>질량에 관계없이 1초마다 속력이 9.8 m/s씩</b> 일정하게 증가해요. (공기 저항 무시)',
        summary: '<span class="formula">1초마다 속력 변화량 = 9.8 m/s (일정)</span>' +
          '<ul><li>물체의 <b>종류나 질량에 관계없이</b> 같다. (공기 저항을 무시할 때)</li>' +
          '<li>진공에서는 볼링공·쇠공·깃털이 <b>동시에</b> 떨어진다.</li>' +
          '<li>공기 중에서 깃털이 천천히 떨어지는 것은 질량 때문이 아니라 <b>공기 저항</b> 때문이다.</li></ul>',
        missions: [
          M_SLOPE,
          {
            title: '무거운 공이 먼저 떨어질까?',
            goal: '<b>⚖️ 세 물체 함께</b>로 쇠공(1 kg)·볼링공(7 kg)·깃털을 떨어뜨려 비교하세요. <b>① 진공</b>에서 한 번, <b>② 공기 있음</b>에서 한 번!',
            hint: '오른쪽 실험 조건에서 <b>세 물체 함께</b>를 고르고 ▶ 떨어뜨리기. 그다음 <b>🌬️ 공기: 있음</b>으로 바꿔 한 번 더!',
            setup() { prep({ mode: 'compare', air: false, H: 20, strobe: true }); snap(); showHint('⚖️ 세 물체를 함께 떨어뜨려 봐요', 6000); },
            check: () => since('cmpVac') > 0 && since('cmpAir') > 0 && S.state === 'done',
            status: () => mark(since('cmpVac') > 0) + ' ① 진공에서 비교 · ' + mark(since('cmpAir') > 0) + ' ② 공기 있음에서 비교' +
              (S.mode !== 'compare' ? '<br>⚖️ 물체: <b>세 물체 함께</b>를 골라요.' : S.state === 'running' ? '<br>⏳ 떨어지는 중…' : ''),
            hold: 0.8,
            explain: '<b>진공</b>에서는 질량이 7배인 볼링공도, 아주 가벼운 깃털도 <b>동시에</b> 땅에 닿았고 그래프도 하나로 겹쳤어요. <b>공기가 있으면</b> 깃털은 공기 저항을 크게 받아 천천히 떨어지지만, 쇠공과 볼링공은 거의 함께 떨어져요.',
          },
          {
            type: 'quiz',
            title: '무거우면 더 빨리 떨어질까?',
            goal: '친구가 말했어요. <b>“무거운 물체일수록 더 빨리 떨어져.”</b> 실험 결과로 판단한 것으로 옳은 것은?',
            choices: [
              '옳다. 진공에서 볼링공이 쇠공보다 먼저 떨어졌다.',
              '옳다. 공기 중에서 깃털이 가장 늦게 떨어졌다.',
              '옳지 않다. 공기 저항을 무시하면 질량에 관계없이 1초마다 속력이 9.8 m/s씩 똑같이 증가한다.',
              '옳지 않다. 가벼운 물체일수록 더 빨리 떨어진다.',
            ],
            answer: 2,
            feedback: [
              '진공에서 세 물체의 도착 시간을 다시 보세요. 모두 같았죠?',
              '깃털이 늦은 건 질량 때문이 아니라 <b>공기 저항</b> 때문이에요. 진공에서는 깃털도 함께 떨어졌어요.',
              '',
              '진공에서 가벼운 깃털과 무거운 볼링공은 함께 떨어졌어요.',
            ],
            explain: '공기 저항을 무시하면 물체의 <b>종류나 질량에 관계없이</b> 1초마다 속력이 <b>9.8 m/s</b>씩 증가해요. 일상에서 가벼운 물체가 늦게 떨어지는 것은 <b>공기 저항</b> 때문이에요.',
          },
        ],
      },
      {
        title: '자유 낙하 운동 예측하기', short: '예측', icon: '🎯', phase: '적용',
        features: ['tall'],
        intro: '<div class="si-link">🔗 <b>앞 단계에서</b> 자유 낙하하는 물체는 질량에 관계없이 1초마다 속력이 9.8 m/s씩 증가한다는 것을 알았어요.</div>' +
          '<p>이 규칙을 이용하면 측정하지 않은 시각의 속력도 <b>예측</b>할 수 있어요. 예측하고, 더 높은 탑에서 직접 확인해 봐요!</p>',
        setup() { prep({ mode: 'single', air: false, H: 20 }); },
        recap: '속력 = 9.8 × 시간. 규칙으로 <b>3초 후 속력 29.4 m/s</b>를 예측하고 실험으로 확인했어요.',
        summary: '<span class="formula">자유 낙하하는 물체의 속력 = 9.8 × 시간</span>' +
          '<ul><li>예: 3초 후 → 9.8 × 3 = <b>29.4 m/s</b> (그래프의 직선을 늘여서도 예측할 수 있다.)</li>' +
          '<li><b>등속 운동</b>: 속력이 일정 → 시간–속력 그래프가 시간 축에 나란한 직선</li>' +
          '<li><b>자유 낙하 운동</b>: 속력이 일정하게 증가 → 원점을 지나는 기울어진 직선 (1초마다 9.8 m/s씩 증가)</li></ul>',
        missions: [
          {
            type: 'quiz',
            title: '3초 후의 속력 예측',
            goal: '20 m 탑에서는 2초까지만 잴 수 있었어요. 떨어지기 시작하고 <b>3초 후</b> 쇠공의 속력은 얼마일까요? (공기 저항 무시)',
            setup() { prep({ mode: 'single', air: false, H: 20 }); ensureData(); },
            choices: ['19.6 m/s', '29.4 m/s', '39.2 m/s', '44.1 m/s'],
            answer: 1,
            feedback: [
              '2초 이후에도 중력이 계속 작용해서 계속 빨라져요.',
              '',
              '1초마다 2배가 되는 것이 아니라 9.8 m/s씩 <b>더해져요</b>.',
              '44.1은 3초 동안 떨어진 <b>거리(m)</b>예요. 속력은 1초마다 9.8 m/s씩 늘어나요.',
            ],
            explain: '0 → 9.8 → 19.6 → <b>29.4 m/s</b>. 속력 = 9.8 × 3 = 29.4 m/s예요. 그래프의 점선처럼 직선을 늘여도 같은 값을 얻어요.',
          },
          {
            title: '높은 탑에서 확인하기',
            goal: '<b>🏢 탑 높이</b>를 <b>45 m</b>로 바꾸고 쇠공을 떨어뜨린 뒤, <b>3.0초</b>의 속력을 📍 기록해 예측을 확인하세요.',
            hint: '실험 조건에서 <b>탑 높이 45 m</b> → ▶ 떨어뜨리기 → 시각 <b>3.0 s</b> → 📍 기록',
            setup() { prep({ mode: 'single', air: false }); ensureData(); snap(); },
            check: () => hasRec(3),
            status: () => mark(S.H === 45) + ' 45 m 탑 · ' + mark(S.H === 45 && S.state === 'done') + ' 떨어뜨리기 · ' + mark(hasRec(3)) + ' 3.0 s 기록' +
              (S.air ? '<br>🌬️ 공기는 <b>없음 (진공)</b>으로 해 주세요.' : S.mode !== 'single' ? '<br>⚖️ 물체는 <b>쇠공 하나</b>로 해 주세요.' : ''),
            hold: 0,
            explain: '측정값 <b>29.4 m/s</b> = 예측값! 규칙으로 예측한 결과가 실험과 딱 맞아요. 3초 동안 공은 무려 44.1 m를 떨어졌어요.',
          },
          {
            type: 'quiz',
            title: '다른 운동과 비교하기',
            goal: '(가)는 일정한 속력으로 올라가는 엘리베이터, (나)는 나무에서 떨어지는 사과의 시간–속력 그래프예요. 옳은 것은? (공기 저항 무시)',
            figure: SVG_GRAPHS,
            choices: [
              '(가)는 1초마다 속력이 9.8 m/s씩 증가한다.',
              '(나)는 속력이 일정한 운동이다.',
              '(나)에서 1초마다 속력 변화량은 9.8 m/s로 일정하다.',
              '사과는 쇠공보다 가벼우므로 (나)의 직선은 더 완만하다.',
            ],
            answer: 2,
            feedback: [
              '(가)는 시간 축에 나란한 직선 → 속력이 변하지 않는 <b>등속 운동</b>이에요.',
              '(나)는 기울어진 직선 → 속력이 점점 증가해요.',
              '',
              '공기 저항을 무시하면 물체의 종류나 질량에 관계없이 1초마다 9.8 m/s씩 증가해요.',
            ],
            explain: '(가) <b>등속 운동</b>: 속력이 일정 → 수평한 직선. (나) <b>자유 낙하 운동</b>: 1초마다 속력이 9.8 m/s씩 일정하게 증가 → 원점을 지나는 기울어진 직선이에요.',
          },
        ],
      },
    ],
  });

  /* ---------- 시작 ---------- */
  syncCtl();
  SciSim.loop((dt) => {
    step(dt);
    draw();
    readouts();
  });
  window.FreeFallDebug = { S, geo, VW, VH, makeRun, finishedRun, setViewT, get game() { return game; } };
})();
