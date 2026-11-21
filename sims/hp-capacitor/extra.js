/* 물리학 Ⅱ. 전기와 자기 - 축전기와 센서 [12물리02-03] · 더 탐구하기
   판 간격과 모이는 전하: 같은 전지(6 V)에 연결해도 두 판 사이의 간격이 좁을수록, 판이 넓을수록 판에 모이는 전하가 많아요.
   간격이 바뀌면 전하가 드나들어 도선에 전류가 흘러요. 콘덴서 마이크와 가속도 센서가 이 변화를 신호로 읽어요.
   모형(예시 값): 판에 모이는 전하(개) = 24 × 판의 넓이(1·2·3) ÷ 간격(mm), 반올림. 같은 전압에서 넓이에 비례, 간격에 반비례하는 방향만 보여 줘요.
   ※ 이 차시는 축전기의 식, 연결, 유전체를 다루지 않아요. 식이나 그 용어 없이 "모이는 전하가 많다/적다"로만 보여 줘요. */
(function () {
  'use strict';
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const AREA = { s: 1, m: 2, l: 3 }, ANAME = { s: '좁은 판', m: '보통 판', l: '넓은 판' };
  const count = (s) => Math.round(24 * AREA[s.area] / s.d);

  SciSim.extraLab({
    id: 'gap', icon: '🔎', title: '판 간격과 전하',
    // step: 4단계부터 단추가 보여요. 엔진이 step을 단계 번호와 애니메이션 함수로 함께 쓰므로 valueOf로 번호를 줘요.
    step: Object.assign(function (s, dt) { s.ph += dt * 5; }, { valueOf: () => 4 }),
    intro: '두 판을 6 V 전지에 연결했어요. 간격과 판의 넓이를 바꿔 모이는 전하를 세어 보세요.',
    size: [600, 340],
    controls: [
      { key: 'd', type: 'range', label: '두 판 사이의 간격', min: 2, max: 8, step: 1, value: 4, unit: 'mm' },
      { key: 'area', type: 'seg', label: '판의 넓이', options: [['s', '좁게'], ['m', '보통'], ['l', '넓게']], value: 'm' },
      { key: 'shake', type: 'toggle', label: '소리로 판 흔들기 (콘덴서 마이크)', value: false },
    ],
    readouts: [{ key: 'n', label: '한 판에 모인 전하' }, { key: 'cmp', label: '간격 4 mm · 보통 판과 비교' }, { key: 'i', label: '도선의 전류' }],
    init(s) { s.ph = 0; },
    read(s) {
      const n = count(s), ref = 12;
      return { n: '약 ' + n + '개', cmp: n > ref ? '더 많아요' : n < ref ? '더 적어요' : '같아요', i: s.shake ? '들어왔다 나갔다 해요 (신호)' : '흐르지 않아요' };
    },
    draw(ctx, W, H, s) {
      ctx.fillStyle = '#f6f8fb'; ctx.fillRect(0, 0, W, H);
      const n = count(s), ph = 40 + 60 * AREA[s.area];
      const wob = s.shake ? Math.sin(s.ph) * 10 : 0;
      const gap = 22 * s.d + wob, cx = 300, cy = 130;
      const xl = cx - gap / 2, xr = cx + gap / 2, top = cy - ph / 2;
      // 도선과 전지
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
      const bot = top + ph;
      ctx.beginPath(); ctx.moveTo(xl - 7, bot); ctx.lineTo(xl - 7, 268); ctx.lineTo(110, 268); ctx.lineTo(110, 312); ctx.lineTo(262, 312); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(xr + 7, bot); ctx.lineTo(xr + 7, 268); ctx.lineTo(490, 268); ctx.lineTo(490, 312); ctx.lineTo(340, 312); ctx.stroke();
      ctx.fillStyle = '#334155'; ctx.fillRect(262, 292, 8, 40); ctx.fillRect(330, 302, 10, 20);
      // 판
      ctx.fillStyle = '#f87171'; ctx.fillRect(xl - 14, top, 14, ph);
      ctx.fillStyle = '#60a5fa'; ctx.fillRect(xr, top, 14, ph);
      // 전하 표시: 판 안쪽 면에 모인 전하 (두 줄)
      ctx.font = '800 22px "Pretendard Variable", Pretendard, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const rows = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) {
        const col = i % 2, row = Math.floor(i / 2), y = top + (row + 0.5) * ph / rows;
        ctx.fillStyle = '#b91c1c'; ctx.fillText('+', xl - 14 - 12 - col * 16, y);
        ctx.fillStyle = '#1d4ed8'; ctx.fillText('−', xr + 14 + 12 + col * 16, y);
      }
      // 판 사이의 전기장 (옅은 선)
      ctx.strokeStyle = 'rgba(234,88,12,.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const y = top + (i + 0.5) * ph / 5; ctx.beginPath(); ctx.moveTo(xl + 4, y); ctx.lineTo(xr - 4, y); ctx.stroke(); }
      // 흔들 때: 전하가 드나들며 도선에 전류가 흘러요
      if (s.shake) {
        const dir = Math.cos(s.ph) > 0 ? 1 : -1, y = 312;
        ctx.strokeStyle = '#16a34a'; ctx.fillStyle = '#16a34a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        [180, 420].forEach((x0, k) => {
          const dd = k ? -dir : dir;
          ctx.beginPath(); ctx.moveTo(x0 - 26 * dd, y); ctx.lineTo(x0 + 22 * dd, y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x0 + 36 * dd, y); ctx.lineTo(x0 + 18 * dd, y - 10); ctx.lineTo(x0 + 18 * dd, y + 10); ctx.closePath(); ctx.fill();
        });
        ctx.font = FONT; ctx.fillText('전류', 180, y - 24);
      }
      ctx.font = FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#334155';
      ctx.fillText('전지', 300, 313);
      ctx.fillStyle = '#b91c1c'; ctx.fillText('(+)', 236, 290); ctx.fillStyle = '#1d4ed8'; ctx.fillText('(−)', 366, 290); ctx.fillStyle = '#334155';
      ctx.textAlign = 'left'; ctx.fillText(ANAME[s.area], 20, 26);
    },
  });
})();
