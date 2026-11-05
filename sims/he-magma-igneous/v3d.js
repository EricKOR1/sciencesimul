/* he-magma-igneous · 3D 마그마가 생기는 곳과 화성암의 조직
   [해령] 맨틀이 올라오며 압력이 줄어 녹아요. [섭입대] 가라앉는 판에서 물이 빠져나와 맨틀의 녹는점이 낮아져요. [열점] 맨틀 깊은 곳의 뜨거운 기둥이 올라와요.
   [암석 조직] 마그마가 땅속 깊이에서 천천히 식으면 결정이 크고(심성암), 지표에서 빨리 식으면 결정이 작아요(화산암). 색은 SiO₂ 함량이 달라서 생겨요.
   2D와 같은 장면·같은 값: 장소(해령·열점·섭입대·대륙 지각 하부)와 깊이·물·열은 2D 조작판을 따라가고(S.place · S.depthV · S.waterV · S.heatV), 3D에서 장소를 바꾸면 2D도 바뀌어요.
   암석 조직은 2D '화성암 분류'와 같은 6종(성분 × 식는 속도). ▶ 는 열점 위로 판이 움직이며 화산이 줄지어 생기는 모습이에요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const lerp = (a, b, t) => a + (b - a) * t;
  const VIEWS = [['ridge', '해령'], ['hot', '열점'], ['arc', '섭입대'], ['crust', '대륙 지각 하부'], ['rock', '화성암 분류']];
  const XW = 5, ZD = 1.7;

  window.SciSim3D.attach({
    title: '마그마와 화성암 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0],             // 1단계(용암 흐름) · 2단계(정출 순서) · 3단계(카드 끌어 분류표 채우기)는 2D 화면에서 해요
    camera: { dist: PHONE ? 17 : 12.5, theta: 0.4, phi: 1.2, min: 6, max: 26, target: [0, -1.2, 0] },
    autoRotate: 0,
    build(ctx) {
      if (ctx.THREE.ColorManagement) ctx.THREE.ColorManagement.legacyMode = false;     // 색을 보이는 그대로(sRGB) 쓰도록 맞춰요
      const { THREE, root, label, info, controls } = ctx;
      const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o || {}));
      const glow = (c, i) => std(c, { emissive: c, emissiveIntensity: i == null ? 0.7 : i, roughness: 0.5 });
      const grp = new THREE.Group(), live = new THREE.Group(); root.add(grp, live);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 0.2, 64), std(0x2a3550)); floor.position.y = -3.7; root.add(floor);
      const polyMesh = (pts, mat, d) => { const sh = new THREE.Shape(); pts.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); sh.closePath(); const g = new THREE.ExtrudeGeometry(sh, { depth: d || ZD, bevelEnabled: false, curveSegments: 3 }); g.translate(0, 0, -(d || ZD)); const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; grp.add(m); return m; };
      const arrow = (parent, col, len, rad) => { const g = new THREE.Group(), m = std(col, { emissive: col, emissiveIntensity: 0.35, roughness: 0.4 }), s = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len - rad * 4, 12), m), h = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.3, rad * 4.4, 16), m); s.position.y = (len - rad * 4) / 2; h.position.y = len - rad * 2.2; g.add(s, h); parent.add(g); return g; };
      const LB = { a: label('', [0, 0, 0], { size: 12 }), b: label('', [0, 0, 0], { size: 12 }), c: label('', [0, 0, 0], { size: 12 }), d: label('', [0, 0, 0], { size: 12 }), e: label('', [0, 0, 0], { size: 12 }) };
      const setL = (k, t, pos, col) => { LB[k].set(t); LB[k].obj = pos; LB[k].show(!!t); LB[k].el.style.background = col || ''; };

      /* ----- 암석 조직 질감 (보로노이) ----- */
      const PAL = {
        light: [['#d5d9dc', 3], ['#eab9aa', 4], ['#f4f1ea', 3], ['#2c2c30', 1]],
        mid: [['#cfd0d2', 4], ['#3b3f43', 4], ['#b4b8bd', 2], ['#e4e1da', 1]],
        dark: [['#2b3036', 5], ['#5d6c4b', 1], ['#8b9096', 3], ['#1c1f24', 3]],
      };
      function rockTex(cls, coarse) {
        const S = 192, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), im = g.createImageData(S, S);
        const n = coarse ? 30 : 420, pts = [], pal = PAL[cls], tot = pal.reduce((a, p) => a + p[1], 0); let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
        for (let i = 0; i < n; i++) { let r = rnd() * tot, k = 0; while (r > pal[k][1] && k < pal.length - 1) { r -= pal[k][1]; k++; } const base = hex(pal[k][0]), v = 0.88 + rnd() * 0.24; pts.push([rnd() * S, rnd() * S, base.map((x) => Math.min(255, x * v))]); }
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          let d1 = 1e9, d2 = 1e9, b = 0;
          for (let i = 0; i < n; i++) { for (let ox = -1; ox <= 1; ox++) { const dx = x - pts[i][0] + ox * S, dy = y - pts[i][1]; const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; b = i; } else if (d < d2) d2 = d; } if (false) break; }
          const e = Math.sqrt(d2) - Math.sqrt(d1), line = e < (coarse ? 1.6 : 0.6), col = pts[b][2], o = (y * S + x) * 4, k = line ? 0.45 : 1;
          im.data[o] = col[0] * k; im.data[o + 1] = col[1] * k; im.data[o + 2] = col[2] * k; im.data[o + 3] = 255;
        }
        g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
      }
      const ROCKN = { light: { c: '화강암', f: '유문암' }, mid: { c: '섬록암', f: '안산암' }, dark: { c: '반려암', f: '현무암' } };

      let view = 'ridge', cool = 'deep', col = 'light', partic = [], sample = null, cones = [], plume = null, spinners = [];
      const clear = () => { while (grp.children.length) { const c = grp.children.pop(); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); } while (live.children.length) live.remove(live.children[0]); partic = []; sample = null; cones = []; plume = null; spinners = []; Object.keys(LB).forEach((k) => LB[k].show(false)); };
      const MAN = std(0xb06a3b, { roughness: 0.9 }), LITH = std(0x6b7c91, { roughness: 0.85 }), CRUST = std(0x394557, { roughness: 0.85 }), CONT = std(0x8a6a4a, { roughness: 0.9 }), MELT = glow(0xff7a2e, 0.9);
      const dots = (n, color, size) => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(size || 0.08, 10, 8), new THREE.MeshBasicMaterial({ color }), n); live.add(m); return m; };

      function build(v) {
        clear(); view = v;
        if (v === 'ridge') {
          polyMesh([[-XW, -3.4], [XW, -3.4], [XW, -1.0], [-XW, -1.0]], MAN);
          polyMesh([[-XW, -1.0], [-0.35, -1.0], [-0.35, 0], [-XW, 0]], LITH); polyMesh([[XW, -1.0], [0.35, -1.0], [0.35, 0], [XW, 0]], LITH);
          polyMesh([[-XW, -0.12], [-0.35, -0.12], [-0.35, 0], [-XW, 0]], CRUST); polyMesh([[XW, -0.12], [0.35, -0.12], [0.35, 0], [XW, 0]], CRUST);
          const mg = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), MELT);  mg.position.set(0, -1.7, 0); mg.scale.set(1.8, 0.75, 1.1); grp.add(mg);
          const dk = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.3, ZD + 0.02), MELT); dk.position.set(0, -0.5, -ZD / 2 + 0.01); grp.add(dk);
          [-1, 1].forEach((s) => { const a = arrow(grp, 0xffd34d, 1.5, 0.09); a.position.set(s * 2.4, 0.25, 0.3); a.rotation.z = -s * Math.PI / 2; });
          partic = [{ m: dots(26, 0xffd9a8), n: 26, f: (u, i) => { const side = i % 2 ? 1 : -1, a = u < 0.5 ? u / 0.5 : 1, b = u < 0.5 ? 0 : (u - 0.5) / 0.5; return [side * (0.15 + (i * 0.37 % 1) * 0.5 + b * 2.6), lerp(-3.1, -1.3, a) - b * 0.05, 0.3 - ((i * 0.61) % 1) * 1.6]; } }];
          setL('a', '해령 (판이 벌어져요)', [0, 0.45, 0.2], 'rgba(30,50,80,.9)'); setL('b', '맨틀이 올라오며 압력이 줄어 녹아요', [0, -1.7, 0.2], 'rgba(150,60,10,.92)'); setL('c', '현무암질 마그마', [0, -0.45, 0.2]);
          info('<b>해령</b>: 판이 벌어지며 맨틀이 올라와요. 온도는 거의 그대로여도 <b>압력이 줄어</b> 녹아요(감압 용융).<br>만들어지는 마그마는 <b>현무암질</b>이에요.');
        } else if (v === 'arc') {
          polyMesh([[-XW, -3.4], [XW, -3.4], [XW, -1.3], [0.4, -1.3], [-XW, -1.3]], MAN);
          polyMesh([[0.2, -1.3], [XW, -1.3], [XW, 0], [0.2, 0]], CONT);
          polyMesh([[-XW, 0], [-0.4, 0], [3.0, -3.3], [2.1, -3.4], [-0.4, -0.9], [-XW, -0.9]].map((p) => p), LITH);
          polyMesh([[-XW, 0], [-0.4, 0], [-0.4, -0.12], [-XW, -0.12]], CRUST);
          const mg = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), MELT); mg.scale.set(1.4, 0.7, 1.0); mg.position.set(2.5, -1.8, 0); grp.add(mg);
          const dk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.0, 12), MELT); dk.position.set(2.9, -0.95, -0.1); dk.rotation.z = 0.09; grp.add(dk);
          const vol = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.0, 28), std(0x6b4a35)); vol.position.set(3.0, 0.5, -ZD / 2); grp.add(vol);
          const ar = arrow(grp, 0xffd34d, 1.6, 0.09); ar.position.set(-2.8, -0.05, 0.3); ar.rotation.z = -Math.PI / 2 - 0.0; ar.rotation.z = -1.0;
          partic = [{ m: dots(26, 0x7fd8ff, 0.07), n: 26, f: (u, i) => { const x0 = 0.9 + ((i * 0.37) % 1) * 0.3; return [lerp(x0, 2.2 + ((i * 0.53) % 1) * 0.5, u), lerp(-2.7 + ((i * 0.37) % 1) * 0.3, -1.9, u), 0.3 - ((i * 0.61) % 1) * 1.6]; } },
            { m: dots(14, 0xffb066, 0.08), n: 14, f: (u, i) => [lerp(2.6, 3.0, u) + Math.sin(u * 8 + i) * 0.04, lerp(-1.9, 0.3, u), -0.3 - ((i * 0.61) % 1) * 0.3] }];
          setL('a', '섭입하는 해양판', [-2.2, -0.35, 0.2], 'rgba(30,50,80,.9)'); setL('b', '판에서 물이 빠져나와요', [1.2, -2.3, 0.2], 'rgba(15,100,150,.92)'); setL('c', '용융점이 낮아져 마그마 생성', [2.4, -1.9, 0.2], 'rgba(150,60,10,.92)'); setL('d', '화산', [3.0, 1.1, -ZD / 2]);
          info('<b>섭입대</b>: 가라앉는 판에서 <b>물</b>이 빠져나와 맨틀의 녹는점이 낮아져요(<b>물 때문에 녹아요</b>).<br>마그마가 올라와 화산을 만들어요.');
        } else if (v === 'hot') {
          polyMesh([[-XW, -3.4], [XW, -3.4], [XW, -1.0], [-XW, -1.0]], MAN);
          polyMesh([[-XW, -1.0], [XW, -1.0], [XW, 0], [-XW, 0]], LITH); polyMesh([[-XW, -0.12], [XW, -0.12], [XW, 0], [-XW, 0]], CRUST);
          plume = new THREE.Group(); grp.add(plume);
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 2.4, 20), MELT); st.position.y = -2.2; plume.add(st); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 18), MELT); hd.position.y = -1.15; hd.scale.y = 0.8; plume.add(hd);
          const ar = arrow(grp, 0xffd34d, 1.5, 0.09); ar.position.set(-3.8, 0.3, 0.3); ar.rotation.z = -Math.PI / 2;
          for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1, 28), std(k === 0 ? 0x7a4a2f : 0x5d5448)); grp.add(c); cones.push(c); }
          partic = [{ m: dots(22, 0xffd9a8), n: 22, f: (u, i) => [Math.sin(i * 2.1) * 0.12 * (1 + u), lerp(-3.2, -1.1, u), Math.cos(i * 2.1) * 0.12 * (1 + u)] }];
          setL('a', '열점 (뜨거운 맨틀 기둥)', [0, -2.4, 0.5], 'rgba(150,60,10,.92)'); setL('b', '판이 움직여요', [-3.6, 1.0, 0.3], 'rgba(30,50,80,.9)'); setL('c', '새 화산', [0, 1.3, -ZD / 2]); setL('d', '오래된 화산섬', [3.2, 0.9, -ZD / 2]);
          info('<b>열점</b>: 맨틀 깊은 곳의 뜨거운 기둥이 올라와 마그마를 만들어요.<br>판이 움직이면 화산이 <b>줄지어</b> 생기고, 멀수록 오래된 섬이에요.');
        } else if (v === 'crust') {
          polyMesh([[-XW, -3.4], [XW, -3.4], [XW, 0], [-XW, 0]], CONT);
          polyMesh([[-XW, -3.4], [XW, -3.4], [XW, -2.4], [-XW, -2.4]], std(0x7a5a42, { roughness: 0.9 }));
          const mg = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), MELT); mg.scale.set(2.2, 0.55, 1.1); mg.position.set(0, -3.55, 0); grp.add(mg);
          const zone = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), MELT); zone.scale.set(1.5, 0.45, 0.9); zone.position.set(0, -2.1, 0); zone.userData.k = 'zone'; grp.add(zone);
          [-1.5, 0, 1.5].forEach((x) => { const a = arrow(grp, 0xff9a5a, 1.0, 0.07); a.position.set(x, -3.1, 0.4); });
          partic = [{ m: dots(24, 0xffa070, 0.07), n: 24, f: (u, i) => [Math.sin(i * 2.4) * (0.4 + (i % 5) * 0.35), lerp(-3.3, -2.0, u), Math.cos(i * 1.7) * 0.5] }];
          setL('a', '대륙 지각 하부', [-3.0, -1.4, 0.2], 'rgba(30,50,80,.9)'); setL('b', '아래의 마그마가 열을 줘요', [0, -3.75, 0.4], 'rgba(150,60,10,.92)'); setL('c', '암석 온도가 올라 녹아 마그마가 돼요', [0, -2.1, 0.4]);
          info('<b>대륙 지각 하부</b>: 아래에서 올라온 마그마의 <b>열</b>을 받아 암석의 온도가 녹는 온도(약 750 °C)를 넘으면 녹아요(열 공급 용융).');
        } else {
          polyMesh([[-XW, -3.4], [XW, -3.4], [XW, 0], [-XW, 0]], CONT);
          const pl = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), glow(0xe0522a, 0.55)); pl.scale.set(1.9, 0.9, 1.0); pl.position.set(-1.6, -1.9, 0); pl.userData.k = 'pl'; grp.add(pl);
          const dk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 2.2, 12), glow(0xe0522a, 0.55)); dk.position.set(0.3, -0.9, -0.1); dk.rotation.z = 1.0; grp.add(dk);
          const vol = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.3, 32), std(0x5c4636)); vol.position.set(1.7, 0.65, -0.6); grp.add(vol);
          const lava = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 20), glow(0xff6a2a, 0.9)); lava.position.set(1.7, 1.45, -0.6); lava.userData.k = 'lava'; grp.add(lava);
          sample = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), new THREE.MeshStandardMaterial({ roughness: 0.7 })); sample.position.set(-3.4, 1.8, 0); sample.rotation.set(0.4, 0.6, 0); live.add(sample);
          setL('a', '땅속 깊이서 천천히 식음 (심성암)', [-1.6, -0.55, 0.3], 'rgba(140,50,10,.92)'); setL('b', '지표에서 빨리 식음 (화산암)', [1.7, 1.9, -0.6], 'rgba(140,50,10,.92)'); setL('c', '', [0, 0, 0]);
          applyRock();
        }
        applyArrows();
      }
      function applyRock() {
        if (view !== 'rock') return;
        const coarse = cool === 'deep'; if (sample.material.map) sample.material.map.dispose(); sample.material.map = rockTex(col, coarse); sample.material.needsUpdate = true;
        const nm = ROCKN[col][coarse ? 'c' : 'f'], sio = { light: '산성(SiO₂ 63 % 초과)', mid: '중성(52~63 %)', dark: '염기성(52 % 미만)' }[col];
        setL('c', nm + ' · ' + sio + (coarse ? ' · 결정이 커요' : ' · 결정이 작아요'), [-3.4, 3.1, 0], 'rgba(15,23,42,.92)');
        grp.children.forEach((o) => { if (o.userData.k === 'pl') o.material.emissiveIntensity = coarse ? 1.1 : 0.3; if (o.userData.k === 'lava') o.material.emissiveIntensity = coarse ? 0.35 : 1.2; });
        info('<b>' + (coarse ? '심성암' : '화산암') + '</b>: 마그마가 ' + (coarse ? '땅속 깊이에서 <b>천천히</b> 식어 결정이 <b>커요</b>(조립질)' : '지표에서 <b>빨리</b> 식어 결정이 <b>작아요</b>(세립질)') + '.<br>' + (col === 'light' ? '밝은색: SiO₂가 많아 석영·장석이 많아요.' : col === 'dark' ? '어두운색: SiO₂가 적고 휘석·감람석이 많아요.' : '중간색: SiO₂ 함량이 중간이에요.') + ' → <b>' + nm + '</b>');
      }
      const applyArrows = () => {};

      const L2 = () => ctx.lesson();
      const set2D = (v) => { try { const l = L2(); if (!l || !l.S) return; if (v === 'rock') { if (l.S.mode !== 'class' && l.setMode) { l.setMode('class'); l.updateCtl && l.updateCtl(); } } else { if (l.S.mode !== 'gen' && l.setMode) l.setMode('gen'); if (l.S.place !== v && l.setPlace) l.setPlace(v); l.updateCtl && l.updateCtl(); } } catch (e) {} };
      const segV = controls.segment('보기', VIEWS.filter((x) => x[0] !== 'rock').map((x) =>   // 3D 단계(마그마 생성)에서는 변동대 장면만 골라요
         ({ value: x[0], label: x[1] })), view, (v) => { set2D(v); build(v); showCtl(); showRows(); });
      const gc = (() => { const probe = controls.text(''); const el = probe.parentElement; el.removeChild(probe); return el; })();
      const n0 = gc.children.length;
      controls.segment('냉각 장소', [{ value: 'deep', label: '땅속 깊이' }, { value: 'surf', label: '지표' }], cool, (v) => { cool = v; applyRock(); });
      controls.segment('색', [{ value: 'light', label: '밝은색(산성)' }, { value: 'mid', label: '중간색(중성)' }, { value: 'dark', label: '어두운색(염기성)' }], col, (v) => { col = v; applyRock(); });
      const rockEls = [].slice.call(gc.children, n0);
      const showCtl = () => rockEls.forEach((e) => (e.style.display = view === 'rock' ? '' : 'none'));

      /* 2D 실험에서 시작 장소 읽기 */
      try { const S = window.__sim && window.__sim.S; if (S) { if (S.mode === 'class') view = 'rock'; else if (['arc', 'hot', 'ridge', 'crust'].indexOf(S.place) >= 0) view = S.place; } } catch (e) {}
      segV.set(view); build(view); showCtl();
      /* 맨틀 물질(암석 덩어리): 2D의 깊이·물·열 값으로 위치와 용융 %를 보여 줘요 */
      const parcel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.55), new THREE.MeshStandardMaterial({ color: 0x8d8f7c, roughness: 0.7, emissive: 0xff5a14, emissiveIntensity: 0 })); root.add(parcel);
      const pLab = label('', parcel, { size: 12, color: 'rgba(15,23,42,.92)', offset: [1.2, 0.5, 0] });
      let pKey = '', hotP = 0.3, hotPl = null;
      hotPl = controls.player({
        duration: 10, loop: true, autoplay: false, label: '판이 움직여요',
        phases: [[0, '새 화산이 생겨요'], [0.5, '화산이 멀어지며 낡아요']],
        onFrame(p) { hotP = p; },
      });
      hotPl.set(0.3); hotPl.pause();
      const hotRow = hotPl && gc.querySelector('.v3-player');
      function showRows() { if (hotRow) hotRow.style.display = view === 'hot' ? '' : 'none'; }
      showRows();
      const baseShow = showCtl;
      let lastMode = null, lastPlace = null;
      function syncFrom2D() {
        const l = L2(), S = l && l.S; if (!S) return;
        if (S.mode !== lastMode || S.place !== lastPlace) {
          lastMode = S.mode; lastPlace = S.place;
          const nv = S.mode === 'class' ? 'rock' : S.mode === 'gen' ? S.place : null;
          if (nv && nv !== view && VIEWS.some((x) => x[0] === nv)) { segV.set(nv); build(nv); showCtl(); showRows(); }
        }
      }
      function updParcel() {
        const l = L2(), g = l && l.genState && l.S && l.S.mode === 'gen' ? l.genState() : null;
        parcel.visible = !!g && view !== 'rock'; pLab.show(parcel.visible);
        if (!g) return;
        const k = Math.max(0, Math.min(1, g.melt / 5));
        parcel.material.emissiveIntensity = k * 0.9; parcel.material.color.setHex(k > 0 ? 0xd9a07a : 0x8d8f7c);
        MELT.emissiveIntensity = 0.3 + 0.7 * k;
        const pos = view === 'ridge' || view === 'hot' ? [view === 'hot' ? 1.4 : 0.0, -(g.d / 150) * 3.2, 0.9] : view === 'arc' ? [2.5, -1.8, 0.9] : [0, -2.1, 0.9];
        parcel.position.set(pos[0], pos[1], pos[2]);
        const key = view + Math.round(g.d) + '|' + Math.round(g.T) + '|' + Math.round(g.Ts) + '|' + g.melt.toFixed(1) + '|' + Math.round(g.w || 0) + '|' + Math.round(g.h || 0);
        if (key !== pKey) {
          pKey = key;
          const cond = view === 'arc' ? '물 ' + Math.round(g.w) + ' %' : view === 'crust' ? '마그마의 열 ' + Math.round(g.h) + ' %' : '깊이 ' + Math.round(g.d) + ' km';
          pLab.set(cond + '<br>암석 ' + Math.round(g.T) + ' °C · 녹는 온도 ' + Math.round(g.Ts) + ' °C<br><b>' + (g.melt > 0 ? '녹기 시작해요 · 용융 ' + g.melt.toFixed(1) + ' %' : '아직 고체예요') + '</b>');
        }
      }
      const dm = new THREE.Object3D();
      return {
        update(dt, t) {
          syncFrom2D(); updParcel();
          partic.forEach((pa) => { for (let i = 0; i < pa.n; i++) { const u = (i / pa.n + t * 0.16) % 1, p = pa.f(u, i); dm.position.set(p[0], p[1], p[2]); dm.scale.setScalar(1); dm.updateMatrix(); pa.m.setMatrixAt(i, dm.matrix); } pa.m.instanceMatrix.needsUpdate = true; });
          if (view === 'hot' && cones.length) {
            const off = (hotP * 1.9) % 1.9;
            cones.forEach((c, k) => { const x = off + k * 1.9, age = x / 5.6, h = x < 0.5 ? 1.3 * (x / 0.5) : 1.3 * Math.max(0.08, 1 - age * 1.05); c.position.set(x - 0.0, h / 2 + 0.0, -ZD / 2); c.scale.set(1 - age * 0.35, Math.max(0.05, h), 1 - age * 0.35); c.visible = x < 5.0; c.material.color.setHex(k === 0 && x < 1.0 ? 0x7a4a2f : 0x5d5448); });
            LB.c.obj = [off, 1.5, -ZD / 2]; LB.d.obj = [off + 1.9 * 1.5, 1.0, -ZD / 2];
            if (plume) plume.scale.setScalar(1 + 0.03 * Math.sin(t * 3));
          }
          if (sample) { sample.rotation.y += dt * 0.35; }
        },
        sync() {},
      };
    },
  });
})();
