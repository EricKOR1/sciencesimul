/* 역학과 에너지 Ⅰ. 시공간과 운동 - 등가 원리와 블랙홀 [12역학01-06] · 더 탐구하기
   GPS 시간 보정: 위성의 고도를 바꾸면 중력 효과(일반 상대론, 빨라짐 +)와 속력 효과(특수 상대론, 느려짐 −)가 달라지고,
   둘을 합친 하루 보정량도 달라져요. 낮은 궤도에서는 속력 효과가 더 커서 위성 시계가 오히려 느려져요.
   ※ 학생에게 식은 보여 주지 않고 값과 방향만 보여 줘요(정성적·사례 중심).
   모형: 원 궤도, 지상 시계는 정지로 봐요(지구 자전 무시), 약한 중력 근사.
     중력 효과(μs/일) = GM/c² × (1/R − 1/r) × 86400 × 10⁶
     속력 효과(μs/일) = −v²/(2c²) × 86400 × 10⁶,  v = √(GM/r)
   실제 값: GM = 3.986 × 10¹⁴ m³/s², c = 2.998 × 10⁸ m/s, R = 6371 km.
   고도 20200 km(GPS)에서 +45.7, −7.2, 합 +38.5 μs/일로 본 차시의 값과 같아요. */
(function () {
  'use strict';
  const GM = 3.986e14, C = 2.998e8, RE = 6.371e6, DAY = 86400;
  const calc = (hKm) => {
    const r = RE + hKm * 1000;
    const gr = (GM / (C * C)) * (1 / RE - 1 / r) * DAY * 1e6;
    const sr = -(GM / r) / (2 * C * C) * DAY * 1e6;
    return { gr, sr, sum: gr + sr, r };
  };
  const sg = (v) => (v >= 0.05 ? '+' : v <= -0.05 ? '−' : '') + Math.abs(v).toFixed(1);
  const F = '"Pretendard Variable", Pretendard, sans-serif';

  SciSim.extraLab({
    id: 'gpsclock', step: 4, icon: '🔎', title: '위성 고도와 시계',
    intro: '위성의 고도를 바꾸며 두 상대론 효과와 하루 보정량을 비교해요.',
    size: [600, 340],
    controls: [
      { key: 'h', type: 'range', label: '위성의 고도', min: 200, max: 36000, step: 100, value: 20200, unit: 'km', fmt: (v) => Math.round(v).toLocaleString('ko-KR') },
    ],
    readouts: [{ key: 'gr', label: '중력 효과 (일반)' }, { key: 'sr', label: '속력 효과 (특수)' }, { key: 'sum', label: '하루 보정량 (합)' }],
    init(s) { s.ang = 0; },
    tick(s, dt) {
      const k = Math.pow(RE / (RE + s.h * 1000), 1.5);
      s.ang = (s.ang + dt * 2.2 * k) % (Math.PI * 2);
    },
    read(s) {
      const c = calc(s.h);
      return { gr: sg(c.gr) + ' μs/일', sr: sg(c.sr) + ' μs/일', sum: sg(c.sum) + ' μs/일' };
    },
    draw(ctx, W, H, s) {
      const c = calc(s.h);
      ctx.fillStyle = '#f4f7fb'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e8eef7'; ctx.fillRect(0, 0, 300, H);
      // 지구와 궤도 (반지름 비율은 실제와 같아요)
      const cx = 150, cy = 170, re = 22, ro = re * c.r / RE;
      ctx.strokeStyle = 'rgba(71,85,105,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(cx, cy, ro, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      const g = ctx.createRadialGradient(cx - 7, cy - 7, 3, cx, cy, re);
      g.addColorStop(0, '#7cc4ff'); g.addColorStop(1, '#1f6fc0');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, re, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(cx + 5, cy - 4, 8, 6, 0.5, 0, Math.PI * 2); ctx.fill();
      const sx = cx + ro * Math.cos(s.ang), sy = cy - ro * Math.sin(s.ang);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-s.ang);
      ctx.fillStyle = '#64748b'; ctx.fillRect(-4, -15, 8, 30);
      ctx.fillStyle = '#2563eb'; ctx.fillRect(-3, -28, 6, 12); ctx.fillRect(-3, 16, 6, 12);
      ctx.restore();
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '800 20px ' + F; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1f2937'; ctx.fillText('지구', cx, cy + re + 18);
      // 막대: 0 위는 빨라짐, 아래는 느려짐
      const y0 = 190, k = 2.6, xs = [355, 450, 545], bw = 64;
      const vals = [c.gr, c.sr, c.sum], cols = ['#16a34a', '#dc2626', c.sum >= 0 ? '#2563eb' : '#7c3aed'];
      vals.forEach((v, i) => {
        const hgt = v * k;
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.roundRect(xs[i] - bw / 2, hgt >= 0 ? y0 - hgt : y0, bw, Math.max(2, Math.abs(hgt)), 6); ctx.fill();
      });
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(312, y0); ctx.lineTo(592, y0); ctx.stroke();
      ctx.font = '800 20px ' + F; ctx.fillStyle = '#1f2937';
      ctx.fillText('중력', xs[0], 316); ctx.fillText('속력', xs[1], 316); ctx.fillText('합', xs[2], 316);
      ctx.textAlign = 'left'; ctx.fillStyle = '#15803d'; ctx.fillText('▲ 빨라짐', 314, 24);
      ctx.fillStyle = '#b91c1c'; ctx.fillText('▼ 느려짐', 314, 284);
    },
  });
})();
