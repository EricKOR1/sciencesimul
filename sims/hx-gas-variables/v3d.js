/* hx-gas-variables · 3D 피스톤 속 기체 입자
   2D 실험의 부피·온도·몰수에 맞춰, 입자가 벽에 부딪혀 압력을 만드는 모습을 입체로 보여 줘요.
   입자 수 ∝ 몰수, 입자 속도 ∝ √T, 피스톤 높이 ∝ 부피예요 (모형 스케치). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const HW = 2, FLOOR = -3.2, PER_MOL = 40, MAXN = 80, R_P = 0.2;

  window.SciSim3D.attach({
    title: '피스톤 속 기체 입자 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: PHONE ? 15 : 12.5, theta: 0.7, phi: 1.25, min: 6, max: 26, target: [0, 0.2, 0] },
    autoRotate: 0.18,
    levels: [2],   // 3단계(몰수 · 부피 기록). 1 · 2단계는 기록표 · 그래프(외삽)를 읽고, 4단계는 식 카드를 끌어 놓아서 2D 화면이에요
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
      const st0 = () => { try { return window.__sim && window.__sim.st ? window.__sim.st() : null; } catch (e) { return null; } };
      let colorBySpeed = true, flashOn = true;

      /* 용기 */
      const M = ctx.mats;
      const rbox = (w, h, d, r) => { const s = new THREE.Shape(), b = Math.min(r, h / 2) * 0.6, x = w / 2 - r - b, z = d / 2 - r - b; s.absarc(x, z, r, 0, Math.PI / 2); s.absarc(-x, z, r, Math.PI / 2, Math.PI); s.absarc(-x, -z, r, Math.PI, Math.PI * 1.5); s.absarc(x, -z, r, Math.PI * 1.5, Math.PI * 2); const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 6 }); g.rotateX(-Math.PI / 2); g.translate(0, -h / 2 + b, 0); return g; };   // 모서리가 둥근 상자
      const glass = M.glass({ tint: 0xd6ecff, opacity: 0.12, extra: { envMapIntensity: 1.1 } });
      const body = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, 5, HW * 2), glass); root.add(body);   // 높이 5로 만들고 h/5로 늘여요 (자동 맞춤이 크기를 바르게 재도록)
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xd6ebff, transparent: true, opacity: 0.5 }));
      edges.scale.set(HW * 2, 5, HW * 2); body.add(edges);
      const base = new THREE.Mesh(rbox(HW * 2 + 0.4, 0.3, HW * 2 + 0.4, 0.12), M.metal(0x3d4656, { roughness: 0.55 }));
      base.position.y = FLOOR - 0.15; root.add(base);
      /* 실험대 (배경): 나무 상판 — 자동 맞춤은 용기에 맞춰요 */
      const bench = new THREE.Mesh(rbox(13, 0.4, 9, 0.25), M.wood(0xd8b78a, { repeat: 0.11 })); bench.position.y = FLOOR - 0.5; bench.userData.v3bg = true; root.add(bench);
      /* 피스톤 */
      const pis = new THREE.Group(); root.add(pis);
      const plate = new THREE.Mesh(rbox(HW * 2 - 0.02, 0.28, HW * 2 - 0.02, 0.06), M.metal(0x8f99a8, { brushed: true, roughness: 0.3 }));
      const seal = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 + 0.02, 0.09, HW * 2 + 0.02), M.rubber(0x15181f)); seal.position.y = -0.05;   // 고무 패킹
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.14, 28), M.metal('steel')); collar.position.y = 0.2;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 28), M.metal('chrome', { roughness: 0.14 }));
      rod.position.y = 0.85;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 20), M.plastic(0xc23324, { roughness: 0.22 }));
      knob.position.y = 1.7;
      pis.add(plate, seal, collar, rod, knob);
      /* 입자 */
      const geo = new THREE.SphereGeometry(R_P, 18, 14);
      const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0 }), MAXN);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; root.add(mesh);
      const P = [];
      for (let i = 0; i < MAXN; i++) {
        const d = new V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        P.push({ x: (Math.random() * 2 - 1) * (HW - 0.3), y: FLOOR + 0.4 + Math.random() * 2, z: (Math.random() * 2 - 1) * (HW - 0.3), d, f: 0.6 + Math.random() * 0.8, fl: 0 });
      }
      /* 압력 표시 (피스톤을 누르는 화살표 + 이름표) */
      const arrows = new THREE.Group(); root.add(arrows);
      const amat = M.plastic(0xf59a23, { extra: { emissive: 0x663300, emissiveIntensity: 0.35 } });
      const arrM = [];
      for (let i = 0; i < 4; i++) {
        const a = new THREE.Group();
        a.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), amat), new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 16), amat));
        arrows.add(a); arrM.push(a);
      }
      const labP = label('', knob, { color: 'rgba(239,106,91,.92)', offset: [0, 0.7, 0] });
      const labV = label('', [HW + 0.1, FLOOR, HW], { color: 'rgba(56,134,214,.92)' });

      const cur = { n: 0.5, T: 300, V: 12.3, P: 1, h: 5, kind: 'gen', mode: 'boyle', sub: 'charles' }; let h = 5, lastTxt = '';
      const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
      function read() {
        const s = st0();
        if (s) { cur.n = s.n; cur.T = s.T; cur.V = s.V; cur.P = s.P; cur.kind = s.kind; }
        try { const S = window.__sim.S; cur.mode = S.mode; cur.sub = S.sub.temp; } catch (e) { /* 무시 */ }
        return cur;
      }
      function layout(dt) {
        const c = read(), th = Math.max(0.9, c.V * 0.4);
        h += (th - h) * Math.min(1, dt * 6);
        body.scale.set(1, h / 5, 1); body.position.y = FLOOR + h / 2;
        pis.position.y = FLOOR + h + 0.14;
        arrM.forEach((a, i) => {
          const ang = (i / 4) * Math.PI * 2 + 0.78, rx = Math.cos(ang) * 1.1, rz = Math.sin(ang) * 1.1;
          const L = 0.5 + 0.5 * Math.min(2.5, c.P);
          a.position.set(rx, FLOOR + h + 0.3 + L / 2 + 0.55, rz);
          a.children[0].scale.set(1, L, 1); a.children[1].position.y = -L / 2 - 0.18; a.children[1].rotation.x = Math.PI;
        });
        labV.obj = [HW, FLOOR + h / 2, HW];
      }
      function stepParticles(dt) {
        const c = cur, nShow = Math.max(1, Math.min(MAXN, Math.round(c.n * PER_MOL)));
        const sp = 2.3 * Math.sqrt(c.T / 300), top = FLOOR + h - R_P, bot = FLOOR + R_P, w = HW - R_P;
        for (let i = 0; i < MAXN; i++) {
          const p = P[i];
          if (i >= nShow) { tmpM.makeScale(0.0001, 0.0001, 0.0001); mesh.setMatrixAt(i, tmpM); continue; }
          const v = sp * p.f * dt;
          p.x += p.d.x * v; p.y += p.d.y * v; p.z += p.d.z * v;
          if (p.x > w) { p.x = w; p.d.x *= -1; p.fl = 1; } else if (p.x < -w) { p.x = -w; p.d.x *= -1; p.fl = 1; }
          if (p.z > w) { p.z = w; p.d.z *= -1; p.fl = 1; } else if (p.z < -w) { p.z = -w; p.d.z *= -1; p.fl = 1; }
          if (p.y > top) { p.y = top; p.d.y = -Math.abs(p.d.y); p.fl = 1; } else if (p.y < bot) { p.y = bot; p.d.y = Math.abs(p.d.y); p.fl = 1; }
          p.fl = Math.max(0, p.fl - dt * 4);
          tmpM.makeTranslation(p.x, p.y, p.z); const sc = 1 + (flashOn ? p.fl * 0.5 : 0); tmpM.scale(new V3(sc, sc, sc)); mesh.setMatrixAt(i, tmpM);
          if (colorBySpeed && c.kind === 'gen') { const k = Math.min(1, Math.max(0, (sp * p.f / 2.3 - 0.3) / 1.4)); tmpC.setHSL(0.62 - 0.62 * k, 0.85, 0.58).convertSRGBToLinear(); }
          else tmpC.setHex((KIND[c.kind] || KIND.gen)[1]).convertSRGBToLinear();
          if (flashOn && p.fl > 0.4) tmpC.lerp(new THREE.Color(0xffffff), p.fl);
          mesh.setColorAt(i, tmpC);
        }
        mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }
      const KIND = { gen: ['기체', 0x7cc4ff], he: ['He', 0xf2b705], n2: ['N₂', 0x3867f4], co2: ['CO₂', 0x9ca3af] };
      function text() {
        const c = cur, nm = (KIND[c.kind] || KIND.gen)[0];
        let line;
        if (c.mode === 'boyle' || c.mode === 'unify') line = '온도 300 K · 몰수 0.50 mol 고정<br>P × V = ' + (c.P * c.V).toFixed(1) + ' atm·L (일정)';
        else if (c.mode === 'temp' && c.sub === 'gay') line = '부피 12.30 L 고정 · 온도가 오르면 압력이 커져요';
        else if (c.mode === 'temp') line = '압력 1.00 atm 고정 · 온도가 오르면 부피가 커져요';
        else line = nm + ' · 300 K, 1.00 atm 고정 · 몰수가 늘면 부피가 커져요';
        const t = '<b>P = ' + c.P.toFixed(2) + ' atm</b> · V = ' + c.V.toFixed(1) + ' L<br>T = ' + Math.round(c.T) + ' K · n = ' + c.n.toFixed(2) + ' mol<br>' + line + '<br>입자가 벽을 더 자주·세게 때리면 압력이 커져요.';
        if (t !== lastTxt) { lastTxt = t; info(t); labP.set('P ' + c.P.toFixed(2) + ' atm'); labV.set('V ' + c.V.toFixed(1) + ' L'); }
      }
      controls.segment('입자 색', [{ value: 'spd', label: '속도 색' }, { value: 'one', label: '한 가지 색' }], 'spd', (v) => { colorBySpeed = v === 'spd'; });
      const fb = controls.button('충돌 반짝임 ✓', () => { flashOn = !flashOn; fb.classList.toggle('on', flashOn); fb.textContent = '충돌 반짝임 ' + (flashOn ? '✓' : '✕'); }); fb.classList.add('on');
      controls.text('온도·부피·몰수는 옆 조작판에서 바꿔요.');
      /* 몰수 단계: 📍 기록하기로 모은 값을 3D 화면에도 기록표로 보여 줘요 (2D 기록표와 같은 값) */
      const recP = v3pan('tr'), KN = { he: 'He', n2: 'N₂', co2: 'CO₂', gen: '기체' };
      function drawRec() {
        let S = null; try { S = window.__sim.S; } catch (e) { /* 무시 */ }
        if (!S || S.mode !== 'mole' || !S.rec || !S.rec.mole) { recP.put(''); return; }
        const r = S.rec.mole, cell = (f) => { let h = ''; for (let j = 0; j < 6; j++) h += r[j] ? '<td>' + f(r[j]) + '</td>' : '<td class="e">·</td>'; return h; };
        recP.put('<div class="h">📋 기록표 ' + r.length + ' / 6</div><table><tr><th>기체</th>' + cell((q) => KN[q.kind] || q.kind) + '</tr><tr><th>n (mol)</th>' + cell((q) => q.n.toFixed(2)) + '</tr><tr><th>V (L)</th>' + cell((q) => '<span class="hi">' + q.V.toFixed(1) + '</span>') + '</tr></table>');
      }
      layout(1); h = Math.max(0.9, cur.V * 0.4);
      return {
        update(dt) { dt = Math.min(dt, 0.05); layout(dt); stepParticles(dt); text(); drawRec(); },
        sync() { lastTxt = ''; },
      };
    },
  });
})();
