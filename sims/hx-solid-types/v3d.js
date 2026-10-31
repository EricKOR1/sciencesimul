/* hx-solid-types · 3D 네 가지 결정 (이온 · 금속 · 공유 · 분자)
   입자가 3차원으로 어떻게 쌓여 있는지 돌려 보고, 한 층을 밀어 보며(망치로 치는 것과 같은 상황)
   결정마다 '깨지는가 / 펴지는가 / 아주 단단한가 / 쉽게 흩어지는가'를 입체 모형으로 확인해요.
   ※ 단위 세포·배위수·충전율 같은 수치는 다루지 않고 입자의 배열 모양만 보여 줘요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const COLORS = { Na: 0xf59e0b, Cl: 0x22b14c, Cu: 0xc7743b, C: 0x4b5563, O: 0xe23b3b, e: 0x60a5fa };
  const TYPES = {
    ion:   { nm: '이온 결정', ex: 'NaCl' },
    metal: { nm: '금속 결정', ex: 'Cu' },
    cov:   { nm: '공유 결정', ex: '다이아몬드·흑연' },
    mol:   { nm: '분자 결정', ex: '드라이아이스(CO₂)' },
  };
  const KEYS = ['ion', 'metal', 'cov', 'mol'];

  // 휴대폰에서는 단계에 따라 도구 줄이 사라지므로 화면 오른쪽 아래의 떠 있는 버튼을 써요.
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const v3 = window.SciSim3D.attach({
    button: PHONE ? null : undefined,
    title: '네 가지 결정 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 10, theta: 0.7, phi: 1.1, min: 4, max: 24 },
    autoRotate: 0.22,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const wrap = ctx.renderer.domElement.closest('.v3-wrap'), ctlEl = wrap.querySelector('.v3-ctl');
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: [].slice.call(ctlEl.children, n0) }; };
      let type = 'ion', cov = 'diamond', amt = 0, current = false;
      let S = null;                      // 현재 장면 { update(dt,t), apply(v), text() }
      const g = new THREE.Group(); root.add(g);
      const labs = [label('', [0, 0, 0]), label('', [0, 0, 0]), label('', [0, 0, 0])]; labs.forEach((l) => l.show(false));
      const UP = new THREE.Vector3(0, 1, 0);
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
      const geoCache = {};
      const sg = (r) => geoCache[r] || (geoCache[r] = new THREE.SphereGeometry(r, 18, 12));
      const matCache = {};
      const mat = (c, o) => { const k = c + '|' + (o || 1); return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, transparent: (o || 1) < 1, opacity: o || 1 })); };
      function ball(r, c, o) { return new THREE.Mesh(sg(r), mat(c, o)); }
      function stickTo(m, a, b) { const d = b.clone().sub(a), len = Math.max(1e-4, d.length()); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(1, len, 1); }
      const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 10);
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
      function show() { info(S.text(amt)); }
      const SLB = { ion: '층 밀기', metal: '층 밀기', cov: '층 밀기', mol: '가열' };

      const typeSeg = controls.segment('결정', KEYS.map((k) => ({ value: k, label: TYPES[k].nm })), type, (v) => { type = v; amt = 0; sl.set(0); current = false; curB.classList.remove('on'); curB.textContent = '전류 흘리기 ✕'; setScene(); });
      const cg = grab(() => controls.segment('', [{ value: 'diamond', label: '다이아몬드' }, { value: 'graphite', label: '흑연' }], cov, (v) => { cov = v; amt = 0; sl.set(0); setScene(); }));
      const covEls = cg.els;
      const cb = grab(() => controls.button('전류 흘리기 ✕', () => { current = !current; curB.classList.toggle('on', current); curB.textContent = '전류 흘리기 ' + (current ? '✓' : '✕'); show(); }));
      const curB = ctlEl.lastElementChild, curEls = cb.els;
      const slg = grab(() => controls.range('', 0, 1, 0.01, 0, (v) => { amt = v; S.apply(v); show(); }, (v) => SLB[type] + ' ' + (v < 0.03 ? '0' : Math.round(v * 100) + '%')));
      const sl = slg.r; { const w = document.createElement('span'); w.style.cssText = 'display:inline-flex;align-items:center;gap:6px;white-space:nowrap'; slg.els[0].parentNode.insertBefore(w, slg.els[0]); slg.els.forEach((e) => w.appendChild(e)); }

      const api = {
        update(dt, t) { if (S && S.update) S.update(dt, t); },
        sync() { // 2D '네 가지 결정'에서 고른 결정으로 시작 (읽기 전용)
          try { const s = window.__sim; if (s && s.S && s.S.types && TYPES[s.S.types.cur] && s.S.types.cur !== type) { type = s.S.types.cur; amt = 0; sl.set(0); typeSeg.set(type); setScene(); } } catch (e) { /* 무시 */ }
        },
      };
      setScene();
      api.sync();
      return api;
    },
  });
  if (v3 && PHONE) { v3.button.style.top = 'auto'; v3.button.style.bottom = '10px'; }
})();
