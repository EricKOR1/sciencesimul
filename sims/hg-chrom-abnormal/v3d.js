/* hg-chrom-abnormal · 3D 염색체 이상
   ① 수 이상: 감수 분열 때 상동 염색체가 한쪽으로 몰려 가는 '비분리' → 염색체가 n+1 · n−1개인 생식세포
   ② 구조 이상: 유전자 조각(A, B, C … 색 마디)이 떨어지고(결실) · 복사되고(중복) · 뒤집히고(역위) · 옮겨 붙는(전좌) 모습 */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const LEN = 0.9, CEN = 0.34, TOP = 3.0, BOT = TOP - 6 * 0.9 - 0.6;
  const C1 = { A: 0x60a5fa, B: 0x38bdf8, C: 0x22d3ee, D: 0x2dd4bf, E: 0x4ade80, F: 0xa3e635 };
  const C2 = { G: 0xfb7185, H: 0xf97316, I: 0xfbbf24, J: 0xf472b6, K: 0xe879f9, L: 0xc084fc };
  const colOf = (id) => C1[id] || C2[id] || 0x94a3b8;
  const NORM1 = ['A', 'B', 'C', 'D', 'E', 'F'], NORM2 = ['G', 'H'];   // 2D 염색체 편집과 같은 유전자 조각
  const SCENE_OF = { meiosis: 'mei', fert: 'mei', karyo: 'mei', struct: 'struct', cases: 'struct', freq: 'struct' };

  window.SciSim3D.attach({
    title: '염색체 이상 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 13 : 11.5, theta: 0.3, phi: 1.38, target: [0, -0.4, 0], min: 6, max: 22 },
    autoRotate: 0,
    levels: [0],   // 감수 분열 단계만 3D. 수정 · 핵형 카드 · 염색체 편집 · 빈도 그래프는 캔버스에서 해요
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
        const find = (arr, id) => arr.find((s) => s.id === id), yN = ys(NORM1), yH = ys(NORM2);
        if (k === 'del') {                         // 조각 E가 떨어져 없어지고 F가 올라와 이어져요
          const e = find(m1, 'E'), f = find(m1, 'F');
          e.to = { x: newX[0] + 2.2, y: e.y - 0.4, s: 0.05 }; e.delay = 0.3; e.dur = 1.6;
          f.to = { x: newX[0], y: f.y + LEN }; f.delay = 1.6; f.dur = 1.0;
        } else if (k === 'dup') {                  // C D 가 한 번 더 복사돼 붙어요 (2D '가상 사례 가')
          const c2 = makeSeg('C', newX[0] + 2.0, yN[2]), d2 = makeSeg('D', newX[0] + 2.0, yN[3]); live.push(c2, d2);
          stLabs.push(label('C', c2.g, { color: '#334155', size: 12 }), label('D', d2.g, { color: '#334155', size: 12 }));
          c2.to = { x: newX[0], y: yN[4] }; c2.delay = 0.3; c2.dur = 1.4; d2.to = { x: newX[0], y: yN[5] }; d2.delay = 0.3; d2.dur = 1.4;
          m1.forEach((q) => { if (q.id === 'E' || q.id === 'F') { q.to = { x: newX[0], y: q.y - 2 * LEN }; q.delay = 1.2; q.dur = 1.0; } });
        } else if (k === 'inv') {                  // C D E 가 거꾸로 뒤집혀요 (2D '가상 사례 나')
          const C = find(m1, 'C'), D = find(m1, 'D'), E = find(m1, 'E'), cy = D.y;
          [C, D, E].forEach((q) => { q.piv = cy; q.y0 = q.y; q.delay = 0.4; q.dur = 2.0; q.flip = true; });
        } else {                                   // 전좌: 염색체 사이에서 E F ↔ G H 를 서로 바꿔요
          const a = find(m1, 'E'), b = find(m1, 'F'), c = find(m2, 'G'), d = find(m2, 'H');
          [[a, newX[1], yH[0]], [b, newX[1], yH[1]], [c, newX[0], yN[4]], [d, newX[0], yN[5]]].forEach(([q, nx, ny], i) => { q.to = { x: nx, y: ny, z: i < 2 ? 1.2 : -1.2 }; q.delay = 0.4 + (i % 2) * 0.15; q.dur = 2.0; });
        }
        L0.n1.obj = An(stG, two ? (refX[0] + refX[1]) / 2 : refX[0], BOT, 0); L0.n2.obj = An(stG, two ? (newX[0] + newX[1]) / 2 : newX[0], BOT, 0);
        showSt(scene === 'struct'); textSt();
      }
      function showSt(v) { stLabs.forEach((l) => l.show(v)); L0.n1.show(v); L0.n2.show(v); }
      function textSt() {
        const h = {
          del: '<b>결실</b> · 염색체의 일부(E)가 <b>떨어져 없어져요</b>. 유전자의 양이 줄어요. (예: 고양이 울음 증후군)',
          dup: '<b>중복</b> · 일부(C D)가 <b>한 번 더 반복</b>돼요. 같은 유전자가 2개가 돼 양이 늘어요.',
          inv: '<b>역위</b> · 일부(C D E)가 <b>거꾸로 뒤집혀</b> 붙어요. 유전자의 양은 같지만 <b>순서</b>가 바뀌어요.',
          tra: '<b>전좌</b> · <b>비상동 염색체</b>끼리 조각(E F ↔ G H)을 서로 바꿔요. 양은 같고 <b>위치</b>가 달라져요. (예: 필라델피아 염색체)',
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
      for (let p = 2; p < 3; p++) for (let h = 0; h < 2; h++) {     // 2D처럼 21번 염색체 한 쌍만
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
          normal: '<b>정상 분열</b> · 21번 염색체 한 쌍: 상동 염색체가 갈라지고(1분열) 염색 분체가 갈라져(2분열) 생식세포 4개가 돼요.',
          nondis: '<b>감수 1분열 비분리</b> · 21번 상동 염색체 쌍이 <b>갈라지지 못하고 한쪽 극으로</b> 몰려요.',
          nondis2: '<b>감수 2분열 비분리</b> · 21번 염색체의 <b>염색 분체가 갈라지지 못하고</b> 같은 생식세포로 가요.',
        };
        const R = {
          normal: '생식세포 4개 모두 21번 염색체 <b>1개(n)</b>예요.',
          nondis: '생식세포 4개 아래 이름표의 염색체 수를 세어 오른쪽 표에 적어 보세요.',
          nondis2: '생식세포 4개 아래 이름표의 염색체 수를 세어 오른쪽 표에 적어 보세요.',
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
          const x0 = c.h ? 0.34 : -0.34, z0 = 0;                        // 중기: 가운데에 상동 쌍으로 나란히
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
          gLab[i].show(st === 3); gLab[i].set(nn === 1 ? '21번 1개 · 23개 (n)' : nn === 2 ? '21번 2개 · 24개 (n + 1)' : '21번 0개 · 22개 (n − 1)');
        });
      }

      /* ---------- 컨트롤 ---------- */
      const KIND2D = { normal: 'normal', nondis: 'ndj1', nondis2: 'ndj2' };
      const g2 = grab(() => controls.segment('감수 분열', [{ value: 'normal', label: '정상' }, { value: 'nondis', label: '1분열 비분리' }, { value: 'nondis2', label: '2분열 비분리' }], meiKind, (v) => { plMei.pause(); plMei.set(0); setMei(v); const L = ctx.lesson(); if (L && L.meKind && L.S.mode === 'meiosis') L.meKind(KIND2D[v]); }));
      const g3 = grab(() => controls.segment('유형', [{ value: 'del', label: '결실' }, { value: 'dup', label: '중복' }, { value: 'inv', label: '역위' }, { value: 'tra', label: '전좌' }], kind, (v) => { setKind(v); plSt.pause(); plSt.set(0); }));
      let plMei, plSt;
      const g4 = grab(() => { plMei = controls.player({
        duration: 15, loop: true, autoplay: true, label: '감수 분열',
        phases: [[0, '1분열 중기'], [1.4 / 15, '1분열 · 상동 염색체 분리'], [3.8 / 15, '2분열 · 염색 분체 분리'], [7.4 / 15, '생식세포 4개']],
        onFrame(p) { if (scene === 'mei') { t = p * 15; } },
      }); });
      const g5 = grab(() => { plSt = controls.player({
        duration: 5, loop: true, autoplay: true, label: '구조 이상',
        phases: [[0, '정상 염색체'], [0.1, '변화가 일어나요'], [0.75, '이상 염색체']],
        onFrame(p) { if (scene === 'struct') { t = p * 5; } },
      }); });
      function setScene(v) {
        scene = v; stG.visible = v === 'struct'; meiG.visible = v === 'mei';
        g2.els.forEach((e) => { e.style.display = v === 'mei' ? '' : 'none'; }); g3.els.forEach((e) => { e.style.display = v === 'struct' ? '' : 'none'; });
        g4.els.forEach((e) => { e.style.display = v === 'mei' ? '' : 'none'; }); g5.els.forEach((e) => { e.style.display = v === 'struct' ? '' : 'none'; });
        if (v === 'struct') { showSt(true); textSt(); orbit.dist = narrow ? 14 : 11.5; orbit.phi = 1.38; orbit.ty = -0.4; t = 0; setKind(kind); }
        else { showSt(false); gLab.forEach((l) => l.show(false)); orbit.dist = narrow ? 11 : 8.8; orbit.phi = 0.95; orbit.ty = 0; setMei(meiKind); }
      }
      setKind('del'); setMei('normal'); setScene('mei');

      /* 2D 상태를 따라가요: 화면(수 이상 · 구조 이상), 감수 분열 종류와 단계, 편집한 구조 이상의 유형 */
      let lastSim = null, lastMe = '', lastKindSt = null, follow = false;
      const MEKIND = { normal: 'normal', ndj1: 'nondis', ndj2: 'nondis2' }, MESTAGE = [0, 2.6, 3.8, 5.0, 8.0];
      function poll() {
        const L = ctx.lesson(); if (!L || !L.S) return;
        const sm = L.S.mode;
        if (sm && sm !== lastSim) { lastSim = sm; const sc = SCENE_OF[sm]; if (sc && sc !== scene) setScene(sc); }
        if (sm === 'meiosis' && L.me) {
          const k = MEKIND[L.me.kind], key = L.me.kind + ':' + L.me.stage;
          if (k && k !== meiKind) { setMei(k); g2.r.set(k); lastMe = ''; }
          if (key !== lastMe) {      // 2D의 [▶ 끝까지 실행] · [⏭ 한 단계씩]을 따라 3D도 그 단계로 가요
            lastMe = key; plMei.set(MESTAGE[L.me.stage] / 15);
            follow = !!(L.me.auto && L.me.stage < 4); if (follow) plMei.play(); else plMei.pause();
          }
          if (follow && (!plMei.playing || plMei.p >= MESTAGE[Math.min(4, L.me.stage + 1)] / 15)) { if (plMei.playing) { plMei.pause(); plMei.set(MESTAGE[Math.min(4, L.me.stage + 1)] / 15); } follow = false; }
        }
        if (sm === 'struct' && L.stInfo) {
          const kd = (L.stInfo() || {}).kind;
          if (kd && kd !== lastKindSt && ['del', 'dup', 'inv', 'tra'].indexOf(kd) >= 0) { lastKindSt = kd; if (kd !== kind) { setKind(kd); g3.r.set(kd); plSt.pause(); plSt.set(0); } }
        }
      }
      return {
        update(dt) {
          dt = Math.min(dt, 0.05) * (window.__v3dTS || 1);
          poll();
          if (scene === 'mei') { updMei(); return; }
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
