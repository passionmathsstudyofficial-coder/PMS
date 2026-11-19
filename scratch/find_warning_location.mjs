import { chromium } from '../test-results/browser-runtime/node_modules/playwright/index.mjs';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto('https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-8/adhyay-1/prashnavali-1-1?lang=en', { waitUntil: 'networkidle' });

  const elements = await page.locator(':has-text("Content not available in English.")').all();
  console.log('Count of elements with warning:', elements.length);
  for (const el of elements) {
    const tagName = await el.evaluate(e => e.tagName);
    const className = await el.evaluate(e => e.className);
    const text = await el.innerText();
    console.log(`Element <${tagName} class="${className}">:`, text.slice(0, 150));
  }

  await browser.close();
}

run().catch(console.error);
