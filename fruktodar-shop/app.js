'use strict';
const products=[
  {
    "id": "set-25",
    "name": "Фруктовый набор №25",
    "category": [
      "sets",
      "sale"
    ],
    "price": 6319,
    "oldPrice": 6399,
    "unit": "набор",
    "image": "assets/real/set-25.webp",
    "composition": [
      "Ананас мини",
      "Манго кат чу",
      "Малина",
      "Смородина",
      "Гранат",
      "Королек",
      "Хурма",
      "Груша",
      "Лайм",
      "Мандарин",
      "Клубника"
    ],
    "note": "После сбора вашего заказа вам будет отправлено фото для согласования",
    "weight": "1 набор",
    "description": "После сбора вашего заказа вам будет отправлено фото для согласования.",
    "badge": "Набор"
  },
  {
    "id": "basket-77",
    "name": "Фруктовая корзина №77",
    "category": [
      "baskets",
      "sale"
    ],
    "price": 7633,
    "oldPrice": 8630,
    "unit": "корзина",
    "image": "assets/real/basket-77.webp",
    "composition": [
      "Ананас Люкс Коста Рика",
      "Помело Премиум",
      "Корзина Белая",
      "Апельсин №1 Африка",
      "Гранат №1 Перу L",
      "Груша Конференция Класс-1",
      "Нарезка Джекфрут Свежий (Вьетнам)",
      "Манго Кат Чу Тайвань",
      "Гранадилла Королевская Южная Америка",
      "Маракуйя Колумбия",
      "Мангустин Колумбия",
      "Мангустин Колумбия",
      "Питахайя Белая Таиланд",
      "Клубника №1 Египет",
      "Мандарин №1 Турция",
      "Яблоко Ред Чиф №1 Местное",
      "Мандарин Бейби Тайвань"
    ],
    "weight": "1 корзина",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Корзина",
    "sourceNote": "В исходном скриншоте Мангустин Колумбия указан дважды; до сверки с сайтом запись сохранена без исправления."
  },
  {
    "id": "jackfruit",
    "name": "Джекфрут",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 19900,
    "unit": "шт.",
    "image": "assets/real/jackfruit.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика"
  },
  {
    "id": "durian",
    "name": "Дуриан",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 10300,
    "unit": "шт.",
    "image": "assets/real/durian.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика"
  },
  {
    "id": "papaya-thailand",
    "name": "Папайя «ТАЙЛАНД»",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 2890,
    "unit": "шт.",
    "image": "assets/real/papaya-thailand.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика"
  },
  {
    "id": "papaya-baziliya",
    "name": "Папайя «Базилия»",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 1950,
    "unit": "шт.",
    "image": "assets/real/papaya-baziliya.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика",
    "sourceNote": "Написание названия сохранено со скриншота; требует сверки с сайтом."
  },
  {
    "id": "pineapple-royal",
    "name": "Ананас «Королевский» Кений",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 2190,
    "unit": "шт.",
    "image": "assets/real/pineapple-royal.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика"
  },
  {
    "id": "pineapple-lux",
    "name": "Ананас «Люкс» Коста Рики",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 990,
    "unit": "шт.",
    "image": "assets/real/pineapple-lux.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика"
  },
  {
    "id": "pineapple-mini",
    "name": "Ананас мини Маврикий",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 990,
    "unit": "шт.",
    "image": "assets/real/pineapple-mini.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика"
  },
  {
    "id": "mango-cat-chu",
    "name": "Манго Кат чу",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 169,
    "unit": "шт.",
    "image": "assets/real/mango-cat-chu.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика"
  },
  {
    "id": "mango-royal-peru",
    "name": "Манго Королевское Перу",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 1890,
    "unit": "шт.",
    "image": "assets/real/mango-royal-peru.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика"
  },
  {
    "id": "mango-pink-giant",
    "name": "Манго Розовый гигант",
    "category": [
      "fruits",
      "exotic"
    ],
    "price": 1100,
    "unit": "шт.",
    "image": "assets/real/mango-pink-giant.webp",
    "weight": "1 шт.",
    "description": "Наличие, итоговый состав и стоимость подтверждаем при оформлении заказа.",
    "badge": "Экзотика"
  }
];
function productPhoto(p,extra=''){return `<div class="product-photo real-photo ${extra}"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>`}
const categoryNames={all:'Наши вкусные любимчики',baskets:'Фруктовые корзины',sets:'Фруктовые наборы',fruits:'Фрукты и ягоды',exotic:'Маленькие тропические открытия',sale:'Вкусные предложения'};
const $=id=>document.getElementById(id),price=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(n),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cart={},favorites=[],category='all',query='',favoritesOnly=false,detailId=null,toastTimer;
try{const saved=JSON.parse(localStorage.getItem('fruktodar-store-v1'));if(saved&&typeof saved==='object'){for(const p of products){const q=saved.cart?.[p.id];if(Number.isInteger(q)&&q>0&&q<=99)cart[p.id]=q}if(Array.isArray(saved.favorites))favorites=[...new Set(saved.favorites.filter(id=>products.some(p=>p.id===id)))]}}catch{}
function notify(text){$('toast').textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',3000)}
function persist(){try{localStorage.setItem('fruktodar-store-v1',JSON.stringify({cart,favorites}))}catch{notify('Браузер не сохранил корзину. Она доступна до закрытия страницы.')}}
const count=()=>Object.values(cart).reduce((n,q)=>n+q,0),total=()=>products.reduce((n,p)=>n+p.price*(cart[p.id]||0),0);
function quantity(p){return `<div class="quantity" aria-label="Количество ${esc(p.name)}"><button data-quantity="${p.id}" data-delta="-1" aria-label="Уменьшить количество ${esc(p.name)}">−</button><span aria-live="polite">${cart[p.id]}</span><button data-quantity="${p.id}" data-delta="1" aria-label="Увеличить количество ${esc(p.name)}">+</button></div>`}
function renderProducts(){let list=products.filter(p=>(category==='all'||p.category.includes(category))&&(!favoritesOnly||favorites.includes(p.id))&&(!query||(p.name+' '+p.description).toLocaleLowerCase('ru-RU').includes(query)));const sort=$('sort').value;if(sort==='price-asc')list.sort((a,b)=>a.price-b.price);if(sort==='price-desc')list.sort((a,b)=>b.price-a.price);if(sort==='name')list.sort((a,b)=>a.name.localeCompare(b.name,'ru'));
$('catalogHeading').textContent=favoritesOnly?'То, что вам понравилось':query?'Результаты поиска':categoryNames[category];$('catalogStatus').textContent=query?`По запросу «${query}» найдено: ${list.length}`:favoritesOnly?`В избранном: ${list.length}`:'';
$('products').innerHTML=list.length?list.map(p=>`<article class="product-card"><button class="product-open" data-product="${p.id}" aria-label="Подробнее: ${esc(p.name)}">${productPhoto(p)}<div class="product-info"><h3>${esc(p.name)}</h3><p>${p.weight} · ${p.category.includes('baskets')?'плетёная корзина':p.category.includes('sets')?'готовый набор':'фруктовая лавка'}</p></div></button><div class="product-topline">${p.badge?`<span class="product-badge ${p.oldPrice?'sale':''}">${p.badge}</span>`:''}<button class="favorite" data-favorite="${p.id}" aria-label="${favorites.includes(p.id)?'Убрать из избранного':'Добавить в избранное'}: ${esc(p.name)}" aria-pressed="${favorites.includes(p.id)}"><svg class="icon"><use href="#i-heart"/></svg></button></div><div class="product-buy"><div class="product-price">${p.oldPrice?`<del>${price(p.oldPrice)}</del>`:''}${price(p.price)} <small>/ ${p.unit}</small></div>${cart[p.id]?quantity(p):`<button class="add-button" data-add="${p.id}" aria-label="Добавить в корзину: ${esc(p.name)}">+</button>`}</div></article>`).join(''):`<div class="empty-products">${favoritesOnly?'Здесь пока пусто. Нажмите на сердечко у понравившегося товара.':'Пока ничего не нашли. Попробуйте другое название или откройте весь каталог.'}<br><button data-category="all">Показать весь каталог</button></div>`;
document.querySelectorAll('.catalog-chips [data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category&&!favoritesOnly)));$('favoritesToggle').setAttribute('aria-pressed',String(favoritesOnly));}
function updateHeader(){$('cartCount').textContent=count();$('mobileCount').textContent=count();$('mobileTotal').textContent=price(total());$('mobileCart').disabled=count()===0;$('favoritesCount').textContent=favorites.length;$('cartToggle').setAttribute('aria-label',`Открыть корзину, товаров: ${count()}`)}
function changeQuantity(id,delta){if(!products.some(p=>p.id===id))return;const next=(cart[id]||0)+delta;if(next>99){notify('Максимум 99 единиц одного товара. Большой заказ согласуем по телефону.');return}if(next<=0)delete cart[id];else cart[id]=next;persist();renderProducts();updateHeader();if($('cartDialog').open)renderCart();if($('productDialog').open&&detailId)renderDetails(detailId);}
function openDialog(id){if(!$(id).open)$(id).showModal()}
function renderDetails(id){const p=products.find(p=>p.id===id);if(!p)return;detailId=id;$('productDetails').innerHTML=`<div class="detail-layout"><div class="detail-photo">${productPhoto(p)}</div><div class="detail-copy"><span class="eyebrow">ФРУКТОДАР · С ХОРОШИМ НАСТРОЕНИЕМ</span><h2>${esc(p.name)}</h2><p>${esc(p.description)}</p><p>${p.weight}</p>${p.composition?`<div class="detail-composition"><h3>Состав</h3><ul>${p.composition.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>`:''}<div class="detail-price">${price(p.price)} <small>/ ${p.unit}</small></div>${cart[id]?quantity(p):`<button class="button dark" data-add="${id}">Добавить в корзину <span>+</span></button>`}<p class="detail-note">Фотография и цена перенесены с вашего сайта по скриншоту. Наличие и итоговую стоимость подтверждает магазин.</p></div></div>`;}
function renderCart(){if(!count()){$('cartBody').innerHTML='<div class="cart-empty"><svg class="icon"><use href="#i-bag"/></svg><h3>Здесь скоро будет вкусно</h3><p>Добавьте любимые фрукты<br>или выберите корзину в подарок.</p><button class="button dark" data-close="cartDialog">Перейти к выбору <svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></button></div>';return}$('cartBody').innerHTML=products.filter(p=>cart[p.id]).map(p=>`<article class="cart-item">${productPhoto(p)}<div><h3>${esc(p.name)}</h3><small>${p.weight}</small>${quantity(p)}</div><div><strong>${price(cart[p.id]*p.price)}</strong><button class="remove-item" data-remove="${p.id}" aria-label="Удалить ${esc(p.name)}">Убрать</button></div></article>`).join('')+`<div class="cart-totals"><div><span>Товары · ${count()} ед.</span><strong>${price(total())}</strong></div><small>Доставка рассчитывается отдельно. Наличие, состав и цены нужно подтвердить по телефону.</small><button class="button dark full" id="prepareOrder">Подготовить заказ <span><svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></span></button><a class="button light full" href="tel:+79183901313" style="margin-top:10px">Есть вопрос? Позвоните нам</a></div>`;}
function renderCheckout(){$('checkoutSummary').innerHTML=`<div class="checkout-summary">${products.filter(p=>cart[p.id]).map(p=>`<div class="checkout-line"><span>${esc(p.name)} × ${cart[p.id]}</span><strong>${price(p.price*cart[p.id])}</strong></div>`).join('')}<div class="checkout-total"><span>Товары</span><span>${price(total())}</span></div></div>`;$('orderCopyFallback').hidden=true;}
function orderText(){return 'Фруктодар · состав заказа для подтверждения\nКраснодар\n\n'+products.filter(p=>cart[p.id]).map(p=>`${p.name} (${p.weight}) × ${cart[p.id]} — ${price(p.price*cart[p.id])}`).join('\n')+'\n\nТовары: '+price(total())+'\nДоставка рассчитывается отдельно. Наличие и цены нужно подтвердить.'+($('orderComment').value.trim()?'\nПожелания: '+$('orderComment').value.trim():'');}
function selectCategory(next){category=Object.hasOwn(categoryNames,next)?next:'all';favoritesOnly=false;query='';$('search').value='';renderProducts();$('catalog').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
document.addEventListener('click',async e=>{const categoryButton=e.target.closest('[data-category]');if(categoryButton){selectCategory(categoryButton.dataset.category);return}const add=e.target.closest('[data-add]');if(add){changeQuantity(add.dataset.add,1);notify('Добавлено в корзину');return}const q=e.target.closest('[data-quantity]');if(q){changeQuantity(q.dataset.quantity,Number(q.dataset.delta));return}const remove=e.target.closest('[data-remove]');if(remove){delete cart[remove.dataset.remove];persist();renderProducts();renderCart();updateHeader();return}const favorite=e.target.closest('[data-favorite]');if(favorite){const id=favorite.dataset.favorite;favorites=favorites.includes(id)?favorites.filter(x=>x!==id):[...favorites,id];persist();renderProducts();updateHeader();return}const product=e.target.closest('[data-product]');if(product){renderDetails(product.dataset.product);openDialog('productDialog');return}const close=e.target.closest('[data-close]');if(close){$(close.dataset.close).close();return}if(e.target.closest('#prepareOrder')){if(!count())return;renderCheckout();$('cartDialog').close();openDialog('checkoutDialog')}if(e.target.closest('#copyOrder')){const text=orderText();try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');await navigator.clipboard.writeText(text);notify('Состав заказа скопирован. Позвоните, чтобы подтвердить.')}catch{$('orderCopyFallback').value=text;$('orderCopyFallback').hidden=false;$('orderCopyFallback').focus();$('orderCopyFallback').select();notify('Скопируйте выделенный текст вручную.')}}});
$('cartToggle').onclick=$('mobileCart').onclick=()=>{renderCart();openDialog('cartDialog')};$('favoritesToggle').onclick=()=>{favoritesOnly=!favoritesOnly;category='all';query='';$('search').value='';renderProducts();$('catalog').scrollIntoView({behavior:'smooth'})};$('searchForm').onsubmit=e=>{e.preventDefault();query=$('search').value.trim().slice(0,100).toLocaleLowerCase('ru-RU');category='all';favoritesOnly=false;renderProducts();$('catalog').scrollIntoView({behavior:'smooth'})};$('search').oninput=()=>{query=$('search').value.trim().slice(0,100).toLocaleLowerCase('ru-RU');category='all';favoritesOnly=false;renderProducts()};$('sort').onchange=renderProducts;
for(const id of ['cartDialog','productDialog','checkoutDialog'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close()}});
$('year').textContent=new Date().getFullYear();renderProducts();updateHeader();
