/* hu-solar-atmosphere · 3D 태양 대기의 구조와 현상
   ① 층 구조: 광구 → 채층 → 천이층 → 코로나. 온도는 광구(약 5800 K)에서 채층 위쪽으로 가며 4400 K까지 낮아졌다가,
      천이층에서 급격히 올라 코로나에서는 100만 K이 넘어요. (층의 두께는 보기 좋게 훨씬 키워서 그렸어요)
   ② 대기 현상: 홍염(자기장 고리를 따라 뜬 차가운 가스), 플레어(자기장 에너지의 폭발), CME(코로나 물질 방출), 코로나 홀(열린 자기장 → 태양풍). */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const PHONE = !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  const DEG = Math.PI / 180, RS = 3, R1 = 3.14, R2 = 3.52, R3 = 3.62;     // 광구 · 채층 · 천이층 바깥 반지름(과장)

  function hash3(x, y, z) { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
  const fade = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
    const l = (a, b, t) => a + (b - a) * t, c = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz);
    return l(l(l(c(0, 0, 0), c(1, 0, 0), fx), l(c(0, 1, 0), c(1, 1, 0), fx), fy), l(l(c(0, 0, 1), c(1, 0, 1), fx), l(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
  }
  function sunCanvas() {
    const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), im = g.createImageData(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const lon = (i / W) * Math.PI * 2, lat = (0.5 - (j + 0.5) / H) * Math.PI, cx = Math.cos(lat) * Math.cos(lon), cy = Math.sin(lat), cz = Math.cos(lat) * Math.sin(lon);
      const v = 0.6 * vnoise(cx * 14, cy * 14, cz * 14) + 0.3 * vnoise(cx * 30 + 5, cy * 30, cz * 30) + 0.1 * vnoise(cx * 60, cy * 60 + 3, cz * 60), o = (j * W + i) * 4;
      const t = Math.min(1, Math.max(0, (v - 0.25) * 1.6));
      im.data[o] = 255 - 10 * (1 - t); im.data[o + 1] = 150 + 70 * t; im.data[o + 2] = 40 + 50 * t; im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0); return cv;
  }
  function glowTexture(stops) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach((s) => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }

  window.SciSim3D.attach({
    title: '태양 대기 3D',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    levels: [0, 1],
    camera: { dist: PHONE ? 13.5 : 12.5, theta: 1.0, phi: 1.22, min: 6, max: 28, target: PHONE ? [0, 0, 0] : [-0.86, 0.7, 1.34] },   // PC: 태양을 조금 오른쪽 아래로 (왼쪽 위 설명 상자에 홍염·코로나 구멍이 가리지 않게)
    autoRotate: 0,
    build(ctx) {
      const { THREE, root, label, info, controls, renderer } = ctx;
      const st = { mode: 'layers', flare: 0, cme: -1, t: 0, P: 0, h: 100, key: '', fN: 0, names: true };
      const W = () => window.__sim || {};
      const sr = () => { try { return window.__sim && window.__sim.S; } catch (e) { return null; } };
      /* 층 구조 단면: 사분면 한 조각을 잘라 낸 구 (phi: π → 5π/2) */
      const cutSphere = (r, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64, Math.PI, Math.PI * 1.5), mat); m.userData.cut = true; return m; };
      const fullSphere = (r, mat) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64), mat); return m; };

      /* 광구(몸통) */
      const tex = new THREE.CanvasTexture(sunCanvas()); if ('encoding' in tex) tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1, roughness: 1 });
      const bodyCut = cutSphere(RS, bodyMat), bodyFull = fullSphere(RS, bodyMat); root.add(bodyCut, bodyFull);
      /* 채층 · 천이층 껍질 (반투명) */
      const chM = new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
      const trM = new THREE.MeshBasicMaterial({ color: 0xb06bff, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide });
      const chromCut = cutSphere(R2, chM), chromFull = fullSphere(R2, chM), transCut = cutSphere(R3, trM), transFull = fullSphere(R3, trM); root.add(chromCut, chromFull, transCut, transFull);
      /* 코로나: 은은한 빛 + 줄기 */
      const cTex = glowTexture([[0, 'rgba(255,255,255,0)'], [0.42, 'rgba(200,215,255,.0)'], [0.5, 'rgba(210,225,255,.30)'], [0.62, 'rgba(180,205,255,.14)'], [1, 'rgba(170,200,255,0)']]);
      const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: cTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); corona.scale.set(RS * 5.2, RS * 5.2, 1); root.add(corona);
      const streamG = new THREE.Group(); root.add(streamG);
      const sm = new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.2, depthWrite: false });
      for (let i = 0; i < 14; i++) {
        const lat = (hash3(i, 3, 7) - 0.5) * 70 * DEG, lon = i / 14 * Math.PI * 2 + hash3(i, 9, 1) * 0.4, len = 2.2 + hash3(i, 5, 5) * 1.8;
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.34, len, 14, 1, true), sm);
        const d = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
        c.position.copy(d).multiplyScalar(R3 + len / 2 - 0.1); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); streamG.add(c);
      }
      /* 단면 벽: 잘라 낸 두 평면(z=0 의 x>0 쪽, x=0 의 z>0 쪽)에 층마다 색을 입혀요 */
      const capG = new THREE.Group(); root.add(capG);
      const rings = [[0, RS, 0xffa21c], [RS, R1, 0xffd23f], [R1, R2, 0xff4040], [R2, R3, 0xb06bff]];
      [0, 1].forEach((w) => {
        rings.forEach(([a, b, c]) => {
          const geo = a === 0 ? new THREE.CircleGeometry(b, 64, -Math.PI / 2, Math.PI) : new THREE.RingGeometry(a, b, 64, 1, -Math.PI / 2, Math.PI);
          const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); if (w === 1) m.rotation.y = -Math.PI / 2; capG.add(m);
        });
      });
      const cutObjs = [bodyCut, chromCut, transCut], fullObjs = [bodyFull, chromFull, transFull];

      /* 층 이름표 (단면 위, x>0 쪽 단면 z=0) */
      const lp = (r, a) => [0.03, r * Math.sin(a * DEG), r * Math.cos(a * DEG)];
      const labL = [
        label('광구', lp(RS * 0.97, 22), { color: 'rgba(146,84,0,.92)' }), label('채층', lp(3.33, 52), { color: 'rgba(185,28,28,.92)' }),
        label('천이층', lp(3.57, 74), { color: 'rgba(109,40,217,.92)', size: 11.5 }), label('코로나', lp(4.7, 40), { color: 'rgba(30,64,140,.92)' }),
      ];
      labL.forEach((l) => (l.off = [0.2, 0, 0]));

      /* 현상: 홍염 고리 · 플레어 · 코로나 홀 · 태양풍 · CME */
      const phenG = new THREE.Group(); root.add(phenG);
      const loopM = new THREE.MeshStandardMaterial({ color: 0xff4d2e, emissive: 0xff2a10, emissiveIntensity: 0.9, roughness: 0.5 });
      function loopAt(lat, lon, span, h) {
        const pts = [], d0 = new THREE.Vector3(), d = new THREE.Vector3();
        for (let k = 0; k <= 24; k++) {
          const u = k / 24, a = (u - 0.5) * span, r = RS * 1.005 + h * Math.sin(u * Math.PI);
          d0.set(Math.cos(lat) * Math.cos(lon + a), Math.sin(lat), Math.cos(lat) * Math.sin(lon + a)); pts.push(d0.clone().multiplyScalar(r));
        }
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.06, 8, false), loopM); phenG.add(m); return { m, top: pts[12] };
      }
      const L1 = loopAt(20 * DEG, 20 * DEG, 0.55, 1.1), L2 = loopAt(-10 * DEG, 80 * DEG, 0.45, 0.75), L3 = loopAt(30 * DEG, 140 * DEG, 0.5, 0.9), L4 = loopAt(0.15, 20 * DEG + 0.12, 0.3, 0.55);
      const labProm = label('홍염', L3.top.toArray(), { color: 'rgba(185,28,28,.92)' });
      /* 플레어 */
      const flTex = glowTexture([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,240,150,.8)'], [1, 'rgba(255,200,60,0)']]);
      const flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: flTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); phenG.add(flare);
      const fl0 = L1.top.clone().normalize().multiplyScalar(RS * 1.01); flare.position.copy(fl0); flare.scale.setScalar(0.01);
      const labFl = label('플레어', fl0.toArray(), { color: 'rgba(150,100,0,.95)' });
      /* 코로나 홀 + 열린 자기장(태양풍) */
      const holeD = new THREE.Vector3(0, 1, 0.12).normalize();
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.85, 40), new THREE.MeshBasicMaterial({ color: 0x1b1020, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })); hole.position.copy(holeD).multiplyScalar(RS * 1.01); hole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), holeD); phenG.add(hole);
      const windM = new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.6 }), winds = [];
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2, rr = i === 0 ? 0 : 0.5, off = new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr);
        const p0 = new THREE.Vector3(0, RS * 1.01, 0.3).add(off), dir = p0.clone().normalize().add(off.clone().multiplyScalar(0.5)).normalize();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.8, 5), windM); m.position.copy(p0).addScaledVector(dir, 1.4); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); phenG.add(m);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xcfe9ff })); phenG.add(dot); winds.push({ dot, p0, dir, off: i * 0.31 });
      }
      const labHole = label('코로나 홀 → 태양풍', hole, { color: 'rgba(30,70,130,.92)', size: 11.5 }); labHole.off = [0.0, 0.1, 0];
      /* CME 껍질 */
      const cmeM = new THREE.MeshBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      const cme = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.42), cmeM); cme.visible = false; phenG.add(cme);
      const cDir = fl0.clone().normalize(); cme.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cDir);
      const labCme = label('CME', [0, 0, 0], { color: 'rgba(160,80,0,.95)' });

      /* 높이 h(km) → 장면 반지름 (층 두께를 키워 그렸어요): 광구 0~500 · 채층 500~2000 · 천이층 2000~2100 · 코로나 2100~ */
      const radOf = (h) => (h <= 500 ? RS + (R1 - RS) * h / 500 : h <= 2000 ? R1 + (R2 - R1) * (h - 500) / 1500 : h <= 2100 ? R2 + (R3 - R2) * (h - 2000) / 100 : R3 + 1.8 * Math.min(1, (h - 2100) / 7900));
      const TOF = (h) => (h <= 500 ? 5800 - 1400 * h / 500 : h <= 2000 ? 4400 * Math.pow(20000 / 4400, (h - 500) / 1500) : h <= 2100 ? 20000 * Math.pow(1e6 / 20000, (h - 2000) / 100) : 1e6 * (1 + 0.5 * (h - 2100) / 7900));
      const probe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); root.add(probe);
      const probeLab = label('', probe, { color: 'rgba(12,18,34,.92)' }); probeLab.off = [0.55, 0, 0];
      const LN = ['광구', '채층', '천이층', '코로나'], layerOf = (h) => (h < 500 ? 0 : h < 2000 ? 1 : h < 2100 ? 2 : 3);
      const fmtT = (T) => (T >= 1e5 ? (T / 1e6).toFixed(2) + '×10⁶ K' : Math.round(T / 100) * 100 + ' K');
      function setProbe() {
        const r = radOf(st.h), a = -25 * DEG; probe.position.set(0.03, r * Math.sin(a), r * Math.cos(a)); probe.visible = st.mode === 'layers'; probeLab.show(st.mode === 'layers');
        probeLab.set('높이 ' + Math.round(st.h).toLocaleString('ko-KR') + ' km · ' + fmtT(TOF(st.h)));
      }
      /* 카드 분류 장면(층 이름 카드 · 현상 카드): 3D 막대의 단추로 카드를 고르고 상자에 넣어요 (2D 분류기 cLy · cPair를 그대로 써서 미션 진행이 같아요) */
      const BINL = ['A', 'B', 'C', 'D'];
      const curC = () => { const q = W(), S = q.S || {}; return S.view === 'cards' ? q.cLy : S.view === 'pair' ? q.cPair : null; };
      function cardInfo() {
        const c = curC(); if (!c) return false;
        const it = c.sel >= 0 ? c.items[c.sel] : null, n = c.items.filter((x) => x.loc != null).length;
        const lines = c.cfg.bins.map((b, i) => {
          const inB = c.items.filter((x) => x.loc === i).map((x) => (x.wrong ? '<span style="color:#fca5a5">✗ ' + x.label + '</span>' : x.label));
          return '<b>' + BINL[i] + '</b> ' + b.label.replace(/^[A-D] · /, '') + ' (' + b.sub + ')' + (inB.length ? ' → <b style="color:#ffd34d">' + inB.join(', ') + '</b>' : '');
        });
        info((it ? '고른 카드: <b style="color:#ffd34d">' + it.label + '</b>' : '◀ ▶로 카드를 골라요') + ' · 넣은 카드 ' + n + ' / ' + c.items.length + '<br>' + lines.join('<br>'));
        return true;
      }
      const cardEls = [controls.text('카드')];
      const pickCard = (d) => { const c = curC(); if (!c) return; const n = c.items.length; c.sel = c.sel < 0 ? (d > 0 ? 0 : n - 1) : (c.sel + d + n) % n; cardInfo(); };
      cardEls.push(controls.button('◀', () => pickCard(-1)), controls.button('▶', () => pickCard(1)));
      BINL.forEach((b, i) => cardEls.push(controls.button(b + ' 상자', () => {
        const c = curC(); if (!c || c.sel < 0) return; c.place(c.items[c.sel], i);
        c.sel = c.items.findIndex((x) => x.loc == null); cardInfo();
      })));
      let cardOn = null, cardKey = '';
      function cardTick() {
        const c = curC(), on = !!c;
        if (on !== cardOn) { cardOn = on; cardEls.forEach((e) => { e.style.display = on ? '' : 'none'; }); cardKey = ''; if (!on) { if (st.mode === 'layers') temp(); else phenInfo(); } }
        if (!c) return;
        const k = c.sel + ':' + c.items.map((x) => x.loc + (x.wrong ? 'x' : '')).join(',');
        if (k !== cardKey) { cardKey = k; cardInfo(); }
      }
      function temp() {
        if (cardInfo()) return;
        const q = W(), free = !!(q.game && q.game.free), cards = q.S && q.S.view === 'cards' && !free && !(q.lyOK && q.lyOK());
        info('<b>층 구조</b> (층의 두께는 보기 좋게 키워 그렸어요)<br>높이 ' + Math.round(st.h).toLocaleString('ko-KR') + ' km' + (cards ? '' : ' · <b>' + LN[layerOf(st.h)] + '</b>') + ' · 온도 <b>' + fmtT(TOF(st.h)) + '</b><br>광구(5800 K)에서 올라갈수록 처음엔 식다가, 천이층에서 급상승해 <b>코로나는 100만 K 이상</b>이에요.');
      }
      function phenInfo() { if (cardInfo()) return; info('<b>대기 현상</b><br><span style="color:#ff9d8a">홍염</span>은 자기장 고리를 따라 뜬 가스, <b>플레어</b>는 폭발, <b>CME</b>는 코로나 물질의 방출, <b>코로나 홀</b>에서는 태양풍이 빠르게 나가요.'); }
      function setMode(m) {
        st.mode = m; const L = m === 'layers';
        { const ph = cardEls[0].parentNode && cardEls[0].parentNode.querySelector('.v3-ph'); if (ph) ph.style.visibility = L ? '' : 'hidden'; }   // 구간 이름(광구~코로나)은 층 구조에서만
        capG.visible = L; phenG.visible = !L; streamG.visible = !L; corona.visible = true;
        cutObjs.forEach((o) => (o.visible = L)); fullObjs.forEach((o) => (o.visible = !L));
        chM.opacity = L ? 0.3 : 0.1; trM.opacity = L ? 0.25 : 0.08;
        labL.forEach((l) => l.show(L && st.names)); labProm.show(!L); labFl.show(!L); labHole.show(!L); labCme.show(false);
        setProbe(); L ? temp() : phenInfo(); syncing = true; player.set(L ? pOfH(st.h) : 0); syncing = false;
      }
      /* ▶ 재생: 층 구조에서는 광구에서 코로나까지 높이를 올려 가며 온도를 보여 줘요(2D 높이 슬라이더도 함께 움직여요). 대기 현상에서는 플레어 → CME가 차례로 일어나요 */
      const HB = [[0, 0], [0.22, 500], [0.55, 2000], [0.66, 2100], [1, 10000]];
      const hOfP = (p) => { for (let i = 1; i < HB.length; i++) if (p <= HB[i][0]) return HB[i - 1][1] + (HB[i][1] - HB[i - 1][1]) * (p - HB[i - 1][0]) / (HB[i][0] - HB[i - 1][0]); return 10000; };
      const pOfH = (h) => { for (let i = 1; i < HB.length; i++) if (h <= HB[i][1]) return HB[i - 1][0] + (HB[i][0] - HB[i - 1][0]) * (h - HB[i - 1][1]) / (HB[i][1] - HB[i - 1][1]); return 1; };
      let syncing = false, ready = false;
      const player = controls.player({
        duration: 10, loop: true, autoplay: false, label: '재생',
        phases: [[0, '광구'], [0.22, '채층'], [0.55, '천이층'], [0.66, '코로나']],
        onFrame(p) {
          st.P = p; if (!ready) return;
          if (st.mode === 'layers' && !syncing) { st.h = Math.round(hOfP(p) / 50) * 50; setProbe(); temp(); try { W().setH(st.h); } catch (e) {} }
        },
      });
      ready = true;

      function follow() {
        const q = W(), S = q.S; if (!S) return;
        const m = (S.view === 'phen' || S.view === 'pair') ? 'phen' : 'layers';
        if (m !== st.mode) { setMode(m); }
        if (st.mode === 'layers') {
          if (S.ly && typeof S.ly.h === 'number' && Math.abs(S.ly.h - st.h) > 1) { st.h = S.ly.h; setProbe(); temp(); syncing = true; player.set(pOfH(st.h)); syncing = false; }
          const nm = !(S.view === 'cards' && !(q.game && q.game.free) && !(q.lyOK && q.lyOK()));
          if (nm !== st.names) { st.names = nm; labL.forEach((l) => l.show(nm)); temp(); }
        } else if (S.ph && S.ph.flareN !== st.fN) { st.fN = S.ph.flareN; if (S.ph.flare >= 0) { player.set(0); player.play(); } }
      }
      setMode('layers'); follow();

      const v = new THREE.Vector3();
      return {
        update(dt) {
          follow(); cardTick(); st.t += dt;
          loopM.emissiveIntensity = 0.75 + 0.25 * Math.sin(st.P * Math.PI * 2 * 20);
          if (st.mode === 'phen') {
            const f = Math.sin(Math.min(1, Math.max(0, st.P / 0.35)) * Math.PI), u = Math.min(1, Math.max(0, (st.P - 0.15) / 0.8));
            flare.scale.setScalar(0.3 + 3.2 * f); flare.material.opacity = 0.35 + 0.65 * f;
            if (u > 0 && u < 1) {
              cme.visible = true; const rc = 0.35 + 1.6 * u, r = RS + 0.15 + 4.8 * u; cme.scale.setScalar(rc); cme.position.copy(cDir).multiplyScalar(r);
              cmeM.opacity = Math.max(0, 0.5 * (1 - u)); labCme.obj = cme.position.clone().addScaledVector(cDir, rc + 0.2).toArray(); labCme.show(u < 0.95);
            } else { cme.visible = false; labCme.show(false); }
          }
          winds.forEach((w) => { const u = ((st.P * 4 + w.off) % 1); v.copy(w.p0).addScaledVector(w.dir, u * 2.8); w.dot.position.copy(v); w.dot.scale.setScalar(1 - 0.5 * u); });
          corona.material.opacity = 0.9 + 0.1 * Math.sin(st.P * Math.PI * 2 * 13);
        },
        sync() { st.key = null; follow(); },
      };
    },
  });
})();
