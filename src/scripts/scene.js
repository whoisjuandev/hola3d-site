// One WebGL canvas fixed behind the page text. Objects follow DOM "slots", so layout stays in CSS:
//   [data-cube-slot]   the letter cube flies to whichever slot is nearest the middle of the screen
//   [data-float-field] printed pieces float around inside this element (the hero)
//   [data-model-slot]  the product viewer
// One world unit is one CSS pixel at z = 0.
import * as THREE from 'three';
import {buildCube, buildNozzle, buildBed, buildModel, dashedCube, dispose, lineMaterials, RED, BLUE, YELLOW, WHITE} from './models.js';

const ISO_X = 0.6155; // tilt that shows the top face like the logo
const ISO_Y = -Math.PI / 4;
const damp = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// On-screen movement eases in and out; nothing here starts or stops at full speed.
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const FLOATERS = {
  wide: [
    {kind: 'keyring', options: {color: RED, text: 'Hola'}, x: 0.44, y: 0.25, size: 0.42, depth: 0.5, turn: 0.5},
    {kind: 'ornament', options: {color: BLUE, text: 'Silvia'}, x: 0.95, y: 0.8, size: 0.17, depth: 0.9, turn: -0.4},
    {kind: 'gift', options: {}, x: 0.6, y: 0.84, size: 0.14, depth: 0.7, turn: 0.7},
    {kind: 'vase', options: {color: WHITE}, x: 0.67, y: 0.2, size: 0.13, depth: 0.3, turn: -0.5},
  ],
  // On phones the cube fills the lower corner. The pieces are placed against the cube's own box
  // (`anchor`), in the corners its outline leaves free, so they show at any screen width.
  narrow: [
    {kind: 'keyring', options: {color: RED, text: 'Hola'}, anchor: true, x: 0.1, y: 0.1, size: 0.36, depth: 0.5, turn: 0.5},
    {kind: 'ornament', options: {color: BLUE, text: 'Silvia'}, anchor: true, x: 0.07, y: 0.84, size: 0.18, depth: 0.9, turn: -0.4},
  ],
};

