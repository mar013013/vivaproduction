'use strict';

const FRUKTODAR_SUPPLIER_PRESENTATION = {
  'Яма': { color: 'red', emoji: '🔴' },
  'Хутор': { color: 'green', emoji: '🟢' },
  'Гарант': { color: 'yellow', emoji: '🟡' },
  'Не распределено': { color: 'red', emoji: '⚪' }
};

const FRUKTODAR_DEFAULT_SUPPLIER_KEYWORDS = {
  'Яма': [
    'картоф*', 'лук', 'кабач*', 'огур*', 'помидор*', 'томат*',
    'яблок*', 'слив*', 'чернослив*', 'череш*', 'голубик*', 'малин*',
    'ежевик*', 'тутовник*', 'шелковиц*', 'смородин*', 'инжир*', 'клубник*'
  ],
  'Хутор': ['авокадо*', 'груш*', 'персик*', 'нектарин*'],
  'Гарант': ['пакет*', 'milka*', 'kitkat*', 'kit kat*']
};

function fruktodarContainsKeyword(normalizedText, keyword) {
  const normalizedKeyword = normalize(keyword);
  const isStem = normalizedKeyword.endsWith('*');
  const value = isStem ? normalizedKeyword.slice(0, -1) : normalizedKeyword;
  const tail = isStem ? '[а-яa-z]*' : '';
  return new RegExp(`(^|[^а-яa-z])${escapeRegExp(value)}${tail}([^а-яa-z]|$)`, 'i').test(normalizedText);
}

function fruktodarDefaultSupplier(name) {
  const normalizedName = normalize(name);
  for (const [supplier, keywords] of Object.entries(FRUKTODAR_DEFAULT_SUPPLIER_KEYWORDS)) {
    if (keywords.some((keyword) => fruktodarContainsKeyword(normalizedName, keyword))) return supplier;
  }
  return null;
}

function fruktodarColorForSupplier(supplier) {
  return FRUKTODAR_SUPPLIER_PRESENTATION[supplier]?.color || null;
}

function fruktodarEmojiForSupplier(supplier, items = []) {
  return FRUKTODAR_SUPPLIER_PRESENTATION[supplier]?.emoji || COLOR_META[items[0]?.color]?.emoji || '⚪';
}

function fruktodarCleanNote(value = '') {
  return value.replace(/^[\s:–—-]+|[\s:–—-]+$/g, '').replace(/\s+/g, ' ').trim();
}

function fruktodarQuantityMetadata(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    return {
      quantityValue: wordToNumber(match[1]),
      quantityUnit: normalizeQuantityUnit(match[2] || 'шт')
    };
  }
  return { quantityValue: null, quantityUnit: '' };
}

splitProductSegments = function patchedSplitProductSegments(line) {
  if (/[—–]|\s-\s/.test(line)) return [line];
  const protectedLine = line.replace(/(\d)[,.](\d)/g, '$1§$2');
  return protectedLine.split(/[,;]|\s+и\s+(?=[а-яё])/i).map((x) => x.replace(/§/g, ','));
};

