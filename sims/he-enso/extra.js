/* 지구과학 · 용승과 엘니뇨-남방진동 [12지구01-05] · 더 탐구하기
   남방진동: 동태평양 수온이 평년보다 높아지면(엘니뇨) 타히티(동태평양) 기압은 낮아지고 다윈(서태평양) 기압은 높아져
   남방진동 지수(타히티 − 다윈)가 음이 될 수 있어요. 라니냐 때는 반대로 기압차가 커져요.
   화살표는 동 → 서로 부는 무역풍이고, 길이는 기압차에 비례해요(기압차가 0 이하이면 그리지 않아요).
   모형(예시 값, sim.js의 표와 같음): 동태평양 수온 편차 −1.6 °C(라니냐) · 0(정상) · +2.4 °C(엘니뇨) 세 점 사이를 직선으로 이어요.
     타히티 1015.5 · 1013.5 · 1011.0 hPa, 다윈 1008.0 · 1009.5 · 1011.5 hPa
     남방진동 지수 = 타히티 해면 기압 − 다윈 해면 기압 (+7.5 · +4.0 · −0.5 hPa)
     엘니뇨·라니냐 판정: 수온 편차 +0.5 °C 이상 / −0.5 °C 이하 (차시와 같은 기준) */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const TAH = [1015.5, 1013.5, 1011.0], DAR = [1008.0, 1009.5, 1011.5];
  const pOf = (dev) => (dev >= 0 ? dev / 2.4 : dev / 1.6);
  const at = (arr, p) => (p >= 0 ? arr[1] + (arr[2] - arr[1]) * p : arr[1] + (arr[0] - arr[1]) * -p);
  const r1 = (x) => Math.round(x * 10) / 10;
  const tahOf = (s) => r1(at(TAH, pOf(s.dev)));
  const darOf = (s) => r1(at(DAR, pOf(s.dev)));
  const soiOf = (s) => r1(tahOf(s) - darOf(s));
  const fmt = (x) => x.toFixed(1);
  const stateOf = (s) => (s.dev >= 0.5 ? '엘니뇨' : s.dev <= -0.5 ? '라니냐' : '정상');
  const sgn = (x) => (x > 0 ? '+' : x < 0 ? '−' : '');

  function label(ctx, txt, x, y, bg, fg) {
    ctx.font = FONT(20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 18;
    ctx.fillStyle = bg || 'rgba(255,255,255,.93)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 16, w, 32, 8); ctx.fill();
    ctx.fillStyle = fg || '#1f2937'; ctx.fillText(txt, x, y + 1);
  }
  function gauge(ctx, x, p, name, col) {
    const y0 = 70, y1 = 200, h = y1 - y0, f = (p - 1007) / (1016 - 1007);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - 26, y0 - 4, 52, h + 8, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(x - 20, y1 - h * f, 40, h * f);
    label(ctx, name, x, y0 - 28);
  }

  SciSim.extraLab({
    id: 'soi', step: 4, icon: '🔎', title: '타히티와 다윈 기압',
    intro: '동태평양 수온이 바뀔 때 두 곳의 기압과 남방진동 지수가 어떻게 바뀌는지 봐요.',
    size: [600, 340],
    controls: [
      { key: 'dev', type: 'range', label: '동태평양 수온 편차', min: -1.6, max: 2.4, step: 0.4, value: 0, unit: '°C', fmt: (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1) },
    ],
    readouts: [{ key: 'dar', label: '다윈 기압' }, { key: 'tah', label: '타히티 기압' }, { key: 'soi', label: '남방진동 지수' }],
    init(s) { s.ph = 0; },
    tick(s, dt) { s.ph = (s.ph + dt) % 1000; },
    read(s) {
      const v = soiOf(s);
      return { dar: fmt(darOf(s)) + ' hPa', tah: fmt(tahOf(s)) + ' hPa', soi: sgn(v) + fmt(Math.abs(v)) + ' hPa' };
    },
    draw(ctx, W, H, s) {
      const p = Math.max(-1, Math.min(1, pOf(s.dev))), soi = soiOf(s), top = 230;
      ctx.fillStyle = '#eef5fc'; ctx.fillRect(0, 0, W, top);
      // 바다: 따뜻한 물(빨강)이 엘니뇨 때 동쪽으로 퍼져요
      const g = ctx.createLinearGradient(0, 0, W, 0), e = 0.35 + 0.4 * p;
      g.addColorStop(0, '#ef4444'); g.addColorStop(Math.max(0.05, Math.min(0.95, e)), '#fb923c'); g.addColorStop(1, p < 0 ? '#3b82f6' : '#60a5fa');
      ctx.fillStyle = g; ctx.fillRect(0, top, W, H - top);
      // 육지
      ctx.fillStyle = '#a3b18a';
      ctx.beginPath(); ctx.moveTo(0, top - 6); ctx.lineTo(90, top - 6); ctx.lineTo(110, top + 40); ctx.lineTo(0, top + 60); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(500, top + 2, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
      // 기압계
      gauge(ctx, 60, darOf(s), '다윈', '#7c3aed');
      gauge(ctx, 500, tahOf(s), '타히티', '#be185d');
      // 두 곳 중 기압이 높은 곳에 '고', 낮은 곳에 '저'
      const dHi = darOf(s) > tahOf(s);
      [[118, dHi], [442, !dHi]].forEach(([x, hi]) => {
        ctx.fillStyle = hi ? '#2563eb' : '#dc2626'; ctx.beginPath(); ctx.arc(x, 135, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = FONT(22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(hi ? '고' : '저', x, 136);
      });
      // 무역풍 화살표(동 → 서): 길이 ∝ 타히티 − 다윈 기압차. 기압차가 없거나 역전되면 무역풍이 아주 약해요.
      const len = Math.max(0, Math.min(260, soi * 34)), cy = 140;
      if (len > 6) {
        const xa = 280 + len / 2, xb = 280 - len / 2;
        ctx.strokeStyle = '#0369a1'; ctx.fillStyle = '#0369a1'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(xa, cy); ctx.lineTo(xb + 18, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xb, cy); ctx.lineTo(xb + 26, cy - 18); ctx.lineTo(xb + 26, cy + 18); ctx.closePath(); ctx.fill();
      }
      label(ctx, soi > 5 ? '무역풍: 강함' : soi > 1.5 ? '무역풍: 보통' : '무역풍: 아주 약함', 280, cy + 44);
      const st = stateOf(s), sc = st === '엘니뇨' ? '#dc2626' : st === '라니냐' ? '#2563eb' : '#475569';
      label(ctx, st, 280, 34, sc, '#fff');
      label(ctx, '서태평양', 150, top + 40);
      label(ctx, '동태평양', 420, top + 70);
    },
  });
})();
