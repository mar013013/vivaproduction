(() => {
  'use strict';

  const STORAGE_KEY = 'fruktodar-purchases-v1';
  const markerInfo = {
    red: { label: 'Яма', subtitle: 'местное' },
    green: { label: 'Хутор', subtitle: 'импортное' },
    yellow: { label: 'Орехи', subtitle: 'орехи и сухофрукты' },
    purple: { label: 'Гипермаркет', subtitle: 'Лента / Ашан / Магнит' }
  };

  const classificationRules = {
    yellow: ['орех', 'миндаль', 'фундук', 'кешью', 'фисташ', 'арахис', 'семеч', 'сухофрукт', 'курага', 'чернослив', 'изюм', 'финик', 'цукат'],
    purple: ['банан', 'cola', 'кола', 'энергетик', 'шоколад', 'кофе', 'вода зулал', 'джермук', 'kitkat', 'milka'],
    red: ['местн', 'станич', 'деревен', 'абхаз', 'крым', 'белореч', 'зинск', 'армавир', 'домашн', 'хуторской'],
    green: ['авокадо', 'манго', 'питахай', 'маракуй', 'гранадилл', 'мангустин', 'рамбутан', 'лонган', 'личи', 'ананас', 'киви', 'грейпфрут', 'лимон', 'апельсин', 'мандарин', 'кабачок', 'клубник', 'голубик', 'малин']
  };

  const seedItems = [
    { id: crypto.randomUUID(), name: 'Картофель молодой для шашлыка', amount: 'надо', marker: 'red', note: '', status: 'active', createdAt: Date.now() - 5000 },
    { id: crypto.randomUUID(), name: 'Огурец Бьерн', amount: 'надо', marker: 'green', note: '', status: 'active', createdAt: Date.now() - 4000 },
    { id: crypto.randomUUID(), name: 'Авокадо Хаас', amount: 'остаток 4 упаковки', marker: 'green', note: '', status: 'active', createdAt: Date.now() - 3000 },
    { id: crypto.randomUUID(), name: 'Груша Конференция', amount: 'надо', marker: 'green', note: '', status: 'active', createdAt: Date.now() - 2000 },
    { id: crypto.randomUUID(), name: 'Миндаль жареный', amount: 'проверить запас', marker: 'yellow', note: '', status: 'active', createdAt: Date.now() - 1000 }
  ];

  const state = {
    items: loadItems(),
    view: 'active',
    filter: 'all',
    search: '',
    openMenuId: null,
    lastAction: null
  };

  const els = {
    activeCount: document.getElementById('activeCount'),
    activeBadge: document.getElementById('activeBadge'),
    boughtBadge: document.getElementById('boughtBadge'),
    progressRing: document.getElementById('progressRing'),
    progressText: document.getElementById('progressText'),
    list: document.getElementById('listContainer'),
    bulkInput: document.getElementById('bulkInput'),
    parseBtn: document.getElementById('parseBtn'),
    clearBulkBtn: document.getElementById('clearBulkBtn'),
    voiceBtn: document.getElementById('voiceBtn'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    filterRow: document.getElementById('filterRow'),
    addBtn: document.getElementById('addBtn'),
    itemDialog: document.getElementById('itemDialog'),
    itemForm: document.getElementById('itemForm'),
    editingId: document.getElementById('editingId'),
    itemName: document.getElementById('itemName'),
    itemAmount: document.getElementById('itemAmount'),
    itemNote: document.getElementById('itemNote'),
    itemDialogTitle: document.getElementById('itemDialogTitle'),
    menuBtn: document.getElementById('menuBtn'),
    settingsDialog: document.getElementById('settingsDialog'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    shareBtn: document.getElementById('shareBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importInput: document.getElementById('importInput'),
    archiveBoughtBtn: document.getElementById('archiveBoughtBtn'),
    clearAllBtn: document.getElementById('clearAllBtn'),
    toast: document.getElementById('toast'),
    emptyTemplate: document.getElementById('emptyTemplate')
  };

  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedItems;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : seedItems;
    } catch {
      return seedItems;
    }
  }

  function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }

  function inferMarker(text) {
    const normalized = text.toLowerCase().replace(/ё/g, 'е');
    for (const marker of ['yellow', 'purple', 'red', 'green']) {
      if (classificationRules[marker].some(word => normalized.includes(word))) return marker;
    }
    return 'green';
  }

  function parseLine(line) {
    const clean = line.replace(/^[-–—•*\d.)\s]+/, '').trim();
    if (!clean) return null;
    const amountPattern = /\b(надо|нужн\w*|запаса\s+нет|нет\s+запаса|остаток\s+.+|почти\s+полный|пол\s*ящика|полтора\s+ящика|\d+[\s-]*(?:ящик\w*|упаков\w*|шт\.?|кг|лукош\w*|связк\w*))\s*$/i;
    const match = clean.match(amountPattern);
    let name = clean;
    let amount = '';
    if (match) {
      amount = match[1].trim();
      name = clean.slice(0, match.index).replace(/[,:;\-–—]+$/, '').trim();
    }
    if (!name) return null;
    return {
      id: crypto.randomUUID(),
      name: capitalize(name),
      amount,
      marker: inferMarker(clean),
      note: '',
      status: 'active',
      createdAt: Date.now() + Math.random()
    };
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function addBulkItems() {
    const lines = els.bulkInput.value.split(/\n|;/).map(parseLine).filter(Boolean);
    if (!lines.length) {
      showToast('Напишите хотя бы один товар');
      els.bulkInput.focus();
      return;
    }
    state.items.push(...lines);
    saveItems();
    els.bulkInput.value = '';
    state.view = 'active';
    setActiveTab();
    render();
    showToast(`Добавлено позиций: ${lines.length}`);
  }

  function setItemStatus(id, status) {
    const item = state.items.find(x => x.id === id);
    if (!item) return;
    const previous = item.status;
    item.status = status;
    item.updatedAt = Date.now();
    saveItems();
    state.lastAction = { id, previous };
    render();
    showToast(status === 'bought' ? 'Товар отмечен купленным' : 'Товар возвращён в закупку', true);
  }

  function deleteItem(id) {
    const index = state.items.findIndex(x => x.id === id);
    if (index < 0) return;
    const [removed] = state.items.splice(index, 1);
    state.lastAction = { removed, index };
    state.openMenuId = null;
    saveItems();
    render();
    showToast('Позиция удалена', true);
  }

  function undoLastAction() {
    const action = state.lastAction;
    if (!action) return;
    if (action.removed) state.items.splice(action.index, 0, action.removed);
    else {
      const item = state.items.find(x => x.id === action.id);
      if (item) item.status = action.previous;
    }
    state.lastAction = null;
    saveItems();
    render();
    hideToast();
  }

  function openItemDialog(item = null) {
    els.itemForm.reset();
    els.editingId.value = item?.id || '';
    els.itemName.value = item?.name || '';
    els.itemAmount.value = item?.amount || '';
    els.itemNote.value = item?.note || '';
    els.itemDialogTitle.textContent = item ? 'Изменить товар' : 'Добавить товар';
    const marker = item?.marker || 'green';
    const radio = els.itemForm.querySelector(`input[name="marker"][value="${marker}"]`);
    if (radio) radio.checked = true;
    els.itemDialog.showModal();
    requestAnimationFrame(() => els.itemName.focus());
  }

  function saveItemFromForm(event) {
    event.preventDefault();
    const submitter = event.submitter;
    if (submitter?.value === 'cancel') {
      els.itemDialog.close();
      return;
    }
    const name = els.itemName.value.trim();
    if (!name) {
      els.itemName.focus();
      return;
    }
    const marker = new FormData(els.itemForm).get('marker') || inferMarker(name);
    const id = els.editingId.value;
    if (id) {
      const item = state.items.find(x => x.id === id);
      if (item) Object.assign(item, { name, amount: els.itemAmount.value.trim(), note: els.itemNote.value.trim(), marker, updatedAt: Date.now() });
    } else {
      state.items.push({ id: crypto.randomUUID(), name, amount: els.itemAmount.value.trim(), note: els.itemNote.value.trim(), marker, status: 'active', createdAt: Date.now() });
    }
    saveItems();
    els.itemDialog.close();
    render();
    showToast(id ? 'Позиция обновлена' : 'Товар добавлен');
  }

  function getVisibleItems() {
    return state.items
      .filter(item => item.status === state.view)
      .filter(item => state.filter === 'all' || item.marker === state.filter)
      .filter(item => {
        if (!state.search) return true;
        const haystack = `${item.name} ${item.amount || ''} ${item.note || ''}`.toLowerCase();
        return haystack.includes(state.search.toLowerCase());
      })
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  }

  function render() {
    updateStats();
    const items = getVisibleItems();
    els.list.replaceChildren();
    if (!items.length) {
      renderEmpty();
      return;
    }
    const markerOrder = ['red', 'green', 'yellow', 'purple'];
    markerOrder.forEach(marker => {
      const groupItems = items.filter(item => item.marker === marker);
      if (!groupItems.length) return;
      const section = document.createElement('section');
      section.className = 'group';
      section.innerHTML = `
        <div class="group-header">
          <div class="group-title"><i class="dot ${marker}"></i><h3>${escapeHtml(markerInfo[marker].label)}</h3></div>
          <span>${groupItems.length} ${pluralize(groupItems.length, ['позиция', 'позиции', 'позиций'])}</span>
        </div>
        <div class="item-list"></div>`;
      const list = section.querySelector('.item-list');
      groupItems.forEach(item => list.append(createItemCard(item)));
      els.list.append(section);
    });
  }

  function createItemCard(item) {
    const card = document.createElement('article');
    card.className = `item-card ${item.status === 'bought' ? 'bought' : ''}`;
    card.dataset.id = item.id;
    card.innerHTML = `
      <button class="check-btn" data-action="toggle" aria-label="${item.status === 'active' ? 'Отметить купленным' : 'Вернуть в закупку'}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
      </button>
      <div class="item-content">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-meta">
          <span>${escapeHtml(markerInfo[item.marker]?.label || '')}</span>
          ${item.amount ? `<span class="amount">${escapeHtml(item.amount)}</span>` : ''}
        </div>
        ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ''}
      </div>
      <div class="item-actions">
        <button class="item-menu" data-action="menu" aria-label="Действия">⋯</button>
        ${state.openMenuId === item.id ? `<div class="action-menu"><button data-action="edit">Изменить</button>${item.status !== 'archive' ? `<button data-action="archive">В архив</button>` : `<button data-action="restore">Вернуть в закупку</button>`}<button class="delete-action" data-action="delete">Удалить</button></div>` : ''}
      </div>`;
    return card;
  }

  function renderEmpty() {
    const node = els.emptyTemplate.content.cloneNode(true);
    const title = node.querySelector('h3');
    const text = node.querySelector('p');
    const copy = {
      active: ['Список пуст', 'Добавьте товары вручную или вставьте весь список сверху.'],
      bought: ['Пока ничего не куплено', 'Отмеченные галочкой товары появятся здесь.'],
      archive: ['Архив пуст', 'Сюда можно перенести завершённые закупки.']
    }[state.view];
    title.textContent = state.search ? 'Ничего не найдено' : copy[0];
    text.textContent = state.search ? 'Измените запрос или сбросьте фильтр.' : copy[1];
    els.list.append(node);
  }

  function updateStats() {
    const active = state.items.filter(x => x.status === 'active').length;
    const bought = state.items.filter(x => x.status === 'bought').length;
    const total = active + bought;
    const percent = total ? Math.round((bought / total) * 100) : 0;
    els.activeCount.textContent = active;
    els.activeBadge.textContent = active;
    els.boughtBadge.textContent = bought;
    els.progressText.textContent = `${percent}%`;
    els.progressRing.style.setProperty('--progress', `${percent * 3.6}deg`);
  }

  function pluralize(number, forms) {
    const n10 = number % 10;
    const n100 = number % 100;
    if (n10 === 1 && n100 !== 11) return forms[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
    return forms[2];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  let toastTimer;
  function showToast(message, withUndo = false) {
    clearTimeout(toastTimer);
    els.toast.innerHTML = `${escapeHtml(message)}${withUndo ? '<button type="button" id="undoBtn">Отменить</button>' : ''}`;
    els.toast.classList.add('show');
    document.getElementById('undoBtn')?.addEventListener('click', undoLastAction, { once: true });
    toastTimer = setTimeout(hideToast, 3400);
  }
  function hideToast() { els.toast.classList.remove('show'); }

  function setActiveTab() {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === state.view));
  }

  function handleListClick(event) {
    const card = event.target.closest('.item-card');
    const actionEl = event.target.closest('[data-action]');
    if (!card || !actionEl) {
      if (!event.target.closest('.action-menu')) {
        state.openMenuId = null;
        render();
      }
      return;
    }
    const id = card.dataset.id;
    const item = state.items.find(x => x.id === id);
    if (!item) return;
    const action = actionEl.dataset.action;
    if (action === 'toggle') setItemStatus(id, item.status === 'active' ? 'bought' : 'active');
    if (action === 'menu') { state.openMenuId = state.openMenuId === id ? null : id; render(); }
    if (action === 'edit') { state.openMenuId = null; openItemDialog(item); render(); }
    if (action === 'archive') { item.status = 'archive'; state.openMenuId = null; saveItems(); render(); showToast('Позиция перенесена в архив'); }
    if (action === 'restore') { item.status = 'active'; state.openMenuId = null; saveItems(); render(); showToast('Позиция возвращена'); }
    if (action === 'delete') deleteItem(id);
  }

  function setupVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      els.voiceBtn.addEventListener('click', () => showToast('Голосовой ввод не поддерживается этим браузером'));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = false;
    let listening = false;
    recognition.onresult = event => {
      const parts = [];
      for (let i = event.resultIndex; i < event.results.length; i++) parts.push(event.results[i][0].transcript.trim());
      const prefix = els.bulkInput.value.trim() ? '\n' : '';
      els.bulkInput.value += prefix + parts.join('\n');
    };
    recognition.onend = () => { listening = false; els.voiceBtn.classList.remove('listening'); };
    recognition.onerror = () => { listening = false; els.voiceBtn.classList.remove('listening'); showToast('Не удалось распознать голос'); };
    els.voiceBtn.addEventListener('click', () => {
      if (listening) recognition.stop();
      else { recognition.start(); listening = true; els.voiceBtn.classList.add('listening'); showToast('Говорите список товаров'); }
    });
  }

  async function shareList() {
    const active = state.items.filter(x => x.status === 'active');
    if (!active.length) { showToast('Активный список пуст'); return; }
    const lines = active.map(x => `${markerEmoji(x.marker)} ${x.name}${x.amount ? ` — ${x.amount}` : ''}`);
    const text = `Закупка Фруктодар\n\n${lines.join('\n')}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Закупка Фруктодар', text });
      else { await navigator.clipboard.writeText(text); showToast('Список скопирован'); }
    } catch (error) {
      if (error?.name !== 'AbortError') showToast('Не удалось отправить список');
    }
  }

  function markerEmoji(marker) {
    return ({ red: '🔴', green: '🟢', yellow: '🟡', purple: '🟣' })[marker] || '⚪️';
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), items: state.items }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fruktodar-zakupki-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Резервная копия скачана');
  }

  async function importData(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const items = Array.isArray(parsed) ? parsed : parsed.items;
      if (!Array.isArray(items)) throw new Error('Invalid format');
      state.items = items.filter(x => x && x.id && x.name && x.marker && x.status);
      saveItems();
      render();
      els.settingsDialog.close();
      showToast(`Восстановлено позиций: ${state.items.length}`);
    } catch { showToast('Файл не подходит для восстановления'); }
    finally { els.importInput.value = ''; }
  }

  function archiveBought() {
    const bought = state.items.filter(x => x.status === 'bought');
    if (!bought.length) { showToast('Нет купленных позиций'); return; }
    bought.forEach(x => { x.status = 'archive'; x.updatedAt = Date.now(); });
    saveItems();
    render();
    els.settingsDialog.close();
    showToast(`В архив перенесено: ${bought.length}`);
  }

  function clearAll() {
    if (!confirm('Удалить все товары, купленные позиции и архив?')) return;
    state.items = [];
    saveItems();
    render();
    els.settingsDialog.close();
    showToast('Все данные удалены');
  }

  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    state.view = tab.dataset.view;
    state.openMenuId = null;
    setActiveTab();
    render();
  }));

  els.filterRow.addEventListener('click', event => {
    const chip = event.target.closest('.filter-chip');
    if (!chip) return;
    state.filter = chip.dataset.filter;
    document.querySelectorAll('.filter-chip').forEach(x => x.classList.toggle('active', x === chip));
    render();
  });
  els.searchInput.addEventListener('input', () => {
    state.search = els.searchInput.value.trim();
    els.clearSearchBtn.classList.toggle('hidden', !state.search);
    render();
  });
  els.clearSearchBtn.addEventListener('click', () => {
    els.searchInput.value = '';
    state.search = '';
    els.clearSearchBtn.classList.add('hidden');
    render();
    els.searchInput.focus();
  });
  els.parseBtn.addEventListener('click', addBulkItems);
  els.clearBulkBtn.addEventListener('click', () => { els.bulkInput.value = ''; els.bulkInput.focus(); });
  els.addBtn.addEventListener('click', () => openItemDialog());
  els.itemForm.addEventListener('submit', saveItemFromForm);
  els.list.addEventListener('click', handleListClick);
  els.menuBtn.addEventListener('click', () => els.settingsDialog.showModal());
  els.closeSettingsBtn.addEventListener('click', () => els.settingsDialog.close());
  els.shareBtn.addEventListener('click', shareList);
  els.exportBtn.addEventListener('click', exportData);
  els.importInput.addEventListener('change', () => importData(els.importInput.files[0]));
  els.archiveBoughtBtn.addEventListener('click', archiveBought);
  els.clearAllBtn.addEventListener('click', clearAll);
  document.addEventListener('click', event => {
    if (state.openMenuId && !event.target.closest('.item-actions')) { state.openMenuId = null; render(); }
  });

  setupVoiceInput();
  render();

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
