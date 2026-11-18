// Procedural 3D pieces in the Cielo look: flat toon colour, ink outline, raised Allo letters.
// Every builder returns a THREE.Group that fits roughly inside a 1 x 1 x 1 box.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {GLYPHS, CAP} from './glyphs.js';

export const INK = '#1A2A6C';
export const WHITE = '#FFFFFF';
export const YELLOW = '#FFC42E';
export const RED = '#E63B2E';
export const BLUE = '#2B4FD1';
const METAL = '#D5DEEC';
const INK_DEEP = '#0D1740';

// Three flat steps of light: shade, half shade, full colour.
const gradientMap = new THREE.DataTexture(new Uint8Array([0, 140, 255]), 3, 1, THREE.RedFormat);
gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
gradientMap.needsUpdate = true;

export const toon = (color, extra = {}) => new THREE.MeshToonMaterial({color, gradientMap, ...extra});

// Letters contrast with the piece they sit on: ink on light colours, white on the rest.
const isLight = (hex) => ['#FFFFFF', '#FFC42E'].includes(hex.toUpperCase());
const letterColor = (hex) => (isLight(hex) ? INK : WHITE);

// Ink outline: the same shape drawn inside out and pushed along its normals.
export function outline(geometry, thickness = 0.02, clippingPlanes = null, color = INK) {
  const g = geometry.clone();
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const merged = mergeVertices(g, 1e-3);
  merged.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({color, side: THREE.BackSide, clippingPlanes});
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uThickness = {value: thickness};
    shader.vertexShader =
      'uniform float uThickness;\n' +
      shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uThickness;');
  };
  return new THREE.Mesh(merged, material);
}

const solid = (geometry, color, thickness = 0.02) => {
  const group = new THREE.Group();
  // An ink piece gets a deeper outline, as the brand does for the logo on dark.
  group.add(new THREE.Mesh(geometry, toon(color)), outline(geometry, thickness, null, color.toUpperCase() === INK ? INK_DEEP : INK));
  return group;
};
// Letters have tight inner corners where a pushed-out outline folds over itself. Drawing the outline
// first and without depth leaves only the part that sticks out past the letter.
const sideColor = (hex) => (hex.toUpperCase() === WHITE ? '#C9D6EA' : '#' + new THREE.Color(hex).multiplyScalar(0.62).getHexString());
// Extruded text has two material groups: the faces, then the walls. Darker walls keep letters readable.
// Walls of a flat part: a shade darker, or lighter when the part is already ink.
const wallColor = (hex) => (hex.toUpperCase() === INK ? '#34489C' : sideColor(hex));
const letterMaterials = (color) => [toon(color), toon(sideColor(color))];
const solidText = (geometry, color, thickness) => {
  const group = solid(geometry, color, thickness);
  group.children[0].material = letterMaterials(color);
  const hull = group.children[1];
  hull.renderOrder = -1;
  hull.material.depthWrite = false;
  return group;
};

// ---- Allo letters ----------------------------------------------------------------------------
const COMMAND = /([MLQCZ])([^MLQCZ]*)/g;
const numbers = (s) => (s.trim() ? s.trim().split(/[\s,]+/).map(Number) : []);

function glyphShapes(d, dx) {
  const path = new THREE.ShapePath();
  for (const [, c, rest] of d.matchAll(COMMAND)) {
    const v = numbers(rest);
    if (c === 'M') path.moveTo(v[0] + dx, v[1]);
    else if (c === 'L') path.lineTo(v[0] + dx, v[1]);
    else if (c === 'Q') path.quadraticCurveTo(v[0] + dx, v[1], v[2] + dx, v[3]);
    else if (c === 'C') path.bezierCurveTo(v[0] + dx, v[1], v[2] + dx, v[3], v[4] + dx, v[5]);
    else if (path.currentPath) path.currentPath.closePath();
  }
  return path.toShapes(false);
}

