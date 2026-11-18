// Photographs of the Christmas pieces, by file name. Astro resizes and converts them at build time.
const files = import.meta.glob('../assets/navidad/*.jpg', {eager: true, import: 'default'});
const byName = Object.fromEntries(Object.entries(files).map(([path, image]) => [path.split('/').pop().replace('.jpg', ''), image]));
export const photoOf = (item) => byName[item.image];
