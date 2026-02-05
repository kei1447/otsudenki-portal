import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const cwd = process.cwd();
const envPath = path.join(cwd, '.env.local');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    env[key] = val;
  }
  return env;
}

const env = parseEnv(envPath);
const TEST_EMAIL = env.TEST_EMAIL;
const TEST_PASSWORD = env.TEST_PASSWORD;

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('TEST_EMAIL / TEST_PASSWORD not found in .env.local');
  process.exit(1);
}

const baseUrl = 'http://localhost:3000';
const outDir = path.join(cwd, 'screenshots');

const pages = [
  { name: 'dashboard', url: '/' },
  { name: 'inventory', url: '/inventory' },
  { name: 'inventory-adjustment', url: '/inventory/adjustment' },
  { name: 'shipments', url: '/shipments' },
  { name: 'invoices', url: '/invoices' },
  { name: 'invoice-create', url: '/invoices/create' },
  { name: 'partners', url: '/partners' },
  { name: 'products', url: '/products' },
  { name: 'prices', url: '/prices' },
  { name: 'users', url: '/users' },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  // If redirected to login, authenticate.
  const loginSelector = 'input[name="email"]';
  const isLogin = await page.$(loginSelector);
  if (isLogin) {
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle' }),
    ]);
  }

  // Capture screenshots
  for (const p of pages) {
    const target = `${baseUrl}${p.url}`;
    await page.goto(target, { waitUntil: 'networkidle' });
    await wait(800);
    const filePath = path.join(outDir, `${p.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`saved: ${filePath}`);
  }

  await browser.close();
})();
