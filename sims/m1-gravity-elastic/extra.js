/* 중1 Ⅴ. 힘의 작용 - 중력과 탄성력 [9과05-02] · 더 탐구하기
   생활 속 탄성력: 활시위를 당긴 길이(트램펄린을 누른 깊이)가 길수록 탄성력이 커지고,
   탄성력의 방향은 변형된 방향과 반대(원래 모양으로 되돌아가려는 쪽)예요.
   ※ 용수철 상수·탄성 한계 계산은 다루지 않아요. 크기는 "변형이 클수록 크다(비례)"만 보여 줘요.
   모형(예시 값): 탄성력 = 변형된 길이(cm) × 활 3 N, 트램펄린 30 N  (활 50 cm ≈ 150 N, 트램펄린 50 cm ≈ 1500 N: 실제와 같은 크기 정도)
   놓기 단추의 화살·사람이 날아가는 모습은 꾸밈이에요(값은 읽지 않아요). */
(function () {
  'use strict';
  const FONT = '800 20px "Pretendard Variable", Pretendard, sans-serif';
  const PER = { bow: 3, tramp: 30 };
  const force = (s) => s.d * PER[s.obj];
  const comma = (n) => Math.round(n).toLocaleString('ko-KR');

  function arrow(ctx, x0, y0, x1, y1, color) {
    const len = Math.hypot(x1 - x0, y1 - y0); if (len < 4) return;
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * 18, y1 - uy * 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * 28 - uy * 15, y1 - uy * 28 + ux * 15); ctx.lineTo(x1 - ux * 28 + uy * 15, y1 - uy * 28 - ux * 15); ctx.closePath(); ctx.fill();
  }
  function tag(ctx, text, x, y, color) {
    ctx.font = FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 20;
    ctx.fillStyle = 'rgba(255,255,255,.93)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 17, w, 34, 9); ctx.fill();
    ctx.fillStyle = color; ctx.fillText(text, x, y);
  }
  function person(ctx, x, y) {
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.fillStyle = '#f2c79b'; ctx.beginPath(); ctx.arc(x, y - 92, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2563eb'; ctx.beginPath(); ctx.moveTo(x, y - 76); ctx.lineTo(x, y - 36); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 24, y - 70); ctx.lineTo(x, y - 62); ctx.lineTo(x + 24, y - 70); ctx.stroke();
    ctx.strokeStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x, y - 36); ctx.lineTo(x + 14, y); ctx.stroke();
  }

  SciSim.extraLab({
    id: 'bowtramp', step: 4, icon: '🔎', title: '활과 트램펄린',
    intro: '활시위를 당기거나 트램펄린을 눌러 보세요. 탄성력의 크기와 방향은 어떻게 될까요?',
    size: [600, 340],
    controls: [
      { key: 'obj', type: 'seg', label: '물체', options: [['bow', '🏹 활'], ['tramp', '🤸 트램펄린']], value: 'bow' },
      { key: 'd', type: 'range', label: '당기거나 누른 길이', min: 0, max: 50, step: 5, value: 20, fmt: (v) => String(v), unit: 'cm' },
      { key: 'go', type: 'button', primary: true, label: '▶ 놓기', onClick(s, lab) { if (s.d > 0) { s.fly = 0; s.flyD = s.d; s.flyObj = s.obj; lab.set('d', 0); } } },
    ],
    readouts: [{ key: 'd', label: '변형된 길이' }, { key: 'f', label: '탄성력의 크기' }, { key: 'dir', label: '탄성력의 방향' }],
    init(s) { s.fly = -1; },
    onChange(key, v, s) { s.fly = -1; },
    step(s, dt) { if (s.fly >= 0) { s.fly += dt; if (s.fly > 1.4) s.fly = -1; } },
    read(s) {
      const f = force(s);
      const dir = s.d === 0 ? '없음 (원래 모양)' : s.obj === 'bow' ? '앞쪽 (당긴 쪽과 반대)' : '위쪽 (누른 쪽과 반대)';
      return { d: s.d + ' cm', f: comma(f) + ' N', dir };
    },
    draw(ctx, W, H, s) {
      ctx.fillStyle = '#f3f7fb'; ctx.fillRect(0, 0, W, H);
      const px = s.d * 3.4;
      if (s.obj === 'bow') {
        ctx.fillStyle = '#dcebd3'; ctx.fillRect(0, 300, W, 40);
        const bx = 330, top = 50, bot = 290, cy = 170, bend = 34 + px * 0.25;
        // 과녁
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(565, cy, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(565, cy, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(565, cy, 9, 0, Math.PI * 2); ctx.fill();
        // 활 몸통
        const tx = bx - bend * 0.45;
        ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, top + px * 0.12); ctx.quadraticCurveTo(bx + bend, cy, tx, bot - px * 0.12); ctx.stroke();
        // 시위
        const sx = bx - 30 - px;
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(tx, top + px * 0.12); ctx.lineTo(sx, cy); ctx.lineTo(tx, bot - px * 0.12); ctx.stroke();
        // 화살 (시위에 걸린 것 또는 날아가는 것)
        let ax = sx;
        if (s.fly >= 0 && s.flyObj === 'bow') ax = bx - 30 + Math.min(1, s.fly / (0.9 - s.flyD * 0.01)) * (520 - bx);
        ctx.strokeStyle = '#a16207'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(ax, cy); ctx.lineTo(ax + 190, cy); ctx.stroke();
        ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(ax + 206, cy); ctx.lineTo(ax + 186, cy - 10); ctx.lineTo(ax + 186, cy + 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.fillRect(ax - 2, cy - 12, 16, 8); ctx.fillRect(ax - 2, cy + 4, 16, 8);
        // 손
        if (s.d > 0) { ctx.fillStyle = '#f2c79b'; ctx.beginPath(); ctx.arc(sx - 14, cy, 16, 0, Math.PI * 2); ctx.fill(); }
        // 탄성력 화살표 (시위가 원래대로 돌아가려는 쪽 = 앞쪽)
        if (s.d > 0) { arrow(ctx, sx + 4, cy + 46, sx + 4 + px * 1.1, cy + 46, '#16a34a'); tag(ctx, '탄성력', sx + 4 + px * 0.55, cy + 88, '#15803d'); }
        tag(ctx, '활', bx + 40, 40, '#7c4a1d');
      } else {
        ctx.fillStyle = '#dcebd3'; ctx.fillRect(0, 300, W, 40);
        const L = 130, R = 470, my = 150, cx = 300, sag = px * 0.6;
        // 다리
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(L + 10, my); ctx.lineTo(L - 10, 300); ctx.moveTo(R - 10, my); ctx.lineTo(R + 10, 300); ctx.stroke();
        // 매트 (가운데가 눌려요)
        ctx.strokeStyle = '#111827'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(L, my); ctx.quadraticCurveTo(cx, my + sag * 2, R, my); ctx.stroke();
        ctx.fillStyle = '#2563eb'; ctx.fillRect(L - 18, my - 8, 30, 16); ctx.fillRect(R - 12, my - 8, 30, 16);
        // 사람: 매트 위에 서 있거나, 놓으면 뛰어올라요
        let py = my + sag;
        if (s.fly >= 0 && s.flyObj === 'tramp') { const h = s.flyD * 1.6, q = Math.min(1, s.fly / 1.2); py = my - h * 4 * q * (1 - q); }
        person(ctx, cx, py);
        // 탄성력 화살표 (매트가 원래대로 돌아가려는 쪽 = 위쪽)
        if (s.d > 0) { arrow(ctx, cx + 70, my + sag - 4, cx + 70, my + sag - 4 - px * 1.1, '#16a34a'); tag(ctx, '탄성력', cx + 140, my + sag - 30, '#15803d'); }
        tag(ctx, '트램펄린', 300, 318, '#1e3a8a');
      }
    },
  });
})();
