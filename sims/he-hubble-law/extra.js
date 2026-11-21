/* 지구과학 · 허블-르메트르 법칙 [12지구03-05] · 더 탐구하기
   표준 촛불: 광도가 같은 천체는 거리가 2배가 되면 빛이 4배 넓이로 퍼져 겉보기 밝기가 1/4이 돼요.
   식: b = L / (4πd²)  →  10 Mpc에 있는 광도 L 천체의 밝기를 1로 두면  b = (L/L₀) × (10 / d)²
   그림: 거리 d에서 빛이 퍼진 면을 (d/10)² 칸으로 나누고, 망원경은 언제나 그중 한 칸만큼의 빛을 받아요.
   거리·광도는 차시의 예시 범위(10~100 Mpc)에 맞춘 값이에요. */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const SX = 70, SY = 170;
  const brightOf = (s) => s.lum * Math.pow(10 / s.d, 2);
  const areaOf = (s) => Math.pow(s.d / 10, 2);
  function frac(b) {
    if (b >= 1) return String(Math.round(b * 100) / 100);
    const inv = 1 / b, r = Math.round(inv);
    return Math.abs(inv - r) < 1e-6 ? '1/' + r : (Math.round(b * 1000) / 1000).toString();
  }
  function label(ctx, txt, x, y, bg, fg) {
    ctx.font = FONT(20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 18;
    ctx.fillStyle = bg || 'rgba(255,255,255,.93)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 16, w, 32, 8); ctx.fill();
    ctx.fillStyle = fg || '#1f2937'; ctx.fillText(txt, x, y + 1);
  }

  SciSim.extraLab({
    id: 'candle', step: 2, icon: '🔎', title: '표준 촛불의 밝기',
    intro: '광도를 아는 천체를 멀리 옮기면 겉보기 밝기가 어떻게 줄어드는지 봐요. 밝기는 10 Mpc에 있는 기준 광도 L₀ 천체를 1로 두어요.',
    size: [600, 340],
    controls: [
      { key: 'd', type: 'range', label: '천체까지 거리', min: 10, max: 100, step: 10, value: 10, unit: 'Mpc' },
      { key: 'lum', type: 'seg', label: '천체의 광도', options: [[1, '기준 광도 L₀'], [4, '4배 광도']], value: 1 },
    ],
    readouts: [{ key: 'b', label: '겉보기 밝기 (10 Mpc·L₀ = 1)' }, { key: 'a', label: '빛이 퍼진 넓이' }],
    read(s) {
      const b = brightOf(s);
      return { b: frac(b), a: areaOf(s) + ' 배' };
    },
    draw(ctx, W, H, s) {
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
      const n = Math.round(s.d / 10), hgt = s.d * 2.5, wid = hgt * 0.42, cell = hgt / n;
      const xs = SX + 60 + s.d * 4.1, top = SY - hgt / 2;
      // 빛이 퍼지는 원뿔
      const g = ctx.createLinearGradient(SX, 0, xs, 0);
      g.addColorStop(0, 'rgba(253,224,71,.55)'); g.addColorStop(1, 'rgba(253,224,71,.12)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(SX, SY); ctx.lineTo(xs - wid / 2, top); ctx.lineTo(xs - wid / 2, top + hgt); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(253,224,71,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(SX, SY); ctx.lineTo(xs - wid / 2, top); ctx.moveTo(SX, SY); ctx.lineTo(xs - wid / 2, top + hgt); ctx.stroke();
      // 빛이 퍼진 면: (d/10)² 칸
      ctx.fillStyle = 'rgba(253,224,71,.18)'; ctx.fillRect(xs - wid / 2, top, wid, hgt);
      ctx.strokeStyle = 'rgba(253,224,71,.85)'; ctx.lineWidth = 1.5;
      for (let i = 0; i <= n; i++) {
        ctx.beginPath(); ctx.moveTo(xs - wid / 2, top + i * cell); ctx.lineTo(xs + wid / 2, top + i * cell); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xs - wid / 2 + i * wid / n, top); ctx.lineTo(xs - wid / 2 + i * wid / n, top + hgt); ctx.stroke();
      }
      // 망원경이 받는 한 칸: 밝기에 따라 밝게
      const b = brightOf(s), k = Math.floor(n / 2), a = Math.min(1, 0.15 + 0.85 * Math.sqrt(Math.min(1, b / 4)));
      ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
      ctx.fillRect(xs - wid / 2 + k * wid / n, top + k * cell, wid / n, cell);
      ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 3; ctx.strokeRect(xs - wid / 2 + k * wid / n, top + k * cell, wid / n, cell);
      // 천체
      const r = s.lum > 1 ? 22 : 14;
      const sg = ctx.createRadialGradient(SX, SY, 2, SX, SY, r * 2.4);
      sg.addColorStop(0, '#fff'); sg.addColorStop(0.4, '#fde047'); sg.addColorStop(1, 'rgba(253,224,71,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(SX, SY, r * 2.4, 0, Math.PI * 2); ctx.fill();
      label(ctx, '표준 촛불', SX, SY + 62);
      label(ctx, '망원경이 받는 한 칸', 300, 28, 'rgba(34,211,238,.95)', '#0f172a');
      label(ctx, '빛이 ' + areaOf(s) + '칸으로 퍼짐', 300, H - 24);
    },
  });
})();
