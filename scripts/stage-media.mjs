/* Copies the repo-root audiobook folder into dist.
 *
 * The build deliberately leaves the 404MB of recordings out, so a deploy stays
 * small and the tracks come from the origin in VITE_AUDIO_BASE. Run this instead
 * of setting that origin if the files should keep shipping as Netlify static
 * files: `npm run build && npm run stage:media`.
 */
import { cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'media');
const to = path.join(root, 'dist', 'media');

await cp(from, to, { recursive: true });
console.log(`staged media -> ${path.relative(root, to)}`);
