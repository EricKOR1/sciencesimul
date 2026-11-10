/* h1-food-web · 3D 먹이 사슬 · 먹이 그물 · 생태 피라미드 · 에너지 전달
   2D 실험과 같은 4가지 장면이에요 (2D에서 고른 장면을 따라가요).
   · 먹이 사슬/그물: 화살표는 먹히는 쪽 → 먹는 쪽 (에너지가 가는 방향). 높이는 먹이 단계(생산자 → 소비자). 2D에서 이은 화살표가 3D에도 나타나요.
   · 생태 피라미드: 초원(개체 수·생물량·에너지량)과 참나무 숲(개체 수·에너지량). 2D의 PYR 값과 같고, 막대 폭은 2D처럼 값의 자릿수(로그 눈금)예요.
   · 에너지 전달: 풀 10000 kJ에서 단계마다 약 10 %만 다음 단계로 전달돼요 (나머지는 호흡 등으로 열이 되어 나가요). 2D의 먹이 사슬 단계 수(2~5)를 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);

  const SP = {
    grass: { n: '풀', e: '🌿', lv: 0, p: [-1.8, 0, 1.2], c: 0x3fae5a }, grain: { n: '곡식 열매', e: '🌾', lv: 0, p: [2.4, 0, 1.0], c: 0xd9b43a },
    hopper: { n: '메뚜기', e: '🦗', lv: 1, p: [-3.0, 0, -0.6], c: 0x9bd04a }, rabbit: { n: '토끼', e: '🐇', lv: 1, p: [0.2, 0, 2.6], c: 0xe8dccb },
    mouse: { n: '쥐', e: '🐀', lv: 1, p: [2.8, 0, -1.2], c: 0xa59a8d },
    frog: { n: '개구리', e: '🐸', lv: 2, p: [-2.2, 0, -2.2], c: 0x4cc46c }, snake: { n: '뱀', e: '🐍', lv: 3, p: [0.6, 0, -2.6], c: 0x4f9a8a },
    fox: { n: '여우', e: '🦊', lv: 4, p: [2.0, 0, 1.6], c: 0xe8873a }, hawk: { n: '매', e: '🦅', lv: 4, p: [-1.6, 0, -0.4], c: 0x8a6a4a },
  };
  const LINKS = [['grass', 'hopper'], ['grass', 'rabbit'], ['grass', 'mouse'], ['grain', 'mouse'], ['hopper', 'frog'], ['frog', 'snake'], ['frog', 'hawk'], ['mouse', 'snake'], ['mouse', 'fox'], ['mouse', 'hawk'], ['rabbit', 'fox'], ['snake', 'fox'], ['snake', 'hawk']];
  const CHAIN = ['grass', 'hopper', 'frog', 'snake', 'hawk'];
  const ROLE = ['생산자', '1차 소비자', '2차 소비자', '3차 소비자', '4차 소비자'];
  const EN = [10000, 1000, 100, 10, 1];
  const LV_COL = [0x3fae5a, 0xb9c93a, 0xf0a93a, 0xe5703a, 0xcf3f4a];

  window.SciSim3D.attach({
    title: '3D 먹이 그물과 생태 피라미드',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 19 : 12.5, theta: 0.6, phi: 1.2, target: [0, 2.8, 0], min: 7, max: 32 },
    autoRotate: 0.15,
    levels: [2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls, renderer } = ctx;
      /* 식단 비교 판: 2D의 '곡물 → 직접 먹기 / 소 사료' 막대와 먹일 수 있는 사람 수를 3D 화면에도 보여 줘요 */
      if (!document.getElementById('fw3d-diet')) { const st2 = document.createElement('style'); st2.id = 'fw3d-diet'; st2.textContent =
        '.fw-diet{position:absolute;right:10px;top:10px;width:min(260px,44%);padding:8px 10px;border-radius:12px;background:rgba(8,12,24,.76);color:#fff;font-size:12px;font-weight:700;pointer-events:none}.fw-diet .h{font-weight:900;margin-bottom:5px}.fw-diet .bar{display:flex;height:14px;border-radius:7px;overflow:hidden;background:#2a3346;margin:3px 0 6px}.fw-diet .bar i{display:block;height:100%}.fw-diet .r{display:flex;justify-content:space-between;gap:6px;line-height:1.5}.fw-diet .t{margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.18);font-weight:900;color:#5eead4}' +
        '@media (max-width:599px){.fw-diet{top:auto;bottom:30px;right:8px;width:54%;font-size:10.5px;padding:5px 7px}.fw-diet .bar{height:10px;margin:2px 0 4px}}';
        document.head.appendChild(st2); }
      const dietEl = document.createElement('div'); dietEl.className = 'fw-diet'; dietEl.style.display = 'none'; renderer.domElement.parentElement.appendChild(dietEl);
      let dietSig = '';
      function drawDiet(on, pct, fed) {
        if (!on) { if (dietSig) { dietSig = ''; dietEl.style.display = 'none'; } return; }
        const sig = pct + '|' + fed; if (sig === dietSig) return; dietSig = sig; dietEl.style.display = '';
        const dir = Math.round(1000 * pct / 100), beef = Math.round(1000 * (100 - pct) / 100 * 0.1);
        dietEl.innerHTML = '<div class="h">🍚 식단 비교 (밭의 곡물 = 1000명분)</div>' +
          '<div class="bar"><i style="width:' + pct + '%;background:#f5b301"></i><i style="width:' + (100 - pct) + '%;background:#c2410c"></i></div>' +
          '<div class="r"><span>🌾 → 🧑 직접 먹기 ' + pct + ' %</span><b>' + dir + '명</b></div>' +
          '<div class="r"><span>🌾 → 🐄 → 🧑 쇠고기 ' + (100 - pct) + ' %</span><b>' + beef + '명</b></div>' +
          '<div class="r t"><span>먹일 수 있는 사람</span><span>' + fed + '명</span></div>';
      }
      const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.45, metalness: 0.05 }, o || {}));
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;
      const st = { names: true, t: 0, demo: false, sig: '' };
      const clamp01 = (x) => Math.max(0, Math.min(1, x));
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.25, 56), new THREE.MeshLambertMaterial({ color: 0x2d3547 })); floor.position.y = -0.2; floor.receiveShadow = true; root.add(floor); floor.userData.v3bg = true;   // 바닥은 배경
      const gW = new THREE.Group(), gP = new THREE.Group(), gF = new THREE.Group(); root.add(gW, gP, gF);
      const LH = 1.35;

      /* ================= 먹이 사슬 · 그물 ================= */
      const nodes = {}, links = [];
      Object.keys(SP).forEach((k) => {
        const s = SP[k], g = new THREE.Group(); g.position.set(s.p[0], s.lv * LH + 0.5, s.p[2]);
        const r = 0.5;
        const body = new THREE.Mesh(s.lv === 0 ? new THREE.CylinderGeometry(0.7, 0.7, 0.34, 32) : new THREE.SphereGeometry(r, 28, 20), mat(s.c, { roughness: 0.4 })); body.castShadow = true; g.add(body);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, s.lv * LH + 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })); stem.position.y = -(s.lv * LH + 0.5) / 2; g.add(stem);
        gW.add(g); nodes[k] = { g, body, lab: label(s.e + ' ' + s.n, g, { size: 12.5, offset: [0, 0.95, 0] }), k };
      });
      LINKS.forEach(([a, b], i) => {
        const A = nodes[a].g.position, B = nodes[b].g.position, d = new V3().subVectors(B, A), u = d.clone().normalize();
        const s0 = A.clone().addScaledVector(u, 0.62), s1 = B.clone().addScaledVector(u, -0.7), mid = s0.clone().lerp(s1, 0.5); mid.y += 0.25;
        const curve = new THREE.QuadraticBezierCurve3(s0, mid, s1);
        const m = new THREE.MeshStandardMaterial({ color: 0xffd75e, emissive: 0xffa800, emissiveIntensity: 0.35, roughness: 0.4, transparent: true });
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.06, 8, false), m); gW.add(tube);
        const t = curve.getTangentAt(1), head = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.42, 14), m); head.position.copy(s1); head.quaternion.setFromUnitVectors(Y, t); gW.add(head);
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })); gW.add(bead);
        links.push({ a, b, tube, head, m, bead, curve, ph: (i * 0.37) % 1, chain: CHAIN.some((c, j) => CHAIN[j + 1] && c === a && CHAIN[j + 1] === b) });
      });
      const lvLabs = ROLE.map((t, i) => {
        const d = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 0.03, 56), new THREE.MeshBasicMaterial({ color: LV_COL[i], transparent: true, opacity: 0.13, depthWrite: false })); d.position.y = i * LH + 0.25; gW.add(d);
        return label(t, [0, i * LH + 0.25, 0], { size: 11.5, color: 'rgba(20,70,40,.9)', offset: [3.2, 0, 3.0] });
      });

      /* ================= 쌓인 막대 (생태 피라미드 · 에너지 전달 공통) =================
         2D처럼 막대 폭 = (log10(값) + 1) 에 비례해요 (한 칸 = 10배) */
      const LHP = 1.05, UW = 0.6;
      function stack(group) {
        const L = [];
        for (let i = 0; i < 5; i++) {
          const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, LHP - 0.1, 48), mat(0x888888, { roughness: 0.5, transparent: true })); m.castShadow = true; m.receiveShadow = true; m.visible = false;
          const gh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, LHP - 0.1, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fb4d0, transparent: true, opacity: 0.18, wireframe: true, depthWrite: false })); gh.visible = false;
          group.add(m, gh);
          const lb = label('', m, { size: 12, offset: [0, 0, 0] });
          L.push({ m, gh, lb, w: 1 });
        }
        return L;
      }
      const pyL = stack(gP), flL = stack(gF);
      function put(L, i, o) {   // o: { v, c, a, off, text, on(ghost) }
        const l = L[i]; if (!o) { l.m.visible = false; l.gh.visible = false; l.lb.show(false); return; }
        const r = Math.max(0.3, (Math.log10(Math.max(1, o.v)) + 1) * UW), y = i * LHP + LHP / 2;
        l.m.visible = o.a > 0.01; l.gh.visible = !l.m.visible && !!o.ghost;
        [l.m, l.gh].forEach((m) => { m.scale.set(r, 1, r); m.position.set(0, y + (o.off || 0), 0); });
        l.m.material.color.set(o.c); l.m.material.opacity = Math.min(1, o.a);
        l.lb.obj = [r * 0.0, y + (o.off || 0), r + 0.1]; l.lb.off = [0, 0, 0.05];
        const tx = o.text; if (l.lb.txt !== tx) { l.lb.txt = tx; l.lb.set(tx); }
        l.lb.show(st.names && (l.m.visible || l.gh.visible));
      }

      /* 에너지가 열로 나가는 화살표 (에너지 전달) */
      const heat = [];
      for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 10), new THREE.MeshBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.8 })); h.userData = { i, k, ph: k / 3 }; h.visible = false; gF.add(h); heat.push(h); }
      const heatLab = label('나머지(약 90 %)는 열로 나가요', [3.3, 0.6, 0], { size: 11.5, color: 'rgba(170,40,30,.95)', offset: [0.8, 0.2, 0] });
      const pkt = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffe14d, emissive: 0xffb800, emissiveIntensity: 0.8 })); pkt.visible = false; gF.add(pkt);

      /* ---------- 조작 ---------- */
      const probe = controls.text(''); probe.style.display = 'none'; const ctlRow = probe.parentElement;
      const grab = (fn) => { const before = new Set(ctlRow.children); const r = fn(); return { r, els: Array.from(ctlRow.children).filter((c) => !before.has(c)) }; };
      let internal = false;
      const mkPlayer = (o) => { o.onFrame = (p) => { if (!internal) st.demo = true; o.frame && o.frame(p); }; return controls.player(o); };
      let wP, pyP, flP;
      const gWeb = grab(() => { wP = mkPlayer({ duration: 8, loop: true, label: '에너지 흐름', phases: [[0, '먹히는 쪽 → 먹는 쪽']] }); });
      const gPyr = grab(() => {
        controls.segment('생태계', [{ value: 'meadow', label: '초원' }, { value: 'oak', label: '참나무 숲' }], 'meadow', (v) => { const S = L2(); if (S && S.pyrSet) S.pyrSet(v, null); });
        controls.segment('피라미드', [{ value: 'num', label: '개체 수' }, { value: 'bio', label: '생물량' }, { value: 'en', label: '에너지량' }], 'num', (v) => { const S = L2(); if (S && S.pyrSet) S.pyrSet(null, v); });
        controls.button('🧱 블록 쌓기', () => { const S = L2(); if (S && S.pyrBuild) { st.demo = false; S.pyrBuild(); } else { st.demo = true; pyP.set(0); pyP.play(); } });
        pyP = mkPlayer({ duration: 6, loop: true, label: '쌓는 순서 미리 보기', phases: [[0, '생산자'], [0.25, '1차 소비자'], [0.5, '2차 소비자'], [0.75, '3차 소비자']] });
      });
      const gNames = grab(() => { controls.button('🏷 이름', () => { st.names = !st.names; }); });
      const gFlow = grab(() => {
        flP = mkPlayer({ duration: 9, loop: true, label: '에너지 전달', phases: [[0, '풀(생산자)'], [0.2, '1차 소비자'], [0.4, '2차 소비자'], [0.6, '3차 소비자'], [0.8, '4차 소비자']] });
      });
      st.demo = false;
      const EMO = ['🌿', '🦗', '🐸', '🐍', '🦅'];
      const pyrSegs = { eco: gPyr.els.slice(0, 3), type: gPyr.els.slice(3, 7) };
      const setOn = (els, vals, cur) => { els.forEach((b) => { if (b.tagName === 'BUTTON') b.classList.toggle('on', vals.indexOf(b.textContent) === cur); }); };

      let scene = 'web', lastScene = '';
      const sceneOf = (S) => { const m = S && S.S && S.S.mode; return m === 'pyr' ? 'pyr' : m === 'flow' || m === 'diet' ? 'flow' : 'web'; };
      const col = (c) => new THREE.Color(c);
      const ease = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

      return {
        update(dt, t) {
          st.t += dt;
          const S = L2(), SS = S && S.S, mode = (SS && SS.mode) || 'web';
          scene = sceneOf(S);
          // 2D 장면이 바뀌거나 2D에서 새로 조작하면 3D 시연을 멈추고 2D를 따라가요
          let sig = mode;
          if (SS && SS.pyr) sig += '|' + SS.pyr.eco + SS.pyr.type + Object.keys(SS.pyr.built).filter((k) => SS.pyr.built[k]).join(',') + (SS.pyr.anim ? 'A' : '');
          if (SS && SS.flow) sig += '|' + SS.flow.n + '/' + SS.flow.k + SS.flow.run;
          if (SS && SS.chain && SS.web) sig += '|' + S.madeCount(SS.chain) + '/' + S.madeCount(SS.web);
          if (SS && SS.diet) sig += '|' + SS.diet.pct;
          if (sig !== st.sig) { st.sig = sig; if (st.demo) { st.demo = false; [wP, pyP, flP].forEach((p) => p.pause()); } }
          if (scene !== lastScene) {
            lastScene = scene;
            if (scene !== 'flow') drawDiet(false);
            gW.visible = scene === 'web'; gP.visible = scene === 'pyr'; gF.visible = scene === 'flow';
            gWeb.els.forEach((e) => { e.style.display = scene === 'web' ? '' : 'none'; });
            gPyr.els.forEach((e) => { e.style.display = scene === 'pyr' ? '' : 'none'; });
            gFlow.els.forEach((e) => { e.style.display = scene === 'flow' ? '' : 'none'; });
            gNames.els.forEach((e) => { e.style.display = scene === 'pyr' ? 'none' : ''; });
            pyL.forEach((l) => l.lb.show(false)); flL.forEach((l) => l.lb.show(false)); heatLab.show(false);
            lvLabs.forEach((l) => l.show(scene === 'web'));   // 먹이 단계 이름표(높이 눈금)는 먹이 사슬·그물 장면에서만
          }
          // ---------- 먹이 사슬 · 그물 ----------
          if (scene === 'web') {
            const chainMode = mode === 'chain', net = SS && (chainMode ? SS.chain : SS.web);
            const wp = wP.p;
            links.forEach((l) => {
              const made = net && S.key ? net.made[S.key(l.a, l.b)] : null;
              const on = st.demo ? (!chainMode || l.chain) : (!!(made && made.done) || !net);
              l.tube.visible = l.head.visible = on; l.bead.visible = on && (st.demo || wP.playing || true);
              l.bead.position.copy(l.curve.getPointAt((wp + l.ph) % 1));
            });
            Object.entries(nodes).forEach(([k, n]) => {
              const dim = chainMode && !CHAIN.includes(k); n.body.material.transparent = true; n.body.material.opacity = dim ? 0.2 : 1; n.lab.show(st.names && !dim); n.g.position.y += Math.sin(t * 1.3 + k.length) * 0.0015;
            });
            const nMade = net ? S.madeCount(net) : 0;
            setInfo(chainMode
              ? '<b>먹이 사슬</b>: 풀 → 메뚜기 → 개구리 → 뱀 → 매<br>화살표는 먹히는 쪽에서 먹는 쪽으로 가요. (이은 화살표 ' + nMade + ' / ' + (CHAIN.length - 1) + '개)'
              : '<b>먹이 그물</b>: 먹이 사슬이 여러 개 얽혀 있어요.<br>쥐는 풀·곡식 열매를 먹고, 뱀·여우·매에게 먹혀요. (이은 화살표 ' + nMade + ' / ' + LINKS.length + '개)');
          }
          // ---------- 생태 피라미드 ----------
          else if (scene === 'pyr') {
            const P = SS && SS.pyr, eco = P ? P.eco : 'meadow', type = P ? P.type : 'num', E = S && S.PYR ? S.PYR[eco] : null;
            if (E) {
              const d = E[type], n = E.tiers.length, k = eco + ':' + type;
              const built = !!(P && P.built[k]), anim = P && P.anim && P.anim.key === k ? P.anim : null;
              for (let i = 0; i < 5; i++) {
                if (i >= n) { put(pyL, i, null); continue; }
                let a = 1, off = 0, ghost = false;
                if (st.demo) { const u = clamp01(pyP.p * n * 1.15 - i); a = u > 0 ? 1 : 0; off = (1 - ease(u)) * 3; ghost = true; }
                else if (anim) { a = clamp01(anim.tiers[i].a * 1.6); off = (anim.tiers[i].off / 420) * 3; }
                else if (!built) { a = 0; ghost = true; }
                put(pyL, i, { v: d.v[i], c: E.tiers[i].c, a, off, ghost, text: E.tiers[i].n + ' · ' + d.v[i] + ' ' + d.u[i] });
              }
              setOn(pyrSegs.eco, ['초원', '참나무 숲'], eco === 'meadow' ? 0 : 1);
              setOn(pyrSegs.type, ['개체 수', '생물량', '에너지량'], ['num', 'bio', 'en'].indexOf(type));
              const normal = d.v.every((x, i) => i === 0 || x < d.v[i - 1]);
              const nm = { num: '개체 수', bio: '생물량', en: '에너지량' }[type];
              const done = st.demo ? pyP.p > 0.95 : built;
              setInfo('<b>' + E.name + ' · ' + nm + ' 피라미드</b><br>' + (done ? (normal ? '위로 갈수록 줄어드는 안정된 모양이에요.' : '가운데가 불룩한 <b>뒤집힌 모양</b>이에요! 벌레가 참나무보다 훨씬 많아요.') : '막대 폭은 값의 자릿수예요 (한 칸 = 10배). 🧱 블록 쌓기를 눌러요.'));
            }
          }
          // ---------- 에너지 전달 ----------
          else {
            const F = SS && SS.flow, n = F ? F.n : 3, EN2 = (S && S.EN) || [10000, 1000, 100, 10, 1];
            let pPos = 0;
            for (let i = 0; i < 5; i++) {
              if (i >= n) { put(flL, i, null); continue; }
              let a;
              if (st.demo) { a = ease(flP.p * (n - 1) * 1.1 + 0.35 - i); if (i === 0) a = 1; }
              else a = F ? clamp01((F.e[i] || 0) / EN2[i]) : 1;
              put(flL, i, { v: EN2[i], c: LV_COL[i], a, off: 0, ghost: true, text: EMO[i] + ' ' + ROLE[i] + ' · ' + EN2[i] + ' kJ' });
              if (a > 0.5 && i > 0) pPos = i;
            }
            const shownN = st.demo ? Math.min(n, 1 + Math.floor(flP.p * (n - 1) * 1.1 + 0.35)) : (F ? F.k + 1 : n);
            heat.forEach((h) => {
              const i = h.userData.i, on = i < n - 1 && i + 1 < shownN; h.visible = on;
              if (on) { const u = (t * 0.4 + h.userData.ph) % 1, r = (Math.log10(Math.max(1, EN2[i])) + 1) * UW; h.position.set(r * 0.9 + 0.25 + u * 0.9, (i + 0.5) * LHP + u * 0.7, (h.userData.k - 1) * 0.6); h.material.opacity = (1 - u) * 0.85; }
            });
            heatLab.show(shownN > 1);
            const topI = Math.min(n, 5) - 1;
            if (mode === 'diet' && SS.diet) {
              const pct = SS.diet.pct, fed = S.peopleFed ? Math.round(S.peopleFed(pct)) : 0;
              drawDiet(true, pct, fed);
              setInfo('<b>식단 비교</b>: 곡물을 사람이 직접 먹으면 에너지가 그대로, 소를 거치면 약 <b>10 %</b>만 전달돼요.<br>직접 먹는 비율 <b>' + pct + ' %</b> → 먹일 수 있는 사람 약 <b>' + fed + '명</b> (밭의 곡물 = 1000명분)');
            } else { drawDiet(false); setInfo('<b>에너지 전달</b>: 풀 <b>10000 kJ</b> 중 단계마다 약 <b>10 %</b>만 다음 단계로 전달돼요. 나머지는 호흡 등으로 열이 되어 나가요.<br>' + n + '단계 생물(' + ROLE[topI] + ')이 받는 에너지: <b>' + EN2[topI] + ' kJ</b>'); }
            pkt.visible = false;
          }
        },
        sync() {},
      };
      function setInfo(h) { if (h !== setInfo.h) { setInfo.h = h; info(h); } }
    },
  });
})();
