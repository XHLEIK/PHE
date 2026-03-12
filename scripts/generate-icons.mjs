/**
 * Generate PWA icons as SVG-based files.
 * Run: node scripts/generate-icons.mjs
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');

function generateSvg(size) {
  const fontSize = Math.round(size * 0.35);
  const subFontSize = Math.round(size * 0.07);
  const shieldSize = Math.round(size * 0.25);
  const shieldX = Math.round(size / 2);
  const shieldY = Math.round(size * 0.38);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#b45309"/>
  <g transform="translate(${shieldX}, ${shieldY})">
    <path d="M0 ${-shieldSize} L${shieldSize * 0.85} ${-shieldSize * 0.55} L${shieldSize * 0.85} ${shieldSize * 0.25} C${shieldSize * 0.85} ${shieldSize * 0.65} 0 ${shieldSize} 0 ${shieldSize} C0 ${shieldSize} ${-shieldSize * 0.85} ${shieldSize * 0.65} ${-shieldSize * 0.85} ${shieldSize * 0.25} L${-shieldSize * 0.85} ${-shieldSize * 0.55} Z" fill="white" opacity="0.95"/>
  </g>
  <text x="50%" y="72%" text-anchor="middle" font-family="Arial,sans-serif" font-size="${subFontSize}" fill="white" font-weight="700" letter-spacing="1">SAMADHAN</text>
</svg>`;
}

// We'll write SVGs and the browser/PWA spec technically needs PNG.
// Since we can't generate PNG without canvas/sharp, we write SVGs
// and also create a simple redirect page. Most modern browsers handle SVG icons.

// Actually let's write proper SVG files but reference them as .png
// We need a better approach — use an inline data-uri trick in manifest
// OR just write SVG and update manifest to reference .svg

// Simplest fix: write SVG icons and update manifest to use SVG
for (const size of [192, 512]) {
  const svg = generateSvg(size);
  writeFileSync(join(iconsDir, `icon-${size}.svg`), svg);
  console.log(`✅ Generated icon-${size}.svg`);
}
