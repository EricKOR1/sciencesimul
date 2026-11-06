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
    levels: [0, 1, 2, 3],
    build(ctx) {
      const { THREE, root, label, controls } = ctx;
      const labs = {}; const L = (sc, text, obj, o) => { const l = label(text, obj, o); const raw = l.set; let last = text; l.set = (t) => { if (t !== last) { last = t; raw(t); } }; (labs[sc] = labs[sc] || []).push(l); return l; };
      let lastInfo = ''; const info = (hh) => { if (hh !== lastInfo) { lastInfo = hh; ctx.info(hh); } };
      const h = H3(ctx); const { V3, mat, glass, anchor, sphere, box, cyl, tube, mkSeg, setSeg, grab, showCtl } = h;
      const lessonS = () => (window.__sim && window.__sim.S) || null;
      const st = { light: 'g', tb: 800, yp: 0.15, play: false, tauUser: false, tauP: 0 };
      const gFilm = new THREE.Group(), gPh = new THREE.Group(), gW = new THREE.Group(); root.add(gFilm, gPh, gW);
      const HH = 6, WW = 5;
      /* ----- 실험실 배경: 나무 실험대 · 눈금 뒤판 ----- */
      const ctex = (w, h, draw, rx, ry) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (rx) t.repeat.set(rx, ry || rx); if ('encoding' in t) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; };
      const rnd = (() => { let q = 13; return () => ((q = (q * 16807) % 2147483647) / 2147483647); })();
      const gEnv = new THREE.Group(); root.add(gEnv);
      const woodTex = ctex(256, 128, (g, w, hh) => { g.fillStyle = '#8f6236'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 70; i++) { g.strokeStyle = 'rgba(55,28,10,' + (0.2 + rnd() * 0.35) + ')'; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * hh; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 8, w * 0.6, y + (rnd() - 0.5) * 8, w, y + (rnd() - 0.5) * 6); g.stroke(); } }, 5, 2);
      const benchEnv = new THREE.Mesh(new THREE.BoxGeometry(26, 0.5, 11), mat(0xffffff, { map: woodTex, roughness: 0.6, metalness: 0 })); benchEnv.position.set(1.5, -3.95, -0.3); benchEnv.receiveShadow = true; gEnv.add(benchEnv);
      const benchEdge = new THREE.Mesh(new THREE.BoxGeometry(26.1, 0.08, 11.1), mat(0x4a2f15, { roughness: 0.7 })); benchEdge.position.set(1.5, -3.72, -0.3); gEnv.add(benchEdge);
      const boardTex = ctex(512, 256, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#34497c'); gr.addColorStop(1, '#233559'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(180,200,240,.15)'; g.lineWidth = 1; for (let x = 0; x <= w; x += w / 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, hh); g.stroke(); } for (let y = 0; y <= hh; y += hh / 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, 1, 1);
      const boardEnv = new THREE.Mesh(new THREE.BoxGeometry(26, 14, 0.15), mat(0xffffff, { map: boardTex, roughness: 0.7, metalness: 0.05 })); boardEnv.position.set(1.5, 3.2, -6); gEnv.add(boardEnv);
      /* 틀 */
      const fm = mat(0x64748b, { metalness: 0.6, roughness: 0.35 });
      const addB = (w, hh, d, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), fm); m.position.set(x, y, 0); gFilm.add(m); };
      [-WW / 2 - 0.12, WW / 2 + 0.12].forEach((x) => { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 12), fm); lg.position.set(x, -HH / 2 - 0.55, 0); gFilm.add(lg); const bs = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 1.4), mat(0x334155, { metalness: 0.6, roughness: 0.4 })); bs.position.set(x, -HH / 2 - 1.0, 0); bs.castShadow = true; gFilm.add(bs); });
      addB(WW + 0.5, 0.25, 0.3, 0, HH / 2 + 0.12); addB(WW + 0.5, 0.25, 0.3, 0, -HH / 2 - 0.12); addB(0.25, HH, 0.3, -WW / 2 - 0.12, 0); addB(0.25, HH, 0.3, WW / 2 + 0.12, 0);
      /* 막 (무늬 텍스처) */
      const cv = document.createElement('canvas'); cv.width = 4; cv.height = 512; const g2 = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
      const film = new THREE.Mesh(new THREE.PlaneGeometry(WW, HH), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.96 })); gFilm.add(film);
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
        if (wedge) { gFilm.remove(wedge); wedge.geometry.dispose(); }
        const wm = Math.max(0.05, WMAX * st.tb / 3000);
        const shp = new THREE.Shape(); shp.moveTo(0, HH / 2); shp.lineTo(0, -HH / 2); shp.lineTo(-wm, -HH / 2); shp.lineTo(0, HH / 2);
        const gm = new THREE.ExtrudeGeometry(shp, { depth: 0.5, bevelEnabled: false }); gm.rotateY(-Math.PI / 2); gm.translate(WX + 0.25, 0, 0);
        wedge = new THREE.Mesh(gm, glass(0x9fd8ff, 0.5, { roughness: 0.1 })); gFilm.add(wedge);
        wedge.userData.wm = wm;
      }
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.04, HH, 0.04), mat(0xcbd5e1)); edge.position.set(WX, 0, 0); gFilm.add(edge);
      /* 프로브 · 광선 */
      const probeDot = sphere(0.14, 0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.7 }); gFilm.add(probeDot);
      const link = mkSeg(0xe2e8f0, 0.014, { basic: true, mo: { transparent: true, opacity: 0.45 } }); gFilm.add(link);
      const rayMat = (c) => new THREE.MeshBasicMaterial({ color: c });
      const rayI = [mkSeg(0xffffff, 0.04, { basic: true }), mkSeg(0xffa94d, 0.04, { basic: true }), mkSeg(0x4ade80, 0.04, { basic: true }), mkSeg(0x4ade80, 0.04, { basic: true }), mkSeg(0x4ade80, 0.04, { basic: true })];
      rayI.forEach((m) => gFilm.add(m));
      const aI = anchor(gFilm), a1 = anchor(gFilm), a2 = anchor(gFilm), aT = anchor(gFilm), aP = anchor(gFilm, -WW / 2 - 0.3, 0, 0.1);
      const lI = L('film', '입사광', aI, { color: '#475569', size: 12 }), l1 = L('film', '① 앞면 반사 (위상 π 변화)', a1, { color: '#c2410c', size: 12 }), l2 = L('film', '② 뒷면 반사 (2nt 더 이동)', a2, { color: '#15803d', size: 12 });
      const lT = L('film', '', aT, { color: '#0369a1', size: 12 }), lTop = L('film', '맨 위: t ≈ 0 → 검은 띠', anchor(gFilm, -WW / 2 + 0.2, HH / 2 - 0.35, 0.1), { color: '#475569', size: 11 });
      const lWd = L('film', '쐐기 모양 단면 (두께를 크게 그렸어요)', anchor(gFilm, WX, -HH / 2 - 0.55, 0), { color: '#475569', size: 11 }), lFilm = L('film', '비누막', anchor(gFilm, 0, -HH / 2 - 0.55, 0.1), { color: '#475569', size: 12 });
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

      /* ---------- 2D와 같은 값 (비누막 관찰) ---------- */
      const LMAP = { '532': 'g', '650': 'r', '450': 'b', '600': 'g', white: 'w', w: 'w' };
      function filmFrame(sim, S) {
        const F = S.fl, tau = st.tauUser ? st.tauP * sim.TAU_MAX : F.tau;
        const light = LMAP[F.light] || 'g', tb = sim.thickAt(sim.H_CM, tau), yp = Math.max(0.03, Math.min(0.97, F.probe / sim.H_CM));
        const k = [light, Math.round(tb), yp.toFixed(3)].join(); if (k === st.fk) return; st.fk = k;
        const lc = !wedge || st.light !== light || Math.abs(st.tb - tb) > 0.5; st.light = light; st.tb = tb; st.yp = yp;
        if (lc) { paint(); buildWedge(); }
        upd();
      }
      let plFilm = null;

      /* ---------- 반사와 위상 (줄 파동의 반사: 고정단은 뒤집히고, 자유단은 그대로) ---------- */
      const NR = 70, ropeI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), mat(0xffffff, { roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.4 }), NR); gPh.add(ropeI);
      const wall = box(0.4, 3.4, 1.4, 0x7b8798, { metalness: 0.4 }); wall.position.set(4.3, 0, 0); gPh.add(wall);
      const pole = cyl(0.07, 0.07, 3.4, 0x9aa6b8, {}, 10); pole.position.set(4.3, 0, 0); gPh.add(pole);
      [[4.3, 1.4], [-4.3, 0.9]].forEach((q) => { const st = cyl(0.12, 0.12, 3.9, 0xcbd5e1, { metalness: 0.85, roughness: 0.28 }, 14); st.position.set(q[0] + (q[0] > 0 ? 0.35 : 0), -1.95, 0); gPh.add(st); const bs = box(1.0, 0.12, 1.4, 0x334155, { metalness: 0.6, roughness: 0.4 }); bs.position.set(q[0] + (q[0] > 0 ? 0.35 : 0), -3.6, 0); gPh.add(bs); });
      { const mt = box(0.7, 1.0, 0.9, 0x475569, { metalness: 0.6, roughness: 0.4 }); mt.position.set(-4.5, 0, 0); gPh.add(mt); const sh = cyl(0.07, 0.07, 0.5, 0xe2e8f0, { metalness: 0.9, roughness: 0.2 }, 12); sh.rotation.z = Math.PI / 2; sh.position.set(-4.1, 0, 0); gPh.add(sh); const led = sphere(0.06, 0x4ade80, { emissive: 0x4ade80, emissiveIntensity: 1 }); led.position.set(-4.5, 0.35, 0.47); gPh.add(led); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), mat(0x475569)); ring.rotation.y = Math.PI / 2; gPh.add(ring);
      const lWallL = L('phase', '', anchor(gPh, 4.3, 2.2, 0), { color: '#475569', size: 13 }), lMed = L('phase', '', anchor(gPh, -1.0, 2.5, 0), { color: '#26324a', size: 13 });
      const pulseF = (u) => 1.15 * Math.exp(-(u * u) / 0.55);
      let phP = 0, built = false;
      const Mph = new THREE.Matrix4(), Cph = new THREE.Color();
      function phaseFrame(sim, S) {
        const P = S.ph, state = sim.phState ? sim.phState() : 'flip';
        if (P.rope !== st.rope0) { if (st.rope0 != null) st.pickRope = true; st.rope0 = P.rope; }
        { const nk = P.n1 + '|' + P.n2; if (nk !== st.nk0) { if (st.nk0 != null) st.pickRope = false; st.nk0 = nk; } }
        const useRope = S.show.selA || st.pickRope, rope = useRope ? P.rope : (state === 'flip' ? 'fixed' : 'free'), refl = useRope ? 1 : (state === 'none' ? 0 : 1);
        const s = rope === 'fixed' ? -1 : 1, Ln = 8, c = -2 + phP * (2 * Ln + 4);
        wall.visible = rope === 'fixed'; pole.visible = ring.visible = rope === 'free';
        for (let i = 0; i < NR; i++) {
          const u = Ln * i / (NR - 1), x = -4 + u;
          const yi = pulseF(u - c), yr = refl * s * pulseF(2 * Ln - u - c), y = yi + yr;
          Mph.makeTranslation(x, y, 0); ropeI.setMatrixAt(i, Mph);
          ropeI.setColorAt(i, Math.abs(yr) > Math.abs(yi) && Math.abs(yr) > 0.05 ? Cph.setHex(0xf26b3a) : Math.abs(yi) > 0.05 ? Cph.setHex(0x4a86ff) : Cph.setHex(0x9aa6b8));
          if (i === NR - 1 && rope === 'free') ring.position.set(4.3, Math.max(-1.5, Math.min(1.5, y)), 0);
        }
        ropeI.instanceMatrix.needsUpdate = true; if (ropeI.instanceColor) ropeI.instanceColor.needsUpdate = true;
        const n1 = P.n1, n2 = P.n2;
        lWallL.set(rope === 'fixed' ? '고정단 (벽)' : '자유단 (고리)');
        lMed.set(useRope ? '' : 'n₁ = ' + n1.toFixed(2) + ' → n₂ = ' + n2.toFixed(2));
        lMed.show(!useRope && !!labs.phase.on);
        info('<b>🧵 반사와 위상: 줄 파동의 반사</b><br>' + (rope === 'fixed' ? '고정단: 반사 펄스가 위아래로 <b>뒤집혀요</b> (위상 π).' : '자유단: 반사 펄스가 그대로예요 (위상 변화 없음).') + '<br>' + (useRope ? '줄의 끝 모양을 바꿔 가며 반사 펄스를 견주어 봐요.' : '빛은 굴절률이 <b>큰 쪽 경계</b>(n₂ > n₁)에서 반사할 때 위상이 π 바뀌고, 작은 쪽(n₂ < n₁)에서는 그대로예요. 지금: ' + (state === 'flip' ? 'n₂ > n₁ → 위상 π 변화 (고정단과 같아요)' : state === 'same' ? 'n₂ < n₁ → 위상 변화 없음 (자유단과 같아요)' : 'n₁ = n₂ → 경계가 없어 반사가 없어요')));
      }

      /* ---------- 간섭 조건 · 코팅 (두 반사광의 합) ---------- */
      const slab = box(5.4, 0.4, 2.2, 0xbfe3ff, { transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.1 }); slab.position.set(-3.6, -0.8, 0); gW.add(slab);
      const base = box(5.4, 0.8, 2.2, 0x94a3b8, { roughness: 0.6 }); base.position.set(-3.6, -1.6, 0); gW.add(base);
      const wRay = [0, 1, 2, 3, 4].map(() => mkSeg(0xffffff, 0.04, { basic: true })); wRay.forEach((m) => gW.add(m));
      const aWi = anchor(gW), aW1 = anchor(gW), aW2 = anchor(gW), aWt = anchor(gW);
      const lWi = L('wave', '입사광', aWi, { color: '#475569', size: 12 }), lW1 = L('wave', '① 앞면 반사', aW1, { color: '#c2410c', size: 12 }), lW2 = L('wave', '② 뒷면 반사', aW2, { color: '#15803d', size: 12 }), lWt = L('wave', '', aWt, { color: '#0369a1', size: 12 });
      const waveM = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new V3(0, 0, 0), new V3(1, 0, 0)), 4, 0.05, 6, false), h.basic([0xf26b3a, 0x4ade80, 0xffffff][i])); gW.add(m); return m; });
      const axisW = mkSeg(0x64748b, 0.015, { basic: true }); setSeg(axisW, new V3(1.4, 1.4, 0), new V3(8.2, 1.4, 0)); gW.add(axisW);
      const lWv1 = L('wave', '① 앞면 반사광', anchor(gW, 8.6, 2.5, 0), { color: '#c2410c', size: 12 }), lWv2 = L('wave', '② 뒷면 반사광', anchor(gW, 8.6, 1.4, 0), { color: '#15803d', size: 12 }), lWvS = L('wave', '합성 (두 반사광의 합)', anchor(gW, 8.6, 0.0, 0), { color: '#475569', size: 12 });
      let wKey = '';
      function updWave(S, sim) {
        const cond = S.mode === 'cond';
        const lam = cond ? S.cd.lam : 550, n = cond ? 1.33 : sim.N_MG, tnm = cond ? S.cd.tD : S.ap.tD;
        const key = [S.mode, lam, Math.round(tnm * 2)].join(); if (key === wKey) return; wKey = key;
        const w = Math.max(0.04, tnm / (cond ? 600 : 250) * (cond ? 1.3 : 0.9));
        slab.scale.y = w / 0.4; slab.position.y = -0.6 - w / 2 + 0.0; slab.material.color.setHex(cond ? 0xbfe3ff : 0xd8c7ff); base.position.y = -0.6 - w - 0.4; base.material.color.setHex(cond ? 0x0b1224 : 0x94a3b8); base.material.opacity = cond ? 0.5 : 1; base.material.transparent = cond;
        const top = -0.6, y = top, A = new V3(-3.6, y, 0), sT = 0.35, aIn = 1.6;
        setSeg(wRay[0], new V3(-3.6 - aIn * 1.3, y + aIn, 0), A); setSeg(wRay[1], A, new V3(-3.6 + aIn * 1.3, y + aIn, 0));
        const B = new V3(-3.6 + sT * w * 1.0, y - w, 0), C = new V3(-3.6 + 2 * sT * w, y, 0);
        setSeg(wRay[2], A, B); setSeg(wRay[3], B, C); setSeg(wRay[4], C, new V3(C.x + aIn * 1.3, y + aIn, 0));
        wRay[1].material.color.setHex(0xffa94d); [wRay[2], wRay[3], wRay[4]].forEach((m) => m.material.color.setHex(0x4ade80));
        aWi.position.set(-5.4, y + 1.5, 0.3); aW1.position.set(-1.7, y + 1.8, 0.3); aW2.position.set(-0.5 + 2 * sT * w, y + 1.2, 0.3);
        const delta = 2 * Math.PI * 2 * n * tnm / lam, ph1 = cond ? Math.PI : Math.PI, ph2 = cond ? 0 : Math.PI;     // 비누막: 앞면만 π · 코팅: 앞뒤 모두 π
        const amp = Math.abs(Math.cos(((ph1 - ph2) - delta) / 2)) , m = 2 * n * tnm / lam;
        lWt.set('t = ' + Math.round(tnm) + ' nm · 2nt = ' + m.toFixed(2) + 'λ'); aWt.position.set(1.0, y - w - 0.6, 0.3);
        const col = lam < 490 ? 0x6aa0ff : lam < 570 ? 0x4ade80 : lam < 620 ? 0xffc34d : 0xff6b6b;
        const NX = 90, kx = 2 * Math.PI / 1.7;
        const f = (ph) => { const pts = []; for (let i = 0; i <= NX; i++) { const x = 1.6 + 6.6 * i / NX; pts.push(new V3(x, 0, 0.0)); } return pts; };
        void f;
        function mk(i, yc, ph, amp2, c2) {
          const pts = []; for (let k = 0; k <= NX; k++) { const x = 1.6 + 6.6 * k / NX; pts.push(new V3(x, yc + amp2 * 0.6 * Math.sin(kx * (x - 1.6) + ph), 0)); }
          waveM[i].geometry.dispose(); waveM[i].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), NX, i === 2 ? 0.07 : 0.045, 6, false); waveM[i].material.color.setHex(c2);
        }
        const p1 = ph1, p2 = ph2 - delta;
        mk(0, 2.5, p1, 1, 0xf26b3a); mk(1, 1.4, p2, 1, 0x4ade80);
        const sumA = Math.sqrt(2 + 2 * Math.cos(p1 - p2)), sumPh = Math.atan2(Math.sin(p1) + Math.sin(p2), Math.cos(p1) + Math.cos(p2));
        mk(2, 0.0, sumPh, sumA, col);
        waveM[2].material.color.setHex(col);
        const verdict = sumA > 1.9 ? '<b>보강 간섭</b> → 밝게 보여요' : sumA < 0.2 ? '<b>상쇄 간섭</b> → 어둡게(거의 안 보여요)' : '중간 밝기';
        info(cond ? '<b>📐 간섭 조건: 두 반사광의 합</b> (비누막 n = 1.33, 파장 ' + lam + ' nm)<br>① 앞면 반사는 위상이 π 변해요. ② 뒷면 반사는 2nt만큼 더 가요.<br>2nt = ' + m.toFixed(2) + 'λ → ' + verdict + '<br>보강: 2nt = (m+½)λ, 상쇄: 2nt = mλ' :
          '<b>🔍 무반사 코팅</b> (MgF₂ n = ' + n + ', 550 nm 빛)<br>앞면·뒷면 반사 모두 위상이 π 변해서 위상 차는 경로차 2nt뿐이에요.<br>2nt = ' + m.toFixed(2) + 'λ → ' + verdict + '<br>2nt = λ/2 (t = λ/4n ≈ 100 nm)이면 두 반사광이 상쇄돼 반사가 가장 약해요.');
      }
      plFilm = grab('film', () => controls.player({ duration: 12, loop: true, autoplay: false, label: '막이 흘러내려요', phases: [[0, '새로 만든 막'], [0.3, '아래로 흘러 두꺼워져요'], [0.7, '줄무늬 간격이 넓어져요']], onFrame(p) { if (!built) return; st.tauP = p; st.tauUser = true; st.fk = ''; } }));
      // 탐침 옮기기 (2D에서 막을 눌러 옮기는 것과 같아요)
      const moveProbe = (d) => { const sim = window.__sim; if (!sim) return; const F = sim.S.fl; F.probe = Math.max(0, Math.min(sim.H_CM, Math.round((F.probe + d) * 10) / 10)); st.fk = ''; };
      grab('film', () => controls.button('탐침 ▲ 위로', () => moveProbe(-0.5)));
      grab('film', () => controls.button('탐침 ▼ 아래로', () => moveProbe(0.5)));
      const plPh = grab('phase', () => controls.player({ duration: 6, loop: true, autoplay: true, label: '펄스 보내기', phases: [[0, '입사 펄스'], [0.4, '끝에서 반사'], [0.8, '되돌아와요']], onFrame(p) { phP = p; } }));
      /* ================= ⑤ 두께가 곳곳에서 다른 얇은 막들 (ex) ================= */
      const gEx = new THREE.Group(); root.add(gEx); gEx.visible = false;
      const gnd = box(26, 0.2, 14, 0x1f2937, { roughness: 0.9 }); gnd.material.map = ctex(128, 128, (g, w, hh) => { g.fillStyle = '#2b3140'; g.fillRect(0, 0, w, hh); for (let i = 0; i < 1500; i++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.05 + rnd() * 0.1) + ')'; g.fillRect(rnd() * w, rnd() * hh, 2, 2); } }, 8, 5); gnd.position.set(0, -0.15, -1); gnd.receiveShadow = true; gEx.add(gnd);
      /* 두께 t(nm) → 반사색 (R·G·B 대표 파장 650 · 550 · 450 nm, 간섭 세기 sin²(2π n t / λ) — 앞면만 위상 π인 막) */
      const rfl = (t, n, ph) => { const f = (lam) => Math.pow(Math.sin(2 * Math.PI * n * t / lam + ph), 2); return [f(650), f(550), f(450)]; };
      const mkVC = (geo) => { const c = new Float32Array(geo.attributes.position.count * 3); geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return c; };
      // 기름막이 뜬 물웅덩이
      const pgeo = new THREE.CircleGeometry(2.3, 64, 0, Math.PI * 2); pgeo.rotateX(-Math.PI / 2); const pcol = mkVC(pgeo), ppos = pgeo.attributes.position;
      const puddle = new THREE.Mesh(pgeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.15, metalness: 0.1 })); puddle.position.set(-3.6, 0.0, -2.4); gEx.add(puddle);
      const pBase = []; for (let i = 0; i < ppos.count; i++) pBase.push([ppos.getX(i), ppos.getZ(i)]);
      const pRing = new THREE.Mesh(new THREE.TorusGeometry(2.33, 0.06, 8, 64), mat(0x475569)); pRing.rotation.x = Math.PI / 2; pRing.position.copy(puddle.position); gEx.add(pRing);
      { const wr = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 10, 36), mat(0xcbd5e1, { metalness: 0.85, roughness: 0.28 })); wr.rotation.x = Math.PI / 2 - 0.5; wr.position.set(3.7, 0.12, -0.5); gEx.add(wr); const wh = cyl(0.045, 0.045, 1.8, 0xcbd5e1, { metalness: 0.85, roughness: 0.28 }, 10); wh.rotation.z = Math.PI / 2 - 0.2; wh.position.set(4.7, -0.05, -0.4); gEx.add(wh); }
      // 비눗방울
      const bgeo = new THREE.SphereGeometry(1.5, 48, 32), bcol = mkVC(bgeo), bpos = bgeo.attributes.position;
      const bubble = new THREE.Mesh(bgeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.72 })); bubble.position.set(3.7, 1.7, -2.0); gEx.add(bubble);
      const bBase = []; for (let i = 0; i < bpos.count; i++) bBase.push([bpos.getX(i), bpos.getY(i), bpos.getZ(i)]);
      // 다이크로익 필터: 얇은 막을 여러 겹 쌓아 특정한 색만 반사
      const dich = new THREE.Group(); dich.position.set(-3.6, 0.9, 2.4); gEx.add(dich);
      for (let i = 0; i < 9; i++) { const pl = box(0.06, 1.7, 1.7, i % 2 ? 0x9fd8ff : 0xe8eefc, { transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.2 }); pl.position.set((i - 4) * 0.13, 0, 0); dich.add(pl); }
      dich.rotation.y = Math.PI / 4;
      const bIn = mkSeg(0xffffff, 0.06, { basic: true, mo: { transparent: true, opacity: 0.9 } }), bRef = mkSeg(0x4dd0e1, 0.06, { basic: true, mo: { transparent: true, opacity: 0.9 } }), bTr = mkSeg(0xff9a5a, 0.06, { basic: true, mo: { transparent: true, opacity: 0.9 } }); gEx.add(bIn, bRef, bTr);
      setSeg(bIn, new V3(-6.0, 0.9, 2.4 + 0.0), new V3(-3.6, 0.9, 2.4)); setSeg(bRef, new V3(-3.6, 0.9, 2.4), new V3(-3.6, 0.9, 4.4)); setSeg(bTr, new V3(-3.6, 0.9, 2.4), new V3(-1.2, 0.9, 2.4));
      // 간섭계: 거울이 λ/2 움직일 때마다 무늬가 한 줄씩
      const IX = 3.0, IZ = 2.2, ifBS = box(0.7, 0.7, 0.12, 0x93c5fd, { transparent: true, opacity: 0.7, roughness: 0.1 }); ifBS.position.set(IX, 0.5, IZ); ifBS.rotation.y = Math.PI / 4; gEx.add(ifBS);
      const ifLas = box(0.9, 0.4, 0.4, 0xef4444); ifLas.position.set(IX - 2.0, 0.5, IZ); gEx.add(ifLas);
      const ifMf = box(0.1, 0.7, 0.7, 0xe2e8f0, { metalness: 0.9, roughness: 0.1 }); ifMf.position.set(IX, 0.5, IZ - 1.7); ifMf.rotation.y = Math.PI / 2; gEx.add(ifMf);
      const ifMm = box(0.1, 0.7, 0.7, 0xe2e8f0, { metalness: 0.9, roughness: 0.1 }); gEx.add(ifMm);
      const ifSl = box(1.6, 0.06, 0.25, 0x475569); ifSl.position.set(IX + 1.7, 0.2, IZ); gEx.add(ifSl);
      const ifB = [0, 1, 2, 3].map(() => { const m = mkSeg(0xff5a5a, 0.035, { basic: true, mo: { transparent: true, opacity: 0.9 } }); gEx.add(m); return m; });
      const fcv = document.createElement('canvas'); fcv.width = 128; fcv.height = 64; const fcx = fcv.getContext('2d'), ftex = new THREE.CanvasTexture(fcv);
      const ifScr = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshBasicMaterial({ map: ftex, side: THREE.DoubleSide })); ifScr.position.set(IX, 0.5, IZ + 1.9); gEx.add(ifScr);
      L('ex', '🌈 기름막이 뜬 물웅덩이', puddle, { color: '#26324a', size: 12, offset: [0, 0.2, 2.6] }); L('ex', '🫧 비눗방울', bubble, { color: '#26324a', size: 12, offset: [0, -1.9, 0] });
      L('ex', '🎛️ 다이크로익 필터', dich, { color: '#26324a', size: 12, offset: [0, 1.4, 0] }); L('ex', '흰빛', anchor(gEx, -5.4, 1.2, 2.4), { color: '#475569', size: 11 }); L('ex', '반사: 특정한 색', anchor(gEx, -3.6, 1.3, 4.6), { color: '#0e7490', size: 11 }); L('ex', '통과: 나머지 색', anchor(gEx, -1.4, 1.3, 2.4), { color: '#c2410c', size: 11 });
      L('ex', '📏 간섭계', ifBS, { color: '#26324a', size: 12, offset: [0, 1.0, 0] }); const lIf = L('ex', '', ifScr, { color: '#26324a', size: 11, offset: [0, -0.9, 0] }), lMi = L('ex', '움직이는 거울', ifMm, { color: '#475569', size: 11, offset: [0, 0.8, 0] });
      const exP = { on: false, p: 0 }; let exFilmT = 0;
      const lambdaN = 633;
      function updEx(S, sim, dt, t) {
        const tt = exP.on ? exP.p * 10 : t, mix = 0.5 + 0.5 * Math.sin(tt * 0.9);
        // 물웅덩이: 가운데가 두꺼운 기름막 (소용돌이 모양으로 두께가 달라요) n ≈ 1.45
        for (let i = 0; i < ppos.count; i++) { const x = pBase[i][0], z = pBase[i][1], r = Math.hypot(x, z) / 2.3, a = Math.atan2(z, x), th = 250 + 700 * (1 - r) * (0.6 + 0.4 * Math.sin(a * 3 + r * 5 + mix * 2.2)) + 120 * Math.sin(r * 9 + mix * 3); const c = rfl(th, 1.45, Math.PI / 2); const k = 0.1 + 0.9 * (1 - 0.7 * r * r); pcol[i * 3] = c[0] * k; pcol[i * 3 + 1] = c[1] * k; pcol[i * 3 + 2] = c[2] * k; }
        pgeo.attributes.color.needsUpdate = true;
        // 비눗방울: 위쪽은 얇고 아래로 갈수록 두꺼워요 n ≈ 1.33
        for (let i = 0; i < bpos.count; i++) { const [x, y, z] = bBase[i], u = (1.5 - y) / 3.0, a = Math.atan2(z, x), th = 40 + 700 * u * (0.7 + 0.3 * Math.sin(a * 2 + y * 4 + mix * 2.4)) ; const c = rfl(th, 1.33, 0); const lum = 0.15 + 0.85 * (0.5 + 0.5 * Math.cos(a - 0.6)) * 0.4 + 0.45; bcol[i * 3] = c[0] * lum; bcol[i * 3 + 1] = c[1] * lum; bcol[i * 3 + 2] = c[2] * lum; }
        bgeo.attributes.color.needsUpdate = true; bubble.position.y = 1.7 + 0.08 * Math.sin(t * 1.3);
        // 간섭계: 거울이 λ/2만큼 움직이면 무늬가 한 줄 이동 (2D에 없는 확대 모형: 거울 이동량은 크게 그려요)
        const d = (exP.on ? exP.p : ((t * 0.12) % 1)) * 1.5, mm = IX + 1.7 + d * 0.9; ifMm.position.set(mm, 0.5, IZ);
        const BS = new V3(IX, 0.5, IZ);
        setSeg(ifB[0], new V3(IX - 1.55, 0.5, IZ), BS); setSeg(ifB[1], BS, new V3(IX, 0.5, IZ - 1.65)); setSeg(ifB[2], BS, new V3(mm - 0.05, 0.5, IZ)); setSeg(ifB[3], BS, new V3(IX, 0.5, IZ + 1.85));
        const lines = d / 0.5, ph = lines;   // 거울이 0.5(= λ/2 모형) 움직일 때마다 한 줄
        for (let x = 0; x < 128; x++) { const I = Math.pow(Math.cos(Math.PI * (x / 128 * 6 + ph)), 2), v = Math.round(255 * I); fcx.fillStyle = 'rgb(' + v + ',' + Math.round(v * 0.25) + ',' + Math.round(v * 0.2) + ')'; fcx.fillRect(x, 0, 1, 64); } ftex.needsUpdate = true;
        lIf.set('무늬가 ' + lines.toFixed(1) + '줄 이동'); lMi.show(true);
        info('<b>🌈 두께가 곳곳에서 다른 얇은 막</b>: 기름막·비눗방울은 위치마다 두께가 달라서 보강되는 색이 달라 <b>무지개 무늬</b>가 보여요.<br><b>🎛️ 다이크로익 필터</b>: 여러 겹의 얇은 막이 특정한 색만 반사해요. <b>📏 간섭계</b>: 거울이 파장의 절반(λ/2)만큼 움직일 때마다 무늬가 한 줄씩 이동해요 (확대한 모형이에요).');
      }
      const plEx = grab('ex', () => controls.player({ duration: 10, loop: true, autoplay: false, label: '무늬가 움직여요', phases: [[0, '거울이 제자리'], [0.4, '무늬가 이동해요']], onFrame(p) { if (!built) return; exP.on = true; exP.p = p; } }));
      built = true;
      let sig2d = '';
      return {
        update(dt, t) {
          const sim = window.__sim; if (!sim) return; const S = sim.S, m = S.mode;
          const sc = m === 'film' ? 'film' : m === 'phase' ? 'phase' : m === 'app' && S.ap.sub === 'ex' ? 'ex' : 'wave';
          if (sc !== st.sc) { st.sc = sc; wKey = ''; st.fk = ''; benchEnv.visible = benchEdge.visible = sc !== 'ex'; gFilm.visible = sc === 'film'; gPh.visible = sc === 'phase'; gW.visible = sc === 'wave'; gEx.visible = sc === 'ex'; if (sc !== 'ex') plEx.pause(); Object.keys(labs).forEach((k) => labs[k].forEach((l) => l.show(k === sc))); const o = ctx.orbit; o.theta = 0.35; o.phi = 1.3; o.tx = sc === 'film' ? 2.2 : sc === 'wave' ? 2.2 : 0; o.ty = 0; o.dist = (sc === 'wave' ? 19 : sc === 'phase' ? 13 : sc === 'ex' ? 15 : 15.5) * KD * (sc === 'ex' && PHN ? 1.25 : 1); if (sc === 'ex') { o.phi = 0.85; o.theta = 0.1; o.tx = 0; o.ty = 0.3; } showCtl(sc === 'film' ? 'film' : sc === 'ex' ? 'ex' : '__none'); }
          if (sc === 'film') { const k2 = [S.fl.tau, S.fl.light, S.fl.probe, S.fl.play].join(); if (k2 !== sig2d) { sig2d = k2; if (st.tauUser && S.fl.play) { st.tauUser = false; plFilm.pause(); } st.fk = ''; } filmFrame(sim, S); }
          else if (sc === 'wave') updWave(S, sim);
          else if (sc === 'ex') updEx(S, sim, dt, t);
          else phaseFrame(sim, S);
        },
        sync() { st.fk = ''; wKey = ''; },
      };
    },
  });
})();
