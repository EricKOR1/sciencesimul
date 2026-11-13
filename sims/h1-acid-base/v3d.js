/* h1-acid-base · 3D 산과 염기의 이온 모형
   산(HCl)은 물에 녹아 수소 이온(H⁺)과 염화 이온(Cl⁻)으로, 염기(NaOH)는 나트륨 이온(Na⁺)과 수산화 이온(OH⁻)으로 나뉘어요 (이온화).
   이온이 있으면 전류가 흘러 전구가 켜져요. 설탕은 분자 그대로 녹아 이온이 없어서 전구가 꺼져 있어요.
   2D의 이온 모형(물질 카드 5장)과 같아요: HCl · NaOH · 설탕 · 메테인(CH₄, 물에 거의 녹지 않아요) · 메탄올(CH₃OH, 분자 그대로 녹아요).
   2D에서 카드를 물에 넣으면 3D도 같은 물질로 바뀌어 녹기 시작하고, 3D의 물질 단추를 눌러도 2D에서 같은 카드를 녹여요.
   입자 크기와 수는 실제와 달라요 (물 분자는 그리지 않았어요). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const COL = { H: 0xd42a30, Cl: 0x0c8a48, Na: 0xe88a00, OH: 0x2452e0 };

  window.SciSim3D.attach({
    title: '3D 산과 염기 (이온 모형)',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 15 : 10, theta: 0.5, phi: 1.2, target: [0, 1.6, 0], min: 6, max: 26 },
    autoRotate: 0,
    levels: [2],
    build(ctx) {
      const { THREE, root, label, info, controls, mats } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => mats.plastic(c, { roughness: 0.3, extra: o || {} });   // 입자 모형: 매끈한 플라스틱 공
      const st = { sub: 'hcl', s: 0, names: true, t: 0 };
      const SUBS = [
        { id: 'hcl', f: 'HCl', name: '염화 수소', n: 6, res: 'H⁺ + Cl⁻' }, { id: 'naoh', f: 'NaOH', name: '수산화 나트륨', n: 6, res: 'Na⁺ + OH⁻' },
        { id: 'suc', f: 'C₁₂H₂₂O₁₁', name: '설탕', n: 4 }, { id: 'ch4', f: 'CH₄', name: '메테인', n: 6 }, { id: 'meoh', f: 'CH₃OH', name: '메탄올', n: 6 },
      ];
      const subOf = (id) => SUBS.find((q) => q.id === id) || SUBS[0];
      const L2 = () => (ctx.lesson && ctx.lesson()) || null;

      /* ---------- 비커 · 전극 · 전구 ---------- */
      const WR = 2.55, WH = 3.2;
      // 실험대 (짙은 실험대 상판 + 둥근 모서리)
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.25, 72), mats.ceramic(0x1d2433, { extra: { roughness: 0.42, clearcoat: 0.5 } })); floor.position.y = -0.15; floor.receiveShadow = true; root.add(floor);
      { const edge = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.125, 12, 96), mats.metal('aluminium', { brushed: true })); edge.rotation.x = Math.PI / 2; edge.position.y = -0.15; edge.userData.v3bg = true; root.add(edge); }
      // 비커: 두께가 있는 유리벽 · 둥근 바닥 모서리 · 바깥으로 말린 입구 · 눈금
      const BR = WR + 0.12, BH = WH + 0.9;
      const bprof = [[0, 0.02], [BR - 0.22, 0.02], [BR - 0.06, 0.07], [BR, 0.22], [BR, BH - 0.1], [BR + 0.09, BH], [BR + 0.05, BH + 0.03], [BR - 0.05, BH - 0.08], [BR - 0.05, 0.24], [BR - 0.24, 0.13], [0, 0.13]].map((q) => new THREE.Vector2(q[0], q[1]));
      const beaker = new THREE.Mesh(new THREE.LatheGeometry(bprof, 72), mats.glass({ opacity: 0.2 })); beaker.renderOrder = 3; root.add(beaker);
      { const tk = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });   // 눈금
        for (let i = 0; i < 9; i++) { const big = i % 2 === 0, w = big ? 0.5 : 0.28, a0 = 0.15; const t = new THREE.Mesh(new THREE.CylinderGeometry(BR + 0.012, BR + 0.012, 0.022, 12, 1, true, a0, w / BR), tk); t.position.y = 0.5 + i * 0.38; t.renderOrder = 4; root.add(t); } }
      const water = new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, WH, 56), mats.liquid(0x78b8f2, { opacity: 0.2, extra: { roughness: 0.12 } })); water.position.y = WH / 2 + 0.14; water.renderOrder = 1; root.add(water);
      { const top = new THREE.Mesh(new THREE.CircleGeometry(WR, 64), mats.liquid(0x9bd0ff, { opacity: 0.34, extra: { side: THREE.DoubleSide } })); top.rotation.x = -Math.PI / 2; top.position.y = WH + 0.145; top.renderOrder = 2; root.add(top);   // 수면
        const men = new THREE.Mesh(new THREE.TorusGeometry(WR - 0.02, 0.035, 8, 72), mats.liquid(0xc6e4ff, { opacity: 0.5 })); men.rotation.x = Math.PI / 2; men.position.y = WH + 0.15; men.renderOrder = 2; root.add(men); }
      // 전극 두 개 (왼쪽 −극, 오른쪽 +극): 금속판 + 집게, 가로 받침대
      const bar = new THREE.Mesh(new THREE.BoxGeometry(BR * 2 + 0.5, 0.14, 0.34), mats.plastic(0x30384a)); bar.position.set(0, BH + 0.1, 0); bar.castShadow = true; root.add(bar);
      const electrodes = [-1, 1].map((sg) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.1, WH + 0.4, 1.3), mats.metal(sg < 0 ? 0x4a5160 : 'steel', { brushed: true, roughness: sg < 0 ? 0.42 : 0.3 })); e.position.set(sg * (WR - 0.45), (WH + 0.4) / 2 + 0.45, 0); e.castShadow = true; root.add(e);
        const clip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), mats.plastic(sg < 0 ? 0x1f2430 : 0xb3262b)); clip.position.set(sg * (WR - 0.45), BH + 0.26, 0); root.add(clip);
        const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16), mats.metal('brass')); screw.position.set(sg * (WR - 0.45), BH + 0.46, 0); root.add(screw); return e; });
      // 전구와 전선
      const bulbG = new THREE.Group(); bulbG.position.set(0, WH + 2.5, 0); root.add(bulbG);
      const bulbM = new THREE.MeshStandardMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.55, emissive: 0xffd45a, emissiveIntensity: 0, roughness: 0.1, depthWrite: false });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 28), bulbM); bulbG.add(bulb);
      { const shell = new THREE.Mesh(new THREE.SphereGeometry(0.64, 40, 28), mats.glass({ opacity: 0.16 })); shell.renderOrder = 4; bulbG.add(shell); const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.3, 24, 1, true), mats.glass({ opacity: 0.22 })); neck.position.y = -0.5; bulbG.add(neck); }
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.42, 24), mats.metal('brass')); base.position.y = -0.74; base.castShadow = true; bulbG.add(base);
      for (let i = 0; i < 4; i++) { const th = new THREE.Mesh(new THREE.TorusGeometry(0.295 - i * 0.008, 0.022, 8, 28), mats.metal('brass')); th.rotation.x = Math.PI / 2; th.position.y = -0.6 - i * 0.095; bulbG.add(th); }   // 소켓 나사산
      { const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.1, 16), mats.rubber(0x1a1d24)); tip.position.y = -1.0; bulbG.add(tip); [-1, 1].forEach((q) => { const sup = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), mats.metal('steel')); sup.position.set(q * 0.13, -0.27, 0); sup.rotation.z = q * 0.08; bulbG.add(sup); }); }
      const fil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 8, 16), new THREE.MeshBasicMaterial({ color: 0xffb400 })); fil.position.y = -0.05; bulbG.add(fil);
            const gcv = document.createElement('canvas'); gcv.width = gcv.height = 128; { const g = gcv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,235,150,1)'); gr.addColorStop(0.35, 'rgba(255,200,70,.5)'); gr.addColorStop(1, 'rgba(255,170,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
      const bglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gcv), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); bglow.scale.set(3.6, 3.6, 1); bulbG.add(bglow);
      const wireM = mats.rubber(0x15181f, { extra: { roughness: 0.55 } });
      [-1, 1].forEach((sg) => { const c = new THREE.CatmullRomCurve3([new V3(sg * (WR - 0.45), WH + 0.9, 0), new V3(sg * (WR - 0.45), WH + 1.5, 0), new V3(sg * 0.6, WH + 1.9, 0), new V3(sg * 0.2, WH + 2.1, 0)], false, 'catmullrom', 0.2); const wm = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.04, 10, false), sg < 0 ? wireM : mats.plastic(0xb3262b)); wm.castShadow = true; root.add(wm); });
      label('(−)', electrodes[0], { size: 12, offset: [0, WH / 2 + 0.6, 0] }); label('(+)', electrodes[1], { size: 12, offset: [0, WH / 2 + 0.6, 0] });
      const bulbLab = label('전구', bulbG, { size: 12.5, offset: [0, 1.0, 0] });

      /* ---------- 입자 ---------- */
      const sprTex = {};
      function signTex(ch, col) { const k = ch + col; if (sprTex[k]) return sprTex[k]; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.font = '800 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 6; g.fillText(ch, 32, 36); return (sprTex[k] = new THREE.CanvasTexture(c)); }
      const sg = new THREE.Group(); root.add(sg);
      let items = [];
      const sphM = {}; function sphere(r, c, o) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), o ? mat(c, o) : (sphM[c] || (sphM[c] = mat(c)))); m.castShadow = true; return m; }
      function ion(kind) {
        const g = new THREE.Group();
        if (kind === 'H') g.add(sphere(0.26, COL.H));
        else if (kind === 'Cl') g.add(sphere(0.44, COL.Cl));
        else if (kind === 'Na') g.add(sphere(0.38, COL.Na));
        else { g.add(sphere(0.34, COL.OH)); const h = sphere(0.17, 0xf4f6fb); h.position.set(0.3, 0.15, 0); g.add(h); }
        const plus = kind === 'H' || kind === 'Na';
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex(plus ? '+' : '−', plus ? '#900' : '#003'), transparent: true, depthTest: false })); sp.scale.set(0.55, 0.55, 1); sp.renderOrder = 5; g.add(sp);
        g.userData.sp = sp; return g;
      }
      let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      function sugar() {
        const g = new THREE.Group(), cs = [[0, 0, 0, 0xf1f1f4], [0.45, 0.2, 0.1, 0xd42a30], [-0.4, 0.25, -0.1, 0xd42a30], [0.1, -0.45, 0.2, 0xd9dce3], [-0.15, 0.55, 0.3, 0xd42a30], [0.5, -0.3, -0.2, 0xd9dce3], [-0.5, -0.3, 0.1, 0xf1f1f4]];
        cs.forEach((c) => { const m = sphere(0.24, c[3]); m.position.set(c[0], c[1], c[2]); g.add(m); });
        return g;
      }
      function molOf(kind) {
        const g = new THREE.Group(), add = (r, c, x, y, z) => { const m = sphere(r, c); m.position.set(x, y, z); g.add(m); };
        if (kind === 'ch4') { add(0.28, 0x39404e, 0, 0, 0); [[0.38, 0.38, 0.38], [-0.38, -0.38, 0.38], [-0.38, 0.38, -0.38], [0.38, -0.38, -0.38]].forEach((p) => add(0.16, 0xf4f6fb, p[0], p[1], p[2])); }
        else { add(0.27, 0x39404e, -0.25, 0, 0); add(0.24, 0xd42a30, 0.3, 0.1, 0); add(0.14, 0xf4f6fb, 0.62, 0.3, 0); [[-0.5, 0.35, 0.15], [-0.5, -0.25, 0.3], [-0.25, -0.15, -0.4]].forEach((p) => add(0.14, 0xf4f6fb, p[0], p[1], p[2])); }
        return g;
      }
      let NU = 8;
      function rebuild() {
        NU = subOf(st.sub).n;
        sg.clear(); items = [];
        for (let i = 0; i < NU; i++) {
          const a = i * 2.4 + 0.5, r = Math.sqrt((i + 0.5) / NU) * (WR - 1.35), y = 0.9 + ((i * 0.618) % 1) * (WH - 1.8);
          const dir = new V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
          const it = { base: new V3(Math.cos(a) * r, y, Math.sin(a) * r), dir, ph: rnd() * 6.28, i };
          if (st.sub === 'suc') { it.mol = sugar(); sg.add(it.mol); }
          else if (st.sub === 'ch4' || st.sub === 'meoh') { it.mol = molOf(st.sub); it.gas = st.sub === 'ch4'; sg.add(it.mol); }
          else { const A = st.sub === 'hcl' ? ion('H') : ion('Na'), B = st.sub === 'hcl' ? ion('Cl') : ion('OH'); it.A = A; it.B = B; sg.add(A, B); }
          items.push(it);
        }
        // 이름표
        names.forEach((l) => l.show(false));
        if (st.sub === 'hcl') { names[0].obj = items[0].A; names[0].set('H⁺ 수소 이온'); names[1].obj = items[0].B; names[1].set('Cl⁻ 염화 이온'); }
        else if (st.sub === 'naoh') { names[0].obj = items[0].A; names[0].set('Na⁺ 나트륨 이온'); names[1].obj = items[0].B; names[1].set('OH⁻ 수산화 이온'); }
        else { names[0].obj = items[0].mol; names[0].set(st.sub === 'suc' ? '설탕 분자' : st.sub === 'ch4' ? 'CH₄ 메테인 분자' : 'CH₃OH 메탄올 분자'); }
      }
      const names = [label('', [0, 0, 0], { size: 12, color: 'rgba(30,30,60,.85)' }), label('', [0, 0, 0], { size: 12, color: 'rgba(30,30,60,.85)' })];

      function apply() {
        const s = st.s, hasIon = st.sub === 'hcl' || st.sub === 'naoh', q = subOf(st.sub);
        names[0].show(st.names && (s > 0.5 || !hasIon)); names[1].show(st.names && s > 0.5 && hasIon);
        bulbM.emissiveIntensity = hasIon ? Math.min(1, s * 1.1) * 1.6 : 0; bglow.material.opacity = hasIon ? Math.min(1, s * 1.1) * 0.9 : 0;
        let h;
        if (st.sub === 'hcl') h = s < 0.05 ? '<b>HCl</b> 분자가 물에 들어가면 어떻게 될까요?' : '<b>HCl → H⁺ + Cl⁻</b><br>산은 물에 녹아 <b>수소 이온(H⁺)</b>을 내놓아요. 이온이 있어 전구가 켜져요.';
        else if (st.sub === 'naoh') h = s < 0.05 ? '<b>NaOH</b> 분자가 물에 들어가면 어떻게 될까요?' : '<b>NaOH → Na⁺ + OH⁻</b><br>염기는 물에 녹아 <b>수산화 이온(OH⁻)</b>을 내놓아요. 전구가 켜져요.';
        else if (st.sub === 'ch4') h = '<b>CH₄ 메테인</b>: 물에 거의 녹지 않아요.<br>수소(H)가 들어 있어도 H⁺을 내놓지 않아 산이 아니에요.';
        else if (st.sub === 'meoh') h = '<b>CH₃OH 메탄올</b>: 이온 없음 (분자 그대로 녹아요).<br>OH가 들어 있어도 OH⁻을 내놓지 않아 염기가 아니에요. 전구는 꺼져 있어요.';
        else h = '<b>설탕</b>: 이온 없음 (분자 그대로 녹아요).<br>이온이 없어 전류가 흐르지 않아 전구가 꺼져 있어요.';
        if (h !== apply.h) { apply.h = h; info(h); }
      }
      const bts = SUBS.map((q) => {
        const b = controls.button(q.f, () => {
          const S = L2();
          if (S && S.S && S.S.scene === 'ion' && S.startDissolve) S.startDissolve(q.id);   // 2D에서 같은 카드를 물에 넣어요
          else { if (q.id !== st.sub) { st.sub = q.id; rebuild(); } pl.set(0); pl.play(); }
        });
        return b;
      });
      controls.button('🏷 이름', () => { st.names = !st.names; apply(); });
      const pl = controls.player({
        duration: 7, loop: true, label: '녹는 모습 다시 보기',
        phases: [[0, '물에 넣기'], [0.15, '녹는 중'], [0.65, '녹은 뒤']],
        onFrame(p) { st.s = Math.max(0, Math.min(1, (p - 0.12) / 0.5)); if (items.length) apply(); },
      });
      let lastCur = null, lastT = 0;
      {
        const S = L2(); if (S && S.IO && S.IO.cur) { lastCur = S.IO.cur; st.sub = subOf(lastCur).id; }
      }
      rebuild(); apply();

      const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      return {
        update(dt, t) {
          st.t += dt;
          const S = L2(), IO = S && S.IO;
          const again = IO && IO.cur && IO.cur === lastCur && IO.t < lastT - 0.3;   // 같은 카드를 다시 넣었을 때
          lastT = IO ? IO.t : 0;
          if (IO && (IO.cur !== lastCur || again)) {            // 2D에서 카드를 물에 넣으면 3D도 같은 물질로 바꿔서 녹여요
            lastCur = IO.cur;
            if (lastCur) { if (lastCur !== st.sub) { st.sub = lastCur; rebuild(); } pl.set(0); pl.play(); }
          }
          bts.forEach((b, i) => { const q = SUBS[i], tried = !!(IO && IO.tried && IO.tried[q.id]), t2 = q.f + (tried ? ' ✓' : ''); b.classList.toggle('on', q.id === st.sub); if (b.textContent !== t2) b.textContent = t2; });
          const s = st.s;
          items.forEach((it) => {
            const w = new V3(Math.sin(t * 0.7 + it.ph) * 0.22, Math.sin(t * 0.9 + it.ph * 1.7) * 0.18, Math.cos(t * 0.6 + it.ph * 1.3) * 0.22);
            const c = it.base.clone().add(w);
            if (it.mol) { it.mol.position.copy(c); it.mol.position.x += ease(s) * 0.3 * Math.sin(it.ph); if (it.gas) { const top = WH + 0.25 + 0.25 * Math.sin(it.ph * 3); it.mol.position.y = c.y + ease(s * 1.2 - it.i / NU * 0.5) * (top - c.y); } it.mol.rotation.set(t * 0.4 + it.ph, t * 0.3, 0); }
            else {
              const u = ease(s * 1.3 - it.i / NU * 0.3), sep = 0.38 + u * 1.15, drift = u * 0.35;
              it.A.position.copy(c).addScaledVector(it.dir, sep); it.B.position.copy(c).addScaledVector(it.dir, -sep);
              it.A.position.x -= drift; it.B.position.x += drift;       // 양이온은 (−)극 쪽, 음이온은 (+)극 쪽으로 조금 끌려요
              ['x', 'y', 'z'].forEach((k) => { const lim = k === 'y' ? [0.45, WH - 0.2] : [-(WR - 0.5), WR - 0.5]; [it.A, it.B].forEach((p) => { p.position[k] = Math.max(lim[0], Math.min(lim[1], p.position[k])); }); });
              [it.A, it.B].forEach((p) => { const r = Math.hypot(p.position.x, p.position.z); if (r > WR - 0.55) { p.position.x *= (WR - 0.55) / r; p.position.z *= (WR - 0.55) / r; } });
              it.A.userData.sp.visible = it.B.userData.sp.visible = u > 0.3;
            }
          });
        },
        sync() {},
      };
    },
  });
})();
