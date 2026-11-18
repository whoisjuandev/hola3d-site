// A plain-text summary of the business and its catalogue for AI assistants (llms.txt convention).
import {CHRISTMAS, PRODUCTS, formatPrice, pieceUrl} from '../data/catalog.js';
import {BUSINESS, PLACE} from '../data/site.js';

export function GET({site}) {
  const lines = [
    `# ${BUSINESS.name}`,
    '',
    `> Impresión 3D a pedido en ${PLACE}, Argentina. ${BUSINESS.shipping}. Los pedidos se hacen por WhatsApp.`,
    '',
    'Cada pieza se hace a pedido a partir de una foto, un dibujo o una medida. El proceso es: idea, modelo 3D, impresión y entrega.',
    'Las piezas a medida se cotizan por WhatsApp. Las piezas del catálogo navideño tienen precio fijo en pesos argentinos.',
    '',
    '## Catálogo navideño 2026',
    ...CHRISTMAS.flatMap((group) => ['', `### ${group.group}`, ...group.items.map((item) => `- [${item.name}](${new URL(pieceUrl(item), site).href}): ${formatPrice(item.price)}${item.unit ? ` ${item.unit}` : ''}, ${item.size}.${item.blurb ? ` ${item.blurb}` : ''}${item.variants ? ` Modelos: ${item.variants.join(', ')}.` : ''}`)]),
    '',
    '## Piezas a medida (se cotizan por WhatsApp)',
    ...PRODUCTS.map((p) => `- ${p.name}: ${p.blurb}`),
    '',
    '## Contacto',
    `- WhatsApp: ${BUSINESS.phone}`,
    `- Sitio: ${site.href}`,
  ];
  return new Response(lines.join('\n') + '\n', {headers: {'Content-Type': 'text/plain; charset=utf-8'}});
}
