/* Generate iOS splash screens from SVG bases.
   iOS requires apple-touch-startup-image for multiple device sizes.
   We generate the most common ones:
   - iPhone 14 Pro Max (1290x2796)
   - iPhone 14 Pro (1179x2556)
   - iPhone 14 (1170x2532)
   - iPhone SE (750x1334)
   - iPad 12.9 (2048x2732)
   - iPad 11 (1668x2388)
   Each in light and dark variants.
*/

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

const ICONS_DIR = join(process.cwd(), 'public', 'icons');

const splashLight = readFileSync(join(ICONS_DIR, 'splash-light-base.svg'));
const splashDark = readFileSync(join(ICONS_DIR, 'splash-dark-base.svg'));

const sizes = [
  // iPhone
  { name: 'iphone-14-pro-max', w: 1290, h: 2796 },
  { name: 'iphone-14-pro', w: 1179, h: 2556 },
  { name: 'iphone-14', w: 1170, h: 2532 },
  { name: 'iphone-se', w: 750, h: 1334 },
  { name: 'iphone-13-mini', w: 1125, h: 2436 },
  // iPad
  { name: 'ipad-12-9', w: 2048, h: 2732 },
  { name: 'ipad-11', w: 1668, h: 2388 },
  { name: 'ipad-10-2', w: 1620, h: 2160 },
];

async function generate() {
  for (const { name, w, h } of sizes) {
    // Light
    await sharp(splashLight, { density: 72 })
      .resize(w, h, { fit: 'fill' })
      .png()
      .toFile(join(ICONS_DIR, `splash-${name}-light.png`));
    // Dark
    await sharp(splashDark, { density: 72 })
      .resize(w, h, { fit: 'fill' })
      .png()
      .toFile(join(ICONS_DIR, `splash-${name}-dark.png`));
    console.log(`✓ ${name} (${w}x${h}) — light + dark`);
  }
  console.log('\nAll splash screens generated!');
}

generate().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
