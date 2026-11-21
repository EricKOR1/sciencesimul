/* 중3 Ⅲ. 수권과 해수의 순환 - 해류와 표층 순환 [9과18-03] · 더 탐구하기
   난류의 세기와 해안 도시의 겨울 기온: 저위도의 따뜻한 물을 옮겨 오는 난류가 약해지면, 같은 위도의 해안 도시는 겨울에 더 추워져요.
   모형(예시 값, 실제 도시 자료 아님): 난류의 세기 f (지금 = 100 %)
         앞바다 수온(1월) = 8 + 10 × f  °C,  해안 도시의 1월 평균 기온 = −1 + 6 × f  °C
         → 난류가 지금처럼 흐르면 기온 5 °C, 난류가 없으면 −1 °C (방향과 크기만 실제와 비슷하게 맞춘 값)
   ※ 북태평양 아열대 순환 밖의 해류 이름, 우리나라 주변 세부 해류는 다루지 않아요. 지도는 단순화한 그림이에요. */
(function () {
  'use strict';
  const sstOf = (s) => 8 + 10 * s.str / 100;
  const tOf = (s) => -1 + 6 * s.str / 100;
  const flakes = Array.from({ length: 34 }, (_, i) => ({ x: 10 + (i * 61) % 250, y: (i * 37) % 340, v: 26 + (i * 13) % 20 }));
  const dots = Array.from({ length: 14 }, (_, i) => i / 14);
  const F = (px) => '800 ' + px + 'px "Pretendard Variable", Pretendard, sans-serif';
  const sgn = (v) => (v > 0.05 ? '+' : v < -0.05 ? '−' : '') + Math.abs(v).toFixed(1);

  SciSim.extraLab({
    id: 'warm', step: 2, icon: '🔎', title: '난류와 겨울 기온',
    intro: '따뜻한 해류(난류)가 흐르는 바다 옆 해안 도시예요. 난류가 약해지면 겨울 기온은 어떻게 될까요? (예시 값)',
    size: [600, 340],
    controls: [
      { key: 'str', type: 'range', label: '난류의 세기 (지금 = 100 %)', min: 0, max: 100, step: 10, value: 100, unit: '%', fmt: (v) => String(v) },
      { key: 'weak', type: 'button', primary: true, label: '▼ 난류 10 % 약하게', onClick(s, lab) { lab.set('str', Math.max(0, s.str - 10)); } },
      { key: 'back', type: 'button', label: '↺ 지금처럼 (100 %)', onClick(s, lab) { lab.set('str', 100); } },
    ],
    readouts: [{ key: 'sst', label: '앞바다 수온 (1월)' }, { key: 't', label: '도시의 1월 평균 기온' }, { key: 'd', label: '지금보다' }],
    init(s) { s.ph = 0; s.f = s.str / 100; },
    tick(s, dt) {
      s.f += (s.str / 100 - s.f) * Math.min(1, dt * 5);
      s.ph = (s.ph + dt * (0.05 + 0.25 * s.f)) % 1;
      flakes.forEach((p) => { p.y += p.v * dt; if (p.y > 340) p.y = -6; });
    },
    read(s) {
      const t = tOf(s);
      return { sst: sstOf(s).toFixed(1) + ' °C', t: t.toFixed(1).replace('-', '−') + ' °C', d: sgn(t - 5) + ' °C' };
    },
    draw(ctx, W, H, s) {
      const f = s.f, temp = -1 + 6 * f;
      // 바다: 난류가 셀수록 따뜻한 색
      const warm = [255, 196, 160], cold = [150, 196, 235];
      const mix = (k) => 'rgb(' + warm.map((w, i) => Math.round(cold[i] + (w - cold[i]) * k)).join(',') + ')';
      const sea = ctx.createLinearGradient(260, 0, W, 0); sea.addColorStop(0, mix(f)); sea.addColorStop(1, mix(f * 0.45));
      ctx.fillStyle = sea; ctx.fillRect(0, 0, W, H);
      // 육지와 해안선
      ctx.fillStyle = '#d9cfa8'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(250, 0);
      ctx.bezierCurveTo(300, 60, 240, 120, 285, 170); ctx.bezierCurveTo(320, 215, 260, 270, 300, 340); ctx.lineTo(0, 340); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#a89b6c'; ctx.lineWidth = 3; ctx.stroke();
      // 눈 (기온이 낮을 때)
      if (temp < 1.5) {
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.95, (1.5 - temp) / 2) + ')';
        flakes.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); });
      }
      // 난류 화살표 (남쪽에서 북쪽으로): 셀수록 굵고 진해요
      const path = (k) => { const y = 330 - 300 * k; return [360 + 26 * Math.sin(k * 5.2), y]; };
      if (f > 0.02) {
        ctx.strokeStyle = 'rgba(220,38,38,' + (0.25 + 0.6 * f) + ')'; ctx.lineWidth = 6 + 26 * f; ctx.lineCap = 'round';
        ctx.beginPath(); for (let k = 0; k <= 0.86; k += 0.02) { const [x, y] = path(k); if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
        const [ax, ay] = path(0.86), hw = 14 + 18 * f;
        ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.moveTo(ax - hw, ay + 4); ctx.lineTo(ax + hw, ay + 4); ctx.lineTo(ax, ay - 26 - 10 * f); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        dots.forEach((d) => { const k = ((d + s.ph) % 1) * 0.84; const [x, y] = path(k); ctx.beginPath(); ctx.arc(x, y, 3 + 2 * f, 0, Math.PI * 2); ctx.fill(); });
      }
      // 해안 도시
      const bx = 172, by = 190;
      [[0, 46, 22], [26, 70, 24], [54, 38, 20], [78, 56, 22]].forEach(([dx, h, w]) => {
        ctx.fillStyle = '#64748b'; ctx.fillRect(bx + dx, by - h, w, h);
        ctx.fillStyle = '#fde68a'; for (let yy = by - h + 8; yy < by - 8; yy += 14) ctx.fillRect(bx + dx + 6, yy, w - 12, 5);
      });
      // 온도계
      const tx = 70, top = 70, bot = 270, tt = Math.max(0, Math.min(1, (temp + 3) / 11));
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(tx - 13, top, 26, bot - top, 13); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(tx, bot + 14, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const tc = temp < 1.5 ? '#2563eb' : '#dc2626';
      ctx.fillStyle = tc; ctx.beginPath(); ctx.arc(tx, bot + 14, 16, 0, Math.PI * 2); ctx.fill();
      const ly = bot - (bot - top - 16) * tt; ctx.fillRect(tx - 7, ly, 14, bot + 4 - ly);
      const zy = bot - (bot - top - 16) * (3 / 11);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx + 16, zy); ctx.lineTo(tx + 28, zy); ctx.stroke();
      // 이름표
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = F(20);
      ctx.fillStyle = '#334155'; ctx.fillText('0 °C', tx + 58, zy);
      ctx.fillStyle = '#1f2937'; ctx.fillText('해안 도시', bx + 50, by + 24);
      ctx.fillStyle = '#991b1b'; ctx.fillText(f > 0.02 ? '난류' : '난류 없음', 470, 250);
      ctx.fillStyle = '#1e3a5f'; ctx.fillText('북쪽 (고위도)', 500, 26);
      ctx.fillText('남쪽 (저위도)', 500, 316);
    },
  });
})();
