/* hx-solid-types · 3D 네 가지 결정 (이온 · 분자 · 공유 · 금속)
   2단계 '네 가지 결정'(모형 보기 · 분류하기)에서 2D가 고른 결정을 따라가요. 3단계 '성질 시험'의 시료를 고르면 그 결정도 보여 줘요.
   (2D 쪽 '결정의 종류' 단추와 시료 단추가 이 화면을 조절해요.)
   1단계(결정과 비결정): 확대경 속 입자 · 온도계를 2D의 가열 진행에 맞춰 보여 줘요 (곡선 읽기 · 분류는 2D).
   4단계(미지 시료 분류): 3D는 네 가지 결정 모형을 차례로 보여 주는 참고 화면이에요 (분류는 2D).
   입자가 3차원으로 어떻게 쌓여 있는지 돌려 보고, 한 층을 밀어 보며(망치로 치는 것과 같은 상황)
   결정마다 '깨지는가 / 펴지는가 / 아주 단단한가 / 쉽게 흩어지는가'를 입체 모형으로 확인해요.
   ※ 단위 세포·배위수·충전율 같은 수치는 다루지 않고 입자의 배열 모양만 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const COLORS = { Na: 0xf59e0b, Cl: 0x22b14c, Cu: 0xc7743b, C: 0x4b5563, O: 0xe23b3b, e: 0x60a5fa };
  const TYPES = {
    ion:   { nm: '이온 결정', ex: 'NaCl' },
    mol:   { nm: '분자 결정', ex: '드라이아이스(CO₂)' },
    cov:   { nm: '공유 결정', ex: '다이아몬드' },
    metal: { nm: '금속 결정', ex: 'Cu' },
  };

  // 휴대폰에서는 단계에 따라 도구 줄이 사라지므로 화면 오른쪽 아래의 떠 있는 버튼을 써요.
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const v3 = window.SciSim3D.attach({
    button: PHONE ? null : undefined,
    title: '네 가지 결정 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 10, theta: 0.7, phi: 1.1, min: 4, max: 24 },
    autoRotate: 0.22,
    levels: [1],   // 2단계(네 가지 결정 · 분류하기는 3D 막대의 단추로). 1단계(가열 곡선) · 3단계(비교표 칸 누르기) · 4단계(순서도)는 2D 화면이에요
    build(ctx) {
      /* 3D 화면 위 작은 판(기록표 · 카드 등): 2D 캔버스에만 그려지던 것을 3D 단계에서도 보이게 해요 */
      function v3pan(cls) {
        if (!document.getElementById('v3pan-css')) { const s = document.createElement('style'); s.id = 'v3pan-css'; s.textContent =
          '.v3pan{position:absolute;z-index:2;padding:6px 9px;border-radius:12px;background:rgba(8,12,24,.8);border:1px solid rgba(255,255,255,.16);color:#fff;font-size:12px;font-weight:700;line-height:1.35;pointer-events:none;max-width:48%}' +
          '.v3pan:empty{display:none}.v3pan.tr{right:10px;top:10px}.v3pan.bl{left:10px;bottom:10px}.v3pan .h{font-weight:900;margin-bottom:3px;font-size:12.5px}.v3pan .chip{display:inline-block;margin:1px 2px;padding:0 6px;border-radius:7px;background:rgba(255,255,255,.16);color:#eef3ff}.v3pan .chip.sel{background:#ffd34d;color:#1b2333}.v3pan.card{background:#fffdf7;color:#1b2333;border-top:5px solid var(--kc,#ffd34d);white-space:normal;max-width:min(260px,46%)}.v3pan.card .s{font-size:11.5px;font-weight:600;color:#475569}' +
          '.v3pan table{border-collapse:collapse}.v3pan th,.v3pan td{padding:1px 5px;text-align:center;white-space:nowrap}.v3pan th{color:#b9c6e4;text-align:left;font-weight:800}.v3pan td.e{color:#56658a}.v3pan .ok{color:#7ee2a8}.v3pan .hi{color:#ffd34d}' +
          '@media (max-width:599px){.v3pan{font-size:10.5px;padding:4px 6px;max-width:58%}.v3pan.tr{top:auto;bottom:30px;right:8px}.v3pan.bl{left:8px;bottom:8px;max-width:42%}.v3pan th,.v3pan td{padding:0 3px}.v3pan .h{font-size:11px}}';
          document.head.appendChild(s); }
        const el = document.createElement('div'); el.className = 'v3pan ' + (cls || 'tr'); ctx.renderer.domElement.parentElement.appendChild(el);
        let last = ''; el.put = (html) => { if (html !== last) { last = html; el.innerHTML = html; } }; return el;
      }
      const { THREE, root, label, info, controls, orbit } = ctx;
      const wrap = ctx.renderer.domElement.closest('.v3-wrap'), ctlEl = wrap.querySelector('.v3-ctl');
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: [].slice.call(ctlEl.children, n0) }; };
      let type = 'ion', cov = 'diamond', amt = 0, current = false, sl = null, curB = null;
      let S = null;                      // 현재 장면 { update(dt,t), apply(v), text() }
      const g = new THREE.Group(); root.add(g);
      const labs = [label('', [0, 0, 0]), label('', [0, 0, 0]), label('', [0, 0, 0])]; labs.forEach((l) => l.show(false));
      const UP = new THREE.Vector3(0, 1, 0);
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
      const geoCache = {};
      const sg = (r) => geoCache[r] || (geoCache[r] = new THREE.SphereGeometry(r, 32, 22));
      const deep = (c, k) => { const a = new THREE.Color(c); return a.lerp(a.clone().convertSRGBToLinear(), k == null ? 0.7 : k); };   // 화면에서 색이 옅어지지 않게 조금 진하게
      const matCache = {};
      const mat = (c, o) => { const k = c + '|' + (o || 1); return matCache[k] || (matCache[k] = (o || 1) < 1 ? new THREE.MeshStandardMaterial({ color: deep(c), roughness: 0.3, transparent: true, opacity: o }) : ctx.mats.plastic(deep(c), { roughness: 0.26 })); };   // 공 · 막대 모형: 매끈한 플라스틱 광택
      function ball(r, c, o) { return new THREE.Mesh(sg(r), mat(c, o)); }
      function stickTo(m, a, b) { const d = b.clone().sub(a), len = Math.max(1e-4, d.length()); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(1, len, 1); }
      const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 16);
      function stick(r, c) { const m = new THREE.Mesh(unitCyl, mat(c)); m.scale.set(r, 1, r); m.userData.r = r; return m; }
      function stickSet(m, a, b) { const d = b.clone().sub(a), len = Math.max(1e-4, d.length()); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(m.userData.r, len, m.userData.r); }
      function center(items) { const c = new THREE.Vector3(); items.forEach((it) => c.add(it.base)); c.multiplyScalar(1 / items.length); items.forEach((it) => it.base.sub(c)); }
      function clear() { while (g.children.length) g.remove(g.children[0]); labs.forEach((l) => l.show(false)); }

      /* ---------- 이온 결정 (NaCl) ---------- */
      function sceneIon() {
        const items = [];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
          const na = (i + j + k) % 2 === 0, m = na ? ball(0.2, COLORS.Na) : ball(0.33, COLORS.Cl);
          items.push({ m, base: V3(i, j, k), top: j >= 2, na, i, j, k }); g.add(m);
        }
        center(items);
        const rep = [];
        for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(unitCyl, new THREE.MeshBasicMaterial({ color: 0xff3b3b, depthTest: false })); b.renderOrder = 10; b.scale.set(0.05, 0.6, 0.05); b.visible = false; g.add(b); rep.push({ b, i, k }); }
        const first = (na) => items.find((x) => x.na === na && x.j === 3 && x.i === 1).m;
        labs[0].obj = items.find((x) => x.na && x.i === 0 && x.j === 0 && x.k === 0).m; labs[0].set('Na⁺'); labs[0].el.style.background = 'rgba(217,119,6,.95)'; labs[0].off = [0, 0.55, 0]; labs[0].show(true);
        labs[1].obj = items.find((x) => !x.na && x.i === 1 && x.j === 0 && x.k === 0).m; labs[1].set('Cl⁻'); labs[1].el.style.background = 'rgba(21,128,61,.95)'; labs[1].off = [0, 0.6, 0]; labs[1].show(true);
        const cy = items.find((x) => x.j === 2).base.y - 0.5;
        let apply = (v) => {
          const sh = v, lift = Math.max(0, (v - 0.8) / 0.2) * 0.45;
          items.forEach((it) => { it.m.position.copy(it.base); if (it.top) { it.m.position.x += sh; it.m.position.y += lift; } });
          rep.forEach((r) => {
            const bot = items.find((x) => x.j === 1 && x.k === r.k && x.i === r.i), top = items.find((x) => x.j === 2 && x.k === r.k && x.i === r.i - 1);
            const on = !!top && v > 0.78;
            r.b.visible = on; if (on) { const a = bot.m.position, b = top.m.position; stickSet(r.b, a, b); r.b.scale.x = r.b.scale.z = 0.04; }
          });
          const same = v > 0.78;
          labs[2].obj = [0, cy + lift * 0.5, 0]; labs[2].set('같은 전하끼리 마주 봐요!'); labs[2].el.style.background = 'rgba(220,38,38,.95)'; labs[2].show(same);
        };
        return {
          apply, text(v) {
            return '<b>이온 결정 (NaCl)</b><br>Na⁺과 Cl⁻이 정전기적 인력으로 번갈아 3차원으로 쌓여 있어요.' + (v < 0.2 ? '<br>위쪽 절반을 오른쪽으로 밀어 보세요 (망치로 때리는 것과 같아요).' : v < 0.78 ? '<br>밀수록 +와 −가 어긋나기 시작해요…' : '<br><b style="color:#fca5a5">같은 부호의 이온이 마주 보며 밀어내요</b> → 결정이 쪼개져요. 이온 결정이 단단하지만 부서지기 쉬운 까닭이에요.');
          },
          update() {},
        };
      }

      /* ---------- 금속 결정 (최조밀 쌓임 + 자유 전자) ---------- */
      function sceneMetal() {
        const u = 1 / Math.SQRT2, items = [];
        for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) for (let k = 0; k < 5; k++) if ((i + j + k) % 2 === 0) {
          const m = ball(0.47, COLORS.Cu); g.add(m); items.push({ m, base: V3(i * u, j * u, k * u), top: j >= 3 });
        }
        center(items);
        const half = 2 * u + 0.5, ext = { x: half + 0.2, y: half + 0.1, z: half + 0.2 };
        const box = new THREE.Mesh(new THREE.BoxGeometry(ext.x * 2, ext.y * 2, ext.z * 2), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.07, depthWrite: false })); g.add(box);
        const els = [];
        for (let n = 0; n < 70; n++) {
          const m = ball(0.085, COLORS.e); m.material = mat(COLORS.e); g.add(m);
          els.push({ m, p: V3((Math.random() * 2 - 1) * ext.x, (Math.random() * 2 - 1) * ext.y, (Math.random() * 2 - 1) * ext.z), v: V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.8 + Math.random() * 0.6) });
        }
        labs[0].obj = items[0].m; labs[0].set('금속 양이온'); labs[0].el.style.background = 'rgba(180,83,9,.95)'; labs[0].off = [0, 0.7, 0]; labs[0].show(true);
        labs[1].obj = els[0].m; labs[1].set('자유 전자'); labs[1].el.style.background = 'rgba(37,99,235,.95)'; labs[1].off = [0, 0.35, 0]; labs[1].show(true);
        let sh = 0;
        const apply = (v) => { sh = v * 2 * u * 1.0; items.forEach((it) => { it.m.position.copy(it.base); if (it.top) it.m.position.x += sh; }); };
        return {
          apply,
          text(v) {
            return '<b>금속 결정 (Cu)</b><br>금속 양이온이 빈틈없이 쌓이고, 그 사이를 <span style="color:#93c5fd">자유 전자</span>가 돌아다녀요.' +
              (current ? '<br>전압을 걸면 자유 전자가 한 방향으로 흘러 <b>전기가 통해요</b>.' : v > 0.3 ? '<br>층을 밀어도 전자가 양이온을 계속 붙잡고 있어서 <b>깨지지 않고 펴져요</b>.' : '<br>위쪽 층을 밀어 보거나, 전류를 흘려 보세요.');
          },
          update(dt, t) {
            els.forEach((e) => {
              e.p.addScaledVector(e.v, dt);
              if (current) e.p.x += dt * 1.4;
              ['x', 'y', 'z'].forEach((a) => { const L = ext[a]; if (current && a === 'x') { if (e.p.x > L) e.p.x -= 2 * L; } else if (e.p[a] > L) { e.p[a] = L; e.v[a] *= -1; } else if (e.p[a] < -L) { e.p[a] = -L; e.v[a] *= -1; } });
              e.m.position.copy(e.p);
            });
          },
        };
      }

      /* ---------- 공유 결정: 다이아몬드 / 흑연 ---------- */
      function bondsOf(items, lenMin, lenMax) {
        const out = [];
        for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) { const d = items[a].base.distanceTo(items[b].base); if (d > lenMin && d < lenMax) out.push([a, b]); }
        return out;
      }
      function sceneDiamond() {
        const A = 4 / Math.sqrt(3)           // 결합 길이가 1이 되는 격자 상수: a = 4/√3
       , items = [], seen = new Set();
        const fcc = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]];
        for (let cx = -1; cx <= 2; cx++) for (let cy = -1; cy <= 2; cy++) for (let cz = -1; cz <= 2; cz++) fcc.forEach((f) => [0, 0.25].forEach((o) => {
          const p = [cx + f[0] + o, cy + f[1] + o, cz + f[2] + o];
          if (p.some((x) => x < -0.001 || x > 1.501)) return;
          const key = p.map((x) => Math.round(x * 100)).join(','); if (seen.has(key)) return; seen.add(key);
          const m = ball(0.2, COLORS.C); m.material = mat(0x7b8799); g.add(m);
          items.push({ m, base: V3(p[0] * A, p[1] * A, p[2] * A), top: p[1] >= 0.74 });
        }));
        center(items);
        const bonds = bondsOf(items, 0.9, 1.1).map(([i, j]) => { const s = stick(0.055, 0xcbd5e1); g.add(s); return { i, j, s }; });
        labs[0].obj = items[0].m; labs[0].set('탄소 원자'); labs[0].el.style.background = 'rgba(75,85,99,.95)'; labs[0].off = [0, 0.5, 0]; labs[0].show(true);
        const apply = (v) => {
          items.forEach((it) => { it.m.position.copy(it.base); if (it.top) it.m.position.x += v * 1.3; });
          bonds.forEach((b) => { const p = items[b.i].m.position, q = items[b.j].m.position; stickSet(b.s, p, q); const st = p.distanceTo(q); b.s.material = st > 1.15 ? mat(0xff4d4d) : mat(0xcbd5e1); b.s.visible = st < 2.1 || true; });
        };
        return {
          apply,
          text(v) {
            return '<b>공유 결정: 다이아몬드(C)</b><br>모든 탄소 원자가 이웃 4개와 공유 결합으로 이어진 거대한 그물이에요.' +
              (v < 0.15 ? '<br>위쪽 절반을 밀어 보세요.' : '<br><b style="color:#fca5a5">빨간 결합</b>이 늘어나 끊어져야만 밀려요 → 매우 단단하고 녹는점이 아주 높아요.');
          },
          update() {},
        };
      }
      function sceneGraphite() {
        const items = [], s3 = Math.sqrt(3);
        for (let L = 0; L < 3; L++) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) [[0, 0], [s3 / 2, 0.5]].forEach(([bx, bz]) => {
          const x = i * s3 + j * s3 / 2 + bx + (L === 1 ? 0 : 0), z = j * 1.5 + bz + (L === 1 ? 1 : 0);
          const m = ball(0.17, COLORS.C); m.material = mat(0x7b8799); g.add(m);
          items.push({ m, base: V3(x, L * 2.36, z), layer: L });
        });
        center(items);
        const bonds = bondsOf(items.map((it) => ({ base: V3(it.base.x, 0, it.base.z).add(V3(0, it.layer * 100, 0)) })), 0.9, 1.1).map(([i, j]) => { const s = stick(0.05, 0xcbd5e1); g.add(s); return { i, j, s }; });
        const planes = [0, 1, 2].map((L) => { const p = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.5, 5.2), new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.13, depthWrite: false })); g.add(p); return p; });
        const y0 = items[0].base.y;
        labs[0].obj = [0, 2.36 * 0.5 + y0, -3.2]; labs[0].set('층 사이: 약한 힘'); labs[0].el.style.background = 'rgba(100,116,139,.95)'; labs[0].show(true);
        labs[1].obj = [0, y0 + 2.36 + 0.55, 0]; labs[1].set('층 안: 공유 결합 그물'); labs[1].el.style.background = 'rgba(75,85,99,.95)'; labs[1].show(true);
        const apply = (v) => {
          items.forEach((it) => { it.m.position.copy(it.base); if (it.layer === 1) it.m.position.x += v * 2.8; });
          bonds.forEach((b) => stickSet(b.s, items[b.i].m.position, items[b.j].m.position));
          planes.forEach((p, L) => { p.position.set(L === 1 ? v * 2.8 : 0, items[0].base.y + L * 2.36 + 0.3, 0); });
        };
        return {
          apply,
          text(v) {
            return '<b>공유 결정: 흑연(C)</b> <span style="color:#9fb0d4">(같은 탄소, 다른 배열)</span><br>층 안은 공유 결합 그물이지만, 층과 층 사이는 약해서 가운데 층을 밀면 <b>쉽게 미끄러져요</b>. 연필심이 부드러운 까닭이에요.' +
              '<br><span style="color:#93c5fd">파란 판</span>: 층을 따라 움직일 수 있는 전자 → 흑연은 전기가 통해요 (공유 결정으로는 예외).';
          },
          update() {},
        };
      }

      /* ---------- 분자 결정 (드라이아이스 CO₂) ---------- */
      function sceneMol() {
        const NN = 2.1, u = NN / Math.SQRT2, mols = [];
        const ORI = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((d) => V3(d[0], d[1], d[2]).normalize());
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) if ((i + j + k) % 2 === 0) {
          const o = ORI[(i % 2) * 2 + (j % 2)], grp = new THREE.Group();
          const c = ball(0.2, COLORS.C); c.material = mat(0x5b6578);
          const o1 = ball(0.27, COLORS.O), o2 = ball(0.27, COLORS.O);
          o1.position.copy(o).multiplyScalar(0.6 * 0.9); o2.position.copy(o).multiplyScalar(-0.6 * 0.9);
          const s1 = stick(0.06, 0xcbd5e1), s2 = stick(0.06, 0xcbd5e1);
          stickSet(s1, V3(0, 0, 0), o1.position); stickSet(s2, V3(0, 0, 0), o2.position);
          grp.add(c, o1, o2, s1, s2); g.add(grp);
          mols.push({ grp, base: V3(i * u, j * u, k * u), ph: Math.random() * 6.28, r: V3(Math.random() - 0.5, Math.random() * 0.8 + 0.4, Math.random() - 0.5).normalize(), sp: 0.5 + Math.random() });
        }
        center(mols);
        const cen = mols.reduce((s, m) => s.add(m.base), V3(0, 0, 0)).multiplyScalar(1 / mols.length);
        labs[0].obj = mols[0].grp; labs[0].set('CO₂ 분자 1개'); labs[0].el.style.background = 'rgba(14,116,144,.95)'; labs[0].off = [0, 0.55, 0]; labs[0].show(true);
        let heat = 0;
        const apply = (v) => { heat = v; };
        return {
          apply,
          text(v) {
            return '<b>분자 결정 (드라이아이스 CO₂)</b><br>입자는 CO₂ <b>분자</b>예요. 분자 안은 공유 결합이지만, 분자 사이의 힘은 약해요.' +
              (v < 0.2 ? '<br>아래 슬라이더로 가열해 보세요.' : v < 0.7 ? '<br>조금만 열을 가해도 분자들이 크게 흔들려요.' : '<br><b style="color:#fca5a5">분자 사이의 약한 힘이 쉽게 끊어져</b> 분자들이 떨어져 나가요 (녹는점·승화점이 낮아요).');
          },
          update(dt, t) {
            mols.forEach((m) => {
              const amp = 0.02 + heat * 0.22, ex = 1 + heat * 0.2;
              const p = m.base.clone().multiplyScalar(ex);
              p.x += Math.sin(t * (3 + m.sp * 3) + m.ph) * amp; p.y += Math.sin(t * (3.3 + m.sp * 2.5) + m.ph * 1.7) * amp; p.z += Math.sin(t * (2.7 + m.sp * 3) + m.ph * 0.6) * amp;
              const esc = Math.max(0, heat - 0.62) / 0.38;
              if (esc > 0) { const far = m.base.clone().sub(cen); const w = (0.3 + m.sp * 0.6) * esc * (1 + (far.length() / 4)); p.addScaledVector(m.r, w * 4.5); }
              m.grp.position.copy(p);
              m.grp.rotation.set(Math.sin(t * 2 + m.ph) * heat * 0.8, Math.sin(t * 1.7 + m.ph) * heat * 0.8, Math.sin(t * 2.4 + m.ph) * heat * 0.8);
            });
          },
        };
      }

      function setScene() {
        clear();
        S = type === 'ion' ? sceneIon() : type === 'metal' ? sceneMetal() : type === 'cov' ? (cov === 'diamond' ? sceneDiamond() : sceneGraphite()) : sceneMol();
        const sizes = { ion: 9.5, metal: 9, cov: cov === 'diamond' ? 10 : 13, mol: 13 };
        const vv = ctx.renderer.domElement, asp = Math.max(0.3, vv.clientWidth / Math.max(1, vv.clientHeight)); orbit.dist = sizes[type] * (asp < 1 ? Math.min(2, 1 / asp) : 1); orbit.tx = orbit.ty = orbit.tz = 0;
        S.apply(amt); show();
        covEls.forEach((e) => { e.hidden = type !== 'cov'; });
        curEls.forEach((e) => { e.hidden = type !== 'metal'; });
      }
      function show() { if (sortMode()) { lastSort = sortHtml(); info(lastSort); return; } info((note ? '<span style="color:#ffd34d">' + note + TYPES[type].nm + '</span><br>' : '') + S.text(amt)); }
      const SLB = { ion: '층 밀기', metal: '층 밀기', cov: '층 밀기', mol: '가열' };

      function pickType(v) { type = v; amt = 0; if (sl) sl.set(0); current = false; if (curB) { curB.classList.remove('on'); curB.textContent = '전류 흘리기 ✕'; } setScene(); }
      const cg = grab(() => controls.segment('', [{ value: 'diamond', label: '다이아몬드' }, { value: 'graphite', label: '흑연' }], cov, (v) => { cov = v; amt = 0; sl.set(0); setScene(); }));
      const covEls = cg.els;
      const cb = grab(() => controls.button('전류 흘리기 ✕', () => { current = !current; curB.classList.toggle('on', current); curB.textContent = '전류 흘리기 ' + (current ? '✓' : '✕'); show(); }));
      curB = ctlEl.lastElementChild; const curEls = cb.els;
      const slg = grab(() => controls.range('', 0, 1, 0.01, 0, (v) => { amt = v; S.apply(v); show(); }, (v) => SLB[type] + ' ' + (v < 0.03 ? '0' : Math.round(v * 100) + '%')));
      sl = slg.r; { const w = document.createElement('span'); w.style.cssText = 'display:inline-flex;align-items:center;gap:6px;white-space:nowrap'; slg.els[0].parentNode.insertBefore(w, slg.els[0]); slg.els.forEach((e) => w.appendChild(e)); }

      controls.player({
        duration: 8, loop: true, autoplay: false, label: '재생',
        phases: [[0, '밀기 · 가열'], [0.8, '되돌리기']],
        onFrame(p) {
          if (!S || !sl) return;
          const e = p < 0.8 ? p / 0.8 : 1 - (p - 0.8) / 0.2; amt = e * e * (3 - 2 * e);
          sl.set(amt); S.apply(amt); show();
        },
      });
      /* 2D가 고른 결정: 네 가지 결정 → 보는 결정 / 성질 시험 → 고른 시료의 결정 종류 */
      let note = '';
      function want() {
        try {
          const w = window.__sim, S2 = w.S;
          if (S2.mode === 'types' && TYPES[S2.types.cur]) { note = ''; return S2.types.cur; }
          if (S2.mode === 'bench' && w.SP[S2.bench.cur]) { const sp = w.SP[S2.bench.cur]; note = '시료: ' + sp.nm + ' → '; return sp.type; }
          note = ''; return null;
        } catch (e) { return null; }
      }

      /* ---------- 결정과 비결정(2D 1단계): 확대경 속 입자 + 온도 — 2D의 가열 진행(prog)을 그대로 따라가요 ---------- */
      const HKS = (window.__sim && window.__sim.HK) || ['salt', 'sugar', 'ice', 'cu', 'glass', 'plastic'];
      const ctlOld = Array.prototype.slice.call(ctlEl.children);
      const gH = new THREE.Group(); root.add(gH); gH.visible = false;
      const HPR = 2.5;
      const hrng = (() => { let a = 12345; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
      const rndIn = (R) => { for (;;) { const v = V3(hrng() * 2 - 1, hrng() * 2 - 1, hrng() * 2 - 1); if (v.length() <= 1) return v.multiplyScalar(R); } };
      const darts = (n, minD, R) => { const pts = []; let guard = 0; while (pts.length < n && guard++ < 5000) { const v = rndIn(R); if (pts.every((q) => q.distanceTo(v) >= minD)) pts.push(v); } while (pts.length < n) pts.push(rndIn(R)); return pts; };
      const hMat = {}; const hm = (k, c) => hMat[k] || (hMat[k] = ctx.mats.plastic(deep(c), { roughness: 0.26, extra: { emissive: 0x000000 } }));
      const KINDS = {};
      function kindOf(kind, hs) {
        if (KINDS[kind + hs.c]) return KINDS[kind + hs.c];
        const K = { parts: [], bonds: [], el: [] };
        const add = (a, b, r, col, mol) => K.parts.push({ a, b, r, col, mol, ph: hrng() * 6.28, rot: V3(hrng() * 6.28, hrng() * 6.28, hrng() * 6.28) });
        if (kind === 'salt') { const rr = darts(64, 0.55, HPR * 0.95); let n = 0; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) { const na = (i + j + k) % 2 === 0; add(V3(i - 1.5, j - 1.5, k - 1.5).multiplyScalar(0.92), rr[n++], na ? 0.2 : 0.33, na ? 0xf59e0b : 0x22b14c); } }
        else if (kind === 'mol') { const rr = darts(18, 0.95, HPR * 0.9); let n = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) add(V3(i - 1, j - 1, k - 0.5).multiplyScalar(1.3), rr[n++], 0.3, hs.c === '#38bdf8' ? 0x38bdf8 : 0xf59e0b, true); }
        else if (kind === 'metal') { const rr = darts(32, 0.6, HPR * 0.9); let n = 0; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 2; k++) add(V3(i - 1.5, j - 1.5, k - 0.5).multiplyScalar(0.95), rr[n++], 0.27, 0xd97706); for (let e = 0; e < 22; e++) K.el.push({ a: hrng() * 6.28, b: hrng() * 6.28, v: 0.4 + hrng() * 0.5, R: 0.8 + hrng() * 1.3 }); }
        else if (kind === 'glass') { const rr = darts(40, 0.85, HPR * 0.95); rr.forEach((v, i) => add(v.clone(), v.clone(), i % 2 ? 0.2 : 0.28, i % 2 ? 0xe2464b : 0x94a3b8)); for (let i = 0; i < rr.length; i++) for (let j = i + 1; j < rr.length; j++) if (rr[i].distanceTo(rr[j]) < 1.25) K.bonds.push([i, j]); }
        else { for (let c = 0; c < 4; c++) { let p = rndIn(HPR * 0.6), d = V3(hrng() - 0.5, hrng() - 0.5, hrng() - 0.5).normalize(); for (let k = 0; k < 9; k++) { add(p.clone(), p.clone(), 0.2, 0xf87171); if (k) K.bonds.push([c * 9 + k - 1, c * 9 + k]); d.add(V3(hrng() - 0.5, hrng() - 0.5, hrng() - 0.5).multiplyScalar(1.1)).normalize(); p = p.clone().addScaledVector(d, 0.62); if (p.length() > HPR * 0.9) p.multiplyScalar(0.8); } } }
        KINDS[kind + hs.c] = K; return K;
      }
      const lensG = new THREE.Group(); gH.add(lensG);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(HPR + 0.35, 0.13, 18, 96), ctx.mats.metal('brass', { roughness: 0.24 })); ring.position.z = 0; gH.add(ring);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(HPR + 0.25, 40, 28), ctx.mats.glass({ tint: 0xd9eaff, opacity: 0.13, extra: { side: THREE.FrontSide } })); gH.add(lens);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.2, 24), ctx.mats.wood(0x8a5a36, { repeat: 1 })); handle.position.set(HPR * 0.9 + 0.4, -HPR * 0.9 - 0.7, 0); handle.rotation.z = 0.78; gH.add(handle);
      const flame = new THREE.Group(); [[0.55, 1.5, 0xff8a1f], [0.35, 1.0, 0xffd34d]].forEach(([r, h, c]) => { const f = new THREE.Mesh(new THREE.ConeGeometry(r, h, 16), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.1, transparent: true, opacity: 0.88, depthWrite: false })); f.position.y = h / 2; flame.add(f); }); ctx.halo(flame, 0xffa040, 4.2, 0.6).position.y = 0.7; flame.position.set(0, -HPR - 1.5, 0); gH.add(flame);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.5, 32), ctx.mats.metal('iron', { roughness: 0.4 })); stand.position.set(0, -HPR - 2.2, 0); gH.add(stand);
      /* 온도계 */
      const TH_X = -HPR - 1.9, TH_H = 4.4;
      const thTube = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, TH_H, 24), ctx.mats.glass({ opacity: 0.28 })); thTube.position.set(TH_X, 0, 0); gH.add(thTube);
      const thBulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), ctx.mats.plastic(0xc81e24, { roughness: 0.12 })); thBulb.position.set(TH_X, -TH_H / 2 - 0.1, 0); gH.add(thBulb);
      const thFill = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12), new THREE.MeshStandardMaterial({ color: 0xc81e24, emissive: 0x7a1010, emissiveIntensity: 0.5, roughness: 0.2 })); gH.add(thFill);
      const lTh = label('', [TH_X, TH_H / 2 + 0.55, 0], { color: 'rgba(30,41,59,.9)' }); lTh.show(false);
      const lOrd = label('', [0, HPR + 0.9, 0], { color: 'rgba(30,41,59,.9)' }); lOrd.show(false);
      let hPool = null, hKey = '', hObjs = [], hBonds = [], hElm = [];
      function buildHeat(hs) {
        while (lensG.children.length) lensG.remove(lensG.children[0]);
        const K = kindOf(hs.kind, hs); hKey = hs.id; hObjs = []; hBonds = []; hElm = [];
        K.parts.forEach((q) => {
          let o;
          if (q.mol) { o = new THREE.Group(); o.add(new THREE.Mesh(sg(0.32), hm('m' + q.col, q.col))); [[0.55, 0.42], [-0.55, 0.42]].forEach(([x, y]) => { const h = new THREE.Mesh(sg(0.17), hm('hh', 0xf1f5f9)); h.position.set(x, y, 0); o.add(h); }); }
          else o = new THREE.Mesh(sg(q.r), hm('p' + q.col + q.r, q.col));
          lensG.add(o); hObjs.push(o);
        });
        K.bonds.forEach(() => { const b = new THREE.Mesh(unitCyl, hm('bd', 0x94a3b8)); b.scale.set(0.05, 1, 0.05); lensG.add(b); hBonds.push(b); });
        K.el.forEach(() => { const e = new THREE.Mesh(sg(0.09), hm('el', 0xfde047)); e.material.emissive.setHex(0x9a7b00); lensG.add(e); hElm.push(e); });
        hPool = K;
      }
      const HNAME = {};
      function updHeat(w, t) {
        const S2 = w.S, h = S2.heat, hs = w.HS[h.cur], sm0 = h.smp[h.cur];
        if (hKey !== hs.id) buildHeat(hs);
        const T0 = w.HT(hs, sm0.prog), ord = w.HORD(hs, sm0.prog), soft = w.HSOFT(hs, T0), heatK = Math.max(0, Math.min(1, (T0 - hs.T0) / (hs.T1 - hs.T0)));
        const jit = hs.crystal ? (ord > 0.5 ? 0.008 + 0.022 * heatK : 0.045) : 0.01 + 0.05 * soft, amp = jit * HPR * 2.4, k = 1 - ord;
        hPool.parts.forEach((q, i) => {
          const o = hObjs[i], ph = q.ph;
          o.position.set(q.a.x + (q.b.x - q.a.x) * k + Math.sin(t * (2.2 + (i % 5) * 0.37) + ph) * amp, q.a.y + (q.b.y - q.a.y) * k + Math.cos(t * (2.7 + (i % 4) * 0.41) + ph * 1.3) * amp, q.a.z + (q.b.z - q.a.z) * k + Math.sin(t * 1.9 + ph * 0.7) * amp);
          if (q.mol) o.rotation.set(q.rot.x * k + Math.sin(t * 1.3 + i) * 0.1, q.rot.y * k, q.rot.z * k);
          const m0 = o.isGroup ? o.children[0].material : o.material; if (!hs.crystal) m0.emissive.setRGB(soft * 0.5, soft * 0.18, 0); else m0.emissive.setRGB(0, 0, 0);
        });
        hPool.bonds.forEach((b, i) => { const p = hObjs[b[0]].position, q = hObjs[b[1]].position; stickSet(hBonds[i], p, q); hBonds[i].scale.x = hBonds[i].scale.z = 0.05; });
        hPool.el.forEach((e, i) => { const q = hPool.el[i]; hElm[i].position.set(Math.cos(q.a + t * q.v) * q.R, Math.sin(q.b + t * q.v * 1.3) * q.R * 0.8, Math.sin(q.a * 1.3 + t * q.v * 0.8) * q.R * 0.6); });
        flame.visible = !!h.run; flame.scale.set(1, 0.9 + 0.2 * Math.sin(t * 9), 1);
        thFill.scale.set(1, Math.max(0.05, heatK * TH_H), 1); thFill.position.set(TH_X, -TH_H / 2 + heatK * TH_H / 2, 0);
        const ordTxt = hs.crystal ? (ord > 0.5 ? '입자가 규칙적으로 배열 (결정)' : '입자 배열이 흐트러졌어요 (액체)') : '입자가 불규칙하게 배열 (비결정)';
        const st = hs.crystal ? (sm0.prog <= 0 ? '고체' : sm0.prog < w.PL[0] ? '고체' : sm0.prog <= w.PL[1] ? '녹는 중 · 온도가 일정해요' : '액체') : (soft < 0.04 ? '단단한 고체' : soft < 0.7 ? '서서히 무르는 중' : '많이 무른 상태');
        lTh.set('온도 ' + (Math.round(T0) > 0 ? '+' : '') + Math.round(T0) + ' °C'); lOrd.set(ordTxt);
        return '<b>🔍 확대경 속 ' + hs.nm + ' (' + hs.f + ')</b><br>' + ordTxt + '<br>' + st + (sm0.done ? '<br>' + hs.note : h.run ? '<br>가열하는 중…' : '<br>🔥 가열하기를 눌러요.');
      }
      const hCtl = grab(() => controls.segment('시료', HKS.map((k) => ({ value: k, label: window.__sim.HS[k].nm })), 'salt', (v) => { const w = window.__sim; if (w) { const b = document.querySelector('#hChips button[data-v="' + v + '"]'); if (b) b.click(); } }));
      const hGo = grab(() => controls.button('🔥 가열하기', () => { const b = document.getElementById('bHeat'); if (b) b.click(); }));
      const hFast = grab(() => controls.button('⏩ 빠르게', () => { const b = document.getElementById('bFast'); if (b) b.click(); }));
      let heatOn = false, modeNow = '', clsT = 0;
      [hCtl, hGo, hFast].forEach((c) => c.els.forEach((e) => { e.style.display = 'none'; }));   // 가열 단추는 '결정과 비결정' 화면에서만
      function setHeatOn(on) {
        if (on === heatOn) return; heatOn = on; gH.visible = on; g.visible = !on;
        ctlOld.forEach((e) => { e.style.display = on ? 'none' : ''; });
        [hCtl, hGo, hFast].forEach((c) => c.els.forEach((e) => { e.style.display = on ? '' : 'none'; }));
        [lTh, lOrd].forEach((l) => l.show(on)); if (PHONE) ctlEl.style.paddingRight = on ? '128px' : '';
        if (on) { labs.forEach((l) => l.show(false)); orbit.dist = PHONE ? 15 : 11.5; orbit.tx = -0.3; orbit.ty = -0.3; orbit.tz = 0; orbit.theta = 0.2; orbit.phi = 1.4; hKey = ''; }
        else { labs.forEach((l) => l.show(false)); setScene(); }
      }
      let lastNote = '', lastHeat = ''; const TK0 = ['ion', 'mol', 'cov', 'metal'];
      /* 분류하기(2단계): 3D 막대의 ◀ ▶ · 상자 단추가 2D의 카드 고르기 · placeCard와 같아요 */
      const sortMode = () => { try { const S2 = window.__sim.S; return S2.mode === 'types' && S2.sub.types === 'sort'; } catch (e) { return false; } };
      const TF = () => { try { return window.__sim.S.types; } catch (e) { return null; } };
      let lastSort = '';
      function sortHtml() {
        const F = TF(); if (!F || !F.cards) return '';
        const c = F.cards.find((q) => q.id === F.sel), n = [0, 1, 2, 3].map((i) => F.cards.filter((q) => q.bin === i).length), placed = n.reduce((a, b) => a + b, 0);
        return '<b>🗂️ 대표 물질 12장 · 분류하기</b><br>' + (c ? '고른 물질: <b>' + c.f + '</b> (' + c.hint + ')' + (c.bin !== null ? ' · 지금 ' + TYPES[TK0[c.bin]].nm : '') : '◀ ▶로 물질을 골라요.') +
          '<br>상자: 이온 ' + n[0] + ' · 분자 ' + n[1] + ' · 공유 ' + n[2] + ' · 금속 ' + n[3] + ' (' + placed + ' / 12)<br>모형: ' + TYPES[type].nm + ' (' + TYPES[type].ex + ')';
      }
      function pickCard(d) {
        const F = TF(); if (!F || !F.cards) return; const cs = F.cards;
        let i = cs.findIndex((q) => q.id === F.sel); i = i < 0 ? (d > 0 ? 0 : cs.length - 1) : (i + d + cs.length) % cs.length;
        F.sel = cs[i].id; show();
      }
      function putCard(b) {
        const L = window.__sim, F = TF(); if (!L || !L.placeCard || !F || !F.cards) return; const cs = F.cards;
        const c = cs.find((q) => q.id === F.sel) || cs.find((q) => q.bin === null); if (!c) return;
        L.placeCard(c, b);
        const k = cs.indexOf(c), nx = cs.slice(k + 1).concat(cs.slice(0, k)).find((q) => q.bin === null);
        F.sel = nx ? nx.id : null; show();
      }
      const sortCtl = grab(() => { controls.text('<b>물질</b>'); controls.button('◀', () => pickCard(-1)); controls.button('▶', () => pickCard(1)); controls.text('<b>상자</b>'); TK0.forEach((k, b) => controls.button(TYPES[k].nm, () => putCard(b))); });
      /* 분류하기: 고른 물질 카드와 네 상자(놓은 카드)를 3D 화면에도 보여 줘요 */
      const cardP = v3pan('bl card'), boxP = v3pan('tr'), BOXC = ['#7c3aed', '#0ea5e9', '#16a34a', '#d97706'];
      function drawSort(on) {
        const F = TF(); if (!on || !F || !F.cards) { cardP.put(''); boxP.put(''); return; }
        const c = F.cards.find((q) => q.id === F.sel);
        if (c) cardP.style.setProperty('--kc', c.bin !== null ? BOXC[c.bin] : '#ffd34d');
        cardP.put(c ? '<div class="h">🃏 ' + c.f + '</div><div class="s">' + c.hint + '</div>' + (c.bin !== null ? '<div class="s">→ ' + TYPES[TK0[c.bin]].nm + ' 상자</div>' : '') : '');
        boxP.put('<div class="h">🗂️ 상자 (' + F.cards.filter((q) => q.bin !== null).length + ' / 12)</div>' + TK0.map((k, b) => '<div><span style="color:' + BOXC[b] + '">■</span> ' + TYPES[k].nm + ' ' + F.cards.filter((q) => q.bin === b).map((q) => '<span class="chip' + (q.id === F.sel ? ' sel' : '') + '">' + q.f + '</span>').join('') + '</div>').join(''));
      }
      let sortOn = null;
      function setSortOn(on) { if (on === sortOn) return; sortOn = on; if (!on) drawSort(false); sortCtl.els.forEach((e) => { e.style.display = on ? '' : 'none'; }); lastSort = ''; show(); }
      const api = {
        update(dt, t) {
          const w2 = window.__sim, md = w2 && w2.S ? w2.S.mode : '';
          if (md === 'heat') {
            setSortOn(false); setHeatOn(true);
            const html = updHeat(w2, t); if (html !== lastHeat) { lastHeat = html; info(html); }
            if (hCtl.r) hCtl.r.set(w2.S.heat.cur);
            [hGo, hFast].forEach((c) => c.els.forEach((e) => { e.disabled = !!w2.S.heat.run && c === hGo; }));
            return;
          }
          if (heatOn) { setHeatOn(false); lastHeat = ''; }
          setSortOn(sortMode());
          if (sortOn) { const h = sortHtml(); if (h !== lastSort) { lastSort = h; info(h); } }
          drawSort(sortOn);
          let w = want();
          if (md === 'cls') {           // 미지 시료 분류는 2D에서: 3D는 네 가지 결정 모형을 차례로 보여 줘요
            clsT += dt; const k = Math.floor(clsT / 7) % 4; w = TK0[k]; note = '참고 모형 · 네 가지 결정을 차례로 보여 줘요 → ';
          } else if (md !== modeNow && md === 'types') note = '';
          modeNow = md;
          if (w && w !== type) pickType(w);
          if (note !== lastNote) { lastNote = note; show(); }
          if (S && S.update) S.update(dt, t);
        },
        sync() { lastNote = ''; },
      };
      type = want() || 'ion'; setScene();
      return api;
    },
  });
  if (v3 && PHONE) { v3.button.style.top = 'auto'; v3.button.style.bottom = '10px'; }
})();
