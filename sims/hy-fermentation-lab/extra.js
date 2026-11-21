/* 세포와 물질대사 · 발효 실험과 사례 조사 [12세포03-04] · 더 탐구하기
   효모 발효 실험: 온도 · 포도당 농도 · 효모 양 중 하나만 바꾸면 20분 뒤 풍선에 모인 CO₂ 부피가 어떻게 달라지는지 기본 설정과 나란히 비교해요.
   모형(예시 값, 이 차시 실험 수행 단계의 가상 자료와 같은 값):
     기본 설정 = 35 °C · 포도당 10 % · 효모 1 g → 20분 뒤 CO₂ 18 mL
     온도 20 · 30 · 35 · 45 · 55 °C → 8 · 16 · 18 · 12 · 2 mL,  포도당 2 · 5 · 10 · 20 · 40 % → 7 · 13 · 18 · 18 · 8 mL,
     효모 0.5 · 1 · 1.5 · 2 · 3 g → 9 · 18 · 26.5 · 35 · 52 mL  (나머지 두 요인은 기본 설정일 때)
     두 요인 이상을 바꾸면 각 비율을 곱해요: V20 = 18 × (온도 값/18) × (포도당 값/18) × (효모 값/18)
     시간에 따른 부피 V(t) = V20 × (1 − e^(−t/18)) / (1 − e^(−20/18))  (처음엔 빠르다가 점점 느려짐) */
(function () {
  'use strict';
  const F = {
    temp: { name: '온도', lv: [20, 30, 35, 45, 55], v: [8, 16, 18, 12, 2], base: 2, u: ' °C' },
    glu: { name: '포도당 농도', lv: [2, 5, 10, 20, 40], v: [7, 13, 18, 18, 8], base: 2, u: ' %' },
    yeast: { name: '효모 양', lv: [0.5, 1, 1.5, 2, 3], v: [9, 18, 26.5, 35, 52], base: 1, u: ' g' },
  };
  const KEYS = ['temp', 'glu', 'yeast'], BASE = 18, TK = 18, f20 = 1 - Math.exp(-20 / TK);
  const v20 = (s) => KEYS.reduce((a, k) => a * F[k].v[s[k]] / BASE, BASE);
  const vAt = (V, t) => V * (1 - Math.exp(-t / TK)) / f20;
  const changed = (s) => KEYS.filter((k) => s[k] !== F[k].base);
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const rangeOf = (k) => ({ key: k, type: 'range', label: F[k].name, min: 0, max: 4, step: 1, value: F[k].base, fmt: (i) => F[k].lv[i] + F[k].u });

  function flask(ctx, cx, V, col, name) {
    const base = 300, neck = 196;
    // 풍선 (부피가 클수록 커짐: 그림용 크기)
    const r = V > 0.05 ? 10 + 8.5 * Math.sqrt(V) : 0;
    if (r) {
      const ry = r * 1.15, cy = neck - 6 - ry;
      const g = ctx.createRadialGradient(cx - r * 0.35, cy - ry * 0.4, r * 0.1, cx, cy, ry);
      g.addColorStop(0, '#fca5a5'); g.addColorStop(0.6, col); g.addColorStop(1, '#991b1b');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, r, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(cx - 9, neck - 10, 18, 12);
    } else {
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, neck - 14, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
    }
    // 발효관(삼각 플라스크)
    ctx.fillStyle = 'rgba(241,217,154,.9)';
    ctx.beginPath(); ctx.moveTo(cx - 30, 262); ctx.lineTo(cx + 30, 262); ctx.lineTo(cx + 52, base); ctx.lineTo(cx - 52, base); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(70,110,150,.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 10, neck); ctx.lineTo(cx - 10, 236); ctx.lineTo(cx - 54, base); ctx.lineTo(cx + 54, base); ctx.lineTo(cx + 10, 236); ctx.lineTo(cx + 10, neck); ctx.stroke();
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#1f2937';
    ctx.fillText(name, cx, 324);
  }

  SciSim.extraLab({
    id: 'yeastbal', step: 2, icon: '🔎', title: '효모 풍선 실험',
    intro: '조건을 바꾸면 20분 동안 발효해요. 왼쪽 기본 설정(35 °C · 10 % · 1 g)의 풍선과 비교해요.',
    size: [600, 340],
    controls: [
      rangeOf('temp'), rangeOf('glu'), rangeOf('yeast'),
      { key: 'go', type: 'button', primary: true, label: '▶ 다시 20분 발효', onClick(s) { s.t = 0; s.run = true; } },
    ],
    readouts: [{ key: 't', label: '지난 시간' }, { key: 'v', label: '내 조건의 CO₂ 부피' }, { key: 'ch', label: '바꾼 요인' }],
    init(s) { s.t = 0; s.run = true; },
    onChange(key, v, s) { s.t = 0; s.run = true; },
    tick(s, dt) { if (s.run) { s.t = Math.min(20, s.t + dt * 10); if (s.t >= 20) s.run = false; } },
    read(s) {
      const c = changed(s), V = vAt(v20(s), s.t);
      const ch = !c.length ? '없음 (기본 설정)' : c.length === 1 ? F[c[0]].name + ' 하나' : c.map((k) => F[k].name).join(' · ') + ' (원인을 가릴 수 없음)';
      return { t: Math.floor(s.t) + ' 분', v: V.toFixed(1) + ' mL', ch };
    },
    draw(ctx, W, H, s) {
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      // 물중탕
      ctx.fillStyle = 'rgba(96,165,250,.25)'; ctx.fillRect(20, 276, W - 40, 30);
      flask(ctx, 170, vAt(BASE, s.t), '#94a3b8', '기본 설정');
      flask(ctx, 430, vAt(v20(s), s.t), '#ef4444', '내 조건');
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(300, 20); ctx.lineTo(300, 300); ctx.stroke(); ctx.setLineDash([]);
    },
  });
})();
