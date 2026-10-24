import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1672, height: 941 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const thumbInfo = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.lesson-thumb')].map(img => ({
      srcLength: img.src ? img.src.length : 0,
      srcStart: img.src ? img.src.slice(0, 40) : '',
      classes: img.className,
      display: window.getComputedStyle(img).display,
      opacity: window.getComputedStyle(img).opacity,
      width: window.getComputedStyle(img).width,
      height: window.getComputedStyle(img).height,
    }));
    return imgs;
  });

  console.log('Thumbnail img info (first 3):', thumbInfo.slice(0, 3));
  await browser.close();
})();
