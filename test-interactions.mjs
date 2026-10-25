import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err}`));

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Test clicking "Blink an LED"
  console.log('Testing clicking lesson: blink...');
  const blinkCard = page.locator('#lesson-list .lesson[data-id="blink"]');
  await blinkCard.click();
  await page.waitForTimeout(500);

  const activeLesson = await page.$eval('.lesson.is-active', el => el.dataset.id).catch(e => e.message);
  console.log('Active lesson after click:', activeLesson);

  const codeText = await page.$eval('.code code', el => el.textContent).catch(e => e.message);
  console.log('Code text snippet:', codeText.slice(0, 50));

  // 2. Test clicking "Run sketch"
  console.log('Testing clicking .btn-run...');
  await page.click('.btn-run');
  await page.waitForTimeout(1500);

  const codeCardState = await page.$eval('.code-card', el => el.getAttribute('data-state'));
  console.log('Code card data-state:', codeCardState);

  const consoleLines = await page.$eval('.console-lines', el => el.innerText).catch(e => e.message);
  console.log('Console lines:', consoleLines);

  // 3. Test clicking Pinout tab
  console.log('Testing clicking Pinout tab...');
  await page.click('.tabs button:has-text("Pinout")');
  await page.waitForTimeout(500);
  const infoContent = await page.$eval('.info-content', el => el.innerHTML).catch(e => e.message);
  console.log('Info content after Pinout tab click:', infoContent.slice(0, 100));

  // 4. Test clicking sidebar lessons icon
  console.log('Testing clicking sidebar lessons icon...');
  await page.click('[data-nav="lessons"]');
  await page.waitForTimeout(500);
  const flyoutNav = await page.$eval('#flyout', el => el.dataset.nav).catch(e => e.message);
  console.log('Flyout data-nav:', flyoutNav);
  const flyoutHtml = await page.$eval('#flyout', el => el.innerHTML).catch(e => e.message);
  console.log('Flyout content:', flyoutHtml.slice(0, 100));

  // Take screenshot of Blink lesson running
  await page.screenshot({ path: 'D:/VD/arduino-lessons/test-blink.png' });

  await browser.close();
})();
