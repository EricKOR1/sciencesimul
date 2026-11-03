/* hx-vapor-boiling · 3D 증기압과 끓음
   1단계 '증기압: 밀폐 용기 속 평형' — 뚜껑을 닫은 용기의 물에서 증발(↑)과 응축(↓)이 같아지는 동적 평형.
     2D의 항온 수조 온도(20 · 40 · 60 °C)와 '액체 더 넣기'를 그대로 따라가요.
   3단계 '압력과 끓는점' — 외부 압력(0.30 ~ 2.00 atm)과 가열 정도에 따라 물이 끓는 모습.
     증기 압력(물의 증기압 곡선)이 외부 압력과 같아지면 끓어요.
   2·4단계(증기압 곡선 · 상평형 그림)는 그래프를 읽는 단계라서 2D 화면에서 해요.
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
    camera: { dist: PHONE ? 16 : 13, theta: 0.5, phi: 1.2, min: 6, max: 26, target: [0, 0.4, 0] },
    autoRotate: 0.12,
    levels: [0, 2],   // 1단계(증기압), 3단계(압력과 끓는점). 2·4단계는 그래프를 읽어요
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const sim = () => window.__sim || null;
      const Pw = (T) => { try { return sim().LIQ.water.P(T); } catch (e) { return FALLBACK(T); } };
      const Tbw = (pmm) => { try { return sim().Tbw(pmm); } catch (e) { let lo = 0, hi = 125; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (Pw(m) < pmm) lo = m; else hi = m; } return (lo + hi) / 2; } };

      const jar = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HJ, 56, 1, true), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.16, roughness: 0.08, side: THREE.DoubleSide, depthWrite: false }));
      jar.position.y = FLOOR + HJ / 2; root.add(jar);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.2, 56), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.4 }));
      bot.position.y = FLOOR - 0.1; root.add(bot);
      const lid = new THREE.Group(); root.add(lid);                       // 뚜껑 / 피스톤
      lid.add(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.08, R + 0.08, 0.28, 56), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3, metalness: 0.7 })));
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshStandardMaterial({ color: 0xef6a5b, roughness: 0.4 })); knob.position.y = 0.36; lid.add(knob);
      const liqMat = new THREE.MeshStandardMaterial({ color: WATER, transparent: true, opacity: 0.42, roughness: 0.15, depthWrite: false });
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 1, 56), liqMat); root.add(liq);
      // 외부 압력 화살표 (뚜껑을 누르는 힘)
      const amat = new THREE.MeshStandardMaterial({ color: 0xffb454, roughness: 0.4, emissive: 0x663300, emissiveIntensity: 0.4 });
      const arrows = [];
      for (let i = 0; i < 4; i++) {
        const a = new THREE.Group(); a.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), amat), new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 16), amat));
        root.add(a); arrows.push(a);
      }
      // 열원 (끓음 단계)
      const burner = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.16, 40), new THREE.MeshStandardMaterial({ color: 0x3a3f4b, roughness: 0.5, emissive: 0xff5a1f, emissiveIntensity: 0 }));
      burner.position.y = FLOOR - 0.28; root.add(burner);

      const sm = new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.3, metalness: 0.05, emissive: 0x112233, emissiveIntensity: 0.3 });
      const lm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 16, 12), sm, NL); lm.frustumCulled = false; lm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(lm);
      const gm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 18, 14), sm, MAXG); gm.frustumCulled = false; gm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(gm);
      const LP = Array.from({ length: NL }, () => { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * (R - 0.35); return { a, r, y: Math.random(), ph: Math.random() * 6.28 }; });
      const GP = Array.from({ length: MAXG }, () => ({ on: false, p: new V3(), v: new V3() }));
      const bubbles = Array.from({ length: 14 }, () => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false })); b.visible = false; root.add(b); return { m: b, t: Math.random(), x: 0, z: 0 }; });
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
        burner.visible = press;
        arrows.forEach((a, i) => {
          a.visible = press;
          if (!press) return;
          const ang = (i / 4) * Math.PI * 2 + 0.78, L = 0.4 + 0.55 * Math.min(2.2, o.P);
          a.position.set(Math.cos(ang) * 1.2, FLOOR + HJ + 0.3 + L / 2 + 0.5, Math.sin(ang) * 1.2);
          a.children[0].scale.set(1, L, 1); a.children[1].position.y = -L / 2 - 0.18; a.children[1].rotation.x = Math.PI;
        });
        return FLOOR + liqH;
      }

      return {
        update(dt, t) {
          dt = Math.min(dt, 0.05);
          let o = read(); const sg = readSig(o);
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
            s = '<b>이 단계는 2D 화면에서 해요</b><br>그래프(증기압 곡선 · 상평형 그림)를 읽어 끓는점과 상태를 찾아요.';
            pl.set(''); tl.set('물');
          } else {
            s = '<b>물</b> · 항온 수조 ' + Math.round(o.T) + ' °C<br>증기압 <b>' + fp(o.Pv) + ' mmHg</b> (' + (o.Pv / ATM).toFixed(3) + ' atm)<br>' + (o.eq ? '↑ 증발 속도 = ↓ 응축 속도: 동적 평형이라 기체의 압력이 일정해요.' : '증발이 응축보다 빨라 증기가 차오르는 중이에요.');
            pl.set('증기 ' + fp(o.Pv) + ' mmHg'); tl.set('물');
          }
          pl.obj = press ? [0, FLOOR + HJ + 2.1, 0] : [0, FLOOR + HJ + 0.9, 0];
          tl.obj = [R, surf + 0.9, 0];
          if (s !== txt) { txt = s; info(s); }
        },
        sync() { txt = ''; },
      };
    },
  });
})();
