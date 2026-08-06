(() => {
  'use strict';

  const DATA_KEY = 'mk-wedding-control-v1';
  const ROOM_KEY = 'mk-wedding-shared-room-v1';
  const DEVICE_KEY = 'mk-wedding-device-v1';
  const API = 'https://jsonblob.com/api/jsonBlob';
  const POLL_MS = 5000;

  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const localGet = key => nativeGet.call(localStorage, key);
  const localSet = (key, value) => nativeSet.call(localStorage, key, value);

  const sync = {
    room:null, cryptoKey:null, lastRevision:0, dirty:false, pushing:false, applyingRemote:false,
    pendingRemote:false, timer:null, poller:null, loaded:false,
    deviceId:localGet(DEVICE_KEY) || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
  };
  localSet(DEVICE_KEY, sync.deviceId);

  const toBase64Url = bytes => {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
  };
  const fromBase64Url = value => {
    const base64 = value.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  };

  async function importKey(encoded) {
    return crypto.subtle.importKey('raw', fromBase64Url(encoded), { name:'AES-GCM' }, false, ['encrypt','decrypt']);
  }

  async function encrypt(text, revision) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, sync.cryptoKey, new TextEncoder().encode(text));
    return { schema:1, revision, device:sync.deviceId, iv:toBase64Url(iv), payload:toBase64Url(new Uint8Array(cipher)) };
  }

  async function decrypt(envelope) {
    if (!envelope?.iv || !envelope?.payload) throw new Error('Неверный формат общей базы');
    const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv:fromBase64Url(envelope.iv) }, sync.cryptoKey, fromBase64Url(envelope.payload));
    return new TextDecoder().decode(plain);
  }

  function roomFromAddress() {
    const url = new URL(location.href);
    const id = url.searchParams.get('sync');
    const key = new URLSearchParams(url.hash.replace(/^#/,'')).get('k');
    return id && key ? { id, key, revision:0 } : null;
  }

  function savedRoom() {
    try {
      const room = JSON.parse(localGet(ROOM_KEY) || 'null');
      return room?.id && room?.key ? { id:String(room.id), key:String(room.key), revision:Number(room.revision) || 0 } : null;
    } catch { return null; }
  }

  function persistRoom(room = sync.room) {
    if (!room) return;
    sync.room = { id:room.id, key:room.key, revision:Number(room.revision ?? sync.lastRevision) || 0 };
    sync.lastRevision = sync.room.revision;
    localSet(ROOM_KEY, JSON.stringify(sync.room));
    const url = new URL(location.href);
    url.searchParams.set('sync', sync.room.id);
    url.hash = `k=${sync.room.key}`;
    history.replaceState(null, '', url);
  }

  function rememberRevision(revision) {
    sync.lastRevision = Number(revision) || sync.lastRevision;
    if (sync.room) persistRoom({ ...sync.room, revision:sync.lastRevision });
  }

  function shareLink() {
    if (!sync.room) return location.href;
    const url = new URL(location.href);
    url.searchParams.set('sync', sync.room.id);
    url.hash = `k=${sync.room.key}`;
    return url.href;
  }

  function setStatus(text, mode = 'ok') {
    document.querySelectorAll('[data-sync-status]').forEach(node => {
      node.textContent = text;
      node.dataset.mode = mode;
    });
  }

  function notify(title, text = '') {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<b>${title}</b>${text ? `<small>${text}</small>` : ''}`;
    stack.append(toast);
    setTimeout(() => toast.remove(), 3800);
  }

  async function fetchWithTimeout(url, options = {}, timeout = 9000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try { return await fetch(url, { ...options, signal:controller.signal }); }
    finally { clearTimeout(timer); }
  }

  async function createRoom() {
    if (sync.room) return sync.room;
    const current = localGet(DATA_KEY);
    if (!current) throw new Error('Сначала добавьте данные в приложение.');
    setStatus('Создаю общую базу…','busy');
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const key = toBase64Url(keyBytes);
    sync.cryptoKey = await importKey(key);
    const revision = Date.now();
    const envelope = await encrypt(current, revision);
    const response = await fetchWithTimeout(API, { method:'POST', headers:{ 'Content-Type':'application/json', Accept:'application/json' }, body:JSON.stringify(envelope) });
    if (!response.ok) throw new Error(`Сервис синхронизации: ${response.status}`);
    const id = response.headers.get('Location')?.split('/').filter(Boolean).pop();
    if (!id) throw new Error('Не удалось создать общую базу.');
    sync.room = { id, key, revision };
    persistRoom(sync.room);
    setStatus('Сохранено у вас обоих','ok');
    startPolling();
    notify('Общая ссылка готова','Отправь её Карине целиком.');
    return sync.room;
  }

  async function fetchEnvelope() {
    const response = await fetchWithTimeout(`${API}/${encodeURIComponent(sync.room.id)}`, { headers:{ Accept:'application/json' }, cache:'no-store' });
    if (!response.ok) throw new Error(`Не удалось получить данные: ${response.status}`);
    return response.json();
  }

  async function pullRemote() {
    if (!sync.room || sync.pushing || sync.dirty) return;
    try {
      if (!sync.cryptoKey) sync.cryptoKey = await importKey(sync.room.key);
      const envelope = await fetchEnvelope();
      const revision = Number(envelope?.revision) || 0;
      if (!revision || revision <= sync.lastRevision) { setStatus('Всё синхронизировано','ok'); return; }
      const remoteText = await decrypt(envelope);
      JSON.parse(remoteText);
      sync.applyingRemote = true;
      localSet(DATA_KEY, remoteText);
      sync.applyingRemote = false;
      rememberRevision(revision);
      setStatus('Получены изменения','ok');
      if (document.querySelector('.modal-root.open,form:focus-within')) sync.pendingRemote = true;
      else window.dispatchEvent(new CustomEvent('wedding-sync-update'));
    } catch (error) {
      console.error('[sync pull]', error);
      setStatus('Нет связи · данные на телефоне','error');
    }
  }

  function mergeMessages(localText, remoteText) {
    try {
      const local = JSON.parse(localText);
      const remote = JSON.parse(remoteText);
      const map = new Map();
      [...(remote.messages || []), ...(local.messages || [])].forEach(message => {
        if (!message?.id) return;
        const previous = map.get(message.id);
        if (!previous || Number(message.createdAt) >= Number(previous.createdAt)) map.set(message.id, message);
      });
      local.messages = [...map.values()].sort((a,b) => Number(a.createdAt) - Number(b.createdAt));
      return JSON.stringify(local);
    } catch { return localText; }
  }

  async function pushLocal() {
    if (!sync.room || sync.pushing || !sync.dirty) return;
    let current = localGet(DATA_KEY);
    if (!current) return;
    sync.pushing = true;
    setStatus('Сохраняю…','busy');
    try {
      if (!sync.cryptoKey) sync.cryptoKey = await importKey(sync.room.key);
      try {
        const remoteEnvelope = await fetchEnvelope();
        if (Number(remoteEnvelope?.revision) > sync.lastRevision) {
          const remoteText = await decrypt(remoteEnvelope);
          current = mergeMessages(current, remoteText);
          sync.applyingRemote = true;
          localSet(DATA_KEY, current);
          sync.applyingRemote = false;
        }
      } catch (mergeError) { console.warn('[sync merge]', mergeError); }
      const revision = Math.max(Date.now(), sync.lastRevision + 1);
      const envelope = await encrypt(current, revision);
      const response = await fetchWithTimeout(`${API}/${encodeURIComponent(sync.room.id)}`, { method:'PUT', headers:{ 'Content-Type':'application/json', Accept:'application/json' }, body:JSON.stringify(envelope) });
      if (!response.ok) throw new Error(`Сервис синхронизации: ${response.status}`);
      sync.dirty = false;
      rememberRevision(revision);
      setStatus('Сохранено у вас обоих','ok');
    } catch (error) {
      console.error('[sync push]', error);
      setStatus('Нет связи · повторю позже','error');
    } finally { sync.pushing = false; }
  }

  function schedulePush() {
    if (!sync.room || sync.applyingRemote) return;
    sync.dirty = true;
    setStatus('Есть изменения…','busy');
    clearTimeout(sync.timer);
    sync.timer = setTimeout(pushLocal, 650);
  }

  function installStorageHook() {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      originalSetItem.call(this, key, value);
      if (this === localStorage && key === DATA_KEY) schedulePush();
    };
  }

  function startPolling() {
    clearInterval(sync.poller);
    sync.poller = setInterval(() => {
      if (sync.pendingRemote && !document.querySelector('.modal-root.open,form:focus-within')) {
        sync.pendingRemote = false;
        window.dispatchEvent(new CustomEvent('wedding-sync-update'));
      } else if (sync.dirty && !sync.pushing) pushLocal();
      else if (document.visibilityState === 'visible') pullRemote();
    }, POLL_MS);
  }

  async function share() {
    try {
      if (!sync.room) await createRoom();
      const url = shareLink();
      if (navigator.share) await navigator.share({ title:'Свадьба — Марат и Карина', text:'Наша общая свадьба: бюджет, гости, покупки и чат.', url });
      else { await navigator.clipboard.writeText(url); notify('Ссылка скопирована','Отправь её Карине целиком.'); }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('[sync share]', error);
      notify('Не удалось поделиться', error.message || 'Проверь интернет.');
    }
  }

  function injectControls() {
    if (document.querySelector('.sync-share-btn')) return;
    const top = document.querySelector('.top-actions');
    if (top) {
      const status = document.createElement('span');
      status.dataset.syncStatus = '';
      const button = document.createElement('button');
      button.className = 'primary-button sync-share-btn';
      button.textContent = 'Карине';
      button.addEventListener('click', share);
      top.prepend(button);
      top.prepend(status);
    }
    const dock = document.createElement('div');
    dock.id = 'syncDock';
    dock.style.cssText = 'position:fixed;right:12px;bottom:92px;z-index:70;display:none;align-items:center;gap:7px;padding:7px;border-radius:17px;backdrop-filter:blur(25px)';
    dock.innerHTML = '<span data-sync-status></span><button type="button">Карине</button>';
    dock.querySelector('button').addEventListener('click', share);
    document.body.append(dock);
    setStatus(sync.room ? 'Общая база' : 'Только на этом телефоне', sync.room ? 'ok' : 'local');
  }

  function loadApplication() {
    if (sync.loaded) return;
    sync.loaded = true;
    const script = document.createElement('script');
    script.src = 'app-v3.js?v=1';
    script.onload = injectControls;
    script.onerror = () => notify('Не удалось загрузить приложение','Обнови страницу ещё раз.');
    document.body.append(script);
  }

  async function initialiseNetwork() {
    if (!sync.room) return;
    try {
      sync.cryptoKey = await importKey(sync.room.key);
      startPolling();
      await pullRemote();
    } catch (error) {
      console.error('[sync init]', error);
      setStatus('Нет связи · данные на телефоне','error');
    }
  }

  function boot() {
    installStorageHook();
    const address = roomFromAddress();
    const saved = savedRoom();
    const room = address ? { ...address, revision:saved?.id === address.id && saved?.key === address.key ? saved.revision : 0 } : saved;
    if (room) persistRoom(room);
    loadApplication();
    initialiseNetwork();
  }

  window.WeddingSync = { share, pull:pullRemote, getLink:shareLink, isShared:() => Boolean(sync.room) };
  boot();
})();