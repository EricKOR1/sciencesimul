/* 고등 생명과학 Ⅰ. 대사성 질환 알아보기 [12생과01-05] · 더 탐구하기
   조사 설계: 한 군의 표본 수가 적으면 군별 평균이 조사할 때마다 크게 흔들리고, 많으면 안정돼요.
   ※ 모든 자료는 교육용 가상 데이터예요. 통계 공식(표준 오차 등)은 다루지 않고 "흔들림의 크기"만 비교해요.
   모형(예시 값): 단 음료 횟수 군(0~2회 · 3~6회 · 7회 이상)마다 가상 학생 300명, 공복 혈당 평균 88 · 94 · 103 mg/dL(차시 값), 퍼짐(표준 편차) 12 mg/dL.
     한 번 조사 = 군마다 n명을 뽑아(고정된 난수 씨앗, 매번 같은 결과) 평균 내기, 조사 5번.
     흔들림 = 7회 이상 군의 5번 평균 중 최댓값 − 최솟값,  경향이 뒤집힌 조사 = 0~2회 < 3~6회 < 7회 이상이 아닌 조사 수 */
(function () {
  'use strict';
  const MEAN = [88, 94, 103], SD = 12, P = 300, ROUNDS = 5;
  const NAMES = ['0~2회', '3~6회', '7회 이상'];
  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#db2777'];
  function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  const pop = MEAN.map((m, g) => {
    const r = rng(1000 + g * 77), a = [];
    for (let i = 0; i < P; i++) { const u = Math.max(1e-9, r()), v = r(); a.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); }
    const mu = a.reduce((x, y) => x + y, 0) / P, sd = Math.sqrt(a.reduce((x, y) => x + (y - mu) ** 2, 0) / P);
    return a.map((z) => Math.round(m + SD * (z - mu) / sd));
  });
  function sampleMean(g, n, k) {
    const r = rng(31 + g * 7919 + n * 104729 + k * 1299709), idx = new Set();
    while (idx.size < n) idx.add(Math.floor(r() * P));
    let s = 0; idx.forEach((i) => { s += pop[g][i]; });
    return s / n;
  }
  const TABLE = {};
  [3, 10, 30].forEach((n) => { TABLE[n] = Array.from({ length: ROUNDS }, (_, k) => [0, 1, 2].map((g) => sampleMean(g, n, k))); });
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';

  SciSim.extraLab({
    id: 'samplesize', step: 2, icon: '🔎', title: '표본 수와 평균',
    intro: '같은 가상 학교에서 군마다 몇 명씩 뽑아 조사를 5번 해요. 표본 수에 따라 군별 평균이 얼마나 흔들릴까요?',
    size: [600, 340],
    controls: [
      { key: 'n', type: 'seg', label: '한 군의 표본 수', options: [[3, '3명'], [10, '10명'], [30, '30명']], value: 3 },
      { key: 'go', type: 'button', primary: true, label: '▶ 조사 5번 하기', onClick(s) { s.k = 0; s.run = true; } },
      { key: 'reset', type: 'button', label: '↺ 처음으로', onClick(s) { s.k = 0; s.run = false; } },
    ],
    readouts: [{ key: 'k', label: '조사한 횟수' }, { key: 'spread', label: '7회 이상 군 평균의 흔들림' }, { key: 'flip', label: '경향이 뒤집힌 조사' }],
    init(s) { s.k = 0; s.run = false; },
    onChange(key, v, s) { if (key === 'n') { s.k = 0; s.run = false; } },
    tick(s, dt) { if (s.run && s.k < ROUNDS) { s.k = Math.min(ROUNDS, s.k + dt * 2.5); if (s.k >= ROUNDS) s.run = false; } },
    read(s) {
      const k = Math.floor(s.k), rows = TABLE[s.n].slice(0, k);
      if (!k) return { k: '0 / 5 번', spread: '—', flip: '—' };
      const top = rows.map((m) => m[2]), flips = rows.filter((m) => !(m[0] < m[1] && m[1] < m[2])).length;
      return { k: k + ' / 5 번', spread: k < 2 ? '—' : Math.round(Math.max(...top) - Math.min(...top)) + ' mg/dL', flip: flips + ' 번' };
    },
    draw(ctx, W, H, s) {
      const x0 = 40, x1 = W - 20, y0 = 50, y1 = 280, lo = 70, hi = 130;
      const yOf = (v) => y1 - (v - lo) / (hi - lo) * (y1 - y0);
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#334155';
      ctx.fillText('평균 공복 혈당', x0, 22);
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0 - 6); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
      const cw = (x1 - x0) / 3, k = Math.floor(s.k), rows = TABLE[s.n];
      for (let g = 0; g < 3; g++) {
        const cx = x0 + cw * (g + 0.5);
        // 전체(300명) 평균 막대
        ctx.fillStyle = 'rgba(148,163,184,.28)'; ctx.fillRect(cx - 50, yOf(MEAN[g]), 100, y1 - yOf(MEAN[g]));
        ctx.strokeStyle = '#475569'; ctx.setLineDash([7, 5]); ctx.beginPath(); ctx.moveTo(cx - 62, yOf(MEAN[g])); ctx.lineTo(cx + 62, yOf(MEAN[g])); ctx.stroke(); ctx.setLineDash([]);
        // 조사마다의 평균 (점)
        for (let r = 0; r < k; r++) {
          ctx.fillStyle = COLORS[r]; ctx.beginPath(); ctx.arc(cx - 36 + r * 18, yOf(rows[r][g]), 9, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.fillStyle = '#1f2937'; ctx.textAlign = 'center'; ctx.fillText(NAMES[g], cx, y1 + 26);
      }
      ctx.textAlign = 'right'; ctx.fillStyle = '#475569'; ctx.fillText('- - 전체 평균   ● 조사 1~5', x1, 22);
    },
  });
})();
