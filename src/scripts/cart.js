// The order: a small list kept in this browser, rendered on the hang tag, and turned into one
// WhatsApp message.
import {WHATSAPP, colorById, productById, formatPrice} from '../data/catalog.js';

const KEY = 'hola3d-pedido-v1';
const MAX_QTY = 99;
const UNDO_MS = 7000;

const ICON_MINUS = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
const ICON_PLUS = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
const ICON_REMOVE = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const pieces = (n) => (n === 1 ? '1 pieza' : `${n} piezas`);

export const whatsappLink = (text = 'Hola Hola3D. Quiero hacer una consulta.') => `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(text)}`;

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && Array.isArray(data.items)) return {name: '', note: '', ...data};
  } catch {
    // Private mode or blocked storage: the order simply lives for this visit.
  }
  return {items: [], name: '', note: ''};
}

const sameItem = (a, b) => a.productId === b.productId && a.color === b.color && a.text === b.text && a.note === b.note;
const save = (order) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // Nothing to do: see load().
  }
};

// For pages without the order tag (a piece's own page): add to the stored order and report its size.
export function addStored(item) {
  const order = load();
  const same = order.items.find((i) => sameItem(i, item));
  if (same) same.qty = Math.min(MAX_QTY, same.qty + item.qty);
  else order.items.push(item);
  save(order);
  return storedCount();
}
export const storedCount = () => load().items.filter((i) => productById(i.productId)).reduce((n, i) => n + i.qty, 0);

