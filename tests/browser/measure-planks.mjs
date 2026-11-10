import sharp from 'sharp';

const FILE = process.argv[2] || 'public/images/site/hero-bg-guidance.webp';
const { data, info } = await sharp(FILE).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const mask = new Uint8Array(width * height);
for (let i = 0; i < width * height; i += 1) {
  const r = data[i * channels], g = data[i * channels + 1], b = data[i * channels + 2];
  mask[i] = g > r + 12 && b > r + 6 && g > 60 && g < 215 ? 1 : 0;
}

// Runs of plank pixels along each row. A plank is long, so short runs are
// weathered highlights in the desert or noise between the boards.
const runs = [];
for (let y = 0; y < height; y += 1) {
  let x = 0;
  while (x < width) {
    if (!mask[y * width + x]) { x += 1; continue; }
    let end = x;
    while (end < width && mask[y * width + end]) end += 1;
    if (end - x > 120) runs.push({ y, x0: x, x1: end });
    x = end;
  }
}

// Group runs into boards: consecutive rows whose horizontal spans overlap.
const sorted = runs.sort((a, b) => a.y - b.y || a.x0 - b.x0);
const bands = [];
let cur = null;
for (const r of sorted) {
  const overlaps = cur && r.x0 < cur.x1 - 40 && r.x1 > cur.x0 + 40 && r.y - cur.yPrev <= 3;
  if (!overlaps) {
    cur = { y0: r.y, yPrev: r.y, x0: r.x0, x1: r.x1, rows: [] };
    bands.push(cur);
  }
  cur.yPrev = r.y;
  cur.x0 = Math.min(cur.x0, r.x0);
  cur.x1 = Math.max(cur.x1, r.x1);
  cur.rows.push(r);
}

const boards = bands
  .filter((b) => b.y0 < b.yPrev - 8 && b.x1 - b.x0 > 150)
  .map((b) => {
    const yc = (b.y0 + b.yPrev) / 2;
    // Thickness at each end: the pointed end tapers, the cut end stays full.
    const thick = (x0, x1) => {
      let n = 0;
      for (let x = x0; x < x1; x += 1) {
        let c = 0;
        for (let y = b.y0; y <= b.yPrev; y += 1) if (mask[y * width + x]) c += 1;
        if (c > 3) n += 1;
      }
      return n / Math.max(1, x1 - x0);
    };
    const edge = Math.max(6, Math.round((b.x1 - b.x0) * 0.08));
    const left = thick(b.x0, b.x0 + edge);
    const right = thick(b.x1 - edge, b.x1);
    return {
      yPct: +((yc / height) * 100).toFixed(2),
      xPct: +(((b.x0 + b.x1) / 2) / width * 100).toFixed(2),
      wPct: +(((b.x1 - b.x0) / width) * 100).toFixed(2),
      hPct: +(((b.yPrev - b.y0) / height) * 100).toFixed(2),
      dir: left < right * 0.8 ? 'left' : right < left * 0.8 ? 'right' : 'both',
      ends: `${left.toFixed(2)} vs ${right.toFixed(2)}`,
    };
  })
  .sort((a, b) => a.yPct - b.yPct);

console.log(`${FILE} ${width}x${height} -> ${boards.length} boards`);
boards.forEach((p, i) => console.log(`${i}: x=${p.xPct}% y=${p.yPct}% w=${p.wPct}% h=${p.hPct}% points ${p.dir} (${p.ends})`));
