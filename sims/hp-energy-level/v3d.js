/* hp-energy-level · 3D 수소 원자의 에너지 준위
   2D 실험(window.__sim)의 장면을 그대로 입체로 보여 줘요: 🔭 분광기(선스펙트럼) · 🪜 에너지 사다리(E = 1240 ÷ λ) · ⚛️ 보어 모형(전이 · 방출 · 흡수) · 🔬 한계(전자 구름).
   E(n) = −13.6 eV ÷ n², 광자 에너지 E = 1240 ÷ λ (nm→eV). 전이·광자 에너지·광원은 옆 조작판이 정하고 3D는 따라가요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.3 : 1;
  const LV = () => (typeof window.SciSimLevel === 'number' ? window.SciSimLevel : 0);
  const TAU = Math.PI * 2, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function tools(THREE) {
    const V3 = THREE.Vector3, Y = new V3(0, 1, 0);
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const glass = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, metalness: 0, transparent: true, opacity: op == null ? 0.25 : op, depthWrite: false });
    function mkArrow(col, rad) {
      const g = new THREE.Group(), m = M(col, { roughness: 0.4 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m), hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 16), m);
      g.add(sh, hd); g.userData = { sh, hd, rad }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(), { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Y, d.normalize());
    }
    function tube(pts, r, col, o, closed) {
      const c = new THREE.CatmullRomCurve3(pts, !!closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, pts.length * 3), r, 8, !!closed), (o && o.basic) ? new THREE.MeshBasicMaterial({ color: col, transparent: !!o.op, opacity: o.op || 1 }) : M(col, o));
    }
    function disc(r, col, y, op) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, transparent: op != null, opacity: op == null ? 1 : op })); m.rotation.x = -Math.PI / 2; m.position.y = y || 0; m.receiveShadow = true; return m; }
    function grid(w, d, step, col, y, op) {
      const pts = []; for (let x = -w / 2; x <= w / 2 + 1e-6; x += step) pts.push(x, 0, -d / 2, x, 0, d / 2); for (let z = -d / 2; z <= d / 2 + 1e-6; z += step) pts.push(-w / 2, 0, z, w / 2, 0, z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op == null ? 0.3 : op })); l.position.y = y || 0; return l;
    }
    function arc(r, a0, a1, rad, col, n) { // xz 평면 위의 호
      const pts = []; n = n || 40; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(new V3(r * Math.cos(a), 0, r * Math.sin(a))); }
      return tube(pts, rad, col);
    }
    return { V3, Y, M, glass, mkArrow, setArrow, tube, disc, grid, arc };
  }
  function wl2rgb(nm) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else if (nm <= 780) r = 1;
    if (nm < 380 || nm > 780) { r = 0.72; g = 0.55; b = 1; }
    return [r, g, b];
  }
  const f2 = (v) => (Math.round(v * 100) / 100).toFixed(2);
  const NM2X = (nm) => (nm - 400) / 300 * 10 - 3;             // 400~700 nm → 가로 위치 (스펙트럼 띠)
  window.SciSim3D.attach({
    title: '수소 원자 에너지 준위 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대 · 값은 옆 조작판에서 바꿔요',
    camera: { dist: 19 * KD, theta: 0.15, phi: 1.3, min: 5, max: 40, target: [0, -1.5, 0] },
    autoRotate: 0,
    levels: [3],   // 1~3단계는 기록 버튼·계산 사다리·캔버스 준위 누르기가 필요해서 2D, 4단계(한계: 헬륨·전자 구름·흡수선)는 3D
    build(ctx) {
      const { THREE, root, label, info, controls, orbit } = ctx;
      const { V3, M, tube, mkArrow, setArrow } = tools(THREE);
      const sim = () => ctx.lesson();
      const gS = new THREE.Group(), gL = new THREE.Group(), gB = new THREE.Group(), gC = new THREE.Group(); root.add(gS, gL, gB, gC);
      const rgbHex = (nm) => { const c = wl2rgb(nm); return new THREE.Color(c[0], c[1], c[2]); };
      /* ---- 스펙트럼 띠 만들기 (같은 식: 연속 / 선) ---- */
      function strip(g, x0, y0, w, h) {
        const cv = document.createElement('canvas'); cv.width = 600; cv.height = 48; const cx = cv.getContext('2d'); const tex = new THREE.CanvasTexture(cv);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })); m.position.set(x0 + w / 2, y0, 0); g.add(m);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.05), M(0x1c2540, { roughness: 1 })); fr.position.set(x0 + w / 2, y0, -0.06); g.add(fr);
        return { m, draw(o) {
          cx.fillStyle = '#05070d'; cx.fillRect(0, 0, 600, 48);
          for (let i = 0; i < 600; i++) { const nm = 400 + 300 * i / 599; if (o.cont) { const k = o.cont(nm), c = wl2rgb(nm); cx.fillStyle = 'rgb(' + Math.round(c[0] * 255 * k) + ',' + Math.round(c[1] * 255 * k) + ',' + Math.round(c[2] * 255 * k) + ')'; cx.fillRect(i, 0, 1, 48); } }
          (o.dark || []).forEach((d) => { const x = (d.nm - 400) / 300 * 599; cx.fillStyle = 'rgba(5,7,13,' + d.d + ')'; cx.fillRect(x - 3, 0, 6, 48); });
          (o.lines || []).forEach((l) => { const c = wl2rgb(l.nm), x = (l.nm - 400) / 300 * 599, a = Math.max(0.3, l.a == null ? 1 : l.a); cx.fillStyle = 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + a + ')'; cx.fillRect(x - 3, 0, 6, 48); cx.fillStyle = 'rgba(255,255,255,' + 0.5 * a + ')'; cx.fillRect(x - 1, 0, 2, 48); });
          tex.needsUpdate = true; } };
      }
      const rulerLabs = [];
      function ruler(g, x0, y, w, yl) { [400, 500, 600, 700].forEach((nm) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), M(0xc8d3ee)); t.position.set(NM2X(nm), y - 0.7, 0); g.add(t); rulerLabs.push([label(nm + ' nm', [NM2X(nm), y - 1.05, 0], { color: '#475569', size: 11 }), g]); }); }
      /* ================= 🔭 분광기 ================= */
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), M(0xfff3c4, { emissive: 0xffc800, emissiveIntensity: 0.7 })); lamp.position.set(-8.5, 2.2, 0); gS.add(lamp);
      const tubeS = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 16), M(0xe879f9, { emissive: 0x7a2d8a, emissiveIntensity: 0.6 })); tubeS.rotation.z = Math.PI / 2; tubeS.position.set(-8.5, 2.2, 0); gS.add(tubeS);
      const slit = [1, -1].map((s) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.5), M(0x394258)); b.position.set(-6.0, 2.2 + s * 0.55, 0); gS.add(b); return b; });
      const prism = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.2, 3), new THREE.MeshStandardMaterial({ color: 0x9ad0ff, roughness: 0.1, transparent: true, opacity: 0.6 })); prism.rotation.x = Math.PI / 2; prism.position.set(-3.2, 2.2, 0); gS.add(prism);
      const beamS = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.8 })); gS.add(beamS);
      const fan = new THREE.Group(); gS.add(fan);
      const stS = strip(gS, -3, -2.3, 10, 1.2); ruler(gS, -3, -2.3, 10);
      const cur = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 3), M(0xffffff)); cur.rotation.z = Math.PI; gS.add(cur);
      const curL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff })); gS.add(curL);
      const lSrc = label('', lamp, { color: '#3a465c', size: 12 }), lSl = label('슬릿', slit[0], { color: '#5a6679', size: 12 }), lPr = label('프리즘', prism, { color: '#5a6679', size: 12 }), lCur = label('', cur, { color: '#394258', size: 12 }), lKind = label('', [2, -0.6, 0], { color: '#7c5cff', size: 13 });
      const recM = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), M(0xffffff, { emissive: 0x888888 })); m.visible = false; gS.add(m); recM.push(m); }
      let spKey = '';
      function spec(A, S) {
        const s = S.s, src = A.SRC[s.src], H = s.src === 'incand';
        lamp.visible = H; tubeS.visible = !H; tubeS.material.color.set(src.tint); tubeS.material.emissive.set(src.tint); tubeS.material.emissiveIntensity = 0.5;
        lSrc.set(src.name); lSrc.off = [0, 1.1, 0];
        const key = s.src + '|' + Object.keys(s.rec).join(','); const lines = H ? [] : (s.src === 'H' ? A.LINES.H.map((l) => ({ nm: l.nm, a: l.a * (s.rec[l.nm] ? 1 : 0.88) })) : A.LINES[s.src]);
        if (key !== spKey) {
          spKey = key; stS.draw({ cont: H ? (nm) => 0.28 + 0.72 * Math.pow((nm - 400) / 300, 1.1) : null, lines });
          while (fan.children.length) { const c = fan.children[0]; fan.remove(c); c.geometry.dispose(); }
          const ex = new V3(-2.2, 2.2, 0);
          if (H) { const sh = new THREE.Shape([new THREE.Vector2(ex.x, ex.y), new THREE.Vector2(NM2X(400), -1.7), new THREE.Vector2(NM2X(700), -1.7)]); const mm = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })); fan.add(mm); }
          else lines.forEach((l) => { const t = tube([ex, new V3(NM2X(l.nm), -1.7, 0)], 0.02, rgbHex(l.nm).getHex(), { basic: true, op: 0.35 + 0.5 * l.a }); fan.add(t); });
        }
        beamS.scale.x = 3.2; beamS.position.set(-4.6, 2.2, 0); beamS.material.color.set(H ? 0xfff3c4 : src.tint);
        const nl = lines.reduce((b, l) => (Math.abs(l.nm - s.nm) <= 4 && (!b || Math.abs(l.nm - s.nm) < Math.abs(b.nm - s.nm)) ? l : b), null);
        cur.position.set(NM2X(s.nm), -1.45, 0); curL.position.set(NM2X(s.nm), -2.3, 0); lCur.set(nl ? '선 발견! ' + nl.nm + ' nm' : s.nm + ' nm'); lCur.el.style.background = nl ? '#e2552a' : '#394258'; lCur.off = [0, 0.55, 0];
        cur.material.color.set(nl ? 0xffd447 : 0xffffff);
        lKind.obj = [2, -3.8, 0]; lKind.set(src.kind);
        A.LINES.H.forEach((l, i) => { const got = !!s.rec[l.nm]; recM[i].visible = got && s.src === 'H'; if (recM[i].visible) { recM[i].position.set(NM2X(l.nm), -3.0, 0); recM[i].material.color.copy(rgbHex(l.nm)); recM[i].material.emissive.copy(rgbHex(l.nm)); } });
        const got = A.LINES.H.filter((l) => s.rec[l.nm]).length;
        info('<b>🔭 분광기: 광원 → 슬릿 → 프리즘 → 스펙트럼</b><br>광원: <b>' + src.name + '</b> · ' + src.kind + '<br>' + (H ? '백열등은 보라에서 빨강까지 색이 끊김 없이 이어져요 (연속 스펙트럼).' : '선스펙트럼: 몇 개의 밝은 선만 보여요. 원소마다 선의 위치가 달라요.') + '<br>수소의 밝은 선 기록: ' + got + ' / 4 (눈금을 선에 맞춰 옆 조작판에서 기록해요)');
      }
      /* ================= 🪜 에너지 사다리 ================= */
      const stL1 = strip(gL, -5, 3.2, 10, 0.9), stL2 = strip(gL, -5, 1.6, 10, 0.9);
      const lA = label('(A) 전자 에너지가 연속적이면 → 아무 색이나 나와요', [0, 3.2 + 0.9, 0], { color: '#c2410c', size: 12 }), lB = label('(B) 특정 값만 가지면 → 몇 개의 선만 나와요', [0, 1.6 + 0.9, 0], { color: '#1d4ed8', size: 12 }), lObs = label('관찰은 (B)를 닮았어요', [3.2, -0.2, 0], { color: '#14653b', size: 12 });
      const axisL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 5.4, 0.06), M(0x8a95a8)); axisL.position.set(-4.4, -2.0, 0); gL.add(axisL);
      const baseL = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 0.1), M(0x2f6df6)); baseL.position.set(-0.2, -4.5, 0); gL.add(baseL);
      const lBase = label('0 (맨 아래 준위)', [3.8, -4.5, 0], { color: '#1d4ed8', size: 12 }), lEax = label('E (eV)', [-4.4, 0.9, 0], { color: '#475569', size: 12 });
      const rungs = [], rungArr = [], rungLab = [];
      for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, 0.14), M(0xffffff)); gL.add(r); rungs.push(r); const ar = mkArrow(0xffffff, 0.04); gL.add(ar); rungArr.push(ar); rungLab.push(label('', [4, 0, 0], { color: '#26324a', size: 12 })); }
      const eTicks = [0, 1, 2, 3].map((e) => label(String(e), [-4.8, -4.5 + e * 5.4 / 3.2, 0], { color: '#475569', size: 11 }));
      let lKey = '';
      function ladder(A, S) {
        const l = S.l; if (lKey !== 'x') { lKey = 'x'; stL1.draw({ cont: () => 0.85, lines: [] }); stL2.draw({ lines: A.LINES.H.map((q) => ({ nm: q.nm, a: 0.9 })) }); }
        const py = (e) => -4.5 + e / 3.2 * 5.4;
        A.H_LINES.forEach((ln, i) => {
          const a = l.rungA[i]; rungs[i].visible = a > 0.02; rungArr[i].visible = a > 0.02; rungLab[i].show(a > 0.02);
          if (a <= 0.02) return;
          const y = py(A.E_OBS[i]); rungs[i].position.set(-0.2, y, 0); rungs[i].material.color.copy(rgbHex(ln.nm)); rungs[i].material.emissive.copy(rgbHex(ln.nm)); rungs[i].material.emissiveIntensity = 0.5; rungs[i].material.transparent = true; rungs[i].material.opacity = a;
          setArrow(rungArr[i], new V3(-3.4 + i * 0.5, -4.4, 0), new V3(-3.4 + i * 0.5, y - 0.1, 0)); rungArr[i].children.forEach((c) => { c.material = c.material.clone(); c.material.color.copy(rgbHex(ln.nm)); });
          rungLab[i].obj = [4.4, y + (i === 3 ? 0.18 : i === 2 ? -0.18 : 0), 0]; rungLab[i].set(f2(A.E_OBS[i]) + ' eV (' + ln.nm + ' nm)');
        });
        const nOK = l.ok.filter(Boolean).length;
        info('<b>🪜 파장 → 광자 에너지 (E = 1240 ÷ λ)</b><br>' + A.H_LINES.map((ln, i) => ln.nm + ' nm → ' + (l.ok[i] ? '<b>' + f2(A.E_OBS[i]) + ' eV</b> ✅' : '? (옆 조작판에 계산해 써요)')).join('<br>') + '<br>' + (nOK === 0 ? '계산한 값이 맞으면 눈금이 사다리에 놓여요.' : nOK < 4 ? '준위가 띄엄띄엄 놓이고 있어요.' : '에너지가 <b>띄엄띄엄(불연속)</b>한 값만 가져요 → 양자화!'));
      }
      /* ================= ⚛️ 보어 모형 ================= */
      const R = (n) => (24 + 28 * (n - 1)) / 32;
      const lad = (n) => -3 + 6 * (1 - 1 / (n * n));        // 에너지 사다리의 높이 (En에 비례)
      const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), M(0xff6b6b, { emissive: 0x7f1d1d, roughness: 0.35 })); gB.add(nuc);
      const lN = label('원자핵(양성자)', nuc, { color: '#e2464b', size: 12 }); lN.off = [0, 0.55, 0];
      const orbs = []; for (let n = 1; n <= 6; n++) { const o = new THREE.Mesh(new THREE.TorusGeometry(R(n), 0.016, 8, 140), new THREE.MeshBasicMaterial({ color: 0x9db8ff, transparent: true, opacity: 0.55 })); gB.add(o); orbs.push(o); }
      const orbL = [1, 2, 3, 4].map((n) => label('n = ' + n, [R(n) * Math.cos(-0.7), R(n) * Math.sin(-0.7), 0], { color: '#475569', size: 11 }));
      const el = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), M(0x4c8dff, { emissive: 0x1e3a8a, roughness: 0.3 })); gB.add(el); const lE = label('전자', el, { color: '#2f6df6', size: 12 }); lE.off = [0, 0.45, 0];
      // 사다리 (오른쪽)
      const LX = 9.5, ladLines = [], ladLabs = [];
      for (let n = 1; n <= 6; n++) { const b = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.07, 0.07), M(0x2f6df6)); b.position.set(LX, lad(n), 0); gB.add(b); ladLines.push(b); ladLabs.push(label('n=' + n + '  ' + (-13.6 / (n * n)).toFixed(2) + ' eV', [LX - 2.8, lad(n), 0], { color: '#475569', size: 10.5 })); }
      const ionL = label('0 eV (이온화)', [LX + 1.2, 3.35, 0], { color: '#7c5cff', size: 11 });
      const eMk = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), M(0x4c8dff, { emissive: 0x1e3a8a })); gB.add(eMk);
      const trArr = mkArrow(0xffd447, 0.05); gB.add(trArr);
      const stB = strip(gB, -5, -7.6, 10, 1.0); const stBL = label('스펙트럼 (방출된 빛이 도착한 곳)', [0, -6.8, 0], { color: '#475569', size: 11 });
      const phG = new THREE.Group(); gB.add(phG); phG.visible = false;
      const phm = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
      const wave = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 50 }, (_, i) => new V3(i * 0.04 - 1, 0.2 * Math.sin(i * 0.5), 0))), 100, 0.05, 8), phm); phG.add(wave); const lPh = label('', phG, { color: '#26324a', size: 12 }); lPh.off = [0, 0.7, 0];
      const demoB = { p: 0, on: false }; let bKey = '', plB = null;
      function litFrom(list) { return list.map((q) => ({ nm: q.nm, a: 1, kind: q.kind })).filter((q) => q.kind === 'vis'); }
      function setPhoton(ph, x, y, ang, col, txt) { phG.visible = true; phG.position.set(x, y, 0); phG.rotation.z = ang; phm.color.copy(col); lPh.set(txt); lPh.show(true); }
      function bohr(A, S, tm) {
        const b = S.b; let n = b.n, rad = b.rad || A.orbR(n), ang = b.ang, ph = b.photon, lit = b.lit, dem = null;
        const demoOn = demoB.on && !b.photon && !(b.busy > 0);
        if (demoOn) {
          const p = demoB.p, k = Math.min(3, Math.floor(p * 4)), q = p * 4 - k, ni = 3 + k; n = 2; const f = (nn) => A.orbR(nn);
          const E = A.dEn(ni, 2), lam = A.lamOf(E);
          if (q < 0.25) { n = ni; rad = f(ni); } else if (q < 0.45) { const s2 = (q - 0.25) / 0.2, e2 = s2 * s2 * (3 - 2 * s2); n = ni; rad = f(ni) + (f(2) - f(ni)) * e2; if (s2 > 0.5) n = 2; } else { n = 2; rad = f(2); }
          dem = { ni, E, lam, q };
          lit = []; for (let kk = 0; kk <= k; kk++) { if (kk < k || q > 0.9) { const Ek = A.dEn(3 + kk, 2); lit.push({ nm: Math.round(A.lamOf(Ek)), kind: 'vis' }); } }
          ang = tm * 2.0;
        }
        const nf = 1 + (rad - A.orbR(1)) / (A.orbR(2) - A.orbR(1)), Rm = Math.min(9, R(1) + (nf - 1) * (R(2) - R(1)));   // 2D 픽셀 반지름 → 3D 칸 (궤도 사이 간격에 맞춰요)
        el.position.set(Rm * Math.cos(ang), Rm * Math.sin(ang), 0);
        orbs.forEach((o, i) => { const act = i + 1 === (dem ? dem.ni : n) || i + 1 === n; o.material.opacity = act ? 0.95 : 0.35; o.material.color.setHex(act ? 0xffffff : 0x9db8ff); });
        // 사다리 위 전자 · 전이 화살표
        const yEl = lad(Math.max(1, Math.min(6, n))); eMk.position.set(LX + 1.0, yEl, 0);
        if (dem && dem.q > 0.25 && dem.q < 0.9) { setArrow(trArr, new V3(LX - 0.6, lad(dem.ni), 0), new V3(LX - 0.6, lad(2) + 0.1, 0)); } else trArr.visible = false;
        if (b.last && !dem) { /* 마지막 전이는 글자로만 보여 줘요 */ }
        // 광자
        phG.visible = false; lPh.show(false);
        const kk = (kind, lam) => (kind === 'vis' ? rgbHex(Math.round(lam)) : kind === 'uv' ? new THREE.Color(0xa78bfa) : new THREE.Color(0xc2410c));
        const nmX = (kind, lam) => (kind === 'vis' ? NM2X(lam) : kind === 'uv' ? -2.4 : 6.4);
        if (dem && dem.q > 0.45) { const q = Math.min(1, (dem.q - 0.45) / 0.45), s2 = q * q * (3 - 2 * q), x1 = NM2X(dem.lam), y1 = -7.0; const x = x1 * s2, y = y1 * s2; setPhoton(null, x, y, Math.atan2(y1, x1), kk('vis', dem.lam), f2(dem.E) + ' eV · ' + Math.round(dem.lam) + ' nm'); }
        else if (ph && !dem) {
          const q = ph.type === 'emit' ? Math.min(1, ph.p) : Math.min(ph.pass ? 1.6 : 1, ph.p), s2 = q * q * (3 - 2 * q), col = kk(ph.kind, ph.lam);
          if (ph.type === 'emit') { const x1 = nmX(ph.kind, ph.lam), y1 = -7.0, x = x1 * s2, y = y1 * s2; setPhoton(null, x, y, Math.atan2(y1, x1), col, f2(ph.E) + ' eV · ' + Math.round(ph.lam) + ' nm'); }
          else { const x = -6 + (ph.pass ? 12 * Math.min(1, q / 1.6) : 6 * Math.min(1, q)); setPhoton(null, x, 0, 0, col, f2(ph.E) + ' eV · ' + Math.round(ph.lam) + ' nm'); }
        }
        const key = lit.map((q) => q.nm + q.kind).join(',') + (dem ? 'd' : '');
        if (key !== bKey) { bKey = key; stB.draw({ lines: litFrom(lit) }); }
        // 설명
        let t;
        if (dem) t = '<b>⚛️ 보어 모형 · n = ' + dem.ni + ' → 2</b><br>전자가 안쪽 궤도로 내려오며 ΔE = ' + f2(dem.E) + ' eV 의 빛(광자)을 내보내요: λ = 1240 ÷ ΔE = <b>' + Math.round(dem.lam) + ' nm</b><br>가시광선 선 4개(3→2, 4→2, 5→2, 6→2)가 차례로 스펙트럼에 쌓여요.';
        else t = '<b>⚛️ 보어 모형</b> · 전자는 n = ' + b.n + ' 궤도 (E = ' + (-13.6 / (b.n * b.n)).toFixed(2) + ' eV)<br>' + (b.last ? '마지막 전이: <b>' + b.last + '</b>' : '궤도를 옮기거나 광자를 쏘아 보세요 (옆 조작판).') + (ph ? '<br>광자 ' + f2(ph.E) + ' eV · ' + Math.round(ph.lam) + ' nm' : '') + '<br>E(n) = −13.6 ÷ n² eV · 안쪽 궤도로 내려올 때 두 준위의 에너지 차이만큼 빛을 내보내요 (n = 2로 내려오는 빛은 가시광선).';
        info(t);
      }
      /* ================= 🔬 전자 구름 ================= */
      const NCL = 1400, cg = new THREE.BufferGeometry(); { const p = new Float32Array(NCL * 3); let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; for (let i = 0; i < NCL; i++) { // 1s: P(r) ∝ r² e^(−2r/a0): 감마 분포(k=3, θ=a0/2)
          const r = -(Math.log(rnd() + 1e-9) + Math.log(rnd() + 1e-9) + Math.log(rnd() + 1e-9)) * 0.5, th = Math.acos(2 * rnd() - 1), ph = rnd() * TAU; p[i * 3] = r * Math.sin(th) * Math.cos(ph); p[i * 3 + 1] = r * Math.sin(th) * Math.sin(ph); p[i * 3 + 2] = r * Math.cos(th); } cg.setAttribute('position', new THREE.BufferAttribute(p, 3)); }
      const cloud = new THREE.Points(cg, new THREE.PointsMaterial({ color: 0x6aa8ff, size: 0.07, transparent: true, opacity: 0.55, depthWrite: false })); cloud.scale.setScalar(2.4); gC.add(cloud);
      const nucC = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), M(0xff6b6b, { emissive: 0x7f1d1d })); gC.add(nucC);
      const ringC = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.03, 8, 100), new THREE.MeshBasicMaterial({ color: 0x7c5cff })); ringC.rotation.x = Math.PI / 2; gC.add(ringC);
      const lRing = label('보어 반지름 (가장 확률 높은 거리)', [2.4, 0, 0], { color: '#7c5cff', size: 12 }), lCl = label('전자 구름: 전자가 발견될 확률의 분포', [0, 3.4, 0], { color: '#2f6df6', size: 12 });
      /* ================= 장면 · ▶ 재생 ================= */
      plB = controls.player({ duration: 12, loop: true, autoplay: false, label: '가시광선 선 4개', phases: [[0, '3 → 2 (656 nm)'], [0.25, '4 → 2 (486 nm)'], [0.5, '5 → 2 (434 nm)'], [0.75, '6 → 2 (410 nm)']], onFrame(p) { demoB.p = p; demoB.on = p > 0 || !!(plB && plB.playing); } });
      plB.row = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-player');

      /* ================= 🔬 한계 ①: 헬륨 비교 · ③: 흡수선 (분광기 두 줄) ================= */
      const gHe = new THREE.Group(), gAb = new THREE.Group(); root.add(gHe, gAb); gHe.visible = gAb.visible = false;
      const labHe = [], labAb = [];
      const glassM = (c, op) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.1, transparent: true, opacity: op, depthWrite: false });
      function mkRow(g, y0, kind, tint, labs, name) {
        const ay = y0 + 1.6;
        if (kind === 'lamp') { const m = new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 14), M(0xfff3c4, { emissive: 0xffc800, emissiveIntensity: 0.7 })); m.position.set(-9.2, ay, 0); g.add(m); }
        else { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 16), M(new THREE.Color(tint).getHex(), { emissive: new THREE.Color(tint).getHex(), emissiveIntensity: 0.6 })); t.rotation.z = Math.PI / 2; t.position.set(-9.2, ay, 0); g.add(t); }
        if (kind === 'lamp') { const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.5, 24), glassM(0xbfe7ff, 0.35)); cell.rotation.z = Math.PI / 2; cell.position.set(-7.0, ay, 0); g.add(cell); labs.push(label('차가운 수소 기체', cell, { color: '#3b6fb0', size: 12 })); labs[labs.length - 1].off = [0, 1.1, 0]; }
        [1, -1].forEach((sg) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.5), M(0x394258)); b.position.set(-5.3, ay + sg * 0.55, 0); g.add(b); });
        const pr = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.2, 3), glassM(0x9ad0ff, 0.6)); pr.rotation.x = Math.PI / 2; pr.position.set(-3.6, ay, 0); g.add(pr);
        const bm = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: kind === 'lamp' ? 0xfff3c4 : new THREE.Color(tint).getHex(), transparent: true, opacity: 0.8 })); bm.position.set(-6.3, ay, 0); g.add(bm);
        const st = strip(g, -3, y0 - 0.1, 10, 1.1);
        const lSrc = label(name, [-9.2, ay + 1.1, 0], { color: '#3a465c', size: 12 }); labs.push(lSrc);
        return st;
      }
      const stHeA = mkRow(gHe, 4.0, 'tube', '#e879f9', labHe, '수소 준위로 예측 (모형)'), stHeB = mkRow(gHe, -0.8, 'tube', '#fde68a', labHe, '헬륨 방전관');
      ruler(gHe, -3, -0.8, 10);
      const dashHe = []; for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff5a5f, transparent: true, opacity: 0.7 })); gHe.add(d); dashHe.push(d); }
      const lHeBad = label('예측한 선과 실제 헬륨의 선이 어긋나요', [2, 2.1, 0], { color: '#e2464b', size: 13 }), lHeP = label('예측한 선 (위치만 예측해요 · 세기는 설명하지 못해요)', [2, 5.4, 0], { color: '#1d4ed8', size: 12 }), lHeR = label('실제로 관찰한 헬륨의 선', [2, 0.6, 0], { color: '#b45309', size: 12 });
      labHe.push(lHeBad, lHeP, lHeR);
      const stAbA = mkRow(gAb, 4.0, 'lamp', '#ffd9a0', labAb, '백색광 (연속)'), stAbB = mkRow(gAb, -0.8, 'tube', '#e879f9', labAb, '수소 방전관');
      ruler(gAb, -3, -0.8, 10);
      const dashAb = []; for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); gAb.add(d); dashAb.push(d); }
      const lAbA = label('① 백색광이 수소 기체를 지난 뒤 (흡수 스펙트럼)', [2, 5.4, 0], { color: '#1d4ed8', size: 12 }), lAbB = label('② 수소 방전관이 내는 빛 (방출 스펙트럼)', [2, 0.6, 0], { color: '#b45309', size: 12 });
      labAb.push(lAbA, lAbB);
      // 준위 그림 (n = 2 ↔ n = 3) : 흡수 ↑ / 방출 ↓
      const lvAb = new THREE.Group(); gAb.add(lvAb); lvAb.position.set(10.2, 4.0, 0);
      [0, -1.6].forEach((y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.07, 0.2), M(0x2f6df6, { emissive: 0x1a3a8a })); m.position.set(0, y, 0); lvAb.add(m); });
      const upA = mkArrow(0x14a058, 0.06), dnA = mkArrow(0xe2552a, 0.06); lvAb.add(upA, dnA); setArrow(upA, new V3(-0.5, -1.45, 0.1), new V3(-0.5, -0.15, 0.1)); setArrow(dnA, new V3(0.5, -0.15, 0.1), new V3(0.5, -1.45, 0.1));
      const lN3 = label('n = 3', [11.8, 4.0, 0], { color: '#394258', size: 12 }), lN2 = label('n = 2', [11.8, 2.4, 0], { color: '#394258', size: 12 }), lUp = label('흡수', [9.5, 3.2, 0], { color: '#0f7a43', size: 12 }), lDn = label('방출', [11.0, 3.2, 0], { color: '#c2410c', size: 12 });
      labAb.push(lN3, lN2, lUp, lDn);
      let heKey = '';
      function he(A, S) {
        if (heKey !== 'he') { heKey = 'he'; stHeA.draw({ lines: A.H_LINES.map((l) => ({ nm: l.nm, a: 0.75 })) }); stHeB.draw({ lines: A.LINES.He }); A.H_LINES.forEach((l, i) => { const x = NM2X(l.nm), y1 = 4.0 - 0.6, y2 = -0.8 + 0.6; dashHe[i].position.set(x, (y1 + y2) / 2, 0.05); dashHe[i].scale.y = y1 - y2; }); }
        info('<b>🔬 헬륨(전자 2개)에 보어 모형을 적용해 보면</b><br>수소 준위로 예측한 선 ' + A.H_LINES.map((l) => l.nm).join(' · ') + ' nm와 실제 헬륨의 선 ' + A.LINES.He.map((l) => l.nm).join(' · ') + ' nm가 어긋나요.<br>전자가 2개면 전자끼리도 서로 밀어내서 준위가 수소와 달라져요. 보어 모형은 전자가 1개인 수소(와 비슷한 이온)에만 맞아요.<br><span style="opacity:.85">수소 선의 실제 밝기: ' + A.H_LINES.map((l) => l.nm + ' nm ' + (Math.round(l.a * 100) / 100).toFixed(2)).join(' · ') + ' (밝기 차이는 설명하지 못해요)</span>');
      }
      function abs(A, S, tm) {
        if (heKey !== 'abs') { heKey = 'abs'; stAbA.draw({ cont: (nm) => 0.28 + 0.72 * Math.pow((nm - 400) / 300, 1.1), dark: A.H_LINES.map((l) => ({ nm: l.nm, d: 0.92 })) }); stAbB.draw({ lines: A.H_LINES }); A.H_LINES.forEach((l, i) => { const x = NM2X(l.nm), y1 = 4.0 - 0.6, y2 = -0.8 + 0.6; dashAb[i].position.set(x, (y1 + y2) / 2, 0.05); dashAb[i].scale.y = y1 - y2; }); }
        const tt = (tm * 0.8) % 2; upA.visible = true; upA.children.forEach((c) => { c.material.transparent = true; c.material.opacity = tt < 1 ? 1 : 0.25; }); dnA.children.forEach((c) => { c.material.transparent = true; c.material.opacity = tt >= 1 ? 1 : 0.25; });
        info('<b>🔬 흡수선과 방출선 비교</b><br>수소의 흡수선(어두운 선)과 방출선(밝은 선)의 위치를 비교해 봐요.<br>두 준위 n = 3, 2의 에너지 차이는 ' + (Math.round(A.dEn(3, 2) * 100) / 100).toFixed(2) + ' eV이고, 이 에너지의 빛은 ' + A.H_LINES[0].nm + ' nm예요. 별빛의 흡수선으로 별의 구성 원소를 알아내요.');
      }
      /* ================= 🔬 한계 ②: 전자를 물질파로 보면 (고리 위의 정상파) ================= */
      const ringW = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x14a058 })); ringW.position.set(5.6, 0, 0); gC.add(ringW);
      const nucW = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), M(0xe2464b)); nucW.position.set(5.6, 0, 0); gC.add(nucW);
      const lWv = label('', [5.6, 2.9, 0], { color: '#26324a', size: 12 }), lWs = label('', [5.6, -2.9, 0], { color: '#14a058', size: 12 }), lWt = label('전자를 물질파(파동)로 보면', [5.6, 3.5, 0], { color: '#2f6df6', size: 12 });
      const demoR = { p: 0, on: false };
      function ringWave(A, S, tm) {
        const k = S.k, m = demoR.on ? 1.5 + 4.0 * demoR.p : k.ring, rr = 2.0, amp = 0.28, pts = [];
        for (let i = 0; i <= 160; i++) { const th = i / 160 * TAUc; const r2 = rr + amp * Math.sin(m * th - tm * 2); pts.push(new V3(r2 * Math.cos(th), r2 * Math.sin(th), 0)); }
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.045, 5, false); ringW.geometry.dispose(); ringW.geometry = g;
        const ok = Math.abs(m - Math.round(m)) < 0.05; ringW.material.color.setHex(ok ? 0x14a058 : 0xe2464b);
        lWv.set('원둘레 = ' + f1(m) + ' × 파장'); lWs.set(ok ? '잘 이어져요 ✔' : '이어지지 않아요'); lWs.el.style.background = ok ? '#14a058' : '#e2464b';
        return { m, ok };
      }
      const TAUc = Math.PI * 2, f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
      let pR = null;
      pR = controls.player({ duration: 10, loop: true, autoplay: false, label: '파장 수 바꾸기', phases: [[0, '1.5'], [0.25, '2'], [0.5, '3'], [0.75, '4'], [0.88, '5']], onFrame(p) { demoR.p = p; demoR.on = p > 0 || !!(pR && pR.playing); } });
      { const rr = [...ctx.renderer.domElement.parentNode.parentNode.querySelectorAll('.v3-player')]; plB.row = rr[0]; pR.row = rr[1]; }
      let curM = '';
      const labsS = [lSrc, lSl, lPr, lCur, lKind], labsL = [lA, lB, lObs, lBase, lEax].concat(eTicks), labsB = [lN, lE, stBL, ionL, lPh].concat(orbL, ladLabs), labsC = [lRing, lCl];
      function setMode(S) {
        const mode = S.mode === 'bohr' ? 'bohr' : S.mode === 'limit' ? S.k.view : S.mode;
        if (mode === curM) return; curM = mode;
        gS.visible = mode === 'spec'; gL.visible = mode === 'ladder'; gB.visible = mode === 'bohr'; gC.visible = mode === 'cloud'; gHe.visible = mode === 'he'; gAb.visible = mode === 'abs';
        labHe.forEach((l) => l.show(mode === 'he')); labAb.forEach((l) => l.show(mode === 'abs')); [lWv, lWs, lWt].forEach((l) => l.show(mode === 'cloud'));
        pR.row.style.display = mode === 'cloud' ? '' : 'none'; if (mode !== 'cloud') { pR.pause(); pR.set(0); }
        labsS.forEach((l) => l.show(mode === 'spec')); rulerLabs.forEach(([l, g]) => l.show((g === gS && mode === 'spec') || (g === gHe && mode === 'he') || (g === gAb && mode === 'abs'))); labsL.forEach((l) => l.show(mode === 'ladder')); labsB.forEach((l) => l.show(mode === 'bohr')); lPh.show(false); labsC.forEach((l) => l.show(mode === 'cloud'));
        rungLab.forEach((l) => l.show(false));
        plB.row.style.display = mode === 'bohr' ? '' : 'none'; if (mode !== 'bohr') { plB.pause(); plB.set(0); }
        spKey = ''; lKey = ''; bKey = '';
        if (mode === 'spec') Object.assign(orbit, { tx: 1.5, ty: 0, tz: 0, phi: 1.35, theta: 0.1, dist: 17 * KD });
        else if (mode === 'ladder') Object.assign(orbit, { tx: 0, ty: -0.5, tz: 0, phi: 1.35, theta: 0.1, dist: 15 * KD });
        else if (mode === 'bohr') Object.assign(orbit, { tx: 3, ty: -2.0, tz: 0, phi: 1.3, theta: 0.15, dist: 22 * KD });
        else if (mode === 'cloud') Object.assign(orbit, { tx: 2.8, ty: 0, tz: 0, phi: 1.2, theta: 0.3, dist: 13 * KD });
        else if (mode === 'he' || mode === 'abs') Object.assign(orbit, PHN ? { tx: 1.5, ty: 3.0, tz: 0, phi: 1.4, theta: 0.0, dist: 21 * KD } : { tx: 0.9, ty: 5.0, tz: 0, phi: 1.4, theta: 0.0, dist: 20 });   // PC: 처음부터 크게, 설명 상자 아래 오른쪽으로 비켜 보여요
        heKey = '';
      }
      return {
        update(dt, tm) {
          const A = sim(); if (!A || !A.S) return; const S = A.S;
          setMode(S);
          if (curM === 'spec') spec(A, S);
          else if (curM === 'ladder') ladder(A, S);
          else if (curM === 'bohr') { if (S.b.photon && plB.playing) plB.pause(); if (!plB.playing && plB.p === 0) demoB.on = false; bohr(A, S, tm); }
          else if (curM === 'he') he(A, S); else if (curM === 'abs') abs(A, S, tm);
          else if (curM === 'cloud') { cloud.rotation.y += dt * 0.15; if (!pR.playing && pR.p === 0) demoR.on = false; const rw = ringWave(A, S, tm); info('<b>🔬 전자 구름</b><br>실제 전자는 정해진 궤도를 도는 입자가 아니라, 핵 주변에서 <b>발견될 확률의 구름</b>으로 나타나요. 보어 반지름(0.053 nm)은 확률이 가장 높은 거리예요.<br>보어 모형은 수소의 선 위치는 맞히지만, 선의 밝기 차이와 전자가 둘 이상인 원자는 설명하지 못해요.<br><b>전자를 물질파로 보면</b> 원둘레 = ' + f1(rw.m) + ' × 파장 → ' + (rw.ok ? '파장이 원둘레에 정수 번 들어가서 파동이 안정하게 이어져요 (보어 궤도 n = ' + Math.round(rw.m) + ').' : '정수 번이 아니라서 파동이 이어지지 않아요.')); }
        },
        sync() {},
      };
    },
  });
})();
