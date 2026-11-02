/* hq-thin-film · 3D 비누막 간섭 (쐐기 모양 막의 단면과 반사 광선)
   앞면에서 반사하면 위상이 π 바뀌고, 뒷면에서 반사한 빛은 2nt만큼 더 가요. 2nt = (m + ½)λ 이면 보강(밝음), 2nt = mλ 이면 상쇄(어두움). 맨 위(t ≈ 0)는 검은 띠예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  /* ---------- 공통 도우미 (모형 만들기) ---------- */
  const PHN = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches), KD = PHN ? 1.45 : 1;
  function H3(ctx) {
    const { THREE, root } = ctx;
    const V3 = THREE.Vector3, Yax = new V3(0, 1, 0);
    const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.1 }, o || {}));
    const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o || {}));
    const glass = (c, op, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.25, metalness: 0.0, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }, o || {}));
    /* 화살표 하나: setArrow(g, 시작점, 끝점) */
    function mkArrow(col, rad, o) {
      const g = new THREE.Group(); const m = (o && o.basic) ? basic(col) : mat(col, { roughness: 0.4, emissive: col, emissiveIntensity: 0.12 });
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 12), m);
      const hd = new THREE.Mesh(new THREE.ConeGeometry(rad * 2.6, rad * 6, 18), m);
      g.add(sh, hd); g.userData = { sh, hd, rad, m }; return g;
    }
    function setArrow(g, a, b) {
      const d = new V3().subVectors(b, a), len = d.length(); const { sh, hd, rad } = g.userData;
      if (len < 1e-3) { g.visible = false; return g; }
      g.visible = true; const hl = Math.min(len * 0.5, rad * 6);
      sh.scale.y = Math.max(0.001, len - hl); sh.position.y = (len - hl) / 2;
      hd.scale.y = hl / (rad * 6); hd.position.y = len - hl / 2;
      g.position.copy(a); g.quaternion.setFromUnitVectors(Yax, d.normalize()); return g;
    }
    /* 많은 화살표 (InstancedMesh): set(i, 위치, 방향, 길이, 색) 뒤에 flush() */
    function arrowSet(n, rad, o) {
      o = o || {};
      const sg = new THREE.CylinderGeometry(1, 1, 1, 8); sg.translate(0, 0.5, 0);
      const hg = new THREE.ConeGeometry(1, 1, 14); hg.translate(0, 0.5, 0);
      const m = mat(0xffffff, { roughness: 0.45, emissive: 0xffffff, emissiveIntensity: 0.18 });
      const sh = new THREE.InstancedMesh(sg, m, n), hd = new THREE.InstancedMesh(hg, m, n);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new V3(), S = new V3(), C = new THREE.Color();
      const zero = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < n; i++) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); sh.setColorAt(i, C.set(0xffffff)); hd.setColorAt(i, C); }
      const grp = new THREE.Group(); grp.add(sh, hd);
      return {
        group: grp, n,
        set(i, p, dir, len, col) {
          if (len < 0.02) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); return; }
          const hl = Math.min(len * 0.55, rad * 6.5), hr = Math.min(rad * 2.7, hl * 0.5);
          Q.setFromUnitVectors(Yax, dir);
          S.set(rad, Math.max(0.001, len - hl), rad); M.compose(p, Q, S); sh.setMatrixAt(i, M);
          P.copy(dir).multiplyScalar(len - hl).add(p); S.set(hr, hl, hr); M.compose(P, Q, S); hd.setMatrixAt(i, M);
          if (col != null) { C.set(col); sh.setColorAt(i, C); hd.setColorAt(i, C); }
        },
        hide(i) { sh.setMatrixAt(i, zero); hd.setMatrixAt(i, zero); },
        flush() { sh.instanceMatrix.needsUpdate = hd.instanceMatrix.needsUpdate = true; if (sh.instanceColor) sh.instanceColor.needsUpdate = hd.instanceColor.needsUpdate = true; },
      };
    }
    /* 가는 막대(선분): setSeg(m, a, b) */
    function mkSeg(col, rad, o) { return new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 1, 8), (o && o.basic) ? basic(col, o.mo) : mat(col, o && o.mo)); }
    function setSeg(m, a, b) { const d = new V3().subVectors(b, a), l = d.length(); if (l < 1e-3) { m.visible = false; return m; } m.visible = true; m.scale.y = l; m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(Yax, d.normalize()); return m; }
    function anchor(g, x, y, z) { const o = new THREE.Object3D(); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; }
    function sphere(r, c, o) { return new THREE.Mesh(new THREE.SphereGeometry(r, r < 0.35 ? 22 : 36, r < 0.35 ? 14 : 24), mat(c, o)); }
    function tube(pts, r, c, o) {
      const curve = Array.isArray(pts) ? new THREE.CatmullRomCurve3(pts) : pts;
      return new THREE.Mesh(new THREE.TubeGeometry(curve, (o && o.seg) || 80, r, (o && o.rs) || 8, !!(o && o.closed)), (o && o.basic) ? basic(c, o.mo) : mat(c, o && o.mo));
    }
    function box(w, h, d, c, o) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); }
    function cyl(rt, rb, h, c, o, seg) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 32), mat(c, o)); }
    function fib(n) { // 구 위에 고르게 퍼진 방향
      const out = [], ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) / n * 2, r = Math.sqrt(1 - y * y), a = ga * i; out.push(new V3(Math.cos(a) * r, y, Math.sin(a) * r)); }
      return out;
    }
    /* 장면별 조작 줄: grab(장면, 만들기) → 나중에 showCtl(장면) */
    const bar = ctx.renderer.domElement.parentNode.parentNode.querySelector('.v3-ctl');
    const ctlBy = {};
    function grab(sc, fn) { const b = bar.children.length; const r = fn(); (ctlBy[sc] = ctlBy[sc] || []).push.apply(ctlBy[sc], [].slice.call(bar.children, b)); return r; }
    function showCtl(sc) { Object.keys(ctlBy).forEach((k) => ctlBy[k].forEach((n) => { n.style.display = (k === sc || k === '*') ? '' : 'none'; })); }
    function toggleBtn(sc, text, on, fn) {
      const b = grab(sc, () => ctx.controls.button('', () => { on = !on; draw(); fn(on); }));
      const draw = () => { b.textContent = text + (on ? ' ✓' : ' ✕'); b.classList.toggle('on', on); };
      draw(); return { set(v) { on = v; draw(); }, get on() { return on; } };
    }
    return { V3, Yax, mat, basic, glass, mkArrow, setArrow, arrowSet, mkSeg, setSeg, anchor, sphere, tube, box, cyl, fib, grab, showCtl, toggleBtn };
  }
  const NF = 1.33;
  const LIGHTS = { r: [650], g: [532], b: [450], w: null };
  function lamRGB(l) {
    let r = 0, g = 0, b = 0;
    if (l < 440) { r = (440 - l) / 60; b = 1; } else if (l < 490) { g = (l - 440) / 50; b = 1; } else if (l < 510) { g = 1; b = (510 - l) / 20; }
    else if (l < 580) { r = (l - 510) / 70; g = 1; } else if (l < 645) { r = 1; g = (645 - l) / 65; } else { r = 1; }
    return [r, g, b];
  }

  window.SciSim3D.attach({
    title: '비누막 간섭 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 15.5 * KD, theta: 0.5, phi: 1.28, min: 6, max: 30, target: [2.2, 0, 0] },
    autoRotate: 0,
    levels: [1, 2, 3],
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube, mkSeg, setSeg } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const S0 = lessonS();
      const st = { light: S0 && S0.fl && LIGHTS[S0.fl.light] ? S0.fl.light : 'g', tb: 2400, yp: 0.15, play: false };
      if (S0 && S0.fl && S0.fl.light === '532') st.light = 'g';
      const HH = 6, WW = 5;
      /* 틀 */
      const fm = mat(0x64748b, { metalness: 0.6, roughness: 0.35 });
      const addB = (w, hh, d, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), fm); m.position.set(x, y, 0); root.add(m); };
      addB(WW + 0.5, 0.25, 0.3, 0, HH / 2 + 0.12); addB(WW + 0.5, 0.25, 0.3, 0, -HH / 2 - 0.12); addB(0.25, HH, 0.3, -WW / 2 - 0.12, 0); addB(0.25, HH, 0.3, WW / 2 + 0.12, 0);
      /* 막 (무늬 텍스처) */
      const cv = document.createElement('canvas'); cv.width = 4; cv.height = 512; const g2 = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
      const film = new THREE.Mesh(new THREE.PlaneGeometry(WW, HH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.96 })); root.add(film);
      const tAt = (u) => st.tb * u;                                              // u: 0(맨 위) → 1(아래), 두께(nm)
      function intensity(lamNm, t) { const s = Math.sin(2 * Math.PI * NF * t / lamNm); return s * s; }
      function paint() {
        const img = g2.createImageData(4, 512);
        for (let j = 0; j < 512; j++) {
          const t = tAt(j / 511); let r = 0, g = 0, b = 0;
          if (st.light === 'w') { for (let l = 400; l <= 700; l += 20) { const I = intensity(l, t), c = lamRGB(l); r += I * c[0]; g += I * c[1]; b += I * c[2]; } r /= 6.2; g /= 5.4; b /= 5.4; }
          else { const l = LIGHTS[st.light][0], I = intensity(l, t), c = lamRGB(l); r = I * c[0]; g = I * c[1]; b = I * c[2]; }
          r = Math.min(1, r * 1.05); g = Math.min(1, g * 1.05); b = Math.min(1, b * 1.05);
          for (let i = 0; i < 4; i++) { const o = (j * 4 + i) * 4; img.data[o] = 12 + 243 * Math.pow(r, 0.9); img.data[o + 1] = 14 + 241 * Math.pow(g, 0.9); img.data[o + 2] = 22 + 233 * Math.pow(b, 0.9); img.data[o + 3] = 255; }
        }
        g2.putImageData(img, 0, 0); tex.needsUpdate = true;
      }
      /* 단면(쐐기) */
      const WX = 5.6, WMAX = 1.55;
      let wedge = null;
      function buildWedge() {
        if (wedge) { root.remove(wedge); wedge.geometry.dispose(); }
        const wm = Math.max(0.05, WMAX * st.tb / 3000);
        const shp = new THREE.Shape(); shp.moveTo(0, HH / 2); shp.lineTo(0, -HH / 2); shp.lineTo(-wm, -HH / 2); shp.lineTo(0, HH / 2);
        const gm = new THREE.ExtrudeGeometry(shp, { depth: 0.5, bevelEnabled: false }); gm.rotateY(-Math.PI / 2); gm.translate(WX + 0.25, 0, 0);
        wedge = new THREE.Mesh(gm, glass(0x9fd8ff, 0.5, { roughness: 0.1 })); root.add(wedge);
        wedge.userData.wm = wm;
      }
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.04, HH, 0.04), mat(0xcbd5e1)); edge.position.set(WX, 0, 0); root.add(edge);
      /* 프로브 · 광선 */
      const probeDot = sphere(0.14, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.7 }); root.add(probeDot);
      const link = mkSeg(0xe2e8f0, 0.014, { basic: true, mo: { transparent: true, opacity: 0.45 } }); root.add(link);
      const rayMat = (c) => new THREE.MeshBasicMaterial({ color: c });
      const rayI = [mkSeg(0xffffff, 0.04, { basic: true }), mkSeg(0xffa94d, 0.04, { basic: true }), mkSeg(0x4ade80, 0.04, { basic: true }), mkSeg(0x4ade80, 0.04, { basic: true }), mkSeg(0x4ade80, 0.04, { basic: true })];
      rayI.forEach((m) => root.add(m));
      const aI = anchor(root), a1 = anchor(root), a2 = anchor(root), aT = anchor(root), aP = anchor(root, -WW / 2 - 0.3, 0, 0.1);
      const lI = label('입사광', aI, { color: '#475569', size: 12 }), l1 = label('① 앞면 반사 (위상 π 변화)', a1, { color: '#c2410c', size: 12 }), l2 = label('② 뒷면 반사 (2nt 더 이동)', a2, { color: '#15803d', size: 12 });
      const lT = label('', aT, { color: '#0369a1', size: 12 }), lTop = label('맨 위: t ≈ 0 → 검은 띠', anchor(root, -WW / 2 + 0.2, HH / 2 - 0.35, 0.1), { color: '#475569', size: 11 });
      const lWd = label('쐐기 모양 단면 (두께를 크게 그렸어요)', anchor(root, WX, -HH / 2 - 0.55, 0), { color: '#475569', size: 11 }), lFilm = label('비누막', anchor(root, 0, -HH / 2 - 0.55, 0.1), { color: '#475569', size: 12 });
      function upd() {
        const u = st.yp, y = HH / 2 - u * HH, t = tAt(u), wm = wedge.userData.wm, w = wm * u;
        const lamL = st.light === 'w' ? 532 : LIGHTS[st.light][0], cc = lamRGB(lamL);
        probeDot.position.set(WW / 2 - 0.25, y, 0.12); setSeg(link, new V3(WW / 2 - 0.25, y, 0.12), new V3(WX, y, 0.12));
        const A = new V3(WX, y, 0), s0 = Math.atan2(0.9, 2.6), sT = Math.asin(Math.sin(s0) / NF);
        setSeg(rayI[0], new V3(WX, y + 0.9, 2.6), A);
        const e1 = new V3(WX, y - 0.9, 2.6); setSeg(rayI[1], A, e1);
        const B = new V3(WX, y - Math.tan(sT) * w, -w), C = new V3(WX, y - 2 * Math.tan(sT) * w, 0);
        setSeg(rayI[2], A, B); setSeg(rayI[3], B, C);
        const e2 = new V3(WX, C.y - 0.9, 2.6); setSeg(rayI[4], C, e2);
        const colr = '#' + new THREE.Color(Math.pow(cc[0], 0.7), Math.pow(cc[1], 0.7), Math.pow(cc[2], 0.7)).getHexString();
        rayI.slice(1).forEach((m, i) => { if (i === 0) m.material.color.setHex(0xffa94d); else m.material.color.setHex(0x4ade80); });
        aI.position.set(WX, y + 0.9, 2.7); a1.position.set(WX + 0.9, y - 0.9, 2.7); a2.position.set(WX + 0.2, e2.y - 0.15, 2.7); aT.position.set(WX + 1.7, y, 0);
        const m = 2 * NF * t / lamL, fr = m - Math.floor(m);
        lT.set('t = ' + Math.round(t) + ' nm · 2nt = ' + m.toFixed(1) + 'λ'); lT.show(st.light !== 'w');
        lT.set(st.light === 'w' ? 't = ' + Math.round(t) + ' nm' : 't = ' + Math.round(t) + ' nm · 2nt = ' + m.toFixed(1) + 'λ');
        lT.show(true);
        const bright = st.light === 'w' ? null : (Math.abs(fr - 0.5) < 0.25);
        const msg = st.light === 'w' ? '백색광은 파장마다 보강되는 두께가 달라 <b>무지개 색 띠</b>가 생겨요.' : bright ? '이 높이는 2nt가 (m+½)λ에 가까워서 <b>보강</b> → 밝은 줄이에요.' : '이 높이는 2nt가 mλ에 가까워서 <b>상쇄</b> → 어두운 줄이에요.';
        info('<b>두 반사광의 간섭</b>: ① 앞면 반사는 위상이 π 바뀌고, ② 뒷면 반사는 2nt만큼 더 가요.<br>' + msg + '<br>막이 아래로 갈수록 두꺼워져 같은 색의 줄이 일정한 간격으로 반복돼요.');
      }
      controls.segment('빛', [{ value: 'r', label: '빨강' }, { value: 'g', label: '초록' }, { value: 'b', label: '파랑' }, { value: 'w', label: '백색' }], st.light, (v) => { st.light = v; paint(); upd(); });
      const rTb = controls.range('아랫부분 두께', 600, 3000, 200, st.tb, (v) => { st.tb = v; paint(); buildWedge(); upd(); }, (v) => v + ' nm');
      controls.range('관찰 높이', 0.05, 0.95, 0.025, st.yp, (v) => { st.yp = v; upd(); }, (v) => (v < 0.2 ? '위쪽' : v > 0.8 ? '아래쪽' : '가운데'));
      const bp = controls.button('▶ 막이 얇아져요', () => { st.play = !st.play; bp.textContent = st.play ? '⏸ 멈춤' : '▶ 막이 얇아져요'; if (st.play && st.tb < 800) { st.tb = 3000; } });
      paint(); buildWedge(); upd();
      return {
        update(dt, t) {
          if (st.play) { st.tb -= dt * 180; if (st.tb < 500) st.tb = 3000; rTb.set(Math.round(st.tb / 200) * 200); paint(); buildWedge(); upd(); }
        },
        sync() {},
      };
    },
  });
})();
