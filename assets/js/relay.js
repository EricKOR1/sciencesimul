/* =========================================================
   중계 연결 (화면 공유 예비 통로)
   학교 와이파이·휴대폰 데이터처럼 기기끼리 직접(WebRTC) 연결이 막힌 곳에서도
   화면을 볼 수 있도록, 공개 MQTT 중계 서버(웹소켓)를 거쳐 메시지를 주고받아요.
   - 라이브러리: assets/vendor/paho-mqtt.js (Eclipse Paho, EDL-1.0)
   - 서버: 공개 브로커 여러 곳을 차례로 시도 (localStorage 'sciencesimul:relay'로 바꿀 수 있음)
   - 보안: 중계 서버를 지나는 내용은 학생 코드로만 풀 수 있게 암호화해요(AES-GCM).
     주고받는 통로 이름(topic)도 코드를 그대로 쓰지 않고 코드에서 만든 해시를 써요.
   const sec = await SciSimRelay.secret(code);            // { key, topic }
   const r = SciSimRelay.open({ key: sec.key, onMessage(topic, obj) {}, onState(s) {} });
   r.sub(sec.topic + '/hello'); r.pub(sec.topic + '/screen', obj); r.close();
   ========================================================= */
(function (global) {
  'use strict';
  if (global.SciSimRelay) return;
  const doc = global.document;
  const me = doc.currentScript && doc.currentScript.src;
  const BASE = me ? me.replace(/js\/relay\.js(\?.*)?$/, '') : 'assets/';
  const BROKERS = [
    { host: 'broker.emqx.io', port: 8084, path: '/mqtt', ssl: true },
    { host: 'broker.hivemq.com', port: 8884, path: '/mqtt', ssl: true },
    { host: 'test.mosquitto.org', port: 8081, path: '/', ssl: true },
  ];
  function brokers() {
    try { const o = JSON.parse(global.localStorage.getItem('sciencesimul:relay') || 'null'); if (Array.isArray(o) && o.length) return o; } catch (e) { /* 무시 */ }
    return BROKERS;
  }
  let lib = null;
  function needPaho() {
    if (global.Paho && global.Paho.Client) return Promise.resolve();
    return (lib = lib || new Promise((res, rej) => { const s = doc.createElement('script'); s.src = BASE + 'vendor/paho-mqtt.js'; s.onload = res; s.onerror = rej; doc.head.appendChild(s); }));
  }

  // ArrayBuffer ↔ base64 (메시지를 글자로 보내요)
  function b64(buf) {
    const u = new Uint8Array(buf); let s = '';
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return global.btoa(s);
  }
  function unb64(str) { const s = global.atob(str), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
  const encode = (obj) => JSON.stringify(obj, (k, v) => (v instanceof ArrayBuffer ? { __b: b64(v) } : v));
  const decode = (str) => JSON.parse(str, (k, v) => (v && typeof v === 'object' && typeof v.__b === 'string' ? unb64(v.__b) : v));

  /* 코드 → 암호 키 + 통로 이름 */
  const te = new global.TextEncoder(), td = new global.TextDecoder();
  async function secret(code) {
    const subtle = global.crypto && global.crypto.subtle;
    if (!subtle) throw new Error('no webcrypto');
    const hk = await subtle.digest('SHA-256', te.encode('sciencesimul-relay-key:' + code));
    const ht = await subtle.digest('SHA-256', te.encode('sciencesimul-relay-topic:' + code));
    const key = await subtle.importKey('raw', hk, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    const hex = Array.from(new Uint8Array(ht)).slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
    return { key, topic: 'sciencesimul/v2/' + hex };
  }
  async function seal(key, str) {
    const iv = global.crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await global.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(str)));
    const out = new Uint8Array(12 + ct.length); out.set(iv, 0); out.set(ct, 12);
    return b64(out.buffer);
  }
  async function unseal(key, txt) {
    const all = new Uint8Array(unb64(txt));
    const pt = await global.crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, key, all.subarray(12));
    return td.decode(pt);
  }

  function open(o) {
    o = o || {};
    let client = null, closed = false, bi = 0, up = false, tries = 0;
    const subs = new Set();
    const state = (s) => { if (o.onState) try { o.onState(s); } catch (e) { /* 무시 */ } };
    function connect() {
      if (closed) return;
      const list = brokers(), b = list[bi % list.length];
      const id = 'ss-' + Math.random().toString(36).slice(2, 12);
      try { client = new global.Paho.Client(b.host, Number(b.port), b.path || '/mqtt', id); } catch (e) { next(); return; }
      client.onMessageArrived = (m) => {
        if (!o.onMessage) return;
        const topic = m.destinationName, txt = m.payloadString;
        // 암호를 풀지 못하는 메시지(다른 코드·변조된 내용)는 버려요
        unseal(o.key, txt).then((str) => {
          let obj = null; try { obj = decode(str); } catch (e) { return; }
          try { o.onMessage(topic, obj); } catch (e) { console.error(e); }
        }).catch(() => { /* 무시 */ });
      };
      client.onConnectionLost = () => { up = false; state('lost'); if (!closed) setTimeout(connect, 1500); };
      state('connecting');
      client.connect({
        useSSL: !!b.ssl, timeout: 8, keepAliveInterval: 25, cleanSession: true, mqttVersion: 4,
        onSuccess: () => { up = true; tries = 0; subs.forEach((t) => { try { client.subscribe(t, { qos: 0 }); } catch (e) { /* 무시 */ } }); state('up'); },
        onFailure: () => { up = false; next(); },
      });
    }
    function next() { bi++; tries++; state('retry'); if (!closed) setTimeout(connect, Math.min(6000, 600 + tries * 400)); }
    needPaho().then(connect).catch(() => state('nolib'));
    return {
      get up() { return up; },
      sub(t) { subs.add(t); if (up) try { client.subscribe(t, { qos: 0 }); } catch (e) { /* 무시 */ } },
      unsub(t) { subs.delete(t); if (up) try { client.unsubscribe(t); } catch (e) { /* 무시 */ } },
      pub(t, obj) {
        if (!up || !o.key) return false;
        seal(o.key, encode(obj)).then((txt) => { if (up) try { client.send(t, txt, 0, false); } catch (e) { /* 무시 */ } }).catch(() => { /* 무시 */ });
        return true;
      },
      close() { closed = true; up = false; try { client && client.disconnect(); } catch (e) { /* 무시 */ } },
    };
  }
  global.SciSimRelay = { open, secret, encode, decode };
})(window);
