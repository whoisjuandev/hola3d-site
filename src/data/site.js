// Facts about the business, used by pages and structured data. Only what the owner has confirmed.
// The site's address: canonical links, the sitemap and structured data are built from it.
export const SITE_URL = process.env.SITE_URL || 'https://hola3d.com.ar';

export const BUSINESS = {
  name: 'Hola3D',
  tagline: 'Impresión 3D a pedido. Capa por capa.',
  city: 'Eldorado',
  province: 'Misiones',
  country: 'AR',
  shipping: 'Envíos a todo el país',
  phone: '+5493751608690',
  email: 'hola@hola3d.com.ar',
  legalName: 'Juan Cruz Lescano',
  taxId: '20-42139781-4',
};
export const PLACE = `${BUSINESS.city}, ${BUSINESS.province}`;

// Order terms the owner confirmed. Shipping is quoted per order over WhatsApp, so there is no fixed rate.
export const ORDERS = {
  makingDays: {min: 1, max: 5},
  shipWithinDays: 10,
  withdrawalDays: 10,
};

export const POLICIES = [
  {href: '/envios/', label: 'Envíos'},
  {href: '/devoluciones/', label: 'Cambios y devoluciones'},
  {href: '/privacidad/', label: 'Privacidad'},
  {href: '/terminos/', label: 'Términos y condiciones'},
];

// National consumer-protection complaint form (Ley 24.240), linked from every page.
export const CONSUMER_COMPLAINTS = 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario';

// The return policy, shared by the business and every offer in structured data.
export function returnPolicy(site) {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'AR',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: ORDERS.withdrawalDays,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
    merchantReturnLink: new URL('/devoluciones/', site).href,
  };
}
