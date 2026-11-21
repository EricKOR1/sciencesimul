/* 물리학 Ⅰ. 힘과 에너지 - 돌림힘과 평형 [12물리01-01] · 더 탐구하기
   물체가 넘어지는 각도: 직육면체를 바닥 모서리(회전축 1개)를 중심으로 기울여요.
   무게중심의 수직선이 회전축(모서리)을 넘어가면 중력의 돌림힘이 물체를 넘어뜨려요.
   모형: 넘어지기 시작하는 각 θ한계는 tan θ한계 = (폭 ÷ 2) ÷ 무게중심 높이 (단원 4단계의 식). 질량은 식에 없어요.
   무게 = 질량 × g (g = 10 m/s²). 질량을 바꾸면 무게(화살표)는 달라지지만 넘어지는 각은 그대로예요. 상자 크기는 예시 값. */
(function () {
  'use strict';
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const DEG = Math.PI / 180, SC = 135, PX = 350, PY = 270;
  const limit = (s) => Math.atan((s.w / 2) / s.h) / DEG;
  function tag(ctx, text, x, y, col, right) {
    const tw = ctx.measureText(text).width, x0 = right ? x - tw - 10 : x - 6;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(x0, y - 15, tw + 16, 30, 7); ctx.fill();
    ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(text, x0 + 8, y);
  }

  SciSim.extraLab({
    id: 'tip', icon: '🔎', title: '넘어지는 각도',
    // step: 4단계부터 단추가 보여요. 엔진이 step을 단계 번호와 애니메이션 함수로 함께 쓰므로 valueOf로 번호를 줘요.
    step: Object.assign(function () {}, { valueOf: () => 4 }),
    intro: '모서리를 축으로 상자를 기울여요. 질량을 바꾸면 넘어지는 각이 달라질까요?',
    size: [600, 340],
    controls: [
      { key: 'm', type: 'range', label: '상자의 질량', min: 10, max: 50, step: 10, value: 10, unit: 'kg' },
      { key: 'w', type: 'range', label: '바닥 폭', min: 0.2, max: 0.8, step: 0.1, value: 0.4, fmt: (v) => v.toFixed(1), unit: 'm' },
      { key: 'h', type: 'range', label: '무게중심의 높이', min: 0.2, max: 0.8, step: 0.1, value: 0.5, fmt: (v) => v.toFixed(1), unit: 'm' },
      { key: 'th', type: 'range', label: '기울인 각', min: 0, max: 60, step: 1, value: 10, unit: '°' },
    ],
    readouts: [{ key: 'lim', label: '넘어지기 시작하는 각' }, { key: 'wt', label: '상자의 무게' }, { key: 'st', label: '지금 상자는' }],
    read(s) {
      const L = limit(s);
      return { lim: L.toFixed(1) + '°', wt: s.m * 10 + ' N', st: s.th > L + 1e-9 ? '넘어져요' : '되돌아와요' };
    },
    draw(ctx, W, H, s) {
      const L = limit(s), tip = s.th > L + 1e-9, th = s.th * DEG;
      const w = s.w * SC, hh = s.h * SC, c = Math.cos(th), sn = Math.sin(th);
      const tr = (x, y) => [PX + x * c - y * sn, PY + x * sn + y * c];
      ctx.fillStyle = '#f6f8fb'; ctx.fillRect(0, 0, W, H);
      // 바닥
      ctx.fillStyle = '#cbd5e1'; ctx.fillRect(0, PY, W, H - PY);
      // 상자 (질량이 클수록 진한 색)
      const k = (s.m - 10) / 40;
      ctx.fillStyle = 'rgb(' + Math.round(251 - 60 * k) + ',' + Math.round(191 - 90 * k) + ',' + Math.round(36 + 0 * k) + ')';
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 3;
      ctx.beginPath(); [[-w, 0], [0, 0], [0, -2 * hh], [-w, -2 * hh]].forEach(([x, y], i) => { const [X, Y] = tr(x, y); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 무게중심과 수직선
      const [gx, gy] = tr(-w / 2, -hh);
      ctx.strokeStyle = tip ? '#dc2626' : '#16a34a'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, PY); ctx.stroke(); ctx.setLineDash([]);
      // 무게 화살표: 질량에 비례
      const al = 24 + 1.2 * s.m;
      ctx.strokeStyle = '#7c3aed'; ctx.fillStyle = '#7c3aed'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + al - 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx, gy + al + 4); ctx.lineTo(gx - 11, gy + al - 16); ctx.lineTo(gx + 11, gy + al - 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(gx, gy, 8, 0, Math.PI * 2); ctx.fill();
      // 회전축 (모서리)
      ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(PX, PY, 9, 0, Math.PI * 2); ctx.fill();
      // 이름표
      ctx.font = FONT; ctx.textBaseline = 'middle';
      ctx.textAlign = 'left'; ctx.fillStyle = '#1e293b'; ctx.fillText('회전축', PX + 16, PY + 22);
      tag(ctx, '무게중심', gx - 14, gy - 16, '#111827', true);
      tag(ctx, '무게', gx + 16, gy + al * 0.5, '#7c3aed', false);
      ctx.textAlign = 'left'; ctx.fillStyle = tip ? '#dc2626' : '#15803d';
      ctx.fillText(tip ? '수직선이 축 밖 → 넘어져요' : '수직선이 축 안쪽 → 되돌아와요', 16, 26);
    },
  });
})();
