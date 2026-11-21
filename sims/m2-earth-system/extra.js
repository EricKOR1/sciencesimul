/* 중2 Ⅱ. 지권의 변화 - 지구계와 지권의 구조 [9과09-01] · 더 탐구하기
   권역 간 상호작용: 사건을 고르면 어느 권역에서 어느 권역으로 영향이 가는지 화살표로 보여 줘요.
   한 사건에서 이어지는 영향 두 가지를 ▶ 단추로 차례로 봐요.
   - 화산 분출: 지권 → 기권 (화산 가스·화산재가 대기로), 기권 → 생물권 (화산재가 햇빛을 가려 농작물이 잘 못 자람)
   - 태풍: 수권 → 기권 (따뜻한 바닷물에서 증발한 수증기가 태풍에 에너지를 줌), 기권 → 수권 (강한 바람이 큰 파도를 일으킴)
   - 큰비 뒤 산사태: 기권 → 지권 (많은 비가 흙과 바위를 무너뜨림), 지권 → 생물권 (무너진 흙이 숲과 집을 덮침)
   - 식물의 광합성: 생물권 → 기권 (산소를 내보냄), 기권 → 생물권 (공기 중 이산화 탄소를 흡수함)
   ※ 범위: 지구계의 구성 요소와 상호작용의 방향만 다뤄요. */
(function () {
  'use strict';
  const NODE = {
    atmo: { name: '기권', x: 300, y: 56, c: '#bfdbfe', k: '#1d4ed8' },
    hydro: { name: '수권', x: 488, y: 138, c: '#a5f3fc', k: '#0e7490' },
    bio: { name: '생물권', x: 420, y: 284, c: '#bbf7d0', k: '#15803d' },
    geo: { name: '지권', x: 180, y: 284, c: '#fde68a', k: '#a16207' },
    space: { name: '외권', x: 112, y: 138, c: '#e9d5ff', k: '#6d28d9' },
  };
  const EV = {
    volcano: { name: '화산 분출', links: [['geo', 'atmo', '화산 가스·화산재가 대기로 퍼짐'], ['atmo', 'bio', '화산재가 햇빛을 가려 농작물이 잘 못 자람']] },
    typhoon: { name: '태풍', links: [['hydro', 'atmo', '바닷물의 수증기가 태풍에 에너지를 줌'], ['atmo', 'hydro', '강한 바람이 큰 파도를 일으킴']] },
    slide: { name: '큰비 뒤 산사태', links: [['atmo', 'geo', '많은 비가 흙과 바위를 무너뜨림'], ['geo', 'bio', '무너진 흙이 숲과 집을 덮침']] },
    photo: { name: '식물의 광합성', links: [['bio', 'atmo', '식물이 산소를 내보냄'], ['atmo', 'bio', '식물이 이산화 탄소를 흡수함']] },
  };
  const F = (px) => '800 ' + px + 'px "Pretendard Variable", Pretendard, sans-serif';
  const R = 44;

  function arrow(ctx, a, b, col, w, t, flow) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const ox = -uy * 11, oy = ux * 11;
    const sx = a.x + ux * (R + 6) + ox, sy = a.y + uy * (R + 6) + oy, ex = a.x + ux * (L - R - 8) + ox, ey = a.y + uy * (L - R - 8) + oy;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex - ux * w * 1.6, ey - uy * w * 1.6); ctx.stroke();
    const hw = w * 1.5 + 4;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * hw * 2 - uy * hw, ey - uy * hw * 2 + ux * hw); ctx.lineTo(ex - ux * hw * 2 + uy * hw, ey - uy * hw * 2 - ux * hw); ctx.closePath(); ctx.fill();
    if (flow) {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 3; i++) { const k = ((t * 0.6 + i / 3) % 1) * 0.8; ctx.beginPath(); ctx.arc(sx + (ex - sx) * k, sy + (ey - sy) * k, w * 0.32, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  SciSim.extraLab({
    id: 'sphere', step: 2, icon: '🔎', title: '권역 사이 화살표',
    intro: '사건을 고르고 ▶ 단추를 눌러, 어느 권역에서 어느 권역으로 영향이 가는지 차례로 봐요.',
    size: [600, 340],
    controls: [
      { key: 'ev', type: 'seg', label: '사건', options: [['volcano', '화산 분출'], ['typhoon', '태풍'], ['slide', '큰비 뒤 산사태'], ['photo', '광합성']], value: 'volcano' },
      { key: 'next', type: 'button', primary: true, label: '▶ 다음 영향 보기', onClick(s) { s.i = (s.i + 1) % 2; } },
    ],
    readouts: [{ key: 'link', label: '상호작용' }, { key: 'what', label: '무슨 일이 생기나' }],
    init(s) { s.i = 0; },
    onChange(key, v, s) { if (key === 'ev') s.i = 0; },
    read(s) {
      const l = EV[s.ev].links[s.i];
      return { link: (s.i + 1) + '. ' + NODE[l[0]].name + ' → ' + NODE[l[1]].name, what: l[2] };
    },
    draw(ctx, W, H, s, t) {
      const ev = EV[s.ev], cur = ev.links[s.i], other = ev.links[1 - s.i];
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      // 앞뒤의 다른 영향은 흐리게
      arrow(ctx, NODE[other[0]], NODE[other[1]], 'rgba(148,163,184,.55)', 6, t, false);
      // 권역 공
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      Object.keys(NODE).forEach((k) => {
        const n = NODE[k], on = k === cur[0] || k === cur[1];
        ctx.globalAlpha = on ? 1 : 0.45;
        ctx.fillStyle = n.c; ctx.beginPath(); ctx.arc(n.x, n.y, R, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = n.k; ctx.lineWidth = on ? 5 : 2; ctx.stroke();
        ctx.fillStyle = n.k; ctx.font = F(n.name.length > 2 ? 20 : 22); ctx.fillText(n.name, n.x, n.y + 1);
        ctx.globalAlpha = 1;
      });
      // 지금 보는 영향 (주는 권역 → 받는 권역)
      arrow(ctx, NODE[cur[0]], NODE[cur[1]], '#dc2626', 14, t, true);
      // 왼쪽 위 사건 이름
      ctx.font = F(22); const tw = ctx.measureText(ev.name).width + 24;
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(14, 14, tw, 42, 10); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = '#1f2937'; ctx.fillText(ev.name, 26, 36);
    },
  });
})();
