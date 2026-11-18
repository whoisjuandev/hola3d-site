// Page behaviour: product configurator, order, and the scroll choreography.
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {SplitText} from 'gsap/SplitText';
import {PRODUCTS, colorById, productById} from '../data/catalog.js';
import {createOrder, whatsappLink} from './cart.js';
import {GLYPHS} from './glyphs.js';

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const animated = !reducedMotion;
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

// ---- 3D stage ----------------------------------------------------------------------------------
// Animations write these three objects; the 3D scene reads them every frame. They exist before the
// scene does, so the text never waits for three.js to download.
const state = {solid: 1, wire: 0, mono: 0, clip: 1, bed: 0, spin: 0, hop: 0}; // the letter cube
const floatIn = {value: animated ? 0 : 1}; // hero pieces popping in
const view = {scale: 1}; // product viewer

// The page works without WebGL: the cube falls back to the flat logo and the viewer says so.
let stage = null;
import('./scene.js')
  .then(({createStage}) => {
    stage = createStage($('#stage'), {reducedMotion, state, floatIn, view});
    showModel();
    let last = performance.now();
    const loop = (now) => {
      if (!document.hidden) stage.frame((now - last) / 1000);
      last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // First thing the visitor sees: the cube printing itself, then the pieces arriving.
    if (animated && window.scrollY < window.innerHeight * 0.5) {
      gsap.timeline()
        .fromTo(state, {clip: 0}, {clip: 1, duration: 2.3, ease: 'none'})
        .fromTo(state, {hop: 0}, {hop: 1, duration: 0.55, ease: 'none'})
        .set(state, {hop: 0})
        .to(floatIn, {value: 1, duration: 1.6, ease: 'none'}, 1);
    } else {
      floatIn.value = 1;
    }
  })
  .catch((error) => {
    console.warn('Hola3D: 3D scene unavailable.', error);
    root.classList.add('no-webgl');
  });

// ---- Order -------------------------------------------------------------------------------------
const live = $('[data-live]');
const bar = $('[data-bar]');
const tag = $('[data-tag]');
const navOrder = $('[data-nav-order]');
let tagVisible = false;
let shopVisible = false;
// The bar is a shortcut to the order while browsing pieces; anywhere else the nav counter is enough.
const updateBar = (count) => (bar.hidden = count === 0 || tagVisible || !shopVisible);

$('[data-whatsapp-plain]').href = whatsappLink();

const order = createOrder({
  root: $('#pedido'),
  onChange({count, label, href}) {
    $$('[data-count]').forEach((el) => { el.textContent = count; el.hidden = count === 0; });
    $('[data-count-label]').textContent = label;
    // With nothing in the order, the nav leads to the pieces; with something, to the order.
    navOrder.href = count ? '#pedido' : '#productos';
    $('[data-nav-label]').textContent = count ? 'Pedido' : 'Armar pedido';
    // Every WhatsApp button carries the order once there is one, so it is never left behind.
    $$('[data-whatsapp]').forEach((a) => (a.href = href || whatsappLink()));
    $$('[data-whatsapp-label]').forEach((el) => (el.textContent = count ? `Enviar mi pedido (${label})` : 'Escribir por WhatsApp'));
    updateBar(count);
  },
});
new IntersectionObserver(([entry]) => {
  tagVisible = entry.isIntersecting;
  updateBar(order.count);
}, {threshold: 0.15}).observe(tag);
// Either catalogue counts as "browsing pieces".
const browsing = new Set();
const watch = new IntersectionObserver((entries) => {
  for (const entry of entries) browsing[entry.isIntersecting ? 'add' : 'delete'](entry.target);
  shopVisible = browsing.size > 0;
  updateBar(order.count);
}, {rootMargin: '-35% 0px -35% 0px'});
watch.observe($('#productos'));
watch.observe($('#navidad'));

// ---- Christmas catalogue -----------------------------------------------------------------------
// The cards are already in the page (rendered at build time); this only wires their buttons.
const xmasList = $('[data-xmas-list]');

xmasList.addEventListener('click', (e) => {
  const button = e.target.closest('[data-xmas-add]');
  if (!button) return;
  const card = button.closest('.xmas-card');
  const product = productById(button.dataset.xmasAdd);
  order.add({productId: product.id, color: null, text: $('[data-variant]', card)?.value || '', note: '', qty: 1});
  live.textContent = `${product.name} sumado al pedido. ${order.count === 1 ? 'Hay 1 pieza' : `Hay ${order.count} piezas`}.`;
  // The button says so itself for a moment, then goes back to work: adding again adds one more.
  const label = $('span', button);
  const swap = (text, added) => {
    button.classList.add('is-swapping');
    setTimeout(() => {
      label.textContent = text;
      button.classList.toggle('is-added', added);
      button.classList.remove('is-swapping');
    }, 150);
  };
  clearTimeout(button.swapBack);
  swap('Sumado', true);
  button.swapBack = setTimeout(() => swap('Sumar', false), 1600);
  celebrate('#E63B2E', $('img', card));
});

// ---- Configurator ------------------------------------------------------------------------------
const form = $('#config');
const tabs = $('[data-tabs]');
const slot = $('[data-model-slot]');
const textInput = $('#f-text');
const textNote = $('[data-text-note]');
const noteInput = $('#f-note');
const drafts = new Map(PRODUCTS.map((p) => [p.id, {color: p.color, text: '', note: '', qty: 1}]));
let current = PRODUCTS[0];
const draft = () => drafts.get(current.id);

// Until the visitor types, the piece shows the catalogue's sample text.
function showModel() {
  const d = draft();
  stage?.setProduct(current.model, {color: colorById(d.color)?.hex, text: d.text.trim() || current.text?.sample || ''});
}
const pop = (from, ease, duration) => animated && gsap.fromTo(view, {scale: from}, {scale: 1, duration, ease});

const say = (text) => {
  textNote.textContent = text;
  textNote.hidden = !text;
};
// The 3D letters only know the characters in the font file; the order keeps whatever was typed.
const drawable = (text) => [...text].every((ch) => GLYPHS[ch] || GLYPHS[ch.toUpperCase()]);
function updateText() {
  $('[data-text-count]').textContent = `${textInput.value.length}/${current.text.max}`;
  say(drawable(textInput.value) ? '' : 'Algunos caracteres no se ven en la vista 3D, pero van en el pedido tal como están escritos.');
}

function selectProduct(id, {announce = false} = {}) {
  current = productById(id) || PRODUCTS[0];
  const d = draft();
  $$('button', tabs).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.product === current.id)));
  $('[data-product-name]').textContent = current.name;
  $('[data-product-blurb]').textContent = current.blurb;
  slot.setAttribute('aria-label', `Vista 3D de ${current.name}. Se gira arrastrando o con las flechas izquierda y derecha.`);

  $('[data-field="text"]').hidden = !current.text;
  say('');
  if (current.text) {
    $('[data-text-label]').textContent = current.text.label;
    textInput.placeholder = current.text.sample;
    textInput.maxLength = current.text.max;
    textInput.value = d.text;
    updateText();
  }
  $('[data-field="color"]').hidden = !current.color;
  if (current.color) {
    $$('input[name="color"]', form).forEach((input) => (input.checked = input.value === d.color));
    $('[data-color-name]').textContent = colorById(d.color).name;
  }
  $('[data-field="note"]').hidden = !current.note;
  if (current.note) {
    $('[data-note-label]').textContent = current.note.label;
    noteInput.placeholder = current.note.placeholder;
    noteInput.value = d.note;
  }
  $('[data-qty-value]').textContent = d.qty;
  showModel();
  pop(0.9, 'power3.out', 0.3);
  if (announce) live.textContent = `${current.name} seleccionado.`;
}

