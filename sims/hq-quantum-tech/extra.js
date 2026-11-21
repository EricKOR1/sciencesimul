/* 전자기와 양자 Ⅲ. 양자와 미시세계 - 양자 기술과 사회 [12전자03-02] · 더 탐구하기
   정밀한 시계와 위치: 위성 항법은 신호가 오는 데 걸린 시간 × 빛의 속력으로 거리를 구해요.
   그래서 시계 오차 × 빛의 속력 = 위치 오차가 되고, 아주 작은 시계 오차도 큰 위치 오차가 돼요(원자시계·양자 센서가 필요한 까닭).
   모형: 위치 오차(m) = c × 시계 오차(s), c = 3.0 × 10⁸ m/s (본 차시와 같은 값). 1 ns → 0.3 m(30 cm).
   ns = 10⁻⁹ s, μs = 10⁻⁶ s, ms = 10⁻³ s.
   그림의 두 핀 사이 거리는 로그 눈금이에요(0.3 m ~ 30만 km를 한 화면에). 정확한 값은 읽음표로 읽어요.
   비교(한두 걸음, 축구장 …)는 크기의 감을 주는 예시예요. */
(function () {
  'use strict';
  const C = 3.0e8;
  const UNIT = { ns: [1e-9, 'ns'], us: [1e-6, 'μs'], ms: [1e-3, 'ms'] };
  const errS = (s) => s.t * UNIT[s.u][0];
  const fmtD = (d) => (d < 1 ? Math.round(d * 100) + ' cm' : d < 1000 ? (d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString('ko-KR')) + ' m' : (d < 10000 ? (d / 1000).toFixed(1) : Math.round(d / 1000).toLocaleString('ko-KR')) + ' km');
  const like = (d) => (d < 1 ? '한 걸음 이내' : d < 30 ? '버스 몇 대 길이' : d < 300 ? '축구장 몇 개' : d < 3000 ? '동네 하나' : d < 30000 ? '도시 하나' : d < 4e6 ? '여러 도시를 넘음' : d < 4e7 ? '나라 하나를 넘음' : '지구 둘레보다 큼');
  const F = '"Pretendard Variable", Pretendard, sans-serif';
  const pin = (ctx, x, y, col) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y - 34, 14, Math.PI, 0); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 34, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 34, 6, 0, Math.PI * 2); ctx.fill();
  };

  SciSim.extraLab({
    id: 'clockpos', step: 3, icon: '🔎', title: '시계 오차와 위치',
    intro: '위성 시계가 조금만 틀려도 계산한 위치가 얼마나 어긋나는지 봐요.',
    size: [600, 340],
    controls: [
      { key: 't', type: 'range', label: '시계의 오차', min: 1, max: 1000, step: 1, value: 1 },
      { key: 'u', type: 'seg', label: '오차의 단위', options: [['ns', 'ns'], ['us', 'μs'], ['ms', 'ms']], value: 'ns' },
    ],
    readouts: [{ key: 'e', label: '시계 오차' }, { key: 'd', label: '위치 오차' }, { key: 'like', label: '크기 비교' }],
    init(s) { s.p = 0; },
    tick(s, dt) { s.p = (s.p + dt * 0.6) % 1; },
    read(s) {
      const d = C * errS(s);
      return { e: s.t + ' ' + UNIT[s.u][1], d: fmtD(d), like: like(d) };
    },
    draw(ctx, W, H, s) {
      const d = C * errS(s), q = Math.max(0, Math.min(1, Math.log10(d / 0.3) / 9));
      const g = ctx.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#dbeafe'); g.addColorStop(1, '#f1f7fd');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 250);
      ctx.fillStyle = '#d9ead3'; ctx.fillRect(0, 250, W, H - 250);
      ctx.fillStyle = '#b7c9b0'; ctx.fillRect(0, 250, W, 6);
      // 위성과 신호
      const sx = 120, sy = 62, x0 = 70, x1 = x0 + 36 + 460 * q, gy = 262;
      ctx.strokeStyle = 'rgba(234,88,12,.35)'; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x0, gy - 40); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        const f = (s.p + i / 3) % 1, px = sx + (x0 - sx) * f, py = sy + (gy - 40 - sy) * f;
        ctx.fillStyle = 'rgba(234,88,12,' + (0.9 - 0.5 * f) + ')'; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#2563eb'; ctx.fillRect(sx - 62, sy - 9, 38, 18); ctx.fillRect(sx + 24, sy - 9, 38, 18);
      ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.roundRect(sx - 24, sy - 22, 48, 44, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 10); ctx.moveTo(sx, sy); ctx.lineTo(sx + 8, sy + 3); ctx.stroke();
      ctx.font = '800 20px ' + F; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#1f2937';
      ctx.fillText('위성 시계', sx + 74, sy);
      // 오차 띠
      const col = q < 0.2 ? '#16a34a' : q < 0.5 ? '#f59e0b' : '#dc2626';
      ctx.fillStyle = col; ctx.globalAlpha = 0.25; ctx.fillRect(x0, gy - 10, x1 - x0, 20); ctx.globalAlpha = 1;
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1 - 12, gy - 8); ctx.lineTo(x1, gy); ctx.lineTo(x1 - 12, gy + 8); ctx.stroke();
      pin(ctx, x0, gy, '#16a34a');
      pin(ctx, x1, gy, col);
      ctx.textAlign = 'center'; ctx.fillStyle = '#14532d'; ctx.fillText('실제 위치', x0 + 14, 300);
      ctx.fillStyle = '#1f2937'; ctx.textAlign = x1 > 520 ? 'right' : 'center';
      ctx.fillText('계산한 위치', x1 > 520 ? x1 + 16 : Math.max(x1, 170), gy - 66);
    },
  });
})();
