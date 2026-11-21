/* 중1 Ⅰ. 과학과 인류의 지속가능한 삶 — 지속가능한 삶과 과학기술 [9과01-03] · 더 탐구하기
   개인과 사회의 실천을 켜고 끄면, 마을의 석탄 발전량과 이산화 탄소 배출이 얼마나 줄어드는지 비교해요.
   모형(예시 값, "지금 = 100"으로 나타낸 상대값):
     석탄 발전량 = 100 × (절전 0.8) × (재생 에너지 확대 0.5)
     교통 배출   = 100 × (걷기·대중교통 이용 0.8) × (대중교통 확충 0.7)
     이산화 탄소 배출 = 0.6 × 석탄 발전량 + 0.4 × 교통 배출  (지금은 전기 60 %, 교통 40 %로 둔 예시 값)
   ※ 온실효과 원리·전력량 계산은 다루지 않아요. kWh 대신 "지금 = 100"인 상대값으로만 비교해요. */
(function () {
  'use strict';
  const coalOf = (s) => 100 * (s.save ? 0.8 : 1) * (s.renew ? 0.5 : 1);
  const carOf = (s) => 100 * (s.walk ? 0.8 : 1) * (s.bus ? 0.7 : 1);
  const co2Of = (s) => 0.6 * coalOf(s) + 0.4 * carOf(s);
  const r1 = (v) => (Math.round(v * 10) / 10).toString();
  const F = (px) => '800 ' + px + 'px "Pretendard Variable", Pretendard, sans-serif';
  const puffs = Array.from({ length: 10 }, (_, i) => ({ k: i / 10, dx: ((i * 37) % 21) - 10 }));

  SciSim.extraLab({
    id: 'act', step: 3, icon: '🔎', title: '실천과 석탄 발전',
    intro: '개인의 실천(👤)과 사회의 실천(🏛️)을 켜고 끄며 석탄 발전과 이산화 탄소 배출을 비교해요. (지금 = 100, 예시 값)',
    size: [600, 340],
    controls: [
      { key: 'save', type: 'toggle', label: '👤 절전 (플러그 뽑기·전등 끄기)', value: false },
      { key: 'walk', type: 'toggle', label: '👤 걷기·자전거·대중교통 이용', value: false },
      { key: 'renew', type: 'toggle', label: '🏛️ 재생 에너지 확대', value: false },
      { key: 'bus', type: 'toggle', label: '🏛️ 대중교통 확충', value: false },
    ],
    readouts: [{ key: 'coal', label: '석탄 발전량 (지금 100)' }, { key: 'co2', label: '이산화 탄소 배출 (지금 100)' }, { key: 'cut', label: '줄어든 배출' }],
    init(s) { s.ph = 0; s.cs = coalOf(s); s.es = co2Of(s); s.road = 0; },
    tick(s, dt) {
      const k = Math.min(1, dt * 4);
      s.cs += (coalOf(s) - s.cs) * k; s.es += (co2Of(s) - s.es) * k;
      s.ph = (s.ph + dt * 0.5) % 1; s.road = (s.road + dt * 60) % 600;
    },
    read(s) {
      return { coal: r1(coalOf(s)), co2: r1(co2Of(s)), cut: r1(100 - co2Of(s)) + ' %' };
    },
    draw(ctx, W, H, s) {
      const c = s.cs / 100, e = s.es / 100;
      // 하늘 (석탄 연기가 많으면 탁해요)
      const sky = ctx.createLinearGradient(0, 0, 0, 236);
      sky.addColorStop(0, 'rgb(' + Math.round(150 + 60 * (1 - c)) + ',' + Math.round(180 + 40 * (1 - c)) + ',' + Math.round(205 + 40 * (1 - c)) + ')');
      sky.addColorStop(1, '#eef4fa');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 236);
      ctx.fillStyle = '#9ccf7f'; ctx.fillRect(0, 236, W, H - 236);
      // 석탄 발전소와 연기
      ctx.fillStyle = '#6b7280'; ctx.fillRect(28, 168, 92, 68); ctx.fillRect(98, 92, 24, 80);
      ctx.fillStyle = '#4b5563'; ctx.fillRect(94, 86, 32, 10);
      puffs.forEach((p) => {
        const k = (p.k + s.ph) % 1, r = (8 + 26 * k) * (0.35 + 0.65 * c);
        ctx.fillStyle = 'rgba(90,90,96,' + (0.55 * (1 - k) * Math.min(1, c * 1.4)) + ')';
        ctx.beginPath(); ctx.arc(110 + p.dx + 70 * k, 76 - 70 * k, r, 0, Math.PI * 2); ctx.fill();
      });
      // 재생 에너지 (사회 실천을 켜면 나타나요)
      if (s.renew) {
        ctx.fillStyle = '#1e40af';
        for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(160 + i * 42, 222); ctx.transform(1, 0, -0.3, 1, 0, 0); ctx.fillRect(0, 0, 34, 14); ctx.restore(); }
        ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(214, 222); ctx.lineTo(214, 128); ctx.stroke();
        ctx.save(); ctx.translate(214, 128); ctx.rotate(s.ph * Math.PI * 2);
        ctx.fillStyle = '#f8fafc'; for (let b = 0; b < 3; b++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.ellipse(0, -22, 5, 22, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }
      // 집 (절전하면 불빛이 줄어요)
      [[290, 186], [350, 176], [410, 190]].forEach(([x, y], i) => {
        ctx.fillStyle = ['#fca5a5', '#fcd34d', '#93c5fd'][i]; ctx.fillRect(x, y, 48, 236 - y);
        ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 24, y - 24); ctx.lineTo(x + 54, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = s.save && i !== 1 ? '#94a3b8' : '#fde047'; ctx.fillRect(x + 8, y + 12, 12, 12);
        ctx.fillStyle = s.save ? '#94a3b8' : '#fde047'; ctx.fillRect(x + 28, y + 12, 12, 12);
      });
      // 도로: 자동차 수는 교통 배출에 비례, 대중교통 확충이면 버스
      ctx.fillStyle = '#4b5563'; ctx.fillRect(0, 282, 460, 40);
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 3; ctx.setLineDash([16, 14]);
      ctx.beginPath(); ctx.moveTo(0, 302); ctx.lineTo(460, 302); ctx.stroke(); ctx.setLineDash([]);
      const nCar = Math.round(6 * carOf(s) / 100), cols = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#a855f7', '#f97316'];
      for (let i = 0; i < nCar; i++) {
        const x = ((i * 77 + s.road) % 520) - 40;
        ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.roundRect(x, i % 2 ? 288 : 306, 34, 12, 4); ctx.fill();
      }
      if (s.bus) { const x = ((s.road * 0.8 + 260) % 540) - 70; ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.roundRect(x, 286, 66, 28, 6); ctx.fill(); ctx.fillStyle = '#dcfce7'; for (let w = 0; w < 4; w++) ctx.fillRect(x + 6 + w * 15, 291, 10, 9); }
      // 이산화 탄소 막대 (지금 = 100)
      const bx = 492, bw = 76, bt = 88, bb = 318, bh = bb - bt;
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(470, 14, 120, 316, 12); ctx.fill();
      ctx.fillStyle = '#e5e7eb'; ctx.fillRect(bx, bt, bw, bh);
      const fh = bh * e; ctx.fillStyle = e > 0.75 ? '#6b7280' : e > 0.55 ? '#84a98c' : '#22c55e'; ctx.fillRect(bx, bb - fh, bw, fh);
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(bx - 8, bt); ctx.lineTo(bx + bw + 8, bt); ctx.stroke(); ctx.setLineDash([]);
      // 이름표
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = F(20);
      ctx.fillStyle = '#1f2937'; ctx.fillText('이산화 탄소', 530, 34);
      ctx.fillStyle = '#dc2626'; ctx.fillText('지금', 530, bt - 18);
      ctx.fillStyle = '#ffffff'; ctx.fillText('석탄', 64, 196); ctx.fillText('발전소', 64, 222);
    },
  });
})();
