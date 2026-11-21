/* 물리학 Ⅰ. 힘과 에너지 - 열기관과 영구기관 [12물리01-06] · 더 탐구하기
   저온부가 꼭 필요한 열기관: 고온부(220 °C)는 그대로 두고 저온부의 온도를 바꿔요.
   저온부가 고온부에 가까워질수록 온도 차가 줄어 열이 덜 흐르고, 일로 바뀌는 비율(효율)이 줄어요. 같아지면 열이 흐르지 않아 일을 못 해요.
   모형(예시 값): 효율 e = 0.15 %/°C × 온도 차 (온도 차 200 °C에서 30 %, 단원의 예 Q_h = 1000 J, W = 300 J과 같게 맞춤),
   일 W = e × 1000 J, 버리는 열 Q_c = 1000 J − W. 회전 속도는 온도 차에 비례(장식).
   ※ 열역학 법칙의 이름·식, 카르노 효율은 다루지 않아요. 효율이 온도 차에 따라 달라진다는 방향만 보여 주는 단순한 모형이에요. */
(function () {
  'use strict';
  const TH = 220, QH = 1000;
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const model = (s) => {
    const dT = Math.max(0, TH - s.tc), e = 0.15 * dT;
    const W = QH * e / 100;
    return { dT, e, W, Qc: QH - W };
  };
  const mix = (a, b, k) => 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',') + ')';

  function arrow(ctx, pts, w, col, off, on) {
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    ctx.strokeStyle = on ? col : '#cbd5e1'; ctx.lineWidth = w;
    ctx.beginPath(); pts.slice(0, -1).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    const [a, b] = pts.slice(-2), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hw = w / 2 + 12;
    ctx.fillStyle = on ? col : '#cbd5e1';
    ctx.beginPath(); ctx.moveTo(b[0], b[1]);
    ctx.lineTo(a[0] + Math.cos(ang + Math.PI / 2) * hw, a[1] + Math.sin(ang + Math.PI / 2) * hw);
    ctx.lineTo(a[0] - Math.cos(ang + Math.PI / 2) * hw, a[1] - Math.sin(ang + Math.PI / 2) * hw);
    ctx.closePath(); ctx.fill();
    if (on) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(2, w * 0.25); ctx.setLineDash([10, 16]); ctx.lineDashOffset = -off;
      ctx.beginPath(); pts.slice(0, -1).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  SciSim.extraLab({
    id: 'coldside', icon: '🔎', title: '저온부와 열기관',
    intro: '고온부는 220 °C로 그대로예요. 저온부의 온도를 고온부에 가깝게 올려 보세요.',
    size: [600, 340],
    controls: [
      { key: 'tc', type: 'range', label: '저온부의 온도', min: 20, max: 220, step: 10, value: 20, unit: '°C' },
    ],
    readouts: [{ key: 'dT', label: '두 열원의 온도 차' }, { key: 'W', label: '받은 열 1000 J 중 일' }, { key: 'e', label: '효율' }],
    init(s) { s.ang = 0; s.off = 0; },
    // step: 2단계부터 단추가 보여요.
    step: 2,
    tick: function (s, dt) { const m = model(s); s.ang += dt * m.dT * 0.03; s.off += dt * m.dT * 0.4; },
    read(s) {
      const m = model(s);
      return { dT: m.dT + ' °C', W: m.dT === 0 ? '0 J (열이 안 흘러요)' : Math.round(m.W) + ' J', e: m.e.toFixed(0) + ' %' };
    },
    draw(ctx, W, H, s) {
      const m = model(s), on = m.dT > 0, k = m.e / 30;
      ctx.fillStyle = '#f6f8fb'; ctx.fillRect(0, 0, W, H);
      // 고온부
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.roundRect(20, 110, 130, 120, 16); ctx.fill();
      ctx.fillStyle = '#fca5a5'; ctx.beginPath(); ctx.roundRect(32, 122, 106, 30, 8); ctx.fill();
      // 저온부: 온도가 오를수록 색이 고온부와 비슷해져요
      const kc = (s.tc - 20) / (TH - 20);
      ctx.fillStyle = mix([59, 130, 246], [239, 68, 68], kc); ctx.beginPath(); ctx.roundRect(450, 110, 130, 120, 16); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.roundRect(462, 122, 106, 30, 8); ctx.fill();
      // 열 흐름 화살표 (굵기: 일 W와 버리는 열 Q_c의 비율)
      const T = 40;
      arrow(ctx, [[150, 170], [228, 170], [252, 170]], T, '#f97316', s.off, on);
      arrow(ctx, [[348, 170], [420, 170], [450, 170]], Math.max(8, T * (1 - m.e / 100)), '#60a5fa', s.off, on);
      arrow(ctx, [[300, 118], [300, 58], [300, 26]], Math.max(4, T * m.e / 100 * 2.4), '#16a34a', s.off, on);
      // 엔진 바퀴
      ctx.save(); ctx.translate(300, 170);
      ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.rotate(s.ang); ctx.strokeStyle = '#475569'; ctx.lineWidth = 6;
      for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(44, 0); ctx.stroke(); }
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(36, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(300, 170, 9, 0, Math.PI * 2); ctx.fill();
      // 이름표
      ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#7f1d1d'; ctx.fillText('고온부', 85, 137);
      ctx.fillStyle = '#0f172a'; ctx.fillText('저온부', 515, 137);
      ctx.fillStyle = '#ffffff'; ctx.fillText('열 받음', 85, 200); ctx.fillText('열 버림', 515, 200);
      ctx.fillStyle = on ? '#15803d' : '#94a3b8'; ctx.textAlign = 'left'; ctx.fillText('일', 330, 40);
      ctx.textAlign = 'center'; ctx.fillStyle = on ? '#334155' : '#b91c1c';
      ctx.fillText(on ? (k > 0.6 ? '엔진이 빠르게 돌아요' : k > 0.25 ? '엔진이 천천히 돌아요' : '엔진이 겨우 돌아요') : '온도 차가 없어 엔진이 멈췄어요', 300, 290);
    },
  });
})();
