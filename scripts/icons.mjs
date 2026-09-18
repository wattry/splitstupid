// Render the PWA / favicon PNGs from public/icons/icon.svg. Run `pnpm icons`
// whenever the artwork changes; the outputs are committed.
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const SRC = 'public/icons/icon.svg';
const OUT = 'public/icons';
const TILE = '#F5E13C'; // the icon's own background, used to pad the maskable variant

const svg = await readFile(SRC);

const png = (size) => sharp(svg, { density: 300 }).resize(size, size).png();

// Maskable: platforms crop to a circle or squircle, so the artwork sits inside
// an 80% safe zone on a solid tile.
const maskable = async (size) => {
  const inner = Math.round(size * 0.8);
  const art = await png(inner).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: TILE } })
    .composite([{ input: art, gravity: 'centre' }])
    .png()
    .toBuffer();
};

await Promise.all([
  png(192).toFile(`${OUT}/icon-192.png`),
  png(512).toFile(`${OUT}/icon-512.png`),
  maskable(512).then((buf) => writeFile(`${OUT}/icon-512-maskable.png`, buf)),
  png(180).toFile(`${OUT}/apple-touch-icon.png`),
  png(32).toFile(`${OUT}/favicon-32.png`),
  png(16).toFile(`${OUT}/favicon-16.png`),
]);

const ico = await pngToIco([`${OUT}/favicon-16.png`, `${OUT}/favicon-32.png`]);
await writeFile('public/favicon.ico', ico);

console.log('icons written to', OUT);
