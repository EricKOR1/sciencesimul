/* 지구시스템과학 - 선택적 흡수와 생명가능지대 [12지시03-01] · 더 탐구하기
   생명에 중요한 물의 특성 두 가지:
   ① 비열이 커요: 같은 질량의 물(바다)과 모래·암석(육지)에 같은 햇빛 에너지를 주면 물의 온도가 훨씬 덜 올라요.
   ② 얼음이 물에 떠요: 겨울에 호수는 표면부터 얼고, 얼음(밀도 0.92 g/cm³)이 물(1.00 g/cm³) 위에 떠서 아래의 물은 얼지 않아요.
   모형(예시 값): 처음 온도 20 °C, 1 g이 1시간에 받는 열 Q = 4.2 J, 온도 변화 ΔT = Q × 시간 / c.
     비열 c: 물 4.2 J/g·K, 모래·암석 0.8 J/g·K (본 차시의 값) → 물 +1.0 °C/시간, 모래 +5.25 °C/시간.
   얼음 두께는 그림용이에요(기온이 낮을수록 두껍게). 밀도는 실제 값(본 차시의 0.92). */
(function () {
  'use strict';
  const C_W = 4.2, C_S = 0.8, Q = 4.2, T0 = 20;
  const temps = (s) => ({ w: T0 + Q * s.hr / C_W, s: T0 + Q * s.hr / C_S });
  const F = '"Pretendard Variable", Pretendard, sans-serif';
  const therm = (ctx, x, top, bot, v, col) => {
    const yOf = (c) => bot - (Math.max(10, Math.min(60, c)) - 10) / 50 * (bot - top);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(x - 10, top - 6, 20, bot - top + 12, 10); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - 6, yOf(v), 12, bot - yOf(v) + 4, 6); ctx.fill();
    ctx.beginPath(); ctx.arc(x, bot + 10, 13, 0, Math.PI * 2); ctx.fill();
  };

  SciSim.extraLab({
    id: 'water', step: 4, icon: '🔎', title: '물의 특별한 성질',
    intro: '같은 햇빛을 받는 바다와 모래, 그리고 겨울 호수를 살펴봐요.',
    size: [600, 340],
    controls: [
      { key: 'hr', type: 'range', label: '햇빛을 받은 시간', min: 0, max: 6, step: 0.5, value: 0, unit: '시간', fmt: (v) => v.toFixed(1) },
      { key: 'air', type: 'range', label: '겨울 호수의 기온', min: -15, max: 5, step: 1, value: 5, unit: '°C', fmt: (v) => (v < 0 ? '−' + (-v) : String(v)) },
    ],
    readouts: [{ key: 'w', label: '바닷물의 온도' }, { key: 's', label: '모래의 온도' }, { key: 'lake', label: '호수 표면' }],
    init(s) { s.t = 0; },
    tick(s, dt) { s.t += dt; },
    read(s) {
      const T = temps(s);
      return { w: T.w.toFixed(1) + ' °C', s: T.s.toFixed(1) + ' °C', lake: s.air < 0 ? '얼음이 뜸 (0.92 g/cm³)' : '물 (1.00 g/cm³)' };
    },
    draw(ctx, W, H, s, t) {
      const T = temps(s);
      // 왼쪽: 바닷가
      const sky = ctx.createLinearGradient(0, 0, 0, 170); sky.addColorStop(0, '#fde68a'); sky.addColorStop(1, '#fff7ed');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 296, 190);
      const sunR = 22 + 4 * Math.sin(t * 2);
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(150, 46, s.hr > 0 ? sunR : 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.fillRect(0, 190, 150, H - 190);
      ctx.fillStyle = '#d6b98c'; ctx.beginPath(); ctx.moveTo(150, 190); ctx.lineTo(296, 176); ctx.lineTo(296, H); ctx.lineTo(150, H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const y = 214 + i * 34, o = 8 * Math.sin(t * 1.5 + i); ctx.beginPath(); ctx.moveTo(14 + o, y); ctx.quadraticCurveTo(50 + o, y - 8, 86 + o, y); ctx.stroke(); }
      therm(ctx, 112, 96, 280, T.w, '#0284c7');
      therm(ctx, 262, 96, 280, T.s, '#ea580c');
      ctx.font = '800 20px ' + F; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1f2937';
      ctx.fillText('바다', 50, 318); ctx.fillText('모래', 205, 318);
      // 가운데 선
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(296, 0, 8, H);
      // 오른쪽: 겨울 호수
      const frz = s.air < 0, x0 = 304;
      ctx.fillStyle = frz ? '#e0f2fe' : '#ecfeff'; ctx.fillRect(x0, 0, W - x0, 120);
      ctx.fillStyle = '#a3a3a3'; ctx.beginPath(); ctx.moveTo(x0, 120); ctx.lineTo(x0 + 26, 120); ctx.lineTo(x0 + 70, H); ctx.lineTo(x0, H); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W, 120); ctx.lineTo(W - 26, 120); ctx.lineTo(W - 70, H); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.moveTo(x0 + 26, 128); ctx.lineTo(W - 26, 128); ctx.lineTo(W - 70, H - 8); ctx.lineTo(x0 + 70, H - 8); ctx.closePath(); ctx.fill();
      if (frz) {
        const th = 10 + 3 * (-s.air);
        ctx.fillStyle = '#f0f9ff'; ctx.beginPath(); ctx.roundRect(x0 + 24, 128 - th * 0.08, W - x0 - 48, th, 4); ctx.fill();
        ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#0c4a6e'; ctx.fillText('얼음', (x0 + W) / 2, 128 - th * 0.08 + th / 2 + 1);
      }
      for (let i = 0; i < 3; i++) {
        const fx = x0 + 110 + i * 60 + 18 * Math.sin(t * 0.8 + i * 2), fy = 250 + i * 18 - (i === 1 ? 40 : 0), d = Math.cos(t * 0.8 + i * 2) >= 0 ? 1 : -1;
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(fx, fy, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(fx - 14 * d, fy); ctx.lineTo(fx - 26 * d, fy - 8); ctx.lineTo(fx - 26 * d, fy + 8); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#1f2937'; ctx.fillText(frz ? '겨울 호수' : '호수', (x0 + W) / 2, 30);
      ctx.fillStyle = '#eff6ff'; ctx.fillText('물 (액체)', (x0 + W) / 2, 312);
    },
  });
})();
