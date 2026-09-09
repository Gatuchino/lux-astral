// Catálogo de merchandising Lux Astral. Los precios de acá son el default
// de fábrica; Setup puede sobreescribirlos sin tocar código (localStorage,
// clave MERCH_PRICES_KEY) porque los precios cambian con el tiempo.
window.MERCH_ITEMS = [
  {
    key: 'tarot-deck',
    name_es: 'Mazo de Tarot Lux Astral',
    name_en: 'Lux Astral Tarot Deck',
    desc_es: 'Las 78 cartas con la caja y la bolsa de terciopelo a juego.',
    desc_en: 'All 78 cards with the matching box and velvet pouch.',
    price: 32,
  },
  {
    key: 'tote-bag',
    name_es: 'Bolsa tote',
    name_en: 'Tote bag',
    desc_es: 'Bolsa de tela cruda con el logo estampado.',
    desc_en: 'Raw canvas tote bag with the logo printed.',
    price: 14,
  },
  {
    key: 'mug',
    name_es: 'Taza',
    name_en: 'Mug',
    desc_es: 'Taza de cerámica azul noche con detalle dorado.',
    desc_en: 'Night-blue ceramic mug with a gold detail.',
    price: 12,
  },
  {
    key: 'bottle',
    name_es: 'Botella térmica',
    name_en: 'Insulated bottle',
    desc_es: 'Botella de acero inoxidable con tapa dorada.',
    desc_en: 'Stainless steel bottle with a gold cap.',
    price: 18,
  },
  {
    key: 'hoodie',
    name_es: 'Polerón con capucha',
    name_en: 'Hoodie',
    desc_es: 'Polerón azul noche con el logo estampado.',
    desc_en: 'Night-blue hoodie with the logo printed.',
    price: 38,
  },
  {
    key: 'journal',
    name_es: 'Libreta + lápiz',
    name_en: 'Journal + pen',
    desc_es: 'Libreta con elástico y lápiz a juego, ideal para anotar tus lecturas.',
    desc_en: 'Elastic-band journal with a matching pen, perfect for logging your readings.',
    price: 16,
  },
  {
    key: 'keychain',
    name_es: 'Llavero',
    name_en: 'Keychain',
    desc_es: 'Llavero metálico con el medallón de Lux Astral.',
    desc_en: 'Metal keychain with the Lux Astral medallion.',
    price: 8,
  },
];

window.MERCH_PRICES_KEY = 'arcana_setup_merch_prices';

// Devuelve MERCH_ITEMS con los precios sobreescritos desde Setup (si hay).
window.getMerchItems = function () {
  var overrides = {};
  try {
    overrides = JSON.parse(localStorage.getItem(window.MERCH_PRICES_KEY) || '{}');
  } catch (e) {}
  return window.MERCH_ITEMS.map(function (item) {
    var p = overrides[item.key];
    var price = (typeof p === 'number' && !isNaN(p)) ? p : item.price;
    return Object.assign({}, item, { price: price });
  });
};

// Zonas de envío + tarifa plana por zona. Igual que los precios de
// productos, son un default editable desde Setup (localStorage,
// SHIPPING_PRICES_KEY) — Christian los confirma con su courier real.
window.SHIPPING_ZONES = [
  {
    key: 'chile',
    name_es: 'Chile (envío nacional)',
    name_en: 'Chile (domestic)',
    price: 6,
  },
  {
    key: 'south-america',
    name_es: 'Sudamérica',
    name_en: 'South America',
    price: 18,
  },
  {
    key: 'worldwide',
    name_es: 'Resto del mundo',
    name_en: 'Rest of the world',
    price: 30,
  },
];

window.SHIPPING_PRICES_KEY = 'arcana_setup_shipping_prices';

// Devuelve SHIPPING_ZONES con las tarifas sobreescritas desde Setup (si hay).
window.getShippingZones = function () {
  var overrides = {};
  try {
    overrides = JSON.parse(localStorage.getItem(window.SHIPPING_PRICES_KEY) || '{}');
  } catch (e) {}
  return window.SHIPPING_ZONES.map(function (zone) {
    var p = overrides[zone.key];
    var price = (typeof p === 'number' && !isNaN(p)) ? p : zone.price;
    return Object.assign({}, zone, { price: price });
  });
};
