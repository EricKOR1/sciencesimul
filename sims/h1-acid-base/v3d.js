/* h1-acid-base · 3D 산과 염기의 이온 모형
   산(HCl)은 물에 녹아 수소 이온(H⁺)과 염화 이온(Cl⁻)으로, 염기(NaOH)는 나트륨 이온(Na⁺)과 수산화 이온(OH⁻)으로 나뉘어요 (이온화).
   이온이 있으면 전류가 흘러 전구가 켜져요. 설탕은 분자 그대로 녹아 이온이 없어서 전구가 꺼져 있어요.
   입자 크기와 수는 실제와 달라요 (물 분자는 그리지 않았어요). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const COL = { H: 0xe2464b, Cl: 0x14a058, Na: 0xf59e0b, OH: 0x3867f4 };

  window.SciSim3D.attach({
    title: '3D 산과 염기 (이온 모형)',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHN ? 15 : 10, theta: 0.5, phi: 1.2, target: [0, 1.6, 0], min: 6, max: 26 },
    autoRotate: 0,
    levels: [0, 2],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const V3 = THREE.Vector3;
      const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.6, color: c, roughness: 0.35, metalness: 0.05 }, o || {}));
      const st = { sub: 'hcl', s: 0, play: false, names: true, t: 0, sel: 1 };

      /* ---------- 비커 · 전극 · 전구 ---------- */
      const WR = 2.55, WH = 3.2;
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.25, 56), new THREE.MeshLambertMaterial({ color: 0x2d3547 })); floor.position.y = -0.15; floor.receiveShadow = true; root.add(floor);
      const beaker = new THREE.Mesh(new THREE.CylinderGeometry(WR + 0.12, WR + 0.12, WH + 0.9, 56, 1, true), new THREE.MeshStandardMaterial({ color: 0xd6e6ff, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false })); beaker.position.y = (WH + 0.9) / 2; root.add(beaker);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(WR + 0.12, 0.05, 10, 56), mat(0xe3eeff, { transparent: true, opacity: 0.6 })); rim.rotation.x = Math.PI / 2; rim.position.y = WH + 0.9; root.add(rim);
      const bot = new THREE.Mesh(new THREE.CylinderGeometry(WR + 0.12, WR + 0.12, 0.12, 56), mat(0xcfe0f7, { transparent: true, opacity: 0.45 })); bot.position.y = 0.04; root.add(bot);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(WR, WR, WH, 56), new THREE.MeshStandardMaterial({ color: 0x8fc4ff, transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false })); water.position.y = WH / 2 + 0.1; root.add(water);
      // 전극 두 개 (왼쪽 −극, 오른쪽 +극)
      const bar = new THREE.Mesh(new THREE.BoxGeometry(WR * 2.1, 0.12, 0.2), mat(0x8a93a6, { metalness: 0.6 })); bar.position.set(0, WH + 0.95, 0); root.add(bar);
      const electrodes = [-1, 1].map((sg) => { const e = new THREE.Mesh(new THREE.BoxGeometry(0.1, WH + 0.4, 1.3), mat(sg < 0 ? 0x4a5568 : 0x9aa3b2, { metalness: 0.75, roughness: 0.3 })); e.position.set(sg * (WR - 0.45), (WH + 0.4) / 2 + 0.45, 0); e.castShadow = true; root.add(e); return e; });
      // 전구와 전선
      const bulbG = new THREE.Group(); bulbG.position.set(0, WH + 2.5, 0); root.add(bulbG);
      const bulbM = new THREE.MeshStandardMaterial({ color: 0xfff6d0, transparent: true, opacity: 0.55, emissive: 0xffd45a, emissiveIntensity: 0, roughness: 0.1, depthWrite: false });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), bulbM); bulbG.add(bulb);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 16), mat(0x8a93a6, { metalness: 0.7 })); base.position.y = -0.72; bulbG.add(base);
      const fil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 8, 16), new THREE.MeshBasicMaterial({ color: 0xffb400 })); fil.position.y = -0.05; bulbG.add(fil);
            const gcv = document.createElement('canvas'); gcv.width = gcv.height = 128; { const g = gcv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,235,150,1)'); gr.addColorStop(0.35, 'rgba(255,200,70,.5)'); gr.addColorStop(1, 'rgba(255,170,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
      const bglow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gcv), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); bglow.scale.set(3.6, 3.6, 1); bulbG.add(bglow);
      const wireM = mat(0x2a2f3a, { metalness: 0.3 });
      [-1, 1].forEach((sg) => { const c = new THREE.CatmullRomCurve3([new V3(sg * (WR - 0.45), WH + 0.9, 0), new V3(sg * (WR - 0.45), WH + 1.5, 0), new V3(sg * 0.6, WH + 1.9, 0), new V3(sg * 0.2, WH + 2.1, 0)], false, 'catmullrom', 0.2); root.add(new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.035, 8, false), wireM)); });
      label('(−)', electrodes[0], { size: 12, offset: [0, WH / 2 + 0.6, 0] }); label('(+)', electrodes[1], { size: 12, offset: [0, WH / 2 + 0.6, 0] });
      const bulbLab = label('전구', bulbG, { size: 12.5, offset: [0, 1.0, 0] });

      /* ---------- 입자 ---------- */
      const sprTex = {};
      function signTex(ch, col) { const k = ch + col; if (sprTex[k]) return sprTex[k]; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.font = '800 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = col; g.shadowBlur = 6; g.fillText(ch, 32, 36); return (sprTex[k] = new THREE.CanvasTexture(c)); }
      const sg = new THREE.Group(); root.add(sg);
      let items = [];
      function sphere(r, c, o) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 20), mat(c, o)); m.castShadow = true; return m; }
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
        const g = new THREE.Group(), cs = [[0, 0, 0, 0xf1f1f4], [0.45, 0.2, 0.1, 0xe2464b], [-0.4, 0.25, -0.1, 0xe2464b], [0.1, -0.45, 0.2, 0xd9dce3], [-0.15, 0.55, 0.3, 0xe2464b], [0.5, -0.3, -0.2, 0xd9dce3], [-0.5, -0.3, 0.1, 0xf1f1f4]];
        cs.forEach((c) => { const m = sphere(0.24, c[3]); m.position.set(c[0], c[1], c[2]); g.add(m); });
        return g;
      }
      const NU = 8;
      function rebuild() {
        sg.clear(); items = [];
        for (let i = 0; i < NU; i++) {
          const a = i * 2.4 + 0.5, r = Math.sqrt((i + 0.5) / NU) * (WR - 1.35), y = 0.9 + ((i * 0.618) % 1) * (WH - 1.8);
          const dir = new V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
          const it = { base: new V3(Math.cos(a) * r, y, Math.sin(a) * r), dir, ph: rnd() * 6.28, i };
          if (st.sub === 'suc') { it.mol = sugar(); sg.add(it.mol); }
          else { const A = st.sub === 'hcl' ? ion('H') : ion('Na'), B = st.sub === 'hcl' ? ion('Cl') : ion('OH'); it.A = A; it.B = B; sg.add(A, B); }
          items.push(it);
        }
        // 이름표
        names.forEach((l) => l.show(false));
        if (st.sub === 'hcl') { names[0].obj = items[0].A; names[0].set('H⁺ 수소 이온'); names[1].obj = items[0].B; names[1].set('Cl⁻ 염화 이온'); }
        else if (st.sub === 'naoh') { names[0].obj = items[0].A; names[0].set('Na⁺ 나트륨 이온'); names[1].obj = items[0].B; names[1].set('OH⁻ 수산화 이온'); }
        else { names[0].obj = items[0].mol; names[0].set('설탕 분자'); }
      }
      const names = [label('', [0, 0, 0], { size: 12, color: 'rgba(30,30,60,.85)' }), label('', [0, 0, 0], { size: 12, color: 'rgba(30,30,60,.85)' })];

      function apply() {
        const s = st.s, hasIon = st.sub !== 'suc';
        names[0].show(st.names && (s > 0.5 || st.sub === 'suc')); names[1].show(st.names && s > 0.5 && hasIon);
        bulbM.emissiveIntensity = hasIon ? Math.min(1, s * 1.1) * 1.6 : 0; bglow.material.opacity = hasIon ? Math.min(1, s * 1.1) * 0.9 : 0;
        const nm = { hcl: '염산(HCl)', naoh: '수산화 나트륨(NaOH) 수용액', suc: '설탕물' }[st.sub];
        if (st.sub === 'hcl') info(s < 0.05 ? '<b>HCl</b>이 물에 녹기 전이에요. 녹이면 어떻게 될까요?' : '<b>HCl → H⁺ + Cl⁻</b><br>산은 물에 녹아 <b>수소 이온(H⁺)</b>을 내놓아요. 이온이 있어 전구가 켜져요.');
        else if (st.sub === 'naoh') info(s < 0.05 ? '<b>NaOH</b>가 물에 녹기 전이에요. 녹이면 어떻게 될까요?' : '<b>NaOH → Na⁺ + OH⁻</b><br>염기는 물에 녹아 <b>수산화 이온(OH⁻)</b>을 내놓아요. 전구가 켜져요.');
        else info('설탕은 물에 녹아도 <b>분자 그대로</b> 있어서 이온이 없어요.<br>전류가 흐르지 않아 전구가 꺼져 있어요.');
      }
      const seg = controls.segment('물질', [{ value: 'hcl', label: '염산 HCl' }, { value: 'naoh', label: 'NaOH' }, { value: 'suc', label: '설탕' }], st.sub, (v) => { st.sub = v; st.s = 0; st.play = false; playB.textContent = '▶ 물에 녹이기'; rng.set(0); rebuild(); apply(); });
      const rng = controls.range('녹은 정도', 0, 100, 1, 0, (v) => { st.play = false; playB.textContent = '▶ 물에 녹이기'; st.s = v / 100; apply(); }, (v) => v + '%');
      const playB = controls.button('▶ 물에 녹이기', () => { if (st.s >= 0.99) st.s = 0; st.play = !st.play; playB.textContent = st.play ? '⏸ 멈춤' : '▶ 물에 녹이기'; });
      controls.button('🏷 이름', () => { st.names = !st.names; apply(); });
      rebuild(); apply();

      const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      return {
        update(dt, t) {
          st.t += dt;
          if (st.play) { st.s = Math.min(1, st.s + dt / 4); rng.set(Math.round(st.s * 100)); apply(); if (st.s >= 1) { st.play = false; playB.textContent = '↺ 다시 하기'; } }
          const s = st.s;
          items.forEach((it) => {
            const w = new V3(Math.sin(t * 0.7 + it.ph) * 0.22, Math.sin(t * 0.9 + it.ph * 1.7) * 0.18, Math.cos(t * 0.6 + it.ph * 1.3) * 0.22);
            const c = it.base.clone().add(w);
            if (it.mol) { it.mol.position.copy(c); it.mol.position.x += ease(s) * 0.3 * Math.sin(it.ph); it.mol.rotation.set(t * 0.4 + it.ph, t * 0.3, 0); }
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
