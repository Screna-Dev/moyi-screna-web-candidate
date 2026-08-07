// One-shot conversion of the landing page's PNG imports to WebP.
//
// The originals total ~9.5 MB and are the single largest contributor to the
// landing page's LCP. Each is resized to roughly 2x its largest on-screen
// size (enough for retina, no more) and re-encoded as WebP q80.
//
// Outputs are committed alongside the sources — this is not part of the build.
// Vercel's Image Optimization isn't used: the set is small, fixed, and known
// at build time, so per-transform billing buys nothing here.
//
// Run with: node scripts/optimize-images.mjs
import sharp from 'sharp';
import { statSync } from 'node:fs';

const JOBS = [
  { in: 'src/imports/Group_18.png', width: 1600 },            // flow diagram, max-width 800
  { in: 'src/imports/App/landing-notebook.png', width: 974 }, // decorative, shown 487x325
  { in: 'src/imports/featurea-png.png', width: 1600 },
  { in: 'src/imports/App/landing-job-offer.png', width: 824 },// decorative, shown 412x275
  { in: 'src/imports/image-2.png', width: 2000 },             // LCP element (dashboard shot)
  { in: 'src/imports/featureb.png', width: 1600 },
  { in: 'src/imports/featurec.png', width: 1600 },
  { in: 'src/imports/App/landing-microphone.png', width: 428 },
  { in: 'src/imports/App/landing-teacup.png', width: 236 },
];

let before = 0;
let after = 0;

for (const job of JOBS) {
  const out = job.in.replace(/\.png$/, '.webp');
  const src = statSync(job.in).size;
  const info = await sharp(job.in)
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(out);
  before += src;
  after += info.size;
  const pct = Math.round((1 - info.size / src) * 100);
  console.log(
    `${job.in.padEnd(42)} ${(src / 1024).toFixed(0).padStart(6)} KB -> ` +
      `${(info.size / 1024).toFixed(0).padStart(5)} KB  (-${pct}%)  ${info.width}x${info.height}`,
  );
}

console.log(
  `\ntotal ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB ` +
    `(-${Math.round((1 - after / before) * 100)}%)`,
);
