(() => {
  'use strict';

  const DATA_KEY = 'mk-wedding-control-v1';
  const ROOM_KEY = 'mk-wedding-shared-room-v1';
  const DEVICE_KEY = 'mk-wedding-device-v1';
  const API = 'https://jsonblob.com/api/jsonBlob';
  const POLL_MS = 5000;

  const nativeGet = Storage.prototype.getItem;
  const nativeSet = Storage.prototype.setItem;
  const nativeRemove = Storage.prototype.removeItem;
  const localGet = key => nativeGet.call(localStorage, key);
  const localSet = (key, value) => nativeSet.call(localStorage, key, value);
  const localRemove = key => nativeRemove.call(localStorage, key);

  const sync = {
    room: null,
    cryptoKey: null,
    lastRevision: 0,
    dirty: false,
    pushing: false,
    applyingRemote: false,
    pendingRemote: false,
    timer: null,
    poller: null,
    deviceId: localGet(DEVICE_KEY) || crypto.randomUUID(),
    booted: false
  };
  localSet(DEVICE_KEY, sync.deviceId);

  const bytesToBase64Url = bytes => {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };

  const base64UrlToBytes = value => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(base64);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  };

  async function importRoomKey(encodedKey) {
    return crypto.subtle.importKey(
      'raw',
      base64UrlToBytes(encodedKey),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptState(plainText, revision = Date.now()) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sync.cryptoKey, encoded);
    return {
      schema: 1,
      revision,
      device: sync.deviceId,
      iv: bytesToBase64Url(iv),
      payload: bytesToBase64Url(new Uint8Array(cipher))
    };
  }

  async function decryptState(envelope) {
    if (!envelope || envelope.schema !== 1 || !envelope.iv || !envelope.payload) {
      throw new Error('Неверный формат общей базы');
    }
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64UrlToBytes(envelope.iv) },
      sync.cryptoKey,
      base64UrlToBytes(envelope.payload)
    );
    return new TextDecoder().decode(plain);
  }

  function readRoomFromAddress() {
    const url = new URL(location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const id = url.searchParams.get('sync');
    const key = hash.get('k');
    return id && key ? { id, key } : null;
  }

  function readSavedRoom() {
    try {
      const saved = JSON.parse(localGet(ROOM_KEY) || 'null');
      return saved?.id && saved?.key ? saved : null;
    } catch {
      return null;
    }
  }

  function saveRoom(room) {
    sync.room = room;
    localSet(ROOM_KEY, JSON.stringify(room));
    const url = new URL(location.href);
    url.searchParams.set('sync', room.id);
    url.hash = `k=${room.key}`;
    history.replaceState(null, '', url);
  }

  function shareLink() {
    if (!sync.room) return location.href;
    const url = new URL(location.href);
    url.searchParams.set('sync', sync.room.id);
    url.hash = `k=${sync.room.key}`;
    return url.href;
  }

  function setStatus(text, mode = 'ok') {
    const colors = {
      ok: ['#8ee7d7', 'rgba(142,231,215,.12)'],
      busy: ['#f0c56c', 'rgba(240,197,108,.12)'],
      error: ['#ff7b89', 'rgba(255,123,137,.12)'],
      local: ['#aaa6ad', 'rgba(170,166,173,.12)']
    };
    const [color, background] = colors[mode] || colors.ok;
    document.querySelectorAll('[data-sync-status]').forEach(node => {
      node.textContent = text;
      node.style.color = color;
      node.style.background = background;
    });
  }

  function notify(title, text = '') {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<b>${title}</b>${text ? `<small>${text}</small>` : ''}`;
    stack.append(toast);
    setTimeout(() => toast.remove(), 4200);
  }

  async function createRoomFromLocal() {
    if (sync.room) return sync.room;
    const current = localGet(DATA_KEY);
    if (!current) {
      throw new Error('Сначала добавьте хотя бы одну запись, затем включите общий доступ.');
    }

    setStatus('Создаю общую базу…', 'busy');
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const key = bytesToBase64Url(keyBytes);
    sync.cryptoKey = await importRoomKey(key);
    const revision = Date.now();
    const envelope = await encryptState(current, revision);
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(envelope)
    });
    if (!response.ok) throw new Error(`Облачное хранилище ответило: ${response.status}`);

    const locationHeader = response.headers.get('Location');
    const id = locationHeader?.split('/').filter(Boolean).pop();
    if (!id) throw new Error('Не удалось получить номер общей базы.');

    sync.lastRevision = revision;
    saveRoom({ id, key });
    setStatus('Синхронизация включена', 'ok');
    notify('Общая база создана', 'Твои текущие данные сохранены. Теперь отправь Карине общую ссылку.');
    startPolling();
    return sync.room;
  }

  async function fetchEnvelope() {
    if (!sync.room) return null;
    const response = await fetch(`${API}/${encodeURIComponent(sync.room.id)}`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Не удалось получить общие данные: ${response.status}`);
    return response.json();
  }

  async function pullRemote({ initial = false } = {}) {
    if (!sync.room || sync.pushing || sync.dirty) return;
    try {
      if (!sync.cryptoKey) sync.cryptoKey = await importRoomKey(sync.room.key);
      const envelope = await fetchEnvelope();
      const revision = Number(envelope?.revision) || 0;
      if (!revision || revision <= sync.lastRevision) {
        if (!initial) setStatus('Всё синхронизировано', 'ok');
        return;
      }

      const remoteText = await decryptState(envelope);
      JSON.parse(remoteText);
      sync.applyingRemote = true;
      localSet(DATA_KEY, remoteText);
      sync.applyingRemote = false;
      sync.lastRevision = revision;

      if (initial) {
        setStatus('Общие данные загружены', 'ok');
        return;
      }

      if (document.querySelector('.modal-root:not(:empty), form:focus-within')) {
        sync.pendingRemote = true;
        setStatus('Получены изменения — применяю…', 'busy');
      } else {
        setStatus('Получены новые изменения', 'ok');
        location.reload();
      }
    } catch (error) {
      console.error('[wedding sync] pull', error);
      setStatus('Нет связи — сохранено на телефоне', 'error');
    }
  }

  async function pushLocal() {
    if (!sync.room || sync.pushing || !sync.dirty) return;
    const current = localGet(DATA_KEY);
    if (!current) return;

    sync.pushing = true;
    setStatus('Сохраняю изменения…', 'busy');
    try {
      if (!sync.cryptoKey) sync.cryptoKey = await importRoomKey(sync.room.key);
      const revision = Math.max(Date.now(), sync.lastRevision + 1);
      const envelope = await encryptState(current, revision);
      const response = await fetch(`${API}/${encodeURIComponent(sync.room.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(envelope)
      });
      if (!response.ok) throw new Error(`Облачное хранилище ответило: ${response.status}`);
      sync.lastRevision = revision;
      sync.dirty = false;
      setStatus('Сохранено у вас обоих', 'ok');
    } catch (error) {
      console.error('[wedding sync] push', error);
      setStatus('Нет связи — повторю сохранение', 'error');
    } finally {
      sync.pushing = false;
    }
  }

  function schedulePush() {
    if (!sync.room || sync.applyingRemote) return;
    sync.dirty = true;
    setStatus('Есть несохранённые изменения…', 'busy');
    clearTimeout(sync.timer);
    sync.timer = setTimeout(pushLocal, 700);
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
      if (sync.pendingRemote && !document.querySelector('.modal-root:not(:empty), form:focus-within')) {
        location.reload();
        return;
      }
      if (sync.dirty && !sync.pushing) pushLocal();
      else if (document.visibilityState === 'visible') pullRemote();
    }, POLL_MS);
    window.addEventListener('focus', () => pullRemote());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') pullRemote();
    });
  }

  async function copyOrShare() {
    try {
      if (!sync.room) await createRoomFromLocal();
      const url = shareLink();
      if (navigator.share) {
        await navigator.share({
          title: 'Свадебные расходы — Марат и Карина',
          text: 'Открой нашу общую таблицу свадебных расходов. Все изменения синхронизируются.',
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        notify('Ссылка скопирована', 'Отправь её Карине. Открывать нужно полную ссылку целиком.');
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error('[wedding sync] share', error);
      notify('Не удалось включить общий доступ', error.message || 'Проверь интернет и попробуй ещё раз.');
      setStatus('Общий доступ не включён', 'error');
    }
  }

  function injectSyncControls() {
    const style = document.createElement('style');
    style.textContent = `
      .sync-share-btn{white-space:nowrap}
      #syncDock{position:fixed;right:14px;bottom:calc(90px + env(safe-area-inset-bottom));z-index:55;display:none;align-items:center;gap:8px;padding:8px;border:1px solid var(--line2);border-radius:18px;background:rgba(15,15,20,.88);backdrop-filter:blur(22px);box-shadow:var(--shadow)}
      :root[data-theme="light"] #syncDock{background:rgba(255,255,255,.9)}
      #syncDock button{border:0;border-radius:12px;background:linear-gradient(135deg,#f0c1a1,#c89673);color:#211713;padding:10px 12px;font-size:11px;font-weight:800}
      [data-sync-status]{display:inline-flex;align-items:center;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:800;white-space:nowrap}
      @media(max-width:760px){#syncDock{display:flex}.top-actions .sync-share-btn,.top-actions [data-sync-status]{display:none}}
    `;
    document.head.append(style);

    const topActions = document.querySelector('.top-actions');
    if (topActions) {
      const status = document.createElement('span');
      status.dataset.syncStatus = '';
      topActions.prepend(status);
      const button = document.createElement('button');
      button.className = 'button secondary compact sync-share-btn';
      button.textContent = '↗ Карине';
      button.addEventListener('click', copyOrShare);
      topActions.prepend(button);
    }

    const dock = document.createElement('div');
    dock.id = 'syncDock';
    dock.innerHTML = '<span data-sync-status></span><button type="button">↗ Карине</button>';
    dock.querySelector('button').addEventListener('click', copyOrShare);
    document.body.append(dock);

    if (sync.room) setStatus('Общая база', 'ok');
    else setStatus('Только на этом телефоне', 'local');
  }

  function loadApplication() {
    const script = document.createElement('script');
    script.src = `app.js?v=2`;
    script.onload = () => {
      sync.booted = true;
      injectSyncControls();
      if (sync.room) startPolling();
    };
    script.onerror = () => setStatus('Не удалось загрузить приложение', 'error');
    document.body.append(script);
  }

  async function boot() {
    installStorageHook();
    const addressRoom = readRoomFromAddress();
    const savedRoom = readSavedRoom();
    const room = addressRoom || savedRoom;

    if (room) {
      saveRoom(room);
      sync.cryptoKey = await importRoomKey(room.key);
      try {
        await pullRemote({ initial: true });
      } catch (error) {
        console.error('[wedding sync] initial pull', error);
      }
      loadApplication();
      return;
    }

    const existingData = localGet(DATA_KEY);
    if (existingData) {
      try {
        await createRoomFromLocal();
      } catch (error) {
        console.error('[wedding sync] auto migration', error);
      }
    }
    loadApplication();
  }

  boot().catch(error => {
    console.error('[wedding sync] boot', error);
    loadApplication();
  });
})();
