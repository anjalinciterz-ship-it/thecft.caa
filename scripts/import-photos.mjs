import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const s = createRequire(import.meta.url)('sharp');
const SRC = 'C:/Users/ADMIN/Downloads/webp/';
const OUT = fileURLToPath(new URL('../public/images/photos/', import.meta.url));

// 2.webp is deliberately absent: it carries an Unsplash+ sample watermark.
const MAP = [
  ['8', 'consciousness'],
  ['17', 'self-discovery'],
  ['10', 'inner-peace'],
  ['9', 'purpose'],
  ['13', 'wisdom-call'],
  ['11', 'practice-morning'],
  ['15', 'signpost'],
  ['3', 'mountain-sit'],
  ['5', 'hedge-path'],
  ['6', 'fog-pier'],
  ['7', 'horizon-back'],
  ['16', 'walking-path'],
  ['4', 'leaves-peek'],
  ['12', 'jar-plant'],
  ['14', 'salt-flat'],
  ['18', 'cap-shadow'],
  ['1', 'shadow-figure'],
];

await mkdir(OUT, { recursive: true });

const write = async (pipeline, name, width) =>
  pipeline.clone().webp({ quality: 78 }).resize({ width, withoutEnlargement: true }).toFile(`${OUT}/${name}-${width}.webp`);

for (const [num, name] of MAP) {
  const image = s(SRC + num + '.webp');
  const meta = await image.metadata();
  const big = meta.width > 1400 || meta.height > 1400
    ? image.clone().resize(1400, 1400, { fit: 'inside', withoutEnlargement: true })
    : image.clone();
  await big.clone().webp({ quality: 78 }).toFile(`${OUT}/${name}.webp`);
  const out = await s(`${OUT}/${name}.webp`).metadata();
  const small = out.width > 760 ? await write(image, name, 760) : null;
  console.log(`${name}.webp ${out.width}x${out.height}${small ? ` + ${name}-760.webp` : ''}`);
}
