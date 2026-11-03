/* =========================================================
   친구 화면 보기 (watch.html)
   공유하는 학생의 화면 모양(HTML)과 캔버스 그림을 받아, 그 학생의 화면 크기 그대로 만들어
   내 화면에 맞게 줄여 보여 줘요. 보기 전용 — 받은 화면의 스크립트는 실행하지 않아요(CSP + 정리).
   ========================================================= */
(function (global) {
  'use strict';
  global.SCISIM_NO_HOST = true;
  const doc = global.document;
  const PREFIX = 'sciencesimul-v1-';
  const $ = (s) => doc.querySelector(s);
  const stage = $('#wStage'), frame = $('#wFrame'), msg = $('#wMsg'), who = $('#wWho'), dot = $('#wDot'), form = $('#wForm');
  const ls = { get(k) { try { return global.localStorage.getItem(k); } catch (e) { return null; } } };
  function peerOpts() { let o = null; try { o = JSON.parse(ls.get('sciencesimul:peer') || 'null'); } catch (e) { o = null; } return Object.assign({ debug: 0 }, o || {}); }

  const params = new URLSearchParams(global.location.search);
  let code = (params.get('c') || '').toUpperCase().replace(/[^A-Z2-9]/g, '');

  function setMsg(t, kind) { msg.textContent = t || ''; msg.hidden = !t; dot.className = 'w-dot ' + (kind || ''); }

  if (code.length !== 6) {
    form.hidden = false; setMsg('친구의 코드 6자리를 입력하거나, 친구 화면의 QR을 카메라로 찍어 주세요.');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = form.querySelector('input').value.toUpperCase().replace(/[^A-Z2-9]/g, '');
      if (v.length === 6) global.location.search = '?c=' + v;
      else setMsg('코드는 영문·숫자 6자리예요. (예: ABC-234)', 'bad');
    });
    return;
  }

  /* ---------------- 받은 화면 만들기 ---------------- */
  let vw = 1280, vh = 800, fdoc = null, ready = false, pendingBody = null, pendingScroll = null;
  const bitmaps = new Map();
  async function unpack(p) {
    if (!p) return '';
    if (!p.z) return p.d;
    const s = new Blob([p.d]).stream().pipeThrough(new global.DecompressionStream('gzip'));
    return new global.Response(s).text();
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const attrStr = (list, extra) => (list || []).filter(([n]) => !/^on/i.test(n) && n !== 'data-theme').map(([n, v]) => n + '="' + esc(v) + '"').join(' ') + (extra || '');
  const VIEW_CSS = '*{cursor:default!important} .share-btn,.share-private{visibility:hidden!important} ::-webkit-scrollbar{display:none} html{scrollbar-width:none}';

  function fit() {
    const r = stage.getBoundingClientRect();
    const k = Math.min(r.width / vw, r.height / vh);
    frame.style.width = vw + 'px'; frame.style.height = vh + 'px';
    frame.style.transform = 'translate(-50%, -50%) scale(' + k + ')';
  }
  global.addEventListener('resize', fit);

  function buildDoc(m, head) {
    ready = false; fdoc = null;
    vw = m.w || 1280; vh = m.h || 800; fit();
    const base = '<base href="' + esc(m.href) + '">';
    // 스크립트는 보안 정책(CSP)으로 막아요. (sandbox로 막으면 브라우저가 캔버스 그림을 그리지 않아요)
    const csp = '<meta http-equiv="Content-Security-Policy" content="script-src \'none\'; object-src \'none\'; frame-src \'none\'; form-action \'none\'">';
    frame.srcdoc = '<!doctype html><html ' + attrStr(m.html, ' data-theme="' + (m.theme === 'dark' ? 'dark' : 'light') + '"') + '><head><meta charset="utf-8">' + csp + base +
      sanitizeHead(head) + '<style>' + VIEW_CSS + '</style></head><body ' + attrStr(m.bodyAttrs) + '></body></html>';
    frame.onload = () => {
      fdoc = frame.contentDocument; ready = true;
      if (pendingBody != null) { applyBody(pendingBody); pendingBody = null; }
      if (pendingScroll) { applyScroll(pendingScroll); pendingScroll = null; }
    };
  }
  function sanitizeHead(h) {
    const d = new DOMParser().parseFromString('<head>' + h + '</head>', 'text/html');
    d.head.querySelectorAll('script, base, meta[http-equiv]').forEach((n) => n.remove());
    return d.head.innerHTML;
  }

  // 받은 HTML을 지금 화면에 바뀐 부분만 반영 (깜빡임 없이)
  function clean(node) {
    if (node.nodeType !== 1) return node;
    const all = [node, ...node.querySelectorAll('*')];
    all.forEach((e) => {
      Array.from(e.attributes).forEach((a) => {
        if (/^on/i.test(a.name) || (/^(href|src|action|formaction|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) e.removeAttribute(a.name);
      });
    });
    all.filter((e) => /^(SCRIPT|IFRAME|OBJECT|EMBED)$/.test(e.tagName)).forEach((e) => e.replaceWith(fdoc.createElement('x-s')));
    return node;
  }
  const imp = (n) => clean(fdoc.importNode(n, true));
  function syncAttrs(d, s) {
    const sa = s.attributes, da = d.attributes;
    for (let i = da.length - 1; i >= 0; i--) { const n = da[i].name; if (!s.hasAttribute(n)) d.removeAttribute(n); }
    for (let i = 0; i < sa.length; i++) {
      const { name, value } = sa[i];
      if (/^on/i.test(name)) continue;
      if (/^(href|src)$/i.test(name) && /^\s*javascript:/i.test(value)) continue;
      if (d.getAttribute(name) !== value) d.setAttribute(name, value);
    }
    if (d.tagName === 'INPUT') { d.checked = s.hasAttribute('checked'); if (s.hasAttribute('value') && d.value !== s.getAttribute('value')) d.value = s.getAttribute('value'); }
  }
  function morph(dst, src) {
    const dn = dst.childNodes, sn = src.childNodes;
    for (let i = 0; i < sn.length; i++) {
      const s = sn[i], d = dn[i];
      if (!d) { dst.appendChild(imp(s)); continue; }
      if (d.nodeType !== s.nodeType || d.nodeName !== s.nodeName) { dst.replaceChild(imp(s), d); continue; }
      if (s.nodeType === 3 || s.nodeType === 8) { if (d.nodeValue !== s.nodeValue) d.nodeValue = s.nodeValue; continue; }
      if (s.nodeType === 1) {
        if (s.nodeName === 'CANVAS' && d.getAttribute('data-cid') !== s.getAttribute('data-cid')) { dst.replaceChild(imp(s), d); continue; }
        syncAttrs(d, s);
        if (s.nodeName !== 'CANVAS') morph(d, s);
      }
    }
    while (dn.length > sn.length) dst.removeChild(dst.lastChild);
  }
  function applyBody(html) {
    if (!ready || !fdoc) { pendingBody = html; return; }
    const src = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html').body;
    morph(fdoc.body, src);
    // 크기가 바뀐 캔버스는 지워지므로 마지막 그림을 다시 그려요
    bitmaps.forEach((bmp, id) => drawFrame(id, bmp));
  }
  function applyScroll(m) {
    if (!ready || !fdoc) { pendingScroll = m; return; }
    try { frame.contentWindow.scrollTo(m.x || 0, m.y || 0); } catch (e) { /* 무시 */ }
    const all = fdoc.body.getElementsByTagName('*');
    (m.els || []).forEach(([i, t, l]) => { const e = all[i]; if (e) { e.scrollTop = t; e.scrollLeft = l; } });
  }
  function drawFrame(id, bmp) {
    if (!fdoc) return;
    const c = fdoc.querySelector('canvas[data-cid="' + id + '"]');
    if (!c) return;
    try { const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height); } catch (e) { /* 무시 */ }
  }

  let headCache = '', lastDocMsg = null;
  async function onData(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'doc') {
      lastDocMsg = m; headCache = await unpack(m.head);
      who.textContent = (m.name ? m.name + '의 화면' : '친구 화면') + ' · ' + code.slice(0, 3) + '-' + code.slice(3);
      doc.title = '👀 ' + (m.name || '친구') + ' — ' + (m.title || '과학 시뮬레이션');
      buildDoc(m, headCache);
      applyBody(await unpack(m.body));
      setMsg('', 'on');
    } else if (m.t === 'head' && lastDocMsg) {
      headCache = await unpack(m.head);
      if (fdoc) {
        // CSP meta는 그대로 두고 나머지만 바꿔요
        Array.from(fdoc.head.children).forEach((n) => { if (!(n.tagName === 'META' && n.httpEquiv)) n.remove(); });
        fdoc.head.insertAdjacentHTML('beforeend', '<meta charset="utf-8"><base href="' + esc(lastDocMsg.href) + '">' + sanitizeHead(headCache) + '<style>' + VIEW_CSS + '</style>');
        fdoc.documentElement.setAttribute('data-theme', m.theme === 'dark' ? 'dark' : 'light');
      }
    } else if (m.t === 'body') {
      if (fdoc && m.bodyAttrs) { Array.from(fdoc.body.attributes).forEach((a) => fdoc.body.removeAttribute(a.name)); m.bodyAttrs.forEach(([n, v]) => { if (!/^on/i.test(n)) fdoc.body.setAttribute(n, v); }); }
      applyBody(await unpack(m.body));
    } else if (m.t === 'f') {
      try {
        const bmp = await createImageBitmap(new Blob([m.d], { type: 'image/jpeg' }));
        const old = bitmaps.get(m.id); if (old && old.close) old.close();
        bitmaps.set(m.id, bmp); drawFrame(m.id, bmp);
      } catch (e) { /* 무시 */ }
    } else if (m.t === 's') applyScroll(m);
    else if (m.t === 'vp') { vw = m.w; vh = m.h; fit(); }
  }

  /* ---------------- 연결 (보는 쪽) ----------------
     ① 직접 연결(WebRTC)을 먼저 시도하고, ② 5초 안에 화면이 오지 않으면 암호화된 중계 서버로도 받아요.
     어느 쪽이든 먼저 화면을 보내 주는 길을 써요. */
  const canZ = !!(global.DecompressionStream && global.Response && global.Blob && Blob.prototype.stream);
  let peer = null, conn = null, retryT = 0, openT = 0, tries = 0, via = null, gotAny = false;
  const say = (t, k) => { if (!via) setMsg(t, k); };           // 화면이 오고 있으면 안내를 덮어쓰지 않아요
  function onAny(src, d) {
    if (via && via !== src) return;
    if (!via && d && d.t === 'doc') { via = src; if (src === 'p2p') stopRelay(); }
    if (!via) return;                                            // 첫 화면(doc)을 받기 전의 조각은 건너뛰어요
    gotAny = true;
    onData(d).catch((e) => console.error(e));
  }
  function connect() {
    clearTimeout(retryT); clearTimeout(openT);
    if (!peer || peer.destroyed) return start();
    if (peer.disconnected) { try { peer.reconnect(); } catch (e) { /* 무시 */ } }
    try { if (conn) conn.close(); } catch (e) { /* 무시 */ }
    conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'binary', metadata: { z: canZ } });
    conn.on('open', () => { clearTimeout(openT); tries = 0; });
    conn.on('data', (d) => onAny('p2p', d));
    conn.on('close', () => { if (via === 'p2p') { via = null; startRelaySoon(); } later('친구가 다른 화면으로 이동하는 중이에요. 다시 연결하는 중…'); });
    conn.on('error', () => later('연결이 끊겼어요. 다시 연결하는 중…'));
    openT = setTimeout(() => { if (!conn || !conn.open) later('친구 화면을 찾는 중…'); }, 7000);
  }
  function later(t) {
    say(t, 'wait');
    clearTimeout(retryT); retryT = setTimeout(connect, Math.min(6000, 1500 + (tries++) * 500));
  }
  function start() {
    say('친구 화면에 연결하는 중…', 'wait');
    try { peer = new global.Peer(undefined, peerOpts()); } catch (e) { return; }
    peer.on('open', connect);
    peer.on('error', (e) => {
      const t = e && e.type;
      if (t === 'peer-unavailable') later('친구 화면을 찾는 중… 친구 기기에서 이 사이트가 열려 있고 📡 공유가 켜져 있는지 확인해 주세요.');
      else if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') { try { peer.destroy(); } catch (x) { /* 무시 */ } peer = null; clearTimeout(retryT); retryT = setTimeout(start, 4000); }
    });
    peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => { try { peer.reconnect(); } catch (x) { /* 무시 */ } }, 1500); });
  }

  /* 중계 서버 (예비 통로) */
  const vid = 'v' + Math.random().toString(36).slice(2, 10);
  let relay = null, sec = null, hiT = 0, relayT = 0;
  function startRelaySoon() { clearTimeout(relayT); relayT = setTimeout(startRelay, 5000); }
  function startRelay() {
    if (relay || via === 'p2p') return;
    const sc = doc.createElement('script'); sc.src = 'assets/js/relay.js';
    const go = () => global.SciSimRelay.secret(code).then((sx) => {
      if (relay || via === 'p2p') return;
      sec = sx;
      relay = global.SciSimRelay.open({
        key: sec.key,
        onState: (st) => { if (st === 'up') { hi(); if (!via) say('중계 서버를 거쳐 친구 화면을 기다리는 중…', 'wait'); } },
        onMessage: (topic, m) => onAny('relay', m),
      });
      relay.sub(sec.topic + '/screen');
      clearInterval(hiT); hiT = setInterval(hi, 4000);
    }).catch(() => { /* 이 기기에서는 중계를 쓸 수 없어요 */ });
    if (global.SciSimRelay) go(); else { sc.onload = go; doc.head.appendChild(sc); }
  }
  // 공유하는 친구에게 '나 여기서 보고 있어요' 신호 (처음엔 전체 화면도 달라고 해요)
  function hi() { if (relay && sec) relay.pub(sec.topic + '/hello', { t: 'hi', vid, z: canZ, need: via !== 'relay' }); }
  function stopRelay() { clearInterval(hiT); clearTimeout(relayT); if (relay) { relay.close(); relay = null; } }
  // 15초가 지나도 아무것도 오지 않으면 확인할 점을 알려 줘요
  setTimeout(() => { if (!gotAny) say('친구 화면이 아직 오지 않았어요. 친구 기기에서 이 사이트(첫 화면이나 실험 화면)가 열려 있고 📡 공유가 켜져 있는지, 코드가 맞는지 확인해 주세요. 계속 찾는 중…', 'wait'); }, 15000);
  who.textContent = '친구 화면 · ' + code.slice(0, 3) + '-' + code.slice(3);
  stage.hidden = false;
  fit();
  const s = doc.createElement('script'); s.src = 'assets/vendor/peerjs.min.js'; s.onload = start;
  s.onerror = () => { /* 직접 연결 도구를 못 불러와도 중계로 시도해요 */ };
  doc.head.appendChild(s);
  say('친구 화면에 연결하는 중…', 'wait');
  startRelaySoon();
  global.addEventListener('pagehide', () => { try { peer && peer.destroy(); } catch (e) { /* 무시 */ } stopRelay(); });
})(window);
