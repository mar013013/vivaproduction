'use strict';

const FRUKTODAR_SUPPLIER_PRESENTATION = {
  'Яма': { color: 'red', emoji: '🔴' },
  'Хутор': { color: 'green', emoji: '🟢' },
  'Гарант': { color: 'yellow', emoji: '🟡' },
  'Не распределено': { color: 'red', emoji: '⚪' }
};

const FRUKTODAR_COLOR_TO_SUPPLIER = {
  red: 'Яма',
  green: 'Хутор',
  yellow: 'Гарант'
};

const FRUKTODAR_DEFAULT_SUPPLIER_KEYWORDS = {
  'Яма': [
    'картоф*', 'лук', 'кабач*', 'огур*', 'помидор*', 'томат*',
    'яблок*', 'слив*', 'чернослив*', 'череш*', 'голубик*', 'малин*',
    'ежевик*', 'тутовник*', 'шелковиц*', 'смородин*', 'инжир*', 'клубник*',
    'чеснок*', 'гриб*', 'капуст*', 'морков*', 'свекл*', 'редьк*', 'редис*',
    'баклажан*', 'кукуруз*', 'зелень*', 'укроп*', 'петруш*', 'кинз*'
  ],
  'Хутор': [
    'авокадо*', 'груш*', 'персик*', 'нектарин*', 'банан*', 'виноград*',
    'апельсин*', 'мандарин*', 'лимон*', 'грейпфрут*', 'киви*', 'манго*',
    'маракуй*', 'питахай*', 'гранадилл*', 'мангустин*', 'рамбутан*', 'лонган*'
  ],
  'Гарант': [
    'пакет*', 'milka*', 'kitkat*', 'kit kat*', 'кофе*', 'mehmet*', 'эфенди*',
    'вода*', 'cola*', 'кола*', 'энергетик*', 'напиток*', 'шоколад*'
  ]
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

function fruktodarCanonicalVoiceColor(value = '') {
  const text = normalize(value);
  if (text.startsWith('красн')) return 'red';
  if (text.startsWith('зелен') || text.startsWith('зелён')) return 'green';
  if (text.startsWith('желт') || text.startsWith('жёлт')) return 'yellow';
  return null;
}

function fruktodarVoiceMarker(color) {
  return `__fruktodar_${color}__`;
}

function fruktodarSplitVoiceLine(line) {
  const source = line.replace(/\s+/g, ' ').trim();
  if (!source) return [];

  const colorRegex = /\b(?:это|эта|ето)\s+(красн(?:ый|ая|ое|ым|ого)|зел[её]н(?:ый|ая|ое|ым|ого)|ж[её]лт(?:ый|ая|ое|ым|ого))\b/gi;
  const result = [];
  let cursor = 0;
  let match;

  while ((match = colorRegex.exec(source)) !== null) {
    const itemText = fruktodarCleanNote(source.slice(cursor, match.index));
    const color = fruktodarCanonicalVoiceColor(match[1]);
    if (itemText && color) result.push(`${fruktodarVoiceMarker(color)} ${itemText}`);
    cursor = colorRegex.lastIndex;
  }

  const tail = fruktodarCleanNote(source.slice(cursor));
  if (result.length) {
    if (tail) {
      const tailParts = tail.split(/\s+(?:это|эта|ето)\s+/i).map(fruktodarCleanNote).filter(Boolean);
      result.push(...tailParts);
    }
    return result;
  }

  const bareParts = source
    .split(/\s+(?:это|эта|ето)\s+/i)
    .map(fruktodarCleanNote)
    .filter(Boolean);

  return bareParts.length > 1 ? bareParts : [source];
}

function fruktodarPrepareVoiceLines(raw) {
  const normalizedRaw = raw
    .replace(/\r/g, '\n')
    .replace(/[•▪◦]/g, '\n')
    .replace(/([.!?])\s+(?=[А-ЯA-ZЁ])/g, '$1\n');

  const lines = [];
  for (const rawLine of normalizedRaw.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    lines.push(...fruktodarSplitVoiceLine(line));
  }
  return lines;
}

function fruktodarMarkerColor(text = '') {
  const sentinel = text.match(/__fruktodar_(red|green|yellow)__/i);
  if (sentinel) return sentinel[1].toLowerCase();

  const trimmed = text.trim();
  if (trimmed.startsWith('🔴')) return 'red';
  if (trimmed.startsWith('🟢')) return 'green';
  if (trimmed.startsWith('🟡')) return 'yellow';

  const leading = normalize(trimmed).match(/^(красн\w*|зел[её]н\w*|ж[её]лт\w*)\b/);
  return leading ? fruktodarCanonicalVoiceColor(leading[1]) : null;
}

function fruktodarRemoveColorMarker(text = '') {
  return text
    .replace(/__fruktodar_(?:red|green|yellow)__/ig, ' ')
    .replace(/^\s*[🔴🟢🟡]\s*/, '')
    .replace(/^\s*(?:красн(?:ый|ая|ое)|зел[её]н(?:ый|ая|ое)|ж[её]лт(?:ый|ая|ое))(?:\s+кружок)?\s*[:—–-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
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
    /\b(один|одна|одно|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять|пол|половина)\s+(ящик\w*|коробк\w*|мешк\w*|лукошк\w*|связк\w*|штук\w*|килограмм\w*|упаковк\w*|пакет\w*)\b/i
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

  const lines = fruktodarPrepareVoiceLines(raw);

  for (const sourceLine of lines) {
    let line = sourceLine;
    const explicitSupplier = detectSupplier(line, supplierAliases);
    if (explicitSupplier) {
      currentSupplier = explicitSupplier;
      currentColor = null;
      line = removeSupplierWords(line, supplierAliases);
    }

    const lineMarkerColor = fruktodarMarkerColor(line);
    if (lineMarkerColor) {
      currentColor = lineMarkerColor;
      line = fruktodarRemoveColorMarker(line);
    }

    const segments = splitProductSegments(line);
    for (let segment of segments) {
      segment = segment.replace(/^[:;,\-–—\s]+|[:;,\-–—\s]+$/g, '').trim();
      if (!segment || isOnlyContext(segment, supplierAliases)) continue;

      const explicitItemColor = fruktodarMarkerColor(segment) || lineMarkerColor;
      const explicitSegmentSupplier = detectSupplier(segment, supplierAliases);
      segment = removeSupplierWords(fruktodarRemoveColorMarker(segment), supplierAliases).trim();

      const extracted = extractProductDetails(segment);
      if (!extracted.name || extracted.name.length < 2) continue;

      const rememberedSupplier = findRememberedSupplier(extracted.name);
      const defaultSupplier = fruktodarDefaultSupplier(extracted.name);
      const colorSupplier = explicitItemColor ? FRUKTODAR_COLOR_TO_SUPPLIER[explicitItemColor] : null;
      const supplier = explicitSegmentSupplier
        || colorSupplier
        || (currentSupplier !== 'Не распределено' ? currentSupplier : null)
        || rememberedSupplier
        || defaultSupplier
        || 'Не распределено';
      const itemColor = explicitItemColor
        || currentColor
        || fruktodarColorForSupplier(supplier)
        || defaultColor;

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
