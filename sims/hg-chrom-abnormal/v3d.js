/* hg-chrom-abnormal · 3D 염색체 이상
   ① 수 이상: 감수 분열 때 상동 염색체가 한쪽으로 몰려 가는 '비분리' → 염색체가 n+1 · n−1개인 생식세포
   ② 구조 이상: 유전자 조각(A, B, C … 색 마디)이 떨어지고(결실) · 복사되고(중복) · 뒤집히고(역위) · 옮겨 붙는(전좌) 모습 */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const LEN = 0.9, CEN = 0.34, TOP = 3.0, BOT = TOP - 7 * 0.9 - 0.34 - 0.6;
  const C1 = { A: 0x60a5fa, B: 0x38bdf8, C: 0x22d3ee, D: 0x2dd4bf, E: 0x4ade80, F: 0xa3e635 };
  const C2 = { G: 0xfb7185, H: 0xf97316, I: 0xfbbf24, J: 0xf472b6, K: 0xe879f9, L: 0xc084fc };
  const colOf = (id) => C1[id] || C2[id] || 0x94a3b8;
  const NORM1 = ['A', 'B', 'C', '·', 'D', 'E', 'F'], NORM2 = ['G', 'H', 'I', '·', 'J', 'K', 'L'];
  const SCENE_OF = { meiosis: 'mei', fert: 'mei', karyo: 'mei', struct: 'struct', cases: 'struct', freq: 'struct' };

  window.SciSim3D.attach({
    title: '염색체 이상 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 13 : 11.5, theta: 0.3, phi: 1.38, target: [0, -0.4, 0], min: 6, max: 22 },
    autoRotate: 0,
    levels: [0, 1, 2],
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const V = THREE.Vector3;
      let scene = 'mei', kind = 'del', meiKind = 'normal', t = 0;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.4, metalness: 0.04 }, o || {}));
      const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
      const lerp = (a, b, k) => a + (b - a) * k;
      const stG = new THREE.Group(), meiG = new THREE.Group(); root.add(stG, meiG);
      const An = (g, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); g.add(o); return o; };
      // 컨트롤 줄에 새로 생긴 요소 모으기
      const ctlEl = () => document.querySelector('.v3-ctl');
      function grab(fn) { const c = ctlEl(), n = c.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(c.children, n) }; }

      /* ===================== ② 구조 이상 ===================== */
      const segGeo = new THREE.CylinderGeometry(0.33, 0.33, 1, 28), cenGeo = new THREE.CylinderGeometry(0.17, 0.17, 1, 20), arrGeo = new THREE.ConeGeometry(0.1, 0.28, 12);
      const live = [], stLabs = [];
      function clearSt() { live.forEach((o) => stG.remove(o.g)); live.length = 0; stLabs.forEach((l) => l.show(false)); stLabs.length = 0; }
      function makeSeg(id, x, y) {
        const g = new THREE.Group(), isC = id === '·', len = isC ? CEN : LEN;
        const m = new THREE.Mesh(isC ? cenGeo : segGeo, std(isC ? 0x64748b : colOf(id), { roughness: 0.45 })); m.scale.set(1, len - 0.04, 1); g.add(m);
        if (!isC) { const a = new THREE.Mesh(arrGeo, std(0xffffff, { roughness: 0.3, emissive: 0x555555 })); a.position.set(0.36, 0, 0); g.add(a); }
        g.position.set(x, y, 0); stG.add(g);
        return { id, g, len, x, y, to: null, delay: 0, dur: 1 };
      }
      function ys(list) { let y = TOP, out = []; list.forEach((id) => { const L2 = id === '·' ? CEN : LEN; out.push(y - L2 / 2); y -= L2; }); return out; }
      function build(list, x) {
        const yy = ys(list), arr = list.map((id, i) => makeSeg(id, x, yy[i]));
        arr.forEach((s) => { if (s.id !== '·') stLabs.push(label(s.id, s.g, { color: '#334155', size: 12 })); });
        live.push(...arr); return arr;
      }
      const L0 = { n1: label('정상 염색체', null, { color: '#166534' }), n2: label('이상 염색체', null, { color: '#991b1b' }) };
      function setKind(k) {
        kind = k; t = 0; clearSt();
        const two = k === 'tra', refX = two ? [-3.1, -1.9] : [-2.4], newX = two ? [1.9, 3.1] : [2.4];
        build(NORM1, refX[0]); if (two) build(NORM2, refX[1]);
        const m1 = build(NORM1, newX[0]), m2 = two ? build(NORM2, newX[1]) : null;
        const find = (arr, id) => arr.find((s) => s.id === id), yN = ys(NORM1);
        if (k === 'del') {
          const e = find(m1, 'E'), f = find(m1, 'F');
          e.to = { x: newX[0] + 2.2, y: e.y - 0.4, s: 0.05 }; e.delay = 0.3; e.dur = 1.6;
          f.to = { x: newX[0], y: f.y + LEN }; f.delay = 1.6; f.dur = 1.0;
        } else if (k === 'dup') {
          const b2 = makeSeg('B', newX[0] + 2.0, yN[1]); live.push(b2); stLabs.push(label('B', b2.g, { color: '#334155', size: 12 }));
          b2.to = { x: newX[0], y: yN[1] - LEN }; b2.delay = 0.3; b2.dur = 1.4;
          m1.forEach((s) => { if (['C', '·', 'D', 'E', 'F'].indexOf(s.id) >= 0) { s.to = { x: newX[0], y: s.y - LEN }; s.delay = 1.2; s.dur = 1.0; } });
        } else if (k === 'inv') {
          const B = find(m1, 'B'), C = find(m1, 'C'), cy = (B.y + C.y) / 2;
          [B, C].forEach((s) => { s.piv = cy; s.y0 = s.y; s.delay = 0.4; s.dur = 2.0; s.flip = true; });
        } else {
          const a = find(m1, 'E'), b = find(m1, 'F'), c = find(m2, 'K'), d = find(m2, 'L');
          [[a, newX[1]], [b, newX[1]], [c, newX[0]], [d, newX[0]]].forEach(([s, nx], i) => { s.to = { x: nx, y: s.y, z: i < 2 ? 1.2 : -1.2 }; s.delay = 0.4 + (i % 2) * 0.15; s.dur = 2.0; });
        }
        L0.n1.obj = An(stG, two ? (refX[0] + refX[1]) / 2 : refX[0], BOT, 0); L0.n2.obj = An(stG, two ? (newX[0] + newX[1]) / 2 : newX[0], BOT, 0);
        showSt(scene === 'struct'); textSt();
      }
      function showSt(v) { stLabs.forEach((l) => l.show(v)); L0.n1.show(v); L0.n2.show(v); }
      function textSt() {
        const h = {
          del: '<b>결실</b> · 염색체의 일부(E)가 <b>떨어져 없어져요</b>. 유전자의 양이 줄어요. (예: 고양이 울음 증후군)',
          dup: '<b>중복</b> · 일부(B)가 <b>복사되어 반복</b>돼요. 같은 유전자가 2개가 돼 양이 늘어요.',
          inv: '<b>역위</b> · 일부(B C)가 <b>거꾸로 뒤집혀</b> 붙어요. 유전자의 양은 같지만 <b>순서</b>가 바뀌어요.',
          tra: '<b>전좌</b> · <b>비상동 염색체</b>끼리 조각(E F ↔ K L)을 서로 바꿔요. 양은 같고 <b>위치</b>가 달라져요.',
        };
        info(h[kind] + '<br><span style="color:#9fb0d4">흰 삼각형은 조각의 방향이에요.</span>');
      }

      /* ===================== ① 수 이상 (감수 분열) ===================== */
      const MC = [0x3b82f6, 0xef4444], PL = [0.9, 1.15, 1.4];     // 어머니(파랑) · 아버지(빨강) 염색체, 쌍마다 길이가 달라요
      const cells = [];
      for (let side = 0; side < 2; side++) for (let s = 0; s < 2; s++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), std(0xcbd5e1, { transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, roughness: 0.3 }));
        meiG.add(m); cells.push({ m, side: side ? 1 : -1, s: s ? 1 : -1 });
      }
      const chroms = [];     // {p, h, g(중심체), sis:[메시, 메시], side}
      for (let p = 0; p < 3; p++) for (let h = 0; h < 2; h++) {
        const g = new THREE.Group(), sis = [];
        for (let s = 0; s < 2; s++) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, PL[p], 8, 16), std(MC[h], { roughness: 0.4 })); meiG.add(m); sis.push(m); }
        const cen = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), std(0xfde68a, { roughness: 0.4 })); g.add(cen);
        meiG.add(g); chroms.push({ p, h, g, sis, cen, side: 0, gi: [0, 0] });
      }
      const gLab = [0, 1, 2, 3].map(() => label('', null, { color: '#334155' }));
      const gAnch = cells.map(() => An(meiG, 0, 0, 0)); gLab.forEach((l, i) => { l.obj = gAnch[i]; l.off = [0, -1.5, 0]; l.show(false); });
      let gCount = [0, 0, 0, 0];
      function setMei(k) {
        meiKind = k; t = 0; lastSt = -1;
        gCount = [0, 0, 0, 0];
        chroms.forEach((c) => {
          const base = c.p === 1 ? (c.h === 0 ? 1 : -1) : (c.h === 0 ? -1 : 1);       // 감수 1분열 때 가는 극
          c.side = (k === 'nondis' && c.p === 2) ? 1 : base;
          const gBase = c.side === -1 ? 0 : 2;
          c.gi = [gBase, gBase + 1];                                                      // 2분열: 분체 하나씩 두 생식세포로
          if (k === 'nondis2' && c.p === 2 && c.h === 0) c.gi = [gBase, gBase];            // 2분열 비분리: 두 분체가 같은 쪽으로
          c.sis.forEach((m, si) => { gCount[c.gi[si]]++; });
        });
        // 생식세포 안에서의 자리
        const seen = [0, 0, 0, 0];
        chroms.forEach((c) => c.sis.forEach((m, si) => { m.userData.k = seen[c.gi[si]]++; m.userData.gi = c.gi[si]; }));
        textMei(0);
      }
      function textMei(st) {
        const T = {
          normal: '<b>정상 감수 분열</b> · 상동 염색체가 갈라지고(1분열) 염색 분체가 갈라져(2분열) 생식세포 4개가 돼요.',
          nondis: '<b>감수 1분열 비분리</b> · 3번째 상동 염색체 쌍이 <b>갈라지지 못하고 한쪽 극으로</b> 몰려요.',
          nondis2: '<b>감수 2분열 비분리</b> · 3번째 염색체의 <b>염색 분체가 갈라지지 못하고</b> 같은 생식세포로 가요.',
        };
        const R = {
          normal: '생식세포 4개 모두 염색체 <b>3개(n)</b>예요.',
          nondis: '생식세포 2개는 <b>2개(n−1)</b>, 2개는 <b>4개(n+1)</b>이에요. 수정되면 염색체 수 이상!',
          nondis2: '생식세포 1개는 <b>4개(n+1)</b>, 1개는 <b>2개(n−1)</b>, 나머지 2개는 정상(n)이에요.',
        };
        info(T[meiKind] + '<br>' + (st === 3 ? R[meiKind] : '<span style="color:#9fb0d4">파랑 = 어머니 염색체 · 빨강 = 아버지 염색체</span>'));
      }
      let lastSt = -1;
      function updMei() {
        const p1 = ease((t - 1.4) / 2.4), p2 = ease((t - 5.0) / 2.4);
        cells.forEach((c) => {
          const z2 = c.s * 1.6, x1 = c.side * 2.3;
          const x = lerp(0, x1, p1), z = lerp(0, z2, p2), r = lerp(lerp(2.7, 1.9, p1), 1.15, p2);
          c.m.position.set(x, 0, z); c.m.scale.setScalar(r);
        });
        const cnt = { '-1': [], '1': [] };
        chroms.forEach((c) => cnt[c.side].push(c));
        chroms.forEach((c) => {
          const idx = cnt[c.side].indexOf(c), n = cnt[c.side].length;
          const x0 = c.h ? 0.34 : -0.34, z0 = (c.p - 1) * 1.35;                        // 중기: 가운데에 상동 쌍으로 나란히
          const x1 = c.side * 2.3 + (idx - (n - 1) / 2) * 0.55;                          // 1분열 후: 각 딸세포 안
          const x = lerp(x0, x1, p1), z = lerp(z0, 0, p1);
          c.g.position.set(x, 0, z); c.cen.visible = p2 < 0.05;
          c.sis.forEach((m, si) => {
            const cell = cells[m.userData.gi], nn = gCount[m.userData.gi];
            const tx = cell.side * 2.3 + (m.userData.k - (nn - 1) / 2) * 0.5, tz = cell.s * 1.6;
            m.position.set(lerp(x, tx, p2), 0, lerp(z + (si ? 0.1 : -0.1), tz, p2));
          });
        });
        const st = t < 1.4 ? 0 : t < 3.8 ? 1 : t < 7.4 ? 2 : 3;
        if (st !== lastSt) { lastSt = st; textMei(st); }
        cells.forEach((c, i) => {
          gAnch[i].position.set(c.side * 2.3, 0, c.s * 1.6);
          const nn = gCount[i];
          gLab[i].show(st === 3); gLab[i].set(nn === 3 ? '염색체 3개 (n)' : nn === 2 ? '염색체 2개 (n−1)' : '염색체 4개 (n+1)');
        });
      }

      /* ---------- 컨트롤 ---------- */
      const g1 = grab(() => controls.segment('보기', [{ value: 'mei', label: '수 이상 (감수 분열)' }, { value: 'struct', label: '구조 이상' }], scene, (v) => setScene(v)));
      const g2 = grab(() => controls.segment('감수 분열', [{ value: 'normal', label: '정상' }, { value: 'nondis', label: '1분열 비분리' }, { value: 'nondis2', label: '2분열 비분리' }], meiKind, (v) => setMei(v)));
      const g3 = grab(() => controls.segment('유형', [{ value: 'del', label: '결실' }, { value: 'dup', label: '중복' }, { value: 'inv', label: '역위' }, { value: 'tra', label: '전좌' }], kind, (v) => setKind(v)));
      const g4 = grab(() => controls.button('↻ 다시 보기', () => { if (scene === 'mei') setMei(meiKind); else setKind(kind); }));
      function setScene(v) {
        scene = v; stG.visible = v === 'struct'; meiG.visible = v === 'mei';
        g2.els.forEach((e) => { e.style.display = v === 'mei' ? '' : 'none'; }); g3.els.forEach((e) => { e.style.display = v === 'struct' ? '' : 'none'; });
        g1.r.set(v);
        if (v === 'struct') { showSt(true); textSt(); orbit.dist = narrow ? 14 : 11.5; orbit.phi = 1.38; orbit.ty = -0.4; t = 0; setKind(kind); }
        else { showSt(false); gLab.forEach((l) => l.show(false)); orbit.dist = narrow ? 11 : 8.8; orbit.phi = 0.95; orbit.ty = 0; setMei(meiKind); }
      }
      setKind('del'); setMei('normal'); setScene('mei');

      let lastSim = null;
      return {
        update(dt) {
          dt = Math.min(dt, 0.05) * (window.__v3dTS || 1); t += dt;
          const sm = window.__sim && window.__sim.S && window.__sim.S.mode;
          if (sm && sm !== lastSim) { lastSim = sm; const sc = SCENE_OF[sm]; if (sc && sc !== scene) setScene(sc); }
          if (scene === 'mei') { updMei(); if (t > 15) { t = 0; lastSt = -1; } return; }
          live.forEach((s) => {
            const k = ease((t - s.delay) / s.dur);
            if (s.flip) { const th = Math.PI * k; s.g.position.set(s.g.position.x, s.piv + (s.y0 - s.piv) * Math.cos(th), (s.y0 - s.piv) * Math.sin(th) * -1.0); s.g.rotation.x = th; }
            else if (s.to) {
              s.g.position.set(lerp(s.x, s.to.x, k), lerp(s.y, s.to.y, k), s.to.z ? s.to.z * Math.sin(Math.PI * k) : 0);
              if (s.to.s !== undefined) { s.g.scale.setScalar(lerp(1, s.to.s, k)); if (k > 0.85) s.g.visible = false; }
            }
          });
        },
        sync() {},
      };
    },
  });
})();
