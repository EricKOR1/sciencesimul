/* =========================================================
   3D 보기 도우미 (three.js)
   실험 화면 위에 '🧊 3D로 보기' 창을 열어 입체 모형을 돌려 보며 공부해요.
   three.js는 창을 처음 열 때만 불러와요 (assets/vendor/three.min.js, r149, MIT).

   const v3 = SciSim3D.attach({
     host: '.stage-canvas',            // 3D 창을 덮을 요소 (기본: 첫 .stage-canvas)
     button: '#modeSeg' | null,        // 버튼을 넣을 곳 (기본: .stage-toolbar, 없으면 화면 오른쪽 위)
     label: '🧊 3D',                   // 버튼 글자
     title: '분자 모양 3D',             // 창 제목
     hint: '드래그해서 돌려 보세요',      // (선택) 창 아래 안내
     camera: { dist: 8, theta: 0.6, phi: 1.1, fov: 45, target: [0,0,0] },
     autoRotate: 0.25,                 // 사용자가 만지기 전 천천히 회전 (rad/s, 0이면 정지)
     levels: [0, 1],                   // (선택) 3D로 보여 줄 단계(0부터). 나머지 단계는 2D. 없으면 모든 단계가 3D
     fit: true,                        // (선택) 세로로 긴 화면에서 자동으로 물러서서 보기 (false면 끔)
     studio: true, shadows: true,      // (선택) 스튜디오 환경광 · 그림자 (차시가 조명을 직접 두면 자동으로 꺼짐)
     build(ctx) {                      // 처음 열 때 한 번: ctx = { THREE, scene, camera, root, label(), info(), controls() }
       // root(THREE.Group)에 물체를 추가하고, 매 프레임 update(dt, t)를 돌려줘요
       return { update(dt, t) {}, sync() {} };
     },
     onOpen() {}, onClose() {},
   });
   v3.open(); v3.close(); v3.sync();   // sync: 실험 상태가 바뀌었을 때 3D 모형을 다시 맞추기
   ctx.controls.player({...})          // ▶ 재생/⏸ 멈춤 + 진행 막대 + 빠르기: 한 주기의 움직임을 반복 재생 (아래 player 설명)
   ctx.level / ctx.onLevel(fn)         // 지금 학습 단계 / 단계가 바뀔 때 → 2D와 같은 장면으로 맞추기
   ctx.lesson()                        // 2D 실험 상태(window.__sim) — 2D와 3D가 같은 값을 보여 주도록
   label(text, obj, { tap: fn }) / L.tap(fn)  // 이름표를 눌러도 물체를 누른 것과 같게 (작거나 움직이는 물체)
   ※ 한 단계에는 한 가지 화면만 나와요: levels에 든 단계는 3D, 나머지 단계는 2D (2D↔3D 전환 버튼 없음).
     기기 사양이 낮거나 3D가 너무 느리면 3D 단계도 2D로 보여 줘요. 첫 화면 '3D 끄기'(localStorage 'sciencesimul:view' = '2d')도 같아요.
   ========================================================= */
