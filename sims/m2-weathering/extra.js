/* 중2 Ⅱ. 지권의 변화 - 풍화와 토양 [9과09-04] · 더 탐구하기
   빗물과 공기에 의한 풍화: 빗물에 잘 녹는 암석(석회암)과 잘 녹지 않는 암석(화강암)을 오랜 세월 동안 비교해요.
   ※ 화학적 풍화의 세부 반응은 다루지 않아요. "빗물이 암석의 성분을 서서히 녹인다"는 것만 보여 줘요.
   모형(예시 값): 틈의 너비(cm) = 1 + k × 빗물의 양 × 세월(년),  k = 석회암 0.004, 화강암 0.00004 */
(function () {
  'use strict';
  const K = { lime: 0.004, gran: 0.00004 };
  const RAIN = { low: 0.5, mid: 1, high: 2 };
  const widthOf = (s) => 1 + K[s.rock] * RAIN[s.rain] * s.years;
  const comma = (n) => Math.round(n).toLocaleString('ko-KR');
  const drops = Array.from({ length: 46 }, (_, i) => ({ x: (i * 97) % 720, y: (i * 53) % 150, v: 150 + (i * 31) % 90 }));

  SciSim.extraLab({
    id: 'rainrock', step: 1, icon: '🔎', title: '빗물에 녹는 바위',
    intro: '빗물은 어떤 바위를 서서히 녹여요. 두 바위에 같은 세월을 흘려 비교해요.',
    size: [720, 380],
    controls: [
      { key: 'rock', type: 'seg', label: '바위', options: [['lime', '석회암'], ['gran', '화강암']], value: 'lime' },
      { key: 'rain', type: 'seg', label: '빗물의 양', options: [['low', '적음'], ['mid', '보통'], ['high', '많음']], value: 'mid' },
      { key: 'go', type: 'button', primary: true, label: '▶ 1만 년 흐르기', onClick(s) { if (s.years < 50000) s.target = Math.min(50000, Math.round(s.target / 10000) * 10000 + 10000); } },
      { key: 'reset', type: 'button', label: '↺ 처음으로', onClick(s) { s.years = 0; s.target = 0; } },
    ],
    readouts: [{ key: 'years', label: '지난 세월' }, { key: 'w', label: '틈의 너비' }, { key: 'note', label: '바위의 모습' }],
    init(s) { s.years = 0; s.target = 0; },
    onChange(key, v, s) { if (key === 'rock') { s.years = 0; s.target = 0; } },
    tick(s, dt) {
      if (s.years < s.target) s.years = Math.min(s.target, s.years + 10000 * dt / 2.5);
      drops.forEach((d) => { d.y += d.v * dt * (0.6 + 0.4 * RAIN[s.rain]); if (d.y > 150) { d.y = -10; } });
    },
    read(s) {
      const w = widthOf(s);
      const note = s.rock === 'gran' ? (s.years > 0 ? '거의 그대로' : '단단한 바위') : w < 10 ? '틈이 조금 넓어짐' : w < 80 ? '틈이 크게 넓어짐' : '땅속에 동굴이 생김';
      return { years: comma(s.years) + ' 년', w: (w < 10 ? w.toFixed(1) : comma(w)) + ' cm', note };
    },
    draw(ctx, W, H, s) {
      const lime = s.rock === 'lime', w = widthOf(s), p = Math.min(1, (w - 1) / 200);
      // 하늘
      const g = ctx.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, '#cfe3f7'); g.addColorStop(1, '#eaf3fb');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 150);
      // 비
      ctx.strokeStyle = 'rgba(56,120,200,.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      const n = Math.round(drops.length * (0.35 + 0.325 * RAIN[s.rain]));
      for (let i = 0; i < n; i++) { const d = drops[i]; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 11); ctx.stroke(); }
      // 바위
      const top = 150, base = lime ? '#cfc9b8' : '#b9a7a2';
      ctx.fillStyle = base; ctx.fillRect(0, top, W, H - top);
      ctx.fillStyle = lime ? '#bdb6a2' : '#a8938d';
      for (let i = 0; i < 60; i++) { const x = (i * 137) % W, y = top + 14 + ((i * 71) % (H - top - 24)); ctx.fillRect(x, y, lime ? 22 : 5, lime ? 2 : 5); }
      // 풀
      ctx.fillStyle = '#6aa84f'; ctx.fillRect(0, top - 6, W, 8);
      // 틈 (빗물이 스며드는 길): 석회암은 세월이 흐를수록 넓어져요
      const xs = [150, 360, 570], gw = 5 + 60 * p, depth = 70 + 120 * Math.min(1, p * 1.6);
      ctx.fillStyle = '#eaf3fb';
      xs.forEach((x, i) => {
        const ww = gw * (i === 1 ? 1 : 0.8), dd = depth * (i === 1 ? 1 : 0.85);
        ctx.beginPath(); ctx.moveTo(x - ww / 2, top - 6); ctx.lineTo(x + ww / 2, top - 6); ctx.lineTo(x + ww * 0.18, top + dd); ctx.lineTo(x - ww * 0.18, top + dd); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(56,120,200,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x, top + dd - 4); ctx.stroke();
      });
      // 동굴: 틈이 충분히 넓어지면 땅속 빈 공간이 생겨요 (석회암만)
      if (lime && p > 0.38) {
        const q = Math.min(1, (p - 0.38) / 0.62), cx = 360, cy = top + 150, rx = 60 + 210 * q, ry = 18 + 44 * q;
        ctx.fillStyle = '#3b3a45'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5b8fd0'; ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.62, rx * 0.72, ry * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        if (q > 0.45) {
          ctx.fillStyle = '#cfc9b8';
          for (let i = -3; i <= 3; i++) { const x = cx + i * rx * 0.22, h = ry * (0.5 + 0.25 * ((i + 4) % 3)) * q; ctx.beginPath(); ctx.moveTo(x - 6, cy - ry * 0.9); ctx.lineTo(x + 6, cy - ry * 0.9); ctx.lineTo(x, cy - ry * 0.9 + h); ctx.closePath(); ctx.fill(); }
        }
      }
      // 이름표
      ctx.font = '800 22px "Pretendard Variable", Pretendard, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const name = lime ? '석회암: 빗물에 서서히 녹는 바위' : '화강암: 빗물에 잘 녹지 않는 바위';
      const tw = ctx.measureText(name).width + 24;
      ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(14, 14, tw, 42, 10); ctx.fill();
      ctx.fillStyle = '#1f2937'; ctx.fillText(name, 26, 36);
      ctx.font = '700 20px "Pretendard Variable", Pretendard, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#334155'; ctx.fillText('틈', 150, top + 22 + depth * 0.85);
      if (lime && p > 0.5) { ctx.fillStyle = '#e2e8f0'; ctx.fillText('석회 동굴', 360, top + 150); }
    },
  });
})();