// Extruded text, centred, with a cap height of 1. Returns null when nothing can be drawn.
export function textGeometry(text, depth) {
  const shapes = [];
  let x = 0;
  for (const ch of text) {
    const g = GLYPHS[ch] || GLYPHS[ch.toUpperCase()];
    if (!g) continue;
    if (g.d) shapes.push(...glyphShapes(g.d, x));
    x += g.a;
  }
  if (!shapes.length) return null;
  const geometry = new THREE.ExtrudeGeometry(shapes, {depth: depth * CAP, bevelEnabled: false, curveSegments: 5});
  geometry.scale(1 / CAP, 1 / CAP, 1 / CAP);
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  geometry.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, 0);
  return {geometry, width: b.max.x - b.min.x, height: b.max.y - b.min.y};
}

// A glyph drawn on a 2D canvas, centred on (cx, cy) with the given cap height in pixels.
export function drawGlyph(ctx, ch, cx, cy, capPx, fill) {
  const g = GLYPHS[ch];
  const s = capPx / CAP;
  const xs = [...g.d.matchAll(/(-?\d+) (-?\d+)/g)].map((m) => Number(m[1]));
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  ctx.save();
  ctx.translate(cx - mid * s, cy + capPx / 2);
  ctx.scale(s, -s);
  ctx.fillStyle = fill;
  ctx.fill(new Path2D(g.d));
  ctx.restore();
}

// ---- Shapes ----------------------------------------------------------------------------------
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}
const hole = (x, y, r) => new THREE.Path().absarc(x, y, r, 0, Math.PI * 2, true);
const slab = (shape, depth) => {
  const g = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 2, curveSegments: 20});
  g.translate(0, 0, -depth / 2);
  return g;
};
const raised = (text, {capMax, widthMax, depth, color, x = 0, y = 0, z = 0}) => {
  const t = textGeometry(text, depth);
  if (!t) return null;
  const s = Math.min(capMax, widthMax / t.width);
  const mesh = new THREE.Mesh(t.geometry, letterMaterials(color));
  mesh.scale.setScalar(s);
  mesh.position.set(x, y, z);
  return mesh;
};

// ---- Pieces ----------------------------------------------------------------------------------
function keyring({color = RED, text = 'Hola'}) {
  const group = new THREE.Group();
  const shape = roundedRect(1.62, 0.6, 0.3);
  shape.holes.push(hole(-0.6, 0, 0.085));
  group.add(solid(slab(shape, 0.1), color, 0.022));
  const letters = raised(text, {capMax: 0.3, widthMax: 0.96, depth: 0.16, color: letterColor(color), x: 0.14, z: 0.062});
  if (letters) group.add(letters);
  // The ring goes through the hole and around the end of the plate. Its plane holds the plate's long
  // axis and leans 45 degrees, so it clears both faces and still reads as a ring from the front.
  const ring = solid(new THREE.TorusGeometry(0.22, 0.026, 12, 56), METAL, 0.016);
  ring.position.set(-0.82, 0, 0);
  ring.rotation.x = Math.PI / 4;
  group.add(ring);
  group.position.x = 0.08;
  const wrap = new THREE.Group();
  wrap.add(group);
  wrap.scale.setScalar(0.56);
  wrap.rotation.z = 0.1;
  return wrap;
}

function ornament({color = BLUE, text = 'Silvia'}) {
  const group = new THREE.Group();
  const disc = new THREE.Shape().absarc(0, 0, 0.5, 0, Math.PI * 2, false);
  disc.holes.push(hole(0, 0.39, 0.05));
  group.add(solid(slab(disc, 0.08), color, 0.022));
  const star = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.085 : 0.2;
    star[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  star.closePath();
  const starMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(star, {depth: 0.05, bevelEnabled: false}),
    toon(color.toUpperCase() === YELLOW ? RED : YELLOW),
  );
  starMesh.position.set(0, 0.07, 0.05);
  group.add(starMesh);
  const letters = raised(text, {capMax: 0.14, widthMax: 0.62, depth: 0.3, color: letterColor(color), y: -0.24, z: 0.05});
  if (letters) group.add(letters);
  const loop = solid(new THREE.TorusGeometry(0.085, 0.018, 8, 32), METAL, 0.014);
  loop.position.set(0, 0.47, 0);
  loop.rotation.y = 1.15;
  group.add(loop);
  group.scale.setScalar(0.86);
  group.position.y = -0.04;
  const wrap = new THREE.Group();
  wrap.add(group);
  return wrap;
}

