/* 화학 Ⅳ. 역동적인 화학 반응 - pH와 희석 [12화학04-01] · 더 탐구하기
   지시약의 색: pH를 고른 용액 세 비커에 BTB, 페놀프탈레인, 메틸 오렌지를 각각 넣었을 때의 색을 보여 줘요.
   지시약마다 색이 바뀌는 pH 범위(변색 범위)가 달라요. (실제 값, 대략)
     BTB: pH 6.0 이하 노란색, 6.0~7.6 초록색, 7.6 이상 파란색 (본 실험 4단계의 값과 같아요)
     페놀프탈레인: pH 8.2 아래 무색, 8.2~10 옅은 붉은색, 10 이상 붉은색
     메틸 오렌지: pH 3.1 아래 붉은색, 3.1~4.4 주황색, 4.4 이상 노란색
   ※ 지시약의 변색 원리(약산의 평형)와 적정은 다루지 않아요. 색만 비교해요. */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const btb = (p) => (p <= 6.0 ? ['노란색', '#facc15'] : p < 7.6 ? ['초록색', '#4ade80'] : ['파란색', '#3b82f6']);
  const pp = (p) => (p < 8.2 ? ['무색', 'rgba(219,234,254,.55)'] : p < 10 ? ['옅은 붉은색', '#f9a8d4'] : ['붉은색', '#db2777']);
  const mo = (p) => (p < 3.1 ? ['붉은색', '#dc2626'] : p <= 4.4 ? ['주황색', '#f97316'] : ['노란색', '#fde047']);
  const INDS = [['BTB', btb], ['페놀프탈레인', pp], ['메틸 오렌지', mo]];

  SciSim.extraLab({
    id: 'indicator', step: 4, icon: '🔎', title: '지시약의 색',
    intro: 'pH를 고른 같은 용액을 세 비커에 나눠 담고, 서로 다른 지시약을 한 방울씩 넣어요.',
    size: [600, 340],
    controls: [
      { key: 'ph', type: 'range', label: '용액의 pH', min: 1, max: 13, step: 0.5, value: 7, fmt: (v) => v.toFixed(1) },
    ],
    readouts: [{ key: 'b', label: 'BTB' }, { key: 'p', label: '페놀프탈레인' }, { key: 'm', label: '메틸 오렌지' }],
    init(s) { s.ps = s.ph; },
    step(s, dt) { s.ps += (s.ph - s.ps) * Math.min(1, dt * 6); },
    read(s) { return { b: btb(s.ph)[0], p: pp(s.ph)[0], m: mo(s.ph)[0] }; },
    draw(ctx, W, H, s, t) {
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      ctx.font = FONT(20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // 비커 세 개
      INDS.forEach(([name, f], i) => {
        const cx = 110 + i * 190, top = 52, bw = 120, bh = 150, lvl = top + 50;
        ctx.fillStyle = f(s.ph)[1];
        ctx.beginPath(); ctx.moveTo(cx - bw / 2 + 4, lvl); ctx.lineTo(cx + bw / 2 - 4, lvl); ctx.lineTo(cx + bw / 2 - 4, top + bh - 10);
        ctx.quadraticCurveTo(cx + bw / 2 - 4, top + bh - 2, cx + bw / 2 - 14, top + bh - 2); ctx.lineTo(cx - bw / 2 + 14, top + bh - 2);
        ctx.quadraticCurveTo(cx - bw / 2 + 4, top + bh - 2, cx - bw / 2 + 4, top + bh - 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(cx - bw / 2 + 12, lvl + 8, 10, bh - 70);
        // 유리
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - bw / 2 - 6, top); ctx.lineTo(cx - bw / 2, top + 6); ctx.lineTo(cx - bw / 2, top + bh - 10);
        ctx.quadraticCurveTo(cx - bw / 2, top + bh, cx - bw / 2 + 12, top + bh); ctx.lineTo(cx + bw / 2 - 12, top + bh);
        ctx.quadraticCurveTo(cx + bw / 2, top + bh, cx + bw / 2, top + bh - 10); ctx.lineTo(cx + bw / 2, top); ctx.stroke();
        // 떨어지는 지시약 방울 (장식)
        const dy = ((t * 70 + i * 40) % 60);
        ctx.fillStyle = 'rgba(100,116,139,.6)'; ctx.beginPath(); ctx.arc(cx, top - 10 + dy * 0.8, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1f2937'; ctx.fillText(name, cx, top + bh + 22);
      });
      // pH 눈금 막대
      const x0 = 40, x1 = 560, y = 268, xp = (p) => x0 + (p - 1) / 12 * (x1 - x0);
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#ef4444'); g.addColorStop(0.45, '#facc15'); g.addColorStop(0.5, '#4ade80'); g.addColorStop(0.75, '#3b82f6'); g.addColorStop(1, '#7c3aed');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x0, y, x1 - x0, 18, 9); ctx.fill();
      ctx.fillStyle = '#334155';
      [1, 4, 7, 10, 13].forEach((p) => { ctx.fillText(String(p), xp(p), y + 40); });
      ctx.fillStyle = '#b91c1c'; ctx.fillText('산성', xp(2.5), y + 40);
      ctx.fillStyle = '#1d4ed8'; ctx.fillText('염기성', xp(11.5), y + 40);
      // 현재 pH 표시
      const mx = xp(s.ps);
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.moveTo(mx, y - 2); ctx.lineTo(mx - 10, y - 18); ctx.lineTo(mx + 10, y - 18); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, y - 2); ctx.lineTo(mx, y + 20); ctx.stroke();
    },
  });
})();