tabs.addEventListener('click', (e) => {
  const button = e.target.closest('[data-product]');
  if (button) selectProduct(button.dataset.product, {announce: true});
});

// Typing rebuilds the raised letters on the piece. A short wait keeps fast typing smooth.
let rebuild = 0;
textInput.addEventListener('input', () => {
  draft().text = textInput.value;
  updateText();
  clearTimeout(rebuild);
  rebuild = setTimeout(showModel, 90);
});
noteInput.addEventListener('input', () => (draft().note = noteInput.value));
form.addEventListener('change', (e) => {
  if (e.target.name !== 'color') return;
  draft().color = e.target.value;
  $('[data-color-name]').textContent = colorById(e.target.value).name;
  showModel();
  pop(0.96, 'power3.out', 0.2);
});
form.addEventListener('click', (e) => {
  const step = e.target.closest('[data-qty]');
  if (!step) return;
  draft().qty = Math.min(99, Math.max(1, draft().qty + Number(step.dataset.qty)));
  $('[data-qty-value]').textContent = draft().qty;
});
slot.addEventListener('pointerdown', () => slot.classList.add('was-turned'), {once: true});
slot.addEventListener('keydown', () => slot.classList.add('was-turned'), {once: true});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = draft();
  // A personalised piece without its text would be the wrong order: ask for it here, in place.
  if (current.text && !d.text.trim()) {
    say('Falta escribir el texto que va en la pieza.');
    textInput.focus();
    return;
  }
  const color = current.color ? colorById(d.color) : null;
  order.add({
    productId: current.id,
    color: color ? color.id : null,
    text: current.text ? d.text.trim() : '',
    note: current.note ? d.note.trim() : '',
    qty: d.qty,
  });
  live.textContent = `${current.name} sumado al pedido. ${order.count === 1 ? 'Hay 1 pieza' : `Hay ${order.count} piezas`}.`;
  d.qty = 1;
  $('[data-qty-value]').textContent = 1;
  celebrate(color ? color.hex : '#FFFFFF');
});

