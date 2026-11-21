/* 중3 Ⅴ. 자극과 반응 - 감각 기관과 자극의 전달 [9과20-01] · 더 탐구하기
   후각의 피로: 같은 냄새를 계속 맡으면 냄새 입자는 그대로 들어오는데도 점점 덜 느껴져요(후각 세포가 쉽게 피로해짐).
   이때 다른 냄새로 바꾸면 그 냄새는 바로 강하게 느껴져요.
   ※ 후각 세포의 피로 원리(분자 수준)는 다루지 않아요. 피로가 회복되는 과정도 여기서는 다루지 않아요.
   모형(예시 값): 느끼는 세기(%) = 100 × (0.2 + 0.8 × exp(−t / 2)),  t = 그 냄새를 계속 맡은 시간(분), 냄새마다 따로 셈 */
(function () {
  'use strict';
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const feel = (t) => 100 * (0.2 + 0.8 * Math.exp(-t / 2));
  const SM = { coffee: { name: '커피', dot: '#7c4a1d' }, lemon: { name: '레몬', dot: '#eab308' } };
  const parts = Array.from({ length: 16 }, (_, i) => ({ p: i / 16, w: (i * 37) % 11 - 5 }));

  function tag(ctx, text, x, y, color) {
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 20;
    ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 17, w, 34, 9); ctx.fill();
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  SciSim.extraLab({
    id: 'smelltire', step: 3, icon: '🔎', title: '후각의 피로',
    intro: '같은 냄새를 계속 맡으면 어떻게 될까요? 1분씩 맡아 보고, 다른 냄새로도 바꿔 보세요.',
    size: [600, 340],
    controls: [
      { key: 'sm', type: 'seg', label: '맡는 냄새', options: [['coffee', '☕ 커피'], ['lemon', '🍋 레몬']], value: 'coffee' },
      { key: 'go', type: 'button', primary: true, label: '▶ 1분 맡기', onClick(s) { s.goal[s.sm] = Math.min(10, Math.round(s.goal[s.sm]) + 1); } },
      { key: 'reset', type: 'button', label: '↺ 처음으로', onClick(s) { s.goal = { coffee: 0, lemon: 0 }; s.t = { coffee: 0, lemon: 0 }; } },
    ],
    readouts: [{ key: 'name', label: '지금 맡는 냄새' }, { key: 'time', label: '계속 맡은 시간' }, { key: 'feel', label: '느끼는 세기' }],
    init(s) { s.t = { coffee: 0, lemon: 0 }; s.goal = { coffee: 0, lemon: 0 }; },
    tick(s, dt) {
      Object.keys(s.t).forEach((k) => { if (s.t[k] < s.goal[k]) s.t[k] = Math.min(s.goal[k], s.t[k] + dt * 1.2); });
      parts.forEach((q) => { q.p += dt * 0.35; if (q.p > 1) q.p -= 1; });
    },
    read(s) {
      const t = s.t[s.sm];
      return { name: SM[s.sm].name, time: (Math.round(t * 10) / 10).toFixed(t % 1 ? 1 : 0) + ' 분', feel: Math.round(feel(t)) + ' %' };
    },
    draw(ctx, W, H, s, time) {
      const f = feel(s.t[s.sm]) / 100, sm = SM[s.sm];
      ctx.fillStyle = '#f6f8fc'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#e5e7eb'; ctx.fillRect(0, 280, 180, 60);
      // 냄새를 내는 물체
      if (s.sm === 'coffee') {
        ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.ellipse(80, 280, 62, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(40, 215); ctx.lineTo(120, 215); ctx.lineTo(112, 275); ctx.lineTo(48, 275); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(125, 240, 14, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.fillStyle = '#6b3f1d'; ctx.beginPath(); ctx.ellipse(80, 217, 38, 6, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.ellipse(80, 248, 52, 34, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#eab308'; ctx.beginPath(); ctx.ellipse(130, 248, 9, 7, 0, 0, Math.PI * 2); ctx.ellipse(30, 248, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(64, 234, 16, 7, -0.3, 0, Math.PI * 2); ctx.fill();
      }
      tag(ctx, sm.name, 80, 312, '#334155');
      // 냄새 입자: 늘 같은 양이 코로 들어가요
      ctx.fillStyle = sm.dot;
      parts.forEach((q) => {
        const x = 80 + q.p * 140, y = 205 - q.p * 30 + Math.sin(q.p * 9 + q.w) * 12;
        ctx.globalAlpha = q.p < 0.1 ? q.p * 10 : q.p > 0.9 ? (1 - q.p) * 10 : 1;
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      // 머리 (왼쪽을 바라봐요)
      const hx = 345, hy = 185;
      ctx.fillStyle = '#f5d0a9'; ctx.beginPath(); ctx.arc(hx, hy, 108, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(250, 140); ctx.lineTo(216, 192); ctx.lineTo(250, 200); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3f2a1d'; ctx.beginPath(); ctx.arc(hx, hy, 110, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(hx + 100, hy - 30); ctx.quadraticCurveTo(hx, hy - 80, hx - 98, hy - 40); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(282, 132, 6, 0, Math.PI * 2); ctx.fill();
      // 대뇌: 신호가 셀수록 밝게
      ctx.fillStyle = 'rgba(236,72,153,' + (0.15 + 0.75 * f) + ')';
      ctx.beginPath(); ctx.ellipse(hx + 22, hy - 42, 62, 34, 0, 0, Math.PI * 2); ctx.fill();
      // 후각 세포(코 안 천장)와 후각 신경: 대뇌로 가는 신호(파란 점)는 느끼는 세기가 셀수록 많고 빨라요
      const P0 = [256, 172], P1 = [300, 196], P2 = [330, 166];
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.quadraticCurveTo(P1[0], P1[1], P2[0], P2[1]); ctx.stroke();
      ctx.fillStyle = '#16a34a'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(240 + i * 6, 176 - i * 2, 4, 0, Math.PI * 2); ctx.fill(); }
      const np = Math.max(1, Math.round(4 * f));
      for (let i = 0; i < np; i++) {
        const u = ((time * (0.3 + 0.6 * f)) + i / np) % 1, a = 1 - u;
        const x = a * a * P0[0] + 2 * a * u * P1[0] + u * u * P2[0], y = a * a * P0[1] + 2 * a * u * P1[1] + u * u * P2[1];
        ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      }
      tag(ctx, '대뇌', hx + 22, hy - 42, '#9d174d');
      tag(ctx, '코', 214, 228, '#334155');
      // 느끼는 세기 막대
      const mx = 520, top = 70, bot = 290;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(mx, top, 46, bot - top, 10); ctx.fill(); ctx.stroke();
      const lv = bot - (bot - top) * f;
      ctx.fillStyle = f > 0.6 ? '#16a34a' : f > 0.35 ? '#f59e0b' : '#94a3b8';
      ctx.beginPath(); ctx.roundRect(mx + 5, lv, 36, bot - lv - 5, 7); ctx.fill();
      tag(ctx, '느끼는 세기', 535, 36, '#334155');
    },
  });
})();
