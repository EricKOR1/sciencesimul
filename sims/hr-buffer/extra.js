/* 화학 반응의 세계 Ⅰ. 산 염기 평형 - 완충 용액과 혈액 [12반응01-05] · 더 탐구하기
   혈액의 완충 작용: 혈액 1 L에 산(H⁺)이나 CO₂가 늘어날 때, 완충계(H₂CO₃/HCO₃⁻)가 있으면 pH가 조금만 변하고,
   없으면(pH 7.4로 맞춘 물) 크게 변해요. 산이 HCO₃⁻의 양(24 mmol)을 넘으면 완충 용량을 넘어 pH가 급락해요.
   ※ 헨더슨–하셀바흐 식이나 완충 용량 계산은 학생에게 보여 주지 않아요. pH는 측정 자료처럼 읽음표로만 보여 줘요.
   모형(25 °C, 혈액 1 L): HCO₃⁻ 24 mM, 용해 CO₂(H₂CO₃) 1.2 mM, H₂CO₃의 Ka = 10^−6.1 → 처음 pH 7.40 (본 차시의 값).
     전하 균형 [Na⁺] + [H⁺] = [HCO₃⁻] + [Cl⁻] + [OH⁻] 를 풀어 [H⁺]를 구해요(CO₃²⁻는 무시).
     산(H⁺)이 늘 때: 생긴 CO₂는 폐가 내보내 H₂CO₃는 1.2 mM로 그대로라고 봐요(열린 계).
     CO₂가 늘 때: 폐가 내보내지 못하고 쌓인 CO₂예요(닫힌 계, 탄소 총량이 늘어요).
     완충계 없음: 같은 부피의 물을 아주 적은 염기로 pH 7.4에 맞춘 것([Na⁺] = 2.1 × 10⁻⁷ M). */