export function createOrder({root, onChange = () => {}}) {
  const order = load();
  // Drop anything saved for a product that no longer exists in the catalogue.
  order.items = order.items.filter((i) => productById(i.productId));

  const $ = (selector) => root.querySelector(selector);
  const list = $('[data-items]');
  const empty = $('[data-empty]');
  const filled = $('[data-filled]');
  const preview = $('[data-preview]');
  const send = $('[data-send]');
  const sent = $('[data-sent]');
  const totalLine = $('[data-total]');
  const undoLine = $('[data-undo]');
  const undoButton = $('[data-undo-button]');
  const nameInput = $('#o-name');
  const noteInput = $('#o-note');
  nameInput.value = order.name;
  noteInput.value = order.note;

  // The last removed row, kept for a few seconds so a slip of the thumb can be taken back.
  let undo = null;
  let undoTimer = 0;

  const total = () => order.items.reduce((n, i) => n + i.qty, 0);
  // Catalogue pieces have a price; made-to-measure ones are quoted in the chat.
  const totals = () => order.items.reduce((t, i) => {
    const price = productById(i.productId).price;
    if (price) t.priced += price * i.qty; else t.quoted += i.qty;
    return t;
  }, {priced: 0, quoted: 0});
  const describe = (item) => {
    const parts = [];
    const color = colorById(item.color);
    if (color) parts.push(color.name);
    if (item.text) parts.push(`"${item.text}"`);
    if (item.note) parts.push(item.note);
    return parts.join(' · ');
  };

  function message() {
    const name = order.name.trim();
    const lines = [name ? `Hola Hola3D, soy ${name}. Quiero hacer este pedido:` : 'Hola Hola3D. Quiero hacer este pedido:', ''];
    order.items.forEach((item, i) => {
      const product = productById(item.productId);
      const color = colorById(item.color);
      lines.push(`${i + 1}. ${product.name} x ${item.qty}` + (product.price ? ` (${formatPrice(product.price)} c/u)` : ' (a cotizar)'));
      if (color) lines.push(`   Color: ${color.name}`);
      if (item.text) lines.push(`   ${product.variants ? 'Modelo' : 'Texto'}: ${item.text}`);
      if (item.note) lines.push(`   Detalle: ${item.note}`);
    });
    const {priced, quoted} = totals();
    if (priced) lines.push('', `Total de las piezas con precio: ${formatPrice(priced)}`);
    if (priced && quoted) lines.push('Las piezas a medida quedan a cotizar.');
    const note = order.note.trim();
    if (note) lines.push('', `Comentarios: ${note}`);
    return lines.join('\n');
  }

  function render() {
    const count = total();
    empty.hidden = count > 0 || Boolean(undo);
    list.hidden = count === 0;
    filled.hidden = count === 0;
    if (count === 0) sent.hidden = true;
    list.innerHTML = order.items
      .map((item, i) => {
        const product = productById(item.productId);
        const detail = describe(item);
        return `<li data-index="${i}">
  <div class="item-text"><b>${escapeHtml(product.name)}</b>${detail ? `<span>${escapeHtml(detail)}</span>` : ''}</div>
  <div class="stepper stepper-small" role="group" aria-label="Cantidad de ${escapeHtml(product.name)}">
    <button type="button" data-step="-1" aria-label="Una menos"${item.qty === 1 ? ' disabled' : ''}>${ICON_MINUS}</button>
    <output>${item.qty}</output>
    <button type="button" data-step="1" aria-label="Una más"${item.qty === MAX_QTY ? ' disabled' : ''}>${ICON_PLUS}</button>
  </div>
  <span class="item-price">${product.price ? formatPrice(product.price * item.qty) : 'A cotizar'}</span>
  <button type="button" class="item-remove" data-remove aria-label="Quitar ${escapeHtml(product.name)} del pedido">${ICON_REMOVE}</button>
</li>`;
      })
      .join('');
    const {priced, quoted} = totals();
    totalLine.hidden = !priced;
    totalLine.innerHTML = `<span>Total${quoted ? ' sin las piezas a cotizar' : ''}</span><b>${formatPrice(priced)}</b>`;
    undoLine.hidden = !undo;
    if (undo) $('[data-undo-text]').textContent = `Se quitó ${productById(undo.item.productId).name}.`;
    const text = count ? message() : '';
    preview.textContent = text;
    send.href = count ? whatsappLink(text) : '#productos';
    save(order);
    onChange({count, label: pieces(count), href: count ? send.href : null});
  }

  const forget = () => {
    clearTimeout(undoTimer);
    undo = null;
  };

  list.addEventListener('click', (e) => {
    const row = e.target.closest('li[data-index]');
    if (!row) return;
    const index = Number(row.dataset.index);
    const step = e.target.closest('[data-step]');
    if (step) {
      const item = order.items[index];
      item.qty = Math.min(MAX_QTY, Math.max(1, item.qty + Number(step.dataset.step)));
      render();
      // Keep the keyboard where it was after the list is redrawn; a button that just hit its limit
      // is disabled, so hand focus to its neighbour.
      const again = list.querySelector(`li[data-index="${index}"] [data-step="${step.dataset.step}"]`);
      (again.disabled ? list.querySelector(`li[data-index="${index}"] [data-step="${-Number(step.dataset.step)}"]`) : again).focus();
    } else if (e.target.closest('[data-remove]')) {
      forget();
      undo = {item: order.items.splice(index, 1)[0], index};
      undoTimer = setTimeout(() => { undo = null; render(); }, UNDO_MS);
      render();
      undoButton.focus();
    }
  });
  undoButton.addEventListener('click', () => {
    if (!undo) return;
    const index = Math.min(undo.index, order.items.length);
    order.items.splice(index, 0, undo.item);
    forget();
    render();
    list.querySelector(`li[data-index="${index}"] [data-remove]`).focus();
  });
  nameInput.addEventListener('input', () => { order.name = nameInput.value; render(); });
  noteInput.addEventListener('input', () => { order.note = noteInput.value; render(); });
  // WhatsApp opens in another tab; when the visitor comes back, offer to start over.
  send.addEventListener('click', () => (sent.hidden = false));
  $('[data-clear]').addEventListener('click', () => {
    order.items = [];
    forget();
    render();
  });

  render();

  return {
    add({productId, color, text, note, qty}) {
      forget();
      sent.hidden = true;
      const same = order.items.find((i) => sameItem(i, {productId, color, text, note}));
      if (same) same.qty = Math.min(MAX_QTY, same.qty + qty);
      else order.items.push({productId, color, text, note, qty});
      render();
    },
    get count() {
      return total();
    },
  };
}
