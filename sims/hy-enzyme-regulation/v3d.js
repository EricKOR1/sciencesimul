/* hy-enzyme-regulation · 3D 효소 저해 모형 (경쟁적 · 비경쟁적 저해)
   효소 3개와 기질(빨강·노랑)이 떠다녀요.
   - 경쟁적 저해제: 기질과 모양이 비슷해서 활성 부위를 두고 기질과 경쟁해요. 기질이 많아지면 밀려나요.
   - 비경쟁적 저해제: 활성 부위가 아닌 다른 자리에 붙어 활성 부위의 모양을 바꿔요. 기질을 늘려도 소용없어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const narrow = window.innerWidth < 600 || window.innerHeight > window.innerWidth * 1.1;
  const SMD = [2, 3, 5, 7, 10, 14], SL = [1, 2, 4, 8, 16, 32];
  const XB = 5.4, YB0 = -0.3, YB1 = 4.2, ZB = 2.0;

  window.SciSim3D.attach({
    title: '효소 저해 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: narrow ? 13 : 10.8, theta: 0.15, phi: 1.3, target: narrow ? [0.4, 0, 0] : [0, 0.5, 0], min: 6, max: 22 },
    autoRotate: 0,
    levels: [1],   // 1단계(저해제 실험 · 그래프)와 3단계(되먹임 · 카드뉴스)는 2D 화면, 2단계 '저해 모형'에서 3D로 시작
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V = THREE.Vector3;
      if (narrow) root.rotation.z = Math.PI / 2;      // 휴대폰(세로 화면)에서는 눕혀 둔 모형을 세워서 보여 줘요
      let type = 'comp', nS = 5;   // 2D처럼 저해제 개수: 경쟁적 6개 · 비경쟁적 4개
      const deep = (c, k) => { const a = new THREE.Color(c); return a.lerp(a.clone().convertSRGBToLinear(), k == null ? 0.7 : k); };   // 화면에서 색이 옅어지지 않게 조금 진하게
      const std = (c, o) => { o = o || {}; return o.transparent ? new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.38, metalness: 0.03 }, o)) : ctx.mats.plastic(deep(c), { roughness: 0.3, extra: o }); };   // 분자 모형: 매끈한 플라스틱 광택 (색은 그대로, 조금 진하게)
      const bio = (c, o) => { const t = ctx.mats.tex('noise').clone(); t.needsUpdate = true; t.repeat.set(3, 2); return ctx.mats.organic(deep(c), { extra: Object.assign({ roughness: 0.46, bumpMap: t, bumpScale: 0.025 }, o || {}) }); };   // 단백질(효소) 표면: 촉촉하고 오돌토돌하게
      const A = (p) => { const o = new THREE.Object3D(); o.position.set(p[0], p[1], p[2]); root.add(o); return o; };
      const enzMat = bio(0x38bdf8), siteMat = std(0x0c4a6e, { emissive: 0x082f49, roughness: 0.6 });
      const alloMat = bio(0x7e22ce, { emissive: 0x2e1065 });

      /* ---------- 효소 3개 ---------- */
      const EX = [-3.6, 0, 3.6], EY = -1.5;
      const enz = EX.map((x, i) => {
        const g = new THREE.Group(); g.position.set(x, EY, 0); root.add(g);
        const body = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), enzMat); body.scale.set(1.75, 0.95, 1.3); g.add(body);
        const jL = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 26), enzMat), jR = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 26), enzMat);
        [jL, jR].forEach((j) => { j.scale.set(0.55, 0.85, 1.0); g.add(j); });
        const pocket = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), siteMat); pocket.scale.set(1, 0.4, 1); pocket.position.y = 0.52; g.add(pocket);
        const allo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), alloMat); allo.position.set(1.62, 0.1, 0); g.add(allo);
        return { g, x, jL, jR, allo, st: 'free', t: 0, gap: 0.64, gapT: 0.64, cargo: null, fixT: 0, nc: null };
      });
      function jaws(e) { e.jL.position.set(-(e.gap + 0.55), 0.8, 0); e.jR.position.set(e.gap + 0.55, 0.8, 0); }
      const site = (e) => new V(e.x, EY + 0.95, 0), alloPos = (e) => new V(e.x + 1.82, EY + 0.1, 0);

      /* ---------- 분자 ---------- */
      function dumb(c1, c2, r1, r2) {
        const g = new THREE.Group();
        const a = new THREE.Mesh(new THREE.SphereGeometry(r1, 32, 22), std(c1, { roughness: 0.26 })), b = new THREE.Mesh(new THREE.SphereGeometry(r2, 32, 22), std(c2, { roughness: 0.26 }));
        a.position.x = -0.26; b.position.x = 0.26; const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.4, 16), std(0xc3cddb)); bd.rotation.z = Math.PI / 2;
        g.add(a, b, bd); g.userData = { a, b, bd }; return g;
      }
      const mols = [];
      const mg = new THREE.Group(); root.add(mg);
      function rndPos() { return new V((Math.random() * 2 - 1) * XB, YB0 + 0.6 + Math.random() * (YB1 - YB0 - 0.8), (Math.random() * 2 - 1) * ZB); }
      function addMol(kind) {
        let obj;
        if (kind === 'S') obj = dumb(0xfb7185, 0xfacc15, 0.3, 0.3);
        else if (type === 'comp') obj = dumb(0xa78bfa, 0xc4b5fd, 0.3, 0.3);
        else obj = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 1), std(0xc084fc, { roughness: 0.3, emissive: 0x2e1065 }));
        const m = { kind, obj, v: new V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).setLength(1.1), cap: null };
        obj.position.copy(rndPos()); mg.add(obj); mols.push(m); return m;
      }
      function clearMols() { mols.forEach((m) => mg.remove(m.obj)); mols.length = 0; enz.forEach((e) => { e.st = 'free'; e.cargo = null; e.nc = null; e.gapT = 0.64; }); }
      const prods = [];   // 날아가는 생성물
      const prodMats = [std(0xfb7185), std(0xfacc15)];
      function spawnProd(p) {
        [-1, 1].forEach((s, i) => {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), prodMats[i]); m.position.copy(p).add(new V(s * 0.25, 0.2, 0)); root.add(m);
          prods.push({ m, v: new V(s * 1.1, 1.3, (Math.random() - 0.5) * 0.8), t: 0 });
        });
      }

      function rebuild() {
        clearMols();
        for (let i = 0; i < nS; i++) addMol('S');
        const nI = type === 'comp' ? 6 : type === 'non' ? 4 : 0; for (let i = 0; i < nI; i++) addMol('I');
        enz.forEach((e) => { e.allo.visible = type === 'non'; });
        L_allo.show(type === 'non'); L_act.show(true);
        pickLabels(); text();
      }
      const L_act = label('활성 부위', A([0, EY + 1.2, 0]), { color: '#0f3b57' });
      const L_s = label('기질', null, { color: '#9f1239' }), L_i = label('저해제', null, { color: '#6b21a8', offset: [0, 0.5, 0] });
      const L_allo = label('다른 자리', [EX[2] + 1.85, EY + 0.55, 0], { color: '#6b21a8' });

      function pickLabels() {
        const fs = (L_s.obj && mols.some((m) => m.obj === L_s.obj)) ? null : mols.find((m) => m.kind === 'S' && !m.cap);
        if (fs || !L_s.obj) { const f = fs || mols.find((m) => m.kind === 'S'); L_s.obj = f ? f.obj : null; }
        if (!L_i.obj || !mols.some((m) => m.obj === L_i.obj)) { const f = mols.find((m) => m.kind === 'I'); L_i.obj = f ? f.obj : null; }
        L_s.show(!!L_s.obj); L_i.show(!!L_i.obj);
      }
      /* ---------- 상호작용 ---------- */
      let win = [], infoT = 0;
      function text() {
        const per = win.length;
        const t1 = type === 'none' ? '<b>저해제 없음</b> · 기질이 활성 부위에 결합해 생성물이 돼요.'
          : type === 'comp' ? '<b>경쟁적 저해</b> · 저해제(<span style="color:#c4b5fd">●●</span>)가 활성 부위를 두고 기질과 경쟁해요. 기질을 늘려 보세요.'
            : '<b>비경쟁적 저해</b> · 저해제(<span style="color:#c084fc">✦</span>)가 다른 자리에 붙어 활성 부위 모양이 변해요.';
        info(t1 + '<br>최근 10초 동안 생성물 <b>' + per + '개</b> · 기질 농도 [S] ' + SL[SMD.indexOf(nS)] + ' mM');
      }
      function step(m, dt) {
        const o = m.obj;
        if (m.cap) return;
        m.v.x += (Math.random() - 0.5) * 6 * dt; m.v.y += (Math.random() - 0.5) * 6 * dt; m.v.z += (Math.random() - 0.5) * 6 * dt;
        m.v.setLength(Math.max(0.8, Math.min(1.5, m.v.length())));
        o.position.addScaledVector(m.v, dt);
        const p = o.position;
        if (p.x > XB) { p.x = XB; m.v.x *= -1; } else if (p.x < -XB) { p.x = -XB; m.v.x *= -1; }
        if (p.z > ZB) { p.z = ZB; m.v.z *= -1; } else if (p.z < -ZB) { p.z = -ZB; m.v.z *= -1; }
        if (p.y > YB1) { p.y = YB1; m.v.y *= -1; } else if (p.y < YB0) { p.y = YB0; m.v.y *= -1; }
        // 효소 몸통 밖으로
        enz.forEach((e) => {
          const dx = p.x - e.x, dy = p.y - EY, dz = p.z;
          const r = Math.hypot(dx / 2.0, dy / 1.2, dz / 1.5);
          if (r < 1 && p.y < EY + 0.9) { const k = 1 / Math.max(r, 0.01); p.x = e.x + dx * k; p.y = EY + dy * k; p.z = dz * k; m.v.reflect(new V(dx, dy, dz).normalize()); }
          // 턱
          [-1, 1].forEach((s) => {
            const jx = e.x + s * (e.gap + 0.55), jy = EY + 0.8, ex = p.x - jx, ey = p.y - jy, ez = p.z;
            const rr = Math.hypot(ex / 0.85, ey / 1.1, ez / 1.2);
            if (rr < 1) { const k = 1 / Math.max(rr, 0.01); p.x = jx + ex * k; p.y = jy + ey * k; p.z = ez * k; m.v.reflect(new V(ex, ey, ez).normalize()); }
          });
        });
        if (m.kind === 'I' || m.kind === 'S') o.rotation.z += dt * 0.8;
      }
      function tryBind(e, now) {
        if (e.st !== 'free') return;
        const sp = site(e);
        for (const m of mols) {
          if (m.cap) continue;
          const p = m.obj.position;
          if (m.kind === 'S' || (m.kind === 'I' && type === 'comp')) {
            if (Math.abs(p.x - sp.x) < 0.5 && Math.abs(p.z) < 0.55 && p.y > sp.y - 0.1 && p.y < sp.y + 1.1 && e.gapT > 0.3) {
              m.cap = e; e.cargo = m; e.st = m.kind === 'S' ? 'es' : 'ei'; e.t = 0; m.obj.rotation.set(0, 0, 0); m.obj.userData.bound = true; return;
            }
          } else if (m.kind === 'I' && type === 'non' && !e.nc) {
            const ap = alloPos(e);
            if (p.distanceTo(ap) < 0.55) { m.cap = e; e.nc = m; e.fixT = 0; return; }
          }
        }
      }
      function updEnz(e, dt) {
        e.t += dt;
        const sp = site(e);
        if (e.nc) {                                   // 비경쟁적 저해제가 붙어 있으면 활성 부위가 일그러져요
          e.fixT += dt;
          const ap = alloPos(e); e.nc.obj.position.lerp(ap, Math.min(1, dt * 10));
          e.gapT = 0.1;
          if (e.cargo && e.st === 'es') { e.st = 'free'; const c = e.cargo; c.cap = null; c.v.set(0, 1.4, 0); c.obj.position.y += 0.4; e.cargo = null; }
          if (e.fixT > 3.5 + Math.random() * 0.01) { const q = e.nc; q.cap = null; q.v.set(1.2, 0.8, 0).setLength(1.2); e.nc = null; e.gapT = 0.64; e.fixT = 0; e.cool = 1.2; }
        } else if (e.st === 'free') { e.gapT = 0.64; if (e.cool > 0) e.cool -= dt; else tryBind(e); }
        else if (e.st === 'es') {
          const c = e.cargo; c.obj.position.lerp(new V(sp.x, sp.y - 0.12, 0), Math.min(1, dt * 8));
          const k = Math.min(1, e.t / 1.3);
          e.gapT = 0.55;
          if (c.obj.userData.a) { c.obj.userData.a.position.x = -0.26 - 0.2 * k * k; c.obj.userData.b.position.x = 0.26 + 0.2 * k * k; }
          if (e.t > 1.3) {
            spawnProd(c.obj.position); mg.remove(c.obj); mols.splice(mols.indexOf(c), 1); e.cargo = null; e.st = 'free'; e.cool = 0.3;
            win.push(performance.now()); addMol('S').obj.position.set((Math.random() < 0.5 ? -1 : 1) * XB * 0.9, YB1 - 0.3, (Math.random() * 2 - 1) * ZB);
          }
        } else if (e.st === 'ei') {
          const c = e.cargo; c.obj.position.lerp(new V(sp.x, sp.y - 0.12, 0), Math.min(1, dt * 8)); e.gapT = 0.55;
          if (e.t > 2.2 + (e.x + 5) * 0.05) { c.cap = null; c.v.set((Math.random() - 0.5), 1.4, (Math.random() - 0.5)).setLength(1.3); c.obj.position.y += 0.5; e.cargo = null; e.st = 'free'; e.cool = 1.0; }
        }
        e.gap += (e.gapT - e.gap) * Math.min(1, dt * 7); jaws(e);
      }

      /* 2D 저해 모형(S.md)과 같은 값: 저해제 종류 · 기질 농도 [S] 6단계(2 · 3 · 5 · 7 · 10 · 14개). 3D에서 바꾸면 2D도 같이 바뀌어요 */
      let lastType = null, lastIdx = null;
      const seg = controls.segment('저해제', [{ value: 'none', label: '없음' }, { value: 'comp', label: '경쟁적' }, { value: 'non', label: '비경쟁적' }], type, (v) => { type = v; lastType = v; const L = ctx.lesson(); if (L && L.mdSetType) L.mdSetType(v); rebuild(); });
      const rng = controls.range('기질 [S]', 0, 5, 1, SMD.indexOf(nS), (i) => { nS = SMD[i]; lastIdx = i; const L = ctx.lesson(); if (L && L.S && L.S.md) { L.S.md.idx = i; L.updateCtl(); } rebuild(); }, (i) => SL[i] + ' mM');
      enz.forEach((e) => { e.cool = 0; jaws(e); });
      rebuild();

      return {
        update(dt) {
          dt = Math.min(dt, 0.05) * (window.__v3dTS || 1);
          const md = window.__sim && window.__sim.S && window.__sim.S.md;
          if (md && (md.type !== lastType || md.idx !== lastIdx)) {
            lastType = md.type; lastIdx = md.idx;
            const ty = md.type === 'comp' || md.type === 'non' || md.type === 'none' ? md.type : type, ns = SMD[md.idx] || nS;
            if (ty !== type || ns !== nS) { type = ty; nS = ns; seg.set(type); rng.set(SMD.indexOf(nS)); rebuild(); }
          }
          mols.forEach((m) => step(m, dt));
          enz.forEach((e) => updEnz(e, dt));
          for (let i = prods.length - 1; i >= 0; i--) { const p = prods[i]; p.t += dt; p.m.position.addScaledVector(p.v, dt); p.v.y -= 0.3 * dt; p.m.scale.setScalar(Math.max(0.01, 1 - p.t / 1.6)); if (p.t > 1.6) { root.remove(p.m); prods.splice(i, 1); } }
          const now = performance.now(); win = win.filter((w) => now - w < 10000);
          infoT += dt; if (infoT > 0.6) { infoT = 0; pickLabels(); text(); }
        },
        sync() { text(); },
      };
    },
  });
})();
