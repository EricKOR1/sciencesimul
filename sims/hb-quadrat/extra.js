/* 고등 생명과학 Ⅰ. 방형구법으로 군집 조사 [12생과01-07] · 더 탐구하기
   방형구를 무작위 좌표에 놓을 때와 식물이 많은 곳에 치우쳐 놓을 때, 추정한 밀도가 실제 밀도와 얼마나 다른지 비교해요.
   모형(예시 값): 초지 20 m × 12 m (1 m² 칸 240개)에 토끼풀이 몇 군데 무리 지어 자라요.
     칸마다 개체 수 = 반올림(Σ 무리 크기 × exp(-거리² / (2 × 퍼짐²)))  → 모두 747포기, 실제 밀도 = 747 / 240 ≈ 3.1 개체/m²
     추정 밀도 = 방형구 10개 속 개체 수 합 / 10 m²
     무작위: 고정된 난수 씨앗 5가지로 고른 칸 (매번 같은 결과), 치우침: 개체 수가 가장 많은 칸 10개 */
(function () {
  'use strict';
  const C = 20, R = 12, N = 10;
  const CLUMPS = [[4, 3, 2.0, 9], [14, 8, 2.3, 9], [16, 2, 1.5, 7], [6, 9, 1.6, 7], [10, 5, 1.3, 5]];
  const cnt = [];
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    let v = 0;
    CLUMPS.forEach(([px, py, s, a]) => { v += a * Math.exp(-((x - px) ** 2 + (y - py) ** 2) / (2 * s * s)); });
    cnt.push(Math.round(v));
  }
  const total = cnt.reduce((a, b) => a + b, 0);
  const REAL = total / (C * R);
  // 칸 안의 식물 위치 (장식용, 고정)
  const spots = cnt.map((n, i) => Array.from({ length: n }, (_, k) => [((i * 37 + k * 53) % 19) / 19, ((i * 71 + k * 29) % 17) / 17]));
  function pickRandom(seed) {
    let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const set = [];
    while (set.length < N) { const i = Math.floor(r() * C * R); if (!set.includes(i)) set.push(i); }
    return set;
  }
  const SEEDS = [2, 4, 13, 8, 21].map((k) => pickRandom(k * 7919));
  const BIASED = cnt.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, N).map((p) => p[1]);
  const cellsOf = (s) => (s.how === 'bias' ? BIASED : SEEDS[s.seed]);
  const estOf = (s) => cellsOf(s).reduce((a, i) => a + cnt[i], 0) / N;
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';

  SciSim.extraLab({
    id: 'quadbias', step: 1, icon: '🔎', title: '방형구 놓는 방법',
    intro: '같은 초지에 방형구 10개를 다르게 놓고, 추정한 토끼풀 밀도를 실제 밀도와 비교해요.',
    size: [600, 340],
    controls: [
      { key: 'how', type: 'seg', label: '놓는 방법', options: [['rand', '🎲 무작위 좌표'], ['bias', '👆 식물이 많은 곳']], value: 'rand' },
      { key: 'again', type: 'button', label: '🎲 무작위로 다시 놓기', onClick(s) { if (s.how === 'rand') { s.seed = (s.seed + 1) % SEEDS.length; s.shown = 0; } } },
    ],
    readouts: [{ key: 'real', label: '실제 밀도' }, { key: 'est', label: '추정 밀도' }, { key: 'diff', label: '실제와의 차이' }],
    init(s) { s.seed = 0; s.shown = 0; },
    onChange(key, v, s) { if (key === 'how') s.shown = 0; },
    tick(s, dt) { if (s.shown < N) s.shown = Math.min(N, s.shown + dt * 12); },
    read(s) {
      const e = estOf(s), d = e - REAL, p = Math.round((d / REAL) * 100);
      return { real: REAL.toFixed(1) + ' 개체/m²', est: e.toFixed(1) + ' 개체/m²', diff: (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' (' + (p >= 0 ? '+' : '−') + Math.abs(p) + ' %)' };
    },
    draw(ctx, W, H, s) {
      const cs = 24, ox = (W - C * cs) / 2, oy = 40;
      ctx.fillStyle = '#f4f8ef'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#d9ebc4'; ctx.fillRect(ox, oy, C * cs, R * cs);
      ctx.strokeStyle = 'rgba(80,120,60,.18)'; ctx.lineWidth = 1;
      for (let x = 0; x <= C; x++) { ctx.beginPath(); ctx.moveTo(ox + x * cs, oy); ctx.lineTo(ox + x * cs, oy + R * cs); ctx.stroke(); }
      for (let y = 0; y <= R; y++) { ctx.beginPath(); ctx.moveTo(ox, oy + y * cs); ctx.lineTo(ox + C * cs, oy + y * cs); ctx.stroke(); }
      // 토끼풀
      ctx.fillStyle = '#2f8a3a';
      spots.forEach((pts, i) => {
        const cx = ox + (i % C) * cs, cy = oy + Math.floor(i / C) * cs;
        pts.forEach(([u, v]) => { ctx.beginPath(); ctx.arc(cx + 4 + u * (cs - 8), cy + 4 + v * (cs - 8), 3, 0, Math.PI * 2); ctx.fill(); });
      });
      // 방형구
      const cells = cellsOf(s), k = Math.floor(s.shown);
      ctx.lineWidth = 4; ctx.strokeStyle = s.how === 'bias' ? '#d9480f' : '#1c6dd0';
      for (let j = 0; j < k; j++) { const i = cells[j]; ctx.strokeRect(ox + (i % C) * cs + 2, oy + Math.floor(i / C) * cs + 2, cs - 4, cs - 4); }
      // 이름표
      ctx.font = FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const name = s.how === 'bias' ? '식물이 많은 곳만 골라 놓기' : '무작위 좌표에 놓기';
      ctx.fillStyle = s.how === 'bias' ? '#b23a0a' : '#155bb0'; ctx.fillText(name, ox, 20);
      ctx.fillStyle = '#334155'; ctx.textAlign = 'right'; ctx.fillText('초지 20 m × 12 m', ox + C * cs, 20);
    },
  });
})();