// The piece jumps to wherever the order is on screen: the tag if visible, otherwise the nav counter.
const TAG_TILT = -1.5;
function celebrate(colour, source = slot) {
  if (!animated) return;
  const from = source.getBoundingClientRect();
  const to = (tagVisible ? $('.tag-hole') : navOrder).getBoundingClientRect();
  const flyer = document.createElement('span');
  flyer.className = 'flyer';
  flyer.style.background = colour;
  document.body.append(flyer);
  const start = {x: from.left + from.width / 2, y: from.top + from.height / 2};
  const end = {x: to.left + to.width / 2, y: to.top + to.height / 2};
  gsap.timeline({onComplete: () => flyer.remove()})
    .fromTo(flyer, {x: start.x, y: start.y, scale: 2.2}, {x: end.x, duration: 0.6, ease: 'power1.inOut'}, 0)
    .to(flyer, {y: Math.min(start.y, end.y) - 90, duration: 0.3, ease: 'power2.out'}, 0)
    .to(flyer, {y: end.y, scale: 0.5, duration: 0.3, ease: 'power2.in'}, 0.3);
  // The tag swings from its hole, like something was just hung on it, and settles back at its tilt.
  gsap.fromTo(tag, {rotation: TAG_TILT}, {keyframes: {rotation: [TAG_TILT, -6.5, 2, -3.5, -0.5, TAG_TILT]}, duration: 1.1, delay: 0.55, ease: 'sine.inOut'});
  gsap.fromTo($$('[data-count]'), {scale: 1}, {scale: 1.45, duration: 0.18, delay: 0.55, yoyo: true, repeat: 1, ease: 'power2.out'});
  if (source === slot) pop(0.7, 'elastic.out(1, 0.5)', 0.8);
}

selectProduct(PRODUCTS[0].id);

// ---- Scroll choreography -----------------------------------------------------------------------
const steps = $$('.steps li');
const dots = $$('.progress i');
const layer = $('[data-layer]');
function showStep(index) {
  steps.forEach((li, i) => li.classList.toggle('is-active', i === index));
  dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
}
const showLayer = (clip) => (layer.textContent = String(Math.round(clip * 120)).padStart(3, '0'));

