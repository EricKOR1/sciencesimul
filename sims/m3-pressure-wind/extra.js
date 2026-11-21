/* 중3 Ⅱ. 날씨와 기후변화 — 기압과 바람 [9과17-04] · 더 탐구하기
   토리첼리 실험에서 유리관의 굵기와 기울기를 바꿔 봐요. 기압이 같으면 수은 기둥의 수직 높이는 늘 같아요.
   모형: 수직 높이 h = 76 cm × (기압 ÷ 1013.25 hPa),  기압은 sim.js와 같은 표준 대기식
         p(m) = 1013.25 × (1 − 2.25577e-5 × m)^5.25588 hPa (해수면 0 m, 높은 산 3000 m)
         관 속 수은의 길이 = h ÷ cos(기울기),  관 속 수은의 양(g) = 13.6 g/cm³ × 관의 단면적 × 길이
         관의 안지름 0.5 cm · 1 cm · 2 cm 는 예시 값, 유리관 길이 100 cm (기울기 최대 40°까지만: 수은이 관 끝에 닿지 않게)
   ※ 압력의 계산식(힘 ÷ 넓이)은 다루지 않아요. "굵은 관은 수은이 많아도 수직 높이는 같다"는 것만 보여 줘요. */
(function () {
  'use strict';
  const pressAt = (m) => 1013.25 * Math.pow(1 - 2.25577e-5 * m, 5.25588);
  const ALT = { sea: 0, mt: 3000 };
  const DIA = { thin: 0.5, mid: 1, thick: 2 };
  const RHO = 13.6;
  const hOf = (s) => 76 * pressAt(ALT[s.place]) / 1013.25;
  const lenOf = (s) => hOf(s) / Math.cos(s.tilt * Math.PI / 180);
  const massOf = (s) => RHO * Math.PI * Math.pow(DIA[s.dia] / 2, 2) * lenOf(s);
  const F = (px, w) => (w || 800) + ' ' + px + 'px "Pretendard Variable", Pretendard, sans-serif';

  SciSim.extraLab({
    id: 'tube', step: 2, icon: '🔎', title: '굵기·기울기와 수은',
    intro: '유리관을 굵은 것으로 바꾸거나 기울여도 수은 기둥의 수직 높이는 달라질까요?',
    size: [600, 340],
    controls: [
      { key: 'dia', type: 'seg', label: '유리관의 굵기', options: [['thin', '가는 관'], ['mid', '보통 관'], ['thick', '굵은 관']], value: 'mid' },
      { key: 'tilt', type: 'range', label: '관의 기울기', min: 0, max: 40, step: 5, value: 0, fmt: (v) => String(v), unit: '°' },
      { key: 'place', type: 'seg', label: '실험 장소', options: [['sea', '해수면'], ['mt', '높은 산 3000 m']], value: 'sea' },
    ],
    readouts: [{ key: 'h', label: '수직 높이' }, { key: 'len', label: '관 속 수은 길이' }, { key: 'm', label: '관 속 수은의 양' }],
    init(s) { s.ang = 0; s.hh = hOf(s); },
    step(s, dt) {
      const k = Math.min(1, dt * 6);
      s.ang += (s.tilt - s.ang) * k;
      s.hh += (hOf(s) - s.hh) * k;
    },
    read(s) {
      return { h: hOf(s).toFixed(1) + ' cm', len: lenOf(s).toFixed(1) + ' cm', m: Math.round(massOf(s)).toLocaleString('ko-KR') + ' g' };
    },
    draw(ctx, W, H, s) {
      const K = 2.5, surf = 292, bx = 190, th = s.ang * Math.PI / 180;
      const tw = { thin: 10, mid: 18, thick: 34 }[s.dia];
      // 배경
      ctx.fillStyle = '#f5f8fc'; ctx.fillRect(0, 0, W, H);
      // 수직 높이 선
      const hy = surf - s.hh * K;
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(110, hy); ctx.lineTo(560, hy); ctx.stroke(); ctx.setLineDash([]);
      // 수직 높이 화살표
      ctx.strokeStyle = '#dc2626'; ctx.fillStyle = '#dc2626'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(470, surf - 4); ctx.lineTo(470, hy + 6); ctx.stroke();
      [[hy, 1], [surf, -1]].forEach(([y, d]) => { ctx.beginPath(); ctx.moveTo(470, y); ctx.lineTo(462, y + 14 * d); ctx.lineTo(478, y + 14 * d); ctx.closePath(); ctx.fill(); });
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(336, surf); ctx.lineTo(560, surf); ctx.stroke(); ctx.setLineDash([]);
      // 수은 그릇
      ctx.fillStyle = '#e2e8f0'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(110, 270); ctx.lineTo(118, 326); ctx.lineTo(332, 326); ctx.lineTo(340, 270); ctx.stroke();
      const mg = ctx.createLinearGradient(0, surf, 0, 326); mg.addColorStop(0, '#d4d8de'); mg.addColorStop(1, '#8a929c');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.moveTo(114, surf); ctx.lineTo(117, 324); ctx.lineTo(333, 324); ctx.lineTo(336, surf); ctx.closePath(); ctx.fill();
      // 유리관 (아래 끝이 그릇 속에 잠겨 있어요)
      ctx.save(); ctx.translate(bx, surf + 18); ctx.rotate(th);
      const L = 100 * K, ml = (s.hh / Math.cos(th)) * K + 18;
      const hg = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0); hg.addColorStop(0, '#9aa3ad'); hg.addColorStop(0.45, '#eef1f4'); hg.addColorStop(1, '#7c8590');
      ctx.fillStyle = hg; ctx.fillRect(-tw / 2, -ml, tw, ml);
      ctx.fillStyle = 'rgba(219,234,254,.55)'; ctx.fillRect(-tw / 2, -L - 18, tw, L + 18 - ml);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-tw / 2 - 2, 0); ctx.lineTo(-tw / 2 - 2, -L - 18); ctx.arc(0, -L - 18, tw / 2 + 2, Math.PI, 0); ctx.lineTo(tw / 2 + 2, 0); ctx.stroke();
      ctx.restore();
      // 기압 화살표 (수은면을 누르는 공기)
      ctx.fillStyle = '#2563eb'; ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 4;
      [130, 318].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 236); ctx.lineTo(x, 270); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 9, 268); ctx.lineTo(x + 9, 268); ctx.lineTo(x, 284); ctx.closePath(); ctx.fill(); });
      // 이름표
      ctx.textBaseline = 'middle'; ctx.font = F(20);
      ctx.fillStyle = '#2563eb'; ctx.textAlign = 'center'; ctx.fillText('기압', 130, 220);
      ctx.fillStyle = '#dc2626'; ctx.textAlign = 'left'; ctx.fillText('수직', 486, (hy + surf) / 2 - 14); ctx.fillText('높이', 486, (hy + surf) / 2 + 14);
      ctx.fillStyle = '#334155'; ctx.fillText('수은', 360, 306);
      const tx = bx + Math.sin(th) * (100 * K + 18) + tw / 2 + 14, ty = surf + 18 - Math.cos(th) * (100 * K + 4);
      ctx.fillStyle = '#475569'; ctx.fillText('진공', tx, Math.max(24, ty));
      ctx.textAlign = 'right'; ctx.fillStyle = '#1f2937'; ctx.font = F(22);
      ctx.fillText(s.place === 'sea' ? '해수면' : '높은 산', 584, 30);
    },
  });
})();
