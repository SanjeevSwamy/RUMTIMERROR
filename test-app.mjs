import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });
  const page = await context.newPage();

  const consoleLogs = [];
  const errors = [];

  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    errors.push(`[PAGE ERROR] ${err.toString()}`);
  });

  console.log('Navigating to http://localhost:5174/...');
  try {
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle', timeout: 10000 });
  } catch (e) {
    console.log('Goto error/timeout:', e.message);
  }

  // Wait a bit for init to run
  await page.waitForTimeout(2000);

  console.log('--- CONSOLE LOGS ---');
  consoleLogs.forEach(l => console.log(l));

  console.log('--- PAGE ERRORS ---');
  errors.forEach(e => console.log(e));

  // Check loader visibility and app state
  const loaderHidden = await page.$eval('#loader', el => el.hidden || window.getComputedStyle(el).display === 'none' || window.getComputedStyle(el).opacity === '0');
  const appInert = await page.$eval('#app', el => el.hasAttribute('inert'));
  const htmlIsLoading = await page.$eval('html', el => el.classList.contains('is-loading'));

  console.log('--- APP STATE ---');
  console.log('loaderHidden:', loaderHidden);
  console.log('appInert:', appInert);
  console.log('htmlIsLoading:', htmlIsLoading);

  // Take screenshot
  const shotPath = 'D:/VD/arduino-lessons/test-screenshot.png';
  await page.screenshot({ path: shotPath, fullPage: true });
  console.log('Screenshot saved to', shotPath);

  await browser.close();
})();
