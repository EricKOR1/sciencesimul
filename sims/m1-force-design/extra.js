/* 중1 Ⅴ. 힘의 작용 - 힘의 평형과 장치 설계 [9과05-04] · 더 탐구하기
   마찰력의 한계: 상자를 미는 힘을 키우면 정지해 있는 동안 마찰력도 같은 크기로 커져 평형을 이뤄요.
   마찰력이 낼 수 있는 한계를 넘으면 평형이 깨지고 상자가 움직이기 시작해요.
   ※ 최대 정지 마찰력·운동 마찰력이라는 용어와 계산은 다루지 않아요. 움직일 때의 마찰력은 "미는 힘보다 작다"고만 보여 줘요.
   모형(예시 값): 마찰력의 한계 = 거친 바닥 40 N, 매끄러운 바닥 15 N
   정지: 미는 힘 ≤ 한계 → 마찰력 = 미는 힘 / 움직임: 미는 힘 > 한계 */
(function () {
  'use strict';
  const LIMIT = { rough: 40, smooth: 15 };
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const moving = (s) => s.push > LIMIT[s.floor];

  function arrow(ctx, x0, y, len, color, dir) {
    if (len < 2) return;
    const x1 = x0 + dir * len, hw = 13;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1 - dir * 16, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - dir * 24, y - hw); ctx.lineTo(x1 - dir * 24, y + hw); ctx.closePath(); ctx.fill();
  }
  function tag(ctx, text, x, y, color) {
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 20;
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 17, w, 34, 9); ctx.fill();
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  SciSim.extraLab({
    id: 'friclimit', step: 3, icon: '🔎', title: '마찰력의 한계',
    intro: '상자를 미는 힘을 조금씩 키워 보세요. 마찰력은 어디까지 따라 커질까요?',
    size: [600, 340],
    controls: [
      { key: 'floor', type: 'seg', label: '바닥', options: [['rough', '거친 바닥'], ['smooth', '매끄러운 바닥']], value: 'rough' },
      { key: 'push', type: 'range', label: '상자를 미는 힘', min: 0, max: 60, step: 5, value: 20, fmt: (v) => String(v), unit: 'N' },
    ],
    readouts: [{ key: 'push', label: '미는 힘' }, { key: 'fric', label: '마찰력' }, { key: 'box', label: '상자' }],
    init(s) { s.x = 0; },
    onChange(key, v, s) { if (key === 'floor' || !moving(s)) s.x = 0; },
    tick(s, dt) {
      if (moving(s)) { s.x += dt * (40 + 6 * (s.push - LIMIT[s.floor])); if (s.x > 190) s.x = 0; }
      else s.x = 0;
    },
    read(s) {
      const m = moving(s);
      return {
        push: s.push + ' N',
        fric: m ? '미는 힘보다 작음' : s.push + ' N',
        box: m ? '움직이기 시작함' : s.push === LIMIT[s.floor] ? '정지 (한계에 다다름)' : '정지 (평형)',
      };
    },
    draw(ctx, W, H, s) {
      const rough = s.floor === 'rough', m = moving(s), lim = LIMIT[s.floor];
      ctx.fillStyle = '#f4f7fb'; ctx.fillRect(0, 0, W, H);
      // 바닥
      const fy = 250;
      ctx.fillStyle = rough ? '#b08a5c' : '#c9d6e3'; ctx.fillRect(0, fy, W, H - fy);
      if (rough) {
        ctx.fillStyle = '#8c6a42';
        for (let i = 0; i < 70; i++) { const x = (i * 89) % W, y = fy + 4 + ((i * 37) % 70); ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = '#7a5a36'; ctx.lineWidth = 3; ctx.beginPath();
        for (let x = 0; x <= W; x += 12) ctx.lineTo(x, fy + ((x / 12) % 2 ? 3 : -2)); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, fy, W, 6);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 6; i++) ctx.fillRect(40 + i * 100, fy + 30 + (i % 2) * 30, 60, 5);
      }
      // 상자
      const bw = 130, bh = 110, bx = 260 + s.x, by = fy - bh;
      ctx.fillStyle = '#d99a4e'; ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = '#a8692b'; ctx.lineWidth = 5; ctx.strokeRect(bx + 2.5, by + 2.5, bw - 5, bh - 5);
      ctx.beginPath(); ctx.moveTo(bx + 8, by + 8); ctx.lineTo(bx + bw - 8, by + bh - 8); ctx.moveTo(bx + bw - 8, by + 8); ctx.lineTo(bx + 8, by + bh - 8); ctx.stroke();
      ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#5b3410'; ctx.fillText('상자', bx + bw / 2, by + bh / 2);
      // 미는 힘 (왼쪽에서 오른쪽으로), 마찰력 (바닥 면에서 왼쪽으로): 1 N = 4 px
      const k = 4, pl = s.push * k, fl = m ? Math.max(0, lim * k - 20) : pl;
      arrow(ctx, bx - pl - 6, by + bh / 2, pl, '#2563eb', 1);
      arrow(ctx, bx + bw / 2, fy - 14, fl, '#dc2626', -1);
      if (s.push > 0) tag(ctx, '미는 힘', Math.max(70, bx - pl / 2 - 6), by + bh / 2 - 36, '#1d4ed8');
      if (fl > 0) tag(ctx, '마찰력', Math.max(60, bx + bw / 2 - fl / 2), fy + 30, '#b91c1c');
      // 바닥 이름, 상태
      tag(ctx, rough ? '거친 바닥' : '매끄러운 바닥', 100, fy + 62, '#334155');
      if (m) {
        ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.roundRect(W - 190, 30, 170, 42, 10); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = FONT; ctx.fillText('움직여요 →', W - 105, 51);
      } else {
        ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.roundRect(W - 190, 30, 170, 42, 10); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = FONT; ctx.fillText('정지', W - 105, 51);
      }
    },
  });
})();
