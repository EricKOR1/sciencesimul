/* 지구과학 · 수온·염분·용존 산소 [12지구01-01] · 더 탐구하기
   표층 염분을 바꾸는 요인: 증발·결빙은 염분을 높이고, 강수·강물 유입·해빙은 염분을 낮춰요.
   모형(예시 값): 표층 염분(psu) = 35 + 0.0009 × (증발량 − 강수량) + 해역 조건
     해역 조건: 없음 0, 강물 유입 −2.0, 결빙 +1.0(얼 때 염류가 빠져나와 남은 바닷물이 진해짐), 해빙 −1.5
   차시 표와 맞춰요: 적도(증발 − 강수 = −400) 34.6 psu, 위도 20°(+900) 35.8 psu. */
(function () {
  'use strict';
  const K = 0.0009;
  const ADJ = { none: 0, river: -2.0, freeze: 1.0, melt: -1.5 };
  const salOf = (s) => 35 + K * (s.evap - s.rain) + ADJ[s.cond];
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const drops = Array.from({ length: 40 }, (_, i) => ({ x: 400 + (i * 37) % 150, y: (i * 29) % 70, v: 160 + (i * 23) % 80 }));
  const dots = Array.from({ length: 140 }, (_, i) => ({ x: 20 + (i * 97) % 470, y: 150 + (i * 61) % 180 }));

  function label(ctx, txt, x, y, bg) {
    ctx.font = FONT(20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 18;
    ctx.fillStyle = bg || 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 16, w, 32, 8); ctx.fill();
    ctx.fillStyle = '#1f2937'; ctx.fillText(txt, x, y + 1);
  }

  SciSim.extraLab({
    id: 'salt', step: 2, icon: '🔎', title: '표층 염분 바꾸기',
    intro: '증발·강수·강물·얼음이 바다 표면의 염분을 어떻게 바꾸는지 봐요.',
    size: [600, 340],
    controls: [
      { key: 'evap', type: 'range', label: '증발량', min: 0, max: 2000, step: 100, value: 1200, unit: 'mm/년' },
      { key: 'rain', type: 'range', label: '강수량', min: 0, max: 2000, step: 100, value: 1200, unit: 'mm/년' },
      { key: 'cond', type: 'seg', label: '해역의 조건', options: [['none', '없음'], ['river', '강물 유입'], ['freeze', '결빙'], ['melt', '해빙']], value: 'none' },
    ],
    readouts: [{ key: 'ep', label: '증발량 − 강수량' }, { key: 'sal', label: '표층 염분' }, { key: 'note', label: '바닷물' }],
    init(s) { s.ph = 0; },
    tick(s, dt) {
      s.ph = (s.ph + dt) % 1000;
      const f = 0.3 + s.rain / 2000;
      drops.forEach((d) => { d.y += d.v * dt * f; if (d.y > 120) d.y = -6; });
    },
    read(s) {
      const S = salOf(s), ep = s.evap - s.rain;
      const note = S > 35.05 ? '진해짐 (염분 ↑)' : S < 34.95 ? '묽어짐 (염분 ↓)' : '보통';
      return { ep: (ep > 0 ? '+' : '') + ep + ' mm/년', sal: S.toFixed(1) + ' psu', note };
    },
    draw(ctx, W, H, s) {
      const S = salOf(s), q = Math.max(0, Math.min(1, (S - 31) / 8)), top = 140;
      // 하늘
      const g = ctx.createLinearGradient(0, 0, 0, top); g.addColorStop(0, '#cfe3f7'); g.addColorStop(1, '#eef5fc');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, top);
      // 바다: 염분이 높을수록 진한 파랑
      const c0 = [150, 205, 240], c1 = [22, 70, 150];
      const col = c0.map((v, i) => Math.round(v + (c1[i] - v) * q));
      ctx.fillStyle = 'rgb(' + col.join(',') + ')'; ctx.fillRect(0, top, W, H - top);
      // 소금 알갱이: 염분이 높을수록 많이
      const n = Math.round(Math.max(0, S - 30) * 16);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < Math.min(n, dots.length); i++) { const d = dots[i]; ctx.beginPath(); ctx.arc(d.x, d.y, 3.2, 0, Math.PI * 2); ctx.fill(); }
      // 해
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(70, 50, 28, 0, Math.PI * 2); ctx.fill();
      // 증발: 물만 날아가요 (화살표 수 ∝ 증발량)
      const ne = Math.round(s.evap / 400);
      ctx.strokeStyle = 'rgba(234,88,12,.85)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < ne; i++) {
        const x = 130 + i * 38, yb = top - 8, yt = 62, o = (s.ph * 40 + i * 9) % 12;
        ctx.beginPath();
        for (let y = yb; y >= yt; y -= 4) { const xx = x + Math.sin((y + o) / 8) * 5; if (y === yb) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); }
        ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 8, yt + 10); ctx.lineTo(x, yt - 2); ctx.lineTo(x + 8, yt + 10); ctx.stroke();
      }
      if (ne > 0) label(ctx, '증발', 175, 28);
      // 구름과 비 (빗줄기 수 ∝ 강수량)
      ctx.fillStyle = '#94a3b8';
      [[430, 30, 26], [462, 22, 30], [496, 30, 26], [462, 40, 24]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
      const nr = Math.round(drops.length * s.rain / 2000);
      ctx.strokeStyle = 'rgba(37,99,235,.8)'; ctx.lineWidth = 2.5;
      for (let i = 0; i < nr; i++) { const d = drops[i], y = 56 + d.y * 0.7; ctx.beginPath(); ctx.moveTo(d.x - 20, y); ctx.lineTo(d.x - 23, y + 10); ctx.stroke(); }
      if (nr > 0) label(ctx, '강수', 548, 30);
      // 해역 조건
      if (s.cond === 'river') {
        ctx.fillStyle = '#a3b18a'; ctx.beginPath(); ctx.moveTo(0, top - 50); ctx.lineTo(110, top - 4); ctx.lineTo(110, top + 6); ctx.lineTo(0, top + 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.moveTo(0, top - 26); ctx.lineTo(110, top - 2); ctx.lineTo(110, top + 6); ctx.lineTo(0, top - 6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(30, top - 14); ctx.lineTo(150, top + 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(136, top + 10); ctx.lineTo(150, top + 24); ctx.lineTo(131, top + 26); ctx.stroke();
        label(ctx, '강물(민물)', 105, top + 54);
      } else if (s.cond === 'freeze' || s.cond === 'melt') {
        ctx.fillStyle = '#f8fafc'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
        [[60, 120], [200, 90], [310, 110]].forEach(([x, w]) => { ctx.beginPath(); ctx.roundRect(x, top - 10, w, 22, 4); ctx.fill(); ctx.stroke(); });
        if (s.cond === 'melt') {
          ctx.fillStyle = 'rgba(186,230,253,.95)';
          [[90, 0], [140, 4], [240, 2], [350, 5], [390, 1]].forEach(([x, o]) => { const y = top + 18 + ((s.ph * 30 + o * 7) % 26); ctx.beginPath(); ctx.ellipse(x, y, 6, 9, 0, 0, Math.PI * 2); ctx.fill(); });
          label(ctx, '해빙: 민물이 섞임', 230, top + 64);
        } else {
          label(ctx, '결빙: 염류가 남음', 230, top + 64);
        }
      }
      // 염분 막대
      const gx = 540, gy0 = 196, gy1 = 320, gh = gy1 - gy0;
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(gx - 4, gy0 - 4, 40, gh + 8, 8); ctx.fill();
      ctx.fillStyle = '#0ea5e9'; const fh = gh * q; ctx.fillRect(gx, gy1 - fh, 32, fh);
      const yr = gy1 - gh * (4 / 8);
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx - 10, yr); ctx.lineTo(gx + 42, yr); ctx.stroke();
      label(ctx, '보통', gx - 46, yr);
      label(ctx, '염분', gx + 16, gy0 - 26);
    },
  });
})();
