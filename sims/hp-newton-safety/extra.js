/* 물리학 Ⅰ. 힘과 에너지 - 운동 법칙과 교통안전 [12물리01-02] · 더 탐구하기
   ABS와 제동 거리: 같은 속력에서 급제동할 때, 바퀴가 잠기면 타이어가 미끄러져 마찰 계수가 작아지고,
   ABS는 바퀴가 잠기지 않게 브레이크를 아주 빠르게 풀었다 잡았다 해서 마찰 계수를 크게 유지해요. 그래서 제동 거리가 짧아져요.
   모형: 제동 가속도 a = μg, 제동 거리 s = v² ÷ 2μg (단원 3단계의 식, g = 10 m/s²).
   마찰 계수(예시 값): 바퀴 잠김 = 단원의 값(마른 0.8, 젖은 0.4), ABS = 마른 1.0, 젖은 0.5 (실제로 잠겨 미끄러질 때보다 약 20~25 % 큼).
   ※ 눈길·자갈길처럼 ABS가 오히려 길어질 수 있는 도로는 넣지 않았어요. 직선 운동만 다뤄요. */
(function () {
  'use strict';
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const MU = { dry: { lock: 0.8, abs: 1.0 }, wet: { lock: 0.4, abs: 0.5 } };
  const G = 10, X0 = 70, PX = 4.2;
  const dist = (s, k) => { const v = s.v / 3.6; return v * v / (2 * MU[s.road][k] * G); };
  const pos = (s, k) => { const v = s.v / 3.6, a = MU[s.road][k] * G, t = Math.min(s.tm, v / a); return v * t - 0.5 * a * t * t; };
  const m1 = (x) => (Math.abs(x - Math.round(x)) < 0.05 ? Math.round(x) : x.toFixed(1));

  function car(ctx, x0, y0, col, spin, locked) {
    ctx.save(); ctx.translate(x0, y0); ctx.scale(1.35, 1.35);
    const x = 0, y = 0;
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - 70, y - 30, 70, 26, 8); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x - 56, y - 50, 40, 24, 8); ctx.fill();
    ctx.fillStyle = '#dbeafe'; ctx.fillRect(x - 50, y - 45, 28, 14);
    [x - 54, x - 16].forEach((wx) => {
      ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(wx, y - 4, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = locked ? '#ef4444' : '#e5e7eb'; ctx.lineWidth = 3;
      const a = locked ? 0.6 : spin;
      ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * 8, y - 4 - Math.sin(a) * 8); ctx.lineTo(wx + Math.cos(a) * 8, y - 4 + Math.sin(a) * 8); ctx.stroke();
    });
    ctx.restore();
  }

  SciSim.extraLab({
    id: 'abs', icon: '🔎', title: 'ABS와 제동 거리',
    // step: 3단계부터 단추가 보여요. 엔진이 step을 단계 번호와 애니메이션 함수로 함께 쓰므로 valueOf로 번호를 줘요.
    step: Object.assign(function (s, dt) { s.tm += dt * 2; }, { valueOf: () => 3 }),
    intro: '같은 속력에서 바퀴가 잠긴 차와 ABS 차가 동시에 급제동해요.',
    size: [600, 340],
    controls: [
      { key: 'road', type: 'seg', label: '도로', options: [['dry', '마른 도로'], ['wet', '젖은 도로']], value: 'dry' },
      { key: 'v', type: 'range', label: '처음 속력', min: 36, max: 108, step: 18, value: 72, unit: 'km/h' },
      { key: 'go', type: 'button', primary: true, label: '🛑 급제동', onClick(s) { s.tm = 0; } },
    ],
    readouts: [{ key: 'lock', label: '바퀴 잠김: 제동 거리' }, { key: 'abs', label: 'ABS: 제동 거리' }, { key: 'diff', label: 'ABS가 줄인 거리' }],
    init(s) { s.tm = 99; },
    onChange(k, v, s) { s.tm = 99; },
    read(s) {
      const a = dist(s, 'lock'), b = dist(s, 'abs');
      return { lock: m1(a) + ' m (μ = ' + MU[s.road].lock + ')', abs: m1(b) + ' m (μ = ' + MU[s.road].abs.toFixed(1) + ')', diff: m1(a - b) + ' m' };
    },
    draw(ctx, W, H, s) {
      const wet = s.road === 'wet';
      ctx.fillStyle = '#eef3f8'; ctx.fillRect(0, 0, W, H);
      // 도로 두 차선
      ctx.fillStyle = wet ? '#4b5563' : '#6b7280'; ctx.fillRect(0, 60, W, 250);
      ctx.strokeStyle = '#f8fafc'; ctx.lineWidth = 4; ctx.setLineDash([26, 20]);
      ctx.beginPath(); ctx.moveTo(0, 185); ctx.lineTo(W, 185); ctx.stroke(); ctx.setLineDash([]);
      if (wet) { ctx.fillStyle = 'rgba(147,197,253,.35)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.ellipse(40 + i * 42, 100 + (i % 3) * 70, 26, 6, 0, 0, Math.PI * 2); ctx.fill(); } }
      // 브레이크를 밟은 곳
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(X0, 62); ctx.lineTo(X0, 308); ctx.stroke();
      // 10 m 눈금
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      for (let m = 10; X0 + m * PX < W; m += 10) ctx.fillRect(X0 + m * PX - 1, 300, 2, 10);
      const lanes = [['lock', 160, '#ef4444', '바퀴 잠김'], ['abs', 285, '#2563eb', 'ABS']];
      lanes.forEach(([k, y, col, name]) => {
        const p = pos(s, k), x = X0 + p * PX, stopX = X0 + dist(s, k) * PX;
        // 멈출 곳 표시
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(stopX, y - 70); ctx.lineTo(stopX, y + 12); ctx.stroke(); ctx.setLineDash([]);
        // 바퀴가 잠기면 미끄러진 자국(스키드 마크)이 남아요
        if (k === 'lock' && p > 0) { ctx.strokeStyle = 'rgba(17,24,39,.75)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(X0 - 73, y + 7); ctx.lineTo(x - 22, y + 7); ctx.stroke(); }
        car(ctx, x, y, col, p / 0.35, k === 'lock');
        ctx.font = FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(name).width + 20;
        const right = Math.max(x, stopX) + 16, lx = right + tw < W - 6 ? right : x - 100 - tw;
        ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(lx, y - 47, tw, 34, 8); ctx.fill();
        ctx.fillStyle = col; ctx.fillText(name, lx + 10, y - 30);
      });
      ctx.font = FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#334155'; ctx.fillText('브레이크', 20, 30);
      ctx.textAlign = 'right'; ctx.fillText(wet ? '젖은 도로' : '마른 도로', W - 16, 30);
    },
  });
})();