function sign({color = YELLOW, text = 'Hola'}) {
  const group = new THREE.Group();
  const t = textGeometry(text || ' ', 0.55);
  let width = 0.6, cap = 0.42;
  if (t) {
    cap = Math.min(0.46, 1.5 / t.width);
    width = t.width * cap;
    const letters = solidText(t.geometry, color, 0.03 / cap);
    letters.scale.setScalar(cap);
    letters.position.set(0, (t.height * cap) / 2, (-0.55 * cap) / 2);
    group.add(letters);
  }
  const base = solid(new RoundedBoxGeometry(width + 0.26, 0.1, 0.46, 3, 0.04), isLight(color) && color.toUpperCase() === WHITE ? INK : WHITE, 0.02);
  base.position.y = -0.05;
  group.add(base);
  group.position.y = -cap / 2 + 0.05;
  const wrap = new THREE.Group();
  wrap.add(group);
  wrap.scale.setScalar(0.6);
  wrap.rotation.x = 0.22;
  return wrap;
}

function vase({color = WHITE}) {
  const points = [];
  const steps = 64, wall = 0.04;
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // A tapered pot with a rolled lip, so it reads as a pot at a glance.
  const radius = (t) => 0.24 + 0.17 * t + 0.03 * smooth(0.86, 0.93, t);
  points.push(new THREE.Vector2(0.001, -0.5));
  for (let i = 0; i <= steps; i++) points.push(new THREE.Vector2(radius(i / steps), -0.5 + i / steps));
  for (let i = steps; i >= 3; i--) points.push(new THREE.Vector2(0.24 + (0.17 * i) / steps - wall, -0.5 + i / steps));
  points.push(new THREE.Vector2(0.001, -0.5 + 3 / steps));
  const geometry = new THREE.LatheGeometry(points, 144);
  // Spiral flutes climb the wall and fade out before the foot and the lip, which stay round.
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = y + 0.5;
    const fade = smooth(0, 0.1, t) * (1 - smooth(0.78, 0.88, t));
    const k = 1 + 0.085 * fade * Math.sin(8 * Math.atan2(z, x) + t * 3.4);
    p.setXYZ(i, x * k, y, z * k);
  }
  geometry.computeVertexNormals();
  const group = solid(geometry, color, 0.016);
  // Soil and a sprout: the pot in use, and nothing odd to see when it is turned towards the viewer.
  const soilY = 0.35;
  group.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.02, 48), toon(SOIL)), 0, soilY));
  group.add(place(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.2, 10), toon(PINE)), 0, soilY + 0.1));
  for (const side of [-1, 1]) {
    const leaf = new THREE.SphereGeometry(0.1, 16, 10);
    leaf.scale(1, 0.24, 0.55);
    group.add(place(part(leaf, PINE, 0.014), side * 0.085, soilY + 0.2, 0, side * 0.5));
  }
  group.rotation.x = 0.38;
  const wrap = new THREE.Group();
  wrap.add(group);
  wrap.scale.setScalar(0.78);
  return wrap;
}

function gear({color = INK}) {
  const teeth = 10, outer = 0.5, root = 0.39;
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [[root, 0], [root, 0.18], [outer, 0.3], [outer, 0.62], [root, 0.74]];
    pts.forEach(([r, f], j) => shape[i + j ? 'lineTo' : 'moveTo'](Math.cos(a + f * step) * r, Math.sin(a + f * step) * r));
  }
  shape.closePath();
  shape.holes.push(hole(0, 0, 0.13));
  const group = solid(slab(shape, 0.2), color, 0.022);
  group.children[0].material = [toon(color), toon(wallColor(color))];
  const hub = new THREE.Shape().absarc(0, 0, 0.235, 0, Math.PI * 2, false);
  hub.holes.push(hole(0, 0, 0.13));
  const boss = new THREE.Mesh(slab(hub, 0.3), [toon(color), toon(wallColor(color))]);
  group.add(boss);
  group.rotation.x = -0.35;
  const wrap = new THREE.Group();
  wrap.add(group);
  wrap.scale.setScalar(0.88);
  return wrap;
}