extractProductDetails = function patchedExtractProductDetails(segment) {
  let work = segment.trim();
  let price = null;
  let priceUnit = '';
  const priceMatch = work.match(/(?:по\s*)?(\d+(?:[.,]\d+)?)\s*(?:₽|р\.?|руб(?:лей|ля|ль)?)\s*(?:\/|за\s*)?\s*(кг|100\s*г|шт|уп|коробк\w*|ящик\w*)?/i);
  if (priceMatch) {
    price = Number(priceMatch[1].replace(',', '.'));
    priceUnit = normalizePriceUnit(priceMatch[2]);
    work = work.replace(priceMatch[0], ' ');
  }

  let quantity = '';
  let quantityValue = null;
  let quantityUnit = '';

  const dashMatch = work.match(/^(.+?)(?:\s*[—–]\s*|\s+-\s+)(.+)$/);
  if (dashMatch) {
    work = dashMatch[1].trim();
    quantity = fruktodarCleanNote(dashMatch[2]);
  }

  if (!quantity) {
    const statusMatch = work.match(/(?:^|\s)(надо|нужно|остаток|осталось|запас(?:а)?|запаса\s+нет(?:у)?|нет(?:у)?|законч(?:ил(?:ся|ось)|ились)|мало|много|полная|полный|почти)\b/i);
    if (statusMatch && statusMatch.index > 0) {
      quantity = fruktodarCleanNote(work.slice(statusMatch.index));
      work = work.slice(0, statusMatch.index).trim();
    }
  }

  const quantityPatterns = [
    /(\d+(?:[.,]\d+)?)\s*(кг|килограмм\w*|г|грамм\w*|ящик\w*|коробк\w*|мешк\w*|лукошк\w*|связк\w*|шт\.?|штук\w*|упаковк\w*|пачк\w*)\b/i,
    /\b(?:x|х)\s*(\d+)\b/i,
    /\b(один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)\s+(ящик\w*|коробк\w*|мешк\w*|лукошк\w*|связк\w*|штук\w*|килограмм\w*)\b/i
  ];

  if (quantity) {
    const metadata = fruktodarQuantityMetadata(quantity, quantityPatterns);
    quantityValue = metadata.quantityValue;
    quantityUnit = metadata.quantityUnit;
  } else {
    for (const pattern of quantityPatterns) {
      const match = work.match(pattern);
      if (!match) continue;
      quantityValue = wordToNumber(match[1]);
      quantityUnit = normalizeQuantityUnit(match[2] || 'шт');
      quantity = fruktodarCleanNote(match[0]);
      work = work.replace(match[0], ' ');
      break;
    }
  }

  work = work.replace(/\b(?:нужно|надо|взять|купить|заказать|добавить|позиция|товар)\b/ig, ' ')
    .replace(/^[\s:–—-]+|[\s:–—-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { name: work, quantity, quantityValue, quantityUnit, price, priceUnit };
};

parsePurchaseText = function patchedParsePurchaseText(raw, fallbackColor) {
  const suppliers = state.settings.suppliers;
  const supplierAliases = buildSupplierAliases(suppliers);
  let currentSupplier = 'Не распределено';
  let currentColor = null;
  const defaultColor = fallbackColor || 'red';
  const out = [];

  const cleaned = raw
    .replace(/\r/g, '\n')
    .replace(/[•▪◦]/g, '\n')
    .replace(/\s+-\s+/g, ' — ')
    .replace(/([.!?])\s+(?=[А-ЯA-ZЁ])/g, '$1\n');

  const lines = cleaned.split(/\n+/).map((x) => x.trim()).filter(Boolean);

  for (const sourceLine of lines) {
    let line = sourceLine;
    const explicitSupplier = detectSupplier(line, supplierAliases);
    if (explicitSupplier) {
      currentSupplier = explicitSupplier;
      currentColor = null;
      line = removeSupplierWords(line, supplierAliases);
    }
    const explicitColor = detectColor(line);
    if (explicitColor) {
      currentColor = explicitColor;
      line = removeColorWords(line);
    }

    const segments = splitProductSegments(line);
    for (let segment of segments) {
      segment = segment.replace(/^[:;,\-–—\s]+|[:;,\-–—\s]+$/g, '').trim();
      if (!segment || isOnlyContext(segment, supplierAliases)) continue;

      const explicitItemColor = detectColor(segment);
      const segmentSupplier = detectSupplier(segment, supplierAliases) || currentSupplier;
      segment = removeSupplierWords(removeColorWords(segment), supplierAliases).trim();

      const extracted = extractProductDetails(segment);
      if (!extracted.name || extracted.name.length < 2) continue;
      const rememberedSupplier = findRememberedSupplier(extracted.name);
      const defaultSupplier = fruktodarDefaultSupplier(extracted.name);
      const supplier = segmentSupplier !== 'Не распределено'
        ? segmentSupplier
        : (rememberedSupplier || defaultSupplier || segmentSupplier);
      const itemColor = explicitItemColor || currentColor || fruktodarColorForSupplier(supplier) || defaultColor;

      out.push({
        id: uid(),
        name: titleCaseProduct(extracted.name),
        quantity: extracted.quantity,
        quantityValue: extracted.quantityValue,
        quantityUnit: extracted.quantityUnit,
        price: extracted.price,
        priceUnit: extracted.priceUnit,
        supplier,
        color: itemColor,
        bought: false,
        createdAt: new Date().toISOString()
      });
    }
  }
  return dedupeParsed(out);
};

buildShareText = function patchedBuildShareText() {
  const lines = [];
  for (const supplier of state.settings.suppliers) {
    const items = state.items.filter((item) => item.supplier === supplier && !item.bought);
    if (!items.length) continue;
    const emoji = fruktodarEmojiForSupplier(supplier, items);
    lines.push(`${emoji} ${supplier.toUpperCase()}`, '');
    for (const item of items) {
      const details = [];
      if (item.quantity) details.push(item.quantity);
      if (Number.isFinite(item.price)) details.push(`${formatNumber(item.price)} ₽${item.priceUnit ? '/' + item.priceUnit : ''}`);
      lines.push(`${emoji} ${item.name}${details.length ? ` — ${details.join(' — ')}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => {});
}
