/* One-off script: generates app icon / splash assets from an SVG mark. */
const sharp = require('sharp');
const path = require('path');

const OUT = path.join(__dirname, '..', 'src', 'assets', 'images');

const BRAND_FROM = '#60A5FA';
const BRAND_TO = '#2563EB';

// Three fanned "content cards" with a play triangle on the front card —
// reads as shelved/organized media at any size.
function cardsGroup({ triangleColor, cardOpacities, flatColor }) {
  const cx = 512;
  const cy = 512;
  const w = 420;
  const h = 300;
  const rx = 36;
  const x = cx - w / 2;
  const y = cy - h / 2;

  const card = (angle, dx, dy, opacity) => `
    <g transform="translate(${dx} ${dy}) rotate(${angle} ${cx} ${cy})">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"
        fill="${flatColor ?? '#FFFFFF'}" opacity="${opacity}" />
    </g>`;

  const [back, mid, front] = cardOpacities;

  const triangle = triangleColor
    ? `<g transform="translate(0 -6)">
         <path d="M480 442 L618 512 L480 582 Z" fill="${triangleColor}" />
       </g>`
    : '';

  return `
    ${card(-11, -34, -14, back)}
    ${card(6, 18, 8, mid)}
    ${card(0, 0, 0, front)}
    ${triangle}
  `;
}

function fullIconSvg() {
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BRAND_FROM}" />
        <stop offset="1" stop-color="${BRAND_TO}" />
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" rx="224" fill="url(#bg)" />
    ${cardsGroup({ triangleColor: '#1E40AF', cardOpacities: [0.55, 0.8, 1] })}
  </svg>`;
}

function foregroundSvg() {
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${cardsGroup({ triangleColor: '#1E40AF', cardOpacities: [0.55, 0.8, 1] })}
  </svg>`;
}

function backgroundSvg() {
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BRAND_FROM}" />
        <stop offset="1" stop-color="${BRAND_TO}" />
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)" />
  </svg>`;
}

function monochromeSvg() {
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    ${cardsGroup({ triangleColor: null, cardOpacities: [1, 1, 1], flatColor: '#FFFFFF' })}
  </svg>`;
}

function splashSvg() {
  // Transparent, glyph-only mark (no background square) — sits on the
  // native splash's solid brand-color background, then the JS-driven
  // animated splash takes over on the same background for a seamless handoff.
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <g transform="scale(1.2) translate(-85 -85)">
      ${cardsGroup({ triangleColor: '#1E40AF', cardOpacities: [0.6, 0.82, 1], flatColor: '#FFFFFF' })}
    </g>
  </svg>`;
}

async function render(svg, size, file, { flatten = false } = {}) {
  let img = sharp(Buffer.from(svg)).resize(size, size);
  if (flatten) img = img.flatten({ background: '#FFFFFF' });
  await img.png().toFile(path.join(OUT, file));
  console.log('wrote', file, size);
}

(async () => {
  await render(fullIconSvg(), 1024, 'icon.png', { flatten: true }); // no alpha, like original
  await render(splashSvg(), 1024, 'splash-icon.png');
  await render(foregroundSvg(), 1024, 'android-icon-foreground.png');
  await render(backgroundSvg(), 1024, 'android-icon-background.png');
  await render(monochromeSvg(), 1024, 'android-icon-monochrome.png');
  await render(fullIconSvg(), 48, 'favicon.png');
})();
