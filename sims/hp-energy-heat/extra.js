/* 물리학 Ⅰ. 힘과 에너지 - 역학적 에너지의 열 전환 [12물리01-05] · 더 탐구하기
   마찰열로 녹는 얼음: 얼음 조각을 나무판 위에서 문지르면 마찰이 한 일만큼 열이 생겨 얼음이 녹아요.
   얼음이 남아 있는 동안(녹는 동안)은 얼음물의 온도가 0 °C로 일정하고, 다 녹은 뒤에야 온도가 올라가요.
   모형: 마찰이 한 일(열) Q = 마찰력 F × 문지른 거리 d, 생긴 열은 모두 얼음(0 °C, 20 g, 예시 값)에 들어간다고 가정해요.
   녹은 얼음 = Q ÷ 334 J/g (얼음의 융해열, 실제 값), 다 녹은 뒤 ΔT = Q남은 ÷ (c m), 물의 비열 c = 4.2 J/(g·°C) (실제 값).
   ※ 열역학 법칙은 다루지 않아요. 융해열 값은 녹은 양을 보여 주는 데만 쓰고, 문제는 Q = F × d와 온도가 일정한 까닭만 물어요. */
(function () {
  'use strict';
  const M = 20, LF = 334, C = 4.2;
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const model = (s) => {
    const Q = s.F * s.d, melt = Math.min(M, Q / LF);
    const T = Q > M * LF ? (Q - M * LF) / (C * M) : 0;
    return { Q, melt, rem: M - melt, T };
  };
  const fmtG = (g) => (g < 10 ? g.toFixed(1) : g.toFixed(0));

  SciSim.extraLab({
    id: 'icerub', icon: '🔎', title: '마찰열로 녹는 얼음',
    intro: '얼음 조각(0 °C, 20 g)을 나무판에 문질러요. 마찰이 한 일만큼 열이 생겨요.',
    size: [600, 340],
    controls: [
      { key: 'F', type: 'range', label: '마찰력', min: 2, max: 20, step: 1, value: 10, unit: 'N' },
      { key: 'd', type: 'range', label: '문지른 거리', min: 0, max: 400, step: 10, value: 0, unit: 'm' },
    ],
    readouts: [{ key: 'Q', label: '마찰이 한 일 (열)' }, { key: 'melt', label: '녹은 얼음' }, { key: 'T', label: '얼음물의 온도' }],
    init(s) { s.ph = 0; },
    // step: 3단계부터 단추가 보여요. 엔진이 step을 단계 번호와 애니메이션 함수로 함께 쓰므로 valueOf로 번호를 줘요.
    step: Object.assign(function (s, dt) { s.ph += dt * 2.2; }, { valueOf: () => 3 }),
    read(s) {
      const m = model(s);
      return { Q: Math.round(m.Q).toLocaleString('ko-KR') + ' J', melt: fmtG(m.melt) + ' g / 20 g', T: m.T.toFixed(1) + ' °C' };
    },
    draw(ctx, W, H, s) {
      const m = model(s);
      ctx.fillStyle = '#f4f7fb'; ctx.fillRect(0, 0, W, H);
      // 나무판
      const top = 252;
      ctx.fillStyle = '#c8955a'; ctx.fillRect(20, top, 470, 40);
      ctx.fillStyle = '#b07f48';
      for (let i = 0; i < 9; i++) ctx.fillRect(30 + i * 52, top + 12 + (i % 3) * 8, 34, 3);
      // 녹은 물 웅덩이: 녹은 양이 많을수록 넓어요
      const pw = m.melt > 0.02 ? 50 + 380 * (m.melt / M) : 0;
      if (pw) {
        ctx.fillStyle = 'rgba(80,150,230,.55)';
        ctx.beginPath(); ctx.ellipse(255, top, pw / 2, 7 + 6 * (m.melt / M), 0, 0, Math.PI * 2); ctx.fill();
      }
      // 얼음 조각: 왼쪽 오른쪽으로 문질러요 (움직임은 장식)
      const sn = Math.sin(s.ph), v = Math.cos(s.ph), x = 255 + 85 * sn;
      const side = m.rem > 0.01 ? 26 + 94 * Math.sqrt(m.rem / M) : 0;
      if (side) {
        const heat = Math.min(1, s.F / 20);
        const hg = ctx.createRadialGradient(x, top, 4, x, top, side * 0.9 + 20);
        hg.addColorStop(0, 'rgba(255,140,40,' + (0.25 + 0.45 * heat) + ')'); hg.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = hg; ctx.fillRect(x - side - 30, top - 30, side * 2 + 60, 50);
        const g = ctx.createLinearGradient(x - side / 2, top - side, x + side / 2, top);
        g.addColorStop(0, '#eef8ff'); g.addColorStop(1, '#a9d4f5');
        ctx.fillStyle = g; ctx.strokeStyle = '#6aa7d8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(x - side / 2, top - side, side, side, 8); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x - side / 2 + 10, top - side + 12); ctx.lineTo(x - side / 2 + 10 + side * 0.3, top - side + 12); ctx.stroke();
        // 마찰력 화살표: 움직이는 반대쪽, 길이는 마찰력에 비례
        const dir = v >= 0 ? -1 : 1, L = 14 + 5 * s.F, ay = top - side - 22;
        ctx.strokeStyle = '#dc2626'; ctx.fillStyle = '#dc2626'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x + dir * L, ay); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + dir * (L + 14), ay); ctx.lineTo(x + dir * L, ay - 10); ctx.lineTo(x + dir * L, ay + 10); ctx.closePath(); ctx.fill();
        ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('마찰력', x, ay - 26);
        if (side > 50) { ctx.fillStyle = '#1e3a5f'; ctx.fillText('얼음', x, top - side / 2); }
      } else {
        ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1e3a5f';
        ctx.fillText('얼음이 모두 녹았어요', 255, 120);
      }
      if (pw > 90) { ctx.font = FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#1d4ed8'; ctx.fillText('녹은 물', 255, top + 62); }
      // 온도계: -5 °C ~ 20 °C
      const tx = 545, ty0 = 50, ty1 = 262, toY = (T) => ty1 - 22 - (T + 5) / 25 * (ty1 - ty0 - 40);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(tx - 12, ty0, 24, ty1 - ty0, 12); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(tx, ty1 + 6, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = m.T > 0.05 ? '#ef4444' : '#3b82f6';
      ctx.beginPath(); ctx.arc(tx, ty1 + 6, 14, 0, Math.PI * 2); ctx.fill();
      const yT = toY(Math.min(20, m.T)); ctx.fillRect(tx - 6, yT, 12, ty1 + 6 - yT);
      const y0 = toY(0);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx - 24, y0); ctx.lineTo(tx - 12, y0); ctx.stroke();
      ctx.font = FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#334155';
      ctx.fillText('0 °C', tx - 28, y0);
      ctx.textAlign = 'center'; ctx.fillText('온도계', tx, 26);
    },
  });
})();
