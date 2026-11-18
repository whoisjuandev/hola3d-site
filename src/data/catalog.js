// Hola3D catalogue and contact data.
//
// SAMPLE CATALOGUE: these products are placeholders agreed with the owner. Replace them with the real
// ones before publishing. There are no prices on purpose: the order is a quote request sent by WhatsApp.
//
// To add a product, copy one entry and change it:
//   id      unique, no spaces
//   name    full name, shown in the order and in the WhatsApp message
//   short   one word for the selector
//   blurb   one sentence under the name
//   model   which 3D model to show: keyring | ornament | sign | vase | gear | idea
//   color   id of the default colour (see COLORS), or null when the piece has no colour choice
//   text    optional personalised text: {label, sample, max}. `sample` is what the 3D piece shows
//           until the visitor types; it is never added to an order.
//   note    optional free description: {label, placeholder}

// WhatsApp wants the number in international format without "+", and Argentine mobiles take a 9 after
// the country code and drop the 0 of the area code: 03751 60-8690 becomes 54 9 3751 608690.
export const WHATSAPP = {
  number: '5493751608690',
  display: '03751 60-8690',
};

export const COLORS = [
  {id: 'amarillo', name: 'Amarillo', hex: '#FFC42E'},
  {id: 'rojo', name: 'Rojo', hex: '#E63B2E'},
  {id: 'azul', name: 'Azul', hex: '#2B4FD1'},
  {id: 'blanco', name: 'Blanco', hex: '#FFFFFF'},
  {id: 'tinta', name: 'Azul oscuro', hex: '#1A2A6C'},
];

export const PRODUCTS = [
  {
    id: 'llavero',
    name: 'Llavero con nombre',
    short: 'Llavero',
    blurb: 'Una placa con el nombre en relieve y su argolla.',
    model: 'keyring',
    color: 'rojo',
    text: {label: 'Nombre en la pieza', sample: 'Hola', max: 10},
  },
  {
    id: 'adorno',
    name: 'Adorno de arbolito',
    short: 'Adorno',
    blurb: 'Para colgar del árbol, con el nombre de quien lo recibe.',
    model: 'ornament',
    color: 'azul',
    text: {label: 'Nombre en la pieza', sample: 'Silvia', max: 10},
  },
  {
    id: 'cartel',
    name: 'Cartel de escritorio',
    short: 'Cartel',
    blurb: 'Un nombre o una palabra, de pie sobre su base.',
    model: 'sign',
    color: 'azul',
    text: {label: 'Palabra en la pieza', sample: 'Hola', max: 8},
  },
  {
    id: 'maceta',
    name: 'Maceta espiral',
    short: 'Maceta',
    blurb: 'Una maceta chica con las capas a la vista.',
    model: 'vase',
    color: 'amarillo',
  },
  {
    id: 'idea',
    name: 'Otra idea',
    short: 'Tu idea',
    blurb: 'Una foto, un dibujo o una medida alcanzan para empezar.',
    model: 'idea',
    color: null,
    note: {label: '¿Cuál es la idea?', placeholder: 'Un soporte para el celular con forma de gato'},
  },
];

// Christmas catalogue 2026: names, prices and sizes exactly as in the owner's printed catalogue
// ("Catálogo navideño 3D"). Photos are cropped from it and live in assets/navidad/.
//   price     pesos, as a number; shown as $8.000
//   unit      optional, e.g. "c/u"
//   variants  optional designs the buyer picks from
export const CHRISTMAS = [
  {
    group: 'Pesebres',
    items: [
      {id: 'nav-pesebre-love', name: 'Pesebre Love', price: 8000, size: '15 cm', image: 'pesebre-love', alt: 'La palabra love en blanco con la Sagrada Familia entre las letras'},
      {id: 'nav-pesebre-colorear', name: 'Pesebre para colorear', price: 23000, size: '25 x 16 cm', image: 'pesebre-colorear', alt: 'Pesebre con figuras blancas para pintar bajo un techo rojo con estrella'},
      {id: 'nav-pesebre', name: 'Pesebre', price: 8000, size: '8,5 cm', blurb: 'Diseño minimalista y moderno.', image: 'pesebre', alt: 'José y María con el niño, en una sola pieza de líneas simples'},
      {id: 'nav-pesebre-minimalista', name: 'Pesebre minimalista', price: 14500, size: '10 cm', image: 'pesebre-minimalista', alt: 'María, José y el niño en un establo blanco con una estrella en el techo'},
    ],
  },
  {
    group: 'Para la mesa',
    items: [
      {id: 'nav-servilletero', name: 'Servilletero navideño', price: 5200, unit: 'c/u', size: '10 cm', blurb: 'Consultar colores disponibles.', variants: ['Papá Noel', 'Reno', 'Muñeco de jengibre', 'Muñeco de nieve'], image: 'servilleteros', alt: 'Cuatro servilleteros con siluetas de Papá Noel, reno, muñeco de jengibre y muñeco de nieve'},
      {id: 'nav-servilletero-casa', name: 'Servilletero casa de jengibre', price: 9000, size: '10 cm', image: 'servilletero-casa', alt: 'Servilletero con forma de casita de jengibre'},
      {id: 'nav-bandeja', name: 'Bandeja navideña', price: 9500, size: '21 x 10 cm', image: 'bandeja', alt: 'Bandeja blanca con pinos, una casita y regalos en el borde'},
      {id: 'nav-bandejas-pino', name: 'Set de bandejas navideñas', price: 15000, size: '10 cm', blurb: 'Bandejitas apilables con forma de pino.', image: 'bandejas-pino', alt: 'Seis bandejitas rojas y verdes con forma de pino, armadas en círculo'},
      {id: 'nav-soporte', name: 'Soporte para dulces y velas', price: 7100, size: '12,5 cm', image: 'soporte', alt: 'Soporte verde con forma de arbolito lleno de bombones'},
    ],
  },
  {
    group: 'Para el árbol',
    items: [
      {id: 'nav-jengibre', name: 'Set muñecos de jengibre x6', price: 10000, size: '9,5 cm', image: 'jengibre', alt: 'Seis adornos con forma de muñecos de jengibre'},
      {id: 'nav-adornos-9', name: 'Set adornos navideños x9', price: 7400, size: '8 cm', image: 'adornos-9', alt: 'Nueve adornos redondos calados colgados de un árbol'},
      {id: 'nav-adornos-8', name: 'Set adornos navideños x8', price: 4600, size: '6,8 cm', image: 'adornos-8', alt: 'Ocho adornos blancos calados: regalo, corazón, campanas, vela y ángel'},
    ],
  },
];

// Each Christmas piece has its own page: /navidad/<slug>/.
export const christmasItems = () => CHRISTMAS.flatMap((g) => g.items.map((item) => ({...item, group: g.group, slug: item.id.replace(/^nav-/, '')})));
export const pieceUrl = (item) => `/navidad/${item.id.replace(/^nav-/, '')}/`;

const ALL = [...PRODUCTS, ...CHRISTMAS.flatMap((g) => g.items)];
export const colorById = (id) => COLORS.find((c) => c.id === id) || null;
export const productById = (id) => ALL.find((p) => p.id === id) || null;
export const formatPrice = (pesos) => '$' + String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