(function () {
  'use strict';
  const KA = Math.pow(10, -6.1), KW = 1e-14, H0 = Math.pow(10, -7.4);
  const solve = (s) => {
    const x = s.amt * 1e-3, buf = s.buf, acid = s.what === 'h';
    const na = buf ? 0.024 : (KW / H0 - H0), cl = acid ? x : 0;
    const hco3 = (h) => {
      if (buf && acid) return 0.0012 * KA / h;
      const ct = (buf ? 0.0252 : 0) + (acid ? 0 : x);
      return ct * KA / (KA + h);
    };
    let lo = -14, hi = 0;
    for (let i = 0; i < 80; i++) {
      const m = (lo + hi) / 2, h = Math.pow(10, m);
      const f = na + h - hco3(h) - cl - KW / h;
      if (f > 0) hi = m; else lo = m;
    }
    const h = Math.pow(10, (lo + hi) / 2);
    return { ph: -Math.log10(h), hco3: hco3(h) * 1000 };
  };
  const F = '"Pretendard Variable", Pretendard, sans-serif';
  const hdots = Array.from({ length: 30 }, (_, i) => ({ x: 40 + ((i * 89) % 230), y: 120 + ((i * 53) % 170), p: i * 1.7 }));
  const phCol = (ph) => (ph >= 7.35 ? '#16a34a' : ph >= 6.5 ? '#f59e0b' : '#dc2626');

  SciSim.extraLab({
    id: 'bloodbuf', step: 3, icon: '🔎', title: '혈액의 완충 작용',
    intro: '혈액 1 L에 산이나 CO₂가 늘어날 때 완충계가 있을 때와 없을 때의 pH를 비교해요.',
    size: [600, 340],
    controls: [
      { key: 'what', type: 'seg', label: '늘어나는 것', options: [['h', '산 (H⁺)'], ['co2', 'CO₂']], value: 'h' },
      { key: 'amt', type: 'range', label: '늘어난 양 (혈액 1 L에)', min: 0, max: 30, step: 1, value: 0, unit: 'mmol' },
      { key: 'buf', type: 'toggle', label: '완충계 (H₂CO₃ / HCO₃⁻)', value: true },
    ],
    readouts: [{ key: 'ph', label: '혈액의 pH' }, { key: 'hco3', label: '남은 HCO₃⁻' }, { key: 'st', label: '상태' }],
    init(s) { s.t = 0; },
    tick(s, dt) { s.t += dt; },
    read(s) {
      const r = solve(s);
      const st = r.ph >= 7.35 && r.ph <= 7.45 ? '정상 범위 (7.35~7.45)' : (s.buf && s.what === 'h' && s.amt >= 24) ? '완충 용량을 넘음' : '정상보다 산성';
      return { ph: r.ph.toFixed(2), hco3: s.buf ? (r.hco3 < 0.05 ? '0 mmol' : r.hco3.toFixed(1) + ' mmol') : '없음', st };
    },
    draw(ctx, W, H, s, t) {
      const r = solve(s);
      ctx.fillStyle = '#fbf7f4'; ctx.fillRect(0, 0, W, H);
      // 비커
      const bx = 24, by = 70, bw = 270, bh = 236;
      ctx.fillStyle = s.buf ? '#f6c9c9' : '#dbeafe'; ctx.beginPath(); ctx.roundRect(bx, by + 30, bw, bh - 30, [0, 0, 18, 18]); ctx.fill();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh - 18); ctx.quadraticCurveTo(bx, by + bh, bx + 18, by + bh); ctx.lineTo(bx + bw - 18, by + bh); ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw, by + bh - 18); ctx.lineTo(bx + bw, by); ctx.stroke();
      // HCO₃⁻ (파란 공): 남은 양만큼 (1개 = 1 mmol)
      const nB = s.buf ? Math.min(24, Math.round(r.hco3)) : 0;
      for (let i = 0; i < nB; i++) {
        const cx = bx + 30 + (i % 8) * 30, cy = by + 60 + Math.floor(i / 8) * 34;
        ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
      }
      // 자유 H⁺ (주황 공): pH가 낮을수록 많이 (그림용)
      const nH = Math.max(0, Math.min(30, Math.round((7.4 - r.ph) * 5)));
      for (let i = 0; i < nH; i++) {
        const d = hdots[i], cx = d.x + 4 * Math.sin(t * 2 + d.p), cy = d.y + 4 * Math.cos(t * 2.3 + d.p);
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
      }
      ctx.font = '800 20px ' + F; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = '#1f2937';
      ctx.fillText(s.buf ? '혈액 (완충계 있음)' : '물 (완충계 없음)', bx + bw / 2, 26);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(bx + 14, 56, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1f2937'; ctx.fillText('HCO₃⁻', bx + 30, 57);
      ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(bx + 140, 56, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1f2937'; ctx.fillText('자유 H⁺', bx + 154, 57);
      // pH 막대 (1 ~ 8)
      const gx = 400, gy0 = 306, gy1 = 40, yOf = (p) => gy0 - (Math.max(1, Math.min(8, p)) - 1) / 7 * (gy0 - gy1);
      ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.roundRect(gx - 24, gy1, 48, gy0 - gy1, 24); ctx.fill();
      ctx.fillStyle = 'rgba(22,163,74,.35)'; ctx.fillRect(gx - 34, yOf(7.45) - 3, 68, yOf(7.35) - yOf(7.45) + 6);
      const py = yOf(r.ph);
      ctx.fillStyle = phCol(r.ph); ctx.beginPath(); ctx.roundRect(gx - 24, py, 48, gy0 - py, [0, 0, 24, 24]); ctx.fill();
      ctx.beginPath(); ctx.moveTo(gx + 32, py); ctx.lineTo(gx + 52, py - 12); ctx.lineTo(gx + 52, py + 12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1f2937'; ctx.textAlign = 'right';
      [1, 4, 7].forEach((p) => ctx.fillText(String(p), gx - 40, yOf(p)));
      ctx.textAlign = 'center'; ctx.fillText('pH', gx, 22);
      ctx.textAlign = 'left'; ctx.fillStyle = '#15803d'; ctx.fillText('정상', gx + 60, yOf(7.4) - (Math.abs(py - yOf(7.4)) < 26 ? 26 : 0));
    },
  });
})();
