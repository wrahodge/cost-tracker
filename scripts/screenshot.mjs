import { chromium } from 'playwright';

const tabs = ['Dashboard', 'Budget', 'Contracts', 'Variations', 'Payments'];
const url = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle' });

for (const label of tabs) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(350);
  const out = `screenshots/${label}.png`;
  await page.screenshot({ path: out, fullPage: true });
  console.log('wrote', out);
}

await browser.close();
