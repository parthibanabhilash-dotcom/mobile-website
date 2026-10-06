import sharp from 'sharp';
import { readdir } from 'node:fs/promises';
for (const file of await readdir('public/products')) {
  if (!file.endsWith('.svg')) continue;
  await sharp(`public/products/${file}`, { density: 160 })
    .resize({ width: 1000, height: 1000, fit: 'inside' })
    .webp({ quality: 88, effort: 6 })
    .toFile(`public/products/${file.replace('.svg', '.webp')}`);
}
console.log('Demonstration illustrations exported as optimized WebP images.');
