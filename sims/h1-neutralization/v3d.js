/* h1-neutralization · 3D 중화 반응의 이온 모형
   염산(HCl) 20 mL(1.0 M)에 같은 진하기의 NaOH 수용액을 넣어요. 8쌍의 HCl 이온을 NaOH 2.5 mL씩 8번(=20 mL)으로 나타낸 모형이에요.
   H⁺ + OH⁻ → H₂O 가 일어나 H⁺이 줄고, Cl⁻과 Na⁺은 그대로 있어요(구경꾼 이온). 완전히 중화되는 때는 20 mL예요.
   BTB: 산성 노랑 · 중성 초록 · 염기성 파랑 / 페놀프탈레인: 산성·중성 무색 · 염기성 붉은색. 입자 수와 크기는 실제와 달라요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const COL = { H: 0xe2464b, Cl: 0x14a058, Na: 0xf59e0b, OH: 0x3867f4, O: 0x5aa8ff };
  const NH = 8, MAXK = 16;       // 처음 HCl 8쌍 · NaOH를 최대 16쌍(40 mL)까지

  window.SciSim3D.attach({
    title: '3D 중화 반응 (이온 모형)',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 17 : 11.5, theta: 0.5, phi: 1.2, target: [0, 1.5, 0], min: 6, max: 26 },
    autoRotate: 0,
    levels: [0, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.35, metalness: 0.05 }, o || {}));
      const st = { k: 0, ind: 'btb', names: true, t: 0, queue: 0, qT: 0 };

      /* ---------- 비커 ---------- */
      const WR = 2.55, WH = 3.2;
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.25, 56), mat(0x2d3547, { roughness: 0.95, metalness: 0 })); floor.position.y = -0.15; floor.receiveShadow = true; root.add(floor);
      const beaker = new THREE.Mesh(new THREE.CylinderGeometry(WR + 0.12, WR + 0.12, WH + 0.9, 56, 1, true), new THREE.MeshStandardMaterial({ color: 0xd6e6ff, transparent: true, opacity: 0.2, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })); beaker.position.y = (WH + 0.9) / 2; root.add(beaker);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(WR + 0.12, 0.05, 10, 56), mat(0xe3eeff, { transparent: true, opacity: 0.6 })); rim.rotation.x = Math.PI / 2; rim.position.y = WH + 0.9; root.add(rim);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(WR + 0.12, WR + 0.12, 0.12, 56), mat(0xcfe0f7, { transparent: true, opacity: 0.45 })); bot.position.y = 0.04; root.add(bot);
      const waterM = new THREE.MeshStandardMaterial({ color: 0xffe14d, transparent: true, opacity: 0.4, roughness: 0.1, depthWrite: false });
      const water = new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, WH, 56), waterM); water.position.y = WH / 2 + 0.1; root.add(water);
      // 뷰렛 (위에서 NaOH 방울)
      const bur = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xd6e6ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); bur.position.set(0, WH + 2.6, 0); root.add(bur);
      const burL = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.6, 16), new THREE.MeshStandardMaterial({ color: 0x9fc3ff, transparent: true, opacity: 0.6, depthWrite: false })); burL.position.set(0, WH + 2.6, 0); root.add(burL);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), mat(0xaab4c6, { metalness: 0.5 })); tip.rotation.x = Math.PI; tip.position.set(0, WH + 1.15, 0); root.add(tip);
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), new THREE.MeshStandardMaterial({ color: 0x6aa6ff, transparent: true, opacity: 0.85 })); drop.visible = false; root.add(drop);
      label('뷰렛 (NaOH 수용액)', bur, { size: 12, offset: [0, 1.6, 0] });
      const thermo = label('', [WR + 0.3, WH * 0.6, 0], { size: 12.5, color: 'rgba(30,30,60,.85)' });

      /* ---------- 입자 ---------- */
      const sprTex = {};
      function signTex(ch, col) { const k = ch + col; if (sprTex[k]) return sprTex[k]; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.font = '800 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 6; g.fillText(ch, 32, 36); return (sprTex[k] = new THREE.CanvasTexture(c)); }
      const sg = new THREE.Group(); root.add(sg);
      const sphere = (r, c, o) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 26, 18), mat(c, o)); m.castShadow = true; return m; };
      function mk(kind) {
        const g = new THREE.Group();
        if (kind === 'H') g.add(sphere(0.3, COL.H)); else if (kind === 'Cl') g.add(sphere(0.52, COL.Cl)); else if (kind === 'Na') g.add(sphere(0.46, COL.Na));
        else if (kind === 'OH') { g.add(sphere(0.42, COL.OH)); const h = sphere(0.2, 0xf4f6fb); h.position.set(0.38, 0.18, 0); g.add(h); }
        else { g.add(sphere(0.4, COL.O, { roughness: 0.3 })); [[-0.4, -0.25], [0.4, -0.25]].forEach((q) => { const h = sphere(0.2, 0xf4f6fb); h.position.set(q[0], q[1], 0); g.add(h); }); }
        if (kind !== 'W') { const plus = kind === 'H' || kind === 'Na'; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex(plus ? '+' : '−', plus ? '#900' : '#003'), transparent: true, depthTest: false })); sp.scale.set(0.75, 0.75, 1); sp.renderOrder = 5; g.add(sp); }
        sg.add(g); return g;
      }
      let seed = 9; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const rpos = () => { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (WR - 0.75); return new V3(Math.cos(a) * r, 0.6 + rnd() * (WH - 1.2), Math.sin(a) * r); };
      // 입자 목록: { kind, g, home, ph, state }
      let P = [], rx = [];
      function spawn(kind, pos) { const g = mk(kind); const p = { kind, g, home: pos || rpos(), ph: rnd() * 6.28, v: new V3(), done: false }; g.position.copy(p.home); P.push(p); return p; }
      function rebuild(k) {
        P.forEach((p) => sg.remove(p.g)); P = []; rx = [];
        const nOH = Math.max(0, k - NH), nH = Math.max(0, NH - k), nW = Math.min(k, NH);
        for (let i = 0; i < NH; i++) spawn('Cl'); for (let i = 0; i < nH; i++) spawn('H'); for (let i = 0; i < k; i++) spawn('Na'); for (let i = 0; i < nOH; i++) spawn('OH'); for (let i = 0; i < nW; i++) spawn('W');
        st.shown = k; refreshLabels();
      }
      // NaOH 한 쌍을 더 넣기 (애니메이션)
      function addOne() {
        const k0 = st.shown, na = spawn('Na', rpos()), oh = spawn('OH', rpos());
        const top = new V3((rnd() - 0.5) * 0.6, WH + 0.6, (rnd() - 0.5) * 0.6);
        na.g.position.copy(top); oh.g.position.copy(top).add(new V3(0.3, 0, 0));
        na.g.userData.fall = oh.g.userData.fall = 1;
        // 남은 H⁺가 있으면 가장 가까운 것과 반응
        const hs = P.filter((p) => p.kind === 'H' && !p.busy);
        if (hs.length) { const h = hs[0]; h.busy = oh.busy = true; rx.push({ h, oh, t: 0, ph: 0 }); }
        st.shown = k0 + 1; refreshLabels();
      }
      let lastLabKind = '';
      const nm = [label('', [0, 0, 0], { size: 12 }), label('', [0, 0, 0], { size: 12 }), label('', [0, 0, 0], { size: 12 }), label('', [0, 0, 0], { size: 12 })];
      function refreshLabels() {
        const f = (kind) => P.find((p) => p.kind === kind && !p.busy);
        const defs = [['H', 'H⁺'], ['OH', 'OH⁻'], ['Cl', 'Cl⁻'], ['Na', 'Na⁺'], ['W', 'H₂O']];
        const shown = defs.map((d) => [f(d[0]), d[1]]).filter((d) => d[0]);
        nm.forEach((l, i) => { const d = shown[i]; if (d && st.names) { l.obj = d[0].g; l.set(d[1]); l.show(true); l.off = [0, 0.75, 0]; } else l.show(false); });
      }

      /* ---------- 화면 ---------- */
      function tint() {
        const k = st.k, d = k - NH; let c;
        if (st.ind === 'btb') c = d < -0.05 ? 0xffd93b : d > 0.05 ? 0x2f6fe0 : 0x4cc468; else c = d > 0.05 ? 0xff4f9a : 0xdff0ff;
        waterM.color.setHex(c); waterM.opacity = st.ind === 'btb' ? 0.45 : (d > 0.05 ? 0.5 : 0.25);
        const state = d < -0.05 ? '산성' : d > 0.05 ? '염기성' : '중성';
        const mL = Math.round(k * 2.5 * 10) / 10;
        thermo.set('NaOH ' + mL + ' mL · ' + state);
        if (d < -0.05) info('<b>H⁺이 남아 있어서 산성</b>이에요.<br>NaOH를 넣으면 OH⁻이 H⁺과 만나 <b>물(H₂O)</b>이 돼요.');
        else if (d > 0.05) info('H⁺이 모두 없어지고 <b>OH⁻이 남아 염기성</b>이에요.<br>넣은 NaOH가 더 이상 반응할 H⁺이 없어요.');
        else info('<b>H⁺ + OH⁻ → H₂O</b> : H⁺과 OH⁻이 모두 반응해 <b>중성</b>이에요.<br>Cl⁻과 Na⁺은 반응하지 않고 그대로 있어요.');
      }
      st.shown = 0;
      const rng = controls.range('넣은 NaOH', 0, MAXK, 1, 0, (v) => { goto(v); }, (v) => (v * 2.5) + ' mL' + (v === NH ? ' (완전 중화)' : ''));
      function goto(v) { if (v > st.k) { st.queue += v - st.k; } else { st.queue = 0; rebuild(v); } st.k = v; tint(); }
      controls.button('+ 한 방울 (2.5 mL)', () => { if (st.k >= MAXK) return; st.k++; st.queue++; rng.set(st.k); tint(); });
      controls.button('↺ 처음부터', () => { st.k = 0; st.queue = 0; rx = []; rng.set(0); rebuild(0); tint(); });
      controls.segment('지시약', [{ value: 'btb', label: 'BTB' }, { value: 'pp', label: '페놀프탈레인' }], 'btb', (v) => { st.ind = v; tint(); });
      controls.button('🏷 이름', () => { st.names = !st.names; refreshLabels(); });
      rebuild(0); tint();

      const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      const flashes = [];
      function flash(pos) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })); m.position.copy(pos); sg.add(m); flashes.push({ m, t: 0 }); }
      return {
        update(dt, t) {
          st.t += dt;
          // 대기열: 0.9초마다 한 쌍씩 넣어요
          if (st.queue > 0) { st.qT += dt; if (st.qT > 0.9) { st.qT = 0; st.queue--; addOne(); drop.visible = false; } drop.visible = true; drop.position.set(0, WH + 1.05 - ((st.qT / 0.9) % 1) * 0.5, 0); } else drop.visible = false;
          burL.scale.y = Math.max(0.1, 1 - st.k / MAXK * 0.8); burL.position.y = WH + 1.8 + (burL.scale.y * 1.6) / 2;
          // 반응: OH⁻이 H⁺ 쪽으로 가서 물이 돼요
          for (let i = rx.length - 1; i >= 0; i--) {
            const r = rx[i]; r.t += dt;
            const wait = 0.6, u = ease((r.t - wait) / 1.1);
            if (r.t > wait) { const target = r.h.g.position; r.oh.g.position.lerp(target, Math.min(1, dt * (2 + u * 5))); }
            if (r.t > wait && r.oh.g.position.distanceTo(r.h.g.position) < 0.55) {
              flash(r.h.g.position); const pos = r.h.g.position.clone();
              [r.h, r.oh].forEach((p) => { sg.remove(p.g); P.splice(P.indexOf(p), 1); });
              const w = spawn('W', pos); w.g.scale.setScalar(0.1); w.grow = 0; rx.splice(i, 1); refreshLabels();
            }
          }
          for (let i = flashes.length - 1; i >= 0; i--) { const f = flashes[i]; f.t += dt; f.m.scale.setScalar(1 + f.t * 4); f.m.material.opacity = Math.max(0, 0.9 - f.t * 1.8); if (f.t > 0.5) { sg.remove(f.m); flashes.splice(i, 1); } }
          P.forEach((p) => {
            if (p.grow != null) { p.grow = Math.min(1, p.grow + dt * 2.5); p.g.scale.setScalar(p.grow); if (p.grow >= 1) p.grow = null; }
            if (p.busy && p.kind === 'OH' && p.g.userData.fall) { /* 반응 중에는 위치를 직접 움직여요 */ }
            else {
              const w = new V3(Math.sin(t * 0.7 + p.ph) * 0.25, Math.sin(t * 0.9 + p.ph * 1.7) * 0.2, Math.cos(t * 0.6 + p.ph * 1.3) * 0.25);
              const tgt = p.home.clone().add(w);
              if (p.g.userData.fall) { p.g.position.lerp(tgt, Math.min(1, dt * 2.2)); if (p.g.position.distanceTo(tgt) < 0.25) p.g.userData.fall = 0; }
              else if (p.kind === 'H' && p.busy) { /* 그대로 */ }
              else p.g.position.copy(tgt);
            }
            if (p.kind === 'W') p.g.rotation.y = t * 0.6 + p.ph;
          });
          // 반응 중인 H⁺도 물결따라 움직이게
          rx.forEach((r) => { const w = new V3(Math.sin(t * 0.7 + r.h.ph) * 0.25, Math.sin(t * 0.9 + r.h.ph * 1.7) * 0.2, Math.cos(t * 0.6 + r.h.ph * 1.3) * 0.25); r.h.g.position.copy(r.h.home).add(w); });
        },
        sync() {},
      };
    },
  });
})();
