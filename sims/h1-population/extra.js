/* 통합과학2 Ⅱ. 환경과 에너지 - 생태계 평형과 개체군 변동 [10통과2-02-02] · 더 탐구하기
   외래종 유입: 평형 상태의 저수지(토종 물고기 1000마리)에 외래 포식자 큰입배스를 풀어 놓으면
   천적이 없는 배스가 늘고 토종 물고기가 줄어 평형(1000마리의 ±25 %)이 깨지는 것을 보여 줘요.
   계획적으로 잡으면(해마다 절반) 배스가 줄고 토종 물고기가 평형 범위로 돌아와요.
   모형(예시 값, 1년 단위 계산):
     잡아먹히는 수 = 3 × 배스 × 토종 ÷ (토종 + 300)
     토종(다음 해) = 토종 + 0.5 × 토종 × (1 − 토종 ÷ 1000) − 잡아먹히는 수
     배스(다음 해) = 배스 + 0.8 × 배스 × (1 − 배스 ÷ 150) × (토종 ÷ 400, 최대 1),  잡기를 켜면 × 0.5 */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  function sim(b0, years, catchOn) {
    let B = b0, N = 1000;
    for (let t = 0; t < years; t++) {
      const eat = 3 * B * N / (N + 300);
      const nN = N + 0.5 * N * (1 - N / 1000) - eat;
      let nB = B + 0.8 * B * (1 - B / 150) * Math.min(1, N / 400);
      if (catchOn) nB *= 0.5;
      N = Math.max(0, nN); B = Math.max(0, nB);
    }
    return { B: Math.round(B), N: Math.round(N) };
  }
  const now = (s) => sim(+s.bass, s.years, s.catch);
  // 물고기 자리 (고정), 헤엄치는 흔들림은 장식
  const spots = Array.from({ length: 24 }, (_, i) => ({ x: 70 + (i * 131) % 470, y: 120 + (i * 67) % 170, ph: i * 0.9 }));
  const bspots = Array.from({ length: 15 }, (_, i) => ({ x: 90 + (i * 173) % 440, y: 130 + (i * 89) % 150, ph: i * 1.3 }));

  function fish(ctx, x, y, len, body, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.ellipse(0, 0, len / 2, len / 4.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-len / 2 + 2, 0); ctx.lineTo(-len / 2 - len / 4, -len / 5); ctx.lineTo(-len / 2 - len / 4, len / 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(len / 3, -len / 14, Math.max(2, len / 14), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(len / 3 + 1, -len / 14, Math.max(1, len / 28), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  SciSim.extraLab({
    id: 'bass', step: 4, icon: '🔎', title: '저수지의 외래종',
    intro: '토종 물고기 1000마리가 평형을 이루는 저수지에 큰입배스를 풀어 놓고 해가 지나는 모습을 봐요.',
    size: [600, 340],
    controls: [
      { key: 'bass', type: 'seg', label: '풀어 놓은 큰입배스', options: [['0', '없음'], ['10', '10마리'], ['30', '30마리']], value: '10' },
      { key: 'years', type: 'range', label: '지난 시간', min: 0, max: 10, step: 1, value: 0, unit: '년', fmt: (v) => String(v) },
      { key: 'catch', type: 'toggle', label: '배스를 계획적으로 잡기', value: false },
    ],
    readouts: [{ key: 'b', label: '큰입배스 수' }, { key: 'n', label: '토종 물고기 수' }, { key: 'eq', label: '생태계 평형' }],
    init(s) { const r = now(s); s.bs = r.B; s.ns = r.N; },
    tick(s, dt) {
      const r = now(s), k = Math.min(1, dt * 4);
      s.bs += (r.B - s.bs) * k; s.ns += (r.N - s.ns) * k;
    },
    read(s) {
      const r = now(s);
      const eq = r.N >= 750 && r.N <= 1250 ? '유지됨' : '깨짐';
      return { b: r.B + ' 마리', n: r.N + ' 마리', eq };
    },
    draw(ctx, W, H, s, t) {
      // 하늘과 둑
      ctx.fillStyle = '#e6f1fb'; ctx.fillRect(0, 0, W, 70);
      ctx.fillStyle = '#9ccc65'; ctx.fillRect(0, 54, W, 16);
      // 물
      const g = ctx.createLinearGradient(0, 70, 0, H);
      g.addColorStop(0, '#8fd0ee'); g.addColorStop(1, '#3f86b8');
      ctx.fillStyle = g; ctx.fillRect(0, 70, W, H - 70);
      // 바닥과 수초
      ctx.fillStyle = '#b89a6a'; ctx.fillRect(0, H - 22, W, 22);
      ctx.strokeStyle = '#2f8a3e'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const x = 18 + i * 12 + (i > 4 ? 420 : 0), sw = Math.sin(t * 1.5 + i) * 6;
        ctx.beginPath(); ctx.moveTo(x, H - 20); ctx.quadraticCurveTo(x + sw, H - 70, x - sw, H - 110 - (i % 3) * 18); ctx.stroke();
      }
      // 토종 물고기: 50마리마다 한 마리 그림
      const nN = Math.min(spots.length, Math.round(s.ns / 50 + 0.2 * (s.ns > 0)));
      for (let i = 0; i < nN; i++) { const p = spots[i]; fish(ctx, p.x + Math.sin(t * 0.8 + p.ph) * 14, p.y + Math.sin(t * 1.3 + p.ph) * 4, 30, i % 2 ? '#f0b44c' : '#e9a23b', Math.cos(t * 0.8 + p.ph) >= 0 ? 1 : -1); }
      // 큰입배스: 10마리마다 한 마리 그림 (크고 어두운 물고기)
      const nB = Math.min(bspots.length, Math.round(s.bs / 10 + 0.4 * (s.bs > 0.5)));
      for (let i = 0; i < nB; i++) {
        const p = bspots[i];
        fish(ctx, p.x + Math.sin(t * 0.6 + p.ph) * 18, p.y + Math.sin(t + p.ph) * 5, 62, '#3d5a3a', Math.cos(t * 0.6 + p.ph) >= 0 ? 1 : -1);
      }
      // 이름표
      ctx.font = FONT(20); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const tag = (txt, x, y, col) => { const w = ctx.measureText(txt).width + 40; ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(x, y - 16, w, 32, 8); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 15, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#1f2937'; ctx.fillText(txt, x + 28, y); };
      tag('토종 물고기', 12, 28, '#e9a23b');
      tag('큰입배스', 190, 28, '#3d5a3a');
      if (s.catch) { ctx.textAlign = 'right'; ctx.fillStyle = '#1f2937'; ctx.fillText('🎣 계획적으로 잡는 중', W - 14, 28); }
    },
  });
})();
