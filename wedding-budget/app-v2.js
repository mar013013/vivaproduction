(() => {
  'use strict';

  const STORAGE_KEY = 'mk-wedding-control-v1';
  const ROUTES = {
    dashboard: ['Главный экран', 'СВАДЬБА МАРАТА И КАРИНЫ'],
    expenses: ['Бюджет и подрядчики', 'ФИНАНСОВЫЙ КОНТРОЛЬ'],
    guests: ['Гости и семьи', 'ПРИГЛАШЕНИЯ И РАССАДКА'],
    purchases: ['Список покупок', 'ПОДГОТОВКА К СВАДЬБЕ'],
    settings: ['Настройки', 'ПРОЕКТ И РЕЗЕРВНАЯ КОПИЯ']
  };
  const EXPENSE_CATEGORIES = ['Банкет и площадка','Фото и видео','Ведущий и музыка','Образы','Кольца','Декор и цветы','Транспорт','Торт и сладкое','Полиграфия','Церемония','Проживание','Другое'];
  const PURCHASE_CATEGORIES = ['Одежда','Аксессуары','Декор','Подарки','Полиграфия','Для банкета','Для церемонии','Другое'];
  const MEMBER_STATUSES = { pending: 'Ждём ответ', confirmed: 'Будет', declined: 'Не будет' };
  const SIDES = { marat: 'Сторона Марата', karina: 'Сторона Карины', common: 'Общие гости' };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const number = value => Math.max(0, Number(String(value ?? '').replace(/\s/g, '').replace(',', '.')) || 0);
  const sum = (list, getter) => list.reduce((total, item) => total + number(typeof getter === 'function' ? getter(item) : item[getter]), 0);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const money = value => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(number(value));
  const dateLong = value => value ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`)) : 'Дата не указана';
  const dateShort = value => value ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00`)) : 'Без срока';
  const initials = value => String(value || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('');

  const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const icons = {
    home: svg('<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>'),
    wallet: svg('<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 7h15"/><path d="M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z"/><path d="M17.5 13.5h.01"/>'),
    users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    check: svg('<path d="M9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3h4v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.37.45.7.83.83H21v4h-.09A1.65 1.65 0 0 0 19.4 15Z"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
    calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>'),
    card: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/>'),
    camera: svg('<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z"/><circle cx="12" cy="13" r="3.5"/>'),
    music: svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
    heart: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>'),
    person: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    child: svg('<circle cx="12" cy="9" r="3"/><path d="M6 21a6 6 0 0 1 12 0M9 5l-1-2M15 5l1-2"/>'),
    chevron: svg('<path d="m6 9 6 6 6-6"/>'),
    edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>'),
    trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v5M14 11v5"/>'),
    download: svg('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
    upload: svg('<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>'),
    more: svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')
  };
  const icon = name => icons[name] || icons.heart;

  function defaultState() {
    return {
      version: 2,
      settings: { couple: 'Марат & Карина', weddingDate: '2026-08-25', budget: 1000000 },
      expenses: [],
      guests: [],
      purchases: [],
      createdAt: Date.now()
    };
  }

  function memberFrom(name, type, status) {
    return { id: uid(), name, type, status: MEMBER_STATUSES[status] ? status : 'pending' };
  }

  function migrateFamily(guest) {
    if (Array.isArray(guest.members)) {
      return {
        id: String(guest.id || uid()),
        name: String(guest.name || 'Семья'),
        side: SIDES[guest.side] ? guest.side : 'common',
        table: String(guest.table || ''),
        phone: String(guest.phone || ''),
        notes: String(guest.notes || ''),
        createdAt: number(guest.createdAt || Date.now()),
        members: guest.members.map(member => ({
          id: String(member.id || uid()),
          name: String(member.name || 'Гость'),
          type: member.type === 'child' ? 'child' : 'adult',
          status: MEMBER_STATUSES[member.status] ? member.status : 'pending'
        }))
      };
    }
    const adults = Math.max(1, Math.round(number(guest.adults || 1)));
    const children = Math.round(number(guest.children || 0));
    const status = MEMBER_STATUSES[guest.status] ? guest.status : 'pending';
    const members = [memberFrom(String(guest.name || 'Гость'), 'adult', status)];
    for (let index = 1; index < adults; index += 1) members.push(memberFrom(`Взрослый ${index + 1}`, 'adult', status));
    for (let index = 0; index < children; index += 1) members.push(memberFrom(`Ребёнок ${index + 1}`, 'child', status));
    return {
      id: String(guest.id || uid()), name: String(guest.name || 'Семья'), side: SIDES[guest.side] ? guest.side : 'common',
      table: String(guest.table || ''), phone: String(guest.phone || ''), notes: String(guest.notes || ''),
      createdAt: number(guest.createdAt || Date.now()), members
    };
  }

  function normaliseState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return { state: base, migrated: false };
    const legacyGuests = Array.isArray(raw.guests) ? raw.guests : [];
    const migrated = raw.version !== 2 || legacyGuests.some(guest => !Array.isArray(guest.members));
    return {
      migrated,
      state: {
        version: 2,
        settings: {
          couple: String(raw.settings?.couple || base.settings.couple),
          weddingDate: String(raw.settings?.weddingDate || base.settings.weddingDate),
          budget: number(raw.settings?.budget || base.settings.budget)
        },
        expenses: Array.isArray(raw.expenses) ? raw.expenses.map(expense => ({
          id: String(expense.id || uid()), title: String(expense.title || 'Расход'), category: String(expense.category || 'Другое'),
          vendor: String(expense.vendor || ''), amount: number(expense.amount), paid: Math.min(number(expense.paid), number(expense.amount)),
          due: String(expense.due || ''), status: ['planned','booked','paid'].includes(expense.status) ? expense.status : 'planned',
          notes: String(expense.notes || ''), done: Boolean(expense.done), createdAt: number(expense.createdAt || Date.now())
        })) : [],
        guests: legacyGuests.map(migrateFamily),
        purchases: Array.isArray(raw.purchases) ? raw.purchases.map(purchase => ({
          id: String(purchase.id || uid()), title: String(purchase.title || 'Покупка'), category: String(purchase.category || 'Другое'),
          amount: number(purchase.amount), purchased: Boolean(purchase.purchased), owner: ['Марат','Карина','Вместе'].includes(purchase.owner) ? purchase.owner : 'Вместе',
          due: String(purchase.due || ''), priority: ['high','medium','low'].includes(purchase.priority) ? purchase.priority : 'medium',
          notes: String(purchase.notes || ''), createdAt: number(purchase.createdAt || Date.now())
        })) : [],
        createdAt: number(raw.createdAt || Date.now())
      }
    };
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return normaliseState(parsed);
    } catch (error) {
      console.error(error);
      return { state: defaultState(), migrated: false };
    }
  }

  const loaded = load();
  let state = loaded.state;
  let route = 'dashboard';
  let searchValue = '';
  let filterValue = 'all';
  const openFamilies = new Set();

  function save({ render = true, message = '' } = {}) {
    state.version = 2;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateChrome();
    if (render) draw();
    if (message) toast(message);
  }
  if (loaded.migrated) save({ render: false });

  function totals() {
    const expensePlanned = sum(state.expenses, 'amount');
    const expensePaid = sum(state.expenses, item => Math.min(item.paid, item.amount));
    const purchasePlanned = sum(state.purchases, 'amount');
    const purchasePaid = sum(state.purchases, item => item.purchased ? item.amount : 0);
    const planned = expensePlanned + purchasePlanned;
    const paid = expensePaid + purchasePaid;
    const budget = number(state.settings.budget);
    return {
      budget, expensePlanned, expensePaid, purchasePlanned, purchasePaid, planned, paid,
      free: budget - planned, debt: Math.max(0, planned - paid), progress: budget ? planned / budget * 100 : 0,
      paidProgress: planned ? paid / planned * 100 : 0
    };
  }

  function guestTotals() {
    const members = state.guests.flatMap(family => family.members || []);
    return {
      all: members.length,
      confirmed: members.filter(member => member.status === 'confirmed').length,
      pending: members.filter(member => member.status === 'pending').length,
      declined: members.filter(member => member.status === 'declined').length,
      adults: members.filter(member => member.type !== 'child' && member.status !== 'declined').length,
      children: members.filter(member => member.type === 'child' && member.status !== 'declined').length
    };
  }

  function countdown() {
    const target = new Date(`${state.settings.weddingDate}T12:00:00`);
    const days = Math.ceil((target - new Date()) / 86400000);
    if (Number.isNaN(target.getTime())) return { value: '—', label: 'дата не указана' };
    if (days === 0) return { value: '♡', label: 'сегодня свадьба' };
    if (days < 0) return { value: Math.abs(days), label: 'дней после свадьбы' };
    const ending = days % 10 === 1 && days % 100 !== 11 ? 'день' : [2,3,4].includes(days % 10) && ![12,13,14].includes(days % 100) ? 'дня' : 'дней';
    return { value: days, label: ending };
  }

  function categoryIcon(category) {
    if (/фото|видео/i.test(category)) return 'camera';
    if (/музык|ведущ/i.test(category)) return 'music';
    if (/банкет|площад/i.test(category)) return 'card';
    return 'heart';
  }

  function updateChrome() {
    const meta = ROUTES[route];
    $('#pageTitle').textContent = meta[0];
    $('#pageKicker').textContent = `${meta[1]} • ${dateLong(state.settings.weddingDate).toUpperCase()}`;
    $('#railCountdown').textContent = countdown().value === '♡' ? 'Сегодня' : `${countdown().value} ${countdown().label}`;
    document.title = `${meta[0]} — ${state.settings.couple}`;
    $$('.nav-button,[data-mobile-route]').forEach(button => button.classList.toggle('active', (button.dataset.route || button.dataset.mobileRoute) === route));
  }

  function go(next) {
    if (!ROUTES[next]) return;
    route = next;
    searchValue = '';
    filterValue = 'all';
    updateChrome();
    draw();
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  function animateNumbers() {
    $$('[data-count]').forEach(node => {
      const target = number(node.dataset.count);
      const start = performance.now();
      const duration = 720;
      const frame = now => {
        const progress = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = money(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('shown');
    }), { threshold: .08 });
    $$('.reveal').forEach(node => observer.observe(node));
  }

  function draw() {
    const view = $('#view');
    view.innerHTML = route === 'dashboard' ? dashboardView() : route === 'expenses' ? expensesView() : route === 'guests' ? guestsView() : route === 'purchases' ? purchasesView() : settingsView();
    requestAnimationFrame(animateNumbers);
  }

  function empty(title, text, action, label) {
    return `<div class="empty"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p><button class="primary-action" data-action="${action}">${icon('plus')}${escapeHtml(label)}</button></div>`;
  }

  function categoryBreakdown() {
    const map = new Map();
    state.expenses.forEach(item => map.set(item.category, (map.get(item.category) || 0) + item.amount));
    state.purchases.forEach(item => map.set(`Покупки · ${item.category}`, (map.get(`Покупки · ${item.category}`) || 0) + item.amount));
    return [...map.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }

  function dashboardView() {
    const total = totals();
    const guests = guestTotals();
    const count = countdown();
    const urgent = state.expenses.filter(item => item.amount > item.paid && !item.done).sort((a,b) => (a.due || '9999').localeCompare(b.due || '9999')).slice(0, 4);
    const categories = categoryBreakdown().slice(0, 6);
    const maxCategory = Math.max(...categories.map(item => item.amount), 1);
    const previewFamilies = state.guests.slice(0, 3);
    return `
      <section class="dashboard-grid">
        <article class="hero reveal">
          <div class="hero-inner">
            <div>
              <div class="hero-label">ОБЩИЙ СВАДЕБНЫЙ БЮДЖЕТ</div>
              <div class="budget-number"><span data-count="${total.budget}">${money(total.budget)}</span> <i>₽</i></div>
              <div class="budget-copy">${total.free >= 0 ? `После всех добавленных расходов свободно ${money(total.free)}.` : `План превышает бюджет на ${money(Math.abs(total.free))}.`}</div>
              <div class="hero-buttons"><button class="primary-action" data-action="add-expense">${icon('plus')}Новый расход</button><button class="ghost-action" data-route="settings">Изменить бюджет</button></div>
            </div>
            <div class="budget-ring" style="--progress:${clamp(total.progress,0,100)}"><div><b>${Math.round(total.progress)}%</b><span>распределено</span></div></div>
          </div>
          <div class="hero-metrics">
            <div class="hero-metric"><small>ЗАПЛАНИРОВАНО</small><strong>${money(total.planned)}</strong><span>услуги и покупки</span></div>
            <div class="hero-metric"><small>ОПЛАЧЕНО</small><strong>${money(total.paid)}</strong><span>${Math.round(total.paidProgress)}% от плана</span></div>
            <div class="hero-metric"><small>ОСТАЛОСЬ ОПЛАТИТЬ</small><strong>${money(total.debt)}</strong><span>предстоящие платежи</span></div>
          </div>
        </article>
        <div class="side-column">
          <article class="card glass countdown reveal"><div><small>ДО НАШЕГО ДНЯ</small><b>${count.value}</b><span>${count.label}</span></div></article>
          <article class="card glass reveal">
            <div class="card-head"><div><h3>Гости</h3><p>Семьи и подтверждения</p></div><button class="text-action" data-route="guests">Открыть</button></div>
            ${previewFamilies.length ? `<div class="mini-list">${previewFamilies.map(family => {
              const confirmed = family.members.filter(member => member.status === 'confirmed').length;
              return `<div class="mini-row"><div class="mini-row-icon">${icon('users')}</div><div class="mini-row-copy"><b>${escapeHtml(family.name)}</b><span>${family.members.length} чел. · ${SIDES[family.side]}</span></div><div class="mini-row-value"><b>${confirmed}/${family.members.length}</b><span>подтвердили</span></div></div>`;
            }).join('')}</div>` : empty('Пока никого нет', 'Добавь первую семью или пару.', 'add-family', 'Добавить семью')}
          </article>
        </div>
      </section>
      <section class="section-two">
        <article class="card glass reveal"><div class="card-head"><div><h2>Распределение бюджета</h2><p>Самые крупные направления</p></div><button class="text-action" data-route="expenses">Все расходы</button></div>
          ${categories.length ? `<div class="category-bars">${categories.map(item => `<div class="category-line"><div class="category-title"><i class="category-dot"></i>${escapeHtml(item.name)}</div><div class="category-value">${money(item.amount)}</div><div class="track"><span style="--w:${item.amount / maxCategory * 100}%"></span></div></div>`).join('')}</div>` : empty('Бюджет пока пуст', 'Добавь услуги и покупки — диаграмма появится автоматически.', 'add-expense', 'Добавить расход')}
        </article>
        <article class="card glass reveal"><div class="card-head"><div><h2>Ближайшие оплаты</h2><p>То, что ещё нужно закрыть</p></div><button class="text-action" data-action="add-expense">Добавить</button></div>
          ${urgent.length ? `<div class="mini-list">${urgent.map(item => `<div class="mini-row"><div class="mini-row-icon">${icon(categoryIcon(item.category))}</div><div class="mini-row-copy"><b>${escapeHtml(item.title)}</b><span>${dateShort(item.due)} · ${escapeHtml(item.category)}</span></div><div class="mini-row-value"><b>${money(item.amount - item.paid)}</b><span>осталось</span></div><button class="small-button" data-action="payment" data-id="${item.id}">Оплатить</button></div>`).join('')}</div>` : empty('Все платежи закрыты', 'Незакрытых оплат сейчас нет.', 'add-expense', 'Новый расход')}
        </article>
      </section>
      <section class="stat-grid" style="margin-top:18px">
        <div class="stat glass reveal"><small>СВОБОДНЫЙ БЮДЖЕТ</small><b>${money(Math.abs(total.free))}</b><span>${total.free >= 0 ? 'можно распределить' : 'превышение'}</span></div>
        <div class="stat glass reveal"><small>СЕМЕЙ / ГРУПП</small><b>${state.guests.length}</b><span>${guests.all} человек</span></div>
        <div class="stat glass reveal"><small>ПОДТВЕРДИЛИ</small><b>${guests.confirmed}</b><span>${guests.pending} ждём ответ</span></div>
        <div class="stat glass reveal"><small>ПОКУПКИ</small><b>${state.purchases.filter(item => item.purchased).length}/${state.purchases.length}</b><span>готовность списка</span></div>
      </section>`;
  }

  function expenseCard(item) {
    const paid = Math.min(item.paid, item.amount);
    const remaining = Math.max(0, item.amount - paid);
    const progress = item.amount ? paid / item.amount * 100 : 0;
    return `<article class="expense-card glass ${item.done ? 'completed' : ''} reveal">
      <div class="expense-top"><div class="expense-symbol">${icon(categoryIcon(item.category))}</div><div class="expense-main"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.category)}${item.vendor ? ` · ${escapeHtml(item.vendor)}` : ''}</p></div><span class="status-chip">${item.done ? 'ЗАВЕРШЕНО' : remaining ? 'В РАБОТЕ' : 'ОПЛАЧЕНО'}</span></div>
      <div class="expense-money"><div><strong>${money(item.amount)}</strong><small>полная стоимость</small></div><div class="expense-balance"><b>${money(remaining)}</b><small>осталось</small></div></div>
      <div class="expense-progress"><div class="progress-label"><span>Внесено ${money(paid)}</span><span>${Math.round(progress)}%</span></div><div class="track"><span style="--w:${progress}%"></span></div></div>
      <div class="expense-actions">${remaining ? `<button class="small-button grow" data-action="payment" data-id="${item.id}">＋ Внести оплату</button>` : ''}<button class="small-button" data-action="toggle-expense" data-id="${item.id}">${item.done ? 'Вернуть' : 'Готово'}</button><button class="small-button" data-action="edit-expense" data-id="${item.id}">${icon('edit')}</button><button class="small-button" data-action="delete-expense" data-id="${item.id}">${icon('trash')}</button></div>
    </article>`;
  }

  function expensesView() {
    const total = totals();
    const query = searchValue.trim().toLowerCase();
    const list = state.expenses.filter(item => (!query || `${item.title} ${item.vendor} ${item.category}`.toLowerCase().includes(query)) && (filterValue === 'all' || (filterValue === 'unpaid' ? item.paid < item.amount : filterValue === 'done' ? item.done : item.category === filterValue))).sort((a,b) => Number(a.done) - Number(b.done) || (a.due || '9999').localeCompare(b.due || '9999'));
    return `<div class="page-intro"><div><h2>Расходы</h2><p>Каждый подрядчик, предоплата и остаток — в одном месте.</p></div><button class="primary-action" data-action="add-expense">${icon('plus')}Добавить расход</button></div>
      <section class="stat-grid"><div class="stat glass"><small>УСЛУГИ</small><b>${money(total.expensePlanned)}</b><span>${state.expenses.length} позиций</span></div><div class="stat glass"><small>ОПЛАЧЕНО</small><b>${money(total.expensePaid)}</b><span>${Math.round(total.expensePlanned ? total.expensePaid / total.expensePlanned * 100 : 0)}%</span></div><div class="stat glass"><small>ОСТАТОК</small><b>${money(Math.max(0,total.expensePlanned-total.expensePaid))}</b><span>подрядчикам</span></div><div class="stat glass"><small>ЗАВЕРШЕНО</small><b>${state.expenses.filter(item=>item.done).length}</b><span>из ${state.expenses.length}</span></div></section>
      <div class="toolbar glass"><label class="search">${icon('search')}<input id="globalSearch" value="${escapeHtml(searchValue)}" placeholder="Найти расход или подрядчика"></label><select class="filter-select" id="globalFilter"><option value="all">Все категории</option><option value="unpaid" ${filterValue === 'unpaid' ? 'selected' : ''}>Есть остаток</option><option value="done" ${filterValue === 'done' ? 'selected' : ''}>Завершено</option>${EXPENSE_CATEGORIES.map(category=>`<option value="${escapeHtml(category)}" ${filterValue === category ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}</select></div>
      <section class="expense-grid">${list.length ? list.map(expenseCard).join('') : empty('Ничего не найдено', 'Измени фильтр или добавь новую позицию.', 'add-expense', 'Добавить расход')}</section>`;
  }

  function familyStatus(family) {
    const confirmed = family.members.filter(member => member.status === 'confirmed').length;
    return { confirmed, total: family.members.length, percent: family.members.length ? confirmed / family.members.length * 100 : 0 };
  }

  function familyCard(family) {
    const stats = familyStatus(family);
    const open = openFamilies.has(family.id);
    return `<article class="family-card glass ${open ? 'open' : ''} reveal" data-family-card="${family.id}">
      <button class="family-summary" data-action="toggle-family" data-id="${family.id}">
        <div class="avatar-stack">${family.members.slice(0,3).map(member=>`<span class="avatar ${member.type === 'child' ? 'child' : ''}">${escapeHtml(initials(member.name))}</span>`).join('')}${family.members.length > 3 ? `<span class="avatar">+${family.members.length-3}</span>` : ''}</div>
        <div class="family-copy"><h3>${escapeHtml(family.name)}</h3><p><span>${SIDES[family.side]}</span><span>${family.table ? `Стол ${escapeHtml(family.table)}` : 'Стол не назначен'}</span></p></div>
        <div class="family-progress"><b>${stats.confirmed}/${stats.total}</b><span>БУДУТ</span>${icon('chevron')}</div>
      </button>
      <div class="family-body"><div class="family-body-inner"><div class="family-members">
        ${family.members.map(member => `<div class="member-row"><div class="member-icon">${icon(member.type === 'child' ? 'child' : 'person')}</div><div class="member-copy"><b>${escapeHtml(member.name)}</b><span>${member.type === 'child' ? 'Ребёнок' : 'Взрослый'}</span></div><select class="member-status" data-action="member-status" data-family="${family.id}" data-member="${member.id}">${Object.entries(MEMBER_STATUSES).map(([key,label])=>`<option value="${key}" ${member.status === key ? 'selected' : ''}>${label}</option>`).join('')}</select><button class="small-button" data-action="edit-member" data-family="${family.id}" data-member="${member.id}">${icon('edit')}</button></div>`).join('')}
        <div class="family-footer"><button class="add-member" data-action="add-member" data-id="${family.id}">＋ Добавить человека</button><div class="family-tools"><button class="small-button" data-action="edit-family" data-id="${family.id}">${icon('edit')}</button><button class="small-button" data-action="delete-family" data-id="${family.id}">${icon('trash')}</button></div></div>
      </div></div></div>
    </article>`;
  }

  function guestsView() {
    const totals = guestTotals();
    const query = searchValue.trim().toLowerCase();
    const list = state.guests.filter(family => (!query || `${family.name} ${family.phone} ${family.table} ${family.members.map(member=>member.name).join(' ')}`.toLowerCase().includes(query)) && (filterValue === 'all' || family.side === filterValue || family.members.some(member => member.status === filterValue))).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
    return `<div class="page-intro"><div><h2>Гости и семьи</h2><p>Добавляй семью один раз, а людей — кнопкой внутри карточки.</p></div><button class="primary-action" data-action="add-family">${icon('plus')}Добавить семью</button></div>
      <section class="stat-grid"><div class="stat glass"><small>ВСЕГО ГОСТЕЙ</small><b>${totals.all}</b><span>${state.guests.length} семей / групп</span></div><div class="stat glass"><small>ПОДТВЕРДИЛИ</small><b>${totals.confirmed}</b><span>точно будут</span></div><div class="stat glass"><small>ЖДЁМ ОТВЕТ</small><b>${totals.pending}</b><span>нужно уточнить</span></div><div class="stat glass"><small>ЗА СТОЛАМИ</small><b>${totals.adults + totals.children}</b><span>${totals.children} детей</span></div></section>
      <div class="toolbar glass"><label class="search">${icon('search')}<input id="globalSearch" value="${escapeHtml(searchValue)}" placeholder="Семья, человек, телефон или стол"></label><select class="filter-select" id="globalFilter"><option value="all">Все гости</option><option value="marat" ${filterValue==='marat'?'selected':''}>Сторона Марата</option><option value="karina" ${filterValue==='karina'?'selected':''}>Сторона Карины</option><option value="common" ${filterValue==='common'?'selected':''}>Общие гости</option><option value="confirmed" ${filterValue==='confirmed'?'selected':''}>Подтвердили</option><option value="pending" ${filterValue==='pending'?'selected':''}>Ждём ответ</option></select></div>
      <section class="family-grid">${list.length ? list.map(familyCard).join('') : empty('Список гостей пуст', 'Создай семью, пару или отдельного гостя.', 'add-family', 'Добавить семью')}</section>`;
  }

  function purchaseRow(item) {
    return `<article class="purchase glass ${item.purchased ? 'done' : ''} reveal"><button class="round-check ${item.purchased ? 'on' : ''}" data-action="toggle-purchase" data-id="${item.id}">${item.purchased ? '✓' : ''}</button><div class="purchase-copy"><b>${escapeHtml(item.title)}</b><p><span>${escapeHtml(item.category)}</span><span>${escapeHtml(item.owner)}</span><span>${dateShort(item.due)}</span></p></div><div class="purchase-price"><b>${money(item.amount)}</b><div><button class="small-button" data-action="edit-purchase" data-id="${item.id}">${icon('edit')}</button><button class="small-button" data-action="delete-purchase" data-id="${item.id}">${icon('trash')}</button></div></div></article>`;
  }

  function purchasesView() {
    const total = totals();
    const query = searchValue.trim().toLowerCase();
    const list = state.purchases.filter(item => (!query || `${item.title} ${item.category} ${item.owner}`.toLowerCase().includes(query)) && (filterValue === 'all' || (filterValue === 'todo' ? !item.purchased : filterValue === 'done' ? item.purchased : item.priority === filterValue))).sort((a,b)=>Number(a.purchased)-Number(b.purchased));
    return `<div class="page-intro"><div><h2>Покупки</h2><p>Всё, что нужно приобрести до свадьбы.</p></div><button class="primary-action" data-action="add-purchase">${icon('plus')}Добавить покупку</button></div>
      <section class="stat-grid"><div class="stat glass"><small>В ПЛАНЕ</small><b>${money(total.purchasePlanned)}</b><span>${state.purchases.length} позиций</span></div><div class="stat glass"><small>УЖЕ КУПЛЕНО</small><b>${money(total.purchasePaid)}</b><span>${state.purchases.filter(item=>item.purchased).length} позиций</span></div><div class="stat glass"><small>ОСТАЛОСЬ</small><b>${money(Math.max(0,total.purchasePlanned-total.purchasePaid))}</b><span>${state.purchases.filter(item=>!item.purchased).length} позиций</span></div><div class="stat glass"><small>ГОТОВНОСТЬ</small><b>${Math.round(state.purchases.length ? state.purchases.filter(item=>item.purchased).length/state.purchases.length*100 : 0)}%</b><span>по списку</span></div></section>
      <div class="toolbar glass"><label class="search">${icon('search')}<input id="globalSearch" value="${escapeHtml(searchValue)}" placeholder="Найти покупку"></label><select class="filter-select" id="globalFilter"><option value="all">Все покупки</option><option value="todo" ${filterValue==='todo'?'selected':''}>Нужно купить</option><option value="done" ${filterValue==='done'?'selected':''}>Куплено</option><option value="high" ${filterValue==='high'?'selected':''}>Высокий приоритет</option></select></div>
      <section class="purchase-list">${list.length ? list.map(purchaseRow).join('') : empty('Список пока пуст', 'Добавь одежду, декор, подарки и любые мелочи.', 'add-purchase', 'Добавить покупку')}</section>`;
  }

  function settingsView() {
    const total = totals();
    return `<div class="page-intro"><div><h2>Настройки</h2><p>Главные данные проекта и резервная копия.</p></div></div><section class="settings-grid">
      <article class="settings-card glass"><h3>Свадьба и бюджет</h3><p>Эти параметры используются во всех расчётах.</p><form id="settingsForm" class="form-grid"><div class="field full"><label>НАЗВАНИЕ</label><input name="couple" value="${escapeHtml(state.settings.couple)}" required></div><div class="field"><label>ДАТА СВАДЬБЫ</label><input type="date" name="date" value="${escapeHtml(state.settings.weddingDate)}" required></div><div class="field"><label>ОБЩИЙ БЮДЖЕТ, ₽</label><input type="number" name="budget" min="0" step="1000" value="${state.settings.budget}" required></div><div class="field full"><button class="primary-action" style="justify-content:center">Сохранить настройки</button></div></form></article>
      <article class="settings-card glass"><h3>Сводка</h3><p>Текущее состояние бюджета.</p><div class="mini-list"><div class="mini-row"><div class="mini-row-copy"><b>Общий бюджет</b></div><div class="mini-row-value"><b>${money(total.budget)}</b></div></div><div class="mini-row"><div class="mini-row-copy"><b>Запланировано</b></div><div class="mini-row-value"><b>${money(total.planned)}</b></div></div><div class="mini-row"><div class="mini-row-copy"><b>Оплачено</b></div><div class="mini-row-value"><b>${money(total.paid)}</b></div></div><div class="mini-row"><div class="mini-row-copy"><b>${total.free >= 0 ? 'Свободно' : 'Превышение'}</b></div><div class="mini-row-value"><b>${money(Math.abs(total.free))}</b></div></div></div></article>
      <article class="settings-card glass"><h3>Резервная копия</h3><p>Файл пригодится, даже если общая база уже включена.</p><div class="settings-actions"><button class="ghost-action" data-action="export">${icon('download')}Скачать</button><button class="ghost-action" data-action="import">${icon('upload')}Загрузить</button></div></article>
      <article class="settings-card glass"><h3>Опасная зона</h3><p>Удаление действует и для общей базы после синхронизации.</p><button class="danger-button" data-action="reset">Сбросить все данные</button></article>
    </section>`;
  }

  function modal(title, body, footer = '') {
    $('#modalRoot').innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="close" data-action="close-modal">${icon('plus')}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ''}</div>`;
    const closeIcon = $('.modal .close svg');
    if (closeIcon) closeIcon.style.transform = 'rotate(45deg)';
    setTimeout(() => $('.modal input,.modal select,.modal button')?.focus(), 20);
  }
  const closeModal = () => { $('#modalRoot').innerHTML = ''; };

  function expenseModal(id = null) {
    const item = id ? state.expenses.find(entry => entry.id === id) : null;
    const value = item || { title:'',category:'Фото и видео',vendor:'',amount:'',paid:'',due:'',status:'planned',notes:'' };
    modal(item ? 'Изменить расход' : 'Новый расход', `<form id="expenseForm" data-id="${item?.id || ''}" class="form-grid"><div class="field full"><label>НАЗВАНИЕ</label><input name="title" value="${escapeHtml(value.title)}" placeholder="Например, видеограф" required></div><div class="field"><label>КАТЕГОРИЯ</label><select name="category">${EXPENSE_CATEGORIES.map(category=>`<option ${value.category===category?'selected':''}>${escapeHtml(category)}</option>`).join('')}</select></div><div class="field"><label>ПОДРЯДЧИК</label><input name="vendor" value="${escapeHtml(value.vendor)}" placeholder="Имя или компания"></div><div class="field"><label>СТОИМОСТЬ, ₽</label><input type="number" name="amount" min="0" step="1000" value="${value.amount}" required></div><div class="field"><label>УЖЕ ОПЛАЧЕНО, ₽</label><input type="number" name="paid" min="0" step="1000" value="${value.paid}" required></div><div class="field"><label>ОПЛАТИТЬ ДО</label><input type="date" name="due" value="${escapeHtml(value.due)}"></div><div class="field"><label>СТАТУС</label><select name="status"><option value="planned" ${value.status==='planned'?'selected':''}>Планируется</option><option value="booked" ${value.status==='booked'?'selected':''}>Забронировано</option><option value="paid" ${value.status==='paid'?'selected':''}>Оплачено</option></select></div><div class="field full"><label>ЗАМЕТКИ</label><textarea name="notes">${escapeHtml(value.notes)}</textarea></div><div class="field full"><button class="primary-action" style="justify-content:center">${item?'Сохранить':'Добавить расход'}</button></div></form>`);
  }

  function paymentModal(id) {
    const item = state.expenses.find(entry => entry.id === id);
    if (!item) return;
    const remaining = Math.max(0, item.amount - item.paid);
    modal('Внести оплату', `<div class="mini-row" style="margin-bottom:15px"><div class="mini-row-icon">${icon('wallet')}</div><div class="mini-row-copy"><b>${escapeHtml(item.title)}</b><span>Осталось ${money(remaining)}</span></div></div><form id="paymentForm" data-id="${item.id}" class="form-grid"><div class="field full"><label>СУММА, ₽</label><input type="number" name="payment" min="1" max="${remaining}" step="1000" value="${remaining}" required></div><div class="field full"><button class="primary-action" style="justify-content:center">Записать оплату</button></div></form>`);
  }

  function familyModal(id = null) {
    const family = id ? state.guests.find(entry => entry.id === id) : null;
    const value = family || { name:'',side:'common',table:'',phone:'',notes:'' };
    modal(family ? 'Настройки семьи' : 'Новая семья', `<form id="familyForm" data-id="${family?.id || ''}" class="form-grid"><div class="field full"><label>НАЗВАНИЕ СЕМЬИ / ГРУППЫ</label><input name="name" value="${escapeHtml(value.name)}" placeholder="Например, семья Ивановых" required></div>${family ? '' : '<div class="field full"><label>ПЕРВЫЙ ЧЕЛОВЕК</label><input name="firstMember" placeholder="Имя гостя" required></div>'}<div class="field"><label>СТОРОНА</label><select name="side"><option value="marat" ${value.side==='marat'?'selected':''}>Марат</option><option value="karina" ${value.side==='karina'?'selected':''}>Карина</option><option value="common" ${value.side==='common'?'selected':''}>Общие</option></select></div><div class="field"><label>СТОЛ</label><input name="table" value="${escapeHtml(value.table)}" placeholder="Например, 4"></div><div class="field full"><label>ТЕЛЕФОН</label><input type="tel" name="phone" value="${escapeHtml(value.phone)}" placeholder="+7 ..."></div><div class="field full"><label>ЗАМЕТКИ</label><textarea name="notes">${escapeHtml(value.notes)}</textarea></div><div class="field full"><button class="primary-action" style="justify-content:center">${family?'Сохранить':'Создать семью'}</button></div></form>`);
  }

  function memberModal(familyId, memberId = null) {
    const family = state.guests.find(entry => entry.id === familyId);
    if (!family) return;
    const member = memberId ? family.members.find(entry => entry.id === memberId) : null;
    const value = member || { name:'',type:'adult',status:'pending' };
    modal(member ? 'Изменить человека' : `Добавить в «${family.name}»`, `<form id="memberForm" data-family="${family.id}" data-member="${member?.id || ''}" class="form-grid"><div class="field full"><label>ИМЯ</label><input name="name" value="${escapeHtml(value.name)}" placeholder="Имя человека" required></div><div class="field"><label>ТИП</label><select name="type"><option value="adult" ${value.type==='adult'?'selected':''}>Взрослый</option><option value="child" ${value.type==='child'?'selected':''}>Ребёнок</option></select></div><div class="field"><label>ПРИСУТСТВИЕ</label><select name="status">${Object.entries(MEMBER_STATUSES).map(([key,label])=>`<option value="${key}" ${value.status===key?'selected':''}>${label}</option>`).join('')}</select></div><div class="field full"><button class="primary-action" style="justify-content:center">${member?'Сохранить':'Добавить человека'}</button></div></form>`);
  }

  function purchaseModal(id = null) {
    const item = id ? state.purchases.find(entry => entry.id === id) : null;
    const value = item || { title:'',category:'Одежда',amount:'',owner:'Вместе',due:'',priority:'medium',notes:'' };
    modal(item ? 'Изменить покупку' : 'Новая покупка', `<form id="purchaseForm" data-id="${item?.id || ''}" class="form-grid"><div class="field full"><label>ЧТО КУПИТЬ</label><input name="title" value="${escapeHtml(value.title)}" required></div><div class="field"><label>КАТЕГОРИЯ</label><select name="category">${PURCHASE_CATEGORIES.map(category=>`<option ${value.category===category?'selected':''}>${escapeHtml(category)}</option>`).join('')}</select></div><div class="field"><label>СТОИМОСТЬ, ₽</label><input type="number" name="amount" min="0" step="1000" value="${value.amount}" required></div><div class="field"><label>ОТВЕТСТВЕННЫЙ</label><select name="owner">${['Марат','Карина','Вместе'].map(owner=>`<option ${value.owner===owner?'selected':''}>${owner}</option>`).join('')}</select></div><div class="field"><label>КУПИТЬ ДО</label><input type="date" name="due" value="${escapeHtml(value.due)}"></div><div class="field"><label>ПРИОРИТЕТ</label><select name="priority"><option value="high" ${value.priority==='high'?'selected':''}>Высокий</option><option value="medium" ${value.priority==='medium'?'selected':''}>Средний</option><option value="low" ${value.priority==='low'?'selected':''}>Низкий</option></select></div><div class="field full"><label>ЗАМЕТКИ</label><textarea name="notes">${escapeHtml(value.notes)}</textarea></div><div class="field full"><button class="primary-action" style="justify-content:center">${item?'Сохранить':'Добавить покупку'}</button></div></form>`);
  }

  function confirmModal(title, text, handler) {
    modal(title, `<p style="color:var(--muted);font-size:11px;line-height:1.65;margin:0">${escapeHtml(text)}</p>`, `<button class="ghost-action" data-action="close-modal">Отмена</button><button class="danger-button" id="confirmButton">Удалить</button>`);
    $('#confirmButton').onclick = () => { handler(); closeModal(); };
  }

  function toast(title, text = '') {
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = `<b>${escapeHtml(title)}</b>${text ? `<small>${escapeHtml(text)}</small>` : ''}`;
    $('#toastStack').append(node);
    setTimeout(() => node.remove(), 3600);
  }

  function celebrate() {
    for (let index = 0; index < 18; index += 1) {
      const particle = document.createElement('i');
      particle.className = 'celebrate';
      particle.style.left = `${50 + (Math.random() - .5) * 12}%`;
      particle.style.top = '48%';
      particle.style.setProperty('--x', `${(Math.random() - .5) * 430}px`);
      particle.style.setProperty('--y', `${Math.random() * 300 - 80}px`);
      particle.style.background = [ 'var(--rose)','var(--gold)','var(--lilac)','var(--mint)' ][index % 4];
      document.body.append(particle);
      setTimeout(() => particle.remove(), 1200);
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wedding-marat-karina-${new Date().toISOString().slice(0,10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importData(file) {
    try {
      const parsed = JSON.parse(await file.text());
      state = normaliseState(parsed).state;
      save({ message: 'Резервная копия загружена' });
    } catch (error) {
      console.error(error);
      toast('Не удалось загрузить файл', 'Проверь, что это резервная копия приложения.');
    }
  }

  document.addEventListener('click', event => {
    const routeButton = event.target.closest('[data-route],[data-mobile-route]');
    if (routeButton) { go(routeButton.dataset.route || routeButton.dataset.mobileRoute); return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id, family, member } = button.dataset;
    if (action === 'close-modal') closeModal();
    if (action === 'quick-add') modal('Что добавить?', `<div class="settings-grid"><button class="settings-card glass" data-action="add-expense" style="text-align:left;border-color:var(--line)"><h3>Расход</h3><p>Подрядчик, предоплата и остаток.</p>${icon('wallet')}</button><button class="settings-card glass" data-action="add-family" style="text-align:left;border-color:var(--line)"><h3>Семью</h3><p>Группа гостей и участники.</p>${icon('users')}</button><button class="settings-card glass" data-action="add-purchase" style="text-align:left;border-color:var(--line)"><h3>Покупку</h3><p>Цена, срок и ответственный.</p>${icon('check')}</button></div>`);
    if (action === 'add-expense') { closeModal(); expenseModal(); }
    if (action === 'edit-expense') expenseModal(id);
    if (action === 'payment') paymentModal(id);
    if (action === 'toggle-expense') { const item = state.expenses.find(entry=>entry.id===id); if(item){ item.done=!item.done; save({message:item.done?'Расход завершён':'Расход возвращён'}); if(item.done) celebrate(); } }
    if (action === 'delete-expense') { const item=state.expenses.find(entry=>entry.id===id); if(item) confirmModal('Удалить расход?', `«${item.title}» исчезнет из общего бюджета.`, ()=>{state.expenses=state.expenses.filter(entry=>entry.id!==id);save({message:'Расход удалён'});}); }
    if (action === 'add-family') { closeModal(); familyModal(); }
    if (action === 'toggle-family') { openFamilies.has(id) ? openFamilies.delete(id) : openFamilies.add(id); draw(); }
    if (action === 'edit-family') familyModal(id);
    if (action === 'delete-family') { const item=state.guests.find(entry=>entry.id===id); if(item) confirmModal('Удалить семью?', `Будут удалены все люди из «${item.name}».`, ()=>{state.guests=state.guests.filter(entry=>entry.id!==id);save({message:'Семья удалена'});}); }
    if (action === 'add-member') memberModal(id);
    if (action === 'edit-member') memberModal(family, member);
    if (action === 'add-purchase') { closeModal(); purchaseModal(); }
    if (action === 'edit-purchase') purchaseModal(id);
    if (action === 'toggle-purchase') { const item=state.purchases.find(entry=>entry.id===id); if(item){item.purchased=!item.purchased;save({message:item.purchased?'Отмечено как купленное':'Возвращено в список'});if(item.purchased)celebrate();} }
    if (action === 'delete-purchase') { const item=state.purchases.find(entry=>entry.id===id); if(item) confirmModal('Удалить покупку?', `«${item.title}» исчезнет из списка.`, ()=>{state.purchases=state.purchases.filter(entry=>entry.id!==id);save({message:'Покупка удалена'});}); }
    if (action === 'export') exportData();
    if (action === 'import') $('#importInput').click();
    if (action === 'reset') confirmModal('Сбросить всё?', 'Все расходы, семьи и покупки будут удалены.', ()=>{state=defaultState();save({message:'Приложение очищено'});});
  });

  document.addEventListener('change', event => {
    const target = event.target;
    if (target.dataset.action === 'member-status') {
      const family = state.guests.find(entry=>entry.id===target.dataset.family);
      const member = family?.members.find(entry=>entry.id===target.dataset.member);
      if (member) { member.status = target.value; save({message:'Статус гостя изменён'}); if(target.value==='confirmed') celebrate(); }
    }
    if (target.id === 'globalFilter') { filterValue = target.value; draw(); }
    if (target.id === 'importInput' && target.files?.[0]) { importData(target.files[0]); target.value=''; }
  });

  let inputTimer;
  document.addEventListener('input', event => {
    if (event.target.id !== 'globalSearch') return;
    searchValue = event.target.value;
    clearTimeout(inputTimer);
    inputTimer = setTimeout(() => {
      const position = event.target.selectionStart;
      draw();
      const input = $('#globalSearch');
      input?.focus();
      input?.setSelectionRange(position, position);
    }, 120);
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    const data = new FormData(form);
    if (form.id === 'expenseForm') {
      const old = state.expenses.find(entry=>entry.id===form.dataset.id);
      const amount = number(data.get('amount'));
      const item = { id: old?.id || uid(), title:String(data.get('title')).trim(), category:String(data.get('category')), vendor:String(data.get('vendor')).trim(), amount, paid:Math.min(number(data.get('paid')),amount), due:String(data.get('due')), status:String(data.get('status')), notes:String(data.get('notes')).trim(), done:old?.done||false, createdAt:old?.createdAt||Date.now() };
      if(item.paid>=item.amount&&item.amount)item.status='paid';
      old ? Object.assign(old,item) : state.expenses.unshift(item);
      closeModal(); save({message:old?'Расход обновлён':'Расход добавлен'});
    }
    if (form.id === 'paymentForm') {
      const item=state.expenses.find(entry=>entry.id===form.dataset.id); if(!item)return;
      item.paid=Math.min(item.amount,item.paid+number(data.get('payment'))); if(item.paid>=item.amount)item.status='paid';
      closeModal();save({message:`Осталось ${money(item.amount-item.paid)}`});if(item.paid>=item.amount)celebrate();
    }
    if (form.id === 'familyForm') {
      const old=state.guests.find(entry=>entry.id===form.dataset.id);
      if(old){old.name=String(data.get('name')).trim();old.side=String(data.get('side'));old.table=String(data.get('table')).trim();old.phone=String(data.get('phone')).trim();old.notes=String(data.get('notes')).trim();}
      else {const family={id:uid(),name:String(data.get('name')).trim(),side:String(data.get('side')),table:String(data.get('table')).trim(),phone:String(data.get('phone')).trim(),notes:String(data.get('notes')).trim(),createdAt:Date.now(),members:[memberFrom(String(data.get('firstMember')).trim(),'adult','pending')]};state.guests.unshift(family);openFamilies.add(family.id);}
      closeModal();save({message:old?'Семья обновлена':'Семья создана'});
    }
    if (form.id === 'memberForm') {
      const family=state.guests.find(entry=>entry.id===form.dataset.family);if(!family)return;
      const old=family.members.find(entry=>entry.id===form.dataset.member);
      const item={id:old?.id||uid(),name:String(data.get('name')).trim(),type:String(data.get('type')),status:String(data.get('status'))};
      old?Object.assign(old,item):family.members.push(item);openFamilies.add(family.id);closeModal();save({message:old?'Человек обновлён':'Человек добавлен'});
    }
    if (form.id === 'purchaseForm') {
      const old=state.purchases.find(entry=>entry.id===form.dataset.id);
      const item={id:old?.id||uid(),title:String(data.get('title')).trim(),category:String(data.get('category')),amount:number(data.get('amount')),purchased:old?.purchased||false,owner:String(data.get('owner')),due:String(data.get('due')),priority:String(data.get('priority')),notes:String(data.get('notes')).trim(),createdAt:old?.createdAt||Date.now()};
      old?Object.assign(old,item):state.purchases.unshift(item);closeModal();save({message:old?'Покупка обновлена':'Покупка добавлена'});
    }
    if (form.id === 'settingsForm') {state.settings.couple=String(data.get('couple')).trim();state.settings.weddingDate=String(data.get('date'));state.settings.budget=number(data.get('budget'));save({message:'Настройки сохранены'});}
  });

  $('#view').addEventListener('click', event => {
    const card = event.target.closest('.family-card');
    if (!card || event.target.closest('button,select,input')) return;
    const id = card.dataset.familyCard;
    openFamilies.has(id) ? openFamilies.delete(id) : openFamilies.add(id);
    draw();
  });
  $('#modalRoot').addEventListener('click', event => { if(event.target.id==='modalRoot') closeModal(); });
  document.addEventListener('keydown', event => { if(event.key==='Escape')closeModal(); });
  $('#headerAdd').onclick = () => route==='expenses'?expenseModal():route==='guests'?familyModal():route==='purchases'?purchaseModal():document.querySelector('[data-action="quick-add"]')?.click();
  $('#mobileAdd').onclick = () => modal('Что добавить?', `<div class="settings-grid"><button class="settings-card glass" data-action="add-expense" style="text-align:left;border-color:var(--line)"><h3>Расход</h3><p>Подрядчик и оплата.</p>${icon('wallet')}</button><button class="settings-card glass" data-action="add-family" style="text-align:left;border-color:var(--line)"><h3>Семью</h3><p>Группа гостей.</p>${icon('users')}</button><button class="settings-card glass" data-action="add-purchase" style="text-align:left;border-color:var(--line)"><h3>Покупку</h3><p>Чек-лист.</p>${icon('check')}</button></div>`);
  $('#settingsButton').onclick = () => go('settings');
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.error));

  updateChrome();
  draw();
})();
