/**
 * Render the app icon PNGs from public/favicon.svg.
 *
 * Requires `sharp` (not a runtime dependency). Install ad-hoc if needed:
 *   npm i -D sharp && node scripts/gen-icons.mjs
 *
 * Produces:
 *   public/icons/icon-192.png       (192x192)
 *   public/icons/icon-512.png       (512x512)
 *   public/icons/apple-touch-icon.png (180x180)
 */
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public/favicon.svg');
const outDir = resolve(root, 'public/icons');

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

const { default: sharp } = await import('sharp');
await mkdir(outDir, { recursive: true });
const svg = await readFile(svgPath);

for (const { name, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: '#F8F9FA' })
    .png()
    .toFile(resolve(outDir, name));
  console.log(`wrote icons/${name} (${size}x${size})`);
}
console.log('done.');
