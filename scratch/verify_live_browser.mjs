import { chromium } from '../test-results/browser-runtime/node_modules/playwright/index.mjs';

async function run() {
  console.log('Launching headless browser...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Visit homepage
  console.log('Navigating to https://passionmathstudy.in/ ...');
  await page.goto('https://passionmathstudy.in/', { waitUntil: 'networkidle' });

  // Check English dropdown
  console.log('Checking English Reference Books dropdown...');
  const refBtnEn = page.locator('button:has-text("Reference Books")').first();
  await refBtnEn.click();
  await page.waitForTimeout(500);

  const menuItemsEn = await page.locator('[role="menuitem"][data-reference-book]').allInnerTexts();
  console.log('English menu items:', menuItemsEn);

  await page.screenshot({ path: 'scratch/screenshot_en_dropdown.png' });

  // 2. Switch to Hindi
  console.log('Switching to Hindi...');
  const langToggle = page.locator('button:has-text("हिंदी"), [aria-label*="Hindi"], button:has-text("HI")').first();
  if (await langToggle.count() > 0) {
    await langToggle.click();
    await page.waitForTimeout(1000);
  } else {
    await page.goto('https://passionmathstudy.in/?lang=hi', { waitUntil: 'networkidle' });
  }

  // Check Hindi dropdown
  console.log('Checking Hindi Reference Books dropdown...');
  const refBtnHi = page.locator('button:has-text("संदर्भ पुस्तकें"), button:has-text("Reference Books")').first();
  await refBtnHi.click();
  await page.waitForTimeout(500);

  const menuItemsHi = await page.locator('[role="menuitem"][data-reference-book]').allInnerTexts();
  console.log('Hindi menu items:', menuItemsHi);

  await page.screenshot({ path: 'scratch/screenshot_hi_dropdown.png' });

  // Check that NO menu item contains "उपलब्ध नहीं"
  for (const item of menuItemsHi) {
    if (item.includes('उपलब्ध नहीं') || item.includes('Content not available')) {
      console.error('FAIL: Found missing translation notice in menu:', item);
    }
  }

  // 3. Visit RS Aggarwal Class 8 Chapter 1 Exercise 1.1 in English
  console.log('Navigating to RS Aggarwal Class 8 Ch 1 Ex 1.1 in English...');
  await page.goto('https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-8/adhyay-1/prashnavali-1-1?lang=en', { waitUntil: 'networkidle' });

  const breadcrumbsEn = await page.locator('nav[aria-label="breadcrumb"] li, ol li').allInnerTexts();
  console.log('Breadcrumbs (EN):', breadcrumbsEn);

  const pageTextEn = await page.innerText('body');
  const hasEnWarning = pageTextEn.includes('Content not available in English.');
  console.log('Has "Content not available in English." warning:', hasEnWarning);

  await page.screenshot({ path: 'scratch/screenshot_en_exercise.png' });

  // 4. Visit RS Aggarwal Class 8 Chapter 1 Exercise 1.1 in Hindi
  console.log('Navigating to RS Aggarwal Class 8 Ch 1 Ex 1.1 in Hindi...');
  await page.goto('https://passionmathstudy.in/reference-solutions/rs-aggarwal/class-8/adhyay-1/prashnavali-1-1?lang=hi', { waitUntil: 'networkidle' });

  const breadcrumbsHi = await page.locator('nav[aria-label="breadcrumb"] li, ol li').allInnerTexts();
  console.log('Breadcrumbs (HI):', breadcrumbsHi);

  const pageTextHi = await page.innerText('body');
  const hasHiWarning = pageTextHi.includes('इस भाषा में सामग्री उपलब्ध नहीं है।');
  console.log('Has "इस भाषा में सामग्री उपलब्ध नहीं है।" warning in navigation/crumbs:', hasHiWarning);

  await page.screenshot({ path: 'scratch/screenshot_hi_exercise.png' });

  await browser.close();
  console.log('Browser test finished.');
}

run().catch(console.error);