// Dashed cube: something that is still only an idea. Shared by the "Otra idea" piece and the process.
export const lineMaterials = new Set();
export function dashedCube(size = 1, linewidth = 4) {
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
  const geometry = new LineSegmentsGeometry().setPositions(edges.attributes.position.array);
  const material = new LineMaterial({color: INK, linewidth, dashed: true, dashSize: size * 0.085, gapSize: size * 0.07});
  lineMaterials.add(material);
  const lines = new LineSegments2(geometry, material);
  lines.computeLineDistances();
  return lines;
}

function idea() {
  const group = new THREE.Group();
  const cube = dashedCube(0.5, 3.5);
  group.add(cube);
  const t = textGeometry('?', 0.3);
  const mark = solidText(t.geometry, YELLOW, 0.05);
  mark.scale.setScalar(0.26);
  mark.position.z = -0.045;
  group.add(mark);
  group.rotation.x = 0.5;
  group.userData.spin = cube;
  const wrap = new THREE.Group();
  wrap.add(group);
  return wrap;
}

// ---- Christmas pieces -------------------------------------------------------------------------
// Colours outside the brand's primaries: the Christmas pieces, and the plant in the pot.
const PINE = '#1E9E57';
const GINGER = '#B4622A';
const SOIL = '#6E4423';

// A part of a figure made of several overlapping shapes: its outline is drawn first and without
// depth, so only the outer silhouette of the whole figure keeps an ink line.
const part = (geometry, color, thickness = 0.022) => {
  const group = solid(geometry, color, thickness);
  group.children[1].renderOrder = -1;
  group.children[1].material.depthWrite = false;
  return group;
};
const place = (object, x, y, z = 0, rotation = 0) => {
  object.position.set(x, y, z);
  object.rotation.z = rotation;
  return object;
};
function starShape(outer, inner) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    shape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  return shape;
}

function tree() {
  const group = new THREE.Group();
  const tiers = [[0.46, 0.44, -0.2], [0.36, 0.4, 0.07], [0.25, 0.36, 0.32]]; // radius, height, centre
  const colours = [RED, YELLOW, WHITE, BLUE];
  tiers.forEach(([radius, height, y], t) => {
    group.add(place(solid(new THREE.ConeGeometry(radius, height, 32), PINE, 0.02), 0, y));
    // Baubles sit on the surface of each tier, a little above its rim.
    const count = 5 - t;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + t * 0.9;
      const r = radius * 0.8;
      const bauble = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), toon(colours[(i + t) % colours.length]));
      bauble.position.set(Math.cos(angle) * r, y - height / 2 + height * 0.2, Math.sin(angle) * r);
      group.add(bauble);
    }
  });
  group.add(place(solid(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 16), GINGER, 0.018), 0, -0.49));
  const star = solid(new THREE.ExtrudeGeometry(starShape(0.13, 0.058), {depth: 0.05, bevelEnabled: false}), YELLOW, 0.018);
  group.add(place(star, 0, 0.6, -0.025));
  group.position.y = -0.03;
  const wrap = new THREE.Group();
  wrap.add(group);
  wrap.scale.setScalar(0.84);
  return wrap;
}

function gift() {
  const group = new THREE.Group();
  group.add(solid(new RoundedBoxGeometry(0.6, 0.5, 0.6, 3, 0.04), RED, 0.022));
  const ribbon = toon(YELLOW);
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.615, 0.515, 0.13), ribbon), new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.515, 0.615), ribbon));
  for (const side of [-1, 1]) {
    const loop = solid(new THREE.TorusGeometry(0.1, 0.036, 10, 28), YELLOW, 0.014);
    loop.position.set(side * 0.1, 0.31, 0);
    loop.rotation.set(0, 0.5 * side, side * 0.5);
    group.add(loop);
  }
  group.rotation.set(0.42, 0.65, 0);
  const wrap = new THREE.Group();
  wrap.add(group);
  wrap.scale.setScalar(0.9);
  return wrap;
}

