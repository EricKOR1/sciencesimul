/* 지구시스템과학 해수의 운동 - 조석 자료와 지역별 양상 [12지시02-04] · 더 탐구하기
   폭풍 해일과 조석: 실제 수위 = 천문 조위(예측) + 폭풍 해일 높이(편차).
   같은 높이의 해일이라도 만조·사리 때 겹치면 수위가 훨씬 높아져 제방을 넘을 수 있어요.
   모형(예시 값): 인천 관측소 기준(기본 수준면 0 m), 평균 해수면 4.5 m.
     천문 조위 = 4.5 + (조차 / 2) × cos(위상),  조차: 사리 9.0 m, 조금 3.8 m (본 차시 4단계의 사리 8.6~9.0 m, 조금 3.5~4 m)
     위상: 만조 0, 중간(물이 들거나 빠지는 중) 90°, 간조 180°.
     제방 높이 10.0 m는 예시 값이에요. */
(function () {
  'use strict';
  const MSL = 4.5, WALL = 10.0;
  const RANGE = { spring: 9.0, neap: 3.8 };
  const PH = { high: 0, mid: Math.PI / 2, low: Math.PI };
  const astro = (s) => MSL + RANGE[s.kind] / 2 * Math.cos(PH[s.when]);
  const F = '"Pretendard Variable", Pretendard, sans-serif';

  SciSim.extraLab({
    id: 'surge', step: 4, icon: '🔎', title: '폭풍 해일과 조석',
    intro: '같은 높이의 폭풍 해일이 언제 오느냐에 따라 실제 수위가 어떻게 달라지는지 봐요.',
    size: [600, 340],
    controls: [
      { key: 'kind', type: 'seg', label: '시기', options: [['spring', '사리'], ['neap', '조금']], value: 'spring' },
      { key: 'when', type: 'seg', label: '해일이 오는 때', options: [['high', '만조'], ['mid', '중간'], ['low', '간조']], value: 'low' },
      { key: 'surge', type: 'range', label: '폭풍 해일 높이', min: 0, max: 3, step: 0.1, value: 1.5, unit: 'm', fmt: (v) => v.toFixed(1) },
    ],
    readouts: [{ key: 'a', label: '천문 조위 (예측)' }, { key: 'tot', label: '실제 수위' }, { key: 'wall', label: '제방 (10.0 m)' }],
    init(s) { s.t = 0; s.lv = astro(s) + s.surge; },
    tick(s, dt) { s.t += dt; const tg = astro(s) + s.surge; s.lv += (tg - s.lv) * Math.min(1, dt * 3); },
    read(s) {
      const a = astro(s), tot = a + s.surge, d = WALL - tot;
      return { a: a.toFixed(1) + ' m', tot: tot.toFixed(1) + ' m', wall: d >= 0.05 ? d.toFixed(1) + ' m 남음' : d > -0.05 ? '제방 높이와 같음' : (-d).toFixed(1) + ' m 넘침' };
    },
    draw(ctx, W, H, s, t) {
      const yOf = (m) => 320 - m * 22, a = astro(s), lv = s.lv, over = lv > WALL;
      ctx.fillStyle = s.surge > 1.5 ? '#cbd5e1' : '#e0f2fe'; ctx.fillRect(0, 0, W, H);
      // 바다
      const wy = yOf(lv), wallX = 330;
      ctx.fillStyle = '#2563eb';
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= wallX; x += 10) ctx.lineTo(x, wy + 4 * Math.sin(x / 26 + t * 2.5));
      ctx.lineTo(wallX, H); ctx.closePath(); ctx.fill();
      // 마을 땅과 제방
      ctx.fillStyle = '#a3e635'; ctx.fillRect(wallX + 30, yOf(8.0), W - wallX - 30, H - yOf(8.0));
      ctx.fillStyle = '#78716c'; ctx.beginPath(); ctx.moveTo(wallX - 6, H); ctx.lineTo(wallX + 6, yOf(WALL)); ctx.lineTo(wallX + 30, yOf(WALL)); ctx.lineTo(wallX + 40, H); ctx.closePath(); ctx.fill();
      if (over) {
        const k = Math.min(1, (lv - WALL) / 1.5);
        ctx.fillStyle = 'rgba(37,99,235,.75)'; ctx.fillRect(wallX + 30, yOf(8.0) - 6 - 26 * k, W - wallX - 30, 6 + 26 * k);
      }
      // 집
      [420, 490, 560].forEach((x) => {
        const gy = yOf(8.0);
        ctx.fillStyle = '#fef3c7'; ctx.fillRect(x - 20, gy - 34, 40, 34);
        ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.moveTo(x - 26, gy - 34); ctx.lineTo(x, gy - 56); ctx.lineTo(x + 26, gy - 34); ctx.closePath(); ctx.fill();
      });
      // 천문 조위 (점선)
      ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4; ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.moveTo(0, yOf(a)); ctx.lineTo(wallX, yOf(a)); ctx.stroke(); ctx.setLineDash([]);
      // 해일 화살표
      if (s.surge > 0.2) {
        ctx.strokeStyle = '#dc2626'; ctx.fillStyle = '#dc2626'; ctx.lineWidth = 5;
        const ax = 250; ctx.beginPath(); ctx.moveTo(ax, yOf(a)); ctx.lineTo(ax, yOf(a + s.surge) + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax - 11, yOf(a + s.surge) + 14); ctx.lineTo(ax + 11, yOf(a + s.surge) + 14); ctx.lineTo(ax, yOf(a + s.surge)); ctx.closePath(); ctx.fill();
      }
      ctx.font = '800 20px ' + F; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const ly = yOf(a) + (s.surge > 0.9 ? 18 : -22);
      ctx.fillStyle = '#fff7ed'; ctx.beginPath(); ctx.roundRect(12, ly - 15, 108, 30, 8); ctx.fill();
      ctx.fillStyle = '#b45309'; ctx.fillText('예측 조위', 20, ly + 1);
      ctx.textAlign = 'center'; ctx.fillStyle = '#1f2937';
      ctx.fillText('제방', wallX + 18, yOf(WALL) - 18);
      ctx.fillText(over ? '마을이 잠겨요' : '마을', 490, yOf(8.0) + 34);
    },
  });
})();