async function start() {
  await document.fonts.ready;
  window.__hola3d = true;

  if (!animated) {
    root.classList.remove('js');
    showLayer(1);
    return;
  }
  gsap.registerPlugin(ScrollTrigger, SplitText);
  // A phone's address bar hiding and showing must not re-measure the pinned section mid-scroll.
  ScrollTrigger.config({ignoreMobileResize: true});

  // Intro: the word pops in letter by letter.
  const word = $('.hero-word');
  const letters = SplitText.create(word, {type: 'chars'}).chars;
  gsap.set(['.hero-word', '.hero-copy', '.nav'], {visibility: 'visible'});
  root.classList.remove('js');
  gsap.timeline({defaults: {ease: 'expo.out'}})
    .from(letters, {yPercent: 45, scale: 0.7, rotation: () => gsap.utils.random(-22, 22), opacity: 0, duration: 0.8, ease: 'back.out(2.4)', stagger: 0.08}, 0.1)
    .from('.hero-copy > *', {y: 28, opacity: 0, duration: 0.9, stagger: 0.12}, 0.7)
    .from('.nav', {yPercent: -160, duration: 0.9}, 0.9);

  // The sky drifts sideways on its own and slides down as the hero scrolls away.
  // Transforms only: the clouds are their own layer, so nothing else in the hero is restyled.
  gsap.to('.hero-sky', {yPercent: 18, ease: 'none', scrollTrigger: {trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true}});
  gsap.to('.hero-word', {yPercent: 22, ease: 'none', scrollTrigger: {trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true}});

  // Process: the section holds still while the cube goes from idea to object.
  // The text follows the timeline itself (not the raw scroll), so words and cube never disagree.
  root.classList.add('pinned');
  const timeline = gsap.timeline({
    defaults: {ease: 'none'},
    scrollTrigger: {trigger: '.process-pin', start: 'top top', end: '+=400%', pin: true, scrub: 0.5, anticipatePin: 1},
    onUpdate() {
      const t = timeline.time();
      showStep(t < 1.05 ? 0 : t < 2.2 ? 1 : t < 3.35 ? 2 : 3);
      showLayer(t < 2.32 ? 0 : state.clip);
    },
  });
  // Scrubbed by the scroll, so these are distances, not seconds. Forms cross-fade over a real
  // stretch of scroll: one eases out as the next eases in, and the cube first arrives and rests.
  timeline
    // 1. Idea: the finished cube settles, then gives way to a dashed sketch.
    .to(state, {solid: 0, duration: 0.3, ease: 'power2.inOut'}, 0.3)
    .to(state, {wire: 1, duration: 0.3, ease: 'power3.out'}, 0.42)
    // 2. Model: a blank cube takes the sketch's place and turns once, like a model being checked.
    .to(state, {wire: 0, duration: 0.25, ease: 'power2.inOut'}, 1.0)
    .set(state, {mono: 1}, 1.08)
    .to(state, {solid: 1, duration: 0.3, ease: 'power3.out'}, 1.1)
    .to(state, {spin: Math.PI * 2, duration: 0.8, ease: 'power2.inOut'}, 1.3)
    // 3. Print: it starts again from the bed, in colour, one layer at a time.
    .to(state, {solid: 0, duration: 0.2, ease: 'power2.inOut'}, 2.1)
    .to(state, {bed: 1, duration: 0.3, ease: 'power3.out'}, 2.2)
    .set(state, {mono: 0, clip: 0, solid: 1}, 2.32)
    .to(state, {clip: 1, duration: 0.85}, 2.4)
    // 4. Yours: the bed goes away and the finished cube jumps.
    .to(state, {bed: 0, duration: 0.25, ease: 'power2.inOut'}, 3.3)
    .to(state, {hop: 1, duration: 0.4}, 3.4)
    .to(state, {spin: Math.PI * 4, duration: 0.5, ease: 'power3.out'}, 3.4)
    .set(state, {hop: 0}, 3.81)
    .to({}, {duration: 0.3}, 3.9);

  // Band: the two rows slide against each other with the scroll.
  $$('[data-band]').forEach((row) => {
    gsap.to(row, {xPercent: Number(row.dataset.band) * 16, ease: 'none', scrollTrigger: {trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: 0.4}});
  });

  // Shop: the tag drops in and settles at its tilt the first time it shows up.
  gsap.fromTo(tag, {rotation: 9, y: 70, opacity: 0}, {rotation: TAG_TILT, y: 0, opacity: 1, duration: 1.1, ease: 'elastic.out(1, 0.6)', scrollTrigger: {trigger: tag, start: 'top 88%', once: true}});

  // Close: the question grows in letter by letter as the red field arrives.
  const question = $('.close h2');
  const questionLetters = SplitText.create(question, {type: 'words,chars'}).chars;
  gsap.from(questionLetters, {yPercent: 70, opacity: 0, rotation: 10, stagger: 0.06, ease: 'back.out(2)', scrollTrigger: {trigger: '.close', start: 'top 75%', end: 'top 15%', scrub: 0.6}});

  ScrollTrigger.refresh();
}
start();
