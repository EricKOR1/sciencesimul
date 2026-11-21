/* 물리학 Ⅱ. 전기와 자기 - 전기장과 전위차 [12물리02-01] · 더 탐구하기
   번개의 에너지: 구름과 땅 사이의 전위차 V와 번개로 이동한 전하량 q를 바꾸면 전기 에너지 W = qV가 달라져요.
   모형: W = qV (단원 3단계의 식). 값의 범위는 단원의 예(전위차 약 10⁸ V = 1억 V, 이동 전하 약 15 C → 약 10⁹ J)에 맞춘 예시 값이에요.
   비교: 100 W 전구를 켤 수 있는 시간 = W ÷ 100 W (초) ÷ 86400 (일).
   ※ 전기장 E의 정량 계산, 쿨롱 법칙의 식은 다루지 않아요. */
(function () {
  'use strict';
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const WMAX = 5e8 * 30;
  const model = (s) => { const W = s.q * s.v * 1e8; return { W, days: W / 100 / 86400 }; };
  const eok = (W) => { const e = W / 1e8; return (e < 100 ? e.toFixed(e % 1 ? 1 : 0) : Math.round(e).toLocaleString('ko-KR')) + '억 J'; };
  const sci = (W) => { const p = Math.floor(Math.log10(W)); return (W / 10 ** p).toFixed(1) + ' × 10' + String(p).split('').map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('') + ' J'; };
  const bolt = [[0, 0], [-26, 46], [10, 60], [-34, 118], [6, 128], [-22, 186]];

  SciSim.extraLab({
    id: 'bolt', icon: '🔎', title: '번개의 에너지',
    // step: 4단계부터 단추가 보여요.
    step: 4,
    tick: function () {},
    intro: '구름과 땅 사이의 전위차와 번개로 옮겨 간 전하량을 바꿔 보세요. W = qV',
    size: [600, 340],
    controls: [
      { key: 'v', type: 'range', label: '구름과 땅의 전위차', min: 0.5, max: 5, step: 0.5, value: 1, fmt: (x) => x.toFixed(1), unit: '억 V' },
      { key: 'q', type: 'range', label: '이동한 전하량', min: 5, max: 30, step: 5, value: 15, unit: 'C' },
    ],
    readouts: [{ key: 'W', label: '번개의 전기 에너지' }, { key: 'sci', label: '지수로 쓰면' }, { key: 'days', label: '100 W 전구를 켤 시간' }],
    read(s) {
      const m = model(s);
      return { W: eok(m.W), sci: sci(m.W), days: '약 ' + Math.round(m.days).toLocaleString('ko-KR') + '일' };
    },
    draw(ctx, W, H, s, t) {
      const m = model(s), kq = (s.q - 5) / 25, kv = (s.v - 0.5) / 4.5;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#c7d2e3'); sky.addColorStop(1, '#eef2f7');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // 구름: 전위차가 클수록 어두워요
      const cg = Math.round(150 - 80 * kv);
      ctx.fillStyle = 'rgb(' + cg + ',' + (cg + 6) + ',' + (cg + 18) + ')';
      [[110, 64, 44], [170, 44, 54], [240, 52, 50], [300, 66, 40], [205, 70, 46]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillRect(80, 60, 240, 48);
      // 구름 아래쪽의 (−) 전하: 전하량에 비례해 늘어요
      const n = Math.round(s.q / 2.5);
      ctx.fillStyle = '#fde68a'; ctx.font = '800 24px "Pretendard Variable", Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) ctx.fillText('−', 100 + (i % 6) * 40, 78 + Math.floor(i / 6) * 16);
      // 땅과 (+) 전하
      ctx.fillStyle = '#6b8f4e'; ctx.fillRect(0, 290, 440, 50);
      ctx.fillStyle = '#b91c1c';
      for (let i = 0; i < n; i++) ctx.fillText('+', 40 + i * 30, 316);
      // 피뢰침이 달린 건물
      ctx.fillStyle = '#94a3b8'; ctx.fillRect(170, 250, 60, 40); ctx.fillStyle = '#475569'; ctx.fillRect(198, 214, 4, 36);
      // 번개: 굵기는 전하량, 빛나는 정도는 전위차
      const flash = 0.55 + 0.45 * Math.max(0, Math.sin(t * 3.2));
      const path = () => { ctx.beginPath(); bolt.forEach(([x, y], i) => { const px = 220 + x * 0.7, py = 110 + y * 0.56; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.lineTo(200, 214); };
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(253,224,71,' + (0.2 + 0.4 * kv) * flash + ')'; ctx.lineWidth = 16 + 30 * kv; path(); ctx.stroke();
      ctx.strokeStyle = 'rgba(250,204,21,' + flash + ')'; ctx.lineWidth = 4 + 12 * kq; path(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + flash + ')'; ctx.lineWidth = 2 + 4 * kq; path(); ctx.stroke();
      // 에너지 막대 W = qV
      const bx = 480, by0 = 300, bh = 250, h = Math.max(4, (bh - 6) * m.W / WMAX);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(bx, by0 - bh, 80, bh, 10); ctx.fill(); ctx.stroke();
      const g = ctx.createLinearGradient(0, by0, 0, by0 - bh); g.addColorStop(0, '#f59e0b'); g.addColorStop(1, '#dc2626');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(bx + 6, by0 - 3 - h, 68, h, 6); ctx.fill();
      ctx.font = FONT; ctx.fillStyle = '#1f2937'; ctx.textAlign = 'center';
      ctx.fillText('에너지', bx + 40, 26);
      ctx.fillStyle = '#ffffff'; ctx.fillText('구름', 205, 40);
      ctx.fillStyle = '#334155'; ctx.textAlign = 'left'; ctx.fillText('피뢰침', 236, 236);
    },
  });
})();