(function (global) {
  'use strict';
  const doc = global.document;
  const me = doc.currentScript && doc.currentScript.src;
  const BASE = me ? me.replace(/js\/sim3d\.js(\?.*)?$/, '') : '../../assets/';
  let loading = null;

  function loadThree() {
    if (global.THREE) return Promise.resolve(global.THREE);
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = doc.createElement('script');
      s.src = BASE + 'vendor/three.min.js';
      s.onload = () => (global.THREE ? res(global.THREE) : rej(new Error('three.js not found')));
      s.onerror = () => rej(new Error('three.js load failed'));
      doc.head.appendChild(s);
    });
    return loading;
  }

  let glOK = null;
  function webglOK() {
    if (glOK != null) return glOK;
    try { const c = doc.createElement('canvas'); glOK = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { glOK = false; }
    return glOK;
  }

  /* 보기 설정: 'auto'(기기에 맞게) | '3d' | '2d'  — 모든 차시에 함께 적용돼요 */
  const VIEW_KEY = 'sciencesimul:view', SLOW_KEY = 'sciencesimul:slow3d', QUAL_KEY = 'sciencesimul:q3d';
  const ls = {
    get(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) global.localStorage.removeItem(k); else global.localStorage.setItem(k, v); } catch (e) { /* 무시 */ } },
  };
  function pref() { return ls.get(VIEW_KEY) === '2d' ? '2d' : 'auto'; }
  function setPref(v) { ls.set(VIEW_KEY, v === 'auto' ? null : v); if (v !== '2d') ls.set(SLOW_KEY, null); }
  // 기기 사양 추정: WebGL이 없거나, 메모리 2GB 이하·CPU 2코어 이하이거나, 전에 3D가 너무 느렸던 기기는 2D로 시작
  function capable() {
    if (!webglOK()) return false;
    const n = global.navigator || {};
    if (n.deviceMemory && n.deviceMemory <= 2) return false;
    if (n.hardwareConcurrency && n.hardwareConcurrency <= 2) return false;
    if (ls.get(SLOW_KEY) === '1') return false;
    return true;
  }
  function start3D() { return pref() === '2d' ? false : capable(); }
  function toast(msg) { try { global.SciSim && global.SciSim.toast && global.SciSim.toast(msg); } catch (e) { /* 무시 */ } }

  let cssDone = false;
  function injectCSS() {
    if (cssDone) return; cssDone = true;
    const st = doc.createElement('style');
    st.textContent = `
.v3-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--surface-2, #f3f5f8); border: 1px solid var(--line, #e3e7ee); flex: none; }
.v3-seg button { min-height: 36px; padding: 4px 12px; border: 0; border-radius: 9px; background: transparent; color: var(--muted, #556); font-weight: 800; font-size: 14px; cursor: pointer; white-space: nowrap; }
.v3-seg button.on { background: var(--subject, #3182f6); color: #fff; }
.v3-mode [data-v3="2d"], .v3-mode .v3-2d-wrap { display: none !important; }
.v3-mode .v3-empty { display: none !important; }
body:not(.v3-mode) .only3d, .v3-mode .only2d { display: none !important; }   /* 3D 화면에서만/2D 화면에서만 보일 글·조작 */
.v3-on > .stage-hint { z-index: 30; top: 54px; bottom: auto; height: auto; }   /* 미션 힌트·피드백이 3D 화면 위에 보이게 */
.v3-seg.float { position: absolute; top: 10px; right: 10px; z-index: 26; background: rgba(255,255,255,.94); box-shadow: 0 4px 14px rgba(20,30,60,.18); }
.v3-on > .v3-seg.float { background: rgba(10,16,30,.72); border-color: rgba(255,255,255,.22); top: 6px; right: 6px; }
.v3-on > .v3-seg.float button:not(.on) { color: #dbe4f7; }
.v3-wrap { position: absolute; inset: 0; z-index: 25; display: flex; flex-direction: column; background: radial-gradient(ellipse at 50% 40%, #1d2a4a 0%, #0c1222 100%); color: #e8eefc; animation: v3in .25s ease; }
.v3-wrap[hidden] { display: none; }
@keyframes v3in { from { opacity: 0; } to { opacity: 1; } }
.v3-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: rgba(8,12,24,.55); }
.v3-wrap.pad .v3-head { padding-right: 150px; }
.v3-head .v3-full { display: none; }
.v3-title { flex: 1; min-width: 0; font-weight: 800; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-head button { min-height: 38px; padding: 4px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.1); color: #fff; font-weight: 800; font-size: 13.5px; cursor: pointer; white-space: nowrap; }
.v3-view { position: relative; flex: 1; min-height: 0; overflow: hidden; touch-action: none; cursor: grab; }
.v3-view:active { cursor: grabbing; }
.v3-view canvas { display: block; width: 100%; height: 100%; }
.v3-labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.v3-lab { position: absolute; transform: translate(-50%, -50%); padding: 3px 8px; border-radius: 8px; background: rgba(8,12,24,.78); border: 1px solid rgba(255,255,255,.18); box-shadow: 0 2px 8px rgba(0,0,0,.35); color: #fff; font-weight: 700; font-size: 13px; letter-spacing: -0.01em; white-space: nowrap; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); }
.v3-lab.tap { pointer-events: auto; cursor: pointer; }
.v3-lab { transition: opacity .25s; }
.v3-lab.tap:hover { border-color: #ffd34d; }
.v3-info { position: absolute; left: 10px; top: 10px; max-width: min(320px, 70%); padding: 8px 10px; border-radius: 12px; background: rgba(8,12,24,.7); font-size: 13px; line-height: 1.45; pointer-events: none; }
.v3-info:empty { display: none; }
.v3-info.mini { max-height: 1.6em; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.v3-info.mini::after { content: ' ▾'; }
.v3-ctl { display: flex; flex-wrap: wrap; gap: 6px 8px; align-items: center; padding: 8px 10px; background: rgba(8,12,24,.55); }
.v3-ctl:empty { display: none; }
.v3-ctl .lab { font-weight: 800; font-size: 13px; color: #b9c6e4; }
.v3-ctl button { min-height: 38px; padding: 4px 11px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.08); color: #fff; font-weight: 800; font-size: 13.5px; cursor: pointer; }
.v3-ctl button.on { background: #ffd34d; border-color: #ffd34d; color: #1b2333; }
.v3-ctl input[type=range] { width: 140px; height: 38px; }
.v3-player { display: flex; align-items: center; gap: 8px; flex: 1 1 100%; min-width: 0; padding: 2px 0; }
.v3-ctl .v3-play { min-width: 92px; background: #ffd34d; border-color: #ffd34d; color: #1b2333; }
.v3-ctl .v3-play.on { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.4); color: #fff; }
.v3-player input[type=range] { flex: 1; min-width: 80px; width: auto; }
.v3-player .v3-ph { font-weight: 800; font-size: 13px; color: #ffd34d; min-width: 4.5em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 40%; }
.v3-player .v3-sp { min-width: 48px; }
.v3-hint { position: absolute; right: 10px; bottom: 8px; padding: 2px 8px; border-radius: 8px; background: rgba(8,12,24,.62); font-size: 12px; color: #dbe4f7; pointer-events: none; }
.v3-msg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; font-weight: 800; }
.v3-wrap.full { position: fixed; inset: 0; z-index: 200; }
.v3-wrap.full ~ .v3-seg.float, .v3-wrap.full + .v3-seg { position: fixed; z-index: 201; }
@media (max-width: 599px) {
  .v3-info { pointer-events: auto; cursor: pointer; font-size: 11.5px; line-height: 1.4; max-width: 72%; max-height: 38%; overflow: auto; padding: 6px 8px; }
  .v3-head .v3-full { display: inline-block; }
  .v3-head { padding: 6px 8px; }
  .v3-wrap.pad .v3-head { padding-right: 128px; }
  .v3-head .v3-reset { display: none; }
  .v3-wrap.full .v3-head .v3-reset { display: inline-block; }
  .stage-canvas.v3-on, .stage-card.v3-on { aspect-ratio: auto !important; height: auto; min-height: min(78vh, 600px); }
  .v3-title { font-size: 14px; } .v3-info { font-size: 12px; max-width: 75%; } .v3-ctl input[type=range] { width: 110px; } }
@media (prefers-reduced-motion: reduce) { .v3-wrap { animation: none; } }
`;
    doc.head.appendChild(st);
  }

  function el(tag, cls, html) { const n = doc.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  /* 스튜디오 환경광: 그라데이션 하늘 + 소프트박스 3개를 PMREM으로 굽기 (한 번만 만들어 재사용) */
  let envCache = null;
  function studioEnv(THREE, renderer) {
    if (envCache) return envCache;
    const pm = new THREE.PMREMGenerator(renderer);
    const es = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, 48, 24);
    const pos = g.attributes.position, cols = [];
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 10 * 0.5 + 0.5; // 아래 0 → 위 1
      const c = new THREE.Color().setRGB(0.05 + 0.16 * t, 0.06 + 0.17 * t, 0.09 + 0.20 * t);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const box = (x, y, z, w, h, k, tint) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint || 0xffffff).multiplyScalar(k), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m);
    };
    box(0, 8.5, 2, 9, 6, 1.25);                // 위쪽 큰 조명
    box(7.5, 2.5, 5, 4, 7, 0.8);               // 오른쪽 앞
    box(-8, 1.5, -2, 3.5, 6, 0.45, 0xbcd4ff);  // 왼쪽 푸른 보조광
    const tex = pm.fromScene(es, 0.035).texture;
    pm.dispose();
    envCache = tex;
    return tex;
  }

  /* 둥근 도형을 더 매끄럽게: 너무 적은 분할 수는 최소값으로 올려요 (모든 3D 화면 공통) */
  let geoPatched = false;
  function upgradeGeometry(THREE) {
    if (geoPatched) return; geoPatched = true;
    const wrap = (name, fix) => {
      const Base = THREE[name]; if (!Base) return;
      const Up = class extends Base { constructor(...a) { super(...fix(a)); } };
      THREE[name] = Up;
    };
    const atLeast = (v, d, m) => Math.max(v === undefined ? d : v, m);
    wrap('SphereGeometry', (a) => { a[1] = atLeast(a[1], 32, 28); a[2] = atLeast(a[2], 16, 20); return a; });
    wrap('CylinderGeometry', (a) => { a[3] = atLeast(a[3], 32, 24); return a; });
    wrap('ConeGeometry', (a) => { a[2] = atLeast(a[2], 32, 24); return a; });
    wrap('TorusGeometry', (a) => { a[2] = atLeast(a[2], 12, 16); a[3] = atLeast(a[3], 48, 64); return a; });
    wrap('CircleGeometry', (a) => { a[1] = atLeast(a[1], 32, 48); return a; });
    wrap('RingGeometry', (a) => { a[2] = atLeast(a[2], 32, 64); return a; });
  }

  const instances = [];
  function attach(opts) {
    injectCSS();
    const host = typeof opts.host === 'string' ? doc.querySelector(opts.host) : (opts.host || doc.querySelector('.stage-canvas'));
    if (!host) return null;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    /* (예전 2D | 3D 전환 버튼 — 이제 단계마다 화면이 정해져서 화면에 넣지 않아요) */
    const btn = el('div', 'v3-seg'); btn.setAttribute('role', 'group'); btn.setAttribute('aria-label', '보기 방식');
    const b2 = el('button', '', '▦ 2D'), b3 = el('button', '', opts.label || '🧊 3D');
    b2.type = b3.type = 'button'; b2.title = '2D 실험 화면'; b3.title = '3D 입체 모형';
    btn.append(b2, b3);
    if (opts.feature) btn.setAttribute('data-feature', opts.feature);
    let place = opts.button === null ? null : (typeof opts.button === 'string' ? doc.querySelector(opts.button) : opts.button) || doc.querySelector('.stage-toolbar');
    // 버튼 자리가 화면에 보이지 않으면(예: 휴대폰에서 도구 막대가 숨겨짐) 실험 화면 오른쪽 위에 띄워요
    let wrapEl = null;
    function placeBtn() {
      return;   // 전환 버튼은 쓰지 않아요
      const visible = place && place.offsetParent !== null && getComputedStyle(place).display !== 'none';
      if (visible) { if (btn.parentNode !== place) { btn.classList.remove('float'); place.appendChild(btn); } }
      else if (btn.parentNode !== host) { btn.classList.add('float'); host.appendChild(btn); }
      if (wrapEl) wrapEl.classList.toggle('pad', btn.parentNode === host);
    }
    placeBtn();
    global.addEventListener('resize', placeBtn);
    setTimeout(placeBtn, 300);

    /* 창 */
    const wrap = el('div', 'v3-wrap'); wrap.hidden = true;
    const head = el('div', 'v3-head');
    const title = el('div', 'v3-title', '🧊 ' + (opts.title || '3D 모형'));
    const resetB = el('button', 'v3-reset', '↺ 시점'); resetB.type = 'button';
    const fullB = el('button', 'v3-full', '⛶ 크게'); fullB.type = 'button';
    head.append(title, resetB, fullB);
    const view = el('div', 'v3-view');
    const labels = el('div', 'v3-labels');
    const info = el('div', 'v3-info');
    const hint = el('div', 'v3-hint', opts.hint || '드래그: 돌리기 · 휠/두 손가락: 확대');
    // 휴대폰에서는 설명 상자를 눌러 접고 펼 수 있어요 (장면을 가리지 않게)
    const isPhone = () => !!(global.matchMedia && global.matchMedia('(max-width: 599px)').matches);
    info.addEventListener('pointerdown', (e) => { if (isPhone()) e.stopPropagation(); });   // 돌리기 대신 접기
    info.addEventListener('click', () => { if (isPhone()) info.classList.toggle('mini'); });
    info.title = '눌러서 접기/펴기';
    view.append(labels, info, hint);
    const ctl = el('div', 'v3-ctl');
    wrap.append(head, view, ctl);
    host.insertBefore(wrap, btn.parentNode === host ? btn : null);
    wrapEl = wrap; placeBtn();
    fullB.addEventListener('click', () => {
      const on = !wrap.classList.contains('full'); wrap.classList.toggle('full', on); fullB.textContent = on ? '↙ 작게' : '⛶ 크게';
      if (btn.parentNode === host) btn.style.position = on ? 'fixed' : '';
      resize();
    });

    let THREE = null, renderer = null, scene = null, camera = null, root = null, user = null;
    let failed = false;   // three.js를 못 불러오면 이 차시는 2D로만 보여 줘요
    let raf = 0, last = 0, isOpen = false, touched = false, built = false, frameN = 0;
    const cam0 = Object.assign({ dist: 8, theta: 0.6, phi: 1.15, fov: 45, target: [0, 0, 0], min: 2, max: 40 }, opts.camera || {});
    const orbit = { dist: cam0.dist, theta: cam0.theta, phi: cam0.phi, tx: cam0.target[0], ty: cam0.target[1], tz: cam0.target[2] };
    const labs = [];

    function placeCamera() {
      const p = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi)), D = orbit.dist * fitK;
      camera.position.set(orbit.tx + D * Math.sin(p) * Math.sin(orbit.theta), orbit.ty + D * Math.cos(p), orbit.tz + D * Math.sin(p) * Math.cos(orbit.theta));
      camera.lookAt(orbit.tx, orbit.ty, orbit.tz);
    }
    function resize() {
      if (!renderer) return;
      const w = Math.max(1, view.clientWidth), h = Math.max(1, view.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      fitK = opts.fit === false ? 1 : (w / h < 0.95 ? Math.min(1.6, Math.pow(0.95 / (w / h), 0.55)) : 1);
    }

    /* 3D 위치에 붙는 HTML 이름표 */
    function label(text, obj, o) {
      const n = el('div', 'v3-lab', text); o = o || {};
      if (o.color) n.style.background = o.color;
      if (o.size) n.style.fontSize = o.size + 'px';
      labels.appendChild(n);
      const L = { el: n, obj, off: o.offset || [0, 0, 0], visible: true, set(t) { n.innerHTML = t; }, show(v) { L.visible = v; } };
      // o.tap(fn): 이름표를 눌러도 그 물체를 누른 것과 같아요 (작거나 움직이는 물체도 쉽게 고를 수 있게)
      L.tap = (fn) => { n.classList.add('tap'); n.onpointerdown = (e) => e.stopPropagation(); n.onclick = (e) => { e.stopPropagation(); fn(); }; return L; };
      if (o.tap) L.tap(o.tap);
      labs.push(L); return L;
    }
    const tmp = { v: null };
    /* 이름표 그리기: 이름표는 물체에 고정돼 함께 움직이고, 겹치면 먼 쪽 이름표를 흐리게 해요 */
    let labFrame = 0;
    // 물체와 그 부모가 모두 보일 때만 이름표를 보여요 (숨긴 묶음의 이름표가 남지 않게)
    function shown(o) { for (let n = o; n; n = n.parent) { if (n.visible === false) return false; if (n === scene) break; } return true; }
    function drawLabels() {
      if (!labs.length) return;
      const w = view.clientWidth, h = view.clientHeight;
      if (!tmp.v) tmp.v = new THREE.Vector3();
      labFrame++;
      const vis = [];
      for (const L of labs) {
        if (!L.visible || (L.obj && L.obj.isObject3D && !shown(L.obj))) { L.el.style.display = 'none'; continue; }
        const v = tmp.v;
        if (L.obj && L.obj.isObject3D) { L.obj.updateWorldMatrix(true, false); L.obj.getWorldPosition(v); } else if (Array.isArray(L.obj)) { v.set(L.obj[0], L.obj[1], L.obj[2]); } else if (L.obj && L.obj.isVector3) { v.copy(L.obj); } else { v.set(0, 0, 0); }
        v.x += L.off[0]; v.y += L.off[1]; v.z += L.off[2];
        v.project(camera);
        if (v.z > 1 || v.z < -1) { L.el.style.display = 'none'; continue; }
        if (L.el.style.display === 'none') { L.el.style.display = ''; L.wh = null; }
        if (!L.wh || !L.wh[0] || labFrame % 30 === 0 || L.el.textContent !== L.txt) { L.wh = [L.el.offsetWidth, L.el.offsetHeight]; L.txt = L.el.textContent; }
        vis.push({ L, x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, z: v.z });
      }
      vis.sort((a, b) => a.z - b.z);
      const placed = [];
      if (info.innerHTML && info.offsetParent) { const r = info.getBoundingClientRect(), rv = view.getBoundingClientRect(); placed.push([r.left - rv.left - 2, r.top - rv.top - 2, r.right - rv.left + 2, r.bottom - rv.top + 2]); }
      const hit = (r) => placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
      const cxF = (x, bw) => Math.max(bw / 2 + 2, Math.min(w - bw / 2 - 2, x)), cyF = (y, bh) => Math.max(bh / 2 + 2, Math.min(h - bh / 2 - 2, y));
      for (const it of vis) {
        const L = it.L, bw = L.wh[0], bh = L.wh[1], step = bh + 3;
        // 이름표는 늘 제 물체에 붙어서 같이 움직여요 (위아래로 비켜서 통통 튀지 않게).
        // 다른 이름표나 설명 상자와 겹치면, 뒤쪽(먼) 이름표만 흐리게 해요.
        const r = [cxF(it.x, bw) - bw / 2, it.y - bh / 2, cxF(it.x, bw) + bw / 2, it.y + bh / 2];
        const s = L.el.style;
        if (!hit(r)) { placed.push(r); if (s.opacity) s.opacity = ''; } else if (s.opacity !== '0.3') s.opacity = '0.3';
        s.left = cxF(it.x, bw) + 'px'; s.top = cyF(it.y, bh) + 'px';
      }
    }

    /* 조작 도구 (창 아래 줄) */
    const players = [];
    const controls = {
      segment(lab, items, value, onChange) {
        if (lab) ctl.appendChild(el('span', 'lab', lab));
        const bs = items.map((it) => {
          const b = el('button', '', it.label); b.type = 'button';
          b.addEventListener('click', () => { bs.forEach((x) => x.classList.toggle('on', x === b)); onChange(it.value); });
          ctl.appendChild(b); return b;
        });
        const set = (v) => bs.forEach((b, i) => b.classList.toggle('on', items[i].value === v));
        set(value); return { set };
      },
      range(lab, min, max, step, value, onInput, fmt) {
        const l = el('span', 'lab'); ctl.appendChild(l);
        const r = doc.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = value;
        const upd = () => { l.textContent = lab + ' ' + (fmt ? fmt(+r.value) : r.value); };
        r.addEventListener('input', () => { upd(); onInput(+r.value); });
        ctl.appendChild(r); upd();
        return { set(v) { r.value = v; upd(); }, get value() { return +r.value; } };
      },
      button(text, onClick) { const b = el('button', '', text); b.type = 'button'; b.addEventListener('click', onClick); ctl.appendChild(b); return b; },
      text(html) { const s = el('span', 'lab', html); ctl.appendChild(s); return s; },
      /* ▶ 재생: 정해진 움직임(한 주기)을 반복해서 보여 줘요. 진행 막대로 원하는 순간을 골라 볼 수도 있어요.
         const pl = controls.player({ duration: 6, loop: true, autoplay: false, label: '▶ 재생',
           phases: [[0, '전기'], [0.25, '중기'], ...],   // (선택) 구간 이름: [시작 비율, 이름]
           onFrame(p, dt) { ... }                         // p: 0~1 (한 주기 안의 위치)
         });  pl.play(); pl.pause(); pl.set(0.5); pl.playing; pl.p */
      player(o) {
        o = o || {};
        const row = el('div', 'v3-player');
        const pb = el('button', 'v3-play', '▶ ' + (o.label || '재생')); pb.type = 'button';
        const sc = doc.createElement('input'); sc.type = 'range'; sc.min = 0; sc.max = 1000; sc.step = 1; sc.value = 0; sc.setAttribute('aria-label', '진행 위치');
        const ph = el('span', 'v3-ph', '');
        const sp = el('button', 'v3-sp', '1×'); sp.type = 'button'; sp.title = '빠르기';
        row.append(pb, sc, ph, sp); ctl.appendChild(row);
        const P = { p: 0, playing: false, speed: 1, dur: Math.max(0.5, o.duration || 6) };
        const phases = (o.phases || []).slice().sort((a, b) => a[0] - b[0]);
        function phaseName(p) { let n = ''; phases.forEach(([at, name]) => { if (p >= at - 1e-6) n = name; }); return n; }
        function show() { sc.value = Math.round(P.p * 1000); ph.textContent = phaseName(P.p); pb.textContent = P.playing ? '⏸ 멈춤' : '▶ ' + (o.label || '재생'); pb.classList.toggle('on', P.playing); }
        function emit(dt) { if (o.onFrame) try { o.onFrame(P.p, dt || 0); } catch (e) { console.error(e); } }
        const api = {
          get p() { return P.p; }, get playing() { return P.playing; },
          play() { if (P.p >= 1 && !o.loop) P.p = 0; P.playing = true; touched = touched || !!o.stopRotate; show(); },
          pause() { P.playing = false; show(); },
          set(p) { P.p = Math.max(0, Math.min(1, p)); emit(0); show(); },
          tick(dt) {
            if (!P.playing) return;
            P.p += dt * P.speed / P.dur;
            if (P.p >= 1) { if (o.loop !== false) P.p %= 1; else { P.p = 1; P.playing = false; } }
            emit(dt); show();
          },
        };
        pb.addEventListener('click', () => (P.playing ? api.pause() : api.play()));
        sc.addEventListener('input', () => { P.p = +sc.value / 1000; emit(0); show(); });
        const SPEEDS = [1, 2, 0.5];
        sp.addEventListener('click', () => { P.speed = SPEEDS[(SPEEDS.indexOf(P.speed) + 1) % SPEEDS.length]; sp.textContent = (P.speed === 0.5 ? '½' : P.speed) + '×'; });
        players.push(api);
        show(); emit(0);
        if (o.autoplay) api.play();
        return api;
      },
    };

    /* 드래그 회전 · 확대
       모든 3D 화면에서 같은 느낌으로: 드래그하는 방향으로 장면을 끌어오듯 시점이 움직여요
       (중1 '태양계 구성 천체'와 같은 방향). 손을 떼면 관성으로 조금 더 돌아요. */
    const ptrs = new Map(); let pinch0 = 0, dist0 = 0;
    const DIR = 1;
    const vel = { t: 0, p: 0 };
    view.addEventListener('pointerdown', (e) => {
      view.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() }); touched = true; vel.t = vel.p = 0;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = orbit.dist; }
    });
    view.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y, now = performance.now(), dts = Math.max(1, now - p.t) / 1000;
      p.x = e.clientX; p.y = e.clientY; p.t = now;
      if (ptrs.size === 1) {
        const dT = -dx * 0.008 * DIR, dP = -dy * 0.008 * DIR;
        orbit.theta += dT; orbit.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi + dP));
        vel.t = vel.t * 0.5 + (dT / dts) * 0.5; vel.p = vel.p * 0.5 + (dP / dts) * 0.5;
      } else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) orbit.dist = Math.max(cam0.min, Math.min(cam0.max, dist0 * pinch0 / d)); vel.t = vel.p = 0; }
    });
    const up = (e) => {
      const p = ptrs.get(e.pointerId);
      if (p && performance.now() - p.t > 80) vel.t = vel.p = 0; // 멈췄다 놓으면 관성 없음
      ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0;
    };
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    view.addEventListener('wheel', (e) => { e.preventDefault(); touched = true; orbit.dist = Math.max(cam0.min, Math.min(cam0.max, orbit.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    resetB.addEventListener('click', () => { Object.assign(orbit, { dist: cam0.dist, theta: cam0.theta, phi: cam0.phi, tx: cam0.target[0], ty: cam0.target[1], tz: cam0.target[2] }); touched = false; vel.t = vel.p = 0; });

    /* 화면이 세로로 길면 모형이 잘리지 않게 조금 물러서서 봐요 */
    let fitK = 1;
    /* 기기 성능 확인: 처음 몇 초 동안 프레임 속도를 재서, 느리면 화질을 낮추고 그래도 느리면 2D로 바꿔요 */
    const perf = { n: 0, sum: 0, stage: ls.get(QUAL_KEY) === 'low' ? 1 : 0, done: !!global.SCISIM_3D_NOPERF };
    function perfStep(dt) {
      if (perf.done || doc.hidden) return;
      perf.n++; if (perf.n <= 15) return;
      perf.sum += dt;
      if (perf.n < 75) return;
      const fps = 60 / perf.sum; perf.n = 0; perf.sum = 0;
      if (fps >= 24) { perf.done = true; return; }
      if (perf.stage === 0) { perf.stage = 1; ls.set(QUAL_KEY, 'low'); lowQuality(); return; }
      perf.done = true;
      if (fps < 12 && pref() === 'auto') {
        ls.set(SLOW_KEY, '1'); close();
        toast('이 기기에서는 3D가 느려서 2D 화면으로 보여 줘요.');
      }
    }
    function lowQuality() {
      if (!renderer) return;
      renderer.setPixelRatio(1);
      if (shadowOn) { renderer.shadowMap.enabled = false; shadowOn = false; root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } }); if (contact) contact.visible = true; }
      resize();
    }

    function frame(t) {
      if (!isOpen) return;
      raf = requestAnimationFrame(frame);
      const rawDt = Math.max(0, (t - last) / 1000), dt = Math.min(0.05, rawDt); last = t;
      // 단계 설명을 읽는 동안(실험 잠금)에는 화면만 한 번 그려 두고 쉬어요
      if (doc.body.classList.contains('sim-locked') && frameN > 3) { perf.n = 0; perf.sum = 0; return; }
      if (!touched && opts.autoRotate) orbit.theta += opts.autoRotate * dt;
      if (!ptrs.size && (vel.t || vel.p)) {
        orbit.theta += vel.t * dt; orbit.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi + vel.p * dt));
        const k = Math.pow(0.04, dt); vel.t *= k; vel.p *= k; if (Math.abs(vel.t) + Math.abs(vel.p) < 0.01) vel.t = vel.p = 0;
      }
      perfStep(Math.min(rawDt, 0.5));
      players.forEach((pl) => pl.tick(dt));
      if (user && user.update) { try { user.update(dt, t / 1000); } catch (e) { console.error(e); } }
      if (frameN++ % 20 === 0) { if (shadowOn) markShadows(); fitShadow(); }
      placeCamera();
      renderer.render(scene, camera);
      if (global.SciSimShare && global.SciSimShare.grab) global.SciSimShare.grab(renderer.domElement);
      drawLabels();
    }

    function build() {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(perf.stage ? 1 : Math.min(global.devicePixelRatio || 1, 2));
      if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
      view.insertBefore(renderer.domElement, labels);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(cam0.fov, 1, 0.05, 2000);
      // 스튜디오 조명 반사(환경광): 표면에 부드러운 하이라이트와 입체감이 생겨요
      let env = null; try { env = studioEnv(THREE, renderer); } catch (e) { /* 지원하지 않는 기기면 생략 */ }
      const hemi = new THREE.HemisphereLight(0xeaf2ff, 0x2a2f45, 0.85);
      const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(5, 8, 6);
      [hemi, sun].forEach((l) => { l.userData.v3engine = true; scene.add(l); });
      root = new THREE.Group(); scene.add(root);
      const lvHooks = [];
      global.addEventListener('scisim-level', (e) => { const li = e.detail && e.detail.level; lvHooks.forEach((f) => { try { f(li); } catch (err) { console.error(err); } }); });
      user = opts.build ? opts.build({
        THREE, scene, camera, root, renderer, label, info: (h) => { info.innerHTML = h || ''; }, controls, orbit,
        get level() { return typeof global.SciSimLevel === 'number' ? global.SciSimLevel : 0; },   // 지금 학습 단계(0부터)
        onLevel(f) { lvHooks.push(f); },                                                      // 단계가 바뀔 때 (2D와 같은 장면으로 맞추기)
        lesson: () => global.__sim || null,                                                    // 2D 실험 상태 (sim.js의 window.__sim)
      }) || {} : {};
      // 차시가 직접 조명(태양 등)을 두면 낮·밤 대비가 중요하므로 환경 반사를 쓰지 않아요
      // (차시가 기본 조명을 바꾸거나 새 조명을 더했으면 그 조명을 그대로 존중해요)
      let ownLight = hemi.intensity !== 0.85 || sun.intensity !== 0.9 || sun.position.x !== 5 || sun.position.y !== 8 || sun.position.z !== 6;
      scene.traverse((o) => { if (o.isLight && !o.userData.v3engine) ownLight = true; });
      if (!ownLight && opts.studio !== false) {
        if (env) { scene.environment = env; hemi.intensity = 0.7; }
        const rim = new THREE.DirectionalLight(0x9fc4ff, 0.3); rim.position.set(-6, 3, -7); rim.userData.v3engine = true; scene.add(rim);
        if (opts.shadows !== false) { if (!perf.stage) setupShadows(); setupContact(); }
      }
      built = true;
      wrap.__v3 = () => ({ THREE, scene, root, camera, labs, orbit });   // 점검 도구용 (화면에는 영향 없음)
      if (global.ResizeObserver) new ResizeObserver(resize).observe(view);
      resize();
    }

    /* 부드러운 그림자: 물체끼리 드리우는 그림자로 앞뒤 깊이를 느끼게 해요 (기본 조명을 쓰는 화면만) */
    let shadowOn = false, shadowSun = null;
    function setupShadows() {
      shadowSun = null;
      scene.traverse((o) => { if (o.isDirectionalLight && o.userData.v3engine && !shadowSun && o.intensity >= 0.9) shadowSun = o; });
      if (!shadowSun) return;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      shadowSun.castShadow = true;
      shadowSun.shadow.mapSize.set(2048, 2048);
      shadowSun.shadow.radius = 4;
      shadowOn = true;
      fitShadow();
    }
    /* 바닥 접지 그림자: 모형 아래에 부드러운 그림자 원판을 깔아 떠 있지 않고 놓여 있는 느낌을 줘요 (가벼움) */
    let contact = null;
    function setupContact() {
      const c = doc.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.6 }));
      contact.rotation.x = -Math.PI / 2; contact.renderOrder = -1; contact.userData.v3engine = true; contact.raycast = () => {};
      scene.add(contact);
    }
    const tmpBox = { b: null, s: null };
    function fitShadow() {
      if (contact) {
        if (!tmpBox.b) { tmpBox.b = new THREE.Box3(); tmpBox.s = new THREE.Sphere(); }
        tmpBox.b.setFromObject(root);
        if (!tmpBox.b.isEmpty()) {
          const sx = tmpBox.b.max.x - tmpBox.b.min.x, sz = tmpBox.b.max.z - tmpBox.b.min.z, sy = tmpBox.b.max.y - tmpBox.b.min.y;
          const size = Math.max(sx, sz, sy * 0.6) * 1.35;
          contact.scale.set(size, size, 1);
          contact.position.set((tmpBox.b.min.x + tmpBox.b.max.x) / 2, tmpBox.b.min.y - Math.max(0.02, sy * 0.06), (tmpBox.b.min.z + tmpBox.b.max.z) / 2);
        }
      }
      if (!shadowOn) return;
      if (!tmpBox.b) { tmpBox.b = new THREE.Box3(); tmpBox.s = new THREE.Sphere(); }
      tmpBox.b.setFromObject(root);
      if (tmpBox.b.isEmpty()) return;
      tmpBox.b.getBoundingSphere(tmpBox.s);
      const r = Math.max(0.5, tmpBox.s.radius) * 1.15, c = tmpBox.s.center;
      const dir = new THREE.Vector3(5, 8, 6).normalize();
      shadowSun.position.copy(c).addScaledVector(dir, r * 2.5);
      shadowSun.target.position.copy(c); shadowSun.target.updateMatrixWorld();
      const cam = shadowSun.shadow.camera;
      cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 0.01; cam.far = r * 5;
      cam.updateProjectionMatrix();
      shadowSun.shadow.bias = -0.0004;
      shadowSun.shadow.normalBias = r * 0.004;
    }
    // 새로 생긴 물체에도 그림자를 켜요 (불투명한 입체만)
    function markShadows() {
      root.traverse((o) => {
        if (!o.isMesh || o.userData.v3shadow) return;
        o.userData.v3shadow = true;
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        const solid = m && (m.isMeshStandardMaterial || m.isMeshPhongMaterial || m.isMeshLambertMaterial) && !m.transparent;
        if (solid) { o.castShadow = true; o.receiveShadow = true; }
      });
    }

    function setBtns() { setTimeout(syncMode, 0); b3.classList.toggle('on', isOpen); b2.classList.toggle('on', !isOpen); host.classList.toggle('v3-on', isOpen); b3.setAttribute('aria-pressed', isOpen ? 'true' : 'false'); b2.setAttribute('aria-pressed', isOpen ? 'false' : 'true'); }
    function open(quiet) {
      if (isOpen) return;
      isOpen = true; wrap.hidden = false; setBtns();
      if (!quiet && global.SciSim && global.SciSim.Sound) try { global.SciSim.Sound.click(); } catch (e) {}
      if (!webglOK()) { close(); return; }
      const go = () => {
        if (!isOpen) return;
        if (!built) build(); else if (user && user.sync) { try { user.sync(); } catch (e) { console.error(e); } }
        resize(); last = performance.now(); frameN = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
        if (opts.onOpen) try { opts.onOpen(); } catch (e) { console.error(e); }
      };
      if (THREE) go(); else if (global.THREE) { upgradeGeometry(global.THREE); THREE = global.THREE; go(); }
      else {
        const msg = el('div', 'v3-msg', '3D 모형을 불러오는 중…'); view.appendChild(msg);
        loadThree().then((T) => { upgradeGeometry(T); THREE = T; msg.remove(); go(); }).catch(() => { msg.remove(); failed = true; close(); });
      }
    }
    function close() {
      if (!isOpen) return;
      isOpen = false; wrap.hidden = true; setBtns(); cancelAnimationFrame(raf);
      if (wrap.classList.contains('full')) fullB.click();
      if (opts.onClose) try { opts.onClose(); } catch (e) { console.error(e); }
    }
    setBtns();
    // 단계마다 화면 하나: opts.levels = [0, 2] 처럼 준 단계는 3D, 나머지 단계는 2D (없으면 모든 단계 3D).
    // 기기가 3D를 돌리기 어렵거나(사양·느림·불러오기 실패) '3D 끄기'면 모두 2D예요.
    const wantAt = (li) => !failed && start3D() && (!Array.isArray(opts.levels) || opts.levels.indexOf(li) >= 0);
    let curLevel = null;
    global.addEventListener('scisim-level', (e) => {
      const li = e.detail && e.detail.level; if (li === curLevel) return; curLevel = li;
      if (wantAt(li)) open(true); else close();
    });
    setTimeout(() => { if (curLevel != null) return; curLevel = typeof global.SciSimLevel === 'number' ? global.SciSimLevel : 0; if (wantAt(curLevel)) open(true); }, 0);
    instances.push({ close, open: () => open(true), get isOpen() { return isOpen; } });
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) cancelAnimationFrame(raf); else if (isOpen && built) { last = performance.now(); raf = requestAnimationFrame(frame); } });

    return {
      open: () => open(), close, button: btn, el: wrap,
      get isOpen() { return isOpen; },
      sync() { if (built && user && user.sync) try { user.sync(); } catch (e) { console.error(e); } },
      setTitle(t) { title.textContent = '🧊 ' + t; },
    };
  }

  // 설정은 그대로 두고 지금 화면만 2D로 (미션 카드의 '2D로 실험하기' 버튼)
  function show2D() { instances.forEach((v) => v.close()); }

  /* ---------- 2D 전용 조작: 3D 단계에서는 숨겨요 (3D 장면에 반영되지 않아 헷갈리지 않게) ----------
     어떤 조작이 3D에 반영되지 않는지는 3D를 연 채로 하나씩 눌러 보는 점검 도구로 골라 두었어요
     (assets/js/v3-2d-only.js : { 차시 id: [선택자, …] }). 차시가 직접 data-v3="2d"를 붙여도 되고,
     3D에서도 쓰는 조작이면 data-v3="keep"을 붙여 숨기지 않게 해요. */
  function syncMode() { if (doc.body) doc.body.classList.toggle('v3-mode', instances.some((v) => v.isOpen)); emptyCards(); }
  // 3D 단계에서 조작이 모두 숨겨진 오른쪽 카드는 빈 상자로 남지 않게 통째로 숨겨요
  function emptyCards() {
    if (!doc.body) return;
    const on = doc.body.classList.contains('v3-mode');
    doc.querySelectorAll('.side-col .card').forEach((c) => {
      if (c.id === 'game' || c.closest('#game, .game')) return;
      let hide = false;
      if (on) {
        const cs = Array.from(c.querySelectorAll('button, input, select')).filter((e) => !e.closest('[hidden]') && e.type !== 'hidden');
        hide = cs.length > 0 && cs.every((e) => e.closest('[data-v3="2d"], .v3-2d-wrap'));
      }
      c.classList.toggle('v3-empty', hide);
    });
  }
  const lessonId = (global.location.pathname.match(/sims\/([^/]+)\//) || [])[1] || '';
  let only2d = null;
  function markOnly2D() {
    const list = (only2d && only2d[lessonId]) || [];
    list.forEach((sel) => {
      let els = []; try { els = doc.querySelectorAll(sel); } catch (e) { return; }
      els.forEach((e) => {
        if (e.getAttribute('data-v3') === '2d' || e.closest('[data-v3="keep"]')) return;   // 차시가 data-v3="keep"을 붙이면 3D 단계에서도 보여요
        e.setAttribute('data-v3', '2d');
        if (e.tagName !== 'BUTTON') { const w = e.closest('.control, .range-row, label') || e.parentElement; if (w && !w.closest('#game, .game')) w.classList.add('v3-2d-wrap'); }
      });
    });
  }
  if (doc.addEventListener) {
    const s2 = doc.createElement('script'); s2.src = BASE + 'js/v3-2d-only.js';
    s2.onload = () => { only2d = global.SCISIM_2D_ONLY || {}; markOnly2D(); emptyCards(); };
    (doc.head || doc.documentElement).appendChild(s2);
    global.addEventListener('scisim-level', () => setTimeout(markOnly2D, 50));
    setInterval(() => { if (only2d) { markOnly2D(); emptyCards(); } }, 1500);   // 나중에 생기는 조작도 표시
  }
  global.SciSim3D = { attach, loadThree, pref, setPref, capable, webglOK, start3D, show2D, get anyOpen() { return instances.some((v) => v.isOpen); },
    __test: { open() { instances.forEach((v) => v.open()); }, close: show2D } };   // 점검 도구용
})(window);
