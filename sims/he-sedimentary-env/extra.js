/* 지구과학 · 퇴적 구조와 퇴적 환경 [12지구02-02] · 더 탐구하기
   해침과 해퇴: 해수면이 오르면 해안선이 육지 쪽으로 밀려와 관찰 지점이 해안에서 멀어지고(해침),
   내리면 해안선이 바다 쪽으로 물러나 관찰 지점이 해안에 가까워져요(해퇴).
   해안에서 가까울수록 흐름이 세서 굵은 알갱이가, 멀수록 고운 알갱이가 쌓여요.
   모형(예시 값): 해안선까지 거리(km) = 2 + 0.15 × 해수면 높이(m)
     거리 < 1 km 자갈(역암), 1~3 km 모래(사암), 3 km 이상 진흙(이암)
   해수면을 한 번 바꿀 때마다 관찰 지점에 층이 하나씩 쌓여요. */
(function () {
  'use strict';
  const FONT = (n) => '800 ' + n + 'px "Pretendard Variable", Pretendard, sans-serif';
  const MIN = -10, MAX = 20, STEP = 10, MAXL = 6;
  const distOf = (lv) => 2 + 0.15 * lv;
  const grainOf = (lv) => { const d = distOf(lv); return d < 1 ? 'g' : d < 3 ? 's' : 'm'; };
  const NAME = { g: '역암', s: '사암', m: '이암' };
  const SIZE = { g: 3, s: 2, m: 1 };
  const COL = { g: '#a8a29e', s: '#facc15', m: '#78716c' };
  const SITE = 360, A = 90, B = 0.42, PX = 56;
  const floorY = (x) => A + B * x;

  function trend(s) {
    const L = s.layers; if (L.length < 2) return '';
    const a = SIZE[L[L.length - 2]], b = SIZE[L[L.length - 1]];
    return b < a ? 'fine' : b > a ? 'coarse' : '';
  }
  function reset(s) { s.level = MIN; s.layers = [grainOf(MIN)]; s.shown = MIN; }
  function move(s, d) {
    const nl = s.level + d; if (nl < MIN || nl > MAX) return;
    s.level = nl; s.layers.push(grainOf(nl)); if (s.layers.length > MAXL) s.layers.shift();
  }
  function label(ctx, txt, x, y, bg, fg) {
    ctx.font = FONT(20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 18;
    ctx.fillStyle = bg || 'rgba(255,255,255,.93)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 16, w, 32, 8); ctx.fill();
    ctx.fillStyle = fg || '#1f2937'; ctx.fillText(txt, x, y + 1);
  }
  function pattern(ctx, g, x, y, w, h) {
    ctx.fillStyle = COL[g]; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (g === 'g') {
      ctx.fillStyle = '#78716c';
      for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.ellipse(x + 8 + (i * 37) % w, y + 6 + (i * 13) % h, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    } else if (g === 's') {
      ctx.fillStyle = '#a16207';
      for (let i = 0; i < 40; i++) { ctx.fillRect(x + (i * 29) % w, y + 3 + (i * 11) % (h - 4), 2.5, 2.5); }
    } else {
      ctx.strokeStyle = '#57534e'; ctx.lineWidth = 1.5;
      for (let yy = y + 6; yy < y + h; yy += 7) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
    }
    ctx.restore();
  }

  SciSim.extraLab({
    id: 'sealevel', step: 4, icon: '🔎', title: '해수면과 지층',
    intro: '해수면을 올리거나 내리면 한 지점에 쌓이는 알갱이가 어떻게 바뀌는지 봐요.',
    size: [600, 340],
    controls: [
      { key: 'up', type: 'button', primary: true, label: '▲ 해수면 10 m 올리기', onClick(s) { move(s, STEP); } },
      { key: 'down', type: 'button', primary: true, label: '▼ 해수면 10 m 내리기', onClick(s) { move(s, -STEP); } },
      { key: 'reset', type: 'button', label: '↺ 처음으로', onClick(s) { reset(s); } },
    ],
    readouts: [{ key: 'lv', label: '해수면 높이' }, { key: 'd', label: '해안선까지 거리' }, { key: 'tr', label: '위로 갈수록 알갱이' }],
    init(s) { reset(s); },
    tick(s, dt) { s.shown += Math.max(-1, Math.min(1, s.level - s.shown)) * Math.min(Math.abs(s.level - s.shown), 30 * dt); },
    read(s) {
      const t = trend(s), tr = t === 'fine' ? '작아짐 (해침)' : t === 'coarse' ? '커짐 (해퇴)' : '—';
      return { lv: (s.level > 0 ? '+' : '') + s.level + ' m', d: distOf(s.level).toFixed(1) + ' km', tr };
    },
    draw(ctx, W, H, s) {
      const XE = 445, xs = SITE - PX * distOf(s.shown), ys = floorY(xs);
      ctx.fillStyle = '#eaf3fb'; ctx.fillRect(0, 0, W, H);
      // 바다 (해수면 아래, 해저면 위)
      ctx.fillStyle = '#7cc0ea';
      ctx.beginPath(); ctx.moveTo(xs, ys); ctx.lineTo(XE, ys); ctx.lineTo(XE, floorY(XE)); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#1d4ed8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xs, ys); ctx.lineTo(XE, ys); ctx.stroke();
      // 땅
      ctx.fillStyle = '#c8b38a';
      ctx.beginPath(); ctx.moveTo(0, floorY(0)); ctx.lineTo(XE, floorY(XE)); ctx.lineTo(XE, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      // 해저의 퇴적물 띠: 해안에서 가까울수록 굵은 알갱이
      const belt = [[0, 1, 'g'], [1, 3, 's'], [3, 9, 'm']];
      ctx.lineWidth = 12; ctx.lineCap = 'butt';
      belt.forEach(([a, b, g]) => {
        const x0 = Math.max(xs, xs + a * PX), x1 = Math.min(XE, xs + b * PX); if (x1 <= x0) return;
        ctx.strokeStyle = COL[g]; ctx.beginPath(); ctx.moveTo(x0, floorY(x0) + 6); ctx.lineTo(x1, floorY(x1) + 6); ctx.stroke();
      });
      // 관찰 지점
      const fy = floorY(SITE);
      ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(SITE, fy); ctx.lineTo(SITE, fy - 70); ctx.stroke();
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(SITE, fy - 70); ctx.lineTo(SITE + 22, fy - 62); ctx.lineTo(SITE, fy - 54); ctx.closePath(); ctx.fill();
      label(ctx, '관찰 지점', SITE - 10, fy + 34);
      label(ctx, '육지', 60, 30);
      label(ctx, '바다', 412, ys - 26);
      // 해안선 표시
      ctx.fillStyle = '#1d4ed8'; ctx.beginPath(); ctx.arc(xs, ys, 6, 0, Math.PI * 2); ctx.fill();
      // 주상도
      const cx = 470, cw = 110, lh = 38, bot = 322;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(cx - 10, 52, cw + 20, bot - 52 + 10, 10); ctx.fill();
      s.layers.forEach((g, i) => {
        const y = bot - (i + 1) * lh;
        pattern(ctx, g, cx, y, cw, lh);
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.strokeRect(cx, y, cw, lh);
        label(ctx, NAME[g], cx + cw / 2, y + lh / 2, 'rgba(255,255,255,.85)');
      });
      const t = trend(s);
      if (t === 'fine') label(ctx, '해침 ↑ 작아짐', cx + cw / 2, 28, '#7c3aed', '#fff');
      else if (t === 'coarse') label(ctx, '해퇴 ↑ 커짐', cx + cw / 2, 28, '#c2410c', '#fff');
      else label(ctx, '쌓인 지층', cx + cw / 2, 28);
    },
  });
})();
