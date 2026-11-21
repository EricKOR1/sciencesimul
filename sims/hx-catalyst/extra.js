/* 물질과 에너지 Ⅳ. 반응 속도 - 촉매와 반응 속도 [12물에04-04] · 더 탐구하기
   촉매의 활용: 자동차 촉매 변환기(삼원 촉매 Pt·Pd·Rh)가 배기가스 속 유해 기체(CO, NOₓ)를
   CO₂, N₂ 같은 무해한 기체로 바꾸는 비율이 촉매 유무와 배기가스 온도에 따라 어떻게 달라지는지 봐요.
   ※ 촉매의 반응 메커니즘(중간체)은 다루지 않아요. "촉매가 Eₐ를 낮춰 낮은 온도에서도 반응이 빨라진다"만 보여 줘요.
   모형(예시 값): 관을 지나는 동안 정화되는 비율 X = 1 − exp(−kτ),
     kτ = ln2 × exp(−(Eₐ/R)(1/T − 1/T₅₀))  (아레니우스 꼴, T₅₀ = 절반이 정화되는 온도)
     촉매 있음: Eₐ = 80 kJ/mol, T₅₀ = CO 250 °C, NOₓ 290 °C (실제 삼원 촉매의 작동 시작 온도 약 250 ~ 300 °C와 같은 크기)
     촉매 없음: Eₐ = 200 kJ/mol, T₅₀ = CO 950 °C, NOₓ 1400 °C (배기가스 온도에서는 거의 반응하지 않음) */
(function () {
  'use strict';
  const R = 8.314;
  const P = { on: { ea: 80000, co: 250, no: 290 }, off: { ea: 200000, co: 950, no: 1400 } };
  const conv = (s, gas) => {
    const p = P[s.cat ? 'on' : 'off'], T = s.temp + 273.15, T50 = p[gas] + 273.15;
    const kt = Math.LN2 * Math.exp(-(p.ea / R) * (1 / T - 1 / T50));
    return 1 - Math.exp(-kt);
  };
  const pc = (x) => Math.round(x * 100) + ' %';
  const F = '"Pretendard Variable", Pretendard, sans-serif';
  const parts = Array.from({ length: 34 }, (_, i) => ({ y: 150 + ((i * 37) % 64), off: (i * 0.137) % 1, no: i % 3 === 0, r: (i * 0.618) % 1 }));

  SciSim.extraLab({
    id: 'converter', step: 4, icon: '🔎', title: '자동차 촉매 변환기',
    intro: '촉매가 있을 때와 없을 때, 배기가스 온도에 따라 유해 기체가 얼마나 정화되는지 봐요.',
    size: [600, 340],
    controls: [
      { key: 'cat', type: 'toggle', label: '촉매 변환기 (Pt·Pd·Rh)', value: true },
      { key: 'temp', type: 'range', label: '배기가스 온도', min: 20, max: 800, step: 10, value: 300, unit: '°C' },
    ],
    readouts: [{ key: 'co', label: 'CO 정화율' }, { key: 'no', label: 'NOₓ 정화율' }, { key: 'st', label: '나가는 기체' }],
    init(s) { s.t = 0; },
    tick(s, dt) { s.t += dt; },
    read(s) {
      const a = conv(s, 'co'), b = conv(s, 'no'), m = (a + b) / 2;
      return { co: pc(a), no: pc(b), st: m >= 0.9 ? '거의 무해함' : m >= 0.3 ? '일부만 정화됨' : '유해 기체가 그대로' };
    },
    draw(ctx, W, H, s, t) {
      const xCo = conv(s, 'co'), xNo = conv(s, 'no');
      ctx.fillStyle = '#f5f7fa'; ctx.fillRect(0, 0, W, H);
      // 관 (온도가 높을수록 붉게 달아올라요)
      const q = (s.temp - 20) / 780, glow = 'rgb(' + Math.round(148 + 100 * q) + ',' + Math.round(163 - 60 * q) + ',' + Math.round(184 - 130 * q) + ')';
      ctx.fillStyle = glow; ctx.fillRect(70, 140, 470, 84);
      ctx.fillStyle = '#eef2f6'; ctx.fillRect(70, 148, 470, 68);
      // 엔진
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.roundRect(8, 120, 72, 124, 10); ctx.fill();
      // 변환기
      const cx0 = 220, cx1 = 380;
      ctx.fillStyle = s.cat ? '#cbd5e1' : '#e2e8f0'; ctx.beginPath(); ctx.roundRect(cx0, 118, cx1 - cx0, 128, 16); ctx.fill();
      ctx.strokeStyle = glow; ctx.lineWidth = 5; ctx.stroke();
      if (s.cat) {
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
        for (let x = cx0 + 14; x < cx1 - 6; x += 16) { ctx.beginPath(); ctx.moveTo(x, 128); ctx.lineTo(x, 236); ctx.stroke(); }
        for (let y = 138; y < 236; y += 16) { ctx.beginPath(); ctx.moveTo(cx0 + 8, y); ctx.lineTo(cx1 - 8, y); ctx.stroke(); }
      }
      // 기체 입자: 변환기를 지나며 정해진 비율만큼 무해한 기체로 바뀌어요
      parts.forEach((p) => {
        const f = (p.off + t * 0.12) % 1, x = 90 + f * 490;
        const X = p.no ? xNo : xCo, done = x > (cx0 + cx1) / 2 && p.r < X;
        ctx.fillStyle = done ? (p.no ? '#4ade80' : '#60a5fa') : (p.no ? '#b45309' : '#374151');
        ctx.beginPath(); ctx.arc(x, p.y, 9, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = glow; ctx.fillRect(540, 140, 6, 84);
      // 이름표
      ctx.font = '800 20px ' + F; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.fillStyle = '#1f2937';
      ctx.fillText('엔진', 44, 270);
      ctx.fillText(s.cat ? '촉매 변환기' : '촉매 없는 빈 통', (cx0 + cx1) / 2, 98);
      ctx.fillText('배기구 →', 520, 270);
      const lg = [['#374151', 'CO'], ['#b45309', 'NOₓ'], ['#60a5fa', 'CO₂'], ['#4ade80', 'N₂']];
      let lx = 40;
      ctx.textAlign = 'left';
      lg.forEach(([c, n]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(lx, 36, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1f2937'; ctx.fillText(n, lx + 18, 37); lx += 18 + ctx.measureText(n).width + 44; });
    },
  });
})();
