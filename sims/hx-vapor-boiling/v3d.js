/* hx-vapor-boiling · 3D 증기압과 끓음
   1단계 '증기압: 밀폐 용기 속 평형' — 뚜껑을 닫은 용기의 물에서 증발(↑)과 응축(↓)이 같아지는 동적 평형.
     2D의 항온 수조 온도(20 · 40 · 60 °C)와 '액체 더 넣기'를 그대로 따라가요.
   3단계 '압력과 끓는점' — 외부 압력(0.30 ~ 2.00 atm)과 가열 정도에 따라 물이 끓는 모습.
     증기 압력(물의 증기압 곡선)이 외부 압력과 같아지면 끓어요.
   2단계(증기압 곡선): 에터 · 에탄올 · 물의 밀폐 용기 3개를 같은 온도에서 나란히 보여 줘요 (그래프 읽기는 2D).
   4단계(상평형 그림): 압력 · 온도에 따라 고체 · 액체 · 기체로 바뀌는 용기 (그림 읽기는 2D).
   모든 값은 2D 실험의 자료(LIQ · 물의 증기압 곡선)를 그대로 써요. 분자 수는 모형 스케치예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const R = 2.3, HJ = 5.6, FLOOR = -2.8, LIQ0 = 1.7, MAXG = 44, NL = 64, ATM = 760;
  const WATER = 0x38bdf8;
  const FALLBACK = (T) => 17.5 * Math.exp(4900 * (1 / 293.15 - 1 / (T + 273.15)));

  window.SciSim3D.attach({
    title: '증기압과 끓음 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 16 : 13, theta: 0.5, phi: 1.2, min: 6, max: 26, target: [0, PHONE ? 0.4 : 0.9, 0] },
    autoRotate: 0.12,
    levels: [0, 2],   // 1단계(증기압), 3단계(압력과 끓는점). 2·4단계는 그래프(증기압 곡선 · 상평형 그림)를 읽거나 점을 끄는 2D 화면이에요. #bMore는 액체 높이를 바꿔서 data-v3="keep"
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
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const sim = () => window.__sim || null;
      const Pw = (T) => { try { return sim().LIQ.water.P(T); } catch (e) { return FALLBACK(T); } };
      const Tbw = (pmm) => { try { return sim().Tbw(pmm); } catch (e) { let lo = 0, hi = 125; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Pw(m) < pmm) lo = m; else hi = m; } return (lo + hi) / 2; } };

      const jar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HJ, 56, 1, true), ctx.mats.glass({ tint: 0xd6ecff, opacity: 0.17 }));
      jar.position.y = FLOOR + HJ / 2; root.add(jar);
      { const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 10, 72), ctx.mats.glass({ opacity: 0.4 })); rim.rotation.x = Math.PI / 2; rim.position.y = FLOOR + HJ; root.add(rim); }   // 유리 용기의 두께 있는 테두리
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.2, 56), ctx.mats.metal(0x3d4656, { roughness: 0.55 }));
      bot.position.y = FLOOR - 0.1; root.add(bot);
      const lid = new THREE.Group(); root.add(lid);                       // 뚜껑 / 피스톤
      lid.add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.08, R + 0.08, 0.28, 56), ctx.mats.metal(0x8f99a8, { brushed: true, roughness: 0.3 })));
      { const seal = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.1, R + 0.1, 0.08, 56), ctx.mats.rubber(0x15181f)); seal.position.y = -0.06; lid.add(seal); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 20), ctx.mats.metal('chrome', { roughness: 0.14 })); st.position.y = 0.2; lid.add(st); }
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 20), ctx.mats.plastic(0xc23324, { roughness: 0.22 })); knob.position.y = 0.42; lid.add(knob);
      const liqMat = ctx.mats.liquid(0x1f9fe0, { opacity: 0.5 });
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 1, 56), liqMat); root.add(liq);
      // 외부 압력 화살표 (뚜껑을 누르는 힘)
      const amat = ctx.mats.plastic(0xf59a23, { extra: { emissive: 0x663300, emissiveIntensity: 0.35 } });
      const arrows = [];
      for (let i = 0; i < 4; i++) {
        const a = new THREE.Group(); a.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), amat), new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 16), amat));
        root.add(a); arrows.push(a);
      }
      // 열원 (끓음 단계)
      const burner = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.16, 40), ctx.mats.metal('iron', { roughness: 0.45, extra: { emissive: 0xff5a1f, emissiveIntensity: 0 } }));
      burner.position.y = FLOOR - 0.28; root.add(burner);
      const burnGlow = ctx.halo(burner, 0xff7a30, (R + 0.3) * 3.2, 0);   // 달궈진 열판의 빛 번짐 (세기는 온도에 따라)

      const sm = new THREE.MeshStandardMaterial({ color: 0x1b9be0, roughness: 0.2, metalness: 0, emissive: 0x0a1a2a, emissiveIntensity: 0.3 });
      const lm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 16, 12), sm, NL); lm.frustumCulled = false; lm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(lm);
      const gm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 18, 14), sm, MAXG); gm.frustumCulled = false; gm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(gm);
      const LP = Array.from({ length: NL }, () => { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (R - 0.35); return { a, r, y: Math.random(), ph: Math.random() * 6.28 }; });
      const GP = Array.from({ length: MAXG }, () => ({ on: false, p: new V3(), v: new V3() }));
      const bubbles = Array.from({ length: 14 }, () => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), ctx.mats.glass({ tint: 0xffffff, opacity: 0.38, extra: { side: THREE.FrontSide } })); b.visible = false; root.add(b); return { m: b, t: Math.random(), x: 0, z: 0 }; });
      const M = new THREE.Matrix4();
      const tl = label('', [R, FLOOR + 1, 0], { color: 'rgba(30,41,59,.9)' });
      const pl = label('', [0, FLOOR + HJ + 0.9, 0], { color: 'rgba(239,106,91,.92)' });
      let txt = '', acc = 0, accC = 0, liqH = LIQ0, sig = '', demo = null, gAvg = 0;

      /* ---- 지금 화면의 상태: 2D에서 읽어요 ---- */
      function read() {
        const s = sim(), S = s && s.S; let o = { mode: 'vap', T: 20, Pv: 17.5, Pext: null, nLiq: 70, eq: false, boil: false, Tb: 100, P: 1, Tset: 25 };
        if (!S) return o;
        o.mode = S.mode;
        if (S.mode === 'press') {
          const p = S.press, Pm = p.P * ATM, Tb = Tbw(Pm);
          o.T = p.Teff; o.Pext = Pm; o.P = p.P; o.Tb = Tb; o.Tset = p.Tset; o.Pv = Pw(p.Teff); o.boil = p.boilT > 0.05;
        } else {
          const v = S.vap; o.T = v.Td != null ? v.Td : v.T; o.Pv = v.Pd; o.nLiq = v.nLiq; o.eq = !!v.eq; o.Pext = null;
        }
        return o;
      }
      const readSig = (o) => o.mode + '|' + (o.mode === 'press' ? o.P + ',' + o.Tset : o.T);

      const pl0 = controls.player({
        duration: 10, loop: true, autoplay: false, label: '재생',
        phases: [[0, '가열'], [0.5, '식힘']],
        onFrame(p) { demo = p; },
      });
      function applyDemo(o) {
        const tri = (p) => (p < 0.5 ? p / 0.5 : (1 - p) / 0.5), e = tri(demo), e2 = e * e * (3 - 2 * e);
        if (o.mode === 'press') {
          const Tb = o.Tb, hi = Math.min(125, Tb + 6);
          o.T = Math.min(Tb, 25 + (hi - 25) * e2); o.Pv = Pw(o.T); o.boil = (25 + (hi - 25) * e2) >= Tb - 0.05; o.Tset = hi;
        } else {
          o.T = 20 + 40 * e2; o.Pv = Pw(o.T); o.eq = true;
        }
        return o;
      }

      function layout(o) {
        const press = o.mode === 'press';
        const th = press ? LIQ0 : Math.min(3.4, LIQ0 * o.nLiq / 70);
        liqH += (th - liqH) * 0.15;
        liq.scale.set(1, liqH, 1); liq.position.y = FLOOR + liqH / 2;
        lid.position.y = FLOOR + HJ + 0.14;
        burner.material.emissiveIntensity = press ? Math.max(0, Math.min(1, (o.Tset - 20) / 100)) * 0.9 : 0;
        burner.visible = press; burnGlow.material.opacity = burner.material.emissiveIntensity * 0.5;
        arrows.forEach((a, i) => {
          a.visible = press;
          if (!press) return;
          const ang = (i / 4) * Math.PI * 2 + 0.78, L = 0.4 + 0.55 * Math.min(2.2, o.P);
          a.position.set(Math.cos(ang) * 1.2, FLOOR + HJ + 0.3 + L / 2 + 0.5, Math.sin(ang) * 1.2);
          a.children[0].scale.set(1, L, 1); a.children[1].position.y = -L / 2 - 0.18; a.children[1].rotation.x = Math.PI;
        });
        return FLOOR + liqH;
      }


      /* ================= 2단계 · 4단계: 세 액체의 증기압(curve) · 상평형(phase)도 같은 값으로 실험 장면을 보여 줘요 ================= */
      const gMain = new THREE.Group(); while (root.children.length) gMain.add(root.children[0]); root.add(gMain);
      const gC = new THREE.Group(), gP = new THREE.Group(); root.add(gC); root.add(gP); gC.visible = gP.visible = false;
      const probe = controls.text(''); probe.style.display = 'none'; const ctlEl = probe.parentElement;
      const oldEls = Array.prototype.filter.call(ctlEl.children, (e) => e !== probe);
      const grab = (fn) => { const n0 = ctlEl.children.length; const r = fn(); return { r, els: Array.prototype.slice.call(ctlEl.children, n0) }; };
      const stdM = (c, o) => { o = o || {};   // 유리 · 액체 · 금속은 실제 같은 재질로
        if (o.transparent && o.side === THREE.DoubleSide) return ctx.mats.glass({ tint: 0xd6ecff, opacity: o.opacity + 0.02 });
        if (o.transparent && c === 0xffffff) return ctx.mats.liquid(0xffffff, { opacity: o.opacity });
        if (o.metalness >= 0.4) return c === 0x64748b ? ctx.mats.metal(0x3d4656, { roughness: 0.55 }) : ctx.mats.metal(0x8f99a8, { brushed: true, roughness: 0.3 });
        if (c === 0x3a3f4b) return ctx.mats.metal('iron', { roughness: 0.45, extra: { emissive: o.emissive, emissiveIntensity: 0 } });
        return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.3, metalness: 0 }, o)); };
      /* --- curve: 세 개의 밀폐 용기 (에터 · 에탄올 · 물) --- */
      const LK3 = ['ether', 'ethanol', 'water'], JX = [-4.4, 0, 4.4], JR = 1.3, JH = 4.0, JY = -2.6, NG = 44, LIQH = 0.9;
      const jars = LK3.map((k, i) => {
        const g = new THREE.Group(); g.position.x = JX[i]; gC.add(g);
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, JH, 40, 1, true), stdM(0xcfe8ff, { transparent: true, opacity: 0.16, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false })); glass.position.y = JY + JH / 2; g.add(glass);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(JR, JR, 0.18, 40), stdM(0x64748b, { metalness: 0.4 })); base.position.y = JY - 0.09; g.add(base);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(JR + 0.05, JR + 0.05, 0.22, 40), stdM(0x94a3b8, { metalness: 0.7, roughness: 0.3 })); lid.position.y = JY + JH + 0.11; g.add(lid);
        const liqM = new THREE.Mesh(new THREE.CylinderGeometry(JR - 0.03, JR - 0.03, LIQH, 40), stdM(0xffffff, { transparent: true, opacity: 0.5, roughness: 0.15, depthWrite: false })); liqM.position.y = JY + LIQH / 2; g.add(liqM);
        const gasM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 14, 10), stdM(0xffffff, { emissive: 0x112233, emissiveIntensity: 0.3 }), NG); gasM.frustumCulled = false; gasM.instanceMatrix.setUsage(THREE.DynamicDrawUsage); g.add(gasM);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1, 20), stdM(0xffffff, { emissive: 0x222222, emissiveIntensity: 0.35 })); g.add(bar);
        const lab = label('', [JX[i], JY + JH + 0.6, 0], { color: 'rgba(30,41,59,.92)' }); lab.show(false);
        const nm = label('', [JX[i], JY - 0.7, 0], { color: 'rgba(30,41,59,.92)' }); nm.show(false);
        const P = Array.from({ length: NG }, () => ({ on: false, p: new V3(), v: new V3() }));
        return { k, g, liqM, gasM, bar, lab, nm, P, acc: 0 };
      });
      const BAR0 = JY + JH + 0.25, BARK = 2.2 / 760;     // 760 mmHg(1 atm)가 막대 높이 2.6
      const refLine = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.04, 0.04), stdM(0xe2464b, { emissive: 0xe2464b, emissiveIntensity: 0.6 })); refLine.position.set(0, BAR0 + 760 * BARK, 0); gC.add(refLine);
      const lRef = label('1 atm = 760 mmHg', [4.6, BAR0 + 760 * BARK + 0.35, 0], { color: 'rgba(226,70,75,.92)' }); lRef.show(false);
      const lCT = label('', [0, JY - 1.5, 0], { color: 'rgba(30,41,59,.92)' }); lCT.show(false);
      const Mx = new THREE.Matrix4(), Cc = new THREE.Color();
      const fmtP = (v) => (v < 100 ? v.toFixed(1) : String(Math.round(v)));
      function updCurve(w, dt, t) {
        const c = w.S.curve, Tc = c.Tc, sp = 2.0 * Math.sqrt((Tc + 273.15) / 300);
        const near = [];
        jars.forEach((J) => {
          const q = w.LIQ[J.k], on = c.show[J.k], inr = Tc >= q.Tmin && Tc <= q.tmax, Pm = inr ? q.P(Tc) : 0;
          J.g.visible = true; J.liqM.material.color.set(q.c); J.gasM.material.color.set(q.c); J.bar.material.color.set(q.c);
          J.liqM.material.opacity = on ? 0.5 : 0.12;
          const target = on && inr ? Math.max(1, Math.min(NG, Math.round(Pm * 0.06))) : 0;
          let act = 0; J.P.forEach((o) => { if (o.on) act++; });
          if (act < target) { J.acc += dt * (4 + (target - act) * 5); while (J.acc > 1) { J.acc -= 1; const o = J.P.find((x) => !x.on); if (!o) break; const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (JR - 0.3); o.on = true; o.p.set(Math.cos(a) * r, JY + LIQH + 0.1, Math.sin(a) * r); const ang = Math.random() * 6.28, el = Math.random() * 1.2 + 0.2; o.v.set(Math.cos(ang) * Math.cos(el), Math.sin(el), Math.sin(ang) * Math.cos(el)).multiplyScalar(sp * (0.6 + Math.random() * 0.8)); } }
          const top = JY + JH - 0.2, surf = JY + LIQH;
          J.P.forEach((o, i) => {
            if (!o.on) { Mx.makeScale(0.0001, 0.0001, 0.0001); J.gasM.setMatrixAt(i, Mx); return; }
            o.p.addScaledVector(o.v, dt);
            const rr = Math.hypot(o.p.x, o.p.z); if (rr > JR - 0.2) { const nx = o.p.x / rr, nz = o.p.z / rr, d = o.v.x * nx + o.v.z * nz; o.v.x -= 2 * d * nx; o.v.z -= 2 * d * nz; o.p.x = nx * (JR - 0.2); o.p.z = nz * (JR - 0.2); }
            if (o.p.y > top) { o.p.y = top; o.v.y = -Math.abs(o.v.y); }
            if (o.p.y < surf + 0.12) { if (act > target) o.on = false; else { o.p.y = surf + 0.12; o.v.y = Math.abs(o.v.y); } }
            Mx.makeTranslation(o.p.x, o.p.y, o.p.z); J.gasM.setMatrixAt(i, Mx);
          });
          J.gasM.instanceMatrix.needsUpdate = true;
          const h = on && inr ? Math.max(0.05, Math.min(4.4, Pm * BARK)) : 0.05; J.bar.visible = on && inr; J.bar.scale.set(1, h, 1); J.bar.position.y = BAR0 + h / 2;
          const boil = on && inr && Pm >= 760; J.bar.material.emissiveIntensity = boil ? 1.0 : 0.35;
          J.lab.show(true); J.lab.obj = [J.g.position.x, BAR0 + h + 0.5, 0]; J.lab.set(!on ? '(숨김)' : inr ? fmtP(Pm) + ' mmHg' + (boil ? ' ≥ 1 atm' : '') : '데이터 없음');
          J.nm.show(true); J.nm.set(q.short);
          if (on && inr) near.push(q.short + ' ' + fmtP(Pm));
        });
        lRef.show(true); lCT.show(true); lCT.set('항온 수조 ' + Tc + ' °C');
        return '<b>밀폐 용기 3개 · ' + Tc + ' °C</b><br>같은 온도에서도 증기압(막대 높이)이 달라요.<br>분자 간 힘이 약할수록 증기압이 커요: 에터 &gt; 에탄올 &gt; 물<br>증기압이 760 mmHg(빨간 선)와 같아지는 온도가 끓는점이에요.';
      }
      const ctCtl = grab(() => controls.range('온도', 0, 120, 1, 20, (v) => { const w = sim(); if (w) w.setCT(v); }, (v) => v + ' °C'));
      /* --- phase: 압력 · 온도에 따라 고체 · 액체 · 기체 --- */
      const CR = 2.0, CH = 5.0, CY = -2.5, NP = 54;
      const chamber = new THREE.Mesh(new THREE.CylinderGeometry(CR, CR, CH, 48, 1, true), stdM(0xcfe8ff, { transparent: true, opacity: 0.14, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false })); chamber.position.y = CY + CH / 2; gP.add(chamber);
      const heater = new THREE.Mesh(new THREE.CylinderGeometry(CR + 0.25, CR + 0.25, 0.2, 40), stdM(0x3a3f4b, { emissive: 0xff5a1f, emissiveIntensity: 0 })); heater.position.y = CY - 0.1; gP.add(heater);
      const piston = new THREE.Group(); piston.add(new THREE.Mesh(new THREE.CylinderGeometry(CR + 0.05, CR + 0.05, 0.28, 48), stdM(0x94a3b8, { metalness: 0.7, roughness: 0.3 }))); gP.add(piston); piston.position.y = CY + CH + 0.14;
      const pArr = []; for (let i = 0; i < 4; i++) { const a = new THREE.Group(), mm = stdM(0xffb454, { emissive: 0x663300, emissiveIntensity: 0.4 }); a.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), mm), new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 16), mm)); gP.add(a); pArr.push(a); }
      const pm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 18, 14), stdM(0xffffff, { emissive: 0x112233, emissiveIntensity: 0.25 }), NP); pm.frustumCulled = false; pm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gP.add(pm);
      const LAT = [], LIQP = [], GAS = Array.from({ length: NP }, () => ({ p: new V3((Math.random() - 0.5) * 2, CY + 1 + Math.random() * 3, (Math.random() - 0.5) * 2), v: new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize() }));
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) if (LAT.length < NP) LAT.push(new V3((i - 1.5) * 0.7, CY + 0.35 + j * 0.62, (k - 1.5) * 0.7));
      { let guard = 0; while (LIQP.length < NP && guard++ < 6000) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (CR - 0.35), v = new V3(Math.cos(a) * r, CY + 0.3 + Math.random() * 1.9, Math.sin(a) * r); if (LIQP.every((q) => q.distanceTo(v) > 0.45)) LIQP.push(v); } while (LIQP.length < NP) LIQP.push(new V3(0, CY + 1, 0)); }
      const mixW = { solid: 0, liquid: 0, gas: 1 };
      const lPh = label('', [0, CY + CH + 1.1, 0], { color: 'rgba(30,41,59,.92)' }); lPh.show(false);
      const lSt = label('', [CR + 0.9, CY + 1.2, 0], { color: 'rgba(30,41,59,.92)' }); lSt.show(false);
      const SNAME = { water: { solid: '고체 (얼음)', liquid: '액체 (물)', gas: '기체 (수증기)' }, co2: { solid: '고체 (드라이아이스)', liquid: '액체 이산화 탄소', gas: '기체 이산화 탄소' } };
      const SCOL = { solid: 0xa8c8ff, liquid: 0x38bdf8, gas: 0xffd34d };
      function updPhase(w, dt, t) {
        const ph = w.S.phase, sub = w.S.sub.phase, d = w.PH[sub], st = w.stateOf(sub, ph.T, ph.P);
        ['solid', 'liquid', 'gas'].forEach((k) => { mixW[k] += ((k === st ? 1 : 0) - mixW[k]) * Math.min(1, dt * 3); });
        const sp = 1.2 + Math.max(0, Math.min(1, (ph.T + 100) / 500)) * 3.0, jit = 0.02 + Math.max(0, Math.min(1, (ph.T + 100) / 500)) * 0.12;
        const top = CY + CH - 0.25 - 0.3 * Math.min(1, Math.log10(ph.P * 1000) / 6);
        GAS.forEach((q) => { q.p.addScaledVector(q.v, sp * dt); const rr = Math.hypot(q.p.x, q.p.z); if (rr > CR - 0.25) { const nx = q.p.x / rr, nz = q.p.z / rr, dd = q.v.x * nx + q.v.z * nz; q.v.x -= 2 * dd * nx; q.v.z -= 2 * dd * nz; q.p.x = nx * (CR - 0.25); q.p.z = nz * (CR - 0.25); } if (q.p.y > top) { q.p.y = top; q.v.y = -Math.abs(q.v.y); } if (q.p.y < CY + 0.25) { q.p.y = CY + 0.25; q.v.y = Math.abs(q.v.y); } });
        const tot = mixW.solid + mixW.liquid + mixW.gas || 1;
        for (let i = 0; i < NP; i++) {
          const a = LAT[i], b = LIQP[i], c = GAS[i].p, ws = mixW.solid / tot, wl = mixW.liquid / tot, wg = mixW.gas / tot, ph1 = i * 1.7;
          const jx = Math.sin(t * (2 + (i % 5) * 0.4) + ph1) * jit * (wg > 0.5 ? 0 : 1), jy = Math.cos(t * (2.4 + (i % 4) * 0.4) + ph1) * jit * (wg > 0.5 ? 0 : 1);
          Mx.makeTranslation(a.x * ws + b.x * wl + c.x * wg + jx, a.y * ws + b.y * wl + c.y * wg + jy, a.z * ws + b.z * wl + c.z * wg + jx * 0.7); pm.setMatrixAt(i, Mx);
        }
        pm.instanceMatrix.needsUpdate = true; pm.material.color.setHex(SCOL[st]);
        heater.material.emissiveIntensity = Math.max(0, Math.min(1, (ph.T + 60) / 300)) * 0.9;
        const L = 0.5 + 0.5 * Math.max(0, Math.min(3, Math.log10(ph.P) + 3)) ;
        pArr.forEach((a, i) => { const ang = (i / 4) * 6.28 + 0.78; a.position.set(Math.cos(ang) * 1.2, CY + CH + 0.35 + L / 2 + 0.4, Math.sin(ang) * 1.2); a.children[0].scale.set(1, L, 1); a.children[1].position.y = -L / 2 - 0.18; a.children[1].rotation.x = Math.PI; });
        piston.position.y = CY + CH + 0.14;
        const Pt = ph.P >= 10 ? ph.P.toFixed(0) : ph.P >= 1 ? ph.P.toFixed(1) : ph.P.toFixed(3);
        lPh.set('압력 ' + Pt + ' atm · 온도 ' + Math.round(ph.T) + ' °C'); lSt.set(SNAME[sub][st]);
        const extra = ph.T > d.cp.T ? '<br>임계 온도(' + d.cp.T + ' °C)보다 높으면 압력을 높여도 액체가 되지 않아요.' : '';
        return '<b>' + d.nm + ' · 밀폐 용기</b><br>지금 상태: <b>' + SNAME[sub][st] + '</b><br>압력 ' + Pt + ' atm · 온도 ' + Math.round(ph.T) + ' °C' + extra + '<br>상평형 그림에서 점의 위치(압력 · 온도)가 상태를 정해요.';
      }
      const phSub = grab(() => controls.segment('물질', [{ value: 'water', label: '물' }, { value: 'co2', label: '이산화 탄소' }], 'water', (v) => { const w = sim(); if (w) w.phSub(v); }));
      const phT = grab(() => controls.range('온도', -100, 400, 1, -50, (v) => { const w = sim(); if (w) w.setPhase(v, w.S.phase.P); }, (v) => v + ' °C'));
      const phP = grab(() => controls.range('압력', -3, 3, 0.05, 0, (v) => { const w = sim(); if (w) w.setPhase(w.S.phase.T, Math.pow(10, v)); }, (v) => Math.pow(10, v).toFixed(v < 0 ? 3 : 1) + ' atm'));
      let scNow = '';
      const show = (g, on) => g.els.forEach((e) => { e.style.display = on ? '' : 'none'; });
      function applyScene(md) {
        if (md === scNow) return; scNow = md; txt = '';
        gMain.visible = md === 'vap' || md === 'press'; gC.visible = md === 'curve'; gP.visible = md === 'phase';
        oldEls.forEach((e) => { e.style.display = md === 'vap' || md === 'press' ? '' : 'none'; });
        show(ctCtl, md === 'curve'); show(phSub, md === 'phase'); show(phT, md === 'phase'); show(phP, md === 'phase');
        if (md !== 'curve') { jars.forEach((J) => { J.lab.show(false); J.nm.show(false); }); lRef.show(false); lCT.show(false); }
        if (md !== 'phase') { lPh.show(false); lSt.show(false); }
        if (md === 'phase') { lPh.show(true); lSt.show(true); }
        const o = ctx.orbit;
        if (md === 'curve') { o.dist = PHONE ? 22 : 19; o.tx = 0; o.ty = PHONE ? 1.6 : 0.2; o.theta = 0.15; o.phi = 1.4; }
        else if (md === 'phase') { o.dist = PHONE ? 20 : 15; o.tx = 0; o.ty = 0.6; o.theta = 0.4; o.phi = 1.3; }
        else { o.dist = PHONE ? 16 : 13; o.tx = 0; o.ty = PHONE ? 0.4 : 0.9; }
        if (md === 'vap' || md === 'press') { tl.show(true); pl.show(true); } else { tl.show(false); pl.show(false); }
      }

      /* 1단계: 2D의 ↑ 증발 · ↓ 응축 막대와 📝 증기압 기록 칸 · 3단계: 온도계를 3D 화면에도 보여 줘요 */
      const panR = v3pan('tr');
      function drawPan(o, press, other) {
        const w = sim(); if (!w || other) { panR.put(''); return; }
        if (press) {
          const k = Math.max(0, Math.min(1, o.T / 130));
          panR.put('<div class="h">🌡️ 온도계</div><div style="display:flex;align-items:flex-end;gap:7px"><span style="display:inline-block;width:9px;height:54px;border-radius:5px;background:rgba(255,255,255,.18);position:relative;overflow:hidden"><span style="position:absolute;left:0;right:0;bottom:0;height:' + Math.round(k * 100) + '%;background:#ef4444"></span></span><span style="font-size:15px;font-weight:900">' + o.T.toFixed(1) + ' °C</span></div><div>' + (o.boil ? '<span class="hi">끓는 중 · 온도가 더 오르지 않아요</span>' : '아직 끓지 않아요') + '</div>');
          return;
        }
        const v = w.S.vap, now = w.S.t, rate = (a) => (a || []).filter((t0) => now - t0 < 3).length / 3, re = rate(v.evT), rc = rate(v.coT);
        const bar = (lab, r, c) => '<tr><th>' + lab + '</th><td style="text-align:left"><span style="display:inline-block;height:9px;border-radius:5px;vertical-align:middle;background:' + c + ';width:' + Math.round(70 * Math.min(1, r / 12)) + 'px"></span></td><td>' + r.toFixed(1) + ' 개/초</td></tr>';
        const rec = [20, 40, 60].map((tt) => '<span class="chip' + (v.rec[tt] ? ' sel' : '') + '">' + tt + ' °C ' + (v.rec[tt] ? (v.rec[tt] >= 100 ? Math.round(v.rec[tt]) : v.rec[tt].toFixed(1)) + ' mmHg' : '—') + '</span>').join('');
        panR.put('<table>' + bar('↑ 증발', re, '#f59e0b') + bar('↓ 응축', rc, '#3867f4') + '</table><div style="margin:3px 0">' + (v.eq ? '<span class="ok">⚖️ 동적 평형 · 압력 일정</span>' : '아직 평형이 아니에요') + '</div><div class="h">📝 증기압 기록</div>' + rec);
      }
      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          let o = read(); const sg = readSig(o);
          applyScene(o.mode);
          if (o.mode === 'curve' || o.mode === 'phase') {
            const w = sim(); let html;
            if (o.mode === 'curve') { html = updCurve(w, dt, t); ctCtl.r.set(w.S.curve.Tc); }
            else { html = updPhase(w, dt, t); phSub.r.set(w.S.sub.phase); phT.r.set(Math.round(w.S.phase.T)); phP.r.set(Math.log10(w.S.phase.P)); }
            if (html !== txt) { txt = html; info(html); }
            return;
          }
          if (sg !== sig) { sig = sg; if (demo != null) { pl0.pause(); demo = null; } }   // 2D에서 값을 바꾸면 2D 값으로 돌아와요
          if (demo != null) o = applyDemo(o);
          const press = o.mode === 'press', other = o.mode !== 'vap' && !press;
          const surf = layout(o);
          const Tk = o.T + 273.15, sp = 2.1 * Math.sqrt(Tk / 300);
          // 기체 분자 수: 밀폐 용기는 증기압(mmHg)에 비례, 열린 용기는 (증기압 / 외부 압력)에 비례
          const target = Math.min(MAXG, Math.round(press ? Math.min(1.2, o.Pv / o.Pext) * 30 : o.Pv * 0.17));
          let act = 0; GP.forEach((q) => { if (q.on) act++; });
          if (act < target) {
            acc += dt * (4 + (target - act) * 5);
            while (acc > 1) { acc -= 1; const q = GP.find((x) => !x.on); if (!q) break; const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (R - 0.4); q.on = true; q.p.set(Math.cos(a) * r, surf + 0.1, Math.sin(a) * r); q.v.set(Math.random() - 0.5, 0.6 + Math.random(), Math.random() - 0.5).normalize().multiplyScalar(sp * (0.7 + Math.random() * 0.6)); }
          }
          const top = FLOOR + HJ - 0.2;
          GP.forEach((q, i) => {
            if (!q.on) { M.makeScale(0.0001, 0.0001, 0.0001); gm.setMatrixAt(i, M); return; }
            q.p.addScaledVector(q.v, dt);
            const rr = Math.hypot(q.p.x, q.p.z);
            if (rr > R - 0.2) { const nx = q.p.x / rr, nz = q.p.z / rr, d = q.v.x * nx + q.v.z * nz; q.v.x -= 2 * d * nx; q.v.z -= 2 * d * nz; q.p.x = nx * (R - 0.2); q.p.z = nz * (R - 0.2); }
            if (q.p.y > top) { q.p.y = top; q.v.y = -Math.abs(q.v.y); }
            if (q.p.y < surf + 0.15) { if (act > target || Math.random() < 0.35) q.on = false; else { q.p.y = surf + 0.15; q.v.y = Math.abs(q.v.y); } }
            M.makeTranslation(q.p.x, q.p.y, q.p.z); gm.setMatrixAt(i, M);
          });
          gm.instanceMatrix.needsUpdate = true;
          const jit = 0.04 + Math.max(0, o.T) / 110 * 0.1;
          LP.forEach((q, i) => {
            const y = FLOOR + 0.3 + q.y * Math.max(0.2, liqH - 0.55);
            M.makeTranslation(Math.cos(q.a) * q.r + Math.sin(t * 3 + q.ph) * jit * 2, y + Math.cos(t * 3.4 + q.ph * 1.3) * jit * 2, Math.sin(q.a) * q.r + Math.sin(t * 2.7 + q.ph * 0.7) * jit * 2); lm.setMatrixAt(i, M);
          });
          lm.instanceMatrix.needsUpdate = true;
          const boil = press && o.boil;
          bubbles.forEach((b) => {
            b.m.visible = boil;
            if (boil) { b.t += dt * 1.1; if (b.t > 1) { b.t = 0; const a = Math.random() * 6.28, r = Math.random() * (R - 0.6); b.x = Math.cos(a) * r; b.z = Math.sin(a) * r; } b.m.scale.setScalar(0.7 + b.t * 1.6); b.m.position.set(b.x, FLOOR + 0.3 + b.t * (liqH - 0.2), b.z); }
          });
          const f1 = (v) => v.toFixed(1), fp = (v) => (v >= 100 ? String(Math.round(v)) : v.toFixed(1));
          let s;
          if (press) {
            s = '<b>외부 압력 ' + o.P.toFixed(2) + ' atm</b> (' + Math.round(o.Pext) + ' mmHg)<br>물의 끓는점 <b>' + f1(o.Tb) + ' °C</b> · 물의 온도 ' + f1(o.T) + ' °C<br>' + (boil ? '증기 압력 = 외부 압력이 되어 액체 속에서도 기포가 생겨요. 끓음!' : '증기 압력(' + fp(o.Pv) + ' mmHg)이 외부 압력보다 작아서 아직 끓지 않아요.');
            pl.set('증기 ' + fp(o.Pv) + ' mmHg'); tl.set(boil ? '끓는 중' : '물');
          } else if (other) {
            s = '<b>물</b><br>증기압이 외부 압력과 같아지는 온도가 끓는점이에요.';
            pl.set(''); tl.set('물');
          } else {
            s = '<b>물</b> · 항온 수조 ' + Math.round(o.T) + ' °C<br>증기압 <b>' + fp(o.Pv) + ' mmHg</b> (' + (o.Pv / ATM).toFixed(3) + ' atm)<br>' + (o.eq ? '↑ 증발 속도 = ↓ 응축 속도: 동적 평형이라 기체의 압력이 일정해요.' : '증발이 응축보다 빨라 증기가 차오르는 중이에요.');
            pl.set('증기 ' + fp(o.Pv) + ' mmHg'); tl.set('물');
          }
          pl.obj = press ? [0, FLOOR + HJ + 2.1, 0] : [0, FLOOR + HJ + 0.9, 0];
          tl.obj = [R, surf + 0.9, 0];
          if (s !== txt) { txt = s; info(s); }
          drawPan(o, press, other);
        },
        sync() { txt = ''; },
      };
    },
  });
})();
