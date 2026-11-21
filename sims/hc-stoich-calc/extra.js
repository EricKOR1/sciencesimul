/* 화학 Ⅰ. 화학의 언어 - 화학 반응의 양적 관계 [12화학01-03] · 더 탐구하기
   반응과 반응물의 질량을 고르면, 몰수 = 질량 ÷ 몰질량 → 계수비로 생성물의 몰수 → 생성물의 질량 = 몰수 × 몰질량
   으로 생성물의 양이 정해지는 것을 막대(몰수)로 보여 줘요. 몰수비는 질량과 관계없이 늘 계수비와 같아요.
   반응식과 몰질량(실제 값, 본 실험 2단계와 같은 값):
     CaCO₃ → CaO + CO₂        (CaCO₃ 100, CaO 56, CO₂ 44 g/mol)
     CH₄ + 2O₂ → CO₂ + 2H₂O   (CH₄ 16, O₂ 32, CO₂ 44, H₂O 18 g/mol), 산소는 충분하다고 가정
   막대 높이는 몰수에 비례하고, 눈금의 최댓값(0.5, 1, 2, 5, 10, 20, 30 mol)은 가장 큰 몰수에 맞춰 그림 왼쪽 위에 적어요. */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const RX = {
    caco3: { eq: 'CaCO₃ → CaO + CO₂', ex: 200, sp: [['CaCO₃', 1, 100, 'r'], ['CaO', 1, 56, 'p'], ['CO₂', 1, 44, 'p']] },
    ch4: { eq: 'CH₄ + 2O₂ → CO₂ + 2H₂O', ex: 8, sp: [['CH₄', 1, 16, 'r'], ['O₂', 2, 32, 'r'], ['CO₂', 1, 44, 'p'], ['H₂O', 2, 18, 'p']] },
  };
  const num = (v) => String(+v.toFixed(2));
  // 각 물질의 몰수: 반응물(첫 물질)의 몰수 × (계수 ÷ 첫 물질의 계수)
  function calc(s) {
    const r = RX[s.rx], n0 = s.mass / r.sp[0][2];
    return r.sp.map(([f, c, M, k]) => ({ f, c, M, k, n: n0 * c / r.sp[0][1], m: n0 * c / r.sp[0][1] * M }));
  }

  SciSim.extraLab({
    id: 'molbar', step: 2, icon: '🔎', title: '계수비와 생성물의 양',
    intro: '반응과 반응물의 질량을 고르면 생성물의 몰수와 질량이 계수비에 따라 정해져요.',
    size: [600, 340],
    controls: [
      { key: 'rx', type: 'seg', label: '반응', options: [['caco3', '탄산 칼슘 분해'], ['ch4', '메테인 연소']], value: 'caco3' },
      { key: 'mass', type: 'range', label: '반응물(CaCO₃ 또는 CH₄)의 질량', min: 4, max: 200, step: 4, value: 200, unit: 'g', fmt: (v) => String(v) },
    ],
    readouts: [{ key: 'r', label: '반응한 물질' }, { key: 'p1', label: '생성물 ①' }, { key: 'p2', label: '생성물 ②' }],
    init(s) { s.hs = calc(s).map((o) => o.n); },
    onChange(key, v, s, lab) { if (key === 'rx') { lab.set('mass', RX[v].ex); s.hs = null; } },
    tick(s, dt) {
      const t = calc(s).map((o) => o.n);
      if (!s.hs || s.hs.length !== t.length) s.hs = t.map(() => 0);
      s.hs = s.hs.map((h, i) => h + (t[i] - h) * Math.min(1, dt * 5));
    },
    read(s) {
      const a = calc(s), pr = a.filter((o) => o.k === 'p');
      const pf = (o) => o.f + ' ' + num(o.n) + ' mol · ' + num(o.m) + ' g';
      return { r: a[0].f + ' ' + num(a[0].n) + ' mol', p1: pf(pr[0]), p2: pf(pr[1]) };
    },
    draw(ctx, W, H, s) {
      const r = RX[s.rx], a = calc(s), hs = s.hs || a.map(() => 0);
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      // 반응식
      ctx.font = FONT(26); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#0f172a';
      ctx.fillText(r.eq, W / 2, 30);
      // 몰수 막대: 가장 큰 몰수에 맞춘 눈금
      const big = Math.max(...a.map((o) => o.n)), nmax = [0.5, 1, 2, 5, 10, 20, 30].find((v) => v >= big - 1e-9) || 30;
      const base = 280, top = 70, maxH = base - top, n = a.length, bw = n === 3 ? 110 : 90, gap = (W - n * bw) / (n + 1);
      // 반응물 | 생성물 경계
      const nr = a.filter((o) => o.k === 'r').length, xmid = gap + nr * (bw + gap) - gap / 2;
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(xmid, 58); ctx.lineTo(xmid, base); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#64748b'; ctx.font = FONT(30); ctx.fillText('→', xmid, 160);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, base); ctx.lineTo(W - 12, base); ctx.stroke();
      // 눈금 맨 위 (몰수)
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(12, top); ctx.lineTo(W - 12, top); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#64748b'; ctx.font = FONT(20); ctx.textAlign = 'left'; ctx.fillText(num(nmax) + ' mol', 14, top + 16); ctx.textAlign = 'center';
      a.forEach((o, i) => {
        const x = gap + i * (bw + gap), h = Math.max(2, hs[i] / nmax * maxH);
        const g = ctx.createLinearGradient(0, base - h, 0, base);
        if (o.k === 'r') { g.addColorStop(0, '#fb923c'); g.addColorStop(1, '#ea580c'); } else { g.addColorStop(0, '#60a5fa'); g.addColorStop(1, '#2563eb'); }
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, base - h, bw, h, [8, 8, 0, 0]); ctx.fill();
        ctx.fillStyle = '#0f172a'; ctx.font = FONT(22); ctx.fillText(o.f, x + bw / 2, base + 24);
        ctx.fillStyle = '#475569'; ctx.font = FONT(20); ctx.fillText('계수 ' + o.c, x + bw / 2, base + 50);
      });
    },
  });
})();
