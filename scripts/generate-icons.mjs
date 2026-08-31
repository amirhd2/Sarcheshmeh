/* Generate PWA icons from SVG base.
   Uses sharp (already installed in the project).
   Outputs:
   - public/icons/icon-192.png
   - public/icons/icon-512.png
   - public/icons/maskable-192.png
   - public/icons/maskable-512.png
   - public/icons/apple-touch-icon-180.png
   - public/favicon.svg (updated)
*/

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(process.cwd(), 'public');
const ICONS_DIR = join(PUBLIC_DIR, 'icons');

const iconBase = readFileSync(join(ICONS_DIR, 'icon-base.svg'));
const maskableBase = readFileSync(join(ICONS_DIR, 'maskable-base.svg'));

async function generate() {
  // Standard PWA icons (with rounded corners baked in)
  await sharp(iconBase).resize(192, 192).png().toFile(join(ICONS_DIR, 'icon-192.png'));
  await sharp(iconBase).resize(512, 512).png().toFile(join(ICONS_DIR, 'icon-512.png'));
  console.log('✓ Generated icon-192.png, icon-512.png');

  // Maskable icons (full-bleed, no rounded corners — OS masks them)
  await sharp(maskableBase).resize(192, 192).png().toFile(join(ICONS_DIR, 'maskable-192.png'));
  await sharp(maskableBase).resize(512, 512).png().toFile(join(ICONS_DIR, 'maskable-512.png'));
  console.log('✓ Generated maskable-192.png, maskable-512.png');

  // Apple touch icon (iOS home screen) — 180x180, square (iOS rounds it)
  await sharp(iconBase).resize(180, 180).png().toFile(join(ICONS_DIR, 'apple-touch-icon-180.png'));
  console.log('✓ Generated apple-touch-icon-180.png');

  // Also generate a 32x32 favicon PNG as fallback
  await sharp(iconBase).resize(32, 32).png().toFile(join(PUBLIC_DIR, 'favicon-32.png'));
  console.log('✓ Generated favicon-32.png');

  console.log('\nAll icons generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
