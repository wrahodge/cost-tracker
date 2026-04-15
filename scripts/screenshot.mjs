import { chromium } from 'playwright';

const url = process.env.APP_URL || 'http://localhost:5173';
const out = process.env.OUT_DIR || 'screenshots';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {
  // With placeholder Supabase creds the session fetch will fail; we
  // still want to capture whatever the page renders.
});

// Give React a beat to render the AuthGate after session resolution.
await page.waitForTimeout(800);

await page.screenshot({ path: `${out}/auth-gate.png`, fullPage: true });
console.log('wrote', `${out}/auth-gate.png`);

await browser.close();
