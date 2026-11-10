import sharp from 'sharp';

// Draws a marker at every coordinate the plank measurer reported, so the
// numbers can be checked against the photograph instead of trusted.
const pts = [
  [90.1, 33.99], [86.87, 40.89], [90.68, 47.33], [87.55, 53.25],
  [90.71, 59.63], [87.77, 66.76], [90.82, 72.91], [89.31, 80.16],
];
const words = ['YOU', 'ARE', 'EXACTLY', 'WHERE', 'YOU', 'NEED', 'TO', 'BE'];

const FILE = 'public/images/site/hero-bg-guidance.webp';
const { width, height } = await sharp(FILE).metadata();

const marks = pts.map(([x, y], i) => {
  const cx = (x / 100) * 912, cy = (y / 100) * ((912 * height) / width);
  return `<g><circle cx="${cx}" cy="${cy}" r="6" fill="none" stroke="#ff2d55" stroke-width="3"/>
    <text x="${cx + 12}" y="${cy + 7}" font-family="Arial" font-size="19" fill="#ff2d55" font-weight="bold">${i}:${words[i]}</text></g>`;
}).join('');

// The overlay is drawn at the reduced size: compositing an SVG at the photo's
// own pixel size lets librsvg expand it past the base and sharp rejects it.
const W = 912, H = Math.round((W * height) / width);
const base = await sharp(FILE).resize(W).png().toBuffer();
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${marks}</svg>`;
await sharp(base)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .png()
  .toFile('tests/browser/shots/plank-coords-debug.png');
console.log(`wrote tests/browser/shots/plank-coords-debug.png (${W}x${H})`);
