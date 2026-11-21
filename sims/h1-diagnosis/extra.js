/* 통합과학2 Ⅲ. 과학과 미래 사회 - 감염병 진단 기술 [10통과2-03-01] · 더 탐구하기
   감염 초기의 위음성: 감염 후 지난 날에 따라 몸속 바이러스 양이 달라지고, 검사마다 찾아낼 수 있는 최소량(검출 한계)이 달라요.
   PCR은 핵산을 늘려서 적은 양도 찾으므로 항원 검사보다 일찍 양성이 나오고, 항원 검사는 초기에 음성(위음성)이 나올 수 있어요.
   모형(예시 값, 실제 값은 사람과 병원체에 따라 달라요):
     바이러스 양(개/mL) = 10^L,  L = 2 + 감염 후 일수 (5일째까지),  L = 7 − 0.5 × (일수 − 5) (5일 뒤)
     검출 한계: PCR 10^3 개/mL, 항원 검사 10^5 개/mL  (바이러스 양이 검출 한계 이상이면 양성) */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const LIM = { pcr: 3, ag: 5 };
  const logV = (d) => (d <= 5 ? 2 + d : 7 - 0.5 * (d - 5));
  const amount = (L) => {
    const n = Math.pow(10, L);
    if (n >= 1e4) { const m = n / 1e4; return '약 ' + (m >= 100 ? Math.round(m / 10) * 10 : Math.round(m)) + '만'; }
    const p = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return '약 ' + (Math.round(n / p) * p).toLocaleString('ko-KR');
  };
  const GX = 70, GY = 30, GW = 340, GH = 250, LMAX = 8, DMAX = 14;
  const px = (d) => GX + d / DMAX * GW;
  const py = (L) => GY + GH - L / LMAX * GH;

  SciSim.extraLab({
    id: 'early', step: 3, icon: '🔎', title: '감염 초기의 검사',
    intro: '감염된 뒤 날이 지나면서 몸속 바이러스 양이 변해요. 같은 날 두 검사의 결과를 비교해요.',
    size: [600, 340],
    controls: [
      { key: 'day', type: 'range', label: '감염 후 지난 날', min: 0, max: 14, step: 1, value: 0, unit: '일', fmt: (v) => String(v) },
    ],
    readouts: [{ key: 'v', label: '바이러스 양' }, { key: 'pcr', label: 'PCR 검사' }, { key: 'ag', label: '항원 검사' }],
    init(s) { s.ds = s.day; },
    step(s, dt) { s.ds += (s.day - s.ds) * Math.min(1, dt * 6); },
    read(s) {
      const L = logV(s.day);
      return { v: amount(L) + ' 개/mL', pcr: L >= LIM.pcr ? '양성' : '음성', ag: L >= LIM.ag ? '양성' : '음성' };
    },
    draw(ctx, W, H, s) {
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      // 검출 한계 아래 영역 (찾지 못하는 구간)
      ctx.fillStyle = 'rgba(234,88,12,.10)'; ctx.fillRect(GX, py(LIM.ag), GW, py(0) - py(LIM.ag));
      ctx.fillStyle = 'rgba(37,99,235,.10)'; ctx.fillRect(GX, py(LIM.pcr), GW, py(0) - py(LIM.pcr));
      // 축
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(GX, GY); ctx.lineTo(GX, GY + GH); ctx.lineTo(GX + GW, GY + GH); ctx.stroke();
      // 검출 한계 선
      const lim = (L, col, txt) => {
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([10, 7]);
        ctx.beginPath(); ctx.moveTo(GX, py(L)); ctx.lineTo(GX + GW, py(L)); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = FONT(20); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = col; ctx.fillText(txt, GX + 160, py(L) + 5);
      };
      lim(LIM.ag, '#c2410c', '항원 검사 한계');
      lim(LIM.pcr, '#1d4ed8', 'PCR 한계');
      // 바이러스 양 곡선
      ctx.strokeStyle = '#be123c'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
      ctx.beginPath(); for (let d = 0; d <= DMAX; d += 0.25) { const x = px(d), y = py(logV(d)); if (d === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      // 오늘 표시
      const x = px(s.ds), y = py(logV(s.ds));
      ctx.strokeStyle = 'rgba(15,23,42,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x, GY + GH); ctx.stroke();
      ctx.fillStyle = '#be123c'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      // 축 이름
      ctx.fillStyle = '#334155'; ctx.font = FONT(20); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('감염 후 일수 →', GX + GW / 2, GY + GH + 10);
      ctx.save(); ctx.translate(GX - 22, GY + GH / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText('바이러스 양 →', 0, 0); ctx.restore();
      // 오른쪽: 두 검사 결과 그림
      const L = logV(s.day), pcrPos = L >= LIM.pcr, agPos = L >= LIM.ag;
      // PCR 결과 (형광 신호)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#334155'; ctx.fillText('PCR', 470, 40);
      ctx.fillStyle = pcrPos ? '#22c55e' : '#e2e8f0';
      ctx.beginPath(); ctx.moveTo(452, 62); ctx.lineTo(488, 62); ctx.lineTo(482, 140); ctx.quadraticCurveTo(470, 156, 458, 140); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.stroke();
      if (pcrPos) { ctx.fillStyle = 'rgba(34,197,94,.25)'; ctx.beginPath(); ctx.arc(470, 108, 40, 0, Math.PI * 2); ctx.fill(); }
      // 항원 검사 키트 (C선은 늘 보이고, T선은 양성일 때만)
      ctx.fillStyle = '#334155'; ctx.fillText('항원 검사', 545, 40);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(520, 60, 50, 230, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(530, 110, 30, 120);
      ctx.fillStyle = '#b91c1c'; ctx.fillRect(530, 140, 30, 6);
      if (agPos) ctx.fillRect(530, 190, 30, 6);
      ctx.fillStyle = '#334155'; ctx.textAlign = 'left'; ctx.fillText('C', 576, 143); ctx.fillText('T', 576, 193);
      ctx.textAlign = 'center'; ctx.font = FONT(22);
      ctx.fillStyle = pcrPos ? '#15803d' : '#64748b'; ctx.fillText(pcrPos ? '양성' : '음성', 470, 190);
      ctx.fillStyle = agPos ? '#b91c1c' : '#64748b'; ctx.fillText(agPos ? '양성' : '음성', 545, 314);
    },
  });
})();
