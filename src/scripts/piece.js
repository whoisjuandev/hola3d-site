// A piece's own page: add it to the stored order, keep the nav counter and the WhatsApp links current.
import {productById} from '../data/catalog.js';
import {addStored, storedCount, whatsappLink} from './cart.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const live = $('[data-live]');

function showCount() {
  const count = storedCount();
  $$('[data-count]').forEach((el) => { el.textContent = count; el.hidden = count === 0; });
  $('[data-nav-order]').href = count ? '/#pedido' : '/#productos';
  $('[data-nav-label]').textContent = count ? 'Pedido' : 'Armar pedido';
}
showCount();
$('[data-whatsapp-plain]').href = whatsappLink();

// The chosen design travels in the WhatsApp message of the main button.
const main = $('[data-piece-whatsapp]');
const variant = $('#piece-variant');
variant?.addEventListener('change', () => (main.href = whatsappLink(`${main.dataset.message} Modelo: ${variant.value}.`)));
if (variant) main.href = whatsappLink(`${main.dataset.message} Modelo: ${variant.value}.`);

document.addEventListener('click', (e) => {
  const button = e.target.closest('[data-piece-add], [data-xmas-add]');
  if (!button) return;
  const product = productById(button.dataset.pieceAdd || button.dataset.xmasAdd);
  const scope = button.closest('.xmas-card, .piece-info');
  const count = addStored({productId: product.id, color: null, text: $('[data-variant]', scope)?.value || '', note: '', qty: 1});
  showCount();
  live.textContent = `${product.name} sumado al pedido. ${count === 1 ? 'Hay 1 pieza' : `Hay ${count} piezas`}.`;
  const added = $('[data-piece-added]');
  if (button.dataset.pieceAdd) added.hidden = false;
  // The button says so itself for a moment, then goes back to work: adding again adds one more.
  const label = $('span', button);
  const idle = button.dataset.idle || (button.dataset.idle = label.textContent);
  clearTimeout(button.swapBack);
  label.textContent = 'Sumado';
  button.classList.add('is-added');
  button.swapBack = setTimeout(() => { label.textContent = idle; button.classList.remove('is-added'); }, 1600);
});
