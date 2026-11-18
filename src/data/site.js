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
};
export const PLACE = `${BUSINESS.city}, ${BUSINESS.province}`;
