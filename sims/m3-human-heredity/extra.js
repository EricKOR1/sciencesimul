/* 중3 Ⅵ. 생식과 유전 - 사람의 유전 [9과21-05] · 더 탐구하기
   ABO식 혈액형: 아버지와 어머니의 유전자형을 각각 고르면, 퍼넷 사각형으로 자녀에게 나올 수 있는 유전자형과 혈액형, 그 비율을 보여 줘요.
   모형: 부모는 두 대립유전자 중 하나를 같은 확률(1/2)로 자녀에게 줘요. 퍼넷 사각형 네 칸은 각각 1/4.
         A와 B는 O에 대해 우성, A와 B 사이에는 우열이 없음 (AA·AO = A형, BB·BO = B형, AB = AB형, OO = O형)
   ※ 모든 가족은 가상의 가족이에요. */
(function () {
  'use strict';
  const GT = ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'];
  const ORD = { A: 0, B: 1, O: 2 };
  const norm = (a, b) => (ORD[a] <= ORD[b] ? a + b : b + a);
  const typeOf = (g) => (g === 'OO' ? 'O' : g === 'AB' ? 'AB' : g.indexOf('A') >= 0 ? 'A' : 'B');
  const TYPES = ['A', 'B', 'AB', 'O'];
  const COL = { A: '#fde2e2', B: '#dbeafe', AB: '#ede9fe', O: '#dcfce7' };
  const INK = { A: '#dc2626', B: '#2563eb', AB: '#7c3aed', O: '#16a34a' };
  const frac = (n) => (n === 0 ? '0' : n === 4 ? '1 (모두)' : n === 2 ? '1/2' : n + '/4');
  const label = (i) => GT[i] + ' (' + typeOf(GT[i]) + '형)';
  const cells = (s) => {
    const f = GT[s.dad], m = GT[s.mom], out = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) out.push(norm(f[c], m[r]));
    return out;
  };
  const count = (list, key) => list.filter((x) => x === key).length;
  const F = (px) => '800 ' + px + 'px "Pretendard Variable", Pretendard, sans-serif';

  SciSim.extraLab({
    id: 'abo', step: 3, icon: '🔎', title: '혈액형 퍼넷 사각형',
    intro: '아버지와 어머니의 유전자형을 고르면 자녀에게 나올 수 있는 혈액형과 비율을 알 수 있어요.',
    size: [600, 340],
    controls: [
      { key: 'dad', type: 'range', label: '아버지의 유전자형', min: 0, max: 5, step: 1, value: 1, fmt: label },
      { key: 'mom', type: 'range', label: '어머니의 유전자형', min: 0, max: 5, step: 1, value: 3, fmt: label },
    ],
    readouts: [{ key: 'gt', label: '자녀의 유전자형' }, { key: 'bt', label: '자녀의 혈액형' }],
    init(s) { s.rev = 4; },
    onChange(key, v, s) { s.rev = 0; },
    step(s, dt) { if (s.rev < 4) s.rev = Math.min(4, s.rev + dt * 6); },
    read(s) {
      const cs = cells(s);
      const gts = ['AA', 'AB', 'AO', 'BB', 'BO', 'OO'].filter((g) => count(cs, g)).map((g) => g + ' ' + frac(count(cs, g)));
      const ty = cs.map(typeOf);
      const bts = TYPES.filter((t) => count(ty, t)).map((t) => t + '형 ' + frac(count(ty, t)));
      return { gt: gts.join(' · '), bt: bts.join(' · ') };
    },
    draw(ctx, W, H, s) {
      const f = GT[s.dad], m = GT[s.mom], cs = cells(s);
      const x0 = 150, y0 = 92, sz = 112;
      ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // 부모 이름표와 생식세포
      ctx.font = F(22); ctx.fillStyle = '#1f2937';
      ctx.fillText('아버지 ' + f, x0 + sz, 24);
      ctx.fillText('어머니', 52, y0 + sz - 16); ctx.fillText(m, 52, y0 + sz + 16);
      ctx.font = F(26);
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(x0 + sz * (i + 0.5), 64, 19, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(124, y0 + sz * (i + 0.5), 19, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#334155'; ctx.fillText(f[i], x0 + sz * (i + 0.5), 65); ctx.fillText(m[i], 124, y0 + sz * (i + 0.5) + 1);
      }
      // 퍼넷 사각형 네 칸
      cs.forEach((g, k) => {
        const r = Math.floor(k / 2), c = k % 2, x = x0 + c * sz, y = y0 + r * sz;
        const a = Math.max(0, Math.min(1, s.rev - k));
        const t = typeOf(g);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, sz, sz);
        ctx.globalAlpha = a; ctx.fillStyle = COL[t]; ctx.fillRect(x, y, sz, sz);
        ctx.fillStyle = '#1f2937'; ctx.font = F(32); ctx.fillText(g, x + sz / 2, y + sz / 2 - 14);
        ctx.fillStyle = INK[t]; ctx.font = F(22); ctx.fillText(t + '형', x + sz / 2, y + sz / 2 + 24);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.strokeRect(x, y, sz, sz);
      });
      // 혈액형 비율 막대 (네 칸 중 몇 칸인지)
      const bx = 410, bw = 170, ty = cs.map(typeOf);
      TYPES.forEach((t, i) => {
        const y = y0 + 6 + i * 54, n = count(ty, t);
        ctx.textAlign = 'left'; ctx.font = F(22); ctx.fillStyle = n ? INK[t] : '#94a3b8'; ctx.fillText(t + '형', bx, y + 15);
        ctx.fillStyle = '#e2e8f0'; ctx.fillRect(bx + 52, y + 2, bw - 52, 26);
        ctx.fillStyle = INK[t]; ctx.fillRect(bx + 52, y + 2, (bw - 52) * n / 4 * Math.min(1, s.rev / 4), 26);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        for (let q = 1; q < 4; q++) { const xx = bx + 52 + (bw - 52) * q / 4; ctx.beginPath(); ctx.moveTo(xx, y + 2); ctx.lineTo(xx, y + 28); ctx.stroke(); }
      });
      ctx.textAlign = 'center'; ctx.font = F(20); ctx.fillStyle = '#475569'; ctx.fillText('자녀의 혈액형', bx + bw / 2, 64);
    },
  });
})();
