/* hy-membrane-structure · 3D 유동 모자이크 모형
   인지질 이중층 조각(머리 파랑 · 꼬리 주황, 머리는 바깥 · 꼬리는 안쪽), 통합 단백질 · 말초 단백질, 콜레스테롤, 당 사슬(바깥쪽에만).
   인지질이 옆으로 움직이는 모습과 단면(잘라낸 모습)을 볼 수 있어요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = window.innerWidth < 600;
  const GX = 12, GZ = 10, SX = 0.42, SZ = 0.4, YH = 0.8;
  const PCOL = { ch: 0x7c3aed, ca: 0x0d9488, re: 0xea580c, en: 0x0284c7, gp: 0xdb2777 };   // 2D 차시와 같은 단백질 색
  const HEADC = 0x3b82f6, TAILC = 0xf59e0b, SUGC = 0xfbbf24, CHOLC = 0xfacc15;

  function fluidLocal(T, u, ch) { const Tm = 22 - 0.18 * u, sg = (s) => 1 / (1 + Math.exp(-(T - Tm) / s)); return ch ? 0.3 + 0.5 * sg(8) : sg(3); }
  function fluidOf(T, u, ch) { try { if (window.__sim && window.__sim.fluidM) return window.__sim.fluidM(T, u, ch); } catch (e) {} return fluidLocal(T, u, ch); }
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  window.SciSim3D.attach({
    title: '세포막 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 12.5 : 8.4, theta: 0.2, phi: 1.3, fov: 40, min: 4, max: 20, target: [PHONE ? 0 : -0.5, PHONE ? 0.3 : 0, 0] },
    autoRotate: 0,
    levels: [1, 2],   // 2단계(막 단백질 · 기능 연결은 3D 막대의 단추로) · 3단계(유동성). 1단계(조립 · 이중층 배열)와 4단계(통과 시험 · 분류)는 2D 화면이에요
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
      const { THREE, root, label, info, controls, orbit, renderer } = ctx;
      renderer.localClippingEnabled = true;
      const rnd = mulberry(11);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
      const allMats = [];
      const deep = (c, k) => { const a = new THREE.Color(c); return a.lerp(a.clone().convertSRGBToLinear(), k == null ? 0.7 : k); };   // 화면에서 색이 옅어지지 않게 조금 진하게
      const M = (c, ex) => { const p = Object.assign({}, ex || {}); delete p.plain; const m = ex && (ex.transparent || ex.plain) ? new THREE.MeshStandardMaterial(Object.assign({ color: ex.plain ? c : deep(c), roughness: 0.4, metalness: 0, side: THREE.DoubleSide }, p)) : ctx.mats.organic(deep(c), { extra: Object.assign({ side: THREE.DoubleSide }, p) }); allMats.push(m); return m; };   // 막단백질 · 당 · 콜레스테롤: 촉촉한 생체 조직 느낌 (인지질처럼 수가 많은 것은 가벼운 재질)

      /* ----- 단백질 ----- */
      const prots = [
        { type: 'ch', name: '통로 단백질', x: -1.55, z: 0.0, r: 0.52, integral: true },
        { type: 'ca', name: '운반체 단백질', x: -0.2, z: 0.0, r: 0.55, integral: true },
        { type: 're', name: '수용체', x: 1.2, z: 0.0, r: 0.52, integral: true },
        { type: 'gp', name: '인식 당단백질', x: -0.7, z: -1.45, r: 0.42, integral: true },
        { type: 'en', name: '효소', x: 1.45, z: -1.2, r: 0.5, integral: false },
      ];
      const pg = new THREE.Group(); root.add(pg);
      const hexGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.06, 6);
      const sugMat = M(SUGC, { roughness: 0.4 });
      function hexBead(parent, x, y, z) { const m = new THREE.Mesh(hexGeo, sugMat); m.position.set(x, y, z); m.rotation.x = 0.5; m.rotation.z = 0.4; parent.add(m); return m; }
      const ions = [], cargo = {};
      prots.forEach((P) => {
        const g = new THREE.Group(); P.g = g; pg.add(g);
        const m = M(PCOL[P.type], { roughness: 0.4 });
        if (P.type === 'ch') {
          for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.8, 14), m); c.position.set(0.36 * Math.cos(a), 0, 0.36 * Math.sin(a)); g.add(c); const t = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 8), m); t.position.set(c.position.x, 0.9, c.position.z); g.add(t); const b = t.clone(); b.position.y = -0.9; g.add(b); }
          const pore = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.85, 16, 1, true), M(0xbfe3ff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); g.add(pore);
          [[0xef4444, 0], [0x3b82f6, 0.5], [0xef4444, 0.25], [0x3b82f6, 0.75]].forEach((c) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), M(c[0], { roughness: 0.3 })); g.add(s); ions.push({ m: s, ph: c[1] }); });
        } else if (P.type === 'ca') {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), m); b.scale.set(1, 1.8, 0.85); g.add(b);
          const pk = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), M(0x115e59)); pk.position.set(0, 0.55, 0.28); g.add(pk);
          const cg = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), M(0x22c55e, { roughness: 0.3 })); g.add(cg); cargo.m = cg;
        } else if (P.type === 're') {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 18), m); b.scale.set(0.85, 1.6, 0.75); g.add(b);
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 8), m); stem.position.y = 1.15; g.add(stem);
          [-1, 1].forEach((s) => { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), m); arm.position.set(s * 0.17, 1.55, 0); arm.rotation.z = -s * 0.5; g.add(arm); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), m); tip.position.set(s * 0.3, 1.76, 0); g.add(tip); });
          const sig = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), M(0xef4444, { emissive: 0x7f1d1d, emissiveIntensity: 0.6 })); sig.position.set(0, 1.95, 0); g.add(sig); P.sig = sig;
        } else if (P.type === 'gp') {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.7, 18), m); g.add(b);
          const t = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 10), m); t.position.y = 0.85; g.add(t); const bt = t.clone(); bt.position.y = -0.85; g.add(bt);
          const st = M(0xa21caf);
          [[-0.15, 0, 0.08], [0.12, 0.05, -0.1], [0.02, 0.02, 0.16]].forEach((o, i) => {
            const bx = o[0] * 1.2, bz = o[2] * 1.2; let px = bx, py = 1.1, pz = bz;
            for (let k = 0; k < 3 + (i % 2); k++) { hexBead(g, px, py, pz); px += (i - 1) * 0.1 + Math.sin(k * 2 + i) * 0.04; py += 0.17; pz += Math.cos(k + i) * 0.06; }
          });
          P.top = 1.5;
        } else { // 효소: 말초 단백질 (안쪽 표면에 붙음)
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), m); b.scale.set(1.15, 0.72, 0.95); g.add(b);
          const pk = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 10), M(0x075985)); pk.position.set(0, -0.2, 0.3); g.add(pk);
        }
        g.position.set(P.x, P.type === 'en' ? -1.37 : 0, P.z);
      });

      /* ----- 인지질 ----- */
      const lip = [[], []];
      for (let L = 0; L < 2; L++) for (let iz = 0; iz < GZ; iz++) for (let ix = 0; ix < GX; ix++) {
        const x = (ix - (GX - 1) / 2) * SX + ((iz + L) % 2 ? SX / 2 : 0) - SX / 4, z = (iz - (GZ - 1) / 2) * SZ + (L ? 0.01 : 0);
        const o = { L, x, z, hx: x, hz: z, ph: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], w: [0.8 + rnd() * 1.2, 1.5 + rnd() * 1.6], kink: rnd(), hidden: false, site: false, cx: x, cz: z };
        prots.forEach((P) => { if (P.integral && Math.hypot(x - P.x, z - P.z) < P.r + 0.12) o.hidden = true; });
        lip[L].push(o);
      }
      const all = lip[0].concat(lip[1]), NL = all.length;
      /* 콜레스테롤 자리 */
      const chol = [];
      for (let L = 0; L < 2; L++) {
        const cand = lip[L].filter((o) => !o.hidden).sort(() => rnd() - 0.5), got = [];
        cand.forEach((o) => { if (got.length < 10 && got.every((q) => Math.hypot(q.x - o.x, q.z - o.z) > 0.8)) { got.push(o); o.site = true; } });
        got.forEach((o) => { const g = new THREE.Group(); const dir = L ? -1 : 1; const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.5, 4, 10), M(CHOLC, { roughness: 0.35 })); cap.position.y = dir * (YH - 0.42); g.add(cap); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M(0xf97316)); hd.position.y = dir * (YH - 0.06); g.add(hd); g.visible = false; root.add(g); chol.push({ o, g }); });
      }
      /* 당지질 (바깥쪽 인지질에 붙은 당 사슬) */
      const glyco = [];
      lip[0].filter((o) => !o.hidden && !o.site && o.z < 0.1).sort(() => rnd() - 0.5).slice(0, 5).forEach((o) => { const g = new THREE.Group(); root.add(g); hexBead(g, 0, 0.3, 0); hexBead(g, 0.1, 0.45, 0.03); hexBead(g, 0.03, 0.6, -0.02); glyco.push({ o, g }); });

      /* 인스턴스: 머리 · 꼬리 */
      const headMat = M(0xffffff, { roughness: 0.28, plain: true }), tailMat = M(deep(TAILC), { roughness: 0.5, plain: true });   // 머리 색은 인스턴스 색(평소 파랑, 유동성 단계에서는 형광 빨강 · 초록)
      const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), headMat, NL);
      const tg = new THREE.CylinderGeometry(0.036, 0.03, 0.3, 6); tg.translate(0, -0.15, 0);
      const tails = new THREE.InstancedMesh(tg, tailMat, NL * 4);
      heads.frustumCulled = false; tails.frustumCulled = false; root.add(heads, tails);
      /* 3단계(유동성): 2D의 세포 융합 실험처럼 머리를 사람 세포(빨강) · 생쥐 세포(초록) 형광으로 칠하고, 2D 막 평면의 섞인 모습을 그대로 따라가요 */
      const cHead = deep(HEADC), cR = deep(0xef4444), cG = deep(0x22c55e), cTmp = new THREE.Color();
      for (let i = 0; i < NL; i++) heads.setColorAt(i, cHead);
      const xs = all.map((o) => o.x), zs = all.map((o) => o.z), X0 = Math.min.apply(null, xs), X1 = Math.max.apply(null, xs), Z0 = Math.min.apply(null, zs), Z1 = Math.max.apply(null, zs);
      const BX = 10, BY = 6, binF = new Float32Array(BX * BY).fill(-1); let fluoOn = false, fluoT = 0;
      function fluoTick(dt) {
        const L2 = ctx.lesson(), on = !!(L2 && L2.S && L2.S.mode === 'fluid' && L2.S.fx && L2.S.fx.ps);
        if (!on) { if (fluoOn) { fluoOn = false; for (let i = 0; i < NL; i++) heads.setColorAt(i, cHead); heads.instanceColor.needsUpdate = true; } return; }
        fluoOn = true; fluoT -= dt; if (fluoT > 0) return; fluoT = 0.25;
        const nR = new Float32Array(BX * BY), nA = new Float32Array(BX * BY);
        L2.S.fx.ps.forEach((p) => { const k = Math.min(BY - 1, Math.floor(p.y * BY)) * BX + Math.min(BX - 1, Math.floor(p.x * BX)); nA[k]++; if (p.c === 0) nR[k]++; });
        for (let k = 0; k < BX * BY; k++) if (nA[k] > 0) binF[k] = nR[k] / nA[k];
        all.forEach((o, i) => { const u = (o.cx - X0) / Math.max(1e-6, X1 - X0), v = (o.cz - Z0) / Math.max(1e-6, Z1 - Z0), k = Math.min(BY - 1, Math.max(0, Math.floor(v * BY))) * BX + Math.min(BX - 1, Math.max(0, Math.floor(u * BX))), f = binF[k] < 0 ? (u < 0.5 ? 1 : 0) : binF[k]; heads.setColorAt(i, cTmp.copy(cG).lerp(cR, f)); });
        heads.instanceColor.needsUpdate = true;
      }
      const dm = new THREE.Matrix4(), m1 = new THREE.Matrix4(), m2 = new THREE.Matrix4(), q = new THREE.Quaternion(), qe = new THREE.Euler(), vp = new THREE.Vector3(), vs = new THREE.Vector3(1, 1, 1), zero = new THREE.Matrix4().makeScale(0, 0, 0);
      const flipQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);

      /* ----- 상태 ----- */
      let Tc = 37, U = 40, hasChol = false, cut = true, names = true, M01 = 1, camGo = 1.3, swapAcc = 0, uMax = 0.4;
      const curKinkMax = () => U / 100;
      function syncM() { M01 = fluidOf(Tc, U, hasChol); }
      function swapOne() {
        const L = rnd() < 0.5 ? 0 : 1, arr = lip[L].filter((o) => !o.hidden && !o.site);
        for (let tries = 0; tries < 8; tries++) {
          const a = arr[(rnd() * arr.length) | 0], cand = arr.filter((b) => b !== a && Math.hypot(b.x - a.x, b.z - a.z) < 0.5 && (b.z > 0) === (a.z > 0));
          if (!cand.length) continue; const b = cand[(rnd() * cand.length) | 0];
          const ax = a.x, az = a.z; a.x = b.x; a.z = b.z; b.x = ax; b.z = az; return;
        }
      }

      /* ----- 이름표 ----- */
      const A = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); root.add(o); return o; };
      const labs = [];
      const L = (t, a, c, off) => { const l = label(t, a, { color: c, size: PHONE ? 11.5 : 12.5, offset: off || [0, 0, 0] }); labs.push(l); return l; };
      const aOut = A(2.2, 2.0, 0), aIn = A(-2.1, -1.8, 0);
      const outL = L('세포 밖 (바깥쪽)', aOut, 'rgba(29,78,216,.93)'), inL = L('세포 안 (세포질)', aIn, 'rgba(146,64,14,.93)');
      const aHead = A(2.0, YH + 0.18, -0.2), aTail = A(2.0, 0.42, -0.2);
      const headL = L('인지질 머리 (친수성)', aHead, 'rgba(37,99,235,.93)', [0, 0.18, 0]), tailL = L('꼬리 (소수성)', aTail, 'rgba(180,83,9,.93)');
      const pL = {};
      prots.forEach((P) => { pL[P.type] = L(P.name + (P.type === 'en' ? ' (말초)' : ''), P.g, 'rgba(' + [(PCOL[P.type] >> 16) & 255, (PCOL[P.type] >> 8) & 255, PCOL[P.type] & 255].join(',') + ',.93)', [0, P.type === 'en' ? -0.75 : P.type === 'ca' ? -1.35 : (P.type === 're' ? 2.25 : P.type === 'gp' ? 1.15 : 1.3), 0]); });
      const sugL = L('당 사슬 (바깥쪽에만)', A(-0.7, 2.35, -1.45), 'rgba(161,98,7,.93)');
      const cholL = L('콜레스테롤', chol.length ? chol[0].g : root, 'rgba(161,98,7,.93)', [0.35, 0.1, 0.25]);

      /* ----- 정보 · 조작 ----- */
      function refresh() {
        syncM(); const pct = Math.round(M01 * 100);
        const sh = stHtml(); if (sh) info(sh); else info('<div style="max-width:' + (PHONE ? 205 : 235) + 'px"><b>유동 모자이크</b> · 유동성 <b>' + pct + ' %</b><br>머리(' + (((ctx.lesson() || {}).S || {}).mode === 'fluid' ? '형광 표지: 빨강 · 초록' : '파랑') + ', 친수성)는 바깥쪽, 꼬리(주황, 소수성)는 안쪽에 모인 <b>이중층</b><br>통합 단백질은 박혀 있고, 말초 단백질은 표면에 붙어 있어요.</div>');
        labs.forEach((l) => l.show(names)); cholL.show(names && hasChol && chol.length > 0);
      }
      /* 3D에서 조작하면 2D 유동성 실험(S.fx)도 같은 값으로 (2D 슬라이더를 움직인 것과 같아요) */
      function toLesson(fn) { try { const L = ctx.lesson(); if (L && L.S && L.S.fx && L.fxReset) { fn(L.S.fx, L); } } catch (e) {} }
      const tR = controls.range('온도', 1, 37, 1, Tc, (v) => { Tc = v; refresh(); toLesson((f, L) => { f.T = v; const e = document.getElementById('sFT'); if (e) e.value = v; lastFx.T = v; L.fxReset(); }); }, (v) => v + ' °C');
      const uR = controls.range('불포화 지방산', 0, 100, 10, U, (v) => { U = v; refresh(); toLesson((f, L) => { f.u = v; const e = document.getElementById('sFU'); if (e) e.value = v; lastFx.u = v; L.fxReset(); }); }, (v) => v + ' %');
      const lastFx = {}; let lastView = null;
      function setChol(v) { hasChol = v; cB.classList.toggle('on', hasChol); chol.forEach((c) => { c.g.visible = hasChol; }); refresh(); }
      const cB = controls.button('🧈 콜레스테롤', () => {
        const L = ctx.lesson();
        if (L && L.S && L.S.mode === 'prot' && L.S.pr) {   // 막 단백질 화면: 2D의 콜레스테롤 넣기 / 모두 빼기와 같게
          if (!hasChol) { const n = L.S.pr.chol; L.prAddChol(); if (L.S.pr.chol === n) return; setChol(true); }
          else { L.S.pr.chol = 0; L.S.pr.cdrop = [0, 0, 0, 0, 0, 0]; L.updateCtl(); setChol(false); }
          return;
        }
        setChol(!hasChol); toLesson((f, L2) => { f.chol = hasChol; lastFx.chol = hasChol; L2.fxReset(); });
      });
      const xB = controls.button('✂ 단면', () => { cut = !cut; xB.classList.toggle('on', cut); allMats.forEach((m) => { m.clippingPlanes = cut ? [plane] : null; m.needsUpdate = true; }); if (cut) camGo = 1.3; refresh(); }); xB.classList.toggle('on', cut);
      const nB = controls.button('🏷 이름표', () => { names = !names; nB.classList.toggle('on', names); refresh(); }); nB.classList.toggle('on', names);
      allMats.forEach((m) => { m.clippingPlanes = [plane]; });
      function lessonFx() { try { const f = window.__sim && window.__sim.S && window.__sim.S.fx; if (f && typeof f.T === 'number') return f; } catch (e) {} return null; }
      function fromLesson() {
        const f = lessonFx(); if (!f) return;
        Tc = Math.max(1, Math.min(37, f.T)); U = Math.max(0, Math.min(100, f.u)); tR.set(Tc); uR.set(U);
        if (!!f.chol !== hasChol) setChol(!!f.chol);
        lastFx.T = f.T; lastFx.u = f.u; lastFx.chol = f.chol;
      }
      /* 2D에서 바뀌면 3D도 따라가요: 유동성 화면은 온도 · 불포화 · 콜레스테롤, 막 단백질 화면은 콜레스테롤 유무 */
      function poll() {
        const L = ctx.lesson(); if (!L || !L.S) return;
        if (L.S.mode === 'fluid') { const f = L.S.fx; if (f && (f.T !== lastFx.T || f.u !== lastFx.u || f.chol !== lastFx.chol)) { fromLesson(); refresh(); } }
        else if (L.S.mode === 'prot' && L.S.pr) {
          const c = L.S.pr.chol > 0; if (c !== hasChol) setChol(c);
          if (L.S.pr.view !== lastView) { if (lastView != null) { orbit.phi = L.S.pr.view ? 0.18 : 1.3; orbit.theta = L.S.pr.view ? 0 : 0.2; } lastView = L.S.pr.view; }   // 단면(옆) · 위에서 본 모양
        }
      }
      cB.classList.toggle('on', hasChol);
      /* ---- 2단계: 막 단백질 넣기(2D의 prPlace) · 기능 연결(2D의 matchS)을 3D 막대 단추로 ----
         넣지 않은 단백질은 흐리게(빈 자리) 보여 주고, 넣으면 진하게 바뀌어요. */
      const LS = () => { const L2 = ctx.lesson(); return L2 && L2.S && L2.S.pr && L2.matchS ? L2 : null; };
      const stMode = () => { const L2 = LS(); return L2 ? L2.S.mode : ''; };
      const gMats = {};
      prots.forEach((P) => { const ms = []; P.g.traverse((o) => { if (o.isMesh && o.material && o.material !== sugMat && ms.indexOf(o.material) < 0) ms.push(o.material); }); gMats[P.type] = ms.map((m) => ({ m, op: m.opacity, tr: m.transparent, dw: m.depthWrite })); });
      const ghostNow = {};
      function setGhost(P, on) {
        if (!!ghostNow[P.type] === on) return; ghostNow[P.type] = on;
        gMats[P.type].forEach((q) => { q.m.transparent = on ? true : q.tr; q.m.opacity = on ? 0.16 : q.op; q.m.depthWrite = on ? false : q.dw; q.m.needsUpdate = true; });
      }
      let mSel = 0;
      function putProt(type) {
        const L2 = LS(); if (!L2 || L2.S.mode !== 'prot' || !L2.prPlace) return; const its = L2.S.pr.items, q = its.find((o) => o.type === type);
        if (!q || q.slot >= 0) return;
        const free = [0, 1, 2, 3, 4].filter((k) => !its.some((o) => o.slot === k)).sort((a, b) => Math.abs(a - 2) - Math.abs(b - 2)); if (!free.length) return;
        L2.prPlace(q, free[0]); stSig = '';
      }
      function pickCard(d) { const L2 = LS(); if (!L2) return; const cs = L2.matchS.cards, n = cs.length; mSel = ((mSel + d) % n + n) % n; stSig = ''; }
      function putCard(k) {
        const L2 = LS(); if (!L2 || L2.S.mode !== 'match') return; const cs = L2.matchS.cards, c = cs[mSel]; if (!c) return;
        L2.matchS.place(c, L2.PTYPES[k]);
        const nx = cs.findIndex((o, i) => i > mSel && !o.zone); const nx0 = cs.findIndex((o) => !o.zone); mSel = nx >= 0 ? nx : nx0 >= 0 ? nx0 : mSel; stSig = '';
      }
      const ctlBox = renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl'), nP0 = ctlBox.children.length;
      controls.text('<b>막에 넣기</b>');
      const ORD = ['ch', 'ca', 're', 'en', 'gp'], putBtn = ORD.map((k) => controls.button(prots.find((P) => P.type === k).name, () => putProt(k)));
      const prEls = Array.prototype.slice.call(ctlBox.children, nP0), nM0 = ctlBox.children.length;
      controls.text('<b>카드</b>'); controls.button('◀', () => pickCard(-1)); controls.button('▶', () => pickCard(1)); controls.text('<b>기능 상자</b>');
      [0, 1, 2, 3, 4].forEach((k) => controls.button('기능 ' + (k + 1), () => putCard(k)));
      const mEls = Array.prototype.slice.call(ctlBox.children, nM0);
      [prEls, mEls].forEach((g) => g.forEach((e) => { e.style.display = 'none'; }));
      function stHtml() {
        const L2 = LS(), m = L2 ? L2.S.mode : ''; if (m !== 'prot' && m !== 'match') return '';
        if (m === 'prot') {
          const its = L2.S.pr.items, n = its.filter((o) => o.slot >= 0).length;
          return '<div style="max-width:' + (PHONE ? 205 : 260) + 'px"><b>막 단백질 넣기</b> · ' + n + ' / 5 · 콜레스테롤 ' + L2.S.pr.chol + '개<br>흐린 단백질은 아직 빈 자리예요. 아래 <b>막에 넣기</b> 단추로 끼워 넣고, <b>🧈 콜레스테롤</b>도 3개 이상 넣어요.</div>';
        }
        const M = L2.matchS, P = L2.PROT || {}, c = M.cards[mSel], nm = (id) => (P[id] ? P[id].name : id);
        const rows = L2.PTYPES.map((k, i) => { const on = M.cards.filter((o) => o.zone === k).map((o) => nm(o.id)).join(', '); return '기능 ' + (i + 1) + ': ' + (P[k] ? P[k].fn : '') + (on ? ' → <b>' + on + '</b>' : ''); });
        return '<div style="max-width:' + (PHONE ? 230 : 330) + 'px"><b>단백질 기능 연결</b> · 놓은 카드 ' + M.placed + ' / 5<br>고른 카드: <b>' + (c ? nm(c.id) : '—') + '</b> (◀ ▶)<br>' + rows.join('<br>') + '</div>';
      }
      let stSig = null;
      function stTick() {
        const L2 = LS(), m = L2 ? L2.S.mode : '';
        const sg = m + (m === 'prot' ? L2.S.pr.items.map((o) => (o.slot >= 0 ? 1 : 0)).join('') + L2.S.pr.chol : m === 'match' ? L2.matchS.cards.map((o) => o.zone || '-').join(',') + mSel : '');
        if (sg === stSig) return; stSig = sg;
        prEls.forEach((e) => { e.style.display = m === 'prot' ? '' : 'none'; }); mEls.forEach((e) => { e.style.display = m === 'match' ? '' : 'none'; });
        prots.forEach((P) => { const q = m === 'prot' ? L2.S.pr.items.find((o) => o.type === P.type) : null; const g = !!(q && q.slot < 0); setGhost(P, g); if (pL[P.type]) pL[P.type].set(g ? '? 빈 자리' : P.name + (P.type === 'en' ? ' (말초)' : '')); });
        if (m === 'prot') putBtn.forEach((b, i) => { const q = L2.S.pr.items.find((o) => o.type === ORD[i]); b.disabled = !!(q && q.slot >= 0); });
        refresh();
      }
      /* 유동성: 2D의 그래프 대신 섞인 정도 · 시간 · 85 % 도달 시간을 3D 화면 오른쪽 위에 보여 줘요 */
      const fxP = v3pan('tr');
      function drawFx() {
        const L2 = ctx.lesson(), F = L2 && L2.S && L2.S.mode === 'fluid' ? L2.S.fx : null; if (!F) { fxP.put(''); return; }
        const mn = Math.round(F.t * 10) / 10, bar = '<span style="display:inline-block;width:90px;height:9px;border-radius:5px;background:rgba(255,255,255,.18);position:relative;vertical-align:middle;overflow:hidden"><span style="position:absolute;left:0;top:0;bottom:0;width:' + F.mix + '%;background:#a3e635"></span><span style="position:absolute;left:85%;top:0;bottom:0;width:2px;background:#22c55e"></span></span>';
        fxP.put('<div class="h">형광 <span style="color:#f87171">● 사람 세포</span> <span style="color:#4ade80">● 생쥐 세포</span></div><div>섞인 정도 ' + bar + ' ' + F.mix + ' %</div><div>시간 ' + mn + '분' + (F.t85 != null ? ' · <span class="ok">85 % 도달 ' + (Math.round(F.t85 * 10) / 10) + '분</span>' : '') + '</div>');
      }
      fromLesson(); refresh();

      const ap = (a, b, dt, r) => a + (b - a) * (1 - Math.exp(-r * dt));
      let tPrev = 0;
      return {
        update(dt, t) {
          poll(); stTick();
          if (camGo > 0 && cut) { camGo -= dt; orbit.theta += (0.18 - orbit.theta) * Math.min(1, dt * 3); orbit.phi += (1.3 - orbit.phi) * Math.min(1, dt * 3); }
          syncM(); const m = M01;
          // 옆으로 자리 바꾸기
          swapAcc += dt * (0.4 + 7 * m); while (swapAcc > 1) { swapAcc -= 1; swapOne(); }
          const ax = 0.012 + 0.055 * m, az = 0.01 + 0.03 * m, sw = 0.02 + 0.085 * m;
          prots.forEach((P, i) => { // 단백질도 천천히 떠다녀요 (자르는 면 위에서 옆으로만)
            P.g.position.x = P.x + Math.sin(t * 0.5 + i * 1.7) * 0.1 * (0.15 + m); if (P.type !== 'en') P.g.position.z = P.z;
            P.g.position.z = P.z + (P.type === 'en' || P.type === 'gp' ? Math.cos(t * 0.4 + i) * 0.08 * (0.15 + m) : 0);
          });
          ions.forEach((s) => { const p = (t * 0.22 + s.ph) % 1; s.m.position.set(Math.sin(p * 9 + s.ph * 6) * 0.05, 1.5 - 3.0 * p, Math.cos(p * 7 + s.ph * 5) * 0.05); });
          if (cargo.m) { const p = (t * 0.2) % 1, e = Math.min(1, p / 0.8); cargo.m.position.set(0.0, 1.4 - 2.8 * e + (p > 0.8 ? 0 : 0), 0.3); cargo.m.visible = p < 0.8; }
          prots.forEach((P) => { if (P.sig) { P.sig.position.y = 1.95 + Math.sin(t * 2) * 0.06; P.sig.rotation.y = t; } });
          // 인지질
          const kmax = curKinkMax(), px = prots.filter((P) => P.integral).map((P) => [P.g.position.x, P.g.position.z, P.r + 0.2]);
          all.forEach((o, i) => {
            const dir = o.L ? -1 : 1;
            o.hx = ap(o.hx, o.x, dt, 5); o.hz = ap(o.hz, o.z, dt, 5);
            const hid = o.hidden || (hasChol && o.site);
            if (hid) { heads.setMatrixAt(i, zero); for (let k = 0; k < 4; k++) tails.setMatrixAt(i * 4 + k, zero); o.cx = o.hx; o.cz = o.hz; return; }
            let x = o.hx + ax * (Math.sin(t * o.w[0] + o.ph[0]) + 0.5 * Math.sin(t * o.w[1] + o.ph[1])), z = o.hz + az * (Math.sin(t * o.w[1] + o.ph[2]) + 0.5 * Math.sin(t * o.w[0] + o.ph[3]));
            for (let k = 0; k < px.length; k++) { const dx = x - px[k][0], dz = z - px[k][1], d = Math.hypot(dx, dz); if (d < px[k][2]) { const s = px[k][2] / (d || 0.01); x = px[k][0] + dx * s; z = px[k][1] + dz * s; } }
            o.cx = x; o.cz = z;
            const y = dir * YH + Math.sin(t * 1.3 + o.ph[0]) * 0.012 * dir;
            dm.compose(vp.set(x, y, z), q.identity(), vs.set(0.17, 0.17, 0.17)); heads.setMatrixAt(i, dm);
            vs.set(1, 1, 1);
            for (let k = 0; k < 2; k++) {
              const side = k ? 1 : -1, kinked = k === 1 && o.kink < kmax;
              const rx = sw * Math.sin(t * o.w[0] * 1.3 + o.ph[k] + k) , rz = sw * Math.cos(t * o.w[1] * 1.1 + o.ph[k + 1]);
              q.setFromEuler(qe.set(rx, 0, rz)); if (dir < 0) q.premultiply(flipQ);
              m1.compose(vp.set(x + side * 0.075, y - dir * 0.12, z), q, vs);
              tails.setMatrixAt(i * 4 + k * 2, m1);
              const kk = kinked ? 0.6 : 0.03 * Math.sin(t * 2 + o.ph[2]);
              q.setFromEuler(qe.set(kinked ? 0.25 : 0, 0, kk));
              m2.compose(vp.set(0, -0.3, 0), q, vs); m2.premultiply(m1);
              tails.setMatrixAt(i * 4 + k * 2 + 1, m2);
            }
          });
          heads.instanceMatrix.needsUpdate = true; tails.instanceMatrix.needsUpdate = true;
          fluoTick(dt); drawFx();
          chol.forEach((c) => { if (c.g.visible) c.g.position.set(c.o.cx, 0, c.o.cz); });
          glyco.forEach((c) => c.g.position.set(c.o.cx, YH + 0.1, c.o.cz));
        },
        sync() { fromLesson(); refresh(); },
      };
    },
  });
})();
