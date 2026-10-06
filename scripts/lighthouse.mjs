import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';
const method = process.env.LIGHTHOUSE_THROTTLING_METHOD || 'simulate';
const selected = process.env.LIGHTHOUSE_PAGES?.split(',');
const port = 9229;
const browser = await chromium.launch({
  headless: true,
  args: [`--remote-debugging-port=${port}`, '--no-sandbox'],
});
try {
  await mkdir('test-results/performance', { recursive: true });
  for (const [name, path] of [
    ['home', '/'],
    ['product', '/products/iphone-16-pro'],
    ['catalog', '/shop'],
  ]) {
    if (selected && !selected.includes(name)) continue;
    // Warm the server route once; browser caches are cleared by Lighthouse itself.
    await fetch(origin + path);
    const result = await lighthouse(origin + path, {
      port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility'],
      logLevel: 'error',
      throttlingMethod: method,
    });
    await writeFile(`test-results/performance/${name}-${method}.json`, result.report);
    const { categories, audits } = result.lhr;
    console.log(
      JSON.stringify({
        page: name,
        throttlingMethod: method,
        performance: Math.round(categories.performance.score * 100),
        accessibility: Math.round(categories.accessibility.score * 100),
        lcp: audits['largest-contentful-paint'].displayValue,
        failures: Object.values(audits)
          .filter((a) => a.score !== null && a.score < 0.9 && a.details?.type !== 'opportunity')
          .map((a) => ({ id: a.id, title: a.title, value: a.displayValue })),
      }),
    );
  }
} finally {
  await browser.close();
}
