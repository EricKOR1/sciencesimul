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
     build(ctx) {                      // 처음 열 때 한 번: ctx = { THREE, scene, camera, root, label(), info(), controls() }
       // root(THREE.Group)에 물체를 추가하고, 매 프레임 update(dt, t)를 돌려줘요
       return { update(dt, t) {}, sync() {} };
     },
     onOpen() {}, onClose() {},
   });
   v3.open(); v3.close(); v3.sync();   // sync: 실험 상태가 바뀌었을 때 3D 모형을 다시 맞추기
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

  function webglOK() {
    try { const c = doc.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }

  let cssDone = false;
  function injectCSS() {
    if (cssDone) return; cssDone = true;
    const st = doc.createElement('style');
    st.textContent = `
.v3-btn { min-height: 40px; padding: 6px 14px; border-radius: 999px; border: 2px solid var(--subject, #3867f4); background: #fff; color: var(--subject, #3867f4); font-weight: 800; font-size: 14.5px; cursor: pointer; white-space: nowrap; }
.v3-btn.on { background: var(--subject, #3867f4); color: #fff; }
.v3-btn.float { position: absolute; top: 10px; right: 10px; z-index: 24; box-shadow: 0 4px 14px rgba(20,30,60,.18); }
.v3-wrap { position: absolute; inset: 0; z-index: 25; display: flex; flex-direction: column; background: radial-gradient(ellipse at 50% 40%, #1d2a4a 0%, #0c1222 100%); color: #e8eefc; animation: v3in .25s ease; }
.v3-wrap[hidden] { display: none; }
@keyframes v3in { from { opacity: 0; } to { opacity: 1; } }
.v3-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: rgba(8,12,24,.55); }
.v3-title { flex: 1; min-width: 0; font-weight: 800; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v3-head button { min-height: 38px; padding: 4px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.1); color: #fff; font-weight: 800; font-size: 13.5px; cursor: pointer; white-space: nowrap; }
.v3-view { position: relative; flex: 1; min-height: 0; overflow: hidden; touch-action: none; cursor: grab; }
.v3-view:active { cursor: grabbing; }
.v3-view canvas { display: block; width: 100%; height: 100%; }
.v3-labels { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.v3-lab { position: absolute; transform: translate(-50%, -50%); padding: 2px 7px; border-radius: 8px; background: rgba(8,12,24,.72); color: #fff; font-weight: 800; font-size: 12.5px; white-space: nowrap; }
.v3-info { position: absolute; left: 10px; top: 10px; max-width: min(320px, 70%); padding: 8px 10px; border-radius: 12px; background: rgba(8,12,24,.7); font-size: 13px; line-height: 1.45; pointer-events: none; }
.v3-info:empty { display: none; }
.v3-ctl { display: flex; flex-wrap: wrap; gap: 6px 8px; align-items: center; padding: 8px 10px; background: rgba(8,12,24,.55); }
.v3-ctl:empty { display: none; }
.v3-ctl .lab { font-weight: 800; font-size: 13px; color: #b9c6e4; }
.v3-ctl button { min-height: 38px; padding: 4px 11px; border-radius: 999px; border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.08); color: #fff; font-weight: 800; font-size: 13.5px; cursor: pointer; }
.v3-ctl button.on { background: #ffd34d; border-color: #ffd34d; color: #1b2333; }
.v3-ctl input[type=range] { width: 140px; height: 38px; }
.v3-hint { position: absolute; right: 10px; bottom: 8px; font-size: 12px; color: #9fb0d4; pointer-events: none; }
.v3-msg { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; font-weight: 800; }
@media (max-width: 599px) { .v3-wrap { position: fixed; inset: 0; z-index: 200; } .v3-title { font-size: 14px; } .v3-info { font-size: 12px; max-width: 75%; } .v3-ctl input[type=range] { width: 110px; } }
@media (prefers-reduced-motion: reduce) { .v3-wrap { animation: none; } }
`;
    doc.head.appendChild(st);
  }

  function el(tag, cls, html) { const n = doc.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function attach(opts) {
    injectCSS();
    const host = typeof opts.host === 'string' ? doc.querySelector(opts.host) : (opts.host || doc.querySelector('.stage-canvas'));
    if (!host) return null;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    /* 버튼 */
    const btn = el('button', 'v3-btn', opts.label || '🧊 3D');
    btn.type = 'button'; btn.title = '3D 모형으로 보기'; btn.setAttribute('aria-label', btn.title);
    if (opts.feature) btn.setAttribute('data-feature', opts.feature);
    let place = opts.button === null ? null : (typeof opts.button === 'string' ? doc.querySelector(opts.button) : opts.button) || doc.querySelector('.stage-toolbar');
    // 버튼 자리가 화면에 보이지 않으면(예: 휴대폰에서 도구 막대가 숨겨짐) 실험 화면 오른쪽 위에 띄워요
    function placeBtn() {
      const visible = place && place.offsetParent !== null && getComputedStyle(place).display !== 'none';
      if (visible) { if (btn.parentNode !== place) { btn.classList.remove('float'); place.appendChild(btn); } }
      else if (btn.parentNode !== host) { btn.classList.add('float'); host.appendChild(btn); }
    }
    placeBtn();
    global.addEventListener('resize', placeBtn);
    setTimeout(placeBtn, 300);

    /* 창 */
    const wrap = el('div', 'v3-wrap'); wrap.hidden = true;
    const head = el('div', 'v3-head');
    const title = el('div', 'v3-title', '🧊 ' + (opts.title || '3D 모형'));
    const resetB = el('button', '', '↺ 시점'); resetB.type = 'button';
    const closeB = el('button', '', '✕ 닫기'); closeB.type = 'button';
    head.append(title, resetB, closeB);
    const view = el('div', 'v3-view');
    const labels = el('div', 'v3-labels');
    const info = el('div', 'v3-info');
    const hint = el('div', 'v3-hint', opts.hint || '드래그: 돌리기 · 휠/두 손가락: 확대');
    view.append(labels, info, hint);
    const ctl = el('div', 'v3-ctl');
    wrap.append(head, view, ctl);
    host.appendChild(wrap);

    let THREE = null, renderer = null, scene = null, camera = null, root = null, user = null;
    let raf = 0, last = 0, isOpen = false, touched = false, built = false;
    const cam0 = Object.assign({ dist: 8, theta: 0.6, phi: 1.15, fov: 45, target: [0, 0, 0], min: 2, max: 40 }, opts.camera || {});
    const orbit = { dist: cam0.dist, theta: cam0.theta, phi: cam0.phi, tx: cam0.target[0], ty: cam0.target[1], tz: cam0.target[2] };
    const labs = [];

    function placeCamera() {
      const p = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi));
      camera.position.set(orbit.tx + orbit.dist * Math.sin(p) * Math.sin(orbit.theta), orbit.ty + orbit.dist * Math.cos(p), orbit.tz + orbit.dist * Math.sin(p) * Math.cos(orbit.theta));
      camera.lookAt(orbit.tx, orbit.ty, orbit.tz);
    }
    function resize() {
      if (!renderer) return;
      const w = Math.max(1, view.clientWidth), h = Math.max(1, view.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }

    /* 3D 위치에 붙는 HTML 이름표 */
    function label(text, obj, o) {
      const n = el('div', 'v3-lab', text); o = o || {};
      if (o.color) n.style.background = o.color;
      if (o.size) n.style.fontSize = o.size + 'px';
      labels.appendChild(n);
      const L = { el: n, obj, off: o.offset || [0, 0, 0], visible: true, set(t) { n.innerHTML = t; }, show(v) { L.visible = v; } };
      labs.push(L); return L;
    }
    const tmp = { v: null };
    /* 이름표 그리기: 가까운 것부터 자리를 잡고, 다른 이름표나 설명 상자와 겹치면 위아래로 비켜요 */
    let labFrame = 0;
    function drawLabels() {
      if (!labs.length) return;
      const w = view.clientWidth, h = view.clientHeight;
      if (!tmp.v) tmp.v = new THREE.Vector3();
      labFrame++;
      const vis = [];
      for (const L of labs) {
        if (!L.visible || (L.obj && L.obj.visible === false)) { L.el.style.display = 'none'; continue; }
        const v = tmp.v;
        if (L.obj && L.obj.isObject3D) { L.obj.getWorldPosition(v); } else if (Array.isArray(L.obj)) { v.set(L.obj[0], L.obj[1], L.obj[2]); } else { v.set(0, 0, 0); }
        v.x += L.off[0]; v.y += L.off[1]; v.z += L.off[2];
        v.project(camera);
        if (v.z > 1 || v.z < -1) { L.el.style.display = 'none'; continue; }
        if (L.el.style.display === 'none') L.el.style.display = '';
        if (!L.wh || labFrame % 30 === 0 || L.el.textContent !== L.txt) { L.wh = [L.el.offsetWidth, L.el.offsetHeight]; L.txt = L.el.textContent; }
        vis.push({ L, x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h, z: v.z });
      }
      vis.sort((a, b) => a.z - b.z);
      const placed = [];
      if (info.innerHTML) { const r = info.getBoundingClientRect(), rv = view.getBoundingClientRect(); placed.push([r.left - rv.left - 2, r.top - rv.top - 2, r.right - rv.left + 2, r.bottom - rv.top + 2]); }
      const hit = (r) => placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
      for (const it of vis) {
        const bw = it.L.wh[0], bh = it.L.wh[1], step = bh + 3;
        let best = null;
        for (const dy of [0, -step, step, -2 * step, 2 * step]) {
          const cy = it.y + dy, r = [it.x - bw / 2, cy - bh / 2, it.x + bw / 2, cy + bh / 2];
          if (!hit(r)) { best = { cy, r }; break; }
        }
        const s = it.L.el.style;
        if (best) { placed.push(best.r); s.left = it.x + 'px'; s.top = best.cy + 'px'; s.opacity = ''; }
        else { s.left = it.x + 'px'; s.top = it.y + 'px'; s.opacity = '0.35'; }
      }
    }

    /* 조작 도구 (창 아래 줄) */
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
    };

    /* 드래그 회전 · 확대 */
    const ptrs = new Map(); let pinch0 = 0, dist0 = 0;
    view.addEventListener('pointerdown', (e) => { view.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); touched = true; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = orbit.dist; } });
    view.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 1) { orbit.theta -= dx * 0.008; orbit.phi = Math.max(0.05, Math.min(Math.PI - 0.05, orbit.phi - dy * 0.008)); }
      else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) orbit.dist = Math.max(cam0.min, Math.min(cam0.max, dist0 * pinch0 / d)); }
    });
    const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
    view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    view.addEventListener('wheel', (e) => { e.preventDefault(); touched = true; orbit.dist = Math.max(cam0.min, Math.min(cam0.max, orbit.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    resetB.addEventListener('click', () => { Object.assign(orbit, { dist: cam0.dist, theta: cam0.theta, phi: cam0.phi, tx: cam0.target[0], ty: cam0.target[1], tz: cam0.target[2] }); touched = false; });

    function frame(t) {
      if (!isOpen) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
      if (!touched && opts.autoRotate) orbit.theta += opts.autoRotate * dt;
      if (user && user.update) { try { user.update(dt, t / 1000); } catch (e) { console.error(e); } }
      placeCamera();
      renderer.render(scene, camera);
      drawLabels();
    }

    function build() {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
      if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
      view.insertBefore(renderer.domElement, labels);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(cam0.fov, 1, 0.05, 2000);
      scene.add(new THREE.HemisphereLight(0xeaf2ff, 0x2a2f45, 0.85));
      const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(5, 8, 6); scene.add(sun);
      root = new THREE.Group(); scene.add(root);
      user = opts.build ? opts.build({ THREE, scene, camera, root, renderer, label, info: (h) => { info.innerHTML = h || ''; }, controls, orbit }) || {} : {};
      built = true;
      if (global.ResizeObserver) new ResizeObserver(resize).observe(view);
      resize();
    }

    function open() {
      if (isOpen) return;
      isOpen = true; wrap.hidden = false; btn.classList.add('on');
      if (global.SciSim && global.SciSim.Sound) try { global.SciSim.Sound.click(); } catch (e) {}
      if (!webglOK()) { view.appendChild(el('div', 'v3-msg', '이 기기에서는 3D 화면을 표시할 수 없어요.')); return; }
      const go = () => {
        if (!isOpen) return;
        if (!built) build(); else if (user && user.sync) { try { user.sync(); } catch (e) { console.error(e); } }
        resize(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
        if (opts.onOpen) try { opts.onOpen(); } catch (e) { console.error(e); }
      };
      if (THREE) go();
      else {
        const msg = el('div', 'v3-msg', '3D 모형을 불러오는 중…'); view.appendChild(msg);
        loadThree().then((T) => { THREE = T; msg.remove(); go(); }).catch(() => { msg.textContent = '3D 모형을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'; });
      }
    }
    function close() {
      if (!isOpen) return;
      isOpen = false; wrap.hidden = true; btn.classList.remove('on'); cancelAnimationFrame(raf);
      if (opts.onClose) try { opts.onClose(); } catch (e) { console.error(e); }
    }
    btn.addEventListener('click', () => (isOpen ? close() : open()));
    closeB.addEventListener('click', close);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) cancelAnimationFrame(raf); else if (isOpen && built) { last = performance.now(); raf = requestAnimationFrame(frame); } });

    return {
      open, close, button: btn, el: wrap,
      get isOpen() { return isOpen; },
      sync() { if (built && user && user.sync) try { user.sync(); } catch (e) { console.error(e); } },
      setTitle(t) { title.textContent = '🧊 ' + t; },
    };
  }

  global.SciSim3D = { attach, loadThree };
})(window);
