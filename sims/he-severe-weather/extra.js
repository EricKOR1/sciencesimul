/* 지구과학 · 악기상 [12지구01-04] · 더 탐구하기
   강풍: 등압선 간격이 좁을수록(가까운 거리에서 기압이 크게 변할수록, 기압 경도력이 클수록) 바람이 세요.
   모형(예시 값, sim.js와 같음): 등압선 4 hPa 간격일 때 풍속(m/s) = 2200 ÷ 등압선 간격(km)
     지도 A 220 km → 10 m/s, 지도 B 100 km → 22 m/s
   100 km당 기압 차(hPa) = 4 × 100 ÷ 등압선 간격(km)
   ※ 전향력과 마찰력은 다루지 않고, 바람은 고기압에서 저기압 쪽으로 부는 것으로만 보여 줘요. */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const VK = 2200, DP = 4;
  const windOf = (s) => VK / s.gap;
  const streaks = Array.from({ length: 26 }, (_, i) => ({ x: (i * 83) % 600, y: 40 + (i * 47) % 260 }));

  SciSim.extraLab({
    id: 'isobar', step: 3, icon: '🔎', title: '등압선과 바람',
    intro: '등압선 간격을 좁히거나 넓히면서 바람의 세기를 비교해요.',
    size: [600, 340],
    controls: [
      { key: 'gap', type: 'range', label: '등압선 간격', min: 80, max: 300, step: 10, value: 220, unit: 'km' },
    ],
    readouts: [{ key: 'gap', label: '등압선 간격' }, { key: 'dp', label: '100 km당 기압 차' }, { key: 'v', label: '풍속' }],
    init(s) { s.off = 0; },
    tick(s, dt) {
      const v = windOf(s);
      s.off = (s.off + v * dt * 0.6) % 1000;
      streaks.forEach((p) => { p.x += v * dt * 9; if (p.x > 620) p.x = -40; });
    },
    read(s) {
      return { gap: s.gap + ' km', dp: (DP * 100 / s.gap).toFixed(1) + ' hPa', v: windOf(s).toFixed(1) + ' m/s' };
    },
    draw(ctx, W, H, s, t) {
      const v = windOf(s), px = s.gap * 0.55;
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      // 등압선: 간격(km)에 비례해 그려요
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
      const n = Math.ceil(300 / px) + 1;
      for (let k = -n; k <= n; k++) {
        const x0 = 300 + k * px; if (x0 < 70 || x0 > 530) continue;
        ctx.beginPath();
        for (let y = 20; y <= H - 20; y += 8) { const x = x0 + 18 * Math.sin((y - 20) / (H - 40) * Math.PI); if (y === 20) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
      }
      // 고기압·저기압
      [[40, '고', '#2563eb'], [560, '저', '#dc2626']].forEach(([x, txt, c]) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, H / 2, 28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = FONT(28); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, H / 2 + 1);
      });
      // 바람 줄기 (움직이는 속도 ∝ 풍속)
      ctx.strokeStyle = 'rgba(14,165,233,.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      const L = 10 + v * 1.6;
      streaks.forEach((p) => { if (Math.abs(p.y - H / 2) < 46) return; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + L, p.y); ctx.stroke(); });
      // 바람 화살표 (길이 ∝ 풍속)
      const len = Math.min(440, v * 15), x1 = 300 - len / 2, x2 = 300 + len / 2, y = H / 2;
      ctx.strokeStyle = '#dc2626'; ctx.fillStyle = '#dc2626'; ctx.lineWidth = 12; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 - 22, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 - 30, y - 20); ctx.lineTo(x2 - 30, y + 20); ctx.closePath(); ctx.fill();
      // 이름표
      const lab = v >= 20 ? '바람: 아주 셈' : v >= 14 ? '바람: 셈' : '바람: 약함';
      ctx.font = FONT(22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(lab).width + 24;
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.roundRect(300 - tw / 2, 20, tw, 40, 10); ctx.fill();
      ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#b91c1c'; ctx.fillText(lab, 300, 41);
      ctx.font = FONT(20); ctx.fillStyle = '#475569';
      const lab2 = '등압선 4 hPa 간격';
      const tw2 = ctx.measureText(lab2).width + 20;
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.roundRect(300 - tw2 / 2, H - 52, tw2, 34, 8); ctx.fill();
      ctx.fillStyle = '#475569'; ctx.fillText(lab2, 300, H - 34);
    },
  });
})();
