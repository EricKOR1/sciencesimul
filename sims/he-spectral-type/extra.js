/* 지구과학 · 별의 분광형 [12지구03-02] · 더 탐구하기
   광도 계급과 흡수선 폭: 같은 분광형(같은 표면 온도)이라도 초거성(I)·거성(III)은 크고 대기 압력이 낮아 흡수선이 가늘고,
   주계열성(V)은 작고 대기 압력이 높아 흡수선이 넓어요.
   모형(예시 값): 흡수선 폭 V 1.2 nm, III 0.4 nm, I 0.15 nm (분광형과 관계없이 같은 값으로 단순화)
     반지름(태양 = 1): B형 V 4 · III 8 · I 70 / A형 V 2 · III 6 · I 60 / G형 V 1 · III 10 · I 100
   그림의 흡수선은 잘 보이도록 실제 폭보다 크게 늘여 그렸어요(폭의 비는 그대로).
   ※ 압력에 의한 선폭 넓어짐의 원리 계산은 다루지 않아요. */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const WID = { V: 1.2, III: 0.4, I: 0.15 };
  const PRESS = { V: '높음', III: '낮음', I: '아주 낮음' };
  const CLS = { V: 'V 주계열성', III: 'III 거성', I: 'I 초거성' };
  const RAD = { B: { V: 4, III: 8, I: 70 }, A: { V: 2, III: 6, I: 60 }, G: { V: 1, III: 10, I: 100 } };
  const COLOR = { B: '#bcd4ff', A: '#f1f5ff', G: '#ffe9a8' };
  const TEMP = { B: '약 12000 K', A: '약 9600 K', G: '약 5800 K' };
  const LINES = { B: [410.2, 434.0, 486.1, 656.3], A: [410.2, 434.0, 486.1, 656.3], G: [430.8, 486.1, 517.3, 527.0, 589.3, 656.3] };
  const X0 = 40, X1 = 560, L0 = 400, L1 = 700, ZOOM = 14;
  const xOf = (nm) => X0 + (nm - L0) / (L1 - L0) * (X1 - X0);

  function hue(nm) {
    const h = 270 - (nm - 400) / 300 * 270;
    return 'hsl(' + Math.max(0, h).toFixed(0) + ',90%,55%)';
  }
  function label(ctx, txt, x, y, bg, fg) {
    ctx.font = FONT(20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 18;
    ctx.fillStyle = bg || 'rgba(255,255,255,.93)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 16, w, 32, 8); ctx.fill();
    ctx.fillStyle = fg || '#1f2937'; ctx.fillText(txt, x, y + 1);
  }

  SciSim.extraLab({
    id: 'lumcls', step: 4, icon: '🔎', title: '광도 계급과 흡수선',
    intro: '분광형은 그대로 두고 광도 계급을 바꿔 흡수선의 폭을 비교해요.',
    size: [600, 340],
    controls: [
      { key: 'sp', type: 'seg', label: '분광형', options: [['B', 'B형'], ['A', 'A형'], ['G', 'G형']], value: 'A' },
      { key: 'lc', type: 'seg', label: '광도 계급', options: [['V', 'V 주계열성'], ['III', 'III 거성'], ['I', 'I 초거성']], value: 'V' },
    ],
    readouts: [{ key: 'w', label: '흡수선 폭' }, { key: 'r', label: '반지름 (태양 = 1)' }, { key: 'p', label: '대기 압력' }],
    read(s) { return { w: WID[s.lc].toFixed(2) + ' nm', r: RAD[s.sp][s.lc] + ' 배', p: PRESS[s.lc] }; },
    draw(ctx, W, H, s) {
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, 180);
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 180, W, H - 180);
      // 별: 크기는 반지름의 로그에 비례해 그려요
      const R = RAD[s.sp][s.lc], pr = 16 + 30 * Math.log10(R), cx = 170, cy = 90;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 180); ctx.clip();
      const g = ctx.createRadialGradient(cx, cy, pr * 0.2, cx, cy, pr * 1.5);
      g.addColorStop(0, '#fff'); g.addColorStop(0.55, COLOR[s.sp]); g.addColorStop(1, 'rgba(15,23,42,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, pr * 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLOR[s.sp]; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      label(ctx, s.sp + '형 ' + CLS[s.lc], 430, 60);
      label(ctx, '표면 온도 ' + TEMP[s.sp], 430, 112, 'rgba(255,255,255,.8)');
      // 스펙트럼 띠
      const y0 = 214, h = 86;
      for (let x = X0; x < X1; x += 2) { ctx.fillStyle = hue(L0 + (x - X0) / (X1 - X0) * (L1 - L0)); ctx.fillRect(x, y0, 2.5, h); }
      // 흡수선: 가운데가 가장 어둡고 가장자리로 갈수록 옅어져요
      const wpx = WID[s.lc] * ZOOM;
      LINES[s.sp].forEach((nm) => {
        const x = xOf(nm), half = Math.max(1.2, wpx / 2);
        const lg = ctx.createLinearGradient(x - half * 1.6, 0, x + half * 1.6, 0);
        lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.3, 'rgba(0,0,0,.75)'); lg.addColorStop(0.5, 'rgba(0,0,0,.95)'); lg.addColorStop(0.7, 'rgba(0,0,0,.75)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg; ctx.fillRect(x - half * 1.6, y0, half * 3.2, h);
      });
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.strokeRect(X0, y0, X1 - X0, h);
      label(ctx, '흡수선', xOf(486.1), y0 - 16);
      ctx.font = FONT(20); ctx.fillStyle = '#475569'; ctx.textBaseline = 'middle';
      ctx.textAlign = 'left'; ctx.fillText('보라', X0, y0 + h + 22);
      ctx.textAlign = 'right'; ctx.fillText('빨강', X1, y0 + h + 22);
    },
  });
})();
