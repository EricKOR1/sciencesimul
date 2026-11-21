/* 중1 Ⅲ. 열 - 비열과 열팽창 [9과03-03] · 더 탐구하기
   비열의 생활 활용: 같은 양의 뜨거운 국(90 °C)을 질량이 같은 뚝배기와 금속(철) 냄비에 담아 두고, 시간이 지나며 식는 모습을 비교해요.
   비열이 큰 뚝배기는 국과 함께 데워진 그릇이 열을 더 많이 품고 있어서 국이 천천히 식어요.
   ※ 열량 계산(Q = cmΔT)은 다루지 않아요. 온도는 읽기만 해요.
   모형(예시 값): 국 200 g(비열 1.00), 그릇 1.5 kg, 비열 뚝배기 약 0.20 · 철 0.11 kcal/(kg·°C)
   그릇+국이 함께 식는다고 보고 T(t) = 20 + 70 × exp(−k·t / C),  C = 0.2 + 1.5 × 그릇의 비열,  k = 0.0229 (두 그릇 같음, 분 단위)
   ※ 실제 뚝배기는 열을 잘 전달하지 않는 성질도 함께 작용해요. 여기서는 비열 차이만 비교해요. */
(function () {
  'use strict';
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const ROOM = 20, T0 = 90, K = 0.0229;
  const CAP = { ttuk: 0.2 + 1.5 * 0.2, metal: 0.2 + 1.5 * 0.11 };
  const temp = (kind, t) => ROOM + (T0 - ROOM) * Math.exp(-K * t / CAP[kind]);

  function soupColor(T) {
    const p = Math.max(0, Math.min(1, (T - 30) / 60));
    const r = Math.round(236 - 10 * p), g = Math.round(200 - 110 * p), b = Math.round(150 - 110 * p);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function tag(ctx, text, x, y, color) {
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 22;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 18, w, 36, 10); ctx.fill();
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function steam(ctx, cx, top, T, t) {
    const n = Math.max(0, Math.round((T - 35) / 11));
    ctx.lineWidth = 5; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = cx - 55 + i * 22, ph = t * 2 + i * 1.7;
      ctx.strokeStyle = 'rgba(148,163,184,' + (0.25 + 0.1 * (i % 2)) + ')';
      ctx.beginPath();
      for (let y = 0; y <= 60; y += 6) { const xx = x + Math.sin(ph + y / 12) * 7; if (y === 0) ctx.moveTo(xx, top - 8 - y); else ctx.lineTo(xx, top - 8 - y); }
      ctx.stroke();
    }
  }
  function thermo(ctx, x, T, color) {
    const top = 70, bot = 250, h = bot - top;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x - 11, top, 22, h, 11); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, bot + 14, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const lv = bot - h * (T - 10) / 90;
    ctx.fillStyle = color; ctx.fillRect(x - 6, lv, 12, bot - lv + 10);
    ctx.beginPath(); ctx.arc(x, bot + 14, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
    for (let v = 20; v <= 90; v += 10) { const y = bot - h * (v - 10) / 90; ctx.beginPath(); ctx.moveTo(x + 13, y); ctx.lineTo(x + 22, y); ctx.stroke(); }
  }

  SciSim.extraLab({
    id: 'soupcool', step: 4, icon: '🔎', title: '천천히 식는 뚝배기',
    intro: '90 °C 국을 뚝배기와 금속 냄비에 똑같이 담았어요. 시간이 지나면 어느 쪽이 더 따뜻할까요?',
    size: [600, 340],
    controls: [
      { key: 't', type: 'range', label: '지난 시간', min: 0, max: 30, step: 1, value: 0, fmt: (v) => String(Math.round(v)), unit: '분' },
      { key: 'play', type: 'button', primary: true, label: '▶ 시간 흐르기', onClick(s, lab) { if (s.t >= 30) lab.set('t', 0); s.tt = s.t; s.lab = lab; s.run = true; } },
      { key: 'reset', type: 'button', label: '↺ 처음으로', onClick(s, lab) { s.run = false; lab.set('t', 0); } },
    ],
    readouts: [{ key: 'a', label: '뚝배기 속 국' }, { key: 'b', label: '금속 냄비 속 국' }, { key: 'd', label: '온도 차' }],
    init(s) { s.run = false; s.tt = 0; },
    onChange(key, v, s) { if (key === 't') s.run = false; },
    step(s, dt) {
      if (!s.run || !s.lab) return;
      s.tt = Math.min(30, s.tt + dt * 3);
      if (Math.floor(s.tt) !== s.t) s.lab.set('t', Math.floor(s.tt));
      if (s.tt >= 30) s.run = false;
    },
    read(s) {
      const tm = Math.round(s.t), a = Math.round(temp('ttuk', tm)), b = Math.round(temp('metal', tm));
      return { a: a + ' °C', b: b + ' °C', d: (a - b) + ' °C' };
    },
    draw(ctx, W, H, s, t) {
      ctx.fillStyle = '#f7f4ef'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#d6c3a5'; ctx.fillRect(0, 262, W, H - 262);
      ctx.fillStyle = '#c4ad8a'; ctx.fillRect(0, 262, W, 8);
      const tm = s.run ? s.tt : s.t, Ta = temp('ttuk', tm), Tb = temp('metal', tm);
      // 뚝배기 (왼쪽)
      let cx = 175;
      steam(ctx, cx, 168, Ta, t);
      ctx.fillStyle = '#5a3a2a'; ctx.beginPath();
      ctx.moveTo(cx - 105, 172); ctx.lineTo(cx + 105, 172); ctx.quadraticCurveTo(cx + 100, 262, cx + 60, 262); ctx.lineTo(cx - 60, 262); ctx.quadraticCurveTo(cx - 100, 262, cx - 105, 172); ctx.fill();
      ctx.fillStyle = '#3f281c'; ctx.beginPath(); ctx.ellipse(cx, 172, 105, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = soupColor(Ta); ctx.beginPath(); ctx.ellipse(cx, 174, 90, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b4a37'; ctx.fillRect(cx - 125, 186, 22, 12); ctx.fillRect(cx + 103, 186, 22, 12);
      tag(ctx, '뚝배기', cx, 300, '#5a3a2a');
      thermo(ctx, 30, Ta, '#dc2626');
      // 금속 냄비 (오른쪽)
      cx = 425;
      steam(ctx, cx, 168, Tb, t + 3);
      const mg = ctx.createLinearGradient(cx - 100, 0, cx + 100, 0); mg.addColorStop(0, '#9ca3af'); mg.addColorStop(0.45, '#e5e7eb'); mg.addColorStop(1, '#6b7280');
      ctx.fillStyle = mg; ctx.fillRect(cx - 95, 172, 190, 88);
      ctx.fillStyle = '#4b5563'; ctx.beginPath(); ctx.ellipse(cx, 172, 95, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = soupColor(Tb); ctx.beginPath(); ctx.ellipse(cx, 173, 88, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#374151'; ctx.fillRect(cx - 120, 182, 26, 10); ctx.fillRect(cx + 94, 182, 26, 10);
      tag(ctx, '금속 냄비', cx, 300, '#374151');
      thermo(ctx, 570, Tb, '#dc2626');
    },
  });
})();