// `state`, `floatIn` and `view` belong to the page: its animations write them, this file only reads.
export function createStage(canvas, {reducedMotion = false, state, floatIn, view}) {
  const renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 10, 20000);
  scene.add(new THREE.AmbientLight(0xffffff, 2.25));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(-0.6, 1, 0.9);
  scene.add(sun);

  let W = 0, H = 0;
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.position.z = H / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.updateProjectionMatrix();
    lineMaterials.forEach((m) => m.resolution.set(W, H));
  }

  // ---- The cube and its print rig --------------------------------------------------------------
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e9);
  const cube = buildCube([plane]);
  const wire = dashedCube(1, 4);
  const spinner = new THREE.Group(); // turns around the vertical axis
  spinner.add(cube.group, wire);
  spinner.rotation.y = ISO_Y;
  const rig = new THREE.Group(); // position, size and the logo tilt
  rig.rotation.x = ISO_X;
  rig.add(spinner);
  const bed = buildBed();
  bed.position.y = -0.56;
  rig.add(bed);
  const nozzle = buildNozzle();
  scene.add(rig, nozzle);
  rig.visible = false;
  let mono = false;

  const cubeSlots = [...document.querySelectorAll('[data-cube-slot]')];
  const cubePose = {x: 0, y: 0, size: 0, present: 1, ready: false};

  // ---- Floating pieces ------------------------------------------------------------------------
  const field = document.querySelector('[data-float-field]');
  let floaters = [];
  let floatersNarrow = null;
  function buildFloaters() {
    const narrow = W < 896;
    if (narrow === floatersNarrow) return;
    floatersNarrow = narrow;
    floaters.forEach((f) => { scene.remove(f.object); dispose(f.object); });
    floaters = FLOATERS[narrow ? 'narrow' : 'wide'].map((spec, i) => {
      const object = buildModel(spec.kind, spec.options);
      scene.add(object);
      return {...spec, object, phase: i * 1.7};
    });
  }

  // ---- Christmas: three pieces and falling snow ---------------------------------------------------
  const xmasSlot = document.querySelector('[data-xmas-slot]');
  const xmas = xmasSlot ? [
    {kind: 'tree', x: 0.5, y: 0.5, size: 0.84, sway: 0.25},
    {kind: 'gift', x: 0.17, y: 0.8, size: 0.3, sway: 0.5},
    {kind: 'gingerbread', x: 0.85, y: 0.74, size: 0.36, sway: 0.4},
  ].map((spec, i) => {
    const object = buildModel(spec.kind);
    object.visible = false;
    scene.add(object);
    return {...spec, object, phase: i * 2.1};
  }) : [];

  const snowField = document.querySelector('[data-snow-field]');
  const FLAKES = 150;
  const flakes = Array.from({length: FLAKES}, () => ({x: Math.random(), y: Math.random(), speed: 26 + Math.random() * 46, drift: 0.4 + Math.random() * 0.9, phase: Math.random() * 6.28}));
  const snow = (() => {
    const dot = document.createElement('canvas');
    dot.width = dot.height = 32;
    const ctx = dot.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLAKES * 3), 3));
    const material = new THREE.PointsMaterial({map: new THREE.CanvasTexture(dot), size: 9, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false});
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.visible = false;
    points.renderOrder = -2; // behind every piece
    scene.add(points);
    return points;
  })();

  // ---- Product viewer -------------------------------------------------------------------------
  const modelSlot = document.querySelector('[data-model-slot]');
  const viewer = {object: null, kind: null, yaw: -0.45, pitch: 0.1, velocity: 0, dragging: false, idle: 0};
  function setProduct(kind, options) {
    if (viewer.object) { scene.remove(viewer.object); dispose(viewer.object); }
    viewer.object = buildModel(kind, options);
    if (kind !== viewer.kind) { viewer.yaw = -0.45; viewer.pitch = 0.1; viewer.velocity = 0; }
    viewer.kind = kind;
    scene.add(viewer.object);
  }
  if (modelSlot) {
    let lastX = 0, lastY = 0;
    modelSlot.addEventListener('pointerdown', (e) => {
      viewer.dragging = true;
      lastX = e.clientX; lastY = e.clientY;
      modelSlot.setPointerCapture(e.pointerId);
      modelSlot.classList.add('is-dragging');
    });
    modelSlot.addEventListener('pointermove', (e) => {
      if (!viewer.dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      viewer.yaw += dx * 0.012;
      viewer.pitch = clamp(viewer.pitch + dy * 0.008, -0.7, 0.7);
      viewer.velocity = dx * 0.012 * 60;
    });
    const release = () => { viewer.dragging = false; viewer.idle = 0; modelSlot.classList.remove('is-dragging'); };
    modelSlot.addEventListener('pointerup', release);
    modelSlot.addEventListener('pointercancel', release);
    // Keyboard: the viewer is focusable, arrows turn the piece.
    modelSlot.addEventListener('keydown', (e) => {
      const step = {ArrowLeft: -0.3, ArrowRight: 0.3}[e.key];
      if (!step) return;
      e.preventDefault();
      viewer.yaw += step;
      viewer.idle = 0;
    });
  }

  // ---- Pointer parallax -----------------------------------------------------------------------
  const pointer = {x: 0, y: 0, sx: 0, sy: 0};
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    pointer.x = (e.clientX / W) * 2 - 1;
    pointer.y = (e.clientY / H) * 2 - 1;
  }, {passive: true});

  // Sets the opacity of every material under an object (materials are made transparent once).
  const fade = (object, opacity) => object.traverse((o) => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m.transparent) { m.transparent = true; m.needsUpdate = true; }
      m.opacity = opacity;
    }
  });

  const centre = (r) => ({x: r.left + r.width / 2 - W / 2, y: H / 2 - (r.top + r.height / 2)});

  const up = new THREE.Vector3(), side = new THREE.Vector3(), layerPoint = new THREE.Vector3();
  let time = 0;
  function frame(dt) {
    dt = Math.min(dt, 0.05);
    time += dt;
    const motion = reducedMotion ? 0 : 1;
    pointer.sx = damp(pointer.sx, pointer.x, 5, dt);
    pointer.sy = damp(pointer.sy, pointer.y, 5, dt);

    // Cube: its place is a blend of the two slots on either side of the middle of the screen, driven
    // by the scroll itself. Moving the page moves the cube; nothing snaps when a section takes over.
    let above = null, below = null;
    for (const slot of cubeSlots) {
      const r = slot.getBoundingClientRect();
      if (!r.width) continue;
      const c = centre(r);
      const spot = {x: c.x, y: c.y, size: Math.min(r.width, r.height) / 1.82, offset: -c.y};
      if (spot.offset <= 0) above = spot; // slots come in page order: keep the last one above
      else if (!below) below = spot;
    }
    const from = above || below, to = below || above;
    if (from) {
      const span = to.offset - from.offset;
      const travel = span > 0 ? clamp((-from.offset / span - 0.2) / 0.6, 0, 1) : 0;
      const k = easeInOut(travel);
      const target = {x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, size: from.size + (to.size - from.size) * k};
      // Between slots that are far apart (the shop sits between two of them) the cube steps out.
      const nearest = Math.min(Math.abs(from.offset), Math.abs(to.offset));
      const present = 1 - clamp((nearest - H * 0.7) / (H * 0.3), 0, 1);
      if (!cubePose.ready) Object.assign(cubePose, target, {present, ready: true});
      // A light follow on top of the scroll-driven target takes the edge off wheel steps.
      cubePose.x = damp(cubePose.x, target.x, 16, dt);
      cubePose.y = damp(cubePose.y, target.y, 16, dt);
      cubePose.size = damp(cubePose.size, target.size, 16, dt);
      cubePose.present = damp(cubePose.present, present, 10, dt);
      // The cube steps back while the bed is out, so bed and nozzle stay inside the slot.
      const e = cubePose.size * (1 - 0.24 * state.bed);
      rig.visible = cubePose.present > 0.01;
      const printing = state.clip > 0.001 && state.clip < 0.999;
      const calm = printing || state.bed > 0.01 ? 0 : motion;
      const bob = Math.sin(time * 1.3) * e * 0.035 * calm;
      const hop = Math.sin(state.hop * Math.PI) * e * 0.28;
      rig.position.set(cubePose.x, cubePose.y + bob + hop, 0);
      rig.scale.setScalar(Math.max(e, 0.001) * (0.9 + 0.1 * cubePose.present));
      rig.rotation.x = ISO_X + pointer.sy * 0.12 * calm;
      rig.rotation.z = Math.sin(time * 0.9) * 0.03 * calm;
      spinner.rotation.y = ISO_Y + state.spin + pointer.sx * 0.28 * calm + Math.sin(time * 0.6) * 0.07 * calm;

      // Each form fades in from just under full size; nothing grows out of a point.
      const show = (object, amount) => {
        object.visible = amount > 0.01;
        object.scale.setScalar(0.88 + 0.12 * amount);
        fade(object, amount * cubePose.present);
      };
      show(cube.group, state.solid);
      show(wire, state.wire);
      show(bed, state.bed);
      wire.rotation.y = time * 0.5 * motion;
      if (mono !== state.mono > 0.5) { mono = state.mono > 0.5; cube.setMono(mono); }

      // Printing: layers are parallel to the bed, and everything above the current one is not there yet.
      up.set(0, 1, 0).applyQuaternion(rig.quaternion);
      side.set(1, 0, 0).applyQuaternion(rig.quaternion);
      layerPoint.copy(rig.position).addScaledVector(up, e * (-0.52 + state.clip * 1.04));
      plane.normal.copy(up).negate();
      plane.constant = state.clip >= 0.999 ? 1e9 : up.dot(layerPoint);
      nozzle.visible = rig.visible && printing;
      if (nozzle.visible) {
        nozzle.position.copy(layerPoint).addScaledVector(side, Math.sin(time * 7) * e * 0.42);
        nozzle.quaternion.copy(rig.quaternion);
        nozzle.scale.setScalar(e * 0.9);
      }
    }

    // Floating pieces around the hero.
    if (field) {
      const fieldRect = field.getBoundingClientRect();
      const cubeRect = cubeSlots[0].getBoundingClientRect();
      const visible = fieldRect.bottom > -H * 0.2 && fieldRect.top < H;
      const scrolled = -fieldRect.top;
      floaters.forEach((f, i) => {
        f.object.visible = visible && floatIn.value * 1.6 - i * 0.2 > 0.01;
        if (!f.object.visible) return;
        const r = f.anchor ? cubeRect : fieldRect;
        const unit = f.anchor ? r.width : Math.min(r.width, r.height * 1.25);
        const appear = clamp(floatIn.value * 1.6 - i * 0.2, 0, 1);
        const pop = 1 - (1 - appear) ** 3 + Math.sin(appear * Math.PI) * 0.12;
        const px = r.left + r.width * f.x - W / 2 - pointer.sx * 26 * f.depth * motion;
        const py = H / 2 - (r.top + r.height * f.y) + pointer.sy * 18 * f.depth * motion + scrolled * 0.35 * f.depth;
        f.object.position.set(px, py + Math.sin(time * 0.9 + f.phase) * unit * 0.014 * motion, 0);
        f.object.scale.setScalar(unit * f.size * (0.6 + 0.4 * pop));
        f.object.rotation.set(Math.sin(time * 0.5 + f.phase) * 0.22 * motion + 0.12, f.turn + Math.sin(time * 0.4 + f.phase) * 0.5 * motion, f.turn * 0.25);
      });
    }

    // Christmas pieces: the tree stands in its slot with a gift and a gingerbread figure at its foot.
    if (xmasSlot) {
      const r = xmasSlot.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < H && r.width > 0;
      const unit = Math.min(r.width, r.height);
      for (const f of xmas) {
        f.object.visible = visible;
        if (!visible) continue;
        f.object.position.set(r.left + r.width * f.x - W / 2, H / 2 - (r.top + r.height * f.y) + Math.sin(time * 0.9 + f.phase) * unit * 0.012 * motion, 0);
        f.object.scale.setScalar(unit * f.size);
        f.object.rotation.set(0.12, Math.sin(time * 0.45 + f.phase) * f.sway * motion + (f.kind === 'tree' ? time * 0.25 * motion : 0), 0);
      }
    }

    // Snow falls only inside the Christmas section; a flake outside it is parked off screen.
    if (snowField) {
      const r = snowField.getBoundingClientRect();
      snow.visible = r.bottom > 0 && r.top < H;
      if (snow.visible) {
        const position = snow.geometry.attributes.position;
        const fall = time * motion;
        flakes.forEach((f, i) => {
          const top = ((f.y * H + fall * f.speed - r.top * 0.25) % H + H) % H;
          const left = f.x * W + Math.sin(fall * f.drift + f.phase) * 22;
          const inside = top > r.top && top < r.bottom;
          position.setXYZ(i, inside ? left - W / 2 : 1e6, H / 2 - top, -40);
        });
        position.needsUpdate = true;
      }
    }

    // Product viewer.
    if (modelSlot && viewer.object) {
      const r = modelSlot.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < H && r.width > 0;
      viewer.object.visible = visible;
      if (visible) {
        if (!viewer.dragging) {
          viewer.idle += dt;
          viewer.yaw += viewer.velocity * dt;
          viewer.velocity = damp(viewer.velocity, viewer.idle > 1.2 ? 0.35 * motion : 0, 3, dt);
        }
        const c = centre(r);
        viewer.object.position.set(c.x, c.y + Math.sin(time * 1.1) * 5 * motion, 0);
        viewer.object.scale.setScalar(Math.min(r.width, r.height) * 0.8 * view.scale);
        viewer.object.rotation.set(viewer.pitch, viewer.yaw, 0);
        const inner = viewer.object.userData.spin;
        if (inner) inner.rotation.y = time * 0.6 * motion;
      }
    }

    renderer.render(scene, camera);
  }

  resize();
  buildFloaters();
  window.addEventListener('resize', () => { resize(); buildFloaters(); });

  return {frame, setProduct};
}
