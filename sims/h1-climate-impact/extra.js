/* 통합과학2 Ⅱ. 환경과 에너지 - 엘니뇨·사막화와 대처 [10통과2-02-03] · 더 탐구하기
   사막화의 인위적 원인: 건조한 지역(1년 강수량 300 mm로 고정)에서 삼림 벌채, 과잉 경작, 과잉 방목을 늘리면
   식생이 줄고 흙이 드러나 사막화된 땅이 넓어지는 것을 보여 줘요.
   모형(예시 값, 교육용 단순화):
     식생 피복률(%) = 85 − 0.5 × 숲을 베어 낸 비율(%) − 경작(쉬어 가며 0, 과잉 경작 20) − 방목(알맞게 0, 과잉 방목 15)
     사막화 면적(%) = 70 − 식생 피복률 (0 % 아래는 0 %)
   ※ 기후 요인(가뭄)은 본 실험(풀밭 모형)에서 다뤄요. 여기서는 강수량을 고정하고 사람의 활동만 바꿔요. */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const FARM = { rest: 0, over: 20 };
  const GRAZE = { ok: 0, over: 15 };
  const coverOf = (s) => Math.max(5, 85 - 0.5 * s.cut - FARM[s.farm] - GRAZE[s.graze]);
  const desertOf = (s) => Math.max(0, 70 - coverOf(s));
  const COLS = 12, ROWS = 5, N = COLS * ROWS, TOP = 128;
  // 칸이 사막으로 바뀌는 순서: 오른쪽(사막 쪽)부터 (고정된 순서)
  const order = Array.from({ length: N }, (_, i) => i)
    .map((i) => ({ i, k: (COLS - 1 - (i % COLS)) * 10 + ((i * 7) % 9) }))
    .sort((a, b) => a.k - b.k).map((o) => o.i);
  const rank = new Array(N); order.forEach((c, r) => { rank[c] = r; });
  const dust = Array.from({ length: 26 }, (_, i) => ({ x: (i * 83) % 600, y: 40 + (i * 37) % 90, v: 60 + (i * 29) % 70 }));

  SciSim.extraLab({
    id: 'mandesert', step: 2, icon: '🔎', title: '사람이 만든 사막',
    intro: '비가 적은 땅(1년 강수량 300 mm)에서 숲을 베고, 밭을 쉬지 않고 갈고, 가축을 많이 풀면 땅이 어떻게 변할까요?',
    size: [600, 340],
    controls: [
      { key: 'cut', type: 'range', label: '숲을 베어 낸 비율', min: 0, max: 80, step: 10, value: 0, unit: '%', fmt: (v) => String(v) },
      { key: 'farm', type: 'seg', label: '밭 경작', options: [['rest', '쉬어 가며'], ['over', '과잉 경작']], value: 'rest' },
      { key: 'graze', type: 'seg', label: '가축 방목', options: [['ok', '알맞게'], ['over', '과잉 방목']], value: 'ok' },
    ],
    readouts: [{ key: 'cover', label: '식생 피복률' }, { key: 'desert', label: '사막화 면적' }, { key: 'note', label: '땅의 모습' }],
    init(s) { s.vs = coverOf(s); s.ds = desertOf(s); },
    tick(s, dt) {
      const k = Math.min(1, dt * 3);
      s.vs += (coverOf(s) - s.vs) * k; s.ds += (desertOf(s) - s.ds) * k;
      dust.forEach((d) => { d.x += d.v * dt; if (d.x > 620) d.x = -20; });
    },
    read(s) {
      const v = coverOf(s), d = desertOf(s);
      const note = d === 0 ? '풀과 나무가 덮인 땅' : d < 30 ? '흙이 드러나기 시작함' : d < 50 ? '사막이 넓어짐' : '대부분 사막으로 변함';
      return { cover: Math.round(v) + ' %', desert: Math.round(d) + ' %', note };
    },
    draw(ctx, W, H, s) {
      const nDes = Math.round(s.ds / 100 * N), nVeg = Math.round(s.vs / 100 * N);
      // 하늘: 사막이 넓을수록 누렇게
      const q = Math.min(1, s.ds / 60);
      const g = ctx.createLinearGradient(0, 0, 0, TOP);
      g.addColorStop(0, q > 0.4 ? '#e9dcc0' : '#cfe3f7'); g.addColorStop(1, q > 0.4 ? '#f3ead6' : '#eaf3fb');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, TOP);
      ctx.fillStyle = '#f6c343'; ctx.beginPath(); ctx.arc(540, 44, 24, 0, Math.PI * 2); ctx.fill();
      // 땅 칸
      const cw = W / COLS, ch = (H - TOP) / ROWS;
      for (let c = 0; c < N; c++) {
        const x = (c % COLS) * cw, y = TOP + Math.floor(c / COLS) * ch, r = rank[c];
        const desert = r < nDes, veg = r >= N - nVeg;
        ctx.fillStyle = desert ? '#ecd49a' : veg ? ((c * 5) % 3 ? '#79b85a' : '#6aab4d') : '#c9a46e';
        ctx.fillRect(x, y, cw + 1, ch + 1);
        if (desert) {
          ctx.strokeStyle = 'rgba(160,120,60,.55)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x + 8, y + ch * 0.6); ctx.quadraticCurveTo(x + cw / 2, y + ch * 0.3, x + cw - 6, y + ch * 0.62); ctx.stroke();
        } else if (veg) {
          ctx.strokeStyle = '#3f7d2c'; ctx.lineWidth = 2;
          for (let j = 0; j < 3; j++) { const gx = x + 10 + j * 14; ctx.beginPath(); ctx.moveTo(gx, y + ch - 8); ctx.lineTo(gx - 3, y + ch - 20); ctx.moveTo(gx, y + ch - 8); ctx.lineTo(gx + 4, y + ch - 19); ctx.stroke(); }
        } else {
          ctx.strokeStyle = 'rgba(110,80,40,.5)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x + 12, y + 10); ctx.lineTo(x + 22, y + ch / 2); ctx.lineTo(x + 16, y + ch - 8); ctx.stroke();
        }
      }
      // 밭 고랑 (왼쪽 가운데): 과잉 경작이면 흙이 드러난 고랑이 더 많아요
      const fx = 2 * cw, fy = TOP + 2 * ch, fw = 3 * cw, fh = 2 * ch;
      ctx.fillStyle = s.farm === 'over' ? '#b98d55' : '#8fbf5f'; ctx.fillRect(fx, fy, fw, fh);
      ctx.strokeStyle = s.farm === 'over' ? '#8a6232' : '#4f8a34'; ctx.lineWidth = 4;
      for (let j = 1; j < 6; j++) { ctx.beginPath(); ctx.moveTo(fx + 6, fy + j * fh / 6); ctx.lineTo(fx + fw - 6, fy + j * fh / 6); ctx.stroke(); }
      // 숲: 8그루 중 베어 낸 만큼 그루터기
      const nTree = 8, left = Math.round(nTree * (1 - s.cut / 100));
      for (let i = 0; i < nTree; i++) {
        const tx = 26 + i * 44, ty = TOP + 6;
        ctx.fillStyle = '#7a5230';
        if (i < left) {
          ctx.fillRect(tx - 4, ty - 26, 8, 28);
          ctx.fillStyle = '#2f7d3a'; ctx.beginPath(); ctx.arc(tx, ty - 40, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3c9447'; ctx.beginPath(); ctx.arc(tx - 6, ty - 46, 12, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillRect(tx - 7, ty - 8, 14, 10);
          ctx.fillStyle = '#c99a62'; ctx.beginPath(); ctx.ellipse(tx, ty - 8, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      // 가축 (양)
      const nSheep = s.graze === 'over' ? 9 : 3;
      for (let i = 0; i < nSheep; i++) {
        const sx = 330 + (i % 5) * 52 + (i >= 5 ? 26 : 0), sy = TOP + 2.4 * ch + (i >= 5 ? 50 : 0);
        ctx.fillStyle = '#fafafa'; ctx.beginPath(); ctx.ellipse(sx, sy, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(sx + 17, sy - 5, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(sx - 10, sy + 9, 3, 8); ctx.fillRect(sx + 7, sy + 9, 3, 8);
      }
      // 흙먼지 (황사): 사막이 넓을수록 많아요
      const nd = Math.round(dust.length * Math.min(1, s.ds / 50));
      ctx.fillStyle = 'rgba(176,132,70,.55)';
      for (let i = 0; i < nd; i++) { const d = dust[i]; ctx.beginPath(); ctx.arc(d.x, d.y, 5 + (i % 3) * 3, 0, Math.PI * 2); ctx.fill(); }
      // 이름표
      ctx.font = FONT(20); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      const tag = (t, x, y) => { const w = ctx.measureText(t).width + 18; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 15, w, 30, 8); ctx.fill(); ctx.fillStyle = '#1f2937'; ctx.fillText(t, x, y); };
      tag('숲', 200, 30);
      tag('밭', fx + fw / 2, fy + fh / 2);
      if (s.ds > 6) tag('사막화된 땅', W - 80, TOP + ch * 0.5);
    },
  });
})();
