/* m2-atom-molecule · 3D 입자 모형
   2D 실험의 물질과 같아요: 원자로 존재(헬륨 · 네온 · 구리) · 분자로 존재(산소 · 이산화 탄소 · 물 · 메테인) · 이온으로 존재(소금).
   '나누기'(▶ 재생)로 분자를 원자로 나누면 더 이상 그 물질의 성질이 없어요. (결합의 원리 · 분자 모양 설명은 이 차시에서 다루지 않아요.)
   2D 입자 현미경에서 관찰 중인 물질, 1단계에서 물 분자를 나눈 상태를 따라가요.
   3D 단계: 2단계(분류) · 3단계(세어 보기 · CO₂ 조립) · 4단계(분류). 아래 막대의 관찰 단추로 물질을 고르고 분류 단추로 나누며,
   원자 단추로 탄소·산소 원자를 넣어 조립해요 (2D의 끌어 놓기와 같은 결과). 1단계(물방울 나누기·축척)는 2D예요. */
(function () {
  'use strict';
  if (!window.SciSim3D) return;
  const COL = { H: 0xf5f7fb, C: 0x3a3f4b, O: 0xef4b4b, He: 0x7fd8e8, Ne: 0xff8a5c, Cu: 0xc7743b, Na: 0x9b7be0, Cl: 0x3fbf5f };   // 2D 실험과 같은 색
  const NAME = { H: '수소', C: '탄소', O: '산소', He: '헬륨', Ne: '네온', Cu: '구리', Na: '나트륨', Cl: '염소' };
  const RB = { H: 0.26, C: 0.4, O: 0.38, He: 0.5, Ne: 0.55, Cu: 0.88, Na: 0.5, Cl: 0.72 };      // 공 반지름 (Å 단위 장면)
  const T4 = 0.63;
  // 좌표(Å)는 2D 실험 화면의 분자 자료와 같아요.
  const MOLS = {
    He:  { f: 'He', name: '헬륨', kind: 'atom', atoms: [['He', 0, 0, 0]], bonds: [], cap: '헬륨 원자가 하나씩 따로 떨어져 빠르게 날아다녀요.' },
    Ne:  { f: 'Ne', name: '네온', kind: 'atom', atoms: [['Ne', 0, 0, 0]], bonds: [], cap: '네온 원자가 하나씩 따로 떨어져 빠르게 날아다녀요.' },
    Cu:  { f: 'Cu', name: '구리', kind: 'metal', atoms: [], bonds: [], cap: '구리 원자가 규칙적으로 끝없이 이어져 있어요. 제자리에서 떨기만 해요.' },
    O2:  { f: 'O₂', name: '산소', kind: 'mol', atoms: [['O', -0.6, 0, 0], ['O', 0.6, 0, 0]], bonds: [[0, 1, 2]] },
    CO2: { f: 'CO₂', name: '이산화 탄소', kind: 'mol', atoms: [['O', -1.16, 0, 0], ['C', 0, 0, 0], ['O', 1.16, 0, 0]], bonds: [[0, 1, 2], [1, 2, 2]] },
    H2O: { f: 'H₂O', name: '물', kind: 'mol', atoms: [['O', 0, 0.2, 0], ['H', -0.76, -0.39, 0], ['H', 0.76, -0.39, 0]], bonds: [[0, 1, 1], [0, 2, 1]] },
    CH4: { f: 'CH₄', name: '메테인', kind: 'mol', atoms: [['C', 0, 0, 0], ['H', T4, T4, T4], ['H', T4, -T4, -T4], ['H', -T4, T4, -T4], ['H', -T4, -T4, T4]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
    NaCl: { f: 'NaCl', name: '소금', kind: 'ion', atoms: [], bonds: [], cap: '(+)전하를 띤 입자와 (−)전하를 띤 입자가 번갈아 규칙적으로 배열해 있어요. 이렇게 전하를 띤 입자를 <b>이온</b>이라고 해요.' },
  };
  const KEYS = ['He', 'Ne', 'Cu', 'O2', 'CO2', 'H2O', 'CH4', 'NaCl'];
  // 2D 입자 현미경의 시료 이름 → 이 모형의 키
  const OF2D = { he: 'He', ne: 'Ne', cu: 'Cu', o2: 'O2', co2: 'CO2', h2o: 'H2O', ch4: 'CH4', nacl: 'NaCl' };
  // 소금: 나트륨 이온(+)과 염화 이온(−)이 번갈아 쌓인 작은 조각 (3×3×3)
  (function () {
    const d = 1.45, a = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) a.push([(x + y + z) % 2 === 0 ? 'Na' : 'Cl', x * d, y * d, z * d]);
    MOLS.NaCl.atoms = a;
  })();
  // 구리: 면심 입방(최조밀) 조각, 1 Å 단위 (Cu–Cu 약 2.56 Å)
  (function () {
    const d = 2.56 / Math.SQRT2, a = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) if ((x + y + z) % 2 === 0 && x * x + y * y + z * z <= 2) a.push(['Cu', x * d, y * d, z * d]);
    MOLS.Cu.atoms = a;
  })();

  window.SciSim3D.attach({
    title: '원자와 분자 3D 모형',
    hint: '드래그: 돌리기 · 휠/두 손가락: 확대',
    camera: { dist: 4.6, theta: 0.6, phi: 1.2, min: 3, max: 16 },
    autoRotate: 0.3,
    levels: [1, 2, 3],               // 2~4단계는 3D (1단계: 물방울을 1/10씩 나누며 축척을 보는 장면이라 2D)
    build(ctx) {
      const { THREE, root, label, info, controls } = ctx;
      const MT = ctx.mats, lin = (h) => new THREE.Color(h).convertSRGBToLinear();   // 화면에 2D와 같은 진한 색으로 보이게
      const DBG = () => window.__sim || {};
      const ID2D = {}; Object.keys(OF2D).forEach((k) => { ID2D[OF2D[k]] = k; });
      let fbMsg = '', fbT = 0;   // 분류 단추를 눌렀을 때의 알림 (잠깐 보여 줘요)
      let key = 'H2O', style = 'ball', split = 0;
      const g = new THREE.Group(); root.add(g);
      const atomObjs = [], bondObjs = [], labs = [];
      const UP = new THREE.Vector3(0, 1, 0);
      const stickMat = MT.metal(0xaab3c2, { roughness: 0.26 });
      function sphere(r, col) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), MT.plastic(lin(col), { roughness: 0.24, extra: { clearcoat: 0.85, clearcoatRoughness: 0.12, envMapIntensity: 1.15 } }));
        m.castShadow = true;
        const h = new THREE.Mesh(new THREE.SphereGeometry(r * 1.38, 20, 14), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending }));   // 전자 구름 느낌의 부드러운 빛 번짐
        m.add(h); return m;
      }
      /* 무대: 반짝이는 받침판 + 떠다니는 빛 알갱이 (분자가 빈 공간에 떠 있지 않게) */
      const stage = new THREE.Group(); root.add(stage);
      { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
        const gr = x.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#2a3b66'); gr.addColorStop(1, '#0b1226'); x.fillStyle = gr; x.beginPath(); x.arc(256, 256, 255, 0, 7); x.fill();
        x.strokeStyle = 'rgba(140,180,255,.35)'; x.lineWidth = 2; for (let r = 40; r < 256; r += 36) { x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); }
        x.strokeStyle = 'rgba(140,180,255,.18)'; for (let a = 0; a < 12; a++) { x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(a * Math.PI / 6) * 255, 256 + Math.sin(a * Math.PI / 6) * 255); x.stroke(); }
        const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.55, 0.14, 64), [new THREE.MeshStandardMaterial({ color: 0x1b2540, metalness: 0.6, roughness: 0.3 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, metalness: 0.1 }), new THREE.MeshStandardMaterial({ color: 0x1b2540, metalness: 0.6, roughness: 0.3 })]);
        disc.receiveShadow = true; stage.add(disc);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(3.47, 0.045, 8, 80), new THREE.MeshStandardMaterial({ color: 0x7fb0ff, emissive: 0x3a6cff, emissiveIntensity: 0.8 })); rim.rotation.x = Math.PI / 2; stage.add(rim);
        const pos = []; let sd = 11; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
        for (let i = 0; i < 140; i++) { const a = rr() * 6.283, r = 3 + rr() * 9, y = (rr() - 0.3) * 9; pos.push(Math.cos(a) * r, y, Math.sin(a) * r); }
        const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const pts = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0x9fc0ff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.5 })); pts.position.y = 2; pts.userData.v3bg = true; root.add(pts); }
      stage.traverse((o) => { if (o.isMesh) o.userData.v3bg = true; });   // 받침판은 배경: 자동 맞춤이 분자에 맞춰 크게 보여 줘요
      function floorAt(y) { stage.position.y = y; }
      function place(m, a, b) {
        const d = b.clone().sub(a), len = Math.max(1e-4, d.length());
        m.position.copy(a).add(b).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(UP, d.normalize());
        m.scale.set(1, len, 1);
      }
      function fitCamera() { // 입자 크기와 화면 비율에 맞춰 처음 거리를 정해요
        const v = ctx.renderer.domElement, asp = Math.max(0.3, v.clientWidth / Math.max(1, v.clientHeight));
        const base = key === 'Cu' || key === 'NaCl' ? 12.5 : key === 'He' || key === 'Ne' ? 4 : key === 'CO2' ? 6.2 : 4.6;
        ctx.orbit.dist = base * (asp < 1 ? Math.min(2, Math.pow(1 / asp, 0.75)) : 1);
      }
      function clearAll() {
        while (g.children.length) g.remove(g.children[0]);
        atomObjs.length = 0; bondObjs.length = 0; labs.forEach((l) => l.show(false));
      }
      function build() {
        clearAll();
        const M = MOLS[key];
        M.atoms.forEach((a, i) => {
          const s = a[0], m = sphere(style === 'ball' ? RB[s] : RV[s] * 0.62, COL[s]);
          m.userData.base = new THREE.Vector3(a[1], a[2], a[3]);
          m.position.copy(m.userData.base);
          g.add(m); atomObjs.push(m);
          if (!labs[i]) labs[i] = label('', m);
          labs[i].obj = m; labs[i].set(a[0]); labs[i].show(M.atoms.length <= 5); labs[i].off = [0, style === 'ball' ? RB[s] + 0.3 : RV[s] * 0.62 + 0.25, 0];
        });
        M.bonds.forEach(([i, j, o]) => {
          const ms = [];
          const nb = o;
          for (let k = 0; k < nb; k++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(nb > 1 ? 0.05 : 0.08, nb > 1 ? 0.05 : 0.08, 1, 14), stickMat); g.add(m); ms.push(m); }
          bondObjs.push({ i, j, o, ms, show: style === 'ball' });
        });
        floorAt(Math.min.apply(null, M.atoms.map((a) => a[2] - RB[a[0]])) - 0.4);
        refresh();
      }
      function refresh() {
        const M = MOLS[key];
        const f = 1 + split * 1.3;
        atomObjs.forEach((m) => m.position.copy(m.userData.base).multiplyScalar(M.kind === 'mol' ? f : 1));
        bondObjs.forEach((b) => {
          const A = atomObjs[b.i].position, B = atomObjs[b.j].position;
          const dir = B.clone().sub(A).normalize();
          const side = new THREE.Vector3(0, 0, 1);
          if (Math.abs(dir.dot(side)) > 0.9) side.set(0, 1, 0);
          side.cross(dir).normalize();                // 결합 방향에 수직인 방향 (이중·삼중 결합용)
          b.ms.forEach((m, k) => {
            const off = side.clone().multiplyScalar((k - (b.o - 1) / 2) * 0.17);
            place(m, A.clone().add(off), B.clone().add(off));
            m.visible = b.show && split < 0.12;
          });
        });
        text();
      }
      function text() {
        const M = MOLS[key];
        const l = DBG(), inScope = l.S && l.S.scene === 'scope', id = ID2D[key];
        const fb = fbT > 0 && fbMsg ? fbMsg + '<br>' : '';
        if (inScope && l.SCP && !l.SCP.cur) { info(fb + '아래 <b>관찰</b> 단추로 물질을 하나 골라 입자의 모습을 살펴봐요.'); return; }
        if (inScope && l.SCP && !(l.SCP.placed && l.SCP.placed[id])) {
          // 분류하기 전에는 정답(원자·분자·이온)을 말하지 않고 모습만 보여 줘요
          const S0 = l.SAMPLES && l.SAMPLES[id];
          info(fb + '<b>' + M.name + ' (' + M.f + ')</b><br>' + (S0 ? S0.cap : M.cap || '') + '<br><span style="color:#9fb0d4">입자의 모습을 보고 아래 단추로 분류해 봐요.</span>');
          return;
        }
        if (fb) { info(fb + '<b>' + M.name + ' (' + M.f + ')</b>'); return; }
        if (M.kind === 'atom') {
          info('<b>' + M.name + ' (' + M.f + ')</b> · 원자로 존재<br>' + M.cap);
        } else if (M.kind === 'metal') {
          info('<b>' + M.name + ' (' + M.f + ')</b> · 원자로 존재<br>' + M.cap + '<br><span style="color:#9fb0d4">(13개만 떼어 낸 조각)</span>');
        } else if (M.kind === 'ion') {
          info('<b>' + M.name + ' (' + M.f + ')</b> · 이온으로 존재<br>' + M.cap + '<br><span style="color:#9fb0d4">(27개만 떼어 낸 조각 · 나트륨 이온 <b style="color:#b9a3f0">(+)</b> · 염화 이온 <b style="color:#6fdc8c">(−)</b>)</span>');
        } else {
          const cnt = {}; M.atoms.forEach((a) => { cnt[a[0]] = (cnt[a[0]] || 0) + 1; });
          const parts = Object.keys(cnt).map((s) => NAME[s] + ' 원자 ' + cnt[s] + '개').join(' + ');
          if (split > 0.7) info('<b>분자를 나누었어요!</b><br>' + parts + '로 흩어졌어요. 원자는 더 이상 <b>' + M.name + '</b>의 성질을 갖지 않아요.');
          else if (split > 0.12) info('<b>' + M.name + ' 분자(' + M.f + ')</b>를 나누는 중…<br>결합이 끊어지고 있어요.');
          else info('<b>' + M.name + ' 분자 (' + M.f + ')</b> · 분자로 존재<br>' + parts + '가 결합한 입자(분자) 1개예요. 물질의 성질을 가진 가장 작은 입자예요.');
        }
      }
      let pl = null, ctlEl = null, pmode = false, pP = 0;
      function playerRow(on) { if (!ctlEl) ctlEl = ctx.renderer.domElement.closest('.v3-wrap').querySelector('.v3-ctl'); const r = ctlEl && ctlEl.querySelector('.v3-player'); if (r) r.style.display = on ? '' : 'none'; const ri = ctlEl && [...ctlEl.querySelectorAll('input[type=range]')].find((x) => !x.closest('.v3-player')); if (ri) { ri.style.display = on ? '' : 'none'; if (ri.previousElementSibling) ri.previousElementSibling.style.display = on ? '' : 'none'; } }
      function setKey(k) { key = k; split = 0; sl.set(0); fitCamera(); build(); playerRow(MOLS[k].kind === 'mol'); if (ctx.refit) ctx.refit(0.3); }
      // 관찰 단추: 2D 입자 현미경에 그 시료를 넣어 관찰하는 것과 같아요
      const segLab = controls.text('<b>관찰</b>');
      const seg = controls.segment('', KEYS.map((k) => ({ value: k, label: MOLS[k].name })), key, (v) => { const l = DBG(); if (l.observe && l.S && l.S.scene === 'scope') l.observe(ID2D[v]); setKey(v); });
      const segBtns = Array.from(segLab.parentNode.querySelectorAll('button')).slice(-KEYS.length);
      // 분류 단추: 지금 관찰 중인 물질을 상자에 넣는 것과 같아요
      const sortLab = controls.text('<b>분류</b>');
      const BOXN = { atom: '원자로 존재', mol: '분자로 존재', ion: '이온으로 존재' };
      const sortBtns = ['atom', 'mol', 'ion'].map((bk) => ({ bk, b: controls.button(BOXN[bk], () => {
        const l = DBG(), S = l.SCP; if (!S || !l.classify) return;
        const id = S.cur;
        if (!id) { flash('먼저 <b>관찰</b> 단추로 물질을 골라 관찰해요.'); return; }
        if (S.placed[id]) { flash('<b>' + MOLS[key].name + '</b>은(는) 이미 분류했어요. 다른 물질을 골라요.'); return; }
        const why = l.scpWhy ? l.scpWhy(id, bk) : '';
        if (l.classify(id, bk)) flash('✔ <b>' + MOLS[key].name + '</b>: ' + BOXN[bk] + '하는 물질이에요!');
        else flash('✗ ' + why);
      }) }));
      function flash(h) { fbMsg = h; fbT = 3.2; text(); }
      // 원자 넣기 단추: 원자 바구니에서 원자를 꺼내 조립 원에 놓는 것과 같아요
      const buildLab = controls.text('<b>원자 넣기</b>');
      const atomBtns = [['C', '탄소'], ['O', '산소']].map(([sym, nm]) => controls.button(nm + ' 원자', () => { const l = DBG(); if (l.ctAddAtom && !l.ctAddAtom(sym)) flash('조립대가 가득 찼어요. ↺ 원자 비우기로 비워요.'); }));
      /* 3D 화면 오른쪽 위의 작은 판 (휴대폰에서는 오른쪽 아래): 2D 화면의 표 · 기록을 3D에서도 보여 줘요 */
      function v3xPan(cls) { const vEl = ctx.renderer.domElement.parentElement;
        if (!document.getElementById('v3x-css')) { const c = document.createElement('style'); c.id = 'v3x-css'; c.textContent =
          '.v3x-pan{position:absolute;right:10px;top:10px;max-width:52%;padding:6px 9px;border-radius:12px;background:rgba(8,12,24,.76);color:#fff;font-size:12px;line-height:1.35;pointer-events:none;z-index:2}' +
          '.v3x-pan .h{font-weight:800;margin-bottom:3px}.v3x-pan table{border-collapse:collapse}.v3x-pan th,.v3x-pan td{padding:1px 5px;text-align:left;white-space:nowrap}.v3x-pan th{color:#9fb0cc;font-weight:700;font-size:11px}.v3x-pan .q{color:#7d8aa3}.v3x-pan .now td{background:rgba(255,255,255,.1)}' +
          '.v3x-pan .c{display:inline-block;margin:1px 2px;padding:1px 6px;border-radius:8px;background:rgba(255,255,255,.14)}.v3x-pan .ok{color:#86efac}.v3x-pan .bad{color:#fca5a5}' +
          '@media (max-width:599px){.v3x-pan{top:auto;bottom:28px;right:6px;font-size:10.5px;max-width:64%;padding:4px 6px}.v3x-pan th{font-size:9.5px}.v3x-pan th,.v3x-pan td{padding:0 3px}}';
          document.head.appendChild(c); }
        const el = document.createElement('div'); el.className = 'v3x-pan' + (cls ? ' ' + cls : ''); el.style.display = 'none'; vEl.appendChild(el);
        let sig = null; return { set(h) { if (h === sig) return; sig = h; el.style.display = h ? '' : 'none'; if (h) el.innerHTML = h; }, el }; }
      const binPan = v3xPan();
      /* 🗂️ 분류 상자: 2D의 상자에 들어간 물질을 3D에서도 보여 줘요 */
      function drawBins(l) {
        const S = l.SCP; if (!(l.S && l.S.scene === 'scope' && S)) { binPan.set(''); return; }
        const boxes = ['atom', 'mol'].concat(S.list.indexOf('nacl') >= 0 ? ['ion'] : []);
        binPan.set('<div class="h">🗂️ 분류 상자 (' + S.list.filter((id) => S.placed[id]).length + ' / ' + S.list.length + ')</div>' + boxes.map((bk) => {
          const ids = S.list.filter((id) => S.placed[id] === bk);
          return '<div>' + BOXN[bk] + ': ' + (ids.length ? ids.map((id) => '<span class="c">' + MOLS[OF2D[id]].name + '</span>').join('') : '<span class="q">—</span>') + '</div>'; }).join(''));
      }
      let barSig = '', barCur = '';
      function bar(l) {
        const sc = l.S ? l.S.scene : '', S = l.SCP, scope = sc === 'scope' && !!S, bld = sc === 'count' && !!(l.ctBuildOn && l.ctBuildOn());
        const list = scope ? S.list.join() : '', placed = scope ? S.list.map((id) => S.placed[id] || '').join() : '';
        const cur = scope ? S.cur || '' : '-';
        if (sc !== 'count' && cur !== barCur) { g.visible = !!cur; if (!cur) { labs.forEach((x) => x.show(false)); playerRow(false); } else { if (cur !== '-' && OF2D[cur] === key) build(); playerRow(MOLS[key].kind === 'mol'); } }
        barCur = cur;
        drawBins(l);
        const sig = sc + '|' + bld + '|' + list + '|' + placed + '|' + cur;
        if (sig === barSig) return; barSig = sig;
        const show = (el, on) => { el.style.display = on ? '' : 'none'; };
        show(segLab, sc !== 'count'); show(sortLab, scope);
        if (scope && !cur) text();
        segBtns.forEach((b, i) => { const id = ID2D[KEYS[i]]; b.classList.toggle('on', scope ? cur === id : KEYS[i] === key); show(b, sc === 'count' ? false : scope ? S.list.indexOf(id) >= 0 : true); b.textContent = MOLS[KEYS[i]].name + (scope && S.placed[id] ? ' ✓' : ''); });
        sortBtns.forEach((q) => show(q.b, scope && (q.bk !== 'ion' || S.list.indexOf('nacl') >= 0)));
        show(buildLab, bld); atomBtns.forEach((b) => show(b, bld));
      }
      const sl = { set() {} };   // (나누기 정도는 ▶ 분자 나누기 재생 막대로 골라요)
      // ▶ 재생: 분자 1개가 원자로 나뉘었다가 다시 모여요 (분자를 나누면 원자 — 물질의 성질이 사라져요)
      const ease = (x) => x * x * (3 - 2 * x);
      pl = controls.player({
        duration: 8, loop: true, autoplay: false, label: '분자 나누기',
        phases: [[0, '분자 1개'], [0.2, '나누는 중'], [0.5, '원자로 흩어졌어요'], [0.72, '다시 모여요']],
        onFrame(p) {
          if (!pl) return; pmode = true; pP = p;
          const sc0 = window.__sim && window.__sim.S && window.__sim.S.scene; if (sc0 === 'count') return;
          const v = p < 0.2 ? 0 : p < 0.5 ? ease((p - 0.2) / 0.3) : p < 0.72 ? 1 : 1 - ease((p - 0.72) / 0.28);
          split = v; sl.set(v); refresh();
        },
      });
      fitCamera(); build(); playerRow(MOLS[key].kind === 'mol');


      /* ===== 장면 count (원소 · 원자 · 분자 구별하기): 2D 렌즈 상자 속 분자들을 3D로 — 분자 렌즈 · 원자 렌즈 · 원소 렌즈 ===== */
      const gN = new THREE.Group(); gN.visible = false; root.add(gN);
      const cnLab = label('', [0, 2.6, 0], { size: 13, color: 'rgba(30,64,175,.92)' });
      const cnLabs = [];
      let cnSig = '', cnLens = 'mol';
      const cnObj = { halos: [], atoms: [], bonds: [], free: [] };
      const ELCOL = { H: 0xf5f7fb, O: 0xef4b4b, C: 0x3a3f4b };
      const lensTxt = { mol: '분자 렌즈', atom: '원자 렌즈', elem: '원소 렌즈' };
      function clearCount() { while (gN.children.length) gN.remove(gN.children[0]); cnObj.halos.length = cnObj.atoms.length = cnObj.bonds.length = cnObj.free.length = 0; cnLabs.forEach((l) => l.show(false)); }
      function buildCount(mols, freeAtoms) {
        clearCount();
        const n = mols.length, per = n > 4 ? 3 : n, gapX = 3.6;
        let li = 0;
        mols.forEach((mk, mi) => {
          const M = MOLS[mk], col = mi % per, row = Math.floor(mi / per);
          const cx = (col - (Math.min(per, n) - 1) / 2) * gapX, cy = -row * 3.2 + (n > 4 ? 1.1 : 0);
          const grp = new THREE.Group(); grp.position.set(cx, cy, 0); gN.add(grp);
          const halo = new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 20), MT.glass({ tint: 0x9cc4ff, opacity: 0.17 })); grp.add(halo); cnObj.halos.push(halo);
          const objs = M.atoms.map((a, ai) => { const m = sphere(RB[a[0]], COL[a[0]]); m.position.set(a[1], a[2], a[3]); grp.add(m); const L = cnLabs[li] || (cnLabs[li] = label('', m)); li++; L.obj = m; L.off = [0, RB[a[0]] + 0.3, 0]; cnObj.atoms.push({ m, sym: a[0], L, mi }); return m; });
          M.bonds.forEach(([i, j, o]) => { const ms = []; for (let k = 0; k < o; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(o > 1 ? 0.05 : 0.08, o > 1 ? 0.05 : 0.08, 1, 12), stickMat); grp.add(b); ms.push(b); }
            const A = objs[i].position, B = objs[j].position, dir = B.clone().sub(A).normalize(), side = new THREE.Vector3(0, 0, 1); if (Math.abs(dir.dot(side)) > 0.9) side.set(0, 1, 0); side.cross(dir).normalize();
            ms.forEach((b, k) => place(b, A.clone().add(side.clone().multiplyScalar((k - (o - 1) / 2) * 0.17)), B.clone().add(side.clone().multiplyScalar((k - (o - 1) / 2) * 0.17))));
            cnObj.bonds.push(ms); });
        });
        // 조립대에 올려 둔 떨어진 원자
        floorAt(n > 4 ? -4.2 : -3.6);
        freeAtoms.forEach((sym, i) => { const m = sphere(RB[sym], COL[sym]); m.position.set((i - (freeAtoms.length - 1) / 2) * 1.2, -3.0, 0.5); gN.add(m); cnObj.free.push(m); });
      }
      function updCount(l, t) {
        const CT = l && l.CT; if (!CT) return;
        const mols = CT.mols.map((m) => m.key), freeA = CT.atoms.filter((a) => a.state === 'in').map((a) => a.sym);
        const sig = mols.join() + '|' + freeA.join();
        if (sig !== cnSig) { cnSig = sig; buildCount(mols, freeA); const asp = ctx.renderer.domElement.clientWidth / Math.max(1, ctx.renderer.domElement.clientHeight); ctx.orbit.dist = (mols.length > 4 ? 12 : mols.length > 1 ? 10 : 7) * (asp < 1 ? Math.min(2, Math.pow(1 / asp, 0.7)) : 1); if (ctx.refit) ctx.refit(0.3); }
        const lens = pmode ? (pP < 0.34 ? 'mol' : pP < 0.67 ? 'atom' : 'elem') : (CT.lens || 'mol');
        const cnt = {}; let na = 0; cnObj.atoms.forEach((o) => { cnt[o.sym] = (cnt[o.sym] || 0) + 1; na++; });
        // 렌즈별 보여 주기: 분자(분자마다 둥근 테두리) · 원자(원자마다 번호) · 원소(원소별 같은 색 + 이름)
        cnObj.halos.forEach((h) => { h.visible = lens === 'mol'; });
        let k = 0;
        cnObj.atoms.forEach((o) => {
          k++;
          if (lens === 'atom') { o.m.material.color.setHex(0xe7ebf3); o.L.set(String(k)); o.L.show(true); }
          else if (lens === 'elem') { o.m.material.color.copy(lin(COL[o.sym])); o.L.set(NAME[o.sym]); o.L.show(true); }
          else { o.m.material.color.copy(lin(COL[o.sym])); o.L.show(false); }
        });
        cnObj.bonds.forEach((ms) => ms.forEach((b) => { b.visible = lens !== 'atom'; }));
        const nm = mols.length;
        cnLab.obj = [0, nm > 4 ? 3.9 : 2.7, 0];
        const showN = CT.mode === 'build';   // 세어 보기 퀴즈에서는 합계를 미리 쓰지 않아요 (2D처럼 하나씩 번호만)
        if (!showN) cnLab.set(lens === 'mol' ? '🫧 분자 렌즈: 덩어리를 세어 봐요' : lens === 'atom' ? '⚪ 원자 렌즈: 번호를 세어 봐요' : '🎨 원소 렌즈: 종류를 세어 봐요'); else
        cnLab.set(nm ? (lens === 'mol' ? '분자 <b>' + nm + '개</b>' : lens === 'atom' ? '원자 <b>' + na + '개</b>' : '원소 <b>' + Object.keys(cnt).length + '가지</b> (' + Object.keys(cnt).map((s) => NAME[s] + ' ' + cnt[s] + '개').join(' · ') + ')') : '조립대가 비어 있어요'); cnLab.show(true);
        const f = (fbT > 0 && fbMsg ? '<br>' + fbMsg : '') + (freeA.length ? '<br>조립대의 원자: ' + freeA.length + '개 (탄소 원자 1개와 산소 원자 2개가 모이면 CO₂ 분자가 만들어져요)' : CT.mode === 'build' ? '<br>아래 <b>탄소 원자 · 산소 원자</b> 단추로 원자를 넣으면 분자가 만들어져요.' : '');
        const ph = document.querySelector('.v3-player .v3-ph'); if (ph) ph.textContent = pmode ? lensTxt[lens] : '';
        setCountInfo((pmode ? '<b>▶ ' + lensTxt[lens] + '</b><br>' : '') + (lens === 'mol' ? '<b>분자 렌즈</b>: 원자들이 결합한 한 덩어리를 세어요.' + (showN ? ' 분자는 <b>' + nm + '개</b>예요.' : ' 둥근 테두리가 분자 1개예요.') : lens === 'atom' ? '<b>원자 렌즈</b>: 분자를 이루는 원자 하나하나를 세어요.' + (showN ? ' 원자는 모두 <b>' + na + '개</b>예요.' : ' 공마다 번호가 붙어 있어요.') : '<b>원소 렌즈</b>: 원자의 <b>종류</b>를 세어요.' + (showN ? ' 원소는 <b>' + Object.keys(cnt).length + '가지</b>예요.' : ' 같은 색 · 같은 이름이 같은 원소예요.')) + ' (분자 속 원자의 수는 분자마다 달라요.)' + f);
      }
      let cnTxt = ''; const setCountInfo = (h) => { if (h !== cnTxt) { cnTxt = h; info(h); } };
      /* 2D 실험을 따라가요: 1단계에서 물 분자를 나눈 상태, 입자 현미경에서 관찰 중인 물질 */
      let lastSig = '', k0 = 0;
      function from2D() {
        const s = window.__sim; if (!s || !s.S) return;
        let k = null, sp = null;
        if (s.S.scene === 'zoom' && s.ZM) { k = 'H2O'; sp = s.ZM.split ? 1 : 0; }
        else if (s.S.scene === 'scope' && s.SCP && s.SCP.cur && OF2D[s.SCP.cur]) k = OF2D[s.SCP.cur];
        const sig = (k || '') + ':' + (sp == null ? '' : sp);
        if (!k || sig === lastSig) return; lastSig = sig;
        if (k !== key) { seg.set(k); setKey(k); }
        if (sp != null && MOLS[key].kind === 'mol') { if (pl) pl.pause(); split = sp; sl.set(sp); refresh(); }
      }
      let prevSc = '';
      return { sync: from2D, update(dt) {
        const l = ctx.lesson && ctx.lesson(), sc = l && l.S ? l.S.scene : '';
        if (fbT > 0) { fbT -= dt || 0.016; if (fbT <= 0 && sc !== 'count') text(); }
        if (l) bar(l);
        if (sc !== prevSc) { if (pmode) { pmode = false; if (pl) pl.pause(); } prevSc = sc; const isC = sc === 'count'; gN.visible = isC; g.visible = !isC; if (isC) { labs.forEach((x) => x.show(false)); cnSig = ''; playerRow(false); } else { cnLab.show(false); cnLabs.forEach((x) => x.show(false)); playerRow(MOLS[key].kind === 'mol'); fitCamera(); build(); lastSig = ''; text(); } }
        if (sc === 'count') { updCount(l, 0); return; }
        if ((k0++ % 10) === 0) from2D();
      } };
    },
  });
})();
