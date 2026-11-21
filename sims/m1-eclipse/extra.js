/* 중1 Ⅶ. 태양계 - 일식과 월식 [9과07-04] · 더 탐구하기
   개기 월식 때 달이 붉게 보이는 까닭: 지구 대기를 지나며 꺾인 햇빛 중 붉은빛이 지구의 그림자 속 달에 닿아요.
   지구 대기가 없다고 가정하면 그림자 속으로 들어가는 빛이 없어 달이 거의 보이지 않아요.
   ※ 빛이 꺾이는 정도·흩어짐의 원리는 다루지 않아요(정성적으로만). 크기·거리·대기 두께는 보기 쉽게 과장한 모형이에요. */
(function () {
  'use strict';
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const EX = 190, EY = 170, ER = 58, MX = 480, MR = 34;
  const POS = { out: 52, part: 120, total: 170 };
  const shadowR = (x) => ER - (x - EX) * 0.02;
  const stars = Array.from({ length: 40 }, (_, i) => ({ x: (i * 151) % 600, y: (i * 67) % 340, r: 1 + (i % 3) * 0.6 }));

  function tag(ctx, text, x, y, color, align) {
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 20;
    const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.beginPath(); ctx.roundRect(x0, y - 17, w, 34, 9); ctx.fill();
    ctx.fillStyle = color; ctx.fillText(text, x0 + w / 2, y);
  }

  SciSim.extraLab({
    id: 'redmoon', step: 3, icon: '🔎', title: '붉은 달의 비밀',
    intro: '지구 대기가 있을 때와 없을 때, 지구 그림자 속 달의 모습을 비교해요.',
    size: [600, 340],
    controls: [
      { key: 'air', type: 'seg', label: '지구 대기', options: [['on', '있음'], ['off', '없음 (가정)']], value: 'on' },
      { key: 'pos', type: 'seg', label: '달의 위치', options: [['out', '그림자 밖'], ['part', '일부만 들어감'], ['total', '모두 들어감']], value: 'total' },
    ],
    readouts: [{ key: 'kind', label: '월식' }, { key: 'color', label: '달의 모습' }, { key: 'light', label: '그림자 속 달에 닿는 빛' }],
    init(s) { s.my = POS[s.pos]; },
    tick(s, dt) { const t = POS[s.pos]; s.my += (t - s.my) * Math.min(1, dt * 4); },
    read(s) {
      const on = s.air === 'on';
      const kind = s.pos === 'out' ? '일어나지 않음 (보름달)' : s.pos === 'part' ? '부분 월식' : '개기 월식';
      const color = s.pos === 'out' ? '밝게 빛남' : s.pos === 'part' ? (on ? '가려진 쪽이 검붉음' : '가려진 쪽이 검음') : (on ? '붉게 보임' : '거의 안 보임');
      const light = s.pos === 'out' ? '햇빛이 바로 닿음' : on ? '대기에서 꺾인 붉은빛' : '닿는 빛이 없음';
      return { kind, color, light };
    },
    draw(ctx, W, H, s) {
      const on = s.air === 'on';
      ctx.fillStyle = '#0f1a33'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      stars.forEach((p) => { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
      // 햇빛 (왼쪽에서 오는 나란한 빛)
      const sg = ctx.createLinearGradient(0, 0, 90, 0); sg.addColorStop(0, 'rgba(255,214,90,.75)'); sg.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, 90, H);
      ctx.strokeStyle = 'rgba(255,224,130,.55)'; ctx.lineWidth = 3;
      [30, 70, 270, 310].forEach((y) => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
      // 지구의 그림자(본그림자)
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.beginPath(); ctx.moveTo(EX, EY - ER); ctx.lineTo(W, EY - shadowR(W)); ctx.lineTo(W, EY + shadowR(W)); ctx.lineTo(EX, EY + ER); ctx.closePath(); ctx.fill();
      if (on) {
        // 대기를 지나며 그림자 쪽으로 꺾이는 붉은빛
        ctx.fillStyle = 'rgba(220,70,40,.22)';
        ctx.beginPath(); ctx.moveTo(EX, EY - ER - 6); ctx.lineTo(W, EY - 18); ctx.lineTo(W, EY + 18); ctx.lineTo(EX, EY + ER + 6); ctx.closePath(); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = '#ff6a3d'; ctx.lineCap = 'round';
        [-1, 1].forEach((d) => {
          const y0 = EY + d * (ER + 8);
          ctx.strokeStyle = 'rgba(255,224,130,.9)'; ctx.beginPath(); ctx.moveTo(40, y0); ctx.lineTo(EX, y0); ctx.stroke();
          ctx.strokeStyle = '#ff6a3d'; ctx.beginPath(); ctx.moveTo(EX, y0); ctx.lineTo(W - 20, EY + d * 14); ctx.stroke();
        });
      } else {
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,224,130,.9)'; ctx.lineCap = 'round';
        [-1, 1].forEach((d) => { const y0 = EY + d * (ER + 8); ctx.beginPath(); ctx.moveTo(40, y0); ctx.lineTo(W - 20, y0); ctx.stroke(); });
      }
      // 지구 + 대기
      if (on) {
        const ag = ctx.createRadialGradient(EX, EY, ER, EX, EY, ER + 14); ag.addColorStop(0, 'rgba(120,190,255,.95)'); ag.addColorStop(1, 'rgba(120,190,255,0)');
        ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(EX, EY, ER + 14, 0, Math.PI * 2); ctx.fill();
      }
      const eg = ctx.createLinearGradient(EX - ER, 0, EX + ER, 0); eg.addColorStop(0, '#4f9be8'); eg.addColorStop(1, '#173b6b');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(EX, EY, ER, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(90,170,90,.85)';
      ctx.beginPath(); ctx.ellipse(EX - 18, EY - 14, 18, 12, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(EX + 10, EY + 20, 14, 10, -0.3, 0, Math.PI * 2); ctx.fill();
      // 달: 그림자 밖 부분은 밝게, 그림자 속 부분은 대기가 있으면 붉게, 없으면 거의 검게
      const my = s.my, sr = shadowR(MX);
      ctx.save(); ctx.beginPath(); ctx.arc(MX, my, MR, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#f4ead0'; ctx.fillRect(MX - MR, my - MR, MR * 2, MR * 2);
      ctx.fillStyle = on ? '#b4432a' : '#161c2b';
      ctx.fillRect(MX - MR, EY - sr, MR * 2, sr * 2);
      ctx.fillStyle = 'rgba(0,0,0,.12)';
      ctx.beginPath(); ctx.arc(MX - 10, my - 8, 8, 0, Math.PI * 2); ctx.arc(MX + 12, my + 10, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (!on && s.pos !== 'out') {
        ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(MX, my, MR, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      // 이름표
      tag(ctx, '햇빛 →', 12, EY, '#a16207', 'left');
      tag(ctx, '지구', EX, EY + ER + 44, '#1e3a8a');
      tag(ctx, '달', MX + MR + 34, my, '#334155');
      if (on) tag(ctx, '지구 대기', EX, EY - ER - 40, '#0369a1');
      tag(ctx, '지구의 그림자', W - 12, H - 24, '#334155', 'right');
    },
  });
})();
