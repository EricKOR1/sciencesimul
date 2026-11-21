/* 세포와 물질대사 · 광합성 연구의 역사 [12세포03-08] · 더 탐구하기
   프리스틀리(1771)와 잉엔하우스(1779)의 밀폐 용기 실험: 촛불 · 쥐 · 식물 · 빛을 넣고 빼며 용기 속 공기가 어떻게 변하는지 봐요.
   ※ 쥐는 그림 속 모형이에요. 산소가 부족해지면 "숨쉬기 힘들어함"까지만 보여 줘요.
   모형(예시 값): 용기 속 산소 비율(%)이 처음 21 %에서 1분마다
     촛불 −0.8, 쥐 −0.3, 식물: 빛이 있으면 +1.0(광합성), 빛이 없으면 −0.1(호흡)  만큼 변해요. 21 %보다 높아지지 않아요.
     촛불은 산소가 16 % 아래로 내려가면 꺼지고(실제 촛불도 대략 이 정도에서 꺼져요), 쥐는 16 % 아래에서 숨쉬기 힘들어해요.
     0.01분 간격으로 계산해서 같은 조건이면 늘 같은 값이 나와요. */
(function () {
  'use strict';
  const T_END = 20, DT = 0.01, FULL = 21, LOW = 16;
  function simulate(st, t) {
    const s = has(st);
    let o = FULL, lit = s.candle, out = null, hard = null;
    const n = Math.round(t / DT);
    for (let i = 0; i < n; i++) {
      let r = 0;
      if (lit) r -= 0.8;
      if (s.mouse) r -= 0.3;
      if (s.plant) r += s.light ? 1.0 : -0.1;
      o = Math.min(FULL, o + r * DT);
      const now = (i + 1) * DT;
      if (lit && o < LOW) { lit = false; out = now; }
      if (s.mouse && hard == null && o < LOW) hard = now;
    }
    return { o, lit, out, hard };
  }
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const reset = (s) => { s.t = 0; s.run = false; };
  const has = (s) => ({ candle: s.what[0] === 'c', mouse: s.what[0] === 'm', plant: s.what.length > 1, light: s.light });

  SciSim.extraLab({
    id: 'belljar', step: 1, icon: '🔎', title: '밀폐 용기 실험',
    intro: '프리스틀리와 잉엔하우스처럼 유리 용기에 넣을 것을 고르고 20분 동안 지켜봐요.',
    size: [600, 340],
    controls: [
      { key: 'what', type: 'seg', label: '용기에 넣을 것', options: [['c', '🕯 촛불'], ['cp', '🕯 촛불 + 🌿 식물'], ['m', '🐭 쥐'], ['mp', '🐭 쥐 + 🌿 식물']], value: 'c' },
      { key: 'light', type: 'toggle', label: '☀️ 빛 비추기', value: true },
      { key: 'go', type: 'button', primary: true, label: '▶ 20분 지켜보기', onClick(s) { s.t = 0; s.run = true; } },
    ],
    readouts: [{ key: 't', label: '지난 시간' }, { key: 'o', label: '용기 속 산소' }, { key: 'res', label: '결과' }],
    init: reset,
    onChange(key, v, s) { reset(s); },
    tick(s, dt) { if (s.run) { s.t = Math.min(T_END, s.t + dt * 4); if (s.t >= T_END) s.run = false; } },
    read(st) {
      const s = has(st);
      const t = Math.round(st.t / DT) * DT, r = simulate(st, t), msg = [];
      if (s.candle) msg.push(r.lit ? '촛불이 계속 탐' : '촛불 꺼짐(' + r.out.toFixed(1) + '분)');
      if (s.mouse) msg.push(r.hard == null ? '쥐가 잘 지냄' : '쥐가 숨쉬기 힘들어함');
      return { t: t.toFixed(1) + ' 분', o: r.o.toFixed(1) + ' %', res: msg.join(' · ') || '—' };
    },
    draw(ctx, W, H, st, tt) {
      const r = simulate(st, Math.round(st.t / DT) * DT), s = has(st);
      // 배경: 빛이 있으면 밝게
      ctx.fillStyle = s.light ? '#fff7e0' : '#dfe5f0'; ctx.fillRect(0, 0, W, H);
      if (s.light) {
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(60, 60, 30, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(60 + Math.cos(a) * 38, 60 + Math.sin(a) * 38); ctx.lineTo(60 + Math.cos(a) * 50, 60 + Math.sin(a) * 50); ctx.stroke(); }
      }
      // 받침
      ctx.fillStyle = '#8b6b4a'; ctx.fillRect(110, 292, 340, 20);
      // 촛불
      if (s.candle) {
        ctx.fillStyle = '#f5f0e6'; ctx.fillRect(160, 220, 22, 72); ctx.strokeStyle = '#cbbfa8'; ctx.lineWidth = 2; ctx.strokeRect(160, 220, 22, 72);
        ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(171, 220); ctx.lineTo(171, 210); ctx.stroke();
        if (r.lit) {
          const f = 1 + 0.08 * Math.sin(tt * 17);
          ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.ellipse(171, 196, 9 * f, 18 * f, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.ellipse(171, 200, 5, 10, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = 'rgba(100,100,100,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(171, 208); ctx.bezierCurveTo(160, 190, 182, 175, 170, 155); ctx.stroke();
        }
      }
      // 식물
      if (s.plant) {
        ctx.fillStyle = '#b45309'; ctx.beginPath(); ctx.moveTo(240, 250); ctx.lineTo(296, 250); ctx.lineTo(288, 292); ctx.lineTo(248, 292); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#15803d'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(268, 250); ctx.lineTo(268, 160); ctx.stroke();
        ctx.fillStyle = s.light ? '#22c55e' : '#3f7a52';
        [[-1, 230], [1, 210], [-1, 188], [1, 168]].forEach(([d, y]) => { ctx.beginPath(); ctx.ellipse(268 + d * 22, y, 24, 10, d * -0.5, 0, Math.PI * 2); ctx.fill(); });
      }
      // 쥐
      if (s.mouse) {
        const hard = r.hard != null, by = hard ? 278 : 272 + Math.sin(tt * 6) * 2;
        ctx.fillStyle = '#9ca3af'; ctx.beginPath(); ctx.ellipse(370, by, 38, hard ? 14 : 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(404, by - 6, 16, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f9a8d4'; ctx.beginPath(); ctx.arc(400, by - 20, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(410, by - 8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(333, by + 4); ctx.quadraticCurveTo(310, by + 18, 296, by + 6); ctx.stroke();
      }
      // 유리 용기
      ctx.fillStyle = 'rgba(186,220,240,.25)'; ctx.strokeStyle = 'rgba(70,130,180,.85)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(125, 292); ctx.lineTo(125, 120); ctx.quadraticCurveTo(125, 60, 280, 60); ctx.quadraticCurveTo(435, 60, 435, 120); ctx.lineTo(435, 292); ctx.fill(); ctx.stroke();
      // 산소 막대
      const gx = 500, gy0 = 70, gy1 = 292, yOf = (v) => gy1 - (v / FULL) * (gy1 - gy0);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(gx, gy0, 48, gy1 - gy0);
      ctx.fillStyle = r.o < LOW ? '#ef4444' : '#38bdf8'; ctx.fillRect(gx, yOf(r.o), 48, gy1 - yOf(r.o));
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.strokeRect(gx, gy0, 48, gy1 - gy0);
      ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(gx - 8, yOf(LOW)); ctx.lineTo(gx + 56, yOf(LOW)); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1f2937';
      ctx.fillText('산소', gx + 24, gy0 - 22);
      ctx.fillText('유리 용기', 280, 34);
    },
  });
})();
