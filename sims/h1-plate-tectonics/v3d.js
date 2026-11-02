/* h1-plate-tectonics · 3D 판의 경계 블록 모형 (발산 · 섭입 · 충돌 · 보존)
   맨틀 대류에 따라 판이 움직이는 모습을 단면으로 보며, 경계마다 생기는 지형·화산·지진을 확인해요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const DEP = 4;

  window.SciSim3D.attach({
    title: '판의 경계 블록 3D',
    camera: { dist: PHN ? 12.5 : 10.8, theta: 0.35, phi: 1.12, min: 6, max: 24 },
    levels: [1, 2],
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0 }, o || {}));
      let mode = 'div', s = 0, play = false, conv = true;
      const dyn = new THREE.Group(), stat = new THREE.Group(); root.add(stat, dyn);
      const fixedLabs = [];
      const L = (i, t, p, col) => { if (!fixedLabs[i]) fixedLabs[i] = label('', [0, 0, 0], { size: 12 }); const l = fixedLabs[i]; l.set(t); l.obj = p; l.show(true); if (col) l.el.style.background = col; return l; };
      function clr(g) { while (g.children.length) { const o = g.children[0]; g.remove(o); if (o.geometry) o.geometry.dispose(); } }
      function poly(pts, color, extra, o) {
        const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
        const g = new THREE.ExtrudeGeometry(sh, { depth: DEP + (extra || 0), bevelEnabled: false }); g.translate(0, 0, -DEP / 2);
        const m = new THREE.Mesh(g, std(color, o)); return m;
      }
      // 맨틀(고정)
      const mantle = new THREE.Mesh(new THREE.BoxGeometry(8, 2.3, DEP), std(0xc4552f, { roughness: 0.6, emissive: 0x6a1d08, emissiveIntensity: 0.28 })); mantle.position.set(0, -0.55 - 1.15, 0); stat.add(mantle);
      const core = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, DEP), std(0xf0803a, { emissive: 0xa03a10, emissiveIntensity: 0.4, roughness: 0.5 })); core.position.set(0, -0.55 - 2.3 - 0.25, 0); stat.add(core);
      label('맨틀', mantle, { offset: [-3.1, -0.3, 2.05], size: 12 });

      /* 해양 지각 줄무늬 (발산형): 새 지각이 해령에서 생겨 양쪽으로 밀려가요 */
      const tc = document.createElement('canvas'); tc.width = 128; tc.height = 8; const tx = tc.getContext('2d');
      tx.fillStyle = '#4a5970'; tx.fillRect(0, 0, 64, 8); tx.fillStyle = '#8fa3c0'; tx.fillRect(64, 0, 64, 8);
      const texL = new THREE.CanvasTexture(tc), texR = new THREE.CanvasTexture(tc);
      [texL, texR].forEach((t) => { t.wrapS = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; if ('outputEncoding' in t) t.encoding = THREE.sRGBEncoding; });
      texL.repeat.x = -2; texR.repeat.x = 2;
      const plain = () => std(0x5e6e86);
      const mkHalf = (tex, x) => {
        const stripe = std(0xffffff, { map: tex, roughness: 0.8 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, DEP), [plain(), plain(), stripe, plain(), stripe, plain()]); m.position.set(x, -0.25, 0); return m;
      };
      const hL = mkHalf(texL, -2.0), hR = mkHalf(texR, 2.0);
      const gDiv = new THREE.Group(); gDiv.add(hL, hR); stat.add(gDiv);
      const rift = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, DEP), std(0xff5a2a, { emissive: 0xff3a10, emissiveIntensity: 0.9 })); rift.position.set(0, -0.25, 0); gDiv.add(rift);
      const magma = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 24, 1), std(0xff7a30, { emissive: 0xff4a10, emissiveIntensity: 0.9 })); magma.position.set(0, -1.0, 0); magma.rotation.x = Math.PI; magma.scale.z = 3; gDiv.add(magma);
      const mr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, DEP), std(0x6a7a96)); mr.position.set(0, 0.04, 0); gDiv.add(mr); // 해령 능선

      /* 맨틀 대류 화살표(점이 순환) */
      const conG = new THREE.Group(); root.add(conG);
      let loops = [];
      function buildLoops(list) {
        clr(conG); loops = [];
        list.forEach((lp) => {
          const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2 * lp.dir; pts.push(new THREE.Vector3(lp.cx + Math.cos(a) * lp.rx, lp.cy + Math.sin(a) * lp.ry, DEP / 2 + 0.06)); }
          const curve = new THREE.CatmullRomCurve3(pts, true);
          conG.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.035, 8, true), new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.6 })));
          const dots = []; for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff6d0 })); conG.add(d); dots.push(d); }
          loops.push({ curve, dots });
        });
      }

      const dmat = (c, o) => std(c, o);
      function paint() {
        clr(dyn); fixedLabs.forEach((l) => l.show(false));
        gDiv.visible = mode === 'div';
        const t = s;
        if (mode === 'div') {
          const m = t * 6;
          texL.offset.x = 2 - m / 2; texR.offset.x = -m / 2;
          L(0, '해령 (발산형 경계)', [0, 0.35, DEP / 2], 'rgba(220,80,30,.92)'); L(1, '새 해양 지각', [-2.2, 0.0, DEP / 2]); L(2, '마그마 상승', [0, -1.15, DEP / 2], 'rgba(220,80,30,.92)');
          // 양쪽 판 이동 화살표
          [[-1, '←'], [1, '→']].forEach((d, i) => { const a = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), dmat(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.6 })); a.position.set(d[0] * 3.0, 0.45, 0); a.rotation.z = -d[0] * Math.PI / 2; dyn.add(a); });
          buildLoops([{ cx: -2, cy: -1.7, rx: 1.7, ry: 0.65, dir: 1 }, { cx: 2, cy: -1.7, rx: 1.7, ry: 0.65, dir: -1 }]);
          info('<b>발산형 경계</b>: 두 판이 멀어지면 마그마가 올라와 새 지각이 생겨요. 줄무늬는 시간이 지나며 양쪽으로 밀려난 지각이에요.');
        } else if (mode === 'sub') {
          const al = 0.56, d = [Math.cos(al), -Math.sin(al)], T = 0.42, Ls = 0.4 + t * 4.2, x1 = -0.5, y1 = -0.15;
          const n = [-Math.sin(al) * T, -Math.cos(al) * T];
          const P2 = [x1 + d[0] * Ls, y1 + d[1] * Ls];
          // 슬래브 아래 선과 수평 바닥(y=-0.57)의 교점
          const yb = y1 - T; const bx = (n[0] + x1) + ((yb - (y1 + n[1])) / (d[1] / d[0]));
          const slab = [[-4, y1], [x1, y1], P2, [P2[0] + n[0], P2[1] + n[1]], [bx, yb], [-4, yb]];
          const sl = poly(slab, 0x3b78c2, 0.04); dyn.add(sl);
          // 대륙판: 아래 경계는 슬래브 윗면을 따라가요
          const base = -1.3; const xs = x1 + (base - y1) / (d[1] / d[0]);
          const cont = poly([[x1, y1], [xs, base], [4, base], [4, 0.45], [0.9, 0.45], [x1, y1]], 0xb59a6a, 0.02); dyn.add(cont);
          const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, DEP + 0.02), std(0x6fae5a)); top.position.set(2.45, 0.48, 0); dyn.add(top);
          const vh = 1.1 * Math.max(0, Math.min(1, (t - 0.35) / 0.45));
          if (vh > 0.02) { const v = new THREE.Mesh(new THREE.ConeGeometry(0.55 * (0.4 + vh * 0.6), vh, 32), std(0x7b6a5a)); v.position.set(1.7, 0.5 + vh / 2, 0); dyn.add(v);
            const mg = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), std(0xff6a2a, { emissive: 0xff3a10, emissiveIntensity: 0.9 })); mg.position.set(1.7, -0.55, 0); mg.scale.z = 2.2; dyn.add(mg);
            const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0 + vh, 12), std(0xff6a2a, { emissive: 0xff3a10, emissiveIntensity: 0.9 })); ch.position.set(1.7, -0.05 + vh * 0.4, 0); dyn.add(ch); L(3, '화산 (마그마)', [1.7, 0.5 + vh + 0.3, 0], 'rgba(220,80,30,.92)'); }
          const trench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, DEP + 0.02), std(0x0f2d54)); trench.position.set(-0.55, y1 + 0.02, 0); dyn.add(trench);
          L(0, '해구', [-0.5, 0.2, DEP / 2], 'rgba(20,60,120,.92)'); L(1, '해양판 (무거움)', [-3, 0.2, DEP / 2], 'rgba(30,90,170,.92)'); L(2, '대륙판', [3.1, 0.9, DEP / 2]);
          L(4, '섭입대 (지진)', [P2[0] - 0.3, P2[1] - 0.1, DEP / 2], 'rgba(30,90,170,.92)');
          buildLoops([{ cx: -2.3, cy: -1.75, rx: 1.4, ry: 0.55, dir: -1 }]);
          info('<b>수렴형 경계(섭입)</b>: 무거운 해양판이 대륙판 아래로 들어가며 <b>해구</b>가 생기고, 마그마가 올라와 <b>화산</b>이 생겨요.');
        } else if (mode === 'col') {
          const h = 1.9 * t, r = 1.2 * t, th = 0.9;
          const w = 1.25 - t * 0.3;
          dyn.add(poly([[-4, -th], [-4, 0], [-w - 0.2, 0], [-w, -th]], 0xb59a6a, 0.0));
          dyn.add(poly([[w + 0.2, 0], [4, 0], [4, -th], [w, -th]], 0xc7ab78, 0.0));
          const mt = poly([[-w - 0.2, 0], [-0.9, h * 0.55], [-0.3, h * 0.9], [0.2, h], [0.8, h * 0.6], [w + 0.2, 0], [w, -th], [0.9, -th - r], [0, -th - r * 1.2], [-0.9, -th - r], [-w, -th]], 0xa88f66, 0.02); dyn.add(mt);
          if (h > 0.5) { const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, h * 0.35, 5), std(0xffffff, { roughness: 0.4 })); cap.position.set(0.2, h - h * 0.17, 0); cap.scale.z = 3.2; dyn.add(cap); }
          // 휘어진 지층 줄무늬 (습곡)
          for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 24; i++) { const x = -3.9 + i * 7.8 / 24; const fx = Math.abs(x) < 1.4 ? Math.sin((x + 1.4) / 1.4 * Math.PI) * 0.28 * t * (k % 2 ? 1 : -1) : 0; pts.push(new THREE.Vector3(x, -0.18 - k * 0.22 + fx + (Math.abs(x) < 1.4 ? Math.max(0, h * 0.35 * (1 - Math.abs(x) / 1.4)) * (k === 0 ? 1 : 0.6 - 0.2 * k) : 0), DEP / 2 + 0.03)); } dyn.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.03, 6), std(k % 2 ? 0xe8d5a3 : 0x7a5f3a))); }
          [[-1, '→'], [1, '←']].forEach((d) => { const a = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), dmat(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.6 })); a.position.set(d[0] * 3.2, 0.5, 0); a.rotation.z = -d[0] * (-Math.PI / 2); dyn.add(a); });
          L(0, '습곡 산맥', [0.2, h + 0.35, 0], 'rgba(80,60,40,.92)'); L(1, '대륙판', [-3, 0.35, DEP / 2]); L(2, '대륙판', [3, 0.35, DEP / 2]);
          buildLoops([{ cx: -2.0, cy: -1.75, rx: 1.6, ry: 0.55, dir: -1 }, { cx: 2.0, cy: -1.75, rx: 1.6, ry: 0.55, dir: 1 }]);
          info('<b>수렴형 경계(충돌)</b>: 대륙판끼리 부딪치면 어느 쪽도 가라앉지 못해 지층이 휘어지고 솟아올라 <b>습곡 산맥</b>(히말라야)이 생겨요.');
        } else {
          const dz = t * 1.6;
          const mk = (x0, zs, col) => { const b = new THREE.Mesh(new THREE.BoxGeometry(3.95, 0.55, DEP), std(col, { roughness: 0.85 })); b.position.set(x0, -0.275, zs); dyn.add(b);
            const riv = new THREE.Mesh(new THREE.BoxGeometry(3.95, 0.04, 0.34), std(0x3b9bff, { emissive: 0x174a90, emissiveIntensity: 0.5, roughness: 0.2 })); riv.position.set(x0, 0.01, zs - 0.0); dyn.add(riv);
            const rd = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, DEP - 0.2), std(0xe8e0c8)); rd.position.set(x0 + (x0 < 0 ? -1.4 : 1.4), 0.015, zs); dyn.add(rd); };
          mk(-2.02, dz, 0x8aa66a); mk(2.02, -dz, 0x9ab57a);
          const f = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, DEP + 3.5), std(0xff5a52, { emissive: 0xff2a20, emissiveIntensity: 0.7 })); f.position.set(0, -0.28, 0); dyn.add(f);
          [[-1, 1], [1, -1]].forEach((d) => { const a = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 16), dmat(0xffd34d, { emissive: 0x7a5a00, emissiveIntensity: 0.6 })); a.position.set(d[0] * 3.0, 0.5, d[1] * 1.3); a.rotation.x = d[1] * Math.PI / 2; dyn.add(a); });
          L(0, '변환 단층', [0, 0.35, DEP / 2 + 0.4], 'rgba(220,60,50,.92)'); L(1, '어긋난 강', [-1.6, 0.08, dz + 0.2]); L(2, '지진 발생', [0, 0.9, 0], 'rgba(220,60,50,.92)');
          buildLoops([]);
          info('<b>보존형 경계(변환 단층)</b>: 두 판이 어긋나게 스쳐 지나가요. 지층이 어긋나 강과 길이 끊기고, 판이 걸렸다 풀리며 지진이 일어나요.');
        }
        conG.visible = conv && mode !== 'trans';
        slider && slider.set(Math.round(s * 100));
      }
      const segB = controls.segment('경계', [{ value: 'div', label: '발산' }, { value: 'sub', label: '섭입' }, { value: 'col', label: '충돌' }, { value: 'trans', label: '보존' }], mode, (v) => { mode = v; s = 0; play = false; bP.textContent = '▶ 재생'; orbit.theta = v === 'trans' ? 0.6 : 0.35; orbit.phi = v === 'trans' ? 0.95 : 1.12; paint(); });
      const slider = controls.range('시간', 0, 100, 1, 0, (v) => { s = v / 100; play = false; bP.textContent = '▶ 재생'; paint(); }, (v) => v + '%');
      const bP = controls.button('▶ 재생', () => { if (s >= 0.99) s = 0; play = !play; bP.textContent = play ? '❚❚ 멈춤' : '▶ 재생'; });
      const bC = controls.button('맨틀 대류 ✓', () => { conv = !conv; bC.classList.toggle('on', conv); bC.textContent = '맨틀 대류 ' + (conv ? '✓' : '✕'); paint(); }); bC.classList.add('on');
      s = 0.35; paint();
      return {
        update(dt, t) {
          if (play) { s += dt * 0.08; if (s >= 1) { s = 1; play = false; bP.textContent = '↺ 다시'; } paint(); }
          loops.forEach((lp, i) => lp.dots.forEach((d, k) => { const u = ((t * 0.09 + k / 6) % 1 + 1) % 1; d.position.copy(lp.curve.getPointAt(u)); }));
        },
        sync() {},
      };
    },
  });
})();
