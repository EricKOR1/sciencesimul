/* =========================================================
   내 화면 공유 (QR)
   - 학생마다 기기에 '내 코드'가 하나 생겨요. QR/주소로 친구가 들어오면
     지금 보고 있는 학습 화면(실험·미션·3D)을 친구 자리에서 그대로 볼 수 있어요.
   - 연결: WebRTC(PeerJS, assets/vendor/peerjs.min.js, MIT) · 서버 없이 기기끼리 직접 연결
     (처음 서로 찾을 때만 PeerJS 공개 중계 서버를 써요)
   - 화면 전달: 페이지 모양(HTML)은 바뀔 때만 압축해서, 캔버스(실험·3D)는 JPEG 그림으로 보내요.
   - 보는 쪽 페이지: watch.html (assets/js/watch.js)
   ========================================================= */
(function (global) {
  'use strict';
  const doc = global.document;
  if (global.SciSimShare || global.SCISIM_NO_HOST) return;
  const me = doc.currentScript && doc.currentScript.src;
  const BASE = me ? me.replace(/js\/share\.js(\?.*)?$/, '') : 'assets/';   // …/assets/
  const ROOT = BASE.replace(/assets\/$/, '');                               // 사이트 첫 화면 폴더
  const KEY = 'sciencesimul:share', PREFIX = 'sciencesimul-v1-';
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  const ls = {
    get(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { global.localStorage.setItem(k, v); } catch (e) { /* 무시 */ } },
  };
  function newCode() {
    const a = new Uint32Array(6); (global.crypto || global.msCrypto).getRandomValues(a);
    return Array.from(a, (x) => ALPHA[x % ALPHA.length]).join('');
  }
  let st = null;
  try { st = JSON.parse(ls.get(KEY) || 'null'); } catch (e) { st = null; }
  if (!st || !/^[A-Z2-9]{6}$/.test(st.code || '')) st = { code: newCode(), name: '', on: true };
  const save = () => ls.set(KEY, JSON.stringify(st));
  save();
  const fmtCode = (c) => c.slice(0, 3) + '-' + c.slice(3);
  const watchURL = () => new URL('watch.html?c=' + st.code, ROOT || global.location.href).href;
  function peerOpts() {
    let o = null; try { o = JSON.parse(ls.get('sciencesimul:peer') || 'null'); } catch (e) { o = null; }
    return Object.assign({ debug: 0 }, o || {});
  }

  function loadScript(src) {
    return new Promise((res, rej) => { const s = doc.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; doc.head.appendChild(s); });
  }
  let peerLib = null, qrLib = null;
  const needPeer = () => (global.Peer ? Promise.resolve() : (peerLib = peerLib || loadScript(BASE + 'vendor/peerjs.min.js')));
  const needQR = () => (global.qrcode ? Promise.resolve() : (qrLib = qrLib || loadScript(BASE + 'vendor/qrcode.js')));

  /* ---------------- 연결 (공유하는 쪽) ---------------- */
  let peer = null, status = 'off', retry = 0, retryT = 0;
  const viewers = new Set();
  function startHost() {
    if (peer || !st.on) return;
    status = 'connecting'; render();
    needPeer().then(() => {
      if (peer || !st.on) return;
      const p = peer = new global.Peer(PREFIX + st.code, peerOpts());
      p.on('open', () => { status = 'on'; retry = 0; render(); });
      p.on('connection', onConn);
      p.on('disconnected', () => { if (!p.destroyed && st.on) setTimeout(() => { try { p.reconnect(); } catch (e) { /* 무시 */ } }, 2000); });
      p.on('error', (e) => {
        const t = e && e.type;
        if (t === 'unavailable-id' || t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') {
          // 앞 페이지의 연결이 아직 남아 있거나 네트워크가 잠시 끊긴 경우: 잠시 뒤 다시
          try { p.destroy(); } catch (err) { /* 무시 */ }
          if (peer === p) peer = null;
          status = t === 'unavailable-id' ? 'connecting' : 'error'; render();
          clearTimeout(retryT);
          if (st.on && retry++ < 40) retryT = setTimeout(startHost, Math.min(8000, 1200 + retry * 600));
        }
      });
    }).catch(() => { status = 'error'; render(); });
  }
  function stopHost() {
    clearTimeout(retryT);
    viewers.forEach((c) => { try { c.close(); } catch (e) { /* 무시 */ } });
    viewers.clear();
    if (peer) { try { peer.destroy(); } catch (e) { /* 무시 */ } peer = null; }
    status = 'off'; stopLoops(); render();
  }
  // 다른 페이지로 갈 때 코드를 바로 놓아 줘야 다음 페이지에서 같은 코드로 다시 연결돼요
  global.addEventListener('pagehide', () => { if (peer) try { peer.destroy(); } catch (e) { /* 무시 */ } });
  global.addEventListener('pageshow', (e) => { if (e.persisted && st.on && (!peer || peer.destroyed)) { peer = null; startHost(); } });

  function onConn(conn) {
    conn.on('open', () => {
      viewers.add(conn); render();
      sendDoc([conn]);
      startLoops();
    });
    const bye = () => { if (viewers.delete(conn)) { render(); if (!viewers.size) stopLoops(); } };
    conn.on('close', bye); conn.on('error', bye);
  }
  function sendTo(list, msg) {
    list.forEach((c) => {
      if (!c.open) return;
      try { c.send(msg); } catch (e) { /* 무시 */ }
    });
  }
  const busy = (c) => { const dc = c.dataChannel; return dc && dc.bufferedAmount > 1.5e6; };

  /* ---------------- 화면 모양(HTML) 보내기 ---------------- */
  const cids = new WeakMap(); let cidN = 0;
  const cidOf = (c) => { let id = cids.get(c); if (!id) { id = String(++cidN); cids.set(c, id); } return id; };
  function headHTML() {
    const h = doc.head.cloneNode(true);
    h.querySelectorAll('script, base').forEach((n) => n.remove());
    return h.innerHTML;
  }
  function bodyHTML() {
    const src = doc.body, clone = src.cloneNode(true);
    const so = src.getElementsByTagName('*'), co = clone.getElementsByTagName('*');
    const n = Math.min(so.length, co.length);
    for (let i = 0; i < n; i++) {
      const s = so[i], c = co[i], tag = s.tagName;
      if (tag === 'INPUT') {
        if (s.type === 'checkbox' || s.type === 'radio') { if (s.checked) c.setAttribute('checked', ''); else c.removeAttribute('checked'); }
        else if (s.type !== 'password') c.setAttribute('value', s.value);
      } else if (tag === 'TEXTAREA') c.textContent = s.value;
      else if (tag === 'SELECT') { Array.from(c.options || []).forEach((o, k) => { if (k === s.selectedIndex) o.setAttribute('selected', ''); else o.removeAttribute('selected'); }); }
      else if (tag === 'CANVAS') { c.setAttribute('data-cid', cidOf(s)); c.setAttribute('width', s.width); c.setAttribute('height', s.height); }
    }
    // 실행되는 것·비공개 부분은 빈 자리표로 바꿔 요소 순서를 그대로 유지해요
    clone.querySelectorAll('script, noscript, iframe, object, embed, .share-private').forEach((x) => x.replaceWith(doc.createElement('x-s')));
    return clone.innerHTML;
  }
  const attrsOf = (node) => Array.from(node.attributes).map((a) => [a.name, a.value]);
  function themeNow() {
    const t = doc.documentElement.dataset.theme;
    if (t) return t;
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  async function pack(str) {
    if (global.CompressionStream && global.Response) {
      try {
        const s = new Blob([str]).stream().pipeThrough(new global.CompressionStream('gzip'));
        return { z: 1, d: await new global.Response(s).arrayBuffer() };
      } catch (e) { /* 아래로 */ }
    }
    return { z: 0, d: str };
  }
  let lastBody = '', lastHead = '';
  async function sendDoc(list) {
    lastHead = headHTML(); lastBody = bodyHTML();
    const [h, b] = await Promise.all([pack(lastHead), pack(lastBody)]);
    sendTo(list, {
      t: 'doc', href: global.location.href, title: doc.title, name: st.name || '', w: global.innerWidth, h: global.innerHeight,
      theme: themeNow(), html: attrsOf(doc.documentElement), bodyAttrs: attrsOf(doc.body), head: h, body: b,
    });
    lastFrame.clear();
    scrollDirty = true;
  }
  let domDirty = false, headDirty = false, scrollDirty = false, vpDirty = false, busyDom = false;
  const mo = global.MutationObserver ? new global.MutationObserver((recs) => {
    for (const r of recs) { if (r.target === doc.head || doc.head.contains(r.target)) headDirty = true; else domDirty = true; }
  }) : null;
  async function domTick() {
    if (!viewers.size || busyDom) return;
    busyDom = true;
    try {
      if (headDirty) {
        headDirty = false;
        const h = headHTML();
        if (h !== lastHead) { lastHead = h; sendTo([...viewers], { t: 'head', head: await pack(h), html: attrsOf(doc.documentElement), theme: themeNow() }); }
      }
      if (domDirty) {
        domDirty = false;
        const b = bodyHTML();
        if (b !== lastBody) { lastBody = b; sendTo([...viewers].filter((c) => !busy(c)), { t: 'body', body: await pack(b), bodyAttrs: attrsOf(doc.body) }); }
      }
      if (vpDirty) { vpDirty = false; sendTo([...viewers], { t: 'vp', w: global.innerWidth, h: global.innerHeight }); }
      if (scrollDirty) {
        scrollDirty = false;
        const all = doc.body.getElementsByTagName('*'), els = [];
        for (let i = 0; i < all.length; i++) { const e = all[i]; if (e.scrollTop || e.scrollLeft) els.push([i, e.scrollTop, e.scrollLeft]); }
        sendTo([...viewers], { t: 's', x: global.scrollX, y: global.scrollY, els });
      }
    } finally { busyDom = false; }
  }
  const onScroll = () => { scrollDirty = true; };
  const onInput = () => { domDirty = true; };
  const onResize = () => { vpDirty = true; domDirty = true; };

  /* ---------------- 캔버스(실험·3D) 그림 보내기 ---------------- */
  const sent = {};
  const lastFrame = new Map();      // cid → 작은 미리보기 지문 (같으면 안 보냄)
  const glSnap = new Map(), glLast = new Map(), glBusy = new Set();
  const frameGap = () => { const n = viewers.size; return n <= 2 ? 100 : n <= 5 ? 160 : n <= 12 ? 330 : 500; };
  // 3D(WebGL) 캔버스는 그린 직후에만 내용을 읽을 수 있어서, sim3d.js가 그릴 때마다 불러 줘요.
  // 보낼 때가 되었으면 그 순간의 그림을 복사해 두고 따로 압축해서 보내요.
  function grab(c) {
    if (!viewers.size || doc.hidden || glBusy.has(c)) return;
    const now = performance.now();
    if (now - (glLast.get(c) || 0) < frameGap()) return;
    glLast.set(c, now);
    let s = glSnap.get(c); if (!s) { s = doc.createElement('canvas'); glSnap.set(c, s); }
    if (s.width !== c.width || s.height !== c.height) { s.width = c.width; s.height = c.height; }
    try { const g = s.getContext('2d'); g.clearRect(0, 0, s.width, s.height); g.drawImage(c, 0, 0); } catch (e) { return; }
    glBusy.add(c);
    sendCanvas(c, s).finally(() => glBusy.delete(c));
  }
  const tiny = doc.createElement('canvas'); tiny.width = 24; tiny.height = 16;
  const tinyCtx = tiny.getContext('2d', { willReadFrequently: true });
  function finger(src) {
    try {
      tinyCtx.drawImage(src, 0, 0, 24, 16);
      const d = tinyCtx.getImageData(0, 0, 24, 16).data; let h = 0;
      for (let i = 0; i < d.length; i += 3) h = (h * 31 + d[i]) | 0;
      return h;
    } catch (e) { return Math.random(); }
  }
  let busyFrame = false;
  const bgCache = new WeakMap();
  function bgOf(c) {
    if (c.closest('.v3-view')) return '#141d35';
    let v = bgCache.get(c); if (v) return v;
    v = '#ffffff';
    for (let n = c.parentElement; n; n = n.parentElement) {
      const b = global.getComputedStyle(n).backgroundColor;
      if (b && b !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(b)) { v = b; break; }
    }
    bgCache.set(c, v); return v;
  }
  const many = () => viewers.size > 5;
  // 한 캔버스 그림을 JPEG로 줄여 보내기 (바뀌지 않았으면 건너뛰기)
  async function sendCanvas(c, src) {
    const id = cidOf(c), fp = finger(src);
    if (lastFrame.get(id) === fp) return;
    lastFrame.set(id, fp);
    const maxD = many() ? 720 : 960, q = many() ? 0.6 : 0.72;
    const k = Math.min(1, maxD / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k));
    const cv = doc.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    // 투명한 부분은 원래 뒤에 보이던 바탕색으로 채워요 (JPEG는 투명을 못 담아요)
    g.fillStyle = bgOf(c); g.fillRect(0, 0, w, h);
    g.drawImage(src, 0, 0, w, h);
    const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', q));
    if (!blob) return;
    const buf = await blob.arrayBuffer();
    sendTo([...viewers].filter((v) => !busy(v)), { t: 'f', id, d: buf });
    sent[id] = (sent[id] || 0) + 1;
  }
  async function frameTick() {
    if (!viewers.size || busyFrame || doc.hidden) return;
    busyFrame = true;
    try {
      const list = Array.from(doc.querySelectorAll('canvas')).filter((c) => !c.closest('.share-private, .v3-view') && !c.classList.contains('confetti-canvas'));
      for (const c of list) {
        if (!c.width || !c.height || c.offsetParent === null) continue;
        await sendCanvas(c, c);
      }
    } finally { busyFrame = false; }
  }

  let domT = 0, frT = 0, looping = false;
  function startLoops() {
    if (looping) return; looping = true;
    if (mo) mo.observe(doc.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    doc.addEventListener('scroll', onScroll, true);
    doc.addEventListener('input', onInput, true); doc.addEventListener('change', onInput, true);
    global.addEventListener('resize', onResize);
    const domLoop = () => { domTick(); domT = setTimeout(domLoop, viewers.size > 8 ? 450 : 250); };
    const frLoop = () => { frameTick(); frT = setTimeout(frLoop, frameGap()); };
    domLoop(); frLoop();
  }
  function stopLoops() {
    if (!looping) return; looping = false;
    clearTimeout(domT); clearTimeout(frT);
    if (mo) mo.disconnect();
    doc.removeEventListener('scroll', onScroll, true);
    doc.removeEventListener('input', onInput, true); doc.removeEventListener('change', onInput, true);
    global.removeEventListener('resize', onResize);
    lastFrame.clear();
  }

  /* ---------------- 화면: 공유 버튼 + QR 창 ---------------- */
  let btn = null, sheet = null;
  function makeButton() {
    if (btn) return;
    const right = doc.querySelector('.sim-header-right') || doc.querySelector('.topbar-in');
    if (!right) return;
    btn = doc.createElement('button');
    btn.type = 'button'; btn.className = 'icon-btn share-btn';
    btn.title = '내 화면 공유 (QR)'; btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = '<span aria-hidden="true">📡</span><i class="share-n" hidden></i>';
    btn.addEventListener('click', openSheet);
    const theme = right.querySelector('.theme-btn');
    right.insertBefore(btn, theme || right.querySelector('#soundBtn') || null);
  }
  function statusText() {
    if (!st.on) return '공유가 꺼져 있어요';
    if (status === 'on') return viewers.size ? '👀 ' + viewers.size + '명이 보고 있어요' : '● 공유 준비 완료 · 친구가 QR을 찍으면 바로 보여요';
    if (status === 'error') return '연결이 잠시 끊겼어요. 다시 연결하는 중…';
    return '연결하는 중…';
  }
  function render() {
    if (btn) {
      const n = btn.querySelector('.share-n');
      n.hidden = !viewers.size; n.textContent = viewers.size;
      btn.classList.toggle('live', st.on && status === 'on');
      btn.classList.toggle('watched', viewers.size > 0);
    }
    if (sheet) {
      sheet.querySelector('.sh-status').textContent = statusText();
      sheet.querySelector('.sh-status').className = 'sh-status ' + (st.on ? status : 'off');
      sheet.querySelector('.sh-toggle').textContent = st.on ? '공유 끄기' : '공유 켜기';
    }
  }
  function copy(text) {
    const done = () => { try { global.SciSim && global.SciSim.toast('주소를 복사했어요. 친구에게 보내 주세요.', 'good'); } catch (e) { /* 무시 */ } };
    if (global.navigator.clipboard && global.isSecureContext) return global.navigator.clipboard.writeText(text).then(done).catch(() => fallback());
    fallback();
    function fallback() {
      const ta = doc.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select(); try { doc.execCommand('copy'); done(); } catch (e) { /* 무시 */ } ta.remove();
    }
  }
  function drawQR(box) {
    box.innerHTML = '<span class="sh-qr-wait">QR 만드는 중…</span>';
    needQR().then(() => {
      const qr = global.qrcode(0, 'M'); qr.addData(watchURL()); qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
      const svg = box.querySelector('svg'); if (svg) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', '내 화면 보기 QR 코드'); }
    }).catch(() => { box.textContent = 'QR을 만들지 못했어요. 아래 주소를 복사해 보내 주세요.'; });
  }
  function openSheet() {
    if (sheet) return;
    const back = doc.createElement('div'); back.className = 'modal-backdrop share-private';
    back.innerHTML = `
      <div class="modal share-sheet" role="dialog" aria-modal="true" aria-label="내 화면 공유">
        <h2>📡 내 화면 공유</h2>
        <p class="sh-lead">친구가 QR을 찍거나 주소로 들어오면, 지금 내 학습 화면을 <b>자기 자리에서</b> 함께 볼 수 있어요.</p>
        <div class="sh-qr" aria-live="polite"></div>
        <div class="sh-code">내 코드 <b></b></div>
        <div class="sh-url"><input type="text" readonly aria-label="공유 주소"><button type="button" class="btn btn-primary btn-sm sh-copy">주소 복사</button></div>
        <label class="sh-name">보여 줄 이름 <input type="text" maxlength="12" placeholder="예: 3번 김과학"></label>
        <div class="sh-status"></div>
        <div class="sh-actions">
          <button type="button" class="btn btn-sm sh-toggle"></button>
          <button type="button" class="btn btn-sm sh-new">새 코드 만들기</button>
          <button type="button" class="btn btn-sm sh-close">닫기</button>
        </div>
        <p class="sh-note">보는 친구는 화면을 볼 수만 있고 조작할 수는 없어요. 같은 와이파이에서 가장 잘 연결돼요.</p>
      </div>`;
    doc.body.appendChild(back); sheet = back;
    const fill = () => {
      back.querySelector('.sh-code b').textContent = fmtCode(st.code);
      back.querySelector('.sh-url input').value = watchURL();
      drawQR(back.querySelector('.sh-qr'));
      render();
    };
    fill();
    const nameIn = back.querySelector('.sh-name input'); nameIn.value = st.name || '';
    nameIn.addEventListener('change', () => { st.name = nameIn.value.trim().slice(0, 12); save(); if (viewers.size) sendDoc([...viewers]); });
    back.querySelector('.sh-copy').addEventListener('click', () => copy(watchURL()));
    back.querySelector('.sh-url input').addEventListener('focus', (e) => e.target.select());
    back.querySelector('.sh-toggle').addEventListener('click', () => { st.on = !st.on; save(); if (st.on) { retry = 0; startHost(); } else stopHost(); render(); });
    back.querySelector('.sh-new').addEventListener('click', () => {
      stopHost(); st.code = newCode(); save(); fill();
      if (st.on) setTimeout(startHost, 300);
    });
    const close = () => { back.remove(); sheet = null; doc.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    back.querySelector('.sh-close').addEventListener('click', close);
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    doc.addEventListener('keydown', esc);
  }

  function init() {
    makeButton(); render();
    // 공유 버튼이 들어갈 자리가 늦게 생기는 페이지를 위해 한 번 더
    if (!btn) setTimeout(() => { makeButton(); render(); }, 600);
    if (global.location.protocol === 'file:') { status = 'error'; return; }  // 파일로 열면 공유할 수 없어요
    if (global.navigator.webdriver && !global.SCISIM_SHARE_TEST) return;      // 자동 점검 도구에서는 연결하지 않아요
    if (st.on) startHost();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);

  global.SciSimShare = { grab, open: openSheet, get code() { return st.code; }, get viewers() { return viewers.size; }, get status() { return status; }, get sent() { return sent; } };
})(window);