function gingerbread() {
  const group = new THREE.Group();
  const circle = new THREE.Shape().absarc(0, 0, 0.2, 0, Math.PI * 2, false);
  group.add(place(part(slab(circle, 0.1), GINGER), 0, 0.33));
  group.add(place(part(slab(roundedRect(0.36, 0.42, 0.14), 0.1), GINGER), 0, 0));
  for (const side of [-1, 1]) {
    group.add(place(part(slab(roundedRect(0.32, 0.15, 0.075), 0.1), GINGER), side * 0.27, 0.09, 0, side * 0.35));
    group.add(place(part(slab(roundedRect(0.16, 0.34, 0.08), 0.1), GINGER), side * 0.11, -0.31, 0, side * 0.12));
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), new THREE.MeshBasicMaterial({color: INK}));
    group.add(place(eye, side * 0.07, 0.36, 0.07));
  }
  const icing = toon(WHITE);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.013, 6, 20, Math.PI), icing);
  group.add(place(smile, 0, 0.3, 0.068, Math.PI));
  for (const y of [0.09, -0.04]) group.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), icing), 0, y, 0.068));
  group.position.y = 0.03;
  const wrap = new THREE.Group();
  wrap.add(group);
  wrap.scale.setScalar(0.95);
  return wrap;
}

const BUILDERS = {keyring, ornament, sign, vase, gear, idea, tree, gift, gingerbread};
// The caller owns the returned group's position, rotation and scale; the piece keeps its own inside.
export function buildModel(kind, options = {}) {
  const piece = (BUILDERS[kind] || idea)(options);
  const holder = new THREE.Group();
  holder.add(piece);
  piece.traverse((o) => { if (o.userData.spin) holder.userData.spin = o.userData.spin; });
  return holder;
}

export function dispose(object) {
  object.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      lineMaterials.delete(o.material);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    }
  });
}

// ---- The letter cube -------------------------------------------------------------------------
function faceTexture(background, letter, foreground) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(30, 30, size - 60, size - 60, 50);
  ctx.fill();
  drawGlyph(ctx, letter, size / 2, size / 2, size * 0.58, foreground);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Box face order is +x, -x, +y, -y, +z, -z. Seen from the logo's corner: H on top, 3 left, D right.
// Opposite faces match, so whichever corner faces the viewer shows all three letters.
const FACES = [['D', BLUE], ['D', BLUE], ['H', YELLOW], ['H', YELLOW], ['3', RED], ['3', RED]];

export function buildCube(clippingPlanes) {
  const geometry = new RoundedBoxGeometry(1, 1, 1, 5, 0.085);
  const colour = FACES.map(([letter, bg]) => toon(WHITE, {map: faceTexture(bg, letter, bg === YELLOW ? INK : WHITE), clippingPlanes}));
  const mono = FACES.map(([letter]) => toon(WHITE, {map: faceTexture(WHITE, letter, INK), clippingPlanes}));
  const body = new THREE.Mesh(geometry, colour);
  const hull = outline(geometry, 0.028, clippingPlanes);
  const group = new THREE.Group();
  group.add(body, hull);
  return {group, body, setMono: (on) => (body.material = on ? mono : colour)};
}

export function buildNozzle() {
  const group = new THREE.Group();
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 20), new THREE.MeshBasicMaterial({color: INK}));
  tip.rotation.x = Math.PI;
  tip.position.y = 0.09;
  const block = solid(new RoundedBoxGeometry(0.34, 0.24, 0.3, 3, 0.05), WHITE, 0.022);
  block.position.y = 0.3;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({color: YELLOW}));
  group.add(tip, block, dot);
  return group;
}

export function buildBed() {
  return solid(new RoundedBoxGeometry(1.7, 0.07, 1.7, 3, 0.03), WHITE, 0.022);
}
